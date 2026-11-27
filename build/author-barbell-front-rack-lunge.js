// Barbell Front Rack Lunge (GymVisual "Barbell Front Rack Lunge"; movement reference only): stand tall with a barbell in
// the front rack: the bar across the front delts just in front of the throat, resting in the fingers (hands a little wider
// than the shoulders), elbows forward and up, wrists extended. Take a long step forward with the right foot and land heel
// first while the left heel rolls up onto the ball of the foot; lower with the trunk upright until the front knee is about
// 90 degrees and the back knee is just above the floor; push off the front foot to step back to standing. Authored right
// leg stepping. Built on the forward / dumbbell lunge (lunge.js) with the b5-extra front-rack arms (solved once relative to
// the upper trunk, so the bar rides with the trunk and the grip width is constant) and the barbell.js clearance sweep.
const L = require('./lib');
const { V, r1, clone } = L;
const { makeFamily, BALL_SHIFT } = require('./families/lunge');
const X = require('./families/b5-extra');
const meta = require('./meta/barbell-front-rack-lunge.json');

const F = makeFamily({ toe: 6, half: 9 });
const STEP = 80, BACK = r1(BALL_SHIFT); // right ankle lands 80 cm ahead; the left rolls onto its ball (ankle moves 7.8 cm forward)
const PT = +(process.env.PT ?? -9), PB = +(process.env.PB ?? -6); // trunk pitch at the top / bottom: more upright than the bodyweight lunge
const S = F.split('r', STEP, BACK, { backKneeY: 14, pitchTop: PT, pitchBottom: PB });
const stand = F.stand({ r: { c: 'flat', x: 0 }, l: { c: 'flat', x: 0 } }, { knee: 4 });
const RACK = X.frontRack(F.pose(stand), { gw: 66, contacts: F.contacts });
const arms = RACK.apply;
const P = (s) => F.pose(Object.assign(clone(s), { arms }));
// single-leg stance on the left (flat) while the right swings
const onLeft = (rf, x, knee, pitch = -3, z = -1.5) => F.rootY({ root: [x, 85, z], pitch, spine: { l5: -1, t12: 0, t6: 0 }, feet: { l: { c: 'flat', x: 0 }, r: rf } }, knee, 'l');
const mixRoot = (a, b, f, feet) => ({ root: a.root.map((v, i) => r1(v + (b.root[i] - v) * f)), pitch: r1(a.pitch + (b.pitch - a.pitch) * f), spine: a.spine, feet });
const withFeet = (s, feet, dx = 0) => Object.assign(clone(s), { root: [r1(s.root[0] + dx), s.root[1], s.root[2]], feet });
const SP = {
  reach: onLeft({ c: 'flat', x: 52, lift: 5, w: 0 }, 16, 14, -5),
  heel: withFeet(S.top, { r: { c: 'flat', x: STEP, lift: 0.6, w: 0 }, l: { c: 'ball', x: BACK } }, -3),
  unload: withFeet(S.top, { r: { c: 'flat', x: STEP - 2, lift: 2, w: 0 }, l: { c: 'ball', x: BACK } }, -6),
  rollDown: onLeft({ c: 'flat', x: 62, lift: 5, w: 0 }, 28, 22, -6),
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
  rollDown: P(SP.rollDown),
  swingBack: P(onLeft({ c: 'flat', x: 36, lift: 7, w: 0 }, 6, 12, -5)),
  preLand: P(onLeft({ c: 'flat', x: 0, lift: 0.8, w: 0 }, 1, 6)),
  land: P(stand),
};
const keyframes = [{ t: 0, pose: 'stand' }, { t: 0.8, pose: 'stand' }, { t: 1.0, pose: 'lift' }, { t: 1.2, pose: 'reach' }, { t: 1.265, pose: 'up16' }, { t: 1.33, pose: 'up32' }, { t: 1.395, pose: 'up48' }, { t: 1.46, pose: 'heel' }, { t: 1.6, pose: 'top' },
  { t: 1.95, pose: 'd33' }, { t: 2.3, pose: 'd66' }, { t: 2.6, pose: 'bottom' }, { t: 2.75, pose: 'settle' }, { t: 2.9, pose: 'bottom' }, { t: 3.3, pose: 'r50' }, { t: 3.65, pose: 'top' },
  { t: 3.8, pose: 'unload' }, { t: 3.85, pose: 'dn48' }, { t: 3.9, pose: 'dn32' }, { t: 3.95, pose: 'dn16' }, { t: 4.0, pose: 'rollDown' }, { t: 4.15, pose: 'swingBack' }, { t: 4.35, pose: 'preLand' }, { t: 4.5, pose: 'land' }, { t: 6.0, pose: 'stand' }];
const ex = { schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props: [RACK.prop()], contacts: F.contacts,
  timeline: meta.timeline, poses, keyframes, activation: meta.activation, guides: meta.guides, checks: meta.checks };
ex.exercise.reference.note = 'Reference used only to identify the movement. No GymVisual media is stored here; this rig, model and animation are original.';

// whole-loop checks: the bar rests on the front delts (skipped for the clearance sweep, then measured on its own), clear of
// the head, chest and legs; grip width constant; plates off the floor; feet planted while weighted
const sw = X.barSweep(ex, { grip: RACK.grip, skip: /^(hand|thumb|forearm)_|^deltoid_/ });
const rest = X.barSweep(ex, { grip: RACK.grip, n: 150 }).barBody; // with the delts included: about 0 = resting on them
const lim = X.limits(poses), rep = F.report(ex), Wb = F.fk(poses.bottom), Ws = F.fk(poses.stand);
const elbowBelow = r1(RACK.shoulderT6[1] - RACK.elbowT6[1]), elbowFwd = r1(RACK.elbowT6[0] - RACK.shoulderT6[0]);
const uaDeg = Math.round(Math.atan2(elbowBelow, Math.hypot(elbowFwd, RACK.elbowT6[2] - RACK.shoulderT6[2])) / L.R.DEG);
const kin = ex.exercise.kinematics, set = (p, f, v) => { const k = kin.find((x) => x.measure.startsWith(p)); if (!k) throw new Error(p); k[f] = v; };
set('Step length', 'setup', 'Feet together (hip width)'); set('Step length', 'peak', `${STEP} cm forward (${r1(STEP - BACK)} cm between ankle centres once the back heel is up)`);
set('Front knee', 'setup', `≈${Math.round(F.kneeOf(Ws, 'r'))}° standing`); set('Front knee', 'peak', `≈${Math.round(F.kneeOf(Wb, 'r'))}°`);
set('Back knee', 'setup', '–'); set('Back knee', 'peak', `≈${Math.round(F.kneeOf(Wb, 'l'))}°, ${r1(Wb.knee_l.p[1])} cm above the floor (knee joint centre)`);
set('Trunk inclination', 'setup', `≈${Math.round(F.trunkLean(Ws))}°`); set('Trunk inclination', 'peak', `≈${Math.round(F.trunkLean(Wb))}°`);
set('Front rack', 'setup', `Bar across the front delts in the fingers, ${Math.round(RACK.width)} cm between the hands (handle points); upper arms ≈${uaDeg}° below horizontal, elbows ${elbowFwd} cm in front of the shoulder joints; wrists extended ${Math.round(-RACK.arms.wrist_r.flex)}°`);
set('Front rack', 'peak', `Unchanged: the bar rides with the trunk (grip width ${sw.width.join('-')} cm), ${sw.barFloor} cm min plate height`);
set('Tempo', 'setup', 'Stand 0.8 s'); set('Tempo', 'peak', 'Step 0.8 s, 1.0 s down, 0.3 s pause, 0.75 s up, step back 0.85 s');
console.log(`Barbell Front Rack Lunge: wrote ${L.write(ex)}\n  rack ${JSON.stringify({ cost: RACK.cost, gripErr: RACK.gripErr, barT6: RACK.barT6, elbowT6: RACK.elbowT6, shoulderT6: RACK.shoulderT6, width: RACK.width, arm: [RACK.arms.shoulder_r, RACK.arms.elbow_r, RACK.arms.wrist_r] })}\n  ${JSON.stringify(rep)}\n  sweep ${JSON.stringify(sw)} rest ${rest} limits ${JSON.stringify(lim)}`);
const bad = [];
if (sw.widthRange > 1.0) bad.push('grip width varies');
if (sw.barFloor < 0 || sw.barBody < 0 || rest < -1.5) bad.push('bar or plates through the floor or the body');
if (rep.slide > 0.05) bad.push('planted foot slides');
if (lim.length) bad.push(`joint limits ${lim.slice(0, 4)}`);
{ const m = ex.checks.measure; if (rep.kneeR[1] < m.min || rep.kneeR[1] > m.max) bad.push('peak knee outside the measure range'); }
if (bad.length) { console.error(`FAIL barbell-front-rack-lunge: ${bad.join('; ')}`); process.exitCode = 1; }
