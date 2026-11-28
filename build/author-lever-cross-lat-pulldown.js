// Lever Cross Lat Pulldown (GymVisual; movement reference only, the page could not be read): seated, thighs under the
// roller, in a lever pulldown whose two arms swing in the frontal plane (prop kind 'lever_machine' with params.axis 'x',
// src/gear/g3-machines-frontal.js: each arm on a fore-aft axle above and outside its shoulder). The handles start high
// and close together over the head (almost crossing) and travel down and out on their arcs to beside the shoulders,
// palms forward, elbows driving down to the sides. Bilateral, right arm solved on the arc (sequential keys), left
// mirrored. Family build/families/gear-g3m.js (frontal helpers).
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const C = require('./families/eq-cable');
const CH = require('./families/b3-chest');
const GL = require('./families/gear-lever');
const G3 = require('./families/gear-g3m');
const meta = require('./meta/lever-cross-lat-pulldown.json');

const st = GL.seated(GL.machine('pulldown'), { feet: 'floor', knee: 90, stance: 16, footAhead: 6 });
const base = clone(st.pose);
base.ch.neck_c7 = { rot: 0, flex: 0 }; base.ch.head_c1 = { rot: 0, flex: 2 };
const W0 = L.fk(base, st.contacts), S = W0.shoulder_r.p;
const X = r1(S[0] + 5), G0 = [X, r1(S[1] + 1), r1(S[2] + 29)], G1 = [X, r1(S[1] + 53), 14];
const piv = G3.frPivotThrough(G0, G1, 140, 1);
const rollerY = r1(Math.max(W0.knee_r.p[1], W0.hip_r.p[1]) + 8.5 + 5.5);
const mk = (range) => G3.fmachine({ pivot: piv, end: G0, endKind: 'handles', endSize: [14, 1.8], endRot: [0, 0, 0], follow: { grip: 'handle' }, range,
  seat: { x: -8, y: 46, d: 40, w: 38, t: 8 }, pads: [{ c: [r1(W0.knee_r.p[0] - 10), rollerY, 0], size: [44, 11], kind: 'roller', post: true }], frame: { x: r1(S[0] - 30) }, stack: { x: r1(S[0] - 45), z: 0, h: 120 } });
const M1 = mk([-179, 179]), A1 = r1(G3.FG.frAngle(M1.P, G3.FG.frArms[0], G1));
const M = mk(G3.rangeOf(0, A1, 5));
const NK = 14, angs = Array.from({ length: NK + 1 }, (_, i) => r1((A1 * i) / NK));
const axisAt = (a) => { const t = (a * Math.PI) / 180; return [0, -Math.sin(t), Math.cos(t)]; };
const Fr = CH.trunkFrame(W0);
const d0 = V.norm([0.08, -0.55, 0.83]), d1 = V.norm(V.add(V.norm(V.sub(G1, S)), [0.05, 0, 0.45]));
const keys = angs.map((a, i) => ({ grip: G3.frEnd(M, 'r', a), axis: axisAt(a), elbow: V.add(S, V.scale(CH.slerpV(d0, d1, i / NK), L.UA)) }));
const arms = G3.armOnPath(base, st.contacts, keys, { palm: [1, 0, 0], wPalm: 0.2, wElbow: 1.2, consistent: true, g0: { plane: 0, elev: 45, axial: 0, pron: 90, flex: 115 } });
const path = arms.map((p, i) => ({ f: i / NK, pose: C.mirrorArm(CH.strip(p)) }));
const { poses, keyframes } = CH.repKeys(path, CH.phaseT(meta), null);
const ex = H.module_(meta, st.contacts, poses, keyframes);
ex.props = [M.prop, ...GL.handProps()];
const rep = G3.frTrack(ex, M, { planted: ['leg_r', 'leg_l'] });
GL.gate('lever-cross-lat-pulldown', rep, { maxOffArc: 0.8 });
C.limits(ex.poses);
const Wt = L.fk(poses.top, st.contacts), Wb = L.fk(poses.bottom, st.contacts), set = H.setKin(ex), d = G3.deg;
set('Elbow flexion', 'setup', `${d(C.elbowAng(Wt))} with the hands overhead`); set('Elbow flexion', 'peak', `${d(C.elbowAng(Wb))} with the hands beside the shoulders`);
set('Shoulder adduction', 'setup', `Hands ${r1(2 * G1[2])} cm apart overhead`); set('Shoulder adduction', 'peak', `Hands ${r1(2 * G0[2])} cm apart beside the shoulders`);
set('Grip', 'setup', 'Palms forward on horizontal handles'); set('Grip', 'peak', 'Handles tilt with the arms');
set('Lever', 'setup', `Axles ${r1(piv[1] - S[1])} cm above and ${r1(piv[2] - S[2])} cm outside the shoulders`); set('Lever', 'peak', `Arms swing ${Math.abs(A1)}°; hands within ${Math.max(rep.arms.arm_r.offArc, rep.arms.arm_l.offArc)} cm of the arc`);
set('Tempo', 'setup', 'Pause 0.5 s with the arms long'); set('Tempo', 'peak', '1.3 s down, 0.4 s squeeze, 2 s up');
G3.fillDash(ex);
console.log(`Lever Cross Lat Pulldown: wrote ${L.write(ex)}\n  pivot ${piv} A1 ${A1} grip ${arms.worstGrip}\n  ${JSON.stringify({ floor: rep.floor, slide: rep.slide, arms: rep.arms, clear: rep.clear })}`);
