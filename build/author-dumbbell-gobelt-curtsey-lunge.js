// Dumbbell Gobelt Curtsey Lunge (GymVisual "Dumbbell Gobelt Curtsey Lunge", movement reference only; the catalogue's
// spelling is kept in the id): a goblet curtsy lunge. Stand tall holding one dumbbell upright against the chest (both hands
// cupping the top plate, elbows down; b3-legs gobletArms); step the right foot back and across, landing on its ball behind and past the left heel, hips square
// to the front; bend both knees until the front (left) knee is about 90 degrees, then drive through the left heel and step
// the right foot back beside the left. The left foot stays planted all loop. Authored right leg stepping (the player mirrors).
// Built on the dumbbell curtsy lunge (batch 2 rear lunge, build/families/lunge.js).
const L = require('./lib');
const { r1, clone } = L;
const { makeFamily } = require('./families/lunge');
const B = require('./families/b3-legs');
const K = require('./families/b4-squats2');
const G = require('./families/b6-03');
const meta = require('./meta/dumbbell-gobelt-curtsey-lunge.json');

const F = makeFamily({ toe: 6, half: 9 });
const BX = -60, BZ = -27;          // right ball of the foot lands 60 cm behind and 18 cm past the left ankle (z -9)
const OFF = B.GOBLET_OFFSET;
const arms = (p) => { const q = B.gobletArms(p, { at: [25, 5, 5.4], elbow: [14, -16, 17], tilt: 0.45 }); delete q.__armCost; return G.posElev(q); };
const P = (s) => F.pose(Object.assign(clone(s), { arms }));
const flat = (x, z, o = {}) => Object.assign({ c: 'flat', x, z }, o);
const LEFT = flat(0, -9);
const stand = F.stand({ r: flat(0, 9), l: LEFT }, { knee: 4 });
// on the left foot while the right swings (root height from the left knee)
const onLeft = (rf, x, z, knee, pitch = -4) => F.rootY({ root: [x, 85, z], pitch, spine: { l5: -1, t12: 0, t6: 0 }, feet: { l: LEFT, r: rf } }, knee, 'l');
const split = (x, z, knee, pitch) => F.rootY({ root: [x, 80, z], pitch, spine: { l5: -2, t12: 0, t6: 0 }, feet: { l: LEFT, r: { c: 'ball', x: BX, z: BZ } } }, knee, 'l');
const base = (x, z, pitch) => ({ root: [x, 80, z], pitch, spine: { l5: -2, t12: 0, t6: 0 }, feet: { l: LEFT, r: { c: 'ball', x: BX, z: BZ } } });
// top: front knee soft, back knee about 35 degrees (reachable with both feet planted, back hip inside its extension range)
const KT = JSON.parse(process.env.KT || '[30, 38]');
const S = { top: F.solveRoot(base(-20, -10, -6), { knee: KT[0], side: 'l', paths: ['root.0', 'root.1'], extra: [(W) => [(F.kneeOf(W, 'r') - KT[1]) * 0.5]] }), bottom: split(-25, -12, 92, -10) };
const at = (f) => { const s = clone(S.top); s.root = S.top.root.map((v, i) => r1(v + (S.bottom.root[i] - v) * f)); s.pitch = r1(S.top.pitch + (S.bottom.pitch - S.top.pitch) * f); return s; };
const poses = {
  stand: P(stand),
  lift: P(onLeft(flat(-6, 5, { lift: 5, w: 0 }), 0, -1.5, 8)),
  reach: P(onLeft({ c: 'ball', x: -40, z: -14, lift: 7, w: 0 }, -9, -5, 14, -6)),
  touch: P(Object.assign(clone(S.top), { feet: { l: LEFT, r: { c: 'ball', x: BX, z: BZ, w: 0 } } })),
  top: P(S.top), d33: P(at(0.33)), d66: P(at(0.66)), bottom: P(S.bottom), settle: P(at(0.985)), r50: P(at(0.5)),
  unload: P(Object.assign(clone(S.top), { root: [r1(S.top.root[0] + 4), S.top.root[1], S.top.root[2]], feet: { l: LEFT, r: { c: 'ball', x: BX + 3, z: BZ + 1, lift: 2, w: 0 } } })),
  swingIn: P(onLeft(flat(-32, -6, { lift: 8, w: 0 }), -5, -3, 12, -7)),
  preLand: P(onLeft(flat(0, 9, { lift: 0.8, w: 0 }), 0, -1, 6)),
  land: P(stand),
};
const keyframes = [{ t: 0, pose: 'stand' }, { t: 0.8, pose: 'stand' }, { t: 1.0, pose: 'lift' }, { t: 1.25, pose: 'reach' }, { t: 1.45, pose: 'touch' }, { t: 1.6, pose: 'top' },
  { t: 1.95, pose: 'd33' }, { t: 2.3, pose: 'd66' }, { t: 2.6, pose: 'bottom' }, { t: 2.75, pose: 'settle' }, { t: 2.9, pose: 'bottom' }, { t: 3.3, pose: 'r50' }, { t: 3.65, pose: 'top' },
  { t: 3.85, pose: 'unload' }, { t: 4.1, pose: 'swingIn' }, { t: 4.3, pose: 'preLand' }, { t: 4.45, pose: 'land' }, { t: 6.0, pose: 'stand' }];
const ex = { schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props: [B.heldProp('r', 'goblet', OFF)], contacts: F.contacts,
  timeline: meta.timeline, poses, keyframes, activation: meta.activation, guides: meta.guides, checks: meta.checks };
ex.exercise.reference.note = K.NOTE;
const HOLDS = [{ side: 'r', grip: 'goblet', offset: OFF }];
const rep = K.scan(ex, { holds: HOLDS, planted: ['leg_l', 'ball_r'], skip: (s, id) => /^(hand|thumb|forearm)_l$/.test(id) });
const fr = F.report(ex), Wb = F.fk(poses.bottom), Ws = F.fk(poses.stand);
const set = (p, f, v) => { const k = ex.exercise.kinematics.find((x) => x.measure.startsWith(p)); if (k) k[f] = v; };
set('Step', 'setup', 'Feet hip width (18 cm)'); set('Step', 'peak', `Right ball of the foot ${-BX} cm behind and ${-BZ - 9} cm past the left ankle (crossing the midline)`);
set('Front knee', 'setup', `≈${Math.round(F.kneeOf(Ws, 'l'))}° standing`); set('Front knee', 'peak', `≈${Math.round(F.kneeOf(Wb, 'l'))}°`);
set('Back knee', 'setup', '–'); set('Back knee', 'peak', `≈${Math.round(F.kneeOf(Wb, 'r'))}°, ${r1(Wb.knee_r.p[1])} cm above the floor (knee joint centre)`);
set('Back hip adduction', 'setup', '–'); set('Back hip adduction', 'peak', `≈${Math.round(-poses.bottom.ch.hip_r.abd)}° (joint channel)`);
set('Trunk inclination', 'setup', `≈${Math.round(F.trunkLean(Ws))}°`); set('Trunk inclination', 'peak', `≈${Math.round(F.trunkLean(Wb))}°`);
set('Dumbbell', 'setup', 'Upright at the sternum, hands cupping the top plate'); set('Dumbbell', 'peak', `Stays at the chest (≥${rep.clear.d} cm from the body on the rig shapes)`);
set('Tempo', 'setup', 'Stand 0.8 s'); set('Tempo', 'peak', 'Step back 0.8 s, 1.0 s down, 0.3 s pause, 0.75 s up, step in 0.8 s');
const lim = G.limits(ex);
console.log(`Dumbbell Gobelt Curtsey Lunge: limits ${JSON.stringify(lim)} wrote ${L.write(ex)}\n  ${JSON.stringify(fr)}\n  clear ${JSON.stringify(rep.clear)} dbFloor ${rep.dbFloor} jump ${JSON.stringify(rep.jump)} hipR ${JSON.stringify(poses.bottom.ch.hip_r)}`);
K.gate('dumbbell-gobelt-curtsey-lunge', rep, { maxJump: 6 });
if (Object.keys(lim).length) { console.error('FAIL: joint limits'); process.exitCode = 1; }
G.gateMeasure('dumbbell-gobelt-curtsey-lunge', ex, fr.kneeL[1]);
if (fr.slide > 0.05) { console.error('FAIL: planted foot slides'); process.exitCode = 1; }
