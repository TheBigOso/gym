// Resistance Band Seated Biceps Curl (GymVisual #6607, Resistance Band Seated Biceps Curl; movement reference only, the page
// could not be read here, so the movement follows the name): sitting tall on the end of a flat bench (no back support),
// feet flat about hip width and well out in front (knees about 60 degrees, planted leg contacts) with the middle of the
// band under them, one end under the ball of each foot; with the shins sloping forward the strands run up in front of and
// outside the shins instead of through them. Arms hang beside the bench a little out from the sides, palms forward
// (supinated). Both arms curl together with the elbows by the sides, short squeeze at the top where the band is most
// stretched, slow 2.4 s lower to straight arms.
// The rig buttock shapes rest on the seat (rig v2 matches the drawn body, no mesh offset). Bilateral.
const L = require('./lib');
const { V, r1, clone } = L;
const C = require('./families/b3-curls');
const B = require('./families/b5-bandpull');
const CB = require('./families/eq-cable');
const F = require('./families/b6-11');
const meta = require('./meta/resistance-band-seated-biceps-curl.json');

const ENV = (k, d) => +(process.env[k] ?? d);
const SEAT_H = 45, BENCH = { id: 'bench', kind: 'bench', center: [-40, 0, 0], size: [110, SEAT_H, 30] };
const SEAT_END = BENCH.center[0] + BENCH.size[0] / 2;
const STANCE = ENV('STANCE', 10), FOOT_DX = ENV('FOOTDX', 56), BACK = ENV('BACK', 9);
const st = L.POSES.standing({ stance: STANCE, toeOut: 8 });
const contacts = st.contacts;
let p = clone(st.pose); delete p.ik;
Object.assign(p.ch, { spine_l5: { rot: 0, flex: -4, latFlex: 0 }, spine_t12: { rot: 0, flex: 0, latFlex: 0 }, spine_t6: { rot: 0, flex: 2, latFlex: 0 },
  hip_r: { flex: 88, abd: 6, rot: -4 }, hip_l: { flex: 88, abd: 6, rot: -4 }, knee_r: { flex: 90 }, knee_l: { flex: 90 }, sc_r: { protract: -3, elevate: 0 }, sc_l: { protract: -3, elevate: 0 },
  neck_c7: { rot: 0, flex: 2 }, head_c1: { rot: 0, flex: 2 } });
p.root.pos = [SEAT_END - BACK, 55, 0]; p.root.rot = { pitch: -4 };
const seatY = (W) => Math.min(...['buttock_r', 'buttock_l', 'pelvis'].map((id) => C.shapePlaneDist(W, id, [0, SEAT_H, 0], [0, 1, 0])));
p = L.solvePose(p, ['root.pos.1'], [(W) => [seatY(W) * 4]]).pose;
const W0 = L.fk(p);
p.ik = { leg_r: { target: [r1(W0.hip_r.p[0] + FOOT_DX), L.ANKLE_H, STANCE], weight: 1 }, leg_l: { target: [r1(W0.hip_r.p[0] + FOOT_DX), L.ANKLE_H, -STANCE], weight: 1 } };
const base = p;

// arm channels (axial = twist - plane keeps the elbow hinge sagittal); palms forward, elbows by the sides
const BOT = { plane: 25, elev: ENV('E0', 16), flex: 8, pron: 6 }, TOP = { plane: 85, elev: 17, flex: 133, pron: 0 };
const SQZ = Object.assign({}, TOP, { flex: 135, elev: 18 });
const mk = (a) => { const q = clone(base); for (const s of ['r', 'l']) C.setArm(q, s, { plane: a.plane, elev: a.elev, axial: -a.plane, flex: a.flex, pron: a.pron }); return q; };
const at = (f) => C.mixArm(BOT, TOP, f);
const poses = { bottom: mk(BOT), up25: mk(at(0.25)), up50: mk(at(0.5)), up75: mk(at(0.75)), top: mk(TOP), squeeze: mk(SQZ), down66: mk(at(0.66)), down33: mk(at(0.33)) };
const ph = (id) => C.phase(meta, id);
const keyframes = [{ t: 0, pose: 'bottom' }, { t: ph('lift').start, pose: 'bottom' }, { t: 0.95, pose: 'up25' }, { t: 1.2, pose: 'up50' }, { t: 1.48, pose: 'up75' }, { t: ph('top').start, pose: 'top' }, { t: ph('top').end, pose: 'squeeze' },
  { t: 2.9, pose: 'down66' }, { t: 3.7, pose: 'down33' }, { t: ph('lower').end, pose: 'bottom' }, { t: meta.timeline.duration, pose: 'bottom' }];
const ex = C.assemble(meta, { contacts, poses, keyframes, props: [BENCH, ...B.feetBands()] });
const rep = F.feetScan(ex);
// the hands and strands stay clear of the bench (box test on the strand samples and the grip points)
const tl = L.R.buildTimeline(ex); let boxC = 1e9;
const lo = [BENCH.center[0] - BENCH.size[0] / 2, 0, -BENCH.size[2] / 2], hi = [SEAT_END, SEAT_H, BENCH.size[2] / 2];
const boxD = (q) => { const c = q.map((v, i) => Math.max(lo[i], Math.min(hi[i], v))), d = V.len(V.sub(q, c)); return q.every((v, i) => v > lo[i] && v < hi[i]) ? -1 : d; };
for (let i = 0; i <= 300; i++) { const W = L.R.evalPose(L.rig, tl.pose((i / 300) * meta.timeline.duration), contacts); for (const [a, b] of B.feetStrands(W)) for (let k = 0; k <= 30; k++) boxC = Math.min(boxC, boxD(V.lerp(a, b, k / 30))); for (const s of ['r', 'l']) boxC = Math.min(boxC, boxD(L.fk(tl.pose((i / 300) * meta.timeline.duration), contacts)[`wrist_${s}`].p) - 4); }
B.gate('resistance-band-seated-biceps-curl', rep, { minLine: 0.3 });
if (boxC < 0.5) { console.error(`FAIL: hands or band into the bench (${boxC.toFixed(2)})`); process.exitCode = 1; }
CB.limits(poses);
const Wb = L.fk(poses.bottom, contacts), Wt = L.fk(poses.squeeze, contacts);
C.fillCurlKin(ex, Wb, Wt, poses.bottom, poses.squeeze, 'r', ['Arms straight 0.6 s', '1.2 s up, 0.3 s squeeze, 2.4 s down, 0.9 s at the bottom']);
F.bandRow(ex, `One band per hand, under the ball of each foot; strand ${rep.strand[0]} cm with the arms straight`, `Strand ${rep.strand[1]} cm at the top of the curl (most stretch, most tension)`);
const trunk = V.angle(V.sub(Wb.neck_c7.p, Wb.pelvis.p), [0, 1, 0]);
console.log(`Resistance Band Seated Biceps Curl: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} bench ${boxC.toFixed(2)} trunk ${r1(trunk)} seat ${seatY(Wb).toFixed(2)}`);
