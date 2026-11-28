// Cable Seated One Arm Concentration Curl (GymVisual 14788; movement reference only, page not readable): seated on the end
// of a flat bench facing a low pulley, feet wide and flat (planted leg contacts), trunk leaning forward from the hips. The
// back of the right upper arm, just above the elbow, is braced against the inside of the right thigh; the left hand rests
// on the left thigh. The right hand holds a D-handle (cable attachment 'handle'); the cable runs forward and down to a
// low pulley in line with the hand. The forearm curls the handle up toward the right shoulder (palm up), short squeeze,
// slow lower to a straight arm with the cable still taut. The body, the arm brace and the curl path are the ones solved
// in author-dumbbell-concentration-curl.js (required here, which rewrites that module unchanged); only the load differs.
// authoredSide 'right' (the player mirrors the tower for the left clip).
const L = require('./lib');
const { V, r1 } = L;
const H = require('./families/hips');
const EQ = require('./families/equip');
const C = require('./families/eq-cable');
const CA = require('./families/b5-cablearms');
const DB = require('./author-dumbbell-concentration-curl');
const meta = require('./meta/cable-seated-one-arm-concentration-curl.json');

const ID = 'cable-seated-one-arm-concentration-curl';
const { contacts } = DB, poses = DB.ex.poses, keyframes = DB.ex.keyframes;
const ex = H.module_(meta, contacts, poses, keyframes);
const bench = DB.ex.props.find((p) => p.kind === 'bench');
const Wb = L.fk(poses.bottom, contacts), Wt = L.fk(poses.squeeze, contacts), gb = EQ.gripPoint(Wb, 'r').p;
const ANCHOR = [r1(gb[0] + 55), 12, r1(gb[2])];
ex.props = [bench, EQ.cableTower(ANCHOR), { id: 'handle', kind: 'cable', attachment: 'handle', anchor: ANCHOR, attach: { joint: 'wrist_r' } }];

// loop checks: feet, floor, jumps, the cable clear of the body (legs included), the handle clear of the body
const rep = C.scan(ex, { line: (W) => [ANCHOR, EQ.attachPoint(W, { side: 'r' })], lineSkip: /^(hand|thumb|forearm)_r$/ });
let hc = { d: 1e9 };
H.loopReport(ex, { probe: (W, pz, t) => { const c = CA.handleClear(W); if (c.d < hc.d) hc = { d: +c.d.toFixed(2), id: c.id, t: +t.toFixed(2) }; } });
C.gate(ID, rep, { minLine: 1, checkWidth: false });
C.limits(poses);
if (hc.d < 0) { console.error(`FAIL ${ID}: handle into the body ${JSON.stringify(hc)}`); process.exitCode = 1; }

const set = H.setKin(ex);
const uaV = (W) => Math.round(V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), [0, -1, 0]));
const trunk = V.angle(V.sub(Wb.neck_c7.p, Wb.pelvis.p), [0, 1, 0]);
set('Elbow flexion', 'setup', `≈${Math.round(C.elbowAng(Wb))}° (arm nearly straight)`); set('Elbow flexion', 'peak', `≈${Math.round(C.elbowAng(Wt))}° at the squeeze`);
set('Forearm rotation', 'setup', `Palm forward / in (pron ${poses.bottom.ch.wrist_r.pron}°)`); set('Forearm rotation', 'peak', `Palm up (pron ${poses.squeeze.ch.wrist_r.pron}°)`);
set('Upper arm', 'setup', `≈${uaV(Wb)}° from vertical (hanging, braced on the inner thigh)`); set('Upper arm', 'peak', `≈${uaV(Wt)}° from vertical (does not move)`);
set('Tempo', 'setup', 'Arm straight 0.6 s'); set('Tempo', 'peak', '1.2 s up, 0.5 s squeeze, 2.4 s down, 1.3 s at the bottom');
set('Trunk lean', 'setup', `≈${Math.round(trunk)}° forward from vertical`); set('Trunk lean', 'peak', 'Unchanged');
set('Cable', 'setup', `Low pulley ${Math.round(ANCHOR[0] - gb[0])} cm in front of the hand, ${ANCHOR[1]} cm high, in line with it`); set('Cable', 'peak', `Clear of the body and legs by at least ${rep.line.d} cm`);
console.log(`Cable Seated One Arm Concentration Curl: wrote ${L.write(ex)}\n  anchor ${ANCHOR}\n  ${JSON.stringify(rep)}\n  handle ${JSON.stringify(hc)}`);
