// Bodyweight Wall Squat (GymVisual #154612): back flat on a wall, feet shoulder width and about one thigh length out,
// slide down to 90 degrees of knee flexion (shins vertical), hold 5 s, slide up. Feet planted (constant IK targets). Bilateral.
const L = require('./lib');
const { R, V, rig, r1, clone } = L;
const F = require('./families/squat');
const meta = require('./meta/bodyweight-wall-squat.json');

const THIGH = V.len(rig.byId.knee_r.offset);
const STANCE = 18.5, FOOT_X = r1(THIGH + 1); // ankles under the knees when the thigh is horizontal
const armsSide = (p) => { // arms hang beside the thighs, slightly out so the hands clear them
  for (const s of ['r', 'l']) { p.ch[`shoulder_${s}`] = { plane: 0, elev: 14, axial: 0 }; p.ch[`elbow_${s}`] = { flex: 12 }; p.ch[`wrist_${s}`] = { pron: 0, flex: 0, dev: 0 }; }
  return p;
};
const { ex, report: r, poses } = F.author({
  stance: STANCE, toe: 10, footX: FOOT_X, rootX: 0, kneeTop: 32, kneeBottom: 90, pitchTop: 0, pitchBottom: 0, backBottom: 0, kneeOut: 0.5,
  spine: { l5: 0, t12: 0, t6: 0 }, armsFn: armsSide, lead: 1.0, settle: 0.25,
  depths: { stand: 0, s33: 0.33, s66: 0.66, bottom: 1, up50: 0.5 },
  keyframes: [{ t: 0, pose: 'stand' }, { t: 1.0, pose: 'stand' }, { t: 1.7, pose: 's33' }, { t: 2.35, pose: 's66' }, { t: 3.0, pose: 'bottom' },
    { t: 4.6, pose: 'bottomSettle' }, { t: 6.2, pose: 'bottom' }, { t: 7.0, pose: 'bottomSettle' }, { t: 8.0, pose: 'bottom' }, { t: 8.75, pose: 'up50' }, { t: 9.5, pose: 'stand' }, { t: 10, pose: 'stand' }],
}, meta);

// Wall face: the Studio clay athlete's rearmost back point sits at x = -8.3 cm (rig units) through the whole slide, because the
// pelvis only moves straight down (measured on the skinned mesh in the player). The wall touches it with 0.3 cm to spare.
const back = -8.6;
const wall = ex.props.find((p) => p.id === 'wall'); wall.center = [r1(back - wall.size[0] / 2), 0, 0];

const kin = ex.exercise.kinematics, set = (prefix, field, v) => { const k = kin.find((x) => x.measure.startsWith(prefix)); if (k) k[field] = v; };
set('Knee flexion', 'setup', `≈${Math.round(F.kneeOf(r.Wt, 'r'))}° (leaning on the wall)`); set('Knee flexion', 'peak', `≈${r.knee[1]}° held for 5 s`);
set('Hip flexion', 'setup', `≈${Math.round(r.hipTop)}°`); set('Hip flexion', 'peak', `≈${Math.round(r.hipBottom)}° (joint channel)`);
set('Trunk inclination', 'setup', `≈${Math.round(r.trunkTop)}°`); set('Trunk inclination', 'peak', `≈${Math.round(r.trunkBottom)}° (upright on the wall)`);
set('Feet from the wall', 'setup', `Ankles ${r1(FOOT_X - back)} cm in front of the wall face (thigh ${THIGH} cm)`);
set('Tempo', 'setup', 'On the wall 1 s'); set('Tempo', 'peak', '2 s down, 5 s hold, 1.5 s up');
delete r.Wb; delete r.Wt;
console.log(`Bodyweight Wall Squat: wall face x ${back} wrote ${L.write(ex)}\n  ${JSON.stringify(r)}`);
