// Dumbbell Kneeling Hold to Stand (GymVisual #11217; page not readable here, movement from the name): kneel-to-stand
// holding one dumbbell upright at the chest (goblet hold, both hands cupping the top plate; batch 3 gobletArms). From tall
// kneeling (both knees down, toes tucked: 'tuck' contacts, foot pitched 88 degrees about the toes) the right foot steps
// forward to half-kneeling, the athlete drives up through the front foot to a split stance (the rear foot rolls from tucked
// toes onto the ball of the foot), steps the left foot up beside the right and stands tall; then reverses: left foot back
// onto its ball, lower the left knee, right foot back, tall kneeling. Authored leading with the right leg (the player
// mirrors). Lunge family (lunge.js: flat / ball contacts, rolling feet, leg fits); b3-legs.js goblet arms.
const L = require('./lib');
const { Q, r1, clone } = L;
const { makeFamily } = require('./families/lunge');
const B = require('./families/b3-legs');
const K = require('./families/b4-shoulders3');
const meta = require('./meta/dumbbell-kneeling-hold-to-stand.json');

const TOE = 6, HALF = 9, F = makeFamily({ toe: TOE, half: HALF });
const TUCK = 88, BX = -40, XF = +(process.env.XF ?? 30); // tucked-toe pitch, ball point of the kneeling feet (x), front ankle (x)
const OFF = B.GOBLET_OFFSET;
const footQ = (pitch, yaw) => Q.mul(L.footRot(yaw), Q.axis([0, 0, 1], -pitch));
const tuckC = (s) => Object.assign(L.legContact(s), { id: `tuck_${s}`, label: `${s === 'r' ? 'Right' : 'Left'} foot (toes tucked)`, handRot: footQ(TUCK, s === 'r' ? -TOE : TOE).map((v) => +v.toFixed(6)) });
const contacts = [...F.contacts, tuckC('r'), tuckC('l')];
const zOf = (s) => (s === 'r' ? HALF : -HALF);
const tuckT = { r: F.rollTarget('r', TUCK, BX, HALF), l: F.rollTarget('l', TUCK, BX, -HALF) };
const ballAnkleX = F.rollTarget('l', 64, BX, -HALF)[0]; // ankle x that keeps the left ball of the foot at BX when on the ball contact
const roll = (s, pitch) => ({ c: 'roll', pitch, ballX: BX, z: zOf(s) });
const flat = (x, z, extra = {}) => Object.assign({ c: 'flat', x, z }, extra);
// gobletArms can land on the negative-elevation branch; (plane + 180, -elev, axial + 180) is the same arm with elev >= 0
const posElev = (q) => { for (const s of ['r', 'l']) { const c = q.ch[`shoulder_${s}`]; if (c.elev < 0) q.ch[`shoulder_${s}`] = { plane: r1(L.wrap(c.plane + 180)), elev: -c.elev, axial: r1(L.wrap(c.axial + 180)) }; } return q; };
const armsFn = (p) => { const q = B.gobletArms(p, { at: [25, 5, 5.4], elbow: [14, -16, 17], tilt: 0.45 }); delete q.__armCost; return posElev(q); };
// a pose from a lunge spec plus the tucked-toe contacts (weight 1 where that foot is kneeling)
function P(spec, tucked = []) {
  const p = F.pose(Object.assign(clone(spec), { arms: armsFn }));
  delete p.__armCost;
  for (const s of ['r', 'l']) p.ik[`tuck_${s}`] = { target: tuckT[s].slice(), weight: tucked.includes(s) ? 1 : 0 };
  return p;
}
// root height that rests the kneeling knee(s) just on the floor (rig knee region 0.3 cm up)
function kneelY(spec, sides) {
  let a = 25, b = 80;
  for (let i = 0; i < 22; i++) { const y = (a + b) / 2, s2 = clone(spec); s2.root[1] = y; const W = L.fk(F.pose(s2), F.contacts); if (Math.min(...sides.map((s) => K.kneeLow(W, s))) > 0.3) b = y; else a = y; }
  const s2 = clone(spec); s2.root[1] = r1((a + b) / 2); return s2;
}
const sp = (root, feet, pitch = 0, spine = { l5: 0, t12: 0, t6: 0 }) => ({ root, pitch, spine, feet });
const kneel = kneelY(sp([0, 45, 0], { r: roll('r', TUCK), l: roll('l', TUCK) }), ['r', 'l']);
const Y = kneel.root[1];
// right foot steps forward: lift off the tucked toes, swing, land flat in front (half-kneeling, left knee down)
const r1lift = sp([0, Y, -1.5], { r: flat(BX + 12, HALF, { lift: +(process.env.L1 ?? 16), w: 0, pitch: +(process.env.P1 ?? 80) }), l: roll('l', TUCK) }, -2);
const r15 = sp([0, Y, -1.5], { r: flat(-12, HALF, { lift: +(process.env.L15 ?? 15), w: 0, pitch: +(process.env.P15 ?? 80) }), l: roll('l', TUCK) }, -2);
const r2swing = sp([0, Y, -1.5], { r: flat(10, HALF, { lift: +(process.env.L2 ?? 14), w: 0, pitch: +(process.env.P2 ?? 35) }), l: roll('l', TUCK) }, -3);
const r3pre = sp([0, Y, -1], { r: flat(XF, HALF, { lift: 1, w: 0 }), l: roll('l', TUCK) }, -2);
const half = kneelY(sp([1, Y, -0.5], { r: flat(XF, HALF), l: roll('l', TUCK) }, -2), ['l']);
// rise: root forward and up over the front foot; the rear foot rolls from tucked toes (88) onto its ball (64)
const RISE_X = +(process.env.RX ?? 8), TOP_KNEE = +(process.env.TK ?? 55);
// the pelvis tips forward (root pitch) as the hips rise so the rear hip stays inside its extension range; the lumbar and
// thoracic spine extend a little to keep the chest up
const PT = +(process.env.PT ?? 16);
const rise = (f, pitchL, ball = false) => F.rootY(sp([r1(1 + (RISE_X - 1) * f), 70, r1(-0.5 + 1.5 * f)], { r: flat(XF, HALF), l: ball ? { c: 'ball', x: ballAnkleX, z: -HALF } : roll('l', pitchL) }, r1(-2 - PT * Math.sin(Math.PI * f / 2)), { l5: r1(-5 * f), t12: r1(-3 * f), t6: 0 }), r1(90 + (TOP_KNEE - 90) * f), 'r');
const u1 = rise(0.25, 80), u2 = rise(0.5, 72), u3 = rise(0.78, 64, true), top = rise(1, 64, true);
// left foot steps up beside the right; stand tall
const sw1 = F.rootY(sp([XF - 4, 80, 4], { r: flat(XF, HALF), l: flat(BX + 30, -HALF, { lift: 10, w: 0 }) }, -2), 10, 'r');
const sw2 = F.rootY(sp([XF - 3, 80, 3], { r: flat(XF, HALF), l: flat(XF - 6, -HALF, { lift: 3, w: 0 }) }, -1), 8, 'r');
const stand = F.rootY(sp([XF - 3, 85, 0], { r: flat(XF, HALF), l: flat(XF, -HALF) }), 4, 'r');
const poses = { kneel: P(kneel, ['r', 'l']), r1lift: P(r1lift, ['l']), r15: P(r15, ['l']), r2swing: P(r2swing, ['l']), r3pre: P(r3pre, ['l']), half: P(half, ['l']),
  u1: P(u1), u2: P(u2), u3: P(u3), top: P(top), sw1: P(sw1), sw2: P(sw2), stand: P(stand) };
const seq = [[0, 'kneel'], [0.8, 'kneel'], [1.02, 'r1lift'], [1.2, 'r15'], [1.38, 'r2swing'], [1.65, 'r3pre'], [1.85, 'half'], [2.05, 'half'], [2.35, 'u1'], [2.65, 'u2'], [2.95, 'u3'], [3.2, 'top'],
  [3.4, 'sw1'], [3.6, 'sw2'], [3.8, 'stand'], [4.8, 'stand'], [5.0, 'sw2'], [5.2, 'sw1'], [5.45, 'top'], [5.75, 'u3'], [6.1, 'u2'], [6.45, 'u1'], [6.8, 'half'], [7.0, 'half'],
  [7.2, 'r3pre'], [7.42, 'r2swing'], [7.6, 'r15'], [7.78, 'r1lift'], [8.0, 'kneel'], [8.8, 'kneel']];
const keyframes = seq.map(([t, pose]) => ({ t, pose }));
const ex = { schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props: [B.heldProp('r', 'goblet', OFF)], contacts,
  timeline: meta.timeline, poses, keyframes, activation: meta.activation, guides: meta.guides, checks: meta.checks };
ex.exercise.reference.note = 'Reference used only to identify the movement. No GymVisual media is stored here; this rig, model and animation are original.';
// whole loop: floor, planted-contact slides (lunge report uses the family contacts; the tuck contacts are checked here)
const rep = F.report(ex);
let tuckSlide = 0, dorsiMax = -99, kneeFloorMin = 99;
{ const tl = L.R.buildTimeline(ex); for (let i = 0; i <= 800; i++) { const t = (i / 800) * ex.timeline.duration, pz = tl.pose(t), W = L.R.evalPose(L.rig, pz, contacts);
  for (const s of ['r', 'l']) { const k = pz.ik[`tuck_${s}`]; if (k.weight >= 0.999) tuckSlide = Math.max(tuckSlide, L.V.len(L.V.sub(W[`ankle_${s}`].p, k.target))); kneeFloorMin = Math.min(kneeFloorMin, K.kneeLow(W, s)); }
  for (const c of contacts) { const k = pz.ik[c.id]; if (!k || k.weight < 0.5) continue; const s = c.id.slice(-1), d = 90 - L.V.angle(L.V.sub(W[`knee_${s}`].p, W[`ankle_${s}`].p), L.V.sub(W[`toe_${s}`].p, W[`ankle_${s}`].p)); dorsiMax = Math.max(dorsiMax, d); } } }
const db = B.dbLoop(ex, [{ side: 'r', grip: 'goblet', offset: OFF }], ['chest', 'pecs', 'abdomen', 'ribcage', 'thigh', 'quad', 'head', 'jaw']);
const Wk = L.fk(poses.kneel, contacts), Wh = L.fk(poses.half, contacts), Ws = L.fk(poses.stand, contacts);
const set = (p, f, v) => { const k = ex.exercise.kinematics.find((x) => x.measure.startsWith(p)); if (!k) throw new Error(p); k[f] = v; };
set('Kneeling', 'setup', `Tall kneeling: knees ${2 * HALF} cm apart, hips ${Math.round(poses.kneel.ch.hip_r.flex)}° (thighs about vertical), toes tucked`); set('Kneeling', 'peak', `Half-kneeling: front knee ≈${Math.round(F.kneeOf(Wh, 'r'))}°, rear knee ≈${Math.round(F.kneeOf(Wh, 'l'))}° on the floor`);
set('Front knee', 'setup', `≈${Math.round(F.kneeOf(Wh, 'r'))}° in half-kneeling`); set('Front knee', 'peak', `≈${Math.round(F.kneeOf(Ws, 'r'))}° standing`);
set('Trunk', 'setup', `≈${Math.round(F.trunkLean(Wk))}° from vertical kneeling`); set('Trunk', 'peak', `Up to ≈${Math.round(Math.max(...['u1', 'u2', 'u3'].map((k) => F.trunkLean(L.fk(poses[k], contacts)))))}° forward while driving up`);
set('Dumbbell', 'setup', 'Upright at the sternum, hands cupping the top plate'); set('Dumbbell', 'peak', `Clear of the chest and thighs (≥${db.dbClear} cm on the rig shapes)`);
set('Tempo', 'setup', 'Kneel 0.8 s'); set('Tempo', 'peak', '1.25 s step to half-kneeling, 1.75 s up and step in, 1 s standing, 3.2 s back down, 0.8 s kneeling');
console.log(`Dumbbell Kneeling Hold to Stand: kneel ${JSON.stringify(kneel.root)} half ${JSON.stringify(half.root)} top ${JSON.stringify(top.root)} stand ${JSON.stringify(stand.root)} wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}\n  tuckSlide ${tuckSlide.toFixed(3)} dorsiMax ${dorsiMax.toFixed(1)} kneeFloorMin ${kneeFloorMin.toFixed(2)} ${JSON.stringify(db)}`);
if (rep.slide > 0.05 || tuckSlide > 0.05) { console.error('FAIL: planted foot slides'); process.exitCode = 1; }
if (rep.floor < -0.5 || kneeFloorMin < -0.5) { console.error('FAIL: below the floor'); process.exitCode = 1; }
if (dorsiMax > 35) { console.error('FAIL: ankle dorsiflexion past the rig limit'); process.exitCode = 1; }
if (db.dbFloor < 0 || db.dbClear < -0.5) { console.error('FAIL: dumbbell passes through the body or the floor'); process.exitCode = 1; }
