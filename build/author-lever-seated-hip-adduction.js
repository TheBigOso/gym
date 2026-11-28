// Lever Seated Hip Adduction (GymVisual; movement reference only, the page could not be read): seated hip adduction
// machine (prop kind 'lever_machine', type hip_adduction: two lever arms on vertical axles), back on the pad, hands on the
// side handles, knees bent about 90 degrees. Each axle is put under its hip joint, so the pad on the inside of the knee and
// the footrest under the foot turn with the thigh about the hip and never slide. From the legs open about 35 degrees each
// side the knees squeeze together, hold, and open under control. Bilateral, no planted contacts.
// Family build/families/gear-lever.js (as the abduction demo), gear-g3m.js.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const C = require('./families/eq-cable');
const EQ = require('./families/equip');
const GL = require('./families/gear-lever');
const G3 = require('./families/gear-g3m');
const meta = require('./meta/lever-seated-hip-adduction.json');

const ABD0 = 35, ABD1 = 4, PAD_T = 5;
const M0 = GL.machine('hip_adduction');
const st = GL.seated(M0, { knee: 90, dorsi: 0, thighRise: 0, abd: ABD1 });
const base = clone(st.pose);
base.ch.hip_r.rot = 0; base.ch.hip_l = clone(base.ch.hip_r);
base.ch.neck_c7 = { rot: 0, flex: 2 }; base.ch.head_c1 = { rot: 0, flex: 4 };
const hs = G3.handsOnSide(base, [], { dx: 6, z: 25, top: GL.seatTop(M0) });
const armed = hs.pose, grip = hs.grip;
// fitted at the closed position: pads on the insides of the knees, footrests under the feet, axles under the hips
const Wa = L.fk(armed), hip = Wa.hip_r.p, kn = Wa.knee_r.p;
const kneeIn = r1(-Math.min(...['thigh_r', 'shank_r', 'quad_r'].map((id) => EQ.pointShape(Wa, V.add(kn, [0, 0, -20]), id) - 20)) + PAD_T / 2 + 0.3);
const dir = V.norm([kn[0] - hip[0], 0, kn[2] - hip[2]]), padC = V.add(kn, V.scale([dir[2], 0, -dir[0]], kneeIn));
const footY = r1(H.bottomOf(Wa, 'foot_r')), foot = Wa.ankle_r.p;
const M = GL.machine('hip_adduction', {
  pivot: [r1(hip[0]), 0, r1(hip[2])], end: padC.map(r1), armY: r1(footY - 6), follow: { joints: ['hip_r', 'knee_r'], t: 1, off: -kneeIn }, range: [-38, 8],
  endSize: [22, 20, PAD_T], armPads: [{ c: [r1(foot[0] + 4), r1(footY - 1.5), r1(foot[2])], size: [26, 3, 12] }], pads: G3.sideBars(grip),
});
const at = (a) => { const p = clone(armed); p.ch.hip_r.abd = a; p.ch.hip_l.abd = a; return p; };
const poses = { open: at(ABD0), closed: at(ABD1) };
const keyframes = [{ t: 0, pose: 'open' }, { t: 0.5, pose: 'open' }, { t: 1.7, pose: 'closed' }, { t: 2.3, pose: 'closed' }, { t: 4.6, pose: 'open' }, { t: 5.0, pose: 'open' }];
const ex = H.module_(meta, [], poses, keyframes);
ex.props = [M.prop, ...GL.handProps()];
const rep = GL.track(ex, M, { partSkip: { seat: /^(hand|thumb|forearm)_/, back: /^(hand|thumb|forearm)_/, 'arm_r:pad0:end': /^(hand|thumb)_/, 'arm_l:pad0:end': /^(hand|thumb)_/ } });
GL.gate('lever-seated-hip-adduction', rep, { maxOffArc: 0.6 });
C.limits(ex.poses);
const Wo = L.fk(poses.open), Wc = L.fk(poses.closed), set = H.setKin(ex), d = G3.deg;
const kneeGap = (W) => r1(W.knee_r.p[2] - W.knee_l.p[2]);
set('Hip abduction', 'setup', `${d(ABD0)} each side, knees ${kneeGap(Wo)} cm apart`); set('Hip abduction', 'peak', `${d(ABD1)} each side, knees ${kneeGap(Wc)} cm apart`);
set('Hip flexion', 'setup', `${d(armed.ch.hip_r.flex)}, knees ${d(H.kneeOf(Wc, 'r'))}`); set('Hip flexion', 'peak', 'Unchanged');
set('Lever', 'setup', `Axles under the hips (${M.P.pivot[0]}, ±${M.P.pivot[2]} cm), pads inside the knees`); set('Lever', 'peak', `Arms turn ${r1(rep.arms.arm_r.range[1] - rep.arms.arm_r.range[0])}°; pads within ${rep.arms.arm_r.offArc} cm of the knees' arc`);
set('Muscles', 'setup', '–'); set('Muscles', 'peak', 'Adductors working hardest near the closed position (illustrative)');
set('Tempo', 'setup', 'Pause 0.5 s open'); set('Tempo', 'peak', '1.2 s in, 0.6 s hold, 2.3 s out');
console.log(`Lever Seated Hip Adduction: wrote ${L.write(ex)}\n  pivot ${M.P.pivot} end ${M.P.end} kneeIn ${kneeIn}\n  ${JSON.stringify({ floor: rep.floor, arms: rep.arms, clear: rep.clear })}`);
