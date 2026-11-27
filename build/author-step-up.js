// Step-up (GymVisual #080112): stand facing a 40 cm box, hands on hips. Lift the right foot onto the box, drive through
// it to stand up (the left heel peels up and the left foot follows onto the box), stand tall, then step the left foot
// down behind (the right leg lowers the body, the left lands on the ball of the foot and rolls the heel down) and bring
// the right foot down beside it. The right leg leads the whole loop (authored right; the player mirrors).
const L = require('./lib');
const { r1, clone } = L;
const { makeSingle, com, dorsiOf } = require('./families/single');
const meta = require('./meta/step-up.json');

const F = makeSingle({ toe: 6, half: 9 });
const box = meta.props.find((p) => p.kind === 'box');
const H = box.size[1], EDGE = box.center[0] - box.size[0] / 2;   // 40 cm tall, near edge 22 cm in front of the ankles
const BX = EDGE + 11;                                             // ankle on the box: heel about 5 cm in from the edge
const BALL_L = 7.8;                                               // left ankle on its ball with the ball of the foot where the flat foot left it
const fl = (x, z, o = {}) => Object.assign({ c: 'flat', x, z }, o);
const ON_BOX = fl(BX, 9, { lift: H }), FLOOR_R = fl(0, 9), FLOOR_L = fl(0, -9);
const sp = (root, pitch, feet, spine = { l5: -2, t12: 0, t6: 0 }) => ({ root, pitch, spine, feet, arms: F.handsOnHips });
const P = (s) => F.pose(s);
const knee = (s) => (W) => [(F.kneeOf(W, s[0]) - s[1]) * 0.5];
const dorsi = (side, d) => (W) => [(dorsiOf(W, side) - d) * 0.5];
const comAt = (cx, cz, w = 1) => (W) => { const c = com(W); return [(c[0] - cx) * w, (c[2] - cz) * w]; };

// on the left foot (floor) while the right swings: centre of mass over the left foot
const onLeft = (rf, kneeL = 5, pitch = -3) => F.balanceTall(sp([2, 88, -6], pitch, { l: FLOOR_L, r: rf }), { knee: kneeL, side: 'l', cx: 4, cz: -9 });
// on the right foot (box) while the left swings
const onBoxTall = (lf, kneeR = 4, pitch = -3) => F.balanceTall(sp([BX - 4, 125, 6], pitch, { r: ON_BOX, l: lf }), { knee: kneeR, cx: BX + 4, cz: 9 });
const onBox = (lf, kneeR, pitch, d) => F.solve(sp([BX - 6, 110, 8], pitch, { r: ON_BOX, l: lf }), ['root.0', 'root.1', 'root.2'],
  [knee(['r', kneeR]), d == null ? (W) => [(com(W)[0] - BX - 3) * 0.5] : dorsi('r', d), (W) => [com(W)[2] - 9]]);
// both feet planted (right on the box, left on the floor): left knee nearly straight, right ankle dorsiflexion set
// (root height by bisection on the left knee so the floor foot always reaches; root x by bisection on the right ankle)
const split = (pitch, dR, lf = FLOOR_L) => {
  const kl = lf.c === 'ball' ? 4 : 7, at = (x) => F.rootY(sp([x, 90, 0], pitch, { r: ON_BOX, l: lf }), kl, 'l');
  let a = -15, b = 40, s;
  for (let i = 0; i < 30; i++) { const x = (a + b) / 2; s = at(x); if (dorsiOf(F.fk(F.build(s)), 'r') < dR) a = x; else b = x; }
  return at(r1((a + b) / 2));
};
const mixRoot = (a, b, f) => ({ root: a.root.map((v, i) => r1(v + (b.root[i] - v) * f)), pitch: r1(a.pitch + (b.pitch - a.pitch) * f), spine: a.spine });
// left foot rolling about the ball of the foot (heel up by `pitch` degrees) while the right foot is on the box
const rollL = (base, pitch) => Object.assign(clone(base), { arms: F.handsOnHips, feet: { r: ON_BOX, l: { c: 'roll', pitch, ballX: F.BALL_X, z: -9 } }, arms: F.handsOnHips });

// Two-foot standing (floor and box top): centre of mass over the middle of the feet
const standOn = (x, lift) => { let s = sp([x - 2, 88 + lift, 0], 0, { r: fl(x, 9, { lift }), l: fl(x, -9, { lift }) }, { l5: 0, t12: 0, t6: 0 });
  for (let i = 0; i < 6; i++) { s = F.rootY(s, 4); s.root[0] = r1(s.root[0] - (com(F.fk(F.pose(s)))[0] - x - 4)); } return F.rootY(s, 4); };
const stand = standOn(0, 0), top = standOn(BX, H);

const S = {};
S.plant = split(-16, 26);                                                     // right foot just placed on the box
S.pushA = (() => { const s = split(-20, 30, { c: 'ball', x: BALL_L, z: -9 }); return s; })(); // left heel up, weight moving forward
S.pushRoll = rollL(mixRoot(S.plant, S.pushA, 0.25), 16); S.pushRoll2 = rollL(mixRoot(S.plant, S.pushA, 0.5), 32); S.pushRoll3 = rollL(mixRoot(S.plant, S.pushA, 0.75), 47);
S.pushA = rollL(S.pushA, 56); // pure roll (no contact blend) right before toe-off
S.drive = onBox(fl(4, -9, { lift: 9, w: 0, pitch: 25 }), 55, -18, 31);    // left toe-off, right knee straightening
S.leftUp = onBoxTall(fl(26, -9, { lift: 50, w: 0, pitch: 12 }), 10, -6);   // left knee drives up past the box edge
S.leftPre = onBoxTall(fl(BX, -9, { lift: H + 1, w: 0, pitch: 0 }), 4, -2);
// step down: weight on the right, left foot back over the edge and down to the floor behind
S.shiftR = onBoxTall(fl(BX, -9, { lift: H + 2.5, w: 0, pitch: 4 }), 4, -3);
S.leftBack = onBoxTall(fl(4, -9, { lift: H + 9, w: 0, pitch: 12 }), 18, -10);
S.reach = onBox(fl(6, -9, { lift: 16, w: 0, pitch: 45 }), 78, -30, 32);     // right leg lowering, left toes reaching for the floor
S.touch = split(-34, 27, { c: 'ball', x: BALL_L, z: -9 });                  // left ball of the foot touches down
S.back = split(-18, 25);                                                     // left heel down, weight moving back
// right foot steps down beside the left
S.rLift = onLeft(fl(BX - 4, 9, { lift: H + 3, w: 0, pitch: 8 }), 6, -8);
S.rBack = onLeft(fl(3, 9, { lift: H, w: 0, pitch: 38 }), 6, -5);
S.rPre = onLeft(fl(0, 9, { lift: 0.8, w: 0 }), 5, -2);
S.rHigh = onLeft(fl(18, 9, { lift: H + 9, w: 0, pitch: 10 }), 6, -6);       // way up: right knee lifts the foot over the box edge
S.rUp = onLeft(fl(6, 9, { lift: 14, w: 0, pitch: 15 }), 5, -4);
S.rPrePlant = onLeft(fl(BX - 1, 9, { lift: H + 1.2, w: 0, pitch: 0 }), 7, -10);

const poses = { stand: P(stand), top: P(top) };
for (const [k, s] of Object.entries(S)) poses[k] = P(s);
poses.roll1 = P(rollL(mixRoot(S.touch, S.back, 0.25), 46)); poses.roll2 = P(rollL(mixRoot(S.touch, S.back, 0.5), 31)); poses.roll3 = P(rollL(mixRoot(S.touch, S.back, 0.75), 15));
poses.touch = P(rollL(S.touch, 60)); // the ball of the foot touches down: pure roll keys (no contact blend) until the heel is down // heel lowering after the touch-down
const keyframes = [
  { t: 0, pose: 'stand' }, { t: 0.8, pose: 'stand' }, { t: 0.98, pose: 'rUp' }, { t: 1.16, pose: 'rHigh' }, { t: 1.32, pose: 'rPrePlant' }, { t: 1.45, pose: 'plant' },
  { t: 1.6, pose: 'plant' }, { t: 1.66, pose: 'pushRoll' }, { t: 1.72, pose: 'pushRoll2' }, { t: 1.78, pose: 'pushRoll3' }, { t: 1.84, pose: 'pushA' }, { t: 2.0, pose: 'drive' }, { t: 2.22, pose: 'leftUp' }, { t: 2.42, pose: 'leftPre' }, { t: 2.55, pose: 'top' },
  { t: 3.3, pose: 'top' }, { t: 3.45, pose: 'shiftR' }, { t: 3.75, pose: 'leftBack' }, { t: 4.3, pose: 'reach' }, { t: 4.5, pose: 'touch' }, { t: 4.58, pose: 'roll1' }, { t: 4.66, pose: 'roll2' }, { t: 4.74, pose: 'roll3' },
  { t: 4.85, pose: 'back' }, { t: 5.05, pose: 'rLift' }, { t: 5.27, pose: 'rBack' }, { t: 5.45, pose: 'rPre' }, { t: 5.6, pose: 'stand' }, { t: 7.0, pose: 'stand' }];
const ex = { schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props: meta.props, contacts: F.contacts,
  timeline: meta.timeline, poses, keyframes, activation: meta.activation, guides: meta.guides, checks: meta.checks };
const rep = F.report(ex);
const W = (k) => F.fk(poses[k]), Wp = W('plant'), Wt = W('top'), Wr = W('touch'), Ws = W('stand');
const kin = ex.exercise.kinematics, set = (p, f, v) => { const k = kin.find((x) => x.measure.startsWith(p)); if (k) k[f] = v; };
set('Box height', 'setup', `${H} cm, near edge ${EDGE} cm in front of the ankles`); set('Box height', 'peak', 'Whole foot on the box');
set('Lead knee flexion', 'setup', `≈${Math.round(F.kneeOf(Ws, 'r'))}° standing`); set('Lead knee flexion', 'peak', `≈${Math.round(F.kneeOf(Wp, 'r'))}° with the foot just placed; ≈${Math.round(F.kneeOf(Wt, 'r'))}° standing on top`);
set('Lead hip flexion', 'setup', `≈${Math.round(poses.stand.ch.hip_r.flex)}°`); set('Lead hip flexion', 'peak', `≈${Math.round(poses.plant.ch.hip_r.flex)}° (joint channel, as in the HUD)`);
set('Lead knee while', 'setup', '–'); set('Lead knee while', 'peak', `≈${Math.round(F.kneeOf(Wr, 'r'))}° when the left toes touch down`);
set('Trunk inclination', 'setup', `≈${Math.round(F.trunkLean(Ws))}°`); set('Trunk inclination', 'peak', `≈${Math.round(F.trunkLean(Wp))}° at the start of the drive, ≈${Math.round(F.trunkLean(Wr))}° at the left touch-down`);
set('Tempo', 'setup', 'Stand 0.8 s'); set('Tempo', 'peak', 'Step up 0.65 s, drive 1.0 s, stand 0.75 s, step down 1.55 s, right foot down 0.75 s');
ex.exercise.reference.note = 'Reference used only to identify the movement. No GymVisual media is stored here; this rig, model and animation are original.';
const info = Object.fromEntries(['plant', 'pushA', 'drive', 'reach', 'touch', 'back'].map((k) => [k, { kR: Math.round(F.kneeOf(W(k), 'r')), dR: r1(dorsiOf(W(k), 'r')), com: com(W(k)).map(Math.round) }]));
console.log(`Step-up: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}\n  ${JSON.stringify(info)}`);
if (rep.slide > 0.05) { console.error('FAIL: planted foot slides'); process.exitCode = 1; }
