// Elbow-Up and Down Dynamic Plank (GymVisual #8964; page not readable here, movement from the name and standard
// coaching): the plank up-down. From a forearm plank, plant the right hand under the right shoulder and press up, then
// the left: high plank on the hands. Lower to the right forearm, then the left. Second rep leads with the left arm.
// While one arm is up or pressing, the trunk rolls a little toward the forearm side (shoulders at different heights);
// the feet stay planted. Contacts: one per arm (palm flat, fingers forward) whose target moves between the forearm spot
// (elbow on the mat under the shoulder) and the hand spot (under the shoulder); a contact switches target only through a
// weight-0 key, so a planted target never moves. Each solved body keeps a forearm-side shoulder exactly one upper-arm
// length from its elbow point and a hand-side arm nearly straight.
const L = require('./lib');
const { V, clone } = L;
const P = require('./families/prone');
const H = require('./families/hips');
const CB = require('./families/core-b');
const CA = require('./families/core-a');
const B = require('./families/b6-18');
const meta = require('./meta/elbow-up-and-down-dynamic-plank.json');

// Forearm plank with the feet a little wider than hip width (stance for the rolls)
const F = B.forearmPlank();
const { plank0, raw, contacts, E, WT, AT } = F;
const W0 = L.fk(plank0, contacts);
// Hand spots: under the shoulders, a few cm ahead of the elbow points
const HT = { r: [B.r3(E.r[0] + 4), P.PALM, B.r3(E.r[2] + 1)], l: [B.r3(E.l[0] + 4), P.PALM, B.r3(E.l[2] - 1)] };
const ARM_HP = L.reach(5);
const ik = (r, l) => ({ arm_r: { target: r.slice(), weight: 1 }, arm_l: { target: l.slice(), weight: 1 }, leg_r: { target: AT.r.slice(), weight: 1 }, leg_l: { target: AT.l.slice(), weight: 1 } });
const sphereOf = (s) => (W) => [(V.len(V.sub(W[`shoulder_${s}`].p, E[s])) - P.UA) * 6];
const straightOf = (s, d = ARM_HP) => (W) => [(V.len(V.sub(W[`shoulder_${s}`].p, HT[s])) - d) * 6];
// Body solves on the root (x, y, pitch, roll): high plank, and right hand + left forearm.
function body(objs, ikT, seed, twist = false) {
  const p = clone(seed || raw); p.ik = ikT;
  for (const j of ['spine_l5', 'spine_t12', 'spine_t6']) p.ch[j] = Object.assign({ rot: 0, flex: 0, latFlex: 0 }, p.ch[j]);
  const paths = ['root.pos.0', 'root.pos.1', 'root.rot.pitch'].concat(twist ? ['ch.spine_t12.rot', 'ch.spine_t6.rot', 'ch.spine_l5.rot', 'ch.spine_t12.latFlex', 'ch.spine_l5.latFlex', 'ch.spine_t6.latFlex'] : []);
  const reg = (W, q) => twist ? [(q.ch.spine_t12.rot - q.ch.spine_t6.rot) * 0.2, q.ch.spine_l5.rot * 0.1, q.ch.spine_t12.latFlex * 0.03, q.ch.spine_l5.latFlex * 0.03, q.ch.spine_t6.latFlex * 0.03, Math.max(0, Math.abs(q.ch.spine_t12.latFlex) - 14) * 3, Math.max(0, Math.abs(q.ch.spine_l5.latFlex) - 19) * 3, Math.max(0, Math.abs(q.ch.spine_t6.latFlex) - 11) * 3, Math.max(0, Math.abs(q.ch.spine_t12.rot) - 24) * 3, Math.max(0, Math.abs(q.ch.spine_t6.rot) - 24) * 3, Math.max(0, Math.abs(q.ch.spine_l5.rot) - 5.5) * 3] : [];
  const s = B.solve(p, paths, [...objs, reg], contacts, 800);
  return { pose: s.pose, cost: s.cost };
}


const MID_ELB = 25;
const LEGLEN = V.len(L.rig.byId.knee_r.offset) + V.len(L.rig.byId.ankle_r.offset);
const reachFeet = (W) => ['r', 'l'].map((s) => Math.max(0, V.len(V.sub(W[`hip_${s}`].p, AT[s])) - LEGLEN + 1) * 6);
const HP = body([straightOf('r'), straightOf('l'), reachFeet, (W) => [(W.shoulder_r.p[0] - HT.r[0]) * 0.5]], ik(HT.r, HT.l));
const avg = clone(HP.pose); { const a = plank0.root, b = HP.pose.root; avg.root.pos = a.pos.map((v, i) => B.r3((v + b.pos[i]) / 2)); avg.root.rot = { pitch: B.r3((a.rot.pitch + b.rot.pitch) / 2) }; }
const MID = body([straightOf('r', L.reach(MID_ELB)), sphereOf('l'), (W) => V.sub(W.elbow_l.p, E.l).map((v) => v * 3), reachFeet, (W) => [(W.shoulder_l.p[0] - E.l[0]) * 0.3, (W.shoulder_r.p[0] - HT.r[0]) * 0.3], (W, q) => [(q.root.rot.pitch - avg.root.rot.pitch) * 0.1, (q.root.pos[0] - avg.root.pos[0]) * 0.1]], ik(HT.r, WT.l), avg, true);
const fp = clone(plank0); fp.ik = ik(WT.r, WT.l);
// half way through the press: right elbow about 75 degrees, left elbow pinned
const avg2 = clone(MID.pose); { const a = plank0.root, b = MID.pose.root; avg2.root.pos = a.pos.map((v, i) => B.r3((v + b.pos[i]) / 2)); avg2.root.rot = { pitch: B.r3((a.rot.pitch + b.rot.pitch) / 2) }; for (const j of ['spine_l5', 'spine_t12', 'spine_t6']) for (const c of ['rot', 'latFlex']) avg2.ch[j][c] = B.r3(MID.pose.ch[j][c] / 2); }
const PRESS = body([straightOf('r', L.reach(75)), sphereOf('l'), (W) => V.sub(W.elbow_l.p, E.l).map((v) => v * 3), reachFeet, (W, q) => [(q.root.rot.pitch - avg2.root.rot.pitch) * 0.1, (q.root.pos[0] - avg2.root.pos[0]) * 0.1]], ik(HT.r, WT.l), avg2, true);
// Arm states on a body: planted at a target (weight 1, channels fitted), or hovering (weight 0, channels fitted to a
// target lifted `up` cm).
function arm(p, s, target, w, up = 0) {
  const q = clone(p); q.ik[`arm_${s}`] = { target: V.add(target, [0, up, 0]).map(B.r3), weight: 1 };
  const f = P.fitArm(q, s, contacts, `arm_${s}`);
  if (!w) { f.ik[`arm_${s}`] = { target: target.slice(), weight: 0 }; } else f.ik[`arm_${s}`] = { target: target.slice(), weight: 1 };
  return f;
}
const fitLegs = (p) => P.fitLeg(P.fitLeg(p, 'r', contacts), 'l', contacts);
const both = (p, r, l) => fitLegs(arm(arm(p, 'r', r[0], r[1], r[2]), 'l', l[0], l[1], l[2]));
// Right-lead rep (the left-lead rep is its mirror image)
const mid = MID.pose, hp = HP.pose;
const R = {
  fp: both(fp, [WT.r, 1], [WT.l, 1]),
  rUp: both(fp, [WT.r, 0, 7], [WT.l, 1]),             // right forearm lifts
  rHH: both(fp, [HT.r, 0, 5], [WT.l, 1]),              // right hand over its spot
  rHand: both(fp, [HT.r, 1], [WT.l, 1]),              // right hand planted by the shoulder, elbow bent
  press: both(PRESS.pose, [HT.r, 1], [WT.l, 1]),
  mid: both(mid, [HT.r, 1], [WT.l, 1]),               // pressed up on the right hand, left forearm down
  lUp: both(mid, [HT.r, 1], [WT.l, 0, 7]),            // left forearm lifts
  lHH: both(mid, [HT.r, 1], [HT.l, 0, 5]),
  lHand: both(mid, [HT.r, 1], [HT.l, 1]),             // left hand planted
  hp: both(hp, [HT.r, 1], [HT.l, 1]),                 // high plank
  rLift: both(hp, [HT.r, 0, 9], [HT.l, 1]),           // right hand lifts
  rHover: both(mid, [WT.r, 0, 5], [HT.l, 1]),         // body lowers onto the left hand side... (mirror of mid)
};
// Down phase mirrors the up phase sides: right forearm + left hand. Build its body as the mirror of `mid`.
const midM = CB.mirror(mid);
Object.assign(R, {
  rHover: both(midM, [WT.r, 0, 8], [HT.l, 1]),
  rFore: both(midM, [WT.r, 1], [HT.l, 1]),            // right forearm down, left hand still planted
  lLift: both(midM, [WT.r, 1], [HT.l, 0, 9]),         // left hand lifts
  lMid: both(CB.mirror(PRESS.pose), [WT.r, 1], [HT.l, 0, 10]),
  lHover: both(fp, [WT.r, 1], [WT.l, 0, 8]),          // body back level, left forearm hovering
});
const poses = {}; for (const [n, p] of Object.entries(R)) { poses[`a_${n}`] = p; poses[`b_${n}`] = CB.mirror(p); }
delete poses.b_fp; poses.fp = poses.a_fp; delete poses.a_fp;
const seq = ['rUp', 'rHH', 'rHand', 'press', 'mid', 'lUp', 'lHH', 'lHand', 'hp'], down = ['rLift', 'rHover', 'rFore', 'lLift', 'lMid', 'lHover'];
const UPT = [0.25, 0.42, 0.55, 0.75, 0.95, 1.2, 1.37, 1.5, 1.8], DNT = [0.25, 0.6, 0.85, 1.1, 1.3, 1.5];
const keyframes = [{ t: 0, pose: 'fp' }, { t: 0.8, pose: 'fp' }];
const rep = (pre, t0, t1) => { seq.forEach((n, i) => keyframes.push({ t: +(t0 + UPT[i]).toFixed(2), pose: `${pre}_${n}` })); keyframes.push({ t: +(t0 + 2.2).toFixed(2), pose: `${pre}_hp` }); down.forEach((n, i) => keyframes.push({ t: +(t1 + DNT[i]).toFixed(2), pose: `${pre}_${n}` })); keyframes.push({ t: +(t1 + 1.8).toFixed(2), pose: 'fp' }); };
rep('a', 0.8, 3.0); keyframes.push({ t: 5.2, pose: 'fp' }); rep('b', 5.2, 7.4); keyframes.push({ t: 10, pose: 'fp' });
const ex = H.module_(meta, contacts, poses, keyframes);
const Wh = L.fk(hp, contacts), Wm = L.fk(mid, contacts);
const rise = V.len(V.sub(Wh.pelvis.p, W0.pelvis.p));
ex.checks.measure = { name: 'rootTravel', min: Math.floor(rise * 0.8), max: Math.ceil(rise * 1.25 + 1) };
const onFore = (s) => (pz) => pz.ik[`arm_${s}`].weight >= 0.999 && V.len(V.sub(pz.ik[`arm_${s}`].target, WT[s])) < 0.01;
const fixed = ['r', 'l'].map((s) => ({ joint: `elbow_${s}`, p: E[s], when: onFore(s) }));
const sw = P.sweep(ex, fixed);
// elbow-on-mat check on the solved keys (forearm-side elbows at their points)
const elbowErr = [];
for (const [n, p] of Object.entries(poses)) { const W = L.fk(p, contacts); for (const s of ['r', 'l']) { const k = p.ik[`arm_${s}`]; if (k.weight >= 0.999 && V.len(V.sub(k.target, WT[s])) < 0.01) elbowErr.push(V.len(V.sub(W[`elbow_${s}`].p, E[s]))); } }
const lim = CA.scan(ex).limits;
const set = H.setKin(ex);
const roll = (W) => Math.atan2(W.shoulder_r.p[1] - W.shoulder_l.p[1], W.shoulder_r.p[2] - W.shoulder_l.p[2]) * 180 / Math.PI;
set('Elbow flexion', 'setup', `${B.deg(P.elbowAngle(W0, 'r'))} on the forearms`); set('Elbow flexion', 'peak', `${B.deg(P.elbowAngle(Wh, 'r'))} on the hands`);
set('Shoulder height', 'setup', `${Math.round(W0.shoulder_r.p[1])} cm (forearm plank)`); set('Shoulder height', 'peak', `${Math.round(Wh.shoulder_r.p[1])} cm (high plank); pelvis rises ${Math.round(rise)} cm`);
set('Body line', 'setup', `${B.deg(B.bodyLine(W0))} off straight`); set('Body line', 'peak', `${B.deg(B.bodyLine(Wh))} off straight in the high plank`);
set('Trunk roll', 'setup', 'Level'); set('Trunk roll', 'peak', `Shoulder line tilts ${B.deg(Math.abs(roll(Wm)))} with one hand and one forearm down (feet ${Math.round(2 * AT.r[2])} cm apart)`);
set('Tempo', 'setup', '0.8 s forearm plank'); set('Tempo', 'peak', 'About 2 s up, 0.4 s high plank, 2 s down per rep, lead arm alternating');
ex.exercise.reference.note = B.NOTE;
{ const W = L.fk(mid, contacts), Wh2 = L.fk(hp, contacts); console.log('  residuals mid', B.r3(V.len(V.sub(W.shoulder_r.p, HT.r)) - L.reach(MID_ELB)), B.r3(V.len(V.sub(W.shoulder_l.p, E.l)) - P.UA), 'hp', B.r3(V.len(V.sub(Wh2.shoulder_r.p, HT.r)) - ARM_HP), ['r', 'l'].map((s) => B.r3(V.len(V.sub(Wh2[`hip_${s}`].p, AT[s])) - LEGLEN)), 'midfeet', ['r', 'l'].map((s) => B.r3(V.len(V.sub(W[`hip_${s}`].p, AT[s])) - LEGLEN))); }
console.log(`Elbow-Up and Down Dynamic Plank: wrote ${L.write(ex)}  HP cost ${HP.cost.toFixed(4)} PRESS cost ${PRESS.cost.toFixed(4)} MID cost ${MID.cost.toFixed(4)} root HP ${JSON.stringify(hp.root)} MID ${JSON.stringify(mid.root)} twist ${['spine_l5', 'spine_t12', 'spine_t6'].map((j) => JSON.stringify(mid.ch[j]))} measure=${JSON.stringify(ex.checks.measure)}\n  sweep ${JSON.stringify(sw)} elbowErrMax ${Math.max(...elbowErr).toFixed(3)} limits ${lim.length} ${lim.slice(0, 4)}`);
if (sw.slide > 0.05 || sw.drift > 1.0 || sw.floor < -0.5 || lim.length || Math.max(...elbowErr) > 0.3) { console.error('FAIL elbow-up-and-down-dynamic-plank'); process.exitCode = 1; }
