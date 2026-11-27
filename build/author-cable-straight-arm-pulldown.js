// Cable Straight Arm Pulldown (GymVisual 2894, Cable Straight Arm Pulldown; movement reference only, page not readable):
// standing facing a high pulley, feet about hip width (planted leg contacts), knees soft and the hips back so the trunk
// leans 25 degrees forward with a flat back. A straight bar (cable attachment 'bar', 50 cm, overhand grip with 44 cm
// between the grip points) is swept with straight arms (elbows fixed at a soft 12 degrees) from about head height down
// in an arc to the front of the thighs and back, shoulder blades setting down as the bar comes down; the trunk stays
// still. Bilateral (right arm solved, left mirrored). Tempo: 1.2 s down, 0.4 s at the thighs, 2 s up, 0.5 s pause.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const EQ = require('./families/equip');
const C = require('./families/eq-cable');
const B = require('./families/b5-cablepull');
const meta = require('./meta/cable-straight-arm-pulldown.json');

const ID = 'cable-straight-arm-pulldown';
const FLEX = 12, HALF = 22, BAR = 50, TH0 = 112;
const st = F.hinge({ trunk: 65, knee: 15, stance: 12 });
const trunkAt = (f, k) => {
  const p = clone(st.pose);
  p.ch.sc_r = { protract: r1(6 - 10 * k), elevate: r1(10 - 15 * k) }; p.ch.sc_l = clone(p.ch.sc_r);
  p.ch.neck_c7 = { rot: 0, flex: -10 }; p.ch.head_c1 = { rot: 0, flex: -8 }; // eyes ahead toward the pulley
  return p;
};
const R0 = L.reach(FLEX) + 7.2;
// arc in the sagittal plane at the grip's z: theta = angle of the shoulder-to-grip line from straight down (90 = level)
const gripOn = (S, th) => { const h = Math.sqrt(R0 * R0 - (HALF - S[2]) ** 2), a = th * Math.PI / 180; return [S[0] + h * Math.sin(a), S[1] - h * Math.cos(a), HALF]; };
// bottom of the arc: the lowest theta that keeps the bar 2 cm off the thighs (bar = segment through both grips)
const barClear = (W, g) => { const gl = [g[0], g[1], -g[2]]; return EQ.segmentClear(W, V.add(g, [0, 0, BAR / 2 - HALF]), V.add(gl, [0, 0, -(BAR / 2 - HALF)]), 1.5, { skip: /^(hand|thumb|forearm)_/ }).d; };
const Wb = L.fk(trunkAt(1, 1), st.contacts), Sb = Wb.shoulder_r.p;
const TH1 = r1(B.bis(-20, 60, (th) => barClear(Wb, gripOn(Sb, th)) < 2.5));
const { poses, err, names } = B.pullKeys({
  contacts: st.contacts, trunkAt, guess: { plane: 85, elev: 110, axial: -40, pron: 170, flex: FLEX }, flexAt: () => FLEX,
  gripAt: (f, k, W) => gripOn(W.shoulder_r.p, TH0 + (TH1 - TH0) * k),
  elbowAt: (f, k, W) => { const S = W.shoulder_r.p, g = gripOn(S, TH0 + (TH1 - TH0) * k); return V.add(V.add(S, V.scale(V.norm(V.sub(g, S)), L.UA)), [0, 0, 2]); }, wElbowAt: () => 0.4,
  // overhand: palm square to the arm, facing down when the arm is level and back when it hangs
  palmAt: (f, k) => { const a = (TH0 + (TH1 - TH0) * k) * Math.PI / 180; return [-Math.cos(a), -Math.sin(a), 0]; }, axis: [0, 0, 1],
});
const keyframes = B.pullFrames(meta, names, { go: 'pull', hold: 'squeeze', back: 'return', rest: 'reset' });

const ex = H.module_(meta, st.contacts, poses, keyframes);
const Ws = L.fk(poses.start, st.contacts), We = L.fk(poses.end, st.contacts);
const ANCHOR = [r1(EQ.barAt(Ws).c[0] + 45), 205, 0];
ex.props = [EQ.cableTower(ANCHOR), { id: 'bar', kind: 'cable', attachment: 'bar', size: [BAR, 3, 3], anchor: ANCHOR, attach: { joint: 'wrist_r', with: 'wrist_l' } }];

// loop checks: feet, floor, jumps, grip width, the cable clear of the head, the bar clear of the body, elbows fixed
const rep = C.scan(ex, { line: (W) => [ANCHOR, EQ.attachPoint(W, { two: true })] });
let barClr = { d: 1e9 }, elb = [1e9, -1e9];
H.loopReport(ex, { probe: (W, pz, t) => {
  const b = EQ.barAt(W), c = EQ.segmentClear(W, V.add(b.c, V.scale(b.ax, BAR / 2)), V.sub(b.c, V.scale(b.ax, BAR / 2)), 1.5, { skip: /^(hand|thumb|forearm)_/ });
  if (c.d < barClr.d) barClr = { d: +c.d.toFixed(2), id: c.id, t: +t.toFixed(2) };
  const e = C.elbowAng(W); elb = [Math.min(elb[0], e), Math.max(elb[1], e)];
} });
C.gate(ID, rep, { minLine: 1 });
C.limits(poses);
const fail = (m) => { console.error(`FAIL ${ID}: ${m}`); process.exitCode = 1; };
if (barClr.d < 0.5) fail(`bar into the body ${JSON.stringify(barClr)}`);
if (elb[1] - elb[0] > 3) fail(`elbow angle changes ${elb.map(r1)}`);

const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Shoulder flexion', 'setup', `Upper arm ${d(B.armTrunk(Ws))} from the trunk (bar about head height)`); set('Shoulder flexion', 'peak', `${d(B.armTrunk(We))} (bar ${Math.round(barClr.d)} cm off the thighs)`);
set('Elbow flexion', 'setup', `${d(elb[0])}-${d(elb[1]).slice(1)} over the loop`); set('Elbow flexion', 'peak', 'Unchanged');
set('Trunk', 'setup', `${d(B.trunkDeg(Ws))} forward lean, knees soft`); set('Trunk', 'peak', 'Unchanged');
set('Grip', 'setup', `Overhand, ${Math.round(EQ.barAt(Ws).width)} cm between the hands on a ${BAR} cm bar`); set('Grip', 'peak', `Unchanged (${rep.gripWidth.join('-')} cm)`);
set('Tempo', 'setup', 'Pause 0.5 s with the arms raised'); set('Tempo', 'peak', '1.2 s down, 0.4 s at the thighs, 2 s up');
console.log(`Cable Straight Arm Pulldown: wrote ${L.write(ex)}\n  keys ${JSON.stringify(err)}\n  theta ${TH0}-${TH1} anchor ${ANCHOR}\n  ${JSON.stringify(rep)}\n  bar ${JSON.stringify(barClr)} elbow ${elb.map(r1)}`);
