// Side Lunge (GymVisual #297212): stand tall, arms reaching forward; take a wide step out to the right, sit the hips back
// over the right foot (right knee about 85 degrees, left leg straight, both heels down), then push back to the middle.
// Authored stepping right (the player mirrors for the left).
const L = require('./lib');
const { r1, clone } = L;
const { makeFamily } = require('./families/lunge');
const meta = require('./meta/side-lunge.json');

const F = makeFamily({ toe: 12, half: 9 });
const OUT = 70;                 // right ankle lands at z = 70 cm: 79 cm between ankle centres (about one leg length)
const P = (s) => F.pose(Object.assign(clone(s), { arms: F.armsForward }));
const flat = (x, z, extra = {}) => Object.assign({ c: 'flat', x, z }, extra);
const together = { r: flat(0, 9), l: flat(0, -9) }, wide = { r: flat(0, OUT), l: flat(0, -9) };
const stand = F.stand(together, { knee: 4 });
const onLeft = (rf, z, knee, pitch = -3) => F.rootY({ root: [0, 85, z], pitch, spine: { l5: 0, t12: 0, t6: 0 }, feet: { l: flat(0, -9), r: rf } }, knee, 'l');
// wide stance standing tall (both knees soft) and the bottom position (solved: right knee 85, left knee straight, right knee over the toes)
const wideTop = F.rootY({ root: [-2, 85, r1((OUT - 9) / 2)], pitch: -4, spine: { l5: 0, t12: 0, t6: 0 }, feet: wide }, 11, 'r');
// depth f (0 = wide stance, 1 = bottom): right knee bends toward 85 while the left leg stays straight; trunk hinges forward
const BOTTOM_X = -30; // hips sit back about 30 cm behind the ankles
// depth f: pelvis height keeps the left leg straight (knee 6, bisection) and the sideways shift sets the right knee
const depth = (f) => {
  const x = r1(wideTop.root[0] + (BOTTOM_X - wideTop.root[0]) * f), pitch = r1(-4 - 30 * f), spine = { l5: r1(-2 * f), t12: 0, t6: r1(2 * f) };
  const at = (z) => F.rootY({ root: [x, 84, z], pitch, spine, feet: wide }, 10, 'l');
  let lo = wideTop.root[2], hi = OUT, best = null;
  for (let i = 0; i < 40; i++) { const z = (lo + hi) / 2, sp = at(z); best = sp; if (F.kneeOf(F.fk(F.build(sp)), 'r') < 8 + 77 * f) lo = z; else hi = z; }
  best.root[2] = r1(best.root[2]); return best;
};
const bottom = depth(1);
const mix = (a, b, f) => depth(f);
const poses = {
  stand: P(stand),
  lift: P(onLeft(flat(0, 22, { lift: 6, w: 0 }), -1.5, 8)),
  swingOut: P(onLeft(flat(0, 50, { lift: 6, w: 0 }), 4, 10)),
  preLand: P(Object.assign(clone(wideTop), { root: [wideTop.root[0], wideTop.root[1], r1(wideTop.root[2] * 0.6)], feet: { l: flat(0, -9), r: flat(0, OUT, { lift: 0.8, w: 0 }) } })),
  wide: P(wideTop), d15: P(mix(wideTop, bottom, 0.15)), r20: P(mix(wideTop, bottom, 0.2)), d33: P(mix(wideTop, bottom, 0.33)), d66: P(mix(wideTop, bottom, 0.66)), bottom: P(bottom), settle: P(Object.assign(clone(bottom), { root: [bottom.root[0], r1(bottom.root[1] - 0.3), bottom.root[2]] })), r50: P(mix(wideTop, bottom, 0.5)),
  unload: P(Object.assign(clone(wideTop), { root: [wideTop.root[0], wideTop.root[1], r1(wideTop.root[2] * 0.5)], feet: { l: flat(0, -9), r: flat(0, OUT - 3, { lift: 2, w: 0 }) } })),
  swingIn: P(onLeft(flat(0, 34, { lift: 6, w: 0 }), 1, 10)),
  preLand2: P(onLeft(flat(0, 9, { lift: 0.8, w: 0 }), -1, 6)),
  land: P(stand),
};
const keyframes = [{ t: 0, pose: 'stand' }, { t: 0.8, pose: 'stand' }, { t: 0.95, pose: 'lift' }, { t: 1.12, pose: 'swingOut' }, { t: 1.28, pose: 'preLand' }, { t: 1.4, pose: 'wide' }, { t: 1.62, pose: 'd15' },
  { t: 1.85, pose: 'd33' }, { t: 2.2, pose: 'd66' }, { t: 2.6, pose: 'bottom' }, { t: 2.75, pose: 'settle' }, { t: 2.9, pose: 'bottom' }, { t: 3.3, pose: 'r50' }, { t: 3.55, pose: 'r20' }, { t: 3.75, pose: 'wide' },
  { t: 3.9, pose: 'unload' }, { t: 4.08, pose: 'swingIn' }, { t: 4.25, pose: 'preLand2' }, { t: 4.4, pose: 'land' }, { t: 6.0, pose: 'stand' }];
const ex = { schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props: meta.props, contacts: F.contacts,
  timeline: meta.timeline, poses, keyframes, activation: meta.activation, guides: meta.guides, checks: meta.checks };
const rep = F.report(ex), Wb = F.fk(poses.bottom), Ws = F.fk(poses.stand);
const kin = ex.exercise.kinematics, set = (p, f, v) => { const k = kin.find((x) => x.measure.startsWith(p)); if (k) k[f] = v; };
set('Step width', 'setup', '18 cm (hip width)'); set('Step width', 'peak', `${OUT + 9} cm between ankle centres (about one leg length, shorter than the 60%-of-height standard in Riemann 2013)`);
set('Stepping knee', 'setup', `≈${Math.round(F.kneeOf(Ws, 'r'))}°`); set('Stepping knee', 'peak', `≈${Math.round(F.kneeOf(Wb, 'r'))}°`);
set('Straight leg', 'setup', `≈${Math.round(F.kneeOf(Ws, 'l'))}°`); set('Straight leg', 'peak', `≈${Math.round(F.kneeOf(Wb, 'l'))}°`);
set('Trunk inclination', 'setup', `≈${Math.round(F.trunkLean(Ws))}°`); set('Trunk inclination', 'peak', `≈${Math.round(F.trunkLean(Wb))}° forward`);
set('Tempo', 'peak', 'Step out 0.6 s, 1.2 s down, 0.3 s pause, 0.85 s up, step in 0.65 s');
ex.exercise.reference.note = 'Reference used only to identify the movement. No GymVisual media is stored here; this rig, model and animation are original.';
console.log(`Side Lunge: wide ${JSON.stringify(wideTop.root)} bottom ${JSON.stringify(bottom.root)} wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}  hipL ${JSON.stringify(poses.bottom.ch.hip_l)}`);
if (rep.slide > 0.05) { console.error('FAIL: planted foot slides'); process.exitCode = 1; }
