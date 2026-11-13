# HANDOVER: Marcin Fracz personal website (v1.1)

## What this is
A personal website styled like a computer desktop: a dock, draggable windows, widgets and sticky notes. Inspiration: zainhaseeb.com (desktop layout). Audience: recruiters and hiring leaders for Director-level automotive strategy / product roles.

## Tech spec (keep it portable)
- Plain HTML, CSS and vanilla JavaScript. No framework, no build step.
- Files:
  - `index.html`
  - `css/styles.css`
  - `js/app.js`
  - `content/content.js` (all site text as one global variable, so `index.html` opens by double-click with no local server)
  - `assets/` (images, video, resume PDF)
  - `README.md`, `HANDOVER.md`
- Hosted on GitHub Pages (static).
- Under 768px wide, windows stack vertically (phone layout).

## Status
- Done: desktop layout, mobile media query, window dragging, content injection from `content.js`.
- Not done: deploy, live world clock, styling polish, real assets.

## Next steps
1. **Deploy to GitHub Pages (web UI)**
   - github.com > + > New repository, name `<username>.github.io`, Public, Create.
   - "uploading an existing file", drag in the folder *contents* so `index.html` is at the top level, Commit.
   - Settings > Pages > Deploy from a branch > `main` / `(root)` > Save. URL appears in a minute or two.
   - Web upload caps each file at 25 MB: compress the sizzle reel or embed it from YouTube.
   - A public repo makes every file public, resume PDF included.
2. **Live world clock widget** in `js/app.js`: Detroit (`America/Detroit`), Shanghai (`Asia/Shanghai`), Mexico City (`America/Mexico_City`). Use `Intl.DateTimeFormat` with `timeZone`, update every second. No API key.
3. **Styling polish**: glassmorphism windows (translucent background, backdrop blur, soft border and shadow), one clean Google Font pairing (e.g. Inter for UI), consistent window padding. Look: clean, sleek, modern.

## Content map
- **Intro card**: photo, name, headline, buttons for About / Work / Projects.
- **About**: engineer to product manager to Shanghai software strategy leader to AI builder.
- **Work**: a timeline drawn as one solid left-to-right arrow near the top, with zoom in/out to inspect each role.
  - Federal-Mogul, Chrysler, Johnson Controls (engineering, 2003–2014; powertrain, vehicle interiors)
  - GM: Global Product Manager, compact/mid crossovers (Chevrolet Equinox)
  - GM: Product Manager, Buick Encore GX and Chevrolet Trailblazer
  - GM: Business Strategy Manager, Connected & OTA Services (2020–2022)
  - SAIC-GM, Shanghai: Deputy Director, Software Strategy (2022–2025)
  - GM: Manager, Global Planning & Joint Ventures, OnStar Product Marketing (International)
  - Education: MBA, Michigan Ross (2014); BSME, Kettering (2007, cum laude)
- **Projects**: Marcin Hub (AI-built portfolio tools), OpenAutoLink, 3D prints.
- **Widgets**: world clocks (Detroit, Shanghai, Mexico City), auto + AI news, sizzle reel video.
- **Sticky notes**: motto, resume download, contact.

## Placeholders Marcin still has to fill
- `[PLACEHOLDER_SELECTED_HEADLINE]` in `content.js` (open question: the role he wants next, or what he does)
- `[PLACEHOLDER_EMAIL_OR_LINKEDIN]` in `content.js`
- `assets/wallpaper-placeholder.jpg`
- `assets/profile-placeholder.jpg`
- `assets/sizzle-placeholder.mp4`
- `assets/Marcin_Fracz_Resume.pdf`

## Rules
- Don't mention why he left GM anywhere on the site.
- Make small, scoped changes; don't rewrite working code.
