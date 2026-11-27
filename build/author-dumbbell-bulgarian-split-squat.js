// Dumbbell Bulgarian Split Squat (GymVisual #229012): the top of the left foot (laces) rests on the near end of a flat
// 45 cm bench behind, the right foot is planted about a leg length ahead, a dumbbell hangs in each hand at the sides. The
// pelvis drops until the front thigh is about parallel, then rises. Both feet stay planted (constant IK targets and foot
// orientations: the rear foot lies upside down along the bench pad). Authored right leg in front (the player mirrors).
const L = require('./lib');
const { R, V, Q, r1, clone } = L;
const H = require('./families/hips');
const B = require('./families/b3-legs');
const meta = require('./meta/dumbbell-bulgarian-split-squat.json');

const BENCH_H = 45, TOE = 6;
const REAR_PITCH = +(process.env.REAR_PITCH || 162);   // rear foot pitched over: toes back and a little down, laces on the pad
const FRONT_X = +(process.env.FRONT_X || 42), REAR_X = -42, Z = 9;
// contacts: front foot flat; rear foot laces down on the bench
const footQ = (pitch, yaw) => Q.mul(L.footRot(yaw), Q.axis([0, 0, 1], -pitch));
const contacts = [H.legC('r', { rot: footQ(0, -TOE) }), Object.assign(H.legC('l', { rot: footQ(REAR_PITCH, 0), id: 'bench_l', label: 'Left foot (on the bench)', pole: [1, -0.4, -0.1] }))];
const st = L.POSES.standing({ stance: Z, toeOut: TOE }).pose;
// rear ankle height: the lowest point of the pitched foot shape rests on the pad. The skinned foot sits about 0.6-0.8 cm higher
// than the rig ellipsoid in this orientation (measured over the pad with b2/scratch/legs/footmesh.mjs), so it is lowered by that.
const MESH_DORSUM = 0.6;
const REAR = (() => {
  const p = clone(st); p.ik = { bench_l: { target: [REAR_X, 50, -Z], weight: 1 } };
  const lp = H.lowPoint(L.fk(p, contacts), 'foot_l');
  return [REAR_X, r1(50 - (lp[1] - BENCH_H) - MESH_DORSUM), -Z];
})();
const FRONT = [FRONT_X, L.ANKLE_H, Z];
// bench: seat end toward the athlete, its near edge just behind the rear ankle (the front of the ankle overhangs the edge)
const EDGE_X = REAR_X - 3;
const benchProp = Object.assign(clone(meta.props.find((p) => p.kind === 'bench')), { center: [EDGE_X - 20, 0, 0], backSide: -1 });

const HANG = { out: 9 };
function pose(root, pitch) {
  let p = clone(st);
  p.root.pos = root.slice(); p.root.rot = { pitch };
  p.ch.spine_l5 = { rot: 0, flex: -2, latFlex: 0 }; p.ch.spine_t12 = { rot: 0, flex: 0, latFlex: 0 }; p.ch.spine_t6 = { rot: 0, flex: 1, latFlex: 0 };
  const lean = -pitch - 1; p.ch.neck_c7 = { rot: 0, flex: r1(-lean * 0.4) }; p.ch.head_c1 = { rot: 0, flex: r1(-lean * 0.45) };
  p.ik = { leg_r: { target: FRONT.slice(), weight: 1 }, bench_l: { target: REAR.slice(), weight: 1 } };
  p = B.armsHang(p, HANG); delete p.__armCost;
  p = H.fitLeg(p, 'r', contacts[0], FRONT, { rot: 0 });
  p = H.fitLeg(p, 'l', contacts[1], REAR, { rot: 0 });
  for (const j in p.ch) for (const c in p.ch[j]) if (typeof p.ch[j][c] === 'number') p.ch[j][c] = r1(L.wrap(p.ch[j][c]));
  return p;
}
const W = (p) => L.fk(p, contacts);
const kneeR = (p) => H.kneeOf(W(p), 'r');
// root height for a front-knee angle by bisection (knee flexion falls as the pelvis rises)
function rootFor(x, knee, pitch) {
  let a = 30, b = 105;
  for (let i = 0; i < 40; i++) { const y = (a + b) / 2; if (kneeR(pose([x, y, 0], pitch)) > knee) a = y; else b = y; }
  return r1((a + b) / 2);
}
// bottom: front knee about 95 (thigh about parallel), front shin about 10 degrees forward of vertical (root x by bisection)
const PITCH_TOP = +(process.env.PT || -8), PITCH_BOT = +(process.env.PB || -20), KNEE_BOT = 95, SHIN = 10;
const shinFwd = (p) => { const w = W(p); return Math.atan2(w.knee_r.p[0] - w.ankle_r.p[0], w.knee_r.p[1] - w.ankle_r.p[1]) / R.DEG; };
let xa = -20, xb = 40, XB = 0;
for (let i = 0; i < 30; i++) { XB = (xa + xb) / 2; if (shinFwd(pose([XB, rootFor(XB, KNEE_BOT, PITCH_BOT), 0], PITCH_BOT)) > SHIN) xb = XB; else xa = XB; }
XB = r1(XB);
const YB = rootFor(XB, KNEE_BOT, PITCH_BOT);
// top: the pelvis rises over about the same spot (a little back), front knee soft; the rear leg must still reach the bench
const XT = r1(XB - 3), KNEE_TOP = +(process.env.KNEE_TOP || 14), YT = rootFor(XT, KNEE_TOP, PITCH_TOP);
const at = (f) => pose([r1(XT + (XB - XT) * f), r1(YT + (YB - YT) * f), 0], r1(PITCH_TOP + (PITCH_BOT - PITCH_TOP) * f));
const poses = { top: at(0), d25: at(0.25), d50: at(0.5), d75: at(0.75), bottom: at(1), settle: at(0.985), r50: at(0.5) };
const keyframes = [{ t: 0, pose: 'top' }, { t: 0.8, pose: 'top' }, { t: 1.25, pose: 'd25' }, { t: 1.7, pose: 'd50' }, { t: 2.15, pose: 'd75' }, { t: 2.6, pose: 'bottom' },
  { t: 2.75, pose: 'settle' }, { t: 2.9, pose: 'bottom' }, { t: 3.45, pose: 'r50' }, { t: 4.0, pose: 'top' }, { t: 5.0, pose: 'top' }];
const ex = H.module_(meta, contacts, poses, keyframes);
ex.props = [benchProp, B.heldProp('r'), B.heldProp('l')];
const benchBox = { center: [EDGE_X - 60, 0, 0], size: [120, BENCH_H, 30] };
const HOLDS = [{ side: 'r', grip: 'handle' }, { side: 'l', grip: 'handle' }];
const db = B.dbLoop(ex, HOLDS, ['thigh', 'quad', 'buttock', 'pelvis', 'shank', 'calf', 'foot'], { box: benchBox });
// rear leg vs the bench: lowest point of the left shank/calf over the pad and the knee clearance from the bench end
let shinOverPad = 1e9, kneeY = 1e9;
const rep = H.loopReport(ex, { planted: ['leg_r', 'bench_l'], probe: (Wx) => {
  kneeY = Math.min(kneeY, Wx.knee_l.p[1]);
  for (let k = 0; k <= 10; k++) { const pnt = V.add(Wx.ankle_l.p, V.scale(V.sub(Wx.knee_l.p, Wx.ankle_l.p), k / 10)); if (pnt[0] < EDGE_X) shinOverPad = Math.min(shinOverPad, pnt[1] - (3.2 + 2 * k / 10) - BENCH_H); }
} });
const Wt = W(poses.top), Wb = W(poses.bottom);
const set = H.setKin(ex);
set('Bench height', 'setup', `${BENCH_H} cm flat bench, rear ankle ${r1(REAR[0] - EDGE_X)} cm past its near edge`); set('Bench height', 'peak', 'Rear foot (laces) stays on the pad');
set('Stance length', 'setup', `${FRONT_X - REAR_X} cm between ankle centres (${FRONT_X - EDGE_X} cm from the bench edge to the front ankle; rig leg length 90 cm hip to floor)`); set('Stance length', 'peak', 'Unchanged');
set('Front knee flexion', 'setup', `≈${Math.round(H.kneeOf(Wt, 'r'))}°`); set('Front knee flexion', 'peak', `≈${Math.round(H.kneeOf(Wb, 'r'))}°, shin ≈${Math.round(shinFwd(poses.bottom))}° forward of vertical`);
set('Rear knee', 'setup', `≈${Math.round(H.kneeOf(Wt, 'l'))}°`); set('Rear knee', 'peak', `≈${Math.round(H.kneeOf(Wb, 'l'))}°, ${r1(Wb.knee_l.p[1])} cm above the floor (knee joint centre)`);
const lean = (w) => V.angle(V.sub(w.neck_c7.p, w.pelvis.p), [0, 1, 0]);
set('Trunk inclination', 'setup', `≈${Math.round(lean(Wt))}°`); set('Trunk inclination', 'peak', `≈${Math.round(lean(Wb))}° forward`);
set('Tempo', 'setup', 'Hold 0.8 s'); set('Tempo', 'peak', '1.8 s down, 0.3 s pause, 1.1 s up, 1.0 s reset');
console.log(`Dumbbell Bulgarian Split Squat: rear ankle ${REAR}, root top [${XT},${YT}] bottom [${XB},${YB}], wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}\n  ${JSON.stringify(db)} shinOverPad ${r1(shinOverPad)} rearKneeMinY ${r1(kneeY)} hipL ${poses.top.ch.hip_l.flex}..${poses.bottom.ch.hip_l.flex} dorsiL ${r1(H.dorsiOf(Wt, 'l'))}..${r1(H.dorsiOf(Wb, 'l'))}`);
if (rep.slide > 0.05) { console.error('FAIL: planted foot slides'); process.exitCode = 1; }
if (db.dbFloor < 0 || db.dbClear < -0.5 || db.dbBox < 0) { console.error('FAIL: dumbbell passes through the legs, the bench or the floor'); process.exitCode = 1; }
