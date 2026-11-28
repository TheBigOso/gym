// Band Incline Hammer Curl (GymVisual, Band Incline Hammer Curl; movement reference only, page not readable): seated on an
// adjustable bench with the back pad at 55 degrees, buttocks and upper back on the pad, feet flat (planted leg contacts).
// A power rack stands behind the bench, its uprights either side of it; one band per hand is looped low round the upright
// on that side, so each strand runs forward, up and in past the side of the back pad to the hand and resists the whole
// curl, as gravity does with a dumbbell. Arms hang straight down behind the trunk line with a neutral grip (palms facing
// in, thumbs forward); both arms curl with the upper arms kept back and the thumbs leading, short squeeze at the top, slow
// 2.5 s lower and a pause in the stretch. Bench, band and arm path as band-incline-biceps-curl with the forearms held in
// neutral (wrist pron 90). Bilateral.
const L = require('./lib');
const { V, r1 } = L;
const C = require('./families/b3-curls');
const D = require('./families/dumbbell');
const meta = require('./meta/band-incline-hammer-curl.json');
const BP = require('./families/b5-bandpull');
const CB = require('./families/eq-cable');

const ANGLE = 55, SEAT = 32, WIDTH = 28, HINGE_X = -20;
// Rig shapes rest on the seat and pad (rig v2 matches the skinned mesh, so no mesh offsets); env overrides for experiments
const OFF = { seatOff: +(process.env.SEAT_OFF ?? 0), lowOff: +(process.env.LOW_OFF ?? 0), upOff: +(process.env.UP_OFF ?? 0), headOff: +(process.env.HEAD_OFF ?? 0) };
const b = D.bench({ x: HINGE_X + SEAT / 2, seat: SEAT, height: 45, width: WIDTH, angle: ANGLE, back: 80 }), pad = C.padFrame(b, WIDTH);
const S = C.seatOnBench(b, pad, Object.assign({ stance: 17, footDX: 33, headOn: false }, OFF));
const { contacts } = S;
// head neutral to slightly tucked so the eyes look forward-up rather than at the ceiling (it lifts off the pad a little)
S.pose.ch.neck_c7 = { rot: 0, flex: 2 }; S.pose.ch.head_c1 = { rot: 0, flex: 14 };
const arm = (a) => ({ plane: a.plane, elev: a.elev, axial: (a.twist || 0) - a.plane, flex: a.flex, pron: a.pron });
const BOT = { plane: -60, elev: 40, flex: 5, pron: 90, twist: 0 };
// the humerus turns out a little (twist -20) so the forearm path clears the front of the thigh near the hip
const TOP = { plane: -60, elev: 31, flex: 128, pron: 90, twist: +(process.env.TW ?? -20) };
const SQZ = Object.assign({}, TOP, { flex: 130, elev: 30 });
const mk = (a) => { const p = L.clone(S.pose); C.setArm(p, 'r', arm(a)); C.setArm(p, 'l', arm(a)); return p; };
const poses = { bottom: mk(BOT), up50: mk(C.mixArm(BOT, TOP, 0.5)), top: mk(TOP), squeeze: mk(SQZ), down66: mk(C.mixArm(BOT, TOP, 0.66)), down33: mk(C.mixArm(BOT, TOP, 0.33)) };
const ph = (id) => C.phase(meta, id);
const keyframes = [{ t: 0, pose: 'bottom' }, { t: ph('lift').start, pose: 'bottom' }, { t: 1.4, pose: 'up50' }, { t: ph('hold').start, pose: 'top' }, { t: ph('hold').end, pose: 'squeeze' },
  { t: 3.1, pose: 'down66' }, { t: 3.95, pose: 'down33' }, { t: ph('lower').end, pose: 'bottom' }, { t: meta.timeline.duration, pose: 'bottom' }];
// bands: looped low round the rack uprights behind the bench, one strand forward to each hand
const Wh = L.fk(poses.bottom, contacts), padTopX = b.prop.center[0] - b.prop.size[0] / 2 - 80 * Math.cos(ANGLE * Math.PI / 180);
const RK = BP.rackPair({ x: r1(Math.min(padTopX, Wh.head_c1.p[0]) - +(process.env.BACK ?? 22)), y: +(process.env.AY ?? 12), width: +(process.env.RW ?? 120), behind: true }), STR = BP.pairStrands(RK.anchors);
const props = [b.prop, RK.rack, ...RK.bands];
const ex = C.assemble(meta, { contacts, poses, keyframes, props });
const seatBox = { center: b.prop.center, size: b.prop.size };
const rep = C.loopCheck(ex, { benchBox: seatBox });
// arms clear of the pad over the loop; strands clear of the body (feet and hands skipped) and of the seat and pad
const tl = L.R.buildTimeline(ex); let padArm = 1e9;
for (let i = 0; i <= 300; i++) { const W = L.R.evalPose(L.rig, tl.pose((i / 300) * meta.timeline.duration), contacts); for (const s of ['r', 'l']) padArm = Math.min(padArm, C.armPadClearance(W, s, pad)); }
const BB = require('./families/b3-back'), boxes = BB.benchBoxes(b);
let strandBox = { d: 1e9 };
const sc = BP.scan(ex, { strands: STR, probe: (W, pz, t) => { for (const [a, c] of STR(W)) for (let k = 0; k <= 40; k++) { const p = V.lerp(a, c, k / 40); for (const bx of boxes) { const d = BB.boxDist(p, bx) - 0.6; if (d < strandBox.d) strandBox = { d: +d.toFixed(2), box: bx.id, t: +t.toFixed(2) }; } } } });
BP.gate('band-incline-hammer-curl', sc, { minLine: 0.3 });
CB.limits(poses);
const Wb = L.fk(poses.bottom, contacts), Wt = L.fk(poses.squeeze, contacts);
C.fillCurlKin(ex, Wb, Wt, poses.bottom, poses.squeeze, 'r', ['Arms hanging 0.8 s', '1.2 s up, 0.3 s squeeze, 2.5 s down, 1.2 s pause in the stretch']);
const trunk = V.angle(V.sub(Wb.neck_c7.p, Wb.pelvis.p), [0, 1, 0]);
C.setKin(ex, 'Back pad angle', 'setup', `${ANGLE}° from the floor (trunk line ≈${Math.round(trunk)}° back from vertical)`);
C.setKin(ex, 'Back pad angle', 'peak', 'Unchanged (the trunk stays on the pad)');
const bandRow = ex.exercise.kinematics.find((k) => k.measure === 'Band'); if (!bandRow) throw new Error('no Band row');
bandRow.setup = `One band per hand, looped round the rack uprights behind the bench, ${RK.anchors.r[1]} cm off the floor and ${2 * RK.anchors.r[2]} cm apart; strands ${sc.strand[0]} cm with the arms hanging`; bandRow.peak = `Strand ${sc.strand[1]} cm at the top of the curl`;
const kneeOf = (W, s) => 180 - V.angle(V.sub(W[`hip_${s}`].p, W[`knee_${s}`].p), V.sub(W[`ankle_${s}`].p, W[`knee_${s}`].p));
console.log(`Band Incline Hammer Curl: wrote ${L.write(ex)}\n  ${JSON.stringify(Object.assign(rep, { padArm, knee: Math.round(kneeOf(Wb, 'r')), trunk: +trunk.toFixed(1) }))}\n  ${JSON.stringify(sc)} strandBox ${JSON.stringify(strandBox)}`);
if (rep.slide > 0.05) { console.error('FAIL: planted foot slides'); process.exitCode = 1; }
if (rep.body.d < 0 || padArm < 0) { console.error('FAIL: arm passes into the body or the bench'); process.exitCode = 1; }
if (strandBox.d < 0.3) { console.error(`FAIL: band through the bench ${JSON.stringify(strandBox)}`); process.exitCode = 1; }
