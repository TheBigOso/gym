// Lever Chest Press (GymVisual, Lever Chest Press; movement reference only, the page was not opened): seated on a
// selectorized chest press (prop kind 'lever_machine', type chest_press, iso-lateral: one lever arm per side), back on
// the 10 degree pad, feet flat (planted leg contacts). The arms hang from a pivot above the athlete, so the horizontal
// handles ride on an arc: from beside the chest they travel forward and a little up to the arms extended. Palms down
// (pronated). Bilateral: right arm solved on the arc, left mirrored. Family build/families/gear-lever.js (seat placement,
// pivot through two hand positions, arm solve along the arc, lever tracking, clearance).
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const C = require('./families/eq-cable');
const EQ = require('./families/equip');
const CH = require('./families/b3-chest');
const GL = require('./families/gear-lever');
const meta = require('./meta/lever-chest-press.json');

// 1) seat on the default machine (seat 46 cm, back pad 10 degrees), feet flat
const M0 = GL.machine('chest_press');
const st = GL.seated(M0, { feet: 'floor', knee: 90, stance: 16, footAhead: 6 });
const base = clone(st.pose);
base.ch.sc_r = { protract: 0, elevate: -2 }; base.ch.sc_l = clone(base.ch.sc_r);
base.ch.neck_c7 = { rot: 0, flex: 0 }; base.ch.head_c1 = { rot: 0, flex: 6 }; // head on the line of the trunk, eyes ahead
const W0 = L.fk(base, st.contacts), S = W0.shoulder_r.p, Fr = CH.trunkFrame(W0);
// 2) the handle arc: beside the chest (G0) to arms extended (G1), handles 5 cm outside the shoulders; the pivot sits on
// the arc's centre 90 cm away, above the athlete
const z = r1(S[2] + 5), G0 = [r1(S[0] + 22), r1(S[1] - 12), z], G1 = [r1(S[0] + 56), r1(S[1] - 10), z];
const pv = GL.pivotThrough(M0, G0, G1, 90, 1);
const M = GL.machine('chest_press', { pivot: pv.pivot, end: pv.end, range: [-10, 35] });
const A1 = r1(GL.G.leverAngle(M.P, M.arms[0], M.toLocal(G1)));
const NK = 8, angs = Array.from({ length: NK + 1 }, (_, i) => r1(A1 * Math.sin((i / NK) * Math.PI / 2))); // denser near the extended arms (the elbow changes fastest there)
// 3) right arm on the handle at each lever angle, left mirrored
const palm = V.norm(V.add(V.scale(Fr.u, -1), V.scale(Fr.v, 0.2)));
const path = GL.armOnArc(base, st.contacts, M, angs, { palm, elbow0: V.add(S, V.scale(CH.upperArmDir(Fr, 50, 30), L.UA)), elbow1: V.add(S, V.scale(V.norm(V.sub(V.add(G1, [0, -6, 0]), S)), L.UA)), wElbow: 0.5 }).map((k) => ({ f: k.f, pose: C.mirrorArm(CH.strip(k.pose)) }));
const T = CH.phaseT(meta);
const { poses, keyframes } = CH.repKeys(path, T, null);
const ex = H.module_(meta, st.contacts, poses, keyframes);
ex.props = [M.prop, ...GL.handProps()];
// 4) checks: the handles stay in the hands (off-arc), clearance of seat / back / arms, feet, floor, joint limits
const rep = GL.track(ex, M, { planted: ['leg_r', 'leg_l'], partSkip: { seat: /^(hand|thumb|forearm)_/, back: /^(hand|thumb|forearm)_/ } });
GL.gate('lever-chest-press', rep, { maxOffArc: 0.6 });
C.limits(ex.poses);
const Wt = L.fk(poses.top, st.contacts), Wb = L.fk(poses.bottom, st.contacts), set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Elbow flexion', 'setup', `${d(C.elbowAng(Wt))} with the arms extended`); set('Elbow flexion', 'peak', `${d(C.elbowAng(Wb))} with the hands beside the chest`);
set('Elbow flare', 'setup', '–'); set('Elbow flare', 'peak', `${d(CH.elbowFlare(Wb))} from the trunk at the chest`);
set('Grip', 'setup', `Palms down, handles ${r1(2 * z)} cm apart (fixed by the machine)`); set('Grip', 'peak', 'Unchanged');
set('Lever', 'setup', `Pivot ${M.P.pivot[1]} cm high, ${r1(M.P.pivot[0] - S[0])} cm ahead of the shoulders; arm 90 cm`); set('Lever', 'peak', `Lever swings ${A1}°; hands within ${Math.max(rep.arms.arm_r.offArc, rep.arms.arm_l.offArc)} cm of the handle arc`);
set('Trunk', 'setup', `Back on the ${M.P.back.angle}° pad`); set('Trunk', 'peak', 'Unchanged');
set('Seat', 'setup', `Seat ${GL.seatTop(M)} cm, knees ${d(H.kneeOf(Wt, 'r'))}, feet flat`); set('Seat', 'peak', 'Unchanged');
set('Tempo', 'setup', 'Pause 0.5 s with the arms extended'); set('Tempo', 'peak', '2 s back, 0.3 s pause, 1.3 s press');
console.log(`Lever Chest Press: wrote ${L.write(ex)}\n  fit ${JSON.stringify(st.fit)} pivot ${M.P.pivot} end ${M.P.end} A1 ${A1} elbow ${r1(C.elbowAng(Wb))}..${r1(C.elbowAng(Wt))}\n  ${JSON.stringify({ floor: rep.floor, slide: rep.slide, arms: rep.arms, clear: rep.clear })}`);
