// Lever Kneeling Twist (GymVisual; movement reference only, the page could not be read): kneeling tall on a pad facing a
// rotary torso lever (prop kind 'lever_machine', type hip_abduction re-fitted: one arm on a vertical axle hung from an
// overhead frame, lined up with the spine, a riser down to a pair of vertical handles in front of the chest). Hips square
// and still, arms held in front of the chest; the upper trunk turns about 40 degrees to the right (lumbar, lower and upper
// thoracic rotation) and back under control. The hands stay fixed to the trunk, so they turn about the spine line with the
// handles. Authored on the right side (the player mirrors it). Family build/families/gear-lever.js, gear-g3m.js.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const C = require('./families/eq-cable');
const CH = require('./families/b3-chest');
const EQ = require('./families/equip');
const GL = require('./families/gear-lever');
const G3 = require('./families/gear-g3m');
const meta = require('./meta/lever-kneeling-twist.json');

const PAD = 10, N = 6, ROT = [4, 18, 18], HZ = 13;
const body = (y) => {
  const p = clone(L.POSES.standing({ stance: 11, toeOut: 0 }).pose); delete p.ik;
  p.root.pos = [0, y, 0]; p.root.rot = { pitch: 0 };
  for (const j of ['spine_l5', 'spine_t12', 'spine_t6']) p.ch[j] = { rot: 0, flex: 0, latFlex: 0 };
  p.ch.neck_c7 = { rot: 0, flex: 0 }; p.ch.head_c1 = { rot: 0, flex: 2 };
  for (const s of ['r', 'l']) { p.ch[`hip_${s}`] = { flex: 2, abd: 3, rot: 0 }; p.ch[`knee_${s}`] = { flex: 90 }; p.ch[`ankle_${s}`] = { dorsi: -62 }; }
  return p;
};
let lo = 20, hi = 120;
for (let i = 0; i < 40; i++) { const y = (lo + hi) / 2, W = L.fk(body(y)); if (Math.min(...['shank_r', 'shank_l', 'calf_r', 'calf_l'].map((id) => GL.planeClear(W, id, [0, 1, 0], PAD))) > -1.2) hi = y; else lo = y; }
let base = body(r1(((lo + hi) / 2) * 10) / 10);
const W0 = L.fk(base), S = W0.shoulder_r.p, G = [r1(S[0] + 30), r1(S[1] - 16), HZ];
const q = C.armR(base, [], { grip: G, axis: [0, 1, 0], palm: [0, 0, -1], wPalm: 1, guess: { plane: 80, elev: 70, axial: 0, pron: 90, flex: 60 } });
base = C.mirrorArm(CH.strip(q)); delete base.__err;
const at = (f) => { const p = clone(base); ['spine_l5', 'spine_t12', 'spine_t6'].forEach((j, i) => { p.ch[j].rot = r1(ROT[i] * f); }); p.ch.neck_c7.rot = r1(6 * f); return p; };
const Wa = L.fk(base), gp = V.scale(V.add(EQ.gripPoint(Wa, 'r').p, EQ.gripPoint(Wa, 'l').p), 0.5), spine = Wa.spine_t12.p;
const mk = (range) => GL.machine('hip_abduction', { arms: 'single', pivot: [r1(spine[0]), 245, 0], armY: 212, end: [r1(gp[0]), r1(gp[1]), 0], handleZ: HZ, endKind: 'handles', endSize: [14, 1.6], endRot: [90, 0, 0], follow: { grip: 'handle' }, range,
  seat: null, back: null, stack: null, pads: [{ c: [r1(W0.knee_r.p[0] - 26), PAD / 2, 0], size: [64, PAD, 46], kind: 'box' }], columns: [[r1(spine[0] - 40), 0]] });
const Wt = L.fk(at(1)), A1 = r1(GL.angleOf(mk([-179, 179]), Wt, 'arm'));
const M = mk(G3.rangeOf(0, A1, 4));
const path = []; for (let i = 0; i <= N; i++) { const f = i / N; path.push({ f, pose: at(1 - f) }); }
const { poses, keyframes } = CH.repKeys(path, CH.phaseT(meta), null);
const ex = H.module_(meta, [], poses, keyframes);
ex.props = [M.prop, ...GL.handProps()];
const rep = GL.track(ex, M, { partSkip: { pad0: /^(foot|toe)_/ } });
GL.gate('lever-kneeling-twist', rep, { maxOffArc: 0.8 });
C.limits(ex.poses);
const set = H.setKin(ex), d = G3.deg, tr = ROT.reduce((a, b) => a + b, 0);
set('Trunk rotation', 'setup', 'Facing forward'); set('Trunk rotation', 'peak', `${d(tr)} to the right (lumbar ${ROT[0]}°, thoracic ${ROT[1] + ROT[2]}°)`);
set('Pelvis', 'setup', `Kneeling tall on the ${PAD} cm pad, hips square`); set('Pelvis', 'peak', 'Unchanged');
set('Arms', 'setup', `Hands on vertical handles ${2 * HZ} cm apart in front of the chest`); set('Arms', 'peak', 'Unchanged relative to the trunk');
set('Lever', 'setup', 'Axle above the head, lined up with the spine'); set('Lever', 'peak', `Arm turns ${Math.abs(A1)}°; handles within ${rep.arms.arm.offArc} cm of the hands`);
set('Tempo', 'setup', 'Pause 0.5 s facing forward'); set('Tempo', 'peak', '1.3 s across, 0.5 s hold, 2 s back');
G3.fillDash(ex);
console.log(`Lever Kneeling Twist: wrote ${L.write(ex)}\n  pivot ${M.P.pivot} end ${M.P.end} A1 ${A1} grip ${q.__err ? q.__err.grip : ''}\n  ${JSON.stringify({ floor: rep.floor, arms: rep.arms, clear: rep.clear })}`);
