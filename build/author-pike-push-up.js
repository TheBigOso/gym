// Pike Push-up (GymVisual #292112): inverted V with the hips high, hands shoulder width on the floor (planted, palm-down
// world orientation), legs straight on the balls of the feet (planted leg contacts, heel raised); the elbows bend back toward
// the feet and the top of the head lowers to just above the floor a little in front of the hands, then press back up.
// Bilateral. Every key is solved for root x / y / pitch: straight legs (hip-ankle at a soft-knee length), straight arms at the
// top with the trunk in line with them, and the head height / position along the way down. Family b4-floorpush.js.
const L = require('./lib');
const { R, V, r1, clone } = L;
const B = require('./families/b4-floorpush');
const H = require('./families/hips');
const meta = require('./meta/pike-push-up.json');

const HAND_X = 0, HAND_Z = 21;   // wrists about under the shoulder joints in width (|z| 18.9): hands shoulder width
const BALL_X = -92;              // balls of the feet (floor contact) behind the hands
const HEEL = 38;                 // heel raised (deg of foot pitch)
const HEAD_BOT = 5;              // bottom: lowest head shape this far above the floor
const HEAD_AHEAD = 10;           // ... and this far in front of the wrists (head and hands form a triangle)
const FOOT_Z = 9;
const TOP_ELBOW = 6, ALIGN = +(process.env.ALIGN ?? 25); // top: rig arm straight but not locked (elbow TOP_ELBOW deg), palms on the floor, trunk-to-arm angle ALIGN
const LEG_D = B.legLen(6);
const contacts = [Object.assign(L.handContact('r'), { pole: [-1, 0.3, 0.42] }), Object.assign(L.handContact('l'), { pole: [-1, 0.3, -0.42] }), L.legContact('r'), L.legContact('l')];
const WR = [HAND_X, B.PALM, HAND_Z], WL = [HAND_X, B.PALM, -HAND_Z];
const P0 = clone(L.POSES.plank().pose);
P0.ch.hip_r = { flex: 90, abd: 0, rot: 0 }; P0.ch.hip_l = { flex: 90, abd: 0, rot: 0 }; P0.ch.knee_r = { flex: 5 }; P0.ch.knee_l = { flex: 5 };
// Ankle target for a world-fixed heel-up foot whose lowest point (ball) rests on the floor at BALL_X
function heelUp(s, z) {
  const rot = H.qArr(H.footQ(HEEL, 0)), A0 = [0, 0, z];
  const lp = B.lowPoint(R.shapeWorld({ [`ankle_${s}`]: { p: A0, q: rot } }, B.shapeOf(`foot_${s}`)));
  return { target: [r1(BALL_X - lp[0]), +(0.05 - lp[1]).toFixed(2), z], handRot: rot };
}
const hr = { r: heelUp('r', FOOT_Z), l: heelUp('l', -FOOT_Z) };
contacts[2].handRot = hr.r.handRot; contacts[3].handRot = hr.l.handRot; contacts[2].pole = [1, 0.2, 0.1]; contacts[3].pole = [1, 0.2, -0.1];
const AR = hr.r.target, AL = hr.l.target;
const headLow = (W) => { let best = null; for (const id of ['hair', 'head', 'nose', 'jaw']) { const g = R.shapeWorld(W, B.shapeOf(id)), p = B.lowPoint(g); if (!best || p[1] < best[1]) best = p; } return best; };
const trunk = (W) => V.norm(V.sub(W.neck_c7.p, W.pelvis.p));
function setUpper(p, u) { // u: 0 top .. 1 bottom
  for (const j of ['spine_l5', 'spine_t12', 'spine_t6']) p.ch[j] = { rot: 0, flex: 0, latFlex: 0 };
  const nf = -4 - 8 * u; p.ch.neck_c7 = { rot: 0, flex: r1(nf * 0.5) }; p.ch.head_c1 = { rot: 0, flex: r1(nf * 0.5) }; // look a little forward as the head nears the floor
  p.ch.sc_r = { protract: r1(4 - 4 * u), elevate: r1(6 - 4 * u) }; p.ch.sc_l = clone(p.ch.sc_r);
  return p;
}
function solve(objs, u, guess) {
  const p = setUpper(clone(guess || P0), u);
  if (!guess) { p.root.pos = [-35, 80, 0]; p.root.rot = { pitch: -135 }; }
  const legs = (W) => [(B.dist(W.hip_r.p, AR) - LEG_D) * 4, (B.dist(W.hip_l.p, AL) - LEG_D) * 4];
  const s = L.solvePose(p, ['root.pos.0', 'root.pos.1', 'root.rot.pitch'], [legs, ...objs], { iters: 500 });
  let q = s.pose;
  q.ik = { arm_r: { target: WR.slice(), weight: 1 }, arm_l: { target: WL.slice(), weight: 1 }, leg_r: { target: AR.slice(), weight: 1 }, leg_l: { target: AL.slice(), weight: 1 } };
  for (const sd of ['r', 'l']) { q = B.matchLeg(q, sd, contacts); q = B.matchArm(q, sd, contacts); }
  q.__cost = s.cost;
  return q;
}
// Top: straight arms and the trunk in line with them (shoulders open)
const top = solve([(W) => [(B.dist(W.shoulder_r.p, WR) - L.reach(TOP_ELBOW)) * 4], (W) => [(V.angle(trunk(W), V.sub(WR, W.shoulder_r.p)) - ALIGN) * 0.5]], 0);
const Wt = L.fk(top, contacts), h0 = headLow(Wt);
const keyAt = (u, prev) => solve([(W) => { const h = headLow(W); return [(h[1] - (h0[1] + (HEAD_BOT - h0[1]) * u)) * 3, (h[0] - (h0[0] + (HAND_X + HEAD_AHEAD - h0[0]) * u)) * 1]; }], u, prev);
const ease = (f) => f * f * (3 - 2 * f);
const ph = meta.timeline.phases, Th = ph[0].end, Tb = ph[1].end, Tp = ph[2].end, Tr = ph[3].end, D = meta.timeline.duration;
const poses = { top }, keyframes = [{ t: 0, pose: 'top' }, { t: Th, pose: 'top' }];
let prev = top; const N = 6;
for (let i = 1; i <= N; i++) { const q = keyAt(ease(i / N), prev); prev = q; const nm = i === N ? 'bottom' : `down${i}`; poses[nm] = q; keyframes.push({ t: +(Th + ((Tb - Th) * i) / N).toFixed(3), pose: nm }); }
poses.bottomHold = keyAt(0.985, poses.bottom); keyframes.push({ t: +((Tb + Tp) / 2).toFixed(3), pose: 'bottomHold' }, { t: Tp, pose: 'bottom' });
for (let i = 1; i < 4; i++) { const nm = `up${i}`; poses[nm] = keyAt(1 - ease(i / 4), poses.bottom); keyframes.push({ t: +(Tp + ((Tr - Tp) * i) / 4).toFixed(3), pose: nm }); }
keyframes.push({ t: Tr, pose: 'top' }, { t: D, pose: 'top' });
const costs = Object.entries(poses).map(([k, p]) => [k, +p.__cost.toFixed(4)]); for (const p of Object.values(poses)) delete p.__cost;

const ex = H.module_(meta, contacts, poses, keyframes);
const rep = H.loopReport(ex, { planted: ['arm_r', 'arm_l', 'leg_r', 'leg_l'] });
const Wb = L.fk(poses.bottom, contacts), hb = headLow(Wb);
const hipAng = (W) => V.angle(V.sub(W.neck_c7.p, W.pelvis.p), V.sub(V.scale(V.add(W.ankle_r.p, W.ankle_l.p), 0.5), V.scale(V.add(W.hip_r.p, W.hip_l.p), 0.5)));
const trunkH = (W) => { const t = trunk(W); return Math.atan2(-t[1], t[0]) / R.DEG; };
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Hip angle', 'setup', `${d(hipAng(Wt))} between trunk and legs`); set('Hip angle', 'peak', `${d(hipAng(Wb))} at the bottom (hips stay high)`);
set('Elbow flexion', 'setup', `${d(B.elbowFlexOf(Wt))} (arms straight, not locked)`); set('Elbow flexion', 'peak', `${d(B.elbowFlexOf(Wb))} at the bottom`);
set('Trunk angle', 'setup', `Trunk ${d(trunkH(Wt))} below horizontal (head down)`); set('Trunk angle', 'peak', `${d(trunkH(Wb))} at the bottom`);
set('Head position', 'setup', `Head between the arms`); set('Head position', 'peak', `Lowest head point ${r1(hb[1])} cm above the floor, ${r1(hb[0] - HAND_X)} cm in front of the wrists`);
set('Hand width', 'setup', `Wrists ${2 * HAND_Z} cm apart (shoulder joints ${Math.round(B.dist(Wt.shoulder_r.p, Wt.shoulder_l.p))} cm); feet ${2 * FOOT_Z} cm apart, balls ${HAND_X - BALL_X} cm behind the hands`); set('Hand width', 'peak', 'Unchanged (hands and feet planted)');
set('Tempo', 'setup', `Top ${Th} s`); set('Tempo', 'peak', `${r1(Tb - Th)} s down, ${r1(Tp - Tb)} s pause, ${r1(Tr - Tp)} s up, ${r1(D - Tr)} s at the top`);
const hf = (p) => p.ch.hip_r.flex;
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(Math.min(...Object.values(poses).map(hf)) - 3), max: Math.ceil(Math.max(...Object.values(poses).map(hf)) + 3) };
console.log(`Pike Push-up: wrote ${L.write(ex)}\n  feet ${JSON.stringify(AR)} costs ${JSON.stringify(costs)}\n  top: hipAng ${hipAng(Wt).toFixed(0)} hipFlex ${top.ch.hip_r.flex} elbow ${B.elbowFlexOf(Wt).toFixed(0)} trunk ${trunkH(Wt).toFixed(0)} head ${h0.map(r1)}\n  bottom: hipAng ${hipAng(Wb).toFixed(0)} hipFlex ${poses.bottom.ch.hip_r.flex} elbow ${B.elbowFlexOf(Wb).toFixed(0)} elbowOut ${(Math.asin(V.norm(V.sub(Wb.elbow_r.p, Wb.shoulder_r.p))[2]) / R.DEG).toFixed(0)} trunk ${trunkH(Wb).toFixed(0)} head ${hb.map(r1)}\n  loop ${JSON.stringify(rep)}`);
if (rep.slide > 0.05) { console.error('FAIL: planted contact slides'); process.exitCode = 1; }
if (rep.floor < -0.5) { console.error('FAIL: below the floor'); process.exitCode = 1; }
