// Lever Seated Hip Abduction (GymVisual, Lever Seated Hip Abduction; movement reference only, the page was not opened):
// seated on a selectorized hip abduction machine (prop kind 'lever_machine', type hip_abduction: two lever arms on
// vertical axles, axis 'y'), back on the pad, hands on the side handles, knees bent about 90 degrees. Each arm's axle is
// put under its hip joint, so the knee pad (on the outside of the knee) and the footrest (under the foot) turn with the
// thigh about the hip and never slide. From the knees together both thighs open to about 35 degrees, hold, and close
// under control. Bilateral, no planted contacts (the feet ride on the arms' footrests).
// Family build/families/gear-lever.js (seat placement, lever tracking, clearance).
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const C = require('./families/eq-cable');
const EQ = require('./families/equip');
const GL = require('./families/gear-lever');
const meta = require('./meta/lever-seated-hip-abduction.json');

const ABD0 = 2, ABD1 = 35, PAD_T = 5;
// 1) seat on the default machine, knees 90, thighs level
const M0 = GL.machine('hip_abduction');
const st = GL.seated(M0, { knee: 90, dorsi: 0, thighRise: 0, abd: ABD0 });
const base = clone(st.pose);
base.ch.hip_r.rot = 0; base.ch.hip_l = clone(base.ch.hip_r);
base.ch.neck_c7 = { rot: 0, flex: 2 }; base.ch.head_c1 = { rot: 0, flex: 4 };
const W0 = L.fk(base);
// 2) hands on the side handles beside the hips
const G = [r1(W0.hip_r.p[0] + 6), r1(GL.seatTop(M0) + 6), 25];
const armed = C.armR(base, [], { grip: G, axis: [1, 0, 0], guess: { plane: 10, elev: 15, axial: 0, pron: 90, flex: 20 } });
C.mirrorArm(armed); delete armed.__err;
const Wa = L.fk(armed), grip = EQ.gripPoint(Wa, 'r').p;
// 3) the machine fitted to the athlete: axles under the hip joints, knee pads touching the outside of the knees, a
// footrest under each foot (carried by the arm), side handles where the hands are
const hip = Wa.hip_r.p, kn = Wa.knee_r.p;
const kneeOut = r1(-Math.min(...['thigh_r', 'shank_r', 'quad_r'].map((id) => EQ.pointShape(Wa, V.add(kn, [0, 0, 20]), id) - 20)) + PAD_T / 2 + 0.3); // knee half-width + half the pad
const dir = V.norm([kn[0] - hip[0], 0, kn[2] - hip[2]]), padC = V.add(kn, V.scale([-dir[2], 0, dir[0]], kneeOut));
const footY = r1(H.bottomOf(Wa, 'foot_r')), foot = Wa.ankle_r.p;
const M = GL.machine('hip_abduction', {
  pivot: [r1(hip[0]), 0, r1(hip[2])], end: padC.map(r1), armY: r1(footY - 6), follow: { joints: ['hip_r', 'knee_r'], t: 1, off: kneeOut }, range: [-50, 8],
  endSize: [22, 20, PAD_T], armPads: [{ c: [r1(foot[0] + 4), r1(footY - 1.5), r1(foot[2])], size: [26, 3, 12] }],
  pads: [{ c: [r1(grip[0]), r1(grip[1]), r1(grip[2])], size: [22, 1.6], kind: 'bar', rot: [0, 90, 0] }, { c: [r1(grip[0]), r1(grip[1]), -r1(grip[2])], size: [22, 1.6], kind: 'bar', rot: [0, 90, 0] }],
});
// 4) keys: hip abduction only
const at = (a) => { const p = clone(armed); p.ch.hip_r.abd = a; p.ch.hip_l.abd = a; return p; };
const poses = { closed: at(ABD0), open: at(ABD1) };
const keyframes = [{ t: 0, pose: 'closed' }, { t: 0.5, pose: 'closed' }, { t: 1.7, pose: 'open' }, { t: 2.3, pose: 'open' }, { t: 4.6, pose: 'closed' }, { t: 5.0, pose: 'closed' }];
const ex = H.module_(meta, [], poses, keyframes);
ex.props = [M.prop, ...GL.handProps()];
// 5) checks: pads stay on the knees and under the feet (off-arc, clearance), seat / back, joint limits, floor
const rep = GL.track(ex, M, { partSkip: { seat: /^(hand|thumb|forearm)_/, back: /^(hand|thumb|forearm)_/, 'arm_r:pad0:end': /^(hand|thumb)_/, 'arm_l:pad0:end': /^(hand|thumb)_/ } });
GL.gate('lever-seated-hip-abduction', rep, { maxOffArc: 0.6 });
C.limits(ex.poses);
const Wc = L.fk(poses.closed), Wo = L.fk(poses.open), set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
const kneeGap = (W) => r1(W.knee_r.p[2] - W.knee_l.p[2]);
set('Hip abduction', 'setup', `${d(ABD0)} each side, knees ${kneeGap(Wc)} cm apart`); set('Hip abduction', 'peak', `${d(ABD1)} each side, knees ${kneeGap(Wo)} cm apart`);
set('Hip flexion', 'setup', `${d(armed.ch.hip_r.flex)}, knees ${d(H.kneeOf(Wc, 'r'))}`); set('Hip flexion', 'peak', 'Unchanged');
set('Lever', 'setup', `Axles under the hips (${M.P.pivot[0]}, ±${M.P.pivot[2]} cm)`); set('Lever', 'peak', `Arms turn ${-rep.arms.arm_r.range[0]}°; pads within ${rep.arms.arm_r.offArc} cm of the knees' arc`);
set('Muscles', 'setup', '–'); set('Muscles', 'peak', 'Gluteus medius working hardest at the open position (illustrative)');
set('Tempo', 'setup', 'Pause 0.5 s with the knees together'); set('Tempo', 'peak', '1.2 s out, 0.6 s hold, 2.3 s back');
console.log(`Lever Seated Hip Abduction: wrote ${L.write(ex)}\n  fit ${JSON.stringify(st.fit)} pivot ${M.P.pivot} end ${M.P.end} kneeOut ${kneeOut}\n  ${JSON.stringify({ floor: rep.floor, arms: rep.arms, clear: rep.clear })}`);
