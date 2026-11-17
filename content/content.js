/* All site text lives here as one global, so index.html opens by double-click
   with no local server. Edit text here, not in index.html. */
window.SITE_CONTENT = {
  intro: {
    name: "Marcin Fracz",
    title: "Automotive product & software strategy leader · GM · SAIC-GM Shanghai",
    headline: "Strategist transforming global software and AI ecosystems with high-velocity, cross-border execution. Exploring new leadership opportunities.",
    photo: "assets/headshots/pro-blue-gray-avatar.jpg",
    buttons: [
      { label: "About", target: "about" },
      { label: "Work", target: "work" },
      { label: "Projects", target: "projects" }
    ]
  },
  /* Site photo (web size). */
  headshots: [
    { id: "pro-blue-gray", label: "Headshot", source: "blue-gray studio background", avatar: "assets/headshots/pro-blue-gray-avatar.jpg", portrait: "assets/headshots/pro-blue-gray.jpg", isDefault: true }
  ],
  about: {
    title: "About",
    paragraphs: [
      "Engineer turned product manager turned software strategy leader, now building with AI.",
      "I started in engineering, moved into product management, then led software strategy in Shanghai, and today I build AI-powered tools and products. I like the full arc: from how something is built, to why it matters, to how it ships.",
      "Most of my career has been in automotive, at the intersection of software, product, and global markets.",
      "Kettering University BSME, 2007, cum laude. Michigan Ross MBA, 2014, including a consulting project on site in Canada through Ross MAP. Fluent in Polish."
    ],
    howIWork: [
      "Decision surface, not a dashboard.",
      "Equity mining: the lowest-complexity path to the biggest impact.",
      "Staged plan with tripwires.",
      "Three layers and a gate."
    ]
  },
  work: {
    title: "Work",
    note: "Drag the timeline to scroll. Use + / - to zoom. Tap a role to drive to it on the Road.",
    roles: [
      {
        company: "Federal-Mogul, Chrysler Group, Johnson Controls",
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
    /* the visual timeline in the Work window, after the About Me deck slide.
       focus: product | cx | field | digital | eng. Dates are approximate positions. */
    visual: {
      legend: [
        { focus: "product", label: "Product" },
        { focus: "cx", label: "CX" },
        { focus: "field", label: "Field / Sales / Ops" },
        { focus: "digital", label: "Software & Digital" },
        { focus: "eng", label: "Engineering" }
      ],
      engineering: [
        { from: 2003, to: 2007.7, w: 130, focus: "eng", kicker: "Federal-Mogul", label: "Engineering Co-op", years: "2003-2007", road: "fm-coop" },
        { from: 2007.7, to: 2010.4, w: 124, focus: "eng", kicker: "Federal-Mogul", label: "Product Engineer", years: "2007-2010", road: "federal-mogul" },
        { from: 2010.4, to: 2011.4, w: 124, focus: "eng", kicker: "Chrysler Group", label: "Design Release Engineer", years: "2010-2011", road: "chrysler" },
        { from: 2011.4, to: 2014.4, w: 156, focus: "eng", kicker: "Johnson Controls", label: "Senior Product Engineer", years: "2011-2014", road: "johnson-controls" }
      ],
      degrees: [
        { at: 2007, label: "BSME, Kettering", years: "2007", road: "kettering" },
        { at: 2014, label: "MBA, Michigan Ross", years: "2014", road: "ross" }
      ],
      domestic: [
        { from: 2014.4, to: 2015.4, focus: "product", kicker: "Chevrolet · U.S.", label: "Product Marketing, Traverse", years: "2014-2015", road: "traverse", flag: "US" },
        { from: 2015.4, to: 2016.4, focus: "cx", kicker: "Chevrolet · Global", label: "Global Customer Experience", years: "2015-2016", road: "customer-experience" },
        { from: 2017, to: 2019, focus: "product", kicker: "GM · Global", label: "Global Product Manager, compact & mid crossovers", years: "2017-2018", road: "equinox" },
        { from: 2019, to: 2020.6, focus: "product", kicker: "Buick · Chevrolet", label: "Product Manager, Encore GX & Trailblazer", years: "2019-2020", road: "trailblazer-encore" },
        { from: 2020.6, to: 2022.6, focus: "digital", kicker: "GM · U.S.", label: "Business Strategy Manager, Connected & OTA Services", years: "2020-2022", road: "connected" },
        { from: 2025.4, to: 2026.4, focus: "digital", kicker: "OnStar · International", label: "Manager, OnStar Product Marketing", years: "2025-2026", road: "onstar" }
      ],
      projects: [
        { at: 2012.8, flag: "CA", label: "Canada", sub: "Ross MAP project", road: "ross" },
        { at: 2015.7, flag: "EC", label: "Ecuador", sub: "Global project", road: "customer-experience" },
        { at: 2017.5, flag: "CA", label: "Canada", sub: "Global project", road: "equinox" },
        { at: 2018.4, flag: "CN", label: "China", sub: "Global project", road: "equinox" },
        { at: 2019.6, flag: "KR", label: "Korea", sub: "Global project", road: "trailblazer-encore" }
      ],
      assignments: [
        { from: 2016.42, to: 2016.96, focus: "field", flag: "MX", kicker: "Assignment 1 · GM de Mexico", label: "Dealer Business Development", years: "2016", road: "mexico" },
        { from: 2022.6, to: 2025.4, focus: "digital", flag: "CN", kicker: "Assignment 2 · SAIC-GM", label: "Deputy Director, Software Strategy", years: "2022-2025", road: "shanghai" }
      ]
    },
    education: [
      { school: "MBA, Michigan Ross, with a Ross MAP consulting project for IdeaConnection in Victoria, BC", year: "2014" },
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
  /* the tools he built: shown in Projects, Finder, the palette and the terminal.
     Every system opens its live rebuild (synthetic data) in the Work hub. */
  tools: {
    systems: [
      { id: "export", name: "Export Command Center", org: "OnStar International", years: "2025–2026", color: "#2563eb", glyph: "globe",
        blurb: "Which connected and ADAS features ship on which China-built vehicle, in which market, and who pays." },
      { id: "jv", name: "JV Strategy Room", org: "SAIC-GM · Shanghai", years: "2022–2025", color: "#c2410c", glyph: "link",
        blurb: "A new software organization, and the customer research behind what drivers in China would pay for." },
      { id: "ota", name: "Subscription Lab", org: "Connected & OTA Services", years: "2020–2022", color: "#0f766e", glyph: "loop",
        blurb: "Trials, conversion and the Super Cruise monetization strategy for features sold after the sale." },
      { id: "pmv", name: "Portfolio Made Visible", org: "OnStar International", years: "2025–2026", color: "#7c3aed", glyph: "grid",
        blurb: "A solo, AI-agent-built rebuild of a planning tool that once took a business team plus seven developers." }
    ],
    kit: [
      { id: "tz", name: "Global meeting planner", glyph: "clock", live: true, blurb: "Finds the hour that works in Detroit, Shanghai and Mexico City. Live in the kit." },
      { id: "gantt", name: "Production rollout timeline", glyph: "bars", blurb: "A Gantt view of program launches by market, embedded in the team's site." },
      { id: "workshop", name: "Export ADAS strategy workshop", glyph: "compass", blurb: "Aligned product, planning, regional and policy leaders on L2 to L2++, delivered as a live app." },
      { id: "films", name: "Narrated demo films", glyph: "play", blurb: "One script file becomes a narrated, captioned walkthrough." },
      { id: "closeout", name: "Meeting close-out workflows", glyph: "check", blurb: "Turns scattered discussion into decisions, owners and hand-off notes." }
    ],
    timeline: { name: "Career timeline explorer", href: "work/timeline.html", blurb: "Every role since 2003 on one zoomable line, with the international assignments." }
  },
  widgets: {
    clocksTitle: "World Clock",
    clocksSub: "Detroit · Shanghai · Mexico City",
    clocks: [
      { label: "Detroit", timeZone: "America/Detroit" },
      { label: "Shanghai", timeZone: "Asia/Shanghai" },
      { label: "Mexico City", timeZone: "America/Mexico_City" }
    ],
    parts: [
      { name: "3.6L Pentastar V6 head gaskets", detail: "Left and right bank, designed and tested. The engine passed 10 million built by 2019." },
      { name: "5.7L HEMI V8 cast riser and valve cover gaskets", detail: "Helped finish the design as a co-op." },
      { name: "GM 1.4L head gasket", detail: "Led global teams; $500k saved." },
      { name: "Nissan Titan and Armada seat systems", detail: "Launched ahead of schedule; 2.2% saved per seat." }
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
      }
    ],
    /* v42: wall colours, used behind a framed image or on their own. "auto" follows light/dark mode. */
    colors: [
      { group: "Neutrals", items: [
        { id: "auto", name: "Auto (matches light or dark)", value: "" },
        { id: "cloud", name: "Cloud", value: "#E4E8ED" },
        { id: "warm-stone", name: "Warm Stone", value: "#D6D1CA" },
        { id: "sand", name: "Sand", value: "#E9E1D2" },
        { id: "graphite", name: "Graphite", value: "#3A3F45" },
        { id: "deep-slate", name: "Deep Slate", value: "#1E2124" },
        { id: "matte-onyx", name: "Matte Onyx", value: "#0F0F11" }
      ] },
      { group: "Blues", items: [
        { id: "ice-blue", name: "Ice Blue", value: "#DFE8F2" },
        { id: "powder-blue", name: "Powder Blue", value: "#C5D7EB" },
        { id: "steel-blue", name: "Steel Blue", value: "#7E9AB8" },
        { id: "harbor-blue", name: "Harbor Blue", value: "#355C85" },
        { id: "ross-blue", name: "Ross Blue", value: "#00274C" },
        { id: "midnight", name: "Midnight", value: "#0D1A2B" }
      ] },
      { group: "Greens and warm", items: [
        { id: "soft-sage", name: "Soft Sage", value: "#E0E5DF" },
        { id: "mist-teal", name: "Mist Teal", value: "#D2E3E0" },
        { id: "forest", name: "Forest", value: "#22362C" },
        { id: "clay", name: "Clay", value: "#B9876B" },
        { id: "burgundy", name: "Burgundy", value: "#4A1F27" }
      ] },
      { group: "Gradients", items: [
        { id: "g-morning", name: "Morning Haze", value: "linear-gradient(160deg, #EEF2F7 0%, #CCDAEA 100%)" },
        { id: "g-harbor", name: "Harbor Dusk", value: "linear-gradient(160deg, #2B4C70 0%, #0C1828 100%)" },
        { id: "g-ross", name: "Ross Night", value: "linear-gradient(160deg, #164878 0%, #00274C 100%)" },
        { id: "g-steel", name: "Brushed Steel", value: "linear-gradient(160deg, #F1F2F3 0%, #C9CED4 100%)" },
        { id: "g-sunrise", name: "Shanghai Sunrise", value: "linear-gradient(170deg, #DCE6F0 0%, #E9DCCB 100%)" }
      ] }
    ]
  },
  notes: {
    motto: "Build it, ship it,\nlearn from it.",
    field: [
      "Find the gap. Build the mechanism. Bring the decision.",
      "Market-first, not hardware-first.",
      "One living link beats the deck pile.",
      "The window is real. It is not infinite.",
      "A student of the automotive industry.",
      "Build it, ship it, learn from it."
    ],
    resumeNote: "Resume (PDF)",
    reelNote: "Sizzle Reel (1:04)",
    contact: {
      email: "marcin.fracz@gmail.com",
      linkedin: "https://www.linkedin.com/in/marcinfracz/"
    }
  },
  finder: [
    { id: "now", name: "Now.txt", icon: "📄", category: "start", target: null, preview: "<b>Now.txt</b> — Exploring new leadership opportunities in automotive strategy, product and AI. Building with AI, shipping small tools, and learning in public." },
    { id: "live-demos", name: "Live Demos", icon: "📁", category: "start", nav: "tools", preview: "<b>Live Demos</b> — Four systems I built, each rebuilt on synthetic data so you can use it. Double-click to open the folder." },
    { id: "kit-folder", name: "Everyday Kit", icon: "📁", category: "start", nav: "kit", preview: "<b>Everyday Kit</b> — The small single-file tools behind a global team that never shared a time zone. Double-click to open the folder." },
    { id: "projects", name: "Projects", icon: "📁", category: "start", target: "projects", preview: "<b>Projects</b> — The live demos, the everyday kit and personal builds. Double-click to open." },
    { id: "work-index", name: "Work Index", icon: "📁", category: "work", target: "work", preview: "<b>Work Index</b> — Twenty-three years across engineering, product and software strategy, from powertrain to Shanghai. Double-click to open the timeline." },
    { id: "timeline-app", name: "Timeline Explorer", app: "timeline", category: "work", href: "work/timeline.html", preview: "<b>Career timeline explorer</b> — Every role since 2003 on one zoomable line, with the international assignments. Double-click to open." },
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
