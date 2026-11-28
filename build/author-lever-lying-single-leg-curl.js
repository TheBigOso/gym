// Lever Lying Single Leg Curl (GymVisual; movement reference only, the page could not be read): face down on a lying leg
// curl machine (prop kind 'lever_machine', type leg_curl_lying: a prone bench, a lever on the knee axis with a heel
// roller), knees just off the end of the pad, hands on the front handles beside the pad. The lever pivot is put on the
// right knee joint axis and the roller (short, right leg only) behind the right lower calf, so it swings with the shin and
// never slides. The right knee curls from nearly straight to about 115 degrees and lowers; the left leg stays long on the
// pad. Authored on the right side (the player mirrors it). Family build/families/gear-lever.js, gear-g3m.js.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const C = require('./families/eq-cable');
const EQ = require('./families/equip');
const GL = require('./families/gear-lever');
const G3 = require('./families/gear-g3m');
const meta = require('./meta/lever-lying-single-leg-curl.json');

const KNEE0 = 6, KNEE1 = 115, ROLLER_T = 0.84, ROLLER_R = 5, TOP = 72, FRONT = ['ribcage', 'pelvis', 'thigh_r', 'thigh_l', 'abdomen', 'chest'].filter((id) => L.rig.shapes.find((s) => s.id === id));
const up = [0, 1, 0];
const body = (y, x = 0) => {
  const p = clone(L.POSES.standing({ stance: 9, toeOut: 0 }).pose); delete p.ik;
  p.root.pos = [x, y, 0]; p.root.rot = { pitch: -90 };
  for (const j of ['spine_l5', 'spine_t12', 'spine_t6']) p.ch[j] = { rot: 0, flex: 0, latFlex: 0 };
  p.ch.neck_c7 = { rot: 0, flex: -14 }; p.ch.head_c1 = { rot: 0, flex: -12 };
  for (const s of ['r', 'l']) { p.ch[`hip_${s}`] = { flex: 0, abd: 0, rot: 0 }; p.ch[`knee_${s}`] = { flex: KNEE0 }; p.ch[`ankle_${s}`] = { dorsi: -20 }; }
  return p;
};
// root height: the front of the trunk and thighs rests on the pad (0.3 cm proud)
let lo = TOP, hi = TOP + 40;
for (let i = 0; i < 40; i++) { const y = (lo + hi) / 2, W = L.fk(body(y)); if (Math.min(...FRONT.map((id) => GL.planeClear(W, id, up, TOP))) > 0.3) hi = y; else lo = y; }
let base = body(r1((lo + hi) / 2 * 10) / 10);
const W0 = L.fk(base), kneeX = W0.knee_r.p[0];
// hands on the front handles beside the pad, below its edge
const S = W0.shoulder_r.p, G = [r1(S[0] + 22), r1(TOP - 10), 24];
const armed = C.armR(base, [], { grip: G, axis: [0, 0, 1], palm: [0, 0, -1], wPalm: 0.5, guess: { plane: 90, elev: 120, axial: 0, pron: 90, flex: 60 } });
C.mirrorArm(armed); delete armed.__err;
const Wa = L.fk(armed), grip = EQ.gripPoint(Wa, 'r').p;
// lever on the right knee axis, roller behind the right lower calf
const knee = GL.kneeAxis(Wa), sp = V.add(Wa.knee_r.p, V.scale(V.sub(Wa.ankle_r.p, Wa.knee_r.p), ROLLER_T));
const calfOff = r1(-EQ.pointShape(Wa, V.add(sp, [0, 30, 0]), 'shank_r') + 30 + ROLLER_R + 0.3);
const follow = { joints: ['knee_r', 'ankle_r'], t: ROLLER_T, off: -calfOff };
const tgt0 = (() => { const a = Wa.knee_r.p, b = Wa.ankle_r.p, p = V.add(a, V.scale(V.sub(b, a), ROLLER_T)); const d = V.norm([b[0] - a[0], b[1] - a[1], 0]); return V.add(p, [d[1] * calfOff, -d[0] * calfOff, 0]); })();
const benchX0 = r1(kneeX + 4), seat = { x: r1(benchX0 + 60), y: TOP, d: 120, w: 34, t: 9 };
const M = GL.machine('leg_curl_lying', {
  pivot: [r1(knee[0]), r1(knee[1]), 0], end: [r1(tgt0[0]), r1(tgt0[1]), r1(Wa.ankle_r.p[2])], arms: 'split', only: 'r', armZ: 24, endSize: [18, ROLLER_R], follow, range: [-120, 5], seat,
  stack: { x: r1(benchX0 + 135), z: 0, h: 110 },
  pads: [{ c: [r1(grip[0]), r1(grip[1]), r1(grip[2])], size: [14, 1.6], kind: 'bar', rot: [0, 90, 0], post: false }, { c: [r1(grip[0]), r1(grip[1]), -r1(grip[2])], size: [14, 1.6], kind: 'bar', rot: [0, 90, 0], post: false }],
});
const at = (k) => { const p = clone(armed); p.ch.knee_r = { flex: k }; return p; };
const poses = { ext: at(KNEE0), curled: at(KNEE1) };
const keyframes = [{ t: 0, pose: 'ext' }, { t: 0.5, pose: 'ext' }, { t: 1.7, pose: 'curled' }, { t: 2.3, pose: 'curled' }, { t: 4.6, pose: 'ext' }, { t: 5.0, pose: 'ext' }];
const ex = H.module_(meta, [], poses, keyframes);
ex.props = [M.prop, ...GL.handProps()];
const rep = GL.track(ex, M, { partSkip: { seat: /^(hand|thumb|forearm|head|face|jaw|neck)_?/ } });
G3.gateArms('lever-lying-single-leg-curl', rep, { maxOffArc: 0.6, ignore: ['arm_l'], ignoreParts: [/^arm_l:/] });
C.limits(ex.poses);
const We = L.fk(poses.ext), Wc = L.fk(poses.curled), set = H.setKin(ex), d = G3.deg;
set('Knee flexion', 'setup', `${d(H.kneeOf(We, 'r'))} with the leg long`); set('Knee flexion', 'peak', `${d(H.kneeOf(Wc, 'r'))} at the top of the curl`);
set('Knee axis', 'setup', `Lever pivot on the right knee (${M.P.pivot[0]}, ${M.P.pivot[1]} cm)`); set('Knee axis', 'peak', `Roller within ${rep.arms.arm_r.offArc} cm of its arc`);
set('Roller', 'setup', `Behind the right calf, ${Math.round(ROLLER_T * 100)}% of the way from knee to ankle`); set('Roller', 'peak', `Lever ${-rep.arms.arm_r.range[0]}° up`);
set('Hip', 'setup', `Prone on the ${TOP} cm pad, hips extended; knees just off its end`); set('Hip', 'peak', 'Unchanged; left leg stays long');
set('Tempo', 'setup', 'Pause 0.5 s with the leg long'); set('Tempo', 'peak', '1.2 s up, 0.6 s squeeze, 2.3 s down');
G3.fillDash(ex);
console.log(`Lever Lying Single Leg Curl: wrote ${L.write(ex)}\n  pivot ${M.P.pivot} end ${M.P.end} off ${calfOff} grip ${armed.__err ? '' : r1(V.len(V.sub(grip, G)))}\n  ${JSON.stringify({ floor: rep.floor, arms: rep.arms, clear: rep.clear })}`);
