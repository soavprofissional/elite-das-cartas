(() => {
  const games = window.ELITE_CATALOG_DATA;
  const content = document.querySelector("#catalog-content");
  const breadcrumbs = document.querySelector("#breadcrumbs");
  const params = new URLSearchParams(window.location.search);
  const gameId = params.get("jogo");
  const expansionId = params.get("expansao");
  const conditionLevels = Array.isArray(window.ELITE_CONDITION_LEVELS)
    ? window.ELITE_CONDITION_LEVELS
    : [];

  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);

  const formatPrice = (price, currency = "BRL") => {
    if (!Number.isFinite(Number(price))) return "IndisponÃ­vel";
    try {
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(Number(price));
    } catch (error) {
      if (!(error instanceof RangeError)) throw error;
      return `${Number(price).toLocaleString("pt-BR")} ${currency}`;
    }
  };

  const safeImageUrl = (value) => typeof value === "string" && /^https:\/\//i.test(value) ? value : null;
  const languageName = (code) => ({
    pt: "PortuguÃªs",
    en: "InglÃªs",
    ja: "JaponÃªs",
    es: "Espanhol",
    fr: "FrancÃªs",
    de: "AlemÃ£o",
    it: "Italiano",
    ko: "Coreano",
    zh: "ChinÃªs",
    zhs: "ChinÃªs simplificado",
    "zh-cn": "ChinÃªs simplificado",
    zht: "ChinÃªs tradicional",
    "zh-tw": "ChinÃªs tradicional",
    ru: "Russo",
    th: "TailandÃªs",
    nl: "HolandÃªs",
    id: "IndonÃ©sio",
    vi: "Vietnamita",
    ar: "Ãrabe",
    he: "Hebraico",
    la: "Latim",
    sa: "SÃ¢nscrito",
    grc: "Grego antigo",
    qya: "Quenya",
    ph: "Phyrexiano"
  })[String(code || "").toLowerCase()] || (code
    ? new Intl.DisplayNames(["pt-BR"], { type: "language" }).of(String(code).toLowerCase()) || String(code).toUpperCase()
    : "NÃ£o informado pela fonte");
  const currencyName = (code) => {
    const names = {
      BRL: "Real brasileiro",
      USD: "DÃ³lar americano",
      EUR: "Euro",
      JPY: "Iene japonÃªs",
      CAD: "DÃ³lar canadense",
      GBP: "Libra esterlina",
      AUD: "DÃ³lar australiano",
      CNY: "Yuan chinÃªs",
      KRW: "Won sul-coreano",
      MXN: "Peso mexicano"
    };
    return names[code] || `${code}`;
  };
  const conditionName = (value) => ({
    near_mint: "Quase nova (NM)",
    lightly_played: "Levemente jogada (LP)",
    moderately_played: "Moderadamente jogada (MP)",
    heavily_played: "Muito jogada (HP)",
    damaged: "Danificada (D)"
  })[normalizeCondition(value)] || (value ? String(value) : "CondiÃ§Ã£o nÃ£o informada");
  const normalizeCondition = (value) => {
    const normalized = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
    return ({
      nm: "near_mint",
      near_mint: "near_mint",
      lp: "lightly_played",
      lightly_played: "lightly_played",
      mp: "moderately_played",
      moderately_played: "moderately_played",
      hp: "heavily_played",
      heavily_played: "heavily_played",
      d: "damaged",
      dmg: "damaged",
      damaged: "damaged"
    })[normalized] || normalized;
  };

  const breadcrumb = (label, href = null) => href
    ? `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`
    : `<span aria-current="page">${escapeHtml(label)}</span>`;

  const showNotFound = (message) => {
    breadcrumbs.innerHTML = breadcrumb("InÃ­cio", "index.html");
    content.innerHTML = `<div class="empty-state">${escapeHtml(message)} <a href="index.html">Voltar Ã  pÃ¡gina inicial</a>.</div>`;
  };

  const providers = window.ELITE_CATALOG_PROVIDERS || {};
  const staticDemo = window.location.hostname.endsWith(".github.io");
  const characterArtwork = {
    marvel: { src: "personagens%20marvel%20.jpeg", alt: "Montagem com personagens do universo Marvel" },
    "one-piece": { src: "personagens%20one%20piece%20.jpeg", alt: "Personagens da tripulaÃ§Ã£o de One Piece reunidos" }
  };
  const characterArtworkMarkup = (id) => {
    const artwork = characterArtwork[id];
    return artwork
      ? `<img class="game-character-art" src="${artwork.src}" alt="${artwork.alt}" loading="lazy">`
      : "";
  };
  const formatReleaseDate = (dateValue) => {
    if (!dateValue) return "Data nÃ£o informada pela fonte";
    const date = new Date(`${dateValue.replaceAll("/", "-")}T12:00:00Z`);
    if (Number.isNaN(date.getTime())) return "Data nÃ£o informada pela fonte";
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "UTC" }).format(date);
  };
  const renderOnlineCatalog = async (provider, usesScrydex = false, integrationNote = "") => {
    const game = games.find((item) => item.id === gameId);
    if (!game) {
      showNotFound("Jogo nÃ£o encontrado.");
      return;
    }

    const gameHref = `catalogo.html?jogo=${encodeURIComponent(gameId)}`;
    const sourceLink = `<a class="source-link" href="${escapeHtml(provider.url)}" target="_blank" rel="noreferrer">Fonte dos dados: ${escapeHtml(provider.name)} â†—</a>`;
    const nameSource = provider.localizationUrl
      ? ` <a href="${escapeHtml(provider.localizationUrl)}" target="_blank" rel="noreferrer">Fonte dos nomes em portuguÃªs â†—</a>`
      : "";
    const localizationNote = `<p class="localization-note">Nomes oficiais em portuguÃªs do Brasil sÃ£o usados quando a fonte os disponibiliza. Quando nÃ£o hÃ¡ uma traduÃ§Ã£o oficial disponÃ­vel, o nome original Ã© mantido; nenhuma traduÃ§Ã£o automÃ¡tica Ã© aplicada.${provider.localizationNote ? ` ${escapeHtml(provider.localizationNote)}` : ""}${nameSource}</p>`;
    const integrationNoteMarkup = integrationNote
      ? `<p class="integration-note">${escapeHtml(integrationNote)}</p>`
      : "";
    const gameHeader = `
      <div class="game-banner" style="--game-color:${escapeHtml(game.color)}">
        <img class="game-icon" src="${escapeHtml(game.icon)}" alt="Ãcone de ${escapeHtml(game.name)}">
        <div><h1>${escapeHtml(game.name)}</h1><p>Cartas, imagens e preÃ§os aparecem quando a fonte os disponibiliza para esta impressÃ£o.</p></div>
        ${characterArtworkMarkup(game.id)}
      </div>`;
    const renderError = (error, action) => {
      content.innerHTML = `${gameHeader}<div class="source-error" role="alert">
        <h2>NÃ£o foi possÃ­vel carregar os dados</h2>
        <p>${escapeHtml(error.message || "A fonte externa nÃ£o respondeu como esperado.")}</p>
        <button class="button" id="retry-catalog" type="button">${escapeHtml(action)}</button>
      </div>${localizationNote}${sourceLink}<p class="demo-link"><a href="${escapeHtml(`${gameHref}&demo=1`)}">Abrir catÃ¡logo de demonstraÃ§Ã£o</a></p>`;
      document.querySelector("#retry-catalog").addEventListener("click", () => window.location.reload());
    };

    const requestedExpansion = params.get("expansao");
    content.innerHTML = `<p class="loading-message" role="status">Consultando ${escapeHtml(provider.name)}...</p>`;

    let sets;
    try {
      sets = usesScrydex ? await provider.sets(gameId) : await provider.sets();
    } catch (error) {
      renderError(error, "Tentar novamente");
      return;
    }

    const listedExpansion = requestedExpansion ? sets.find((set) => set.id === requestedExpansion) : null;
    const expansion = listedExpansion || (requestedExpansion && gameId === "pokemon"
      ? {
          id: requestedExpansion,
          name: `ExpansÃ£o ${requestedExpansion}`,
          releaseDate: null,
          cardsCount: null
        }
      : null);
    if (requestedExpansion && !expansion) {
      showNotFound("ExpansÃ£o nÃ£o encontrada na fonte selecionada.");
      return;
    }

    const cardImagePlaceholderMarkup = (name, number) => `
      <div class="card-image-placeholder" role="img" aria-label="${escapeHtml(`Imagem indisponÃ­vel para ${name}, coleÃ§Ã£o ${expansion.name}, nÃºmero ${number || "nÃ£o informado"}`)}">
        <span class="image-placeholder-label">PrÃ©via indisponÃ­vel</span>
        <strong>${escapeHtml(name)}</strong>
        <small>${escapeHtml(expansion.name)} Â· ${escapeHtml(number || "NumeraÃ§Ã£o nÃ£o informada")}</small>
      </div>`;

    breadcrumbs.innerHTML = requestedExpansion
      ? `${breadcrumb("InÃ­cio", "index.html")}<span class="separator">/</span>${breadcrumb(game.name, gameHref)}<span class="separator">/</span>${breadcrumb(expansion.name)}`
      : `${breadcrumb("InÃ­cio", "index.html")}<span class="separator">/</span>${breadcrumb(game.name)}`;

    if (!expansion) {
      content.innerHTML = `${gameHeader}${integrationNoteMarkup}
        <div class="page-heading">
          <div><span class="eyebrow">CatÃ¡logo atualizado pela fonte</span><h1>ExpansÃµes e coleÃ§Ãµes</h1><p>Mais recentes primeiro, seguindo as datas ou a ordem de lanÃ§amento publicada pela fonte. Datas sÃ³ sÃ£o exibidas quando disponÃ­veis.</p></div>
          <span class="demo-badge">${sets.length} coleÃ§Ãµes encontradas</span>
        </div>
        <label class="filter-field set-search" for="filter-expansions">Buscar expansÃ£o
          <input id="filter-expansions" type="search" placeholder="Digite o nome da coleÃ§Ã£o..." autocomplete="off">
        </label>
        <div class="expansion-list" id="expansion-list"></div>
        <button class="button load-more" id="load-more-expansions" type="button" hidden>Carregar mais expansÃµes</button>
        <div class="source-policy">${localizationNote}<p>${escapeHtml(provider.policy)}</p>${sourceLink}</div>
        <p class="demo-link"><a href="${escapeHtml(`${gameHref}&demo=1`)}">Abrir catÃ¡logo de demonstraÃ§Ã£o</a></p>`;

      const search = document.querySelector("#filter-expansions");
      const list = document.querySelector("#expansion-list");
      const loadMoreExpansions = document.querySelector("#load-more-expansions");
      let visibleSetCount = 40;
      const renderSets = () => {
        const query = search.value.trim().toLocaleLowerCase("pt-BR");
        const visibleSets = sets.filter((set) =>
          set.name.toLocaleLowerCase("pt-BR").includes(query) ||
          set.originalName?.toLocaleLowerCase("pt-BR").includes(query)
        );
        if (visibleSets.length === 0) {
          list.innerHTML = `<p class="empty-state">Nenhuma expansÃ£o encontrada com esse nome.</p>`;
          loadMoreExpansions.hidden = true;
          return;
        }
        list.innerHTML = visibleSets.slice(0, visibleSetCount).map((set) => {
          const href = `${gameHref}&expansao=${encodeURIComponent(set.id)}`;
          return `<a class="expansion-link" style="--game-color:${escapeHtml(game.color)}" href="${escapeHtml(href)}" ${set.originalName ? `title="${escapeHtml(`Nome original na fonte: ${set.originalName}`)}"` : ""}>
            <div><h3>${escapeHtml(set.name)}</h3>${set.originalName ? `<p class="source-name-original">Nome original: ${escapeHtml(set.originalName)}</p>` : ""}<p>${escapeHtml(formatReleaseDate(set.releaseDate))}${set.cardsCount ? ` Â· ${escapeHtml(set.cardsCount)} cartas` : ""}</p></div>
            <span class="expansion-arrow" aria-hidden="true">â†’</span>
          </a>`;
        }).join("");
        loadMoreExpansions.hidden = visibleSets.length <= visibleSetCount;
      };
      search.addEventListener("input", () => {
        visibleSetCount = 40;
        renderSets();
      });
      loadMoreExpansions.addEventListener("click", () => {
        visibleSetCount += 40;
        renderSets();
      });
      renderSets();
      return;
    }

    content.innerHTML = `${gameHeader}${integrationNoteMarkup}
      <div class="page-heading">
        <div><span class="eyebrow">${listedExpansion ? "ColeÃ§Ã£o real Â· fonte externa" : "Consulta direta por ID"}</span><h1>${escapeHtml(expansion.name)}</h1>${expansion.originalName ? `<p class="source-name-original">Nome original: ${escapeHtml(expansion.originalName)}</p>` : ""}<p>${listedExpansion ? "Dados, imagens e preÃ§os sÃ£o apresentados quando a fonte os disponibiliza." : "Este ID nÃ£o consta na lista de coleÃ§Ãµes disponÃ­vel. Tentaremos buscar as cartas diretamente; o nome e a data da expansÃ£o nÃ£o foram confirmados."}</p></div>
        <span class="demo-badge">${expansion.cardsCount ? `${escapeHtml(expansion.cardsCount)} cartas` : "ColeÃ§Ã£o"}</span>
      </div>
      <div class="source-policy">${localizationNote}<p>${escapeHtml(provider.policy)}</p>${sourceLink}</div>
      <div class="catalog-toolbar" aria-label="Filtros do catÃ¡logo">
        <label class="filter-field" for="filter-name">Buscar por nome
          <input id="filter-name" type="search" placeholder="Digite o nome da carta..." autocomplete="off">
        </label>
        <label class="filter-field" for="filter-rarity">Raridade
          <select id="filter-rarity"><option value="">Todas</option></select>
        </label>
        <label class="filter-field" for="filter-language">Idioma da impressÃ£o
          <select id="filter-language"><option value="">Todos</option></select>
        </label>
        <label class="filter-field" for="filter-variant">Variante
          <select id="filter-variant"><option value="">Todas</option></select>
        </label>
        <label class="filter-field" for="filter-condition">CondiÃ§Ã£o
          <select id="filter-condition"><option value="">Todas</option></select>
        </label>
        <label class="filter-field" for="filter-currency">Moeda do preÃ§o
          <select id="filter-currency"><option value="">Todas</option></select>
        </label>
        <label class="filter-field" for="sort-price">Ordenar preÃ§o
          <select id="sort-price">
            <option value="none">Ordem original</option>
            <option value="asc">PreÃ§o crescente</option>
            <option value="desc">PreÃ§o decrescente</option>
          </select>
        </label>
      </div>
      <p class="fx-note" id="fx-note" hidden></p>
      <p class="results-count" id="results-count" role="status"></p>
      <div class="card-grid" id="card-grid"></div>
      <button class="button load-more" id="load-more" type="button" hidden>Carregar mais cartas</button>
      <div class="source-policy"><p>Os filtros sÃ£o combinados entre si e os idiomas disponÃ­veis no filtro seguem cÃ³digos de impressÃ£o conhecidos pelos provedores; sÃ³ aparecem resultados quando a fonte disponibiliza aquela impressÃ£o no conjunto carregado. PreÃ§os raw e graded sÃ£o separados quando a fonte os distingue. O filtro BRL inclui cotaÃ§Ãµes brasileiras nativas identificadas e conversÃµes indicativas; a moeda original e a taxa do BCE permanecem identificadas. ConversÃ£o nÃ£o Ã© cotaÃ§Ã£o brasileira. A populaÃ§Ã£o PSA Ã© separada de preÃ§os.</p>${sourceLink}</div>
      <p class="demo-link"><a href="${escapeHtml(`${gameHref}&demo=1&expansao=${encodeURIComponent(expansion.id)}`)}">Abrir demonstraÃ§Ã£o fictÃ­cia</a></p>`;

    const nameFilter = document.querySelector("#filter-name");
    const rarityFilter = document.querySelector("#filter-rarity");
    const languageFilter = document.querySelector("#filter-language");
    const variantFilter = document.querySelector("#filter-variant");
    const conditionFilter = document.querySelector("#filter-condition");
    const currencyFilter = document.querySelector("#filter-currency");
    const priceSort = document.querySelector("#sort-price");
    const cardGrid = document.querySelector("#card-grid");
    const resultsCount = document.querySelector("#results-count");
    const loadMoreButton = document.querySelector("#load-more");
    const fxNote = document.querySelector("#fx-note");
    const cards = [];
    const exchangeRates = new Map();
    const unavailableCurrencies = new Set();
    let nextCursor = null;
    let loading = false;
    let visibleCardCount = 48;

    const cardPrices = (card) => {
      const selectedVariant = variantFilter.value
        ? card.variants.find((variant) => variant.name === variantFilter.value)
        : null;
      if (variantFilter.value) {
        return selectedVariant ? selectedVariant.prices.map((price) => ({ ...price, variant: selectedVariant.name })) : [];
      }
      return allCardPrices(card);
    };
    const allCardPrices = (card) => {
      const variantPrices = card.variants.flatMap((variant) =>
        (variant.prices || []).map((price) => ({ ...price, variant: variant.name }))
      );
      return (variantPrices.length ? variantPrices : card.prices || [])
        .filter((price) => price && price.currency);
    };
    const pricePresentation = (price, amount) => {
      const rate = price.currency === "BRL" ? 1 : exchangeRates.get(price.currency)?.rate;
      return {
        value: Number(amount) > 0 && rate ? Number(amount) * rate : Number(amount),
        currency: rate ? "BRL" : price.currency,
        rate: price.currency !== "BRL" ? exchangeRates.get(price.currency) : null
      };
    };
    const priceMarketName = (price) => ({
      br: "Mercado brasileiro",
      us: "Mercado dos EUA",
      eu: "Mercado europeu"
    })[price.region] || "Mercado nÃ£o identificado pela fonte";
    const displayedPrices = (card) => {
      const prices = cardPrices(card);
      const rawPrices = prices.filter((price) => price.type !== "graded");
      const gradedPrices = prices.filter((price) => price.type === "graded");
      const conditionFiltered = conditionFilter.value
        ? rawPrices.filter((price) => normalizeCondition(price.condition) === conditionFilter.value)
        : rawPrices;
      const currencyMatches = (price) => {
        if (!currencyFilter.value) return true;
        if (currencyFilter.value === "BRL") {
          return price.currency === "BRL" || Boolean(exchangeRates.get(price.currency)?.rate);
        }
        return price.currency === currencyFilter.value;
      };
      return {
        raw: conditionFiltered.filter(currencyMatches),
        graded: conditionFilter.value ? [] : gradedPrices.filter(currencyMatches)
      };
    };
    const comparablePrice = (card) => {
      const { raw } = displayedPrices(card);
      const amounts = raw.map((price) => {
        const amount = Number(price.market ?? price.value);
        if (!(amount > 0)) return null;
        const presentation = pricePresentation(price, amount);
        if (currencyFilter.value === "BRL" && presentation.currency !== "BRL") return null;
        return presentation.currency === "BRL" ? presentation.value : amount;
      }).filter(Number.isFinite);
      return amounts.length ? Math.min(...amounts) : null;
    };
    const refreshFilterOptions = () => {
      const selectedValues = new Map([
        [rarityFilter, rarityFilter.value],
        [languageFilter, languageFilter.value],
        [variantFilter, variantFilter.value],
        [conditionFilter, conditionFilter.value],
        [currencyFilter, currencyFilter.value]
      ]);
      const rarities = [...new Set(cards.map((card) => card.rarity).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
      const languages = [...new Set(cards.map((card) => card.language).filter(Boolean))].sort();
      const variants = [...new Set(cards.flatMap((card) => card.variants.map((variant) => variant.name)).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
      const conditions = [...new Set(cards.flatMap((card) => allCardPrices(card)
        .filter((price) => price.type !== "graded" && price.condition)
        .map((price) => normalizeCondition(price.condition))))];
      const knownConditions = ["near_mint", "lightly_played", "moderately_played", "heavily_played", "damaged"];
      const availableConditions = [...new Set([...knownConditions, ...conditions])].sort();
      const currencies = [...new Set(cards.flatMap((card) => allCardPrices(card).map((price) => price.currency)).filter(Boolean))].sort();
      const knownLanguages = ["en", "pt", "es", "fr", "de", "it", "ja", "ko", "zh-cn", "zh-tw", "ru", "th", "nl", "id", "vi", "ar", "he", "la", "sa", "grc", "qya", "ph"];
      const availableLanguages = [...new Set([...knownLanguages, ...languages])].sort();
      const options = [
        [rarityFilter, "Todas", rarities.map((value) => [value, value])],
        [languageFilter, "Todos", availableLanguages.map((value) => [value, `${languageName(value)} (${value.toUpperCase()})`])],
        [variantFilter, "Todas", variants.map((value) => [value, value])],
        [conditionFilter, "Todas", availableConditions.map((value) => [value, conditionName(value)])],
        [currencyFilter, "Todas as moedas", [
          ["BRL", "Real brasileiro (BRL Â· nativo ou cÃ¢mbio indicativo)"],
          ...currencies.filter((value) => value !== "BRL").map((value) => [value, `${currencyName(value)} (${value})`])
        ]]
      ];
      for (const [select, initialLabel, values] of options) {
        const selected = selectedValues.get(select);
        select.innerHTML = `<option value="">${initialLabel}</option>${values.map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join("")}`;
        if (values.some(([value]) => value === selected)) select.value = selected;
      }
    };
    const loadExchangeRates = async () => {
      const currencies = [...new Set(cards.flatMap((card) => allCardPrices(card).map((price) => price.currency)).filter((currency) => ["USD", "EUR", "JPY"].includes(currency)))];
      for (const currency of currencies) {
        if (exchangeRates.has(currency)) continue;
        try {
          exchangeRates.set(currency, await providers.scrydex.exchangeRate(currency));
        } catch (error) {
          exchangeRates.set(currency, null);
          unavailableCurrencies.add(currency);
        }
      }
      if (unavailableCurrencies.size) {
        fxNote.hidden = false;
        fxNote.textContent = `NÃ£o foi possÃ­vel consultar a conversÃ£o indicativa do BCE para BRL (${[...unavailableCurrencies].join(", ")}); os valores originais continuam disponÃ­veis.`;
      }
    };

    const renderCards = () => {
      const query = nameFilter.value.trim().toLocaleLowerCase("pt-BR");
      const rarity = rarityFilter.value;
      const language = languageFilter.value;
      const variant = variantFilter.value;
      const condition = conditionFilter.value;
      const currency = currencyFilter.value;
      const sort = priceSort.value;
      const filteredCards = cards.filter((card) => {
        const matchesName = card.name.toLocaleLowerCase("pt-BR").includes(query) ||
          (card.originalName || "").toLocaleLowerCase("pt-BR").includes(query) ||
          String(card.number || "").toLocaleLowerCase("pt-BR").includes(query);
        const matchesRarity = !rarity || card.rarity === rarity;
        const matchesLanguage = !language || card.language === language;
        const matchesVariant = !variant || card.variants.some((item) => item.name === variant);
        const availablePrices = displayedPrices(card);
        const matchesCondition = !condition || availablePrices.raw.some((price) => normalizeCondition(price.condition) === condition);
        const matchesPrice = !condition && !currency
          ? true
          : availablePrices.raw.length > 0 || (!condition && availablePrices.graded.length > 0);
        return matchesName && matchesRarity && matchesLanguage && matchesVariant && matchesCondition && matchesPrice;
      });
      if (sort === "asc") filteredCards.sort((first, second) => (comparablePrice(first) ?? Infinity) - (comparablePrice(second) ?? Infinity));
      if (sort === "desc") filteredCards.sort((first, second) => (comparablePrice(second) ?? -Infinity) - (comparablePrice(first) ?? -Infinity));
      const displayedCards = filteredCards.slice(0, visibleCardCount);
      const priceSortNote = sort !== "none" ? " Â· ordenado pelo menor preÃ§o raw disponÃ­vel; valores convertidos para BRL quando possÃ­vel" : "";
      resultsCount.textContent = `${displayedCards.length} de ${filteredCards.length} cartas carregadas${expansion.cardsCount ? ` Â· ${expansion.cardsCount} na coleÃ§Ã£o` : ""}${priceSortNote}`;
      cardGrid.innerHTML = filteredCards.length === 0
        ? `<p class="empty-state">${currency === "BRL" && unavailableCurrencies.size
          ? `NÃ£o hÃ¡ conversÃ£o para BRL disponÃ­vel agora (${escapeHtml([...unavailableCurrencies].join(", "))}). Os filtros continuam aplicados; tente uma moeda original.`
          : condition
            ? "A fonte nÃ£o informou preÃ§o para esta condiÃ§Ã£o nessa combinaÃ§Ã£o. NÃ£o exibimos uma estimativa como se fosse preÃ§o observado."
            : "Nenhuma carta encontrada com essa combinaÃ§Ã£o de filtros e preÃ§os disponÃ­veis na fonte."}</p>`
        : displayedCards.map((card) => {
          const safeSourceUrl = card.sourceUrl && /^https:\/\//.test(card.sourceUrl)
            ? `<a href="${escapeHtml(card.sourceUrl)}" target="_blank" rel="noreferrer">Consultar fonte â†—</a>`
            : "";
          const selectedVariant = variant
            ? card.variants.find((item) => item.name === variant)
            : card.variants[0];
          const imageUrl = safeImageUrl(variant ? selectedVariant?.imageUrl : selectedVariant?.imageUrl || card.imageUrl);
          const { raw, graded } = displayedPrices(card);
          const allPrices = [...raw, ...graded].filter((price) =>
            !(price.region === "br" && price.currency === "BRL")
          );
          const priceMarkup = allPrices.length
            ? allPrices.map((price) => {
                const value = Number(price.market ?? price.value);
                const conversion = exchangeRates.get(price.currency);
                  const convertedToBrl = currencyFilter.value === "BRL" && price.currency !== "BRL";
                  const display = convertedToBrl
                    ? pricePresentation(price, value)
                    : { value, currency: price.currency, rate: null };
                  const low = Number(price.low) > 0 ? Number(price.low) : null;
                  const high = Number(price.high) > 0 ? Number(price.high) : null;
                  const sourceRange = low && high
                  ? `${formatPrice(low, price.currency)} â€“ ${formatPrice(high, price.currency)}`
                  : low
                    ? `A partir de ${formatPrice(low, price.currency)}`
                    : high
                      ? `AtÃ© ${formatPrice(high, price.currency)}`
                      : "";
                const convertedValue = value > 0 && conversion?.rate ? value * conversion.rate : null;
                const converted = convertedValue
                  ? `<small class="converted-price">${convertedToBrl
                    ? `<span>Origem: ${formatPrice(value, price.currency)} Â· taxa ${escapeHtml(conversion.provider)}, ${escapeHtml(conversion.date)}</span><span>ConversÃ£o cambial indicativa; nÃ£o Ã© preÃ§o do mercado brasileiro</span>`
                    : `<strong>Equivalente cambial: ${formatPrice(convertedValue)}</strong><span>ReferÃªncia em ${price.currency}; ${escapeHtml(conversion.provider)}, ${escapeHtml(conversion.date)}. NÃ£o Ã© preÃ§o do mercado brasileiro.</span>`}</small>`
                  : "";
                const displayedLow = low ? pricePresentation(price, low) : null;
                const displayedHigh = high ? pricePresentation(price, high) : null;
                const range = low && high
                  ? `${formatPrice(displayedLow.value, displayedLow.currency)} â€“ ${formatPrice(displayedHigh.value, displayedHigh.currency)}`
                  : low
                    ? `A partir de ${formatPrice(displayedLow.value, displayedLow.currency)}`
                    : high
                      ? `AtÃ© ${formatPrice(displayedHigh.value, displayedHigh.currency)}`
                      : null;
                const priceLabel = value > 0
                  ? formatPrice(display.value, display.currency)
                  : range || "IndisponÃ­vel";
                const priceDetails = price.type === "graded"
                  ? `${price.company || "Graded"} ${price.grade || ""}`.trim()
                  : `${price.source || "PreÃ§o raw"}${price.condition ? ` Â· ${conditionName(price.condition)}` : " Â· condiÃ§Ã£o nÃ£o informada"}`;
                const label = `${priceMarketName(price)} Â· ${priceDetails}${price.scope === "card" ? " Â· impressÃ£o nÃ£o identificada pela fonte" : ""}${price.type !== "graded" && value <= 0 && range ? " Â· faixa informada pela fonte" : ""}`;
                const currencyCaption = display.currency === "BRL"
                  ? price.currency === "BRL" ? " Â· BRL informado pela fonte; mercado nÃ£o confirmado" : " Â· conversÃ£o indicativa"
                  : ` Â· ${price.currency} da fonte`;
                const sourceUpdated = price.updatedAt
                  ? `<small class="price-updated">Atualizado pela fonte: ${escapeHtml(price.updatedAt)}</small>`
                  : "";
                return `<div class="card-price ${price.type === "graded" ? "graded-price" : ""}"><span>${escapeHtml(`${label}${currencyCaption}`)}</span><strong>${escapeHtml(priceLabel)}</strong>${converted}${sourceUpdated}</div>`;
            }).join("")
            : `<div class="card-price"><span>PreÃ§o de mercado</span><strong>IndisponÃ­vel</strong></div>`;
          const brazilMarketPrices = allCardPrices(card).filter((price) => price.region === "br" && price.currency === "BRL");
          const brazilMarketMarkup = brazilMarketPrices.length
            ? brazilMarketPrices.map((price) => `<div class="card-price"><span>Mercado brasileiro Â· ${escapeHtml(price.source || "Fonte")}</span><strong>${formatPrice(price.market ?? price.value, "BRL")}</strong></div>`).join("")
            : `<div class="card-price"><span>Mercado brasileiro Â· BRL</span><strong>IndisponÃ­vel</strong><small class="price-updated">Nenhuma fonte brasileira de preÃ§os estÃ¡ integrada.</small></div>`;
          const conditions = raw.filter((price) => price.condition);
          const conditionMarkup = conditions.length
            ? `<div class="condition-prices"><h4>PreÃ§os por condiÃ§Ã£o Â· BRL quando conversÃ­vel</h4><dl>${conditions.map((price) => {
              const amount = Number(price.market ?? price.value);
              const display = pricePresentation(price, amount);
              const original = display.rate && amount > 0
                ? `<small class="condition-original">Origem: ${formatPrice(amount, price.currency)} Â· ${escapeHtml(display.rate.provider)}, ${escapeHtml(display.rate.date)}</small>`
                : "";
              return `<div class="condition-price-row"><dt>${escapeHtml(conditionName(price.condition))}</dt><dd>${amount > 0 ? formatPrice(display.value, display.currency) : "IndisponÃ­vel"}${original}</dd></div>`;
            }).join("")}</dl></div>`
            : "";
          const populationMarkup = card.population.flatMap((report) => {
            const company = String(report.company || report.grading_company || report.gradingCompany || "").toUpperCase();
            if (company !== "PSA") return [];
            const total = Number(report.total || report.population || report.count);
            const grades = Array.isArray(report.grades) ? report.grades : [];
            const summary = Number.isFinite(total) && total > 0 ? `PopulaÃ§Ã£o informada: ${total}` : "RelatÃ³rio de populaÃ§Ã£o fornecido pela fonte.";
            const gradeSummary = grades.map((grade) => {
                const label = grade.grade || grade.name || "Nota nÃ£o informada";
                const count = Number(grade.count || grade.population);
                return `${escapeHtml(label)}: ${Number.isFinite(count) ? count : "nÃ£o informado"}`;
            }).join(" Â· ");
            return [`<div class="population-data"><strong>PopulaÃ§Ã£o PSA</strong><span>${escapeHtml(summary)}</span>${gradeSummary ? `<small>${gradeSummary}</small>` : ""}</div>`];
          }).join("");
          const languageMarkup = card.language
            ? `<span>Idioma: <strong>${escapeHtml(languageName(card.language))}</strong></span>`
            : "";
          const variantMarkup = selectedVariant
            ? `<span>Variante: <strong>${escapeHtml(selectedVariant.name)}</strong></span>`
            : "";
          const historyMarkup = usesScrydex && card.id
            ? `<button class="history-button" type="button" data-card-id="${escapeHtml(card.id)}" data-variant="${escapeHtml(selectedVariant?.name || "")}">Ver histÃ³rico</button><div class="history-panel" data-history-for="${escapeHtml(card.id)}" hidden></div>`
            : "";
          return `<article class="trading-card" style="--game-color:${escapeHtml(game.color)}">
            <div class="card-art ${imageUrl ? "has-card-image" : "card-art-placeholder"}">
                ${imageUrl
                  ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(`Carta ${card.name}`)}" data-card-name="${escapeHtml(card.name)}" data-card-number="${escapeHtml(card.number || "")}" loading="lazy" referrerpolicy="no-referrer"><span>Imagem da fonte</span>`
                  : cardImagePlaceholderMarkup(card.name, card.number)}
            </div>
            <div class="trading-card-info">
                <h3 ${card.originalName ? `title="${escapeHtml(`Nome original na fonte: ${card.originalName}`)}"` : ""}>${escapeHtml(card.name)}</h3>
                ${card.originalName ? `<p class="card-original-name">Nome original: ${escapeHtml(card.originalName)}</p>` : ""}
                <div class="card-attributes">
                <span>NÃºmero: <strong>${escapeHtml(card.number || "NÃ£o informado")}</strong></span>
                <span>Raridade: <strong>${escapeHtml(card.rarity || "NÃ£o informada")}</strong></span>
                ${languageMarkup}${variantMarkup}
                </div>
                ${brazilMarketMarkup}${priceMarkup}
                ${conditionMarkup}${populationMarkup}${historyMarkup}
                ${safeSourceUrl ? `<div class="card-source-link">${safeSourceUrl}</div>` : ""}
            </div>
          </article>`;
        }).join("");
      loadMoreButton.hidden = filteredCards.length <= visibleCardCount && !nextCursor;
      cardGrid.querySelectorAll(".card-art img").forEach((image) => {
        image.addEventListener("error", () => {
          const artwork = image.parentElement;
          artwork.classList.remove("has-card-image");
          artwork.classList.add("card-art-placeholder");
          artwork.innerHTML = cardImagePlaceholderMarkup(
            image.dataset.cardName || image.alt,
            image.dataset.cardNumber
          );
        }, { once: true });
      });
    };

    const loadCards = async () => {
      if (loading) return;
      loading = true;
      loadMoreButton.disabled = true;
      loadMoreButton.textContent = "Carregando...";
      try {
        const result = usesScrydex
          ? await provider.cards(gameId, expansion, nextCursor || 1)
          : await provider.cards(expansion, nextCursor);
        cards.push(...result.cards.map((card) => ({
          ...card,
          imageUrl: safeImageUrl(card.imageUrl),
          variants: Array.isArray(card.variants) ? card.variants : [],
          prices: Array.isArray(card.prices) ? card.prices : [],
          population: Array.isArray(card.population) ? card.population : []
        })));
        nextCursor = result.nextCursor;
        refreshFilterOptions();
        renderCards();
        await loadExchangeRates();
        if ([...exchangeRates.values()].some((conversion) => conversion?.rate)) {
          fxNote.hidden = false;
          fxNote.innerHTML = `ConversÃµes em BRL sÃ£o indicativas, nÃ£o cotaÃ§Ãµes brasileiras. Fonte: <a href="https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html" target="_blank" rel="noreferrer">taxas de referÃªncia do BCE</a>.${unavailableCurrencies.size ? ` ConversÃ£o indisponÃ­vel para: ${escapeHtml([...unavailableCurrencies].join(", "))}.` : ""}`;
        }
        renderCards();
      } catch (error) {
        const retryButton = `<button class="button retry-cards" id="retry-cards" type="button">Tentar novamente</button>`;
        if (cards.length === 0) {
          cardGrid.innerHTML = `<div class="empty-state" role="alert">NÃ£o foi possÃ­vel carregar as cartas: ${escapeHtml(error.message)}. <a href="${escapeHtml(provider.url)}" target="_blank" rel="noreferrer">Ver a fonte</a><p>${retryButton}</p></div>`;
        } else {
          cardGrid.insertAdjacentHTML("beforeend", `<div class="empty-state" role="alert">Falha ao carregar mais cartas: ${escapeHtml(error.message)}<p>${retryButton}</p></div>`);
        }
        document.querySelector("#retry-cards")?.addEventListener("click", loadCards);
      } finally {
        loading = false;
        loadMoreButton.disabled = false;
        loadMoreButton.textContent = "Carregar mais cartas";
      }
    };

    const showMoreCards = async () => {
      visibleCardCount += 48;
      if (cards.length < visibleCardCount && nextCursor) {
        await loadCards();
      } else {
        renderCards();
      }
    };

    nameFilter.addEventListener("input", renderCards);
    [rarityFilter, languageFilter, variantFilter, conditionFilter, currencyFilter, priceSort].forEach((filter) => {
      filter.addEventListener("change", renderCards);
    });
    cardGrid.addEventListener("click", async (event) => {
      const button = event.target.closest(".history-button");
      if (!button) return;
      const panel = cardGrid.querySelector(`[data-history-for="${CSS.escape(button.dataset.cardId)}"]`);
      if (!panel) return;
      button.disabled = true;
      panel.hidden = false;
      panel.textContent = "Consultando histÃ³rico disponÃ­vel...";
      try {
        const response = await provider.history(gameId, button.dataset.cardId, button.dataset.variant);
        const history = Array.isArray(response.history) ? response.history : [];
        panel.innerHTML = history.length
          ? `<strong>Registros observados pelo catÃ¡logo</strong>${history.slice(0, 8).map((item) => {
            const value = item.market ?? item.low ?? item.high;
            const display = pricePresentation(item, Number(value));
            const historyPrice = `${formatPrice(display.value, display.currency)}${display.rate && Number(value) > 0 ? ` (origem ${formatPrice(value, item.currency)}, BCE ${display.rate.date})` : ""}`;
            const details = [item.variant, item.price_type === "graded" ? `${item.grading_company || "Graded"} ${item.grade || ""}` : conditionName(item.condition_name), historyPrice].filter(Boolean).join(" Â· ");
            return `<p>${escapeHtml(new Date(item.captured_at).toLocaleString("pt-BR"))}<br><span>${escapeHtml(details)}</span></p>`;
          }).join("")}`
          : "Sem histÃ³rico registrado. Os snapshots comeÃ§am a ser gravados apÃ³s consultas a esta carta.";
      } catch (error) {
        panel.textContent = `NÃ£o foi possÃ­vel consultar o histÃ³rico: ${error.message}`;
      } finally {
        button.disabled = false;
      }
    });
    loadMoreButton.addEventListener("click", showMoreCards);
    await loadCards();
  };

  if (!Array.isArray(games)) {
    showNotFound("NÃ£o foi possÃ­vel carregar os dados do catÃ¡logo.");
    return;
  }

  if (gameId && params.get("demo") !== "1" && !staticDemo) {
    let provider = providers[gameId];
    if (provider) {
      document.querySelector(".demo-note").hidden = true;
      const scrydexGames = ["pokemon", "magic", "one-piece", "lorcana"];
      if (scrydexGames.includes(gameId) && providers.scrydex && window.location.protocol === "file:") {
        renderOnlineCatalog(
          provider,
          false,
          "O site foi aberto como arquivo local (file://). As fontes pÃºblicas e a conversÃ£o cambial podem funcionar; a Scrydex e o histÃ³rico exigem iniciar o servidor com python3 server.py e acessar http://127.0.0.1:8000."
        );
      } else if (scrydexGames.includes(gameId) && providers.scrydex) {
        providers.scrydex.status().then((status) => {
          if (status.configured) {
            renderOnlineCatalog(providers.scrydex, true);
          } else {
            renderOnlineCatalog(provider, false, "Scrydex nÃ£o configurada: esta pÃ¡gina usa a fonte complementar indicada abaixo; imagens, variantes, histÃ³rico e dados PSA da Scrydex nÃ£o estarÃ£o disponÃ­veis.");
          }
        }).catch((error) => {
          renderOnlineCatalog(provider, false, `NÃ£o foi possÃ­vel verificar a configuraÃ§Ã£o do catÃ¡logo premium (${error.message}); exibindo a fonte complementar disponÃ­vel.`);
        });
      } else {
        renderOnlineCatalog(provider);
      }
    } else if (gameId === "marvel") {
      showNotFound("Cartas colecionÃ¡veis Marvel / Upper Deck ainda nÃ£o tÃªm uma fonte autorizada conectada. Acesse a versÃ£o demonstrativa.");
      const message = document.querySelector("#catalog-content");
      message.insertAdjacentHTML("beforeend", `<p class="demo-link"><a href="${escapeHtml(`catalogo.html?jogo=marvel&demo=1`)}">Abrir catÃ¡logo de demonstraÃ§Ã£o</a></p>`);
    }
    return;
  }

  const game = games.find((item) => item.id === gameId);
  if (!game) {
    showNotFound("Jogo nÃ£o encontrado.");
    return;
  }

  const sortedExpansions = [...game.expansions].sort(
    (first, second) => Date.parse(second.releaseDate) - Date.parse(first.releaseDate)
  );
  const gameHref = `catalogo.html?jogo=${encodeURIComponent(game.id)}&demo=1`;
  const expansion = expansionId
    ? sortedExpansions.find((item) => item.id === expansionId)
    : null;

  if (expansionId && !expansion) {
    showNotFound("ExpansÃ£o nÃ£o encontrada para este jogo.");
    return;
  }

  const gameHeader = `
    <div class="game-banner" style="--game-color:${escapeHtml(game.color)}">
      <img class="game-icon" src="${escapeHtml(game.icon)}" alt="Ãcone de ${escapeHtml(game.name)}">
      <div><h1>${escapeHtml(game.name)}</h1><p>${escapeHtml(game.description)}</p></div>
      ${characterArtworkMarkup(game.id)}
    </div>`;

  if (!expansion) {
    breadcrumbs.innerHTML = `${breadcrumb("InÃ­cio", "index.html")}<span class="separator">/</span>${breadcrumb(game.name)}`;
    content.innerHTML = `
      ${gameHeader}
      <div class="page-heading">
        <div><span class="eyebrow">CatÃ¡logo do jogo</span><h1>ExpansÃµes</h1><p>Explore as coleÃ§Ãµes comeÃ§ando pelas mais recentes.</p></div>
        <span class="demo-badge">Dados de demonstraÃ§Ã£o</span>
      </div>
      <section aria-labelledby="expansions-heading">
        <h2 class="section-title" id="expansions-heading">Mais recentes primeiro</h2>
        <div class="expansion-list">
          ${sortedExpansions.map((item) => {
            const href = `${gameHref}&expansao=${encodeURIComponent(item.id)}`;
            const formattedDate = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${item.releaseDate}T12:00:00Z`));
            return `<a class="expansion-link" style="--game-color:${escapeHtml(game.color)}" href="${escapeHtml(href)}">
              <div><h3>${escapeHtml(item.name)}</h3><p>LanÃ§amento demonstrativo: ${escapeHtml(formattedDate)} Â· ${item.cards.length} cartas de exemplo</p></div>
              <span class="expansion-arrow" aria-hidden="true">â†’</span>
            </a>`;
          }).join("")}
        </div>
      </section>`;
    return;
  }

  breadcrumbs.innerHTML = `${breadcrumb("InÃ­cio", "index.html")}<span class="separator">/</span>${breadcrumb(game.name, gameHref)}<span class="separator">/</span>${breadcrumb(expansion.name)}`;
  content.innerHTML = `
    ${gameHeader}
    <div class="page-heading">
      <div><span class="eyebrow">ExpansÃ£o demonstrativa</span><h1>${escapeHtml(expansion.name)}</h1><p>Cartas de exemplo desta coleÃ§Ã£o. Use os filtros para encontrar uma carta.</p></div>
      <span class="demo-badge">${expansion.cards.length} cartas fictÃ­cias</span>
    </div>
    <p class="condition-demo-notice">Todos os preÃ§os e variaÃ§Ãµes por condiÃ§Ã£o desta pÃ¡gina sÃ£o fictÃ­cios e servem apenas para demonstraÃ§Ã£o.</p>
    <div class="catalog-toolbar" aria-label="Filtros do catÃ¡logo">
      <label class="filter-field" for="filter-name">Buscar por nome
        <input id="filter-name" type="search" placeholder="Digite o nome da carta..." autocomplete="off">
      </label>
      <label class="filter-field" for="filter-rarity">Raridade
        <select id="filter-rarity">
          <option value="">Todas</option>
          <option value="Comum">Comum</option>
          <option value="Incomum">Incomum</option>
          <option value="Rara">Rara</option>
          <option value="LendÃ¡ria">LendÃ¡ria</option>
        </select>
      </label>
      <label class="filter-field" for="sort-price">Ordenar preÃ§o
        <select id="sort-price">
          <option value="none">Ordem original</option>
          <option value="asc">PreÃ§o crescente</option>
          <option value="desc">PreÃ§o decrescente</option>
        </select>
      </label>
    </div>
    <p class="results-count" id="results-count" role="status"></p>
    <div class="card-grid" id="card-grid"></div>`;

  const nameFilter = document.querySelector("#filter-name");
  const rarityFilter = document.querySelector("#filter-rarity");
  const priceSort = document.querySelector("#sort-price");
  const cardGrid = document.querySelector("#card-grid");
  const resultsCount = document.querySelector("#results-count");
  const hasConditionPrices = expansion.cards.some((card) => card.pricesByCondition);

  if (hasConditionPrices) {
    priceSort.options[1].textContent = "PreÃ§o crescente (NM)";
    priceSort.options[2].textContent = "PreÃ§o decrescente (NM)";
  }

  const renderCards = () => {
    const query = nameFilter.value.trim().toLocaleLowerCase("pt-BR");
    const rarity = rarityFilter.value;
    const sort = priceSort.value;
    const filteredCards = expansion.cards.filter((card) => {
      const matchesName = card.name.toLocaleLowerCase("pt-BR").includes(query);
      const matchesRarity = !rarity || card.rarity === rarity;
      return matchesName && matchesRarity;
    });

    if (sort === "asc") filteredCards.sort((first, second) => first.price - second.price);
    if (sort === "desc") filteredCards.sort((first, second) => second.price - first.price);

    resultsCount.textContent = `${filteredCards.length} de ${expansion.cards.length} cartas demonstrativas`;
    if (filteredCards.length === 0) {
      cardGrid.innerHTML = `<p class="empty-state">Nenhuma carta encontrada com esses filtros.</p>`;
      return;
    }

    cardGrid.innerHTML = filteredCards.map((card) => {
      const conditionPriceMarkup = card.pricesByCondition
        ? `<div class="condition-prices">
            <h4>PreÃ§os fictÃ­cios por condiÃ§Ã£o</h4>
            <dl>
              ${conditionLevels.map(({ id, label }) => `
                <div class="condition-price-row">
                  <dt>${escapeHtml(label)}</dt>
                  <dd>${formatPrice(card.pricesByCondition[id])}</dd>
                </div>`).join("")}
            </dl>
            <p>Valores ilustrativos, sem cotaÃ§Ã£o de mercado.</p>
          </div>`
        : `<div class="card-price"><span>PreÃ§o de referÃªncia fictÃ­cio</span><strong>${formatPrice(card.price)}</strong></div>`;

      return `
        <article class="trading-card" style="--game-color:${escapeHtml(game.color)}">
          <div class="card-art" role="img" aria-label="EspaÃ§o reservado para a imagem de ${escapeHtml(card.name)}"><span>Imagem demonstrativa</span></div>
          <div class="trading-card-info">
            <h3>${escapeHtml(card.name)}</h3>
            <div class="card-attributes">
              <span>NÃºmero: <strong>${escapeHtml(card.number)}</strong></span>
              <span>Raridade: <strong>${escapeHtml(card.rarity)}</strong></span>
            </div>
            ${conditionPriceMarkup}
          </div>
        </article>`;
    }).join("");
  };

  nameFilter.addEventListener("input", renderCards);
  rarityFilter.addEventListener("change", renderCards);
  priceSort.addEventListener("change", renderCards);
  renderCards();
})();
