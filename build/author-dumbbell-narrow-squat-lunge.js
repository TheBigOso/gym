// Dumbbell Narrow Squat Lunge (GymVisual "Dumbbell Narrow Squat Lunge", movement reference only; the page could not be read,
// so the movement is taken from the name): a squat-plus-lunge combination with a dumbbell hanging in each hand at the sides.
// Feet close together (ankle centres 14 cm apart): squat down to about parallel with the knees travelling forward and stand
// up; then step the left foot straight back into a reverse lunge (landing on the ball of the foot), lower until the right
// knee is about 90 degrees and the back knee is just above the floor, drive up through the right heel and step back in.
// The right foot stays planted the whole loop. Authored with the right leg working in the lunge (the player mirrors).
// Built on the lunge family (rear lunge stepping, narrow-stance squat on the same flat contacts) and b3-legs armsHang.
const L = require('./lib');
const { r1, clone } = L;
const { makeFamily } = require('./families/lunge');
const B = require('./families/b3-legs');
const K = require('./families/b4-squats2');
const G = require('./families/b6-03');
const meta = require('./meta/dumbbell-narrow-squat-lunge.json');

const HALF = 7, F = makeFamily({ toe: 6, half: HALF });
const BACK = -80;
const HANG = { out: +(process.env.OUT ?? 8), fwd: 1 };
const arms = (p) => { const q = B.armsHang(p, HANG); delete q.__armCost; return q; };
const S = F.split('r', 0, BACK, { z: 0 });
const P = (s) => F.pose(Object.assign(clone(s), { arms }));
const standFeet = { r: { c: 'flat', x: 0 }, l: { c: 'flat', x: 0 } };
const stand = F.stand(standFeet, { knee: 4 });
// narrow squat: depth f (knee 4 -> 104, hips back, trunk leaning up to about 26 degrees)
const sq = (f) => { const g = 1 - Math.pow(1 - f, 1.5); return F.rootY({ root: [r1(-18 * g), 85, 0], pitch: r1(-36 * g), spine: { l5: r1(-4 * g), t12: r1(-2 * g), t6: r1(1 * g) }, feet: standFeet }, 4 + 100 * f, 'r'); };
const swing = (lf, x, knee, z = 1.5, pitch = -4) => F.rootY({ root: [x, 85, z], pitch, spine: { l5: -1, t12: 0, t6: 0 }, feet: { r: { c: 'flat', x: 0 }, l: lf } }, knee, 'r');
const poses = {
  stand: P(stand), s25: P(sq(0.25)), s50: P(sq(0.5)), s75: P(sq(0.75)), sBottom: P(sq(1)), sSettle: P(Object.assign(sq(1), { root: [sq(1).root[0], r1(sq(1).root[1] - 0.3), 0] })),
  lift: P(swing({ c: 'flat', x: -8, z: -HALF, lift: 5, w: 0 }, -1, 8)),
  reach: P(swing({ c: 'ball', x: -55, z: -HALF, lift: 6, w: 0 }, r1(S.top.root[0] * 0.6), 14, 1, -10)),
  touch: P(Object.assign(clone(S.top), { feet: { r: { c: 'flat', x: 0 }, l: { c: 'ball', x: BACK, w: 0 } } })),
  top: P(S.top), d33: P(S.at(0.33)), d66: P(S.at(0.66)), bottom: P(S.bottom), settle: P(S.at(0.99)), r50: P(S.at(0.5)),
  unload: P(Object.assign(clone(S.top), { root: [r1(S.top.root[0] + 4), S.top.root[1], 0], feet: { r: { c: 'flat', x: 0 }, l: { c: 'ball', x: BACK + 2, lift: 2, w: 0 } } })),
  swingIn: P(swing({ c: 'flat', x: -35, z: -HALF, lift: 8, w: 0 }, -6, 12, 1.5, -8)),
  preLand: P(swing({ c: 'flat', x: 0, z: -HALF, lift: 0.8, w: 0 }, -1, 6)),
};
const keyframes = [{ t: 0, pose: 'stand' }, { t: 0.8, pose: 'stand' }, { t: 1.2, pose: 's25' }, { t: 1.6, pose: 's50' }, { t: 2.0, pose: 's75' }, { t: 2.4, pose: 'sBottom' },
  { t: 2.5, pose: 'sSettle' }, { t: 2.6, pose: 'sBottom' }, { t: 3.0, pose: 's50' }, { t: 3.5, pose: 'stand' }, { t: 3.8, pose: 'stand' },
  { t: 4.0, pose: 'lift' }, { t: 4.25, pose: 'reach' }, { t: 4.45, pose: 'touch' }, { t: 4.6, pose: 'top' }, { t: 4.95, pose: 'd33' }, { t: 5.3, pose: 'd66' }, { t: 5.6, pose: 'bottom' },
  { t: 5.75, pose: 'settle' }, { t: 5.9, pose: 'bottom' }, { t: 6.3, pose: 'r50' }, { t: 6.65, pose: 'top' }, { t: 6.85, pose: 'unload' }, { t: 7.1, pose: 'swingIn' }, { t: 7.35, pose: 'preLand' },
  { t: 7.5, pose: 'stand' }, { t: 8.2, pose: 'stand' }];
const ex = { schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props: [B.heldProp('r'), B.heldProp('l')], contacts: F.contacts,
  timeline: meta.timeline, poses, keyframes, activation: meta.activation, guides: meta.guides, checks: meta.checks };
ex.exercise.reference.note = G.NOTE;
const rep = K.scan(ex, { holds: [{ side: 'r' }, { side: 'l' }], planted: ['leg_r', 'leg_l', 'ball_l'] });
const fr = F.report(ex), Ws = F.fk(poses.stand), Wq = F.fk(poses.sBottom), Wb = F.fk(poses.bottom);
const lim = G.limits(ex), set = G.setKin(ex);
set('Stance', 'setup', `Feet close together (ankle centres ${2 * HALF} cm apart)`); set('Stance', 'peak', `Lunge: left ankle ${-BACK} cm behind the right`);
set('Squat knee flexion', 'setup', `≈${Math.round(F.kneeOf(Ws, 'r'))}° standing`); set('Squat knee flexion', 'peak', `≈${Math.round(F.kneeOf(Wq, 'r'))}° (hip ${Math.round(poses.sBottom.ch.hip_r.flex)}°, trunk ≈${Math.round(F.trunkLean(Wq))}° forward)`);
set('Front knee', 'setup', '–'); set('Front knee', 'peak', `≈${Math.round(F.kneeOf(Wb, 'r'))}° at the bottom of the lunge`);
set('Back knee', 'setup', '–'); set('Back knee', 'peak', `≈${Math.round(F.kneeOf(Wb, 'l'))}°, ${r1(Wb.knee_l.p[1])} cm above the floor (knee joint centre)`);
set('Dumbbells', 'setup', 'Hanging at the sides, palms in'); set('Dumbbells', 'peak', `Straight down beside the legs (≥${rep.clear.d} cm from the body on the rig shapes, ${rep.dbFloor} cm off the floor at the lowest)`);
set('Tempo', 'setup', 'Stand 0.8 s'); set('Tempo', 'peak', 'Squat: 1.6 s down, 0.2 s pause, 0.9 s up; lunge: step back 0.8 s, 1.0 s down, 0.3 s pause, 0.75 s up, step in 0.85 s');
console.log(`Dumbbell Narrow Squat Lunge: wrote ${L.write(ex)}\n  ${JSON.stringify(fr)}\n  clear ${JSON.stringify(rep.clear)} dbFloor ${rep.dbFloor} jump ${JSON.stringify(rep.jump)} dorsi ${JSON.stringify(rep.dorsiR)} limits ${JSON.stringify(lim)}`);
K.gate('dumbbell-narrow-squat-lunge', rep, { maxJump: 6 });
if (fr.slide > 0.05) { console.error('FAIL: planted foot slides'); process.exitCode = 1; }
if (Object.keys(lim).length) { console.error('FAIL: joint limits'); process.exitCode = 1; }
if (rep.dorsiR[1] > 35) { console.error('FAIL: ankle dorsiflexion beyond the rig limit'); process.exitCode = 1; }
G.gateMeasure('dumbbell-narrow-squat-lunge', ex, fr.kneeR[1]);
