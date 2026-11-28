// Kettlebell Alternating Renegade Row (GymVisual 13773, movement reference only): high plank with each hand gripping the
// handle of a kettlebell that stands on the floor under the shoulder (neutral grip, handles along the body, fingers down so
// the bell sits straight under the fist), feet wider than the hips on the balls of the feet, body in one line. Row the
// right kettlebell to the lower ribs (elbow close, shoulder blade back) while the left hand presses its bell into the
// floor, set it down, re-brace, then row the left. The plank (root, legs, trunk) is held still; each hand is planted
// (hold_* contact) while its bell is on the floor. Feet planted. Alternating (bilateral loop). Same solve as the dumbbell
// renegade row (push.js plank, b3-back rowArm, b4-hinges alternate), with the handle at kettlebell height.
const L = require('./lib');
const { V, r1, clone } = L;
const { makePush } = require('./families/push');
const B = require('./families/b3-back');
const H = require('./families/b4-hinges');
const DBH = require('./families/dumbbell');
const meta = require('./meta/kettlebell-alternating-renegade-row.json');

const EQ = require('./families/equip');
const X = require('./families/b6-12');
// grip point height with the bell standing on the floor and the fingers pointing straight down (EQ.kettlebellAt: the bell
// centre hangs 6 + 0.42 bell below the grip point, radius 0.48 bell), plus a few mm so the bell never dips into the floor
const HANDLE_Y = r1(6 + EQ.KB.bell * 0.42 + (EQ.KB.bell / 2) * 0.96 + 0.3);
// The rig hand shape is an open hand (fingertips 18 cm from the wrist): roll the hand 25 deg about the handle (wrist in
// extension, knuckles toward the floor) so the straight fingers stay above the floor beside the handle.
const ROLL = +(process.env.ROLL ?? 0) * L.R.DEG;
const palm = [0, Math.sin(ROLL), -Math.cos(ROLL)], thumb = [1, 0, 0];   // right hand: palm toward the midline, thumb toward the head
const WOFF = V.sub(B.wristFromHandle([0, HANDLE_Y, 0], palm, thumb), [0, 0, 0]);   // wrist relative to the handle centre
const HZ = +(process.env.HZ ?? 17);                    // handle centre out from the midline
const P = makePush({ handY: r1(WOFF[1] - 2.6), handZ: r1(HZ + WOFF[2]), ankleZ: +(process.env.AZ ?? 19), flarePole: [-1, 0.2, 0.5] });
// plank with straight arms, shoulders over the hands (hand x iterated until the shoulders sit above the wrists)
let handX = r1(L.fk(P.base).wrist_r.p[0]), plank;
for (let i = 0; i < 6; i++) { plank = P.key(handX, { armD: L.reach(6), u: 0 }).pose; const e = L.fk(plank, P.contacts).shoulder_r.p[0] - handX - +(process.env.SHX ?? 2); if (Math.abs(e) < 0.2) break; handX = r1(handX + e); }
const legs = P.contacts.filter((c) => c.id.startsWith('leg_'));
const qR = H.handQ(palm, thumb);
const holds = ['r', 'l'].map((s) => Object.assign(L.handContact(s), { id: `hold_${s}`, label: `${s === 'r' ? 'Right' : 'Left'} hand on its dumbbell`, pole: [-1, 0.2, s === 'r' ? 0.5 : -0.5], handRot: H.qArr(s === 'r' ? qR : H.mirrorQ(qR)) }));
const contacts = legs.concat(holds);
let base = clone(plank);
base.ik = { leg_r: plank.ik.leg_r, leg_l: plank.ik.leg_l, hold_r: { target: plank.ik.arm_r.target, weight: 1 }, hold_l: { target: plank.ik.arm_l.target, weight: 1 } };
base = H.fitArm(base, 'r', contacts, 'hold_r'); const fitR = base.__fit; base = H.fitArm(base, 'l', contacts, 'hold_l'); delete base.__fit;
const ROW = { top: { du: +(process.env.DU ?? -26), dz: +(process.env.DZ ?? 6), wx: 4, wz: 1, tilt: 8 }, sc: [{ protract: 6, elevate: 0 }, { protract: -16, elevate: -1 }], hang: [0, 0], bend: 4 };
const state = { guess: [base.ch.shoulder_r.plane, base.ch.shoulder_r.elev, base.ch.shoulder_r.axial, base.ch.elbow_r.flex, base.ch.wrist_r.pron] };
const row = (f) => B.wrapPose(B.rowArm(base, f, ROW, state));
const FS = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.88, 1], N = FS.length - 1;
const poses = H.alternate(base, contacts, row, FS);
const T = H.phaseT(meta), D = meta.timeline.duration;
const keyframes = [{ t: 0, pose: 'R0' }, { t: T.setup[1], pose: 'R0' },
  ...H.easedKeys('R', FS, T.rowR[0], T.rowR[1]), { t: T.topR[1], pose: `R${N}` }, ...H.easedKeys('R', FS, T.lowerR[0], T.lowerR[1], true),
  { t: T.switch[1], pose: 'L0' }, ...H.easedKeys('L', FS, T.rowL[0], T.rowL[1]), { t: T.topL[1], pose: `L${N}` }, ...H.easedKeys('L', FS, T.lowerL[0], T.lowerL[1], true), { t: D, pose: 'R0' }];
const props = [X.kbProp('r'), X.kbProp('l')];
const ex = H.makeEx(meta, { poses, keyframes, props, contacts });
const rep = B.sweep(ex, { held: [], fixed: ['ankle_r', 'ankle_l', 'pelvis'] });
const kb = X.scan(ex, { planted: ['leg_r', 'leg_l', 'hold_r', 'hold_l'], kb: ['r', 'l'] });
const W0 = L.fk(poses.R0, contacts), W1 = L.fk(poses[`R${N}`], contacts), st = P.stats(plank);
const line = r1(180 - V.angle(V.sub(W0.neck_c7.p, W0.pelvis.p), V.sub(W0.ankle_l.p, W0.pelvis.p)));
H.setKin(ex, 'Body line', 'setup', `Trunk ${r1(st.bodyAng)}° above the floor, ${line}° off a straight shoulder-hip-ankle line`); H.setKin(ex, 'Body line', 'peak', 'Unchanged (plank held still)');
H.setKin(ex, 'Elbow flexion', 'setup', `≈${Math.round(B.elbowOf(W0, 'r'))}°, kettlebell on the floor`); H.setKin(ex, 'Elbow flexion', 'peak', `≈${Math.round(B.elbowOf(W1, 'r'))}° at the lower ribs, shoulder blade retracted (clavicle ${ROW.sc[0].protract}° to ${ROW.sc[1].protract}°)`);
H.setKin(ex, 'Foot width', 'setup', `Ankles ${2 * P.AR[2]} cm apart; kettlebell handles ${2 * HZ} cm apart, ${HANDLE_Y} cm off the floor`); H.setKin(ex, 'Foot width', 'peak', 'Unchanged');
H.setKin(ex, 'Tempo', 'setup', `Plank ${T.setup[1]} s`); H.setKin(ex, 'Tempo', 'peak', `Per side ${r1(T.rowR[1] - T.rowR[0])} s up, ${r1(T.topR[1] - T.topR[0])} s squeeze, ${r1(T.lowerR[1] - T.lowerR[0])} s down, ${r1(T.switch[1] - T.switch[0])} s re-brace`);
console.log(`Kettlebell Renegade Row: wrote ${L.write(ex)}\n  trunk ${r1(st.bodyAng)} deg, line ${line}, kb ${JSON.stringify(kb.kb)} jump ${JSON.stringify(kb.jump)}, elbow ${Math.round(B.elbowOf(W0, 'r'))}->${Math.round(B.elbowOf(W1, 'r'))}, arm fit ${JSON.stringify(fitR)}, top cost ${state.cost.toFixed(2)}\n  ${JSON.stringify(rep)}`);
if (rep.slide > 0.05 || rep.drift > 0.05) { console.error('FAIL: planted contacts slide'); process.exitCode = 1; }
X.gate('kettlebell-alternating-renegade-row', kb, poses, { bellFloor: -0.3 });
{ const tf = V.angle(V.sub(W0.neck_c7.p, W0.pelvis.p), [0, 1, 0]); ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(tf - 3), max: Math.ceil(tf + 3) }; L.write(ex); }
