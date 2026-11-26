// 123 Back Drill (GymVisual #598413): three-cone triangle, facing forward the whole lap.
// Cone 1 (apex) at the back, cone 3 front-right, cone 2 front-left (anticlockwise order, Physitrack).
// Sprint 1 -> 3, lateral shuffle 3 -> 2, diagonal backpedal 2 -> 1, back into the start stance (seamless loop).
// Footwork is authored as a footstep table: each foot strike is a leg contact with weight 1 and a constant
// target while planted; between strikes the weight drops to 0 and the swing leg is posed by FK solves.
const L = require('./lib');
const { R, V, Q, rig, r1, clone, obj, solvePose, legContact } = L;
const meta = require('./meta/one-two-three-back-drill.json');

/* ---------------- layout (from the cone props, 40% scale of the 5 yd triangle) ---------------- */
const cone = (id) => meta.props.find((p) => p.id === id).center;
const C1 = cone('cone1'), C2 = cone('cone2'), C3 = cone('cone3');
const xz = (x, z) => [x, z];
const P1 = xz(C1[0] + 26, C1[2]);          // start: cone 1 just behind the heels
const P3 = xz(C3[0] - 28, C3[2] - 34);     // arrive with cone 3 ahead and outside the right foot
const P2 = xz(C2[0] - 28, C2[2] + 34);     // mirror of P3 at cone 2
const D = meta.timeline.duration;

/* ---------------- pelvis track ---------------- */
const ease = (s) => (s <= 0 ? 0 : s >= 1 ? 1 : (1 - Math.cos(Math.PI * s)) / 2);
// Shuffle: near-constant speed with short ease in/out (steady side-steps).
const easeFlat = (s, a = 0.18) => { if (s <= 0) return 0; if (s >= 1) return 1; const v = 1 / (1 - a); if (s < a) return (v / (2 * a)) * s * s; if (s > 1 - a) return 1 - (v / (2 * a)) * (1 - s) * (1 - s); return v * (s - a / 2); };
const SEG = [
  { t0: 0.25, t1: 1.5, from: P1, to: P3, e: ease },        // sprint 1 -> 3
  { t0: 1.66, t1: 2.98, from: P3, to: P2, e: easeFlat },   // shuffle 3 -> 2
  { t0: 3.12, t1: 4.3, from: P2, to: P1, e: (x) => easeFlat(x, 0.25) },   // backpedal 2 -> 1
];
function pelvisXZ(t) {
  let p = P1;
  for (const s of SEG) {
    if (t < s.t0) return p;
    const k = s.e((t - s.t0) / (s.t1 - s.t0));
    p = [s.from[0] + (s.to[0] - s.from[0]) * k, s.from[1] + (s.to[1] - s.from[1]) * k];
    if (t <= s.t1) return p;
  }
  return p;
}
const track = (pts) => R.makeTrack(pts.map((p) => p[0]), pts.map((p) => p[1]));
// Pelvis height (cm): athletic stance 84 (standing is 90.1); sink on every plant.
const yBase = track([[0, 84], [0.25, 83.5], [0.6, 82], [1.1, 81.5], [1.45, 76], [1.62, 75.5], [1.85, 77.5], [2.8, 77.5], [3.0, 77], [3.14, 77.5], [3.4, 79.5], [4.05, 79.5], [4.35, 82.5], [4.6, 84], [D, 84]]);
// Trunk lean (root pitch, - = forward): drive leans in, brake sits back, shuffle and backpedal stay a bit forward.
const pitchT = track([[0, -10], [0.25, -11], [0.55, -28], [0.95, -25], [1.25, -12], [1.5, -7], [1.66, -9], [1.9, -13], [2.8, -13], [3.0, -8], [3.15, -9], [3.4, -12], [4.1, -12], [4.45, -10], [D, -10]]);
// Side lean (root roll, + = toward the figure's right): into each new direction of travel.
const rollT = track([[0, 0], [0.25, 0], [0.6, 3], [1.2, 2], [1.5, -3], [1.66, -4], [1.9, -3], [2.8, -3], [3.0, 2], [3.14, 3], [3.4, 2], [4.1, 1.5], [4.45, 0], [D, 0]]);
// Arm-swing amplitude per segment: full pump in the sprint, smaller in the backpedal, ready position in the shuffle.
const armAmp = track([[0, 0.1], [0.25, 0.3], [0.5, 1], [1.2, 0.9], [1.5, 0.35], [1.7, 0.25], [2.9, 0.25], [3.15, 0.4], [3.4, 0.7], [4.2, 0.6], [4.45, 0.15], [D, 0.1]]);

/* ---------------- footstep table ---------------- */
// Each strike: foot, tOn (touchdown), tOff (toe-off), xz position. Times in s.
const W0 = 14;                               // half stance width in the start stance
const at = (t, dz, dx = 0) => { const p = pelvisXZ(t); return [r1(p[0] + dx), r1(p[1] + dz)]; };
const START = { r: [r1(P1[0]), r1(P1[1] + W0)], l: [r1(P1[0]), r1(P1[1] - W0)] };
const steps = [
  // start stance (also the end of the previous lap)
  { f: 'r', on: 0, off: 0.3, pos: START.r }, { f: 'l', on: 0, off: 0.54, pos: START.l },
  // sprint 1 -> 3: short, quick steps, right foot first; each foot lands about under the hips (mid-stance point)
  { f: 'r', on: 0.5, off: 0.69, pos: at(0.58, 11) },
  { f: 'l', on: 0.73, off: 0.91, pos: at(0.81, -11) },
  { f: 'r', on: 0.95, off: 1.13, pos: at(1.03, 11) },
  // penultimate braking step (left) lands on the left stance spot ahead of the body; final plant (right) outside
  { f: 'l', on: 1.17, off: 1.74, pos: [r1(P3[0] + 2), r1(P3[1] - 15)] },
  { f: 'r', on: 1.4, off: 1.66, pos: [r1(P3[0] + 4), r1(P3[1] + 17)] },
];
// shuffle 3 -> 2: lead (left) foot steps out, trail (right) foot follows; feet never cross.
const SH = { t0: 1.66, t1: 2.98, n: 5 };
{
  const { t0, t1, n } = SH, cyc = (t1 - t0) / n;
  const zL0 = P3[1] - 15, zR0 = P3[1] + 17, zL1 = P2[1] - 17, zR1 = P2[1] + 15;
  let lastL = steps[5], lastR = steps[6];
  for (let k = 1; k <= n; k++) {
    const tk = t0 + cyc * (k - 1), last = k === n;
    lastL.off = +tk.toFixed(3);
    lastL = { f: 'l', on: +(tk + cyc * 0.4).toFixed(3), pos: [r1(last ? P2[0] + 4 : P2[0]), r1(zL0 + ((zL1 - zL0) * k) / n)] };
    lastR.off = +(tk + cyc * 0.5).toFixed(3);
    lastR = { f: 'r', on: +(tk + cyc * 0.9).toFixed(3), pos: [r1(P2[0]), r1(zR0 + ((zR1 - zR0) * k) / n)] };
    steps.push(lastL, lastR);
  }
  // end of the shuffle: the right (inside) foot lifts first for the backpedal; the left (outside) foot brakes and pushes off
  lastR.off = 3.14; lastL.off = 3.33;
}
// backpedal 2 -> 1: six short, quick steps, right foot first; the last two close into the start stance.
{
  const ons = [3.3, 3.5, 3.7, 3.9, 4.1, 4.3], feet = ['r', 'l', 'r', 'l', 'r', 'l'];
  const bp = ons.map((on, i) => ({ f: feet[i], on, off: null, pos: i === 4 ? START.r : i === 5 ? START.l : at(on + 0.06, feet[i] === 'r' ? 12 : -12) }));
  bp.forEach((s, i) => { s.off = i < 4 ? +(ons[i + 1] + 0.01).toFixed(3) : D; });
  steps.push(...bp);
}
const byFoot = { r: steps.filter((s) => s.f === 'r').sort((a, b) => a.on - b.on), l: steps.filter((s) => s.f === 'l').sort((a, b) => a.on - b.on) };
const RAMP = 0.04;
const rampOf = (a, b) => Math.min(RAMP, 0.22 * (b - a));

/* ---------------- swing styles ---------------- */
// lift: peak ankle rise (cm); pitch(s): foot pitch in deg (- = toes down) through the swing.
const early = (s) => 6.75 * s * (1 - s) ** 2, late = (s) => 6.75 * s * s * (1 - s), bump = (s) => 4 * s * (1 - s);
function swingStyle(t) {
  if (t < 1.55) return { lift: 17, pitch: (s) => -FOOT_PITCH - 30 * early(s) + 10 * late(s) };    // sprint: toe-off, then heel kick and foot recovery
  if (t < 3.05) return { lift: 6, pitch: (s) => -FOOT_PITCH - 8 * bump(s) };                      // shuffle: low, on the balls of the feet
  return { lift: 9, pitch: (s) => -FOOT_PITCH - 16 * early(s) - 10 * late(s) };                   // backpedal: reach back on the toes
}

/* ---------------- base pose ---------------- */
// Stance on the balls of the feet: the planted foot is world-locked with the heel just off the floor
// (toes along +X, pitched FOOT_PITCH deg toes-down). Module-level contact data; legContact() is otherwise unchanged.
const FOOT_PITCH = 15;
const footQ = Q.axis([0, 0, 1], -FOOT_PITCH);
const contacts = ['r', 'l'].map((f) => Object.assign(legContact(f), { handRot: footQ.map((v) => +v.toFixed(6)) }));
const TOE = rig.byId.toe_r.offset;
// Ankle height that puts the lowest point of the pitched foot on the floor.
const STANCE_H = (() => { const fs = rig.shapes.find((x) => x.id === 'foot_r'), c = Q.rot(footQ, fs.c), ax = Q.rot(footQ, [fs.r[0], 0, 0]), ay = Q.rot(footQ, [0, fs.r[1], 0]); return r1(-(c[1] - Math.hypot(ax[1], ay[1])) + 0.2); })();
function legSolve(pose, f, ankle, pitch, guess, planted) {
  const paths = [`ch.hip_${f}.flex`, `ch.hip_${f}.abd`, `ch.hip_${f}.rot`, `ch.knee_${f}.flex`, `ch.ankle_${f}.dorsi`];
  const p = clone(pose);
  if (guess) { p.ch[`hip_${f}`] = clone(guess.hip); p.ch[`knee_${f}`] = clone(guess.knee); p.ch[`ankle_${f}`] = clone(guess.ankle); }
  const qd = Q.axis([0, 0, 1], pitch);
  const toe = V.add(ankle, Q.rot(qd, TOE));
  const objs = [
    obj.at(`ankle_${f}`, ankle, planted ? 6 : 3),
    obj.at(`toe_${f}`, toe, planted ? 4 : 1.5),
    (W) => V.sub(Q.rot(W[`ankle_${f}`].q, [0, 0, 1]), Q.rot(qd, [0, 0, 1])).map((v) => v * (planted ? 6 : 1)),
    obj.reg(`ch.hip_${f}.abd`, 4, 0.03), obj.reg(`ch.hip_${f}.rot`, 0, 0.03),
    (W, q) => [Math.min(0, q.ch[`knee_${f}`].flex - 4) * 2, Math.max(0, q.ch[`ankle_${f}`].dorsi - 23) * 2, Math.min(0, q.ch[`ankle_${f}`].dorsi + 70) * 2],
  ];
  if (planted) { // match the IK knee so blending between FK and IK at toe-off/touchdown has no knee pop
    const tmp = clone(pose); tmp.ik = { [`leg_${f}`]: { target: ankle, weight: 1 } };
    const kIK = R.evalPose(rig, tmp, contacts.filter((c) => c.id === `leg_${f}`))[`knee_${f}`].p;
    objs.push(obj.at(`knee_${f}`, kIK, 4));
  }
  if (!planted) { // knee in the same plane the IK pole uses (hip, ankle, pole), so the knee does not swap planes at the ramps
    const pole = contacts.find((c) => c.id === `leg_${f}`).pole;
    objs.push((W) => { const hip = W[`hip_${f}`].p, n = V.norm(V.cross(V.sub(ankle, hip), pole)); return [V.dot(V.sub(W[`knee_${f}`].p, hip), n) * 3]; });
  }
  if (!planted) objs.push((W) => { let m = 1e9; for (const s of rig.shapes) if (s.side === f && (s.base === 'foot' || s.base === 'shank' || s.base === 'calf')) { const g = R.shapeWorld(W, s); const y = g.kind === 'capsule' ? Math.min(g.a[1] - g.r[0], g.b[1] - g.r[1]) : g.c[1] - Math.hypot(g.axes[0][1], g.axes[1][1], g.axes[2][1]); m = Math.min(m, y); } return [Math.min(0, m - 0.6) * 12]; });
  const s = solvePose(p, paths, objs, { iters: 250 });
  return { pose: s.pose, sol: { hip: clone(s.pose.ch[`hip_${f}`]), knee: clone(s.pose.ch[`knee_${f}`]), ankle: clone(s.pose.ch[`ankle_${f}`]) } };
}

// Arm states for the right arm (the left arm uses the same channel values; the rig mirrors them). ISB plane and axial
// move together (axial ~ -plane) so the forearm keeps pointing forward while the upper arm swings front to back;
// the elbow stays beside the trunk (plane limit -60 caps how far it can travel behind). Checked with FK probes:
// fwd puts the wrist about 35 cm ahead at shoulder height, back drives the elbow about 18 cm behind the shoulder.
const ARM = {
  fwd: { sh: { plane: 88, elev: 42, axial: -80 }, el: 96 },
  mid: { sh: { plane: 30, elev: 8, axial: -28 }, el: 85 },
  back: { sh: { plane: -58, elev: 44, axial: 50 }, el: 72 },
};
const lerp = (a, b, k) => a + (b - a) * k;
function armAt(a) { // a in [-1, 1]: +1 forward, -1 back
  const A = a >= 0 ? ARM.mid : ARM.back, B = a >= 0 ? ARM.fwd : ARM.mid, k = a >= 0 ? a : a + 1;
  return { sh: { plane: r1(lerp(A.sh.plane, B.sh.plane, k)), elev: r1(lerp(A.sh.elev, B.sh.elev, k)), axial: r1(lerp(A.sh.axial, B.sh.axial, k)) }, el: { flex: r1(lerp(A.el, B.el, k)) } };
}

/* ---------------- key times ---------------- */
const times = new Set([0, D]);
const add = (t) => { if (t >= 0 && t <= D) times.add(+t.toFixed(3)); };
for (const f of ['r', 'l']) {
  const st = byFoot[f];
  for (let i = 0; i < st.length; i++) {
    const s = st[i];
    add(s.on); add(s.off);
    const nx = st[i + 1];
    if (nx) { const rp = rampOf(s.off, nx.on); add(s.off + rp); add(nx.on - rp); const a = s.off + rp, b = nx.on - rp; for (const k of (b - a > 0.12 ? [0.3, 0.55, 0.8] : [0.5])) add(a + (b - a) * k); }
    if (s.off - s.on > 0.3) for (let t = s.on + 0.12; t < s.off - 0.08; t += 0.12) add(t);
  }
}
[0.25, 1.15, 1.5, 1.62, 3.0, 3.14, 4.42, 4.6].forEach(add);
// Foot events (touchdown/toe-off) are always keys; other samples closer than 12 ms to a kept key are dropped.
const EVENTS = new Set(steps.flatMap((s) => [s.on, s.off]).map((t) => +t.toFixed(3)).concat([0, D]));
const T = [...EVENTS].sort((a, b) => a - b);
for (const t of [...times].sort((a, b) => a - b)) if (!EVENTS.has(t) && T.every((k) => Math.abs(k - t) > 0.012)) T.push(t);
T.sort((a, b) => a - b);

/* ---------------- planned foot path (before solving) ---------------- */
const liftCurve = (x) => Math.sin(Math.PI * x) ** 1.4;   // stays low near toe-off and touchdown
function plannedAnkle(f, t) {
  const s = footState(f, t);
  if (s.planted) return { s, ankle: [s.pos[0], STANCE_H, s.pos[1]], pitch: -FOOT_PITCH };
  const k = ease(s.s), st = swingStyle(s.tOff);
  return { s, ankle: [lerp(s.from[0], s.to[0], k), STANCE_H + st.lift * liftCurve(s.s), lerp(s.from[1], s.to[1], k)], pitch: st.pitch(s.s) };
}
// Arm phase: + = right arm forward (left leg forward), smoothed over +-60 ms so the arms swing rather than snap.
const rawArm = (t) => Math.max(-1, Math.min(1, ((plannedAnkle('l', t).ankle[0] - plannedAnkle('r', t).ankle[0]) / 26) * armAmp(t)));
function armPhase(t) { let sum = 0, wsum = 0; for (let d = -0.06; d <= 0.0601; d += 0.01) { const w = Math.exp(-((d / 0.035) ** 2)); sum += rawArm(Math.max(0, Math.min(D, t + d))) * w; wsum += w; } return sum / wsum; }

/* ---------------- solve every key ---------------- */
function footState(f, t) {
  const st = byFoot[f];
  for (let i = 0; i < st.length; i++) {
    const s = st[i];
    if (t >= s.on - 1e-6 && t <= s.off + 1e-6) return { planted: true, pos: s.pos, w: 1 };
    const nx = st[i + 1];
    if (nx && t > s.off && t < nx.on) {
      const sw = (t - s.off) / (nx.on - s.off), rp = rampOf(s.off, nx.on);
      const w = t < s.off + rp ? 1 - (t - s.off) / rp : t > nx.on - rp ? 1 - (nx.on - t) / rp : 0;
      return { planted: false, from: s.pos, to: nx.pos, s: sw, w: +Math.max(0, Math.min(1, w)).toFixed(3), tOff: s.off };
    }
  }
  throw new Error(`no foot state for ${f} at ${t}`);
}
const poses = {}, keyframes = [], report = [];
let prevSol = { r: null, l: null };
const hipLen = V.len(rig.byId.knee_r.offset) + V.len(rig.byId.ankle_r.offset);
let minMargin = { v: 1e9 };
T.forEach((t, idx) => {
  const [x, z] = pelvisXZ(t);
  let y = yBase(t);
  const fs = { r: footState('r', t), l: footState('l', t) };
  // small vertical bob while a foot is in the air
  for (const f of ['r', 'l']) if (!fs[f].planted) y += (t < 1.55 ? 1.6 : t < 3.05 ? 0.8 : 1.0) * Math.sin(Math.PI * fs[f].s);
  const pitch = pitchT(t), roll = rollT(t);
  const pose = {
    root: { pos: [r1(x), r1(y), r1(z)], rot: { pitch: r1(pitch), roll: r1(roll) } },
    ch: {
      spine_l5: { rot: 0, flex: 0, latFlex: r1(-roll * 0.4) }, spine_t12: { rot: 0, flex: 2, latFlex: r1(-roll * 0.3) }, spine_t6: { rot: 0, flex: 0, latFlex: 0 },
      neck_c7: { rot: 0, flex: r1(pitch * 0.35) }, head_c1: { rot: 0, flex: r1(pitch * 0.4) },
      sc_r: { protract: 0, elevate: 0 }, sc_l: { protract: 0, elevate: 0 },
      wrist_r: { pron: 0, flex: 0, dev: 0 }, wrist_l: { pron: 0, flex: 0, dev: 0 },
    },
    ik: {},
  };
  let p = pose;
  for (const f of ['r', 'l']) {
    const s = fs[f], { ankle, pitch: pt } = plannedAnkle(f, t);
    const r = legSolve(p, f, ankle, pt, prevSol[f], s.planted);
    p = r.pose; prevSol[f] = r.sol;
    const tgt = s.planted ? s.pos : (s.s < 0.5 ? s.from : s.to);
    p.ik[`leg_${f}`] = { target: [r1(tgt[0]), STANCE_H, r1(tgt[1])], weight: s.planted ? 1 : s.w };
    if (s.planted) {
      const hip = L.fk(p)[`hip_${f}`].p, d = V.len(V.sub(hip, ankle)), m = hipLen - d;
      if (m < minMargin.v) minMargin = { v: +m.toFixed(1), t, f };
    }
  }
  // arms: opposite arm to the forward leg, scaled by segment
  const a = armPhase(t);
  const ar = armAt(a), al = armAt(-a);
  p.ch.shoulder_r = ar.sh; p.ch.elbow_r = ar.el; p.ch.shoulder_l = al.sh; p.ch.elbow_l = al.el;
  const name = `k${String(idx).padStart(3, '0')}`;
  poses[name] = p;
  keyframes.push({ t: +t.toFixed(3), pose: name });
});
// Loop seam: the last key is the first pose, so the lap ends exactly where it starts.
keyframes[keyframes.length - 1].pose = keyframes[0].pose;
delete poses[`k${String(T.length - 1).padStart(3, '0')}`];

const ex = {
  schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props: meta.props, contacts,
  timeline: meta.timeline, poses, keyframes, activation: meta.activation, guides: meta.guides, checks: meta.checks,
};

/* ---------------- report + kinematics ---------------- */
const tl = R.buildTimeline(ex);
let dorsiMax = { v: -1e9 }, dorsiMin = { v: 1e9 }, kneeMax = { v: 0 }, kneeStance = { v: 0 }, hipMax = 0, travel = 0, floor = { y: 1e9 }, slide = 0, leanMax = 0;
const W0p = R.evalPose(rig, tl.pose(0), contacts).pelvis.p;
for (let i = 0; i <= 2000; i++) {
  const t = (i / 2000) * D, ps = tl.pose(t), W = R.evalPose(rig, ps, contacts);
  for (const f of ['r', 'l']) {
    const kf = 180 - V.angle(V.sub(W[`hip_${f}`].p, W[`knee_${f}`].p), V.sub(W[`ankle_${f}`].p, W[`knee_${f}`].p));
    if (kf > kneeMax.v) kneeMax = { v: kf, t, f };
    if ((ps.ik[`leg_${f}`].weight ?? 1) >= 0.999 && kf > kneeStance.v) kneeStance = { v: kf, t, f };
    const lq = Q.mul(Q.conj(W[`knee_${f}`].q), W[`ankle_${f}`].q), dz = (2 * Math.atan2(lq[3], lq[0])) / R.DEG;
    if (dz > dorsiMax.v) dorsiMax = { v: dz, t, f }; if (dz < dorsiMin.v) dorsiMin = { v: dz, t, f };
    const k = ps.ik[`leg_${f}`]; if (k.weight >= 0.999) slide = Math.max(slide, V.len(V.sub(W[`ankle_${f}`].p, k.target)));
  }
  travel = Math.max(travel, V.len(V.sub(W.pelvis.p, W0p)));
  leanMax = Math.max(leanMax, V.angle(V.sub(W.neck_c7.p, W.pelvis.p), [0, 1, 0]));
  const fm = L.shapeMinY(W); if (fm.y < floor.y) floor = { y: fm.y, id: fm.id, t };
}
const kin = ex.exercise.kinematics, LEG = (a, b) => Math.round(Math.hypot(a[0] - b[0], a[1] - b[1]));
const set = (m, peak, setup) => { const k = kin.find((x) => x.measure.startsWith(m)); if (!k) return; k.peak = peak; if (setup) k.setup = setup; };
const Ws = R.evalPose(rig, tl.pose(0), contacts), kneeOf = (W, f) => 180 - V.angle(V.sub(W[`hip_${f}`].p, W[`knee_${f}`].p), V.sub(W[`ankle_${f}`].p, W[`knee_${f}`].p));
const kneeSetup = `≈${Math.round(kneeOf(Ws, 'r'))}° (athletic stance)`;
set('Knee flexion, stance', `≈${Math.round(kneeStance.v)}° (braking plant at cone 3)`, kneeSetup);
set('Knee flexion, swing', `≈${Math.round(kneeMax.v)}° (sprint steps)`, kneeSetup);
set('Trunk lean', `≈${Math.round(leanMax)}° forward (sprint drive)`, `≈${Math.round(V.angle(V.sub(Ws.neck_c7.p, Ws.pelvis.p), [0, 1, 0]))}° forward (athletic stance)`);
set('Cone layout', `Pelvis path: sprint ${LEG(P1, P3)} cm, shuffle ${LEG(P3, P2)} cm, backpedal ${LEG(P2, P1)} cm`);
console.log(`123 Back Drill: ${T.length} keys, D=${D}s, wrote ${L.write(ex)}`);
console.log(`  pelvis path: P1 ${P1} P3 ${P3} P2 ${P2}; sprint ${LEG(P1, P3)} cm, shuffle ${LEG(P3, P2)} cm, backpedal ${LEG(P2, P1)} cm`);
console.log(`  steps r: ${byFoot.r.map((s) => `${s.on}-${s.off}@${s.pos}`).join('  ')}`);
console.log(`  steps l: ${byFoot.l.map((s) => `${s.on}-${s.off}@${s.pos}`).join('  ')}`);
console.log(`  min leg reach margin on planted keys ${minMargin.v} cm (t=${minMargin.t}, ${minMargin.f})`);
console.log(`  knee max ${kneeMax.v.toFixed(1)} (t=${kneeMax.t.toFixed(2)} ${kneeMax.f}), stance knee max ${kneeStance.v.toFixed(1)} (t=${kneeStance.t.toFixed(2)} ${kneeStance.f}), trunk lean max ${leanMax.toFixed(1)}`);
console.log(`  effective ankle dorsi (IK applied) ${dorsiMin.v.toFixed(1)} (t=${dorsiMin.t.toFixed(2)} ${dorsiMin.f}) .. ${dorsiMax.v.toFixed(1)} (t=${dorsiMax.t.toFixed(2)} ${dorsiMax.f}); stance ankle height ${STANCE_H}`);
console.log(`  root travel max ${travel.toFixed(1)} cm, floor ${floor.y.toFixed(2)} (${floor.id} t=${floor.t.toFixed(2)}), planted slide ${slide.toFixed(3)} cm`);
