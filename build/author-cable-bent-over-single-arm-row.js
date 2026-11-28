// Cable Bent Over Single Arm Row (GymVisual 24413, Cable Bent Over Single Arm Row (version 3); movement reference only,
// page not readable): standing facing a low pulley, feet about hip width (planted leg contacts), knees bent about 25
// degrees, hip hinge with a flat back until the trunk is about 35 degrees above level; the left hand is braced on the
// front of the left thigh just above the knee. The right hand holds a D-handle (cable attachment 'handle', neutral,
// thumb forward) on the cable from a pulley low in front. From the arm long, reaching forward and down toward the
// pulley with the shoulder blade forward, the handle is rowed to the side of the waist, the elbow driving back close to
// the body and the shoulder blade drawn back; the trunk, legs and bracing arm stay still. Authored right (the player
// mirrors it). Tempo: 1.2 s pull, 0.4 s squeeze, 2 s return, 0.5 s stretch. Family b6-08.js.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const EQ = require('./families/equip');
const C = require('./families/eq-cable');
const F = require('./families/b3-shoulders');
const B3 = require('./families/b3-back');
const B = require('./families/b5-cablepull');
const X = require('./families/b6-08');
const meta = require('./meta/cable-bent-over-single-arm-row.json');

const ID = 'cable-bent-over-single-arm-row';
const ENV = (k, v) => +(process.env[k] ?? v);
const TRUNK = ENV('TRUNK', 35), REACH = L.reach(12) + 7;
const hb = F.hinge({ stance: 13, knee: 25, trunk: TRUNK }), contacts = hb.contacts;
// left hand braced on the front of the left thigh just above the knee (solved as the mirrored right arm, then copied)
function braceLeft(p) {
  const W = L.fk(p, contacts), Hp = W.hip_l.p, K = W.knee_l.p, dir = V.norm(V.sub(K, Hp));
  const up = V.norm(V.sub([0, 1, 0], V.scale(dir, dir[1])));
  const spot = V.add(V.lerp(Hp, K, ENV('HK', 0.7)), V.scale(up, ENV('HU', 8.5)));
  const tgt = [spot[0], spot[1], -spot[2]], palm = V.scale([up[0], up[1], -up[2]], -1), thumb = V.norm(V.cross(palm, [dir[0], dir[1], -dir[2]]));
  const SCL = { protract: 8, elevate: 2 }, pm = clone(p); pm.ch.sc_r = clone(SCL);
  const q = B3.holdArm(pm, tgt, { palm, axis: V.scale(thumb, -1), dirW: 0.6, minElev: 2, guesses: [[60, 50, 0, 15, 0], [80, 60, 20, 20, 30], [40, 40, -20, 10, -30], [0, 20, 0, 15, 90], [20, 25, 0, 20, 0]] });
  const out = clone(p);
  for (const j of ['shoulder', 'elbow', 'wrist']) out.ch[`${j}_l`] = clone(q.ch[`${j}_r`]);
  out.ch.sc_l = clone(SCL);
  return { pose: out, err: +V.len(V.sub(L.fk(out, contacts).wrist_l.p, spot)).toFixed(2) };
}
const braced = braceLeft(hb.pose), base = braced.pose;
const trunkAt = (f, k) => { const p = clone(base); p.ch.sc_r = { protract: r1(14 - 28 * k), elevate: r1(2 - 4 * k) }; return p; };
const W0 = L.fk(trunkAt(0, 0), contacts), W1 = L.fk(trunkAt(1, 1), contacts), S0 = W0.shoulder_r.p;
const ANCHOR = [r1(S0[0] + ENV('AX', 95)), ENV('AY', 22), r1(S0[2] - 2)];
const G0 = V.add(S0, V.scale(V.norm(V.sub(ANCHOR, S0)), REACH));
// finish: beside the waist, a few cm out from the side of the abdomen, at about hip-crest height
const G1 = [r1(W1.hip_r.p[0] + ENV('GX', 10)), r1(W1.hip_r.p[1] + ENV('GY', 8)), r1(B.extreme(W1, 'abdomen', [0, 0, 1])[2] + ENV('GZ', 6))];
const D0 = V.norm(V.sub(G0, S0)), D1 = V.norm(V.sub([G1[0] - ENV('EX', 12), G1[1] + ENV('EY', 16), G1[2] + ENV('EZ', 4)], W1.shoulder_r.p));
const { poses, err, names } = X.pullKeys2({
  contacts, trunkAt, mirror: false, guess: { plane: 90, elev: 95, axial: 0, pron: 90, flex: 10 }, wAxial: 0.02, reverse: false,
  gripAt: (f, k) => B.lerpV(G0, G1, k),
  elbowAt: (f, k, W) => V.add(W.shoulder_r.p, V.scale(V.norm(B.lerpV(D0, D1, k)), L.UA)), wElbowAt: (k) => ENV('W0', 0.1) + ENV('W1', -0.08) * k,
  palmAt: () => [0, 0, -1], wPalm: ENV('WP', 1), wFlex: ENV('WF', 0.5),
});
const keyframes = B.pullFrames(meta, names, { go: 'pull', hold: 'squeeze', back: 'return', rest: 'reset' });

const ex = H.module_(meta, contacts, poses, keyframes);
ex.props = [EQ.cableTower(ANCHOR, { offset: [8, 0] }), { id: 'handle', kind: 'cable', attachment: 'handle', anchor: ANCHOR, attach: { joint: 'wrist_r' } }];

// loop checks: feet, floor, jumps, the cable clear of the body (only the right hand / forearm skipped), the handle clear
// of the body, the left hand on the thigh, the trunk still
const SKIP_R = /^(hand|thumb|forearm)_r$/;
const rep = C.scan(ex, { line: (W) => [ANCHOR, EQ.attachPoint(W, { side: 'r' })], lineSkip: SKIP_R });
let handClr = { d: 1e9 }, trunkDrift = 0;
H.loopReport(ex, { probe: (W, pz, t) => {
  const gp = EQ.gripPoint(W, 'r').p;
  for (const id of ['abdomen', 'pelvis', 'ribcage', 'thigh_r', 'quad_r', 'buttock_r', 'chest']) { const d = EQ.pointShape(W, gp, id) - 3; if (d < handClr.d) handClr = { d: +d.toFixed(2), id, t: +t.toFixed(2) }; }
  trunkDrift = Math.max(trunkDrift, V.len(V.sub(W.neck_c7.p, W0.neck_c7.p)), V.len(V.sub(W.wrist_l.p, W0.wrist_l.p)));
} });
C.gate(ID, rep, { minLine: 1, checkWidth: false });
C.limits(poses);
const fail = (m) => { console.error(`FAIL ${ID}: ${m}`); process.exitCode = 1; };
if (handClr.d < 0) fail(`handle into the body ${JSON.stringify(handClr)}`);
if (braced.err > 1) fail(`left hand ${braced.err} cm off the thigh`);
if (trunkDrift > 0.05) fail(`trunk / bracing hand moves ${trunkDrift.toFixed(3)} cm`);
if (rep.dorsiR[1] > 35) fail(`ankle ${rep.dorsiR}`);
const peak = X.checkMeasure(ID, ex);

const Wr = L.fk(poses.start, contacts), Wf = L.fk(poses.end, contacts), set = H.setKin(ex), d = X.d;
set('Trunk lean', 'setup', `${d(90 - B.trunkDeg(Wr))} above level (hip hinge, flat back), knees ${d(H.kneeOf(Wr, 'r'))}`); set('Trunk lean', 'peak', 'Unchanged (trunk still)');
set('Elbow flexion', 'setup', `${d(C.elbowAng(Wr))} (arm long)`); set('Elbow flexion', 'peak', `${d(C.elbowAng(Wf))}`);
set('Shoulder extension', 'setup', `Upper arm ${d(X.shExt(Wr))} from the trunk line, reaching toward the pulley`); set('Shoulder extension', 'peak', `Elbow driven up and back beside the trunk, ${Math.round(Wf.elbow_r.p[1] - Wf.shoulder_r.p[1])} cm above the shoulder joint; handle beside the waist`);
set('Shoulder blade', 'setup', 'Protracted (reaching forward)'); set('Shoulder blade', 'peak', 'Retracted');
set('Bracing arm', 'setup', `Left hand on the left thigh above the knee (${braced.err} cm from the target)`); set('Bracing arm', 'peak', 'Unchanged');
set('Tempo', 'setup', 'Stretch 0.5 s at full reach'); set('Tempo', 'peak', '1.2 s pull, 0.4 s squeeze, 2 s return');
console.log(`Cable Bent Over Single Arm Row: wrote ${L.write(ex)}\n  keys ${JSON.stringify(err)}\n  anchor ${ANCHOR} G0 ${G0.map(r1)} G1 ${G1} brace ${braced.err}\n  ${JSON.stringify(rep)}\n  handle ${JSON.stringify(handClr)} trunkDrift ${trunkDrift.toFixed(3)} peak ${peak}`);
