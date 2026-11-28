// Triceps Dip (GymVisual #081413; page not readable here, movement from the name and standard coaching): supported on
// parallel bars (gear pack dip_station, bars 52 cm apart at 125 cm), neutral grip with the palms down and in on top of
// the bars (hand contacts: constant wrist targets from gear-benches.dipHands, world-locked hand orientation). Arms
// straight, trunk nearly upright (a few degrees forward, the triceps version), knees bent with the feet behind. The
// elbows bend straight back and the body lowers until the upper arms are about parallel to the floor, then presses back
// up. Each key solves the root (x, height, lean) for a shoulder height; the shoulders drift a little forward of the hands
// as the elbows go back. Bilateral.
const L = require('./lib');
const { R, V, r1, clone } = L;
const H = require('./families/hips');
const T = require('./families/b3-triceps');
const GB = require('./families/gear-benches');
const meta = require('./meta/triceps-dip.json');

const ENV = (k, d) => +(process.env[k] ?? d);
const ds = GB.dipStation({ x: 0, params: { barH: ENV('BAR_H', 125), gap: ENV('GAP', 52) } });
const hands = GB.dipHands(ds, { x: 0, tilt: ENV('TILT', 35), pole: ENV('POLE', 0.5) });
const HAND = { r: hands.r.wrist, l: hands.l.wrist };
const contacts = [hands.r.contact, hands.l.contact];
const LEAN0 = ENV('LEAN0', 4), LEAN1 = ENV('LEAN1', 12), DX1 = ENV('DX1', 20), TOP_FLEX = ENV('TOP_FLEX', 6);
const SC = { protract: -6, elevate: -6 };   // shoulders set down and back
const base = (() => {
  const p = L.POSES.standing().pose; delete p.ik;
  Object.assign(p.ch, { spine_l5: { rot: 0, flex: 2, latFlex: 0 }, spine_t12: { rot: 0, flex: 2, latFlex: 0 }, spine_t6: { rot: 0, flex: 0, latFlex: 0 }, neck_c7: { rot: 0, flex: 2 }, head_c1: { rot: 0, flex: 2 },
    sc_r: clone(SC), sc_l: clone(SC), hip_r: { flex: ENV('HIP', 12), abd: 3, rot: 0 }, hip_l: { flex: ENV('HIP', 12), abd: 3, rot: 0 }, knee_r: { flex: ENV('KNEE', 80) }, knee_l: { flex: ENV('KNEE', 80) },
    ankle_r: { dorsi: -20 }, ankle_l: { dorsi: -20 } });
  return p;
})();
const trunkLean = (W) => V.angle(V.sub(W.neck_c7.p, W.pelvis.p), [0, 1, 0]) * Math.sign(W.neck_c7.p[0] - W.pelvis.p[0]);
// root (x, y, pitch) for a shoulder height shY: trunk lean and the shoulders' depth relative to the hands blend with u
function rootFor(shY, u) {
  return L.solvePose(clone(base), ['root.pos.0', 'root.pos.1', 'root.rot.pitch'], [
    (W) => [(W.shoulder_r.p[0] - (HAND.r[0] + DX1 * u)) * 3], (W) => [(trunkLean(W) - (LEAN0 + (LEAN1 - LEAN0) * u)) * 0.5], (W) => [(W.shoulder_r.p[1] - shY) * 3],
  ], { iters: 300 }).pose;
}
const GUESS = (s) => [{ [`shoulder_${s}`]: { plane: 0, elev: 5, axial: 0 }, [`elbow_${s}`]: { flex: 6 }, [`wrist_${s}`]: { pron: 90, flex: -30, dev: 0 } }, { [`shoulder_${s}`]: { plane: -40, elev: 50, axial: 30 }, [`elbow_${s}`]: { flex: 90 }, [`wrist_${s}`]: { pron: 90, flex: -40, dev: 0 } }];
function poseFor(shY, u) {
  let p = rootFor(shY, u);
  p.ik = { arm_r: { target: HAND.r.slice(), weight: 1 }, arm_l: { target: HAND.l.slice(), weight: 1 } };
  for (const s of ['r', 'l']) { p = H.fitArm(p, s, contacts.find((c) => c.id === `arm_${s}`), HAND[s], GUESS(s)); p[`__cost_${s}`] = p.__cost; delete p.__cost; }
  return p;
}
const armDist = (shY) => { const W = L.fk(rootFor(shY, 0)); return V.len(V.sub(W.shoulder_r.p, HAND.r)); };
// top: straight arms (elbow TOP_FLEX)
let lo = HAND.r[1] + 20, hi = HAND.r[1] + 70, shTop = 0;
for (let i = 0; i < 40; i++) { shTop = (lo + hi) / 2; if (armDist(shTop) > L.reach(TOP_FLEX)) hi = shTop; else lo = shTop; }
// bottom: upper arm parallel to the floor (elbow at shoulder height)
const elbowUp = (shY, u) => { const W = L.fk(Object.assign(rootFor(shY, u), { ik: { arm_r: { target: HAND.r, weight: 1 } } }), contacts); return W.elbow_r.p[1] - W.shoulder_r.p[1]; };
lo = shTop - 50; hi = shTop - 5; let shBot = shTop - 25;
for (let i = 0; i < 30; i++) { shBot = (lo + hi) / 2; if (elbowUp(shBot, 1) > ENV('PAR', 0)) lo = shBot; else hi = shBot; }
shTop = r1(shTop); shBot = r1(shBot);
const at = (u) => poseFor(shTop + (shBot - shTop) * u, u);
const ease = T.ease;
const poses = { top: at(0), d1: at(ease(0.25)), d2: at(ease(0.5)), d3: at(ease(0.75)), bottom: at(1), bottomHold: at(0.985), u1: at(ease(0.75)), u2: at(ease(0.5)), u3: at(ease(0.25)) };
const costs = Object.values(poses).map((p) => Math.max(p.__cost_r, p.__cost_l)); Object.values(poses).forEach((p) => { delete p.__cost_r; delete p.__cost_l; });
const keyframes = [{ t: 0, pose: 'top' }, { t: 0.6, pose: 'top' }, { t: 1.1, pose: 'd1' }, { t: 1.6, pose: 'd2' }, { t: 2.1, pose: 'd3' }, { t: 2.6, pose: 'bottom' }, { t: 2.75, pose: 'bottomHold' }, { t: 2.9, pose: 'bottom' },
  { t: 3.225, pose: 'u1' }, { t: 3.55, pose: 'u2' }, { t: 3.875, pose: 'u3' }, { t: 4.2, pose: 'top' }, { t: 5.0, pose: 'top' }];
const ex = H.module_(meta, contacts, poses, keyframes);
ex.props = [ds.prop];

// checks: planted hands, floor (feet hang clear), body vs the station (hands and forearms rest on the bars)
const pr = { body: { d: 1e9 }, feet: 1e9 };
const rep = H.loopReport(ex, { planted: ['arm_r', 'arm_l'], probe: (W, pz, t) => {
  const b = GB.bodyClear(W, ds, { skip: /^(hand_|thumb_|forearm_)/ }); if (b.d < pr.body.d) pr.body = Object.assign(b, { t: +t.toFixed(2) });
  pr.feet = Math.min(pr.feet, L.shapeMinY(W).y);
} });
const Wt = L.fk(poses.top, contacts), Wb = L.fk(poses.bottom, contacts);
const uaTilt = (W) => Math.asin(V.norm(V.sub(W.elbow_r.p, W.shoulder_r.p))[1]) / R.DEG;
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Elbow flexion', 'setup', `${d(T.elbowOf(Wt, 'r'))} (straight, not locked)`); set('Elbow flexion', 'peak', `${d(T.elbowOf(Wb, 'r'))} at the bottom`);
set('Trunk lean', 'setup', `${d(trunkLean(Wt))} forward of vertical`); set('Trunk lean', 'peak', `${d(trunkLean(Wb))} at the bottom (upright: triceps emphasis)`);
set('Upper arm angle to the floor', 'setup', `${d(-uaTilt(Wt))} (arms hanging straight down to the bars)`); set('Upper arm angle to the floor', 'peak', `${d(Math.abs(uaTilt(Wb)))} (parallel)`);
const travel = V.len(V.sub(Wt.pelvis.p, Wb.pelvis.p));
set('Body travel', 'setup', `Shoulders ${Math.round(Wt.shoulder_r.p[1] - HAND.r[1])} cm above the wrists`); set('Body travel', 'peak', `${Math.round(travel)} cm down; feet stay ${r1(pr.feet)} cm or more off the floor`);
set('Tempo', 'setup', 'Top 0.6 s'); set('Tempo', 'peak', '2.0 s down, 0.3 s pause, 1.3 s up, 0.8 s at the top');
ex.checks.measure = { name: 'rootTravel', min: Math.floor(travel - 2), max: Math.ceil(travel + 2) };
console.log(`Triceps Dip: wrote ${L.write(ex)}\n  ${JSON.stringify({ shTop, shBot, travel: r1(travel), elbow: [r1(T.elbowOf(Wt, 'r')), r1(T.elbowOf(Wb, 'r'))], lean: [r1(trunkLean(Wt)), r1(trunkLean(Wb))], uaTilt: r1(uaTilt(Wb)), armFit: +Math.max(...costs).toExponential(1), feet: r1(pr.feet), body: pr.body, slide: rep.slide, hands: HAND })}`);
const fails = [];
if (rep.slide > 0.05) fails.push('planted hands slide');
if (pr.feet < 2) fails.push(`feet near the floor (${r1(pr.feet)} cm)`);
if (pr.body.d < -0.5) fails.push(`body into the station ${JSON.stringify(pr.body)}`);
if (Math.max(...costs) > 2) fails.push('arm fit');
if (fails.length) { console.error(`FAIL triceps-dip: ${fails.join('; ')}`); process.exitCode = 1; }
module.exports = { ex };
