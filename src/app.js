{
const R = RepRig, V = R.V, Q = R.Q;
const RIG = RR_DATA.rig, EX = RR_DATA.exercise, SCHEMA = RR_DATA.schema;
const META = EX.exercise;
const rig = R.buildRig(RIG);
const tl = R.buildTimeline(EX);
const D = tl.duration;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------------- state ---------------- */
const P0 = EX.camera.presets[EX.camera.default];
const S = {
  t: 3.2, playing: true, speed: 1, side: 'R', cam: EX.camera.default, yaw: P0.yaw, pitch: P0.pitch, bg: 'dark', hover: null,
  show: { target: true, synergist: true, stabilizer: false, lengthened: false, paths: true, angles: true },
};
try { const saved = JSON.parse(localStorage.getItem('reprig-view') || '{}'); if (saved.bg) S.bg = saved.bg; if (saved.show) Object.assign(S.show, saved.show); } catch (e) {}
const remember = () => { try { localStorage.setItem('reprig-view', JSON.stringify({ bg: S.bg, show: S.show })); } catch (e) {} };

const ROLE = { target: [229, 62, 58], synergist: [242, 169, 30], stabilizer: [59, 143, 224], lengthened: [154, 99, 232] };
const ROLE_LABEL = { target: 'Target', synergist: 'Synergists', stabilizer: 'Stabilizers', lengthened: 'Lengthened' };
const roleOf = {};
for (const role in META.muscles) for (const id of META.muscles[role]) roleOf[id] = role;
const PAL = {
  dark: { bg: ['#20252d', '#0e1115'], floor: [38, 43, 51], mat: [44, 58, 64], matEdge: [70, 92, 100], body: [182, 190, 202], hair: [52, 56, 66], face: [204, 210, 219], shadow: 0.5, ink: '#e8ecf1', guide: '#2fd1c0', arc: '#2fd1c0', band: 'rgba(47,209,192,.16)', grid: 'rgba(255,255,255,.035)' },
  light: { bg: ['#f3f2ee', '#dedcd5'], floor: [214, 211, 203], mat: [93, 132, 136], matEdge: [70, 104, 108], body: [176, 183, 195], hair: [62, 66, 76], face: [196, 202, 211], shadow: 0.28, ink: '#1d2127', guide: '#0e8f83', arc: '#0e8f83', band: 'rgba(14,143,131,.14)', grid: 'rgba(0,0,0,.03)' },
};
const BIG = new Set(['pelvis', 'abdomen', 'ribcage', 'chest', 'buttock_r', 'buttock_l']);

/* ---------------- canvas ---------------- */
const stage = $('stage'), cv = $('cv'), ctx = cv.getContext('2d');
const shadowCv = document.createElement('canvas'), sctx = shadowCv.getContext('2d');
let CW = 0, CH = 0, DPR = 1;
function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  CW = stage.clientWidth; CH = stage.clientHeight;
  cv.width = Math.round(CW * DPR); cv.height = Math.round(CH * DPR); shadowCv.width = Math.max(1, Math.round(CW / 4)); shadowCv.height = Math.max(1, Math.round(CH / 4));
  fitCache = {}; draw();
}
const roStage = new ResizeObserver(resize);

/* ---------------- framing ---------------- */
let fitCache = {};
const handPathWorld = (() => {
  const g = EX.guides.find((x) => x.kind === 'path'); if (!g) return null;
  const pts = [];
  for (let i = 0; i <= 140; i++) { const t = g.from + ((g.to - g.from) * i) / 140; pts.push({ t, p: R.evalPose(rig, tl.pose(t), EX.contacts)[g.joint].p }); }
  return { g, pts };
})();
const SAMPLES = Array.from({ length: 24 }, (_, i) => R.evalPose(rig, tl.pose((i / 24) * D), EX.contacts));
function fit(cam, mirror) {
  const key = `${S.yaw.toFixed(1)}|${S.pitch.toFixed(1)}|${mirror}|${CW}x${CH}`;
  if (fitCache[key]) return fitCache[key];
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  const add = (p, m) => { const s = R.project(cam, p, mirror); x0 = Math.min(x0, s[0] - m); x1 = Math.max(x1, s[0] + m); y0 = Math.min(y0, s[1] - m); y1 = Math.max(y1, s[1] + m); };
  for (const W of SAMPLES) for (const id in W) add(W[id].p, 9);
  const padTop = 54, padBot = S.show.angles && CW > 520 ? 26 : 22, padX = 26;
  const sc = Math.min((CW - padX * 2) / (x1 - x0), (CH - padTop - padBot) / (y1 - y0));
  const f = { s: sc, ox: padX + ((CW - padX * 2) - (x1 - x0) * sc) / 2 - x0 * sc, oy: padTop + ((CH - padTop - padBot) - (y1 - y0) * sc) / 2 + y1 * sc };
  fitCache = { [key]: f }; return f;
}

/* ---------------- colour helpers ---------------- */
const rgb = (c, a) => (a == null ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`);
const mul = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const LIGHT = V.norm([-0.55, -0.83, 0]); // screen space, from upper left

/* ---------------- geometry -> screen primitives ---------------- */
function capsulePath(p, a, ra, b, rb) {
  const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy);
  if (d + Math.min(ra, rb) <= Math.max(ra, rb) + 0.01) { const big = ra >= rb ? [a, ra] : [b, rb]; p.moveTo(big[0][0] + big[1], big[0][1]); p.arc(big[0][0], big[0][1], big[1], 0, Math.PI * 2, true); return; }
  const th = Math.atan2(dy, dx), al = Math.acos((ra - rb) / d);
  p.moveTo(a[0] + ra * Math.cos(th + al), a[1] + ra * Math.sin(th + al));
  p.lineTo(b[0] + rb * Math.cos(th + al), b[1] + rb * Math.sin(th + al));
  p.arc(b[0], b[1], rb, th + al, th - al, true);
  p.lineTo(a[0] + ra * Math.cos(th - al), a[1] + ra * Math.sin(th - al));
  p.arc(a[0], a[1], ra, th - al, th + al, true);
  p.closePath();
}
function screenEllipse(cam, mirror, f, c, axes) {
  const e = R.ellipseOf(cam, c, axes, mirror);
  return { cx: f.ox + e.cx * f.s, cy: f.oy - e.cy * f.s, rx: Math.max(0.3, e.rx * f.s), ry: Math.max(0.3, e.ry * f.s), rot: -e.rot, depth: e.depth };
}
function buildScene(t, opt) {
  const cam = R.camera(S.yaw, S.pitch), mirror = S.side === 'L', f = fit(cam, mirror);
  const pose = tl.pose(t), W = R.evalPose(rig, pose, EX.contacts);
  const P = (p) => { const s = R.project(cam, p, mirror); return [f.ox + s[0] * f.s, f.oy - s[1] * f.s, s[2]]; };
  const items = [], shadows = [];
  for (const s of rig.shapes) {
    const g = R.shapeWorld(W, s);
    if (g.kind === 'capsule') {
      const a = P(g.a), b = P(g.b);
      items.push({ type: 'cap', id: s.id, tone: s.tone, a, b, ra: g.r[0] * f.s, rb: g.r[1] * f.s, depth: (a[2] + b[2]) / 2 + s.bias, big: false });
      shadows.push({ type: 'cap', a: P([g.a[0], 0, g.a[2]]), b: P([g.b[0], 0, g.b[2]]), ra: g.r[0] * f.s, rb: g.r[1] * f.s, h: (g.a[1] + g.b[1]) / 2 });
    } else {
      const e = screenEllipse(cam, mirror, f, g.c, g.axes);
      items.push(Object.assign({ type: 'ell', id: s.id, tone: s.tone, big: BIG.has(s.id) }, e, { depth: e.depth + s.bias }));
      const fl = g.axes.map((x) => [x[0], 0, x[2]]);
      shadows.push(Object.assign({ type: 'ell', h: g.c[1] }, screenEllipse(cam, mirror, f, [g.c[0], 0, g.c[2]], fl)));
    }
  }
  const muscles = [];
  for (const m of rig.muscles) {
    const role = roleOf[m.id]; if (!role) continue;
    const on = S.show[role] || S.hover === m.id || (opt && opt.allMuscles);
    if (!on) continue;
    const act = tl.activation(m.id, t), boost = S.hover === m.id ? 1 : 0;
    for (const part of m.parts) {
      const J = W[part.joint];
      const c = V.add(J.p, Q.rot(J.q, part.c));
      const axes = [Q.rot(J.q, [part.r[0], 0, 0]), Q.rot(J.q, [0, part.r[1], 0]), Q.rot(J.q, [0, 0, part.r[2]])];
      const e = screenEllipse(cam, mirror, f, c, axes);
      const it = Object.assign({ type: 'mus', id: m.id, role, act: Math.max(act, boost), hover: !!boost }, e);
      items.push(it); muscles.push(it);
    }
  }
  items.sort((a, b) => a.depth - b.depth);
  return { cam, mirror, f, pose, W, P, items, shadows, muscles };
}

/* ---------------- drawing ---------------- */
function shapePath(it, p) {
  if (it.type === 'cap') capsulePath(p, it.a, it.ra, it.b, it.rb);
  else { p.moveTo(it.cx + it.rx * Math.cos(it.rot), it.cy + it.rx * Math.sin(it.rot)); p.ellipse(it.cx, it.cy, it.rx, it.ry, it.rot, 0, Math.PI * 2, true); }
}
function toneColor(pal, tone) { return tone === 'hair' ? pal.hair : tone === 'face' ? pal.face : pal.body; }
function fillShape(c, it, base, dmin, dmax, pal) {
  const k = 0.8 + 0.2 * ((it.depth - dmin) / (dmax - dmin || 1));
  const mid = mul(base, k), hi = mix(mid, [255, 255, 255], it.tone === 'hair' ? 0.18 : it.big ? 0.26 : 0.4), lo = mul(mid, it.tone === 'hair' ? 0.7 : it.big ? 0.8 : 0.68);
  const p = new Path2D(); shapePath(it, p);
  if (it.type === 'cap') {
    const dx = it.b[0] - it.a[0], dy = it.b[1] - it.a[1], L = Math.hypot(dx, dy) || 1;
    let nx = -dy / L, ny = dx / L; if (nx * LIGHT[0] + ny * LIGHT[1] > 0) { nx = -nx; ny = -ny; }
    const mx = (it.a[0] + it.b[0]) / 2, my = (it.a[1] + it.b[1]) / 2, r = (it.ra + it.rb) / 2;
    const g = c.createLinearGradient(mx - nx * r, my - ny * r, mx + nx * r, my + ny * r);
    g.addColorStop(0, rgb(lo)); g.addColorStop(0.55, rgb(mid)); g.addColorStop(0.9, rgb(hi)); g.addColorStop(1, rgb(mix(hi, mid, 0.4)));
    c.fillStyle = g; c.fill(p);
  } else {
    c.save(); c.translate(it.cx, it.cy); c.rotate(it.rot); c.scale(it.rx, it.ry);
    const cr = Math.cos(-it.rot), sr = Math.sin(-it.rot);
    let lx = (LIGHT[0] * cr - LIGHT[1] * sr) / it.rx, ly = (LIGHT[0] * sr + LIGHT[1] * cr) / it.ry; const ll = Math.hypot(lx, ly) || 1; lx /= ll; ly /= ll;
    const g = c.createRadialGradient(lx * 0.42, ly * 0.42, 0.05, 0, 0, 1.08);
    g.addColorStop(0, rgb(hi)); g.addColorStop(0.55, rgb(mid)); g.addColorStop(1, rgb(lo));
    c.restore(); c.save(); c.translate(it.cx, it.cy); c.rotate(it.rot); c.scale(it.rx, it.ry); c.fillStyle = g; c.beginPath(); c.arc(0, 0, 1, 0, Math.PI * 2); c.fill(); c.restore();
  }
  if (!it.big) { c.lineWidth = 0.8; c.strokeStyle = rgb(mul(mid, 0.55), 0.55); c.stroke(p); }
}
function fillMuscle(c, it, clip) {
  const col = ROLE[it.role], a = 0.3 + 0.7 * it.act;
  c.save(); c.clip(clip);
  c.translate(it.cx, it.cy); c.rotate(it.rot); c.scale(it.rx, it.ry);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, rgb(mix(col, [255, 255, 255], 0.15), Math.min(1, a))); g.addColorStop(0.7, rgb(col, a * 0.85)); g.addColorStop(1, rgb(col, 0));
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, 1, 0, Math.PI * 2); c.fill();
  c.restore();
  if (it.hover) { c.save(); c.translate(it.cx, it.cy); c.rotate(it.rot); c.scale(it.rx, it.ry); c.lineWidth = 1.6 / Math.max(it.rx, it.ry); c.strokeStyle = rgb(col, 0.95); c.beginPath(); c.arc(0, 0, 1, 0, Math.PI * 2); c.stroke(); c.restore(); }
}
function floorQuad(c, P, x0, x1, z0, z1) { const q = [P([x0, 0, z0]), P([x1, 0, z0]), P([x1, 0, z1]), P([x0, 0, z1])]; c.beginPath(); q.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); return q; }

function render(c, sc, t, w, h, opts) {
  const pal = PAL[S.bg];
  const bg = c.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, pal.bg[0]); bg.addColorStop(1, pal.bg[1]);
  c.fillStyle = bg; c.fillRect(0, 0, w, h);
  // floor grid + mat
  c.save(); c.strokeStyle = pal.grid; c.lineWidth = 1;
  for (let x = -150; x <= 150; x += 25) { const a = sc.P([x, 0, -110]), b = sc.P([x, 0, 110]); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }
  for (let z = -110; z <= 110; z += 25) { const a = sc.P([-150, 0, z]), b = sc.P([150, 0, z]); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }
  c.restore();
  const mat = EX.props.find((p) => p.kind === 'mat');
  if (mat) {
    const [mx, , mz] = mat.center, [sx, , sz] = mat.size;
    floorQuad(c, sc.P, mx - sx / 2, mx + sx / 2, mz - sz / 2, mz + sz / 2);
    c.fillStyle = rgb(pal.mat); c.fill(); c.lineWidth = 1.2; c.strokeStyle = rgb(pal.matEdge); c.stroke();
  }
  // soft shadow
  if (!opts || !opts.noShadow) {
    const k = shadowCv.width / w;
    sctx.setTransform(k, 0, 0, k, 0, 0); sctx.clearRect(0, 0, w, h);
    sctx.filter = `blur(${Math.max(1.2, sc.f.s * 1.1)}px)`;
    for (const s of sc.shadows) { const p = new Path2D(); shapePath(s, p); sctx.globalAlpha = Math.max(0.15, 1 - s.h / 90); sctx.fillStyle = '#000'; sctx.fill(p); }
    sctx.filter = 'none';
    c.save(); c.globalAlpha = pal.shadow; c.imageSmoothingQuality = 'high'; c.drawImage(shadowCv, 0, 0, w, h); c.restore();
  }
  // body + muscles, depth sorted
  const body = sc.items.filter((i) => i.type !== 'mus');
  let dmin = 1e9, dmax = -1e9; for (const b of body) { dmin = Math.min(dmin, b.depth); dmax = Math.max(dmax, b.depth); }
  const clip = new Path2D(); for (const b of body) shapePath(b, clip);
  for (const it of sc.items) { if (it.type === 'mus') fillMuscle(c, it, clip); else fillShape(c, it, toneColor(pal, it.tone), dmin, dmax, pal); }
  if (S.show.paths && (!opts || !opts.noGuides)) drawGuides(c, sc, t, pal);
}

function arrowHead(c, a, b, size, col) {
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  c.save(); c.fillStyle = col; c.translate(b[0], b[1]); c.rotate(ang);
  c.beginPath(); c.moveTo(0, 0); c.lineTo(-size, -size * 0.55); c.lineTo(-size, size * 0.55); c.closePath(); c.fill(); c.restore();
}
function label(c, x, y, txt, pal, align) {
  c.save(); c.font = '600 13px Inter, system-ui, sans-serif'; c.textAlign = align || 'left'; c.textBaseline = 'middle';
  c.lineWidth = 4; c.strokeStyle = S.bg === 'dark' ? 'rgba(14,17,21,.85)' : 'rgba(243,242,238,.9)'; c.strokeText(txt, x, y); c.fillStyle = pal.ink; c.fillText(txt, x, y); c.restore();
}
function drawGuides(c, sc, t, pal) {
  // 1. hand path
  if (handPathWorld) {
    const pts = handPathWorld.pts.map((q) => sc.P(q.p));
    c.save(); c.setLineDash([5, 5]); c.lineWidth = 2; c.strokeStyle = pal.guide; c.globalAlpha = 0.85;
    c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.stroke(); c.restore();
    for (const k of [0.28, 0.42, 0.72, 0.86]) { const i = Math.floor(k * (pts.length - 1)); arrowHead(c, pts[i - 2], pts[i], 9, pal.guide); }
    const g = handPathWorld.g;
    if (t >= g.from && t <= g.to) { const hp = sc.P(sc.W[g.joint].p); c.save(); c.fillStyle = pal.guide; c.beginPath(); c.arc(hp[0], hp[1], 5, 0, Math.PI * 2); c.fill(); c.globalAlpha = 0.25; c.beginPath(); c.arc(hp[0], hp[1], 11, 0, Math.PI * 2); c.fill(); c.restore(); }
    const top = pts.reduce((a, b) => (b[1] < a[1] ? b : a));
    label(c, top[0] + 12, top[1] - 4, 'Hand path', pal);
  }
  // 2. thoracic rotation protractor around the trunk axis
  const arcG = EX.guides.find((g) => g.kind === 'rotationArc');
  if (arcG) {
    const m = R.measures(sc.W), Rr = arcG.radius;
    const ctr = V.scale(V.add(sc.W.shoulder_r.p, sc.W.shoulder_l.p), 0.5);
    const at = (deg, rr) => { const a = deg * R.DEG; return sc.P(V.add(ctr, V.add(V.scale(m.hz, Math.cos(a) * rr), V.scale(m.up, Math.sin(a) * rr)))); };
    const cP = sc.P(ctr);
    c.save();
    // norm band
    const [b0, b1] = arcG.normBand; c.fillStyle = pal.band; c.beginPath(); c.moveTo(cP[0], cP[1]);
    for (let d = b0; d <= b1; d += 2) { const p = at(d, Rr + 6); c.lineTo(p[0], p[1]); } c.closePath(); c.fill();
    // ticks + reference
    c.strokeStyle = pal.arc; c.globalAlpha = 0.5; c.lineWidth = 1;
    for (const d of [0, 15, 30, 45, 60]) { const a = at(d, Rr - 3), b = at(d, Rr + 3); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }
    const r0 = at(0, Rr + 8); c.setLineDash([3, 4]); c.beginPath(); c.moveTo(cP[0], cP[1]); c.lineTo(r0[0], r0[1]); c.stroke(); c.setLineDash([]);
    // live arc
    const cur = m.shoulderLineIncl; c.globalAlpha = 1; c.lineWidth = 3; c.beginPath();
    const n = Math.max(2, Math.ceil(Math.abs(cur) / 2));
    for (let i = 0; i <= n; i++) { const p = at((cur * i) / n, Rr); i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); } c.stroke();
    const e1 = at(cur, Rr), e0 = at(cur - Math.sign(cur || 1) * 3, Rr); if (Math.abs(cur) > 4) arrowHead(c, e0, e1, 9, pal.arc);
    const sl = at(cur, 0), sr = at(cur, Rr + 2); c.globalAlpha = 0.9; c.lineWidth = 1.5; c.beginPath(); c.moveTo(sl[0], sl[1]); c.lineTo(sr[0], sr[1]); c.stroke();
    c.restore();
    const lp = at(cur, Rr + 16);
    label(c, lp[0], lp[1], `${Math.round(Math.abs(cur))}° rotation`, pal, lp[0] < cP[0] ? 'right' : 'left');
  }
  // 3. gaze ray during rotate/hold
  const ph = tl.phaseAt(t);
  if (ph.id === 'rotate' || ph.id === 'hold') {
    const H = sc.W.head_c1, eye = V.add(H.p, Q.rot(H.q, [11, 8, 0])), dir = Q.rot(H.q, [1, 0, 0]);
    const a = sc.P(eye), b = sc.P(V.add(eye, V.scale(dir, 40)));
    const fade = ph.id === 'rotate' ? Math.min(1, (t - ph.start) / 0.8) : 1;
    c.save(); c.globalAlpha = 0.55 * fade; c.strokeStyle = pal.ink; c.setLineDash([2, 5]); c.lineWidth = 1.5; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); c.restore();
  }
}

let lastScene = null;
function draw() {
  if (!CW) return;
  const sc = buildScene(S.t);
  lastScene = sc;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  render(ctx, sc, S.t, CW, CH);
}

/* ---------------- SVG export of the current frame ---------------- */
function frameSVG() {
  const sc = buildScene(S.t), pal = PAL[S.bg];
  const body = sc.items.filter((i) => i.type !== 'mus');
  let dmin = 1e9, dmax = -1e9; for (const b of body) { dmin = Math.min(dmin, b.depth); dmax = Math.max(dmax, b.depth); }
  const pathD = (it) => {
    if (it.type === 'cap') { const p = []; const P2 = { moveTo: (x, y) => p.push(`M${x.toFixed(2)} ${y.toFixed(2)}`), lineTo: (x, y) => p.push(`L${x.toFixed(2)} ${y.toFixed(2)}`), arc: (cx, cy, r, s, e, ccw) => { const ex = cx + r * Math.cos(e), ey = cy + r * Math.sin(e); let sw = ccw ? s - e : e - s; while (sw < 0) sw += Math.PI * 2; p.push(`A${r.toFixed(2)} ${r.toFixed(2)} 0 ${sw > Math.PI ? 1 : 0} ${ccw ? 0 : 1} ${ex.toFixed(2)} ${ey.toFixed(2)}`); }, closePath: () => p.push('Z') }; capsulePath(P2, it.a, it.ra, it.b, it.rb); return p.join(''); }
    return null;
  };
  let defs = '', out = '', clip = '', gi = 0;
  for (const b of body) { const d = pathD(b); clip += d ? `<path d="${d}"/>` : `<ellipse cx="${b.cx.toFixed(2)}" cy="${b.cy.toFixed(2)}" rx="${b.rx.toFixed(2)}" ry="${b.ry.toFixed(2)}" transform="rotate(${(b.rot / R.DEG).toFixed(2)} ${b.cx.toFixed(2)} ${b.cy.toFixed(2)})"/>`; }
  defs += `<clipPath id="body">${clip}</clipPath>`;
  for (const it of sc.items) {
    if (it.type === 'mus') {
      const col = ROLE[it.role], a = (0.3 + 0.7 * it.act).toFixed(2), id = `g${gi++}`;
      defs += `<radialGradient id="${id}"><stop offset="0" stop-color="${rgb(col)}" stop-opacity="${a}"/><stop offset="0.7" stop-color="${rgb(col)}" stop-opacity="${(a * 0.85).toFixed(2)}"/><stop offset="1" stop-color="${rgb(col)}" stop-opacity="0"/></radialGradient>`;
      out += `<ellipse clip-path="url(#body)" fill="url(#${id})" cx="${it.cx.toFixed(2)}" cy="${it.cy.toFixed(2)}" rx="${it.rx.toFixed(2)}" ry="${it.ry.toFixed(2)}" transform="rotate(${(it.rot / R.DEG).toFixed(2)} ${it.cx.toFixed(2)} ${it.cy.toFixed(2)})"/>`;
      continue;
    }
    const k = 0.8 + 0.2 * ((it.depth - dmin) / (dmax - dmin || 1)), base = toneColor(pal, it.tone), mid = mul(base, k), hi = mix(mid, [255, 255, 255], 0.42), lo = mul(mid, 0.66), id = `g${gi++}`;
    const stroke = it.big ? '' : ` stroke="${rgb(mul(mid, 0.55))}" stroke-opacity=".55" stroke-width=".8"`;
    if (it.type === 'cap') {
      const dx = it.b[0] - it.a[0], dy = it.b[1] - it.a[1], L = Math.hypot(dx, dy) || 1; let nx = -dy / L, ny = dx / L; if (nx * LIGHT[0] + ny * LIGHT[1] > 0) { nx = -nx; ny = -ny; }
      const mx = (it.a[0] + it.b[0]) / 2, my = (it.a[1] + it.b[1]) / 2, r = (it.ra + it.rb) / 2;
      defs += `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${(mx - nx * r).toFixed(2)}" y1="${(my - ny * r).toFixed(2)}" x2="${(mx + nx * r).toFixed(2)}" y2="${(my + ny * r).toFixed(2)}"><stop offset="0" stop-color="${rgb(lo)}"/><stop offset=".55" stop-color="${rgb(mid)}"/><stop offset=".9" stop-color="${rgb(hi)}"/></linearGradient>`;
      out += `<path d="${pathD(it)}" fill="url(#${id})"${stroke}/>`;
    } else {
      defs += `<radialGradient id="${id}" fx=".32" fy=".3"><stop offset="0" stop-color="${rgb(hi)}"/><stop offset=".55" stop-color="${rgb(mid)}"/><stop offset="1" stop-color="${rgb(lo)}"/></radialGradient>`;
      out += `<ellipse cx="${it.cx.toFixed(2)}" cy="${it.cy.toFixed(2)}" rx="${it.rx.toFixed(2)}" ry="${it.ry.toFixed(2)}" transform="rotate(${(it.rot / R.DEG).toFixed(2)} ${it.cx.toFixed(2)} ${it.cy.toFixed(2)})" fill="url(#${id})"${stroke}/>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CW} ${CH}" width="${CW}" height="${CH}"><defs>${defs}</defs>${out}</svg>`;
}

/* ---------------- UI ---------------- */
const fmt = (v) => `${v >= 0 ? '' : '−'}${Math.abs(v).toFixed(0)}°`;
const sideWord = (id) => { const s = id.endsWith('_r') ? 'right' : id.endsWith('_l') ? 'left' : ''; if (!s) return ''; return S.side === 'L' ? (s === 'right' ? 'left' : 'right') : s; };
const muscleName = (id) => { const m = rig.muscles.find((x) => x.id === id); const w = sideWord(id); return m ? m.name + (w ? ` (${w})` : '') : id; };

function seg(el, items, cur, onPick) {
  el.innerHTML = items.map(([v, l]) => `<button type="button" data-v="${esc(v)}" aria-pressed="${String(v) === String(cur)}">${esc(l)}</button>`).join('');
  el.onclick = (e) => { const b = e.target.closest('button'); if (!b) return; onPick(b.dataset.v); el.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); };
}
function buildUI() {
  $('meta').innerHTML = [META.type, META.bodyPart, META.equipment[0], META.difficulty, `${META.plane} plane`].map((x) => `<span class="tag">${esc(x)}</span>`).join('');
  $('ref').innerHTML = `Movement reference: <a href="${esc(META.reference.url)}" target="_blank" rel="noopener">GymVisual #${esc(META.reference.productRef)}</a>, first item on its media page. Rig, artwork and motion here are original.`;
  const pr = META.prescription;
  $('facts').innerHTML = [['Sets × reps', `${pr.sets} × ${pr.reps}`], ['End-range hold', pr.endRangeHold], ['Static option', pr.staticOption], ['Tempo', pr.tempo], ['Equipment', META.equipment.join(', ')], ['Laterality', META.laterality]]
    .map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
  $('breathing').innerHTML = `<b>Breathing.</b> ${esc(META.breathing.pattern)}`;
  // phases
  $('phasebar').innerHTML = EX.timeline.phases.map((p) => `<div data-ph="${esc(p.id)}" style="width:calc(${((p.end - p.start) / D) * 100}% - 2px)" title="${esc(p.label)}">${esc(p.label)}</div>`).join('');
  // transport
  seg($('speed'), [['0.5', '0.5×'], ['1', '1.0×'], ['1.5', '1.5×']], S.speed, (v) => { S.speed = +v; });
  seg($('sideSeg'), [['L', 'Left'], ['R', 'Right']], S.side, (v) => { S.side = v; fitCache = {}; refreshSide(); draw(); });
  seg($('camSeg'), Object.entries(EX.camera.presets).map(([k, p]) => [k, p.label]), S.cam, (v) => { S.cam = v; S.yaw = EX.camera.presets[v].yaw; S.pitch = EX.camera.presets[v].pitch; draw(); });
  seg($('bgSeg'), [['dark', 'Dark'], ['light', 'Light']], S.bg, (v) => { S.bg = v; stage.classList.toggle('light', v === 'light'); remember(); draw(); });
  stage.classList.toggle('light', S.bg === 'light');
  const tg = [['target', ROLE_LABEL.target, ROLE.target], ['synergist', ROLE_LABEL.synergist, ROLE.synergist], ['stabilizer', ROLE_LABEL.stabilizer, ROLE.stabilizer], ['lengthened', ROLE_LABEL.lengthened, ROLE.lengthened], ['paths', 'Path guides', [22, 179, 163]], ['angles', 'Angles', [120, 128, 140]]];
  $('toggles').innerHTML = tg.map(([k, l, c]) => `<button type="button" class="chip" data-k="${k}" style="--c:${rgb(c)}" aria-pressed="${S.show[k]}"><i></i>${esc(l)}</button>`).join('');
  $('toggles').onclick = (e) => { const b = e.target.closest('.chip'); if (!b) return; const k = b.dataset.k; S.show[k] = !S.show[k]; b.setAttribute('aria-pressed', String(S.show[k])); if (k === 'angles') $('hud').classList.toggle('off', !S.show.angles); remember(); draw(); };
  $('hud').classList.toggle('off', !S.show.angles);
  // tabs
  const tabs = [['form', 'Form'], ['anatomy', 'Anatomy'], ['kin', 'Kinematics'], ['json', 'Rig JSON'], ['src', 'Sources']];
  $('tabs').innerHTML = tabs.map(([k, l], i) => `<button role="tab" type="button" id="tab-${k}" aria-controls="p-${k}" aria-selected="${i === 0}">${esc(l)}</button>`).join('');
  const pick = (k) => { tabs.forEach(([x]) => { $(`tab-${x}`).setAttribute('aria-selected', String(x === k)); $(`p-${x}`).classList.toggle('on', x === k); }); };
  $('tabs').onclick = (e) => { const b = e.target.closest('button'); if (b) pick(b.id.slice(4)); };
  pick('form');
  // form
  $('cues').innerHTML = META.cues.map((c, i) => { const ph = EX.timeline.phases.find((p) => p.id === c.phase); return `<li data-ph="${esc(c.phase)}"><b>${i + 1}. ${esc(ph ? ph.label : c.phase)}</b><span>${esc(c.text)}</span>${ph ? `<small>${esc(ph.breath === 'natural' ? 'Breathe normally' : ph.breath[0].toUpperCase() + ph.breath.slice(1))} · ${(ph.end - ph.start).toFixed(1)} s at 1.0×</small>` : ''}</li>`; }).join('');
  $('mist').innerHTML = META.mistakes.map((m) => `<li><b>${esc(m.mistake)}</b><span>${esc(m.fix)}</span></li>`).join('');
  $('cues').onclick = (e) => { const li = e.target.closest('li'); if (!li) return; const ph = EX.timeline.phases.find((p) => p.id === li.dataset.ph); if (ph) { S.t = ph.start + 0.01; draw(); } };
  renderAnatomy(); renderKin(); renderJSON('module');
  $('src').innerHTML = META.sources.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a></li>`).join('');
  seg($('jsonSeg'), [['module', 'Exercise module'], ['rig', 'Shared rig'], ['schema', 'JSON Schema']], 'module', (v) => renderJSON(v));
}
function renderAnatomy() {
  $('anat').innerHTML = Object.keys(ROLE_LABEL).map((role) => `<h3>${ROLE_LABEL[role]}</h3><ul class="mus">${(META.muscles[role] || []).map((id) => `<li tabindex="0" data-id="${esc(id)}" style="--c:${rgb(ROLE[role])}"><i></i><span>${esc(muscleName(id))}</span>${META.muscleNotes[id] ? `<small>${esc(META.muscleNotes[id])}</small>` : ''}</li>`).join('')}</ul>`).join('');
  const set = (id) => { S.hover = id; draw(); };
  $('anat').onmouseover = (e) => { const li = e.target.closest('li'); if (li) set(li.dataset.id); };
  $('anat').onmouseleave = () => set(null);
  $('anat').onfocusin = (e) => { const li = e.target.closest('li'); if (li) set(li.dataset.id); };
  $('anat').onfocusout = () => set(null);
}
function liveKin() {
  const sc = lastScene; if (!sc) return {};
  const ch = sc.pose.ch, m = R.measures(sc.W);
  return {
    'Thoracic rotation (T12–T1)': ch.spine_t12.rot + ch.spine_t6.rot, 'Lumbar rotation (L5–S1 to T12)': ch.spine_l5.rot,
    'Total trunk rotation': ch.spine_l5.rot + ch.spine_t12.rot + ch.spine_t6.rot, 'Cervical rotation toward reaching hand': ch.neck_c7.rot + ch.head_c1.rot,
    Hips: ch.hip_r.flex, Knees: m.knee, 'Support elbow': m.elbowL,
  };
}
function renderKin() {
  $('kin').innerHTML = `<thead><tr><th>Measure</th><th>Setup</th><th>Peak</th><th>Live</th><th>Reference range</th></tr></thead><tbody>${META.kinematics.map((k) => `<tr><td>${esc(k.measure)}</td><td>${esc(k.setup)}</td><td>${esc(k.peak)}</td><td class="live" data-m="${esc(k.measure)}">–</td><td>${esc(k.norm || '')}</td></tr>`).join('')}</tbody>`;
  $('kinNote').textContent = 'Live values come from the rig at the current frame. Rotation is positive toward the working side. Norms: thoracic ≈3° per vertebra and lumbar ≈2° per segment (Neumann via NASM); lumbar-locked test mean ≈41° (Johnson 2012); ≥50° counted as unrestricted (Whetstone & Matsel 2024).';
}
const JSON_FILES = { module: () => JSON.stringify(EX, null, 2), rig: () => JSON.stringify(RIG, null, 2), schema: () => JSON.stringify(SCHEMA, null, 2) };
const JSON_NAMES = { module: `${META.id}.json`, rig: `${RIG.rigId}.json`, schema: 'exercise-module.schema.json' };
const JSON_NOTES = {
  module: 'One file per exercise: metadata, phases, named poses (anatomical joint angles), keyframes, IK contacts, muscle activation and guides. This file validates against the schema tab.',
  rig: 'Shared by every exercise: joint hierarchy, segment lengths, body shapes and muscle regions. Bilateral items are authored once and mirrored.',
  schema: 'JSON Schema (draft 2020-12) for exercise modules. Hand it to the batch prompt so each new exercise comes back in this exact shape.',
};
let jsonCur = 'module';
function renderJSON(k) { jsonCur = k; $('jsonPre').textContent = JSON_FILES[k](); $('jsonNote').textContent = JSON_NOTES[k]; }

let dl = null;
try { const u = window.claude && window.claude.use && window.claude.use('downloads'); if (u && u.then) u.then((d) => { dl = d; }).catch(() => {}); } catch (e) {}
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('on'), 2200); }
async function copy(text, what) { try { await navigator.clipboard.writeText(text); toast(`Copied ${what}`); } catch (e) { toast('Copy was blocked by the browser'); } }
async function save(name, data, fallback) {
  if (dl) { try { await dl.save({ filename: name, data }); toast(`Saved ${name}`); return; } catch (e) { if (e && /declin|cancel|abort/i.test(String(e.message || e))) { toast('Download cancelled'); return; } } }
  fallback();
}
$('copyJson').onclick = () => copy(JSON_FILES[jsonCur](), JSON_NAMES[jsonCur]);
$('dlJson').onclick = () => save(JSON_NAMES[jsonCur], JSON_FILES[jsonCur](), () => copy(JSON_FILES[jsonCur](), `${JSON_NAMES[jsonCur]} (download unavailable here)`));
$('exSvg').onclick = () => { const svg = frameSVG(); save(`${META.id}-${S.side}-${S.t.toFixed(2)}s.svg`, svg, () => copy(svg, 'SVG frame markup')); };
$('exPng').onclick = () => { draw(); cv.toBlob((b) => { const name = `${META.id}-${S.side}-${S.t.toFixed(2)}s.png`; save(name, b, () => { $('modalImg').src = URL.createObjectURL(b); $('modal').classList.add('on'); }); }, 'image/png'); };
$('modalClose').onclick = () => $('modal').classList.remove('on');

function refreshSide() {
  $('sideTag').textContent = `${S.side === 'R' ? 'Right' : 'Left'} side`;
  renderAnatomy();
}
const ICON = { play: '<path d="M6 3.5v13l11-6.5z" fill="currentColor"/>', pause: '<rect x="4.5" y="3.5" width="4" height="13" rx="1" fill="currentColor"/><rect x="11.5" y="3.5" width="4" height="13" rx="1" fill="currentColor"/>' };
function setPlaying(p) { S.playing = p; $('playIcon').innerHTML = p ? ICON.pause : ICON.play; $('play').setAttribute('aria-label', p ? 'Pause' : 'Play'); }
$('play').onclick = () => setPlaying(!S.playing);
let wasPlaying = false;
$('scrub').addEventListener('pointerdown', () => { wasPlaying = S.playing; setPlaying(false); });
$('scrub').addEventListener('input', (e) => { S.t = (e.target.value / 1000) * D; draw(); syncUI(true); });
$('scrub').addEventListener('change', () => { if (wasPlaying) setPlaying(true); });

// orbit
let drag = null;
stage.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, yaw: S.yaw, pitch: S.pitch }; stage.setPointerCapture(e.pointerId); });
stage.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) < 2) return;
  S.yaw = drag.yaw + dx * 0.45 * (S.side === 'L' ? -1 : 1); S.pitch = Math.max(-5, Math.min(85, drag.pitch + dy * 0.35));
  $('camSeg').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', 'false'));
  draw();
});
stage.addEventListener('pointerup', () => { drag = null; });
stage.addEventListener('dblclick', () => { const p = EX.camera.presets[S.cam]; S.yaw = p.yaw; S.pitch = p.pitch; $('camSeg').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === S.cam))); draw(); });
window.addEventListener('keydown', (e) => {
  if (e.target.closest('input,textarea,[contenteditable]') && e.target.id !== 'scrub') return;
  if (e.code === 'Space') { e.preventDefault(); setPlaying(!S.playing); }
  else if (e.key === 'ArrowRight' && e.target.id !== 'scrub') { setPlaying(false); S.t = (S.t + 1 / 60) % D; draw(); syncUI(true); }
  else if (e.key === 'ArrowLeft' && e.target.id !== 'scrub') { setPlaying(false); S.t = (S.t - 1 / 60 + D) % D; draw(); syncUI(true); }
});

let curPhase = null, hudT = 0;
function syncUI(force) {
  const p = (S.t / D) * 100;
  const sc = $('scrub'); if (document.activeElement !== sc || force) sc.value = Math.round((S.t / D) * 1000); sc.style.setProperty('--p', `${p}%`);
  $('time').textContent = `${S.t.toFixed(1)} / ${D.toFixed(1)} s`;
  const ph = tl.phaseAt(S.t);
  if (ph !== curPhase) {
    curPhase = ph; $('phLabel').textContent = ph.label;
    $('breathTxt').textContent = ph.breath === 'natural' ? 'Breathe' : ph.breath[0].toUpperCase() + ph.breath.slice(1);
    document.querySelectorAll('#phasebar div').forEach((d) => d.classList.toggle('on', d.dataset.ph === ph.id));
    document.querySelectorAll('#cues li').forEach((li) => li.classList.toggle('on', li.dataset.ph === ph.id));
  }
  const k = (S.t - ph.start) / (ph.end - ph.start);
  const bs = ph.breath === 'inhale' ? 0.75 + 0.5 * k : ph.breath === 'exhale' ? 1.25 - 0.5 * k : 1;
  $('breath').style.setProperty('--bs', bs.toFixed(3));
  const now = performance.now();
  if (force || now - hudT > 90) { hudT = now; updateHUD(); }
}
function updateHUD() {
  const sc = lastScene; if (!sc) return;
  const ch = sc.pose.ch, m = R.measures(sc.W);
  const sideL = S.side === 'R' ? 'L' : 'R';
  const rows = [['Thoracic rotation', ch.spine_t12.rot + ch.spine_t6.rot], ['Lumbar rotation', ch.spine_l5.rot], ['Shoulder-line tilt', m.shoulderLineIncl], ['Neck rotation', ch.neck_c7.rot + ch.head_c1.rot], [`Support elbow (${sideL})`, m.elbowL], ['Hips / knees', null]];
  $('hud').innerHTML = rows.map(([l, v]) => `<span>${esc(l)}</span><em>${v == null ? `${Math.round(ch.hip_r.flex)}° / ${Math.round(m.knee)}°` : fmt(v)}</em>`).join('');
  const live = liveKin();
  document.querySelectorAll('#kin td.live').forEach((td) => { const v = live[td.dataset.m]; td.textContent = v == null ? '–' : fmt(v); });
}

// loop
let last = performance.now(), fpsE = 60, fpsT = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (dt > 0) fpsE = fpsE * 0.92 + (1 / dt) * 0.08;
  if (S.playing) S.t = (S.t + dt * S.speed) % D;
  draw(); syncUI(false);
  if (now - fpsT > 500) { fpsT = now; $('fps').textContent = `${Math.round(fpsE)} fps`; }
  requestAnimationFrame(frame);
}
const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (stage.clientWidth < 600) S.show.angles = false;
buildUI(); refreshSide(); setPlaying(!reduce);
roStage.observe(stage); resize(); syncUI(true);
requestAnimationFrame(frame);
window.__rr = { S, rig, tl, R, frameSVG, scene: () => lastScene, setT: (t) => { S.t = t; draw(); syncUI(true); }, measures: (t) => R.measures(R.evalPose(rig, tl.pose(t), EX.contacts)), pose: (t) => tl.pose(t) };
}
