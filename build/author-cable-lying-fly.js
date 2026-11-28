// Cable Lying Fly (GymVisual 5017, Cable Lying Fly; movement reference only, page not readable): lying face up on a flat
// bench set midway between two low pulleys (tower_r on the right, tower_l on the left, each pulley near the floor beside
// the bench at about chest level), buttocks on the seat end and the upper back and head on the pad, feet planted on the
// floor (leg contacts). One D-handle in each hand, each on the cable from its own pulley; neutral grip (palms facing each
// other) at the top. From the hands together over the chest the arms open in a wide arc with a fixed soft elbow bend
// (about 20 degrees) until the upper arms are about level with the bench, pause in the stretch, then hug back up along
// the same arc. Bilateral (right arm solved, left mirrored). Built like author-dumbbell-fly.js (flat bench base,
// b3-chest) and author-cable-decline-fly.js (towers and handles, b5-cablepush); family b6-08.js.
const L = require('./lib');
const { V, r1 } = L;
const H = require('./families/hips');
const EQ = require('./families/equip');
const C = require('./families/eq-cable');
const CH = require('./families/b3-chest');
const P = require('./families/b5-cablepush');
const X = require('./families/b6-08');
const meta = require('./meta/cable-lying-fly.json');

const ID = 'cable-lying-fly';
const ENV = (k, d) => +(process.env[k] ?? d);
const ELBOW = 20, TO_FEET = ENV('TF', 12), DIP = ENV('DIP', 4);
const { B, base, contacts, foot } = CH.benchBase(0);
const W0 = L.fk(base, contacts), Fr = CH.trunkFrame(W0), S = W0.shoulder_r.p;
// top: upper arm vertical, a touch out; bottom: out to the side, angled toward the hips, a little below the back plane
const dTop = V.norm(V.add([0, 1, 0], V.scale(Fr.w, ENV('WOUT', 0.06)))), dBot = CH.upperArmDir(Fr, 90 - TO_FEET, DIP);
const path = P.flyPath(base, { dTop, dBot, elbow: ELBOW, n: 6, ax: Fr.u });
const keys = path.map((k) => ({ f: 1 - k.f, pose: C.mirrorArm(P.strip(k.pose)) })).reverse();
const pb = path[path.length - 1].pose;
const settle = C.mirrorArm(P.strip(P.flyPath(base, { dTop: CH.upperArmDir(Fr, 90 - TO_FEET, DIP - 1.5), dBot, elbow: ELBOW, n: 1, ax: Fr.u, seeds: [{ shoulder_r: pb.ch.shoulder_r, elbow_r: pb.ch.elbow_r, wrist_r: pb.ch.wrist_r }] })[0].pose));
const T = CH.phaseT(meta);
const { poses, keyframes } = CH.repKeys(keys, T, settle);
const ex = H.module_(meta, contacts, poses, keyframes);
const ANCHOR = [r1(S[0] + ENV('AX', 4)), ENV('AY', 12), ENV('AZ', 95)]; // right low pulley beside the bench, at chest level
ex.props = [B.prop, ...P.towers(ANCHOR, { offset: [0, 12] }), ...P.handles(ANCHOR)];

// loop checks: feet, floor, both cable lines, handles apart and clear of the body, jumps, joint limits; body on (not
// into) the bench; elbow bend through the loop
const rep = P.checkTwoHandle(ID, ex, ANCHOR, { minGap: 12 });
let elbowR = [999, -999];
const sw = CH.sweep(ex, B, { grips: [], probe: (W) => { const e = C.elbowAng(W); elbowR = [Math.min(elbowR[0], e), Math.max(elbowR[1], e)]; } });
if (sw.bodyBench > 2.5) { console.error(`FAIL ${ID}: body into the bench ${JSON.stringify(sw.bodyBenchAt)} ${sw.bodyBench}`); process.exitCode = 1; }
const peak = X.checkMeasure(ID, ex);

const Wt = L.fk(poses.top, contacts), Wb = L.fk(poses.bottom, contacts), set = H.setKin(ex), d = X.d;
const fromVert = (W) => V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), [0, 1, 0]);
const gT = EQ.gripPoint(Wt, 'r').p;
set('Bench angle', 'setup', 'Flat (0°)'); set('Bench angle', 'peak', 'Buttocks on the seat end, upper back and head on the pad');
set('Elbow flexion', 'setup', `${d(C.elbowAng(Wt))} (soft, fixed)`); set('Elbow flexion', 'peak', `${d(C.elbowAng(Wb))} at the bottom; ${r1(elbowR[0])}-${r1(elbowR[1])}° through the loop`);
set('Arm opening', 'setup', `Upper arm ${d(fromVert(Wt))} from vertical, hands ${r1(2 * gT[2])} cm apart over the chest`); set('Arm opening', 'peak', `${d(fromVert(Wb))} from vertical at the bottom (${d(CH.armDip(Wb))} below the back plane, ${TO_FEET}° toward the hips)`);
set('Grip', 'setup', 'Neutral, palms facing each other'); set('Grip', 'peak', 'Palms up at the bottom');
set('Cable', 'setup', `Low pulleys ${ANCHOR[1]} cm high beside the chest, ${2 * ANCHOR[2]} cm apart`); set('Cable', 'peak', `Both cables clear of the body by at least ${rep.lineMin} cm`);
set('Knee flexion', 'setup', `${d(H.kneeOf(W0, 'r'))}, feet ${2 * foot[2]} cm apart`); set('Knee flexion', 'peak', 'Unchanged (feet planted)');
set('Tempo', 'setup', 'Squeeze 0.6 s over the chest'); set('Tempo', 'peak', '2.2 s down, 0.4 s stretch, 1.5 s up');
console.log(`Cable Lying Fly: wrote ${L.write(ex)}\n  costs ${path.map((k) => r1(k.pose.__cost))} grip top ${gT.map(r1)} bottom ${EQ.gripPoint(Wb, 'r').p.map(r1)} elbow ${elbowR.map(r1)}\n  ${JSON.stringify({ floor: rep.floor, slide: rep.slide, lines: rep.lines, gap: rep.handleGap, hb: rep.handleBody, jump: rep.jump })}\n  bench ${sw.bodyBench} ${JSON.stringify(sw.bodyBenchAt)} peak ${peak}`);
