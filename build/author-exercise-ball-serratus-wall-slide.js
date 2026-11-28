// Exercise Ball Serratus Wall Slide (GymVisual #20212, movement reference only): standing tall facing a wall, feet planted
// hip width, a 55 cm exercise ball pinned against the wall by both forearms (little-finger side on the ball, palms facing
// each other, elbows bent about 90 degrees). Pressing the forearms into the ball, roll it up the wall: the arms rise from
// about 50 to 130 degrees of elevation and the shoulder blades wrap forward around the ribs (protraction); pause, then roll
// it back down under control. The ball rolls on the wall (its centre stays the same distance from the wall). Bilateral.
// Gear: the rolling ball of src/gear/g3attach-balls.js, mounted between the right elbow and the left wrist (their midpoint
// keeps its distance to the wall, so the ball keeps touching it). Helpers: build/families/gear-g3attach.js.
const L = require('./lib');
const { R, V, Q, rig, r1, clone } = L;
const H = require('./families/hips');
const EQ = require('./families/equip');
const GA = require('./families/gear-attach');
const G = require('./families/gear-g3attach');

const meta = G.meta({
  id: 'exercise-ball-serratus-wall-slide', name: 'Exercise Ball Serratus Wall Slide', url: 'https://gymvisual.com/videos/20212-exercise-ball-serratus-wall-slide.html',
  aliases: ['Stability ball wall roll-up', 'Ball serratus slide', 'Forearm wall slide on a ball'], bodyPart: 'Shoulders (serratus anterior)', secondary: ['Upper back'], equipment: ['Stability ball', 'Wall'],
  mechanics: 'Isolation (shoulder flexion with scapular protraction)', plane: 'Sagittal', side: 'bilateral', cam: 'side',
  muscles: { target: G.both('serratus'), synergist: [...G.both('ant_deltoid'), ...G.both('upper_traps')], stabilizer: ['core', ...G.both('rhomboids_midtrap')], lengthened: G.both('lats') },
  notes: { serratus_r: 'Protracts and upwardly rotates the shoulder blade as the arms rise against the ball; wall slides and elevation with protraction are serratus anterior favourites (Ekstrom 2003; Ludewig 2004).', serratus_l: 'Protracts and upwardly rotates the shoulder blade as the arms rise (Ekstrom 2003; Ludewig 2004).', ant_deltoid_r: 'Raises the arm (clinical opinion).', ant_deltoid_l: 'Raises the arm (clinical opinion).', upper_traps_r: 'Assists upward rotation; keep it from shrugging (Ludewig 2004).', upper_traps_l: 'Assists upward rotation; keep it from shrugging (Ludewig 2004).', core: 'Stops the ribs flaring as the arms go up (clinical opinion).', rhomboids_midtrap_r: 'Control the shoulder blade on the way down (clinical opinion).', rhomboids_midtrap_l: 'Control the shoulder blade on the way down (clinical opinion).', lats_r: 'Lengthen as the arms rise (clinical opinion).', lats_l: 'Lengthen as the arms rise (clinical opinion).' },
  breathing: { pattern: 'Exhale as the ball rolls up, inhale as it rolls down.', cadence: 'About 1.5 s up, 0.5 s hold, 2 s down' },
  rx: { reps: '10-15', tempo: '1.5-0.5-2-0', progression: 'Lift the forearms off the ball at the top, or add a mini band around the wrists' },
  phases: [
    { id: 'setup', label: 'Forearms on the ball', end: 0.8, cue: 'Face the wall, pin the ball against it with both forearms, elbows bent, palms facing each other.', w: 0.15 },
    { id: 'up', label: 'Roll up', end: 2.2, breath: 'exhale', cue: 'Breathe out, press into the ball and roll it up the wall, letting the shoulder blades wrap forward.', w: 1 },
    { id: 'hold', label: 'Reach', end: 2.7, cue: 'Reach a little higher without shrugging; ribs down.', w: 1 },
    { id: 'down', label: 'Roll down', end: 4.5, breath: 'inhale', cue: 'Breathe in and roll the ball back down slowly, keeping the pressure on.', w: 0.2 },
    { id: 'reset', label: 'Reset', end: 5.0, cue: 'Keep the ball pinned; repeat.', w: 0.15 },
  ],
  mistakes: [['Shrugging the shoulders up', 'Keep the shoulders down away from the ears; reach forward and up.'], ['Arching the low back', 'Ribs down, glutes lightly on.'], ['Losing pressure on the ball', 'Keep pushing into the ball the whole way.'], ['Leaning into the wall', 'Stand tall; the arms do the work.']],
  kin: [['Shoulder elevation', 'From about 50 to 130 degrees (clinical opinion); arm elevation with protraction targets the serratus anterior (Ekstrom 2003)', ['ekstrom2003']], ['Scapular protraction', 'Shoulder blades glide forward as the arms rise (Ludewig 2004)', ['ludewig2004']], ['Elbows', 'About 90 degrees, forearms on the ball (standard technique)', []], ['Ball', 'Rolls up the wall, centre a constant distance from it (standard technique)', []], ['Tempo', 'Controlled (clinical opinion)', []]],
  safety: { cautions: ['Use a ball rated for exercise, inflated firm.', 'Shoulder pinching at the top: stop lower.'], modify: ['Smaller range.'], regressions: ['Wall slide without the ball.'], progressions: ['Mini band around the wrists.', 'Lift-off at the top.'] },
  act: { serratus_r: [0.15, 0.7], serratus_l: [0.15, 0.7], ant_deltoid_r: [0.12, 0.45], ant_deltoid_l: [0.12, 0.45], upper_traps_r: [0.08, 0.32], upper_traps_l: [0.08, 0.32], core: [0.1, 0.2], rhomboids_midtrap_r: [0.1, 0.2], rhomboids_midtrap_l: [0.1, 0.2] },
  props: [{ id: 'wall', kind: 'wall', center: [100, 0, 0], size: [10, 240, 300] }],
  guides: [{ id: 'elbowPath', kind: 'path', joint: 'elbow_r', from: 0.8, to: 2.2, label: 'Forearms roll the ball up' }],
  checks: { stillJoints: ['ankle_r', 'ankle_l'], plantedContacts: ['leg_r', 'leg_l'] },
});

const BALL_D = 55, BR = BALL_D / 2, HALF = 11, TOE = 6, ELBZ = 2, A0 = 58, A1 = 124;
const FA = L.FA, FR = rig.shapes.find((x) => x.id === 'forearm_r').r;
const contacts = ['r', 'l'].map((s) => H.legC(s, { rot: H.footQ(0, s === 'r' ? -TOE : TOE) }));
const st = L.POSES.standing({ stance: HALF, toeOut: TOE }).pose;
const FOOT = { r: [0, L.ANKLE_H, HALF], l: [0, L.ANKLE_H, -HALF] };
const stand = (() => { const p = clone(st); p.root.pos = [0, 90.2, 0]; p.root.rot = { pitch: -2 }; p.ik = { leg_r: { target: FOOT.r, weight: 1 }, leg_l: { target: FOOT.l, weight: 1 } }; let q = H.fitLeg(p, 'r', contacts[0], FOOT.r, { rot: -TOE }); q = H.fitLeg(q, 'l', contacts[1], FOOT.l, { rot: -TOE }); return q; })();
// Elbows swing up through the sagittal plane (elevation A0 -> A1) while the shoulder blades protract a little. The ball is
// mounted between the right elbow and the left wrist: their midpoint must keep its distance to the wall, so the forearm
// tilt toward the wall (T) is set per key so that 2 * elbow.x + FA * sin(T) stays constant (the forearms tip forward a
// little more at the ends of the range, where the elbows are closer to the body).
const scAt = (f) => ({ protract: r1(4 + 8 * f), elevate: r1(2 + 10 * f) });
const elbowAt = (f) => { const p = clone(stand); p.ch.sc_r = scAt(f); p.ch.sc_l = scAt(f); const S = L.fk(p).shoulder_r.p, a = (A0 + (A1 - A0) * f) * R.DEG; return V.add(S, [L.UA * Math.sin(a), -L.UA * Math.cos(a), -ELBZ]); };
let KX = -1e9; for (let i = 0; i <= 40; i++) KX = Math.max(KX, 2 * elbowAt(i / 40)[0]);
KX += FA * Math.sin(4 * R.DEG);
const tiltAt = (f) => Math.asin(Math.min(1, (KX - 2 * elbowAt(f)[0]) / FA));
function poseAt(f) {
  const p = clone(stand); p.ch.sc_r = scAt(f); p.ch.sc_l = scAt(f);
  p.ch.neck_c7 = { rot: 0, flex: r1(-4 * f) }; p.ch.head_c1 = { rot: 0, flex: r1(-4 * f) };
  const T = tiltAt(f), E = elbowAt(f), Wt = V.add(E, [FA * Math.sin(T), FA * Math.cos(T), 0]);
  // shoulder and elbow onto the elbow / wrist targets (the wrist stays neutral: palms facing each other, thumbs up)
  const paths = ['ch.shoulder_r.plane', 'ch.shoulder_r.elev', 'ch.shoulder_r.axial', 'ch.elbow_r.flex'];
  p.ch.shoulder_r = { plane: 90, elev: 60 + 70 * f, axial: -90 }; p.ch.elbow_r = { flex: 110 }; p.ch.wrist_r = { pron: 0, flex: 0, dev: 0 };
  const q = L.solvePose(p, paths, [L.obj.at('elbow_r', E, 3), L.obj.at('wrist_r', Wt, 3), (W, qq) => [(qq.ch.shoulder_r.axial + 90) * 0.005]], { iters: 500 }).pose;
  for (const j of ['shoulder', 'elbow', 'wrist']) q.ch[`${j}_l`] = clone(q.ch[`${j}_r`]);
  q.__err = Math.max(V.len(V.sub(L.fk(q).elbow_r.p, E)), V.len(V.sub(L.fk(q).wrist_r.p, Wt)));
  return q;
}
let worst = 0; const pa = (f) => { const q = poseAt(f); worst = Math.max(worst, q.__err); delete q.__err; return q; };
const { poses, keyframes } = G.rep(pa, { top: 2.2, hold: 2.7, back: 4.5 });
const ex = H.module_(meta, contacts, poses, keyframes);
// ball: touching both forearms at mid-length (on the wall side), centre on the midline; wall touching the ball
const Wr = L.fk(poses.rest, contacts);
const T0 = tiltAt(0), fmid = V.lerp(Wr.elbow_r.p, Wr.wrist_r.p, 0.55), nrm = [Math.cos(T0), -Math.sin(T0), 0]; // toward the wall, perpendicular to the forearm
const rFore = (FR[0] + FR[1]) / 2, dz = Math.abs(fmid[2]);
// centre on z = 0: the ball touches each forearm, which sits dz off the midline
const off = Math.sqrt(Math.max(0, (BR + rFore) ** 2 - dz * dz));
let C = [fmid[0] + nrm[0] * off, fmid[1] + nrm[1] * off, 0];
// centre the ball's forearm contact over the loop (it presses in or eases off by about a centimetre)
const tlx = R.buildTimeline(ex);
for (let it = 0; it < 3; it++) {
  const bp = G.rollingBall(Wr, 'elbow_r', 'wrist_l', C, { d: BALL_D }); let mn = 1e9, mx = -1e9;
  for (let i = 0; i <= 200; i++) { const W = R.evalPose(rig, tlx.pose((ex.timeline.duration * i) / 200), contacts), b = G.rollingBallAt(W, bp), ball = { c: b.c, r: BR, rx: BR, ry: BR }; const g = Math.min(GA.shapeBallGap(W, ball, 'forearm_r'), GA.shapeBallGap(W, ball, 'forearm_l')); mn = Math.min(mn, g); mx = Math.max(mx, g); }
  C = V.add(C, V.scale(nrm, -(mn + mx) / 2));
}
const ballProp = G.rollingBall(Wr, 'elbow_r', 'wrist_l', C, { d: BALL_D, squash: 0.02 });
const WALL_X = r1(C[0] + BR);
const wall = ex.props.find((p) => p.kind === 'wall'); wall.center = [r1(WALL_X + wall.size[0] / 2), 0, 0];
ex.props = ex.props.concat([ballProp]);
let bodyId = null, fore = [1e9, -1e9], wallGap = [1e9, -1e9], bodyBall = 1e9, elev = [1e9, -1e9];
const rep = H.loopReport(ex, { planted: ['leg_r', 'leg_l'], probe: (W, pz) => { const b = G.rollingBallAt(W, ballProp), ball = { c: b.c, r: BR, rx: BR, ry: BR };
  const g = Math.min(GA.shapeBallGap(W, ball, 'forearm_r'), GA.shapeBallGap(W, ball, 'forearm_l')); fore = [Math.min(fore[0], g), Math.max(fore[1], g)];
  const wg = WALL_X - (b.c[0] + BR); wallGap = [Math.min(wallGap[0], wg), Math.max(wallGap[1], wg)]; { const bc = GA.ballClear(W, ball, { skip: /^(forearm|hand|thumb)_/ }); if (bc.d < bodyBall) { bodyBall = bc.d; bodyId = bc.id; } } elev = [Math.min(elev[0], pz.ch.shoulder_r.elev), Math.max(elev[1], pz.ch.shoulder_r.elev)]; } });
const set = H.setKin(ex);
set('Shoulder elevation', 'setup', `≈${Math.round(poses.rest.ch.shoulder_r.elev)}° (joint channel)`); set('Shoulder elevation', 'peak', `≈${Math.round(poses.top.ch.shoulder_r.elev)}°`);
set('Scapular protraction', 'setup', `sc protraction ${poses.rest.ch.sc_r.protract}°`); set('Scapular protraction', 'peak', `${poses.top.ch.sc_r.protract}°`);
set('Elbows', 'setup', `≈${Math.round(poses.rest.ch.elbow_r.flex)}°`); set('Elbows', 'peak', `≈${Math.round(poses.top.ch.elbow_r.flex)}°`);
set('Ball', 'setup', `${BALL_D} cm ball between the forearms and the wall (forearm gap ${fore[0].toFixed(1)} to ${fore[1].toFixed(1)} cm)`); set('Ball', 'peak', `Rolls ${Math.round(L.fk(poses.top, contacts).elbow_r.p[1] - Wr.elbow_r.p[1])} cm up the wall`);
set('Tempo', 'setup', 'Set 0.8 s'); set('Tempo', 'peak', '1.4 s up, 0.5 s hold, 1.8 s down');
const trunkMax = (() => { let m = 0; for (const p of Object.values(poses)) m = Math.max(m, G.trunkLean(L.fk(p, contacts))); return m; })();
ex.checks.measure = { name: 'trunkFlexion', min: 0, max: Math.ceil(trunkMax + 3) };
console.log(`Exercise Ball Serratus Wall Slide: wrote ${L.write(ex)} armErr ${worst.toFixed(2)}\n  ${JSON.stringify(rep)} foreGap ${fore.map((v) => v.toFixed(2))} wallGap ${wallGap.map((v) => v.toFixed(2))} bodyBall ${bodyBall.toFixed(1)} ${bodyId} elev ${elev.map(r1)} wallX ${WALL_X}`);
if (rep.slide > 0.05) { console.error('FAIL: planted feet slide'); process.exitCode = 1; }
if (worst > 1) { console.error('FAIL: arm solve misses'); process.exitCode = 1; }
if (fore[0] < -1.5 || fore[1] > 1.5 || Math.abs(wallGap[0]) > 0.5 || Math.abs(wallGap[1]) > 0.5) { console.error('FAIL: ball loses the forearms or the wall'); process.exitCode = 1; }
if (bodyBall < -1.2) { console.error('FAIL: ball inside the body'); process.exitCode = 1; }
