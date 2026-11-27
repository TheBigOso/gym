// Lateral Step-up (GymVisual #515412): stand side-on to a 30 cm box with the right foot flat on top and the left foot on
// the floor, hands on hips. Push down through the right heel until the right leg is straight and the body stands over
// the box foot, the left foot hovering beside the box; lower slowly until the left heel taps the floor, and repeat.
// The right foot stays planted on the box the whole loop. Authored on the right leg (the player mirrors).
const L = require('./lib');
const { r1, clone } = L;
const { makeSingle, com, dorsiOf } = require('./families/single');
const meta = require('./meta/lateral-step-up.json');

const F = makeSingle({ toe: 6, half: 9 });
const box = meta.props.find((p) => p.kind === 'box');
const H = box.size[1], EDGE = box.center[2] - box.size[2] / 2;    // 30 cm tall, near edge 4 cm right of the midline
const RZ = EDGE + 11, LZ = -9;                                     // right ankle 11 cm in from the edge; left foot under the left hip
const fl = (x, z, o = {}) => Object.assign({ c: 'flat', x, z }, o);
const LX = -10;                                                    // left foot a little behind the box foot (lets the hips stay over it with a steep box shin)
const ON_BOX = fl(0, RZ, { lift: H }), FLOOR_L = fl(LX, LZ);
const sp = (root, pitch, lf) => ({ root, pitch, spine: { l5: 0, t12: 0, t6: 0 }, feet: { r: ON_BOX, l: lf }, arms: F.handsOnHips });
const mixRoot = (a, b, f) => ({ root: a.root.map((v, i) => r1(v + (b.root[i] - v) * f)), pitch: r1(a.pitch + (b.pitch - a.pitch) * f), spine: a.spine });

// start / heel tap: both feet down, left leg nearly straight (root height by bisection on the left knee), hips back enough
// that the box shin stays within the ankle range (root x by bisection on the right ankle), pelvis between the feet
const START_PITCH = -14;
const start = (() => {
  const at = (x, z) => F.rootY(sp([x, 90, z], START_PITCH, FLOOR_L), 8, 'l');
  let z = 3, st;
  for (let k = 0; k < 4; k++) {
    let a = -30, b = 10; for (let i = 0; i < 26; i++) { const x = (a + b) / 2; st = at(x, z); if (dorsiOf(F.fk(F.build(st)), 'r') < 30) a = x; else b = x; }
    st = at(r1((a + b) / 2), z); z = r1(z - (com(F.fk(F.build(st)))[2] - ((LZ + RZ) / 2 + 2)));
  }
  return at(st.root[0], z);
})();
const K0 = Math.round(F.kneeOf(F.fk(F.build(start)), 'r'));
// single-leg on the box: g = 0 lift-off (right knee 75, trunk leaning, left toes just off the floor) to 1 = top (knee straight,
// tall). Centre of mass over the middle of the right foot; the free left foot rises beside the box (outside its near edge)
const K_OFF = 75;
const leftFoot = (g) => fl(r1(LX + 10 * g), r1(LZ + 6 * g), { lift: r1(4 + (H - 2) * g), w: 0, pitch: r1(50 - 38 * g) });
// from g = 0.25 the left leg hangs from its hip with a soft knee (placed from the hip, then the body is re-balanced)
const onBox = (g) => {
  let s = F.balanceTall(sp([-8, 100, RZ], r1(-36 + 33 * g), leftFoot(g)), { knee: K_OFF + (4 - K_OFF) * g, cx: 4, cz: RZ, iters: 16 });
  if (g < 0.25) return s;
  for (let i = 0; i < 2; i++) {
    s.feet.l = F.freeFoot(s, 'l', { knee: r1(8 + 12 * g), fwd: r1(4 + 10 * g), dz: -4, zMax: LZ + 6, pitch: r1(30 - 18 * g) });
    s = F.balanceTall(s, { knee: K_OFF + (4 - K_OFF) * g, cx: 4, cz: RZ, iters: 10 });
  }
  return s;
};
const off = onBox(0);
// left heel peeling up / lowering (rolling about the ball of the foot) between the start and the lift-off
const roll = (f, pitch) => Object.assign(mixRoot(start, off, f), { feet: { r: ON_BOX, l: { c: 'roll', pitch, ballX: LX + F.BALL_X, z: LZ } }, arms: F.handsOnHips });

const poses = { start: F.pose(start), roll20: F.pose(roll(0.3, 20)), roll40: F.pose(roll(0.65, 40)), off: F.pose(off), u30: F.pose(onBox(0.3)), u60: F.pose(onBox(0.6)), u85: F.pose(onBox(0.85)), top: F.pose(onBox(1)),
  l80: F.pose(onBox(0.8)), l55: F.pose(onBox(0.55)), l30: F.pose(onBox(0.3)), l10: F.pose(onBox(0.08)) };
const keyframes = [{ t: 0, pose: 'start' }, { t: 0.8, pose: 'start' }, { t: 0.92, pose: 'roll20' }, { t: 1.02, pose: 'roll40' }, { t: 1.12, pose: 'off' }, { t: 1.35, pose: 'u30' }, { t: 1.6, pose: 'u60' }, { t: 1.82, pose: 'u85' }, { t: 2.0, pose: 'top' },
  { t: 2.5, pose: 'top' }, { t: 2.9, pose: 'l80' }, { t: 3.4, pose: 'l55' }, { t: 3.9, pose: 'l30' }, { t: 4.25, pose: 'l10' }, { t: 4.35, pose: 'off' }, { t: 4.43, pose: 'roll40' }, { t: 4.52, pose: 'roll20' }, { t: 4.62, pose: 'start' }, { t: 5.5, pose: 'start' }];
const ex = { schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props: meta.props, contacts: F.contacts,
  timeline: meta.timeline, poses, keyframes, activation: meta.activation, guides: meta.guides, checks: meta.checks };
const rep = F.report(ex), Ws = F.fk(poses.start), Wt = F.fk(poses.top);
const kin = ex.exercise.kinematics, set = (p, f, v) => { const k = kin.find((x) => x.measure.startsWith(p)); if (k) k[f] = v; };
set('Box height', 'setup', `${H} cm, right foot ${RZ - LZ} cm from the left (ankle centres)`); set('Box height', 'peak', 'Right foot stays planted');
set('Box-leg knee', 'setup', `≈${Math.round(F.kneeOf(Ws, 'r'))}°`); set('Box-leg knee', 'peak', `≈${Math.round(F.kneeOf(Wt, 'r'))}°`);
set('Pelvis', 'setup', `${r1(Ws.pelvis.p[2])} cm right of the midline, ${r1(Ws.pelvis.p[1])} cm high`); set('Pelvis', 'peak', `${r1(Wt.pelvis.p[2])} cm right of the midline (over the box foot), ${r1(Wt.pelvis.p[1])} cm high`);
set('Trunk inclination', 'setup', `≈${Math.round(F.trunkLean(Ws))}°`); set('Trunk inclination', 'peak', `≈${Math.round(F.trunkLean(Wt))}°`);
set('Tempo', 'setup', 'Hold 0.8 s'); set('Tempo', 'peak', '1.2 s up, 0.5 s hold, 2.0 s down, heel tap and 1.0 s reset');
ex.exercise.reference.note = 'Reference used only to identify the movement. No GymVisual media is stored here; this rig, model and animation are original.';
console.log(`Lateral Step-up: start ${JSON.stringify(start.root)} off ${JSON.stringify(off.root)} dorsiOff ${r1(dorsiOf(F.fk(poses.off), 'r'))} top ${JSON.stringify(poses.top.root.pos)} K0 ${K0} dorsiStart ${r1(dorsiOf(Ws, 'r'))} wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}`);
if (rep.slide > 0.05) { console.error('FAIL: planted foot slides'); process.exitCode = 1; }
