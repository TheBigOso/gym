// Resistance Band Hip Thrusts on Knees (GymVisual 21161; movement reference only, page not readable): kneeling on a mat
// on both knees, knees hip width, toes tucked (planted leg contacts: shins and feet stay put), facing away from a squat
// rack. A band is anchored round each rack upright behind at about hip height and the hands hold the strands at the
// sides of the hips, on the iliac crests (the usual band across the front of the hips is drawn as these two strands to the hands). From the
// hips sat back toward the heels (thighs about 38 degrees behind vertical, trunk hinged forward about 30 degrees with a
// long back) the glutes drive the hips forward and up to tall kneeling (hips straight, trunk upright), short squeeze,
// then the band draws the hips back under control. The hips move on a circle about the knees, so the knees stay on the
// mat. Bilateral. Tempo: 1.2 s forward, 0.8 s squeeze, 2 s back, 1.2 s pause.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const EQ = require('./families/equip');
const CA = require('./families/b5-cablearms');
const meta = require('./meta/resistance-band-hip-thrusts-on-knees.json');

const ID = 'resistance-band-hip-thrusts-on-knees';
const TK = CA.tallKneel({ toePitch: 76 });
const TH = V.len(L.rig.byId.knee_r.offset);
const THIGH0 = +(process.env.TH0 ?? 38), LEAN0 = +(process.env.LEAN0 ?? 30);
const W0 = L.fk(TK.pose, TK.contacts);
const KNEE = V.scale(V.add(W0.knee_r.p, W0.knee_l.p), 0.5);
// hands on the sides of the hips (iliac crest, a little behind the hip joint), as hips.js handsOnHips but with the
// target in the pelvis frame raised and moved back so the band strands leave the hands above the thighs
const HOFF = JSON.parse(process.env.HOFF ?? '[-6, 16, 17]');
function handsOnCrest(p) {
  const W = L.fk(p), P = W.pelvis, target = V.add(P.p, L.Q.rot(P.q, HOFF)), elbow = V.add(P.p, L.Q.rot(P.q, [-8, 26, 30]));
  const q = L.armToTarget(p, target, { wrist: { pron: -80, flex: 15, dev: 20 }, axial: 0, axialW: 0.005, guess: [10, 40, 40], extra: (Wx) => V.sub(Wx.elbow_r.p, elbow).map((v) => v * 0.8) });
  ['shoulder', 'elbow', 'wrist'].forEach((j) => { q.ch[`${j}_l`] = clone(q.ch[`${j}_r`]); });
  q.ch.sc_r = { protract: 2, elevate: 2 }; q.ch.sc_l = { protract: 2, elevate: 2 };
  return q;
}
const midHip = (W) => V.scale(V.add(W.hip_r.p, W.hip_l.p), 0.5);
// f: 0 = hips back (bottom), 1 = tall kneeling (top)
function poseAt(f) {
  const k = f * f * (3 - 2 * f), th = THIGH0 * (1 - k), lean = LEAN0 * (1 - k), a = th * Math.PI / 180;
  const target = [KNEE[0] - TH * Math.sin(a), KNEE[1] + TH * Math.cos(a), 0];
  let p = clone(TK.pose);
  p.root.rot = { ...(p.root.rot || {}), pitch: r1(-lean) };
  for (let i = 0; i < 6; i++) { const dd = V.sub(midHip(L.fk(p, TK.contacts)), target); p.root.pos = p.root.pos.map((v, j) => v - dd[j]); }
  p.root.pos = p.root.pos.map((v) => +v.toFixed(3));
  for (const c of TK.contacts) p = H.fitLeg(p, c.id.slice(-1), c, p.ik[c.id].target);
  for (const j of ['hip_r', 'hip_l', 'knee_r', 'knee_l', 'ankle_r', 'ankle_l']) for (const c in p.ch[j]) p.ch[j][c] = r1(L.wrap(p.ch[j][c]));
  p.ch.spine_l5 = { rot: 0, flex: 0, latFlex: 0 }; p.ch.spine_t12 = { rot: 0, flex: 2, latFlex: 0 }; p.ch.spine_t6 = { rot: 0, flex: 2, latFlex: 0 };
  p.ch.neck_c7 = { rot: 0, flex: r1(-0.5 * lean) }; p.ch.head_c1 = { rot: 0, flex: r1(-0.2 * lean) };
  delete p.ch.shoulder_r; delete p.ch.shoulder_l;
  const q = handsOnCrest(p); // hands at the sides of the hips, holding the band strands
  q.ik = p.ik;
  return q;
}
const keys = { bottom: 0, u25: 0.25, u50: 0.5, u75: 0.75, top: 1 };
const poses = Object.fromEntries(Object.entries(keys).map(([n, f]) => [n, poseAt(f)]));
poses.squeeze = clone(poses.top); poses.squeeze.ch.hip_r.flex = r1(poses.top.ch.hip_r.flex - 1); poses.squeeze.ch.hip_l.flex = r1(poses.top.ch.hip_l.flex - 1);
const keyframes = [{ t: 0, pose: 'bottom' }, { t: 0.8, pose: 'bottom' }, { t: 1.1, pose: 'u25' }, { t: 1.4, pose: 'u50' }, { t: 1.7, pose: 'u75' }, { t: 2.0, pose: 'top' }, { t: 2.4, pose: 'squeeze' }, { t: 2.8, pose: 'top' },
  { t: 3.3, pose: 'u75' }, { t: 3.8, pose: 'u50' }, { t: 4.3, pose: 'u25' }, { t: 4.8, pose: 'bottom' }, { t: 6.0, pose: 'bottom' }];
const ex = H.module_(meta, TK.contacts, poses, keyframes);
// rack behind the athlete (uprights 80 cm apart), bands anchored on the uprights 10 cm above the top hip height
const Wt = L.fk(poses.top, TK.contacts), Wb = L.fk(poses.bottom, TK.contacts);
const toeX = Math.min(Wt.toe_r.p[0], Wt.toe_l.p[0], Wt.ankle_r.p[0]);
const RX = r1(toeX - 45), AY = r1(Wt.pelvis.p[1] + +(process.env.DY ?? 10)), AZ = +(process.env.AZ ?? 40);
const RK = EQ.rack({ x: RX, width: 2 * AZ, hookY: 140, facing: 1 });
const AR = [RX, AY, AZ], AL = [RX, AY, -AZ];
const mat = ex.props.find((p) => p.kind === 'mat'); mat.center = [r1((KNEE[0] + toeX) / 2), 0, 0]; mat.size = [110, 0.6, 70];
ex.props = [mat, RK.prop, { id: 'band_r', kind: 'band', anchor: AR, attach: { joint: 'wrist_r' } }, { id: 'band_l', kind: 'band', anchor: AL, attach: { joint: 'wrist_l' } }];

// loop checks: shins / feet planted, knees on the mat (not through it), band strands clear of the body, joint limits
let strand = { d: 1e9 }, kneeLow = [1e9, -1e9], len = [1e9, -1e9];
const rep = H.loopReport(ex, { planted: ['leg_r', 'leg_l'], probe: (W, pz, t) => {
  for (const [s, A] of [['r', AR], ['l', AL]]) { const g = EQ.gripPoint(W, s).p, c = EQ.segmentClear(W, A, g, 0.6, { skip: new RegExp(`^(hand|thumb|forearm)_${s}$`) }); if (c.d < strand.d) strand = { d: +c.d.toFixed(2), id: c.id, t: +t.toFixed(2), at: +(1 - c.k / 12).toFixed(2) }; const l = V.len(V.sub(A, g)); len = [Math.min(len[0], l), Math.max(len[1], l)]; }
  const kl = Math.min(H.bottomOf(W, 'shank_r'), H.bottomOf(W, 'shank_l')); kneeLow = [Math.min(kneeLow[0], kl), Math.max(kneeLow[1], kl)];
} });
const fail = (m) => { console.error(`FAIL ${ID}: ${m}`); process.exitCode = 1; };
if (rep.slide > 0.05) fail(`planted contact slides ${rep.slide}`);
if (rep.floor < -0.5) fail(`below the floor ${rep.floor}`);
if (kneeLow[1] - kneeLow[0] > 1) fail(`knees lift or sink (${kneeLow.map(r1)})`);
if (strand.d < 0) fail(`band into the body ${JSON.stringify(strand)}`);
const viol = [];
for (const [n, p] of Object.entries(poses)) for (const j in p.ch) { const lim = L.rig.byId[j] && L.rig.byId[j].limits; if (lim) for (const c in p.ch[j]) if (lim[c] && (p.ch[j][c] < lim[c][0] - 0.5 || p.ch[j][c] > lim[c][1] + 0.5)) viol.push(`${n}.${j}.${c}=${p.ch[j][c]}`); }
if (viol.length) fail(`joint limits ${viol.join(', ')}`);

const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
const thighA = (W) => V.angle(V.sub(W.hip_r.p, W.knee_r.p), [0, 1, 0]);
const trunk = (W) => V.angle(V.sub(W.neck_c7.p, W.pelvis.p), [0, 1, 0]);
set('Hip flexion', 'setup', `${poses.bottom.ch.hip_r.flex}° (hips back)`); set('Hip flexion', 'peak', `${poses.top.ch.hip_r.flex}° (tall kneeling)`);
set('Thigh angle', 'setup', `${d(thighA(Wb))} behind vertical`); set('Thigh angle', 'peak', `${d(thighA(Wt))} (vertical)`);
set('Trunk inclination', 'setup', `${d(trunk(Wb))} forward`); set('Trunk inclination', 'peak', `${d(trunk(Wt))} (upright)`);
set('Band', 'setup', `Anchored on the uprights ${AY} cm high, ${Math.round(len[0])} cm to the hands`); set('Band', 'peak', `Stretched to ${Math.round(len[1])} cm; strands clear of the body by ${strand.d} cm or more`);
set('Tempo', 'setup', 'Pause 1.2 s with the hips back'); set('Tempo', 'peak', '1.2 s forward, 0.8 s squeeze, 2 s back');
console.log(`Resistance Band Hip Thrusts on Knees: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}\n  strand ${JSON.stringify(strand)} knees ${kneeLow.map(r1)} len ${len.map(r1)} rack x ${RX} anchor y ${AY}`);
