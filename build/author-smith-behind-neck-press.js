// Smith Behind Neck Press (GymVisual; movement reference only, the page could not be read): seated behind-the-neck press in
// a Smith machine. Seated tall on a flat bench (the seated barbell front raise base: feet planted), chin slightly tucked.
// The vertical rails run 3 cm behind the back of the head, so the bar travels straight down behind the head to about the
// base of the skull (the lowest height where the bar clears the head, neck and traps by 1 cm) and back up to nearly
// straight arms. Wide overhand grip (78 cm between the bar grips), elbows out to the sides under the bar at the bottom (soft
// elbow target fading toward the top). Keys from bottom to top, then densified so the hands stay on the rail line
// (gear-g3lower.js railFix). Pegs under the top, safety stops just under the bottom. Bilateral.
const L = require('./lib');
const { V, Q, R, r1, clone } = L;
const G = require('./families/gear-g3lower');
const SG = require('./families/gear-smith');
const C = require('./families/b3-chest');
const B = require('./families/b3-back');
const BB = require('./families/barbell');
const H = require('./families/hips');
const F = require('./families/b5-bbpress');
const EQ = require('./families/equip');
const meta = require('./meta/smith-behind-neck-press.json');

const GW = 78, GAP = 3;
const src = G.fromBase('barbell-seated-front-raise'), contacts = src.contacts;
const base = clone(src.poses[src.keyframes[0].pose]);
base.ch.neck_c7 = { rot: 0, flex: 8 }; base.ch.head_c1 = { rot: 0, flex: 6 }; base.ch.sc_r = { protract: -4, elevate: 4 }; base.ch.sc_l = clone(base.ch.sc_r);
const W0 = L.fk(base, contacts), S = W0.shoulder_r.p;
let xBack = 1e9; for (const id of ['head', 'hair']) { const g = R.shapeWorld(W0, L.rig.shapes.find((s) => s.id === id)); xBack = Math.min(xBack, g.kind === 'capsule' ? Math.min(g.a[0] - g.r[0], g.b[0] - g.r[1]) : g.c[0] - Math.hypot(g.axes[0][0], g.axes[1][0], g.axes[2][0])); }
const RAIL_X = r1(xBack - GAP - EQ.BAR.shaftR), sm0 = SG.smith({ x: RAIL_X });
const clearAt = (W, y) => EQ.segmentClear(W, [RAIL_X, y, -GW / 2 + 6], [RAIL_X, y, GW / 2 - 6], EQ.BAR.shaftR, { skip: /^(hand|thumb|forearm|upperarm|biceps|deltoid)_/ }).d;
let ya = S[1] - 10, yb = S[1] + 30; for (let i = 0; i < 40; i++) { const m = (ya + yb) / 2; if (clearAt(W0, m) < 1) ya = m; else yb = m; }
const yBot = r1(yb);
const SEEDS = [[0, 90, 90, 100, 90], [10, 90, 60, 90, 0], [-10, 100, 100, 110, 90], [0, 80, 90, 120, 180]];
let gripWorst = 0;
const arm = (y, f, seed) => {
  const E = V.add(S, V.scale(V.norm([-0.25, -0.15 + 0.6 * f, 1]), L.UA));
  const q = SG.armsOnSmith(base, sm0, y, GW, { palm: [1, 0.1, 0], thumb: [0, 0, -1], dirW: 0.5, wristW: 0.02, guesses: seed ? [seed] : SEEDS, elbow: f < 1 ? E : null, elbowW: 0.6 * (1 - f) });
  gripWorst = Math.max(gripWorst, BB.gripErr(L.fk(q, contacts), SG.grips(sm0, y, GW))); delete q.__cost; return q;
};
let ta = yBot + 20, tb = yBot + 70; for (let i = 0; i < 24; i++) { const y = (ta + tb) / 2, q = SG.armsOnSmith(base, sm0, y, GW, { palm: [1, 0.1, 0], thumb: [0, 0, -1], dirW: 0.5, wristW: 0.02, guesses: SEEDS }); if (BB.gripErr(L.fk(q, contacts), SG.grips(sm0, y, GW)) < 0.1 && q.ch.elbow_r.flex > 10) ta = y; else tb = y; }
const yTop = r1(ta);
const path = F.refine((f, prev) => F.strip(arm(yBot + (yTop - yBot) * f, f, prev && F.seedOf(prev))), 12, GW, contacts);
const settle = null;
const T = C.phaseT(meta), { poses, keyframes } = F.repKeysF(path, T, settle);
const ex = H.module_(meta, contacts, poses, keyframes);
const Wt = L.fk(poses.top, contacts), Wb = L.fk(poses.bottom, contacts);
G.railFix(ex, { x0: RAIL_X, slope: 0, z: 0, width: GW }, 'arms', 0.05);
const HOOK_Y = Math.round(yTop - 5), SAFETY_Y = Math.floor(yBot - 2);
const sm = SG.smith({ x: RAIL_X, hookY: HOOK_Y, safetyY: SAFETY_Y, restY: HOOK_Y });
ex.props = [...src.props.filter((p) => p.kind === 'bench'), ...sm.props];
const sw = SG.sweep(ex, sm, { planted: ['leg_r', 'leg_l'] });
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
const elevOf = (W) => V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), [0, -1, 0]);
set('Grip width', 'setup', `${GW} cm between the bar grips (shoulder joints ${r1(2 * S[2])} cm apart)`); set('Grip width', 'peak', `Constant (${sw.width[0]}-${sw.width[1]} cm over the loop)`);
set('Shoulder elevation', 'setup', `${d(elevOf(Wt))} at the top`); set('Shoulder elevation', 'peak', `${d(elevOf(Wb))} at the bottom (upper arm from hanging)`);
set('Elbow flexion', 'setup', `${d(BB.elbowOf(Wt, 'r'))} at the top`); set('Elbow flexion', 'peak', `${d(BB.elbowOf(Wb, 'r'))} at the bottom`);
set('Bar path', 'setup', `Vertical rails ${GAP + EQ.BAR.shaftR} cm behind the back of the head; top ${r1(yTop)} cm high`); set('Bar path', 'peak', `Bottom ${r1(yBot)} cm high (${r1(yBot - S[1])} cm above the shoulder joints, the bar 1 cm off the head, neck and traps); ${r1(yTop - yBot)} cm of travel`);
set('Tempo', 'setup', `Top ${T.h} s`); set('Tempo', 'peak', `${r1(T.b - T.h)} s down, ${r1(T.p - T.b)} s at the bottom, ${r1(T.r - T.p)} s up`);
const tf = V.angle(V.sub(W0.neck_c7.p, W0.pelvis.p), [0, 1, 0]); ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(tf - 3), max: Math.ceil(tf + 3) };
console.log(`Smith Behind Neck Press: wrote ${L.write(ex)}\n  rail x ${RAIL_X} bar ${yBot} -> ${yTop} gripErr ${gripWorst.toFixed(2)} keys ${Object.keys(ex.poses).length} bottom elbow ${BB.elbowOf(Wb, 'r').toFixed(0)} elev ${elevOf(Wb).toFixed(0)}\n  sweep ${JSON.stringify(sw)}`);
SG.fail(sw);
if (gripWorst > 0.5) { console.error('FAIL: hands off the bar'); process.exitCode = 1; }
