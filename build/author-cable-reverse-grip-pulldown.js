// Cable Reverse Grip Pulldown (GymVisual "Cable Reverse Grip Pulldown"; movement reference only): seated on the end of a
// flat bench under a high pulley, feet flat (planted leg contacts). A lat bar (cable attachment 'bar', 120 cm) hangs from
// the pulley; underhand (supinated) grip about shoulder width, 44 cm between the grip points. From the arms long overhead
// (shoulder blades lifted, palms facing back toward the lifter) the shoulder blades draw down and the elbows drive down and
// a little forward, close to the sides, bringing the bar in front of the face to the upper chest while the trunk leans
// back from about 4 to 14 degrees; then the bar rises under control to a full stretch. The machine's thigh pads are not
// modelled (plain bench seat). Bilateral (right arm solved on the bar, left mirrored, so the grip width is constant).
// Tempo: 1.2 s down, 0.4 s at the chest, 2 s up, 0.5 s stretch.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const S2 = require('./families/b4-shoulders2');
const EQ = require('./families/equip');
const C = require('./families/eq-cable');
const X = require('./families/b5-extra');
const meta = require('./meta/cable-reverse-grip-pulldown.json');

const ID = 'cable-reverse-grip-pulldown';
const LEAN0 = 4, LEAN1 = 14, HALF = 22, BAR = 120, TOPFLEX = 8, N = 14;
const base = S2.benchEnd({ footAhead: -2 });
const trunkAt = (k) => {
  const p = X.leanBack(base, LEAN0 + (LEAN1 - LEAN0) * k, { spine: { spine_t6: { flex: r1(2 - 6 * k) } } });
  p.ch.sc_r = { protract: r1(4 - 12 * k), elevate: r1(16 - 22 * k) }; p.ch.sc_l = clone(p.ch.sc_r);
  const lean = p.root.rot.pitch;
  p.ch.neck_c7 = { rot: 0, flex: r1(0.5 * lean) }; p.ch.head_c1 = { rot: 0, flex: r1(-2 + 0.3 * lean) }; // eyes level, chin a little up toward the bar
  return p;
};
const W0 = L.fk(trunkAt(0), base.contacts), W1 = L.fk(trunkAt(1), base.contacts), S0 = W0.shoulder_r.p, S1 = W1.shoulder_r.p;
// top: arms long overhead, grips 4 cm in front of the shoulders; bottom: bar at the upper chest (5 cm in front of the chest)
const R0 = L.reach(TOPFLEX) + 7;
const G0 = [r1(S0[0] + 4), r1(S0[1] + Math.sqrt(R0 * R0 - 16 - (HALF - S0[2]) ** 2)), HALF];
const chestX = (W) => { let x = -1e9; for (let y = -14; y <= 0; y += 2) { /* front of the chest at a few heights below the shoulder */ const pts = [[W.shoulder_r.p[0] + 30, W.shoulder_r.p[1] + y, 0]]; for (const p of pts) { let a = W.spine_t6.p[0], b = p[0]; for (let i = 0; i < 30; i++) { const m = (a + b) / 2; if (EQ.segmentClear(W, [m, p[1], -6], [m, p[1], 6], 0.1, { skip: /^(hand|thumb|forearm|upperarm|biceps|deltoid)_/ }).d > 0) b = m; else a = m; } x = Math.max(x, b); } } return x; };
const G1 = [r1(chestX(W1) + 4), r1(S1[1] - 5), HALF];
const lerp = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
const gripAt = (k) => { const g = lerp(G0, G1, k); g[0] += 7 * Math.sin(Math.PI * k); g[2] = HALF; return g; }; // the bar bows forward past the face
// elbow direction from the shoulder: up at the top, down beside the trunk at the bottom (underhand: elbows tucked in)
const D0 = [0.12, 1, 0.12], D1 = [-0.05, -1, 0.2];
const elbowAt = (k, W) => { const d = V.norm(lerp(D0, D1, k)); return V.add(W.shoulder_r.p, V.scale(d, L.UA)); };
// palm toward the lifter (-X), square to the forearm (elbow hint to grip)
const palmAt = (k, W) => { const u = V.norm(V.sub(gripAt(k), elbowAt(k, W))); return V.norm(V.sub([-1, 0, 0], V.scale(u, -u[0]))); };

const poses = {}, err = {}, names = [];
// each key: forearms held supinated (underhand), solved from the previous key's channels with a pull toward them, so the
// shoulder angles change smoothly from key to key (the first key from a seed grid)
let prev = null;
const SUP = -8;
const KS = [0, 0.5 / N]; for (let i = 1; i < N; i++) KS.push(i / N); KS.push((N - 0.5) / N, 1);
for (let i = 0; i < KS.length; i++) {
  const k = KS[i], p0 = trunkAt(k), W = L.fk(p0, base.contacts);
  const guesses = prev ? [[prev.plane, prev.elev, prev.axial, prev.flex, SUP]] : [];
  if (!prev) for (const plane of [30, 60, 90, 120]) for (let axial = -180; axial < 180; axial += 45) guesses.push([plane, 160, axial, 10, SUP]);
  else for (const da of [-30, 30]) guesses.push([prev.plane, prev.elev, prev.axial + da, prev.flex, SUP]);
  const regs = [['ch.wrist_r.pron', SUP, 1], ['ch.wrist_r.flex', 0, 0.25], ['ch.wrist_r.dev', 0, 0.25]];
  if (prev) regs.push(['ch.shoulder_r.axial', prev.axial, 0.03], ['ch.shoulder_r.plane', prev.plane, 0.03]);
  const p = X.armOnto(p0, gripAt(k), { grip: 'handle', axW: 20, palm: palmAt(k, W), palmW: 1, elbow: elbowAt(k, W), elbowW: 0.4, gripW: 8, guesses, regs, lim: { wristFlex: [-70, 70] } });
  const Wp = L.fk(p, base.contacts);
  err[`k${i}`] = { cost: +p.__cost.toFixed(2), grip: +V.len(V.sub(EQ.gripPoint(Wp, 'r').p, gripAt(k))).toFixed(2), elbow: +V.len(V.sub(Wp.elbow_r.p, elbowAt(k, W))).toFixed(1) };
  delete p.__cost;
  prev = { ...p.ch.shoulder_r, flex: p.ch.elbow_r.flex };
  const name = i === 0 ? 'top' : i === KS.length - 1 ? 'bottom' : `k${i}`; names.push(name); poses[name] = p;
}
poses.bottomHold = clone(poses.bottom); poses.stretch = clone(poses.top);
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p])), D = meta.timeline.duration;
const keyframes = [{ t: 0, pose: 'top' }];
keyframes.push({ t: ph.pull.start, pose: 'top' });
const tk = (a, b, k) => +(a + (b - a) * (Math.acos(1 - 2 * k) / Math.PI)).toFixed(3); // keys spaced so the bar speeds up and slows down smoothly
for (let i = 1; i < KS.length - 1; i++) keyframes.push({ t: tk(ph.pull.start, ph.pull.end, KS[i]), pose: names[i] });
keyframes.push({ t: ph.squeeze.start, pose: 'bottom' }, { t: ph.squeeze.end, pose: 'bottomHold' });
for (let i = KS.length - 2; i >= 1; i--) keyframes.push({ t: tk(ph.return.start, ph.return.end, 1 - KS[i]), pose: names[i] });
keyframes.push({ t: ph.return.end, pose: 'stretch' }, { t: D, pose: 'top' });

const ex = H.module_(meta, base.contacts, poses, keyframes);
const ANCHOR = [r1(G0[0] + 2), 238, 0];
ex.props = [base.bench.prop, EQ.cableTower(ANCHOR, { offset: [75, 0], height: 248 }), { id: 'latbar', kind: 'cable', attachment: 'bar', size: [BAR, 3, 3], anchor: ANCHOR, attach: { joint: 'wrist_r', with: 'wrist_l' } }];

// loop checks: feet, floor, channel jumps, grip width, the cable clear of the head, the bar clear of the head and body,
// buttocks on the seat
const rep = C.scan(ex, { line: (W) => [ANCHOR, EQ.attachPoint(W, { two: true })] });
let barClr = { d: 1e9 }, seat = [1e9, -1e9];
H.loopReport(ex, { probe: (W, pz, t) => {
  const b = EQ.barAt(W), c = EQ.segmentClear(W, V.add(b.c, V.scale(b.ax, BAR / 2)), V.sub(b.c, V.scale(b.ax, BAR / 2)), 1.5, { skip: /^(hand|thumb|forearm)_/ });
  if (c.d < barClr.d) barClr = { d: +c.d.toFixed(2), id: c.id, t: +t.toFixed(2) };
  const sb = H.bottomOf(W, 'buttock_r') - base.bench.top; seat = [Math.min(seat[0], sb), Math.max(seat[1], sb)];
} });
C.gate(ID, rep, { minLine: 1 });
C.limits(poses);
const fail = (m) => { console.error(`FAIL ${ID}: ${m}`); process.exitCode = 1; };
if (barClr.d < 0.5) fail(`bar into the body ${JSON.stringify(barClr)}`);
if (seat[0] < -1 || seat[1] > 1) fail(`buttocks off the seat ${seat.map((v) => v.toFixed(2))}`);
const maxErr = Math.max(...Object.values(err).map((e) => e.grip));
if (maxErr > 1) fail(`grip misses its target by ${maxErr} cm`);

const Wt = L.fk(poses.top, base.contacts), Wb = L.fk(poses.bottom, base.contacts), set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
const trunkBack = (W) => -Math.atan2(W.neck_c7.p[0] - W.pelvis.p[0], W.neck_c7.p[1] - W.pelvis.p[1]) / L.R.DEG;
const armTrunk = (W) => V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), V.sub(W.pelvis.p, W.neck_c7.p));
ex.checks.measure = { name: 'trunkFlexion', min: Math.max(0, Math.floor(trunkBack(Wb) - 4)), max: Math.ceil(trunkBack(Wb) + 4) };
set('Grip', 'setup', `Underhand, ${Math.round(EQ.barAt(Wt).width)} cm between the hands on a ${BAR} cm lat bar (shoulders ${Math.round(Wt.shoulder_r.p[2] - Wt.shoulder_l.p[2])} cm apart)`); set('Grip', 'peak', `Unchanged (${rep.gripWidth.join('-')} cm)`);
set('Elbow flexion', 'setup', `${d(C.elbowAng(Wt))} (arms long)`); set('Elbow flexion', 'peak', `${d(C.elbowAng(Wb))} (bar at the upper chest)`);
set('Shoulder', 'setup', `${d(armTrunk(Wt))} between the upper arm and the trunk (overhead)`); set('Shoulder', 'peak', `${d(armTrunk(Wb))}, elbows ${r1(Wb.elbow_r.p[0] - Wb.shoulder_r.p[0])} cm in front of the shoulder joints`);
set('Trunk lean', 'setup', `${d(trunkBack(Wt))} back`); set('Trunk lean', 'peak', `${d(trunkBack(Wb))} back`);
set('Tempo', 'setup', 'Stretch 0.5 s at the top'); set('Tempo', 'peak', '1.2 s down, 0.4 s at the chest, 2 s up');
console.log(`Cable Reverse Grip Pulldown: wrote ${L.write(ex)}\n  keys ${JSON.stringify(err)}\n  G0 ${G0} G1 ${G1} anchor ${ANCHOR}\n  ${JSON.stringify(rep)}\n  bar ${JSON.stringify(barClr)} seat ${seat.map((v) => v.toFixed(2))} measure ${JSON.stringify(ex.checks.measure)}`);
