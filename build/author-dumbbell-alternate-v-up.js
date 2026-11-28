// Dumbbell Alternate V-up (GymVisual 16927; movement reference only, the page could not be read, so the movement follows
// the name and standard coaching): lying on the back on a mat, legs long, one dumbbell held overhead between the flat
// palms on its end plates (two-hand item). Lift the trunk and the straight right leg together, folding at the hips, and
// reach the dumbbell up toward the right shin while the left leg stays long on the mat; lower both under control, then
// repeat with the left leg. Body shapes from the V-up author (core-a lie / setLeg / spine), one leg raised at a time; the
// arm solve puts both grip points on the dumbbell (30 cm apart) at every key. The left-leg half of the loop is the mirror
// image of the right-leg half. Bilateral (both sides every loop).
const L = require('./lib');
const { R, V, r1, clone } = L;
const C = require('./families/core-a');
const CB = require('./families/core-b');
const CC = require('./families/eq-cable');
const B5 = require('./families/b5-bandcore');
const M = require('./families/b5-misc');
const G = require('./families/b6-07');
const meta = require('./meta/dumbbell-alternate-v-up.json');

const ID = 'dumbbell-alternate-v-up';
const GZ = 15;
const B = C.lie({ kneeFlex: 0 });
const lie = B.pose, P0 = B.P0, NECK0 = B.NECK;
const midSh = (W) => V.scale(V.add(W.shoulder_r.p, W.shoulder_l.p), 0.5);
// both hands on the dumbbell ends; c: dumbbell centre, the handle across the body (+Z), fingers along the arms
let gR = { plane: 90, elev: 170, axial: 0, pron: 90, flex: 10 }, gL = { ...gR };
function hold(p, c, keepGuess = true) {
  const W = L.fk(p), d = V.norm(V.sub(c, midSh(W))), ax = [0, 0, 1], thumb = V.norm(V.cross(ax, d));
  const SEEDS = [{ plane: 90, elev: 150, axial: 0, pron: 90, flex: 10 }, { plane: 90, elev: 110, axial: 0, pron: 90, flex: 10 }, { plane: 95, elev: 75, axial: -10, pron: 90, flex: 10 }];
  let q = G.bestArm(p, [], 'r', { grip: V.add(c, V.scale(ax, GZ)), palm: [0, 0, -1], wPalm: 5, axis: thumb, wGrip: 4 }, gR, SEEDS); const eR = q.__err; delete q.__err;
  q = G.bestArm(q, [], 'l', { grip: V.sub(c, V.scale(ax, GZ)), palm: [0, 0, 1], wPalm: 5, axis: thumb, wGrip: 4 }, gL, SEEDS); const eL = q.__err; delete q.__err;
  if (keepGuess) { gR = G.armGuessOf(q, 'r'); gL = G.armGuessOf(q, 'l'); }
  q.__e = [eR.grip, eL.grip];
  return q;
}
// body: trunk `trunk` deg above the floor, right leg `legs` deg (left leg resting on the mat), spine curl, small turn
// toward the raised leg; the dumbbell centre `crel` relative to the mid-shoulder point; then grounded on the lowest point
const LIE_T = C.trunkFromFloor(L.fk(lie));
function body(k) {
  let p = clone(lie);
  C.spine(p, lie, k.curl || {}); C.neck(p, k.neck ?? NECK0);
  for (const j of ['spine_t12', 'spine_t6']) p.ch[j].rot = r1((k.turn || 0) / 2);
  const setP = (q, P) => { q.root.rot.pitch = r1(P); return q; };
  if (k.trunk > LIE_T + 0.5) { let lo = 0, hi = P0 + 5; for (let i = 0; i < 50; i++) { const P = (lo + hi) / 2; if (C.trunkFromFloor(L.fk(setP(clone(p), P))) > k.trunk) lo = P; else hi = P; } setP(p, (lo + hi) / 2); }
  p = C.setLeg(p, 'r', k.legs > 1 ? { deg: k.legs, knee: 2, dorsi: -25, abd: -3 } : { heel: 0.2, knee: 2, dorsi: -20, abd: -3 });
  p = C.setLeg(p, 'l', { heel: 0.2, knee: 2, dorsi: -20, abd: -3 });
  p.root.pos[1] = r1(p.root.pos[1] - L.shapeMinY(L.fk(p)).y + 0.15);
  p.ch.sc_r = { protract: r1(k.prot), elevate: r1(k.elev) }; p.ch.sc_l = clone(p.ch.sc_r);
  const W = L.fk(p), c = k.crel ? V.add(midSh(W), k.crel) : k.c(W);
  const q = hold(p, c);
  const e = q.__e; delete q.__e;
  q.root.pos[1] = r1(q.root.pos[1] - L.shapeMinY(L.fk(q)).y + 0.15);
  return { q, e, crel: V.sub(c, midSh(W)) };
}
const REACH = L.reach(6) + 4;
const dirAt = (a) => V.scale(V.norm([Math.cos(a * R.DEG), Math.sin(a * R.DEG), 0]), REACH);
const SF = +(process.env.SF || 0.5);
const shinC = (f, up = 12) => (W) => { const a = W.hip_r.p, b = W.ankle_r.p; return V.add(V.add(a, V.scale(V.sub(b, a), f)), [0, up, -2]); };
const Wlie = L.fk(lie), Slie = midSh(Wlie);
const lieRel = [-Math.sqrt(Math.max(1, REACH * REACH - (Slie[1] - 9) ** 2)), 9 - Slie[1], 0];
// key configs (numbers only, so in-between keys can be blended); the top key's dumbbell is placed over the shin
const TT = +(process.env.TT || 44), TL = +(process.env.TL || 56);
const K = {
  lie: { trunk: LIE_T, legs: 0, curl: { l5: 0, t12: 0, t6: 0 }, neck: NECK0, turn: 0, prot: 6, elev: 10, crel: lieRel },
  up1: { trunk: 12, legs: 16, curl: { l5: 2, t12: 10, t6: 10 }, neck: 26, turn: 4, prot: 6, elev: 10, crel: dirAt(118) },
  up2: { trunk: 30, legs: 36, curl: { l5: 6, t12: 13, t6: 10 }, neck: 24, turn: 8, prot: 8, elev: 8, crel: dirAt(72) },
  top: { trunk: TT, legs: TL, curl: { l5: 10, t12: 12, t6: 8 }, neck: 20, turn: 12, prot: 12, elev: 6, c: shinC(SF) },
  topH: { trunk: TT + 1, legs: TL + 1, curl: { l5: 10, t12: 12, t6: 8 }, neck: 20, turn: 12, prot: 12, elev: 6, c: shinC(SF + 0.02) },
};
const lerpK = (a, b, f) => { const o = {}; for (const k of ['trunk', 'legs', 'neck', 'turn', 'prot', 'elev']) o[k] = a[k] + (b[k] - a[k]) * f; o.curl = {}; for (const j of ['l5', 't12', 't6']) o.curl[j] = a.curl[j] + (b.curl[j] - a.curl[j]) * f; o.crel = V.lerp(a.crel, b.crel, f); return o; };
const poses = {}, err = {};
// up: lie -> up1 -> up2 -> top, with in-between keys; down: the same path back (the lowering mirrors the lift)
const chainK = ['lie', 'up1', 'up2', 'top'], NB = +(process.env.NB || 4), upNames = [];
K.top.crel = body(K.top).crel; delete K.top.c; // the top key's dumbbell over the shin, as an offset from the shoulders
let prevK = null;
for (const n of chainK) {
  if (prevK) for (let i = 1; i <= NB; i++) { const r = body(lerpK(prevK, K[n], i / (NB + 1))); const nm = `${n}_${i}R`; poses[nm] = r.q; upNames.push(nm); }
  const r = body(K[n]); poses[`${n}R`] = r.q; err[n] = r.e; upNames.push(`${n}R`); prevK = K[n];
}
poses.topHR = clone(poses.topR); // held still at the top
// left-leg half: mirror image (the two-hand dumbbell is symmetric)
for (const n of Object.keys(poses)) if (n.endsWith('R')) poses[`${n.slice(0, -1)}L`] = CB.mirror(poses[n]);
poses.lie = poses.lieR; poses.lieH = clone(poses.lieR); delete poses.lieR; delete poses.lieL;
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p])), D = meta.timeline.duration;
const ups = upNames.slice(1); // after the lying key
const half = (s, up, hold, down) => [...ups.map((n, i) => ({ t: up.start + ((up.end - up.start) * (i + 1)) / ups.length, pose: `${n.slice(0, -1)}${s}` })), { t: hold.end, pose: `topH${s}` },
  ...ups.slice(0, -1).reverse().map((n, i) => ({ t: down.start + ((down.end - down.start) * (i + 1)) / ups.length, pose: `${n.slice(0, -1)}${s}` }))];
const keyframes = [{ t: 0, pose: 'lie' }, { t: ph.setup.end, pose: 'lie' }, ...half('R', ph.upR, ph.holdR, ph.downR), { t: ph.downR.end, pose: 'lieH' }, { t: ph.rest.end, pose: 'lieH' },
  ...half('L', ph.upL, ph.holdL, ph.downL), { t: D, pose: 'lie' }].map((k) => ({ t: +k.t.toFixed(3), pose: k.pose }));
const ex = C.buildModule(meta, poses, keyframes, []);
ex.props = [{ id: 'db', kind: 'dumbbell', size: [32, 12, 12], attach: { joint: 'wrist_r', with: 'wrist_l', grip: 'handle' } }];
const peakHip = Math.max(poses.topHR.ch.hip_r.flex, poses.topHR.ch.hip_l.flex);
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(peakHip - 6), max: Math.ceil(peakHip + 4) };
let clr = { d: 1e9 }, gap = [999, -999], low = 1e9;
const rep = C.scan(ex, { trunk: (W) => C.trunkFromFloor(W), legR: (W) => C.legFromFloor(W, 'r'), legL: (W) => C.legFromFloor(W, 'l'), hip: (W, p) => p.ch.hip_r.flex });
const H = require('./families/hips');
H.loopReport(ex, { probe: (W, pz, t) => { const c = M.twoHandDbClear(W); if (c.d < clr.d) clr = { d: c.d, what: c.what, t: +t.toFixed(2) }; low = Math.min(low, c.minY); const gg = M.twoHandDb(W).gripGap; gap = [Math.min(gap[0], gg), Math.max(gap[1], gg)]; } });
const jump = CC.scan(ex, { planted: [] }).jump;
const Wl = L.fk(poses.lie), Wt = L.fk(poses.topR), kin = ex.exercise.kinematics, d = (v) => `≈${Math.round(v)}°`, tp = poses.topR, lp = poses.lie;
kin[0].setup = d(C.trunkFromFloor(Wl)); kin[0].peak = `${d(C.trunkFromFloor(Wt))} (balanced on the ${L.shapeMinY(Wt).id.replace(/_[rl]$/, '')})`;
kin[1].setup = `${d(C.legFromFloor(Wl, 'r'))} (both legs resting)`; kin[1].peak = `Raised leg ${d(C.legFromFloor(Wt, 'r'))}, other leg ${d(C.legFromFloor(Wt, 'l'))} (long on the mat)`;
kin[2].setup = d(lp.ch.hip_r.flex); kin[2].peak = `${d(tp.ch.hip_r.flex)} raised side, ${d(tp.ch.hip_l.flex)} resting side`;
kin[3].setup = 'Straight overhead, dumbbell just off the mat'; kin[3].peak = `Dumbbell above the raised shin (${Math.round(M.twoHandDb(Wt).c[1])} cm up)`;
kin[4].setup = 'Lie 0.6 s'; kin[4].peak = '1.2 s up, 0.4 s hold, 1.6 s down per side';
console.log(`Dumbbell Alternate V-up: wrote ${L.write(ex)}\n  grip err ${JSON.stringify(err)}\n  ${JSON.stringify(rep)}\n  db clear ${JSON.stringify(clr)} low ${r1(low)} gap ${gap.map(r1)} jump ${JSON.stringify(jump)}`);
const extra = [clr.d < -0.3 && `dumbbell into the body ${JSON.stringify(clr)}`, low < 0 && 'dumbbell below the floor', gap[1] - gap[0] > 1.5 && `grip gap changes ${gap.map(r1)}`, jump.v > 6 && `channel jump ${JSON.stringify(jump)}`];
C.guard(ID, rep, extra);
