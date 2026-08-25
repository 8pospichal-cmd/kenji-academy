// ============================================
// KENJI ACADEMY — KURZY (MANIFEST)
// ============================================
// Jediný zdroj pravdy o videokurzech. Sekce Kurzy (kurzy.html) a detail
// kurzu (kurz.html) se generují odsud — stejný princip jako articles.js.
//
// PŘIDÁNÍ VIDEA: k lekci doplň youtube: 'VIDEO_ID' (jen ID, ne celá URL).
//   Dokud je youtube null, lekce se tváří jako „připravujeme".
// NÁHLED KURZU: ke kurzu doplň thumb: 'assets/kurz-xy.jpg' (obrázek 16:9).
//   Dokud thumb chybí, ukáže se textový fallback s názvem kurzu.
//
// Kurzy jsou prémiové — vidí je jen členové (tier academy). Nečlen vidí
// strukturu jako ochutnávku, ale video je zamčené.
// ============================================

const KENJI_COURSES = [
  {
    slug: 'zaklady-technika',
    icon: '📸',
    title: 'Základy, technika a vybavení',
    desc: 'Naučím tě základy focení, ukážu ti, jaké a jak fotovybavení používám.',
    thumb: 'assets/cover-zaklady-technika.webp',
    modules: [
      { title: '📍 Začínám fotografovat', lessons: [
        { title: 'Potřebuju lepší techniku?', youtube: null },
        { title: 'Těmhle chybám se vyvaruj', youtube: null },
        { title: 'Potřebuješ fotografický oko?', youtube: null },
        { title: 'Jak zmáknout clonu?', youtube: null },
        { title: 'Nechceš mít rozmazaný fotky?', youtube: null },
        { title: 'ISO', youtube: null },
        { title: 'Expozice', youtube: null },
        { title: 'Manuál vs automat', youtube: null },
        { title: 'RAW vs JPG', youtube: null },
        { title: 'Autofocus', youtube: null },
        { title: 'Webinář — QnA', youtube: null }
      ]},
      { title: '🎒 Technika a vybavení', lessons: [
        { title: 'Základy svícení', youtube: null },
        { title: 'Objektivy', youtube: null },
        { title: 'Fotovybavení', youtube: null }
      ]},
      { title: '🏞️ Úprava fotek', lessons: [
        { title: 'Masterclass úpravy fotek', youtube: null },
        { title: 'Jak používat moje presety', youtube: null },
        { title: 'Postprodukce fotek: Adobe Photoshop', youtube: null },
        { title: 'Color grading v Adobe Lightroom a Photoshop', youtube: null },
        { title: 'Upravujeme psí fotešky', youtube: null }
      ]},
      { title: '⭐️ Bonusy', lessons: [
        { title: 'Z pohledu modelky — pokec o modelkování', youtube: null }
      ]}
    ]
  },

  {
    slug: 'foceni-jako-byznys',
    icon: '💰',
    title: 'Vydělávej focením — focení jako byznys',
    desc: 'Ukážu ti všechny strategie, které ti pomůžou získat vysněné klienty.',
    thumb: 'assets/cover-foceni-jako-byznys.webp',
    modules: [
      { title: '💸 Cenotvorba', lessons: [
        { title: 'Zvol si obor', youtube: null },
        { title: 'Úvod do cenotvorby', youtube: null },
        { title: 'Cenotvorba', youtube: null },
        { title: 'Podhodnocování zakázek', youtube: null }
      ]},
      { title: '📣 Marketing', lessons: [
        { title: 'Jak získávat klienty?', youtube: null },
        { title: 'Síla osobní značky', youtube: null },
        { title: 'Vytvoř si kvalitní portfolio', youtube: null },
        { title: 'Využívej zakázky na maximum', youtube: null },
        { title: 'Oslovuj svoje klienty', youtube: null },
        { title: 'Odliš se', youtube: null },
        { title: 'Využívej networking', youtube: null },
        { title: 'Začni prodávat řešení!', youtube: null },
        { title: 'Doporučení, follow-up a upsell', youtube: null },
        { title: 'Síla prezentace', youtube: null },
        { title: 'Rozhovor s markeťačkou', youtube: null },
        { title: 'Eventy a veřejný akce', youtube: null },
        { title: 'Propagace — záznam z webináře', youtube: null },
        { title: 'Začni využívat barterové spolupráce!', youtube: null },
        { title: 'Spolupráce s influencery nemusí být špatná', youtube: null },
        { title: 'Příprava na focení a důležitá výbava + ukázka focení a komunikace', youtube: null }
      ]},
      { title: '🌐 Marketing a branding', lessons: [
        { title: 'Jak postavit prodejní web?', youtube: null },
        { title: 'Optimalizuj si SEO', youtube: null },
        { title: 'Hodnotím vaše portfolia a weby', youtube: null }
      ]},
      { title: '⚖️ Účetnictví a právo', lessons: [
        { title: 'Účetnictví pro tvůrce', youtube: null },
        { title: 'Právo pro tvůrce', youtube: null }
      ]},
      { title: '🖼️ Kvalitní fotky', lessons: [
        { title: 'Důležité info o KF', youtube: null },
        { title: 'Začni používat PIXIN — zvyš své tržby', youtube: null },
        { title: 'Ukázka a doporučení produktů', youtube: null }
      ]},
      { title: '⚙️ Systémy a automatizace', lessons: [
        { title: 'Evenilo — nový CRM systém', youtube: null },
        { title: 'Jak na organizaci a automatizaci zakázek?', youtube: null },
        { title: 'StudioNinja — úvod', youtube: null },
        { title: 'StudioNinja — nastavujeme svatební workflow + smlouva ke stažení', youtube: null },
        { title: 'StudioNinja — bookování', youtube: null }
      ]},
      { title: '🔥 Horké křeslo', lessons: [
        { title: 'Hotseat s Kenjim — Matěj', youtube: null },
        { title: 'Hotseat živě — Petr Šimík', youtube: null }
      ]},
      { title: '🎥 Webinář', lessons: [
        { title: 'Webinář 23. 7. 2026', youtube: null }
      ]}
    ]
  },

  {
    slug: 'svatebni-masterclass',
    icon: '💍',
    title: 'Svatební Masterclass',
    desc: 'Kolik znáš chlapů, co přežilo 250+ svateb? Já jsem jedním z nich a provedu tě celým procesem.',
    thumb: 'assets/cover-svatebni-masterclass.webp',
    modules: [
      { title: '💍 Svatby', lessons: [
        { title: 'Svatební Masterclass', youtube: null },
        { title: 'VOLESTORY — jak probíhal svatební workshop', youtube: null },
        { title: 'Úprava fotek — masterclass', youtube: null }
      ]},
      { title: '🎙️ Rozhovory', lessons: [
        { title: 'Bude tohle budoucnost svateb?', youtube: null },
        { title: 'Svatby z pohledu koordinátorky', youtube: null },
        { title: 'Česko-polská svatební celebrita ve fotosvětě', youtube: null },
        { title: 'Realita svatebních fotografů — svatební duo', youtube: null }
      ]}
    ]
  },

  {
    slug: '90denni-vyzva',
    icon: '🏆',
    title: '90denní výzva',
    desc: 'Provedu tě celým procesem — od vytvoření produktu, přes tvorbu nabídky a cílovku, až po akvizici a první prodeje.',
    thumb: 'assets/cover-90denni-vyzva.webp',
    modules: [
      { title: '💡 Milionový nápad', lessons: [
        { title: 'Okopíruj můj blueprint 1:1 a začni vydělávat', youtube: null }
      ]}
    ]
  },

  {
    slug: 'kenji-v-akci',
    icon: '🎬',
    title: 'Kenji v akci',
    desc: 'Vezmu tě s sebou do divočiny! Videa z praxe, který ti nikdo jinej neukáže.',
    thumb: 'assets/cover-kenji-v-akci.webp',
    modules: [
      { title: '📸 Praxe', lessons: [
        { title: 'Komunikace s klientem — kadeřnický / kosmetický salon' },
        { title: 'Fotíme hokejový banner' },
        { title: 'VOLESTORY — jak probíhal svatební workshop' }
      ]},
      { title: '🏠 Realitní fotografie', lessons: [
        { title: 'Realitní fotografie — úvod' },
        { title: 'Fotíme nemovitost' },
        { title: 'Realitní fotografie — marketing' }
      ]}
    ]
  }
];

// Pomocné funkce
function kenjiCourseBySlug(slug) { return KENJI_COURSES.find((c) => c.slug === slug) || null; }
function kenjiCourseLessonCount(c) { return (c.modules || []).reduce((n, m) => n + (m.lessons ? m.lessons.length : 0), 0); }

window.KENJI_COURSES = KENJI_COURSES;
window.kenjiCourseBySlug = kenjiCourseBySlug;
window.kenjiCourseLessonCount = kenjiCourseLessonCount;
