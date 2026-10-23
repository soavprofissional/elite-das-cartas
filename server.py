#!/usr/bin/env python3
"""Small standard-library server and Scrydex proxy for Elite das Cartas."""

from __future__ import annotations

import csv
import io
import json
import os
import re
import sqlite3
import threading
import time
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, quote, urlencode, urlparse
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parent
DATABASE = Path(os.environ.get("ELITE_CATALOG_DB", ROOT / "data" / "catalog.sqlite3"))
HOST = os.environ.get("ELITE_CATALOG_HOST", "127.0.0.1")
PORT = int(os.environ.get("ELITE_CATALOG_PORT", "8000"))
CACHE_TTL_SECONDS = 24 * 60 * 60
SCRYDEX_BASE = "https://api.scrydex.com"
GAMES = {
    "pokemon": "pokemon",
    "magic": "magicthegathering",
    "one-piece": "onepiece",
    "lorcana": "lorcana",
}
DATABASE_LOCK = threading.Lock()


def connect_db() -> sqlite3.Connection:
    DATABASE.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DATABASE, timeout=10)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database() -> None:
    with connect_db() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS api_cache (
                cache_key TEXT PRIMARY KEY,
                response_json TEXT NOT NULL,
                expires_at REAL NOT NULL,
                fetched_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS price_snapshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                game TEXT NOT NULL,
                card_id TEXT NOT NULL,
                variant TEXT NOT NULL DEFAULT '',
                price_type TEXT NOT NULL,
                condition_name TEXT NOT NULL DEFAULT '',
                grade TEXT NOT NULL DEFAULT '',
                grading_company TEXT NOT NULL DEFAULT '',
                currency TEXT NOT NULL,
                low REAL,
                market REAL,
                high REAL,
                source_updated_at TEXT,
                captured_at TEXT NOT NULL,
                UNIQUE (game, card_id, variant, price_type, condition_name,
                        grade, grading_company, currency, captured_at)
            );
            CREATE INDEX IF NOT EXISTS idx_price_history
                ON price_snapshots (game, card_id, variant, captured_at);
            """
        )


def cached_json(cache_key: str, loader, ttl: int = CACHE_TTL_SECONDS):
    now = time.time()
    with DATABASE_LOCK, connect_db() as connection:
        row = connection.execute(
            "SELECT response_json, expires_at FROM api_cache WHERE cache_key = ?",
            (cache_key,),
        ).fetchone()
        if row and row["expires_at"] > now:
            return json.loads(row["response_json"])

    value = loader()
    payload = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    fetched_at = datetime.now(timezone.utc).isoformat()
    with DATABASE_LOCK, connect_db() as connection:
        connection.execute(
            """INSERT INTO api_cache (cache_key, response_json, expires_at, fetched_at)
               VALUES (?, ?, ?, ?)
               ON CONFLICT(cache_key) DO UPDATE SET
                 response_json = excluded.response_json,
                 expires_at = excluded.expires_at,
                 fetched_at = excluded.fetched_at""",
            (cache_key, payload, now + ttl, fetched_at),
        )
    return value


def scrydex_configured() -> bool:
    return bool(os.environ.get("SCRYDEX_API_KEY") and os.environ.get("SCRYDEX_TEAM_ID"))


def scrydex_request(path: str, query: dict[str, str]):
    api_key = os.environ.get("SCRYDEX_API_KEY")
    team_id = os.environ.get("SCRYDEX_TEAM_ID")
    if not api_key or not team_id:
        raise ApiError(
            503,
            "Scrydex ainda não está configurada. Defina SCRYDEX_API_KEY e "
            "SCRYDEX_TEAM_ID no ambiente local do servidor.",
            "integration_not_configured",
        )

    url = f"{SCRYDEX_BASE}/{path.lstrip('/')}"
    if query:
        url = f"{url}?{urlencode(query)}"
    request = Request(
        url,
        headers={
            "X-Api-Key": api_key,
            "X-Team-ID": team_id,
            "Accept": "application/json",
            "User-Agent": "EliteDasCartas/1.0",
        },
    )
    try:
        with urlopen(request, timeout=20) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        if error.code == 429:
            raise ApiError(429, "A Scrydex limitou as requisições; tente novamente mais tarde.", "upstream_rate_limited")
        if error.code in (401, 403):
            raise ApiError(error.code, "As credenciais Scrydex foram recusadas. Confira a chave e o Team ID.", "upstream_auth_error")
        if error.code >= 500:
            raise ApiError(502, "A Scrydex está temporariamente indisponível.", "upstream_unavailable")
        raise ApiError(502, f"A Scrydex respondeu com HTTP {error.code}.", "upstream_error")
    except (URLError, TimeoutError) as error:
        raise ApiError(502, f"Não foi possível consultar a Scrydex: {error.reason if isinstance(error, URLError) else 'tempo esgotado'}.", "upstream_unavailable")
    except (UnicodeDecodeError, json.JSONDecodeError):
        raise ApiError(502, "A Scrydex retornou uma resposta inválida.", "invalid_upstream_response")


def record_prices(game: str, response: dict) -> None:
    cards = response.get("data", [])
    if isinstance(cards, dict):
        cards = [cards]
    captured_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    rows = []
    for card in cards:
        if not isinstance(card, dict):
            continue
        card_id = card.get("id")
        if not card_id:
            continue
        for variant in card.get("variants", []) or []:
            if not isinstance(variant, dict):
                continue
            variant_name = str(variant.get("name") or "")
            for price in variant.get("prices", []) or []:
                if not isinstance(price, dict) or price.get("currency") is None:
                    continue
                price_type = str(price.get("type") or "raw")
                rows.append(
                    (
                        game,
                        str(card_id),
                        variant_name,
                        price_type,
                        str(price.get("condition") or ""),
                        str(price.get("grade") or ""),
                        str(price.get("company") or ""),
                        str(price.get("currency")),
                        price.get("low"),
                        price.get("market"),
                        price.get("high"),
                        price.get("updated_at") or price.get("updatedAt"),
                        captured_at,
                    )
                )
    if rows:
        with DATABASE_LOCK, connect_db() as connection:
            connection.executemany(
                """INSERT OR IGNORE INTO price_snapshots
                   (game, card_id, variant, price_type, condition_name, grade,
                    grading_company, currency, low, market, high, source_updated_at, captured_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                rows,
            )


class ApiError(Exception):
    def __init__(self, status: int, message: str, code: str):
        super().__init__(message)
        self.status = status
        self.code = code


def json_payload(value, status: int = 200) -> tuple[int, bytes]:
    return status, json.dumps(value, ensure_ascii=False).encode("utf-8")


def valid_identifier(value: str) -> bool:
    return bool(value) and len(value) <= 120 and re.fullmatch(r"[A-Za-z0-9._-]+", value) is not None


class EliteHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, format_string, *args):
        print(f"{self.log_date_time_string()} {self.address_string()} {format_string % args}")

    def send_json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urlparse(self.path)
        if not parsed.path.startswith("/api/"):
            return super().do_GET()
        try:
            self.handle_api(parsed.path, parse_qs(parsed.query))
        except ApiError as error:
            self.send_json(error.status, {"error": {"code": error.code, "message": str(error)}})
        except (sqlite3.Error, OSError) as error:
            self.send_json(500, {"error": {"code": "server_error", "message": f"Falha interna ao processar os dados: {error}"}})

    def handle_api(self, path: str, query: dict[str, list[str]]) -> None:
        if path == "/api/health":
            self.send_json(
                200,
                {
                    "status": "ok",
                    "scrydex": {
                        "configured": scrydex_configured(),
                        "games": sorted(GAMES),
                        "requiredEnvironment": ["SCRYDEX_API_KEY", "SCRYDEX_TEAM_ID"],
                    },
                    "marvel": {
                        "available": False,
                        "message": "Não há uma fonte autorizada conectada para cartas Upper Deck Marvel.",
                    },
                },
            )
            return

        if path.startswith("/api/catalog/"):
            self.handle_catalog(path, query)
            return
        if path.startswith("/api/history/"):
            self.handle_history(path, query)
            return
        if path == "/api/fx":
            self.handle_exchange_rates(query)
            return
        raise ApiError(404, "Rota de API não encontrada.", "not_found")

    def handle_catalog(self, path: str, query: dict[str, list[str]]) -> None:
        parts = path.strip("/").split("/")
        if len(parts) < 3 or parts[0:2] != ["api", "catalog"]:
            raise ApiError(404, "Rota de catálogo inválida.", "not_found")
        game = parts[2]
        if game not in GAMES:
            if game == "marvel":
                raise ApiError(501, "Ainda não há uma fonte autorizada configurada para cartas colecionáveis Marvel / Upper Deck.", "game_source_unavailable")
            raise ApiError(404, "Jogo sem integração Scrydex.", "unsupported_game")

        game_api = GAMES[game]
        if len(parts) == 3:
            self.send_json(200, {"game": game, "provider": "Scrydex", "configured": scrydex_configured()})
            return

        resource = parts[3]
        language = first_query_value(query, "language", "")
        language_segment = ""
        if language:
            if not re.fullmatch(r"[a-z]{2}", language):
                raise ApiError(400, "Use um código de idioma de duas letras.", "invalid_language")
            if game != "pokemon":
                raise ApiError(400, "A seleção de idioma por rota está documentada pela Scrydex apenas para Pokémon.", "language_not_supported")
            language_segment = f"/{language}"

        page = first_query_value(query, "page", "1")
        if not page.isdigit() or not 1 <= int(page) <= 100000:
            raise ApiError(400, "Página inválida.", "invalid_page")
        if resource == "expansions" and len(parts) == 4:
            cache_key = f"scrydex:{game}:expansions:{language}:{page}"
            payload = cached_json(
                cache_key,
                lambda: scrydex_request(
                    f"{game_api}/v1{language_segment}/expansions",
                    {"page": page, "page_size": "100"},
                ),
            )
            self.send_json(200, payload)
            return

        if resource == "expansions" and len(parts) == 6 and parts[5] == "cards":
            expansion_id = parts[4]
            if not valid_identifier(expansion_id):
                raise ApiError(400, "Identificador de coleção inválido.", "invalid_identifier")
            cache_key = f"scrydex:{game}:expansion:{expansion_id}:cards:{language}:{page}"
            includes = "prices,pop_reports" if game == "pokemon" else "prices"
            payload = cached_json(
                cache_key,
                lambda: scrydex_request(
                    f"{game_api}/v1{language_segment}/expansions/{quote(expansion_id, safe='')}/cards",
                    {"page": page, "page_size": "48", "include": includes},
                ),
            )
            record_prices(game, payload)
            self.send_json(200, payload)
            return

        raise ApiError(404, "Rota de catálogo inválida.", "not_found")

    def handle_history(self, path: str, query: dict[str, list[str]]) -> None:
        parts = path.strip("/").split("/")
        if len(parts) != 4 or parts[0:2] != ["api", "history"]:
            raise ApiError(404, "Rota de histórico inválida.", "not_found")
        game, card_id = parts[2], parts[3]
        if game not in GAMES or not valid_identifier(card_id):
            raise ApiError(400, "Jogo ou carta inválidos para consulta de histórico.", "invalid_identifier")
        variant = first_query_value(query, "variant", "")
        with connect_db() as connection:
            rows = connection.execute(
                """SELECT variant, price_type, condition_name, grade, grading_company,
                          currency, low, market, high, source_updated_at, captured_at
                   FROM price_snapshots
                   WHERE game = ? AND card_id = ? AND (? = '' OR variant = ?)
                   ORDER BY captured_at DESC LIMIT 500""",
                (game, card_id, variant, variant),
            ).fetchall()
        history = [dict(row) for row in rows]
        self.send_json(200, {"game": game, "cardId": card_id, "variant": variant or None, "history": history})

    def handle_exchange_rates(self, query: dict[str, list[str]]) -> None:
        base = first_query_value(query, "base", "USD").upper()
        if base not in ("USD", "EUR", "JPY"):
            raise ApiError(400, "Moeda base não suportada para conversão indicativa.", "invalid_currency")
        cache_key = f"fx:ecb:{base}:BRL"

        def load_rates():
            currencies = "BRL" if base == "EUR" else f"{base}+BRL"
            url = (
                "https://data-api.ecb.europa.eu/service/data/EXR/"
                f"D.{currencies}.EUR.SP00.A?"
                f"{urlencode({'lastNObservations': '1', 'format': 'csvdata'})}"
            )
            try:
                with urlopen(Request(url, headers={"Accept": "text/csv"}), timeout=12) as response:
                    rows = list(csv.DictReader(io.StringIO(response.read().decode("utf-8"))))
                rates = {
                    row["CURRENCY"]: float(row["OBS_VALUE"])
                    for row in rows
                    if row.get("CURRENCY") in (base, "BRL") and row.get("OBS_VALUE")
                }
                if base == "EUR":
                    if rates.get("BRL", 0) <= 0:
                        raise ValueError("O BCE não retornou a taxa do real brasileiro.")
                    return {
                        "base": base,
                        "target": "BRL",
                        "rate": rates["BRL"],
                        "date": min(row["TIME_PERIOD"] for row in rows if row.get("TIME_PERIOD")),
                        "provider": "Banco Central Europeu (BCE)",
                    }
                if base not in rates or "BRL" not in rates or rates[base] <= 0:
                    raise ValueError("O BCE não retornou uma taxa para as duas moedas.")
                return {
                    "base": base,
                    "target": "BRL",
                    "rate": rates["BRL"] / rates[base],
                    "date": min(row["TIME_PERIOD"] for row in rows if row.get("TIME_PERIOD")),
                    "provider": "Banco Central Europeu (BCE)",
                }
            except (HTTPError, URLError, TimeoutError, UnicodeDecodeError, csv.Error, ValueError, KeyError) as error:
                raise ApiError(502, f"Não foi possível obter a taxa de câmbio: {error}.", "exchange_rate_unavailable")

        self.send_json(200, cached_json(cache_key, load_rates))


def first_query_value(query: dict[str, list[str]], key: str, default: str) -> str:
    values = query.get(key)
    return values[0] if values else default


def main() -> None:
    initialize_database()
    server = ThreadingHTTPServer((HOST, PORT), EliteHandler)
    print(f"Elite das Cartas disponível em http://{HOST}:{PORT}")
    print(f"Banco SQLite: {DATABASE}")
    print("Scrydex: configurada" if scrydex_configured() else "Scrydex: sem credenciais; catálogo protegido indisponível")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nEncerrando servidor.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
