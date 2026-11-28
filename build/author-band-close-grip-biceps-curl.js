// Band Close Grip Biceps Curl (GymVisual, Band Close Grip Biceps Curl; movement reference only, page not readable):
// standing on the bands, feet close (planted leg contacts), knees soft; one band per hand, each anchored under the ball of
// its own foot (anchorJoint toe_r / toe_l). The hands start in front of the thighs, closer together than the hips, palms
// forward, elbows by the sides. Both arms curl up with the elbows staying at the sides (drifting forward only a little at
// the top) and the hands staying close, short squeeze, slow lower. Wrist path about the elbow (b6-10 curlPath), the
// forearms angled in about 17 degrees so the hands meet the narrow grip. Bilateral (right arm solved, left mirrored).
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const EQ = require('./families/equip');
const B5 = require('./families/b5-bandpush');
const G = require('./families/b6-10');
const meta = require('./meta/band-close-grip-biceps-curl.json');
const ENV = (k, d) => +(process.env[k] ?? d);

const st = F.standing({ stance: ENV('STANCE', 10), knee: 6 }), contacts = st.contacts;
const base = clone(st.pose);
base.ch.sc_r = { protract: -2, elevate: 0 }; base.ch.sc_l = clone(base.ch.sc_r);
const S0 = L.fk(base, contacts).shoulder_r.p;
const E0 = V.add(S0, V.scale(V.norm([ENV('EX0', 0.1), -1, ENV('EZ', -0.08)]), L.UA)), E1 = V.add(S0, V.scale(V.norm([ENV('EX1', 0.24), -1, ENV('EZ', -0.08)]), L.UA));
const path = G.curlPath({ elbow0: E0, elbow1: E1, a0: ENV('A0', 22), a1: ENV('A1', 128), fwd: V.norm([1, 0, -ENV('IN', 0.4)]), palm: 'sup' });
const FS = [0, 0.2, 0.4, 0.6, 0.8, 1];
const { poses: keys, err } = G.armPath(base, contacts, () => ({ at: path }), FS, { guess: { plane: 60, elev: 8, axial: -30, flex: 16, pron: 0 } });
const { poses, keyframes } = G.repKeys(meta, keys, FS);
const ex = H.module_(meta, contacts, poses, keyframes);
ex.props = B5.bandProps({ anchorJoint: 'toe_r', color: B5.COLOR.medium });
// hands and forearms clear of the thighs and trunk; the hands not into each other
let body = { d: 1e9 }, hands = 1e9;
const near = ['thigh_r', 'thigh_l', 'pelvis', 'abdomen', 'buttock_r', 'ribcage'];
const rep = G.bandCheck('band-close-grip-biceps-curl', ex, { minLine: 0.5, skip: /^(hand|thumb|forearm|foot)_/, probe: (W, pz, t) => {
  const gp = EQ.gripPoint(W, 'r').p, pts = [gp, W.wrist_r.p, V.lerp(W.wrist_r.p, W.elbow_r.p, 0.5)];
  for (const p of pts) for (const id of near) { const dd = EQ.pointShape(W, p, id) - 3.5; if (dd < body.d) body = { d: +dd.toFixed(2), id, t: +t.toFixed(2) }; }
  hands = Math.min(hands, gp[2] - EQ.gripPoint(W, 'l').p[2]);
} });
if (body.d < 0) { console.error(`FAIL band-close-grip-biceps-curl: arm into the body ${JSON.stringify(body)}`); process.exitCode = 1; }
if (hands < 9) { console.error(`FAIL band-close-grip-biceps-curl: hands ${r1(hands)} cm apart`); process.exitCode = 1; }
const N = FS.length - 1, Wb = L.fk(poses.k0, contacts), Wt = L.fk(poses[`k${N}`], contacts), set = H.setKin(ex), d = G.d0;
const C3 = require('./families/b3-curls');
const gap = (W) => r1(EQ.gripPoint(W, 'r').p[2] - EQ.gripPoint(W, 'l').p[2]);
set('Elbow flexion', 'setup', `${d(G.elbowAng(Wb))} (arms nearly straight)`); set('Elbow flexion', 'peak', `${d(G.elbowAng(Wt))} at the top`);
set('Forearm rotation', 'setup', `${poses.k0.ch.wrist_r.pron}° (palm forward)`); set('Forearm rotation', 'peak', `${poses[`k${N}`].ch.wrist_r.pron}° (palm up and in)`);
set('Upper arm', 'setup', `${d(C3.upperArmFromTrunk(Wb, 'r'))} from the trunk line`); set('Upper arm', 'peak', `${d(C3.upperArmFromTrunk(Wt, 'r'))} (elbows drift a little forward)`);
set('Hand spacing', 'setup', `Grip points ${gap(Wb)} cm apart (hips ${r1(2 * Math.abs(Wb.hip_r.p[2]))} cm)`); set('Hand spacing', 'peak', `${gap(Wt)} cm apart at the top`);
set('Band', 'setup', `One band per hand under the ball of each foot, feet ${2 * ENV('STANCE', 10)} cm apart; strands ${rep.strand[0]} cm`); set('Band', 'peak', `Strands ${rep.strand[1]} cm at the top; at least ${r1(rep.line.d)} cm from the body`);
set('Tempo', 'setup', 'Pause 0.6 s with the arms straight'); set('Tempo', 'peak', '1.1 s up, 0.4 s squeeze, 1.8 s down, 0.4 s pause');
console.log(`Band Close Grip Biceps Curl: wrote ${L.write(ex)}\n  err ${JSON.stringify(err)} body ${JSON.stringify(body)} hands ${r1(hands)}\n  ${JSON.stringify(rep)}`);
