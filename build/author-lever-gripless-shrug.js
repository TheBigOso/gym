// Lever Gripless Shrug (GymVisual; movement reference only, the page could not be read): standing under a plate-loaded
// gripless shrug machine (prop kind 'lever_machine', type calf_raise re-fitted: one lever from a pivot behind the athlete,
// a yoke behind the neck carrying a pad on top of each shoulder, plates on the horn), feet planted, arms hanging relaxed.
// The shoulder blades lift straight up toward the ears against the pads, hold, and lower to a full stretch; the lever
// follows the midpoint of the shoulders (the pivot is put on the circle through the pad positions at the bottom and top).
// Bilateral. Family build/families/gear-lever.js, gear-g3m.js.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const C = require('./families/eq-cable');
const CH = require('./families/b3-chest');
const EQ = require('./families/equip');
const GL = require('./families/gear-lever');
const G3 = require('./families/gear-g3m');
const meta = require('./meta/lever-gripless-shrug.json');

const EL0 = -6, EL1 = 24, N = 4, BACK = 15;
const st = L.POSES.standing({ stance: 12, toeOut: 6 });
const base = clone(st.pose);
base.ch.neck_c7 = { rot: 0, flex: 2 }; base.ch.head_c1 = { rot: 0, flex: 2 };
base.ch.shoulder_r = { plane: 10, elev: 6, axial: 0 }; base.ch.elbow_r = { flex: 8 }; base.ch.wrist_r = { pron: 70, flex: 0, dev: 0 }; C.mirrorArm(base);
const at = (e) => { const p = clone(base); p.ch.sc_r = { protract: 0, elevate: r1(e) }; p.ch.sc_l = clone(p.ch.sc_r); p.ch.shoulder_r.elev = r1(Math.max(0, 6 - 0.25 * (e - EL0))); p.ch.shoulder_l.elev = p.ch.shoulder_r.elev; return p; };
const W0 = L.fk(at(EL0), st.contacts), W1 = L.fk(at(EL1), st.contacts), S = W0.shoulder_r.p, mid = (W) => V.scale(V.add(W.shoulder_r.p, W.shoulder_l.p), 0.5);
// pad tops on the trapezius ridge (z 14) above each shoulder
const PZ = 14, topAt = (W) => { const p = [W.shoulder_r.p[0], W.shoulder_r.p[1] + 40, PZ]; return W.shoulder_r.p[1] + 40 - Math.min(...['traps_r', 'deltoid_r', 'neck'].map((id) => EQ.pointShape(W, p, id))); };
const up = r1(topAt(W0) - S[1] + 3.3); // shoulder joint -> pad centre height
const follow = { joints: ['shoulder_r'], t: 0, off: 0, shift: [-BACK, up, 0] };
const E0 = V.add(mid(W0), [-BACK, up, 0]), E1 = V.add(mid(W1), [-BACK, up, 0]);
const M0 = GL.machine('calf_raise'), pv = GL.pivotThrough(M0, E0, E1, 75, 1);
const pads = (W) => [PZ, -PZ].map((z) => ({ c: [r1(W.shoulder_r.p[0]), r1(W.shoulder_r.p[1] + up), z], size: [16, 6, 12] }));
const mk = (range) => GL.machine('calf_raise', { pivot: pv.pivot, end: E0.map(r1), armZ: 0, endKind: 'pad', endSize: [6, 6, 42], follow, range, pads: [], armPads: pads(W0), load: 'plates', plateAt: 0.45, columns: [[r1(pv.pivot[0] - 4), 30]] });
const A1 = r1(GL.angleOf(mk([-179, 179]), W1, 'arm'));
const M = mk(G3.rangeOf(0, A1, 4));
const path = []; for (let i = 0; i <= N; i++) { const f = i / N; path.push({ f, pose: at(EL1 + (EL0 - EL1) * f) }); }
const { poses, keyframes } = CH.repKeys(path, CH.phaseT(meta), null);
const ex = H.module_(meta, st.contacts, poses, keyframes);
ex.props = [M.prop];
const rep = GL.track(ex, M, { planted: ['leg_r', 'leg_l'], skip: /^(hand|thumb)_/ });
GL.gate('lever-gripless-shrug', rep, { maxOffArc: 0.6, minClear: -1.5 });
C.limits(ex.poses);
const set = H.setKin(ex), d = G3.deg, rise = r1(W1.shoulder_r.p[1] - W0.shoulder_r.p[1]);
set('Shoulder blade elevation', 'setup', `Lowered (elevate ${EL0})`); set('Shoulder blade elevation', 'peak', `Raised (elevate ${EL1}); shoulders up ${rise} cm`);
set('Arms', 'setup', 'Hanging relaxed, no grip'); set('Arms', 'peak', 'Unchanged');
set('Lever', 'setup', `Pivot ${r1(S[0] - M.P.pivot[0])} cm behind the shoulders; pads on the trapezius`); set('Lever', 'peak', `Lever turns ${Math.abs(A1)}°; pads within ${G3.offArcOf(rep)} cm of the shoulders`);
set('Tempo', 'setup', 'Pause 0.5 s at the bottom'); set('Tempo', 'peak', '1.3 s up, 0.5 s hold, 2 s down');
G3.fillDash(ex);
console.log(`Lever Gripless Shrug: wrote ${L.write(ex)}\n  pivot ${M.P.pivot} end ${M.P.end} A1 ${A1} rise ${rise}\n  ${JSON.stringify({ floor: rep.floor, slide: rep.slide, arms: rep.arms, clear: rep.clear })}`);
