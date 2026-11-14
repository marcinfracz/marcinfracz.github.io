/* All site text lives here as one global, so index.html opens by double-click
   with no local server. Edit text here, not in index.html. */
window.SITE_CONTENT = {
  intro: {
    name: "Marcin Fracz",
    title: "Automotive product & software strategy leader · GM · SAIC-GM Shanghai",
    headline: "Strategist transforming global software and AI ecosystems with high-velocity, cross-border execution. Exploring new leadership opportunities.",
    photo: "assets/profile.jpg",
    buttons: [
      { label: "About", target: "about" },
      { label: "Work", target: "work" },
      { label: "Projects", target: "projects" }
    ]
  },
  about: {
    title: "About",
    paragraphs: [
      "Engineer turned product manager turned software strategy leader, now building with AI.",
      "I started in engineering, moved into product management, then led software strategy in Shanghai, and today I build AI-powered tools and products. I like the full arc: from how something is built, to why it matters, to how it ships.",
      "Most of my career has been in automotive, at the intersection of software, product, and global markets."
    ]
  },
  work: {
    title: "Work",
    note: "Drag the timeline to scroll. Use + / - to zoom.",
    roles: [
      {
        company: "Federal-Mogul, Chrysler, Johnson Controls",
        role: "Engineering",
        years: "2003-2014",
        detail: "Powertrain and vehicle interiors."
      },
      {
        company: "General Motors",
        role: "Global Product Manager, compact / mid crossovers",
        years: "2014-2018",
        detail: "Chevrolet Equinox."
      },
      {
        company: "General Motors",
        role: "Product Manager, Buick Encore GX and Chevrolet Trailblazer",
        years: "2018-2020",
        detail: "Small SUVs, from plan to launch."
      },
      {
        company: "General Motors",
        role: "Business Strategy Manager, Connected & OTA Services",
        years: "2020-2022",
        detail: "Connected services and over-the-air updates."
      },
      {
        company: "SAIC-GM, Shanghai",
        role: "Deputy Director, Software Strategy",
        years: "2022-2025",
        detail: "Software strategy in China, cross-border execution."
      },
      {
        company: "General Motors",
        role: "Manager, Global Planning & Joint Ventures, OnStar Product Marketing (International)",
        years: "2025",
        detail: "Global planning and OnStar product marketing."
      }
    ],
    education: [
      { school: "MBA, Michigan Ross", year: "2014" },
      { school: "BSME, Kettering University, cum laude", year: "2007" }
    ]
  },
  projects: {
    title: "Projects",
    items: [
      {
        name: "Marcin Hub",
        detail: "AI-built portfolio tools."
      },
      {
        name: "OpenAutoLink",
        detail: "Testing OpenAutoLink, an open-source Android Automotive app, on my own EV"
      },
      {
        name: "3D Prints",
        detail: "Printed parts and prototypes."
      }
    ]
  },
  widgets: {
    clocksTitle: "World Clock",
    clocksSub: "Detroit · Shanghai · Mexico City",
    clocks: [
      { label: "Detroit", timeZone: "America/Detroit" },
      { label: "Shanghai", timeZone: "Asia/Shanghai" },
      { label: "Mexico City", timeZone: "America/Mexico_City" }
    ],
  },
  wallpaperSettings: {
    categories: [
      {
        id: "mobility-ai",
        name: "Mobility & AI",
        items: [
          { id: "detroit-dusk", name: "Detroit Dusk", type: "image", src: "assets/wallpapers/detroit-dusk.jpg" },
          { id: "shanghai-mist", name: "Shanghai Lujiazui", type: "image", src: "assets/wallpapers/shanghai-mist.jpg" },
          { id: "sdv-architecture", name: "SDV Architecture", type: "image", src: "assets/wallpapers/sdv-architecture.jpg" },
          { id: "ai-mesh", name: "AI Ecosystem", type: "image", src: "assets/wallpapers/ai-mesh.jpg" },
          { id: "euc-hardware", name: "Micromobility Hardware", type: "image", src: "assets/wallpapers/euc-hardware.jpg" }
        ]
      },
      {
        id: "engineering-build",
        name: "The Builder",
        items: [
          { id: "printer-extrusion", name: "3D Extrusion", type: "image", src: "assets/wallpapers/printer-extrusion.jpg" },
          { id: "ide-terminal", name: "IDE Terminal", type: "image", src: "assets/wallpapers/ide-terminal.jpg" },
          { id: "microcontroller", name: "Smart Logic", type: "image", src: "assets/wallpapers/microcontroller.jpg" },
          { id: "blueprint", name: "Mechanical Blueprint", type: "image", src: "assets/wallpapers/blueprint.jpg" },
          { id: "slatwall-workspace", name: "Garage Workspace", type: "image", src: "assets/wallpapers/slatwall-workspace.jpg" }
        ]
      },
      {
        id: "strategy-vision",
        name: "Strategy & Vision",
        items: [
          { id: "topographical", name: "Topography", type: "image", src: "assets/wallpapers/topographical.jpg" },
          { id: "corporate-glass", name: "Corporate Glass", type: "image", src: "assets/wallpapers/corporate-glass.jpg" },
          { id: "minimal-aviation", name: "Global Transit", type: "image", src: "assets/wallpapers/minimal-aviation.jpg" },
          { id: "geometric-abstract", name: "Geometric Abstract", type: "image", src: "assets/wallpapers/geometric-abstract.jpg" },
          { id: "clay-model", name: "Product Creation", type: "image", src: "assets/wallpapers/clay-model.jpg" }
        ]
      },
      {
        id: "solid-minimal",
        name: "Solid Colors",
        items: [
          { id: "soft-sage", name: "Soft Sage", type: "color", value: "#E0E5DF" },
          { id: "deep-slate", name: "Deep Slate", type: "color", value: "#1E2124" },
          { id: "warm-stone", name: "Warm Stone", type: "color", value: "#D6D1CA" },
          { id: "matte-onyx", name: "Matte Onyx", type: "color", value: "#0F0F11" },
          { id: "ross-blue", name: "Ross Blue", type: "color", value: "#00274C" }
        ]
      }
    ]
  },
  notes: {
    motto: "Build it, ship it,\nlearn from it.",
    resumeNote: "Resume (PDF)",
    reelNote: "Sizzle Reel (1:41)",
    contact: {
      email: "marcin.fracz@gmail.com",
      linkedin: "https://www.linkedin.com/in/marcinfracz/"
    }
  },
  finder: [
    { id: "now", name: "Now.txt", icon: "📄", category: "start", target: null, preview: "<b>Now.txt</b> — Exploring new leadership opportunities in automotive strategy, product and AI. Building with AI, shipping small tools, and learning in public." },
    { id: "projects", name: "Projects", icon: "📁", category: "projects", target: "projects", preview: "<b>Projects</b> — Marcin Hub, OpenAutoLink and 3D prints. Double-click to open." },
    { id: "work-index", name: "Work Index", icon: "📁", category: "work", target: "work", preview: "<b>Work Index</b> — Twenty-three years across engineering, product and software strategy, from powertrain to Shanghai. Double-click to open the timeline." },
    { id: "uses", name: "Uses", icon: "🛠️", category: "uses", target: null, preview: "<b>Uses</b> — The tools and setup behind the work. (Coming soon.)" },
    { id: "colophon", name: "Colophon", icon: "📝", category: "start", target: null, preview: "<b>Colophon</b> — This site is a fake desktop: plain HTML, CSS and vanilla JavaScript, hosted on GitHub Pages. No framework, no build step. Desktop concept inspired by Zain Haseeb. Built with AI." },
    { id: "marcin-hub", name: "Marcin Hub", icon: "🤖", category: "projects", target: "projects", preview: "<b>Marcin Hub</b> — AI-built portfolio tools. Double-click to open Projects." },
    { id: "openautolink", name: "OpenAutoLink", icon: "🚗", category: "projects", target: "projects", preview: "<b>OpenAutoLink</b> — Testing OpenAutoLink, an open-source Android Automotive app, on my own EV. Double-click to open Projects." },
    { id: "prints", name: "3D Prints", icon: "🖨️", category: "projects", target: "projects", preview: "<b>3D Prints</b> — Printed parts and prototypes. Double-click to open Projects." }
  ],
  quotes: [
    "Build it, ship it, learn from it.",
    "Small steps, shipped daily.",
    "Done beats perfect.",
    "Start where you are."
  ]
};

/* ------------------------------------------------------------------ */
/* ROAD v3 GREYBOX — all Road text lives here, word for word from the  */
/* brief (ROAD_REDESIGN_BRIEF.md v3). The greybox road.html renders   */
/* only from this object. Nothing in folders 7 or 8 (Personal Trips / */
/* Private reference) is used on the site.                             */
/* Pending figures ($167M, Shanghai headcounts, ~$3M/yr) are stored   */
/* below as flagged "pending" values and are NOT rendered. The page    */
/* shows only the softened fallbacks until Marcin decides.             */
/* ------------------------------------------------------------------ */
window.ROAD_V3 = {
  version: "v3 greybox",
  tagline: "Find the gap. Build the mechanism. Bring the decision.",
  positioning: "Grounded, global, amplified by AI.",
  motto: "Build it, ship it, learn from it.",
  intro: {
    kicker: "Marcin Fracz - Automotive product and software strategy",
    title: "THE ROAD.",
    lede: "One career, one road. Scroll and drive it - from an engineering floor in 2003, through Detroit and Shanghai, to building AI today.",
    hint: "Scroll, swipe, drag or use the arrow keys to drive."
  },
  finale: {
    title: "THE ROAD CONTINUES",
    text: "The reel plays here. Then back to the desktop.",
    reelLabel: "SIZZLE REEL FINALE - placeholder box. Video goes here after review.",
    reelNote: "Sizzle reel: Muse's v4 (reel.html, 1:41 + 0:38 short) stays live; swap in Grok Bot's new 1:40 / 45s cut once it beats v4."
  },
  openItems: [
    "Photos: optional. Folders 7 (Personal Trips) and 8 (Private - Reference Only: whiteboards, slides and screens) NEVER go on the site. Job 1 photo gather is blocked: no Google Photos access is available to Muse (no Photos connector, no Photos API, device gallery offline, signed-out web fetch only).",
    "Quotes from peers and managers: Marcin is collecting them.",
    "Keep, soften or remove: $167M, Shanghai headcounts, ~$3M/yr. Softened fallbacks are shown on the page; exact figures are stored below as pending and are NOT rendered.",
    "The Mexico engine plant for the HEMI trip: Saltillo? Leave the plant unnamed until confirmed.",
    "OnStar region lists: the 8 export regions (Mexico, AMEO, South America, GMAP, South Korea, Israel, ANZ, Central Asia) differ from the 8 port beacons in the brief (Mexico, South America, Middle East/Africa, Asia Pacific, South Korea, Europe, Australia/New Zealand, Japan). Confirm which list the port should show.",
    "Trailblazer and Encore GX dates corrected to 2019-2020 (Jan 2019-Jun 2020); the old brief said 2018-2020."
  ],
  keepOffSite: [
    "GM program codes (e.g. 9BYC, 9BUB, NCUB, NCUV and similar)",
    "Business-case dollar figures from the OnStar era",
    "JV investment and transfer-pricing figures",
    "Internal forum names",
    "Home address, phone and personal email",
    "Why he left GM - never mention it. The OnStar era is 2025-2026 with no end reason."
  ],
  sources: {
    pentastar1m: "autoblog.gr/2012/01/31/just-18-months-into-production-chrysler-builds-millionth-pentastar/ - Pentastar 1 million in 18 months, Jan 2012, Trenton MI and Saltillo",
    pentastar10m: "auto123.com/en/news/fca-10-million-pentastar-engines-built/65594/ - Pentastar 10 million, 16 models, Feb 2019",
    hemi: "media.stellantisnorthamerica.com/newsrelease.do?id=333 - 5.7L HEMI launched June 2002, built at Saltillo Engine Plant",
    gmInvestorDay: "design-engineering.com/gm-promises-to-double-revenue-by-2030-1004037500/ - GM 2021 Investor Day ($20-25B software and services, Ultra Cruise, Super Cruise on 22 vehicles by 2023)",
    gmForward2025: "automotive-fleet.com/news/general-motors-highlights-developments-in-ai-robotics-energy-and-autonomy-at-gm-forward-event - GM Forward 2025 (Super Cruise 700M+ miles, eyes-off driving 2028)",
    gmForward2026: "mobilesyrup.com/2026/10/22/gm-forward-even-ev-platform-range-boost/ - GM Forward 2026 (OnStar AI assistant, wider hands-free highway driving)"
  },
  eras: [
    {
      id: "engineering", num: 1, title: "ENGINEERING", years: "2003-2014", place: "Michigan", duration: "11 yrs",
      stops: [
        {
          id: "1a", sub: "1a", title: "Federal-Mogul", role: "Mechanical Engineering Co-op (2003-2007), Technical Savings (VA/VE) Engineer (2007-2008), Product Engineer, cylinder head, exhaust and accessory gaskets (2008-2010)",
          company: "Federal-Mogul", place: "Southfield, MI", years: "2003-2010",
          what: "Designed and tested the Pentastar head gasket, taking it from mid-development to production.",
          wins: [
            "$3M a year in extra savings as VA/VE engineer, working for the VP of Technology, Sealing",
            "4 US patent disclosures",
            "$500k saved on the GM 1.4L head gasket"
          ],
          hero: { label: "Chrysler 3.6L Pentastar V6 cylinder head gaskets, left and right bank", note: "Multi-layer steel gaskets that explode into their layers." },
          callouts: [
            { label: "5.7L HEMI V8 cast riser and valve cover gaskets", text: "Helped finish the design: cross-sections at different material states, FEA and engineering analysis to prove it would work." },
            { label: "GM 1.4L cylinder head gasket", text: "Led global, cross-functional teams to deliver it on time. New part design saved $500k." },
            { label: "3D press-in-place oil pan gasket", text: "Ran the FEA that addressed a leak concern at a customer plant." },
            { label: "PTFE and elastomeric engine seals", text: "Designed and tested engine seals. Senior thesis on spring bolt isolators." }
          ],
          more: { title: "First business trip", text: "His first business trip, to the supplier plant in Skokie, Illinois, to watch prototype parts and molds being made, then to the engine plant in Mexico to watch the gaskets go onto engines. [OPEN: confirm the Mexico plant before naming it. The 5.7L HEMI launched in 2002 and is built at Chrysler's Saltillo Engine Plant in Coahuila, Mexico.]" },
          note: "Testing and design support on parts for GM, Volkswagen, Ford, Cummins, International and more."
        },
        {
          id: "1b", sub: "1b", title: "Chrysler Group", role: "Design Release Engineer (consultant), Powertrain Sealing",
          company: "Chrysler Group", place: "Auburn Hills, MI", years: "2010-2011",
          what: "Design release engineer for every sealing part on the Pentastar, one of the highest-volume engines in the industry.",
          wins: [
            "$700k a year saved with a global head gasket supply strategy for Chrysler and Fiat",
            "Built a new sealing and fastening engineering team",
            "Wrote best-practice standards used company-wide"
          ],
          hero: { label: "The full 3.6L Pentastar V6", note: "Slowly rotating, with every sealing part lighting up in turn (head gaskets, rear main seal, cam covers, oil pan, front cover)." },
          callouts: [
            { label: "Pentastar volume (public record)", text: "The Pentastar hit 1 million engines just 18 months after launch (Jan 2012) and 10 million by 2019, across 16 models." },
            { label: "Rear main seal, 3.6L Pentastar", text: "Re-sourced the rear main seal after a supplier quality spill, and stopped production at a plant rather than let bad parts reach customers." },
            { label: "Dealership service bay", text: "Tracked warranty data and worked with dealers on customer sealing issues." }
          ],
          more: { title: "The call he made", text: "Re-sourced the rear main seal after a supplier quality spill, and stopped production at a plant rather than let bad parts reach customers. Don't name the supplier on the site. He designed, engineered and tested the Pentastar head gasket at the supplier, then oversaw it from inside Chrysler." },
          note: "No HEMI head gasket: he didn't work on it."
        },
        {
          id: "1c", sub: "1c", title: "Johnson Controls", role: "Senior Product Engineer, Automotive Seating (Nissan business unit)",
          company: "Johnson Controls", place: "Plymouth, MI", years: "Dec 2011-2014",
          what: "Complete seat systems for the 2013-2015 Nissan Titan and Armada.",
          wins: [
            "Launched ahead of schedule, 2.2% cost savings per seat",
            "Led 2 direct reports and a 12-member cross-functional team",
            "$240k saved with Nissan on trim-level combinations"
          ],
          hero: { label: "A complete front seat", note: "Separates into frame, foam and trim, then reassembles." },
          callouts: [
            { label: "Seats on a conveyor", text: "Seats riding a conveyor into a pickup body; a forklift with seat racks." }
          ],
          more: null,
          note: "Johnson Controls started right after the year at Chrysler (Dec 2011)."
        },
        {
          id: "1d", sub: "1d", title: "Education", role: "Kettering University BSME, Sept 2007, cum laude; Michigan Ross MBA, May 2014, Marketing and Strategy",
          company: "Kettering University / Michigan Ross", place: "Michigan", years: "2003-2014",
          what: "Co-op school: alternating campus and plant, show a shuttle bus going back and forth.",
          wins: [
            "Kettering University BSME, Sept 2007, cum laude",
            "Michigan Ross MBA, May 2014, Marketing and Strategy",
            "Mayleben Venture Shaping Grant (Zell Lurie Institute)"
          ],
          hero: { label: "A small campus beside the road", note: "Shuttle bus going back and forth between campus and plant." },
          callouts: [
            { label: "GM Marketing Lab", text: "Won the GM Marketing Lab case competition." }
          ],
          more: null,
          note: "Leave GPA off the site (resume versions differ)."
        }
      ]
    },
    {
      id: "equinox", num: 2, title: "CHEVROLET, MEXICO AND EQUINOX", years: "2014-2018", place: "GM", duration: "4 yrs",
      stops: [
        {
          id: "2a", sub: "2a", title: "Chevrolet Traverse", role: "Global Brand Strategy Associate (acting product marketing manager), Chevrolet Traverse",
          company: "GM / Chevrolet", place: "Warren, MI", years: "2014-2015",
          what: "Global Brand Strategy Associate (acting product marketing manager), Chevrolet Traverse.",
          wins: [
            "Cut build combinations 10% for the 2016 Traverse",
            "'Starting at' price trim lifted consideration 6% at launch (2017)",
            "Created the Traverse Graphite Edition"
          ],
          hero: { label: "Chevrolet Traverse on a turntable", note: "Option tags falling away." },
          callouts: [
            { label: "Build-combination counter", text: "A desktop build-combination counter tool he made." }
          ],
          more: null,
          note: ""
        },
        {
          id: "2b", sub: "2b", title: "Customer Experience", role: "Global Brand Strategy Assistant Manager, Chevrolet Global Customer Experience",
          company: "GM / Chevrolet", place: "Detroit, MI", years: "2015-2016",
          what: "Partnered with the Disney Institute to build a global dealer culture program.",
          wins: [
            "Partnered with the Disney Institute to build a global dealer culture program",
            "Ran a two-day customer experience workshop at the Detroit Opera House"
          ],
          hero: { label: "Detroit Opera House", note: "A tiny opera house with people filing in." },
          callouts: [],
          more: null,
          note: ""
        },
        {
          id: "2c", sub: "2c", title: "GM de Mexico", role: "Supervisor, Business Development Center (BDC) implementation",
          company: "GM de Mexico", place: "Mexico City, Mexico", years: "Jun-Dec 2016",
          what: "His first international assignment, covering dealers across Mexico City, Guadalajara and Monterrey.",
          wins: [
            "70% of GM Mexico dealers trained in six months",
            "20 training sessions, 350+ dealer visits",
            "Led 3 BDC coordinators; presented to GM Mexico's Managing Director"
          ],
          hero: { label: "Dealer showroom with a BDC desk", note: "Phones and screens; the website and video series he made for dealers." },
          callouts: [
            { label: "Training van", text: "A training van driving dealer to dealer (350+ visits: a counter ticks up as it stops at each lot)." }
          ],
          more: null,
          note: "Mexico is also where his engineering career first took him (the HEMI gasket trip), so the road passes through Mexico twice."
        },
        {
          id: "2d", sub: "2d", title: "Global Product Marketing", role: "Global Product Manager, compact and mid crossovers",
          company: "GM", place: "Detroit, MI", years: "2017-2018",
          what: "Global Product Manager, compact and mid crossovers.",
          wins: [
            "Led global customer-centric content workshops for the next Equinox",
            "Global content plan cut post-refresh price decay 5%",
            "Got executives in the US, Canada and Korea to one content plan"
          ],
          hero: { label: "Next-gen Chevrolet Equinox", note: "Hero object: next-gen Chevrolet Equinox." },
          callouts: [],
          more: null,
          note: "Also supported $200-per-vehicle profit improvements on Equinox and Traverse."
        }
      ]
    },
    {
      id: "trailblazer", num: 3, title: "TRAILBLAZER AND ENCORE GX", years: "2019-2020", place: "Detroit, MI", duration: "Jan 2019-Jun 2020",
      stops: [
        {
          id: "3", sub: "3", title: "Trailblazer and Encore GX", role: "Product Manager, Buick Encore GX and Chevrolet Trailblazer",
          company: "GM", place: "Detroit, MI", years: "2019-2020",
          what: "Product Manager, Buick Encore GX and Chevrolet Trailblazer.",
          wins: [
            "Built a complexity tool during the COVID wire-harness shortage that matched builds to demand and harness supply",
            "Show cars delivered on time and under budget",
            "GHG model convinced leadership to add a Trailblazer ACTIV FWD"
          ],
          hero: { label: "Chevrolet Trailblazer and Buick Encore GX", note: "Both cars under launch lights." },
          callouts: [
            { label: "Headlight bezel", text: "Caught an off-brand etching before tooling, avoiding a costly recall." },
            { label: "Black roof, Encore GX", text: "Encore GX ST Black Roof Package, done within 6 months of start of production." },
            { label: "Paint booth", text: "Negotiated an off-line paint process for the auto-show cars when the hero color wasn't ready." },
            { label: "Cargo plane", text: "Cargo plane landing with harness spools; trucks; launch-day stage." }
          ],
          more: null,
          note: "Old brief said 2018-2020; resumes say Jan 2019-Jun 2020."
        }
      ]
    },
    {
      id: "connected", num: 4, title: "CONNECTED AND OTA", years: "2020-2022", place: "Warren, MI", duration: "2 yrs",
      stops: [
        {
          id: "4", sub: "4", title: "Connected and OTA Services", role: "Business Strategy Manager, Connected OTA Services",
          company: "GM", place: "Warren, MI", years: "2020-2022",
          what: "Business Strategy Manager, Connected OTA Services.",
          wins: [
            "Monetization strategy for Super Cruise across every GM brand in North America",
            "In-market trial for paid digital products, a $30M opportunity",
            "Grew the team from 2 to 7"
          ],
          hero: { label: "A car receiving an over-the-air update", note: "Rings travel from a tower into the car; a progress bar fills on its screen." },
          callouts: [
            { label: "Remote services", text: "Key fob." },
            { label: "Connected cameras", text: "One of five value streams he owned." },
            { label: "ADAS", text: "A hands-free steering wheel." },
            { label: "Vehicle performance", text: "One of five value streams he owned." },
            { label: "Personalization", text: "One of five value streams he owned." }
          ],
          more: null,
          note: "Also: led the monetization strategy for the next-gen hands-free system (Ultra Cruise). Public context: at GM's Oct 2021 Investor Day, GM set a goal of $20-25B a year in software and services revenue by 2030, with Super Cruise on 22 vehicles by 2023 and Ultra Cruise to cover about 95% of driving. Card: Helped shape the connected and driver-assist services behind GM's 2021 software revenue goal."
        }
      ]
    },
    {
      id: "shanghai", num: 5, title: "SHANGHAI", years: "2022-2025", place: "Shanghai, China", duration: "3 years living in China",
      stops: [
        {
          id: "5", sub: "5", title: "Shanghai", role: "Deputy Director, Software Strategy",
          company: "SAIC-GM", place: "Shanghai, China", years: "2022-2025",
          what: "Deputy Director, Software Strategy. 3 years living in China.",
          wins: [
            "Research and pitch that supported a nine-figure driver-assist investment",
            "Helped stand up a multi-thousand-person software org",
            "2024: spoke to a GM employee group on GM China and the Chinese auto industry"
          ],
          pending: {
            funding: { exact: "Multi-city ADAS research and pitch that supported GM's $167M L2++ approval", fallback: "Research and pitch that supported a nine-figure driver-assist investment", status: "OPEN - Marcin to decide keep, soften or remove" },
            teamHeadcount: { exact: "Led a 49-person strategy, data insights and software research team", fallback: "Helped stand up a multi-thousand-person software org", status: "OPEN - Marcin to decide keep, soften or remove" },
            orgHeadcount: { exact: "Co-led stand-up of a ~2,650-person Software and Digital Business org", fallback: "Helped stand up a multi-thousand-person software org", status: "OPEN - Marcin to decide keep, soften or remove" }
          },
          hero: { label: "Hero car with a Mobileye-style sensor diagram", note: "Sensor diagram drawn on the car." },
          callouts: [
            { label: "Intelligent cockpit", text: "An AI 'Model Integrator' concept for voice and vision features." },
            { label: "Survey clipboard over a city map", text: "Multi-city consumer research on what Chinese drivers will pay for in driver assist." },
            { label: "Cadillac silhouette", text: "Re-imagined luxury for young Chinese buyers." }
          ],
          more: null,
          note: "Wording: 'supported', never 'secured'. The exact figures above are pending and NOT shown on the page."
        }
      ]
    },
    {
      id: "onstar", num: 6, title: "ONSTAR INTERNATIONAL", years: "2025-2026", place: "Warren, MI", duration: "2 yrs",
      stops: [
        {
          id: "6", sub: "6", title: "OnStar International", role: "Manager, OnStar Product Marketing, Global Planning and Joint Ventures",
          company: "GM", place: "Warren, MI", years: "2025-2026",
          what: "Manager, OnStar Product Marketing, Global Planning and Joint Ventures.",
          wins: [
            "OnStar for China-built export vehicles across 8 regions",
            "Aligned OnStar, GM regions and Chinese JV partners on connectivity and launch timing",
            "Led a global driver-assist strategy workshop (Aug 2026) on L2, L2+ and L2++ for export markets"
          ],
          hero: { label: "A port with a container ship", note: "Container ship leaving toward 8 region beacons: Mexico, South America, Middle East/Africa, Asia Pacific, South Korea, Europe, Australia/New Zealand, Japan." },
          callouts: [
            { label: "Export nameplates on the dock", text: "Chevrolet Aveo, Spark EUV, Captiva, Cadillac XT5." },
            { label: "Portfolio Made Visible", text: "'Portfolio Made Visible', a decision tool he built, previewed at GM AI Day." }
          ],
          more: null,
          note: "8 export regions: Mexico, AMEO, South America, GMAP, South Korea, Israel, ANZ, Central Asia. [OPEN: this list differs from the 8 port beacons above - confirm which list the port should show.] Industry context: Chinese vehicle exports reached 5.1M in H1 2026, up 65%. At GM Forward (Oct 21, 2026), GM made OnStar an AI assistant and said it will expand hands-free highway driving to its top sellers. Word it as 'the space he worked in', not as his win."
        }
      ]
    },
    {
      id: "now", num: 7, title: "NOW: AI BUILDER", years: "2026", place: "Detroit, MI", duration: "2026",
      stops: [
        {
          id: "7", sub: "7", title: "Now: AI builder", role: "AI builder - rebuilt GM's retired portfolio tool solo with AI (Marcin Hub)",
          company: "Marcin Hub", place: "Detroit, MI", years: "2026",
          what: "Rebuilt GM's retired portfolio tool solo with AI (Marcin Hub).",
          wins: [
            "1,780 rows, 217 programs, 55 markets, any market-year view in seconds",
            "11 apps, 39 users incl. 7 director+ and 3 VPs",
            "1,800+ commits"
          ],
          pending: {
            originalCost: { exact: "Original tool needed 7 devs and ~$3M/yr.", fallback: "A tool that once took a full dev team.", status: "OPEN - Marcin to decide keep, soften or remove" }
          },
          hero: { label: "An AI workshop", note: "Tiny robot agents assemble dashboard blocks; the road ends at a sunrise lookout where the reel plays." },
          callouts: [
            { label: "AI loop", text: "Brief, plan, approve, build, score, fix, checkpoint." },
            { label: "Product thesis", text: "I don't build dashboards. I build the place where the decision gets made." },
            { label: "One living link beats the deck pile", text: "Product thesis, Now era." }
          ],
          more: null,
          note: "15k hours was GM's MVP estimate, never measured: don't claim it as his saving. Softened line shown on the page: a tool that once took a full dev team."
        }
      ]
    }
  ]
};
