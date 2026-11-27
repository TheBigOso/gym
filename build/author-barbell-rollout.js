// Barbell Rollout (GymVisual "Barbell Rollout", movement reference only): kneeling on a thin mat, knees under the hips about
// 20 cm apart, toes tucked; a loaded barbell on the floor in front, resting on its plates (45 cm), overhand grip about
// shoulder width (50 cm handle centres), arms straight. Brace, then roll the bar forward on its plates: the thighs tilt
// forward about the planted knees, the hips extend and the trunk lowers toward level while the straight arms reach overhead
// in front, then pull the bar back to the start. The plates stay on the floor through the whole loop (bar centre held at
// the plate radius), the knees and feet stay planted (the hips move on the thigh-length sphere about the knees; leg IK
// targets constant). Arms solved onto the bar each key (barbell.js armsOnBar), elbows kept straight. Bilateral.
const L = require('./lib');
const { V, Q, r1, clone } = L;
const B = require('./families/b3-back');
const BB = require('./families/barbell');
const EQ = require('./families/equip');
const H = require('./families/hips');
const K = require('./families/b4-shoulders3');
const X = require('./families/b5-bbhinge');
const meta = require('./meta/barbell-rollout.json');

const MAT = 1.5, KNEE_Y = +(process.env.KY ?? (5.4 + MAT)), WIDTH = 10, GW = 50, PLATE_D = 45;
const CY = PLATE_D / 2 + 0.2;                     // bar centre height: plates touching the floor
// both knees down, toes tucked: ankle targets and contacts from the half-kneel helper (one call per down leg)
const kr = K.halfKneel({ down: 'r', kneeY: KNEE_Y, toePitch: +(process.env.TP ?? 78), width: WIDTH, thigh: 0 });
const kl = K.halfKneel({ down: 'l', kneeY: KNEE_Y, toePitch: +(process.env.TP ?? 78), width: WIDTH, thigh: 0 });
const contacts = [kr.contacts.find((c) => c.id === 'leg_r'), kl.contacts.find((c) => c.id === 'leg_l')].map((c) => Object.assign(clone(c), { pole: [1, 0, 0] }));
const tgt = { r: kr.info.tD, l: kl.info.tD };
// knee points as the helper placed them (under the hip at kneeY, in line with the ankle target)
const Kp = { r: [L.fk(kr.pose).hip_r.p[0], KNEE_Y, tgt.r[2]], l: [L.fk(kl.pose).hip_l.p[0], KNEE_Y, tgt.l[2]] };
const TH = V.len(L.rig.byId.knee_r.offset);
const base = clone(kr.pose);
// body for thigh angle th (deg forward of vertical) and trunk lean (deg from vertical): root placed so the hip joints sit
// on the thigh-length sphere about the planted knees
const SP = { l5: 3, t12: 1, t6: 1 };
function body(th, lean, g) {
  const p = clone(base);
  const pitch = -(lean - (SP.l5 + SP.t12 + SP.t6));
  p.root.pos = [0, 0, 0]; p.root.rot = { pitch: r1(pitch) };
  p.ch.spine_l5 = { rot: 0, flex: SP.l5, latFlex: 0 }; p.ch.spine_t12 = { rot: 0, flex: SP.t12, latFlex: 0 }; p.ch.spine_t6 = { rot: 0, flex: SP.t6, latFlex: 0 };
  p.ch.neck_c7 = { rot: 0, flex: r1(-4 - 6 * g) }; p.ch.head_c1 = { rot: 0, flex: r1(-4 - 8 * g) };
  p.ch.sc_r = { protract: r1(10 - 2 * g), elevate: r1(2 + 18 * g) }; p.ch.sc_l = clone(p.ch.sc_r);
  const off = L.fk(p).hip_r.p, want = V.add(Kp.r, [TH * Math.sin(th * Math.PI / 180), TH * Math.cos(th * Math.PI / 180), 0]);
  p.root.pos = V.sub(want, off).map((v) => +v.toFixed(3)); p.root.pos[2] = 0;
  p.ik = { leg_r: { target: tgt.r.slice(), weight: 1 }, leg_l: { target: tgt.l.slice(), weight: 1 } };
  let q = p;
  for (const s of ['r', 'l']) q = H.fitLeg(q, s, contacts.find((c) => c.id === `leg_${s}`), q.ik[`leg_${s}`].target);
  for (const j of ['hip_r', 'hip_l', 'knee_r', 'knee_l', 'ankle_r', 'ankle_l']) for (const c in q.ch[j]) q.ch[j][c] = r1(L.wrap(q.ch[j][c]));
  return q;
}
// bar centre at the straight-arm reach from the shoulder (elbow 6 deg) on the plate-radius line
const Rg = (p) => BB.reachG(p, 6) - 0.3;
function barFor(p) {
  const W = L.fk(p, contacts), S = W.shoulder_r.p, dy = S[1] - CY, dz = GW / 2 - S[2], r = Rg(p);
  return [S[0] + Math.sqrt(Math.max(0, r * r - dy * dy - dz * dz)), CY, 0];
}
// start: thighs vertical, trunk lean that puts the bar just ahead of the shoulders (arms about vertical)
const TH_END = +(process.env.TE ?? 52), LEAN_END = +(process.env.LE ?? 80);
let la = 20, lb = 75;
for (let i = 0; i < 30; i++) { const m = (la + lb) / 2, p = body(0, m, 0), c = barFor(p), S = L.fk(p, contacts).shoulder_r.p; if (c[0] - S[0] > 4) lb = m; else la = m; }
const LEAN0 = r1((la + lb) / 2);
const state = {};
const PALM = [0, -1, 0], THUMB = [0, 0, -1];
function at(f) {
  const g = f * f * (3 - 2 * f) * 0.3 + f * 0.7;
  const p = body(TH_END * g, LEAN0 + (LEAN_END - LEAN0) * g, g), c = barFor(p);
  const q = X.barArms(p, c, GW, { palm: PALM, thumb: THUMB, dirW: 0.6, wristW: 0.2, guesses: [[20, 40, 0, 5, 90], [0, 30, 0, 5, 0], [40, 60, -20, 5, 150]], extra: [(W, qq) => [(qq.ch.elbow_r.flex - 5) * 0.3]] }, state);
  if (f === 0) state.keep = true;
  return B.wrapPose(q);
}
const FS = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1], N = FS.length - 1;
const poses = {};
FS.forEach((f, i) => { poses[`o${i}`] = at(f); });
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, [p.start, p.end]])), D = meta.timeline.duration;
const keyframes = [{ t: 0, pose: 'o0' }, ...X.eased('o', FS, ph.out[0], ph.out[1]), ...X.eased('o', FS, ph.back[0], ph.back[1], true), { t: D, pose: 'o0' }];
const ex = H.module_(meta, contacts, poses, keyframes);
const W0 = L.fk(poses.o0, contacts), We = L.fk(poses[`o${N}`], contacts);
const matX0 = r1(Math.min(tgt.r[0], tgt.l[0]) - 16), matX1 = r1(Kp.r[0] + 14);
ex.props = [{ id: 'mat', kind: 'mat', center: [r1((matX0 + matX1) / 2), 0, 0], size: [r1(matX1 - matX0), MAT, 56] }, BB.barbellProp({ plateD: PLATE_D })];
const sw = BB.sweep(ex, { fixed: ['knee_r', 'knee_l', 'ankle_r', 'ankle_l'], probe: (W, pz, t, o) => { const my = EQ.barMinY(W, { grip: BB.GRIP, plateD: PLATE_D }); o.plateTop = Math.max(o.plateTop ?? -1e9, my); const kl0 = Math.min(K.kneeLow(W, 'r'), K.kneeLow(W, 'l')); o.kneeLow = [Math.min(o.kneeLow ? o.kneeLow[0] : 1e9, kl0), Math.max(o.kneeLow ? o.kneeLow[1] : -1e9, kl0)]; } });
const bE = EQ.barAt(We, BB.GRIP), b0 = EQ.barAt(W0, BB.GRIP);
const humElev = (W) => V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), V.sub(W.pelvis.p, W.neck_c7.p));
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Trunk inclination', 'setup', `${d(B.trunkLean(W0))} from vertical, thighs vertical over the knees`); set('Trunk inclination', 'peak', `${d(B.trunkLean(We))} from vertical at the far point (${d(90 - B.trunkLean(We))} above level), thighs ${TH_END}° forward`);
set('Hip flexion', 'setup', `${d(poses.o0.ch.hip_r.flex)} (joint channel)`); set('Hip flexion', 'peak', `${d(poses[`o${N}`].ch.hip_r.flex)} at the far point`);
set('Shoulder flexion', 'setup', `Upper arm ${d(humElev(W0))} from the trunk line, arms about vertical`); set('Shoulder flexion', 'peak', `${d(humElev(We))} from the trunk line, elbows ${d(B.elbowOf(We, 'r'))}`);
set('Bar path', 'setup', `Overhand ${GW} cm grip (handle centres); bar ${r1(b0.c[0] - Kp.r[0])} cm in front of the knees`); set('Bar path', 'peak', `Rolls ${r1(bE.c[0] - b0.c[0])} cm forward, plates on the floor the whole loop (lowest plate point ${r1(sw.barFloor)} to ${r1(sw.plateTop)} cm)`);
set('Tempo', 'setup', `Set ${ph.setup[1]} s`); set('Tempo', 'peak', `${r1(ph.out[1] - ph.out[0])} s out, ${r1(ph.hold[1] - ph.hold[0])} s hold, ${r1(ph.back[1] - ph.back[0])} s back, ${r1(D - ph.back[1])} s reset`);
sw.plateTop = r1(sw.plateTop); sw.kneeLow = sw.kneeLow.map(r1);
console.log(`Barbell Rollout: wrote ${L.write(ex)}\n  lean ${LEAN0} -> ${LEAN_END}, thigh 0 -> ${TH_END}, hip ${poses.o0.ch.hip_r.flex} -> ${poses[`o${N}`].ch.hip_r.flex}, shoulder elev ${poses[`o${N}`].ch.shoulder_r.elev}, bar x ${r1(b0.c[0])} -> ${r1(bE.c[0])}, knee info ${JSON.stringify(kr.info)}\n  sweep ${JSON.stringify(sw)} gripErr ${state.err.toFixed(2)}`);
if (sw.widthRange > 1.0 || state.err > 0.5) { console.error('FAIL: hands do not stay on the bar at a constant grip width'); process.exitCode = 1; }
if (sw.barFloor < -0.05 || sw.plateTop > 0.6 || sw.barBody < 0) { console.error('FAIL: plates leave the floor or the bar passes through the body'); process.exitCode = 1; }
if (sw.slide > 0.05 || sw.drift > 0.05) { console.error('FAIL: knees or feet move'); process.exitCode = 1; }
if (process.env.DBG) for (const k in poses) { const W = L.fk(poses[k], contacts); console.log(k, W.knee_r.p.map(r1), W.hip_r.p.map((v) => +v.toFixed(2)), Kp.r.map((v) => +v.toFixed(2)), (V.len(V.sub(W.hip_r.p, Kp.r))).toFixed(3), V.len(V.sub(W.hip_r.p, W.knee_r.p)).toFixed(3), V.len(V.sub(W.ankle_r.p, W.knee_r.p)).toFixed(3)); }
