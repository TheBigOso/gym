// Barbell Rear Delt Raise (GymVisual "Barbell Rear Delt Raise", movement reference only): feet hip width and planted, soft
// knees, hip hinge with a flat back until the trunk is about 18 degrees above level; wide overhand grip (hands well outside
// the shoulders). From straight arms hanging under the shoulders, the elbows lift out wide to the sides (upper arms about
// 80-90 degrees from the trunk) until they are level with the back, the forearms hanging about vertical and the bar rising
// toward the chest; the shoulder blades squeeze together; pause, lower slowly. The hinge is held still (balanced over
// mid-foot with the bar). Arms solved onto the bar (barbell.js armsOnBar) along an interpolated bar path with the elbows
// guided on their sphere from hanging to out wide.
const L = require('./lib');
const { V, Q, r1, clone } = L;
const { makeFamily } = require('./families/lunge');
const B = require('./families/b3-back');
const BB = require('./families/barbell');
const EQ = require('./families/equip');
const H = require('./families/hips');
const X = require('./families/b5-bbhinge');
const meta = require('./meta/barbell-rear-delt-raise.json');

const F = makeFamily({ toe: 6, half: 12 });
const feet = { r: { c: 'flat', x: 0 }, l: { c: 'flat', x: 0 } };
const KG = 15, PITCH = +(process.env.P ?? -78), KNEE = 24;
const PALM = [-1, 0, 0], THUMB = [0, 0, -1];   // overhand
const SC = [{ protract: 8, elevate: -1 }, { protract: -16, elevate: 1 }];
const UAL = V.len(L.rig.byId.elbow_r.offset) - 0.1;
// elbow at the top: out to the side, level with the back (a little toward the hips), on the upper-arm sphere
const TOP = { du: +(process.env.DU ?? 0), dz: +(process.env.DZ ?? 22.5) };
// grip width from the top position: hands under the elbows
const probe = B.hinge(F, { pitch: PITCH, knee: KNEE, feet, spine: { l5: -3, t12: 0, t6: 1 }, sc: SC[1], kg: KG, midfoot: 5, arms: (p) => B.mirrorArm(clone(p)) });
const E1p = X.elbowAt(probe.W, TOP.du, TOP.dz);
const GW = Math.round(2 * (E1p[2] - 0.5));
const st0 = {};
const base = B.hinge(F, { pitch: PITCH, knee: KNEE, feet, spine: { l5: -3, t12: 0, t6: 1 }, sc: SC[0], kg: KG, midfoot: 5,
  arms: (p) => X.hangBar(p, F.contacts, { gw: GW, palm: PALM, thumb: THUMB, clear: 2, state: st0, slack: 1.0 }) });
const P0 = base.pose, C0 = P0.__bar; delete P0.__bar;
const W0 = F.fk(P0);
const state = { guess: st0.guess, keep: true };
const FAL = L.FA;
function at(f) {
  const g = f * f * (3 - 2 * f) * 0.4 + f * 0.6;
  const p = clone(P0);
  p.ch.sc_r = { protract: r1(SC[0].protract + (SC[1].protract - SC[0].protract) * g), elevate: r1(SC[0].elevate + (SC[1].elevate - SC[0].elevate) * g) }; p.ch.sc_l = clone(p.ch.sc_r);
  const W = L.fk(p, F.contacts), S = W.shoulder_r.p;
  const E1 = X.elbowAt(W, TOP.du, TOP.dz), dHang = V.norm(V.sub(W0.elbow_r.p, W0.shoulder_r.p));   // elbow direction in the hang
  const E = V.add(S, V.scale(X.slerpV(dHang, V.sub(E1, S), g), UAL));
  // top bar centre: hands hang under the elbows (forearms vertical); between: blend from the hang
  const C1 = [E1[0] + 2, E1[1] - (FAL + 3.2), 0];
  const c = V.lerp(C0, C1, g);
  return X.barArms(p, c, GW, { palm: PALM, thumb: THUMB, elbow: E, elbowW: 0.8, dirW: 0.6, wristW: 0.3 }, state);
}
const FS = [0, 0.08, 0.15, 0.22, 0.3, 0.37, 0.45, 0.52, 0.6, 0.7, 0.8, 0.9, 1], N = FS.length - 1;
const poses = {};
for (let i = 0; i <= N; i++) poses[`r${i}`] = B.wrapPose(at(FS[i]));
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, [p.start, p.end]])), D = meta.timeline.duration;
const keyframes = [{ t: 0, pose: 'r0' }, ...X.eased('r', FS, ph.raise[0], ph.raise[1]), ...X.eased('r', FS, ph.lower[0], ph.lower[1], true), { t: D, pose: 'r0' }];
const ex = H.module_(meta, F.contacts, poses, keyframes);
ex.props = [BB.barbellProp()];
const sw = BB.sweep(ex, { fixed: ['ankle_r', 'ankle_l', 'pelvis'] });
const Wb = F.fk(poses.r0), Wt = F.fk(poses[`r${N}`]), bt = EQ.barAt(Wt, BB.GRIP);
const flare = (W) => V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), V.sub(W.neck_c7.p, W.pelvis.p));
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Trunk inclination', 'setup', `${d(90 - B.trunkLean(W0))} above level`); set('Trunk inclination', 'peak', 'Unchanged (held)');
set('Elbow flare', 'setup', `Arms hanging under the shoulders, overhand ${GW} cm grip (handle centres)`); set('Elbow flare', 'peak', `Upper arm ${d(flare(Wt))} from the trunk line (head direction), elbow ${r1(Wt.elbow_r.p[1] - Wt.shoulder_r.p[1])} cm from shoulder height`);
set('Elbow flexion', 'setup', d(B.elbowOf(Wb, 'r'))); set('Elbow flexion', 'peak', `${d(B.elbowOf(Wt, 'r'))}, forearms about vertical; shoulder blades retracted (clavicle protraction ${SC[0].protract}° to ${SC[1].protract}°)`);
set('Tempo', 'setup', `Hold ${ph.setup[1]} s`); set('Tempo', 'peak', `${r1(ph.raise[1] - ph.raise[0])} s up, ${r1(ph.squeeze[1] - ph.squeeze[0])} s squeeze, ${r1(ph.lower[1] - ph.lower[0])} s down, ${r1(D - ph.lower[1])} s reset`);
console.log(`Barbell Rear Delt Raise: wrote ${L.write(ex)}\n  trunk ${r1(90 - B.trunkLean(W0))} above level, GW ${GW}, elbow ${r1(B.elbowOf(Wb, 'r'))}->${r1(B.elbowOf(Wt, 'r'))}, flare ${r1(flare(Wt))}, elbow vs shoulder y ${r1(Wt.elbow_r.p[1] - Wt.shoulder_r.p[1])}, bar ${C0.map(r1)} -> ${bt.c.map(r1)}\n  sweep ${JSON.stringify(sw)} gripErr ${state.err.toFixed(2)} hangErr ${st0.err.toFixed(2)}`);
if (sw.widthRange > 1.0 || state.err > 0.5) { console.error('FAIL: hands do not stay on the bar at a constant grip width'); process.exitCode = 1; }
if (sw.barFloor < 0 || sw.barBody < -0.3) { console.error('FAIL: plates through the floor or bar through the body'); process.exitCode = 1; }
if (sw.slide > 0.05 || sw.drift > 0.05) { console.error('FAIL: planted feet move'); process.exitCode = 1; }
