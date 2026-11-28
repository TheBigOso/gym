// Pistol Squat to Box (GymVisual #13815; page not readable here, movement from the name: the box-assisted pistol). Stand
// on the right foot in front of a low box with the left leg held straight out in front and the arms reaching forward; sit
// the hips back and down on one leg until the buttocks touch the box (a light touch, staying braced), then stand back up
// on the same leg. The free leg rises as the hips drop and stays off the floor; the centre of mass stays over the middle of
// the right foot. Authored on the right leg (the player mirrors). Single-leg family (single.js) as in
// author-bodyweight-single-leg-squat.js, deeper, with a straight free leg and a box under the buttocks at the bottom.
const L = require('./lib');
const { r1, clone } = L;
const { makeSingle, com, dorsiOf } = require('./families/single');
const H = require('./families/hips');
const B6 = require('./families/b6-13');
const meta = require('./meta/pistol-squat-to-box.json');

const F = makeSingle({ toe: 6, half: 9 });
const FOOT = { c: 'flat', x: 0, z: 9 };
const CX = 4, CZ = 9;
const KNEE_TOP = 4, KNEE_BOTTOM = +(process.env.KB || 104);
// depth g: trunk hinges forward, the straight free leg rises in front, foot clear of the floor
const spec = (g, free) => ({ root: [r1(-24 * g), 85, 9], pitch: r1(-4 - 38 * g), spine: { l5: r1(-2 * g), t12: r1(-1 * g), t6: r1(2 * g) },
  feet: { r: FOOT, l: free || { c: 'flat', x: r1(30 + 42 * g), z: 3, lift: r1(16 + 2 * g), w: 0, pitch: r1(-10 + 20 * g) } }, arms: F.armsForward });
// free leg nearly straight (knee 6), the hip-ankle line FWD degrees forward of vertical: placed from the balanced hip (2 passes)
const FWD = (g) => 22 + 56 * g;
const at = (g) => {
  const knee = KNEE_TOP + (KNEE_BOTTOM - KNEE_TOP) * g;
  const bal = (sp) => (knee < 20 ? F.balanceTall(sp, { knee, cx: CX, cz: CZ }) : F.balance(sp, { knee, cx: CX, cz: CZ }));
  let s1 = bal(spec(g));
  for (let i = 0; i < 2; i++) { const free = F.freeFoot(s1, 'l', { knee: 6, fwd: FWD(g), dz: -5, pitch: r1(30 - FWD(g)) }); s1 = bal(Object.assign(spec(g, free), { root: s1.root.slice() })); }
  return F.pose(s1);
};
const TOE = 6, nFoot = [-Math.sin(TOE * Math.PI / 180), 0, Math.cos(TOE * Math.PI / 180)];
const kneeLine = (W) => L.V.dot(L.V.sub(W.knee_r.p, W.ankle_r.p), nFoot);
const legR = F.contacts.find((c) => c.id === 'leg_r');
{ let a = -1.5, b = 0.6; for (let i = 0; i < 24; i++) { const m = (a + b) / 2; legR.pole = [1, 0, +m.toFixed(4)]; if (kneeLine(F.fk(at(1))) > 1.5) b = m; else a = m; } legR.pole = [1, 0, +((a + b) / 2).toFixed(4)]; }
const poses = { stand: at(0), d25: at(0.3), d50: at(0.55), d75: at(0.8), d92: at(0.93), bottom: at(1), r50: at(0.55), r85: at(0.15) };
poses.settle = (() => { const b = poses.bottom; const q = L.clone(b); return q; })(); // placeholder replaced below
{ const sp = spec(1); const s1 = F.balance(sp, { knee: KNEE_BOTTOM + 0.8, cx: CX, cz: CZ }); const free = F.freeFoot(s1, 'l', { knee: 6, fwd: FWD(1), dz: -5, pitch: r1(30 - FWD(1)) }); poses.settle = F.pose(F.balance(Object.assign(spec(1, free), { root: s1.root.slice() }), { knee: KNEE_BOTTOM + 0.8, cx: CX, cz: CZ })); }
const keyframes = [{ t: 0, pose: 'stand' }, { t: 0.8, pose: 'stand' }, { t: 1.35, pose: 'd25' }, { t: 1.85, pose: 'd50' }, { t: 2.35, pose: 'd75' }, { t: 2.65, pose: 'd92' }, { t: 2.9, pose: 'bottom' },
  { t: 3.15, pose: 'settle' }, { t: 3.4, pose: 'bottom' }, { t: 3.95, pose: 'r50' }, { t: 4.4, pose: 'r85' }, { t: 4.7, pose: 'stand' }, { t: 5.8, pose: 'stand' }];
const ex = { schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props: clone(meta.props), contacts: F.contacts,
  timeline: meta.timeline, poses, keyframes, activation: meta.activation, guides: meta.guides, checks: meta.checks };
// box: top just under the lowest buttock point at the settle key, front edge 5 cm ahead of it (the pelvis shape dips lower
// further forward, between the thighs, past the box edge)
const Ws = F.fk(poses.settle), seatY = Math.min(H.bottomOf(Ws, 'buttock_r'), H.bottomOf(Ws, 'buttock_l')), seatX = Math.min(B6.lowPt(Ws, 'buttock_r')[0], B6.lowPt(Ws, 'buttock_l')[0]);
const BOX_H = r1(seatY + 0.3), FRONT = r1(seatX + 5);
ex.props = [{ id: 'box', kind: 'box', center: [r1(FRONT - 20), 0, 5], size: [40, BOX_H, 45] }];
const rep = F.report(ex), Wt = F.fk(poses.stand), Wb = F.fk(poses.bottom);
let freeMin = 1e9, boxPen = 0, boxAt = null;
{ const tl = L.R.buildTimeline(ex); for (let i = 0; i <= 600; i++) { const W = L.R.evalPose(L.rig, tl.pose(ex.timeline.duration * i / 600), ex.contacts); freeMin = Math.min(freeMin, H.bottomOf(W, 'foot_l'), H.bottomOf(W, 'calf_l'));
  for (const id of ['buttock_r', 'buttock_l', 'thigh_r', 'thigh_l', 'pelvis']) { const lp = B6.lowPt(W, id); if (lp[0] < FRONT && lp[0] > FRONT - 40 && BOX_H - lp[1] > boxPen) { boxPen = BOX_H - lp[1]; boxAt = id; } } } }
const set = (p, f, v) => { const k = ex.exercise.kinematics.find((x) => x.measure.startsWith(p)); if (!k) throw new Error(p); k[f] = v; };
set('Box height', 'setup', `${BOX_H} cm box, front edge ${r1(-FRONT)} cm behind the stance ankle`); set('Box height', 'peak', 'Buttocks touch the box top lightly');
set('Stance knee', 'setup', `≈${Math.round(F.kneeOf(Wt, 'r'))}°`); set('Stance knee', 'peak', `≈${Math.round(F.kneeOf(Wb, 'r'))}°`);
set('Stance hip', 'setup', `≈${Math.round(poses.stand.ch.hip_r.flex)}°`); set('Stance hip', 'peak', `≈${Math.round(poses.bottom.ch.hip_r.flex)}° (joint channel)`);
set('Trunk inclination', 'setup', `≈${Math.round(F.trunkLean(Wt))}°`); set('Trunk inclination', 'peak', `≈${Math.round(F.trunkLean(Wb))}° forward`);
set('Free leg', 'setup', `Straight out in front (knee ≈${Math.round(F.kneeOf(Wt, 'l'))}°), foot ${r1(H.bottomOf(Wt, 'foot_l'))} cm up`); set('Free leg', 'peak', `Hip ≈${Math.round(poses.bottom.ch.hip_l.flex)}°, knee ≈${Math.round(F.kneeOf(Wb, 'l'))}°, lowest ${r1(freeMin)} cm off the floor`);
set('Tempo', 'setup', 'Balance 0.8 s'); set('Tempo', 'peak', '2.1 s down, 0.5 s light touch on the box, 1.3 s up, 1.1 s reset');
ex.exercise.reference.note = H.NOTE;
const peak = Math.max(F.kneeOf(Wb, 'r'), F.kneeOf(F.fk(poses.settle), 'r'));
ex.checks.measure = { name: 'kneeFlexion', min: Math.floor(peak - 6), max: Math.ceil(peak + 4) };
const c1 = com(Wb);
console.log(`Pistol Squat to Box: wrote ${L.write(ex)} box ${JSON.stringify(ex.props[0])}\n  ${JSON.stringify(rep)} com ${c1.map(r1)} dorsi ${r1(dorsiOf(Wb, 'r'))} freeMin ${r1(freeMin)} boxPen ${r1(boxPen)} ${boxAt} hipR ${poses.bottom.ch.hip_r.flex} hipL ${poses.bottom.ch.hip_l.flex}`);
const bad = [rep.slide > 0.05 && 'planted foot slides', dorsiOf(Wb, 'r') > 34.5 && 'ankle past its limit', freeMin < 1 && 'free foot touches the floor', boxPen > 0.8 && 'buttocks sink into the box', rep.floor < -0.5 && 'below the floor'].filter(Boolean);
if (bad.length) { console.error('FAIL pistol-squat-to-box: ' + bad.join('; ')); process.exitCode = 1; }
