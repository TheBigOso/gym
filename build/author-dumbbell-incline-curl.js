// Dumbbell Incline Curl (GymVisual #031712): seated on an adjustable bench with the back pad at 55 degrees, buttocks and upper
// back on the pad, head neutral, feet flat. Arms hang straight down behind the trunk line, palms forward; both arms curl with
// the upper arms kept back, short squeeze, slow 2.5 s lower and a pause in the stretch. Bilateral.
const L = require('./lib');
const { V, r1 } = L;
const C = require('./families/b3-curls');
const D = require('./families/dumbbell');
const meta = require('./meta/dumbbell-incline-curl.json');

const ANGLE = 55, SEAT = 32, WIDTH = 28, HINGE_X = -20;
// Rig shapes rest on the seat and pad (rig v2 matches the skinned mesh, so no mesh offsets); env overrides for experiments
const OFF = { seatOff: +(process.env.SEAT_OFF ?? 0), lowOff: +(process.env.LOW_OFF ?? 0), upOff: +(process.env.UP_OFF ?? 0), headOff: +(process.env.HEAD_OFF ?? 0) };
const b = D.bench({ x: HINGE_X + SEAT / 2, seat: SEAT, height: 45, width: WIDTH, angle: ANGLE, back: 80 }), pad = C.padFrame(b, WIDTH);
const S = C.seatOnBench(b, pad, Object.assign({ stance: 17, footDX: 33, headOn: false }, OFF));
const { contacts } = S;
// head neutral to slightly tucked so the eyes look forward-up rather than at the ceiling (it lifts off the pad a little)
S.pose.ch.neck_c7 = { rot: 0, flex: 2 }; S.pose.ch.head_c1 = { rot: 0, flex: 14 };
const arm = (a) => ({ plane: a.plane, elev: a.elev, axial: (a.twist || 0) - a.plane, flex: a.flex, pron: a.pron });
const BOT = { plane: -60, elev: 40, flex: 5, pron: 8, twist: 0 };
// the humerus turns out a little (twist -20) so the forearm path clears the front of the thigh near the hip
const TOP = { plane: -60, elev: 31, flex: 128, pron: 0, twist: -20 };
const SQZ = Object.assign({}, TOP, { flex: 130, elev: 30 });
const mk = (a) => { const p = L.clone(S.pose); C.setArm(p, 'r', arm(a)); C.setArm(p, 'l', arm(a)); return p; };
const poses = { bottom: mk(BOT), up50: mk(C.mixArm(BOT, TOP, 0.5)), top: mk(TOP), squeeze: mk(SQZ), down66: mk(C.mixArm(BOT, TOP, 0.66)), down33: mk(C.mixArm(BOT, TOP, 0.33)) };
const ph = (id) => C.phase(meta, id);
const keyframes = [{ t: 0, pose: 'bottom' }, { t: ph('lift').start, pose: 'bottom' }, { t: 1.4, pose: 'up50' }, { t: ph('top').start, pose: 'top' }, { t: ph('top').end, pose: 'squeeze' },
  { t: 3.1, pose: 'down66' }, { t: 3.95, pose: 'down33' }, { t: ph('lower').end, pose: 'bottom' }, { t: meta.timeline.duration, pose: 'bottom' }];
const props = [b.prop, ...C.dumbbells(['r', 'l'])];
const ex = C.assemble(meta, { contacts, poses, keyframes, props });
const seatBox = { center: b.prop.center, size: b.prop.size };
const rep = C.loopCheck(ex, { benchBox: seatBox });
// pad clearance for the dumbbells and arms over the loop
const tl = L.R.buildTimeline(ex); let padDb = 1e9, padArm = 1e9;
for (let i = 0; i <= 300; i++) { const W = L.R.evalPose(L.rig, tl.pose((i / 300) * meta.timeline.duration), contacts); for (const s of ['r', 'l']) { padDb = Math.min(padDb, C.benchClearance(W, s, pad, seatBox)); padArm = Math.min(padArm, C.armPadClearance(W, s, pad)); } }
const Wb = L.fk(poses.bottom, contacts), Wt = L.fk(poses.squeeze, contacts);
C.fillCurlKin(ex, Wb, Wt, poses.bottom, poses.squeeze, 'r', ['Arms hanging 0.8 s', '1.2 s up, 0.3 s squeeze, 2.5 s down, 1.2 s pause in the stretch']);
const trunk = V.angle(V.sub(Wb.neck_c7.p, Wb.pelvis.p), [0, 1, 0]);
C.setKin(ex, 'Back pad angle', 'setup', `${ANGLE}° from the floor (trunk line ≈${Math.round(trunk)}° back from vertical)`);
C.setKin(ex, 'Back pad angle', 'peak', 'Unchanged (the trunk stays on the pad)');
const kneeOf = (W, s) => 180 - V.angle(V.sub(W[`hip_${s}`].p, W[`knee_${s}`].p), V.sub(W[`ankle_${s}`].p, W[`knee_${s}`].p));
const m = S.measure(Wb);
console.log(`Dumbbell Incline Curl: wrote ${L.write(ex)}\n  ${JSON.stringify(Object.assign(rep, { padDb, padArm, rig: m, knee: Math.round(kneeOf(Wb, 'r')), trunk: +trunk.toFixed(1), root: poses.bottom.root }))}`);
module.exports = { ex, b, pad, m };
if (rep.slide > 0.05) { console.error('FAIL: planted foot slides'); process.exitCode = 1; }
if (rep.body.d < 0 || rep.dbFloor < 0 || padDb < 0 || padArm < 0) { console.error('FAIL: dumbbell or arm passes into the body, the bench or the floor'); process.exitCode = 1; }
