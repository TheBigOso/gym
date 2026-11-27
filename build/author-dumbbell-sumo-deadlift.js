// Dumbbell Sumo Deadlift (GymVisual #819212): feet wide (about 1.4x the shoulders), toes turned out 30 degrees, one
// dumbbell hanging upright between the legs, both hands cupping its top plate (palms facing each other, carried by the
// right hand with grip 'end'; the left hand mirrors on the other side of the plate). Sit the hips back and down with the
// knees pushing out over the toes and a flat, fairly upright back, until the bottom plate touches the floor lightly between
// the feet; stand up. Arms hang long, the dumbbell plumb under the shoulders and clear of the thighs; the body (with the
// dumbbell) is balanced over the mid-foot. Both feet planted, knees tracking the toes. Bilateral.
const L = require('./lib');
const { R, V, rig, r1, clone } = L;
const { makeFamily } = require('./families/lunge');
const B = require('./families/b3-back');
const H = require('./families/b4-hinges');
const DBH = require('./families/dumbbell');
const meta = require('./meta/dumbbell-sumo-deadlift.json');

const TOE = 30, HALF = +(process.env.HALF ?? 27);
const F = makeFamily({ toe: TOE, half: HALF });
for (const c of F.contacts) { const s = c.id.endsWith('_r') ? 1 : -1, a = (TOE + 4) * R.DEG; c.pole = [+Math.cos(a).toFixed(3), 0, +(s * Math.sin(a)).toFixed(3)]; }   // knees over the toes
const SIZE = [34, 14, 14], DSZ = { length: SIZE[0], diameter: SIZE[1] }, KG = 22;
// 'end' grip, athlete frame [toward fingers, out of palm, thumb axis]: the palm on the side of the top plate, fingers hooked under it
const OFF = [+(process.env.OF ?? 20), 7, 0];
DBH.GRIP.sumo = { off: [OFF[1], -OFF[0], -OFF[2]], axis: [0, -1, 0] };
const feet = { r: { c: 'flat', x: 0 }, l: { c: 'flat', x: 0 } };
const SKIP = new Set(['hand_r', 'thumb_r', 'forearm_r', 'hand_l', 'thumb_l', 'forearm_l']);
const SHAPES = rig.shapes.filter((s) => !SKIP.has(s.id) && /^(pelvis|buttock|abdomen|thigh|quad|shank|calf)/.test(s.id));
// clearance of an upright dumbbell (centre c) from the body
function dbClear(W, c) {
  let best = 1e9;
  for (let k = -8; k <= 8; k += 2) { const y = (k / 8) * (SIZE[0] / 2), p = V.add(c, [0, y, 0]), rr = Math.abs(y) > 7 ? SIZE[1] / 2 : 1.8; for (const s of SHAPES) best = Math.min(best, B.shapeDist(W, s, p) - rr); }
  return best;
}
const palm = [0, 0, -1], thumb = [1, 0, 0];
const wristOf = (c) => V.sub(c, V.add(V.scale(palm, OFF[1]), [0, -OFF[0], 0]));   // fingers straight down
function arms(p) {
  const W0 = L.fk(p, F.contacts), S = W0.shoulder_r.p, reach = L.reach(5);
  // dumbbell centre on the midline: lowest point the straight arm reaches, slid forward (+x) until clear of the legs
  const place = (y) => { let a = S[0] - 25, b = S[0] + 40; for (let i = 0; i < 16; i++) { const m = (a + b) / 2; if (dbClear(W0, [m, y, 0]) > 1.5) b = m; else a = m; } return [Math.max(b, S[0] - 4), y, 0]; };
  let ya = -30, yb = S[1];
  for (let i = 0; i < 18; i++) { const y = (ya + yb) / 2; if (V.len(V.sub(wristOf(place(y)), S)) > reach) ya = y; else yb = y; }
  const c = place(yb);
  const q = B.holdArm(p, wristOf(c), { palm, axis: thumb, axialW: 0.02, guesses: [[30, 15, 0, 5, 90], [60, 30, 0, 5, 90], [0, 15, 30, 5, 90]] });
  delete q.__cost; B.mirrorArm(q);
  return q;
}
// the hinge balances body + dumbbell: B.hinge balances the two handle dumbbells (kg 0 here); add the real dumbbell by a second pass
function hingeB(pitch, knee, g) {
  let x0 = 0, r;
  for (let i = 0; i < 3; i++) {
    r = B.hinge(F, { pitch: r1(pitch), knee: r1(knee), feet, spine: { l5: r1(-4 * g), t12: r1(-1 * g), t6: r1(1 * g) }, sc: { protract: r1(4 * g), elevate: r1(-2 - 4 * g) }, size: DSZ, kg: 0, midfoot: 5 - x0, arms, neck: (lean) => -lean * 0.2 });
    const c = B.comX(r.W, [{ c: DBH.dumbbellAt(r.W, 'r', 'sumo', DSZ).c, kg: KG }]);
    const e = c[0] - 5; if (Math.abs(e) < 0.1) break; x0 += e;
  }
  return r;
}
const KNEE_TOP = 5, KNEE_B = +(process.env.KB ?? 95), FLOOR = +(process.env.DBF ?? -2.8)   // rig estimate; the athlete's dumbbell sits about 3 cm higher (measured on the mesh);
let pa = -10, pb = -60;
for (let i = 0; i < 13; i++) { const pm = (pa + pb) / 2, r = hingeB(pm, KNEE_B, 1); if (DBH.dumbbellMinY(r.W, 'r', 'sumo', DSZ) > FLOOR) pa = pm; else pb = pm; }
const PITCH_B = r1((pa + pb) / 2);
function at(f) { const gp = 1 - Math.pow(1 - f, 1.4), gk = Math.pow(f, 1.1); return hingeB(PITCH_B * gp, KNEE_TOP + (KNEE_B - KNEE_TOP) * gk, f).pose; }
const T = H.phaseT(meta), [T0, T1] = T.lower, [T2, T3] = T.lift, D = meta.timeline.duration;
const FS = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.88, 1], N = FS.length - 1;
const poses = {};
FS.forEach((f, i) => { poses[`d${i}`] = at(f); });
const keyframes = [{ t: 0, pose: 'd0' }, ...H.easedKeys('d', FS, T0, T1), { t: T2, pose: `d${N}` }, ...H.easedKeys('d', FS, T2, T3, true), { t: D, pose: 'd0' }];
const props = [{ id: 'dbR', kind: 'dumbbell', size: SIZE, attach: { joint: 'wrist_r', grip: 'end', offset: OFF } }];
const ex = H.makeEx(meta, { poses, keyframes, props, contacts: F.contacts });
const rep = B.sweep(ex, { held: [{ side: 'r', grip: 'sumo', size: DSZ }], fixed: ['ankle_r', 'ankle_l', 'toe_r', 'toe_l'], skipBody: ['hand_l', 'thumb_l', 'forearm_l'] });
const Wt = F.fk(poses.d0), Wb = F.fk(poses[`d${N}`]), pB = poses[`d${N}`];
const kneeOverToe = r1(Math.abs(V.angle(V.sub(Wb.knee_r.p, Wb.ankle_r.p).map((v, i) => (i === 1 ? 0 : v)), [Math.cos(TOE * R.DEG), 0, Math.sin(TOE * R.DEG)])));
H.setKin(ex, 'Hip flexion', 'setup', `≈${Math.round(poses.d0.ch.hip_r.flex)}°`); H.setKin(ex, 'Hip flexion', 'peak', `≈${Math.round(pB.ch.hip_r.flex)}° flexion with ${Math.round(pB.ch.hip_r.abd)}° abduction (joint channels)`);
H.setKin(ex, 'Knee flexion', 'setup', `≈${Math.round(B.kneeOf(Wt, 'r'))}°`); H.setKin(ex, 'Knee flexion', 'peak', `≈${Math.round(B.kneeOf(Wb, 'r'))}°, knee ${kneeOverToe}° off the toe line (seen from above)`);
H.setKin(ex, 'Stance', 'setup', `Ankles ${2 * HALF} cm apart, toes out ${TOE}°`); H.setKin(ex, 'Stance', 'peak', 'Unchanged');
H.setKin(ex, 'Trunk inclination', 'setup', `≈${Math.round(B.trunkLean(Wt))}°`); H.setKin(ex, 'Trunk inclination', 'peak', `≈${Math.round(B.trunkLean(Wb))}° from vertical, spine neutral`);
H.setKin(ex, 'Tempo', 'setup', `Stand ${T0} s`); H.setKin(ex, 'Tempo', 'peak', `${r1(T1 - T0)} s down, ${r1(T2 - T1)} s touch, ${r1(T3 - T2)} s up, ${r1(D - T3)} s reset`);
console.log(`Dumbbell Sumo Deadlift: wrote ${L.write(ex)}\n  bottom pitch ${PITCH_B}, knee ${KNEE_B}, hip ${pB.ch.hip_r.flex}/${pB.ch.hip_r.abd}, trunk ${r1(B.trunkLean(Wb))}, db low ${r1(DBH.dumbbellMinY(Wb, 'r', 'sumo', DSZ))}, knee/toe ${kneeOverToe}; ${JSON.stringify(rep)}`);
if (rep.slide > 0.05 || rep.drift > 0.05) { console.error('FAIL: planted feet slide'); process.exitCode = 1; }
if (rep.dbFloor < FLOOR - 0.5 || rep.dbBody < -0.5) { console.error('FAIL: dumbbell through the floor or the body'); process.exitCode = 1; }
