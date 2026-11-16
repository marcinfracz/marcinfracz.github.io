/* The Road: every word the Road page shows lives here.
   Edit text here, not in road/road.js. */
window.ROAD_CONTENT = {
  name: "Marcin Fracz",
  tagline: "Find the gap. Build the mechanism. Bring the decision.",

  eras: [
    { id: "school", n: 1, label: "Engineering foundation", short: "Foundation", years: "2003–2007", region: "us", color: "#B14F94" },
    { id: "engineering", n: 2, label: "Engineering & an evening MBA", short: "Engineering", years: "2007–2014", region: "us", color: "#C8693A" },
    { id: "program", n: 3, label: "GM leadership development program", short: "Leadership program", years: "2014–2017", region: "us", color: "#D9A21B" },
    { id: "crossovers", n: 4, label: "Crossover product marketing", short: "Crossovers", years: "2017–2020", region: "us", color: "#2E9C8F" },
    { id: "connected", n: 5, label: "Connected & OTA", years: "2020–2022", region: "us", color: "#7357D8" },
    { id: "shanghai", n: 6, label: "Shanghai", years: "2022–2025", region: "asia", color: "#D64545" },
    { id: "onstar", n: 7, label: "OnStar International", short: "OnStar Intl.", years: "2025–2026", region: "port", color: "#1F8FD1" }
  ],

  stops: [
    {
      id: "start", era: null, scene: "start",
      kicker: "The Road",
      title: "Marcin Fracz",
      tag: "Automotive product & software strategy leader",
      role: "20+ years in automotive: engineering, global product strategy, connected services and driver assist, across the US, Mexico and China.",
      what: "Find the gap. Build the mechanism. Bring the decision.",
      hint: "Scroll, swipe or use the arrow keys to drive.",
      wins: [], callouts: []
    },

    {
      id: "kettering", alias: ["education", "school", "coop", "co-op", "fm-coop", "hemi"], era: "school", scene: "kettering", region: "us",
      title: "Kettering University & Federal-Mogul",
      role: "BS, Mechanical Engineering, cum laude",
      place: "Flint, Michigan", span: "2003–2007",
      what: "BSME, cum laude, from a co-op university: four years of industry engineering alongside the degree.",
      wins: [
        { big: "Honors", text: "BSME, cum laude, 2007" },
        { big: "4 yrs", text: "of paid industry engineering alongside the degree" }
      ],
      callouts: [
        { obj: "kettering", text: "The degree: earned a BSME, cum laude, alongside co-op work." },
        { obj: "plant", text: "The co-op: engineered production engine sealing for global automakers." }
      ]
    },

    {
      id: "federal-mogul", alias: ["pentastar"], era: "engineering", scene: "fm", region: "us",
      title: "Federal-Mogul",
      role: "Product Engineer, powertrain components",
      place: "Southfield, Michigan", span: "2007–2010 · full time",
      what: "Hired full time out of co-op in 2007. Ran value engineering for the sealing business, then owned head gasket design and validation for OEM engine programs.",
      wins: [
        { big: "Pentastar", text: "designed the 3.6L Pentastar head gaskets through to production" },
        { big: "$3M", text: "a year in savings from value engineering projects" },
        { big: "4", text: "US patent disclosures" },
        { big: "$500k", text: "saved with a new GM 1.4L head gasket design" }
      ],
      callouts: [
        { obj: "pentastar", text: "3.6L Pentastar: designed a new head gasket and took it to production." },
        { obj: "plant", text: "Value engineering: led projects worth $3M a year in savings." }
      ],
      more: {
        title: "From co-op to the Pentastar",
        art: "engineering",
        blocks: [
          { h: "The problem", p: "An earlier Pentastar head gasket design was cracking from fatigue." },
          { h: "Action", p: "Designed and tested a new multi-layer steel gasket and took it from mid-development to production. It passed the thermal pulsator test." },
          { h: "Also", p: "A first year in value engineering under the business's technology vice president, then head, exhaust and oil pan gasket design, failure analysis and design standards for automotive and heavy-duty customers." }
        ]
      }
    },

    {
      id: "chrysler", era: "engineering", scene: "chrysler", region: "us",
      title: "Chrysler Group",
      role: "Design Release Engineer, Powertrain Sealing",
      place: "Auburn Hills, Michigan", span: "2010–2011 · 1 yr",
      wins: [
        { big: "$700k/yr", text: "saved with a global head gasket supply strategy for Chrysler and Fiat" },
        { big: "New team", text: "built a sealing and fastening engineering team" },
        { big: "Playbook", text: "wrote best practices used company-wide" }
      ],
      callouts: [
        { obj: "engine", text: "3.6L Pentastar V6: owned release for every sealing part." },
        { obj: "rms", text: "Quality call: stopped a plant to protect customers." },
        { obj: "bay", text: "Global sourcing: set one head gasket strategy for Chrysler and Fiat." }
      ],
      more: {
        title: "The call",
        art: "engineering",
        blocks: [
          { h: "The problem", p: "A supplier quality spill on the Pentastar rear main seal." },
          { h: "Action", p: "Stopped production at a plant rather than let bad parts reach customers, then re-sourced the seal." },
          { h: "The arc", p: "Designed and tested the Pentastar head gasket at the supplier, then oversaw every Pentastar sealing part from inside Chrysler Group." },
          { h: "The engine", p: "The Pentastar hit 1 million engines 18 months after launch (Jan 2012) and 10 million by 2019, across 16 models." }
        ],
        sources: [
          { label: "Autoblog, Jan 2012", url: "https://www.autoblog.gr/2012/01/31/just-18-months-into-production-chrysler-builds-millionth-pentastar/" },
          { label: "Auto123, Feb 2019", url: "https://www.auto123.com/en/news/fca-10-million-pentastar-engines-built/65594/" }
        ]
      }
    },

    {
      id: "johnson-controls", alias: ["jci", "seating", "nissan"], era: "engineering", scene: "jci", region: "us",
      title: "Johnson Controls",
      role: "Senior Product Engineer, Automotive Seating (Nissan)",
      place: "Plymouth, Michigan", span: "2011–2014 · 3 yrs",
      wins: [
        { big: "Early", text: "launch ahead of schedule, 2.2% cost savings per seat" },
        { big: "12", text: "member cross-functional team, plus 2 direct reports" },
        { big: "$240k", text: "saved with Nissan on trim-level combinations" }
      ],
      callouts: [
        { obj: "seat", text: "Nissan Titan and Armada: led complete seat systems, launched early." },
        { obj: "truck", text: "Cost and complexity: simplified trims, saved $240k with Nissan." }
      ],
      more: {
        title: "Whole seats, not parts",
        art: "engineering",
        blocks: [
          { h: "The job", p: "Owned complete front and rear seat systems for Nissan's full-size Titan pickup and Armada SUV." },
          { h: "The result", p: "Launched ahead of schedule with 2.2% cost savings per seat, and $240k saved with Nissan by simplifying trim-level combinations." }
        ]
      }
    },

    {
      id: "ross", alias: ["mba", "michigan-ross", "michigan", "umich"], era: "engineering", scene: "ross", region: "us", milestone: "The MBA",
      title: "Michigan Ross MBA",
      role: "MBA, Marketing & Strategy",
      place: "Ann Arbor, Michigan", span: "Graduated 2014",
      flags: [["CA", "Oct 2012", "Ross MAP consulting project with IdeaConnection", "Victoria, British Columbia"]],
      wins: [
        { big: "MBA", text: "Marketing & Strategy, Michigan Ross, 2014" },
        { big: "Evenings", text: "earned while working full time as a senior engineer" },
        { big: "Canada", text: "Ross MAP: market entry strategy for IdeaConnection, with a week on site in Victoria, BC (2012)" }
      ],
      callouts: [
        { obj: "ross", text: "Michigan Ross: earned an MBA in Marketing & Strategy, 2014." },
        { obj: "victoria", text: "Victoria, British Columbia: a week on site with IdeaConnection for Ross MAP, 2012." },
        { obj: "next", text: "The pivot: from engineering into GM's leadership program." }
      ]
    },

    {
      id: "traverse", alias: ["gm", "program"], era: "program", scene: "traverse", region: "us",
      title: "Chevrolet Product Marketing",
      role: "Assistant Product Marketing Manager, Chevrolet Traverse",
      place: "Warren, Michigan", span: "2014–2015",
      what: "GM's 3-year leadership development program: up or out, with rotations and an international assignment. First rotation: run the Traverse.",
      wins: [
        { big: "−10%", text: "build combinations for the 2016 Traverse" },
        { big: "+6%", text: "consideration at launch from a 'starting at' price trim (2017)" },
        { big: "Graphite", text: "created the Traverse Graphite Edition" }
      ],
      callouts: [
        { obj: "car", text: "Chevrolet Traverse: trimmed the lineup and priced for consideration." },
        { obj: "tool", text: "Complexity analytics: modeled what buyers actually pick." }
      ]
    },

    {
      id: "customer-experience", alias: ["ecuador", "cx"], era: "program", scene: "cx", region: "us",
      title: "Chevrolet Global Customer Experience",
      role: "Global Brand Strategy Assistant Manager",
      place: "Detroit, Michigan", span: "2015–2016",
      what: "GM Ecuador's dealers led every GM region in service satisfaction. Found out why: customers were brought into the process and could watch their car being fixed.",
      flags: [["EC", "Mar 2015", "Quito and Guayaquil dealers", "Quito, Guayaquil"]],
      wins: [
        { big: "Ecuador", text: "studied the dealers with GM's best service satisfaction scores" },
        { big: "Trust", text: "watching the repair made service transparent, and customers trusted it" },
        { big: "Disney", text: "Institute partnership to build a global dealer culture program, with work in Orlando" },
        { big: "Budget", text: "managed the budget for the Disney Institute work" }
      ],
      callouts: [
        { obj: "window", text: "Ecuador: benchmarked GM's top service market." },
        { obj: "park", text: "Disney Institute: built one culture program for Chevrolet dealers worldwide, much of it in Orlando." },
        { obj: "opera", text: "Detroit Opera House: ran the HQ workshops and managed the program budget." }
      ]
    },

    {
      id: "mexico", era: "program", scene: "mexico", region: "mexico",
      title: "GM de Mexico",
      role: "Supervisor, Business Development Center rollout",
      place: "Mexico City", span: "Jun–Dec 2016 · 6 mos",
      what: "The program's international assignment: a national dealer rollout for GM de Mexico. Completed the program and was promoted.",
      flags: [["MX", "Jun–Dec 2016", "international assignment", "Mexico City, Guadalajara, Monterrey"]],
      wins: [
        { big: "70%", text: "of GM Mexico dealers trained in six months" },
        { big: "350+", text: "dealer visits and 20 training sessions" },
        { big: "MD", text: "rollout results presented to GM Mexico's Managing Director" }
      ],
      callouts: [
        { obj: "van", text: "National rollout: trained 70% of GM Mexico dealers in six months." },
        { obj: "desk", text: "Business Development Centers: made sure every sales lead got a follow-up." },
        { obj: "screen", text: "Dealer enablement: built training that scaled past the visits." }
      ],
      more: {
        title: "A national dealer rollout",
        art: "equinox",
        blocks: [
          { h: "The job", p: "Rolling out Business Development Centers across GM Mexico's dealers. 70% trained in six months." }
        ]
      }
    },

    {
      id: "equinox", alias: ["crossovers"], era: "crossovers", scene: "equinox", region: "us",
      title: "Global Product Marketing",
      role: "Global Product Manager, compact and mid crossovers",
      place: "Detroit, Michigan", span: "2017–2018",
      what: "Out of the program and promoted to product marketing manager: content and pricing for crossovers, with work trips around the world.",
      flags: [["CA", "2017", "manufacturing efficiency"], ["CN", "2018", "market research"]],
      wins: [
        { big: "−5%", text: "post-refresh price decay with a global content plan" },
        { big: "3", text: "countries, one content plan: US, Canada and Korea" },
        { big: "$200", text: "per-vehicle profit improvements supported on Equinox and Traverse" }
      ],
      callouts: [
        { obj: "flags", text: "One global plan: aligned US, Canada and Korea executives." },
        { obj: "car", text: "Next-gen Chevrolet Equinox: built content from global customer research." }
      ]
    },

    {
      id: "trailblazer-encore", alias: ["launch"], era: "crossovers", scene: "launch", region: "us",
      title: "Buick Encore GX & Chevrolet Trailblazer",
      role: "Product Manager",
      place: "Detroit, Michigan", span: "2019–2020",
      flags: [["KR", "2019", "where both crossovers are built"]],
      wins: [
        { big: "Tool", text: "matched builds to demand and harness supply in the COVID wire-harness shortage" },
        { big: "On time", text: "show cars delivered on time and under budget" },
        { big: "ACTIV", text: "GHG model added a Trailblazer ACTIV FWD" }
      ],
      callouts: [
        { obj: "harness", text: "Harness shortage: matched builds to harness supply and kept both launches on track." },
        { obj: "roof", text: "Black roof package: added it to the Encore GX within 6 months of production start." }
      ],
      more: {
        title: "Launching through a shortage",
        art: "launch",
        blocks: [
          { h: "The problem", p: "COVID hit East Asia first. Wire-harness supply stalled, and test, launch and show vehicles couldn't be built." },
          { h: "Action", p: "Built a complexity tool that matched builds to demand and harness supply, and narrowed which harnesses to ask for." },
          { h: "The result", p: "Both crossovers launched, and the show cars arrived on time and under budget." }
        ]
      }
    },

    {
      id: "connected", alias: ["ota", "super-cruise"], era: "connected", scene: "ota", region: "us",
      title: "Connected & OTA Services",
      role: "Business Strategy Manager",
      place: "Warren, Michigan", span: "2020–2022",
      wins: [
        { big: "Super Cruise", text: "monetization strategy across every GM brand in North America" },
        { big: "Trial", text: "in-market trial for paid digital products, a $30M opportunity" },
        { big: "2021", text: "helped shape the connected and driver-assist services behind GM's software revenue goal" }
      ],
      callouts: [
        { obj: "team", text: "Built the team: grew it 2 to 7 and ran a $30M paid-products trial." },
        { obj: "wheel", text: "Super Cruise: built monetization across every GM brand in North America." },
        { obj: "car", text: "Over-the-air: shaped revenue after the sale." }
      ],
      more: {
        title: "Five value streams",
        art: "connected",
        blocks: [
          { h: "Scope", p: "Remote services, connected cameras, driver assist, vehicle performance and personalization." },
          { h: "The context", p: "At its Oct 2021 Investor Day, GM set a goal of $20–25B a year in software and services revenue by 2030. Helped shape the services." }
        ],
        sources: [
          { label: "Design Engineering, Oct 2021", url: "https://www.design-engineering.com/gm-promises-to-double-revenue-by-2030-1004037500/" }
        ]
      }
    },

    {
      id: "shanghai", era: "shanghai", scene: "shanghai", region: "asia",
      title: "SAIC-GM",
      role: "Deputy Director, Software Strategy",
      place: "Shanghai, China", span: "2022–2025 · 3 yrs",
      flags: [["CN", "2022–2025", "second international assignment"]],
      wins: [
        { big: "L2++", text: "multi-city ADAS research and pitch that supported a nine-figure driver-assist investment" },
        { big: "Insights", text: "led a strategy, data insights and software research team" },
        { big: "Org", text: "helped stand up a multi-thousand-person software org" }
      ],
      callouts: [
        { obj: "org", text: "Org build: helped stand up a multi-thousand-person software org." },
        { obj: "clipboard", text: "Driver assist: ran the research and pitch behind a nine-figure investment." },
        { obj: "cockpit", text: "Intelligent cockpit: shaped an AI 'Model Integrator' strategy for voice and vision." },
        { obj: "luxury", text: "Luxury: reframed value for young Chinese buyers." }
      ],
      more: {
        title: "Market-first, not hardware-first",
        art: "shanghai",
        blocks: [
          { h: "The lens", p: "Value over the vehicle's life. Connected hardware is an investment, not a cost." },
          { h: "The work", p: "Ran consumer research across Chinese cities on what drivers will pay for in driver assist, and built the case that the research and pitch put in front of GM leadership." }
        ]
      }
    },

    {
      id: "onstar", alias: ["now", "ai", "pmv"], era: "onstar", scene: "onstar", region: "port",
      title: "OnStar International",
      role: "Manager, OnStar Product Marketing, Global Planning & Joint Ventures",
      place: "Warren, Michigan", span: "2025–2026",
      wins: [
        { big: "8", text: "export regions: OnStar for China-built vehicles" },
        { big: "Aligned", text: "OnStar, GM regions and Chinese JV partners on connectivity and launch timing" },
        { big: "Aug 2026", text: "global driver-assist strategy workshop on L2, L2+ and L2++" }
      ],
      callouts: [
        { obj: "ship", text: "Global launches: planned connected services for 8 export regions." },
        { obj: "dock", text: "Export portfolio: planned China-built Chevrolet and Cadillac exports." },
        { obj: "tablet", text: "Driver assist: kept it in scope with a global L2 to L2++ workshop." },
        { obj: "pmv", text: "Portfolio Made Visible: built the export portfolio tool leaders used, with AI agents." }
      ],
      more: {
        title: "The window is real. It is not infinite.",
        art: "onstar",
        blocks: [
          { h: "The job", p: "Commercialize OnStar connected services on China-built export vehicles, region by region." },
          { h: "The space", p: "At GM Forward (Oct 2026), GM made OnStar an AI assistant and said hands-free highway driving will expand to its top sellers. The same space this work covered." }
        ],
        sources: [
          { label: "MobileSyrup, Oct 2026", url: "https://mobilesyrup.com/2026/10/22/gm-forward-even-ev-platform-range-boost/" }
        ]
      }
    },

    {
      id: "finale", alias: ["reel"], era: null, scene: "finale",
      kicker: "Finish",
      title: "Seven chapters, one road.",
      role: "Engineering, product, customer experience and software strategy, across the US, Mexico and China. Tap a chapter to drive back to it.",
      what: "Exploring new leadership opportunities in automotive strategy, product and AI.",
      wins: [], callouts: [],
      reel: { src: "assets/sizzle-reel-v4.mp4", label: "Sizzle reel, 1:41" }
    }
  ],

  ui: {
    home: "Desktop",
    homeAria: "Back to desktop",
    resume: "Resume",
    resumeHref: "assets/resume.pdf",
    contact: "Contact",
    contactHref: "index.html#contact",
    contactEmail: "marcin.fracz@gmail.com",
    linkedin: "https://www.linkedin.com/in/marcinfracz/",
    more: "More",
    close: "Close",
    prev: "Previous stop",
    next: "Next stop",
    back: "Back to the desktop",
    day: "Day", dusk: "Dusk",
    sensors: ["All", "Vision", "Radar", "LiDAR", "V2X", "Off"],
    sources: "Sources",
    noGL: "This browser can't draw the 3D road, so here is the story on its own."
  }
};

/* Each stop's box, one model for every stop:
   header (logo, company, group, role, place, years) → summary → highlights → lettered stories.
   The stories line up with the A, B, C letters in the scene, in the same order as `callouts`.
   **double stars** make a figure bold. This block is what the boxes show; `what`, `wins` and `more`
   above are kept only as source notes.
   Round 8: early years compressed to 3 stops, per an outside executive review.
   Written for a Director-level reader: scope, decisions and results. The early years are kept short. */
window.ROAD_CONTENT.profile = {
  "kettering": {
    company: "Kettering University", group: "Engineering · Federal-Mogul co-op", logo: "kettering-seal", art: "engineering",
    summary: "Earned a mechanical engineering degree, cum laude, while completing four years of paid engineering co-op at Federal-Mogul on production engine sealing.",
    hl: ["**BSME, cum laude**, 2007, minor in business management", "Delivered four years of co-op engineering on production engine parts for global automakers"],
    stories: [
      "Graduated cum laude in 2007 from Kettering's co-op program, which pairs every academic term with a paid industry term, with four years of production engineering already behind me.",
      "Worked every co-op term at Federal-Mogul on engine sealing for GM, Volkswagen, Ford, Cummins and others: designed and tested PTFE and elastomeric seals, and helped finish the 5.7L HEMI cast riser and valve cover gaskets."
    ]
  },
  "fm-coop": {
    company: "Federal-Mogul", group: "Powertrain sealing", logo: "fm", art: "engineering",
    summary: "Four years of paid engineering co-op alongside the Kettering degree, alternating school and industry terms, on production engine sealing for global automakers.",
    hl: ["Helped finish the **5.7L HEMI** cast riser and valve cover gaskets", "Designed and tested **PTFE and elastomeric** engine seals", "Ran **DFMEAs and DVP&Rs** and design reviews with customers and plants"],
    stories: [
      "Helped finish the 5.7L HEMI cast riser and valve cover gasket designs, from cross-sections to finite element analysis, and saw them built and installed at the plants in Skokie and Mexico.",
      "Designed and tested PTFE and elastomeric engine seals, ran DFMEAs and validation plans, and tested parts for GM, Volkswagen, Ford, Cummins and International."
    ]
  },
  "federal-mogul": {
    company: "Federal-Mogul", group: "Powertrain sealing", logo: "fm", art: "engineering",
    summary: "Joined full time out of co-op in 2007. Ran value engineering for the sealing business, then owned design, analysis and validation of head, exhaust and ancillary gaskets for automotive and heavy-duty engine programs.",
    hl: ["Designed the **3.6L Pentastar** head gaskets through to production", "Led value engineering projects worth **$3M** a year in savings", "Saved **$500k** with a new GM 1.4L head gasket design", "Produced **4** US patent disclosures"],
    stories: [
      "Replaced an earlier Pentastar head gasket design that was cracking from fatigue: designed a new multi-layer steel gasket, proved it on the thermal pulsator test and took it from mid-development to production.",
      "Started as the value engineering lead under the sealing business's technology vice president, leading teams across engineering, sales, operations, purchasing and suppliers to $3M a year in savings. Later, a new GM 1.4L head gasket design saved $500k, and the work produced 4 US patent disclosures."
    ]
  },
  "chrysler": {
    company: "Chrysler Group", group: "Powertrain Sealing", logo: "chrysler-group", art: "engineering",
    summary: "Owned design release for every sealing part on the 3.6L Pentastar V6 across Chrysler and Fiat, from supply strategy to warranty.",
    hl: ["Saved **$700k/yr** with a global head gasket supply strategy for Chrysler and Fiat", "Built a sealing and fastening engineering team", "Wrote sealing best practices adopted company-wide"],
    stories: [
      "Owned every Pentastar sealing part from inside Chrysler Group after designing its head gasket at the supplier. The engine reached 1 million built 18 months after launch and 10 million by 2019, across 16 models.",
      "Stopped production at a plant when a supplier quality spill hit the Pentastar rear main seal, rather than ship suspect parts, then re-sourced the seal.",
      "Set one global head gasket supply strategy for Chrysler and Fiat, saving $700k a year, and built a sealing and fastening engineering team with best practices used company-wide."
    ],
    sources: 0
  },
  "johnson-controls": {
    company: "Johnson Controls", group: "Automotive Seating", logo: "jci", storyMarks: [["nissan"]], art: "engineering",
    summary: "Led complete seat systems for Nissan's full-size Titan and Armada with a 12-member cross-functional team and 2 direct reports.",
    hl: ["Launched **ahead of schedule** with **2.2%** cost savings per seat", "Saved **$240k** with Nissan by simplifying trim-level combinations", "Led a **12**-member cross-functional team with 2 direct reports"],
    stories: [
      "Owned the front and rear seat systems for the 2013–2015 Titan and Armada end to end, and launched ahead of schedule with 2.2% cost savings per seat.",
      "Simplified trim-level combinations with Nissan, saving $240k."
    ]
  },
  "ross": {
    company: "University of Michigan", group: "Ross School of Business · Evening MBA", logo: "ross-stack", storyMarks: [[], ["ideaconnection"], []], art: "engineering", noArt: [1],
    summary: "Earned an MBA in Marketing & Strategy at Michigan Ross in the evenings while working full time, including an international consulting project in Canada, to move from engineering into product strategy and business leadership.",
    hl: ["**MBA**, Marketing & Strategy, Michigan Ross, **2014**, earned while working full time", "Ross MAP consultant to **IdeaConnection**, with a week on site in **Victoria, BC**", "Joined GM's **3-year**, up-or-out leadership development program after graduating"],
    stories: [
      "Completed the Michigan Ross MBA in Marketing & Strategy in 2014, in the evening program while leading Nissan seat programs full time at Johnson Controls.",
      "Ross MAP, fall 2012: on a three-person consulting team for IdeaConnection, an open innovation firm in Victoria, British Columbia, including a week on site. Built a market entry strategy for new revenue models (Five Forces, SWOT, VRIO, risk analysis, weighted decision matrix) and presented it board-style to the CEO and VP.",
      "Used the degree to move from engineering into business leadership, joining GM's 3-year, up-or-out leadership development program."
    ]
  },
  "traverse": {
    company: "General Motors", group: "Chevrolet Product Marketing", logo: "generalmotors", storyMarks: [["chevrolet"]], art: "equinox",
    summary: "Shaped content and pricing strategy for the Chevrolet Traverse in the first rotation of GM's leadership development program.",
    hl: ["Built a build complexity tool that cut 2016 Traverse build combinations by **10%**", "Lifted consideration **6%** at launch with a 'starting at' price trim (2017)", "Created the Traverse Graphite Edition"],
    stories: [
      "Cut 2016 Traverse build combinations by 10%, added a 'starting at' price trim that lifted consideration 6% at launch in 2017, and created the Graphite Edition.",
      "Built a build complexity tool that showed which combinations buyers skipped: the analysis behind the leaner lineup."
    ]
  },
  "customer-experience": {
    company: "General Motors", group: "Chevrolet Global Customer Experience", logo: "generalmotors", storyMarks: [["chevrolet"], ["disney"]], art: "equinox",
    summary: "Shaped customer experience strategy for Chevrolet's worldwide dealer network: benchmarked GM's best service market in Ecuador, then built a global dealer culture program with the Disney Institute.",
    hl: ["Benchmarked **GM Ecuador**, the top service satisfaction market in GM, on site in Quito and Guayaquil", "Built a global dealer culture program with the **Disney Institute**, with work at **Walt Disney World** in Orlando", "Ran HQ workshops at the **Detroit Opera House** and managed the program budget"],
    stories: [
      "Ran the 2015 field study in Quito and Guayaquil on why GM Ecuador's dealers led every GM region in service satisfaction. The answer: customers were brought into the process and could watch their car being fixed, so they trusted it.",
      "Partnered with the Disney Institute to turn those lessons into one culture program for Chevrolet dealers worldwide. Much of the work happened on site at Walt Disney World in Orlando.",
      "Brought the program home to GM's Detroit headquarters with workshops at the Detroit Opera House, and managed the budget for the Disney Institute work."
    ]
  },
  "mexico": {
    company: "General Motors", group: "GM de Mexico", logo: "generalmotors", art: "equinox",
    summary: "International assignment: led the national rollout of Business Development Centers, the dealer teams that follow up every sales lead, across GM Mexico. Completed the program and was promoted to product marketing manager.",
    hl: ["Trained **70%** of GM Mexico dealers in six months", "Completed **350+** dealer visits and 20 training sessions", "Presented the results to GM Mexico's Managing Director"],
    stories: [
      "Led a six-month national rollout across Mexico City, Guadalajara and Monterrey: 350+ dealer visits, 20 training sessions and 70% of the network trained.",
      "Rolled out Business Development Centers so every sales lead gets a follow-up, and presented the results to GM Mexico's Managing Director.",
      "Built a dealer training website and video series so the process scaled past the visits."
    ]
  },
  "equinox": {
    company: "General Motors", group: "Global Product Marketing", logo: "generalmotors", storyMarks: [[], ["chevrolet"]], art: "equinox",
    summary: "As global product manager for GM's compact and mid crossovers, built one content and pricing plan across the US, Canada and Korea that cut post-refresh price decay and supported per-vehicle profit gains.",
    hl: ["Supported **$200** per-vehicle profit improvements on Equinox and Traverse", "Cut post-refresh price decay **5%** with a global content plan", "Aligned the US, Canada and Korea on one content plan"],
    stories: [
      "Aligned executives in the US, Canada and Korea on one content plan, cutting post-refresh price decay by 5% and supporting $200 per-vehicle profit improvements on Equinox and Traverse.",
      "Led global customer-centric content workshops for the next-gen Chevrolet Equinox, informed by market research in China in 2018."
    ]
  },
  "trailblazer-encore": {
    company: "General Motors", group: "Buick & Chevrolet Product Management", logo: "generalmotors", storyMarks: [["buick", "chevrolet"], ["buick", "chevrolet"]], art: "launch",
    summary: "Product manager for two new Korea-built crossovers, the Buick Encore GX and Chevrolet Trailblazer: took both from plan to launch through the COVID supply crisis.",
    hl: ["Kept both launches moving with a tool that matched builds to **harness supply**", "Delivered the show cars **on time and under budget**", "Added a Trailblazer ACTIV FWD with a greenhouse gas model"],
    stories: [
      "Built a complexity tool that matched builds to demand and wire-harness supply when COVID stalled test, launch and show vehicles. When the hero color wasn't ready, used off-line paint for the show cars. Both launched, and the show cars arrived on time and under budget.",
      "Added the Encore GX ST Black Roof Package within 6 months of production start, and built the greenhouse gas model that added a Trailblazer ACTIV FWD to the lineup."
    ]
  },
  "connected": {
    company: "General Motors", group: "Connected & OTA Services", logo: "generalmotors", storyMarks: [[], ["cadillac", "chevrolet", "buick"], ["onstar"]], art: "connected",
    summary: "Grew GM's connected services strategy team from 2 to 7 and set business strategy across five value streams: remote services, connected cameras, driver assist, vehicle performance and personalization.",
    hl: ["Grew the strategy team from **2 to 7**", "Built the **Super Cruise** monetization strategy across every GM brand in North America", "Ran an in-market trial for paid digital products, a **$30M** opportunity"],
    stories: [
      "Grew the strategy team from 2 to 7 people and ran an in-market trial for paid digital products, a $30M opportunity.",
      "Built the monetization strategy for Super Cruise across every GM brand in North America, then for next-gen Ultra Cruise.",
      "Helped shape the over-the-air services that let GM sell new features after the sale, part of GM's Oct 2021 goal of $20–25B a year in software and services revenue by 2030."
    ],
    sources: 2
  },
  "shanghai": {
    company: "SAIC-GM", group: "Software Strategy", logo: "sgm", storyMarks: [["patac"], ["momenta"], [], ["cadillac", "buick"]], art: "shanghai",
    summary: "Deputy Director at GM's joint venture in China. Helped stand up a multi-thousand-person software org, led a strategy, data insights and software research team, and set a market-first product strategy for driver assist and the cockpit.",
    hl: ["Helped stand up a **multi-thousand-person** software org", "Ran multi-city ADAS research and a pitch that supported a **nine-figure** driver-assist investment", "Led a strategy, data insights and software research team"],
    stories: [
      "Helped stand up SAIC-GM's software organization, a multi-thousand-person org, while leading a strategy, data insights and software research team.",
      "Ran consumer research across Chinese cities on what drivers will pay for in driver assist. The research and pitch supported a nine-figure driver-assist investment.",
      "Shaped an AI 'Model Integrator' strategy for voice and vision in the intelligent cockpit.",
      "Reframed luxury for young Chinese buyers around value over the vehicle's life: connected hardware as an investment, not a cost."
    ]
  },
  "onstar": {
    company: "General Motors", group: "OnStar International", logo: "generalmotors", storyMarks: [["onstar"], ["chevrolet", "cadillac", "sgm", "sgmw"]], art: "onstar",
    summary: "Owned OnStar connected services for China-built GM export vehicles across 8 regions, aligning OnStar, GM's regional teams and the Chinese joint venture partners on connectivity and launch timing. Built Portfolio Made Visible with AI agents so leaders could see the whole export portfolio in seconds.",
    hl: ["Planned OnStar for China-built vehicles in **8** export regions", "Aligned OnStar, GM regions and Chinese JV partners on connectivity and launch timing", "Kept driver assist in scope with a global L2, L2+ and L2++ strategy workshop, **Aug 2026**", "Built **Portfolio Made Visible** with AI agents: **217** programs, **55** markets, **39** users including **7** director+ and **3** VPs"],
    stories: [
      "Planned connected services for vehicles bound for Mexico, South America, Middle East & Africa, Asia Pacific, Korea, Israel, Australia & NZ and Central Asia, each region with its own connectivity and launch timing.",
      "Built connected-services plans across the export portfolio: the Chevrolet Aveo, Spark EUV and Captiva and the Cadillac XT5.",
      "Kept driver assist in scope with a global strategy workshop on L2, L2+ and L2++ in Aug 2026. At GM Forward in Oct 2026, GM made OnStar an AI assistant and said hands-free highway driving will expand: the same space this work covered.",
      "Rebuilt a retired portfolio tool with AI agents doing the build: 1,780 rows covering 217 programs across 55 markets, so leaders could see any market-year view of the export portfolio, and its gaps, in seconds. It reached 39 users across 11 apps, including 7 director+ and 3 VPs, and was previewed at GM AI Day."
    ],
    sources: 2
  }
};

/* Round 14: the work you can open, shown in the box at the matching stop.
   Each link opens the Work & Tools page (work/brag-book.html) at that case, in a window over the Road.
   All demos run on synthetic data; routes are illustrative. */
window.ROAD_CONTENT.work = {
  "connected": [
    { href: "work/brag-book.html#case-ota", title: "Subscription Lab", thumb: "curve", at: "team", off: [3.2, 1.2, 0],
      text: "Trial length, conversion and churn for features sold after the sale, as a working model." }
  ],
  "shanghai": [
    { href: "work/brag-book.html#case-jv", title: "JV Strategy Room", thumb: "bars", at: "clipboard", off: [3.2, 1.2, 0],
      text: "The multi-city willingness-to-pay research behind the driver-assist funding case." }
  ],
  "onstar": [
    { href: "work/brag-book.html#case-export", title: "Export Command Center", thumb: "map", at: "exportDemo",
      text: "Built in China, launched worldwide, planned in Detroit: which features ship where, and who pays." },
    { href: "work/brag-book.html#case-pmv", title: "Portfolio Made Visible", thumb: "gantt", pill: "Live demo", at: "pmvDemo",
      text: "The export portfolio tool, built with AI agents: any market and year in seconds." },
    { href: "work/brag-book.html#tools", title: "The everyday kit", thumb: "clock", pill: "Kit", at: "kit", off: [-5, -2, 1],
      text: "A live global meeting planner and other single-file tools for a team across time zones." }
  ]
};
window.ROAD_CONTENT.ui.work = "Work";
window.ROAD_CONTENT.ui.workTitle = "Work you can open";
window.ROAD_CONTENT.ui.workGo = "Open the live demo";
window.ROAD_CONTENT.ui.workNote = "Synthetic data";
window.ROAD_CONTENT.ui.workPill = "Live demo";

/* Roles shown on the Work timeline that are not a Road stop of their own.
   The co-op is part of the Kettering stop on the Road, so its link opens that stop. */
window.ROAD_CONTENT.roles = {
  "fm-coop": {
    id: "fm-coop", era: "school", title: "Federal-Mogul", role: "Mechanical Engineering Co-op",
    place: "Southfield, Michigan", span: "2003–2007 · co-op", road: "kettering",
    callouts: [
      { obj: "plant", text: "5.7L HEMI: helped finish the cast riser and valve cover gaskets." },
      { obj: "plant", text: "Seals and validation: designed and tested engine seals for global automakers." }
    ]
  }
};

/* v33: the label shown when you point at a stop on the right-hand rail.
   Same three lines for every stop: company, role and its function, years. */
window.ROAD_CONTENT.rail = {
  "start":               { co: "The Road",              ro: "20+ years in automotive",                                 yr: "2003–2026" },
  "kettering":           { co: "Kettering University",  ro: "BS & Federal-Mogul co-op · Mechanical Engineering",         yr: "2003–2007" },
  "federal-mogul":       { co: "Federal-Mogul",         ro: "Product Engineer · Powertrain Sealing",                     yr: "2007–2010" },
  "chrysler":            { co: "Chrysler Group",        ro: "Design Release Engineer · Powertrain Sealing",              yr: "2010–2011" },
  "johnson-controls":    { co: "Johnson Controls",      ro: "Senior Product Engineer · Automotive Seating",              yr: "2011–2014" },
  "ross":                { co: "Michigan Ross",         ro: "MBA · Marketing & Strategy · MAP in Canada",                yr: "2012–2014" },
  "traverse":            { co: "General Motors",        ro: "Asst. Product Marketing Manager · Chevrolet Marketing",    yr: "2014–2015" },
  "customer-experience": { co: "General Motors",        ro: "Global Brand Strategy Asst. Manager · Customer Experience", yr: "2015–2016" },
  "mexico":              { co: "GM de Mexico",          ro: "Supervisor · Dealer Sales Operations",                      yr: "2016" },
  "equinox":             { co: "General Motors",        ro: "Global Product Manager · Crossover Product Strategy",       yr: "2017–2018" },
  "trailblazer-encore":  { co: "General Motors",        ro: "Product Manager · Buick & Chevrolet Crossovers",           yr: "2019–2020" },
  "connected":           { co: "General Motors",        ro: "Business Strategy Manager · Connected Services",            yr: "2020–2022" },
  "shanghai":            { co: "SAIC-GM",               ro: "Deputy Director · Software Strategy",                       yr: "2022–2025" },
  "onstar":              { co: "General Motors",        ro: "Manager · OnStar International Product Marketing",          yr: "2025–2026" },
  "finale":              { co: "Finish",                ro: "Seven chapters, one road",                                  yr: "2003–2026" }
};
