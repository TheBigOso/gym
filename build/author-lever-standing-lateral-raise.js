// Lever Standing Lateral Raise (GymVisual; movement reference only, the page could not be read): standing facing a
// lateral raise machine with the chest on its pad, feet planted (prop kind 'lever_machine' with params.axis 'x',
// src/gear/g3-machines-frontal.js: each lever turns about a fore-aft axle lined up with its shoulder joint; the lever arm
// runs behind the athlete's arm and carries a pad on the outside of the upper arm above the elbow). Elbows bent 90
// degrees, forearms pointing forward; the upper arms rise in the frontal plane from near the sides to about shoulder
// height and lower under control. Bilateral, arms posed directly (shoulder elevation in the frontal plane).
// Family build/families/gear-g3m.js (frontal helpers).
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const C = require('./families/eq-cable');
const CH = require('./families/b3-chest');
const EQ = require('./families/equip');
const GL = require('./families/gear-lever');
const G3 = require('./families/gear-g3m');
const meta = require('./meta/lever-standing-lateral-raise.json');

const EL0 = 16, EL1 = 86, N = 6, PAD = 5;
const st = L.POSES.standing({ stance: 12, toeOut: 6 });
const base = clone(st.pose);
base.ch.neck_c7 = { rot: 0, flex: 0 }; base.ch.head_c1 = { rot: 0, flex: 2 };
const at = (el) => { const p = clone(base); p.ch.shoulder_r = { plane: 0, elev: r1(el), axial: 0 }; p.ch.elbow_r = { flex: 90 }; p.ch.wrist_r = { pron: 90, flex: 0, dev: 0 }; return C.mirrorArm(p); };
const W0 = L.fk(at(EL0), st.contacts), S = W0.shoulder_r.p;
// pad on the outside of the upper arm, 86% of the way to the elbow
const T = 0.86, ap = V.add(S, V.scale(V.sub(W0.elbow_r.p, S), T)), ad = V.norm(V.sub(W0.elbow_r.p, S)), out = V.norm([0, ad[2], -ad[1]]);
const r = 20 - Math.min(...['upperarm_r', 'biceps_r', 'deltoid_r'].map((id) => EQ.pointShape(W0, V.add(ap, V.scale(out, 20)), id)));
const off = r1(r + PAD / 2 + 0.3), end = V.add(ap, V.scale(out, off)).map(r1);
// chest pad in front of the sternum
let fx = S[0]; const cy = S[1] - 18; for (let x = S[0] - 10; x < S[0] + 40; x += 0.25) { if (['ribcage', 'chest', 'pecs_r', 'pecs_l', 'abdomen'].every((id) => EQ.pointShape(W0, [x, cy, 0], id) > 0.2)) { fx = x; break; } }
const tilt = r1((Math.atan2(ad[2], -ad[1]) * 180) / Math.PI);
const mk = (range) => G3.fmachine({ pivot: [r1(S[0] - 14), r1(S[1]), r1(S[2])], end, endKind: 'pad', endSize: [10, 14, PAD], endRot: [-tilt, 0, 0], follow: { joints: ['shoulder_r', 'elbow_r'], t: T, off }, range,
  pads: [{ c: [r1(fx + 4), r1(cy), 0], size: [8, 30, 30], kind: 'box', post: true }], frame: { x: r1(fx + 28) } });
const M1 = mk([-179, 179]), A1 = r1(G3.frAngleOf(M1, L.fk(at(EL1), st.contacts), 'r'));
const M = mk(G3.rangeOf(0, A1, 4));
// path f = 0 turnaround (arms up) ... 1 start (arms down)
const path = []; for (let i = 0; i <= N; i++) { const f = i / N; path.push({ f, pose: at(EL1 + (EL0 - EL1) * f) }); }
const { poses, keyframes } = CH.repKeys(path, CH.phaseT(meta), null);
const ex = H.module_(meta, st.contacts, poses, keyframes);
ex.props = [M.prop];
const rep = G3.frTrack(ex, M, { planted: ['leg_r', 'leg_l'] });
GL.gate('lever-standing-lateral-raise', rep, { maxOffArc: 0.6 });
C.limits(ex.poses);
const Wd = L.fk(poses.top, st.contacts), Wu = L.fk(poses.bottom, st.contacts), set = H.setKin(ex), d = G3.deg;
const abd = (W) => V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), [0, -1, 0]);
set('Shoulder abduction', 'setup', `Upper arms ${d(abd(Wd))} from the sides`); set('Shoulder abduction', 'peak', `${d(abd(Wu))}, about level with the shoulders`);
set('Elbow', 'setup', `${d(C.elbowAng(Wd))}, forearms forward`); set('Elbow', 'peak', 'Unchanged');
set('Lever', 'setup', `Axles level with the shoulder joints (y ${M.P.pivot[1]}, z ±${M.P.pivot[2]} cm), pads on the outside of the arms`); set('Lever', 'peak', `Levers turn ${Math.abs(A1)}°; pads within ${Math.max(rep.arms.arm_r.offArc, rep.arms.arm_l.offArc)} cm of the arms`);
set('Tempo', 'setup', 'Pause 0.5 s with the arms down'); set('Tempo', 'peak', '1.3 s up, 0.5 s hold, 2 s down');
G3.fillDash(ex);
console.log(`Lever Standing Lateral Raise: wrote ${L.write(ex)}\n  pivot ${M.P.pivot} end ${end} A1 ${A1}\n  ${JSON.stringify({ floor: rep.floor, slide: rep.slide, arms: rep.arms, clear: rep.clear })}`);
