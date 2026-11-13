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
  wallpapers: [
    { id: "skyline", label: "Shanghai Skyline", type: "image", src: "assets/skyline.jpg" },
    { id: "cream", label: "Solid Cream", type: "solid", src: "" }
  ],
  notes: {
    motto: "Build it, ship it,\nlearn from it.",
    resumeNote: "Resume (PDF)",
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
