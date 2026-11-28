// Cable Close Grip Front Lat Pulldown (GymVisual 5098, Cable Close Grip Front Lat Pulldown; movement reference only, page
// not readable): seated on a box under a high pulley, feet flat on the floor (planted leg contacts). A lat bar (cable
// attachment 'bar', 120 cm) held overhand with the hands a little narrower than the shoulders (about 32 cm between the
// grip points). From the arms long overhead (shoulders lifted) the shoulder blades draw down and the bar comes down in
// front of the face to the upper chest, the elbows driving down and slightly forward, close to the sides, while the trunk
// leans back from about 4 to 12 degrees; then the bar rises under control. The machine's thigh pads are not modelled
// (plain box seat). Bilateral (right arm solved, left mirrored). Tempo: 1.2 s down, 0.4 s at the chest, 2 s up, 0.5 s
// stretch. Built like author-cable-close-grip-front-lat-pulldown.js; family b6-08.js.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const EQ = require('./families/equip');
const C = require('./families/eq-cable');
const B = require('./families/b5-cablepull');
const X = require('./families/b6-08');
const meta = require('./meta/cable-close-grip-front-lat-pulldown.json');

const ID = 'cable-close-grip-front-lat-pulldown';
const ENV = (k, v) => +(process.env[k] ?? v);
const LEAN0 = -4, LEAN1 = -12, HALF = ENV('HALF', 16), BAR = 120, TOPFLEX = 10;
const base = B.seatedBox({ feet: 'floor', stance: 16, seatH: 46 });
const trunkAt = (f, k) => {
  const lean = LEAN0 + (LEAN1 - LEAN0) * k, p = B.leanTo(base, lean, { spine: { spine_t6: { flex: r1(2 - 6 * k) } } });
  p.ch.sc_r = { protract: r1(4 - 12 * k), elevate: r1(16 - 22 * k) }; p.ch.sc_l = clone(p.ch.sc_r);
  p.ch.neck_c7 = { rot: 0, flex: r1(-0.5 * lean) }; p.ch.head_c1 = { rot: 0, flex: r1(-4 - 0.3 * lean) }; // eyes level to slightly up
  return p;
};
const W0 = L.fk(trunkAt(0, 0), base.contacts), W1 = L.fk(trunkAt(1, 1), base.contacts), S0 = W0.shoulder_r.p, S1 = W1.shoulder_r.p;
// top: arms long overhead (elbow TOPFLEX), grips 4 cm in front of the shoulders; bottom: bar at the upper chest
const R0 = L.reach(TOPFLEX) + ENV('RO', 7.5);
const G0 = [r1(S0[0] + 4), r1(S0[1] + Math.sqrt(R0 * R0 - 16 - (HALF - S0[2]) ** 2)), HALF];
const G1 = [r1(B.extreme(W1, 'chest', [1, 0, 0])[0] + ENV('GX', 6)), r1(S1[1] + ENV('GY', 0)), HALF];
const D0 = B.armDir(30, 160), D1 = B.armDir(ENV('PL', 20), ENV('EL', 35));
const gripAt = (f, k) => { const g = B.lerpV(G0, G1, k); g[0] += 6 * Math.sin(Math.PI * k); g[2] = HALF; return g; }; // the bar bows forward past the face
const elbowAt = (f, k, W) => V.add(W.shoulder_r.p, V.scale(V.norm(B.lerpV(D0, D1, k)), L.UA));
// palm forward, square to the forearm (elbow hint to grip)
const palmAt = (f, k, W) => { const u = V.norm(V.sub(gripAt(f, k), elbowAt(f, k, W))); return V.norm(V.sub([1, 0, 0], V.scale(u, u[0]))); };
const { poses, err, names } = X.pullKeys2({ reverse: false, wAxial: ENV('WA', 0.004),
  contacts: base.contacts, trunkAt, guess: { plane: 30, elev: 160, axial: 0, pron: 90, flex: TOPFLEX },
  gripAt, elbowAt, wElbowAt: () => 0.25, palmAt, axis: [0, 0, 1], wPalm: 2, N: 16,
});
const keyframes = B.pullFrames(meta, names, { go: 'pull', hold: 'squeeze', back: 'return', rest: 'reset' });

const ex = H.module_(meta, base.contacts, poses, keyframes);
const ANCHOR = [r1(G0[0] + 2), 238, 0];
ex.props = [base.seat, EQ.cableTower(ANCHOR, { offset: [-45, 0], height: 248 }), { id: 'latbar', kind: 'cable', attachment: 'bar', size: [BAR, 3, 3], anchor: ANCHOR, attach: { joint: 'wrist_r', with: 'wrist_l' } }];

// loop checks: feet, floor, jumps, grip width, the cable clear of the head, the bar clear of the head and body, thighs
const ck = X.twoHandChecks(ID, ex, { anchor: ANCHOR, barLen: BAR, seat: base.seat });
const rep = ck.rep, barClr = ck.barClr, seatLow = ck.seatLow;

const Wt = L.fk(poses.start, base.contacts), Wb = L.fk(poses.end, base.contacts), set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Grip', 'setup', `Overhand, ${Math.round(EQ.barAt(Wt).width)} cm between the hands on a ${BAR} cm lat bar (shoulders ${Math.round(Wt.shoulder_r.p[2] - Wt.shoulder_l.p[2])} cm apart)`); set('Grip', 'peak', `Unchanged (${rep.gripWidth.join('-')} cm)`);
set('Elbow flexion', 'setup', `${d(C.elbowAng(Wt))} (arms long)`); set('Elbow flexion', 'peak', `${d(C.elbowAng(Wb))} (bar at the upper chest, elbows ${Math.round(Wb.elbow_r.p[0] - Wb.shoulder_r.p[0])} cm in front of the shoulders)`);
set('Shoulder elevation', 'setup', `${d(B.armTrunk(Wt))} from the trunk (overhead)`); set('Shoulder elevation', 'peak', `${d(B.armTrunk(Wb))}`);
set('Trunk lean', 'setup', `${d(-B.trunkDeg(Wt))} back`); set('Trunk lean', 'peak', `${d(-B.trunkDeg(Wb))} back`);
set('Tempo', 'setup', 'Stretch 0.5 s at the top'); set('Tempo', 'peak', '1.2 s down, 0.4 s at the chest, 2 s up');
console.log(`Cable Close Grip Front Lat Pulldown: wrote ${L.write(ex)}\n  keys ${JSON.stringify(err)}\n  G0 ${G0} G1 ${G1} anchor ${ANCHOR}\n  ${JSON.stringify(rep)}\n  bar ${JSON.stringify(barClr)} seat ${seatLow} peak ${ck.peak}`);
