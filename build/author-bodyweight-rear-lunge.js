// Bodyweight Rear Lunge (GymVisual #158112): stand tall, hands on hips; step the left foot straight back and land on its
// ball, lower until the right (front) knee is about 90 degrees and the back knee is just above the floor, drive up through
// the front heel and step back in. The right foot stays planted the whole loop. Authored right leg working (left steps).
const L = require('./lib');
const { r1, clone } = L;
const { makeFamily } = require('./families/lunge');
const meta = require('./meta/bodyweight-rear-lunge.json');

const F = makeFamily({ toe: 6, half: 9 });
const BACK = -80; // left ankle lands 80 cm behind the right (same split as the Split Squat)
const S = F.split('r', 0, BACK);
const armsP = (s) => Object.assign(s, { arms: F.handsOnHips });
const standFeet = { r: { c: 'flat', x: 0 }, l: { c: 'flat', x: 0 } };
const stand = F.stand(standFeet, { knee: 4 });
// single-leg stance on the right while the left foot swings (root height from the right knee)
const swing = (lf, x, knee, z = 1.5, pitch = -4) => F.rootY({ root: [x, 85, z], pitch, spine: { l5: -1, t12: 0, t6: 0 }, feet: { r: { c: 'flat', x: 0 }, l: lf } }, knee, 'r');
const P = (s) => F.pose(armsP(clone(s)));
const poses = {
  stand: P(stand),
  lift: P(swing({ c: 'flat', x: -8, lift: 5, w: 0 }, -1, 8)),
  reach: P(swing({ c: 'ball', x: -55, lift: 6, w: 0 }, r1(S.top.root[0] * 0.6), 14, 1, -10)),
  touch: P(Object.assign(clone(S.top), { feet: { r: { c: 'flat', x: 0 }, l: { c: 'ball', x: BACK, w: 0 } } })),
  top: P(S.top), d33: P(S.at(0.33)), d66: P(S.at(0.66)), bottom: P(S.bottom), settle: P(S.at(0.99)), r50: P(S.at(0.5)),
  unload: P(Object.assign(clone(S.top), { root: [r1(S.top.root[0] + 4), S.top.root[1], 0], feet: { r: { c: 'flat', x: 0 }, l: { c: 'ball', x: BACK + 2, lift: 2, w: 0 } } })),
  swingIn: P(swing({ c: 'flat', x: -35, lift: 8, w: 0 }, -6, 12, 1.5, -8)),
  preLand: P(swing({ c: 'flat', x: 0, lift: 0.8, w: 0 }, -1, 6)),
  land: P(stand),
};
const keyframes = [{ t: 0, pose: 'stand' }, { t: 0.8, pose: 'stand' }, { t: 1.0, pose: 'lift' }, { t: 1.25, pose: 'reach' }, { t: 1.45, pose: 'touch' }, { t: 1.6, pose: 'top' },
  { t: 1.95, pose: 'd33' }, { t: 2.3, pose: 'd66' }, { t: 2.6, pose: 'bottom' }, { t: 2.75, pose: 'settle' }, { t: 2.9, pose: 'bottom' }, { t: 3.3, pose: 'r50' }, { t: 3.65, pose: 'top' },
  { t: 3.85, pose: 'unload' }, { t: 4.1, pose: 'swingIn' }, { t: 4.35, pose: 'preLand' }, { t: 4.5, pose: 'land' }, { t: 6.0, pose: 'stand' }];
const ex = { schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props: meta.props, contacts: F.contacts,
  timeline: meta.timeline, poses, keyframes, activation: meta.activation, guides: meta.guides, checks: meta.checks };
const rep = F.report(ex), Wt = F.fk(poses.top), Wb = F.fk(poses.bottom);
const kin = ex.exercise.kinematics, set = (p, f, v) => { const k = kin.find((x) => x.measure.startsWith(p)); if (k) k[f] = v; };
set('Step length', 'setup', 'Feet together (hip width)'); set('Step length', 'peak', `${-BACK} cm back between ankle centres`);
set('Front knee', 'setup', `≈${Math.round(F.kneeOf(F.fk(poses.stand), 'r'))}° standing`); set('Front knee', 'peak', `≈${Math.round(F.kneeOf(Wb, 'r'))}°`);
set('Back knee', 'setup', '–'); set('Back knee', 'peak', `≈${Math.round(F.kneeOf(Wb, 'l'))}°, ${r1(Wb.knee_l.p[1])} cm above the floor (knee joint centre)`);
set('Trunk inclination', 'setup', `≈${Math.round(F.trunkLean(F.fk(poses.stand)))}°`); set('Trunk inclination', 'peak', `≈${Math.round(F.trunkLean(Wb))}°`);
set('Tempo', 'setup', 'Stand 0.8 s'); set('Tempo', 'peak', 'Step back 0.8 s, 1.0 s down, 0.3 s pause, 0.75 s up, step in 0.85 s');
ex.exercise.reference.note = 'Reference used only to identify the movement. No GymVisual media is stored here; this rig, model and animation are original.';
console.log(`Bodyweight Rear Lunge: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}`);
if (rep.slide > 0.05) { console.error('FAIL: planted foot slides'); process.exitCode = 1; }
