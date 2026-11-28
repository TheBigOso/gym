// Dumbbell Lying External Shoulder Rotation (GymVisual #25915; page not read, movement from the name): supine 90/90
// external rotation. Authored on the right: lying on the back on a mat, knees bent, feet flat (planted). The right upper
// arm rests on the floor out to the side, a little below shoulder height (about 75 degrees from the trunk), elbow bent 90
// degrees. The forearm starts pointing toward the feet with the dumbbell just off the floor (palm down) and turns up about
// the upper arm until it points at the ceiling: humeral external rotation only (shoulder plane / elevation and the elbow
// constant, so the elbow does not move), working against gravity on the way up; slow lowering. Left arm rests by the side.
const L = require('./lib');
const { R, V, Q, r1, clone } = L;
const H = require('./families/hips');
const CA = require('./families/core-a');
const M = require('./families/b4-core2');
const K = require('./families/b4-shoulders3');
const G = require('./families/b6-06');
const meta = require('./meta/dumbbell-lying-external-shoulder-rotation.json');
const ID = meta.exercise.id;

const SZ = [meta.props[0].size[0], meta.props[0].size[1]];
const ABD = +(process.env.ABD || 75), CLR = +(process.env.CLR || 2), PHI1 = +(process.env.PHI1 || 90);
const lie0 = M.lie({ kneeFlex: 90, headRest: 'floor' });
const Fp = CA.plantFeet(lie0, 90);
const base = clone(Fp.pose), contacts = Fp.contacts;
base.ch.sc_r = { protract: 0, elevate: 0 }; base.ch.sc_l = { protract: 0, elevate: 0 };
base.ch.shoulder_l = { plane: 10, elev: 12, axial: 0 }; base.ch.elbow_l = { flex: 10 }; base.ch.wrist_l = { pron: 90, flex: 0, dev: 0 };
const W0 = L.fk(base, contacts), S = W0.shoulder_r.p;
const D2R = Math.PI / 180;
// upper arm out to the side on the floor: ABD degrees from the trunk line toward the head... measured from the feet direction
const uaAt = (dy) => V.norm([Math.cos(ABD * D2R), dy, Math.sin(ABD * D2R)]);
const armLow = (dy) => { const p = clone(base); const ua = G.upperArm(p, 'r', uaAt(dy), [1, 0, 0], [[0, 75, 90], [0, 75, 0], [20, 80, -90]]); p.ch.shoulder_r = ua.ch; p.ch.elbow_r = { flex: 90 }; const W = L.fk(p, contacts); return Math.min(CA.bottomOf(W, 'upperarm_r'), CA.bottomOf(W, 'biceps_r')); };
let lo = -0.4, hi = 0.4; for (let i = 0; i < 20; i++) { const m = (lo + hi) / 2; if (armLow(m) < 0.3) lo = m; else hi = m; }
const uaDir = uaAt(hi), E = V.add(S, V.scale(uaDir, L.UA - 0.05));
const f0 = V.norm(V.sub([1, 0, 0], V.scale(uaDir, uaDir[0])));          // toward the feet, perpendicular to the upper arm
let s0 = V.norm(V.cross(uaDir, f0)); if (s0[1] < 0) s0 = V.scale(s0, -1); // toward the ceiling
const d = (ph) => V.add(V.scale(f0, Math.cos(ph * D2R)), V.scale(s0, Math.sin(ph * D2R)));
const palm = (ph) => V.add(V.scale(s0, -Math.cos(ph * D2R)), V.scale(f0, Math.sin(ph * D2R)));
const make = (phis) => G.rotKeys(base, E, d, palm, 45, phis, { guess: { plane: 0, elev: 75, axial: 0, flex: 90, pron: 90 } });
// start: lowest plate CLR cm above the floor
const lowAt = (ph) => { const r = make([ph]); return Math.min(...K.platePoints(L.fk(r.poses.r0, contacts), 'r', 'handle', null, SZ).map((p) => p[1])); };
let a = 0, b = 60; for (let i = 0; i < 20; i++) { const m = (a + b) / 2; if (lowAt(m) < CLR) a = m; else b = m; }
const PHI0 = r1(b);
const FS = [0, 0.25, 0.5, 0.75, 1];
const rk = make(FS.map((f) => G.lerp(PHI0, PHI1, f)));
const poses = rk.poses;
const up = G.easeTimes([0.25, 0.5, 0.75, 1], 0.6, 2.6), dn = G.easeTimes([0.25, 0.5, 0.75, 1], 3.1, 5.6);
const keyframes = [{ t: 0, pose: 'r0' }, { t: 0.6, pose: 'r0' }, ...up.map((t, i) => ({ t, pose: `r${i + 1}` })), { t: 3.1, pose: 'r4' }, ...dn.map((t, i) => ({ t, pose: `r${3 - i}` })), { t: 6.0, pose: 'r0' }];
const ex = H.module_(meta, contacts, poses, keyframes);
const rep = K.scanHeld(ex, [{ side: 'r', grip: 'handle', size: SZ }], { planted: ['leg_r', 'leg_l'] });
const Wa = L.fk(poses.r0, contacts), Wb = L.fk(poses.r4, contacts);
const set = H.setKin(ex), dg = G.deg;
set('External rotation', 'setup', `Forearm ${dg(rk.phiOf(Wa))} up from the floor, pointing toward the feet`); set('External rotation', 'peak', `Forearm ${dg(rk.phiOf(Wb))} (vertical), ${dg(rk.phiOf(Wb) - rk.phiOf(Wa))} of rotation; elbow fixed`);
set('Shoulder abduction', 'setup', `Upper arm ${dg(K.humElev(Wa))} from the trunk, resting on the floor`); set('Shoulder abduction', 'peak', 'Unchanged');
set('Elbow flexion', 'setup', dg(K.elbowAng(Wa))); set('Elbow flexion', 'peak', dg(K.elbowAng(Wb)));
set('Tempo', 'setup', 'Pause 0.6 s'); set('Tempo', 'peak', '2.0 s up, 0.5 s at the top, 2.5 s down');
console.log(`${meta.exercise.name}: wrote ${L.write(ex)}\n  ${JSON.stringify({ PHI0, dy: hi, err: rk.err, sign: rk.sign, arm: rk.arm.ch.shoulder_r, phi: [rk.phiOf(Wa), rk.phiOf(Wb)].map(r1), ...rep })}`);
G.fail(ID, [rep.slide > 0.05 && 'slide', rep.floor < -0.5 && 'below floor', rep.clear.d < 0 && `dumbbell clearance ${JSON.stringify(rep.clear)}`, rep.dbFloor < 0 && 'dumbbell below floor', rep.jump.v > 4 && 'channel jump', ...G.limits(poses)]);
