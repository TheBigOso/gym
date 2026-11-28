// Barbell Bent Over Wide Grip Row (GymVisual #14643, "Barbell Bent Over Wide Grip Row"; page not readable here, movement
// from the name and standard coaching): feet hip width and planted, soft knees, hip hinge with a flat back until the trunk is
// about 35 degrees above level; overhand grip well outside the shoulders (72 cm between the handle centres). The bar hangs
// from straight arms in front of the knees, then is rowed to the lower chest with the elbows flaring out to the sides
// (upper arms about 60-75 degrees from the trunk) and the shoulder blades squeezing together; pause, lower slowly. The
// hinge is held still (balanced over mid-foot with the bar). Built like author-barbell-reverse-grip-bent-over-row.js
// (barbell.js armsOnBar via b5-bbhinge.js barArms along an interpolated bar path), elbows guided up and out.
const L = require('./lib');
const { V, r1, clone } = L;
const { makeFamily } = require('./families/lunge');
const B = require('./families/b3-back');
const BB = require('./families/barbell');
const EQ = require('./families/equip');
const H = require('./families/hips');
const X = require('./families/b5-bbhinge');
const meta = require('./meta/barbell-bent-over-wide-grip-row.json');

const F = makeFamily({ toe: 6, half: 11 });
const feet = { r: { c: 'flat', x: 0 }, l: { c: 'flat', x: 0 } };
const GW = +(process.env.GW ?? 72), KG = 25, PITCH = +(process.env.P ?? -62), KNEE = 22;
const PALM = [-1, 0, 0], THUMB = [0, 0, -1];   // overhand: palms back toward the shins, right thumb toward the midline
const SC = [{ protract: 6, elevate: -2 }, { protract: -14, elevate: -1 }];
const st0 = {};
const base = B.hinge(F, { pitch: PITCH, knee: KNEE, feet, spine: { l5: -3, t12: 0, t6: 1 }, sc: SC[0], kg: KG, midfoot: 5,
  arms: (p) => { const q = X.hangBar(p, F.contacts, { gw: GW, palm: PALM, thumb: THUMB, clear: 1.5, state: st0, guesses: [[60, 20, 30, 5, 150], [80, 40, 0, 5, 100], [40, 10, 20, 5, 160], [0, 10, 0, 5, 90]] }); return q; } });
const P0 = base.pose, C0 = P0.__bar; delete P0.__bar;
// top: bar against the lower belly, found from inside the trunk along the belly's outward normal
const W0 = F.fk(P0), UP = +(process.env.UP ?? 0.55);
const inside = V.lerp(W0.pelvis.p, W0.neck_c7.p, UP);
const C1 = X.touchAlong(W0, [inside[0], inside[1], 0], L.Q.rot(W0.spine_l5.q, [1, 0, 0]), GW / 2 - 6, { margin: 0.8 });
const state = {};
function at(f) {
  const g = f * f * (3 - 2 * f) * 0.4 + f * 0.6;
  const p = clone(P0);
  p.ch.sc_r = { protract: r1(SC[0].protract + (SC[1].protract - SC[0].protract) * g), elevate: r1(SC[0].elevate + (SC[1].elevate - SC[0].elevate) * g) }; p.ch.sc_l = clone(p.ch.sc_r);
  // bar path: up first, then in toward the belly (a slight bow away from the thighs)
  const c = V.add(V.lerp(C0, C1, g), [3 * Math.sin(Math.PI * g), 0, 0]);
  const W = L.fk(p, F.contacts), E = X.elbowAt(W, +(process.env.EU ?? -6), +(process.env.EZ ?? 20));
  return X.barArms(p, c, GW, { palm: null, thumb: THUMB, elbow: g > 0.4 ? E : null, elbowW: 0.8 * (g - 0.4) / 0.6, dirW: 1.0, wristW: 0.3 }, state);
}
const FS = [0, 0.08, 0.15, 0.22, 0.3, 0.37, 0.45, 0.52, 0.6, 0.7, 0.8, 0.9, 1], N = FS.length - 1;
const poses = {};
state.guess = st0.guess; state.keep = true;   // one continuous branch from the hang (re-solved with the row objectives)
for (let i = 0; i <= N; i++) poses[`r${i}`] = B.wrapPose(at(FS[i]));
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, [p.start, p.end]])), D = meta.timeline.duration;
const keyframes = [{ t: 0, pose: 'r0' }, ...X.eased('r', FS, ph.pull[0], ph.pull[1]), ...X.eased('r', FS, ph.lower[0], ph.lower[1], true), { t: D, pose: 'r0' }];
const ex = H.module_(meta, F.contacts, poses, keyframes);
ex.props = [BB.barbellProp()];
const sw = BB.sweep(ex, { fixed: ['ankle_r', 'ankle_l', 'pelvis'] });
const Wt = F.fk(poses[`r${N}`]), bt = EQ.barAt(Wt, BB.GRIP);
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Trunk angle', 'setup', `${d(90 - B.trunkLean(W0))} above level (hip channel ${d(P0.ch.hip_r.flex)}), spine neutral`); set('Trunk angle', 'peak', 'Unchanged (held)');
set('Knee flexion', 'setup', d(B.kneeOf(W0, 'r'))); set('Knee flexion', 'peak', 'Unchanged');
set('Elbow flexion', 'setup', `${d(B.elbowOf(W0, 'r'))}, overhand ${GW} cm grip (handle centres)`); set('Elbow flexion', 'peak', `${d(B.elbowOf(Wt, 'r'))}, elbows ${r1(Wt.elbow_r.p[2] - Wt.shoulder_r.p[2])} cm out from the shoulders, bar at the lower chest; shoulder blades retracted (clavicle protraction ${SC[0].protract}° to ${SC[1].protract}°)`);
set('Tempo', 'setup', `Hold ${ph.setup[1]} s`); set('Tempo', 'peak', `${r1(ph.pull[1] - ph.pull[0])} s up, ${r1(ph.squeeze[1] - ph.squeeze[0])} s squeeze, ${r1(ph.lower[1] - ph.lower[0])} s down, ${r1(D - ph.lower[1])} s reset`);
console.log(`Barbell Wide Grip Row: wrote ${L.write(ex)}\n  trunk ${r1(90 - B.trunkLean(W0))} above level, elbow ${r1(B.elbowOf(W0, 'r'))}->${r1(B.elbowOf(Wt, 'r'))}, bar ${C0.map(r1)} -> ${bt.c.map(r1)} (target ${C1.map(r1)})\n  sweep ${JSON.stringify(sw)} gripErr ${state.err.toFixed(2)} hangErr ${st0.err.toFixed(2)}`);
if (sw.widthRange > 1.0 || state.err > 0.5) { console.error('FAIL: hands do not stay on the bar at a constant grip width'); process.exitCode = 1; }
if (sw.barFloor < 0 || sw.barBody < -0.3) { console.error('FAIL: plates through the floor or bar through the body'); process.exitCode = 1; }
if (sw.slide > 0.05 || sw.drift > 0.05) { console.error('FAIL: planted feet move'); process.exitCode = 1; }
