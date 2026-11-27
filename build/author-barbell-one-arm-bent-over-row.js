// Barbell One Arm Bent over Row (GymVisual "Barbell One Arm Bent over Row", movement reference only): feet a little wider
// than the hips and planted, soft knees, hip hinge with a flat back until the trunk is about 28 degrees above level, left
// hand braced on the left thigh just above the knee. The right hand holds one barbell by its middle (its balance point) with
// a neutral grip, palm facing in, the bar pointing front to back beside the right leg, level. The right arm rows from a
// straight-arm hang to the hip, elbow driving up and back close to the body, shoulder blade squeezing back; pause; lower
// slowly. The trunk, pelvis, legs and the bracing arm stay still. Right arm from the b3 back family rowing arm (elbow on its
// sphere, forearm turning), with the bar kept level (thumb axis straight forward). Authored with the right arm working.
const L = require('./lib');
const { V, Q, r1, clone } = L;
const { makeFamily } = require('./families/lunge');
const B = require('./families/b3-back');
const EQ = require('./families/equip');
const H = require('./families/hips');
const X = require('./families/b5-bbhinge');
const meta = require('./meta/barbell-one-arm-bent-over-row.json');

const F = makeFamily({ toe: 8, half: 15 });
const feet = { r: { c: 'flat', x: 0 }, l: { c: 'flat', x: 0 } };
const PITCH = +(process.env.P ?? -66), KNEE = 24;
const PLATE_D = 45;
const ROW = { top: { du: +(process.env.DU ?? -20), dz: +(process.env.DZ ?? 9), wx: 4, wz: +(process.env.WZ ?? 4), tilt: 0 }, sc: [{ protract: 8, elevate: -1 }, { protract: -16, elevate: -1 }], hang: [4, +(process.env.HZ ?? 9)], thumb: () => [1, 0, 0] };
// left hand braced on the front of the left thigh just above the knee (solved as the mirrored right arm, then copied)
function braceLeft(p) {
  const W = L.fk(p, F.contacts), Hp = W.hip_l.p, K = W.knee_l.p, dir = V.norm(V.sub(K, Hp));
  const up = V.norm(V.sub([0, 1, 0], V.scale(dir, dir[1])));           // perpendicular to the thigh, toward the ceiling
  const spot = V.add(V.lerp(Hp, K, +(process.env.HK ?? 0.68)), V.scale(up, +(process.env.HU ?? 8.5)));
  const tgt = [spot[0], spot[1], -spot[2]], palm = V.scale([up[0], up[1], -up[2]], -1), thumb = V.norm(V.cross(palm, [dir[0], dir[1], -dir[2]]));
  const SCL = { protract: 8, elevate: 2 }, pm = clone(p); pm.ch.sc_r = clone(SCL);   // solve with the left shoulder girdle
  const q = B.holdArm(pm, tgt, { palm, axis: V.scale(thumb, -1), dirW: +(process.env.BW ?? 0.6), minElev: 2, guesses: [[60, 50, 0, 15, 0], [80, 60, 20, 20, 30], [40, 40, -20, 10, -30], [0, 20, 0, 15, 90], [20, 25, 0, 20, 0], [-20, 20, 30, 30, 160], [10, 30, 60, 20, -90]] });
  const out = clone(p);
  for (const j of ['shoulder', 'elbow', 'wrist']) out.ch[`${j}_l`] = clone(q.ch[`${j}_r`]);
  out.ch.sc_l = clone(SCL);
  out.__brace = +V.len(V.sub(L.fk(out, F.contacts).wrist_l.p, spot)).toFixed(2);
  if (process.env.DBG) console.log('brace', out.__brace, 'dist', r1(V.len(V.sub(spot, W.shoulder_l.p))), 'reach', r1(L.reach(5)), 'cost', q.__cost.toFixed(2), JSON.stringify(q.ch.shoulder_r), JSON.stringify(q.ch.elbow_r), JSON.stringify(q.ch.wrist_r));
  return out;
}
let braceErr = 0;
const base = B.hinge(F, { pitch: PITCH, knee: KNEE, feet, spine: { l5: -3, t12: 0, t6: 1 }, sc: ROW.sc[0], kg: 6, midfoot: 5,
  arms: (p) => { const q = B.rowArm(braceLeft(p), 0, ROW, {}); braceErr = q.__brace; delete q.__brace; return q; } }).pose;
delete base.__brace;
const state = {};
function at(f) { const q = B.rowArm(base, f, ROW, state); return B.wrapPose(q); }
const FS = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.88, 1], N = FS.length - 1;
const poses = {};
FS.forEach((f, i) => { poses[`r${i}`] = at(f); });
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, [p.start, p.end]])), D = meta.timeline.duration;
const keyframes = [{ t: 0, pose: 'r0' }, ...X.eased('r', FS, ph.pull[0], ph.pull[1]), ...X.eased('r', FS, ph.lower[0], ph.lower[1], true), { t: D, pose: 'r0' }];
const ex = H.module_(meta, F.contacts, poses, keyframes);
ex.props = [X.barbell1Prop({ plateD: PLATE_D })];
const sw = X.sweep1(ex, { fixed: ['ankle_r', 'ankle_l', 'pelvis', 'wrist_l'], probe: (W, pz, t, o) => { const b = X.bar1At(W); o.tilt = Math.max(o.tilt ?? 0, Math.abs(Math.asin(Math.max(-1, Math.min(1, b.ax[1])))) * 180 / Math.PI); } });
const W0 = F.fk(poses.r0), W1 = F.fk(poses[`r${N}`]);
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Trunk angle', 'setup', `${d(90 - B.trunkLean(W0))} above level (hip channel ${d(base.ch.hip_r.flex)}), spine neutral`); set('Trunk angle', 'peak', 'Unchanged (no twist)');
set('Knee flexion', 'setup', d(B.kneeOf(W0, 'r'))); set('Knee flexion', 'peak', 'Unchanged');
set('Elbow flexion', 'setup', d(B.elbowOf(W0, 'r'))); set('Elbow flexion', 'peak', `${d(B.elbowOf(W1, 'r'))}, elbow ${r1(W1.elbow_r.p[1] - W1.shoulder_r.p[1])} cm above the shoulder joint, shoulder blade retracted (clavicle ${ROW.sc[0].protract}° to ${ROW.sc[1].protract}°)`);
set('Bar balance', 'setup', `Held at its middle, neutral grip, bar fore-aft beside the right leg, plates ${r1(X.bar1MinY(W0, { plateD: PLATE_D }))} cm off the floor`); set('Bar balance', 'peak', `Bar within ${r1(sw.tilt)}° of level through the rep`);
set('Tempo', 'setup', `Hang ${ph.setup[1]} s`); set('Tempo', 'peak', `${r1(ph.pull[1] - ph.pull[0])} s up, ${r1(ph.squeeze[1] - ph.squeeze[0])} s squeeze, ${r1(ph.lower[1] - ph.lower[0])} s down, ${r1(D - ph.lower[1])} s reset`);
sw.tilt = r1(sw.tilt);
console.log(`Barbell One Arm Row: wrote ${L.write(ex)}\n  trunk ${r1(90 - B.trunkLean(W0))} above level, elbow ${r1(B.elbowOf(W0, 'r'))}->${r1(B.elbowOf(W1, 'r'))}, hand z ${r1(W0.wrist_r.p[2])}/${r1(W1.wrist_r.p[2])}, brace err ${braceErr}, row cost ${state.cost.toFixed(2)}\n  sweep ${JSON.stringify(sw)}`);
if (sw.barFloor < 0 || sw.barBody < -0.3) { console.error('FAIL: plates through the floor or bar through the body'); process.exitCode = 1; }
if (sw.slide > 0.05 || sw.drift > 0.05) { console.error('FAIL: planted feet or the bracing hand move'); process.exitCode = 1; }
if (braceErr > 1.5) { console.error('FAIL: left hand off the thigh'); process.exitCode = 1; }
if (sw.tilt > 6) { console.error('FAIL: bar not level'); process.exitCode = 1; }
