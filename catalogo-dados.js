window.ELITE_CONDITION_LEVELS = [
  { id: "nearMint", label: "Quase nova (NM)" },
  { id: "lightlyPlayed", label: "Levemente jogada (LP)" },
  { id: "moderatelyPlayed", label: "Moderadamente jogada (MP)" },
  { id: "heavilyPlayed", label: "Muito jogada (HP)" },
  { id: "damaged", label: "Danificada (D)" }
];

window.ELITE_CATALOG_DATA = [
  {
    id: "pokemon",
    name: "Pokémon",
    icon: "pokemon.png",
    color: "#e68a20",
    description: "Explore expansões, raridades e cartas do universo Pokémon.",
    expansions: [
      {
        id: "aurora-cristalina",
        name: "Aurora Cristalina — Demonstração",
        releaseDate: "2026-09-18",
        cards: [
          {
            name: "Guardião Prismático",
            number: "001/120",
            rarity: "Rara",
            price: 42.9,
            pricesByCondition: { nearMint: 42.9, lightlyPlayed: 38, moderatelyPlayed: 31, heavilyPlayed: 22, damaged: 12 },
            priceSource: { kind: "demo", provider: null, currency: "BRL", observedAt: null }
          },
          {
            name: "Raposa das Nuvens",
            number: "024/120",
            rarity: "Incomum",
            price: 8.5,
            pricesByCondition: { nearMint: 8.5, lightlyPlayed: 7.2, moderatelyPlayed: 5.7, heavilyPlayed: 3.5, damaged: 1.5 },
            priceSource: { kind: "demo", provider: null, currency: "BRL", observedAt: null }
          }
        ]
      },
      {
        id: "trilhas-celestes",
        name: "Trilhas Celestes — Demonstração",
        releaseDate: "2026-03-07",
        cards: [
          {
            name: "Viajante Estelar",
            number: "008/098",
            rarity: "Lendária",
            price: 76,
            pricesByCondition: { nearMint: 76, lightlyPlayed: 68, moderatelyPlayed: 55, heavilyPlayed: 39, damaged: 20 },
            priceSource: { kind: "demo", provider: null, currency: "BRL", observedAt: null }
          },
          {
            name: "Semente Radiante",
            number: "031/098",
            rarity: "Comum",
            price: 3.25,
            pricesByCondition: { nearMint: 3.25, lightlyPlayed: 2.8, moderatelyPlayed: 2.1, heavilyPlayed: 1.3, damaged: 0.5 },
            priceSource: { kind: "demo", provider: null, currency: "BRL", observedAt: null }
          }
        ]
      }
    ]
  },
  {
    id: "magic",
    name: "Magic",
    icon: "magic.jpeg",
    color: "#586bd6",
    description: "Descubra expansões e cartas para suas próximas estratégias.",
    expansions: [
      {
        id: "ecos-do-etereo",
        name: "Ecos do Etéreo — Demonstração",
        releaseDate: "2026-10-02",
        cards: [
          { name: "Oráculo do Horizonte", number: "014/110", rarity: "Rara", price: 35 },
          { name: "Jardim de Cristal", number: "047/110", rarity: "Incomum", price: 6.75 }
        ]
      },
      {
        id: "forja-ancestral",
        name: "Forja Ancestral — Demonstração",
        releaseDate: "2026-04-11",
        cards: [
          { name: "Colosso de Bronze", number: "003/096", rarity: "Lendária", price: 91.5 },
          { name: "Faísca da Forja", number: "052/096", rarity: "Comum", price: 2.4 }
        ]
      }
    ]
  },
  {
    id: "marvel",
    name: "Marvel",
    icon: "marvel.jpeg",
    color: "#dc4772",
    description: "Conheça as coleções e cartas do universo de heróis.",
    expansions: [
      {
        id: "convergencia-cosmica",
        name: "Convergência Cósmica — Demonstração",
        releaseDate: "2026-08-21",
        cards: [
          { name: "Sentinela Celeste", number: "006/104", rarity: "Rara", price: 28.9 },
          { name: "Inventora de Aço", number: "039/104", rarity: "Incomum", price: 7.2 }
        ]
      },
      {
        id: "protetores-da-cidade",
        name: "Protetores da Cidade — Demonstração",
        releaseDate: "2026-02-13",
        cards: [
          { name: "Vigia Noturno", number: "011/088", rarity: "Lendária", price: 68 },
          { name: "Mensageiro Veloz", number: "044/088", rarity: "Comum", price: 3.1 }
        ]
      }
    ]
  },
  {
    id: "one-piece",
    name: "One Piece",
    icon: "one pice .jpeg",
    color: "#079c9a",
    description: "Navegue pelas expansões e cartas desta aventura.",
    expansions: [
      {
        id: "mares-de-ambar",
        name: "Mares de Âmbar — Demonstração",
        releaseDate: "2026-07-24",
        cards: [
          { name: "Capitã do Vento Sul", number: "021/112", rarity: "Rara", price: 32.5 },
          { name: "Mapa das Correntes", number: "057/112", rarity: "Incomum", price: 5.9 }
        ]
      },
      {
        id: "ilhas-distantes",
        name: "Ilhas Distantes — Demonstração",
        releaseDate: "2026-01-30",
        cards: [
          { name: "Navegador do Amanhã", number: "002/090", rarity: "Lendária", price: 84 },
          { name: "Concha Guardiã", number: "063/090", rarity: "Comum", price: 2.75 }
        ]
      }
    ]
  },
  {
    id: "yu-gi-oh",
    name: "Yu-Gi-Oh!",
    icon: "yu gi oh .png",
    color: "#9149cf",
    description: "Confira as coleções e prepare suas próximas combinações.",
    expansions: [
      {
        id: "portais-do-caos",
        name: "Portais do Caos — Demonstração",
        releaseDate: "2026-09-04",
        cards: [
          { name: "Mago do Vórtice", number: "018/106", rarity: "Rara", price: 39.9 },
          { name: "Selo de Energia", number: "072/106", rarity: "Incomum", price: 6.1 }
        ]
      },
      {
        id: "reliquias-perdidas",
        name: "Relíquias Perdidas — Demonstração",
        releaseDate: "2026-03-20",
        cards: [
          { name: "Dragão de Quartzo", number: "001/094", rarity: "Lendária", price: 95 },
          { name: "Fragmento Antigo", number: "049/094", rarity: "Comum", price: 2.25 }
        ]
      }
    ]
  },
  {
    id: "lorcana",
    name: "Lorcana",
    icon: "lorcana.jpeg",
    color: "#287fce",
    description: "Descubra novas histórias através das expansões e cartas.",
    expansions: [
      {
        id: "livro-das-estrelas",
        name: "Livro das Estrelas — Demonstração",
        releaseDate: "2026-10-09",
        cards: [
          { name: "Guardião das Marés", number: "012/108", rarity: "Rara", price: 31 },
          { name: "Pássaro de Safira", number: "038/108", rarity: "Incomum", price: 7.45 }
        ]
      },
      {
        id: "jardins-de-luz",
        name: "Jardins de Luz — Demonstração",
        releaseDate: "2026-05-15",
        cards: [
          { name: "Dançarina do Luar", number: "004/092", rarity: "Lendária", price: 73.5 },
          { name: "Pequena Lanterna", number: "055/092", rarity: "Comum", price: 2.95 }
        ]
      }
    ]
  }
];

const DEMO_CONDITION_MULTIPLIERS = {
  nearMint: 1,
  lightlyPlayed: 0.88,
  moderatelyPlayed: 0.72,
  heavilyPlayed: 0.52,
  damaged: 0.3
};

for (const game of window.ELITE_CATALOG_DATA) {
  for (const expansion of game.expansions) {
    for (const card of expansion.cards) {
      if (!card.pricesByCondition) {
        card.pricesByCondition = Object.fromEntries(
          Object.entries(DEMO_CONDITION_MULTIPLIERS).map(([condition, multiplier]) => [
            condition,
            Math.round(card.price * multiplier * 100) / 100
          ])
        );
      }

      if (!card.priceSource) {
        card.priceSource = {
          kind: "demo",
          provider: null,
          currency: "BRL",
          observedAt: null
        };
      }
    }
  }
}
