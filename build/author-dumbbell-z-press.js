// Dumbbell Z Press (GymVisual #689012): seated on the floor (a mat) with the legs straight in front, about hip width, heels
// down and toes up (planted leg contacts), trunk tall over the sit bones with no back support. Dumbbells at shoulder height,
// palms forward, elbows under the wrists and a little in front (scapular plane); press up and slightly in to nearly straight
// arms (about 1.6 s), short pause, lower in about 2.1 s. Bilateral, handle grip. Press path from family b4-shoulders2.js;
// the rig sinks SINK cm so the skinned buttocks and heels rest on the mat (measured with b2/b4sh2_floor.mjs).
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const S = require('./families/b4-shoulders2');
const meta = require('./meta/dumbbell-z-press.json');

const base = S.longSit({ sink: Number(process.env.SINK ?? 0.3), lean: Number(process.env.LEAN ?? 0), l5: Number(process.env.L5 ?? 2), hipFlex: Number(process.env.HF ?? 89.5) });
const { poses, err } = S.pressKeys(base.pose, { bottom: 0, p25: 0.25, p50: 0.5, p75: 0.75, top: 1 }, { plane: 30, elev0: 82 });
poses.topHold = clone(poses.top); poses.topHold.ch.elbow_r.flex = poses.topHold.ch.elbow_l.flex = r1(poses.top.ch.elbow_r.flex + 2);
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p]));
const at = (id, f) => +(ph[id].start + (ph[id].end - ph[id].start) * f).toFixed(3);
const keyframes = [{ t: 0, pose: 'bottom' }, { t: ph.press.start, pose: 'bottom' }, { t: at('press', 0.28), pose: 'p25' }, { t: at('press', 0.52), pose: 'p50' }, { t: at('press', 0.76), pose: 'p75' }, { t: ph.top.start, pose: 'top' },
  { t: ph.top.end, pose: 'topHold' }, { t: at('lower', 0.27), pose: 'p75' }, { t: at('lower', 0.52), pose: 'p50' }, { t: at('lower', 0.76), pose: 'p25' }, { t: ph.reset.start, pose: 'bottom' }, { t: meta.timeline.duration, pose: 'bottom' }];

const ex = H.module_(meta, base.contacts, poses, keyframes);
ex.props = [...meta.props.filter((p) => p.kind === 'mat'), ...F.DUMBBELLS];
const rep = S.scan(ex);
F.gate('dumbbell-z-press', rep);
const Wb = L.fk(poses.bottom, base.contacts), Wt = L.fk(poses.top, base.contacts), set = H.setKin(ex);
const tf = V.angle(V.sub(Wb.neck_c7.p, Wb.pelvis.p), [0, 1, 0]);
ex.checks.measure = { name: 'trunkFlexion', min: Math.max(0, Math.floor(tf - 3)), max: Math.ceil(tf + 3) };
set('Sitting posture', 'setup', `hips flexed ≈${Math.round(180 - V.angle(V.sub(Wb.neck_c7.p, Wb.pelvis.p), V.sub(Wb.knee_r.p, Wb.hip_r.p)))}° (trunk to thigh), trunk ≈${Math.round(tf)}° from vertical`); set('Sitting posture', 'peak', 'unchanged (no lean back)');
set('Shoulder elevation', 'setup', `≈${Math.round(S.humElev(Wb))}° (upper arm vs trunk)`); set('Shoulder elevation', 'peak', `≈${Math.round(S.humElev(Wt))}°`);
set('Elbow flexion', 'setup', `≈${Math.round(S.elbowAng(Wb))}°, forearm vertical`); set('Elbow flexion', 'peak', `≈${Math.round(S.elbowAng(Wt))}° (nearly straight)`);
set('Knee flexion', 'setup', `≈${Math.round(H.kneeOf(Wb, 'r'))}°, heels ${Math.round(2 * Wb.ankle_r.p[2])} cm apart`); set('Knee flexion', 'peak', 'unchanged (legs still)');
set('Tempo', 'setup', 'Pause 0.8 s at the shoulders'); set('Tempo', 'peak', '1.6 s up, 0.4 s at the top, 2.1 s down');
console.log(`Dumbbell Z Press: wrote ${L.write(ex)}\n  ${JSON.stringify({ err, root: base.pose.root, tf: +tf.toFixed(1), ...rep })}`);
