// Heel Walk (GymVisual #22395; page not readable here, movement from the name and standard coaching): standing tall, hands
// on the hips, the toes and the balls of the feet pulled up off the floor (ankles dorsiflexed) so only the heels touch.
// Walk forward on the heels with short steps (a half step, three full steps and a closing step, 60 cm), toes up the
// whole time, trunk upright; then stand with the feet together and lower the toes. The loop restarts at the start mark.
// Each foot has one heel contact (foot pitched toes-up, lowest point = heel on the floor); a swinging foot is drawn by its
// channels, fitted to the same toes-up foot lifted a few centimetres. Bilateral.
const L = require('./lib');
const { R, V, Q, rig, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b6-20');
const meta = require('./meta/heel-walk.json');

const TOE = 6, HALF = 9, PITCH = 18;           // toe-out, half stance width, toes-up foot pitch (deg)
const qArr = (q) => q.map((v) => +v.toFixed(6));
const footShape = (s) => rig.shapes.find((x) => x.id === `foot_${s}`);
const contacts = ['r', 'l'].map((s) => Object.assign(L.legContact(s), { id: `heel_${s}`, label: `${s === 'r' ? 'Right' : 'Left'} heel`, handRot: qArr(H.footQ(-PITCH, s === 'r' ? -TOE : TOE)) }));
const flatC = ['r', 'l'].map((s) => Object.assign(L.legContact(s), { id: `flat_${s}`, label: `${s === 'r' ? 'Right' : 'Left'} foot`, handRot: qArr(H.footQ(0, s === 'r' ? -TOE : TOE)) }));
// a swinging foot: drawn by its channels, fitted to a nearly level foot (the shank tips forward in the swing, so the ankle
// stays dorsiflexed relative to the shin without passing its limit)
const swingC = ['r', 'l'].map((s) => Object.assign(L.legContact(s), { id: `swing_${s}`, label: `${s === 'r' ? 'Right' : 'Left'} foot (swing)`, handRot: qArr(H.footQ(-4, s === 'r' ? -TOE : TOE)) }));
const allC = [...contacts, ...flatC, ...swingC];
const st = L.POSES.standing({ stance: HALF, toeOut: TOE });
// ankle offset (x, y) from the heel point for the toes-up foot: probe the foot shape's lowest point
const HEEL = (() => { const p = clone(st.pose); p.ik = { heel_r: { target: [0, 20, HALF], weight: 1 } }; const lp = H.lowPoint(L.fk(p, contacts), 'foot_r'); return { dx: -lp[0], dy: 20 - lp[1] + 0.1 }; })();
// spec: { x (root), z, feet: { r: { h: heel x, lift, w, c: 'heel' | 'flat' } } }, knee (stance)
function build(spec, rootY) {
  const p = clone(st.pose);
  p.root.pos = [spec.x, rootY, spec.z || 0]; p.root.rot = { pitch: spec.pitch ?? 1 };
  p.ik = {};
  for (const s of ['r', 'l']) {
    const f = spec.feet[s], zz = s === 'r' ? HALF : -HALF;
    const heelT = [r1(f.h + HEEL.dx), r1(HEEL.dy + (f.lift || 0)), zz];
    const flatT = [r1(f.h + 6.5), L.ANKLE_H, zz];      // feet together at the end: toes lowered (ankle about 6.5 cm ahead of the heel)
    p.ik[`heel_${s}`] = { target: heelT, weight: f.c === 'flat' ? 0 : (f.w ?? 1) };
    p.ik[`flat_${s}`] = { target: flatT, weight: f.c === 'flat' ? (f.w ?? 1) : 0 };
    p.ik[`swing_${s}`] = { target: [r1(f.h + 3), r1(L.ANKLE_H + (f.lift || 0) + 1), zz], weight: 0 };
  }
  return p;
}
const kneeOf = H.kneeOf;
// fit leg channels to the full-weight IK solution of the foot's contact (swinging feet included)
function fit(p, spec) {
  let q = p;
  for (const s of ['r', 'l']) { const f = spec.feet[s], id = `${f.c === 'flat' ? 'flat' : (f.w ?? 1) < 0.5 && (f.lift || 0) > 2 ? 'swing' : 'heel'}_${s}`, c = allC.find((x) => x.id === id); q = H.fitLeg(q, s, c, q.ik[id].target); delete q.__cost; }
  for (const j of ['hip_r', 'hip_l', 'knee_r', 'knee_l', 'ankle_r', 'ankle_l']) for (const c in q.ch[j]) q.ch[j][c] = r1(L.wrap(q.ch[j][c]));
  return q;
}
// root height: the lower of the heights that give each weighted leg a knee of `knee` (both stay reachable)
function rootFor(spec, knee = 5) {
  const ys = [];
  for (const s of ['r', 'l']) {
    if ((spec.feet[s].w ?? 1) < 0.5) continue;
    let a = 60, b = 100;
    for (let i = 0; i < 40; i++) { const y = (a + b) / 2, W = L.fk(build(spec, y), allC); if (kneeOf(W, s) > knee) a = y; else b = y; }
    ys.push((a + b) / 2);
  }
  return r1(Math.min(...ys));
}
function pose(spec) {
  const y = rootFor(spec, spec.knee ?? 5);
  let p = fit(build(spec, y), spec);
  p.ch.spine_l5 = { rot: 0, flex: 0, latFlex: 0 }; p.ch.spine_t12 = { rot: 0, flex: 0, latFlex: 0 }; p.ch.spine_t6 = { rot: 0, flex: 0, latFlex: 0 };
  p.ch.neck_c7 = { rot: 0, flex: -1 }; p.ch.head_c1 = { rot: 0, flex: -1 };
  return H.handsOnHips(p);
}
// gait plan (as the b4-power carry gait, on the heels): half step, three full steps, closing step
const STEP = 30, PER = 0.6, T0 = 0.6, LIFT = 4, SWAY = 1.0;
const pos = { r: 0, l: 0 }, keys = [];
const heel = (h, o = {}) => Object.assign({ c: 'heel', h }, o);
keys.push({ name: 'stand', t: 0, spec: { x: 0, z: 0, feet: { r: { c: 'flat', h: 0 }, l: { c: 'flat', h: 0 } }, knee: 4 } });
keys.push({ name: 'toesUp', t: T0, spec: { x: -0.5, z: 0, feet: { r: heel(0), l: heel(0) }, knee: 5 } });
let t = T0, k = 0;
for (const [s, d] of [['r', STEP / 2], ['l', STEP], ['r', STEP], ['l', STEP], ['r', STEP / 2]]) {
  const o = s === 'r' ? 'l' : 'r', xa = pos[s], xb = xa + d, xo = pos[o], zs = (o === 'r' ? 1 : -1) * SWAY, mid = (xa + xb) / 2;
  const ff = (sf) => (s === 'r' ? { r: sf, l: heel(xo) } : { r: heel(xo), l: sf });
  keys.push({ name: `k${k}swing`, t: t + PER * 0.4, spec: { x: r1(Math.max(xo, mid) + 1), z: zs, feet: ff(heel(mid, { lift: LIFT, w: 0 })) } });
  keys.push({ name: `k${k}reach`, t: t + PER * 0.65, spec: { x: r1((xo + xb) / 2 + 1), z: zs * 0.6, feet: ff(heel(xb, { lift: 1.0, w: 0 })) } });
  keys.push({ name: `k${k}land`, t: t + PER * 0.8, spec: { x: r1((xo + xb) / 2), z: zs * 0.3, feet: ff(heel(xb)) } });
  pos[s] = xb; t += PER; k++;
}
const TEND = +(t + 0.15).toFixed(2);
keys.push({ name: 'together', t: TEND, spec: { x: pos.r - 0.5, z: 0, feet: { r: heel(pos.r), l: heel(pos.l) }, knee: 5 } });
keys.push({ name: 'end', t: 4.2, spec: { x: pos.r, z: 0, feet: { r: { c: 'flat', h: pos.r }, l: { c: 'flat', h: pos.l } }, knee: 4 } });
const poses = {}, keyframes = [];
for (const q of keys) { poses[q.name] = pose(q.spec); keyframes.push({ t: +q.t.toFixed(3), pose: q.name }); }
keyframes.push({ t: 4.5, pose: 'end' });
const ex = H.module_(meta, allC, poses, keyframes);
const travel = V.len(V.sub(L.fk(poses.end, allC).pelvis.p, L.fk(poses.stand, allC).pelvis.p));
ex.checks.measure = { name: 'rootTravel', min: Math.floor(travel) - 5, max: Math.ceil(travel) + 5 };
ex.checks.plantedContacts = ['heel_r', 'heel_l', 'flat_r', 'flat_l'];

const lr = H.loopReport(ex, { planted: ['heel_r', 'heel_l', 'flat_r', 'flat_l'], probe: (W, pz, tt, out) => {
  const toe = (s) => { const g = R.shapeWorld(W, footShape(s)); return g; };
  out.dorsi = out.dorsi || [99, -99]; const d = H.dorsiOf(W, 'r'), d2 = H.dorsiOf(W, 'l'); out.dorsi = [Math.min(out.dorsi[0], d, d2), Math.max(out.dorsi[1], d, d2)];
  if (tt > T0 + 0.05 && tt < TEND - 0.05) { out.toeUp = Math.min(out.toeUp ?? 99, W.toe_r.p[1], W.toe_l.p[1]); }
} });
const scan = F.report(ex);
const Ws = L.fk(poses.k1swing, allC);
F.setKin(ex, 'Ankle', 'Feet flat', `Toes up: foot pitched ${PITCH}° (ankle ${Math.round(lr.dorsi[0])}° to ${Math.round(lr.dorsi[1])}° dorsiflexion across the steps); toe joints at least ${r1(lr.toeUp)} cm off the floor`);
F.setKin(ex, 'Step length', 'Feet together', `${STEP} cm steps (half steps to start and finish), ${Math.round(pos.r)} cm per loop`);
F.setKin(ex, 'Trunk', 'Upright, hands on the hips', 'Upright');
F.setKin(ex, 'Cadence', `${PER} s per step`, `≈${Math.round(60 / PER)} steps per minute`);
console.log(`Heel Walk: wrote ${L.write(ex)}\n  ${JSON.stringify(lr)}\n  scan ${JSON.stringify(scan)} travel ${r1(travel)} HEEL ${JSON.stringify(HEEL)}`);
F.CA.guard('heel-walk', scan, [lr.slide > 0.05 && `planted heel slides ${lr.slide}`, lr.dorsi[1] > 34 && `ankle past its dorsiflexion limit (${lr.dorsi[1]})`, lr.toeUp < 2 && `toes touch the floor while walking (${lr.toeUp})`]);
