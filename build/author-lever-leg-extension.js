// Lever Leg Extension (GymVisual, Lever Leg Extension; movement reference only, the page was not opened): seated on a
// selectorized leg extension machine (prop kind 'lever_machine', type leg_extension), back on the pad, hands on the side
// handles. The machine's lever pivot is put on the knee joint axis, so the roller pad on the front of the lower shins
// swings about the knee with the shins and never slides. From the knees at about 90 degrees both legs straighten to
// nearly straight, squeeze, and lower under control. Bilateral, no planted contacts (the feet are off the floor).
// Family build/families/gear-lever.js (seat placement, pivot alignment, lever tracking, clearance).
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const C = require('./families/eq-cable');
const EQ = require('./families/equip');
const GL = require('./families/gear-lever');
const meta = require('./meta/lever-leg-extension.json');

const KNEE0 = 90, KNEE1 = 8, ROLLER_T = 0.8, ROLLER_R = 5;
// 1) seat the athlete on the default machine (seat 46 cm, back pad 10 degrees)
const M0 = GL.machine('leg_extension');
const st = GL.seated(M0, { knee: KNEE0, dorsi: 2, thighRise: 2 });
const base = clone(st.pose);
base.ch.neck_c7 = { rot: 0, flex: 2 }; base.ch.head_c1 = { rot: 0, flex: 4 }; // looking ahead, not up
const W0 = L.fk(base);
// 2) hands on the side handles beside the hips (handles run fore-aft)
const G = [r1(W0.hip_r.p[0] + 8), r1(GL.seatTop(M0) + 6), 24];
const armed = C.armR(base, [], { grip: G, axis: [1, 0, 0], guess: { plane: 10, elev: 15, axial: 0, pron: 90, flex: 20 } });
C.mirrorArm(armed); delete armed.__err;
const Wa = L.fk(armed), grip = EQ.gripPoint(Wa, 'r').p;
// 3) the machine fitted to the athlete: lever pivot on the knee axis, roller on the front of the lower shin at the bottom,
// side handles where the hands are; the roller reaches across both shins from the arm on the right side
const knee = GL.kneeAxis(Wa), shinOff = r1(EQ.pointShape(Wa, V.add(Wa.knee_r.p, V.scale(V.sub(Wa.ankle_r.p, Wa.knee_r.p), ROLLER_T)), 'shank_r') * -1 + ROLLER_R + 0.3);
const follow = { joints: ['knee_r', 'ankle_r'], t: ROLLER_T, off: shinOff };
const tgt0 = (() => { const a = Wa.knee_r.p, b = Wa.ankle_r.p, p = V.add(a, V.scale(V.sub(b, a), ROLLER_T)); const d = V.norm([b[0] - a[0], b[1] - a[1], 0]); return V.add(p, [-d[1] * shinOff, d[0] * shinOff, 0]); })();
const M = GL.machine('leg_extension', {
  pivot: [r1(knee[0]), r1(knee[1]), 0], end: [r1(tgt0[0]), r1(tgt0[1]), 0], armZ: 27, endSize: [40, ROLLER_R], follow, range: [-5, 100],
  pads: [{ c: [r1(grip[0]), r1(grip[1]), r1(grip[2])], size: [22, 1.6], kind: 'bar', rot: [0, 90, 0] }, { c: [r1(grip[0]), r1(grip[1]), -r1(grip[2])], size: [22, 1.6], kind: 'bar', rot: [0, 90, 0] }],
});
// 4) keys: knee flexion only (the ankles stay a little dorsiflexed)
const at = (k, dorsi) => { const p = clone(armed); p.ch.knee_r = { flex: k }; p.ch.knee_l = { flex: k }; p.ch.ankle_r = { dorsi }; p.ch.ankle_l = { dorsi }; return p; };
const poses = { bottom: at(KNEE0, 2), top: at(KNEE1, 8) };
const keyframes = [{ t: 0, pose: 'bottom' }, { t: 0.5, pose: 'bottom' }, { t: 1.7, pose: 'top' }, { t: 2.3, pose: 'top' }, { t: 4.6, pose: 'bottom' }, { t: 5.0, pose: 'bottom' }];
const ex = H.module_(meta, [], poses, keyframes);
ex.props = [M.prop, ...GL.handProps()];
// 5) checks: lever tracking (the roller stays on the shin: off-arc distance), clearance of the roller and the pads,
// joint limits, floor
const rep = GL.track(ex, M, { partSkip: { seat: /^(hand|thumb|forearm)_/, back: /^(hand|thumb|forearm)_/ } });
GL.gate('lever-leg-extension', rep, { maxOffArc: 0.6 });
C.limits(ex.poses);
const Wt = L.fk(poses.top), Wb = L.fk(poses.bottom), set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Knee flexion', 'setup', `${d(H.kneeOf(Wb, 'r'))} at the bottom`); set('Knee flexion', 'peak', `${d(H.kneeOf(Wt, 'r'))} at the top`);
set('Knee axis', 'setup', `Lever pivot on the knee joint (${M.P.pivot[0]}, ${M.P.pivot[1]} cm)`); set('Knee axis', 'peak', `Knee joint still; roller within ${rep.arms.arm.offArc} cm of its arc`);
set('Roller', 'setup', `On the front of the shins, ${Math.round(ROLLER_T * 100)}% of the way from knee to ankle`); set('Roller', 'peak', `Lever ${rep.arms.arm.range[1]}° up at the top`);
set('Hip', 'setup', `Seated, back on the ${M.P.back.angle}° pad, hips ${d(base.ch.hip_r.flex)}`); set('Hip', 'peak', 'Unchanged');
set('Knee load', 'setup', '–'); set('Knee load', 'peak', 'Highest near straight legs (open chain)');
set('Tempo', 'setup', 'Pause 0.5 s with the knees bent'); set('Tempo', 'peak', '1.2 s up, 0.6 s squeeze, 2.3 s down');
console.log(`Lever Leg Extension: wrote ${L.write(ex)}\n  fit ${JSON.stringify(st.fit)} pivot ${M.P.pivot} end ${M.P.end} off ${shinOff}\n  ${JSON.stringify({ floor: rep.floor, arms: rep.arms, clear: rep.clear })}`);
