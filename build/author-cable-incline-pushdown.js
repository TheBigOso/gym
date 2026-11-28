// Cable Incline Pushdown (GymVisual 19230; movement reference only, the page could not be read, so the movement follows
// the name and a written description of the same exercise: lie back on an incline bench facing away from a high pulley,
// straight bar, overhand grip about shoulder width; with straight arms sweep the bar in a semicircle from over the head
// down to just above the thighs, and back). Adjustable bench at 45 degrees, buttocks and upper back on the pad, head
// neutral, feet flat on the floor (b3-curls seatOnBench). The high pulley stands behind the head of the bench. The arms
// stay straight (elbows fixed at a soft 12 degrees): a straight-arm pullover-pushdown worked by the lats. Bilateral
// (right arm solved, left mirrored); arm arc and solve as author-cable-straight-arm-pulldown.js in the trunk's plane.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const EQ = require('./families/equip');
const C = require('./families/eq-cable');
const B = require('./families/b5-cablepull');
const CU = require('./families/b3-curls');
const D = require('./families/dumbbell');
const meta = require('./meta/cable-incline-pushdown.json');

const ID = 'cable-incline-pushdown';
const ANGLE = 45, SEAT = 32, WIDTH = 28, HINGE_X = -20;
const FLEX = 12, HALF = 22, BAR = 50;
const b = D.bench({ x: HINGE_X + SEAT / 2, seat: SEAT, height: 45, width: WIDTH, angle: ANGLE, back: 80 }), pad = CU.padFrame(b, WIDTH);
const S = CU.seatOnBench(b, pad, { stance: 17, footDX: 36, headOn: false });
// head neutral, just off the pad (rig v2: a relaxed neck leaves the head a little forward of the upper back)
S.pose.ch.neck_c7 = { rot: 0, flex: 2 }; S.pose.ch.head_c1 = { rot: 0, flex: 6 };
const contacts = S.contacts;
const trunkAt = (f, k) => { const p = clone(S.pose); p.ch.sc_r = { protract: r1(4 - 6 * k), elevate: r1(16 - 22 * k) }; p.ch.sc_l = clone(p.ch.sc_r); return p; };
const R0 = L.reach(FLEX) + 7.2;
// arc in the sagittal plane at the grip's z: theta = angle of the shoulder-to-grip line from straight down, forward
// positive (90 = level in front, 180 = straight up, 225 = along the pad behind the head)
const gripOn = (Sp, th) => { const h = Math.sqrt(R0 * R0 - (HALF - Sp[2]) ** 2), a = th * Math.PI / 180; return [Sp[0] + h * Math.sin(a), Sp[1] - h * Math.cos(a), HALF]; };
const barClear = (W, g) => { const gl = [g[0], g[1], -g[2]]; return EQ.segmentClear(W, V.add(g, [0, 0, BAR / 2 - HALF]), V.add(gl, [0, 0, -(BAR / 2 - HALF)]), 1.5, { skip: /^(hand|thumb|forearm)_/ }).d; };
const Wb = L.fk(trunkAt(1, 1), contacts), Sb = Wb.shoulder_r.p;
const TH0 = +(process.env.TH0 || 205);
const TH1 = r1(B.bis(10, 120, (th) => barClear(Wb, gripOn(Sb, th)) < 4)); // lowest theta that keeps the bar 4 cm off the thighs
const { poses, err, names } = B.pullKeys({
  contacts, trunkAt, guess: { plane: 85, elev: 165, axial: -30, pron: 170, flex: FLEX }, flexAt: () => FLEX,
  gripAt: (f, k, W) => gripOn(W.shoulder_r.p, TH0 + (TH1 - TH0) * k),
  elbowAt: (f, k, W) => { const Sp = W.shoulder_r.p, g = gripOn(Sp, TH0 + (TH1 - TH0) * k); return V.add(V.add(Sp, V.scale(V.norm(V.sub(g, Sp)), L.UA)), [0, 0, 2]); }, wElbowAt: () => 0.4,
  palmAt: (f, k) => { const a = (TH0 + (TH1 - TH0) * k) * Math.PI / 180; return [-Math.cos(a), -Math.sin(a), 0]; }, axis: [0, 0, 1],
});
const keyframes = B.pullFrames(meta, names, { go: 'push', hold: 'squeeze', back: 'return', rest: 'reset' });
const ex = H.module_(meta, contacts, poses, keyframes);
const Ws = L.fk(poses.start, contacts), We = L.fk(poses.end, contacts);
const ANCHOR = [r1(EQ.barAt(Ws).c[0] - +(process.env.AB || 45)), 215, 0];
ex.props = [b.prop, EQ.cableTower(ANCHOR, { offset: [-12, 0] }), { id: 'bar', kind: 'cable', attachment: 'bar', size: [BAR, 3, 3], anchor: ANCHOR, attach: { joint: 'wrist_r', with: 'wrist_l' } }];
const rep = C.scan(ex, { line: (W) => [ANCHOR, EQ.attachPoint(W, { two: true })] });
let barClr = { d: 1e9 }, elb = [1e9, -1e9], back = [1e9, -1e9];
H.loopReport(ex, { probe: (W, pz, t) => {
  const bb = EQ.barAt(W), c = EQ.segmentClear(W, V.add(bb.c, V.scale(bb.ax, BAR / 2)), V.sub(bb.c, V.scale(bb.ax, BAR / 2)), 1.5, { skip: /^(hand|thumb|forearm)_/ });
  if (c.d < barClr.d) barClr = { d: +c.d.toFixed(2), id: c.id, t: +t.toFixed(2) };
  const e = C.elbowAng(W); elb = [Math.min(elb[0], e), Math.max(elb[1], e)];
  const m = S.measure(W); back = [Math.min(back[0], m.upBack), Math.max(back[1], m.upBack)];
} });
// the bar and the cable stay clear of the bench pad: the pad top edge (tip) must stay behind the cable line
const tipClr = (() => { let m = 1e9; H.loopReport(ex, { probe: (W) => { const a = ANCHOR, g = EQ.attachPoint(W, { two: true }), ab = V.sub(g, a), tt = Math.max(0, Math.min(1, V.dot(V.sub(b.tip, a), ab) / V.dot(ab, ab))); m = Math.min(m, V.len(V.sub(b.tip, V.add(a, V.scale(ab, tt))))); } }); return m; })();
C.gate(ID, rep, { minLine: 1 });
C.limits(poses);
const fail = (m) => { console.error(`FAIL ${ID}: ${m}`); process.exitCode = 1; };
if (barClr.d < 0.5) fail(`bar into the body ${JSON.stringify(barClr)}`);
if (elb[1] - elb[0] > 3) fail(`elbow angle changes ${elb.map(r1)}`);
if (tipClr < 3) fail(`cable through the bench pad (${r1(tipClr)} cm from the pad tip)`);
let pk = 0; H.loopReport(ex, { probe: (W) => { pk = Math.max(pk, V.angle(V.sub(W.neck_c7.p, W.pelvis.p), [0, 1, 0])); } });
ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(pk - 5), max: Math.ceil(pk + 5) };
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Shoulder flexion', 'setup', `Upper arm ${d(B.armTrunk(Ws))} from the trunk (bar over the head)`); set('Shoulder flexion', 'peak', `${d(B.armTrunk(We))} (bar ${Math.round(barClr.d)} cm off the thighs)`);
set('Elbow flexion', 'setup', `${d(elb[0])}-${d(elb[1]).slice(1)} over the loop`); set('Elbow flexion', 'peak', 'Unchanged');
set('Bench', 'setup', `Back pad at ${ANGLE}° from the floor; upper back on the pad (gap ${r1(back[0])}-${r1(back[1])} cm on the rig shapes)`); set('Bench', 'peak', 'Unchanged: only the arms move');
set('Grip', 'setup', `Overhand, ${Math.round(EQ.barAt(Ws).width)} cm between the hands on a ${BAR} cm bar`); set('Grip', 'peak', `Unchanged (${rep.gripWidth.join('-')} cm)`);
set('Tempo', 'setup', 'Pause 0.5 s with the bar over the head'); set('Tempo', 'peak', '1.4 s down, 0.4 s at the thighs, 2 s back up');
console.log(`Cable Incline Pushdown: wrote ${L.write(ex)}\n  keys ${JSON.stringify(err)}\n  theta ${TH0}-${TH1} anchor ${ANCHOR}\n  ${JSON.stringify(rep)}\n  bar ${JSON.stringify(barClr)} elbow ${elb.map(r1)} back ${back.map(r1)} tip ${r1(tipClr)} seat ${JSON.stringify(S.measure(Ws))}`);
