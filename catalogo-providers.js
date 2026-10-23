(() => {
  const cacheDuration = 24 * 60 * 60 * 1000;
  const memoryCache = new Map();

  const requestJson = async (url, headers = {}, allowNotFound = false) => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(url, { headers });
      if (response.ok) return response.json();
      if (allowNotFound && response.status === 404) return null;
      if (response.status < 500 || attempt === 2) {
        throw new Error(`A fonte respondeu com HTTP ${response.status}.`);
      }
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  };

  const cached = async (key, loader) => {
    const inMemory = memoryCache.get(key);
    if (inMemory && inMemory.expiresAt > Date.now()) return inMemory.value;

    try {
      const stored = JSON.parse(localStorage.getItem(`elite-catalog:${key}`) || "null");
      if (stored && stored.expiresAt > Date.now()) {
        memoryCache.set(key, stored);
        return stored.value;
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        localStorage.removeItem(`elite-catalog:${key}`);
      } else {
        throw error;
      }
    }

    const value = await loader();
    const entry = { value, expiresAt: Date.now() + cacheDuration };
    memoryCache.set(key, entry);
    try {
      localStorage.setItem(`elite-catalog:${key}`, JSON.stringify(entry));
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "QuotaExceededError")) throw error;
    }
    return value;
  };

  const formatSet = (id, name, releaseDate, cardsCount = null) => ({
    id: String(id),
    name: String(name),
    releaseDate: releaseDate || null,
    cardsCount: Number.isFinite(Number(cardsCount)) ? Number(cardsCount) : null
  });

  const normalizeCardNumber = (value) => String(value || "").trim().toLocaleLowerCase("pt-BR").replace(/^0+(?=\d)/, "");
  const normalizePokemonSetId = (value) => String(value).toLowerCase().replace(/^([a-z]+)0+(\d)/, "$1$2");
  const pokemonTcgDexSetAliases = new Map([["me55c", "30th-c"]]);
  const pokemonSetNameSimilarity = (first, second) => {
    const normalize = (value) => String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("en")
      .split(/[^a-z0-9]+/)
      .filter(Boolean);
    const firstTokens = new Set(normalize(first));
    const secondTokens = new Set(normalize(second));
    if (!firstTokens.size || !secondTokens.size) return 0;
    const shared = [...firstTokens].filter((token) => secondTokens.has(token)).length;
    return shared / new Set([...firstTokens, ...secondTokens]).size;
  };

  const market = (source, currency, value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? { source, currency, value: parsed } : null;
  };
  const imageUrl = (value) => {
    if (typeof value !== "string") return null;
    if (/^https:\/\//i.test(value)) return value;
    return value.match(/^\[[^\]]+\]\((https:\/\/[^)]+)\)$/i)?.[1] || null;
  };
  const ecbRate = async (currency) => {
    const fetchLatest = async (code) => {
      const url = `https://data-api.ecb.europa.eu/service/data/EXR/D.${encodeURIComponent(code)}.EUR.SP00.A?lastNObservations=1&format=csvdata`;
      const response = await fetch(url, { headers: { Accept: "text/csv" } });
      if (!response.ok) throw new Error(`BCE respondeu com HTTP ${response.status}.`);
      const lines = (await response.text()).trim().split(/\r?\n/);
      const headers = lines.shift()?.split(",") || [];
      const dateIndex = headers.indexOf("TIME_PERIOD");
      const valueIndex = headers.indexOf("OBS_VALUE");
      const row = lines.reverse().find(Boolean)?.split(",") || [];
      const rate = Number(row[valueIndex]);
      if (dateIndex < 0 || !row[dateIndex] || !(rate > 0)) {
        throw new Error(`O BCE não retornou uma taxa válida para ${code}.`);
      }
      return { rate, date: row[dateIndex] };
    };
    const [baseRate, brlRate] = await Promise.all([
      currency === "EUR" ? Promise.resolve({ rate: 1, date: null }) : fetchLatest(currency),
      fetchLatest("BRL")
    ]);
    return {
      rate: brlRate.rate / baseRate.rate,
      date: [baseRate.date, brlRate.date].filter(Boolean).sort()[0] || brlRate.date,
      provider: "Banco Central Europeu (BCE)"
    };
  };

  const pokemon = {
    id: "pokemon",
    name: "Pokémon TCG API",
    url: "https://docs.pokemontcg.io/",
    localizationNote: "A tradução oficial de Pokémon e coleções vem do TCGdex; conjuntos e cartas sem versão em português permanecem com o nome original.",
    localizationUrl: "https://tcgdex.dev/",
    policy: "Os preços disponíveis são referências internacionais em USD/EUR e não são separados por condição.",
    async sets() {
      return cached("pokemon:sets:pt:v7", async () => {
        const [pokemonResult, tcgdexResult, tcgdexEnglishResult] = await Promise.allSettled([
          requestJson("https://api.pokemontcg.io/v2/sets?pageSize=250&orderBy=-releaseDate"),
          cached("pokemon:pt:sets:v2", async () => {
            const response = await requestJson("https://api.tcgdex.net/v2/pt/sets");
            return response.map((set) => ({
              id: set.id,
              name: set.name,
              cardsCount: set.cardCount?.total ?? null
            }));
          }),
          cached("pokemon:en:sets:v1", async () => {
            const response = await requestJson("https://api.tcgdex.net/v2/en/sets");
            return response.map((set) => ({
              id: set.id,
              name: set.name,
              cardsCount: set.cardCount?.total ?? null
            }));
          })
        ]);
        if (pokemonResult.status === "rejected" && tcgdexResult.status === "rejected" && tcgdexEnglishResult.status === "rejected") {
          throw new Error(`Não foi possível carregar as coleções Pokémon. Pokémon TCG API: ${pokemonResult.reason.message}; TCGdex: ${tcgdexResult.reason.message}; TCGdex inglês: ${tcgdexEnglishResult.reason.message}`);
        }
        const localizedSets = tcgdexResult.status === "fulfilled" ? tcgdexResult.value : [];
        const englishSets = tcgdexEnglishResult.status === "fulfilled" ? tcgdexEnglishResult.value : [];
        const officialSets = pokemonResult.status === "fulfilled" && Array.isArray(pokemonResult.value.data)
          ? pokemonResult.value.data
          : [];
        const fallbackSets = localizedSets.length ? localizedSets : englishSets;
        if (officialSets.length === 0 && fallbackSets.length === 0) {
          throw new Error("As fontes Pokémon não retornaram nenhuma coleção.");
        }
        if (officialSets.length === 0) {
          const officialIdByTcgDexId = new Map(
            [...pokemonTcgDexSetAliases].map(([officialId, tcgdexId]) => [normalizePokemonSetId(tcgdexId), officialId])
          );
          return [...fallbackSets].reverse().map((set) => {
            const id = officialIdByTcgDexId.get(normalizePokemonSetId(set.id)) || set.id;
            return {
              ...formatSet(id, set.name, null, set.cardsCount),
              localizationSetId: set.id
            };
          });
        }
        const localizedById = new Map(localizedSets.map((set) => [normalizePokemonSetId(set.id), set]));
        const englishById = new Map(englishSets.map((set) => [normalizePokemonSetId(set.id), set]));
        return [...officialSets]
          .sort((first, second) => (second.releaseDate || "").localeCompare(first.releaseDate || ""))
          .map((set) => {
            const normalizedId = normalizePokemonSetId(set.id);
            const aliasedId = pokemonTcgDexSetAliases.get(set.id.toLowerCase());
            const exactEnglishMatch = englishById.get(normalizedId);
            const similarEnglishMatch = exactEnglishMatch ? null : englishSets
              .map((candidate) => ({ candidate, score: pokemonSetNameSimilarity(set.name, candidate.name) }))
              .sort((first, second) => second.score - first.score)[0];
            const matchedEnglishSet = (aliasedId && englishById.get(normalizePokemonSetId(aliasedId))) ||
              exactEnglishMatch ||
              (similarEnglishMatch?.score >= 0.72 ? similarEnglishMatch.candidate : null);
            const localized = localizedById.get(normalizedId) ||
              (aliasedId && localizedById.get(normalizePokemonSetId(aliasedId))) ||
              (matchedEnglishSet && localizedById.get(normalizePokemonSetId(matchedEnglishSet.id)));
            return {
              ...formatSet(set.id, localized?.name || set.name, set.releaseDate, set.total),
              originalName: localized && localized.name !== set.name ? set.name : null,
              localizationSetId: localized?.id || matchedEnglishSet?.id || null
            };
          });
      });
    },
    async cards(set, cursor) {
      const page = cursor || 1;
      const tcgdexSetId = set.localizationSetId || pokemonTcgDexSetAliases.get(set.id.toLowerCase()) || set.id;
      const cacheKey = `pokemon:cards:pt:v8:${set.id}:${page}`;
      return cached(cacheKey, async () => {
        const query = new URLSearchParams({
          q: `set.id:${set.id}`,
          page: String(page),
          pageSize: "100",
          orderBy: "number"
        });
        const [officialResult, portugueseSetResult] = await Promise.allSettled([
          requestJson(`https://api.pokemontcg.io/v2/cards?${query}`),
          cached(`pokemon:pt:set:${tcgdexSetId}`, async () =>
            requestJson(`https://api.tcgdex.net/v2/pt/sets/${encodeURIComponent(tcgdexSetId)}`, {}, true)
          )
        ]);
        const officialResponse = officialResult.status === "fulfilled" ? officialResult.value : null;
        let tcgdexSet = portugueseSetResult.status === "fulfilled" ? portugueseSetResult.value : null;
        let tcgdexLanguage = "pt";
        let tcgdexError = portugueseSetResult.status === "rejected" ? portugueseSetResult.reason : null;

        if (!tcgdexSet?.cards?.length) {
          try {
            const englishSet = await cached(`pokemon:en:set:${tcgdexSetId}`, async () =>
              requestJson(`https://api.tcgdex.net/v2/en/sets/${encodeURIComponent(tcgdexSetId)}`, {}, true)
            );
            if (englishSet?.cards?.length) {
              tcgdexSet = englishSet;
              tcgdexLanguage = "en";
            }
          } catch (error) {
            tcgdexError = error;
          }
        }

        if ((!officialResponse?.data?.length) && tcgdexSet?.cards?.length) {
          const tcgdexCards = [...tcgdexSet.cards].sort((first, second) =>
            String(first.localId).localeCompare(String(second.localId), "en", { numeric: true })
          );
          const start = (page - 1) * 100;
          const pageCards = tcgdexCards.slice(start, start + 100);
          return {
            cards: pageCards.map((card) => ({
              name: card.name,
              number: card.localId,
              rarity: "Não informada",
              language: tcgdexLanguage,
              imageUrl: card.image ? `${card.image}/high.webp` : null,
              variants: [],
              prices: [],
              sourceUrl: null
            })),
            nextCursor: start + 100 < tcgdexCards.length ? page + 1 : null
          };
        }

        if (!officialResponse?.data?.length) {
          const officialError = officialResult.status === "rejected"
            ? officialResult.reason.message
            : "Pokémon TCG API não retornou cartas.";
          const tcgdexMessage = tcgdexError
            ? tcgdexError.message
            : "a coleção não foi encontrada no TCGdex.";
          throw new Error(`Pokémon TCG API: ${officialError} TCGdex: ${tcgdexMessage}`);
        }

        const localizedCards = tcgdexSet?.cards || [];
        const localizedByNumber = new Map(localizedCards.map((card) => [normalizeCardNumber(card.localId), card.name]));
        const hasMore = officialResponse.page * officialResponse.pageSize < officialResponse.totalCount;
        return {
          cards: officialResponse.data.map((card) => {
            const prices = [];
            for (const [variant, value] of Object.entries(card.tcgplayer?.prices || {})) {
              const item = market(`TCGplayer · ${variant}`, "USD", value.market);
              if (item) prices.push(item);
            }
            for (const [variant, value] of Object.entries(card.cardmarket?.prices || {})) {
              const item = market(`Cardmarket · ${variant}`, "EUR", value.trendPrice);
              if (item) prices.push(item);
            }
            const localizedName = localizedByNumber.get(normalizeCardNumber(card.number));
            return {
              name: localizedName || card.name,
              originalName: localizedName && localizedName !== card.name ? card.name : null,
              number: card.number,
              rarity: card.rarity || "Não informada",
              language: "en",
              imageUrl: card.images?.large || card.images?.small || null,
              variants: [],
              prices,
              sourceUrl: card.tcgplayer?.url || card.cardmarket?.url || null
            };
          }),
          nextCursor: hasMore ? page + 1 : null
        };
      });
    }
  };

  const scryfallDelay = () => new Promise((resolve) => setTimeout(resolve, 110));
  const magic = {
    id: "magic",
    name: "Scryfall API",
    url: "https://scryfall.com/docs/api",
    localizationNote: "Nomes impressos em português são usados quando a Scryfall possui uma impressão em português; os demais nomes, inclusive os das coleções, permanecem originais.",
    policy: "Dados Scryfall devem permanecer acessíveis sem paywall; o catálogo deve acrescentar valor e respeitar as diretrizes da fonte.",
    async sets() {
      return cached("magic:sets", async () => {
        const response = await requestJson("https://api.scryfall.com/sets", {
          Accept: "application/json",
          "User-Agent": "EliteDasCartas/1.0"
        });
        return response.data
          .filter((set) => !set.digital && set.card_count > 0 && set.released_at)
          .sort((first, second) => second.released_at.localeCompare(first.released_at))
          .map((set) => formatSet(set.code, set.name, set.released_at, set.card_count));
      });
    },
    async cards(set, cursor) {
      const url = cursor || `https://api.scryfall.com/cards/search?order=set&unique=prints&q=${encodeURIComponent(`set:${set.id}`)}`;
      const cacheKey = `magic:cards:pt:v2:${set.id}:${cursor || "1"}`;
      return cached(cacheKey, async () => {
        await scryfallDelay();
        const response = await requestJson(url, {
          Accept: "application/json",
          "User-Agent": "EliteDasCartas/1.0"
        });
        return {
          cards: response.data.map((card) => {
            const localizedName = card.lang === "pt" ? card.printed_name || null : null;
            return {
              name: localizedName || card.name,
              originalName: localizedName && localizedName !== card.name ? card.name : null,
              number: card.collector_number,
              rarity: card.rarity || "Não informada",
              language: card.lang || null,
              imageUrl: card.image_uris?.normal || card.image_uris?.large || null,
              variants: (card.finishes || []).map((name) => ({
                name,
                imageUrl: card.image_uris?.normal || card.image_uris?.large || null,
                prices: [
                  market("Scryfall", "USD", name === "foil" ? card.prices?.usd_foil : card.prices?.usd),
                  market("Scryfall", "EUR", card.prices?.eur)
                ].filter(Boolean)
              })),
              prices: [
                market("Scryfall", "USD", card.prices?.usd),
                market("Scryfall · foil", "USD", card.prices?.usd_foil),
                market("Scryfall", "EUR", card.prices?.eur)
              ].filter(Boolean),
              sourceUrl: card.scryfall_uri
            };
          }),
          nextCursor: response.has_more ? response.next_page : null
        };
      });
    }
  };

  const yugioh = {
    id: "yu-gi-oh",
    name: "YGOPRODeck API",
    url: "https://ygoprodeck.com/api-guide/",
    localizationNote: "A API fornece nomes de cartas em português; nomes de coleções sem tradução oficial disponível permanecem no idioma original.",
    policy: "Preços são referências internacionais fornecidas por fontes externas; não incluem avaliação por condição.",
    async sets() {
      return cached("yugioh:sets", async () => {
        const response = await requestJson("https://db.ygoprodeck.com/api/v7/cardsets.php");
        return response
          .filter((set) => set.set_name && set.set_code)
          .map((set, index) => ({
            ...formatSet(`${set.set_code}:${index}`, set.set_name, set.tcg_date, set.num_of_cards),
            sourceSetName: set.set_name
          }))
          .sort((first, second) => (second.releaseDate || "").localeCompare(first.releaseDate || ""));
      });
    },
    async cards(set, cursor) {
      const offset = Number(cursor || 0);
      const cacheKey = `yugioh:cards:pt:v2:${set.id}:${offset}`;
      return cached(cacheKey, async () => {
        const query = new URLSearchParams({ cardset: set.sourceSetName, num: "100", offset: String(offset) });
        const response = await requestJson(`https://db.ygoprodeck.com/api/v7/cardinfo.php?${query}`);
        const meta = response.meta || {};
        const originalCards = response.data || [];
        const localizedById = new Map();
        if (originalCards.length > 0) {
          const ids = new URLSearchParams({
            id: originalCards.map((card) => card.id).join(","),
            language: "pt"
          });
          const localizedResponse = await requestJson(`https://db.ygoprodeck.com/api/v7/cardinfo.php?${ids}`);
          for (const card of localizedResponse.data || []) {
            if (card.name_en && card.name !== card.name_en) localizedById.set(card.id, card.name);
          }
        }
        return {
          cards: originalCards.map((card) => {
            const printings = (card.card_sets || []).filter((printing) => printing.set_name === set.sourceSetName);
            const printing = printings[0];
            const prices = [];
            const priceData = card.card_prices?.[0] || {};
            const tcgplayer = market("TCGplayer", "USD", priceData.tcgplayer_price);
            const cardmarket = market("Cardmarket", "EUR", priceData.cardmarket_price);
            if (tcgplayer) prices.push(tcgplayer);
            if (cardmarket) prices.push(cardmarket);
            const localizedName = localizedById.get(card.id);
            return {
              name: localizedName || card.name,
              originalName: localizedName && localizedName !== card.name ? card.name : null,
              number: printing?.set_code || String(card.id),
              rarity: printing?.set_rarity || card.type || "Não informada",
              language: null,
              imageUrl: localizedName ? null : card.card_images?.[0]?.image_url || null,
              variants: [],
              prices,
              sourceUrl: null
            };
          }),
          nextCursor: meta.next_page_offset ?? null
        };
      });
    }
  };

  const onePiece = {
    id: "one-piece",
    name: "OPTCG API",
    url: "https://optcgapi.com/documentation",
    localizationNote: "Esta fonte não fornece nomes em português do Brasil; cartas e coleções permanecem com os nomes originais publicados pela API.",
    policy: "Fonte comunitária. Os preços são fornecidos sem condição da carta e a moeda não está especificada na resposta da API.",
    async sets() {
      return cached("onepiece:sets", async () => {
        const response = await requestJson("https://optcgapi.com/api/allSets/");
        return [...response].reverse().map((set) => formatSet(set.set_id, set.set_name));
      });
    },
    async cards(set) {
      return cached(`onepiece:cards:v2:${set.id}`, async () => {
        const response = await requestJson(`https://optcgapi.com/api/sets/${encodeURIComponent(set.id)}/`);
        return {
          cards: response.map((card) => ({
            name: card.card_name,
            number: card.card_set_id,
            rarity: card.rarity || "Não informada",
            imageUrl: imageUrl(card.card_image || card.card_img),
            variants: [],
            prices: [],
            sourceUrl: null
          })),
          nextCursor: null
        };
      });
    }
  };

  const lorcana = {
    id: "lorcana",
    name: "Lorcast API",
    url: "https://lorcast.com/docs/api",
    localizationNote: "Esta fonte disponibiliza estes dados em inglês; cartas e coleções permanecem com os nomes originais publicados pela API.",
    policy: "API beta; preços são referências em USD e não incluem condição da carta. Os dados devem ser armazenados em cache.",
    async sets() {
      return cached("lorcana:sets", async () => {
        const response = await requestJson("https://api.lorcast.com/v0/sets");
        return response.results
          .map((set) => ({
            ...formatSet(set.code, set.name, set.released_at),
            sourceSetId: set.id
          }))
          .sort((first, second) => (second.releaseDate || "").localeCompare(first.releaseDate || ""));
      });
    },
    async cards(set, cursor) {
      const url = cursor || `https://api.lorcast.com/v0/cards/search?q=${encodeURIComponent(`set:${set.id}`)}`;
      const cacheKey = `lorcana:cards:v2:${set.id}:${cursor || "1"}`;
      return cached(cacheKey, async () => {
        await new Promise((resolve) => setTimeout(resolve, 110));
        const response = await requestJson(url);
        const nextCursor = response.next_page || response.next_cursor || null;
        return {
          cards: response.results.map((card) => ({
            name: [card.name, card.version].filter(Boolean).join(" — "),
            number: card.collector_number || "Não informado",
            rarity: card.rarity || "Não informada",
            language: card.lang || card.language || null,
            imageUrl: imageUrl(card.image_uris?.digital?.normal || card.image_uris?.normal || card.image_uris?.large),
            variants: [
              market("Lorcast / TCGplayer", "USD", card.prices?.usd)
                ? { name: "Normal", imageUrl: imageUrl(card.image_uris?.digital?.normal || card.image_uris?.normal || card.image_uris?.large), prices: [market("Lorcast / TCGplayer", "USD", card.prices.usd)] }
                : null,
              market("Lorcast / TCGplayer · foil", "USD", card.prices?.usd_foil)
                ? { name: "Foil", imageUrl: imageUrl(card.image_uris?.digital?.normal || card.image_uris?.normal || card.image_uris?.large), prices: [market("Lorcast / TCGplayer · foil", "USD", card.prices.usd_foil)] }
                : null
            ].filter(Boolean),
            prices: [
              market("Lorcast / TCGplayer", "USD", card.prices?.usd),
              market("Lorcast / TCGplayer · foil", "USD", card.prices?.usd_foil)
            ].filter(Boolean),
            sourceUrl: card.purchase_uris?.tcgplayer || null
          })),
          nextCursor
        };
      });
    }
  };

  const scrydex = {
    id: "scrydex",
    name: "Scrydex",
    url: "https://scrydex.com/",
    localizationNote: "Idiomas, variantes, imagens e preços são exibidos somente quando fornecidos pela Scrydex para a impressão consultada.",
    policy: "Preços raw e graded dependem do jogo, da variante e do plano. Valores convertidos para BRL são apenas indicativos; dados PSA não representam população total fora das informações fornecidas pela fonte.",
    async status() {
      const response = await requestJson("/api/health");
      return response.scrydex;
    },
    async sets(gameId, language = "") {
      const sets = [];
      for (let page = 1; page <= 1000; page += 1) {
        const query = new URLSearchParams({ page: String(page) });
        if (language) query.set("language", language);
        const response = await requestJson(`/api/catalog/${encodeURIComponent(gameId)}/expansions?${query}`);
        const results = Array.isArray(response.data) ? response.data : [];
        sets.push(...results.map((set) => ({
          id: String(set.id || set.code || set.abbreviation || ""),
          name: String(set.name || set.set_name || set.title || set.id || "Coleção sem nome"),
          releaseDate: set.release_date || set.released_at || set.releaseDate || null,
          cardsCount: Number(set.card_count || set.cards_count || set.total_cards) || null,
          language: set.language || set.lang || (language || null),
          originalName: null
        })).filter((set) => set.id));
        if (!results.length || results.length < 100) break;
      }
      return sets.sort((first, second) => (second.releaseDate || "").localeCompare(first.releaseDate || ""));
    },
    async cards(gameId, set, page = 1, language = "") {
      const query = new URLSearchParams({ page: String(page) });
      if (language) query.set("language", language);
      const response = await requestJson(
        `/api/catalog/${encodeURIComponent(gameId)}/expansions/${encodeURIComponent(set.id)}/cards?${query}`
      );
      const results = Array.isArray(response.data) ? response.data : [];
      const cards = results.map((card) => {
        const variants = (Array.isArray(card.variants) ? card.variants : []).map((variant) => ({
          name: String(variant.name || variant.variant || "Não informada"),
          imageUrl: variant.image_url || variant.image?.url || null,
          prices: (Array.isArray(variant.prices) ? variant.prices : []).filter((price) => price && price.currency).map((price) => ({
            source: `${price.company || "Scrydex"}${price.type === "graded" && price.grade ? ` · ${price.company || "graded"} ${price.grade}` : ""}`,
            currency: String(price.currency).toUpperCase(),
            value: Number(price.market) || null,
            low: Number(price.low) || null,
            market: Number(price.market) || null,
            high: Number(price.high) || null,
            type: price.type || "raw",
            condition: price.condition || null,
            grade: price.grade || null,
            company: price.company || null,
            updatedAt: price.updated_at || price.updatedAt || null
          }))
        }));
        const cardImage = card.image_url || card.image?.url || card.images?.large || card.images?.normal || card.images?.small || null;
        const languageCode = card.language || card.lang || language || null;
        const population = Array.isArray(card.pop_reports) ? card.pop_reports : card.pop_reports ? [card.pop_reports] : [];
        return {
          id: String(card.id || ""),
          name: String(card.name || card.title || "Carta sem nome"),
          number: card.collector_number || card.number || card.local_id || "Não informado",
          rarity: card.rarity || "Não informada",
          language: languageCode,
          languageLabel: languageCode,
          imageUrl: cardImage,
          variants: variants.map((variant) => ({ ...variant, imageUrl: variant.imageUrl || cardImage })),
          prices: variants.flatMap((variant) => variant.prices),
          population,
          sourceUrl: card.url || null
        };
      });
      const pagination = response.pagination || response.meta?.pagination || response.meta || {};
      const currentPage = Number(pagination.page || page);
      const totalPages = Number(pagination.total_pages || pagination.totalPages || pagination.pages) || null;
      const hasMore = totalPages ? currentPage < totalPages : results.length >= 48;
      return { cards, nextCursor: hasMore ? currentPage + 1 : null };
    },
    async history(gameId, cardId, variant = "") {
      const query = new URLSearchParams();
      if (variant) query.set("variant", variant);
      const suffix = query.size ? `?${query}` : "";
      return requestJson(`/api/history/${encodeURIComponent(gameId)}/${encodeURIComponent(cardId)}${suffix}`);
    },
    async exchangeRate(currency) {
      if (window.location.protocol === "file:") return ecbRate(currency);
      try {
        const response = await requestJson(`/api/fx?base=${encodeURIComponent(currency)}`);
        return Number(response.rate) > 0
          ? { rate: Number(response.rate), date: response.date, provider: response.provider }
          : null;
      } catch (error) {
        if (["USD", "EUR", "JPY"].includes(currency)) return ecbRate(currency);
        throw error;
      }
    }
  };

  window.ELITE_CATALOG_PROVIDERS = { pokemon, magic, "yu-gi-oh": yugioh, "one-piece": onePiece, lorcana, scrydex };
})();
