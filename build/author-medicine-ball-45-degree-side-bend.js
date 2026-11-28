// Medicine Ball 45 Degree Side Bend (GymVisual #22089, movement reference only): side-lying on a 45-degree hyperextension
// bench, the left hip and outer thigh on the hip pad (its top edge below the hip), feet scissored on the foot plate under
// the heel roller (left foot in front, planted), a medicine ball hugged to the chest with both hands. From the body in one
// line the trunk bends sideways down toward the floor (spine lateral flexion over the pad), then
// lifts back up through the line to a little past it. Authored with the right side on top (the right obliques and
// quadratus lumborum lift the trunk); the player mirrors it.
// Gear: hyperextension_bench (src/gear/benches.js, angle 45; pad fitted to the body here) and the medicine ball
// (src/gear/g3attach-balls.js, plate with params.shape 'ball'). Helpers: build/families/gear-benches.js,
// build/families/gear-g3attach.js (armsOnBall).
const L = require('./lib');
const { R, V, Q, r1, clone } = L;
const H = require('./families/hips');
const GB = require('./families/gear-benches');
const G = require('./families/gear-g3attach');

const meta = G.meta({
  id: 'medicine-ball-45-degree-side-bend', name: 'Medicine Ball 45 degree Side Bend', url: 'https://gymvisual.com/videos/22089-medicine-ball-45-degree-side-bend.html',
  aliases: ['45-degree side hyperextension with medicine ball', 'Roman chair side bend', 'Lateral hyperextension'], bodyPart: 'Waist (obliques)', secondary: ['Lower back', 'Hips'], equipment: ['Hyperextension bench (45 degrees)', 'Medicine ball'],
  mechanics: 'Isolation (trunk lateral flexion)', plane: 'Frontal', side: 'right', cam: 'front', difficulty: 'Intermediate',
  muscles: { target: ['obliques_r'], synergist: ['spinal_extensors_r', 'core'], stabilizer: ['glute_med_r', 'adductors_l', 'ant_deltoid_r', 'ant_deltoid_l'], lengthened: ['obliques_l'] },
  notes: { obliques_r: 'Top-side obliques lift the trunk against gravity and the ball; side-lying lifts and side bridges are strong oblique exercises (Konrad 2001; Escamilla 2006).', spinal_extensors_r: 'Top-side quadratus lumborum and erectors assist lateral flexion (clinical opinion).', core: 'Rectus abdominis braces the trunk (Konrad 2001).', glute_med_r: 'Holds the top leg and pelvis (clinical opinion).', adductors_l: 'Bottom leg presses into the foot plate (clinical opinion).', ant_deltoid_r: 'Hug the ball to the chest (clinical opinion).', ant_deltoid_l: 'Hug the ball to the chest (clinical opinion).', obliques_l: 'Lengthen as the trunk lifts (clinical opinion).' },
  breathing: { pattern: 'Inhale as you bend down, exhale as you lift.', cadence: 'About 1.8 s down, 0.3 s pause, 1.2 s up' },
  rx: { reps: '10-15 per side', tempo: '2-0-1-1', progression: 'Heavier ball, or hold it further from the chest' },
  phases: [
    { id: 'setup', label: 'Side-lying on the bench', end: 0.8, cue: 'Lie on your side on the 45-degree bench, hip on the pad, feet scissored under the roller, ball hugged to the chest.', w: 0.35 },
    { id: 'down', label: 'Bend down', end: 2.4, breath: 'inhale', cue: 'Breathe in and bend sideways down toward the floor, slow and controlled.', w: 0.45 },
    { id: 'hold', label: 'Pause', end: 2.7, cue: 'Short pause at the bottom; no bounce.', w: 0.55 },
    { id: 'up', label: 'Lift', end: 4.0, breath: 'exhale', cue: 'Breathe out and lift the trunk sideways up through the line, a little past it.', w: 1 },
    { id: 'reset', label: 'Reset', end: 5.0, cue: 'Settle back to the straight line; repeat, then switch sides.', w: 0.35 },
  ],
  mistakes: [['Twisting the trunk', 'Stay stacked: shoulders and hips face the same way.'], ['Swinging up past the line', 'Lift only a little past straight.'], ['Pad too high', 'The pad top sits below the hip so the trunk can bend over it.'], ['Holding the ball out', 'Hug it to the chest (harder: further out).']],
  kin: [['Lateral flexion', 'About 30-45 degrees down and 10-20 degrees up past the line (clinical opinion); side-lying trunk lifts load the obliques (Konrad 2001)', ['konrad2001']], ['Pelvis on the pad', 'Pelvis tips over the pad top below the hip (standard setup)', []], ['Bench', '45-degree hyperextension bench, side on the pad (standard setup)', []], ['Ball', 'Hugged to the chest (standard technique)', ['escamilla2006']], ['Tempo', 'Slow down, controlled up (clinical opinion)', []]],
  safety: { cautions: ['Lock the feet under the roller before leaning out.', 'Low-back or hip pain: reduce the range.'], modify: ['No ball until the movement is smooth.'], regressions: ['Side-lying lateral raise on the floor.', 'Dumbbell side bend.'], progressions: ['Heavier ball.', 'Ball held overhead.'] },
  act: { obliques_r: [0.12, 0.75], spinal_extensors_r: [0.1, 0.5], core: [0.1, 0.3], glute_med_r: [0.15, 0.3], adductors_l: [0.12, 0.25], ant_deltoid_r: [0.15, 0.22], ant_deltoid_l: [0.15, 0.22], obliques_l: [0.05, 0.1] },
  camPresets: { front: { yaw: 0, pitch: 10, label: 'Front' }, side: { yaw: 90, pitch: 6, label: 'Side' } },
  guides: [{ id: 'headPath', kind: 'path', joint: 'neck_c7', from: 2.7, to: 4.0, label: 'Trunk lifts sideways' }],
  checks: { stillJoints: ['ankle_r', 'ankle_l'], plantedContacts: ['leg_r', 'leg_l'] },
});

const ANGLE = 45, SCISSOR = 9, KNEE = 9, HIPGAP = 15, BALL = 22;
const ROLL0 = -45; // base lateral tilt: body up the leg line (45 degrees), right side up, front toward +Z
const hb0 = GB.hyperBench({ x: 0, params: { angle: ANGLE } });
const d = hb0.points.legDir, n = hb0.points.legNormal, Fp = hb0.points.F;
const rootQ = (roll) => L.fk({ root: { pos: [0, 0, 0], rot: { yaw: -90, roll } }, ch: {} }).pelvis.q;
const footRot = rootQ(ROLL0).map((v) => +v.toFixed(6));
const FOOT = { l: V.add(V.add(Fp, V.scale(d, L.ANKLE_H)), [0, 0, SCISSOR]).map(r1), r: V.add(V.add(Fp, V.scale(d, L.ANKLE_H)), [0, 0, -SCISSOR]).map(r1) };
const contacts = ['r', 'l'].map((s) => Object.assign(L.legContact(s), { label: `${s === 'r' ? 'Right' : 'Left'} foot (foot plate)`, pole: [0, 0, 1], handRot: footRot }));
const z0 = () => ({ rot: 0, flex: 0, latFlex: 0 });
let base = { root: { pos: [40, 70, 0], rot: { yaw: -90, roll: ROLL0 } }, ch: { spine_l5: z0(), spine_t12: z0(), spine_t6: z0(), neck_c7: { rot: 0, flex: 4 }, head_c1: { rot: 0, flex: 2 },
  sc_r: { protract: 8, elevate: 2 }, sc_l: { protract: 8, elevate: 2 }, hip_r: { flex: -6, abd: -6, rot: 0 }, hip_l: { flex: 6, abd: 6, rot: 0 }, knee_r: { flex: KNEE }, knee_l: { flex: KNEE }, ankle_r: { dorsi: 0 }, ankle_l: { dorsi: 0 } } };
// root on the leg line so the free legs (channels) reach the foot targets with soft knees
base = L.solvePose(base, ['root.pos.0', 'root.pos.1', 'ch.hip_r.flex', 'ch.hip_r.abd', 'ch.hip_l.flex', 'ch.hip_l.abd'], [L.obj.at('ankle_r', FOOT.r, 3), L.obj.at('ankle_l', FOOT.l, 3), (W, q) => [(q.ch.hip_r.abd + q.ch.hip_l.abd) * 0.3]], { iters: 500 }).pose;
// ball hugged to the chest: centre in front of the sternum, hands on its sides (solved once; the arms ride on the thorax)
const Wb0 = L.fk(base), t6 = Wb0.spine_t6, C0 = G.toWorld(Wb0, 'spine_t6', [28.5, 2, 0]);
const armed = G.armsOnBall(base, C0, BALL + 3, { side: Q.rot(t6.q, [0, 0, 1]), guess: { plane: 70, elev: 45, axial: 0, elbow: 110, pron: 0, flex: 0, dev: 0 } });
const ARMS = {}; for (const j of ['shoulder_r', 'shoulder_l', 'elbow_r', 'elbow_l', 'wrist_r', 'wrist_l', 'sc_r', 'sc_l']) ARMS[j] = clone(armed.ch[j]);
base.ik = { leg_r: { target: FOOT.r, weight: 1 }, leg_l: { target: FOOT.l, weight: 1 } };
const Wb = L.fk(base, contacts), HIPL = Wb.hip_l.p.slice();
// pad fitted to the body: surface on the outer left hip/thigh, top edge HIPGAP below the left hip joint along the leg line
const along = V.dot(V.sub(HIPL, Fp), d);
const DEEP = -Math.min(...['thigh_l', 'quad_l', 'buttock_l', 'pelvis'].map((id) => GB.shapePlane(Wb, id, { o: Fp, n })));
const hb = GB.hyperBench({ x: 0, params: { angle: ANGLE, padDist: r1(along - HIPGAP), padDrop: r1(DEEP - 2.7) } });
// keys: pelvis tips (roll) about the left hip over the pad, plus spine lateral flexion split L5/T12/T6
function key(tip, lat) {
  const q = clone(base); q.root.rot.roll = r1(ROLL0 + tip);
  q.ch.spine_l5 = { rot: 0, flex: 0, latFlex: r1(lat * 0.42) }; q.ch.spine_t12 = { rot: 0, flex: 0, latFlex: r1(lat * 0.32) }; q.ch.spine_t6 = { rot: 0, flex: 0, latFlex: r1(lat * 0.26) };
  q.ch.neck_c7 = { rot: 0, flex: 4, latFlex: 0 }; q.ch.head_c1 = { rot: 0, flex: 2 };
  let s = L.solvePose(q, ['root.pos.0', 'root.pos.1', 'root.pos.2'], [L.obj.at('hip_l', HIPL, 3)]).pose;
  for (const sd of ['r', 'l']) s = H.fitLeg(s, sd, contacts.find((c) => c.id === `leg_${sd}`), FOOT[sd], { abd: base.ch[`hip_${sd}`].abd, rot: 0, handRot: footRot });
  Object.assign(s.ch, clone(ARMS));
  return s;
}
// f: 0 = straight line, -1 = bottom (spine bent 41 degrees down), +1 = top (16 degrees up); the pelvis stays on the pad
const at = (f) => (f < 0 ? key(0, 41 * f) : key(0, 16 * f));
const poses = { line: at(0), d1: at(-0.3), d2: at(-0.65), bottom: at(-1), bhold: at(-0.98), u1: at(-0.45), up: at(0.6), top: at(1), back: at(0.3) };
for (const p of Object.values(poses)) for (const j of ['spine_l5', 'spine_t12', 'spine_t6']) { const lim = L.rig.byId[j].limits.latFlex; p.ch[j].latFlex = Math.max(lim[0], Math.min(lim[1], p.ch[j].latFlex)); }
const keyframes = [{ t: 0, pose: 'line' }, { t: 0.8, pose: 'line' }, { t: 1.3, pose: 'd1' }, { t: 1.85, pose: 'd2' }, { t: 2.4, pose: 'bottom' }, { t: 2.7, pose: 'bhold' }, { t: 3.1, pose: 'u1' }, { t: 3.5, pose: 'line' }, { t: 3.75, pose: 'up' }, { t: 4.0, pose: 'top' }, { t: 4.5, pose: 'back' }, { t: 5.0, pose: 'line' }];
const ex = H.module_(meta, contacts, poses, keyframes);
const ball = G.medBall({ d: BALL });
ex.props = [hb.prop, ball];
let width = [1e9, -1e9], padClr = { d: 1e9 }, ballBody = 1e9, latRange = [1e9, -1e9];
const lateral = (W) => { const up = V.norm(V.sub(W.neck_c7.p, W.pelvis.p)), leg = V.norm(V.sub(W.hip_l.p, W.ankle_l.p)); return Math.sign(V.dot(V.cross(leg, up), [0, 0, 1]) || 1) * V.angle(leg, up); };
const rep = H.loopReport(ex, { planted: ['leg_r', 'leg_l'], probe: (W) => { const b = G.medBallAt(W, ball); width = [Math.min(width[0], b.width), Math.max(width[1], b.width)]; ballBody = Math.min(ballBody, G.medBallClear(W, ball).d);
  const c = GB.bodyClear(W, hb, { skip: /^(foot|shank|calf)_/ }); if (c.d < padClr.d) padClr = c; const la = lateral(W); latRange = [Math.min(latRange[0], la), Math.max(latRange[1], la)]; } });
const set = H.setKin(ex);
set('Lateral flexion', 'setup', 'Body in one line along the bench'); set('Lateral flexion', 'peak', `Trunk ${Math.round(-latRange[0])}° down to ${Math.round(latRange[1])}° up from the leg line (spine plus pelvis tip)`);
set('Pelvis on the pad', 'setup', `Pad top ${HIPGAP} cm below the left hip joint`); set('Pelvis on the pad', 'peak', `Body-pad clearance ≥ ${padClr.d} cm (${padClr.shape})`);
set('Bench', 'setup', `${ANGLE}-degree bench, feet scissored ${2 * SCISSOR} cm`); set('Bench', 'peak', 'Feet stay under the roller');
set('Ball', 'setup', `Hugged to the chest (hands ${width[0].toFixed(0)} cm apart)`); set('Ball', 'peak', 'Moves with the thorax');
set('Tempo', 'setup', 'Line 0.8 s'); set('Tempo', 'peak', '1.6 s down, 0.3 s pause, 1.3 s up, 1 s back');
console.log(`Medicine Ball 45 Side Bend: wrote ${L.write(ex)} armErr ${armed.__err.toFixed(2)} pad ${JSON.stringify(hb.prop.params)}\n  ${JSON.stringify(rep)} width ${width.map((v) => v.toFixed(2))} ballBody ${ballBody.toFixed(1)} pad ${JSON.stringify(padClr)} lateral ${latRange.map(r1)}`);
if (rep.slide > 0.05) { console.error('FAIL: planted feet slide'); process.exitCode = 1; }
if (width[1] - width[0] > 1.5 || armed.__err > 1) { console.error('FAIL: hands leave the ball'); process.exitCode = 1; }
if (padClr.d < -1.5) { console.error('FAIL: body sinks into the bench'); process.exitCode = 1; }
