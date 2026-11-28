// Dumbbell Lying on Floor Rear Delt Raise (GymVisual #13810; page not read, movement from the name): lying face down on a
// mat (head toward +X, forehead just off the floor, legs long, tops of the feet down; same prone rest as the superman
// author). Arms straight out to the sides at shoulder height (about 90 degrees of abduction), soft elbows, palms down,
// dumbbells resting on the floor (handles along the body). Squeeze the shoulder blades together and lift both dumbbells
// a few inches off the floor (horizontal abduction, ISB plane of elevation behind the frontal plane), hold, lower to a
// light touch. The trunk and legs stay on the mat (pelvis still). Bilateral.
const L = require('./lib');
const { R, V, Q, rig, r1, clone } = L;
const P = require('./families/prone');
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const K = require('./families/b4-shoulders3');
const G = require('./families/b6-06');
const meta = require('./meta/dumbbell-lying-on-floor-rear-delt-raise.json');
const ID = meta.exercise.id;

const SZ = [meta.props[0].size[0], meta.props[0].size[1]];
const r3 = (v) => Math.round(v * 1000) / 1000;
const z0 = () => ({ rot: 0, flex: 0, latFlex: 0 });
const sym = (p, j, v) => { p.ch[`${j}_r`] = clone(v); p.ch[`${j}_l`] = clone(v); };
const lowest = (W, ids) => Math.min(...ids.map((id) => P.bottomOf(W, id)));
const BODY = ['chest', 'pecs_r', 'ribcage', 'abdomen', 'pelvis'], THIGH = ['thigh_r', 'quad_r', 'shank_r'];
const NOT_ARMS = rig.shapes.map((x) => x.id).filter((id) => !/^(deltoid|upperarm|biceps|forearm|hand|thumb)_/.test(id));
// prone rest (superman author): root pitch / height, hips, ankles and knees so chest, thighs and feet rest on the mat
const p0 = { root: { pos: [0, 12, 0], rot: { pitch: -90 } }, ch: { spine_l5: z0(), spine_t12: z0(), spine_t6: z0(), neck_c7: { rot: 0, flex: 0 }, head_c1: { rot: 0, flex: 0 } } };
sym(p0, 'hip', { flex: 0, abd: 3, rot: 0 }); sym(p0, 'knee', { flex: 2 }); sym(p0, 'ankle', { dorsi: -62 }); sym(p0, 'sc', { protract: 0, elevate: 2 }); sym(p0, 'elbow', { flex: 8 });
sym(p0, 'shoulder', { plane: 0, elev: 88, axial: 0 }); sym(p0, 'wrist', { pron: 0, flex: 0, dev: 0 });
P.head(p0, +(process.env.NECK || -14));
const s = L.solvePose(p0, ['root.pos.1', 'root.rot.pitch', 'ch.hip_r.flex', 'ch.ankle_r.dorsi', 'ch.knee_r.flex'], [
  (W) => [lowest(W, BODY) * 3, lowest(W, THIGH) * 2, lowest(W, ['foot_r']) * 1, Math.min(0, lowest(W, ['foot_r']) + 0.1) * 8, Math.min(0, lowest(W, NOT_ARMS)) * 6],
  (W, q) => [Math.min(0, q.ch.ankle_r.dorsi + 73) * 5, (q.ch.knee_r.flex - 2) * 0.05, Math.min(0, q.ch.knee_r.flex) * 5, Math.max(0, q.ch.hip_r.flex - 3) * 5],
]);
const rest = s.pose; sym(rest, 'hip', rest.ch.hip_r); sym(rest, 'ankle', rest.ch.ankle_r); sym(rest, 'knee', rest.ch.knee_r);
{ const W = L.fk(rest); rest.root.pos[1] = r3(rest.root.pos[1] - Math.min(lowest(W, BODY), lowest(W, THIGH))); }
// Arm keys: plane of elevation from PL0 (dumbbell on the floor) to PL1 (lifted), elevation about 88, thumbs toward the head
const ELEV = 88, DPL = +(process.env.DPL || 3), RET = +(process.env.RET || 6);
const keyAt = (name, plane, f) => ({ name, plane: r1(plane), elev: ELEV, axial: 0, flex: 10, pron: 0, sc: { protract: r1(4 - RET * f), elevate: 2 }, thumb: () => [1, 0, 0] });
const dbLowAt = (plane) => { const { poses } = G.raiseKeys(rest, [keyAt('k', plane, 0)], []); return Math.min(...K.platePoints(L.fk(poses.k), 'r', 'handle', null, SZ).map((p) => p[1])); };
let lo = -10, hi = 40; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (dbLowAt(m) > 0.3) lo = m; else hi = m; }
const PL0 = r1(lo), PL1 = r1(PL0 - DPL);
const FS = [0, 0.33, 0.66, 1];
const { poses, err } = G.raiseKeys(rest, FS.map((f, i) => keyAt(`k${i}`, G.lerp(PL0, PL1, f), f)), []);
poses.hold = clone(poses.k3); poses.hold.ch.sc_r.protract = poses.hold.ch.sc_l.protract = r1(poses.k3.ch.sc_r.protract - 2);
const up = G.easeTimes([0.33, 0.66, 1], 0.7, 1.7), dn = G.easeTimes([0.33, 0.66, 1], 2.7, 4.2);
const keyframes = [{ t: 0, pose: 'k0' }, { t: 0.7, pose: 'k0' }, ...up.map((t, i) => ({ t, pose: `k${i + 1}` })), { t: 2.2, pose: 'hold' }, { t: 2.7, pose: 'k3' }, ...dn.map((t, i) => ({ t, pose: `k${2 - i}` })), { t: 4.8, pose: 'k0' }];
const ex = H.module_(meta, [], poses, keyframes);
const rep = K.scanHeld(ex, ['r', 'l'].map((side) => ({ side, grip: 'handle', size: SZ })), { planted: [] });
const W0 = L.fk(poses.k0), W1 = L.fk(poses.k3);
const lift = Math.min(...K.platePoints(W1, 'r', 'handle', null, SZ).map((p) => p[1]));
const set = H.setKin(ex), d = G.deg;
const armUp = (W) => Math.asin(V.norm(V.sub(W.wrist_r.p, W.shoulder_r.p))[1]) * 180 / Math.PI;
set('Horizontal abduction', 'setup', `Dumbbells resting on the floor, arm ${d(armUp(W0))} from horizontal`); set('Horizontal abduction', 'peak', `Arm ${d(armUp(W1))} above horizontal (shoulder blades squeezed ${RET}°), dumbbells ${r1(lift)} cm off the floor`);
set('Arm position', 'setup', `Out to the sides, ${d(K.humElev(W0))} from the trunk, palms down`); set('Arm position', 'peak', 'Unchanged abduction, palms down');
set('Elbow flexion', 'setup', d(K.elbowAng(W0))); set('Elbow flexion', 'peak', d(K.elbowAng(W1)));
set('Trunk', 'setup', `Chest, hips and thighs on the mat, forehead ${r1(Math.min(P.bottomOf(W0, 'head'), P.bottomOf(W0, 'hair')))} cm off it`); set('Trunk', 'peak', 'Unchanged');
set('Tempo', 'setup', 'Touch 0.7 s'); set('Tempo', 'peak', '1.0 s up, 1.0 s hold, 1.5 s down');
console.log(`${meta.exercise.name}: wrote ${L.write(ex)}\n  PL0 ${PL0} lift ${r1(lift)} ${JSON.stringify({ err, ...rep })}`);
F.gate(ID, rep, { minClear: -0.3 });
G.fail(ID, [rep.dbFloor < -0.3 && 'dumbbell below floor', ...G.limits(poses)]);
if (process.env.DBG) for (const k of Object.keys(poses)) { const W = L.fk(poses[k]); console.log(k, JSON.stringify(poses[k].ch.shoulder_r), 'sh', W.shoulder_r.p.map(r1), 'el', W.elbow_r.p.map(r1), 'wr', W.wrist_r.p.map(r1)); }
