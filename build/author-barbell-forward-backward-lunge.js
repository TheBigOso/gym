// Barbell Forward Backward Lunge (GymVisual #19609 "Barbell Forward Backward Lunge (male)"; page not readable here,
// movement from the name and standard coaching): high-bar barbell on the upper traps (b5-bbsquat backBar: fixed in the
// spine_t6 frame, 80 cm overhand grip, elbows down). The right leg does both halves: a forward lunge (long step forward,
// land heel first while the left heel rolls up onto its ball, lower until the front knee is about 90 degrees and the back
// knee is just above the floor, push off the front foot back to standing), then without a pause a reverse lunge (step the
// right foot straight back onto its ball, lower with the left as the front leg, drive through the left heel and step back
// in). Authored right leg moving (the player mirrors). Built on the lunge family (lunge.js: the barbell front rack lunge's
// forward step and the bodyweight rear lunge's backward step).
const L = require('./lib');
const { r1, clone } = L;
const { makeFamily, BALL_SHIFT } = require('./families/lunge');
const BB = require('./families/barbell');
const S5 = require('./families/b5-bbsquat');
const meta = require('./meta/barbell-forward-backward-lunge.json');

const F = makeFamily({ toe: 6, half: 9 });
const bar = S5.backBar(S5.HIGH_BAR);
const STEP = 80, BACKX = r1(BALL_SHIFT), REAR = -80;
const P = (s) => F.pose(Object.assign(clone(s), { arms: bar.armsFn }));
const stand = F.stand({ r: { c: 'flat', x: 0 }, l: { c: 'flat', x: 0 } }, { knee: 4 });
/* forward half (as author-barbell-front-rack-lunge.js, with a little more trunk lean for the back-loaded bar) */
const SF = F.split('r', STEP, BACKX, { backKneeY: 14, pitchTop: -12, pitchBottom: -10 });
const onLeft = (rf, x, knee, pitch = -3, z = -1.5) => F.rootY({ root: [x, 85, z], pitch, spine: { l5: -1, t12: 0, t6: 0 }, feet: { l: { c: 'flat', x: 0 }, r: rf } }, knee, 'l');
const mixRoot = (a, b, f, feet) => ({ root: a.root.map((v, i) => r1(v + (b.root[i] - v) * f)), pitch: r1(a.pitch + (b.pitch - a.pitch) * f), spine: a.spine, feet });
const withFeet = (s, feet, dx = 0) => Object.assign(clone(s), { root: [r1(s.root[0] + dx), s.root[1], s.root[2]], feet });
const SP = {
  reach: onLeft({ c: 'flat', x: 52, lift: 5, w: 0 }, 16, 14, -5),
  heel: withFeet(SF.top, { r: { c: 'flat', x: STEP, lift: 0.6, w: 0 }, l: { c: 'ball', x: BACKX } }, -3),
  unload: withFeet(SF.top, { r: { c: 'flat', x: STEP - 2, lift: 2, w: 0 }, l: { c: 'ball', x: BACKX } }, -6),
  rollDown: onLeft({ c: 'flat', x: 62, lift: 5, w: 0 }, 28, 22, -6),
};
const roll = (a, b, f, pitch, rx, rlift) => P(mixRoot(a, b, f, { l: { c: 'roll', pitch, ballX: F.BALL_X }, r: { c: 'flat', x: rx, lift: rlift, w: 0 } }));
/* backward half (as author-bodyweight-rear-lunge.js with the legs swapped: the left stays planted, the right steps back) */
const SB = F.split('l', 0, REAR, { pitchTop: -12, pitchBottom: -10 });
const onLeftB = (rf, x, knee, z = -1.5, pitch = -4) => F.rootY({ root: [x, 85, z], pitch, spine: { l5: -1, t12: 0, t6: 0 }, feet: { l: { c: 'flat', x: 0 }, r: rf } }, knee, 'l');
const poses = {
  stand: P(stand),
  lift: P(onLeft({ c: 'flat', x: 10, lift: 6, w: 0 }, 2, 8)),
  reach: P(SP.reach),
  up16: roll(SP.reach, SP.heel, 0.25, 16, 59, 3.8), up32: roll(SP.reach, SP.heel, 0.5, 32, 66, 2.7), up48: roll(SP.reach, SP.heel, 0.75, 48, 73, 1.6),
  heel: P(SP.heel),
  ftop: P(SF.top), f33: P(SF.at(0.33)), f66: P(SF.at(0.66)), fbottom: P(SF.bottom), fsettle: P(SF.at(0.99)), f50: P(SF.at(0.5)),
  unload: P(SP.unload),
  dn48: roll(SP.unload, SP.rollDown, 0.25, 48, 74, 2.8), dn32: roll(SP.unload, SP.rollDown, 0.5, 32, 70, 3.5), dn16: roll(SP.unload, SP.rollDown, 0.75, 16, 66, 4.3),
  rollDown: P(SP.rollDown),
  swingBack: P(onLeft({ c: 'flat', x: 30, lift: 7, w: 0 }, 5, 12, -5)),
  pass: P(onLeftB({ c: 'flat', x: 0, lift: 6, w: 0 }, -1, 8)),
  breach: P(onLeftB({ c: 'ball', x: -55, lift: 6, w: 0 }, r1(SB.top.root[0] * 0.6), 14, -1, -10)),
  btouch: P(Object.assign(clone(SB.top), { feet: { l: { c: 'flat', x: 0 }, r: { c: 'ball', x: REAR, w: 0 } } })),
  btop: P(SB.top), b33: P(SB.at(0.33)), b66: P(SB.at(0.66)), bbottom: P(SB.bottom), bsettle: P(SB.at(0.99)), b50: P(SB.at(0.5)),
  bunload: P(Object.assign(clone(SB.top), { root: [r1(SB.top.root[0] + 4), SB.top.root[1], 0], feet: { l: { c: 'flat', x: 0 }, r: { c: 'ball', x: REAR + 2, lift: 2, w: 0 } } })),
  swingIn: P(onLeftB({ c: 'flat', x: -35, lift: 8, w: 0 }, -6, 12, -1.5, -8)),
  preLand: P(onLeftB({ c: 'flat', x: 0, lift: 0.8, w: 0 }, -1, 6)),
  land: P(stand),
};
const keyframes = [{ t: 0, pose: 'stand' }, { t: 0.6, pose: 'stand' },
  // forward lunge (0.6 - 4.2)
  { t: 0.8, pose: 'lift' }, { t: 1.0, pose: 'reach' }, { t: 1.065, pose: 'up16' }, { t: 1.13, pose: 'up32' }, { t: 1.195, pose: 'up48' }, { t: 1.26, pose: 'heel' }, { t: 1.4, pose: 'ftop' },
  { t: 1.75, pose: 'f33' }, { t: 2.1, pose: 'f66' }, { t: 2.4, pose: 'fbottom' }, { t: 2.55, pose: 'fsettle' }, { t: 2.7, pose: 'fbottom' }, { t: 3.1, pose: 'f50' }, { t: 3.45, pose: 'ftop' },
  { t: 3.6, pose: 'unload' }, { t: 3.65, pose: 'dn48' }, { t: 3.7, pose: 'dn32' }, { t: 3.75, pose: 'dn16' }, { t: 3.8, pose: 'rollDown' }, { t: 3.95, pose: 'swingBack' },
  // the right foot passes under the hip and reaches straight back (no stop)
  { t: 4.15, pose: 'pass' }, { t: 4.4, pose: 'breach' }, { t: 4.6, pose: 'btouch' }, { t: 4.75, pose: 'btop' },
  { t: 5.1, pose: 'b33' }, { t: 5.45, pose: 'b66' }, { t: 5.75, pose: 'bbottom' }, { t: 5.9, pose: 'bsettle' }, { t: 6.05, pose: 'bbottom' }, { t: 6.45, pose: 'b50' }, { t: 6.8, pose: 'btop' },
  { t: 7.0, pose: 'bunload' }, { t: 7.25, pose: 'swingIn' }, { t: 7.5, pose: 'preLand' }, { t: 7.65, pose: 'land' }, { t: 8.5, pose: 'stand' }];
const ex = { schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props: [BB.barbellProp()], contacts: F.contacts,
  timeline: meta.timeline, poses, keyframes, activation: meta.activation, guides: meta.guides, checks: meta.checks };
ex.exercise.reference.note = S5.NOTE;
const SKIP = /^(hand|thumb|forearm)_|^traps_|^chest$|^neck$/;
const sw = BB.sweep(ex, { skip: SKIP });
const rest = BB.sweep(ex, {}, 150).barBody, lim = S5.limits(ex);
const fr = F.report(ex), Wf = F.fk(poses.fbottom), Wb = F.fk(poses.bbottom), Ws = F.fk(poses.stand);
const set = (p, f, v) => { const k = ex.exercise.kinematics.find((x) => x.measure.startsWith(p)); if (!k) throw new Error(p); k[f] = v; };
set('Step length', 'setup', 'Feet hip width (18 cm), side by side'); set('Step length', 'peak', `Forward: right ankle ${STEP} cm ahead; backward: right ankle ${-REAR} cm behind the left`);
set('Front knee', 'setup', `≈${Math.round(F.kneeOf(Ws, 'r'))}° standing`); set('Front knee', 'peak', `Forward half (right) ≈${Math.round(F.kneeOf(Wf, 'r'))}°; backward half (left) ≈${Math.round(F.kneeOf(Wb, 'l'))}°`);
set('Back knee', 'setup', '–'); set('Back knee', 'peak', `Left ≈${Math.round(F.kneeOf(Wf, 'l'))}° (${r1(Wf.knee_l.p[1])} cm up) in the forward half; right ≈${Math.round(F.kneeOf(Wb, 'r'))}° (${r1(Wb.knee_r.p[1])} cm up) in the backward half`);
set('Trunk inclination', 'setup', `≈${Math.round(F.trunkLean(Ws))}°`); set('Trunk inclination', 'peak', `≈${Math.round(F.trunkLean(Wf))}° forward half, ≈${Math.round(F.trunkLean(Wb))}° backward half`);
set('Tempo', 'setup', 'Stand 0.6 s'); set('Tempo', 'peak', 'Forward lunge 3.4 s (step 0.8, down 1.0, pause 0.3, up 0.75, push back 0.5), straight into the reverse lunge 3.7 s, 0.85 s reset');
console.log(`Barbell Forward Backward Lunge: wrote ${L.write(ex)}\n  ${JSON.stringify(fr)}\n  sweep ${JSON.stringify(sw)} rest ${rest} grip ${bar.st.worst.toFixed(2)} limits ${JSON.stringify(lim)}`);
S5.gate('barbell-forward-backward-lunge', sw, { gripWorst: bar.st.worst, rest });
if (Object.keys(lim).length) { console.error('FAIL: joint limits'); process.exitCode = 1; }
{ const m = ex.checks.measure; const pk = Math.max(fr.kneeR[1], fr.kneeL[1]); if (pk < m.min || pk > m.max) { console.error('FAIL: peak knee outside the measure range'); process.exitCode = 1; } }
if (fr.slide > 0.05) { console.error('FAIL: planted foot slides'); process.exitCode = 1; }
