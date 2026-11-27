// Barbell Single Leg Deadlift (GymVisual "Barbell Single Leg Deadlift", movement reference only): stand on the right leg
// (knee soft), the bar held in both hands in front of the thighs with an overhand grip just outside the hips (50 cm between
// the handle centres), the left foot just off the floor. Hinge at the right hip with a flat back while the left leg reaches
// back in line with the trunk (toes down, pelvis square) until the trunk is close to level; the bar hangs from straight
// arms and slides down the front of the standing leg (barbell.js placement, centred on the body). Drive the hip forward to
// stand tall, the free leg swinging back under the body. The root is moved fore-aft and sideways at every key so the body
// + bar centre of mass sits over the right mid-foot. Right foot planted (constant IK target). Authored on the right leg.
const L = require('./lib');
const { V, r1, clone } = L;
const { makeFamily } = require('./families/lunge');
const B = require('./families/b3-back');
const BB = require('./families/barbell');
const EQ = require('./families/equip');
const H = require('./families/hips');
const X = require('./families/b5-bbhinge');
const meta = require('./meta/barbell-single-leg-deadlift.json');

const F = makeFamily({ toe: 6, half: 9 });
const GW = 50, KG = 20;
const PITCH = +(process.env.P ?? -82), KNEE_TOP = 8, KNEE = +(process.env.K ?? 20);
const MID = [5, 9];   // right mid-foot (x, z)
const FREE = { top: { hip: 12, knee: 65, dorsi: -25 }, bottom: { hip: 8, knee: 6, dorsi: -8 } };
const state = {};
function build(f, rx, rz) {
  const g = f * f * (3 - 2 * f) * 0.35 + f * 0.65;
  const kn = KNEE_TOP + (KNEE - KNEE_TOP) * Math.min(1, f / 0.4);
  let spec = { root: [rx, 85, rz], pitch: r1(PITCH * g), spine: { l5: r1(-3 * g), t12: 0, t6: r1(1 * g) }, feet: { r: { c: 'flat', x: 0 }, l: { c: 'flat', x: -10, z: -9, lift: 12, w: 0 } } };
  spec = F.rootY(spec, kn);
  let p = F.pose(spec);
  const lean = -spec.pitch + spec.spine.l5 + spec.spine.t6, nk = -Math.min(lean, 80) * 0.16;
  p.ch.neck_c7 = { rot: 0, flex: r1(nk * 0.45) }; p.ch.head_c1 = { rot: 0, flex: r1(nk * 0.55) };
  const u = Math.pow(f, 0.9), lerp = (a, b) => r1(a + (b - a) * u);
  p.ch.hip_l = { flex: lerp(FREE.top.hip, FREE.bottom.hip), abd: 0, rot: 0 }; p.ch.knee_l = { flex: lerp(FREE.top.knee, FREE.bottom.knee) }; p.ch.ankle_l = { dorsi: lerp(FREE.top.dorsi, FREE.bottom.dorsi) };
  p.ch.sc_r = { protract: r1(2 + 3 * g), elevate: r1(-2 - 2 * g) }; p.ch.sc_l = clone(p.ch.sc_r);
  const q = X.hangBar(p, F.contacts, { gw: GW, clear: 1.0, state }); delete q.__bar; p = B.wrapPose(q);
  const W = F.fk(p);
  return { pose: p, W, bar: EQ.barAt(W, BB.GRIP) };
}
function at(f) {
  let rx = 0, rz = 7, r;
  for (let i = 0; i < 8; i++) { r = build(f, rx, rz); const c = B.comX(r.W, [{ c: r.bar.c, kg: KG }]); const ex = c[0] - MID[0], ez = c[2] - MID[1]; if (Math.hypot(ex, ez) < 0.08) break; rx -= ex * 1.1; rz -= ez * 1.1; }
  r.com = B.comX(r.W, [{ c: r.bar.c, kg: KG }]);
  return r;
}
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, [p.start, p.end]])), D = meta.timeline.duration;
const FS = [0, 0.12, 0.25, 0.38, 0.5, 0.62, 0.75, 0.88, 1], N = FS.length - 1;
const poses = {}, coms = [];
FS.forEach((f, i) => { const r = at(f); poses[`h${i}`] = r.pose; coms.push(r.com.map(r1)); });
const keyframes = [{ t: 0, pose: 'h0' }, ...X.eased('h', FS, ph.lower[0], ph.lower[1]), ...X.eased('h', FS, ph.rise[0], ph.rise[1], true), { t: D, pose: 'h0' }];
const ex = H.module_(meta, F.contacts, poses, keyframes);
ex.props = [BB.barbellProp()];
const sw = BB.sweep(ex, { fixed: ['ankle_r', 'toe_r'] });
const Wt = F.fk(poses.h0), Wb = F.fk(poses[`h${N}`]), bb = EQ.barAt(Wb, BB.GRIP);
const legLine = r1(V.angle(V.sub(Wb.ankle_l.p, Wb.hip_l.p), V.sub(Wb.neck_c7.p, Wb.pelvis.p)));
const footUp = r1(Math.min(...[Wt, F.fk(poses.h1)].map((W) => Math.min(W.toe_l.p[1], W.ankle_l.p[1]))));
const comOff = r1(Math.max(...coms.map((c) => Math.hypot(c[0] - MID[0], c[2] - MID[1]))));
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Hip flexion', 'setup', `${d(poses.h0.ch.hip_r.flex)} (standing hip)`); set('Hip flexion', 'peak', `${d(poses[`h${N}`].ch.hip_r.flex)} (joint channel), trunk ${d(90 - B.trunkLean(Wb))} above level`);
set('Knee flexion', 'setup', `${d(B.kneeOf(Wt, 'r'))} (standing knee)`); set('Knee flexion', 'peak', d(B.kneeOf(Wb, 'r')));
set('Free leg', 'setup', `Hovering beside the standing ankle (toe ${footUp} cm up)`); set('Free leg', 'peak', `Hip-to-ankle line ${legLine}° to the trunk line (180 = one straight line), pelvis level`);
set('Bar position', 'setup', `Overhand, ${GW} cm grip (handle centres), bar against the thighs`); set('Bar position', 'peak', `Bar ${r1(bb.c[1])} cm up by the standing shin at the bottom; body + bar centre of mass within ${comOff} cm of the right mid-foot`);
set('Tempo', 'setup', `Balance ${ph.setup[1]} s`); set('Tempo', 'peak', `${r1(ph.lower[1] - ph.lower[0])} s down, ${r1(ph.bottom[1] - ph.bottom[0])} s pause, ${r1(ph.rise[1] - ph.rise[0])} s up, ${r1(D - ph.rise[1])} s reset`);
console.log(`Barbell Single Leg Deadlift: wrote ${L.write(ex)}\n  hip ${poses.h0.ch.hip_r.flex}->${poses[`h${N}`].ch.hip_r.flex}, knee ${r1(B.kneeOf(Wb, 'r'))}, trunk ${r1(90 - B.trunkLean(Wb))} above level, leg line ${legLine}, foot up ${footUp}, bar ${bb.c.map(r1)}, com off ${comOff}\n  sweep ${JSON.stringify(sw)} gripErr ${state.err.toFixed(2)}`);
if (sw.widthRange > 1.0 || state.err > 0.5) { console.error('FAIL: hands do not stay on the bar at a constant grip width'); process.exitCode = 1; }
if (sw.barFloor < 0 || sw.barBody < 0) { console.error('FAIL: plates through the floor or bar through the body'); process.exitCode = 1; }
if (sw.slide > 0.05 || sw.drift > 0.05) { console.error('FAIL: planted foot moves'); process.exitCode = 1; }
if (footUp < 0.5) { console.error('FAIL: free foot touches the floor'); process.exitCode = 1; }
