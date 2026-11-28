// Lever Lying Crunch (GymVisual; movement reference only, the page could not be read): lying on a flat bench (lying base
// of the bench press: buttocks and back on the pad, knees bent, feet planted) under a lever crunch arm (prop kind
// 'lever_machine', type chest_press re-fitted: one lever, a pad on the upper chest with a handle each side). The upper
// back curls off the bench (thoracic and lumbar flexion, chin tucked) while the pelvis stays down; the lever follows the
// top of the sternum, its pivot put on the circle through the pad positions flat, half-way and curled. Hands on the
// handles beside the pad (right arm solved per key, left mirrored). Bilateral. Family gear-g3m.js, b3-chest.js.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const C = require('./families/eq-cable');
const CH = require('./families/b3-chest');
const EQ = require('./families/equip');
const GL = require('./families/gear-lever');
const G3 = require('./families/gear-g3m');
const meta = require('./meta/lever-lying-crunch.json');

const N = 6, HZ = 22, PADT = 4;
const b = CH.benchBase(0), contacts = b.contacts;
const flat = clone(b.base);
const at = (f) => { const p = clone(flat); p.ch.spine_l5 = { ...p.ch.spine_l5, flex: r1((p.ch.spine_l5.flex || 0) + 10 * f) }; p.ch.spine_t12 = { rot: 0, latFlex: 0, flex: r1(26 * f) }; p.ch.spine_t6 = { rot: 0, latFlex: 0, flex: r1(18 * f) }; p.ch.neck_c7 = { rot: 0, flex: r1(4 + 16 * f) }; p.ch.head_c1 = { rot: 0, flex: r1(4 + 10 * f) }; return p; };
const Wf = L.fk(at(0), contacts), Wm = L.fk(at(0.5), contacts), Wc = L.fk(at(1), contacts);
// pad on the top of the sternum: the C7 point moved out of the chest along the trunk normal
const CHEST = ['chest', 'ribcage', 'pecs_r', 'pecs_l'];
const nrm = (W) => { const d = V.norm(V.sub(W.spine_t6.p, W.neck_c7.p)); return [-d[1], d[0], 0]; }; // out of the chest (lever +off: 90 deg counter-clockwise from C7 -> T6)
const sp = V.add(Wf.neck_c7.p, V.scale(V.sub(Wf.spine_t6.p, Wf.neck_c7.p), 0.36));
const depth = 30 - Math.min(...CHEST.map((id) => EQ.pointShape(Wf, V.add(sp, V.scale(nrm(Wf), 30)), id)));
const off = r1(depth + PADT / 2 + 0.3), follow = { grip: null, joints: ['neck_c7', 'spine_t6'], t: 0.36, off }; // grip: null overrides the chest_press preset's grip follow
const padAt = (W) => { const a = W.neck_c7.p, c = W.spine_t6.p, p = V.add(a, V.scale(V.sub(c, a), 0.36)), d = V.norm([c[0] - a[0], c[1] - a[1], 0]); return V.add(p, [-d[1] * off, d[0] * off, 0]); };
const P0 = padAt(Wc), Pm = padAt(Wm), P1 = padAt(Wf), cc = G3.circle3(P0, Pm, P1);
const mk = (range) => GL.machine('chest_press', { arms: 'single', pivot: [r1(cc[0]), r1(cc[1]), 0], end: [r1(P0[0]), r1(P0[1]), 0], armZ: HZ + 8, handleZ: HZ, endKind: 'handles', endSize: [10, 1.6], endRot: [0, 90, 0], follow, range, seat: null, back: null, load: 'stack', stack: null,
  armPads: [{ c: [r1(P0[0]), r1(P0[1]), 0], size: [10, PADT, 26] }], columns: [[r1(cc[0]), 34]] });
const M1 = mk([-179, 179]), A1 = r1(GL.angleOf(M1, Wf, "arm"));
const M = mk(G3.rangeOf(0, A1, 4));
// hands on the handles at each key (handle points from the lever angle the player will show)
const fs = Array.from({ length: N + 1 }, (_, i) => i / N);
const bodies = fs.map((f) => at(1 - f)); // path order: f = 0 curled ... 1 flat
const keys = bodies.map((p) => { const W = L.fk(p, contacts), a = GL.angleOf(M, W, 'arm'), e = GL.endAt(M, 'arm', a); return { grip: [e[0], e[1], HZ], axis: V.norm(V.sub(GL.endAt(M, 'arm', a + 1), e)).map((v, i) => (i === 2 ? 0 : v)).map((v) => v) }; });
const arms = keys.map((k, i) => { const q = C.armR(bodies[i], contacts, { grip: k.grip, axis: [1, 0, 0], palm: [0, 0, -1], wPalm: 0.5, guess: { plane: 40, elev: 60, axial: 0, pron: 90, flex: 110 } }); return { f: fs[i], pose: C.mirrorArm(CH.strip(q)), err: q.__err.grip }; });
const { poses, keyframes } = CH.repKeys(arms, CH.phaseT(meta), null);
const ex = H.module_(meta, contacts, poses, keyframes);
ex.props = [b.B.prop, M.prop, ...GL.handProps()];
const rep = GL.track(ex, M, { planted: ['leg_r', 'leg_l'], skip: /^(hand|thumb|forearm)_/ });
GL.gate('lever-lying-crunch', rep, { maxOffArc: 0.8, minClear: -1.5 });
C.limits(ex.poses);
const set = H.setKin(ex), d = G3.deg, tf = (W) => V.angle(V.sub(W.neck_c7.p, W.pelvis.p), V.sub(Wf.neck_c7.p, Wf.pelvis.p));
set('Trunk flexion', 'setup', 'Flat on the bench'); set('Trunk flexion', 'peak', `Upper trunk curled ${d(tf(Wc))}; shoulder blades off the bench`);
set('Pelvis', 'setup', 'On the bench, feet flat'); set('Pelvis', 'peak', 'Unchanged');
set('Lever', 'setup', `Pivot ${r1(cc[2])} cm from the chest pad, level with the lower back`); set('Lever', 'peak', `Lever turns ${Math.abs(A1)}°; pad within ${rep.arms.arm.offArc} cm of the sternum`);
set('Tempo', 'setup', 'Pause 0.5 s flat'); set('Tempo', 'peak', '1.3 s up, 0.5 s hold, 2 s down');
G3.fillDash(ex);
console.log(`Lever Lying Crunch: wrote ${L.write(ex)}\n  pivot ${M.P.pivot} r ${r1(cc[2])} A1 ${A1} grip ${Math.max(...arms.map((a) => a.err))}\n  ${JSON.stringify({ floor: rep.floor, slide: rep.slide, arms: rep.arms, clear: rep.clear })}`);
