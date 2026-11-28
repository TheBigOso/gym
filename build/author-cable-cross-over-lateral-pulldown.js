// Cable Cross Over Lateral Pulldown (GymVisual 6534, Cable Cross over Lateral Pulldown; movement reference only, page not
// readable): tall kneeling on a mat midway between the two towers of a cable crossover, knees about hip width under the
// hips, toes tucked (planted leg contacts). One D-handle in each hand, each on the cable from its own high pulley, up and
// out to the side (tower_r on the right, tower_l on the left). From the arms long, reaching up and out toward the
// pulleys with the palms forward (shoulders lifted), the shoulder blades draw down and the elbows pull down and in along
// a frontal-plane arc until they are tucked beside the ribs with the hands beside the shoulders; then the handles rise
// along the same arc. The trunk stays tall and still. Bilateral (right arm solved, left mirrored). Tempo: 1.2 s down,
// 0.4 s squeeze, 2 s up, 0.5 s stretch. Family b6-08.js (kneelLean, pullKeys2) with b5-cablepush towers / handles.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const EQ = require('./families/equip');
const C = require('./families/eq-cable');
const B = require('./families/b5-cablepull');
const P = require('./families/b5-cablepush');
const K = require('./families/b4-shoulders3');
const X = require('./families/b6-08');
const meta = require('./meta/cable-cross-over-lateral-pulldown.json');

const ID = 'cable-cross-over-lateral-pulldown';
const ENV = (k, v) => +(process.env[k] ?? v);
const kn = P.tallKneel({ toePitch: 78 }), contacts = kn.contacts;
const trunkAt = (f, k) => {
  const p = X.kneelLean(kn, -2 - 2 * k);
  p.ch.sc_r = { protract: r1(2 - 6 * k), elevate: r1(16 - 22 * k) }; p.ch.sc_l = clone(p.ch.sc_r);
  p.ch.neck_c7 = { rot: 0, flex: 0 }; p.ch.head_c1 = { rot: 0, flex: -3 };
  return p;
};
const W0 = L.fk(trunkAt(0, 0), contacts), W1 = L.fk(trunkAt(1, 1), contacts), S0 = W0.shoulder_r.p, S1 = W1.shoulder_r.p;
const ANCHOR = [r1(S0[0] + ENV('AX', 6)), ENV('AY', 228), ENV('AZ', 95)]; // right high pulley, up and out to the side
// top: arm long toward the pulley (elbow ~12 degrees); bottom: hand beside the shoulder, elbow tucked to the ribs
const REACH = L.reach(12) + 6;
const G0 = V.add(S0, V.scale(V.norm(V.sub(ANCHOR, S0)), REACH));
const G1 = [r1(S1[0] + ENV('GX', 4)), r1(S1[1] + ENV('GY', 2)), r1(S1[2] + ENV('GZ', 13))];
const D0 = V.norm(V.sub(G0, S0)), D1 = B.armDir(ENV('PL', 15), ENV('EL', 30));
const palmAt = (f, k) => V.norm(B.lerpV([1, 0, -0.15], [1, 0, -0.45], k));
const { poses, err, names } = X.pullKeys2({
  contacts, trunkAt, reverse: false, wAxial: 0.01, guess: { plane: 15, elev: 145, axial: 0, pron: 90, flex: 12 },
  gripAt: (f, k) => B.lerpV(G0, G1, k),
  elbowAt: (f, k, W) => V.add(W.shoulder_r.p, V.scale(V.norm(B.lerpV(D0, D1, k)), L.UA)), wElbowAt: (k) => 0.15 + 0.35 * k,
  palmAt, wPalm: 1.5,
});
const keyframes = B.pullFrames(meta, names, { go: 'pull', hold: 'squeeze', back: 'return', rest: 'reset' });

const ex = H.module_(meta, contacts, poses, keyframes);
ex.props = [{ id: 'mat', kind: 'mat', center: [-10, 0, 0], size: [80, 0.6, 60] }, ...P.towers(ANCHOR, { offset: [0, 12], height: 238 }), ...P.handles(ANCHOR)];

// loop checks: knees / feet, floor, both cable lines clear of the body, handles apart and clear of the body, jumps,
// joint limits, knees on the floor
const rep = P.checkTwoHandle(ID, ex, ANCHOR, { minGap: 20 });
let kl = [1e9, -1e9];
H.loopReport(ex, { probe: (W) => { const v = Math.min(K.kneeLow(W, 'r'), K.kneeLow(W, 'l')); kl = [Math.min(kl[0], v), Math.max(kl[1], v)]; } });
const fail = (m) => { console.error(`FAIL ${ID}: ${m}`); process.exitCode = 1; };
if (kl[0] < -0.5 || kl[1] > 1.5) fail(`knees ${kl.map((v) => v.toFixed(2))} cm off the floor`);
if (rep.dorsiR[1] > 35) fail(`ankle ${rep.dorsiR}`);
const peak = X.checkMeasure(ID, ex);

const Wt = L.fk(poses.start, contacts), Wb = L.fk(poses.end, contacts), set = H.setKin(ex), d = X.d;
const fromSide = (W) => { const u = V.sub(W.elbow_r.p, W.shoulder_r.p); return Math.atan2(u[0], u[2]) / L.R.DEG; };
set('Arm path', 'setup', `Upper arm ${d(B.armTrunk(Wt))} from the trunk, reaching up and out toward the pulley`); set('Arm path', 'peak', `Elbow beside the ribs (${d(fromSide(Wb))} forward of the frontal plane), hand ${Math.round(EQ.gripPoint(Wb, 'r').p[1] - Wb.shoulder_r.p[1])} cm vs shoulder height`);
set('Elbow flexion', 'setup', `${d(C.elbowAng(Wt))} (arms long)`); set('Elbow flexion', 'peak', `${d(C.elbowAng(Wb))}`);
set('Shoulder elevation', 'setup', `${d(B.armTrunk(Wt))} from the trunk`); set('Shoulder elevation', 'peak', `${d(B.armTrunk(Wb))} from the trunk`);
set('Trunk lean', 'setup', `Tall kneeling, ${d(Math.abs(B.trunkDeg(Wt)))} from vertical; pulleys ${ANCHOR[1]} cm high, ${2 * ANCHOR[2]} cm apart`); set('Trunk lean', 'peak', `Unchanged (${d(Math.abs(B.trunkDeg(Wb)))}); cables clear of the body by at least ${rep.lineMin} cm`);
set('Tempo', 'setup', 'Stretch 0.5 s at the top'); set('Tempo', 'peak', '1.2 s down, 0.4 s squeeze, 2 s up');
console.log(`Cable Cross Over Lateral Pulldown: wrote ${L.write(ex)}\n  keys ${JSON.stringify(err)}\n  anchor ${ANCHOR} G0 ${G0.map(r1)} G1 ${G1}\n  ${JSON.stringify({ floor: rep.floor, slide: rep.slide, lines: rep.lines, gap: rep.handleGap, hb: rep.handleBody, jump: rep.jump })}\n  knees ${kl.map((v) => v.toFixed(2))} peak ${peak}`);
