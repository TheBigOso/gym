// Dumbbell Jefferson Curl (GymVisual #732912): standing on a 30 cm box with the toes at its front edge, knees straight (not
// locked), one light dumbbell hanging upright in front of the thighs, both hands cupping its top plate (grip 'end', carried by the right hand). Slowly roll down one segment at a time:
// chin to chest, then the upper back, the lower back and finally the hips fold, the arms hanging straight so the dumbbell
// passes in front of the box and below its top; hang in the stretch, then roll back up from the bottom (hips, lower back,
// upper back, head last). The body (with the dumbbells) stays balanced over the mid-foot; the dumbbell is kept clear of
// the body and the box. Both feet planted on the box. Bilateral.
const L = require('./lib');
const { R, V, rig, r1, clone } = L;
const { makeSingle } = require('./families/single');
const B = require('./families/b3-back');
const H = require('./families/b4-hinges');
const DBH = require('./families/dumbbell');
const meta = require('./meta/dumbbell-jefferson-curl.json');

const S = makeSingle({ toe: 6, half: 9 });   // lunge-family feet with a root-height search that reaches a box top
const SIZE = [28, 12, 12], DSZ = { length: SIZE[0], diameter: SIZE[1] }, KG = 8;
// one dumbbell hanging upright, both hands cupping the top plate (grip 'end', athlete frame [toward fingers, out of palm, thumb])
const OFF = [20, 7, 0];
DBH.GRIP.jeff = { off: [OFF[1], -OFF[0], -OFF[2]], axis: [0, -1, 0] };
const BOX = { h: 30, x0: -16, x1: +(process.env.BX ?? 18.5), w: 44 };
const box = { id: 'box', kind: 'box', center: [r1((BOX.x0 + BOX.x1) / 2), 0, 0], size: [r1(BOX.x1 - BOX.x0), BOX.h, BOX.w] };
const boxes = [H.boxOB(box, 'box')];
const feet = { r: { c: 'flat', x: 0, lift: BOX.h }, l: { c: 'flat', x: 0, lift: BOX.h } };
const BODY = rig.shapes.filter((s) => /^(thigh|quad|shank|calf|foot|pelvis|buttock|abdomen|ribcage|chest|head|jaw|neck)/.test(s.id));
const palm = [0, 0, -1], thumb = [1, 0, 0];
const wristOf = (c) => V.sub(c, V.add(V.scale(palm, OFF[1]), [0, -OFF[0], 0]));   // fingers straight down
// clearance of the upright dumbbell (centre c) from the body and the box
function clear(W, c) {
  let best = 1e9; const half = SIZE[0] / 2, r = SIZE[1] / 2;
  for (let k = -8; k <= 8; k += 2) { const y = (k / 8) * half, p = V.add(c, [0, y, 0]), rr = Math.abs(y) > 6 ? r : 1.6; for (const s of BODY) best = Math.min(best, B.shapeDist(W, s, p) - rr); best = Math.min(best, B.boxDist(p, boxes[0]) - rr); }
  return best;
}
let ARMG = null;
function arms(p) {
  const W0 = L.fk(p, S.contacts), Sh = W0.shoulder_r.p, reach = L.reach(5);
  let q = null;
  // the solved hand can land a little off its target (the hand orientation is a soft goal): raise the planned clearance
  // until the dumbbell the arm actually holds clears the legs and the box by 2 cm
  for (const M of [3, 5, 7, 9, 11, 13]) {
    // walk back from well in front until the dumbbell would touch the legs or the box: it stays in front of them (no gaps)
    const place = (y) => { let x = Sh[0] + 40; while (x > Sh[0] - 30 && clear(W0, [x - 1, y, 0]) > M) x -= 1; let a = x - 1, b = x; for (let i = 0; i < 8; i++) { const m = (a + b) / 2; if (clear(W0, [m, y, 0]) > M) b = m; else a = m; } return [b, y, 0]; };
    let ya = -20, yb = Sh[1];
    for (let i = 0; i < 20; i++) { const y = (ya + yb) / 2; if (V.len(V.sub(wristOf(place(y)), Sh)) > reach) ya = y; else yb = y; }
    q = B.holdArm(p, wristOf(place(yb)), { palm, axis: thumb, axialW: 0.02, tw: [10, 10, 10], dirW: 2, extra: [(W, qq) => [Math.max(0, qq.ch.shoulder_r.elev - 176) * 3, ARMG ? (L.wrap(qq.ch.shoulder_r.plane - ARMG[0])) * 0.03 : 0]], guesses: (ARMG ? [ARMG] : []).concat([[30, 15, 0, 5, 90], [60, 30, 0, 5, 90], [90, 90, 0, 5, 90]]) });
    q.ch.shoulder_r.elev = r1(((q.ch.shoulder_r.elev % 360) + 360) % 360);   // the solver can wander a full turn
    const Wq = L.fk(q, S.contacts);
    if (clear(Wq, DBH.dumbbellAt(Wq, 'r', 'jeff', DSZ).c) >= 2.5) break;
  }
  ARMG = [q.ch.shoulder_r.plane, q.ch.shoulder_r.elev, q.ch.shoulder_r.axial, q.ch.elbow_r.flex, q.ch.wrist_r.pron];   // keep one arm branch along the roll
  delete q.__cost; B.mirrorArm(q); q.ch.sc_l = clone(q.ch.sc_r);
  return q;
}
// segmental roll: each segment flexes over its own window of f (0 standing tall, 1 the bottom)
const win = (f, a, b) => { const u = Math.max(0, Math.min(1, (f - a) / (b - a))); return u * u * (3 - 2 * u); };
const SEG = { neck: [0, 0.3, 38], t6: [0.12, 0.5, 24], t12: [0.28, 0.68, 28], l5: [0.42, 0.85, +(process.env.L5 ?? 38)], hip: [+(process.env.H0 ?? 0.35), 1, +(process.env.P ?? -62)] };
const amt = (k, f) => SEG[k][2] * win(f, SEG[k][0], SEG[k][1]);
function at(f) {
  const nk = amt('neck', f);
  return B.hinge(S, { pitch: r1(amt('hip', f)), knee: 4, feet, spine: { l5: r1(amt('l5', f)), t12: r1(amt('t12', f)), t6: r1(amt('t6', f)) },
    sc: { protract: r1(2 + 10 * win(f, 0.1, 0.6)), elevate: r1(-2 + 4 * win(f, 0.3, 1)) }, size: DSZ, kg: KG, midfoot: 5, neck: () => nk, arms }).pose;
}
const T = H.phaseT(meta), [T0, T1] = T.down, [T2, T3] = T.up, D = meta.timeline.duration;
const FS = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.55, 0.6, 0.633, 0.667, 0.7, 0.75, 0.8, 0.9, 1], N = FS.length - 1;
const poses = {};
FS.forEach((f, i) => { poses[`j${i}`] = at(f); });
poses.hang = at(0.97);
// linear in f (each segment already eases inside its own window)
const lin = (t0, t1, rev) => FS.map((f, i) => ({ t: +(t0 + (t1 - t0) * (rev ? 1 - f : f)).toFixed(3), pose: `j${i}` }));
const keyframes = [{ t: 0, pose: 'j0' }, ...lin(T0, T1), { t: +((T1 + T2) / 2).toFixed(3), pose: 'hang' }, { t: T2, pose: `j${N}` }, ...lin(T2, T3, true), { t: D, pose: 'j0' }];
const props = [box, { id: 'dbR', kind: 'dumbbell', size: SIZE, attach: { joint: 'wrist_r', grip: 'end', offset: OFF } }];
const ex = H.makeEx(meta, { poses, keyframes, props, contacts: S.contacts });
const held = [{ side: 'r', grip: 'jeff', size: DSZ }];
const rep = B.sweep(ex, { held, fixed: ['ankle_r', 'ankle_l', 'toe_r', 'toe_l'], boxes, bodySkip: ['foot_r', 'foot_l'], skipBody: ['hand_l', 'thumb_l', 'forearm_l'] });
const Wt = S.fk(poses.j0), Wb = S.fk(poses[`j${N}`]), pB = poses[`j${N}`];
const spineSum = r1(pB.ch.spine_l5.flex + pB.ch.spine_t12.flex + pB.ch.spine_t6.flex), dbLow = r1(DBH.dumbbellMinY(Wb, 'r', 'jeff', DSZ));
H.setKin(ex, 'Spinal flexion', 'setup', 'Neutral, standing tall'); H.setKin(ex, 'Spinal flexion', 'peak', `Spine channels ${pB.ch.spine_l5.flex}°/${pB.ch.spine_t12.flex}°/${pB.ch.spine_t6.flex}° (L5/T12/T6, ${spineSum}° in all) plus ${r1(pB.ch.neck_c7.flex + pB.ch.head_c1.flex)}° of neck flexion, rolled down head first`);
H.setKin(ex, 'Hip flexion', 'setup', `≈${Math.round(poses.j0.ch.hip_r.flex)}°`); H.setKin(ex, 'Hip flexion', 'peak', `≈${Math.round(pB.ch.hip_r.flex)}° (joint channel), only in the second half of the roll`);
H.setKin(ex, 'Knee flexion', 'setup', `≈${Math.round(B.kneeOf(Wt, 'r'))}°`); H.setKin(ex, 'Knee flexion', 'peak', `≈${Math.round(B.kneeOf(Wb, 'r'))}°`);
H.setKin(ex, 'Tempo', 'setup', `Stand ${T0} s`); H.setKin(ex, 'Tempo', 'peak', `${r1(T1 - T0)} s down to the dumbbells ${r1(BOX.h - dbLow)} cm below the box top, ${r1(T2 - T1)} s hang, ${r1(T3 - T2)} s up, ${r1(D - T3)} s reset`);
console.log(`Dumbbell Jefferson Curl: wrote ${L.write(ex)}\n  hip ${pB.ch.hip_r.flex}, spine ${spineSum}, trunk ${r1(B.trunkLean(Wb))} from vertical, db low ${dbLow} (box top ${BOX.h}), handle x ${r1(DBH.dumbbellAt(Wb, 'r', 'jeff', DSZ).c[0])} (box front ${BOX.x1}); ${JSON.stringify(rep)}`);
if (rep.slide > 0.05 || rep.drift > 0.05) { console.error('FAIL: planted feet slide'); process.exitCode = 1; }
if (rep.dbFloor < 0 || rep.dbBody < -0.5 || rep.dbBox < 0) { console.error('FAIL: dumbbell through the floor, the box or the body'); process.exitCode = 1; }
if (process.env.DBG) FS.forEach((f, i) => { const W = S.fk(poses[`j${i}`]), d = DBH.dumbbellAt(W, 'r', 'jeff', DSZ); console.log(f, d.c.map(r1), d.ax.map((v) => +v.toFixed(2)), r1(clear(W, d.c)), JSON.stringify(B.dbBody(W, 'r', 'jeff', DSZ, ['hand_l', 'thumb_l', 'forearm_l'])), poses[`j${i}`].ch.shoulder_r, poses[`j${i}`].ch.elbow_r.flex); });
