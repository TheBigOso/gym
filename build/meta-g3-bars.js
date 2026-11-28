// Meta generator for the g3-bars group: writes build/meta/<id>.json for each exercise below from a compact spec.
// Shared pieces (camera, activation curves from the phase timeline and muscle roles, muscle notes, source records
// reused from existing metas) are filled in here, so each spec only holds what is specific to the exercise.
// Run: node build/meta-g3-bars.js [ids...]   (then the authors fill the measured kinematics rows)
const fs = require('fs');
const path = require('path');
const metaDir = path.join(__dirname, 'meta');
const clone = (o) => JSON.parse(JSON.stringify(o));
const BILAT = new Set(['obliques', 'spinal_extensors', 'rhomboids_midtrap', 'post_deltoid', 'infraspinatus', 'serratus', 'triceps', 'glute_med', 'pec', 'ant_deltoid', 'quads', 'hamstrings', 'glute_max', 'adductors', 'hip_flexors', 'calves', 'lats', 'biceps', 'forearm_flexors', 'forearm_extensors', 'lat_deltoid', 'upper_traps']);
// 'lats' -> lats_r, lats_l; 'lats_r' stays; 'core' stays
const expand = (list) => list.flatMap((m) => (BILAT.has(m) ? [`${m}_r`, `${m}_l`] : [m]));
const baseId = (m) => m.replace(/_(r|l)$/, '');

// source records reused from existing metas (by id), so titles and links match the rest of the library
const SRC = {};
for (const f of fs.readdirSync(metaDir)) {
  try { const m = JSON.parse(fs.readFileSync(path.join(metaDir, f), 'utf8')); for (const s of m.exercise.sources || []) if (s.id !== 'gymvisual' && !SRC[s.id]) SRC[s.id] = s; } catch (e) { /* skip */ }
}
const CAMERA = { default: 'threeQuarter', presets: { threeQuarter: { yaw: 35, pitch: 10, label: '3/4' }, side: { yaw: 0, pitch: 6, label: 'Side' }, front: { yaw: 90, pitch: 8, label: 'Front' }, back: { yaw: -120, pitch: 16, label: 'Back' }, top: { yaw: 60, pitch: 70, label: 'Top' } } };

// activation from roles and phases: concentric (exhale) phases rise to the peak, holds stay there, eccentric (inhale)
// phases fall back, natural / rest phases sit at the floor; alternating phases ('alt') peak in the middle
const PEAK = { target: 0.85, synergist: 0.55, stabilizer: 0.32 };
function activation(muscles, phases, D, scale = {}) {
  const out = {};
  for (const role of ['target', 'synergist', 'stabilizer']) for (const m of muscles[role] || []) {
    if (out[m]) continue;
    const P = +(PEAK[role] * (scale[baseId(m)] ?? scale[m] ?? 1)).toFixed(2), lo = +(role === 'stabilizer' ? P * 0.7 : P * 0.22).toFixed(2);
    let lvl = lo; const pts = [[0, lo]];
    for (const ph of phases) {
      const t0 = ph.start, t1 = ph.end, mid = +((t0 + t1) / 2).toFixed(3);
      if (ph.type === 'con') { pts.push([mid, +(lo + (P - lo) * 0.6).toFixed(2)]); lvl = P; }
      else if (ph.type === 'hold') lvl = +(P * 0.95).toFixed(2);
      else if (ph.type === 'ecc') { pts.push([mid, +(lo + (P - lo) * 0.55).toFixed(2)]); lvl = +(lo * 1.15).toFixed(2); }
      else if (ph.type === 'alt') { pts.push([mid, P]); lvl = +(lo + (P - lo) * 0.3).toFixed(2); }
      else lvl = lo;
      pts.push([t1, lvl]);
    }
    pts[pts.length - 1][1] = lo;
    out[m] = pts.filter((p, i) => i === 0 || p[0] > pts[i - 1][0]);
  }
  return out;
}

// muscle notes by role (base muscle id); a spec's `notes` override them
const NOTES = {
  lats: 'Pulls the upper arm down and back toward the trunk.', rhomboids_midtrap: 'Draws the shoulder blade back at the finish.',
  post_deltoid: 'Pulls the upper arm back and out.', biceps: 'Bends the elbow.', forearm_flexors: 'Grip.', forearm_extensors: 'Steady the wrist.',
  core: 'Braces the trunk so the body stays in one line.', spinal_extensors: 'Hold the spine long.', glute_max: 'Keeps the hips extended in line with the body.',
  hamstrings: 'Help the glutes hold the hips up.', upper_traps: 'Steadies the shoulder girdle; should not shrug.', infraspinatus: 'Turns the upper arm out and steadies the shoulder.',
  pec: 'Brings the upper arm across and forward (pressing).', ant_deltoid: 'Raises the upper arm forward.', triceps: 'Straightens the elbow.',
  serratus: 'Moves the shoulder blade forward around the ribs and holds it to the chest wall.', lat_deltoid: 'Raises the upper arm out to the side.',
  obliques: 'Turn and brace the trunk.', quads: 'Keep the knees straight.', hip_flexors: 'Bend the hips.', glute_med: 'Holds the pelvis level.',
  adductors: 'Hold the legs together.', calves: 'Steady the ankles.',
};
const expandNotes = (muscles, notes = {}) => { const o = {}; for (const role of ['target', 'synergist', 'stabilizer']) for (const m of muscles[role] || []) o[m] = notes[m] || notes[baseId(m)] || NOTES[baseId(m)] || 'Assists.'; return o; };

const ref = (num, slug, kind = 'videos') => ({ num, url: `https://gymvisual.com/${kind}/${num}-${slug}.html` });
const LISTING = 'Video (title from the catalog link; the page could not be read from this environment, so the movement follows the exercise name and standard coaching)';
const CAUTION_GLOW = 'Muscle glow colours and activation curves are illustrative, not measured EMG.';
const STOP = 'Stop if sharp pain, numbness or tingling occurs.';
const T = (ids, durs, labels, breaths, types, cues) => { let t = 0; return ids.map((id, i) => { const p = { id, label: labels[i], start: +t.toFixed(2), end: +(t + durs[i]).toFixed(2), breath: breaths[i], cue: cues ? cues[i] : `c${i + 1}`, type: types[i] }; t += durs[i]; return p; }); };
const ROW_T = (lab = ['Arms long', 'Pull up', 'Squeeze', 'Lower under control', 'Arms long']) => T(['setup', 'pull', 'top', 'lower', 'reset'], [0.5, 1.2, 0.4, 2.0, 0.5], lab, ['natural', 'exhale', 'hold', 'inhale', 'natural'], ['rest', 'con', 'hold', 'ecc', 'rest']);
const PRESS_T = (lab = ['Arms long', 'Lower to the chest', 'Bottom', 'Press', 'Lockout']) => T(['setup', 'lower', 'bottom', 'press', 'top'], [0.5, 2.0, 0.3, 1.2, 0.6], lab, ['natural', 'inhale', 'hold', 'exhale', 'natural'], ['rest', 'ecc', 'hold', 'con', 'rest']);

const ROW_SAFETY = (extra = []) => ({ cautions: ['Check the anchor and the straps before each set; anchor only to a sturdy bar or a door anchor made for it.', 'Shoulder pain: stand more upright and shorten the range (clinical opinion).', ...extra, STOP, CAUTION_GLOW] });
const BACK_ROW_MUSCLES = { target: ['lats', 'rhomboids_midtrap'], synergist: ['post_deltoid', 'biceps', 'forearm_flexors'], stabilizer: ['core', 'spinal_extensors', 'glute_max', 'hamstrings', 'upper_traps'], lengthened: ['lats', 'rhomboids_midtrap'] };

const SPECS = {
  'suspender-weighted-inverted-row': {
    name: 'Suspender Weighted Inverted Row', aliases: ['Weighted suspension row', 'Weighted TRX row', 'Weight-vest suspended row'], ref: ref(21834, 'suspender-weighted-inverted-row'),
    bodyPart: 'Back (lats, mid-back)', secondary: ['Upper arms (biceps)', 'Rear shoulders', 'Core'], equipment: ['Suspension trainer straps', 'Weight vest', 'Pull-up bar (anchor)'],
    difficulty: 'Intermediate', mechanics: 'Compound (shoulder and elbow)', plane: 'Sagittal', laterality: 'Bilateral', authoredSide: 'bilateral', muscles: BACK_ROW_MUSCLES,
    breathing: { pattern: 'Breathe out as you pull the chest up to the hands, breathe in as the arms straighten.', cadence: 'About 1.2 s pull, short squeeze, about 2 s lower' },
    prescription: { sets: '3-4', reps: '6-12', tempo: '1-1-2-0', load: 'Bodyweight plus a weight vest; pick the vest and body angle so the last reps are hard with 1-3 reps in reserve (RIR 1-3, clinical opinion)', frequency: '2-3 times a week', progression: 'Add vest load in small steps, then lower the body angle' },
    phases: ROW_T(),
    cues: [['setup', 'Vest snug on the chest; a handle in each hand, palms in; lean back with long arms, heels down, body straight from heels to head.'], ['pull', 'Breathe out and pull the chest up to the hands, elbows close to the body.'], ['top', 'Squeeze the shoulder blades together; hips stay up under the extra load.'], ['lower', 'Breathe in and lower slowly to long arms.'], ['reset', 'Re-brace the glutes and abs; repeat.']],
    mistakes: [['Hips sagging under the vest', 'Squeeze the glutes and brace; drop the vest load if the line breaks.'], ['Shrugging the shoulders up', 'Pull the shoulder blades back and down.'], ['Loose vest shifting on the chest', 'Tighten the straps so the load rides high and snug.'], ['Dropping fast into the bottom', 'Lower over about 2 s.']],
    kin: [['Body angle', 'The more upright the body, the easier the row; walking the feet toward the anchor makes it harder (clinical opinion)', []], ['Elbow flexion', 'From nearly straight to about 90-110 degrees at the top (clinical opinion)', []], ['Load', 'A vest adds load to the body without changing the line; inverted rows load the trunk extensors less than standing bent-over rows (Fenwick 2009)', ['fenwick2009']], ['Straps', 'Straps stay taut and close to vertical; the hands stay on the strap arcs about the anchor (geometry)', []], ['Tempo', 'Controlled, about 1 s up and 2 s down (clinical opinion)', []]],
    sources: ['fenwick2009', 'oyama2010'],
    safety: Object.assign(ROW_SAFETY(['Use a vest that fits snugly; heavy loose plates on the chest can slide off.']), { modify: ['Gymnastic rings work the same way.', 'Bend the knees, feet flat, to take some load.'], regressions: ['Unweighted suspended row.', 'Stand more upright.'], progressions: ['Heavier vest.', 'Feet raised on a box.'] }),
    guides: [{ id: 'handPath', kind: 'path', joint: 'wrist_r', from: 0.5, to: 1.7, label: 'Hands ride the strap arcs to the chest' }, { id: 'elbowAngle', kind: 'jointAngle', joint: 'elbow_r', normBand: [85, 115], label: 'Elbows about 90-110 at the top' }],
    checks: { plantedContacts: ['leg_r', 'leg_l'], stillJoints: ['ankle_r', 'ankle_l'], measure: { name: 'trunkFlexion', min: 40, max: 80 }, floorTolerance: 0.5 },
  },
  'suspender-chest-press': {
    name: 'Suspender Chest Press', aliases: ['Suspension chest press', 'TRX chest press', 'Suspension push-up (standing)'], ref: ref(14234, 'suspender-chest-press'),
    bodyPart: 'Chest', secondary: ['Front shoulders', 'Triceps', 'Core'], equipment: ['Suspension trainer straps', 'Pull-up bar (anchor)'],
    difficulty: 'Beginner', mechanics: 'Compound (shoulder and elbow)', plane: 'Sagittal', laterality: 'Bilateral', authoredSide: 'bilateral',
    muscles: { target: ['pec'], synergist: ['ant_deltoid', 'triceps', 'serratus'], stabilizer: ['core', 'glute_max', 'quads', 'spinal_extensors', 'infraspinatus'], lengthened: ['pec', 'ant_deltoid'] },
    breathing: { pattern: 'Breathe in as the chest lowers between the hands, breathe out as you press back up.', cadence: 'About 2 s down, short pause, about 1.2 s up' },
    prescription: { sets: '3', reps: '8-15', tempo: '2-0-1-1', load: 'Bodyweight; set the body angle so the last reps are hard with 1-3 reps in reserve (RIR 1-3, clinical opinion)', frequency: '2-3 times a week', progression: 'Walk the feet back toward the anchor so the body leans further' },
    phases: PRESS_T(),
    cues: [['setup', 'Face away from the anchor, a handle in each hand in front of the chest, arms long; lean forward on the balls of the feet, body straight.'], ['lower', 'Breathe in and lower the chest between the hands, elbows about 45 degrees from the body.'], ['bottom', 'Hands beside the chest; keep the straps off the arms and the body in one line.'], ['press', 'Breathe out and press the handles forward until the arms are long.'], ['top', 'Keep the ribs down and the glutes tight; repeat.']],
    mistakes: [['Hips sagging', 'Brace the abs and squeeze the glutes.'], ['Hands drifting apart', 'Keep the handles in line with the chest; press them straight.'], ['Straps rubbing on the arms', 'Keep the hands a little wider than the shoulders so the straps run outside the arms.'], ['Shoulders rolling forward at the bottom', 'Keep the chest up and stop at a comfortable depth.']],
    kin: [['Body angle', 'Leaning further forward makes the press harder (more of the body weight on the hands, clinical opinion)', []], ['Elbow flexion', 'From nearly straight to about 90 degrees at the bottom (clinical opinion)', []], ['Straps', 'Straps stay taut; the hands stay on the strap arcs about the anchor behind the athlete (geometry)', []], ['Tempo', 'About 2 s down, 1 s up (clinical opinion)', []]],
    sources: ['calatayud2015', 'ludewig2004'],
    safety: { cautions: ['Check the anchor and the straps before each set.', 'Shoulder pain: lean less and shorten the range (clinical opinion).', 'Keep a split stance at first so you can step out if the hands slip.', STOP, CAUTION_GLOW], modify: ['Staggered stance for balance.'], regressions: ['Stand more upright.', 'Incline push-up on a bench.'], progressions: ['Feet closer to the anchor.', 'Single-leg stance.'] },
    guides: [{ id: 'handPath', kind: 'path', joint: 'wrist_r', from: 2.8, to: 4.0, label: 'Hands press out along the strap arcs' }, { id: 'elbowAngle', kind: 'jointAngle', joint: 'elbow_r', normBand: [80, 110], label: 'Elbows about 90 at the bottom' }],
    checks: { plantedContacts: ['leg_r', 'leg_l'], stillJoints: ['ankle_r', 'ankle_l'], measure: { name: 'trunkFlexion', min: 20, max: 70 }, floorTolerance: 0.5 },
  },
  'ring-high-row': {
    name: 'Ring High Row', aliases: ['Ring face row', 'Ring wide row', 'Gymnastic ring high row'], ref: ref(11420, 'ring-high-row'),
    bodyPart: 'Upper back (rear shoulders, mid-back)', secondary: ['Lats', 'Biceps', 'Core'], equipment: ['Gymnastic rings', 'Pull-up bar (anchor)'],
    difficulty: 'Intermediate', mechanics: 'Compound (shoulder and elbow)', plane: 'Transverse', laterality: 'Bilateral', authoredSide: 'bilateral',
    muscles: { target: ['rhomboids_midtrap', 'post_deltoid'], synergist: ['lats', 'infraspinatus', 'biceps', 'forearm_flexors'], stabilizer: ['core', 'spinal_extensors', 'glute_max', 'hamstrings', 'upper_traps'], lengthened: ['rhomboids_midtrap', 'post_deltoid'] },
    breathing: { pattern: 'Breathe out as you pull the rings to the upper chest, breathe in as the arms straighten.', cadence: 'About 1.2 s pull, short squeeze, about 2 s lower' },
    prescription: { sets: '3', reps: '8-15', tempo: '1-1-2-0', load: 'Bodyweight; body angle sets the load (RIR 1-3, clinical opinion)', frequency: '2-3 times a week', progression: 'Lower the body angle, then raise the feet' },
    phases: ROW_T(),
    cues: [['setup', 'Rings at shoulder width, overhand grip (palms toward the feet); lean back with long arms, heels down, body straight.'], ['pull', 'Breathe out and pull the rings to the upper chest, elbows wide, about level with the shoulders.'], ['top', 'Squeeze the shoulder blades together; keep the neck long.'], ['lower', 'Breathe in and lower slowly to long arms.'], ['reset', 'Keep the glutes and abs tight; repeat.']],
    mistakes: [['Elbows dropping to the ribs', 'Keep the elbows up and out; this is a high row, not a low row.'], ['Shrugging', 'Pull the shoulder blades back, not up.'], ['Hips sagging', 'Brace and squeeze the glutes.'], ['Chin poking forward to meet the rings', 'Keep the head in line with the body.']],
    kin: [['Body angle', 'The more upright the body, the easier the row (clinical opinion)', []], ['Elbow flare', 'Upper arms about 70-90 degrees out from the trunk at the top shift the work toward the rear deltoids and mid-trapezius (Schoenfeld 2013, Oyama 2010)', ['schoenfeld2013', 'oyama2010']], ['Elbow flexion', 'About 100-120 degrees at the top, hands just in front of the shoulders (clinical opinion)', []], ['Straps', 'Straps stay taut; each hand stays on its strap arc (geometry)', []], ['Tempo', 'About 1 s up, 2 s down (clinical opinion)', []]],
    sources: ['schoenfeld2013', 'oyama2010', 'fenwick2009'],
    safety: Object.assign(ROW_SAFETY(), { modify: ['Suspension straps with handles work the same way.'], regressions: ['Stand more upright.'], progressions: ['Feet on a box.', 'Pause 2 s at the top.'] }),
    guides: [{ id: 'handPath', kind: 'path', joint: 'wrist_r', from: 0.5, to: 1.7, label: 'Rings to the upper chest, elbows wide' }, { id: 'elbowAngle', kind: 'jointAngle', joint: 'elbow_r', normBand: [100, 130], label: 'Elbows well bent at the top' }],
    checks: { plantedContacts: ['leg_r', 'leg_l'], stillJoints: ['ankle_r', 'ankle_l'], measure: { name: 'trunkFlexion', min: 30, max: 80 }, floorTolerance: 0.5 },
  },
  'ring-arm-curl': {
    name: 'Ring Arm Curl', aliases: ['Ring biceps curl', 'Suspension biceps curl', 'Bodyweight ring curl'], ref: ref(15615, 'ring-arm-curl-male'),
    bodyPart: 'Upper arms (biceps)', secondary: ['Forearms', 'Core'], equipment: ['Gymnastic rings', 'Pull-up bar (anchor)'],
    difficulty: 'Intermediate', mechanics: 'Isolation (elbow)', plane: 'Sagittal', laterality: 'Bilateral', authoredSide: 'bilateral',
    muscles: { target: ['biceps'], synergist: ['forearm_flexors', 'ant_deltoid'], stabilizer: ['lats', 'core', 'glute_max', 'spinal_extensors', 'hamstrings'], lengthened: ['biceps'] },
    breathing: { pattern: 'Breathe out as you curl the body up to the rings, breathe in as you lower.', cadence: 'About 1.2 s up, short squeeze, about 2 s down' },
    prescription: { sets: '3', reps: '8-15', tempo: '1-1-2-0', load: 'Bodyweight; body angle sets the load (RIR 1-3, clinical opinion)', frequency: '2 times a week', progression: 'Walk the feet toward the anchor' },
    phases: ROW_T(['Arms long', 'Curl up', 'Squeeze', 'Lower under control', 'Arms long']),
    cues: [['setup', 'Rings in front, underhand grip (palms up); lean back with long arms raised toward the anchor, heels down, body straight.'], ['pull', 'Breathe out and bend the elbows, bringing the rings toward the forehead; the upper arms stay pointing at the anchor.'], ['top', 'Squeeze the biceps with the hands beside the forehead.'], ['lower', 'Breathe in and straighten the elbows slowly.'], ['reset', 'Keep the body straight; repeat.']],
    mistakes: [['Turning it into a row (elbows dropping to the ribs)', 'Keep the upper arms up toward the anchor; only the elbows bend.'], ['Hips sagging', 'Brace and squeeze the glutes.'], ['Wrists curling', 'Keep the wrists straight.'], ['Dropping fast', 'Lower over about 2 s.']],
    kin: [['Body angle', 'The more upright the body, the easier the curl (clinical opinion)', []], ['Elbow flexion', 'From nearly straight to about 110-130 degrees at the top (clinical opinion)', []], ['Upper arm', 'Upper arms stay raised toward the anchor (shoulder flexed), so the elbows hinge; curls with the shoulder flexed load the biceps at long length (Kassiano 2025, by analogy)', ['kassiano2025']], ['Straps', 'Straps stay taut; each ring stays on its strap arc (geometry)', []], ['Tempo', 'About 1 s up, 2 s down (clinical opinion)', []]],
    sources: ['kassiano2025', 'coratella2023'],
    safety: Object.assign(ROW_SAFETY(['Elbow pain: shorten the range and stand more upright.']), { modify: ['Suspension handles work the same way.'], regressions: ['Stand more upright.'], progressions: ['Feet closer to the anchor.', 'Single-arm ring curl.'] }),
    guides: [{ id: 'handPath', kind: 'path', joint: 'wrist_r', from: 0.5, to: 1.7, label: 'Rings curl toward the forehead' }, { id: 'elbowAngle', kind: 'jointAngle', joint: 'elbow_r', normBand: [100, 135], label: 'Elbows well bent at the top' }],
    checks: { plantedContacts: ['leg_r', 'leg_l'], stillJoints: ['ankle_r', 'ankle_l'], measure: { name: 'trunkFlexion', min: 20, max: 70 }, floorTolerance: 0.5 },
  },
  'inverted-row-between-chairs': {
    name: 'Inverted Row between Chairs', aliases: ['Chair row', 'Home inverted row', 'Bodyweight row between chairs'], ref: ref(7574, 'inverted-row-between-chairs'),
    bodyPart: 'Back (lats, mid-back)', secondary: ['Upper arms (biceps)', 'Rear shoulders', 'Core'], equipment: ['Two sturdy chairs'],
    difficulty: 'Beginner', mechanics: 'Compound (shoulder and elbow)', plane: 'Sagittal', laterality: 'Bilateral', authoredSide: 'bilateral', muscles: BACK_ROW_MUSCLES,
    breathing: { pattern: 'Breathe out as you pull the chest up between the chairs, breathe in as you lower.', cadence: 'About 1.2 s up, short squeeze, about 2 s down' },
    prescription: { sets: '3', reps: '8-15', tempo: '1-1-2-0', load: 'Bodyweight (RIR 1-3, clinical opinion)', frequency: '2-3 times a week', progression: 'Straighten the legs fully, then raise the feet' },
    phases: ROW_T(),
    cues: [['setup', 'Two sturdy chairs back to back about shoulder width apart; lie between them and hold the tops of the backrests, arms long, heels on the floor, body straight.'], ['pull', 'Breathe out and pull the chest up between the chairs, elbows close to the body.'], ['top', 'Squeeze the shoulder blades together.'], ['lower', 'Breathe in and lower slowly to long arms.'], ['reset', 'Keep the hips up; repeat.']],
    mistakes: [['Chairs that tip or slide', 'Use heavy, stable chairs on a non-slip floor, or weight the seats.'], ['Hips sagging', 'Brace and squeeze the glutes.'], ['Shrugging', 'Pull the shoulder blades back and down.'], ['Half reps', 'Lower to long arms each time.']],
    kin: [['Body angle', 'Fixed by the chair height; bending the knees makes it easier (clinical opinion)', []], ['Elbow flexion', 'From nearly straight to about 90-110 degrees at the top (clinical opinion)', []], ['Grip', 'Neutral grip on the backrests; inverted rows load the trunk extensors less than bent-over rows (Fenwick 2009)', ['fenwick2009']], ['Tempo', 'About 1 s up, 2 s down (clinical opinion)', []]],
    sources: ['fenwick2009', 'oyama2010'],
    safety: { cautions: ['Test the chairs first: they must not tip, fold or slide. Weight the seats if in doubt.', 'Shoulder pain: bend the knees and shorten the range (clinical opinion).', STOP, CAUTION_GLOW], modify: ['A broomstick across two chairs works the same way (overhand grip).'], regressions: ['Bend the knees, feet flat.'], progressions: ['Feet raised on a box.', 'Pause at the top.'] },
    guides: [{ id: 'handPath', kind: 'path', joint: 'shoulder_r', from: 0.5, to: 1.7, label: 'Chest rises between the chairs' }, { id: 'elbowAngle', kind: 'jointAngle', joint: 'elbow_r', normBand: [85, 115], label: 'Elbows about 90-110 at the top' }],
    checks: { plantedContacts: ['leg_r', 'leg_l'], stillJoints: ['ankle_r', 'ankle_l'], measure: { name: 'trunkFlexion', min: 50, max: 85 }, floorTolerance: 0.5 },
  },
  'ring-pike': {
    name: 'Ring Pike', aliases: ['Suspended pike', 'Feet-in-rings pike', 'Suspension trainer pike'], ref: ref(15624, 'ring-pike-male'),
    bodyPart: 'Core (abdominals, hip flexors)', secondary: ['Shoulders', 'Triceps', 'Serratus'], equipment: ['Gymnastic rings or suspension straps (foot cradles)', 'Pull-up bar (anchor)'],
    difficulty: 'Advanced', mechanics: 'Compound (hip and trunk; shoulders braced)', plane: 'Sagittal', laterality: 'Bilateral', authoredSide: 'bilateral',
    muscles: { target: ['core', 'hip_flexors'], synergist: ['obliques', 'ant_deltoid', 'serratus'], stabilizer: ['triceps', 'pec', 'quads', 'lats', 'upper_traps'], lengthened: ['hamstrings'] },
    breathing: { pattern: 'Breathe out as the hips lift into the pike, breathe in as you return to the plank.', cadence: 'About 1.4 s up, short pause, about 1.6 s down' },
    prescription: { sets: '3', reps: '6-12', tempo: '1-1-2-0', load: 'Bodyweight (RIR 1-3, clinical opinion)', frequency: '2 times a week', progression: 'Slower lowering, then a pause at the top' },
    phases: T(['setup', 'pike', 'top', 'lower', 'reset'], [0.6, 1.4, 0.5, 1.6, 0.5], ['Plank', 'Pike up', 'Hold the pike', 'Back to the plank', 'Plank'], ['natural', 'exhale', 'hold', 'inhale', 'natural'], ['rest', 'con', 'hold', 'ecc', 'rest']),
    cues: [['setup', 'Feet in the cradles under the anchor, hands under the shoulders: high plank, body straight, shoulders pushed away from the floor.'], ['pike', 'Breathe out and lift the hips high, legs straight; the feet swing forward in the straps toward the hands.'], ['top', 'Hips over the shoulders, head between the arms; hold briefly.'], ['lower', 'Breathe in and lower the hips back to a straight plank under control.'], ['reset', 'Brace; repeat.']],
    mistakes: [['Hips sagging in the plank', 'Brace the abs and squeeze the glutes before each rep.'], ['Bending the knees', 'Keep the legs straight; this is a pike, not a tuck.'], ['Shoulders sinking', 'Push the floor away the whole time.'], ['Swinging the straps', 'Move slowly so the feet stay quiet in the cradles.']],
    kin: [['Hip flexion', 'From straight in the plank to about 90-110 degrees in the pike (clinical opinion)', []], ['Shoulder position', 'Shoulders stay over or a little behind the hands; the serratus holds the shoulder blades to the ribs (Ludewig 2004)', ['ludewig2004']], ['Straps', 'The foot straps stay taut; the feet swing on their strap arcs about the anchor (geometry)', []], ['Tempo', 'Controlled, about 1.5 s each way (clinical opinion)', []]],
    sources: ['ludewig2004', 'schoenfeld2014', 'escamilla2006'],
    safety: { cautions: ['Set the cradles at mid-shin height and check the anchor before each set.', 'Wrist pain: use push-up handles or fists (clinical opinion).', 'Low-back pain: start with ring knee tucks.', STOP, CAUTION_GLOW], modify: ['Sliders on a smooth floor work similarly.'], regressions: ['Ring knee tuck.', 'Pike on a stability ball.'], progressions: ['Pike to push-up.', 'Slower lowering.'] },
    guides: [{ id: 'hipAngle', kind: 'jointAngle', joint: 'hip_r', normBand: [85, 115], label: 'Hips about 90-110 in the pike' }],
    checks: { plantedContacts: ['arm_r', 'arm_l'], measure: { name: 'hipFlexion', min: 80, max: 125 }, floorTolerance: 0.5 },
    camera: { default: 'side' },
  },
  'ring-mountain-climber': {
    name: 'Ring Mountain Climber', aliases: ['Suspended mountain climber', 'Feet-in-straps mountain climber', 'Suspension trainer mountain climber'], ref: ref(15623, 'ring-mountain-climber-male'),
    bodyPart: 'Core (abdominals, hip flexors)', secondary: ['Shoulders', 'Quadriceps'], equipment: ['Gymnastic rings or suspension straps (foot cradles)', 'Pull-up bar (anchor)'],
    difficulty: 'Intermediate', mechanics: 'Compound (hip and knee; shoulders braced)', plane: 'Sagittal', laterality: 'Alternating', authoredSide: 'bilateral',
    muscles: { target: ['core', 'hip_flexors'], synergist: ['obliques', 'quads'], stabilizer: ['ant_deltoid', 'serratus', 'triceps', 'pec', 'glute_max'], lengthened: [] },
    breathing: { pattern: 'Breathe out with each knee drive, breathe in as the leg goes back.', cadence: 'One knee drive about every 0.8 s' },
    prescription: { sets: '3', reps: '10-20 per side or 20-40 s', tempo: 'Controlled', load: 'Bodyweight', frequency: '2-3 times a week', progression: 'Longer sets, then faster drives with the hips still level' },
    phases: T(['setup', 'right', 'left', 'reset'], [0.4, 0.8, 0.8, 0.4], ['Plank', 'Right knee in', 'Left knee in', 'Plank'], ['natural', 'exhale', 'exhale', 'natural'], ['rest', 'alt', 'alt', 'rest']),
    cues: [['setup', 'Feet in the cradles under the anchor, hands under the shoulders: high plank, body straight.'], ['right', 'Breathe out and drive the right knee toward the chest; the foot rides forward in its strap.'], ['left', 'Return the right leg and drive the left knee in.'], ['reset', 'Keep the hips level and the shoulders over the hands; repeat.']],
    mistakes: [['Hips piking up', 'Keep the hips level with the shoulders.'], ['Swinging the straps', 'Drive the knee in and out under control so the feet do not bounce.'], ['Shoulders behind the hands', 'Keep the shoulders over the wrists.'], ['Holding the breath', 'Breathe out with each drive.']],
    kin: [['Hip flexion', 'The driving hip bends to about 75-100 degrees with the knee tucked under the body (clinical opinion)', []], ['Trunk', 'Trunk stays level, close to a plank; suspension raises the trunk-muscle demand of plank work (clinical opinion; Schoenfeld 2014 for plank variants)', ['schoenfeld2014']], ['Straps', 'Each foot strap stays taut; the moving foot swings on its strap arc (geometry)', []], ['Tempo', 'One drive about every 0.8 s, controlled (clinical opinion)', []]],
    sources: ['schoenfeld2014', 'ludewig2004'],
    safety: { cautions: ['Check the anchor and set the cradles at mid-shin height.', 'Wrist pain: use fists or handles.', STOP, CAUTION_GLOW], modify: ['Slow, controlled drives first.'], regressions: ['Floor mountain climber.', 'Ring plank hold.'], progressions: ['Faster drives.', 'Cross-body knee drives.'] },
    guides: [{ id: 'hipAngle', kind: 'jointAngle', joint: 'hip_r', normBand: [70, 105], label: 'Knee drives under the body' }],
    checks: { plantedContacts: ['arm_r', 'arm_l'], measure: { name: 'hipFlexion', min: 80, max: 125 }, floorTolerance: 0.5 },
    camera: { default: 'side' },
  },
  'landmine-press': {
    base: 'landmine-kneeling-one-arm-shoulder-press',
    name: 'Landmine Press', aliases: ['Standing landmine press', 'Single-arm landmine press', 'Landmine shoulder press'], ref: ref(11804, 'landmine-press'),
    bodyPart: 'Shoulders (front deltoid)', secondary: ['Upper chest', 'Triceps', 'Core'], equipment: ['Landmine (barbell in a floor pivot)', 'Weight plate'],
    difficulty: 'Beginner', mechanics: 'Compound (shoulder and elbow)', plane: 'Sagittal', laterality: 'Unilateral', authoredSide: 'right',
    muscles: { target: ['ant_deltoid_r', 'pec_r'], synergist: ['lat_deltoid_r', 'triceps_r', 'serratus_r', 'upper_traps_r'], stabilizer: ['obliques', 'core', 'glute_max', 'spinal_extensors', 'quads', 'infraspinatus_r'], lengthened: ['ant_deltoid_r', 'pec_r'] },
    breathing: { pattern: 'Brace at the shoulder, breathe out as you press, breathe in as the bar comes back.', cadence: 'About 1.4 s up, short pause, about 2 s down' },
    prescription: { sets: '3', reps: '8-12 per side', tempo: '2-0-1-1', load: 'A load you can press with 1-3 reps in reserve (RIR 1-3, clinical opinion)', frequency: '2 times a week', progression: 'Add plates in small steps' },
    phases: T(['setup', 'press', 'top', 'lower', 'reset'], [0.8, 1.4, 0.4, 2.0, 0.6], ['Bar at the shoulder', 'Press', 'Arm long', 'Lower under control', 'Bar at the shoulder'], ['inhale', 'exhale', 'hold', 'inhale', 'hold'], ['rest', 'con', 'hold', 'ecc', 'rest']),
    cues: [['setup', 'Stand facing the landmine, left foot a little forward; hold the end of the bar in the right hand in front of the right shoulder, left hand on the hip, ribs down.'], ['press', 'Breathe out and press the bar up and forward along its arc until the arm is long.'], ['top', 'Reach a little at the top so the shoulder blade moves around the ribs; do not lean back.'], ['lower', 'Breathe in and lower the bar back to the shoulder under control.'], ['reset', 'Re-brace; repeat, then switch sides.']],
    mistakes: [['Leaning back to finish the press', 'Brace the abs and squeeze the glutes; the trunk stays tall.'], ['Elbow flaring wide', 'Keep the elbow in front of the body, about 30-45 degrees from the trunk.'], ['Shrugging at the top', 'Reach forward along the bar, not up into the ear.'], ['Twisting the trunk', 'Keep the hips and shoulders square to the bar.']],
    kin: [['Stance', 'Staggered stance, opposite foot forward, for a stable base (clinical opinion)', []], ['Shoulder elevation', 'The landmine arc tops out below vertical, a shoulder-friendly press for limited overhead mobility (clinical opinion)', []], ['Elbow flexion', 'From about 100-120 degrees at the shoulder to nearly straight (clinical opinion)', []], ['Bar angle', "The hand rides the bar's arc; the bar rises from about 20-25 to 40-45 degrees above the floor (geometry)", []], ['Tempo', 'About 1.5 s up, 2 s down (clinical opinion)', []]],
    sources: ['saeterbakken2012', 'collins2021'],
    safety: { cautions: ['Seat the bar end firmly in the landmine pivot before loading.', 'Shoulder pain: shorten the range and press more forward than up (clinical opinion).', STOP, CAUTION_GLOW], modify: ['Half-kneeling or tall-kneeling for less trunk demand.'], regressions: ['Tall-kneeling landmine press.', 'Lighter load.'], progressions: ['Heavier load.', 'Landmine push press.'] },
    guides: [{ id: 'barPath', kind: 'path', joint: 'wrist_r', from: 0.8, to: 2.2, label: "Hand rides up the bar's arc" }, { id: 'elbowAngle', kind: 'jointAngle', joint: 'elbow_r', normBand: [80, 125], label: 'Elbow bent at the shoulder' }],
    checks: { plantedContacts: ['leg_r', 'leg_l'], measure: { name: 'trunkFlexion', min: 0, max: 15 }, floorTolerance: 0.5 },
  },
  'landmine-180': {
    name: 'Landmine 180', aliases: ['Landmine rainbow', 'Landmine rotation', 'Landmine arc'], ref: ref(4257, 'landmine-180'),
    bodyPart: 'Core (obliques)', secondary: ['Shoulders', 'Hips'], equipment: ['Landmine (barbell in a floor pivot)', 'Weight plate'],
    difficulty: 'Intermediate', mechanics: 'Compound (trunk rotation, shoulders and hips)', plane: 'Transverse', laterality: 'Alternating', authoredSide: 'bilateral',
    muscles: { target: ['obliques', 'core'], synergist: ['ant_deltoid', 'lat_deltoid', 'glute_med', 'glute_max'], stabilizer: ['spinal_extensors', 'serratus', 'triceps', 'quads', 'forearm_flexors'], lengthened: ['obliques'] },
    breathing: { pattern: 'Breathe out as the bar sweeps down to each hip, breathe in as it comes back up to the middle.', cadence: 'About 1 s to each side, 1 s back' },
    prescription: { sets: '3', reps: '6-10 per side', tempo: 'Controlled', load: 'Light to moderate: control matters more than load (clinical opinion)', frequency: '2 times a week', progression: 'Add a small plate, then a slower, longer arc' },
    phases: T(['setup', 'right', 'left', 'reset'], [0.4, 2.0, 2.0, 0.4], ['Bar in front', 'Arc to the right hip and back', 'Arc to the left hip and back', 'Bar in front'], ['inhale', 'exhale', 'exhale', 'inhale'], ['rest', 'alt', 'alt', 'rest']),
    cues: [['setup', 'Stand facing the landmine, feet wider than the hips; hold the end of the bar in both hands at arm\'s length in front of the chest.'], ['right', 'Breathe out and sweep the bar down to the outside of the right hip, letting the hips and chest turn with it; bring it back up through the middle.'], ['left', 'Sweep it down to the left hip the same way and back to the middle.'], ['reset', 'Arms stay long; the rotation comes from the hips and the trunk together.']],
    mistakes: [['Bending the elbows', 'Keep the arms long; the bar travels on a wide arc.'], ['Twisting only through the lower back', 'Let the hips turn with the bar; the feet stay planted, knees soft.'], ['Rushing and letting the bar pull you', 'Control the bar down and stop it at the hip.'], ['Rounding the back', 'Stay tall with the chest up.']],
    kin: [['Trunk rotation', 'Shoulders turn about 25-45 degrees each way with the hips helping; axial torque under load is the risk factor, so control the speed (Marshall 2010, clinical opinion)', ['marshall2010']], ['Bar arc', 'The bar end sweeps from chest height in front down to each hip on the sphere of the bar about the pivot (geometry)', []], ['Arms', 'Elbows stay nearly straight (clinical opinion)', []], ['Tempo', 'About 1 s down to the hip, 1 s back (clinical opinion)', []]],
    sources: ['marshall2010', 'torso2015', 'saeterbakken2012'],
    safety: { cautions: ['Seat the bar end firmly in the pivot; keep the area around the arc clear.', 'Low-back pain: shorten the arc and keep the hips square (clinical opinion).', STOP, CAUTION_GLOW], modify: ['Smaller arcs, or the bar alone.'], regressions: ['Half-kneeling landmine rotation (short arc).'], progressions: ['Add a plate.', 'Landmine rotational press.'] },
    guides: [{ id: 'barPath', kind: 'path', joint: 'wrist_r', from: 0.4, to: 4.4, label: 'Bar end sweeps hip to hip' }],
    checks: { plantedContacts: ['leg_r', 'leg_l'], measure: { name: 'trunkFlexion', min: 0, max: 35 }, floorTolerance: 0.5 },
    camera: { default: 'front' },
  },
  'sitting-woodchopper-on-a-chair': {
    name: 'Sitting Woodchopper on a Chair', aliases: ['Seated woodchopper', 'Seated plate chop', 'Chair woodchop'], ref: ref(19033, 'sitting-woodchopper-on-a-chair-male'),
    bodyPart: 'Core (obliques)', secondary: ['Shoulders', 'Abdominals'], equipment: ['Chair', 'Weight plate'],
    difficulty: 'Beginner', mechanics: 'Compound (trunk rotation and flexion, shoulders)', plane: 'Transverse', laterality: 'Unilateral', authoredSide: 'right',
    muscles: { target: ['obliques', 'core'], synergist: ['lats', 'ant_deltoid', 'triceps'], stabilizer: ['spinal_extensors', 'serratus', 'forearm_flexors', 'glute_med'], lengthened: ['obliques'] },
    breathing: { pattern: 'Breathe out as you chop down across the body, breathe in as you lift back up.', cadence: 'About 1 s down, 1.5 s up' },
    prescription: { sets: '2-3', reps: '8-12 per side', tempo: '1-0-2-0', load: 'A light plate (2.5-10 kg) you can control (clinical opinion)', frequency: '2-3 times a week', progression: 'Heavier plate, then a slower lift' },
    phases: T(['setup', 'chop', 'bottom', 'lift', 'reset'], [0.6, 1.0, 0.3, 1.6, 0.5], ['Plate high right', 'Chop across', 'Low left', 'Lift back up', 'Plate high right'], ['inhale', 'exhale', 'hold', 'inhale', 'natural'], ['rest', 'con', 'hold', 'ecc', 'rest']),
    cues: [['setup', 'Sit tall near the front of a sturdy chair, feet flat and wide; hold a plate by its rim in both hands up beside the right shoulder, chest turned to the right.'], ['chop', 'Breathe out and chop the plate down across the body to the outside of the left knee, turning the chest to the left.'], ['bottom', 'Arms long, chest over the left thigh; hips stay on the seat.'], ['lift', 'Breathe in and lift the plate back up across the body to the right shoulder.'], ['reset', 'Stay tall; repeat, then switch sides.']],
    mistakes: [['Rounding the back hard at the bottom', 'Hinge a little from the hips and keep the chest long.'], ['Lifting the hips off the seat', 'Keep both sitting bones down; the turn comes from the trunk.'], ['Bending the arms a lot', 'Keep the arms fairly long so the plate travels a wide arc.'], ['Throwing the plate', 'Control both directions.']],
    kin: [['Trunk rotation', 'Chest turns about 30-45 degrees to each side of square (clinical opinion)', []], ['Trunk lean', 'Upright at the top, leaning about 20-35 degrees forward at the bottom (clinical opinion)', []], ['Plate path', 'Diagonal from above the right shoulder to the outside of the left knee (clinical opinion)', []], ['Tempo', 'About 1 s down, 1.5 s up (clinical opinion)', []]],
    sources: ['torso2015', 'marshall2010'],
    safety: { cautions: ['Use a stable chair without wheels.', 'Low-back pain: shorten the range and keep the chop above the knee (clinical opinion).', STOP, CAUTION_GLOW], modify: ['Medicine ball or dumbbell instead of the plate.'], regressions: ['No load, hands clasped.'], progressions: ['Heavier plate.', 'Cable or band chop.'] },
    guides: [{ id: 'platePath', kind: 'path', joint: 'wrist_r', from: 0.6, to: 1.6, label: 'Plate chops high right to low left' }],
    checks: { plantedContacts: ['leg_r', 'leg_l'], measure: { name: 'trunkFlexion', min: 15, max: 45 }, floorTolerance: 0.5 },
    camera: { default: 'front' },
  },
  'ez-barbell-anti-gravity-press': {
    name: 'EZ Barbell Anti-Gravity Press', aliases: ['Prone incline EZ bar press', 'EZ bar prone press', 'Incline prone overhead press'], ref: ref(5059, 'ez-barbell-anti-gravity-press'),
    bodyPart: 'Shoulders (deltoids, lower trapezius)', secondary: ['Upper back', 'Triceps'], equipment: ['EZ curl bar', 'Adjustable bench (incline)'],
    difficulty: 'Intermediate', mechanics: 'Compound (shoulder and elbow)', plane: 'Sagittal', laterality: 'Bilateral', authoredSide: 'bilateral',
    muscles: { target: ['ant_deltoid', 'lat_deltoid', 'upper_traps'], synergist: ['triceps', 'serratus', 'rhomboids_midtrap', 'post_deltoid'], stabilizer: ['spinal_extensors', 'infraspinatus', 'core', 'forearm_flexors'], lengthened: [] },
    breathing: { pattern: 'Breathe out as you press the bar out past the head, breathe in as you bring it back.', cadence: 'About 1.2 s out, short pause, about 2 s back' },
    prescription: { sets: '3', reps: '8-12', tempo: '2-0-1-1', load: 'Light: the arms work against gravity far out in front (RIR 2-3, clinical opinion)', frequency: '2 times a week', progression: 'Add small plates' },
    phases: T(['setup', 'press', 'top', 'lower', 'reset'], [0.6, 1.2, 0.4, 2.0, 0.6], ['Bar at the head', 'Press out', 'Arms long', 'Bring it back', 'Bar at the head'], ['inhale', 'exhale', 'hold', 'inhale', 'natural'], ['rest', 'con', 'hold', 'ecc', 'rest']),
    cues: [['setup', 'Lie face down on a bench set to about 45 degrees, chest on the pad, feet on the floor; hold the EZ bar overhand on the outer cambers at the level of the forehead, elbows bent and out.'], ['press', 'Breathe out and press the bar forward past the head in line with the body until the arms are long.'], ['top', 'Arms beside the ears; reach a little with the shoulder blades.'], ['lower', 'Breathe in and bring the bar back to the forehead under control.'], ['reset', 'Chest stays on the pad; repeat.']],
    mistakes: [['Lifting the chest off the pad', 'Keep the chest down; let the shoulders do the work.'], ['Pressing up instead of out', 'Press in line with the bench, past the head.'], ['Shrugging hard', 'Let the shoulder blades rotate up, not hike to the ears.'], ['Too heavy', 'Use a light bar: the lever is long.']],
    kin: [['Bench angle', 'About 45 degrees, chest supported (clinical opinion)', []], ['Shoulder elevation', 'Upper arm rises from about 90 degrees to about 150-170 degrees from the trunk (clinical opinion)', []], ['Elbow flexion', 'From about 90-110 degrees at the head to nearly straight (clinical opinion)', []], ['Grip', 'Overhand on the outer cambers of the EZ bar (clinical opinion)', []], ['Tempo', 'About 1 s out, 2 s back (clinical opinion)', []]],
    sources: ['coratella2020', 'franke2015'],
    safety: { cautions: ['Shoulder pain or pinching overhead: shorten the range (clinical opinion).', 'Start light: the long lever loads the shoulders strongly.', STOP, CAUTION_GLOW], modify: ['Dumbbells or a light plate.'], regressions: ['Prone Y raise without load.'], progressions: ['Slower lowering.', 'Small plates on the bar.'] },
    guides: [{ id: 'barPath', kind: 'path', joint: 'wrist_r', from: 0.6, to: 1.8, label: 'Bar presses out past the head' }, { id: 'elbowAngle', kind: 'jointAngle', joint: 'elbow_r', normBand: [85, 115], label: 'Elbows bent at the start' }],
    checks: { plantedContacts: ['leg_r', 'leg_l'], measure: { name: 'trunkFlexion', min: 30, max: 60 }, floorTolerance: 0.5 },
  },
  'weighted-plate-incline-press': {
    name: 'Weighted Plate Incline Press', aliases: ['Incline plate press', 'Plate press on incline bench', 'Incline weight plate chest press'], ref: ref(25624, 'weighted-plate-incline-press'),
    bodyPart: 'Chest (upper)', secondary: ['Front shoulders', 'Triceps'], equipment: ['Weight plate', 'Adjustable bench (incline)'],
    difficulty: 'Beginner', mechanics: 'Compound (shoulder and elbow)', plane: 'Sagittal', laterality: 'Bilateral', authoredSide: 'bilateral',
    muscles: { target: ['pec'], synergist: ['ant_deltoid', 'triceps'], stabilizer: ['serratus', 'forearm_flexors', 'core', 'infraspinatus'], lengthened: ['pec'] },
    breathing: { pattern: 'Breathe in as the plate comes down to the chest, breathe out as you press it up.', cadence: 'About 2 s down, 1 s up' },
    prescription: { sets: '3', reps: '10-15', tempo: '2-0-1-1', load: 'A 10-20 kg plate you can grip securely (RIR 1-3, clinical opinion)', frequency: '2 times a week', progression: 'Heavier plate, then a pause at the chest' },
    phases: T(['setup', 'lower', 'bottom', 'press', 'top'], [0.6, 2.0, 0.3, 1.2, 0.6], ['Plate up', 'Lower to the chest', 'Bottom', 'Press', 'Arms long'], ['natural', 'inhale', 'hold', 'exhale', 'natural'], ['rest', 'ecc', 'hold', 'con', 'rest']),
    cues: [['setup', 'Lie on a bench set to about 30-45 degrees, feet flat; hold a plate by its rim at 3 and 9 o\'clock, palms facing in, thumbs toward the head, the plate flat over the upper chest with the arms long.'], ['lower', 'Breathe in and lower the plate to the upper chest, elbows about 45 degrees from the body.'], ['bottom', 'Plate just above the chest; squeeze the rim.'], ['press', 'Breathe out and press the plate back up over the shoulders.'], ['top', 'Arms long; keep the shoulder blades on the bench.']],
    mistakes: [['Loose grip on the rim', 'Squeeze the plate hard the whole set; use a plate with a lip.'], ['Elbows flaring to 90 degrees', 'Keep them about 45 degrees from the body.'], ['Bouncing off the chest', 'Stop just above the chest.'], ['Arching off the bench', 'Keep the upper back and hips on the bench.']],
    kin: [['Bench angle', 'About 30 degrees maximised upper-pectoralis activity in Rodriguez-Ridao 2020', ['rodriguez2020']], ['Elbow flexion', 'From nearly straight to about 110-125 degrees with the plate just over the chest; the narrow rim grip bends the elbows more than a bar press (clinical opinion)', []], ['Grip', 'Rim held at 3 and 9 o\'clock, palms in (about 37 cm apart for a 40 cm plate); the squeeze adds a pressing-in effort (clinical opinion)', []], ['Tempo', 'About 2 s down, 1 s up (clinical opinion)', []]],
    sources: ['rodriguez2020', 'calatayud2015'],
    safety: { cautions: ['Use a plate with a lip you can grip securely; never press it over the face.', 'Shoulder pain: shorten the range (clinical opinion).', STOP, CAUTION_GLOW], modify: ['Dumbbell hammer press on the same bench.'], regressions: ['Flat floor plate press.'], progressions: ['Heavier plate.', 'Pause at the chest.'] },
    guides: [{ id: 'platePath', kind: 'path', joint: 'wrist_r', from: 0.6, to: 2.6, label: 'Plate lowers to the upper chest' }, { id: 'elbowAngle', kind: 'jointAngle', joint: 'elbow_r', normBand: [100, 130], label: 'Elbows well bent at the bottom' }],
    checks: { plantedContacts: ['leg_r', 'leg_l'], measure: { name: 'trunkFlexion', min: 40, max: 70 }, floorTolerance: 0.5 },
  },
  'cambered-bar-lying-row': {
    name: 'Cambered Bar Lying Row', aliases: ['Cambered bar bench row', 'Prone cambered bar row', 'Seal row with cambered bar'], ref: ref(970, 'cambered-bar-lying-row'),
    bodyPart: 'Back (lats, mid-back)', secondary: ['Rear shoulders', 'Biceps'], equipment: ['Cambered row bar', 'High flat bench'],
    difficulty: 'Intermediate', mechanics: 'Compound (shoulder and elbow)', plane: 'Sagittal', laterality: 'Bilateral', authoredSide: 'bilateral',
    muscles: { target: ['lats', 'rhomboids_midtrap'], synergist: ['post_deltoid', 'biceps', 'forearm_flexors', 'infraspinatus'], stabilizer: ['spinal_extensors', 'upper_traps', 'core'], lengthened: ['lats', 'rhomboids_midtrap'] },
    breathing: { pattern: 'Breathe out as you row the bar up, breathe in as you lower it.', cadence: 'About 1.2 s up, short squeeze, about 2 s down' },
    prescription: { sets: '3-4', reps: '8-12', tempo: '1-1-2-0', load: 'A load you can row to the bench with 1-3 reps in reserve (RIR 1-3, clinical opinion)', frequency: '2 times a week', progression: 'Add load in small steps' },
    phases: ROW_T(['Arms long', 'Row up', 'Squeeze', 'Lower under control', 'Arms long']),
    cues: [['setup', 'Lie face down on a high bench, chest at the end of the pad; hold the cambered bar overhand a little wider than the shoulders, arms long, plates off the floor.'], ['pull', 'Breathe out and row the bar up; the bend lets the hands come up beside the pad.'], ['top', 'Squeeze the shoulder blades together, elbows past the trunk.'], ['lower', 'Breathe in and lower to long arms.'], ['reset', 'Chest stays on the pad; repeat.']],
    mistakes: [['Lifting the chest off the pad', 'Keep the chest down; the bench takes the lower back out of it.'], ['Jerking the bar', 'Pull smoothly from long arms.'], ['Short reps', 'Lower to long arms each time.'], ['Shrugging', 'Draw the shoulder blades back and down.']],
    kin: [['Bench', 'Chest supported on a high bench: lower-back load is small compared with bent-over rows (Fenwick 2009)', ['fenwick2009']], ['Elbow flexion', 'From nearly straight to about 90-110 degrees at the top (clinical opinion)', []], ['Bar path', 'The cambered middle passes under the pad so the hands rise above its underside (geometry)', []], ['Tempo', 'About 1 s up, 2 s down (clinical opinion)', []]],
    sources: ['fenwick2009', 'lehman2004'],
    safety: { cautions: ['Set the bench high enough that the plates clear the floor with long arms, and step off carefully.', 'Shoulder pain: shorten the range (clinical opinion).', STOP, CAUTION_GLOW], modify: ['Straight bar or dumbbells on the same bench.'], regressions: ['Chest-supported dumbbell row.'], progressions: ['Heavier load.', 'Pause at the top.'] },
    guides: [{ id: 'barPath', kind: 'path', joint: 'wrist_r', from: 0.5, to: 1.7, label: 'Bar rows up past the pad' }, { id: 'elbowAngle', kind: 'jointAngle', joint: 'elbow_r', normBand: [85, 115], label: 'Elbows about 90-110 at the top' }],
    checks: { plantedContacts: [], measure: { name: 'trunkFlexion', min: 70, max: 100 }, floorTolerance: 0.5 },
  },
  'chin-ups-narrow-parallel-grip': {
    base: 'chin-up',
    name: 'Chin-ups (narrow parallel grip)', aliases: ['Close neutral-grip chin-up', 'Narrow parallel-grip pull-up', 'V-handle chin-up'], ref: ref(4368, 'chin-ups-narrow-parallel-grip'),
    bodyPart: 'Back (lats)', secondary: ['Biceps', 'Brachialis and forearms', 'Mid-back'], equipment: ['Pull-up bar', 'Parallel grip handles'],
    difficulty: 'Intermediate', mechanics: 'Compound (shoulder and elbow)', plane: 'Sagittal', laterality: 'Bilateral', authoredSide: 'bilateral',
    muscles: { target: ['lats', 'biceps'], synergist: ['rhomboids_midtrap', 'post_deltoid', 'forearm_flexors', 'pec'], stabilizer: ['core', 'upper_traps', 'infraspinatus', 'triceps'], lengthened: ['lats'] },
    breathing: { pattern: 'Breathe out as you pull up, breathe in as you lower.', cadence: 'About 1.1 s up, short hold, about 2 s down' },
    prescription: { sets: '3-4', reps: '5-10', tempo: '2-1-1-1', load: 'Bodyweight; add load with a belt when 10 clean reps are easy (RIR 1-3, clinical opinion)', frequency: '2 times a week', progression: 'More reps, then added load' },
    cues: [['setup', 'Hang from parallel handles close together (palms facing each other), arms long.'], ['set', 'Set the shoulders: pull the shoulder blades down before you bend the arms.'], ['pull', 'Breathe out and pull the chest up toward the handles, elbows forward and down.'], ['top', 'Chin over the handles; hold briefly.'], ['lower', 'Breathe in and lower to a full hang under control.'], ['reset', 'Full hang; repeat.']],
    mistakes: [['Kipping or swinging', 'Pull from a still hang.'], ['Half reps', 'Start from long arms each time.'], ['Shrugging at the top', 'Keep the shoulders down away from the ears.'], ['Chin reaching up with the neck', 'Pull the chest up; keep the neck long.']],
    kin: [['Elbow flexion', 'From nearly straight in the hang to about 115-140 degrees at the top (clinical opinion)', []], ['Grip width', 'Narrow neutral grip: biceps and brachioradialis help more than with a wide overhand grip (Youdas 2010; Lusk 2010 for forearm orientation)', ['youdas2010', 'lusk2010']], ['Chin height', 'Chin clears the handles at the top (clinical opinion)', []], ['Shoulder blades', 'Elevated in the hang, depressed and retracted at the top (clinical opinion)', []], ['Tempo', 'About 1 s up, 2 s down (clinical opinion)', []]],
    sources: ['youdas2010', 'lusk2010', 'lehman2004'],
    safety: { cautions: ['Check the handles are seated securely on the bar before hanging.', 'Elbow or shoulder pain: shorten the range or use an assisted version (clinical opinion).', STOP, CAUTION_GLOW], modify: ['Band-assisted.'], regressions: ['Negative (lowering-only) reps.', 'Inverted row.'], progressions: ['Weighted.', 'Pause at the top.'] },
  },
  'cable-single-arm-low-row-with-rope-attachment': {
    base: 'cable-one-arm-twisting-seated-row',
    name: 'Cable Single Arm Low Row with Rope Attachment', aliases: ['One-arm seated cable row (rope)', 'Single-arm rope low row', 'Unilateral cable rope row'], ref: ref(22871, 'cable-single-arm-low-row-with-rope-attachment'),
    bodyPart: 'Back (lats, mid-back)', secondary: ['Biceps', 'Rear shoulders'], equipment: ['Cable machine (low pulley)', 'Rope attachment', 'Bench or box (seat)'],
    difficulty: 'Beginner', mechanics: 'Compound (shoulder and elbow)', plane: 'Sagittal', laterality: 'Unilateral', authoredSide: 'right',
    muscles: { target: ['lats_r', 'rhomboids_midtrap_r'], synergist: ['post_deltoid_r', 'biceps_r', 'forearm_flexors_r'], stabilizer: ['core', 'obliques', 'spinal_extensors', 'upper_traps_r'], lengthened: ['lats_r', 'rhomboids_midtrap_r'] },
    breathing: { pattern: 'Breathe out as you row, breathe in as the arm reaches forward.', cadence: 'About 1.3 s pull, short squeeze, about 2 s return' },
    prescription: { sets: '3', reps: '10-12 per side', tempo: '1-1-2-0', load: 'A stack setting you can row with 1-3 reps in reserve (RIR 1-3, clinical opinion)', frequency: '2 times a week', progression: 'Add load in small steps' },
    cues: [['setup', 'Sit facing a low pulley, feet braced; hold one end of the rope in the right hand, thumb up, arm long, chest tall; left hand on the hip.'], ['pull', 'Breathe out and row the rope to the side of the stomach, elbow close to the body.'], ['squeeze', 'Draw the right shoulder blade back; keep the chest square.'], ['return', 'Breathe in and let the arm reach forward under control.'], ['reset', 'Arm long, shoulder blade forward; repeat, then switch sides.']],
    mistakes: [['Twisting the trunk to pull', 'Keep the chest square to the pulley; the arm and shoulder blade do the work.'], ['Leaning far back', 'Stay close to upright through the pull.'], ['Elbow flaring', 'Keep the elbow close to the ribs.'], ['Letting the stack slam', 'Control the return.']],
    kin: [['Trunk lean', 'About 10-15 degrees forward at the reach, upright at the finish (clinical opinion)', []], ['Elbow flexion', 'From nearly straight to about 90-110 degrees at the finish (clinical opinion)', []], ['Shoulder blade', 'Protracted at the reach, retracted at the finish (Oyama 2010)', ['oyama2010']], ['Grip', 'Neutral grip on one rope end; one-arm work raises the trunk anti-rotation demand (Saeterbakken 2012)', ['saeterbakken2012']], ['Tempo', 'About 1.3 s pull, 2 s return (clinical opinion)', []]],
    sources: ['oyama2010', 'saeterbakken2012', 'lehman2004'],
    checks: { plantedContacts: ['leg_r', 'leg_l'], measure: { name: 'trunkFlexion', min: 4, max: 20 }, floorTolerance: 0.5 },
    safety: { cautions: ['Sit tall and keep the feet braced.', 'Shoulder pain: shorten the reach (clinical opinion).', STOP, CAUTION_GLOW], modify: ['D-handle instead of the rope.'], regressions: ['Two-arm seated cable row.'], progressions: ['Heavier stack.', 'Half-kneeling one-arm row.'] },
  },
};

// build one meta from a spec
function build(id, s) {
  const baseMeta = s.base ? JSON.parse(fs.readFileSync(path.join(metaDir, `${s.base}.json`), 'utf8')) : null;
  const m = baseMeta ? clone(baseMeta) : { exercise: {}, camera: clone(CAMERA), props: [], timeline: {}, activation: {}, guides: [], checks: {} };
  const e = m.exercise;
  const muscles = { target: expand(s.muscles.target), synergist: expand(s.muscles.synergist), stabilizer: expand(s.muscles.stabilizer) };
  if (s.muscles.lengthened && s.muscles.lengthened.length) muscles.lengthened = expand(s.muscles.lengthened);
  Object.assign(e, {
    id, name: s.name, aliases: s.aliases,
    reference: { source: 'GymVisual', productRef: String(s.ref.num), title: s.name, url: s.ref.url, listing: LISTING, note: '' },
    type: 'Strength', bodyPart: s.bodyPart, secondaryBodyParts: s.secondary, equipment: s.equipment, difficulty: s.difficulty, mechanics: s.mechanics,
    plane: s.plane, laterality: s.laterality, authoredSide: s.authoredSide, muscles, breathing: s.breathing, prescription: s.prescription,
    cues: s.cues.map(([phase, text], i) => ({ id: `c${i + 1}`, phase, text })),
    mistakes: s.mistakes.map(([mistake, fix], i) => ({ id: `m${i + 1}`, mistake, fix })),
    kinematics: s.kin.map(([measure, norm, sources]) => ({ measure, setup: '', peak: '', norm, sources })),
    sources: [{ id: 'gymvisual', title: `GymVisual #${s.ref.num}, ${s.name}, video (movement reference)`, url: s.ref.url }, ...s.sources.map((k) => { if (!SRC[k]) throw new Error(`${id}: unknown source ${k}`); return clone(SRC[k]); })],
    safety: s.safety, muscleNotes: expandNotes(muscles, s.notes),
  });
  if (s.camera) m.camera = Object.assign(clone(CAMERA), { default: s.camera.default });
  let phases;
  if (s.phases) {
    phases = s.phases;
    m.timeline = { duration: phases[phases.length - 1].end, fps: 60, loop: true, interpolation: 'monotoneCubic', phases: phases.map(({ type, ...p }) => p) };
  } else {
    const typ = { exhale: 'con', hold: 'hold', inhale: 'ecc', natural: 'rest' };
    phases = m.timeline.phases.map((p, i, a) => ({ ...p, type: i === 0 || i === a.length - 1 ? 'rest' : typ[p.breath] || 'rest' }));
    // a cue per phase, in phase order
    m.timeline.phases.forEach((p) => { const c = e.cues.find((x) => x.phase === p.id); if (c) p.cue = c.id; });
  }
  for (const p of m.timeline.phases) { const c = e.cues.find((x) => x.phase === p.id); if (!c) throw new Error(`${id}: no cue for phase ${p.id}`); p.cue = c.id; }
  m.activation = activation(muscles, phases, m.timeline.duration, s.scale);
  if (s.guides) m.guides = s.guides;
  if (s.checks) m.checks = s.checks;
  m.props = [];
  return m;
}
const only = process.argv.slice(2);
for (const [id, s] of Object.entries(SPECS)) {
  if (only.length && !only.includes(id)) continue;
  const m = build(id, s);
  fs.writeFileSync(path.join(metaDir, `${id}.json`), JSON.stringify(m, null, 1) + '\n');
  console.log(`meta ${id}`);
}
module.exports = { SPECS };
