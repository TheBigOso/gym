// 3 Point Standing Hops (GymVisual #768012): small two-foot hops from a center spot to three points,
// center -> left -> center -> forward -> center -> right -> center, facing forward the whole time.
// About 30 cm per hop, 2 hops per second, arms bent in front of the chest, soft landings with a quick rebound.
// Two rounds per 6 s loop; the loop starts and ends at the bottom of a center landing, so it is seamless.
// Right side authored (the pattern goes left first); the left clip mirrors it (right first).
const L = require('./lib');
const { R, V, Q, rig, r1, clone } = L;
const meta = require('./meta/three-point-standing-hops.json');

/* ---------------- Layout (cm), from the floor markers in the meta file ---------------- */
const mark = (id) => meta.props.find((p) => p.id === id).center;
const MID_FOOT = 6;                                // markers sit between the feet at mid-foot, about 6 cm ahead of the ankles
const pt = (id) => V.sub(mark(id), [MID_FOOT, 0, 0]);
const PTS = { C: pt('markCenter'), L: pt('markLeft'), F: pt('markForward'), R: pt('markRight') }; // stance centers [x, 0, z]
const HOP = V.len(V.sub(PTS.F, PTS.C));            // 30 cm from center to each point
const HALF = rig.byId.hip_r.offset[2];             // feet hip-width: ankles under the hip joints (17.2 cm apart)
const FOOT_X = 0;                                  // ankle straight under the hip joint (fore-aft)
const ROUND = ['C', 'L', 'C', 'F', 'C', 'R'];
const SEQ = [...ROUND, ...ROUND, 'C'];             // two rounds, back to center
const PERIOD = 0.5;                                // one hop every 0.5 s (about 2 per second)

/* ---------------- Feet ---------------- */
const HEEL_UP = 5;                                 // planted: on the balls of the feet, heel just off the floor
const footQ = (pitch) => Q.mul(L.footRot(0), Q.axis([0, 0, 1], -pitch)); // pitch > 0 = heel up, toes down
const qArr = (q) => q.map((v) => +v.toFixed(6));
const contacts = ['r', 'l'].map((s) => Object.assign(L.legContact(s), { handRot: qArr(footQ(HEEL_UP)) }));
const footShape = (s) => rig.shapes.find((x) => x.id === `foot_${s}`);
// Lowest point of the foot ellipsoid (the part that touches the floor).
function footLow(W, s) {
  const g = R.shapeWorld(W, footShape(s));
  const k = Math.hypot(g.axes[0][1], g.axes[1][1], g.axes[2][1]);
  return g.axes.reduce((p, a) => V.sub(p, V.scale(a, a[1] / k)), g.c);
}
// Offset from the ankle joint to the lowest foot point for a world-locked foot pitch.
const lowOffset = (() => {
  const cache = {};
  return (pitch, s) => {
    const key = `${pitch}${s}`;
    if (!cache[key]) {
      const c = Object.assign(L.legContact(s), { handRot: footQ(pitch) });
      const st = L.POSES.standing().pose;
      st.ik = { [c.id]: { target: [0, 20, s === 'r' ? HALF : -HALF], weight: 1 } };
      const W = R.evalPose(rig, st, [c]);
      cache[key] = V.sub(footLow(W, s), W[`ankle_${s}`].p);
    }
    return cache[key];
  };
})();
// Ankle position that puts the lowest foot point at `low` = [x, y, z] for a given foot pitch.
const ankleFor = (pitch, s, low) => V.sub(low, lowOffset(pitch, s)).map(r1);
// The planted contact point (ball of the foot) for each side at a marker.
const ball = (P, s) => {
  const z = P[2] + (s === 'r' ? HALF : -HALF);
  return [r1(P[0] + FOOT_X + lowOffset(HEEL_UP, s)[0]), 0, r1(z)];
};

/* ---------------- Leg channels that reproduce a foot placement (so IK weight blends are seamless) ---------------- */
const LEG_PATHS = (s) => [`ch.hip_${s}.flex`, `ch.hip_${s}.abd`, `ch.hip_${s}.rot`, `ch.knee_${s}.flex`, `ch.ankle_${s}.dorsi`];
function fitLeg(pose, s, ankle, pitch) {
  const c = Object.assign(L.legContact(s), { handRot: footQ(pitch) });
  const q = clone(pose); q.ik = { [c.id]: { target: ankle, weight: 1 } };
  const Wi = R.evalPose(rig, q, [c]);
  const K = Wi[`knee_${s}`].p, A = Wi[`ankle_${s}`].p, T = Wi[`toe_${s}`].p;
  const res = L.solvePose(pose, LEG_PATHS(s), [L.obj.at(`knee_${s}`, K, 2), L.obj.at(`ankle_${s}`, A, 3), L.obj.at(`toe_${s}`, T, 2), L.obj.reg(`ch.hip_${s}.rot`, 0, 0.02)], { iters: 200 });
  return res.pose;
}
const legLen = (k) => { const a = V.len(rig.byId.knee_r.offset), b = V.len(rig.byId.ankle_r.offset); return Math.sqrt(a * a + b * b + 2 * a * b * Math.cos(k * R.DEG)); };
const kneeOf = (W, s) => 180 - V.angle(V.sub(W[`hip_${s}`].p, W[`knee_${s}`].p), V.sub(W[`ankle_${s}`].p, W[`knee_${s}`].p));

/* ---------------- Base pose: tall trunk, small forward lean, arms bent in front of the chest ---------------- */
const st = L.POSES.standing({ stance: HALF, toeOut: 0 });
const base = clone(st.pose);
Object.assign(base.ch, {
  spine_l5: { rot: 0, flex: 0, latFlex: 0 }, spine_t12: { rot: 0, flex: 0, latFlex: 0 }, spine_t6: { rot: 0, flex: 0, latFlex: 0 },
  sc_r: { protract: 6, elevate: 2 }, sc_l: { protract: 6, elevate: 2 },
});
const GAZE_DOWN = 8;
// Trunk: pelvis tipped forward by `pitch` (deg, negative = forward), lumbar extension takes back 40% of it,
// head and neck bring the eyes back to level.
function setTrunk(p, pitch) {
  p.root.rot = { pitch };
  const ext = r1(0.4 * pitch);                     // negative flex = extension
  p.ch.spine_l5 = { rot: 0, flex: ext, latFlex: 0 };
  // Eyes level and slightly down (about 8 degrees), looking ahead past the markers.
  const elev = (x) => { const q = clone(p); q.ch.neck_c7 = { rot: 0, flex: x * 0.4 }; q.ch.head_c1 = { rot: 0, flex: x * 0.6 }; const f = Q.rot(L.fk(q).head_c1.q, [1, 0, 0]); return Math.asin(f[1]) / R.DEG; };
  const x = R.solveLM([0], (v) => [elev(v[0]) + GAZE_DOWN]).x[0];
  p.ch.neck_c7 = { rot: 0, flex: r1(x * 0.4) };
  p.ch.head_c1 = { rot: 0, flex: r1(x * 0.6) };
  return p;
}
const ARM = { wrist: [29.5, -6.4, 17.1], elbow: [16, -16.2, 21.5], // rig v2: same arm shape from the new (lower, wider) shoulder, scaled to the shorter arm
  w: { pron: 80, flex: 15, dev: 0 }, guess: [90, 15, 30] };
// Arms: elbows bent about 90-100 degrees, close to the ribs, loose hands in front of the chest.
function armsUp(pose) {
  const W = L.fk(pose), T6 = W.spine_t6;
  const target = V.add(T6.p, Q.rot(T6.q, ARM.wrist));
  const elbow = V.add(T6.p, Q.rot(T6.q, ARM.elbow));
  const extra = (Wx) => V.sub(Wx.elbow_r.p, elbow).map((v) => v * 0.8);
  const p = L.armToTarget(pose, target, { wrist: ARM.w, axial: ARM.guess[2], axialW: 0.005, guess: ARM.guess, extra });
  ['shoulder', 'elbow', 'wrist'].forEach((j) => { p.ch[`${j}_l`] = clone(p.ch[`${j}_r`]); });
  return p;
}
{
  const armed = armsUp(setTrunk(clone(base), -8));
  ['shoulder', 'elbow', 'wrist'].forEach((j) => { base.ch[`${j}_r`] = armed.ch[`${j}_r`]; base.ch[`${j}_l`] = armed.ch[`${j}_l`]; });
}

/* ---------------- Hop shape ---------------- */
const G = 981;                                     // cm/s^2
const T = { push: 0.08, toe: 0.13, lift: 0.17, apex: 0.25, reach: 0.33, touch: 0.37, land: 0.40 }; // s after mid-stance
const FLIGHT = T.touch - T.toe;                    // 0.24 s in the air; contact 0.26 s
const KNEE = { mid: 32, push: 14, toe: 5, lift: 10, apex: 18, reach: 13, touch: 10, land: 18 };
const FOOT_PITCH = { toe: 22, lift: 24, apex: 16, reach: 14, touch: 13 };
const PITCH = { mid: -12, push: -8, toe: -6, lift: -6, apex: -7, reach: -7, touch: -7, land: -9 };
const SHIFT = 3;                                   // pelvis ahead of / behind the feet at push-off and touchdown (cm)

const unit = (a, b) => V.norm(V.sub(PTS[b], PTS[a]));
const pelvisAt = (P, u, k) => [r1(P[0] + u[0] * k), 0, r1(P[2] + u[2] * k)];

// Build a pose. feet[s] = { ankle?, low?, pitch, w, plantAt? } ; y: fixed root height, or kneeTarget to solve it.
function makePose({ pelvis, pitch, feet, y, kneeTarget, flightKnee }) {
  const p = setTrunk(clone(base), pitch);
  p.root.pos = [pelvis[0], y ?? base.root.pos[1], pelvis[2]];
  const ank = {};
  for (const s of ['r', 'l']) { const f = feet[s]; if (f.low) ank[s] = ankleFor(f.pitch, s, f.low); }
  if (kneeTarget != null) {
    // Root height from the knee target: the hip sits straight above/beside the ankle at the leg length for that knee bend.
    const H = L.fk(p).hip_r.p, h = Math.hypot(ank.r[0] - H[0], ank.r[2] - H[2]);
    p.root.pos[1] = r1(ank.r[1] + Math.sqrt(legLen(kneeTarget) ** 2 - h * h));
  }
  if (flightKnee != null) {
    // Free foot: knee bend fixes the hip-to-ankle distance; the foot sits at the given horizontal spot.
    const W = L.fk(p);
    for (const s of ['r', 'l']) {
      const H = W[`hip_${s}`].p, f = feet[s], h = Math.hypot(f.xz[0] - H[0], f.xz[1] - H[2]);
      ank[s] = [r1(f.xz[0]), r1(H[1] - Math.sqrt(legLen(flightKnee) ** 2 - h * h)), r1(f.xz[1])];
    }
  }
  let q = p;
  q.ik = {};
  for (const s of ['r', 'l']) {
    const f = feet[s];
    q = fitLeg(q, s, ank[s], f.pitch);
    q.ik = q.ik || {};
  }
  q.ik = {};
  for (const s of ['r', 'l']) {
    const f = feet[s];
    q.ik[`leg_${s}`] = { target: f.plantAt ? ankleFor(HEEL_UP, s, f.plantAt) : ank[s], weight: f.w };
  }
  return q;
}

const planted = (P) => ({ r: { low: ball(P, 'r'), pitch: HEEL_UP, w: 1, plantAt: ball(P, 'r') }, l: { low: ball(P, 'l'), pitch: HEEL_UP, w: 1, plantAt: ball(P, 'l') } });
const midPose = (P) => makePose({ pelvis: pelvisAt(P, [0, 0, 0], 0), pitch: PITCH.mid, feet: planted(P), kneeTarget: KNEE.mid });

// One hop from marker a to marker b: returns [{dt, name, pose}] for push .. land (the next mid is added by the caller).
function hop(a, b, tag) {
  const A = PTS[a], B = PTS[b], u = unit(a, b), out = [];
  out.push({ dt: T.push, name: `${tag}_push`, pose: makePose({ pelvis: pelvisAt(A, u, SHIFT), pitch: PITCH.push, feet: planted(A), kneeTarget: KNEE.push }) });
  // Toe-off: heels up, the balls of the feet still on their spots, weight released.
  const toeFeet = {}, touchFeet = {};
  for (const s of ['r', 'l']) {
    const bA = ball(A, s), bB = ball(B, s);
    toeFeet[s] = { low: [bA[0], 0.3, bA[2]], pitch: FOOT_PITCH.toe, w: 0, plantAt: bA };
    touchFeet[s] = { low: [bB[0], 0.4, bB[2]], pitch: FOOT_PITCH.touch, w: 0, plantAt: bB };
  }
  const toe = makePose({ pelvis: pelvisAt(A, u, SHIFT + 1.5), pitch: PITCH.toe, feet: toeFeet, kneeTarget: KNEE.toe });
  const touch = makePose({ pelvis: pelvisAt(B, u, -(SHIFT + 1.5)), pitch: PITCH.touch, feet: touchFeet, kneeTarget: KNEE.touch });
  // Toe-off pose keeps the planted target (weight 0 there), so the target never moves while the weight is 1.
  out.push({ dt: T.toe, name: `${tag}_toe`, pose: toe });
  // Flight: ballistic hip height between toe-off and touchdown; pelvis moves at constant speed, feet ease across.
  const y0 = toe.root.pos[1], y1 = touch.root.pos[1], v0 = (y1 - y0) / FLIGHT + 0.5 * G * FLIGHT;
  const P0 = toe.root.pos, P1 = touch.root.pos;
  for (const k of ['lift', 'apex', 'reach']) {
    const tau = T[k] - T.toe, f = tau / FLIGHT, sm = f * f * (3 - 2 * f);
    const y = r1(y0 + v0 * tau - 0.5 * G * tau * tau);
    const pel = [r1(P0[0] + (P1[0] - P0[0]) * f), 0, r1(P0[2] + (P1[2] - P0[2]) * f)];
    const feet = {};
    for (const s of ['r', 'l']) {
      const a0 = ankleFor(FOOT_PITCH.toe, s, toeFeet[s].low), a1 = ankleFor(FOOT_PITCH.touch, s, touchFeet[s].low);
      feet[s] = { xz: [a0[0] + (a1[0] - a0[0]) * sm, a0[2] + (a1[2] - a0[2]) * sm], pitch: FOOT_PITCH[k], w: 0 };
    }
    out.push({ dt: T[k], name: `${tag}_${k}`, pose: makePose({ pelvis: pel, pitch: PITCH[k], feet, y, flightKnee: KNEE[k] }) });
  }
  // Touchdown on the balls of the feet: weight still 0 but the target is already on the landing spot.
  out.push({ dt: T.touch, name: `${tag}_touch`, pose: touch });
  out.push({ dt: T.land, name: `${tag}_land`, pose: makePose({ pelvis: pelvisAt(B, u, -SHIFT * 0.5), pitch: PITCH.land, feet: planted(B), kneeTarget: KNEE.land }) });
  return out;
}

/* ---------------- Choreography ---------------- */
const poses = {}, keyframes = [];
const add = (t, name, pose) => { if (!(name in poses)) poses[name] = pose; keyframes.push({ t: +t.toFixed(3), pose: name }); };
const mids = {}; for (const k of Object.keys(PTS)) mids[k] = midPose(PTS[k]);
add(0, 'mid_C', mids.C);
const hopCache = {};
for (let i = 0; i < SEQ.length - 1; i++) {
  const a = SEQ[i], b = SEQ[i + 1], t0 = i * PERIOD, tag = `hop${i % 6 + 1}_${a}${b}`;
  hopCache[tag] = hopCache[tag] || hop(a, b, tag);
  for (const k of hopCache[tag]) add(t0 + k.dt, k.name, k.pose);
  add(t0 + PERIOD, `mid_${b}`, mids[b]);
}
const DUR = (SEQ.length - 1) * PERIOD;
if (DUR !== meta.timeline.duration) throw new Error(`duration ${DUR} != meta ${meta.timeline.duration}`);

/* ---------------- Activation: contact-synced pulses for the prime movers (illustrative) ---------------- */
const activation = clone(meta.activation);
const pulse = (vals) => {                          // vals: value at mid, push, toe, lift, apex, reach, touch, land
  const pts = [[0, vals.mid]];
  for (let i = 0; i < SEQ.length - 1; i++) {
    const t0 = i * PERIOD, lateral = SEQ[i] !== 'C' ? SEQ[i] !== 'F' : SEQ[i + 1] !== 'F';
    const boost = vals.lateral && lateral ? vals.lateral : 0;
    for (const k of ['push', 'toe', 'apex', 'touch', 'land']) pts.push([+(t0 + T[k]).toFixed(3), Math.min(1, +(vals[k] + (k === 'apex' ? 0 : boost)).toFixed(2))]);
    pts.push([+(t0 + PERIOD).toFixed(3), Math.min(1, +(vals.mid + boost).toFixed(2))]);
  }
  pts[0][1] = pts[pts.length - 1][1];             // seamless: start value = end value
  return pts;
};
const ACT = {
  calves: { mid: 0.85, push: 1, toe: 0.6, apex: 0.2, touch: 0.6, land: 0.8 },
  quads: { mid: 0.9, push: 0.7, toe: 0.4, apex: 0.25, touch: 0.5, land: 0.85 },
  glute_max: { mid: 0.4, push: 0.55, toe: 0.3, apex: 0.15, touch: 0.25, land: 0.4 },
  hamstrings: { mid: 0.35, push: 0.45, toe: 0.3, apex: 0.2, touch: 0.3, land: 0.35 },
  hip_flexors: { mid: 0.15, push: 0.15, toe: 0.3, apex: 0.5, touch: 0.25, land: 0.15 },
  glute_med: { mid: 0.4, push: 0.4, toe: 0.3, apex: 0.25, touch: 0.35, land: 0.4, lateral: 0.25 },
  adductors: { mid: 0.3, push: 0.3, toe: 0.25, apex: 0.2, touch: 0.3, land: 0.3, lateral: 0.2 },
};
for (const m in ACT) for (const s of ['r', 'l']) activation[`${m}_${s}`] = pulse(ACT[m]);

/* ---------------- Module ---------------- */
const ex = {
  schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props: meta.props, contacts,
  timeline: meta.timeline, poses, keyframes, activation, guides: meta.guides, checks: meta.checks,
};

/* ---------------- Self-check and kinematics table ---------------- */
const tl = R.buildTimeline(ex);
const stats = { floor: 1e9, apexClear: 0, kneeTouch: [], kneeLow: 0, travel: 0, headBob: [1e9, -1e9], rise: 0, slideW1: 0 };
const W0 = R.evalPose(rig, tl.pose(0), contacts);
let prevJump = 0, seamJump = 0, prevW = null;
for (let i = 0; i <= 1200; i++) {
  const t = (i / 1200) * DUR, pose = tl.pose(t), W = R.evalPose(rig, pose, contacts);
  const f = L.shapeMinY(W); if (f.y < stats.floor) { stats.floor = f.y; stats.floorAt = [f.id, +t.toFixed(2)]; }
  stats.kneeLow = Math.max(stats.kneeLow, kneeOf(W, 'r'));
  stats.travel = Math.max(stats.travel, V.len(V.sub(W.pelvis.p, W0.pelvis.p)));
  stats.rise = Math.max(stats.rise, W.pelvis.p[1] - W0.pelvis.p[1]);
  if (pose.ik.leg_r.weight < 0.01) stats.apexClear = Math.max(stats.apexClear, footLow(W, 'r')[1]);
  if (prevW) prevJump = Math.max(prevJump, V.len(V.sub(W.head_c1.p, prevW.head_c1.p)));
  prevW = W;
}
// Seam: compare the last and first frame steps.
{
  const dt = DUR / 1200, Wa = R.evalPose(rig, tl.pose(DUR - dt), contacts), Wb = R.evalPose(rig, tl.pose(0), contacts), Wc = R.evalPose(rig, tl.pose(dt), contacts);
  seamJump = Math.max(V.len(V.sub(Wb.head_c1.p, Wa.head_c1.p)), V.len(V.sub(Wc.head_c1.p, Wb.head_c1.p)));
}
const kTouch = kneeOf(R.evalPose(rig, poses.hop1_CL_touch, contacts), 'r');
const kMid = kneeOf(R.evalPose(rig, poses.mid_L, contacts), 'r');
const ankleDorsi = (W, s) => V.angle(V.scale(rig.byId.ankle_r.offset, -1), rig.byId.toe_r.offset) - V.angle(V.sub(W[`knee_${s}`].p, W[`ankle_${s}`].p), V.sub(W[`toe_${s}`].p, W[`ankle_${s}`].p));
const dTouch = ankleDorsi(R.evalPose(rig, poses.hop1_CL_touch, contacts), 'r'), dMid = ankleDorsi(R.evalPose(rig, poses.mid_L, contacts), 'r');
const trunkLean = (P) => { const W = L.fk(P); return V.angle(V.sub(W.neck_c7.p, W.pelvis.p), [0, 1, 0]); };
const kin = ex.exercise.kinematics, d0 = (v) => `about ${Math.round(v)}°`;
kin[0].setup = 'Soft, not locked'; kin[0].peak = d0(kTouch);
kin[1].setup = d0(kTouch) + ' at touchdown'; kin[1].peak = `${d0(kMid)} (about ${Math.round(kMid - kTouch)}° bend after contact)`;
const ank = (v) => (v < 0 ? `about ${Math.round(-v)}° plantarflexion` : `about ${Math.round(v)}° dorsiflexion`);
kin[2].setup = `Ball of the foot, heel up ${FOOT_PITCH.touch}° (ankle ${ank(dTouch)})`; kin[2].peak = `Heel lowers to ${HEEL_UP}° off the floor (ankle ${ank(dMid)}), ${Math.round(dMid - dTouch)}° ankle excursion`;
kin[3].setup = 'Center marker'; kin[3].peak = `${HOP} cm to the left, forward and right markers`;
kin[4].setup = 'Continuous'; kin[4].peak = `${1 / PERIOD} hops per second (6 hops per round, 3 s)`;
kin[5].setup = `Touchdown at ${T.touch} s, toe-off at ${T.toe} s of each hop`; kin[5].peak = `${Math.round((PERIOD - FLIGHT) * 1000)} ms contact, ${Math.round(FLIGHT * 1000)} ms in the air`;
const flightRise = poses.hop1_CL_apex.root.pos[1] - poses.hop1_CL_toe.root.pos[1];
kin[6].setup = `Hip lowest at mid-contact, ${Math.round(stats.rise)} cm below the top of the flight`; kin[6].peak = `Hip about ${Math.round(flightRise)} cm above its take-off height; feet about ${Math.round(stats.apexClear)} cm off the floor at the top`;
kin[7].setup = `Trunk ${d0(trunkLean(poses.mid_C))} forward at the bottom of a landing`; kin[7].peak = `${d0(trunkLean(poses.hop1_CL_apex))} in the air; pelvis never turns`;
ex.exercise.reference.note = meta.exercise.reference.note;

console.log(`3PSH: ${Object.keys(poses).length} poses, ${keyframes.length} keyframes, wrote ${L.write(ex)}`);
console.log('  knee touch', kTouch.toFixed(1), 'mid', kMid.toFixed(1), 'max', stats.kneeLow.toFixed(1), ' ankle dorsi touch', dTouch.toFixed(1), 'mid', dMid.toFixed(1));
console.log('  floor', stats.floor.toFixed(2), JSON.stringify(stats.floorAt), ' apex clearance', stats.apexClear.toFixed(1), ' rise', stats.rise.toFixed(1), ' travel', stats.travel.toFixed(1));
console.log('  head step per frame max', prevJump.toFixed(2), 'cm; at seam', seamJump.toFixed(2), 'cm');
for (const n of ['mid_C', 'hop1_CL_push', 'hop1_CL_toe', 'hop1_CL_lift', 'hop1_CL_apex', 'hop1_CL_reach', 'hop1_CL_touch', 'hop1_CL_land', 'mid_L']) {
  const W = R.evalPose(rig, poses[n], contacts);
  console.log(`  ${n.padEnd(15)} y=${poses[n].root.pos[1]} kneeR=${kneeOf(W, 'r').toFixed(1)} footLowR=${footLow(W, 'r').map((v) => v.toFixed(1)).join(',')} w=${poses[n].ik.leg_r.weight} minY=${L.shapeMinY(W).y.toFixed(2)}(${L.shapeMinY(W).id})`);
}
