// Hyght Dumbbell Fly (GymVisual #14642; page not readable here, movement from weighttraining.guide's description of the
// Hyght fly): back pad at 45 degrees, glutes in the crease, upper back and head on the pad, feet planted (leg contacts). A
// dumbbell in each hand with the palms turned up (supinated) and the elbows softly bent. From arms out to the sides at
// shoulder level, the dumbbells sweep up and in until they meet high over the face (the arms form a V whose tip is over the
// nose), squeeze, and return along the same arc. The palms stay up throughout: the handle runs along the trunk with the arms
// out wide and turns to point across (thumbs out) as the hands meet (b6-04.js flyPathAx). Bilateral; the left arm mirrors the
// right.
const L = require('./lib');
const { V, r1 } = L;
const C = require('./families/b3-chest');
const H = require('./families/hips');
const F6 = require('./families/b6-04');
const meta = require('./meta/hyght-dumbbell-fly.json');
const ANGLE = 45, ELBOW = 20, TO_FEET = +(process.env.TF ?? 4), DIP = +(process.env.DIP ?? 4);
const TOP = JSON.parse(process.env.TOP || '[0.86, 0.5, 0.14]'); // [out of the chest, toward the head, toward the midline] of the upper arm at the top
const { B, base, contacts, foot } = C.benchBase(ANGLE);
const W0 = L.fk(base, contacts), F = C.trunkFrame(W0);
const dTop = V.norm(V.add(V.add(V.scale(F.v, TOP[0]), V.scale(F.u, TOP[1])), V.scale(F.w, TOP[2]))), dBot = C.upperArmDir(F, 90 - TO_FEET, DIP);
const palmTo = (Fx) => V.norm(V.add(Fx.v, V.scale(Fx.u, +(process.env.PU ?? 1)))); // palms up: toward the ceiling and the head, square to the forearm
const raw = F6.flyPathAx(base, { dTop, dBot, elbow: ELBOW, n: 6, palmTo });
const path = raw.map((k) => C.mirrorArm(C.strip(k.pose))); // 0 top ... 6 bottom
const poses = { bottom: path[6], top: path[0] };
for (let i = 1; i <= 5; i++) poses[`k${i}`] = path[i];
poses.topHold = C.mirrorArm(C.strip(F6.flyPathAx(base, { dTop, dBot, elbow: ELBOW - 2, n: 1, palmTo, seeds: [{ shoulder_r: raw[0].pose.ch.shoulder_r, elbow_r: raw[0].pose.ch.elbow_r, wrist_r: raw[0].pose.ch.wrist_r }] })[0].pose));
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p])), D = meta.timeline.duration, kf = [];
kf.push({ t: 0, pose: 'bottom' }, { t: ph.setup.end, pose: 'bottom' });
for (let i = 5; i >= 1; i--) kf.push({ t: ph.raise.start + ((ph.raise.end - ph.raise.start) * (6 - i)) / 6, pose: `k${i}` });
kf.push({ t: ph.raise.end, pose: 'top' }, { t: (ph.squeeze.start + ph.squeeze.end) / 2, pose: 'topHold' }, { t: ph.squeeze.end, pose: 'top' });
for (let i = 1; i <= 5; i++) kf.push({ t: ph.lower.start + ((ph.lower.end - ph.lower.start) * i) / 6, pose: `k${i}` });
kf.push({ t: ph.lower.end, pose: 'bottom' }, { t: D, pose: 'bottom' });
const keyframes = kf.map((k) => ({ t: +k.t.toFixed(3), pose: k.pose }));
const ex = H.module_(meta, contacts, poses, keyframes);
ex.props.find((p) => p.id === 'bench').center = B.prop.center;
let elbowR = [999, -999];
const sw = C.sweep(ex, B, { grips: [{ side: 'r', grip: 'handle' }, { side: 'l', grip: 'handle' }], probe: (W) => { const e = C.elbowFlexOf(W); elbowR = [Math.min(elbowR[0], e), Math.max(elbowR[1], e)]; } });
const Wt = L.fk(poses.top, contacts), Wb = L.fk(poses.bottom, contacts), set = H.setKin(ex), d = F6.d0;
const dbT = C.dbAt(Wt, 'r'), dbB = C.dbAt(Wb, 'r'), nose = Wt.head_c1.p;
const palmUp = (W) => V.dot(V.norm(L.Q.rot(W.wrist_r.q, [1, 0, 0])), [0, 1, 0]);
const costs = raw.map((k) => +k.pose.__cost.toFixed(3));
set('Bench angle', 'setup', `${ANGLE}° back pad, flat seat`); set('Bench angle', 'peak', 'Glutes in the crease, upper back and head on the pad');
set('Arm path', 'setup', `Arms out to the sides about level with the shoulders (upper arm ${d(C.armDip(Wb))} below the back plane)`); set('Arm path', 'peak', `Dumbbells meet over the face: centres ${r1(2 * dbT.c[2])} cm apart, ${r1(dbT.c[1] - nose[1])} cm above and ${r1(dbT.c[0] - nose[0])} cm along from the head joint`);
set('Grip', 'setup', `Palms up (palm normal ${r1(palmUp(Wb))} on the vertical), handles along the trunk`); set('Grip', 'peak', `Palms still up and in toward the face (${r1(palmUp(Wt))}), handles across, thumbs out`);
set('Elbow flexion', 'setup', `${d(C.elbowFlexOf(Wb))} (soft bend)`); set('Elbow flexion', 'peak', `${r1(elbowR[0])}-${r1(elbowR[1])}° through the loop`);
set('Knee flexion', 'setup', `${d(H.kneeOf(W0, 'r'))}, feet ${2 * foot[2]} cm apart`); set('Knee flexion', 'peak', 'Unchanged (feet planted)');
set('Tempo', 'setup', `Arms wide ${ph.setup.end} s`); set('Tempo', 'peak', `${r1(ph.raise.end - ph.raise.start)} s up, ${r1(ph.squeeze.end - ph.squeeze.start)} s squeeze, ${r1(ph.lower.end - ph.lower.start)} s down`);
const tf = V.angle(V.sub(W0.neck_c7.p, W0.pelvis.p), [0, 1, 0]);
ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(tf - 3), max: Math.ceil(tf + 3) };
console.log(`Hyght Dumbbell Fly: wrote ${L.write(ex)}\n  bench ${JSON.stringify(C.benchFit(B, W0))} trunk ${tf.toFixed(1)} costs ${costs} elbow ${elbowR.map(r1)} palmUp ${r1(palmUp(Wb))}/${r1(palmUp(Wt))} top gap z ${r1(2 * dbT.c[2])}\n  sweep ${JSON.stringify(sw)}`);
if (sw.slide > 0.05) { console.error('FAIL: planted foot slides'); process.exitCode = 1; }
if (sw.dbBody > 0.5 || sw.dbBench > 0 || sw.dbFloor < 0 || sw.dbGap < 0 || sw.bodyBench > 2.5 || Math.max(...costs) > 1) { console.error('FAIL: dumbbell or body collision / unsolved key'); process.exitCode = 1; }
