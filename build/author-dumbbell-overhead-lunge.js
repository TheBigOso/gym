// Dumbbell Overhead Lunge (GymVisual #509512, single-arm overhead lunge): one dumbbell locked out overhead in the right
// hand (palm in, arm vertical in the world whatever the trunk does), left hand on the hip; take a long step forward with the
// right foot and land heel first while the left heel rolls up onto the ball of the foot; lower until the front knee is about
// 90 degrees and the back knee is just above the floor; push off the front foot to step back to standing. Authored right
// leg stepping with the dumbbell on the same side (the player mirrors). Built on build/author-dumbbell-lunge.js.
const L = require('./lib');
const { r1, clone } = L;
const { makeFamily, BALL_SHIFT } = require('./families/lunge');
const B = require('./families/b3-legs');
const meta = require('./meta/dumbbell-overhead-lunge.json');
const K = require('./families/b4-squats2');

const F = makeFamily({ toe: 6, half: 9 });
const STEP = 80, BACK = r1(BALL_SHIFT); // right ankle lands 80 cm ahead; the left rolls onto its ball (ankle moves 7.8 cm forward)
const S = F.split('r', STEP, BACK);
// right arm: wrist straight above the shoulder (world vertical), elbow locked, palm in; left hand on the hip
const LOCK = { 'ch.shoulder_r.plane': 6.7, 'ch.shoulder_r.elev': 158, 'ch.shoulder_r.axial': -96, 'ch.elbow_r.flex': 13, 'ch.wrist_r.pron': 17, 'ch.wrist_r.flex': -8, 'ch.wrist_r.dev': -1 };
let armErr = 0;
const arms = (p) => {
  const hip = F.handsOnHips(p);
  const q = K.pressArm(p, { wrist: [0, r1(L.reach(5) - 0.3), -1], elbowHint: [0.2, 0, 1], sc: { protract: 4, elevate: 18 } }, LOCK);
  armErr = Math.max(armErr, q.__err.wrist); delete q.__err;
  for (const j of ['shoulder_l', 'elbow_l', 'wrist_l', 'sc_l']) q.ch[j] = clone(hip.ch[j]);
  return q;
};
const P = (s) => F.pose(Object.assign(clone(s), { arms }));
const stand = F.stand({ r: { c: 'flat', x: 0 }, l: { c: 'flat', x: 0 } }, { knee: 4 });
// single-leg stance on the left (flat) while the right swings
const onLeft = (rf, x, knee, pitch = -4, z = -1.5) => F.rootY({ root: [x, 85, z], pitch, spine: { l5: -1, t12: 0, t6: 0 }, feet: { l: { c: 'flat', x: 0 }, r: rf } }, knee, 'l');
// Root and pitch part-way between two specs (for the heel-roll keys)
const mixRoot = (a, b, f, feet) => ({ root: a.root.map((v, i) => r1(v + (b.root[i] - v) * f)), pitch: r1(a.pitch + (b.pitch - a.pitch) * f), spine: a.spine, feet });
const withFeet = (s, feet, dx = 0) => Object.assign(clone(s), { root: [r1(s.root[0] + dx), s.root[1], s.root[2]], feet });
const SP = {
  reach: onLeft({ c: 'flat', x: 52, lift: 5, w: 0 }, 16, 14, -6),
  heel: withFeet(S.top, { r: { c: 'flat', x: STEP, lift: 0.6, w: 0 }, l: { c: 'ball', x: BACK } }, -3),
  unload: withFeet(S.top, { r: { c: 'flat', x: STEP - 2, lift: 2, w: 0 }, l: { c: 'ball', x: BACK } }, -6),
  rollDown: onLeft({ c: 'flat', x: 62, lift: 5, w: 0 }, 28, 22, -8),
};
const roll = (a, b, f, pitch, rx, rlift) => P(mixRoot(a, b, f, { l: { c: 'roll', pitch, ballX: F.BALL_X }, r: { c: 'flat', x: rx, lift: rlift, w: 0 } }));
const poses = {
  stand: P(stand),
  lift: P(onLeft({ c: 'flat', x: 10, lift: 6, w: 0 }, 2, 8)),
  reach: P(SP.reach),
  up16: roll(SP.reach, SP.heel, 0.25, 16, 59, 3.8), up32: roll(SP.reach, SP.heel, 0.5, 32, 66, 2.7), up48: roll(SP.reach, SP.heel, 0.75, 48, 73, 1.6),
  heel: P(SP.heel),
  top: P(S.top), d33: P(S.at(0.33)), d66: P(S.at(0.66)), bottom: P(S.bottom), settle: P(S.at(0.99)), r50: P(S.at(0.5)),
  unload: P(SP.unload),
  dn48: roll(SP.unload, SP.rollDown, 0.25, 48, 74, 2.8), dn32: roll(SP.unload, SP.rollDown, 0.5, 32, 70, 3.5), dn16: roll(SP.unload, SP.rollDown, 0.75, 16, 66, 4.3),
  rollDown: P(SP.rollDown), // back heel down before the weight passes back over it
  swingBack: P(onLeft({ c: 'flat', x: 36, lift: 7, w: 0 }, 6, 12, -6)),
  preLand: P(onLeft({ c: 'flat', x: 0, lift: 0.8, w: 0 }, 1, 6)),
  land: P(stand),
};
const keyframes = [{ t: 0, pose: 'stand' }, { t: 0.8, pose: 'stand' }, { t: 1.0, pose: 'lift' }, { t: 1.2, pose: 'reach' }, { t: 1.265, pose: 'up16' }, { t: 1.33, pose: 'up32' }, { t: 1.395, pose: 'up48' }, { t: 1.46, pose: 'heel' }, { t: 1.6, pose: 'top' },
  { t: 1.95, pose: 'd33' }, { t: 2.3, pose: 'd66' }, { t: 2.6, pose: 'bottom' }, { t: 2.75, pose: 'settle' }, { t: 2.9, pose: 'bottom' }, { t: 3.3, pose: 'r50' }, { t: 3.65, pose: 'top' },
  { t: 3.8, pose: 'unload' }, { t: 3.85, pose: 'dn48' }, { t: 3.9, pose: 'dn32' }, { t: 3.95, pose: 'dn16' }, { t: 4.0, pose: 'rollDown' }, { t: 4.15, pose: 'swingBack' }, { t: 4.35, pose: 'preLand' }, { t: 4.5, pose: 'land' }, { t: 6.0, pose: 'stand' }];
const ex = { schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props: meta.props, contacts: F.contacts,
  timeline: meta.timeline, poses, keyframes, activation: meta.activation, guides: meta.guides, checks: meta.checks };
ex.props = [B.heldProp('r')];
const rep2 = K.scan(ex, { holds: [{ side: 'r' }], planted: ['leg_r', 'leg_l', 'ball_l'] });
const rep = F.report(ex), Wb = F.fk(poses.bottom), Ws = F.fk(poses.stand);
const kin = ex.exercise.kinematics, set = (p, f, v) => { const k = kin.find((x) => x.measure.startsWith(p)); if (k) k[f] = v; };
set('Step length', 'setup', 'Feet together (hip width)'); set('Step length', 'peak', `${STEP} cm forward (${r1(STEP - BACK)} cm between ankle centres once the back heel is up)`);
set('Front knee', 'setup', `≈${Math.round(F.kneeOf(Ws, 'r'))}° standing`); set('Front knee', 'peak', `≈${Math.round(F.kneeOf(Wb, 'r'))}°`);
set('Back knee', 'setup', '–'); set('Back knee', 'peak', `≈${Math.round(F.kneeOf(Wb, 'l'))}°, ${r1(Wb.knee_l.p[1])} cm above the floor (knee joint centre)`);
set('Trunk inclination', 'setup', `≈${Math.round(F.trunkLean(Ws))}°`); set('Trunk inclination', 'peak', `≈${Math.round(F.trunkLean(Wb))}°`);
const Wt0 = F.fk(poses.stand), armV = (W) => L.V.angle(L.V.sub(W.wrist_r.p, W.shoulder_r.p), [0, 1, 0]);
set('Overhead arm', 'setup', `Wrist ${r1(armV(Wt0))}° from vertical over the shoulder, elbow ≈${Math.round(poses.stand.ch.elbow_r.flex)}°`); set('Overhead arm', 'peak', `≈${r1(armV(Wb))}° from vertical at the bottom (the arm stays vertical in the world)`);
set('Tempo', 'setup', 'Stand 0.8 s'); set('Tempo', 'peak', 'Step 0.8 s, 1.0 s down, 0.3 s pause, 0.75 s up, step back 0.85 s');
ex.exercise.reference.note = K.NOTE;
console.log(`Dumbbell Overhead Lunge: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}\n  clear ${JSON.stringify(rep2.clear)} dbFloor ${rep2.dbFloor} jump ${JSON.stringify(rep2.jump)} armErr ${r1(armErr)}`);
K.gate('dumbbell-overhead-lunge', rep2, { maxJump: 6 });
if (rep.slide > 0.05) { console.error('FAIL: planted foot slides'); process.exitCode = 1; }
