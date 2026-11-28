// Batch 6, family b6-10: metadata for the band modules (build/meta/<id>.json). Run `node build/families/b6-10-meta.js` to
// (re)write the meta files; the author scripts fill the measured kinematics rows. Literature is cited only from sources
// already used in the repo (titles and links copied from the existing meta files).
const fs = require('fs'), path = require('path');
const META = path.join(__dirname, '../meta');

const both = (...ids) => ids.flatMap((i) => (i === 'core' ? ['core'] : [`${i}_r`, `${i}_l`]));
const right = (...ids) => ids.flatMap((i) => (i === 'core' ? ['core'] : [`${i}_r`]));
// source entries copied from the meta files already in the repo
const SRC = (() => {
  const out = {};
  for (const f of fs.readdirSync(META)) { try { const m = JSON.parse(fs.readFileSync(path.join(META, f), 'utf8')); for (const s of m.exercise.sources || []) if (s.id !== 'gymvisual' && !out[s.id]) out[s.id] = s; } catch (e) { /* skip */ } }
  return out;
})();
const CAMERA = { default: 'threeQuarter', presets: { threeQuarter: { yaw: 40, pitch: 18, label: '3/4' }, side: { yaw: 0, pitch: 6, label: 'Side' }, front: { yaw: 90, pitch: 10, label: 'Front' }, back: { yaw: -120, pitch: 20, label: 'Back' }, top: { yaw: 20, pitch: 70, label: 'Top' } } };
const BAND_SAFETY = [
  'Check the band for nicks or tears before every session and replace a worn band; a band that snaps can hit the face or eyes.',
  'Anchor the band to something that cannot move or slip (a rack upright, a pull-up bar or under the feet) and make sure it is secure before loading it.',
  'Band tension rises as it stretches, so the load is heaviest at the end of the pull or push; let it return under control rather than snapping back.',
];
const TAIL_SAFETY = ['Stop if sharp pain, numbness or tingling occurs.', 'Muscle glow colours and activation curves are illustrative, not measured EMG.'];
const BAND_LOAD = 'Band tension is user-chosen (bands are colour-coded by tension): pick one you can move for the target reps with 1-3 reps in reserve; step farther from the anchor, or choke up on the band, for more tension.';

function curve(ph, lo, hi) {
  const [s, l, h, w, r] = ph, D = r.end, k = (f) => +(lo + (hi - lo) * f).toFixed(3);
  return [[0, k(0)], [l.start, k(0.12)], [+((l.start + l.end) / 2).toFixed(2), k(0.6)], [l.end, k(1)], [h.end, k(0.95)], [+((w.start + w.end) / 2).toFixed(2), k(0.55)], [w.end, k(0.1)], [D, k(0)]].filter((p, i, a) => i === 0 || p[0] > a[i - 1][0]);
}

function make(s) {
  const durs = s.durs || [0.6, 1.1, 0.4, 1.8, 0.4];
  const ids = ['setup', 'lift', 'hold', 'lower', 'reset'];
  const breath = ['inhale', s.liftBreath || 'exhale', 'hold', s.lowerBreath || 'inhale', 'natural'];
  let t = 0;
  const phases = ids.map((id, i) => { const p = { id, label: s.phases[i][0], start: +t.toFixed(2), end: +(t + durs[i]).toFixed(2), breath: breath[i], cue: `c${i + 1}` }; t += durs[i]; return p; });
  const all = [...s.muscles.target, ...s.muscles.synergist, ...(s.muscles.stabilizer || [])];
  const activation = {};
  for (const m of all) { const base = m.replace(/_[rl]$/, ''), lv = s.act[m] || s.act[base]; if (!lv) throw new Error(`${s.id}: no activation for ${m}`); activation[m] = curve(phases, lv[0], lv[1]); }
  const muscleNotes = {};
  for (const m of all) { const base = m.replace(/_[rl]$/, ''), n = s.notes[m] || s.notes[base]; if (n) muscleNotes[m] = n; }
  const url = s.url, productRef = url.match(/\/(\d+)-/)[1];
  const lift = phases[1];
  return {
    exercise: {
      id: s.id, name: s.name, aliases: s.aliases,
      reference: { source: 'GymVisual', productRef, title: s.name, url, listing: `${/animated-gifs/.test(url) ? 'Animated GIF' : 'Video'} (movement reference only; the page could not be fetched from the authoring environment (the proxy refused gymvisual.com), so the data sheet was not read; the movement is taken from the exercise name and standard coaching practice)`, note: '' },
      type: 'Strength', bodyPart: s.bodyPart, secondaryBodyParts: s.secondary, equipment: s.equipment, difficulty: s.difficulty || 'Beginner', mechanics: s.mechanics, plane: s.plane,
      laterality: s.uni ? 'Unilateral' : 'Bilateral', authoredSide: s.uni ? 'right' : 'bilateral',
      muscles: s.muscles,
      breathing: s.breathing,
      prescription: Object.assign({ sets: '2-4', reps: '10-15', frequency: '1-3 times a week', load: BAND_LOAD }, s.prescription),
      cues: s.phases.map((p, i) => ({ id: `c${i + 1}`, phase: ids[i], text: p[1] })),
      mistakes: s.mistakes.map(([mistake, fix], i) => ({ id: `m${i + 1}`, mistake, fix })),
      kinematics: s.kin.map(([measure, norm, sources = []]) => ({ measure, setup: '', peak: '', norm, sources })),
      sources: [{ id: 'gymvisual', title: `GymVisual, ${s.name}, ${/animated-gifs/.test(url) ? 'animated GIF' : 'video'} (movement reference)`, url }, ...s.sources.map((id) => { if (!SRC[id]) throw new Error(`${s.id}: unknown source ${id}`); return SRC[id]; })],
      safety: { cautions: [...BAND_SAFETY, ...s.safety.cautions, ...TAIL_SAFETY], modify: s.safety.modify, regressions: s.safety.regressions, progressions: s.safety.progressions },
      muscleNotes,
    },
    camera: s.camera || CAMERA,
    props: [],
    timeline: { duration: +t.toFixed(2), fps: 60, loop: true, interpolation: 'monotoneCubic', phases },
    activation,
    guides: [{ id: 'handPath', kind: 'path', joint: 'wrist_r', from: lift.start, to: lift.end, label: s.pathLabel }, ...(s.guides || [])],
    checks: Object.assign({ plantedContacts: ['leg_r', 'leg_l'], floorTolerance: 0.5 }, s.checks),
  };
}

const PRESS_ACT = { pec: [0.25, 0.85], ant_deltoid: [0.3, 0.8], triceps: [0.25, 0.75], serratus: [0.2, 0.45], biceps: [0.12, 0.3], forearm_flexors: [0.3, 0.45], infraspinatus: [0.18, 0.35], rhomboids_midtrap: [0.18, 0.32], core: [0.2, 0.35], obliques: [0.15, 0.3] };
const FLY_ACT = { pec: [0.2, 0.85], ant_deltoid: [0.2, 0.6], biceps: [0.15, 0.35], serratus: [0.15, 0.4], forearm_flexors: [0.3, 0.42], infraspinatus: [0.15, 0.3], core: [0.18, 0.3], obliques: [0.12, 0.25], triceps: [0.12, 0.25] };
const ROW_ACT = { lats: [0.25, 0.8], rhomboids_midtrap: [0.25, 0.85], post_deltoid: [0.2, 0.7], biceps: [0.2, 0.6], forearm_flexors: [0.3, 0.5], infraspinatus: [0.15, 0.4], upper_traps: [0.15, 0.4], core: [0.2, 0.35], obliques: [0.15, 0.4], spinal_extensors: [0.15, 0.3], glute_med: [0.12, 0.22] };
const CURL_ACT = { biceps: [0.2, 0.85], forearm_flexors: [0.3, 0.7], forearm_extensors: [0.2, 0.5], ant_deltoid: [0.12, 0.3], core: [0.15, 0.25], upper_traps: [0.1, 0.2] };
const PEC_NOTE = 'Main mover: brings the arm across the body (horizontal adduction) and, with the shoulder, presses the hands forward.';
const BANDS_EMG = ['Band', 'Elastic resistance can give muscle activity comparable to free weights at a matched effort (Andersen 2010).', ['andersen2010']];

const SPECS = [
  {
    id: 'band-low-chest-press', name: 'Band Low Chest Press', url: 'https://gymvisual.com/videos/9445-band-low-chest-press-male.html',
    aliases: ['Standing band decline chest press', 'High-to-low band chest press', 'Band lower chest press'],
    bodyPart: 'Chest (lower, sternal fibres)', secondary: ['Front of the shoulders', 'Triceps'], equipment: ['Resistance band (two)', 'Rack (band anchor)'],
    mechanics: 'Compound (shoulder and elbow)', plane: 'Transverse',
    muscles: { target: both('pec'), synergist: both('ant_deltoid', 'triceps', 'serratus'), stabilizer: [...both('biceps', 'forearm_flexors', 'infraspinatus', 'rhomboids_midtrap'), 'core'] },
    act: PRESS_ACT,
    breathing: { pattern: 'Breathe out as you press forward and down, breathe in as the band draws the hands back to the chest.', cadence: 'About 1 s press, short hold, about 2 s back' },
    prescription: { tempo: '2-0-1-0 (2 s back, 1 s press)', progression: 'More reps, a slower return, a step farther from the rack, then the next band up.' },
    phases: [
      ['Hands at the chest', 'Loop a band round each rack upright behind you, above shoulder height. Staggered stance, knees soft, ribs down; a band end in each hand beside the lower chest, palms down, elbows back and out about 45 degrees.'],
      ['Press forward and down', 'Breathe out and press forward and slightly down, about 15-20 degrees below horizontal, until the arms are nearly straight in front of the lower chest.'],
      ['Arms nearly straight', 'Hands about lower-chest height and close together; shoulders down, do not let the band pull the trunk back.'],
      ['Return slowly', 'Breathe in and let the hands come back to the chest slowly along the same line.'],
      ['Pause at the chest', 'Brief pause with the band still taut, then press again.'],
    ],
    mistakes: [['Pressing straight ahead or up so the line of pull no longer matches the band', 'Aim the hands at a point a little below the chest; the band should run in line with the forearms.'], ['Leaning back or arching the low back as the band tightens', 'Ribs down, glutes lightly braced, weight over the front foot; use a lighter band.'], ['Shrugging at the end of the press', 'Reach forward but keep the shoulders down.'], ['Letting the band snap the hands back', 'Return for about 2 s.']],
    kin: [['Press angle', 'Hands travel forward and a little down (about 15-20 degrees below horizontal), the line of a decline press, which favours the lower (sternal) fibres of the chest (clinical opinion; the bench-angle EMG study tested only flat-to-incline angles, Rodríguez-Ridao 2020).', ['rodriguez2020']], ['Elbow flexion', 'About 90-110 degrees at the chest to nearly straight (clinical opinion)'], ['Elbow flare', 'About 45 degrees from the body at the chest (clinical opinion)'], BANDS_EMG, ['Stance', 'Staggered stance, knees soft, so the band does not pull you backward (clinical opinion)'], ['Tempo', 'About 1 s press and 2 s return (clinical opinion)']],
    sources: ['rodriguez2020', 'andersen2010', 'saeterbakken2011'],
    safety: { cautions: ['Shoulder pain: shorten the range at the chest (clinical opinion).'], modify: ['Shoulder discomfort: palms facing each other and the elbows a little more tucked.', 'Balance: widen the staggered stance.'], regressions: ['Lighter band or step closer to the rack.', 'Incline push-up.'], progressions: ['Stronger band or a step farther from the rack.', 'Slower 3 s return with a pause at the chest.', 'Dips (when the gear is available) or a decline press.'] },
    notes: { pec: 'Main pusher; pressing down and forward biases the lower (sternal) fibres (clinical opinion).', ant_deltoid: 'Flexes the shoulder with the chest; less involved than in an incline press because the arms finish below shoulder height.', triceps: 'Straightens the elbows to finish the press.', serratus: 'Carries the shoulder blades forward round the rib cage at the end of the press.', biceps: 'Stabiliser at the elbow and shoulder (Saeterbakken 2011 found higher biceps activity with less stable loads).', forearm_flexors: 'Grip the band.', infraspinatus: 'Rotator cuff: centres the head of the upper arm (clinical opinion).', rhomboids_midtrap: 'Control the shoulder blades on the return.', core: 'Keeps the trunk upright against the band (clinical opinion).' },
    pathLabel: 'Press forward and down', guides: [{ id: 'elbowAngle', kind: 'jointAngle', joint: 'elbow_r', normBand: [90, 110], label: 'Elbows about 90-110 at the chest' }],
    checks: { measure: { name: 'kneeFlexion', min: 3, max: 22 } },
  },
  {
    id: 'resistance-band-overhead-shoulder-press', name: 'Resistance Band Overhead Shoulder Press', url: 'https://gymvisual.com/videos/11519-resistance-band-overhead-shoulder-press.html',
    aliases: ['Standing band shoulder press', 'Band overhead press', 'Banded military press (standing)'],
    bodyPart: 'Shoulders (anterior and lateral deltoid)', secondary: ['Triceps', 'Upper trapezius', 'Core'], equipment: ['Resistance band (two, or one long band under both feet)'],
    mechanics: 'Compound (shoulder and elbow)', plane: 'Frontal',
    muscles: { target: both('ant_deltoid', 'lat_deltoid'), synergist: both('triceps', 'upper_traps', 'serratus'), stabilizer: [...both('obliques'), 'core', ...both('spinal_extensors', 'infraspinatus', 'forearm_flexors')] },
    act: { ant_deltoid: [0.3, 0.85], lat_deltoid: [0.25, 0.75], triceps: [0.2, 0.75], upper_traps: [0.2, 0.6], serratus: [0.2, 0.6], obliques: [0.15, 0.3], core: [0.2, 0.35], spinal_extensors: [0.15, 0.3], infraspinatus: [0.15, 0.35], forearm_flexors: [0.3, 0.45] },
    breathing: { pattern: 'Brace and breathe out as you press up, breathe in as the hands come back to the shoulders.', cadence: 'About 1 s up, short pause, about 2 s down' },
    prescription: { tempo: '2-0-1-1 (2 s down, 1 s up, 1 s at the top)', progression: 'More reps, a slower lowering, a wider stance on the band (more stretch), then the next band up.' },
    phases: [
      ['Hands at the shoulders', 'Stand on the bands with the feet a little wider than hip width, knees soft. A band end in each hand at the front of the shoulders, palms forward, elbows under the hands.'],
      ['Press overhead', 'Brace, breathe out and press the hands straight up until the arms are straight over the shoulders, the head moving slightly through as the hands pass the face.'],
      ['Lockout', 'Arms straight, biceps beside the ears, ribs down; do not lean back.'],
      ['Lower slowly', 'Breathe in and bring the hands back to the shoulders under control.'],
      ['Pause at the shoulders', 'Short pause with the band still taut, then press again.'],
    ],
    mistakes: [['Leaning back to finish the press', 'Squeeze the glutes and keep the ribs down; use a lighter band.'], ['Pressing forward of the head', 'Finish with the hands over the shoulders, not in front of the face.'], ['Elbows flaring straight out at the bottom', 'Start with the elbows slightly forward of the body, under the hands.'], ['Letting the bands snap the hands down', 'Lower for about 2 s.']],
    kin: [['Shoulder elevation', 'About 80-90 degrees with the hands at the shoulders to about 165-175 degrees at lockout (clinical opinion)'], ['Elbow flexion', 'About 90-110 degrees at the bottom to nearly straight overhead (clinical opinion)'], ['Trunk', 'Standing tall without leaning back; standing presses demand more trunk muscle activity than seated ones (Saeterbakken and Fimland 2013).', ['saeterbakken2013']], ['Band', 'Each band anchored under the ball of its own foot, so the tension rises toward lockout; elastic resistance can give muscle activity comparable to free weights (Andersen 2010).', ['andersen2010']], ['Tempo', 'About 1 s up and 2 s down (clinical opinion)']],
    sources: ['saeterbakken2013', 'campos2020', 'andersen2010'],
    safety: { cautions: ['Keep the band securely under the ball of each foot; a band that slips out can whip up toward the face.', 'Shoulder pain overhead: press with the palms facing each other and stop short of full lockout (clinical opinion).'], modify: ['Shoulder discomfort: neutral grip (palms facing).', 'Low back discomfort: press seated on a bench.'], regressions: ['Lighter band.', 'One arm at a time.', 'Band seated shoulder press.'], progressions: ['Stronger band or a wider stance on the band.', 'Slower 3 s lowering.', 'Dumbbell or barbell standing press.'] },
    notes: { ant_deltoid: 'Main mover of the press, flexing the shoulder (Campos 2020 compared deltoid portions across shoulder exercises).', lat_deltoid: 'Abducts the arm as the elbows travel out and up.', triceps: 'Straightens the elbows to lock out.', upper_traps: 'Rotate the shoulder blades upward and elevate them as the arms go overhead.', serratus: 'Rotates the shoulder blades upward with the trapezius.', obliques: 'Resist leaning back as the band tightens.', core: 'Braces the trunk: standing presses load the trunk more than seated ones (Saeterbakken and Fimland 2013).', spinal_extensors: 'Hold the trunk tall.', infraspinatus: 'Rotator cuff: centres the head of the upper arm overhead (clinical opinion).', forearm_flexors: 'Grip the band.' },
    pathLabel: 'Press straight up', guides: [{ id: 'elbowAngle', kind: 'jointAngle', joint: 'elbow_r', normBand: [0, 20], label: 'Arms nearly straight at the top' }],
    checks: { measure: { name: 'kneeFlexion', min: 3, max: 20 } },
  },
  {
    id: 'band-chest-fly', name: 'Band Chest Fly', url: 'https://gymvisual.com/videos/9446-band-chest-fly-male.html',
    aliases: ['Standing band fly', 'Resistance band chest fly', 'Band pec fly'],
    bodyPart: 'Chest', secondary: ['Front of the shoulders', 'Biceps (stabiliser)'], equipment: ['Resistance band (two)', 'Rack (band anchor)'],
    mechanics: 'Isolation (shoulder)', plane: 'Transverse',
    muscles: { target: both('pec'), synergist: both('ant_deltoid', 'biceps'), stabilizer: [...both('serratus', 'forearm_flexors', 'infraspinatus'), 'core'], lengthened: both('pec') },
    act: FLY_ACT,
    breathing: { pattern: 'Breathe out as the arms sweep together, breathe in as they open.', cadence: 'About 1 s in, short squeeze, about 2 s out' },
    prescription: { tempo: '2-0-1-1 (2 s open, 1 s close, 1 s squeeze)', progression: 'More reps, a slower opening, a step farther from the rack, then the next band up.' },
    phases: [
      ['Arms open', 'Loop a band round each rack upright behind you at about shoulder height. Staggered stance, knees soft, chest up; a band end in each hand, arms out to the sides at shoulder height, elbows slightly bent, palms forward.'],
      ['Sweep together', 'Breathe out and hug the arms forward in a wide arc until the hands meet in front of the chest; keep the elbow bend fixed.'],
      ['Squeeze', 'Hands together in front of the chest, shoulders down; squeeze the chest.'],
      ['Open slowly', 'Breathe in and let the band draw the arms back out to the sides, stopping with the hands level with the shoulders.'],
      ['Pause open', 'Short pause with the band taut, then sweep again.'],
    ],
    mistakes: [['Bending and straightening the elbows (turning the fly into a press)', 'Lock the elbow angle and move only at the shoulders.'], ['Letting the hands drift behind the body at the open position', 'Stop with the hands about level with the shoulders.'], ['Shrugging or rolling the shoulders forward', 'Keep the chest up and the shoulders down.'], ['Leaning back as the band tightens', 'Weight over the front foot, ribs down.']],
    kin: [['Horizontal adduction', 'Arms from out to the side (about level with the body) to in front of the chest with the hands together (clinical opinion)'], ['Elbow flexion', 'Fixed, about 15-25 degrees (clinical opinion)'], ['Arm height', 'About shoulder height throughout (clinical opinion)'], ['Band', 'Anchored behind at shoulder height: tension is highest with the hands together, where a dumbbell fly loses its load; dumbbell flyes and the bench press give similar pectoral activity (Solstad 2020); elastic resistance can match free weights (Andersen 2010).', ['solstad2020', 'andersen2010']], ['Tempo', 'About 1 s in and 2 s out (clinical opinion)']],
    sources: ['solstad2020', 'andersen2010'],
    safety: { cautions: ['Do not let the band pull the arms back past the body; the stretched shoulder is vulnerable at the open position (clinical opinion).'], modify: ['Shoulder discomfort: smaller range, hands stop in front of the shoulders.'], regressions: ['Lighter band or step closer to the rack.', 'One arm at a time.'], progressions: ['Stronger band or step farther from the rack.', 'Pause 2 s with the hands together.', 'Cable standing fly.'] },
    notes: { pec: PEC_NOTE + ' Dumbbell flyes gave pectoral activity similar to the bench press (Solstad 2020).', ant_deltoid: 'Assists horizontal adduction.', biceps: 'Holds the slight elbow bend against the band; the biceps were more active in flyes than in the bench press (Solstad 2020).', serratus: 'Keeps the shoulder blades against the rib cage.', forearm_flexors: 'Grip the band.', infraspinatus: 'Rotator cuff: steadies the shoulder at the open position (clinical opinion).', core: 'Keeps the trunk still against the bands (clinical opinion).' },
    pathLabel: 'Hands sweep together', guides: [{ id: 'elbowAngle', kind: 'jointAngle', joint: 'elbow_r', normBand: [10, 30], label: 'Elbows slightly bent, fixed' }],
    checks: { measure: { name: 'kneeFlexion', min: 3, max: 22 } },
  },
  {
    id: 'band-high-fly', name: 'Band High Fly', url: 'https://gymvisual.com/videos/8659-band-high-fly-male.html',
    aliases: ['Band high-to-low fly', 'Standing band decline fly', 'Band crossover fly (high anchor)'],
    bodyPart: 'Chest (lower, sternal fibres)', secondary: ['Front of the shoulders', 'Lats (assist)'], equipment: ['Resistance band (two)', 'Rack (band anchor)'],
    mechanics: 'Isolation (shoulder)', plane: 'Transverse',
    muscles: { target: both('pec'), synergist: both('ant_deltoid', 'lats', 'biceps'), stabilizer: [...both('serratus', 'forearm_flexors', 'triceps'), 'core', ...both('obliques')], lengthened: both('pec') },
    act: Object.assign({}, FLY_ACT, { lats: [0.12, 0.35] }),
    breathing: { pattern: 'Breathe out as the hands sweep down and together, breathe in as they rise and open.', cadence: 'About 1 s down, short squeeze, about 2 s back' },
    prescription: { tempo: '2-0-1-1', progression: 'More reps, a slower return, a step farther from the rack, then the next band up.' },
    phases: [
      ['Arms high and open', 'Loop a band round each rack upright behind you, well above head height. Staggered stance, slight forward lean, knees soft; a band end in each hand, arms up and out in a wide V, elbows slightly bent.'],
      ['Sweep down and in', 'Breathe out and sweep the hands down and forward in a wide arc until they meet in front of the hips; keep the elbow bend fixed.'],
      ['Squeeze', 'Hands together low in front, chest proud, shoulders down.'],
      ['Return slowly', 'Breathe in and let the band draw the arms back up and out along the same arc.'],
      ['Pause high', 'Short pause with the band taut, then sweep again.'],
    ],
    mistakes: [['Bending the elbows to push the hands down', 'Lock the elbow angle and move only at the shoulders.'], ['Rounding the upper back at the bottom', 'Keep the chest up as the hands meet.'], ['Letting the arms go too far back at the top', 'Stop with the hands a little in front of the body line.'], ['Leaning into the movement to use body weight', 'Keep the trunk still; the arms do the work.']],
    kin: [['Arm path', 'From up and out (about 120-130 degrees of elevation) down and in to the hands together in front of the hips: a high-to-low line that biases the lower (sternal) chest (clinical opinion)'], ['Elbow flexion', 'Fixed, about 15-25 degrees (clinical opinion)'], ['Band', 'Anchored high behind so it resists the downward sweep; dumbbell flyes give pectoral activity similar to the bench press (Solstad 2020) and elastic resistance can match free weights (Andersen 2010).', ['solstad2020', 'andersen2010']], ['Stance', 'Staggered, slight forward lean, so the band does not pull the trunk back (clinical opinion)'], ['Tempo', 'About 1 s down and 2 s back (clinical opinion)']],
    sources: ['solstad2020', 'andersen2010'],
    safety: { cautions: ['Shoulder pain with the arms high: start the arc lower (clinical opinion).'], modify: ['Shoulder discomfort: start with the hands at shoulder height.'], regressions: ['Lighter band or step closer to the rack.', 'Band chest fly at shoulder height.'], progressions: ['Stronger band or step farther from the rack.', 'Pause 2 s with the hands together.', 'Cable high-to-low fly.'] },
    notes: { pec: PEC_NOTE + ' The downward line of the sweep shifts the work toward the lower (sternal) fibres (clinical opinion).', ant_deltoid: 'Assists early in the sweep while the arms are high.', lats: 'Help pull the arms down from overhead (shoulder extension) early in the arc (clinical opinion).', biceps: 'Holds the slight elbow bend (Solstad 2020).', serratus: 'Keeps the shoulder blades on the rib cage.', forearm_flexors: 'Grip the band.', triceps: 'Steadies the elbow angle.', core: 'Keeps the trunk still against the bands.', obliques: 'Resist the bands pulling the trunk back.' },
    pathLabel: 'Hands sweep down and in', guides: [{ id: 'elbowAngle', kind: 'jointAngle', joint: 'elbow_r', normBand: [10, 30], label: 'Elbows slightly bent, fixed' }],
    checks: { measure: { name: 'kneeFlexion', min: 3, max: 22 } },
  },
  {
    id: 'resistance-band-bent-over-reverse-fly', name: 'Resistance Band Bent Over Reverse Fly', url: 'https://gymvisual.com/videos/24716-resistance-band-bent-over-reverse-fly-male.html',
    aliases: ['Bent-over band rear delt fly', 'Band bent-over lateral raise', 'Resistance band rear fly (bent over)'],
    bodyPart: 'Shoulders (posterior deltoid)', secondary: ['Upper back (middle trapezius, rhomboids)'], equipment: ['Resistance band (two, or one long band under both feet)'],
    mechanics: 'Isolation (shoulder)', plane: 'Transverse',
    muscles: { target: both('post_deltoid', 'rhomboids_midtrap'), synergist: both('infraspinatus', 'lat_deltoid', 'upper_traps'), stabilizer: [...both('spinal_extensors', 'hamstrings', 'glute_max', 'forearm_flexors', 'triceps'), 'core'] },
    act: { post_deltoid: [0.2, 0.85], rhomboids_midtrap: [0.25, 0.8], infraspinatus: [0.2, 0.55], lat_deltoid: [0.15, 0.5], upper_traps: [0.15, 0.45], spinal_extensors: [0.3, 0.45], hamstrings: [0.25, 0.35], glute_max: [0.15, 0.25], forearm_flexors: [0.25, 0.35], triceps: [0.12, 0.22], core: [0.2, 0.3] },
    breathing: { pattern: 'Breathe out as the arms sweep out, breathe in as they come back down.', cadence: 'About 1 s up, short squeeze, about 2 s down' },
    prescription: { reps: '12-20', tempo: '2-0-1-1', progression: 'More reps, a longer squeeze, a wider stance on the band, then the next band up.' },
    phases: [
      ['Arms hanging', 'Stand on the bands, feet about hip width; hinge at the hips with a flat back until the trunk is well forward, knees soft. Arms hang under the shoulders, palms facing each other, elbows soft.'],
      ['Sweep out', 'Breathe out and sweep the arms out to the sides in a wide arc, leading with the elbows, until they are about level with the back.'],
      ['Squeeze', 'Squeeze the shoulder blades together; hold the trunk still.'],
      ['Lower slowly', 'Breathe in and lower the arms back under the shoulders against the band.'],
      ['Pause', 'Short pause with the band still taut, then sweep again.'],
    ],
    mistakes: [['Lifting the trunk as the arms rise', 'Hold the hinge; the arms move, the trunk does not.'], ['Rounding the low back', 'Hinge from the hips with a flat back; soften the knees more.'], ['Shrugging the shoulders toward the ears', 'Keep the neck long and the shoulders down.'], ['Bending the elbows to row the band up', 'Keep a fixed slight bend and sweep the arms wide.']],
    kin: [['Trunk', 'Hinged well forward with a flat back (clinical opinion)'], ['Arm path', 'From hanging under the shoulders out to the sides to about level with the back; a neutral grip suits the posterior deltoid (Schoenfeld 2013).', ['schoenfeld2013']], ['Elbow flexion', 'Fixed, about 10-20 degrees (clinical opinion)'], ['Band', 'Each band under the ball of its own foot; tension rises toward the top. Elastic resistance can match free weights (Andersen 2010).', ['andersen2010']], ['Tempo', 'About 1 s up and 2 s down (clinical opinion)']],
    sources: ['schoenfeld2013', 'campos2020', 'andersen2010'],
    safety: { cautions: ['Low back: keep the hinge flat-backed and the band light enough that the trunk stays still (clinical opinion).', 'Keep the band securely under the feet; a band that slips can whip up toward the face.'], modify: ['Low back discomfort: do it seated, leaning forward over the thighs, or chest-supported on an incline bench.'], regressions: ['Lighter band.', 'Band pull-apart (standing).'], progressions: ['Stronger band or a wider stance on the band.', 'Pause 2 s at the top.', 'Dumbbell rear delt fly.'] },
    notes: { post_deltoid: 'Main mover: horizontal abduction of the arm; a neutral grip suits the posterior deltoid (Schoenfeld 2013).', rhomboids_midtrap: 'Pull the shoulder blades together at the top.', infraspinatus: 'Assists horizontal abduction and keeps the arm turned out.', lat_deltoid: 'Assists as the arms reach shoulder level.', upper_traps: 'Steadies the shoulder blades; keep them from shrugging.', spinal_extensors: 'Hold the flat-backed hinge.', hamstrings: 'Hold the hips in the hinge.', glute_max: 'Holds the hips in the hinge.', forearm_flexors: 'Grip the band.', triceps: 'Hold the slight elbow bend.', core: 'Braces the trunk in the hinge.' },
    pathLabel: 'Arms sweep out', guides: [{ id: 'elbowAngle', kind: 'jointAngle', joint: 'elbow_r', normBand: [10, 25], label: 'Elbows slightly bent, fixed' }],
    checks: { measure: { name: 'trunkFlexion', min: 50, max: 75 } },
  },
  {
    id: 'band-kneeling-single-arm-horizontal-row', name: 'Band Kneeling Single Arm Horizontal Row', url: 'https://gymvisual.com/videos/23274-band-kneeling-single-arm-horizontal-row-male.html', uni: true,
    aliases: ['Kneeling one-arm band row', 'Tall-kneeling single-arm band row', 'Band kneeling one-arm horizontal row'],
    bodyPart: 'Back (lats, middle trapezius, rhomboids)', secondary: ['Rear of the shoulder', 'Biceps', 'Core (anti-rotation)'], equipment: ['Resistance band', 'Rack (band anchor)', 'Exercise mat (optional)'],
    mechanics: 'Compound (shoulder and elbow)', plane: 'Transverse',
    muscles: { target: right('lats', 'rhomboids_midtrap'), synergist: right('post_deltoid', 'biceps', 'infraspinatus'), stabilizer: [...right('forearm_flexors', 'upper_traps'), 'core', ...both('obliques', 'glute_max')] },
    act: Object.assign({}, ROW_ACT, { glute_max: [0.2, 0.3] }),
    breathing: { pattern: 'Breathe out as you row, breathe in as the arm reaches forward again.', cadence: 'About 1 s row, short squeeze, about 2 s back' },
    prescription: { reps: '10-15 each side', tempo: '2-0-1-1', progression: 'More reps, a longer squeeze, kneeling farther from the rack, then the next band up.' },
    phases: [
      ['Arm reaching forward', 'Tall kneeling facing a rack, knees about hip width, glutes squeezed, trunk tall. The band is looped round the upright at about chest height; hold it in the right hand, arm straight toward the upright, palm facing in. Left hand on the hip.'],
      ['Row', 'Breathe out and pull the elbow straight back close to the side until the hand reaches the lower ribs, the shoulder blade drawing back.'],
      ['Squeeze', 'Squeeze the shoulder blade toward the spine; hips and shoulders stay square to the rack.'],
      ['Return slowly', 'Breathe in and let the arm reach forward again under control, letting the shoulder blade glide forward at the end.'],
      ['Pause', 'Short pause with the band taut, then row again.'],
    ],
    mistakes: [['Twisting the trunk to pull the band', 'Keep the hips and shoulders square to the anchor; brace the trunk.'], ['Sitting back onto the heels', 'Squeeze the glutes and keep the hips over the knees.'], ['Shrugging the shoulder up', 'Pull the elbow back and down toward the back pocket.'], ['Elbow flaring out wide', 'Keep the elbow close to the side for a horizontal row.']],
    kin: [['Elbow path', 'Elbow travels straight back close to the side, to a little behind the trunk (clinical opinion)'], ['Elbow flexion', 'Nearly straight in front to about 100-120 degrees at the ribs, the forearm staying in line with the band (clinical opinion)'], ['Shoulder blade', 'Protracted at the reach, retracted at the end of the row (clinical opinion)'], ['Kneeling', 'Tall kneeling, hips over the knees: one-arm rows also load the trunk against rotation (Fenwick 2009).', ['fenwick2009']], BANDS_EMG, ['Tempo', 'About 1 s row and 2 s return (clinical opinion)']],
    sources: ['fenwick2009', 'lehman2004', 'andersen2010'],
    safety: { cautions: ['Knee discomfort: kneel on a mat or a folded towel.'], modify: ['Knee discomfort: half-kneeling or standing.'], regressions: ['Lighter band or kneel closer to the rack.', 'Both arms together.'], progressions: ['Stronger band or kneel farther away.', 'Half-kneeling (narrower base, more anti-rotation demand).', 'One-arm dumbbell row.'] },
    notes: { lats: 'Extend the shoulder as the elbow drives back (Lehman 2004 compared muscle activity across rows and pulldowns).', rhomboids_midtrap: 'Retract the shoulder blade at the end of the row.', post_deltoid: 'Extends the arm behind the body.', biceps: 'Bends the elbow.', infraspinatus: 'Steadies the shoulder through the row.', forearm_flexors: 'Grip the band.', upper_traps: 'Steady the shoulder blade; keep it from shrugging.', core: 'Braces the trunk in tall kneeling.', obliques: 'Resist the one-arm pull twisting the trunk (Fenwick 2009 measured trunk muscle demand in rowing exercises).', glute_max: 'Keeps the hips extended over the knees.' },
    pathLabel: 'Hand rows to the ribs', guides: [{ id: 'elbowAngle', kind: 'jointAngle', joint: 'elbow_r', normBand: [95, 125], label: 'Elbow about 110 at the ribs' }],
    checks: { measure: { name: 'kneeFlexion', min: 80, max: 110 } },
  },
  {
    id: 'band-narrow-grip-high-row', name: 'Band Narrow Grip High Row', url: 'https://gymvisual.com/videos/12877-band-narrow-grip-high-row.html',
    aliases: ['Band close grip high row', 'Standing band high row (neutral grip)', 'Band narrow-grip row to the chest'],
    bodyPart: 'Back (lats, middle trapezius, rhomboids)', secondary: ['Rear of the shoulders', 'Biceps'], equipment: ['Resistance band', 'Rack (band anchor)'],
    mechanics: 'Compound (shoulder and elbow)', plane: 'Sagittal',
    muscles: { target: both('lats', 'rhomboids_midtrap'), synergist: both('post_deltoid', 'biceps', 'infraspinatus'), stabilizer: [...both('forearm_flexors', 'upper_traps'), 'core', ...both('spinal_extensors')] },
    act: ROW_ACT,
    breathing: { pattern: 'Breathe out as you row the hands to the chest, breathe in as the arms reach back up.', cadence: 'About 1 s row, short squeeze, about 2 s back' },
    prescription: { tempo: '2-0-1-1', progression: 'More reps, a longer squeeze, a step farther from the rack, then the next band up.' },
    phases: [
      ['Arms reaching up', 'Stand facing a rack, feet about hip width, knees soft. The band is looped round the upright above head height; hold both strands close together, palms facing, arms reaching up toward the upright.'],
      ['Row to the chest', 'Breathe out and pull the hands down and back to the upper chest, elbows travelling down and back close to the body, chest up.'],
      ['Squeeze', 'Squeeze the shoulder blades back and down; hands at the top of the chest.'],
      ['Return slowly', 'Breathe in and let the arms reach back up toward the upright under control.'],
      ['Pause', 'Short pause with the band taut, then row again.'],
    ],
    mistakes: [['Leaning back to pull with body weight', 'Stand tall; the arms and shoulder blades do the work.'], ['Shrugging the shoulders up at the end', 'Finish with the shoulders down and back.'], ['Hands drifting apart', 'Keep the hands together, palms facing.'], ['Letting the band snap the arms back', 'Return for about 2 s.']],
    kin: [['Arm path', 'From reaching up toward the anchor (about 100-110 degrees of elevation) down to the elbows beside the ribs (clinical opinion)'], ['Elbow flexion', 'Nearly straight at the reach to about 110-130 degrees at the chest (clinical opinion)'], ['Grip', 'Narrow neutral grip, hands together; close-grip pulldowns and rows load the lats comparably to wide grips (Lehman 2004).', ['lehman2004']], BANDS_EMG, ['Tempo', 'About 1 s row and 2 s return (clinical opinion)']],
    sources: ['lehman2004', 'andersen2010'],
    safety: { cautions: ['Shoulder pain with the arms high: start the reach lower (clinical opinion).'], modify: ['Shoulder discomfort: anchor the band at chest height (horizontal row).'], regressions: ['Lighter band or step closer to the rack.', 'Seated band row.'], progressions: ['Stronger band or step farther away.', 'Pause 2 s at the chest.', 'Cable close-grip pulldown or high row.'] },
    notes: { lats: 'Pull the arms down and back from overhead (shoulder extension); Lehman 2004 compared lat activity across grips in rows and pulldowns.', rhomboids_midtrap: 'Retract the shoulder blades at the chest.', post_deltoid: 'Extends the arms behind the trunk line.', biceps: 'Bends the elbows; the neutral grip shares the work with the brachialis and brachioradialis.', infraspinatus: 'Steadies the shoulders.', forearm_flexors: 'Grip the band.', upper_traps: 'Steady the shoulder blades.', core: 'Keeps the trunk upright against the band.', spinal_extensors: 'Hold the chest up.' },
    pathLabel: 'Hands row down to the chest', guides: [{ id: 'elbowAngle', kind: 'jointAngle', joint: 'elbow_r', normBand: [100, 130], label: 'Elbows well bent at the chest' }],
    checks: { measure: { name: 'kneeFlexion', min: 3, max: 20 } },
  },
  {
    id: 'band-standing-single-arm-row', name: 'Band Standing Single Arm Row', url: 'https://gymvisual.com/animated-gifs/12298-band-standing-single-arm-row.html', uni: true,
    aliases: ['Standing one-arm band row', 'Single-arm band row (standing)', 'Band one-arm row'],
    bodyPart: 'Back (lats, middle trapezius, rhomboids)', secondary: ['Rear of the shoulder', 'Biceps', 'Core (anti-rotation)'], equipment: ['Resistance band', 'Rack (band anchor)'],
    mechanics: 'Compound (shoulder and elbow)', plane: 'Transverse',
    muscles: { target: right('lats', 'rhomboids_midtrap'), synergist: right('post_deltoid', 'biceps', 'infraspinatus'), stabilizer: [...right('forearm_flexors', 'upper_traps'), 'core', ...both('obliques', 'glute_med')] },
    act: ROW_ACT,
    breathing: { pattern: 'Breathe out as you row, breathe in as the arm reaches forward.', cadence: 'About 1 s row, short squeeze, about 2 s back' },
    prescription: { reps: '10-15 each side', tempo: '2-0-1-1', progression: 'More reps, a longer squeeze, a step farther from the rack, then the next band up.' },
    phases: [
      ['Arm reaching forward', 'Staggered stance facing a rack, left foot forward, knees soft, trunk tall. The band is looped round the upright at about waist-to-chest height; hold it in the right hand, arm straight toward the upright, palm facing in. Left hand on the hip.'],
      ['Row', 'Breathe out and drive the elbow back close to the side until the hand reaches the lower ribs.'],
      ['Squeeze', 'Squeeze the shoulder blade toward the spine; hips and shoulders square to the rack.'],
      ['Return slowly', 'Breathe in and let the arm reach forward under control, the shoulder blade gliding forward at the end.'],
      ['Pause', 'Short pause with the band taut, then row again.'],
    ],
    mistakes: [['Rotating the trunk to finish the row', 'Keep the shoulders square; brace against the twist.'], ['Shrugging the shoulder', 'Pull the elbow back and down.'], ['Elbow flaring out wide', 'Keep the elbow close to the side.'], ['Leaning back as the band tightens', 'Stand tall over the front foot.']],
    kin: [['Elbow path', 'Elbow travels straight back close to the side (clinical opinion)'], ['Elbow flexion', 'Nearly straight in front to about 100-120 degrees at the ribs, the forearm staying in line with the band (clinical opinion)'], ['Shoulder blade', 'Protracted at the reach, retracted at the end of the row (clinical opinion)'], ['Stance', 'Staggered, opposite foot forward; standing one-arm pulls raise trunk muscle activity (Saeterbakken and Fimland 2012; Fenwick 2009).', ['saeterbakken2012', 'fenwick2009']], BANDS_EMG, ['Tempo', 'About 1 s row and 2 s return (clinical opinion)']],
    sources: ['fenwick2009', 'saeterbakken2012', 'andersen2010'],
    safety: { cautions: ['Low back: keep the trunk tall rather than leaning back against the band (clinical opinion).'], modify: ['Balance: square stance with the feet hip width.'], regressions: ['Lighter band or step closer to the rack.', 'Both arms together.'], progressions: ['Stronger band or step farther away.', 'Pause 2 s at the ribs.', 'One-arm dumbbell row or one-arm cable row.'] },
    notes: { lats: 'Extend the shoulder as the elbow drives back (Lehman 2004).', rhomboids_midtrap: 'Retract the shoulder blade at the end of the row.', post_deltoid: 'Extends the arm behind the body.', biceps: 'Bends the elbow.', infraspinatus: 'Steadies the shoulder.', forearm_flexors: 'Grip the band.', upper_traps: 'Steady the shoulder blade.', core: 'Braces the trunk.', obliques: 'Resist the one-arm pull twisting the trunk (Saeterbakken and Fimland 2012 found more trunk activity with unilateral and standing exercises).', glute_med: 'Steadies the pelvis in the staggered stance.' },
    pathLabel: 'Hand rows to the ribs', guides: [{ id: 'elbowAngle', kind: 'jointAngle', joint: 'elbow_r', normBand: [95, 125], label: 'Elbow about 110 at the ribs' }],
    checks: { measure: { name: 'kneeFlexion', min: 3, max: 22 } },
  },
  {
    id: 'band-high-pulley-overhead-triceps-extension', name: 'Band High Pulley Overhead Triceps Extension', url: 'https://gymvisual.com/videos/14742-band-high-pulley-overhead-triceps-extension.html',
    aliases: ['Band overhead triceps extension (high anchor)', 'Standing band overhead extension facing away', 'Band French press (high anchor)'],
    bodyPart: 'Triceps', secondary: ['Shoulders (stabilisers)', 'Core'], equipment: ['Resistance band', 'Rack (band anchor)'],
    mechanics: 'Isolation (elbow)', plane: 'Sagittal',
    muscles: { target: both('triceps'), synergist: both('forearm_extensors'), stabilizer: [...both('ant_deltoid', 'lat_deltoid', 'serratus', 'upper_traps', 'forearm_flexors'), 'core', ...both('obliques')], lengthened: both('triceps') },
    act: { triceps: [0.2, 0.9], forearm_extensors: [0.15, 0.35], ant_deltoid: [0.2, 0.35], lat_deltoid: [0.15, 0.25], serratus: [0.2, 0.35], upper_traps: [0.2, 0.3], forearm_flexors: [0.3, 0.45], core: [0.25, 0.4], obliques: [0.15, 0.3] },
    breathing: { pattern: 'Breathe out as the arms straighten, breathe in as the band draws the hands back behind the head.', cadence: 'About 1 s out, short pause, about 2 s back' },
    prescription: { reps: '12-15', tempo: '2-0-1-1', progression: 'More reps, a slower return, a step farther from the rack, then the next band up.' },
    phases: [
      ['Hands behind the head', 'Loop the band round a rack upright behind you, above head height. Staggered stance facing away, lean forward a little, trunk braced. Hold the band in both hands behind the head, palms facing, upper arms forward and up beside the head, elbows bent.'],
      ['Straighten the arms', 'Breathe out and straighten the elbows, pushing the hands forward and up in line with the upper arms; only the forearms move.'],
      ['Arms straight', 'Arms straight but not locked hard, upper arms beside the head; squeeze the triceps.'],
      ['Bend slowly', 'Breathe in and let the band draw the hands back behind the head, keeping the elbows pointing forward.'],
      ['Pause in the stretch', 'Short pause with the elbows fully bent, then straighten again.'],
    ],
    mistakes: [['Elbows flaring out to the sides', 'Keep the elbows about shoulder width, pointing forward.'], ['Upper arms swinging (turning it into a pullover)', 'Hold the upper arms still; move only at the elbows.'], ['Arching the low back', 'Ribs down, slight forward lean, glutes braced.'], ['Cutting the stretch short', 'Let the hands come well behind the head.']],
    kin: [['Elbow flexion', 'About 110-120 degrees in the stretch to nearly straight; overhead elbow extension grew the triceps more than the neutral-arm position (Maeo et al. 2022).', ['overhead2022']], ['Upper arm', 'Still, forward and up beside the head (clinical opinion)'], ['Band', 'Anchored high behind so it pulls the hands back toward the stretch; Boehler 2011 compared triceps activity across exercises.', ['boehler2011']], ['Trunk', 'Staggered stance, leaning forward about 15-20 degrees (clinical opinion)'], ['Tempo', 'About 1 s out and 2 s back (clinical opinion)']],
    sources: ['overhead2022', 'kholinne2018', 'boehler2011', 'andersen2010'],
    safety: { cautions: ['Elbow pain: shorten the stretch (clinical opinion).', 'Shoulder pain overhead: lower the upper arms toward horizontal (clinical opinion).'], modify: ['Shoulder discomfort: upper arms pointing more forward than up.'], regressions: ['Lighter band or step closer to the rack.', 'Band triceps pushdown.'], progressions: ['Stronger band or step farther away.', 'Pause 2 s in the stretch.', 'Cable overhead triceps extension.'] },
    notes: { triceps: 'Main mover. With the arms overhead the long head works from a stretched position; overhead extensions grew the triceps more than neutral-arm extensions (Maeo et al. 2022), and the heads share the work differently across the range (Kholinne 2018).', forearm_extensors: 'Steady the wrists.', ant_deltoid: 'Holds the upper arms up.', lat_deltoid: 'Holds the upper arms up.', serratus: 'Rotates the shoulder blades upward with the arms overhead.', upper_traps: 'Support the raised arms.', forearm_flexors: 'Grip the band.', core: 'Braces the trunk against the band pulling back (clinical opinion).', obliques: 'Help keep the ribs down.' },
    pathLabel: 'Hands push forward and up', guides: [{ id: 'elbowAngle', kind: 'jointAngle', joint: 'elbow_r', normBand: [100, 125], label: 'Elbows about 110-120 in the stretch' }],
    checks: { measure: { name: 'kneeFlexion', min: 3, max: 22 } },
  },
  {
    id: 'band-kneeling-one-arm-pulldown', name: 'Band Kneeling One Arm Pulldown', url: 'https://gymvisual.com/videos/8995-band-kneeling-one-arm-pulldown.html', uni: true,
    aliases: ['Kneeling single-arm band pulldown', 'Band one-arm lat pulldown (kneeling)', 'Tall-kneeling band pulldown'],
    bodyPart: 'Back (lats)', secondary: ['Biceps', 'Rear of the shoulder', 'Lower trapezius'], equipment: ['Resistance band', 'Rack (band anchor)', 'Exercise mat (optional)'],
    mechanics: 'Compound (shoulder and elbow)', plane: 'Frontal',
    muscles: { target: right('lats'), synergist: right('biceps', 'rhomboids_midtrap', 'post_deltoid'), stabilizer: [...right('forearm_flexors', 'infraspinatus', 'triceps'), 'core', ...both('obliques', 'glute_max')], lengthened: right('lats') },
    act: { lats: [0.25, 0.85], biceps: [0.2, 0.6], rhomboids_midtrap: [0.2, 0.6], post_deltoid: [0.15, 0.45], forearm_flexors: [0.3, 0.5], infraspinatus: [0.15, 0.35], triceps: [0.1, 0.25], core: [0.2, 0.35], obliques: [0.15, 0.4], glute_max: [0.2, 0.3] },
    breathing: { pattern: 'Breathe out as you pull down, breathe in as the arm reaches back up.', cadence: 'About 1 s down, short squeeze, about 2 s up' },
    prescription: { reps: '10-15 each side', tempo: '2-0-1-1', progression: 'More reps, a longer squeeze, a stronger band.' },
    phases: [
      ['Arm reaching up', 'Tall kneeling facing a rack, knees about hip width, glutes squeezed. The band is looped round the upright well above head height; hold it in the right hand, arm reaching up toward it, palm facing in. Left hand on the hip.'],
      ['Pull down', 'Breathe out and pull the elbow down to the side of the ribs, the hand finishing in front of the shoulder.'],
      ['Squeeze', 'Squeeze the lat and draw the shoulder blade down; trunk tall and square.'],
      ['Reach up slowly', 'Breathe in and let the arm reach back up toward the anchor, letting the shoulder blade rise at the top.'],
      ['Pause in the stretch', 'Short pause with the arm long, then pull again.'],
    ],
    mistakes: [['Leaning or side-bending toward the working arm', 'Stay tall and square; brace the trunk.'], ['Pulling with the hand instead of the elbow', 'Think of driving the elbow down to the back pocket.'], ['Shrugging at the bottom', 'Finish with the shoulder blade down.'], ['Sitting back onto the heels', 'Keep the hips over the knees.']],
    kin: [['Arm path', 'From reaching up toward the anchor (about 130-140 degrees of elevation) down to the elbow beside the ribs (clinical opinion)'], ['Elbow flexion', 'Nearly straight at the top to about 130-145 degrees at the bottom, the forearm in line with the band (clinical opinion)'], ['Shoulder blade', 'Elevated and upwardly rotated at the reach, depressed at the bottom (clinical opinion)'], ['Kneeling', 'Tall kneeling, hips over the knees; pulldown-type pulls load the lats strongly (Lehman 2004).', ['lehman2004']], BANDS_EMG, ['Tempo', 'About 1 s down and 2 s up (clinical opinion)']],
    sources: ['lehman2004', 'andersen2010'],
    safety: { cautions: ['Knee discomfort: kneel on a mat or a folded towel.', 'Shoulder pain at the top: stop the reach short of full overhead (clinical opinion).'], modify: ['Knee discomfort: half-kneeling or seated on a box.'], regressions: ['Lighter band.', 'Both arms together.'], progressions: ['Stronger band.', 'Pause 2 s at the bottom.', 'Cable one-arm pulldown.'] },
    notes: { lats: 'Main mover: pulls the arm down from overhead (shoulder adduction and extension); Lehman 2004 compared lat activity across pulldowns and rows.', biceps: 'Bends the elbow.', rhomboids_midtrap: 'Draw the shoulder blade back and down.', post_deltoid: 'Assists as the elbow moves behind the trunk line.', forearm_flexors: 'Grip the band.', infraspinatus: 'Steadies the shoulder.', triceps: 'Long head assists shoulder extension.', core: 'Braces the trunk in tall kneeling.', obliques: 'Resist the side bend toward the working arm.', glute_max: 'Keeps the hips over the knees.' },
    pathLabel: 'Hand pulls down to the shoulder', guides: [{ id: 'elbowAngle', kind: 'jointAngle', joint: 'elbow_r', normBand: [125, 150], label: 'Elbow well bent at the bottom' }],
    checks: { measure: { name: 'kneeFlexion', min: 80, max: 110 } },
  },
  {
    id: 'band-close-grip-biceps-curl', name: 'Band Close Grip Biceps Curl', url: 'https://gymvisual.com/videos/10723-band-close-grip-biceps-curl.html',
    aliases: ['Band narrow-grip curl', 'Close-grip resistance band curl', 'Standing band curl (hands close)'],
    bodyPart: 'Biceps', secondary: ['Forearms (brachioradialis)'], equipment: ['Resistance band (two, or one long band under both feet)'],
    mechanics: 'Isolation (elbow)', plane: 'Sagittal',
    muscles: { target: both('biceps'), synergist: both('forearm_flexors'), stabilizer: [...both('forearm_extensors', 'ant_deltoid', 'upper_traps'), 'core'] },
    act: CURL_ACT,
    breathing: { pattern: 'Breathe out as you curl up, breathe in as you lower.', cadence: 'About 1 s up, short squeeze, about 2 s down' },
    prescription: { tempo: '2-0-1-1', progression: 'More reps, a slower lowering, a wider stance on the band, then the next band up.' },
    phases: [
      ['Arms straight', 'Stand on the bands with the feet close together, knees soft. A band end in each hand in front of the thighs, hands close together (narrower than the hips), palms forward, elbows by the sides.'],
      ['Curl up', 'Breathe out and curl the hands up toward the chest, keeping the elbows at the sides and the hands close.'],
      ['Squeeze', 'Squeeze the biceps at the top, where the band is most stretched; elbows still by the sides.'],
      ['Lower slowly', 'Breathe in and lower against the band to straight arms.'],
      ['Pause', 'Short pause with the arms straight and the band taut, then curl again.'],
    ],
    mistakes: [['Elbows drifting forward or flaring out', 'Pin the elbows to the sides of the ribs.'], ['Swinging the trunk', 'Stand tall, knees soft; use a lighter band.'], ['Hands drifting apart', 'Keep the hands close, narrower than the hips.'], ['Dropping the hands quickly', 'Lower for about 2 s.']],
    kin: [['Elbow flexion', 'Nearly straight to about 130 degrees at the top (clinical opinion)'], ['Forearm rotation', 'Palms forward (supinated); a supinated grip gives the highest biceps activity among curl grips (Coratella 2023; Marcolin 2018).', ['coratella2023', 'marcolin2018']], ['Upper arm', 'Upper arms stay beside the trunk, drifting forward only a little at the top (clinical opinion)'], ['Hand spacing', 'Hands narrower than the hips (clinical opinion)'], ['Band', 'Each band under the ball of its own foot; tension rises toward the top. Elastic resistance can match free weights (Andersen 2010).', ['andersen2010']], ['Tempo', 'About 1 s up and 2 s down (clinical opinion)']],
    sources: ['coratella2023', 'marcolin2018', 'andersen2010'],
    safety: { cautions: ['Keep the bands securely under the feet; a band that slips can whip up toward the face.', 'Elbow or wrist pain with the close grip: widen the hands to shoulder width (clinical opinion).'], modify: ['Wrist discomfort: hammer grip (palms facing).'], regressions: ['Lighter band.', 'One arm at a time.'], progressions: ['Stronger band or a wider stance on the band.', 'Pause 2 s at the top.', 'Dumbbell close grip curl.'] },
    notes: { biceps: 'Main mover: bends the elbow and keeps the forearm turned palm-up; the supinated grip gives the highest biceps activity (Coratella 2023; Marcolin 2018).', forearm_flexors: 'Grip the band and assist elbow flexion (brachioradialis).', forearm_extensors: 'Steady the wrist.', ant_deltoid: 'Holds the upper arm still as the band pulls the hand down.', upper_traps: 'Steady the shoulders.', core: 'Keeps the trunk still.' },
    pathLabel: 'Hands curl up', guides: [{ id: 'elbowAngle', kind: 'jointAngle', joint: 'elbow_r', normBand: [120, 140], label: 'Elbows bent about 130 at the top' }],
    checks: { measure: { name: 'kneeFlexion', min: 3, max: 20 } },
  },
  {
    id: 'band-incline-hammer-curl', name: 'Band Incline Hammer Curl', url: 'https://gymvisual.com/videos/16992-band-incline-hammer-curl.html',
    aliases: ['Incline band hammer curl', 'Resistance band incline neutral-grip curl', 'Band incline bench hammer curl'],
    bodyPart: 'Biceps', secondary: ['Forearms (brachioradialis)'], equipment: ['Resistance band (two)', 'Adjustable bench', 'Rack (band anchor)'],
    mechanics: 'Isolation (elbow)', plane: 'Sagittal',
    muscles: { target: both('biceps', 'forearm_flexors'), synergist: both('forearm_extensors'), stabilizer: [...both('ant_deltoid'), 'core'], lengthened: both('biceps') },
    act: { biceps: [0.2, 0.8], forearm_flexors: [0.3, 0.8], forearm_extensors: [0.2, 0.5], ant_deltoid: [0.12, 0.25], core: [0.1, 0.18] },
    breathing: { pattern: 'Breathe out as you curl up, breathe in as you lower.', cadence: 'About 1 s up, short squeeze, about 2.5 s down' },
    prescription: { tempo: '3-1-1-0 (2.5 s down, pause in the stretch, 1 s up)', progression: 'More reps, a slower lowering, a stronger band.' },
    durs: [0.8, 1.2, 0.3, 2.5, 1.2],
    phases: [
      ['Arms hanging', 'Sit back on a bench set to about 55 degrees, back and head supported, feet flat. A rack stands behind the bench with a band looped low round each upright; hold a band end in each hand, arms hanging straight down behind the trunk line, palms facing in (thumbs forward).'],
      ['Curl up', 'Breathe out and curl both hands up, thumbs leading, keeping the upper arms back and still.'],
      ['Squeeze', 'Squeeze at the top, where the band is most stretched; palms still facing each other.'],
      ['Lower slowly', 'Breathe in and lower slowly against the band to straight arms.'],
      ['Pause in the stretch', 'Pause with the arms hanging straight behind the trunk line, then curl again.'],
    ],
    mistakes: [['Upper arms swinging forward to finish the curl', 'Keep the elbows back; let the forearms do the moving.'], ['Lifting the back off the pad', 'Keep the back and head on the pad.'], ['Turning the palms up (it becomes a regular curl)', 'Keep the thumbs up and palms facing in throughout.'], ['Cutting the stretch short', 'Straighten the arms fully at the bottom.']],
    kin: [['Elbow flexion', 'From straight to about 125-135 degrees at the top (clinical opinion)'], ['Forearm rotation', 'Neutral (thumbs up) throughout; the hammer grip shifts work to the brachioradialis (Coratella 2023; Marcolin 2018).', ['coratella2023', 'marcolin2018']], ['Upper arm', 'Hangs behind the trunk line, as in the incline curl, which stretches the biceps long head (Oliveira 2009).', ['oliveira2009']], ['Band', 'Looped low round the rack uprights behind the bench, so it resists the whole curl as gravity does with a dumbbell (clinical opinion)'], ['Tempo', 'About 1.2 s up and 2.5 s down (clinical opinion)'], ['Back pad angle', 'About 45-60 degrees (Oliveira 2009 tested shoulder positions in dumbbell curls).', ['oliveira2009']]],
    sources: ['oliveira2009', 'coratella2023', 'marcolin2018', 'andersen2010'],
    safety: { cautions: ['Shoulder pain in the stretched start position: raise the back pad (clinical opinion).'], modify: ['Shoulder discomfort: raise the back pad toward upright.'], regressions: ['Lighter band.', 'Seated or standing band hammer curl.'], progressions: ['Stronger band.', 'Pause 2 s at the top.', 'Incline dumbbell hammer curl.'] },
    notes: { biceps: 'Bends the elbow from a stretched position (arms behind the trunk), as in the incline curl (Oliveira 2009); the neutral grip lowers biceps activity a little compared with palms up (Coratella 2023).', forearm_flexors: 'Brachioradialis is strongly involved with the hammer grip (Coratella 2023; Marcolin 2018), and the hand grips the band.', forearm_extensors: 'Steady the wrist in neutral.', ant_deltoid: 'Holds the upper arm back and still.', core: 'Keeps the trunk on the pad.' },
    pathLabel: 'Hands curl up, thumbs leading', guides: [{ id: 'elbowAngle', kind: 'jointAngle', joint: 'elbow_r', normBand: [30, 140], label: 'Elbow bends through a full range' }],
    checks: { measure: { name: 'trunkFlexion', min: 25, max: 50 } },
  },
  {
    id: 'band-prone-incline-hammer-curl', name: 'Band Prone Incline Hammer Curl', url: 'https://gymvisual.com/videos/16990-band-prone-incline-hammer-curl.html',
    aliases: ['Band chest-supported hammer curl', 'Prone incline band hammer curl', 'Band spider hammer curl (incline bench)'],
    bodyPart: 'Biceps', secondary: ['Forearms (brachioradialis)'], equipment: ['Resistance band (two)', 'Adjustable bench', 'Rack (band anchor)'],
    mechanics: 'Isolation (elbow)', plane: 'Sagittal',
    muscles: { target: both('biceps', 'forearm_flexors'), synergist: both('forearm_extensors'), stabilizer: [...both('ant_deltoid', 'post_deltoid', 'rhomboids_midtrap'), 'core'] },
    act: { biceps: [0.2, 0.85], forearm_flexors: [0.3, 0.8], forearm_extensors: [0.2, 0.5], ant_deltoid: [0.12, 0.3], post_deltoid: [0.12, 0.22], rhomboids_midtrap: [0.12, 0.2], core: [0.1, 0.15] },
    breathing: { pattern: 'Breathe out as you curl up, breathe in as you lower.', cadence: 'About 1 s up, short squeeze, about 2 s down' },
    prescription: { tempo: '2-0-1-1', progression: 'More reps, a longer squeeze, a stronger band.' },
    phases: [
      ['Arms hanging', 'Lie chest-down on a bench set to about 40 degrees, chin just over the top, balls of the feet on the floor behind. A rack stands under the hands with a band looped low round each upright; hold a band end in each hand, arms hanging straight down, palms facing in.'],
      ['Curl up', 'Breathe out and curl both hands up toward the shoulders, thumbs leading, upper arms still and vertical.'],
      ['Squeeze', 'Squeeze at the top; chest stays on the pad.'],
      ['Lower slowly', 'Breathe in and lower slowly against the band to straight arms.'],
      ['Pause', 'Short pause with the arms hanging straight, then curl again.'],
    ],
    mistakes: [['Upper arms swinging back to help the curl', 'Keep the upper arms vertical and still.'], ['Lifting the chest off the pad', 'Keep the chest on the pad and the neck long.'], ['Turning the palms up', 'Keep the thumbs leading and the palms facing in throughout.'], ['Stopping short of straight arms', 'Lower all the way down each rep.']],
    kin: [['Elbow flexion', 'From straight to about 125-135 degrees at the top (clinical opinion)'], ['Forearm rotation', 'Neutral (thumbs up) throughout; the hammer grip shifts work to the brachioradialis (Coratella 2023; Marcolin 2018).', ['coratella2023', 'marcolin2018']], ['Upper arm', 'Vertical and still, in front of the trunk line: the shortened-biceps position of the prone (spider) curl (Oliveira 2009 tested shoulder positions in curls).', ['oliveira2009']], ['Chest on the pad', 'Chest supported on the pad so the trunk cannot swing (clinical opinion)'], ['Band', 'Looped low round the rack uprights, so the strands run down and back from the hands and resist the whole curl (clinical opinion)'], ['Tempo', 'About 1 s up and 2 s down (clinical opinion)']],
    sources: ['oliveira2009', 'coratella2023', 'marcolin2018', 'andersen2010'],
    safety: { cautions: ['Chest or neck discomfort on the pad: lower the bench angle a little or pad the edge (clinical opinion).'], modify: ['Neck discomfort: rest the chin on a folded towel at the top of the pad.'], regressions: ['Lighter band.', 'Standing band hammer curl.'], progressions: ['Stronger band.', 'Pause 2 s at the top.', 'Dumbbell prone incline curl.'] },
    notes: { biceps: 'Bends the elbow with the upper arm in front of the trunk, where the biceps works hardest near the top of the curl (clinical opinion; Oliveira 2009 tested shoulder positions in curls); the hammer grip shares the work with the brachioradialis (Coratella 2023).', forearm_flexors: 'Brachioradialis is strongly involved with the neutral grip (Coratella 2023; Marcolin 2018), and the hand grips the band.', forearm_extensors: 'Steady the wrist in neutral.', ant_deltoid: 'Holds the upper arm vertical as the forearm rises.', post_deltoid: 'Stops the upper arm swinging forward.', rhomboids_midtrap: 'Hold the shoulder blades steady on the pad.', core: 'Holds the trunk on the pad.' },
    pathLabel: 'Hands curl up, thumbs leading', guides: [{ id: 'elbowAngle', kind: 'jointAngle', joint: 'elbow_r', normBand: [30, 140], label: 'Elbow bends through a full range' }],
    checks: { measure: { name: 'kneeFlexion', min: 25, max: 45 } },
  },
];

if (require.main === module) {
  const only = process.argv.slice(2);
  for (const s of SPECS) {
    if (only.length && !only.includes(s.id)) continue;
    const m = make(s);
    fs.writeFileSync(path.join(META, `${s.id}.json`), JSON.stringify(m, null, 1) + '\n');
    console.log(`wrote build/meta/${s.id}.json`);
  }
}
module.exports = { make, SPECS };
