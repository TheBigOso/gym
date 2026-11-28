// g3-lower meta specs (read by build/gen-g3lower-meta.js). Each entry: id, name, url (GymVisual, movement reference
// only), base (the meta it starts from) and the changes from that base.
const GV = (n, slug) => `https://gymvisual.com/videos/${n}-${slug}.html`;
const SMITH = ['Smith machine'];
const SMITH_CAUTIONS = [
  'Set the safety stops just under the lowest bar position before the first rep; the bar cannot go lower than them.',
  'Practise turning the bar on and off the pegs (a small turn of the wrists) with an empty bar first.',
  'The rails fix the bar path: place yourself so the movement feels natural for the joints, and do not force range.',
];
const RAILS = 'Fixed by the guide rails: the bar can only travel along them (here a rail line fitted to the free-bar path, a few degrees from vertical at most)';
const SCHWANBECK = { id: 'schwanbeck2009', title: 'Schwanbeck, Chilibeck and Binsted 2009, a comparison of free weight squat to Smith machine squat using electromyography (J Strength Cond Res 23(9):2588-2591; PubMed 19855308)', url: 'https://pubmed.ncbi.nlm.nih.gov/19855308/' };
const SAETERBAKKEN = { id: 'saeterbakken2011', title: 'Saeterbakken, van den Tillaar and Fimland 2011, a comparison of muscle activity and 1-RM strength of three chest-press exercises with different stability requirements (J Sports Sci 29(5):533-538)', url: 'https://pubmed.ncbi.nlm.nih.gov/21225489/' };

// a literature source already used in the repo (by id), copied from whichever meta has it
const fs = require('fs'), path = require('path');
let SRC = null;
function src(id) {
  if (!SRC) { SRC = new Map(); for (const f of fs.readdirSync(path.join(__dirname, 'meta'))) { try { const m = JSON.parse(fs.readFileSync(path.join(__dirname, 'meta', f), 'utf8')); for (const s of m.exercise.sources || []) if (!SRC.has(s.id)) SRC.set(s.id, s); } catch (e) { /* skip */ } } }
  const s = SRC.get(id); if (!s) throw new Error(`no source ${id}`); return JSON.parse(JSON.stringify(s));
}
const TL5 = (labels, ids = ['setup', 'lower', 'bottom', 'rise', 'reset'], times = [0, 0.8, 2.8, 3.1, 4.3, 5], breath = ['inhale', 'hold', 'hold', 'exhale', 'natural']) => ({ duration: times[5], fps: 60, loop: true, interpolation: 'monotoneCubic', phases: ids.map((id, i) => ({ id, label: labels[i], start: times[i], end: times[i + 1], breath: breath[i], cue: `c${i + 1}` })) });
const CAM = (yaw = 50, pitch = 14) => ({ default: 'threeQuarter', presets: { threeQuarter: { yaw, pitch, label: '3/4' }, front: { yaw: 90, pitch: 8, label: 'Front' }, side: { yaw: 0, pitch: 6, label: 'Side' }, back: { yaw: -130, pitch: 18, label: 'Back' }, top: { yaw: 70, pitch: 70, label: 'Top' } } });
const BI = (...ms) => ms.flatMap((m) => (m === 'core' ? ['core'] : [`${m}_r`, `${m}_l`]));
const actOf = (levels) => Object.fromEntries(Object.entries(levels).flatMap(([m, lv]) => (m === 'core' ? [[m, lv]] : [[`${m}_r`, lv], [`${m}_l`, lv]])));
const PRESC = (o = {}) => Object.assign({ sets: '3-4', reps: '8-12', tempo: '2-0-1-0 (2 s down, no pause, 1 s up)', frequency: '1-3 times a week', load: 'Machine load is user-chosen: pick a weight you can move through the full range shown with good form, leaving about 2-3 reps in reserve (RPE 7-8).', rest: '1.5-2 minutes between sets', progression: 'Add a small amount of load when every rep of every set reaches the full range with good form.' }, o);
const STOP = ['Stop if sharp pain, numbness, tingling or giving-way occurs.', 'Muscle glow colours and activation curves are illustrative, not measured EMG.'];
const SQUAT_NOTES = { quads: 'Knee extensors control the descent and drive the rise, working hardest near the bottom (Straub 2024).', glute_max: 'Main hip extensor, working hardest out of the bottom (clinical opinion; Straub 2024).', adductors: 'Adductor magnus helps extend the hip from deep flexion (clinical opinion).', hamstrings: 'Assist hip extension; activity stays moderate in squat patterns (Contreras 2015).', calves: 'Steady the ankles over the planted feet.', core: 'Bracing stiffens the trunk against the load.', glute_med: 'Keeps the knees tracking over the feet.', forearm_flexors: 'Grip the handles.', spinal_extensors: 'Hold the back flat.', obliques: 'Part of the brace around the trunk.' };

module.exports = [
  {
    id: 'smith-stiff-legged-deadlift', name: 'Smith Stiff Legged Deadlift', url: GV(13925, 'smith-stiff-legged-deadlift'), base: 'barbell-stiff-legged-deadlift',
    aliases: ['Smith machine stiff-leg deadlift', 'Smith stiff-legged deadlift', 'Smith machine straight-leg deadlift'], equipment: SMITH,
    cues: {
      c1: 'Stand tall in the Smith machine, feet hip width under the bar, bar in front of the thighs, overhand grip just outside the legs, arms straight. Turn the bar off the pegs; knees just unlocked and kept that way.',
      c4: 'Drive the hips forward and stand up tall, the bar riding up the rails close to the legs.',
      c5: 'Squeeze the glutes at the top without leaning back; re-brace for the next rep. After the last rep turn the bar back onto the pegs.',
    },
    cautions: [...SMITH_CAUTIONS, 'Learn the hip hinge with a light load first; the back stays flat at every depth.', 'Low-back pain: shorten the range or bend the knees a little more.'],
    kin: { 'Bar path': `${RAILS}; the feet sit so the bar stays close to the legs (common coaching)` },
  },
  {
    id: 'smith-single-leg-deadlift', name: 'Smith Single Leg Deadlift', url: GV(16533, 'smith-single-leg-deadlift'), base: 'barbell-single-leg-deadlift',
    aliases: ['Smith machine single-leg deadlift', 'Smith machine single-leg Romanian deadlift', 'Smith one-leg deadlift'], equipment: SMITH,
    cues: {
      c1: 'Stand on the right leg under the Smith bar, knee soft, bar in front of the thighs with an overhand grip just outside the hips; turn it off the pegs and lift the left foot just off the floor.',
      c2: 'Hinge at the right hip: the chest goes down as the left leg reaches straight back and the bar runs down the rails in front of the standing leg; hips stay square to the floor.',
    },
    cautions: [...SMITH_CAUTIONS, 'The rails take care of the bar\'s balance, not yours: learn the single-leg hinge with body weight first.', 'Low-back pain: shorten the range or use a kickstand stance.'],
    kin: { 'Bar position': `Bar hangs under the shoulders, close to the standing leg; ${RAILS.charAt(0).toLowerCase() + RAILS.slice(1)}` },
  },
  {
    id: 'smith-reverse-grip-bent-over-row', name: 'Smith Reverse Grip Bent Over Row', url: GV(22809, 'smith-reverse-grip-bent-over-row'), base: 'barbell-reverse-grip-bent-over-row',
    aliases: ['Smith machine reverse-grip row', 'Smith underhand bent-over row', 'Smith machine supinated row'], equipment: SMITH,
    cues: {
      c1: 'Set the pegs at about knee height. Underhand grip about shoulder width, turn the bar off the pegs, knees soft, hinge until the trunk is about 30-40 degrees above the floor, back flat, bar hanging under the shoulders.',
      c4: 'Lower the bar slowly down the rails to straight arms.',
      c5: 'Keep the hinge and the brace; start the next rep without standing up. After the last rep stand up and turn the bar back onto the pegs.',
    },
    cautions: [...SMITH_CAUTIONS, 'Hold the brace and the hinge for the whole set; rack the bar if the back starts to round.', 'Elbow or biceps pain with the underhand grip: use an overhand grip.'],
    kin: { 'Bar path': `${RAILS}; the bar runs to the lower belly (common coaching)` },
  },
  {
    id: 'smith-low-bar-squat', name: 'Smith Low Bar Squat', url: GV(4245, 'smith-low-bar-squat'), base: 'barbell-low-bar-squat',
    aliases: ['Smith machine low-bar squat', 'Smith low-bar back squat'], equipment: SMITH,
    cues: {
      c1: 'Bar low on the back, across the rear shoulders just below the bony ridge of the shoulder blades; hands close enough to pin it there, elbows lifted back. Feet about shoulder width, toes turned out; turn the bar off the pegs.',
      c2: 'Big breath, brace, then send the hips back and down as the chest tips forward; knees push out over the toes while the bar rides down the rails.',
      c5: 'Lock out the hips and knees, take a new breath and brace. After the last rep turn the bar back onto the pegs.',
    },
    cautions: [...SMITH_CAUTIONS, 'The low bar position needs good shoulder mobility; do not force the hands in if the elbows or shoulders hurt.', 'Keep the back flat: the forward lean puts more load on the lower back.'],
    kin: { 'Bar position': 'Low bar across the posterior deltoids, a few cm below the high-bar position (Larsen 2021); the bar path is fixed by the rails' },
    addSources: [SCHWANBECK],
  },
  {
    id: 'smith-close-grip-bench-press', name: 'Smith Close Grip Bench Press', url: GV(12463, 'smith-close-grip-bench-press'), base: 'barbell-close-grip-bench-press',
    aliases: ['Smith machine close-grip bench press', 'Smith close-grip press'], equipment: [...SMITH, 'Flat bench'],
    cues: {
      c1: 'Lie on a flat bench square under the Smith bar so it lines up with the lower chest; feet planted, glutes and upper back on the bench, shoulder blades back and down. Grip overhand about shoulder width, turn the bar off the pegs and hold it up with straight arms.',
      c4: 'Breathe out and press straight back up the rails, driving the elbows straight.',
      c5: 'Arms straight, re-brace and go again; after the last rep turn the bar back onto the pegs.',
    },
    cautions: [...SMITH_CAUTIONS, 'Line the bench up so the bar meets the lower chest before you load it; the rails will not let you correct the path mid-rep.', 'Wrist pain: widen the grip slightly so the forearms are closer to vertical (clinical opinion).'],
    kin: { 'Bar path': 'Fixed by the vertical rails: the bar goes straight down to the lower chest and straight back up, without the free bar\'s curve back over the shoulders (common coaching)' },
    addSources: [SAETERBAKKEN],
  },
  {
    id: 'smith-incline-close-grip-bench-press', name: 'Smith Incline Close Grip Bench Press', url: GV(24275, 'smith-incline-close-grip-bench-press'), base: 'barbell-incline-close-grip-bench-press',
    aliases: ['Smith machine incline close-grip bench press', 'Smith incline close-grip press'], equipment: [...SMITH, 'Adjustable bench (30 degrees)'],
    cues: {
      c1: 'Set the back pad to about 30 degrees and place the bench under the Smith bar so it lines up with the upper chest; glutes in the crease, feet planted. Grip overhand about shoulder width, turn the bar off the pegs and hold it up with straight arms.',
      c4: 'Breathe out and press straight back up the rails, driving the elbows straight.',
      c5: 'Arms straight, re-brace and go again; after the last rep turn the bar back onto the pegs.',
    },
    cautions: [...SMITH_CAUTIONS, 'Line the bench up so the bar meets the upper chest before you load it.', 'Wrist pain: widen the grip slightly so the forearms are closer to vertical (clinical opinion).'],
    kin: { 'Bar path': 'Fixed by the vertical rails: straight down to the upper chest and straight back up (common coaching)' },
    addSources: [SAETERBAKKEN],
  },
  {
    id: 'smith-jm-bench-press', name: 'Smith JM Bench Press', url: GV(20725, 'smith-jm-bench-press'), base: 'barbell-jm-bench-press',
    aliases: ['Smith machine JM press', 'Smith JM press'], equipment: [...SMITH, 'Flat bench'],
    cues: {
      c1: 'Lie on a flat bench with the Smith bar over the upper chest; feet planted. Grip overhand a little inside shoulder width, turn the bar off the pegs and hold it up, elbows tucked and pointing toward the feet.',
      c2: 'Breathe in and let the elbows bend and travel down toward the feet together; the rails keep the bar on a straight line down toward the upper chest.',
      c3: 'Bar a few centimetres above the upper chest, forearms angled back, elbows pointing toward the feet; the safety stops are set here.',
      c5: 'Arms straight; re-brace and repeat. After the last rep turn the bar back onto the pegs.',
    },
    cautions: [...SMITH_CAUTIONS, 'Set the safety stops a few centimetres above the upper chest and neck so the bar can never reach them.', 'Elbow pain: stop, lighten the load or switch to a close-grip press (clinical opinion).'],
    kin: { 'Bar path': 'Fixed by the vertical rails over the upper chest; the bar stops a few centimetres above it (clinical opinion)' },
  },
  ...[['sled-hack-squat', 'Sled Hack Squat', 5083, 'sled-hack-squat', 'parallel', [95, 110], ['Hack squat', 'Machine hack squat', 'Hack squat machine', 'Sled hack squat machine']],
    ['sled-full-hack-squat', 'Sled Full Hack Squat', 14592, 'sled-full-hack-squat', 'full', [118, 135], ['Full hack squat', 'Deep hack squat', 'Machine full hack squat', 'ATG hack squat']]].map(([id, name, n, slug, depth, band, aliases]) => ({
    id, name, url: GV(n, slug), base: 'smith-squat', aliases, equipment: ['Hack squat machine (plate-loaded sled)'], difficulty: depth === 'full' ? 'Intermediate' : 'Beginner',
    muscles: { target: BI('quads', 'glute_max'), synergist: BI('adductors', 'hamstrings', 'calves'), stabilizer: [...BI('core'), ...BI('obliques', 'glute_med', 'forearm_flexors')] },
    breathing: { pattern: 'Breathe in and brace at the top, hold it on the way down and through the bottom, breathe out as you push past the hardest part.', cadence: 'About 2 s down, a short pause, about 1.2 s up' },
    prescription: PRESC({ reps: depth === 'full' ? '6-10' : '8-12' }),
    cueList: [
      { id: 'c1', phase: 'setup', text: 'Back and hips flat on the pad, shoulders under the shoulder pads, hands on the handles. Feet about hip width in the middle of the platform, toes turned out a little; release the safety catches.' },
      { id: 'c2', phase: 'lower', text: `Big breath, brace, and bend the knees: the carriage slides down the rails with you while the back stays on the pad${depth === 'full' ? ', all the way down until the thighs fold close to the calves' : ', to about thighs parallel with the platform'}.` },
      { id: 'c3', phase: 'bottom', text: 'Heels flat, knees in line with the toes, lower back still on the pad; no bounce.' },
      { id: 'c4', phase: 'rise', text: 'Push the platform away through the whole foot and drive the carriage back up the rails; breathe out past the hardest part.' },
      { id: 'c5', phase: 'reset', text: 'Knees straight but not locked, re-brace for the next rep; after the last rep turn the safety catches back in.' },
    ],
    mistakes: [
      { id: 'm1', mistake: 'Heels lifting off the platform at the bottom', fix: 'Place the feet a little higher on the platform and push through the whole foot.' },
      { id: 'm2', mistake: 'Hips peeling off the pad at the bottom', fix: 'Only go as deep as you can keep the lower back and hips on the pad.' },
      { id: 'm3', mistake: 'Knees caving in on the way up', fix: 'Push the knees out over the toes; use a lighter load.' },
      { id: 'm4', mistake: 'Locking the knees hard at the top', fix: 'Stop just short of a hard lockout to keep tension on the legs.' },
    ],
    kinematics: [
      { measure: 'Knee flexion', norm: depth === 'full' ? 'A full hack squat bends the knees to about 120-135 degrees (common coaching); squat depth raises the demand on the knee extensors (Straub 2024)' : 'To about thighs parallel with the platform, roughly 90-110 degrees of knee flexion (common coaching)', sources: ['straub2024'] },
      { measure: 'Hip flexion', norm: 'The reclined back keeps the hips more open than in a free squat, shifting the work toward the knee extensors (clinical opinion)', sources: [] },
      { measure: 'Back angle', norm: 'Back flat on the pad; the sled carries the trunk along rails at a fixed angle (machine design)', sources: [] },
      { measure: 'Foot position', norm: 'Feet about hip width, toes out a little; higher feet bring in more hip, lower feet more knee (common coaching; Escamilla 1998 compared squat and leg press knee loads)', sources: ['escamilla1998'] },
      { measure: 'Carriage travel', norm: 'Fixed by the rails', sources: [] },
      { measure: 'Tempo', norm: 'Controlled, about 2 s down and 1-1.5 s up (clinical opinion)', sources: [] },
    ],
    dropSources: ['schwanbeck2009', 'paoli2009', 'lorenzetti2018'], addSources: [src('escamilla1998')],
    cautions: ['Set the safety catches before loading the sled, and learn where the release levers are.', 'Keep the lower back on the pad; stop the descent where the hips start to curl off it.', 'Knee pain: shorten the range or move the feet higher on the platform.'],
    safety: { modify: ['Knee pain: squat to a pain-free depth.', 'Limited ankle mobility: feet a little higher on the platform.'], regressions: ['Leg press.', 'Bodyweight box squat.'], progressions: depth === 'full' ? ['Pause at the bottom.', 'Slower lowering (3-4 s).'] : ['Full-depth hack squat.', 'Pause at the bottom.'] },
    camera: CAM(35, 12), timeline: TL5(['Top, knees soft', 'Slide down', depth === 'full' ? 'Bottom: deep knee bend' : 'Bottom: thighs parallel', 'Drive up', 'Reset']),
    act: actOf({ quads: [0.2, 0.6, 0.95], glute_max: [0.1, 0.45, 0.8], adductors: [0.08, 0.35, 0.6], hamstrings: [0.08, 0.25, 0.4], calves: [0.15, 0.25, 0.35], core: [0.3, 0.4, 0.5, 'hold'], obliques: [0.2, 0.25, 0.3, 'hold'], glute_med: [0.1, 0.25, 0.35], forearm_flexors: [0.25, 0.25, 0.25, 'hold'] }), liftPhase: 'rise',
    guides: [{ id: 'hipPath', kind: 'path', joint: 'pelvis', from: 0.8, to: 2.8, label: 'Hips slide down the rails' }, { id: 'kneeAngle', kind: 'jointAngle', joint: 'knee_r', normBand: band, label: depth === 'full' ? 'Deep knee bend' : 'Thighs parallel' }],
    checks: { stillJoints: ['ankle_r', 'ankle_l', 'toe_r', 'toe_l'], plantedContacts: ['leg_r', 'leg_l'], measure: { name: 'kneeFlexion', min: band[0], max: band[1] }, floorTolerance: 0.5 },
    notes: SQUAT_NOTES,
  })),
  // ---------------- leg presses (sled kind 'sled', type leg_press; linear 45-degree sled or lever mode) ----------------
  ...[
    { id: 'sled-45-degrees-one-leg-press', name: 'Sled 45 degrees One Leg Press', n: 7438, slug: 'sled-45-degrees-one-leg-press', one: true, kind: 'sled', aliases: ['Single-leg 45-degree leg press', 'One-leg sled leg press', '45-degree single-leg press'], equip: '45-degree leg press (plate-loaded sled)' },
    { id: 'lever-seated-leg-press', name: 'Lever Seated Leg Press', n: 4359, slug: 'lever-seated-leg-press', one: false, kind: 'lever', aliases: ['Seated leg press machine', 'Plate-loaded seated leg press', 'Lever leg press'], equip: 'Seated leg press (plate-loaded lever)' },
    { id: 'lever-horizontal-leg-press', name: 'Lever Horizontal Leg Press', n: 16480, slug: 'lever-horizontal-leg-press', one: false, kind: 'lever', aliases: ['Horizontal leg press', 'Lever horizontal leg press machine'], equip: 'Horizontal leg press (plate-loaded lever)' },
    { id: 'lever-horizontal-one-leg-press', name: 'Lever Horizontal One leg Press', n: 8079, slug: 'lever-horizontal-one-leg-press', one: true, kind: 'lever', aliases: ['Single-leg horizontal leg press', 'One-leg horizontal leg press'], equip: 'Horizontal leg press (plate-loaded lever)' },
    { id: 'lever-angled-single-leg-press', name: 'Lever Angled Single Leg Press', n: 20731, slug: 'lever-angled-single-leg-press-male', one: true, kind: 'lever', aliases: ['Angled single-leg press', 'Single-leg angled leg press', 'Lever angled one-leg press'], equip: 'Angled leg press (plate-loaded lever)' },
  ].map((v) => ({
    id: v.id, name: v.name, url: GV(v.n, v.slug), base: 'lever-leg-extension', aliases: v.aliases, equipment: [v.equip],
    type: 'Strength', bodyPart: 'Thighs (quadriceps)', secondaryBodyParts: ['Hips (glutes)'], difficulty: v.one ? 'Intermediate' : 'Beginner', mechanics: 'Compound (hip and knee)', plane: 'Sagittal',
    laterality: v.one ? 'Unilateral' : 'Bilateral', authoredSide: v.one ? 'right' : 'bilateral',
    muscles: v.one ? { target: ['quads_r', 'glute_max_r'], synergist: ['adductors_r', 'hamstrings_r', 'calves_r'], stabilizer: ['glute_med_r', 'core', 'forearm_flexors_r', 'forearm_flexors_l'] } : { target: BI('quads', 'glute_max'), synergist: BI('adductors', 'hamstrings', 'calves'), stabilizer: [...BI('core'), ...BI('forearm_flexors')] },
    breathing: { pattern: 'Breathe in as the plate comes toward you, breathe out as you press it away.', cadence: 'About 2 s toward you, a short pause, about 1.2 s press' },
    prescription: PRESC({ reps: v.one ? '8-12 per leg' : '10-15' }),
    cueList: [
      { id: 'c1', phase: 'setup', text: `Sit with the hips and back flat on the pads and hold the side handles. ${v.one ? 'Right foot in the middle of the plate, toes out a little; the left foot rests on the floor.' : 'Feet about hip width in the middle of the plate, toes out a little.'} Press the plate out to nearly straight ${v.one ? 'leg' : 'legs'}${v.kind === 'sled' ? ' and turn the safety catches out' : ''}.` },
      { id: 'c2', phase: 'lower', text: `Breathe in and let the plate come toward you under control, the ${v.one ? 'knee' : 'knees'} tracking over the toes.` },
      { id: 'c3', phase: 'bottom', text: 'Stop when the knee is bent about 90 degrees, before the lower back starts to curl off the pad.' },
      { id: 'c4', phase: 'rise', text: 'Breathe out and press the plate away through the whole foot, heel down.' },
      { id: 'c5', phase: 'reset', text: `${v.one ? 'Leg' : 'Legs'} nearly straight, knees soft; go again. ${v.one ? 'Do all reps, then switch legs.' : ''}`.trim() },
    ],
    mistakes: [
      { id: 'm1', mistake: 'Lower back and hips curling off the pad at the bottom', fix: 'Stop the plate a little earlier, or set the seat further back.' },
      { id: 'm2', mistake: 'Heels lifting off the plate', fix: 'Place the foot a little higher and press through the heel and mid-foot.' },
      { id: 'm3', mistake: 'Locking the knees hard at the top', fix: 'Stop just short of a hard lockout.' },
      { id: 'm4', mistake: v.one ? 'Knee drifting inward' : 'Knees caving in', fix: 'Keep the knee in line with the second toe; use a lighter load.' },
    ],
    kinematics: [
      { measure: 'Knee flexion', norm: 'From nearly straight to about 90 degrees; knee forces rise with knee flexion in the leg press (Escamilla 1998)', sources: ['escamilla1998'] },
      { measure: 'Hip flexion', norm: 'Hips flex deeply at the bottom while the pelvis stays on the seat (common coaching)', sources: [] },
      { measure: 'Ankle', norm: 'Heel stays down on the plate; the ankle bends with the knee (common coaching)', sources: [] },
      { measure: 'Seat and back', norm: 'Hips and back stay on the pads through the rep (machine design)', sources: [] },
      { measure: 'Plate travel', norm: v.kind === 'sled' ? 'Fixed by the sled rails' : 'Fixed by the lever: the plate swings on an arc about its pivot', sources: [] },
      { measure: 'Foot position', norm: 'Middle of the plate, about hip width; higher feet bring in more hip, lower feet more knee (common coaching)', sources: [] },
      { measure: 'Tempo', norm: 'Controlled, about 2 s toward you and 1-1.5 s press (clinical opinion)', sources: [] },
    ],
    cautions: [v.kind === 'sled' ? 'Turn the safety catches back in before getting out of the sled, and never let the plate come down past them.' : 'Set the seat so the knee bends to about 90 degrees without the lower back leaving the pad.', 'Keep the lower back on the pad; stop the descent where the hips start to curl.', 'Knee pain: shorten the range or move the foot higher on the plate.'],
    safety: { modify: ['Knee pain: press through a pain-free range.', 'Low-back discomfort: shorten the range so the pelvis stays on the seat.'], regressions: v.one ? ['Two-leg press.', 'Body-weight split squat.'] : ['Lighter load, shorter range.', 'Body-weight box squat.'], progressions: v.one ? ['Slower lowering (3-4 s).', 'Pause at the bottom.'] : ['Single-leg press.', 'Pause at the bottom.'] },
    camera: CAM(25, 24), timeline: TL5(['Legs nearly straight', 'Plate toward you', 'Bottom: knee about 90°', 'Press away', 'Reset']),
    act: v.one ? { quads_r: [0.2, 0.65, 1], glute_max_r: [0.1, 0.45, 0.8], adductors_r: [0.08, 0.3, 0.5], hamstrings_r: [0.08, 0.2, 0.35], calves_r: [0.1, 0.2, 0.3], glute_med_r: [0.1, 0.3, 0.45], core: [0.3, 0.35, 0.4, 'hold'], forearm_flexors_r: [0.25, 0.3, 0.35, 'hold'], forearm_flexors_l: [0.25, 0.3, 0.35, 'hold'] } : actOf({ quads: [0.2, 0.6, 0.95], glute_max: [0.1, 0.4, 0.75], adductors: [0.08, 0.3, 0.5], hamstrings: [0.08, 0.2, 0.35], calves: [0.1, 0.2, 0.3], core: [0.25, 0.3, 0.35, 'hold'], forearm_flexors: [0.2, 0.25, 0.3, 'hold'] }), liftPhase: 'rise',
    guides: [{ id: 'kneeAngle', kind: 'jointAngle', joint: 'knee_r', normBand: [80, 100], label: 'Knee about 90 degrees at the bottom' }],
    checks: { stillJoints: v.one ? ['ankle_l', 'toe_l'] : [], plantedContacts: v.one ? ['leg_l'] : [], measure: { name: 'kneeFlexion', min: 85, max: 105 }, floorTolerance: 0.5 },
    notes: { quads: 'Knee extensors do most of the pressing, hardest near the bottom (Escamilla 1998).', glute_max: 'Extends the hip from the deep hip bend at the bottom (clinical opinion).', adductors: 'Adductor magnus helps extend the hip from deep flexion (clinical opinion).', hamstrings: 'Assist hip extension; activity stays moderate (Escamilla 1998).', calves: 'Keep the ankle steady against the plate.', glute_med: 'Keeps the working knee in line with the foot.', core: 'Holds the pelvis and back on the pads.', forearm_flexors: 'Grip the side handles to stay seated.' },
  })),
  ...[
    { id: 'sled-calf-press-on-leg-press', name: 'Sled Calf Press On Leg Press', n: 5116, slug: 'sled-calf-press-on-leg-press', kind: 'sled', aliases: ['Calf press on the leg press', '45-degree leg press calf raise', 'Leg press calf press'], equip: '45-degree leg press (plate-loaded sled)' },
    { id: 'lever-seated-calf-press', name: 'Lever Seated Calf Press', n: 7442, slug: 'lever-seated-calf-press', kind: 'lever', aliases: ['Seated calf press machine', 'Lever calf press', 'Plate-loaded seated calf press'], equip: 'Seated leg press (plate-loaded lever)' },
  ].map((v) => ({
    id: v.id, name: v.name, url: GV(v.n, v.slug), base: 'barbell-seated-calf-raise', aliases: v.aliases, equipment: [v.equip],
    bodyPart: 'Lower legs (calves)', secondaryBodyParts: [], difficulty: 'Beginner', mechanics: 'Isolation (ankle)', plane: 'Sagittal', laterality: 'Bilateral', authoredSide: 'bilateral',
    muscles: { target: BI('calves'), synergist: [], stabilizer: [...BI('quads'), ...BI('forearm_flexors'), 'core'] },
    breathing: { pattern: 'Breathe out as you press the plate away with the balls of the feet, breathe in as the heels come back.', cadence: 'About 1 s press, a short pause, about 2 s back' },
    prescription: PRESC({ reps: '12-20', rest: '1-1.5 minutes between sets' }),
    cueList: [
      { id: 'c1', phase: 'setup', text: `Sit with the hips and back on the pads, hold the handles. Press the plate out to nearly straight legs${v.kind === 'sled' ? ', turn the safety catches out' : ''}, then slide the feet down so only the balls of the feet are on the bottom edge of the plate, heels off.` },
      { id: 'c2', phase: 'lower', text: 'Keep the knees still and let the plate push the toes back toward you, heels travelling past the plate edge for a full calf stretch.' },
      { id: 'c3', phase: 'bottom', text: 'Pause in the stretch; no bounce.' },
      { id: 'c4', phase: 'rise', text: 'Breathe out and press the plate away by pointing the toes as far as they go; the knees do not move.' },
      { id: 'c5', phase: 'reset', text: 'Squeeze the calves for a moment with the toes pointed, then go again.' },
    ],
    mistakes: [
      { id: 'm1', mistake: 'Bending and straightening the knees to move the plate', fix: 'Lock the knee angle in and move only at the ankles.' },
      { id: 'm2', mistake: 'Short, bouncy reps', fix: 'Use the whole range: full stretch, full point, with a pause at each end.' },
      { id: 'm3', mistake: 'Feet slipping off the plate edge', fix: 'Keep the balls of the feet firmly on the plate; use a lighter load.' },
    ],
    kinematics: [
      { measure: 'Ankle', norm: 'From a full stretch to full plantarflexion (clinical opinion)', sources: [] },
      { measure: 'Knee flexion', norm: 'Knees nearly straight and still: with straight knees the gastrocnemius works fully; standing (straight-knee) training grew the gastrocnemius more than seated work (Kinoshita 2023)', sources: ['kinoshita2023'] },
      { measure: 'Seat and back', norm: 'Hips and back stay on the pads (machine design)', sources: [] },
      { measure: 'Plate travel', norm: v.kind === 'sled' ? 'Fixed by the sled rails; the ankles alone move it' : 'Fixed by the lever arc; the ankles alone move it', sources: [] },
      { measure: 'Foot position', norm: 'Balls of the feet on the bottom edge of the plate, heels free (common coaching)', sources: [] },
      { measure: 'Tempo', norm: 'About 1 s press, a short pause, about 2 s back (clinical opinion)', sources: [] },
    ],
    dropSources: ['zellers2019'],
    cautions: [v.kind === 'sled' ? 'Turn the safety catches back in before taking the feet off the plate.' : 'Set the seat so the legs are nearly straight with the balls of the feet on the plate.', 'Keep the knees soft but still; never let the plate slide off the balls of the feet.', 'Achilles or calf pain: shorten the stretch at the bottom.'],
    safety: { modify: ['Achilles pain: work through a shorter, pain-free range.'], regressions: ['Standing two-leg calf raise on the floor.'], progressions: ['Single-leg calf press.', 'Slower lowering (3 s).'] },
    camera: CAM(25, 24), timeline: TL5(['Toes pointed, plate pressed', 'Heels back', 'Calf stretch', 'Press with the toes', 'Squeeze'], ['setup', 'lower', 'bottom', 'rise', 'reset'], [0, 0.6, 2.4, 2.8, 3.8, 4.4], ['natural', 'inhale', 'hold', 'exhale', 'hold']),
    act: actOf({ calves: [0.35, 0.55, 0.95], quads: [0.2, 0.2, 0.25, 'hold'], forearm_flexors: [0.2, 0.25, 0.3, 'hold'] }), patch: (m) => { m.activation.core = [[0, 0.25], [m.timeline.duration, 0.25]]; m.activation.calves_r = m.activation.calves_l = [[0, 0.8], [0.6, 0.8], [2.4, 0.35], [2.8, 0.45], [3.8, 0.95], [4.4, 0.85]]; },
    guides: [{ id: 'ankle', kind: 'jointAngle', joint: 'ankle_r', label: 'Ankle from a full stretch to fully pointed' }],
    checks: { stillJoints: [], plantedContacts: [], measure: { name: 'kneeFlexion', min: 0, max: 30 }, floorTolerance: 0.5 },
    notes: { calves: 'Gastrocnemius and soleus point the foot against the plate; with straight knees the gastrocnemius takes a large share (Kinoshita 2023).', quads: 'Hold the knees at the same angle so the ankles do the work.', forearm_flexors: 'Grip the handles.', core: 'Holds the pelvis on the seat.' },
  })),
  {
    id: 'lever-standing-single-leg-calf-raise', name: 'Lever Standing Single Leg Calf Raise', url: GV(22087, 'lever-standing-single-leg-calf-raise'), base: 'barbell-standing-single-leg-calf-raise',
    aliases: ['Machine standing single-leg calf raise', 'Standing calf machine, one leg', 'Lever one-leg calf raise'], equipment: ['Standing calf raise machine (plate-loaded lever)'],
    cues: {
      c1: 'Step under the shoulder yoke of the calf machine, hands on its handles, and stand up straight to lift the lever. Stand on the right foot, left foot lifted behind with the knee bent, body tall.',
      c4: 'Breathe in and lower the heel slowly to the floor; the lever comes down with you.',
    },
    cautions: ['Lift the lever off its stop with both feet on the floor before shifting onto one leg; put it back the same way.', 'Start light: balance on one leg under the yoke is the hard part; stop the set if you wobble.'],
    kin: { 'Bar position': 'Shoulder yoke across the upper back, hands on its handles just outside the shoulders (machine design)' },
  },
  // ---------------- belt squat machine (lever_machine; belt held item kind 'sled') ----------------
  ...[
    { id: 'lever-belt-squat', name: 'Lever Belt Squat', n: 14610, slug: 'lever-belt-squat', base: 'bodyweight-squat', drop: ['Arms'], aliases: ['Belt squat', 'Belt squat machine', 'Hip belt squat'],
      cues: { c1: 'Stand on the platform facing the machine, the hip belt snug around the hips and hooked to the lever, feet about shoulder width, toes turned out slightly; hold the handles in front.', c2: 'Breathe in, sit the hips back and down; the belt pulls straight down through the hips while the knees travel over the toes.', c3: 'Thighs about parallel, heels down, chest up; the back carries no load.' } },
    { id: 'lever-belt-sumo-squat', name: 'Lever Belt Sumo Squat', n: 20916, slug: 'lever-belt-sumo-squat', base: 'dumbbell-sumo-squat', drop: ['Dumbbell'], aliases: ['Belt sumo squat', 'Wide-stance belt squat', 'Belt squat, sumo stance'],
      cues: { c1: 'Hip belt snug and hooked to the lever, feet well wider than the shoulders, toes turned out; hold the handles in front.', c3: 'Thighs about parallel, chest tall; the belt hangs between the legs.' } },
    { id: 'lever-belt-romanian-deadlift', name: 'Lever Belt Romanian Deadlift', n: 20917, slug: 'lever-belt-romanian-deadlift', base: 'dumbbell-romanian-deadlift', drop: [], aliases: ['Belt Romanian deadlift', 'Belt squat machine RDL', 'Hip belt RDL'],
      cues: { c1: 'Hip belt snug and hooked to the lever, feet hip width, knees soft; hold the handles in front for balance.', c2: 'Push the hips back against the belt, keep the back flat and let the chest tip forward.', c3: 'Stop where the hamstrings are stretched with the back still flat.', c4: 'Drive the hips forward through the belt to stand tall.' } },
    { id: 'lever-belt-bulgarian-split-squat', name: 'Lever Belt Bulgarian Split Squat', n: 22535, slug: 'lever-belt-bulgarian-split-squat', base: 'dumbbell-bulgarian-split-squat', drop: [], aliases: ['Belt Bulgarian split squat', 'Belt squat machine split squat', 'Hip belt rear-foot-elevated split squat'],
      cues: { c1: 'Hip belt snug and hooked to the lever; laces of the back foot on the bench behind you, front foot about a leg length ahead; hold the handles in front.', c3: 'Front thigh about parallel to the floor, chest tall.' } },
  ].map((v) => ({
    id: v.id, name: v.name, url: GV(v.n, v.slug), base: v.base, aliases: v.aliases,
    equipment: ['Belt squat machine (plate-loaded lever)', 'Hip belt', ...(v.base === 'dumbbell-bulgarian-split-squat' ? ['Flat bench'] : [])], cues: v.cues,
    patch: (m) => {
      const e = m.exercise; e.kinematics = e.kinematics.filter((k) => !v.drop.includes(k.measure));
      e.kinematics.push({ measure: 'Belt and lever', setup: '', peak: '', norm: 'The load hangs from the hips through the belt, so the spine and shoulders carry none of it (machine design; common coaching)', sources: [] });
      for (const k of ['forearm_flexors_r', 'forearm_flexors_l']) if (!e.muscles.stabilizer.includes(k)) e.muscles.stabilizer.push(k);
      e.muscleNotes.forearm_flexors_r = e.muscleNotes.forearm_flexors_l = 'Hold the handles for balance (light grip).';
      e.safety.cautions = ['Fit the belt low on the hips and check the hook and chain before loading the lever.', 'Hold the handles lightly for balance; the legs and hips do the work.', ...e.safety.cautions.filter((c) => !/dumbbell/i.test(c))];
      e.safety.progressions = (e.safety.progressions || []).filter((x) => !/dumbbell/i.test(x));
      e.mistakes = e.mistakes.filter((x) => !/dumbbell|arms/i.test(x.mistake + x.fix));
      e.prescription.load = 'Machine load is user-chosen: pick a weight you can move through the full range shown with good form, leaving about 2-3 reps in reserve (RPE 7-8).';
    },
    warnWords: ['dumbbell', 'arms reaching'],
  })),
  ...[
    { id: 'lever-full-squat', name: 'Lever Full Squat', n: 22788, slug: 'lever-full-squat', aliases: ['Leverage squat', 'Lever squat machine', 'Plate-loaded squat machine, full depth'], equip: 'Lever squat machine (plate-loaded)',
      c1: 'Step under the shoulder yoke of the lever squat, yoke on the upper traps, hands on its handles, feet a little wider than the hips with the toes turned out; stand up to lift the lever off its stop.',
      path: 'The yoke rides on the end of a lever pivoting low behind the athlete, so its path is a gentle arc (machine design)' },
    { id: 'lever-pendulum-squat-plate-loaded', name: 'Lever Pendulum Squat (plate loaded)', n: 11107, slug: 'lever-pendulum-squat-plate-loaded', aliases: ['Pendulum squat', 'Pendulum squat machine', 'Plate-loaded pendulum squat'], equip: 'Pendulum squat machine (plate-loaded)',
      c1: 'Step in under the shoulder pads of the pendulum, pads on the upper traps, hands on the handles, feet a little wider than the hips with the toes turned out; stand up to lift the swing arm off its stop.',
      path: 'The shoulder pads hang from a swing arm pivoting behind the athlete, so they travel on an arc (machine design)' },
  ].map((v) => ({
    id: v.id, name: v.name, url: GV(v.n, v.slug), base: 'barbell-full-squat', aliases: v.aliases, equipment: [v.equip],
    cues: { c1: v.c1, c2: 'Big breath, brace, then sit down between the heels: knees travel forward and out over the toes, chest stays up; the machine carries the load along its arc.', c4: 'Drive the floor away, chest and hips rising together; the arm swings back up with you. Breathe out as you pass the hardest part.', c5: 'Stand tall, hips and knees straight, take a new breath and brace; after the last rep set the arm back on its stop.' },
    cautions: ['Set the stop or safety catch at a depth just under your bottom position before loading the machine.', 'Keep the pads on the muscle of the upper back, never on the neck.'],
    mistakes: [
      { id: 'm1', mistake: 'Knees caving in on the way up', fix: 'Push the knees out over the toes; use a lighter load.' },
      { id: 'm2', mistake: 'Hips shooting up first', fix: 'Drive the shoulders up into the pads as the hips rise; both move together.' },
      { id: 'm3', mistake: 'Heels lifting at the bottom', fix: 'Stand a little further forward on the platform and keep the whole foot down.' },
      { id: 'm4', mistake: 'Rounding the lower back at the bottom', fix: 'Stop just above the depth where the pelvis tucks under.' },
    ],
    kin: { 'Bar position': { norm: `Shoulder yoke on the upper traps where a high bar would sit; ${v.path}`, sources: [] } },
    dropSources: ['schwanbeck2009'],
  })),
  {
    id: 'medicine-ball-seated-calf-raise', name: 'Medicine Ball Seated Calf Raise', url: GV(25192, 'medicine-ball-seated-calf-raise'), base: 'seated-dumbbell-calf-raise',
    aliases: ['Seated calf raise with a medicine ball', 'Medicine ball seated heel raise'], equipment: ['Medicine ball', 'Flat bench'],
    cues: { c1: 'Sit on the end of the bench, feet flat a little wider than the hips, shins vertical; rest a medicine ball on the lower thighs just behind the knees and hold it there with a hand on each side.', c2: 'Breathe out and press through the balls of the feet, lifting the heels and the ball as high as you can.' },
    mistakes: [
      { id: 'm1', mistake: 'Bouncing through short reps', fix: 'Full range: heels all the way down, pause at the top, slow lowering.' },
      { id: 'm2', mistake: 'Feet rolling out onto the little toes', fix: 'Keep the pressure on the big and second toes.' },
      { id: 'm3', mistake: 'Pushing the ball up with the arms', fix: 'The hands only hold the ball in place; the calves lift it.' },
      { id: 'm4', mistake: 'Feet too far forward', fix: 'Shins vertical, knees over the ankles, so the load sits over the balls of the feet.' },
    ],
    cautions: ['Choose a ball heavy enough to load the calves but easy to hold steady on the thighs.', 'Rest the ball on the thigh muscle just behind the kneecaps, not on the kneecaps.'],
    safety: { modify: ['Achilles or plantar heel pain: smaller range and slower tempo.', 'Knee discomfort under the ball: fold a towel over the thighs.'], regressions: ['No ball (body-weight seated heel raise).'], progressions: ['Heavier ball, or a dumbbell across each thigh.', 'Balls of the feet on a plate or step for a deeper stretch.', 'Single-leg seated raise with the ball on one thigh.'] },
    kin: { Dumbbells: null },
    patch: (m) => { const e = m.exercise; e.kinematics = e.kinematics.filter((k) => k.measure !== 'Dumbbells'); e.kinematics.splice(3, 0, { measure: 'Medicine ball', setup: '', peak: '', norm: 'Resting on the lower thighs just behind the knees, steadied by the hands (common setup; clinical opinion)', sources: [] }); e.muscleNotes.forearm_flexors_r = e.muscleNotes.forearm_flexors_l = 'The hands press lightly on the sides of the ball to keep it on the thighs.'; e.prescription.load = 'Ball weight is user-chosen (a 5-10 kg medicine ball is typical); go heavier or add reps when every rep reaches full height.'; },
    warnWords: ['dumbbell'],
  },
  {
    id: 'assisted-bulgarian-split-squat', name: 'Assisted Bulgarian Split Squat', url: GV(16041, 'assisted-bulgarian-split-squat'), base: 'dumbbell-bulgarian-split-squat',
    aliases: ['Suspension-assisted Bulgarian split squat', 'TRX-assisted Bulgarian split squat', 'Assisted rear-foot-elevated split squat'], equipment: ['Suspension trainer (straps from an overhead anchor)', 'Flat bench'], difficulty: 'Beginner',
    cues: {
      c1: 'Laces of the back foot on the bench, front foot about a leg length ahead; hold the suspension-strap handles in front of the chest with the straps taut.',
      c2: 'Breathe in and drop the back knee straight down; the arms straighten a little on the straps and help you balance and lower.',
      c3: 'Front thigh about parallel to the floor, chest tall, straps still taut.',
      c4: 'Breathe out and drive through the whole front foot to stand up; pull on the straps only as much as you need.',
    },
    cautions: ['Check the strap anchor and keep both straps taut; let the legs do most of the work.', 'Set the bench where it cannot slide.'],
    safety: { modify: ['Knee pain: move the front foot farther forward and shorten the depth.'], regressions: ['Assisted split squat with both feet on the floor.'], progressions: ['Less help from the straps.', 'Bulgarian split squat without assistance, then with dumbbells.'] },
    patch: (m) => { const e = m.exercise; e.kinematics.push({ measure: 'Straps', setup: '', peak: '', norm: 'The straps take some body weight and help balance; using less help makes the legs work harder (clinical opinion)', sources: [] }); e.muscleNotes.forearm_flexors_r = e.muscleNotes.forearm_flexors_l = 'Hold the strap handles.'; e.muscleNotes.upper_traps_r = e.muscleNotes.upper_traps_l = 'Steady the shoulders while the arms hold the straps.'; e.prescription.load = 'Body weight with help from the straps; use less help to make it harder.'; },
    warnWords: ['dumbbell'],
  },
  {
    id: 'weighted-full-squat-from-deficit', name: 'Weighted Full Squat from Deficit', url: GV(17888, 'weighted-full-squat-from-deficit-male'), base: 'barbell-full-squat',
    aliases: ['Dip-belt squat from a deficit', 'Belt squat on boxes', 'Weighted deficit squat (dip belt)'], equipment: ['Dip belt with a weight plate', 'Two boxes or benches'],
    cueList: [
      { id: 'c1', phase: 'setup', text: 'Stand with one foot on each box, feet a little wider than the hips, toes turned out; the dip belt sits low on the hips and the plate hangs on its chain between the boxes. Arms reach forward for balance.' },
      { id: 'c2', phase: 'lower', text: 'Big breath, brace, then sit straight down between the heels: knees travel forward and out over the toes, chest stays up, the plate drops between the boxes.' },
      { id: 'c3', phase: 'bottom', text: 'Hips below the knees, heels flat on the boxes, back flat; the plate stays clear of the floor.' },
      { id: 'c4', phase: 'rise', text: 'Drive the boxes away, hips and chest rising together; knees keep pushing out. Breathe out as you pass the hardest part.' },
      { id: 'c5', phase: 'reset', text: 'Stand tall, take a new breath and brace; keep the plate from swinging.' },
    ],
    mistakes: [
      { id: 'm1', mistake: 'Plate hitting the floor at the bottom', fix: 'Use taller boxes or a shorter chain.' },
      { id: 'm2', mistake: 'Knees caving in on the way up', fix: 'Push the knees out over the toes; use a lighter plate.' },
      { id: 'm3', mistake: 'Heels lifting off the boxes', fix: 'Keep the whole foot down; work on ankle mobility or sit a little less deep.' },
      { id: 'm4', mistake: 'Letting the plate swing', fix: 'Move smoothly and pause briefly at the top.' },
    ],
    cautions: ['Use two stable boxes of the same height, wide enough for the whole foot, set where they cannot slide.', 'Fit the dip belt low on the hips and check the chain before loading it.'],
    safety: { modify: ['Knee or hip pain: squat to a pain-free depth.', 'Low boxes: shorten the chain so the plate clears the floor.'], regressions: ['Body-weight squat from a deficit.', 'Goblet squat.'], progressions: ['Heavier plate.', 'Pause at the bottom.'] },
    kin: { 'Bar position': null },
    patch: (m) => { const e = m.exercise; e.kinematics = e.kinematics.filter((k) => k.measure !== 'Bar position'); e.kinematics.push({ measure: 'Deficit and belt', setup: '', peak: '', norm: 'The load hangs from the hips, so the spine and shoulders carry none of it; the boxes let the plate travel below the feet (common coaching)', sources: [] }); e.muscles.stabilizer = e.muscles.stabilizer.filter((x) => !/upper_traps|rhomboids|lats|forearm/.test(x)); e.muscles.stabilizer.push('ant_deltoid_r', 'ant_deltoid_l'); e.muscleNotes.ant_deltoid_r = e.muscleNotes.ant_deltoid_l = 'Hold the arms forward for balance.'; e.prescription.load = 'Plate load is user-chosen: pick a weight you can squat to full depth with the form shown, leaving about 2-3 reps in reserve (RPE 7-8).'; },
    dropSources: [],
    warnWords: ['bar ', 'rack'],
  },

  {
    id: 'smith-behind-neck-press', name: 'Smith Behind Neck Press', url: GV(11603, 'smith-behind-neck-press'), base: 'seated-dumbbell-shoulder-press',
    aliases: ['Smith machine behind-the-neck press', 'Smith seated behind-neck press', 'Smith behind-the-head press'], equipment: [...SMITH, 'Flat bench'], difficulty: 'Intermediate',
    muscles: { target: BI('ant_deltoid', 'lat_deltoid'), synergist: BI('triceps', 'upper_traps', 'serratus'), stabilizer: [...BI('post_deltoid', 'infraspinatus'), 'core'] },
    cueList: [
      { id: 'c1', phase: 'setup', text: 'Sit tall on a bench set under the Smith bar so the bar runs just behind the head; feet planted. Wide overhand grip (hands well outside the shoulders), turn the bar off the pegs and hold it overhead with the arms nearly straight.' },
      { id: 'c2', phase: 'lower', text: 'Breathe in and lower the bar behind the head, elbows out to the sides and under the bar, head and chin slightly forward so the bar passes clear.' },
      { id: 'c3', phase: 'bottom', text: 'Stop with the bar at about the base of the skull, upper arms about level; do not drop it onto the neck.' },
      { id: 'c4', phase: 'press', text: 'Breathe out and press straight up the rails to nearly straight arms.' },
      { id: 'c5', phase: 'reset', text: 'Hold the top briefly, re-brace, go again; after the last rep turn the bar back onto the pegs.' },
    ],
    mistakes: [
      { id: 'm1', mistake: 'Lowering the bar onto the neck', fix: 'Stop at the base of the skull; set the safety stops there.' },
      { id: 'm2', mistake: 'Forcing the range with stiff shoulders', fix: 'Only press behind the neck if the arms reach this position without pain; otherwise press in front.' },
      { id: 'm3', mistake: 'Pushing the head far forward or arching the back', fix: 'Sit tall, chin slightly tucked, ribs down.' },
      { id: 'm4', mistake: 'Locking the elbows hard at the top', fix: 'Stop just short of a hard lockout.' },
    ],
    kinematics: [
      { measure: 'Grip width', norm: 'Wide, hands well outside the shoulders (common coaching)', sources: [] },
      { measure: 'Shoulder elevation (humerus)', norm: 'From about level upper arms at the bottom to overhead (clinical opinion)', sources: [] },
      { measure: 'Elbow flexion', norm: 'About 90 degrees or more at the bottom to nearly straight at the top (clinical opinion)', sources: [] },
      { measure: 'Bar path', norm: `Behind the head: ${RAILS.charAt(0).toLowerCase() + RAILS.slice(1)}`, sources: [] },
      { measure: 'Tempo', norm: 'Controlled, about 2 s down and 1-2 s up (clinical opinion)', sources: [] },
    ],
    cautions: [...SMITH_CAUTIONS, 'The behind-the-neck position needs a lot of shoulder external rotation; skip it if it pinches, and set the safety stops at the base of the skull.'],
    safety: { modify: ['Shoulder pain: press in front of the face instead, and stop short of full overhead.'], regressions: ['Smith or machine shoulder press in front of the head.', 'Seated dumbbell shoulder press.'], progressions: ['Heavier load in small steps.'] },
    camera: CAM(-140, 12), timeline: TL5(['Arms overhead', 'Lower behind the head', 'Bottom: base of the skull', 'Press up', 'Top'], ['setup', 'lower', 'bottom', 'press', 'reset'], [0, 0.8, 2.8, 3.1, 4.3, 5], ['natural', 'inhale', 'hold', 'exhale', 'natural']),
    act: actOf({ ant_deltoid: [0.3, 0.6, 0.9], lat_deltoid: [0.3, 0.6, 0.9], triceps: [0.25, 0.5, 0.8], upper_traps: [0.3, 0.45, 0.6], serratus: [0.25, 0.4, 0.55], post_deltoid: [0.15, 0.25, 0.35], infraspinatus: [0.15, 0.25, 0.35], core: [0.3, 0.35, 0.4, 'hold'] }), liftPhase: 'press',
    guides: [{ id: 'barPath', kind: 'path', joint: 'wrist_r', from: 3.1, to: 4.3, label: 'Straight up the rails behind the head' }, { id: 'elbow', kind: 'jointAngle', joint: 'elbow_r', normBand: [80, 110], label: 'Elbows about 90 degrees at the bottom' }],
    checks: { stillJoints: [], plantedContacts: ['leg_r', 'leg_l'], measure: { name: 'trunkFlexion', min: 0, max: 180 }, floorTolerance: 0.5 },
    notes: { ant_deltoid: 'Presses the arms up from the bottom (clinical opinion).', lat_deltoid: 'Raises the arms out to the sides and overhead; the wide behind-neck position biases it (clinical opinion).', triceps: 'Straighten the elbows.', upper_traps: 'Rotate the shoulder blades upward overhead.', serratus: 'Rotates the shoulder blades upward with the traps.', post_deltoid: 'Holds the arms back in the behind-neck position.', infraspinatus: 'Holds the shoulders externally rotated under the bar.', core: 'Keeps the trunk tall on the bench.' },
  },
  {
    id: 'smith-seated-wrist-curl', name: 'Smith Seated Wrist Curl', url: GV(22812, 'smith-seated-wrist-curl'), base: 'dumbbell-wrist-curl',
    aliases: ['Smith machine seated wrist curl', 'Smith wrist curl'], equipment: [...SMITH, 'Flat bench'],
    cues: {
      c1: 'Sit on a bench in front of the Smith bar set at knee height; forearms along the thighs, palms up, wrists just past the knees. Grip the bar about shoulder width, turn it off the pegs and let it pull the hands down.',
      c2: 'Breathe out and curl the hands up toward you, bending only at the wrists; the bar rides up the rails.',
      c3: 'Squeeze at the top; the forearms stay on the thighs (they slide a little as the bar follows the rails).',
    },
    cautions: [...SMITH_CAUTIONS.slice(0, 2), 'Start light: the wrist flexors are small muscles.'],
    kin: { 'Bar path': { norm: RAILS, sources: [] } }, checks: { measure: { name: 'trunkFlexion', min: 3, max: 20 } },
    patch: (m) => { const e = m.exercise; e.prescription.load = 'Barbell load is user-chosen: pick a weight you can curl through the full wrist range with control.'; e.safety.progressions = (e.safety.progressions || []).filter((x) => !/dumbbell/i.test(x)); e.safety.regressions = (e.safety.regressions || []).filter((x) => !/dumbbell/i.test(x)); if (!e.safety.regressions.length) e.safety.regressions = ['Lighter load, smaller range.']; if (!e.safety.progressions.length) e.safety.progressions = ['Slower lowering (3 s).']; },
    warnWords: ['dumbbell'],
  },
  {
    id: 'smith-decline-bench-press', name: 'Smith Decline Bench Press', url: GV(939, 'smith-decline-bench-press'), base: 'barbell-bench-press',
    aliases: ['Smith machine decline bench press', 'Smith decline press'], equipment: [...SMITH, 'Decline bench'],
    cues: {
      c1: 'Lie on a decline bench under the Smith bar, head at the low end, knees bent over the top and feet hooked under the roller; shoulder blades back and down. Grip overhand about 1.5 times shoulder width, turn the bar off the pegs and hold it up with straight arms.',
      c2: 'Breathe in and lower the bar straight down the rails to the lower chest, elbows about 45-60 degrees from the body.',
      c4: 'Breathe out and press straight back up the rails to straight arms.',
      c5: 'Arms straight, re-brace and go again; after the last rep turn the bar back onto the pegs.',
    },
    cautions: [...SMITH_CAUTIONS, 'Hook the feet under the roller before lying back, and sit up only after the bar is back on the pegs.', 'The head-down position raises pressure in the head: keep sets short and sit up slowly.'],
    kinematics: [
      { measure: 'Bench angle', norm: 'Decline of about 15-30 degrees, head low; the lower (sternocostal) pectoralis is emphasised in decline pressing (common coaching)', sources: [] },
      { measure: 'Grip width', norm: 'About 1.5 times shoulder width is a common middle grip (Saeterbakken 2021)', sources: ['saeterbakken2021'] },
      { measure: 'Elbow flexion', norm: 'Arms straight but not locked at the top; deeply bent with the bar on the chest (clinical opinion)', sources: [] },
      { measure: 'Elbow flare (upper arm from the trunk)', norm: 'About 45-60 degrees from the body at the bottom (clinical opinion)', sources: [] },
      { measure: 'Bar path', norm: 'Fixed by the vertical rails: straight down to the lower chest and straight back up (common coaching)', sources: [] },
      { measure: 'Legs', norm: 'Knees bent over the end of the bench, feet hooked under the roller (machine design)', sources: [] },
      { measure: 'Tempo', norm: 'Controlled: about 2 s down and 1-2 s up (clinical opinion)', sources: [] },
    ],
    dropSources: ['solstad2020', 'rodriguez2020', 'martinezcava2019'],
    camera: CAM(-50, 14),
  },
  ...[
    { id: 'power-sled-push', name: 'Power Sled Push', n: 10409, slug: 'power-sled-push-male', aliases: ['Sled push', 'Prowler push', 'Weighted sled push'], style: 'push',
      cues: ['Hands on the sled poles at about chest height, arms long, body leaning well forward so the shoulders are ahead of the hips.', 'Drive the sled forward with short, powerful steps, pushing the floor back through the balls of the feet; keep the lean and a flat back.', 'Stop with the feet together and the body still leaning into the poles.'],
      mistakes: [{ id: 'm1', mistake: 'Standing up tall behind the sled', fix: 'Lean in so the push goes forward through the arms, not down into the sled.' }, { id: 'm2', mistake: 'Long, slow strides', fix: 'Short, quick steps keep the sled moving.' }, { id: 'm3', mistake: 'Rounding the back', fix: 'Brace and keep a long spine from head to hips.' }],
      kin: ['Body lean', 'Forward lean of about 30-50 degrees with the arms long (common coaching)'] },
    { id: 'power-sled-rear-drag', name: 'Power Sled Rear Drag', n: 11912, slug: 'power-sled-rear-drag-version-2', aliases: ['Backward sled drag', 'Reverse sled drag', 'Sled rear drag'], style: 'drag',
      cues: ['Face the sled holding the strap handles at about waist height, arms long, knees bent and hips sitting back so the straps are taut.', 'Walk backward with short steps, landing on the balls of the feet and pushing through the front of the foot; the knees stay bent and the arms stay long.', 'Stop with the feet together, straps still taut.'],
      mistakes: [{ id: 'm1', mistake: 'Pulling with the arms', fix: 'Keep the arms long; the legs move the sled.' }, { id: 'm2', mistake: 'Standing up straight', fix: 'Sit back with bent knees so the quads do the work.' }, { id: 'm3', mistake: 'Big backward steps', fix: 'Short, quick steps keep tension on the straps.' }],
      kin: ['Body lean', 'Hips back and knees bent, trunk upright to slightly back, arms long on the straps (common coaching)'] },
  ].map((v) => ({
    id: v.id, name: v.name, url: GV(v.n, v.slug), base: 'dumbbell-farmers-carry', aliases: v.aliases, equipment: ['Power sled (plate-loaded)', ...(v.style === 'drag' ? ['Drag straps with handles'] : [])],
    type: 'Strength', bodyPart: 'Thighs (quadriceps)', secondaryBodyParts: ['Hips (glutes)', 'Lower legs (calves)'], difficulty: 'Intermediate', mechanics: 'Compound (hip, knee and ankle)', plane: 'Sagittal', laterality: 'Bilateral', authoredSide: 'bilateral',
    muscles: v.style === 'push' ? { target: BI('quads', 'glute_max', 'calves'), synergist: BI('hamstrings', 'ant_deltoid', 'triceps', 'pec'), stabilizer: [...BI('core'), ...BI('obliques', 'spinal_extensors', 'serratus', 'forearm_flexors')] } : { target: BI('quads', 'calves'), synergist: BI('glute_max', 'hip_flexors'), stabilizer: [...BI('core'), ...BI('forearm_flexors', 'lats', 'rhomboids_midtrap', 'spinal_extensors')] },
    breathing: { pattern: 'Short, rhythmic breaths with the steps; keep the brace.', cadence: 'About 1.5-2 steps per second' },
    prescription: { sets: '4-8', reps: '10-20 m per set', tempo: 'Steady, quick steps', frequency: '1-2 times a week', load: 'Sled load is user-chosen: heavy enough that every step is a hard drive, light enough to keep moving without stalling.', rest: '1.5-3 minutes between sets', progression: 'Add load or distance when every set stays fast and smooth.' },
    cueList: v.cues.map((t, i) => ({ id: `c${i + 1}`, phase: ['setup', 'walk', 'finish'][i], text: t })),
    mistakes: v.mistakes,
    kinematics: [
      { measure: 'Step length', norm: 'Short steps under or just ahead of the hips (common coaching)', sources: [] },
      { measure: 'Cadence', norm: 'Quick, about 1.5-2 steps per second (common coaching)', sources: [] },
      { measure: v.kin[0], norm: v.kin[1], sources: [] },
      { measure: 'Sled', norm: v.style === 'push' ? 'The sled slides on its runners, moved by the hands on the poles (machine design)' : 'The sled slides on its runners, pulled through the straps (machine design)', sources: [] },
    ],
    dropSources: ['*'],
    cautions: ['Clear the path and use a surface the sled slides on evenly.', v.style === 'push' ? 'Keep the head in line with the back; do not look down between the arms.' : 'Look over a shoulder now and then to check the path behind you.', 'Start with a light sled to learn the steps.'],
    safety: { modify: ['Knee pain: lighter load and shorter steps.'], regressions: ['Lighter sled.', v.style === 'push' ? 'High-handle push (more upright).' : 'Forward sled drag.'], progressions: ['Heavier sled.', 'Longer distance.'] },
    camera: CAM(60, 14),
    timeline: { duration: 5, fps: 60, loop: true, interpolation: 'monotoneCubic', phases: [{ id: 'setup', label: v.style === 'push' ? 'Lean into the poles' : 'Sit back, straps taut', start: 0, end: 0.6, breath: 'inhale', cue: 'c1' }, { id: 'walk', label: v.style === 'push' ? 'Drive forward' : 'Walk backward', start: 0.6, end: 4.2, breath: 'natural', cue: 'c2' }, { id: 'finish', label: 'Feet together', start: 4.2, end: 5, breath: 'natural', cue: 'c3' }] },
    act: actOf(v.style === 'push' ? { quads: [0.4, 0.7, 0.85, 'hold'], glute_max: [0.35, 0.6, 0.75, 'hold'], calves: [0.4, 0.6, 0.75, 'hold'], hamstrings: [0.25, 0.4, 0.5, 'hold'], ant_deltoid: [0.3, 0.4, 0.5, 'hold'], triceps: [0.3, 0.4, 0.5, 'hold'], pec: [0.2, 0.3, 0.4, 'hold'], core: [0.5, 0.55, 0.6, 'hold'], obliques: [0.3, 0.35, 0.4, 'hold'], spinal_extensors: [0.4, 0.45, 0.5, 'hold'], serratus: [0.25, 0.3, 0.35, 'hold'], forearm_flexors: [0.3, 0.35, 0.4, 'hold'] } : { quads: [0.45, 0.75, 0.9, 'hold'], calves: [0.4, 0.6, 0.75, 'hold'], glute_max: [0.25, 0.35, 0.45, 'hold'], hip_flexors: [0.2, 0.3, 0.4, 'hold'], core: [0.4, 0.45, 0.5, 'hold'], forearm_flexors: [0.35, 0.4, 0.45, 'hold'], lats: [0.25, 0.3, 0.35, 'hold'], rhomboids_midtrap: [0.25, 0.3, 0.35, 'hold'], spinal_extensors: [0.3, 0.35, 0.4, 'hold'] }),
    guides: [{ id: 'hips', kind: 'path', joint: 'pelvis', from: 0.6, to: 4.2, label: v.style === 'push' ? 'Hips drive forward' : 'Hips travel backward' }],
    checks: { stillJoints: [], plantedContacts: ['leg_r', 'leg_l'], floorTolerance: 0.5, measure: { name: 'rootTravel', min: 80, max: 140 } },
    notes: { quads: 'Extend the knees through each step.', glute_max: 'Drives hip extension through each step.', calves: 'Push off the balls of the feet.', hamstrings: 'Assist hip extension.', ant_deltoid: 'Hold the arms forward against the poles.', triceps: 'Keep the elbows long.', pec: 'Press into the poles.', core: 'Braces the trunk so the leg drive reaches the sled.', obliques: 'Part of the brace.', spinal_extensors: 'Hold the back flat in the lean.', serratus: 'Keeps the shoulder blades on the ribs while pressing.', forearm_flexors: 'Grip the handles.', hip_flexors: 'Lift the legs back for each backward step.', lats: 'Keep the shoulders set against the straps.', rhomboids_midtrap: 'Hold the shoulder blades back against the pull.' },
  })),
];
module.exports.helpers = { src, TL5, CAM, BI, actOf, PRESC, STOP, SQUAT_NOTES, GV, SMITH, SMITH_CAUTIONS, RAILS, SCHWANBECK, SAETERBAKKEN };
