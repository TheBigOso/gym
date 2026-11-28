// Dumbbell Alternate Side Press (GymVisual #1352; page not readable here, movement from the name and the see-saw / alternating
// side press description): standing, feet about hip width (planted leg contacts), a dumbbell in each hand held in front of
// the shoulders at chin height with the palms facing you (the Arnold-press start). The right arm presses overhead, the
// forearm turning so the palm faces forward at the top and the elbow opening out to the side, while the trunk bends sideways
// away from it (to the left, about 15 degrees) so the arm reaches up and over toward the opposite side; it lowers back to the
// start as the trunk straightens. Then the left arm presses with a lean to the right. The free dumbbell stays at the
// shoulder. Bilateral loop (one rep per side): the left keys mirror the right keys. Right-arm solves with b3-chest solveArmDB
// (dumbbell centre and handle axis in the leaning trunk frame).
const L = require('./lib');
const { V, R, r1, clone } = L;
const H = require('./families/hips');
const S3 = require('./families/b3-shoulders');
const C = require('./families/b3-chest');
const F6 = require('./families/b6-04');
const M = require('./families/b4-squats2');
const meta = require('./meta/dumbbell-alternate-side-press.json');

const LEAN = +(process.env.LEAN ?? 26), REACH = +(process.env.REACH ?? 56.6);
const base = S3.standing({ stance: 12, knee: 6 }), { contacts } = base;
const ease = (f) => f * f * (3 - 2 * f);
function trunkAt(f) { // side bend to the left (negative latFlex), the head kept nearly level
  const p = clone(base.pose), a = -LEAN * ease(f);
  p.ch.spine_l5 = { rot: 0, flex: 0, latFlex: r1(a * 0.3) }; p.ch.spine_t12 = { rot: 0, flex: 0, latFlex: r1(a * 0.35) }; p.ch.spine_t6 = { rot: 0, flex: 0, latFlex: r1(a * 0.35) };
  p.ch.neck_c7 = Object.assign({}, p.ch.neck_c7, { latFlex: r1(-a * 0.4) });
  p.ch.sc_r = { protract: 2, elevate: r1(4 * ease(f)) };
  return p;
}
const ARNOLD = { s: JSON.parse(process.env.ARN || '[15, 7, -1]') }; // dumbbell centre from the right shoulder at the start: [out of the chest, up the trunk, out to the side]
function target(p, f) {
  const W = L.fk(p, contacts), F = C.trunkFrame(W), S = W.shoulder_r.p;
  const cb = V.add(S, V.add(V.add(V.scale(F.v, ARNOLD.s[0]), V.scale(F.u, ARNOLD.s[1])), V.scale(F.w, ARNOLD.s[2])));
  const dTop = V.norm(V.add(F.u, V.scale(F.v, 0.06))), ct = V.add(S, V.scale(dTop, REACH));
  const e = ease(f), c = V.add(V.add(V.scale(cb, 1 - e), V.scale(ct, e)), V.scale(F.w, Math.sin(Math.PI * f) * 7));
  const ax = f < 0.5 ? F6.slerp(F.w, V.scale(F.v, -1), f * 2) : F6.slerp(V.scale(F.v, -1), V.scale(F.w, -1), f * 2 - 1); // thumb out -> back -> in
  return { c, ax, F };
}
const GRID = [];
for (const plane of [60, 90, 110]) for (const elev of [40, 70]) for (const axial of [-60, 0, 60]) for (const pron of [-90, 0, 90]) GRID.push({ shoulder_r: { plane, elev, axial }, elbow_r: { flex: 130 }, wrist_r: { pron, flex: 0, dev: 0 } });
let prev = null; const raw = [];
for (let i = 0; i <= 6; i++) {
  const f = i / 6, p = trunkAt(f), { c, ax } = target(p, f);
  const pc = prev && clone(prev.ch);
  const q = C.solveArmDB(p, { c, ax, seeds: prev ? [{ shoulder_r: pc.shoulder_r, elbow_r: pc.elbow_r, wrist_r: pc.wrist_r }] : GRID, wristW: 0.1,
    extra: (W, qq) => (prev ? [(qq.ch.wrist_r.pron - pc.wrist_r.pron) * 0.005, (qq.ch.shoulder_r.axial - pc.shoulder_r.axial) * 0.005] : []) });
  const W = L.fk(q, contacts), d = C.dbAt(W, 'r');
  raw.push({ f, pose: q, err: +V.len(V.sub(d.c, c)).toFixed(2), axErr: +V.angle(d.ax, ax).toFixed(1) });
  prev = q;
}
// free arm: the left dumbbell held at the start position (mirror of the right start channels)
const hold = raw[0].pose;
const keyPose = (q) => { const o = C.strip(q); for (const j of ['shoulder', 'elbow', 'wrist', 'sc']) o.ch[`${j}_l`] = clone(hold.ch[`${j}_r`]); return o; };
const poses = { both: keyPose(raw[0].pose) };
raw.forEach((k, i) => { if (i > 0) { poses[`R${i}`] = keyPose(k.pose); poses[`L${i}`] = M.mirrorPose(poses[`R${i}`]); } });
poses.Rhold = clone(poses.R6); poses.Rhold.ch.elbow_r.flex = r1(Math.max(0, poses.R6.ch.elbow_r.flex - 2)); poses.Lhold = M.mirrorPose(poses.Rhold);
for (const k of Object.keys(poses)) poses[k].ik = clone(base.pose.ik);
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p])), D = meta.timeline.duration, kf = [{ t: 0, pose: 'both' }];
for (const s of ['R', 'L']) {
  const up = ph[`press${s}`], top = ph[`top${s}`], dn = ph[`lower${s}`];
  kf.push({ t: up.start, pose: 'both' });
  for (let i = 1; i <= 5; i++) kf.push({ t: up.start + ((up.end - up.start) * i) / 6, pose: `${s}${i}` });
  kf.push({ t: up.end, pose: `${s}6` }, { t: (top.start + top.end) / 2, pose: `${s}hold` }, { t: top.end, pose: `${s}6` });
  for (let i = 5; i >= 1; i--) kf.push({ t: dn.start + ((dn.end - dn.start) * (6 - i)) / 6, pose: `${s}${i}` });
  kf.push({ t: dn.end, pose: 'both' });
}
kf.push({ t: D, pose: 'both' });
const keyframes = [...new Map(kf.map((k) => [+k.t.toFixed(3), { t: +k.t.toFixed(3), pose: k.pose }])).values()].sort((a, b) => a.t - b.t);
const ex = H.module_(meta, contacts, poses, keyframes);
ex.props = clone(S3.DUMBBELLS);
const rep = S3.scan(ex);
S3.gate('dumbbell-alternate-side-press', rep);
const Wb = L.fk(poses.both, contacts), Wt = L.fk(poses.R6, contacts), set = H.setKin(ex), d = F6.d0;
const lean = (W) => { const u = V.norm(V.sub(W.neck_c7.p, W.pelvis.p)); return Math.asin(-u[2]) / R.DEG; };
const armUp = (W) => V.angle(V.sub(W.wrist_r.p, W.shoulder_r.p), [0, 1, 0]);
set('Trunk side bend', 'setup', 'Upright'); set('Trunk side bend', 'peak', `${d(lean(Wt))} away from the pressing arm`);
set('Elbow flexion', 'setup', `${d(C.elbowFlexOf(Wb))}, dumbbells in front of the shoulders, palms facing you`); set('Elbow flexion', 'peak', `${d(C.elbowFlexOf(Wt))} at the top (nearly straight)`);
set('Arm overhead', 'setup', '–'); set('Arm overhead', 'peak', `Pressing arm ${d(armUp(Wt))} from vertical, reaching over toward the opposite side`);
set('Grip rotation', 'setup', 'Palms facing you'); set('Grip rotation', 'peak', `Palm forward at the top (forearm turn ${Math.round(Math.abs(poses.R6.ch.wrist_r.pron - poses.both.ch.wrist_r.pron))}° plus upper-arm rotation)`);
set('Opposite arm', 'setup', 'Both dumbbells at the start'); set('Opposite arm', 'peak', 'Holds its dumbbell in front of the shoulder');
set('Tempo', 'setup', `Start ${ph.setup.end} s`); set('Tempo', 'peak', `Per side ${r1(ph.pressR.end - ph.pressR.start)} s up, ${r1(ph.topR.end - ph.topR.start)} s at the top, ${r1(ph.lowerR.end - ph.lowerR.start)} s down`);
const tfMax = Math.max(...Object.values(poses).map((q) => V.angle(V.sub(L.fk(q, contacts).neck_c7.p, L.fk(q, contacts).pelvis.p), [0, 1, 0])));
ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(tfMax - 3), max: Math.ceil(tfMax + 3) };
console.log(`Dumbbell Alternate Side Press: wrote ${L.write(ex)}\n  errs ${raw.map((k) => k.err)} axErr ${raw.map((k) => k.axErr)} lean ${lean(Wt).toFixed(1)} elbow ${C.elbowFlexOf(Wb).toFixed(0)}->${C.elbowFlexOf(Wt).toFixed(0)} armUp ${armUp(Wt).toFixed(0)}\n  ${JSON.stringify({ slide: rep.slide, floor: rep.floor, dbFloor: rep.dbFloor, clear: rep.clear, jump: rep.jump, elev: rep.elev, elbow: rep.elbow })}`);
if (Math.max(...raw.map((k) => k.err)) > 1 || Math.max(...raw.map((k) => k.axErr)) > 10) { console.error('FAIL: press key not solved'); process.exitCode = 1; }
