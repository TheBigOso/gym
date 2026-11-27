// Cable Decline Fly (GymVisual, Cable Decline Fly; movement reference only, the page could not be read): lying head-down on
// a bench set at a 15 degree decline between two low pulleys (tower_r on the right, tower_l on the left, each pulley near
// the floor beside the bench at chest level), the upper back and head on the pad / low seat, buttocks near the high end,
// feet planted on the floor (leg contacts). One D-handle in each hand, each on its own cable from its own pulley; neutral
// grip (palms facing each other at the top). From the hands together over the lower chest the arms open in a wide arc with a
// fixed soft elbow bend (about 20 degrees) until the upper arms are about level with the bench, pause, then hug back up.
// The decline bench is an incline bench turned around (see declineBench in b5-cablepush.js: the player cannot draw a
// negative back angle cleanly). Bilateral (right arm solved, left mirrored).
const L = require('./lib');
const { V, r1 } = L;
const H = require('./families/hips');
const EQ = require('./families/equip');
const C = require('./families/eq-cable');
const CH = require('./families/b3-chest');
const P = require('./families/b5-cablepush');
const meta = require('./meta/cable-decline-fly.json');

const ENV = (k, d) => +(process.env[k] ?? d);
const ANGLE = 15, ELBOW = 20, TO_FEET = ENV('TF', 18), DIP = 4, TILT = ENV('TILT', 0.36); // TILT: top arms leaned toward the hips (hands over the lower chest)
const { B, base, contacts, foot, fit } = P.declineBench({ angle: ANGLE, seatH: 25, knee: 90, buttFromTip: 8 });
const W0 = L.fk(base, contacts), Fr = CH.trunkFrame(W0), S = W0.shoulder_r.p;
const dTop = V.norm(V.add(V.add(Fr.v, V.scale(Fr.u, -TILT)), V.scale(Fr.w, ENV('WOUT', -0.05)))), dBot = CH.upperArmDir(Fr, 90 - TO_FEET, DIP);
const path = P.flyPath(base, { dTop, dBot, elbow: ELBOW, n: 6, ax: Fr.u });
const keys = path.map((k) => ({ f: 1 - k.f, pose: C.mirrorArm(P.strip(k.pose)) })).reverse();
const pb = path[path.length - 1].pose;
const settle = C.mirrorArm(P.strip(P.flyPath(base, { dTop: CH.upperArmDir(Fr, 90 - TO_FEET, DIP - 1.5), dBot, elbow: ELBOW, n: 1, ax: Fr.u, seeds: [{ shoulder_r: pb.ch.shoulder_r, elbow_r: pb.ch.elbow_r, wrist_r: pb.ch.wrist_r }] })[0].pose));
const T = CH.phaseT(meta);
const { poses, keyframes } = CH.repKeys(keys, T, settle);
const ex = H.module_(meta, contacts, poses, keyframes);
const ANCHOR = [r1(S[0] + ENV('AX', 4)), ENV('AY', 12), ENV('AZ', 95)]; // right low pulley beside the bench, at chest level
ex.props = [B.prop, ...P.towers(ANCHOR, { offset: [0, 12] }), ...P.handles(ANCHOR)];
let pen = { d: -1e9 }, elbowR = [999, -999];
const rep = P.checkTwoHandle('cable-decline-fly', ex, ANCHOR, { minGap: 12 });
H.loopReport(ex, { probe: (W) => { const q = P.declinePen(B, W); if (q.d > pen.d) pen = q; const e = C.elbowAng(W); elbowR = [Math.min(elbowR[0], e), Math.max(elbowR[1], e)]; } });
if (pen.d > 1) { console.error(`FAIL cable-decline-fly: body into the bench ${JSON.stringify(pen)}`); process.exitCode = 1; }
const Wt = L.fk(poses.top, contacts), Wb = L.fk(poses.bottom, contacts), set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
const fromN = (W) => V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), CH.trunkFrame(W).v);
const gT = EQ.gripPoint(Wt, 'r').p, gB = EQ.gripPoint(Wb, 'r').p;
set('Bench angle', 'setup', `${ANGLE}° decline (head ${r1(B.tip[1] - B.hinge[1])} cm below the hips' end of the pad)`); set('Bench angle', 'peak', `Upper back and buttocks on the pad (${fit.chest} / ${fit.buttock} cm), back of the head ${fit.hairSeat} cm over the low seat`);
set('Elbow flexion', 'setup', `${d(C.elbowAng(Wt))} (soft, fixed)`); set('Elbow flexion', 'peak', `${d(C.elbowAng(Wb))} at the bottom; ${r1(elbowR[0])}-${r1(elbowR[1])}° through the loop`);
set('Arm opening', 'setup', `Upper arm ${d(fromN(Wt))} from perpendicular to the trunk (toward the hips), hands ${r1(2 * gT[2])} cm apart over the lower chest, ${r1(gT[0] - S[0])} cm from the shoulders`); set('Arm opening', 'peak', `${d(fromN(Wb))} at the bottom (${d(CH.armDip(Wb))} below the back plane, ${TO_FEET}° toward the hips)`);
set('Grip', 'setup', 'Neutral, palms facing each other'); set('Grip', 'peak', 'Palms up at the bottom');
set('Cable', 'setup', `Low pulleys ${ANCHOR[1]} cm high beside the chest, ${2 * ANCHOR[2]} cm apart`); set('Cable', 'peak', `Both cables clear of the body by at least ${rep.lineMin} cm`);
set('Knee flexion', 'setup', `${d(H.kneeOf(W0, 'r'))}, feet ${2 * foot[2]} cm apart`); set('Knee flexion', 'peak', 'Unchanged (feet planted)');
set('Tempo', 'setup', 'Squeeze 0.6 s over the chest'); set('Tempo', 'peak', '2.2 s down, 0.4 s stretch, 1.5 s up');
const tf = V.angle(V.sub(W0.neck_c7.p, W0.pelvis.p), [0, 1, 0]);
ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(tf - 3), max: Math.ceil(tf + 3) };
console.log(`Cable Decline Fly: wrote ${L.write(ex)}\n  fit ${JSON.stringify(fit)} hip ${base.ch.hip_r.flex} trunk ${r1(tf)} costs ${path.map((k) => r1(k.pose.__cost))}\n  grip top ${gT.map(r1)} bottom ${gB.map(r1)} pen ${JSON.stringify(pen)} elbow ${elbowR.map(r1)}\n  ${JSON.stringify({ floor: rep.floor, slide: rep.slide, lines: rep.lines, gap: rep.handleGap, hb: rep.handleBody, jump: rep.jump })}`);
