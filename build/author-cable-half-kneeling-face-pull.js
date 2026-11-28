// Cable Half Kneeling Face Pull (GymVisual 18427, Cable Half Kneeling Face Pull; movement reference only, page not
// readable): half kneeling on a mat facing a cable column, right knee down under the hip with the toes tucked, left foot
// flat in front with the knee bent about 90 degrees (planted leg contacts), trunk tall. A rope (cable attachment 'rope')
// runs from a pulley set a little above face height; the hands hold the rope ends overhand, thumbs toward the face,
// 40 cm apart (kept constant: the hands stay on the rope ends). From the arms long toward the pulley (shoulder blades
// forward) the elbows pull back and out, high (about shoulder height), and the shoulders turn out so the hands finish
// beside the ears, knuckles up, shoulder blades drawn together; then the arms reach forward again. Bilateral (right
// arm solved, left mirrored; the legs are not mirrored, which is fine for a half-kneeling stance). Tempo: 1.2 s pull,
// 0.4 s hold, 2 s return, 0.5 s pause. Family b6-08.js on the b4-shoulders3 halfKneel base.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const EQ = require('./families/equip');
const C = require('./families/eq-cable');
const B = require('./families/b5-cablepull');
const K = require('./families/b4-shoulders3');
const X = require('./families/b6-08');
const meta = require('./meta/cable-half-kneeling-face-pull.json');

const ID = 'cable-half-kneeling-face-pull';
const ENV = (k, v) => +(process.env[k] ?? v);
const HALF = ENV('HALF', 20), REACH = L.reach(12) + 6;
const kn = K.halfKneel({ down: 'r', width: 11, toePitch: 78 }), contacts = kn.contacts;
const trunkAt = (f, k) => {
  const p = X.kneelLean(kn, 1 - 3 * k);
  p.ch.sc_r = { protract: r1(10 - 24 * k), elevate: r1(2 + 3 * k) }; p.ch.sc_l = clone(p.ch.sc_r);
  p.ch.neck_c7 = { rot: 0, flex: 0 }; p.ch.head_c1 = { rot: 0, flex: -2 };
  return p;
};
const W0 = L.fk(trunkAt(0, 0), contacts), W1 = L.fk(trunkAt(1, 1), contacts), S0 = W0.shoulder_r.p, S1 = W1.shoulder_r.p;
const ANCHOR = [r1(S0[0] + ENV('AX', 115)), r1(S0[1] + ENV('AY', 14)), 0];
const toA = V.norm([ANCHOR[0] - S0[0], ANCHOR[1] - S0[1], 0]);
const G0 = V.add([S0[0], S0[1], HALF], V.scale(toA, Math.sqrt(REACH * REACH - (S0[2] - HALF) ** 2)));
const G1 = [r1(S1[0] + ENV('GX', 10)), r1(S1[1] + ENV('GY', 17)), HALF];
const D0 = V.norm(V.sub(G0, S0)), D1 = B.armDir(ENV('PL', -10), ENV('EL', 85));
// the hands travel back high: the path bows up a little so the elbows lead
const gripAt = (f, k) => { const g = B.lerpV(G0, G1, k); g[1] += ENV('BOW', 3) * Math.sin(Math.PI * k); g[2] = HALF; return g; };
const palmAt = (f, k) => V.norm(B.lerpV([0, -0.6, -1], [0.35, 0, -1], k));
const { poses, err, names } = X.pullKeys2({
  contacts, trunkAt, reverse: false, wAxial: 0.01, guess: { plane: 85, elev: 95, axial: -20, pron: 120, flex: 12 },
  gripAt, elbowAt: (f, k, W) => V.add(W.shoulder_r.p, V.scale(V.norm(B.lerpV(D0, D1, k)), L.UA)), wElbowAt: (k) => ENV('W0', 0.2) + ENV('W1', 0.5) * k,
  palmAt, wPalm: ENV('WP', 1.5),
});
const keyframes = B.pullFrames(meta, names, { go: 'pull', hold: 'squeeze', back: 'return', rest: 'reset' });

const ex = H.module_(meta, contacts, poses, keyframes);
ex.props = [{ id: 'mat', kind: 'mat', center: [0, 0, 0], size: [90, 0.6, 60] }, EQ.cableTower(ANCHOR, { offset: [8, 0] }), X.ropeProp(ANCHOR)];

// loop checks: knee / feet, floor, jumps, constant grip width, the cable (pulley to knot) and rope strands clear of the
// face and body, the hands clear of the head, the down knee on the floor
const ck = X.twoHandChecks(ID, ex, { anchor: ANCHOR, rope: true, bodyIds: ['head', 'jaw', 'ear_r', 'ear_l', 'neck', 'chest'].filter((id) => { try { EQ.pointShape(L.fk(poses.start, contacts), [0, 0, 0], id); return true; } catch (e) { return false; } }) });
const rep = ck.rep;
const kl = K.kneeLow(L.fk(poses.start, contacts), 'r');
if (kl < -0.5 || kl > 1.5) { console.error(`FAIL ${ID}: knee ${kl.toFixed(2)} cm off the floor`); process.exitCode = 1; }

const Wb = L.fk(poses.start, contacts), Wt = L.fk(poses.end, contacts), set = H.setKin(ex), d = X.d;
const elevOf = (W) => V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), V.sub(W.pelvis.p, W.neck_c7.p));
const hAbd = (W) => { const u = V.sub(W.elbow_r.p, W.shoulder_r.p); return Math.atan2(u[0], u[2]) / L.R.DEG; };
const foreUp = (W) => V.angle(V.sub(W.wrist_r.p, W.elbow_r.p), [0, 1, 0]);
set('Elbow height', 'setup', `Arms reaching to the pulley, ${d(elevOf(Wb))} of elevation`); set('Elbow height', 'peak', `${d(elevOf(Wt))} of elevation, elbow ${Math.round(Wt.elbow_r.p[1] - Wt.shoulder_r.p[1])} cm vs the shoulder joint`);
set('Horizontal abduction', 'setup', `Upper arm ${d(hAbd(Wb))} in front of the frontal plane`); set('Horizontal abduction', 'peak', `Upper arm ${d(Math.abs(hAbd(Wt)))} ${hAbd(Wt) < 0 ? 'behind' : 'in front of'} the frontal plane`);
set('External rotation', 'setup', `Forearm in line with the rope (${d(foreUp(Wb))} from vertical)`); set('External rotation', 'peak', `Forearm ${d(foreUp(Wt))} from vertical, hands beside the ears (${Math.round(EQ.gripPoint(Wt, 'r').p[1] - Wt.shoulder_r.p[1])} cm above the shoulder joint)`);
set('Elbow flexion', 'setup', d(C.elbowAng(Wb))); set('Elbow flexion', 'peak', d(C.elbowAng(Wt)));
set('Trunk', 'setup', `Half kneeling, right knee down, left knee ${d(kn.info.kneeU)}; trunk ${d(Math.abs(B.trunkDeg(Wb)))} from vertical`); set('Trunk', 'peak', `Unchanged (${d(Math.abs(B.trunkDeg(Wt)))}); hands ${Math.round(EQ.barAt(Wb).width)} cm apart on the rope ends (${rep.gripWidth.join('-')} cm)`);
set('Tempo', 'setup', 'Pause 0.5 s with the arms long'); set('Tempo', 'peak', '1.2 s pull, 0.4 s hold, 2 s return');
console.log(`Cable Half Kneeling Face Pull: wrote ${L.write(ex)}\n  keys ${JSON.stringify(err)}\n  anchor ${ANCHOR} G0 ${G0.map(r1)} G1 ${G1} knee ${kl.toFixed(2)}\n  ${JSON.stringify(rep)}\n  ${JSON.stringify({ strand: ck.strand, hand: ck.hand, peak: ck.peak })}`);
