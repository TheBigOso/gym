// Cable Kneeling Pulldown (GymVisual 24397, Cable Kneeling Pulldown (version 3); movement reference only, page not
// readable): tall kneeling on a mat facing a high pulley, knees about hip width under the hips, toes tucked (planted leg
// contacts). A lat bar (cable attachment 'bar', 120 cm) held overhand a little wider than the shoulders (about 52 cm
// between the grip points). From the arms long, reaching up toward the pulley (shoulders lifted), the shoulder blades
// draw down and the bar comes down in front of the face to the upper chest, the elbows sweeping down and slightly back,
// while the trunk leans back a few degrees from the hips (about 2 to 8 degrees); then the bar rises under control. The
// pulley sits a little in front of the hands so the cable runs clear of the face. Bilateral (right arm solved, left
// mirrored). Tempo: 1.2 s down, 0.4 s at the chest, 2 s up, 0.5 s stretch. Family b6-08.js (kneelLean on the
// b5-cablepush tallKneel base).
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const EQ = require('./families/equip');
const C = require('./families/eq-cable');
const B = require('./families/b5-cablepull');
const P = require('./families/b5-cablepush');
const K = require('./families/b4-shoulders3');
const X = require('./families/b6-08');
const meta = require('./meta/cable-kneeling-pulldown.json');

const ID = 'cable-kneeling-pulldown';
const ENV = (k, v) => +(process.env[k] ?? v);
const LEAN0 = -2, LEAN1 = -8, HALF = ENV('HALF', 26), BAR = 120, TOPFLEX = 10;
const kn = P.tallKneel({ toePitch: 78 }), base = { contacts: kn.contacts };
const trunkAt = (f, k) => {
  const lean = LEAN0 + (LEAN1 - LEAN0) * k, p = X.kneelLean(kn, lean, { spine: { spine_t6: { flex: r1(2 - 5 * k) } } });
  p.ch.sc_r = { protract: r1(4 - 12 * k), elevate: r1(16 - 22 * k) }; p.ch.sc_l = clone(p.ch.sc_r);
  p.ch.neck_c7 = { rot: 0, flex: r1(-0.5 * lean) }; p.ch.head_c1 = { rot: 0, flex: r1(-4 - 0.3 * lean) }; // eyes level to slightly up
  return p;
};
const W0 = L.fk(trunkAt(0, 0), base.contacts), W1 = L.fk(trunkAt(1, 1), base.contacts), S0 = W0.shoulder_r.p, S1 = W1.shoulder_r.p;
// top: arms long overhead (elbow TOPFLEX), grips 4 cm in front of the shoulders; bottom: bar at the upper chest
const R0 = L.reach(TOPFLEX) + ENV('RO', 7.5);
const G0 = [r1(S0[0] + 4), r1(S0[1] + Math.sqrt(R0 * R0 - 16 - (HALF - S0[2]) ** 2)), HALF];
const G1 = [r1(B.extreme(W1, 'chest', [1, 0, 0])[0] + ENV('GX', 6)), r1(S1[1] + ENV('GY', 1)), HALF];
const D0 = B.armDir(20, 160), D1 = B.armDir(ENV('PL', -15), ENV('EL', 40));
const gripAt = (f, k) => { const g = B.lerpV(G0, G1, k); g[0] += 6 * Math.sin(Math.PI * k); g[2] = HALF; return g; }; // the bar bows forward past the face
const elbowAt = (f, k, W) => V.add(W.shoulder_r.p, V.scale(V.norm(B.lerpV(D0, D1, k)), L.UA));
// palm forward, square to the forearm (elbow hint to grip)
const palmAt = (f, k, W) => { const u = V.norm(V.sub(gripAt(f, k), elbowAt(f, k, W))); return V.norm(V.sub([1, 0, 0], V.scale(u, u[0]))); };
const { poses, err, names } = X.pullKeys2({ reverse: false, wAxial: ENV('WA', 0.004),
  contacts: base.contacts, trunkAt, guess: { plane: 20, elev: 160, axial: 0, pron: 90, flex: TOPFLEX },
  gripAt, elbowAt, wElbowAt: () => 0.25, palmAt, axis: [0, 0, 1], wPalm: 2, N: 16,
});
const keyframes = B.pullFrames(meta, names, { go: 'pull', hold: 'squeeze', back: 'return', rest: 'reset' });

const ex = H.module_(meta, base.contacts, poses, keyframes);
const ANCHOR = [r1(G0[0] + ENV('AX', 16)), 232, 0];
ex.props = [{ id: 'mat', kind: 'mat', center: [-10, 0, 0], size: [80, 0.6, 60] }, EQ.cableTower(ANCHOR, { offset: [25, 0], height: 245 }), { id: 'latbar', kind: 'cable', attachment: 'bar', size: [BAR, 3, 3], anchor: ANCHOR, attach: { joint: 'wrist_r', with: 'wrist_l' } }];

// loop checks: feet, floor, jumps, grip width, the cable clear of the head, the bar clear of the head and body, thighs
const ck = X.twoHandChecks(ID, ex, { anchor: ANCHOR, barLen: BAR });
const rep = ck.rep, barClr = ck.barClr;
let kl = [1e9, -1e9];
H.loopReport(ex, { probe: (W) => { const v = Math.min(K.kneeLow(W, 'r'), K.kneeLow(W, 'l')); kl = [Math.min(kl[0], v), Math.max(kl[1], v)]; } });
if (kl[0] < -0.5 || kl[1] > 1.5) { console.error(`FAIL ${ID}: knees ${kl.map((v) => v.toFixed(2))} cm off the floor`); process.exitCode = 1; }

const Wt = L.fk(poses.start, base.contacts), Wb = L.fk(poses.end, base.contacts), set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Grip', 'setup', `Overhand, ${Math.round(EQ.barAt(Wt).width)} cm between the hands on a ${BAR} cm lat bar (shoulders ${Math.round(Wt.shoulder_r.p[2] - Wt.shoulder_l.p[2])} cm apart)`); set('Grip', 'peak', `Unchanged (${rep.gripWidth.join('-')} cm)`);
set('Elbow flexion', 'setup', `${d(C.elbowAng(Wt))} (arms long)`); set('Elbow flexion', 'peak', `${d(C.elbowAng(Wb))} (bar at the upper chest)`);
set('Shoulder elevation', 'setup', `${d(B.armTrunk(Wt))} from the trunk (overhead)`); set('Shoulder elevation', 'peak', `${d(B.armTrunk(Wb))}`);
set('Trunk lean', 'setup', `Tall kneeling, ${d(-B.trunkDeg(Wt))} back of vertical, knees ${2 * Math.abs(kn.info.r.tD[2])} cm apart`); set('Trunk lean', 'peak', `${d(-B.trunkDeg(Wb))} back`);
set('Tempo', 'setup', 'Stretch 0.5 s at the top'); set('Tempo', 'peak', '1.2 s down, 0.4 s at the chest, 2 s up');
console.log(`Cable Kneeling Pulldown: wrote ${L.write(ex)}\n  keys ${JSON.stringify(err)}\n  G0 ${G0} G1 ${G1} anchor ${ANCHOR}\n  ${JSON.stringify(rep)}\n  bar ${JSON.stringify(barClr)} knees ${kl.map((v) => v.toFixed(2))} peak ${ck.peak}`);
