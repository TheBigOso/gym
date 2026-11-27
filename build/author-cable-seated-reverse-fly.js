// Cable Seated Reverse Fly (GymVisual 21841, Cable Seated Reverse Fly (male); movement reference only, page not
// readable): seated tall on a box between two pulleys set at shoulder height in front (a crossover), feet flat on the
// floor (planted leg contacts). The right hand holds the cable from the left pulley and the left hand the cable from the
// right pulley (D-handles, thumbs up), so the cables cross in front of the body. From the arms long in front at shoulder
// height (hands 28 cm apart), the arms sweep out in a wide horizontal arc to a T in line with the shoulders, elbows
// fixed at a soft 14 degrees, then return. The two pulleys sit 12 cm apart in height so the crossing cables pass each
// other. Bilateral (right arm solved, left mirrored). Tempo: 1.2 s out, 0.4 s hold, 2 s back, 0.5 s pause.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const EQ = require('./families/equip');
const C = require('./families/eq-cable');
const B = require('./families/b5-cablepull');
const meta = require('./meta/cable-seated-reverse-fly.json');

const ID = 'cable-seated-reverse-fly';
const LEAN = 4, FLEX = 14, HAND0 = 14, PHI1 = 92, DROP = 4;
const base = B.seatedBox({ feet: 'floor', stance: 16, seatH: 46 });
const trunkAt = (f, k) => {
  const p = B.leanTo(base, LEAN);
  p.ch.sc_r = { protract: r1(8 - 18 * k), elevate: 2 }; p.ch.sc_l = clone(p.ch.sc_r);
  p.ch.neck_c7 = { rot: 0, flex: -2 }; p.ch.head_c1 = { rot: 0, flex: -1 };
  return p;
};
// grip radius from the shoulder with the elbow at FLEX (grip point about 7.5 cm past the wrist along the hand)
const R0 = L.reach(FLEX) + 7.2;
// horizontal arc: phi = angle of the shoulder-to-grip line from straight ahead toward the right (0 = forward)
const gripOn = (S, phi) => { const a = phi * Math.PI / 180, h = Math.sqrt(R0 * R0 - DROP * DROP); return [S[0] + h * Math.cos(a), S[1] - DROP, S[2] + h * Math.sin(a)]; };
const W0 = L.fk(trunkAt(0, 0), base.contacts), S0 = W0.shoulder_r.p;
const PHI0 = Math.asin((HAND0 - S0[2]) / R0) * 180 / Math.PI;
const { poses, err, names } = B.pullKeys({
  contacts: base.contacts, trunkAt, guess: { plane: 95, elev: 86, axial: -10, pron: 90, flex: FLEX }, flexAt: () => FLEX,
  gripAt: (f, k, W) => gripOn(W.shoulder_r.p, PHI0 + (PHI1 - PHI0) * k),
  elbowAt: (f, k, W) => { const S = W.shoulder_r.p, g = gripOn(S, PHI0 + (PHI1 - PHI0) * k); return V.add(V.add(S, V.scale(V.norm(V.sub(g, S)), L.UA)), [0, -2.5, 0]); }, wElbowAt: () => 0.5,
  palmAt: (f, k) => { const a = (PHI0 + (PHI1 - PHI0) * k) * Math.PI / 180; return [Math.sin(a), 0, -Math.cos(a)]; }, axis: [0, 1, 0],
});
const keyframes = B.pullFrames(meta, names, { go: 'open', hold: 'hold', back: 'close', rest: 'reset' });

const ex = H.module_(meta, base.contacts, poses, keyframes);
const AX = r1(S0[0] + 110), AZ = 55, AY = r1(S0[1] - DROP);
const A_L = [AX, r1(AY + 6), -AZ], A_R = [AX, r1(AY - 6), AZ]; // left pulley (right hand), right pulley (left hand)
ex.props = [base.seat, EQ.cableTower(A_L, { id: 'towerL' }), EQ.cableTower(A_R, { id: 'towerR' }),
  { id: 'handleR', kind: 'cable', attachment: 'handle', anchor: A_L, attach: { joint: 'wrist_r' } },
  { id: 'handleL', kind: 'cable', attachment: 'handle', anchor: A_R, attach: { joint: 'wrist_l' } }];

// loop checks: feet, floor, jumps, each cable clear of the body (only its own hand / forearm skipped), the cables apart
// where they cross, elbows unchanged, thighs on the seat
const repR = C.scan(ex, { line: (W) => [A_L, EQ.gripPoint(W, 'r').p], lineSkip: /^(hand|thumb|forearm)_r$/ });
const repL = C.scan(ex, { line: (W) => [A_R, EQ.gripPoint(W, 'l').p], lineSkip: /^(hand|thumb|forearm)_l$/ });
let cross = 1e9, elb = [1e9, -1e9], seatLow = 1e9;
const segDist = (a, b, c, d) => { let m = 1e9; for (let i = 0; i <= 40; i++) { const p = V.add(a, V.scale(V.sub(b, a), i / 40)); for (let j = 0; j <= 40; j++) m = Math.min(m, V.len(V.sub(p, V.add(c, V.scale(V.sub(d, c), j / 40))))); } return m; };
H.loopReport(ex, { probe: (W, pz, t) => {
  if (Math.round(t * 100) % 5 === 0) cross = Math.min(cross, segDist(A_L, EQ.gripPoint(W, 'r').p, A_R, EQ.gripPoint(W, 'l').p));
  const e = C.elbowAng(W); elb = [Math.min(elb[0], e), Math.max(elb[1], e)];
  seatLow = Math.min(seatLow, B.thighOnSeat(W, base.seat));
} });
C.gate(ID, repR, { minLine: 1, checkWidth: false }); C.gate(ID, repL, { minLine: 1, checkWidth: false });
C.limits(poses);
const fail = (m) => { console.error(`FAIL ${ID}: ${m}`); process.exitCode = 1; };
if (cross < 1) fail(`cables touch where they cross (${cross.toFixed(2)} cm)`);
if (elb[1] - elb[0] > 3) fail(`elbow angle changes ${elb.map(r1)}`);
if (seatLow < -1.5) fail(`thighs into the seat ${seatLow.toFixed(2)}`);

const Ws = L.fk(poses.start, base.contacts), We = L.fk(poses.end, base.contacts), set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
const hz = (W) => { const u = V.sub(W.elbow_r.p, W.shoulder_r.p); return Math.atan2(u[2], u[0]) * 180 / Math.PI; }; // 0 = forward, 90 = out to the side
set('Shoulder horizontal abduction', 'setup', `Upper arm ${d(hz(Ws))} from straight ahead (hands ${Math.round(EQ.gripPoint(Ws, 'r').p[2] * 2)} cm apart in front)`); set('Shoulder horizontal abduction', 'peak', `${d(hz(We))} from straight ahead (arms in a T)`);
set('Shoulder elevation', 'setup', `${d(B.armTrunk(Ws))} from the trunk`); set('Shoulder elevation', 'peak', `${d(B.armTrunk(We))}`);
set('Elbow flexion', 'setup', `${d(elb[0])}-${d(elb[1]).slice(1)} over the loop`); set('Elbow flexion', 'peak', 'Unchanged');
set('Trunk', 'setup', `${d(B.trunkDeg(Ws))} forward of upright, seated tall`); set('Trunk', 'peak', 'Unchanged');
set('Tempo', 'setup', 'Pause 0.5 s with the hands in front'); set('Tempo', 'peak', '1.2 s out, 0.4 s hold, 2 s back');
console.log(`Cable Seated Reverse Fly: wrote ${L.write(ex)}\n  keys ${JSON.stringify(err)}\n  phi ${PHI0.toFixed(1)}-${PHI1} R0 ${R0.toFixed(1)} anchors ${A_L} / ${A_R}\n  R ${JSON.stringify(repR)}\n  L line ${JSON.stringify(repL.line)} cross ${cross.toFixed(2)} elbow ${elb.map(r1)} seat ${seatLow.toFixed(2)}`);
