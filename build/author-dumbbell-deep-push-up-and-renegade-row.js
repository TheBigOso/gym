// Dumbbell Deep Push-up and Renegade Row (GymVisual #16362; page not readable here, movement from the name): high plank with
// each hand gripping a hex dumbbell that rests on the floor under the shoulder (neutral grip, handles along the body), feet
// wider than the hips on the balls of the feet, body in one line. A deep push-up: the raised handles let the chest sink below
// the level of the hands, between the dumbbells; press back up; then row the right dumbbell to the lower ribs while the left
// hand presses its dumbbell into the floor, set it down, and row the left. Feet planted; each hand is planted (hold_*
// contact: constant target and grip orientation) while its dumbbell is on the floor. Bilateral loop (push-up, right row,
// left row). Plank and row set-up as in author-dumbbell-renegade-row.js (push.js makePush, b3-back rowArm, b4-hinges
// alternate); the push-up keys are makePush keys at a set chest height with the hands moved onto the hold contacts.
const L = require('./lib');
const { V, r1, clone } = L;
const { makePush } = require('./families/push');
const B = require('./families/b3-back');
const H = require('./families/b4-hinges');
const DBH = require('./families/dumbbell');
const meta = require('./meta/dumbbell-deep-push-up-and-renegade-row.json');

const DIAM = 20, SIZE = [30, DIAM, DIAM], DSZ = { length: SIZE[0], diameter: SIZE[1] }, HANDLE_Y = DIAM / 2;
const ROLL = -25 * L.R.DEG;
const palm = [0, Math.sin(ROLL), -Math.cos(ROLL)], thumb = [1, 0, 0];
const WOFF = B.wristFromHandle([0, HANDLE_Y, 0], palm, thumb);
const HZ = +(process.env.HZ ?? 22), CHEST = +(process.env.CHEST ?? 18); // handle centre out from the midline; chest height at the bottom (cm)
const P = makePush({ handY: r1(WOFF[1] - 2.6), handZ: r1(HZ + WOFF[2]), ankleZ: 19, flarePole: [-1, 0.2, 0.5] });
let handX = r1(L.fk(P.base).wrist_r.p[0]), plank;
for (let i = 0; i < 6; i++) { plank = P.key(handX, { armD: L.reach(6), u: 0 }).pose; const e = L.fk(plank, P.contacts).shoulder_r.p[0] - handX - 2; if (Math.abs(e) < 0.2) break; handX = r1(handX + e); }
const legs = P.contacts.filter((c) => c.id.startsWith('leg_'));
const qR = H.handQ(palm, thumb);
const PL = JSON.parse(process.env.POLE || '[-0.3, 0.2, 1]'), POLE = (s) => [PL[0], PL[1], s === 'r' ? PL[2] : -PL[2]]; // elbows out to the side in the push-up: the forearm then tilts about the handle (wrist flexion) rather than across it (deviation)
const holds = ['r', 'l'].map((s) => Object.assign(L.handContact(s), { id: `hold_${s}`, label: `${s === 'r' ? 'Right' : 'Left'} hand on its dumbbell`, pole: POLE(s), handRot: H.qArr(s === 'r' ? qR : H.mirrorQ(qR)) }));
const contacts = legs.concat(holds);
const toHolds = (q0) => { let q = clone(q0); q.ik = { leg_r: q0.ik.leg_r, leg_l: q0.ik.leg_l, hold_r: { target: q0.ik.arm_r.target, weight: 1 }, hold_l: { target: q0.ik.arm_l.target, weight: 1 } }; q = H.fitArm(q, 'r', contacts, 'hold_r'); q = H.fitArm(q, 'l', contacts, 'hold_l'); delete q.__fit; return q; };
const base = toHolds(plank);
// push-up keys: chest height eased from the plank to CHEST cm above the floor
const cTop = P.chestMinY(L.fk(plank, P.contacts)), ease = (f) => f * f * (3 - 2 * f), NP = 5, push = {};
for (let i = 1; i <= NP; i++) push[`d${i}`] = toHolds(P.key(handX, { chestY: cTop + (CHEST - cTop) * ease(i / NP), u: ease(i / NP) }).pose);
push.dHold = toHolds(P.key(handX, { chestY: CHEST + 0.4, u: 1 }).pose);
// rows (as the renegade row)
const ROW = { top: { du: -26, dz: 6, wx: 4, wz: 1, tilt: 8 }, sc: [{ protract: 6, elevate: 0 }, { protract: -16, elevate: -1 }], hang: [0, 0], bend: 4 };
const state = { guess: [base.ch.shoulder_r.plane, base.ch.shoulder_r.elev, base.ch.shoulder_r.axial, base.ch.elbow_r.flex, base.ch.wrist_r.pron] };
const row = (f) => B.wrapPose(B.rowArm(base, f, ROW, state));
const FS = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.88, 1], N = FS.length - 1;
const poses = Object.assign(H.alternate(base, contacts, row, FS), push);
const T = H.phaseT(meta), D = meta.timeline.duration;
const pk = [];
for (let i = 1; i <= NP; i++) pk.push({ t: T.down[0] + ((T.down[1] - T.down[0]) * i) / NP, pose: `d${i}` });
pk.push({ t: (T.bottom[0] + T.bottom[1]) / 2, pose: 'dHold' }, { t: T.bottom[1], pose: `d${NP}` });
for (let i = NP - 1; i >= 1; i--) pk.push({ t: T.up[0] + ((T.up[1] - T.up[0]) * (NP - i)) / NP, pose: `d${i}` });
pk.push({ t: T.up[1], pose: 'R0' });
const keyframes = [{ t: 0, pose: 'R0' }, { t: T.setup[1], pose: 'R0' }, ...pk.map((k) => ({ t: +k.t.toFixed(3), pose: k.pose })),
  ...H.easedKeys('R', FS, T.rowR[0], T.rowR[1]), { t: T.topR[1], pose: `R${N}` }, ...H.easedKeys('R', FS, T.lowerR[0], T.lowerR[1], true),
  { t: T.switch[1], pose: 'L0' }, ...H.easedKeys('L', FS, T.rowL[0], T.rowL[1]), { t: T.topL[1], pose: `L${N}` }, ...H.easedKeys('L', FS, T.lowerL[0], T.lowerL[1], true), { t: D, pose: 'R0' }];
const props = [B.heldProp('r', 'handle', SIZE), B.heldProp('l', 'handle', SIZE)];
const ex = H.makeEx(meta, { poses, keyframes, props, contacts });
const held = ['r', 'l'].map((side) => ({ side, grip: 'handle', size: DSZ }));
const rep = B.sweep(ex, { held, fixed: ['ankle_r', 'ankle_l'] });
// the chest passes between the dumbbells: body clearance to the resting dumbbells at the bottom
const Wb = L.fk(poses[`d${NP}`], contacts), W0 = L.fk(poses.R0, contacts), W1 = L.fk(poses[`R${N}`], contacts), st = P.stats(plank);
const bodyDb = Math.min(B.dbBody(Wb, 'r', 'handle', DSZ, []).d, B.dbBody(Wb, 'l', 'handle', DSZ, []).d);
const line = r1(180 - V.angle(V.sub(W0.neck_c7.p, W0.pelvis.p), V.sub(W0.ankle_l.p, W0.pelvis.p)));
H.setKin(ex, 'Body line', 'setup', `Trunk ${r1(st.bodyAng)}° above the floor, ${line}° off a straight shoulder-hip-ankle line`); H.setKin(ex, 'Body line', 'peak', 'Held straight through the push-up and the rows');
H.setKin(ex, 'Push-up depth', 'setup', `Chest ${r1(cTop)} cm above the floor, arms straight`); H.setKin(ex, 'Push-up depth', 'peak', `Chest ${CHEST} cm above the floor: ${(() => { const dz = r1(CHEST - W0.wrist_r.p[1]); return dz <= 0 ? `${-dz} cm below` : `${dz} cm above`; })()} the wrists, ${r1(CHEST - HANDLE_Y)} cm above the handles, between the dumbbells; elbows ≈${Math.round(B.elbowOf(Wb, 'r'))}°`);
H.setKin(ex, 'Elbow flexion (rowing arm)', 'setup', `≈${Math.round(B.elbowOf(W0, 'r'))}°, dumbbell on the floor`); H.setKin(ex, 'Elbow flexion (rowing arm)', 'peak', `≈${Math.round(B.elbowOf(W1, 'r'))}° at the lower ribs`);
H.setKin(ex, 'Foot width', 'setup', `Ankles ${2 * P.AR[2]} cm apart; dumbbell handles ${2 * HZ} cm apart`); H.setKin(ex, 'Foot width', 'peak', 'Unchanged');
H.setKin(ex, 'Tempo', 'setup', `Plank ${T.setup[1]} s`); H.setKin(ex, 'Tempo', 'peak', `Push-up ${r1(T.down[1] - T.down[0])} s down, ${r1(T.up[1] - T.up[0])} s up; each row ${r1(T.rowR[1] - T.rowR[0])} s up, ${r1(T.lowerR[1] - T.lowerR[0])} s down`);
ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(V.angle(V.sub(W0.neck_c7.p, W0.pelvis.p), [0, 1, 0]) - 3), max: Math.ceil(V.angle(V.sub(Wb.neck_c7.p, Wb.pelvis.p), [0, 1, 0]) + 3) };
console.log(`Dumbbell Deep Push-up and Renegade Row: wrote ${L.write(ex)}\n  trunk ${r1(st.bodyAng)} line ${line} chest ${r1(cTop)}->${CHEST} bottom elbow ${Math.round(B.elbowOf(Wb, 'r'))} body-db ${r1(bodyDb)} row elbow ${Math.round(B.elbowOf(W0, 'r'))}->${Math.round(B.elbowOf(W1, 'r'))} top cost ${state.cost.toFixed(2)}\n  ${JSON.stringify(rep)}`);
if (rep.slide > 0.05 || rep.drift > 0.05) { console.error('FAIL: planted contacts slide'); process.exitCode = 1; }
if (rep.dbFloor < -0.5 || rep.dbBody < -0.5 || bodyDb < -0.5) { console.error('FAIL: dumbbell through the floor or the body'); process.exitCode = 1; }
