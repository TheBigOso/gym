// Inchworm (GymVisual #9044; page not readable here, movement from the name and standard coaching): stand tall, hinge
// forward with soft knees and put the palms on the floor in front of the feet; walk the hands forward one at a time (four
// steps per hand) into a high plank with the hands under the shoulders; hold; walk the hands back to the feet (the same
// path in reverse) and roll up to standing. The feet stay where they are: flat in the fold, rolling up onto the balls as
// the body lengthens (lunge-family flat / roll / ball feet), on the balls in the plank. Planted palms use hand contacts.
// Each key solves the root (x, y, pitch) so the planted hands are an arm's length from the shoulders at the asked knee
// angle; the plank also puts the shoulders over the hands. Bilateral.
const L = require('./lib');
const { R, V, Q, rig, r1, clone } = L;
const { makeFamily, kneeOf } = require('./families/lunge');
const P = require('./families/prone');
const H = require('./families/hips');
const F = require('./families/b6-20');
const meta = require('./meta/inchworm.json');

const FM = makeFamily({ toe: 4, half: 9 });
const qArr = (q) => q.map((v) => +v.toFixed(6));
const TURN = +(process.env.TURN ?? 12);   // fingers turned out a little (keeps the wrists out of hard ulnar deviation)
const HC = ['r', 'l'].map((s) => Object.assign(L.handContact(s), { pole: [-1, 0.1, s === 'r' ? 0.35 : -0.35], handRot: qArr(Q.mul(Q.axis([0, 1, 0], (s === 'r' ? -1 : 1) * TURN), s === 'r' ? L.handRotR : L.handRotL)) }));
const contacts = [...FM.contacts, ...HC];
const PALM = P.PALM, ELB = 8, ARM = L.reach(ELB), LEGMAX = V.len(rig.byId.knee_r.offset) + V.len(rig.byId.ankle_r.offset) - 0.02;
const rollC = (s, pitch) => Object.assign(L.legContact(s), { id: `rc_${s}`, handRot: qArr(FM.footQ ? FM.footQ(pitch) : H.footQ(pitch, s === 'r' ? -4 : 4)) });
// feet for a heel-up pitch (0 flat, BALL = on the balls); the balls of the feet stay at x = BALLX
const BALLX = 12.5, BALL = 60;
const feetFor = (pitch) => pitch <= 0.01 ? { r: { c: 'flat', x: 0 }, l: { c: 'flat', x: 0 } } : { r: { c: 'roll', pitch, ballX: BALLX }, l: { c: 'roll', pitch, ballX: BALLX } };
// evaluate a spec with every limb solved by IK (rolled feet through a probe contact), for the root solve
function evalIK(spec, hands) {
  const p = FM.build(spec), cs = [], ik = {};
  for (const s of ['r', 'l']) {
    const f = spec.feet[s];
    if (f.c === 'roll') { const c = Object.assign(rollC(s, f.pitch), { id: `rc_${s}` }); cs.push(c); ik[c.id] = { target: FM.rollTarget(s, f.pitch, f.ballX, s === 'r' ? 9 : -9), weight: 1 }; }
    else { const c = FM.contacts.find((x) => x.id === `leg_${s}`); cs.push(c); ik[c.id] = { target: p.ik[`leg_${s}`].target, weight: 1 }; }
  }
  p.ik = ik;
  return L.fk(p, cs);
}
const lerp = (a, b, f) => a + (b - a) * f;
// key: { pitch0 (root pitch guess), spine, knee, footPitch, hands: { r: [x, z], l: [x, z] } | null, over (shoulder over hands) }
function solveKey(k) {
  const spec0 = { root: [k.x0 ?? 40, k.y0 ?? 70, 0], pitch: k.pitch0, spine: k.spine, feet: feetFor(k.footPitch) };
  const set = (x) => { const s2 = clone(spec0); s2.root[0] = x[0]; s2.root[1] = x[1]; s2.pitch = x[2]; return s2; };
  const res = (x) => {
    const s2 = set(x), W = evalIK(s2), out = [(kneeOf(W, 'r') - k.knee) * 0.6, (x[2] - k.pitch0) * 0.03];
    // keep the legs reachable (an over-stretched IK leg has no knee gradient): hip to the ankle within the leg length
    for (const sd of ['r', 'l']) out.push(Math.max(0, V.len(V.sub(W[`hip_${sd}`].p, W[`ankle_${sd}`].p)) - LEGMAX) * 5, Math.max(0, W[`toe_${sd}`].p[1] - 30) * 0);
    if (k.plank) { const A = W.ankle_r.p, S = W.shoulder_r.p, Hp = W.hip_r.p, yl = A[1] + (S[1] - A[1]) * (Hp[0] - A[0]) / (S[0] - A[0]); out.push((S[1] - PALM - ARM) * 2, (Hp[1] - yl - 1) * 1); }
    else if (k.hands) { for (const s of ['r', 'l']) out.push((V.len(V.sub(W[`shoulder_${s}`].p, [k.hands[s][0], PALM, k.hands[s][1]])) - ARM) * 2); if (k.over) out.push((W.shoulder_r.p[0] - k.hands.r[0]) * 1.5); if (k.hipX != null) out.push((W.pelvis.p[0] - k.hipX) * (k.hipW ?? 0.5)); }
    else out.push((W.pelvis.p[0] - (k.hipX ?? 0)) * 0.5);
    return out;
  };
  const sol = R.solveLM(k.guess || [spec0.root[0], spec0.root[1], spec0.pitch], res, { iters: 400 });
  const spec = set(sol.x.map(r1));
  if (process.env.DBG && sol.cost > 1) console.log('res', k.knee, JSON.stringify(res(sol.x).map((v) => +v.toFixed(2))), sol.x.map(r1));
  let p = FM.pose(spec);
  // head: neck follows the trunk so the eyes look down/forward a little
  if (k.neck) { p.ch.neck_c7 = { rot: 0, flex: r1(k.neck * 0.45) }; p.ch.head_c1 = { rot: 0, flex: r1(k.neck * 0.55) }; }
  for (const s of ['r', 'l']) p.ch[`sc_${s}`] = { protract: k.hands ? 8 : 2, elevate: k.hands ? 4 : 0 };
  return { p, spec, cost: +sol.cost.toFixed(3), x: sol.x };
}
// arms: planted hands (contacts, fitted channels) or a free hand reaching to a world target (FK)
function arms(p, k, free) {
  let q = clone(p);
  q.ik = Object.assign({}, q.ik);
  for (const s of ['r', 'l']) {
    if (k.hands && !(free && free.s === s)) { q.ik[`arm_${s}`] = { target: [k.hands[s][0], PALM, k.hands[s][1]], weight: 1 }; }
    else q.ik[`arm_${s}`] = { target: k.hands ? [k.hands[s][0], PALM, k.hands[s][1]] : [0, PALM, s === 'r' ? 18 : -18], weight: 0 };
  }
  for (const s of ['r', 'l']) if (q.ik[`arm_${s}`].weight > 0.999) {
    const g = [{ [`shoulder_${s}`]: { plane: 90, elev: 110, axial: 0 }, [`elbow_${s}`]: { flex: 10 }, [`wrist_${s}`]: { pron: 0, flex: -70, dev: 0 } }, { [`shoulder_${s}`]: { plane: 80, elev: 70, axial: -40 }, [`elbow_${s}`]: { flex: 10 }, [`wrist_${s}`]: { pron: 0, flex: -80, dev: 0 } }];
    if (k.prevArms) g.unshift(k.prevArms(s));
    q = H.fitArm(q, s, HC.find((c) => c.id === `arm_${s}`), q.ik[`arm_${s}`].target, g); delete q.__cost;
  }
  if (free) {
    const solveR = (m, tg) => L.armToTarget(m, tg, { wrist: { pron: 160, flex: -50, dev: 0 }, guess: [m.ch.shoulder_r.plane ?? 90, m.ch.shoulder_r.elev ?? 80, m.ch.shoulder_r.axial ?? 0] });
    if (free.s === 'r') q = solveR(q, free.target); else q = F.mirrorArmSolve(q, (m) => solveR(m, F.flipZ(free.target)));
  }
  return q;
}
// hanging arms (standing / hinge): wrists below the shoulders by an arm's length, toward the floor
function hang(p, fwd = 2) {
  const W = L.fk(p), S = W.shoulder_r.p, len = L.reach(10);
  const q = L.armToTarget(p, [S[0] + fwd, S[1] - Math.sqrt(len * len - fwd * fwd - 9), S[2] - 3], { flex: 10, wrist: { pron: 70, flex: 0, dev: 0 }, guess: [10, 10, 0] });
  return H.module_ ? (() => { for (const j of ['shoulder', 'elbow', 'wrist']) q.ch[`${j}_l`] = clone(q.ch[`${j}_r`]); return q; })() : q;
}

// hand in the air: start from the planted pose (fitted channels, same branch), lift the free hand to the target
function lift(planted, s, target) {
  let q = clone(planted);
  const solveR = (m, tg) => { const w = m.ch.wrist_r; return L.armToTarget(m, tg, { wrist: { pron: w.pron, flex: r1(w.flex * 0.5), dev: 0 }, axial: m.ch.shoulder_r.axial, axialW: 0.01, guess: [m.ch.shoulder_r.plane, m.ch.shoulder_r.elev, m.ch.shoulder_r.axial] }); };
  q = s === 'r' ? solveR(q, target) : F.mirrorArmSolve(q, (m) => solveR(m, F.flipZ(target)));
  q.ik[`arm_${s}`].weight = 0;
  return q;
}
/* ---------------- Key path: stand, hinge, fold (hands down), walk out, plank ---------------- */
const HZ = 17;
const stand = hang(FM.pose(FM.stand(feetFor(0), { knee: 4, x: -1 })));
stand.ik.arm_r = { target: [0, PALM, HZ], weight: 0 }; stand.ik.arm_l = { target: [0, PALM, -HZ], weight: 0 };
const hingeK = solveKey({ pitch0: -55, spine: { l5: 8, t12: 8, t6: 6 }, knee: 14, footPitch: 0, hands: null, hipX: -10, x0: -5, y0: 85, neck: -10 });
const hinge = hang(hingeK.p, 6); hinge.ik.arm_r = { target: [40, PALM, HZ], weight: 0 }; hinge.ik.arm_l = { target: [40, PALM, -HZ], weight: 0 };
// hand positions: fold at X0, plank at XP (found by solving the plank with the shoulders over the hands)
const plankK = solveKey({ pitch0: -78, spine: { l5: 0, t12: 0, t6: 2 }, knee: 6, footPitch: BALL, hands: null, plank: true, x0: 88, y0: 41.5, neck: -14, guess: [88, 41.5, -71] });
const XP = r1(L.fk(plankK.p).shoulder_r.p[0]), HXP = L.fk(plankK.p).pelvis.p[0];
console.log('plank', plankK.cost, XP, r1(HXP));
const HX0 = 15, X0 = 40, NSTEP = 4, DX = (XP - X0) / NSTEP;
const steps = [];   // hand x positions after each move: r moves first, then l, alternating
let hr = X0, hl = X0;
steps.push({ r: hr, l: hl });
for (let i = 0; i < NSTEP; i++) { hr = r1(X0 + DX * (i + 1)); steps.push({ r: hr, l: hl, moved: 'r' }); hl = r1(X0 + DX * (i + 1)); steps.push({ r: hr, l: hl, moved: 'l' }); }
// per hand-position key: knee, spine and foot pitch blend from the fold to the plank with the reach fraction
const keyFor = (st, i) => {
  const f = ((st.r + st.l) / 2 - X0) / (XP - X0);
  return { pitch0: lerp(-125, -72, f), spine: { l5: r1(lerp(24, 0, f)), t12: r1(lerp(18, 0, f)), t6: r1(lerp(12, 2, f)) }, knee: r1(lerp(32, 6, f)), footPitch: r1(f < 0.15 ? 0 : Math.min(BALL, lerp(0, BALL, (f - 0.15) / 0.75))),
    hands: { r: [st.r, HZ], l: [st.l, -HZ] }, over: i === steps.length - 1, neck: lerp(-6, -14, f), x0: lerp(20, 60, f), y0: lerp(75, 55, f), hipX: lerp(HX0, HXP, f), hipW: 0.1 + 0.5 * (1 - f) };
};
const poses = { stand, hinge }, plantNames = [], info = {};
let prevBody = null;
let guess = null;
// solve from the plank backward (continuation: each key starts from its neighbour's solution)
const sols = [];
for (let i = steps.length - 1; i >= 0; i--) { const k = keyFor(steps[i], i); k.guess = guess || [88, 41.5, -71]; const s = solveKey(k); sols[i] = s; guess = s.x; }
steps.forEach((st, i) => {
  const k = keyFor(st, i), s = sols[i], nm = `h${i}`;
  poses[nm] = arms(s.p, k); plantNames.push(nm); info[nm] = { cost: s.cost, pitch: s.spec.pitch, foot: k.footPitch, knee: k.knee };
  if (st.moved) { // the hand in the air between the previous and this plant: body of the previous plant, hand midway and up
    const pk = keyFor(steps[i - 1], i - 1), from = steps[i - 1][st.moved], to = st[st.moved], z = st.moved === 'r' ? HZ : -HZ;
    poses[`m${i}`] = lift(poses[`h${i - 1}`], st.moved, [r1((from + to) / 2), PALM + 9, z]);
    // the free hand's contact target already sits where the hand lands (walking out) or lands back (walking in), so it
    // does not slide while the weight ramps up
    poses[`b${i}`] = clone(poses[`m${i}`]); poses[`b${i}`].ik[`arm_${st.moved}`].target = [from, PALM, z];
    poses[`m${i}`].ik[`arm_${st.moved}`].target = [to, PALM, z];
    poses[`m${i}`].ik[`arm_${st.moved}`].weight = 0;
  }
  prevBody = s.p;
});
const last = plantNames[plantNames.length - 1];
poses.plankHold = clone(poses[last]);
/* ---------------- Timeline: out, hold, back (reverse), rise ---------------- */
const keyframes = [{ t: 0, pose: 'stand' }, { t: 0.6, pose: 'stand' }, { t: 1.2, pose: 'hinge' }, { t: 1.8, pose: 'h0' }];
const outSeq = []; for (let i = 1; i < steps.length; i++) outSeq.push(`m${i}`, `h${i}`);
const DT = (4.2 - 1.8) / outSeq.length;
outSeq.forEach((nm, j) => keyframes.push({ t: +(1.8 + DT * (j + 1)).toFixed(3), pose: nm }));
keyframes.push({ t: 5.0, pose: 'plankHold' });
const backSeq = outSeq.slice().reverse().slice(1).concat(['h0']).map((n) => n.replace(/^m/, 'b'));   // b8, h7, b7, ... h0
backSeq.forEach((nm, j) => keyframes.push({ t: +(5.0 + DT * (j + 1)).toFixed(3), pose: nm }));
keyframes.push({ t: 8.0, pose: 'hinge' }, { t: 8.6, pose: 'stand' }, { t: 9.2, pose: 'stand' });
const ex = H.module_(meta, contacts, poses, keyframes);
const trunkAt = (p) => { const W = L.fk(p, contacts); return V.angle(V.sub(W.neck_c7.p, W.pelvis.p), [0, 1, 0]); };
const tks = Object.values(poses).map(trunkAt);
ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(Math.max(...tks)) - 3, max: Math.ceil(Math.max(...tks)) + 3 };
ex.checks.plantedContacts = [];

const rep = F.report(ex, { kneeR: (W) => kneeOf(W, 'r'), dorsi: (W) => H.dorsiOf(W, 'r'), hipY: (W) => W.pelvis.p[1], toe: (W) => Math.min(W.toe_r.p[1], W.toe_l.p[1]) });
// planted-hand slide (while each hand is weighted); the feet hand over between flat and rolling contacts, so the generic
// scan's slide figure counts the heel lifting and is not used
ex.checks.plantedContacts = ['arm_r', 'arm_l'];
const sw = P.sweep(ex, [], 1200);
ex.checks.plantedContacts = [];
delete rep.slide;
const Wf = L.fk(poses.h0, contacts), Wp = L.fk(poses.plankHold, contacts);
const line = (W) => V.angle(V.sub(W.hip_r.p, W.ankle_r.p), V.sub(W.shoulder_r.p, W.hip_r.p));
F.setKin(ex, 'Fold', 'Standing', `Hands ${Math.round(X0 - BALLX)} cm ahead of the balls of the feet, knees ${F.deg(kneeOf(Wf, 'r'))}, hip flexion ${F.deg(poses.h0.ch.hip_r.flex)}`);
F.setKin(ex, 'Plank', '–', `Hands under the shoulders, ${Math.round(XP - BALLX)} cm ahead of the balls of the feet; hips within ${F.deg(line(Wp))} of the shoulder-ankle line, knees ${F.deg(kneeOf(Wp, 'r'))}`);
F.setKin(ex, 'Hand steps', '–', `${NSTEP} steps per hand of ${Math.round(DX)} cm, alternating (right first), hands lifting about 6 cm`);
F.setKin(ex, 'Feet', 'Flat', `Stay put; heels rise to a ${BALL}° foot pitch on the balls in the plank (ankle ${Math.round(rep.dorsi[0])}° to ${Math.round(rep.dorsi[1])}°)`);
F.setKin(ex, 'Tempo', 'Stand 0.6 s', '1.2 s fold, 2.4 s walk out, 0.8 s plank, 2.4 s walk back, 1.2 s rise');
console.log(`Inchworm: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}\n  sweep ${JSON.stringify({ slide: sw.slide, slideAt: sw.slideAt, floor: sw.floor, floorAt: sw.floorAt })} XP ${XP}\n  ${JSON.stringify(info)}`);
rep.slide = 0;
F.CA.guard('inchworm', rep, [sw.slide > 0.05 && `planted hand slides ${sw.slide} (${sw.slideAt})`, rep.dorsi[1] > 35.5 && `ankle past dorsiflexion (${rep.dorsi[1]})`]);
