// Dumbbell Step-down (GymVisual #1173712): stand on a 24 cm box near its front edge with a dumbbell hanging in each hand
// (neutral grip, arms hanging straight down). Shift onto the right foot, then bend the right knee slowly (about 2 s) while the
// left foot reaches forward over the edge and down until its heel lightly taps the floor in front of the box; straighten the
// right leg to stand tall and bring the left foot back onto the box. The right foot stays planted on the box all loop; the
// centre of mass stays over it. Authored right leg working (the player mirrors). Built on build/families/single.js.
const L = require('./lib');
const { r1, clone } = L;
const { makeSingle, com, dorsiOf } = require('./families/single');
const H = require('./families/hips');
const B = require('./families/b3-legs');
const K = require('./families/b4-squats2');
const meta = require('./meta/dumbbell-step-down.json');

const F = makeSingle({ toe: 6, half: 9 });
const BOX_H = +(process.env.BH ?? 16), EDGE = +(process.env.EDGE ?? 17);  // box top; its front edge 17 cm in front of the right ankle (toes just at the edge)
const LIFT = BOX_H + +(process.env.MESH_DZ ?? 0);  // ankle lift for a foot on the box (skinned sole on the box top)
const box = { id: 'box', kind: 'box', center: [EDGE - 22.5, 0, 0], size: [45, BOX_H, 40] };
const fl = (x, z, o = {}) => Object.assign({ c: 'flat', x, z }, o);
const ON_R = fl(0, 9, { lift: LIFT }), ON_L = fl(0, -9, { lift: LIFT });
const HANG = { out: +(process.env.OUT ?? 11) };
const hang = (p) => { const q = B.armsHang(p, HANG); delete q.__armCost; return q; };
const sp = (root, pitch, feet, spine = { l5: -2, t12: 0, t6: 0 }) => ({ root, pitch, spine, feet, arms: hang });
const CX = 4, CZ = 9;                              // centre of mass over the middle of the right foot
const tall = (lf, knee = 4, pitch = -2) => F.balanceTall(sp([0, 88 + LIFT, 6], pitch, { r: ON_R, l: lf }), { knee, cx: CX, cz: CZ });
const bent = (lf, knee, pitch) => F.balance(sp([-6, 80 + LIFT, 8], pitch, { r: ON_R, l: lf }), { knee, cx: CX, cz: CZ });
// both feet on the box: centre of mass between the feet
const standOn = () => { let s = sp([-2, 88 + LIFT, 0], 0, { r: ON_R, l: ON_L }, { l5: 0, t12: 0, t6: 0 });
  for (let i = 0; i < 6; i++) { s = F.rootY(s, 4); s.root[0] = r1(s.root[0] - (com(F.fk(F.pose(s)))[0] - CX)); } return F.rootY(s, 4); };
// heel tap: left foot toes up 20 degrees, the heel (lowest point of the foot) 0.3 cm over the floor just in front of
// the box edge (ankle target from H.heelRaise); the right knee is found by bisection so the left leg (nearly straight,
// about 6 degrees) just reaches it
const TAP_PITCH = -20, TAP_Z = -8, HEEL_X = EDGE + +(process.env.HX ?? 6);
// ankle target for the toes-up foot: the lowest point of the foot shape 0.3 cm over the floor at x = HEEL_X
const heelC = H.legC('l', { rot: H.footQ(TAP_PITCH, 6), id: 'heel_l' });
const TAP = (() => {
  const res = (x) => { const p = clone(F.st.pose); p.root.pos = [HEEL_X, 70, 0]; p.ik = { heel_l: { target: [x[0], x[1], TAP_Z], weight: 1 } }; const lp = H.lowPoint(L.fk(p, [heelC]), 'foot_l'); return [(lp[0] - HEEL_X) * 3, (lp[1] - 0.3) * 3]; };
  const x = L.R.solveLM([HEEL_X + 2, 7], res, { iters: 200 }).x;
  return { target: [r1(x[0]), r1(x[1]), TAP_Z] };
})();
const legReach = (kn) => Math.sqrt(42 * 42 + 41.5 * 41.5 + 2 * 42 * 41.5 * Math.cos(kn * Math.PI / 180));
const tapPitch = (k) => -16 - (k - 40) * 0.25;
// the swinging left foot spec while the heel is near the floor (its channels are refitted to the toes-up foot below)
const tapFoot = () => fl(TAP.target[0], TAP_Z, { lift: r1(TAP.target[1] - L.ANKLE_H + 2), w: 0, pitch: TAP_PITCH });
function tapSpec() {
  let lo = 20, hi = 110, k = 60;
  for (let i = 0; i < 24; i++) {
    k = (lo + hi) / 2; const W = F.fk(F.build(bent(tapFoot(), k, tapPitch(k))));
    if (L.V.len(L.V.sub(W.hip_l.p, TAP.target)) < legReach(8)) hi = k; else lo = k; // left leg reaches with the knee bent about 8 degrees
  }
  return bent(tapFoot(), r1((lo + hi) / 2), tapPitch((lo + hi) / 2));
}
const heelFit = (p) => H.fitLeg(p, 'l', heelC, TAP.target, { rot: 0, abd: 0 });
const S = {};
S.stand = standOn();
S.shift = tall(fl(3, -8, { lift: LIFT + 2, w: 0, pitch: 4 }), 5, -3);
S.over = tall(fl(15, -8, { lift: LIFT + 4, w: 0, pitch: 2 }), 14, -7);        // left toes past the edge, foot above the box top
S.edge = tall(fl(28, -8, { lift: LIFT + 2, w: 0, pitch: -6 }), 26, -10);       // heel past the edge before the foot drops

S.tap = tapSpec();
const kTap = F.kneeOf(F.fk(F.pose(S.tap)), 'r');
S.past = bent(fl(TAP.target[0] + 1, -8, { lift: LIFT * 0.45, w: 0, pitch: -14 }), r1(kTap * 0.62), tapPitch(kTap * 0.62));
S.clearR = tall(fl(28, -8, { lift: LIFT + 3, w: 0, pitch: -4 }), 24, -9);     // on the way up the foot rises in front of the edge first
S.r60 = bent(fl(TAP.target[0] + 1, -8, { lift: LIFT * 0.4, w: 0, pitch: -12 }), r1(kTap * 0.6), tapPitch(kTap * 0.6));
S.back = tall(fl(10, -8, { lift: LIFT + 3.5, w: 0, pitch: 4 }), 8, -4);
S.preLand = tall(fl(1, -9, { lift: LIFT + 1.8, w: 0, pitch: 0 }), 4, -1);
const poses = {};
for (const [k, s] of Object.entries(S)) poses[k] = F.pose(s);
poses.land = clone(poses.stand);
poses.tap = heelFit(poses.tap);
poses.tapHold = heelFit(F.pose(Object.assign(clone(S.tap), { arms: S.tap.arms, root: [S.tap.root[0], r1(S.tap.root[1] - 0.2), S.tap.root[2]] })));
const keyframes = [{ t: 0, pose: 'stand' }, { t: 0.8, pose: 'stand' }, { t: 1.2, pose: 'shift' }, { t: 1.65, pose: 'over' }, { t: 2.1, pose: 'edge' }, { t: 2.65, pose: 'past' }, { t: 3.2, pose: 'tap' },
  { t: 3.3, pose: 'tapHold' }, { t: 3.4, pose: 'tap' }, { t: 3.75, pose: 'r60' }, { t: 4.05, pose: 'clearR' }, { t: 4.3, pose: 'back' }, { t: 4.5, pose: 'preLand' }, { t: 4.6, pose: 'land' }, { t: 6.0, pose: 'stand' }];
const ex = { schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props: [box, B.heldProp('r'), B.heldProp('l')], contacts: F.contacts,
  timeline: meta.timeline, poses, keyframes, activation: meta.activation, guides: meta.guides, checks: meta.checks };
ex.exercise.reference.note = K.NOTE;
// the free foot must stay out of the box: lowest point of the left foot shape over the box footprint vs the box top
let footBox = 1e9, footBoxAt = null;
const rep = K.scan(ex, { holds: [{ side: 'r' }, { side: 'l' }], planted: ['leg_r'], box: { center: box.center, size: box.size }, probe: (W, pz, t) => {
  if (t < 0.85 || t > 4.55) return;
  const g = L.R.shapeWorld(W, L.rig.shapes.find((s) => s.id === 'foot_l'));
  for (let a = -1; a <= 1; a += 0.1) { const pnt = L.V.add(g.c, L.V.scale(g.axes[0], a)); if (pnt[0] < EDGE) { const d = pnt[1] - Math.hypot(g.axes[0][1], g.axes[1][1], g.axes[2][1]) * 0 - 3.6 - BOX_H; if (d < footBox) { footBox = d; footBoxAt = +t.toFixed(2); } } }
} });
const Ws = F.fk(poses.stand), Wt = F.fk(poses.tap);
const set = (p, f, v) => { const k = ex.exercise.kinematics.find((x) => x.measure.startsWith(p)); if (k) k[f] = v; };
set('Box height', 'setup', `${BOX_H} cm box, right toes about 2 cm from its front edge`); set('Box height', 'peak', 'Right foot stays flat on the box');
set('Standing knee flexion', 'setup', `≈${Math.round(F.kneeOf(Ws, 'r'))}°`); set('Standing knee flexion', 'peak', `≈${Math.round(kTap)}° at the heel tap (ankle dorsiflexion ≈${Math.round(dorsiOf(Wt, 'r'))}°)`);
set('Standing hip', 'setup', `flexion ≈${Math.round(poses.stand.ch.hip_r.flex)}°`); set('Standing hip', 'peak', `flexion ≈${Math.round(poses.tap.ch.hip_r.flex)}° at the tap (joint channel), pelvis level`);
set('Trunk inclination', 'setup', `≈${Math.round(F.trunkLean(Ws))}°`); set('Trunk inclination', 'peak', `≈${Math.round(F.trunkLean(Wt))}° forward at the tap`);
set('Free foot', 'setup', 'On the box beside the right'); set('Free foot', 'peak', `Heel touches the floor ${HEEL_X - EDGE} cm in front of the box edge, toes up ${-TAP_PITCH}°`);
set('Tempo', 'setup', 'Stand 0.8 s'); set('Tempo', 'peak', 'Shift 0.4 s, 2.0 s down, 0.2 s tap, 1.2 s up, 1.4 s on both feet');
const c = (k) => com(F.fk(poses[k])).map(Math.round);
console.log(`Dumbbell Step-down: wrote ${L.write(ex)} kneeTap ${r1(kTap)} tap ${TAP.target}\n  ${JSON.stringify(rep)}\n  footOverBox ${r1(footBox)} at ${footBoxAt} com stand ${c('stand')} tap ${c('tap')}`);
K.gate('dumbbell-step-down', rep, { maxJump: 6 });
if (footBox < 0) { console.error('FAIL: free foot passes through the box'); process.exitCode = 1; }
