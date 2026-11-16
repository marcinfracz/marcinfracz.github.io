/* The Road: flat country flags and gray name marks, drawn on a canvas.
   Name marks are plain type in the theme's gray, not the companies' own
   artwork, so nothing reads as an endorsement. Used by the 3D scenes and
   by the info plate (as small images). */

export const COUNTRY = {
  US: 'United States', MX: 'Mexico', EC: 'Ecuador', CA: 'Canada', CN: 'China', KR: 'South Korea'
};

function star(ctx, cx, cy, r, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot + i * Math.PI / 5, rr = i % 2 ? r * 0.4 : r;
    ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill();
}

/* Draws a simplified flag into (0,0,w,h). */
export function drawFlag(ctx, code, w, h) {
  ctx.save();
  const C = { red: '#C8384A', blue: '#2B4C8C', white: '#F5F5F2', green: '#2E7D4F', yellow: '#E7C23A', gold: '#B98A3E', black: '#2A2A2A' };
  switch (code) {
    case 'US': {
      const sh = h / 13;
      for (let i = 0; i < 13; i++) { ctx.fillStyle = i % 2 ? C.white : C.red; ctx.fillRect(0, i * sh, w, sh + 0.5); }
      const cw = w * 0.42, ch = sh * 7; ctx.fillStyle = C.blue; ctx.fillRect(0, 0, cw, ch);
      ctx.fillStyle = C.white;
      for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) star(ctx, cw * (c + 0.5) / 5, ch * (r + 0.5) / 4, Math.min(cw / 5, ch / 4) * 0.32);
      break;
    }
    case 'MX': {
      ['#2E7D4F', C.white, C.red].forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(i * w / 3, 0, w / 3 + 0.5, h); });
      ctx.fillStyle = C.gold; ctx.beginPath(); ctx.ellipse(w / 2, h / 2, w * 0.07, h * 0.16, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2E7D4F'; ctx.beginPath(); ctx.ellipse(w / 2, h * 0.62, w * 0.08, h * 0.05, 0, 0, Math.PI); ctx.fill();
      break;
    }
    case 'EC': {
      ctx.fillStyle = C.yellow; ctx.fillRect(0, 0, w, h / 2);
      ctx.fillStyle = C.blue; ctx.fillRect(0, h / 2, w, h / 4 + 0.5);
      ctx.fillStyle = C.red; ctx.fillRect(0, h * 0.75, w, h / 4);
      ctx.fillStyle = C.gold; ctx.beginPath(); ctx.ellipse(w / 2, h / 2, w * 0.08, h * 0.17, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5B8FC9'; ctx.beginPath(); ctx.ellipse(w / 2, h / 2, w * 0.05, h * 0.11, 0, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'CA': {
      ctx.fillStyle = C.white; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = C.red; ctx.fillRect(0, 0, w / 4, h); ctx.fillRect(w * 0.75, 0, w / 4, h);
      // a simple maple leaf
      const cx = w / 2, cy = h * 0.5, s = h * 0.36;
      const pts = [[0, -1], [0.18, -0.62], [0.38, -0.72], [0.32, -0.3], [0.72, -0.48], [0.62, -0.18], [0.86, -0.06], [0.42, 0.28], [0.5, 0.48], [0.06, 0.4], [0.06, 0.85], [-0.06, 0.85], [-0.06, 0.4], [-0.5, 0.48], [-0.42, 0.28], [-0.86, -0.06], [-0.62, -0.18], [-0.72, -0.48], [-0.32, -0.3], [-0.38, -0.72], [-0.18, -0.62]];
      ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(cx + x * s, cy + y * s) : ctx.moveTo(cx + x * s, cy + y * s)); ctx.closePath(); ctx.fill();
      break;
    }
    case 'CN': {
      ctx.fillStyle = '#C8302E'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#F2C94C';
      const u = h / 20;
      star(ctx, 5 * u * (w / h) * 0.75 + u, 5 * u, 3 * u);
      [[10, 2], [12, 4], [12, 7], [10, 9]].forEach(([x, y]) => star(ctx, x * u * (w / h) * 0.75 + u, y * u, u, Math.atan2(5 - y, 5 - x)));
      break;
    }
    case 'KR': {
      ctx.fillStyle = C.white; ctx.fillRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2, r = h * 0.25;
      ctx.fillStyle = '#C8384A'; ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#2B4C8C'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI); ctx.fill();
      ctx.fillStyle = '#C8384A'; ctx.beginPath(); ctx.arc(cx - r / 2, cy, r / 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2B4C8C'; ctx.beginPath(); ctx.arc(cx + r / 2, cy, r / 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.black;
      const bw = h * 0.16, bh = h * 0.035;
      [[0.18, 0.2, -0.6], [0.82, 0.2, 0.6], [0.18, 0.8, 0.6], [0.82, 0.8, -0.6]].forEach(([fx, fy, a]) => {
        ctx.save(); ctx.translate(w * fx, h * fy); ctx.rotate(a);
        for (let i = 0; i < 3; i++) ctx.fillRect(-bw / 2, (i - 1) * bh * 1.9 - bh / 2, bw, bh);
        ctx.restore();
      });
      break;
    }
    default: ctx.fillStyle = '#999'; ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}

/* A small flag as a data URL, for the info plate. */
const urlCache = {};
export function flagURL(code) {
  if (urlCache[code]) return urlCache[code];
  const c = document.createElement('canvas'); c.width = 48; c.height = 32;
  const x = c.getContext('2d'); drawFlag(x, code, 48, 32);
  return (urlCache[code] = c.toDataURL('image/png'));
}

/* Real logos, flattened to one-colour masks (white parts cut out) so they
   take the theme's ink like the rest of the world. Files: assets/road/logos. */
const LOGO = {};
const waiting = new Set();
export function onLogo(fn) { waiting.add(fn); }
function logoImg(id) {
  if (!id) return null;
  if (!LOGO[id]) {
    const im = new Image();
    LOGO[id] = { im, ok: false, tint: {} };
    im.onload = () => { LOGO[id].ok = true; waiting.forEach(f => { try { f(); } catch (e) {} }); };
    im.src = `assets/road/logos/${id}.png`;
  }
  return LOGO[id].ok ? LOGO[id] : null;
}
function tinted(L, color) {
  if (L.tint[color]) return L.tint[color];
  const c = document.createElement('canvas'); c.width = L.im.naturalWidth; c.height = L.im.naturalHeight;
  const x = c.getContext('2d'); x.drawImage(L.im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
  return (L.tint[color] = c);
}
function plate(ctx, w, h, col) {
  const r = h * 0.18;
  ctx.globalAlpha = 0.94; ctx.fillStyle = col.bg;
  ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(w - r, 0); ctx.quadraticCurveTo(w, 0, w, r); ctx.lineTo(w, h - r); ctx.quadraticCurveTo(w, h, w - r, h); ctx.lineTo(r, h); ctx.quadraticCurveTo(0, h, 0, h - r); ctx.lineTo(0, r); ctx.quadraticCurveTo(0, 0, r, 0); ctx.fill();
  ctx.globalAlpha = 1;
}

/* A flat name mark: the company's real logo where we have it, else a round
   monogram and the name in spaced capitals, in the theme's ink. */
export function drawMark(ctx, w, h, spec, col) {
  const L = logoImg(spec.logo);
  if (L) return drawLogoMark(ctx, w, h, spec, col, L);
  return drawTypeMark(ctx, w, h, spec, col);
}
/* round 18: the real SAIC-GM, PATAC and SAIC-GM-Wuling logos keep their own colours, on a white plate */
const FULL_COLOR = new Set(['sgm', 'patac', 'sgmw', 'kettering-seal']);
function drawLogoMark(ctx, w, h, { name, sub = '', logo }, col, L) {
  ctx.clearRect(0, 0, w, h);
  if (FULL_COLOR.has(logo)) col = { bg: '#ffffff', fg: '#1e2733' };
  plate(ctx, w, h, col);
  const img = FULL_COLOR.has(logo) ? L.im : tinted(L, col.fg), ar = (img.naturalWidth || img.width) / (img.naturalHeight || img.height);
  const pad = h * 0.15;
  ctx.globalAlpha = FULL_COLOR.has(logo) ? 1 : 0.86;
  if (ar >= 2.2) {
    // a wordmark: logo across the top, the line under it
    const bh = h * (sub ? 0.52 : 0.68), bw = w - pad * 2;
    let lh = bh, lw = lh * ar; if (lw > bw) { lw = bw; lh = lw / ar; }
    const top = sub ? pad * 0.9 + (bh - lh) / 2 : (h - lh) / 2;
    ctx.drawImage(img, (w - lw) / 2, top, lw, lh);
    if (sub) {
      ctx.globalAlpha = 0.6; ctx.fillStyle = col.fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      let fs = Math.round(h * 0.15); ctx.font = `600 ${fs}px Inter, system-ui, sans-serif`;
      while (ctx.measureText(sub).width > w - pad * 2 && fs > 8) { fs--; ctx.font = `600 ${fs}px Inter, system-ui, sans-serif`; }
      ctx.fillText(sub, w / 2, h - pad * 1.25);
    }
  } else {
    // a symbol: logo at the left, the name and line beside it
    const d = h - pad * 2, lw = d * ar;
    ctx.drawImage(img, pad, pad, lw, d);
    const x = pad + lw + pad * 1.1, avail = w - x - pad;
    ctx.globalAlpha = 0.8; ctx.fillStyle = col.fg; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    let fs = Math.round(h * (sub ? 0.27 : 0.34)); ctx.font = `800 ${fs}px Inter, system-ui, sans-serif`;
    while (ctx.measureText(name).width > avail && fs > 8) { fs--; ctx.font = `800 ${fs}px Inter, system-ui, sans-serif`; }
    ctx.fillText(name, x, sub ? h * 0.4 : h / 2 + 1);
    if (sub) {
      ctx.globalAlpha = 0.58; let f2 = Math.round(h * 0.16); ctx.font = `600 ${f2}px Inter, system-ui, sans-serif`;
      while (ctx.measureText(sub).width > avail && f2 > 8) { f2--; ctx.font = `600 ${f2}px Inter, system-ui, sans-serif`; }
      ctx.fillText(sub, x, h * 0.7);
    }
  }
  ctx.globalAlpha = 1;
}
function drawTypeMark(ctx, w, h, { name, sub = '', mono = '' }, col) {
  ctx.clearRect(0, 0, w, h);
  const r = h * 0.18;
  ctx.globalAlpha = 0.94; ctx.fillStyle = col.bg;
  ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(w - r, 0); ctx.quadraticCurveTo(w, 0, w, r); ctx.lineTo(w, h - r); ctx.quadraticCurveTo(w, h, w - r, h); ctx.lineTo(r, h); ctx.quadraticCurveTo(0, h, 0, h - r); ctx.lineTo(0, r); ctx.quadraticCurveTo(0, 0, r, 0); ctx.fill();
  ctx.globalAlpha = 1;
  const pad = h * 0.16, d = h - pad * 2;
  let x = pad;
  if (mono) {
    ctx.strokeStyle = col.fg; ctx.lineWidth = h * 0.045; ctx.globalAlpha = 0.75;
    ctx.beginPath(); ctx.arc(x + d / 2, h / 2, d / 2 - ctx.lineWidth, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = col.fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `800 ${Math.round(d * (mono.length > 2 ? 0.3 : 0.42))}px Inter, system-ui, sans-serif`;
    ctx.fillText(mono, x + d / 2, h / 2 + 1);
    x += d + pad * 0.9;
  }
  ctx.globalAlpha = 0.78; ctx.fillStyle = col.fg; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  const avail = w - x - pad;
  let fs = Math.round(h * (sub ? 0.3 : 0.36));
  const spaced = name.toUpperCase().split('').join(String.fromCharCode(8202));
  ctx.font = `800 ${fs}px Inter, system-ui, sans-serif`;
  while (ctx.measureText(spaced).width > avail && fs > 8) { fs--; ctx.font = `800 ${fs}px Inter, system-ui, sans-serif`; }
  ctx.fillText(spaced, x, sub ? h * 0.4 : h / 2 + 1);
  if (sub) {
    ctx.globalAlpha = 0.55; ctx.font = `600 ${Math.round(h * 0.17)}px Inter, system-ui, sans-serif`;
    ctx.fillText(sub, x, h * 0.72);
  }
  ctx.globalAlpha = 1;
}
