// Hyperextension (GymVisual #048913; page not readable here, movement from the name and standard coaching): 45-degree
// back extension bench (gear pack hyperextension_bench, angle 45). Soles on the foot plate under the heel roller (planted
// leg contacts with the foot plate orientation from gear-benches.hyperFeet), legs straight, the fronts of the thighs on
// the hip pad with its top edge just below the hip crease, fingertips behind the head, elbows wide. From the body in one
// line the trunk hinges down at the hips (with some rounding of the lower back) until it points nearly straight down,
// then rises back to the line and no further (no arching past neutral). The hip joints stay put over the pad: each key
// turns the pelvis about them and the legs keep their place. The pad is fitted to the body (surface on the thighs, top
// edge HIPGAP cm below the hip joints along the leg line), so its params come out of this script. Bilateral.
const L = require('./lib');
const { R, V, Q, r1, clone } = L;
const H = require('./families/hips');
const CB = require('./families/core-b');
const GB = require('./families/gear-benches');
const meta = require('./meta/hyperextension.json');

const ENV = (k, d) => +(process.env[k] ?? d);
const ANGLE = ENV('ANGLE', 45), STANCE = ENV('STANCE', 11), KNEE = ENV('KNEE', 4), HIPGAP = ENV('HIPGAP', 16);
// first pass: a bench with default pad; the feet only depend on the foot plate (footH, angle)
const hb0 = GB.hyperBench({ x: 0, params: { angle: ANGLE } });
const feet = GB.hyperFeet(hb0, { stance: STANCE });
const contacts = feet.contacts, d = hb0.points.legDir, n = hb0.points.legNormal, e = hb0.points.elevation;
const z0 = () => ({ rot: 0, flex: 0, latFlex: 0 });
const P0 = e - 90; // root pitch with the body along the leg line, front toward the pad
const trunk0 = { spine_l5: z0(), spine_t12: z0(), spine_t6: { rot: 0, flex: 2, latFlex: 0 }, neck_c7: { rot: 0, flex: ENV('NECK', 6) }, head_c1: { rot: 0, flex: ENV('HEAD', 4) } };
let base = { root: { pos: [0, 100, 0], rot: { pitch: P0 } }, ch: Object.assign(clone(trunk0), { sc_r: { protract: 0, elevate: 2 }, sc_l: { protract: 0, elevate: 2 },
  hip_r: { flex: 0, abd: 2, rot: 0 }, hip_l: { flex: 0, abd: 2, rot: 0 }, knee_r: { flex: KNEE }, knee_l: { flex: KNEE }, ankle_r: { dorsi: 0 }, ankle_l: { dorsi: 0 },
  shoulder_r: { plane: 0, elev: 10, axial: 0 }, shoulder_l: { plane: 0, elev: 10, axial: 0 }, elbow_r: { flex: 10 }, elbow_l: { flex: 10 }, wrist_r: { pron: 0, flex: 0, dev: 0 }, wrist_l: { pron: 0, flex: 0, dev: 0 } }) };
// root so that the free legs (channels only) put the ankles on the targets; hip abduction matches the stance
base = L.solvePose(base, ['root.pos.0', 'root.pos.1', 'ch.hip_r.abd', 'ch.hip_l.abd'], [
  L.obj.at('ankle_r', feet.targets.r, 3), L.obj.at('ankle_l', feet.targets.l, 3),
]).pose;
// arms: fingertips behind the head, elbows wide (core-b cradle), solved once on the base trunk; spine_t6, the neck and the
// shoulder girdle stay fixed through the rep, so the hands keep their place on the head
base = CB.cradle(base, { floor: -999, elbowAnt: -4, elbowOut: 22 }); delete base.__cost;
const ARM = { r: CB.armOf(base, 'r'), l: CB.armOf(base, 'l') };
base.ik = { leg_r: { target: feet.targets.r, weight: 1 }, leg_l: { target: feet.targets.l, weight: 1 } };
const Wb = L.fk(base, contacts), HIP = Wb.hip_r.p.slice(), HIPL = Wb.hip_l.p.slice();

// fit the pad to the body: surface on the fronts of the thighs (quads), top edge HIPGAP below the hip joints
const F = hb0.points.F, alongHip = V.dot(V.sub(HIP, F), d);
const FRONT = -Math.min(...['quad_r', 'quad_l', 'thigh_r', 'thigh_l'].map((id) => GB.shapePlane(Wb, id, { o: F, n }))); // deepest thigh point below the line through F
const hb = GB.hyperBench({ x: 0, params: { angle: ANGLE, padDist: r1(alongHip - HIPGAP), padDrop: r1(FRONT - ENV('SINK', 0.2)) } });

// key poses: hip flexion h and lumbar rounding; pelvis turns about the hip joints, legs stay
function key(h, spine) {
  const q = clone(base);
  Object.assign(q.ch, { spine_l5: { rot: 0, flex: spine[0], latFlex: 0 }, spine_t12: { rot: 0, flex: spine[1], latFlex: 0 } });
  q.root.rot.pitch = r1(P0 - h);
  q.ch.hip_r.flex = r1(base.ch.hip_r.flex + h); q.ch.hip_l.flex = r1(base.ch.hip_l.flex + h);
  let s = L.solvePose(q, ['root.pos.0', 'root.pos.1'], [L.obj.at('hip_r', HIP, 3)]).pose;
  for (const sd of ['r', 'l']) { s = H.fitLeg(s, sd, contacts.find((c) => c.id === `leg_${sd}`), feet.targets[sd], { abd: base.ch[`hip_${sd}`].abd, rot: 0, handRot: feet.footRot }); }
  for (const sd of ['r', 'l']) { const a = ARM[sd]; s.ch[`shoulder_${sd}`] = clone(a.shoulder); s.ch[`elbow_${sd}`] = clone(a.elbow); s.ch[`wrist_${sd}`] = clone(a.wrist); s.ch[`sc_${sd}`] = clone(a.sc); }
  return s;
}
const HMAX = ENV('HMAX', 84), SP = [ENV('L5', 10), ENV('T12', 10)];
const KEYS = { top: [0, [0, 0]], d1: [HMAX * 0.3, [SP[0] * 0.2, SP[1] * 0.2]], d2: [HMAX * 0.6, [SP[0] * 0.55, SP[1] * 0.55]], d3: [HMAX * 0.85, [SP[0] * 0.85, SP[1] * 0.85]], bottom: [HMAX, SP], bottomHold: [HMAX - 1, SP] };
const poses = {}; for (const [k, [h, sp]] of Object.entries(KEYS)) poses[k] = key(h, sp);
const keyframes = [{ t: 0, pose: 'top' }, { t: 0.6, pose: 'top' }, { t: 1.2, pose: 'd1' }, { t: 1.75, pose: 'd2' }, { t: 2.2, pose: 'd3' }, { t: 2.6, pose: 'bottom' }, { t: 2.9, pose: 'bottomHold' },
  { t: 3.3, pose: 'd3' }, { t: 3.75, pose: 'd2' }, { t: 4.2, pose: 'd1' }, { t: 4.7, pose: 'top' }, { t: 5.4, pose: 'top' }];
const ex = H.module_(meta, contacts, poses, keyframes);
ex.props = [hb.prop];

// checks: planted feet, floor, hip joints still, thighs on the pad, the rest of the body clear of the bench
const pr = { body: { d: 1e9 }, thigh: [1e9, -1e9], hipDrift: 0, head: 1e9 };
const pad = hb.surfaces.pad;
const rep = H.loopReport(ex, { planted: ['leg_r', 'leg_l'], probe: (W, pz, t) => {
  const b = GB.bodyClear(W, hb, { skip: /^(foot_|toe|calf_|shank_|quad_|thigh_|hand_|thumb_)/ }); if (b.d < pr.body.d) pr.body = Object.assign(b, { t: +t.toFixed(2) });
  const th = Math.min(...['quad_r', 'quad_l'].map((id) => GB.shapePlane(W, id, pad))); pr.thigh = [Math.min(pr.thigh[0], th), Math.max(pr.thigh[1], th)];
  pr.hipDrift = Math.max(pr.hipDrift, V.len(V.sub(W.hip_r.p, HIP)));
  pr.head = Math.min(pr.head, L.shapeMinY(W).y);
} });
const lowLeg = GB.bodyClear(L.fk(poses.top, contacts), hb, { skip: /^(?!foot_|calf_|shank_)/ });
const Wt = L.fk(poses.top, contacts), Wbot = L.fk(poses.bottom, contacts);
const trunkFromLeg = (W) => V.angle(V.sub(W.neck_c7.p, W.pelvis.p), d);
const set = H.setKin(ex), dg = (v) => `≈${Math.round(v)}°`;
set('Hip flexion', 'setup', `${dg(poses.top.ch.hip_r.flex)} (body in one line along the ${ANGLE}° bench)`); set('Hip flexion', 'peak', `${dg(poses.bottom.ch.hip_r.flex)} at the bottom`);
set('Lumbar flexion', 'setup', '0° (neutral, no arching past the line)'); set('Lumbar flexion', 'peak', `${dg(SP[0] + SP[1])} (L5 and T12 segments) at the bottom`);
set('Trunk to the leg line', 'setup', `${dg(trunkFromLeg(Wt))}`); set('Trunk to the leg line', 'peak', `${dg(trunkFromLeg(Wbot))} (trunk ${dg(V.angle(V.sub(Wbot.neck_c7.p, Wbot.pelvis.p), [0, -1, 0]))} from straight down)`);
set('Hip pad', 'setup', `Pad top edge ${HIPGAP} cm below the hip joints along the leg line (${r1(hb.prop.params.padDist)} cm from the foot plate); thighs on the pad`);
set('Hip pad', 'peak', `Hip joints move ≤${r1(pr.hipDrift)} cm; thigh-to-pad gap ${r1(pr.thigh[0])} to ${r1(pr.thigh[1])} cm`);
set('Tempo', 'setup', 'Body in line 0.6 s'); set('Tempo', 'peak', '2.0 s down, 0.3 s pause, 1.8 s up, 0.7 s in line');
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(HMAX - 3), max: Math.ceil(HMAX + 3) };
console.log(`Hyperextension: wrote ${L.write(ex)}\n  ${JSON.stringify({ params: hb.prop.params, hip: HIP.map(r1), hipDrift: r1(pr.hipDrift), thigh: pr.thigh.map(r1), body: pr.body, lowLeg, lowest: r1(pr.head), slide: rep.slide, knee: rep.kneeR, hipFlex: rep.hipFlexR, trunkLeg: [r1(trunkFromLeg(Wt)), r1(trunkFromLeg(Wbot))] })}`);
const fails = [];
if (rep.slide > 0.05) fails.push('planted feet slide');
if (pr.head < 1) fails.push(`head near the floor (${r1(pr.head)})`);
if (pr.body.d < -1.5) fails.push(`body into the bench ${JSON.stringify(pr.body)}`);
if (pr.thigh[0] < -1.2 || pr.thigh[1] > 1.5) fails.push(`thighs off the pad ${pr.thigh.map(r1)}`);
if (pr.hipDrift > 1.0) fails.push('hips move');
if (fails.length) { console.error(`FAIL hyperextension: ${fails.join('; ')}`); process.exitCode = 1; }
module.exports = { ex };
