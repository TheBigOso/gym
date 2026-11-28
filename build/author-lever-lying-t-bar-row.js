// Lever Lying T-bar Row (GymVisual; movement reference only, the page could not be read): chest-supported T-bar row
// machine: face down on a 40 degree incline pad (body position taken from author-chest-supported-dumbbell-row.js: chest on
// the pad, chin over its top edge, balls of the feet planted behind), hands on the handles of a plate-loaded lever (prop
// kind 'lever_machine', type seated_row re-fitted: one arm with two neutral handles, pivot low in front of the pad). From
// the arms hanging straight the handles are rowed up along the lever arc to beside the lower chest, elbows driving back,
// and lowered under control. Bilateral, right arm solved on the arc (sequential keys) and mirrored.
// Family build/families/gear-g3m.js (arcPress).
const L = require('./lib');
const { R, V, Q, r1, clone } = L;
const B = require('./families/b3-back');
const P = require('./families/prone');
const DBH = require('./families/dumbbell');
const { makeFamily, BALL_PITCH } = require('./families/lunge');

const G3 = require('./families/gear-g3m');
const C2 = require('./families/eq-cable');
const meta = require('./meta/lever-lying-t-bar-row.json');
const ANG = 40, PAD = 80, BW = 28, SEAT = 40, BENCH_H = 45;
const S_ALONG = +(process.env.SA ?? 23);                                   // pelvis this far up the pad (cm): the chin clears the top
const CHEST_OFF = +(process.env.CO ?? 0);              // extra gap (cm) between the rig chest shapes and the pad
const FOOT = [+(process.env.FX ?? -50), null, +(process.env.FZ ?? 26)];                          // balls of the feet behind and beside the seat
const bench = DBH.bench({ x: -SEAT / 2, z: 0, seat: SEAT, height: BENCH_H, width: BW, angle: ANG, back: PAD, side: 1 });
const boxes = B.benchBoxes(bench);
const dir = bench.padDir, nrm = [-dir[1], dir[0], 0];
const FAM = makeFamily({ toe: 15, half: 10 });
const fq = (pitch, yaw) => P.qArr(Q.mul(L.footRot(yaw), Q.axis([0, 0, 1], -pitch)));
const HEEL = +(process.env.HEEL ?? BALL_PITCH);                // heel-up angle of the feet (on the balls of the feet)
const contacts = [Object.assign(L.legContact('r'), { label: 'Right foot (ball)', pole: [1, 0, 0.7], handRot: fq(HEEL, -15) }),
  Object.assign(L.legContact('l'), { label: 'Left foot (ball)', pole: [1, 0, -0.7], handRot: fq(HEEL, 15) })];
// ankle height that puts the ball of the foot (rig foot shape) on the floor at this heel angle
const footSh = L.rig.shapes.find((s) => s.id === 'foot_r');
const ANK = (() => { let a = 2, b = 30; for (let i = 0; i < 40; i++) { const y = (a + b) / 2, st = L.POSES.standing().pose; st.ik = { leg_r: { target: [0, y, 10], weight: 1 } }; const g = R.shapeWorld(L.fk(st, [contacts[0]]), footSh); const lo = g.c[1] - Math.hypot(g.axes[0][1], g.axes[1][1], g.axes[2][1]); if (lo > 0.15) b = y; else a = y; } return r1((a + b) / 2 + 0.05); })();
const FT = { r: [FOOT[0], ANK, FOOT[2]], l: [FOOT[0], ANK, -FOOT[2]] };
const z0 = () => ({ rot: 0, flex: 0, latFlex: 0 });
const PITCH = -(90 - ANG) - 8;   // the rig trunk line (pelvis to C7) sits about 8 degrees behind the pelvis axis
function base(pos) {
  return { root: { pos, rot: { pitch: PITCH } }, ch: { spine_l5: z0(), spine_t12: z0(), spine_t6: z0(), neck_c7: { rot: 0, flex: +(process.env.NK ?? -14) }, head_c1: { rot: 0, flex: +(process.env.HD ?? -16) },
    sc_r: { protract: 6, elevate: 0 }, sc_l: { protract: 6, elevate: 0 }, hip_r: { flex: 45, abd: 30, rot: -30 }, hip_l: { flex: 45, abd: 30, rot: -30 }, knee_r: { flex: 55 }, knee_l: { flex: 55 }, ankle_r: { dorsi: -8 }, ankle_l: { dorsi: -8 },
    shoulder_r: { plane: 90, elev: 60, axial: 0 }, shoulder_l: { plane: 90, elev: 60, axial: 0 }, elbow_r: { flex: 8 }, elbow_l: { flex: 8 }, wrist_r: { pron: 90, flex: 0, dev: 0 }, wrist_l: { pron: 90, flex: 0, dev: 0 } },
    ik: { leg_r: { target: FT.r, weight: 1 }, leg_l: { target: FT.l, weight: 1 } } };
}
const TRUNK = L.rig.shapes.filter((s) => /^(chest|pecs_r|pecs_l|ribcage|abdomen)$/.test(s.id));
const frontGap = (W) => { let m = 1e9; for (const s of TRUNK) { const g = R.shapeWorld(W, s); const ext = Math.sqrt(g.axes.reduce((a, ax) => a + V.dot(ax, nrm) ** 2, 0)); m = Math.min(m, V.dot(V.sub(g.c, bench.hinge), nrm) - ext); } return m; };
let pos = V.add(V.add(bench.hinge, V.scale(dir, S_ALONG)), V.scale(nrm, 20));
for (let it = 0; it < 40; it++) { const g = frontGap(L.fk(base(pos))) - CHEST_OFF; pos = V.sub(pos, V.scale(nrm, g)); if (Math.abs(g) < 0.005) break; }
let body = base(pos.map((v) => +v.toFixed(2)));
body = P.fitLeg(body, 'r', contacts, 'leg_r'); body = P.fitLeg(body, 'l', contacts, 'leg_l'); B.wrapPose(body);
const along = (S, Fr, u, v, w) => V.add(V.add(V.add(S, V.scale(Fr.u, u)), V.scale(Fr.v, v)), V.scale(Fr.w, w)).map(r1);
const RR = G3.arcPress(meta, {
  type: 'seated_row', seq: true, NK: 10, ease: (f) => f, keepHead: true,
  params: { arms: 'split', endRot: [-90, 70, 0], endSize: [12, 1.6], pads: [], seat: null, back: null, load: 'plates', plateAt: 0.6 },
  base: () => ({ pose: body, contacts, planted: ['leg_r', 'leg_l'], props: [bench.prop] }),
  arc: (W0, S, Fr) => ({ G0: along(S, Fr, -17, 0, 3), G1: [r1(S[0] + 3), r1(S[1] - 50), r1(S[2] + 3)], radius: 110, side: 1 }),
  palm: () => [0, 0, -1], wPalm: 1, g0: { plane: 40, elev: 30, axial: 30, pron: 90, flex: 100 }, g1: { plane: 80, elev: 60, axial: 0, pron: 90, flex: 8 },
  elbow0: (W0, S, Fr) => V.add(S, V.scale(V.norm(V.add(V.scale(Fr.u, -0.55), V.add(V.scale(Fr.v, -0.75), V.scale(Fr.w, 0.35)))), L.UA)),
  elbow1: (W0, S) => V.add(S, V.scale([0.05, -1, 0.06], L.UA)),
  partSkip: {},
});
const { set, Wt, Wb, M, rep } = RR, d = G3.deg;
set('Elbow flexion', 'setup', `${d(C2.elbowAng(Wt))} with the arms hanging`); set('Elbow flexion', 'peak', `${d(C2.elbowAng(Wb))} at the top of the row`);
set('Shoulder extension', 'setup', 'Arms hanging below the shoulders'); set('Shoulder extension', 'peak', `Elbows ${r1(V.len(V.sub(Wb.elbow_r.p, RR.S)))} cm from the shoulders, beside the trunk`);
set('Grip', 'setup', `Neutral handles ${r1(2 * RR.arc.G0[2])} cm apart`); set('Grip', 'peak', 'Unchanged');
set('Lever', 'setup', `Pivot ${M.P.pivot[1]} cm high, ${r1(M.P.pivot[0] - RR.S[0])} cm ahead of the shoulders`); set('Lever', 'peak', `Lever swings ${Math.abs(RR.A1)}°; hands within ${G3.offArcOf(rep)} cm of the arc`);
set('Trunk', 'setup', `Chest on the ${ANG}° pad, feet planted`); set('Trunk', 'peak', 'Unchanged');
set('Tempo', 'setup', 'Pause 0.5 s with the arms hanging'); set('Tempo', 'peak', '1.3 s up, 0.4 s squeeze, 2 s down');
G3.fillDash(RR.ex);
console.log(G3.summary('Lever Lying T-bar Row', RR));
