// Hanging Oblique Knee Raise (GymVisual 5136, movement reference only; the page could not be read at authoring time).
// Dead hang from a free-standing pull-up bar, overhand grip a little wider than the shoulders. The bent knees rise up and
// across toward one side: the pelvis turns toward that side (root yaw) and the trunk side-bends so the hip on that side
// comes up toward the ribs, while the spine counter-rotates so the shoulders stay square to the bar. Lower to a still
// centre hang, then the other side. Bilateral, alternating sides (both in the loop). Hands planted on the bar; each key
// solves the root (position, pitch, roll) and the spine twist so both arms keep their length, the shoulders stay square
// and the centre of mass stays under the hands (F.hanging).
const L = require('./lib');
const F = require('./families/b6-16');
const H = require('./families/hips');
const meta = require('./meta/hanging-oblique-knee-raise.json');

const hang = { hip: 3, knee: 8, ankle: -12, spine: [0, 0, 0], neck: [0, 0], sc: { protract: 2, elevate: 12 }, shX: null, flex: 9 };
const YAW = 28, SIDE = 14;
// right side: pelvis turned toward the right (+yaw), right side shortened; the knees drive up and to the right
const side = (sg, f, hip, knee, spine) => ({ hip, knee, ankle: -18, spine, neck: [3, 3], sc: { protract: 1, elevate: 5 }, shX: -4 * f, flex: 13, yaw: -sg * YAW * f, side: sg * SIDE * f,
  legR: { flex: hip + sg * 4 * f, abd: 1 + sg * 6 * f, rot: 0, knee }, legL: { flex: hip - sg * 4 * f, abd: 1 - sg * 6 * f, rot: 0, knee } });
const KEYS = {
  hang,
  rMid: side(1, 0.55, 55, 60, [4, 2, 1]), rTop: side(1, 1, 98, 100, [10, 6, 2]), rHold: side(1, 1.03, 100, 102, [11, 6, 2]),
  lMid: side(-1, 0.55, 55, 60, [4, 2, 1]), lTop: side(-1, 1, 98, 100, [10, 6, 2]), lHold: side(-1, 1.03, 100, 102, [11, 6, 2]),
};
const SEQ = [['hang', 0], ['hang', 0.5], ['rMid', 1.1], ['rTop', 1.7], ['rHold', 2.1], ['rMid', 3.0], ['hang', 3.7], ['hang', 4.2], ['lMid', 4.8], ['lTop', 5.4], ['lHold', 5.8], ['lMid', 6.7], ['hang', 7.4], ['hang', 8.4]];
const { ex, poses, place, rep, fail } = F.hanging({ keys: KEYS, seq: SEQ, meta });
const Wh = L.fk(poses.hang, ex.contacts), Wt = L.fk(poses.rHold, ex.contacts), p = poses.rHold;
const twist = ['spine_l5', 'spine_t12', 'spine_t6'].reduce((a, j) => a + p.ch[j].rot, 0);
const set = H.setKin(ex);
set('Hip flexion', 'setup', `≈${hang.hip}° in the hang`); set('Hip flexion', 'peak', `≈${Math.round(p.ch.hip_r.flex)}° (right) / ${Math.round(p.ch.hip_l.flex)}° (left) at the top`);
set('Pelvis rotation', 'setup', 'Square to the bar'); set('Pelvis rotation', 'peak', `≈${Math.round(p.root.rot.yaw)}° toward the working side; spine counter-rotates ${Math.round(-twist)}° so the shoulders stay square`);
set('Trunk side bend', 'setup', 'Upright'); set('Trunk side bend', 'peak', `Working side shortens (pelvis roll ${Math.round(p.root.rot.roll)}°, spine side bend ${Math.round(p.ch.spine_l5.latFlex + p.ch.spine_t12.latFlex + p.ch.spine_t6.latFlex)}°)`);
set('Knees', 'setup', `≈${hang.knee}°`); set('Knees', 'peak', `≈${p.ch.knee_r.flex}°`);
set('Tempo', 'setup', 'Hang 0.5 s'); set('Tempo', 'peak', 'Per side: 1.2 s up, 0.4 s hold, 1.6 s down, 0.5 s still hang');
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(Math.max(p.ch.hip_r.flex, p.ch.hip_l.flex) - 8), max: Math.ceil(Math.max(p.ch.hip_r.flex, p.ch.hip_l.flex) + 4) };
const sq = (W) => { const d = L.V.norm(L.V.sub(W.shoulder_r.p, W.shoulder_l.p)); return Math.round(Math.asin(Math.min(1, Math.hypot(d[0], d[1]))) / L.R.DEG * 10) / 10; };
console.log(`Hanging Oblique Knee Raise: wrote ${L.write(ex)}\n  place ${JSON.stringify(place)}\n  ${JSON.stringify(rep)}\n  top root ${JSON.stringify(p.root)} spine rot ${twist.toFixed(1)} shoulder line off-axis ${sq(Wt)}°; knees x/z ${Wt.knee_r.p[0].toFixed(1)}/${Wt.knee_r.p[2].toFixed(1)} ${Wt.knee_l.p[0].toFixed(1)}/${Wt.knee_l.p[2].toFixed(1)}`);
if (fail.length) { console.error('FAIL hanging-oblique-knee-raise: ' + fail.join('; ')); process.exitCode = 1; }
if (process.env.DBG) for (const [n, q] of Object.entries(poses)) { const W = L.fk(q, ex.contacts), W0 = L.fk(Object.assign(L.clone(q), { ik: undefined })); console.log(n, ['r', 'l'].map((s) => L.V.len(L.V.sub(W0[`wrist_${s}`].p, ex.poses[n].ik[`arm_${s}`].target)).toFixed(2)).join('/'), 'hipY r-l', (W.hip_r.p[1] - W.hip_l.p[1]).toFixed(1), 'knee z', W.knee_r.p[2].toFixed(1), W.knee_l.p[2].toFixed(1)); }
