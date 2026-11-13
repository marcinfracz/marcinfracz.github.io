/* All site text lives here as one global, so index.html opens by double-click
   with no local server. Edit text here, not in index.html. */
window.SITE_CONTENT = {
  intro: {
    name: "Marcin Fracz",
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
        detail: "Open-source car connectivity project."
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
    newsTitle: "AI Dispatch",
    newsSub: "Updated Nov 13, 2026",
    news: [
      { tag: "NEWS", source: "The Neuron", date: "Nov 13", title: "Google launches Gemini 4 Hydrogen, a fast low-cost model for coding and agents", url: "https://www.theneuron.ai/digest/everything-that-happened-in-ai-today-friday-november-13-2026/" },
      { tag: "BUILD", source: "SXF Brief", date: "Nov 13", title: "Anthropic opens self-hosted Claude Managed Agents in private beta", url: "https://sxf.si/brief/" },
      { tag: "OFFICIAL", source: "Claims Journal", date: "Nov 13", title: "Nonprofits sue OpenAI, Anthropic, Google, Meta and SpaceX to halt frontier AI development", url: "https://www.claimsjournal.com/news/national/2026/11/13/341283.htm" },
      { tag: "NEWS", source: "The Neuron", date: "Nov 13", title: "Nvidia CEO Jensen Huang resigns amid scandal reports", url: "https://www.theneuron.ai/digest/everything-that-happened-in-ai-today-friday-november-13-2026/" }
    ],
    sizzleTitle: "Sizzle Reel",
    sizzleNote: "Video coming soon."
  },
  notes: {
    motto: "Build it, ship it, learn from it.",
    resumeNote: "Resume PDF coming soon.",
    contact: {
      email: "marcin.fracz@gmail.com",
      linkedin: "[PLACEHOLDER_LINKEDIN_URL]"
    }
  }
};
