// Meta generator for the g3-benches group (phase 3: exercises on the gear-pack benches and stations). Builds a full
// build/meta/<id>.json from a compact spec so the repetitive parts (reference block, activation curves, camera, checks)
// come out the same way every time. Sources are copied by id from the meta files already in the repo, so every
// citation is one the library already uses.
const fs = require('fs');
const path = require('path');
const META = path.join(__dirname, '../meta');

// muscle shorthand: 'biceps*' -> biceps_r, biceps_l; anything else as written
const mus = (list = []) => list.flatMap((m) => (m.endsWith('*') ? [`${m.slice(0, -1)}_r`, `${m.slice(0, -1)}_l`] : [m]));

let LIB = null;
function source(id) {
  if (id === 'gymvisual') return null;
  if (!LIB) {
    LIB = {};
    for (const f of fs.readdirSync(META)) {
      try { const j = JSON.parse(fs.readFileSync(path.join(META, f), 'utf8')); for (const s of j.exercise.sources || []) if (!LIB[s.id]) LIB[s.id] = s; } catch (e) { /* skip */ }
    }
  }
  if (!LIB[id]) throw new Error(`g3-meta: unknown source ${id}`);
  return JSON.parse(JSON.stringify(LIB[id]));
}

const CAMERA = (def = 'side', over = {}) => ({
  default: def,
  presets: Object.assign({
    threeQuarter: { yaw: 42, pitch: 16, label: '3/4' }, side: { yaw: 0, pitch: 4, label: 'Side' }, front: { yaw: 90, pitch: 14, label: 'Front' },
    back: { yaw: -60, pitch: 30, label: 'Back' }, top: { yaw: 20, pitch: 72, label: 'Top' },
  }, over),
});

// Activation: phases carry an effort factor e (0..1); each muscle class has a peak level. Points at each phase start and
// end (the curve ramps across a phase from the previous level to e * peak), plus a small resting floor.
const PEAK = { target: 0.72, synergist: 0.42, stabilizer: 0.22 };
function activation(muscles, phases, level = {}) {
  const out = {}, seen = new Set();
  for (const cls of ['target', 'synergist', 'stabilizer']) {
    for (const m of muscles[cls] || []) {
      if (seen.has(m)) continue; seen.add(m);
      const pk = level[m.replace(/_[rl]$/, '')] ?? level[m] ?? PEAK[cls], rest = +(Math.min(0.12, pk * 0.15)).toFixed(2), pts = [];
      phases.forEach((p, i) => {
        const v = +(Math.max(rest, (p.e ?? 0) * pk)).toFixed(2);
        if (i === 0) pts.push([p.start, rest]);
        const mid = +(p.start + (p.end - p.start) * 0.6).toFixed(2);
        if (p.e != null && p.e > 0.05) pts.push([mid, v]);
        pts.push([p.end, p.endE != null ? +(Math.max(rest, p.endE * pk)).toFixed(2) : v]);
      });
      // keep strictly increasing times
      const clean = []; for (const q of pts) { if (clean.length && q[0] <= clean[clean.length - 1][0]) clean[clean.length - 1] = q; else clean.push(q); }
      clean[clean.length - 1][1] = rest;
      out[m] = clean;
    }
  }
  return out;
}

// spec: { id, name, aliases, ref: [productRef, url, title, readable?], bodyPart, secondary, equipment, difficulty,
//   mechanics, plane, laterality, side ('bilateral' | 'right'), muscles: {target, synergist, stabilizer, lengthened},
//   notes: {muscle: text}, breathing: [pattern, cadence], rx: [sets, reps, tempo, frequency, progression],
//   phases: [[id, label, start, end, breath, effort, cueText]], setup cue is the first phase's text,
//   mistakes: [[mistake, fix]], kin: [[measure, norm, [sources]]], sources: [ids], safety: {cautions, modify,
//   regressions, progressions}, camera: 'side' | ..., guides, planted: [], still: [], measure: name, level: {} }
function build(spec) {
  const [productRef, url, title, readable] = spec.ref;
  const muscles = { target: mus(spec.muscles.target), synergist: mus(spec.muscles.synergist), stabilizer: mus(spec.muscles.stabilizer) };
  if (spec.muscles.lengthened) muscles.lengthened = mus(spec.muscles.lengthened);
  const phases = spec.phases.map(([id, label, start, end, breath, e, cue, endE], i) => ({ id, label, start, end, breath, cue: `c${i + 1}`, e, endE, text: cue }));
  const notes = {};
  for (const [k, v] of Object.entries(spec.notes || {})) for (const m of mus([k])) notes[m] = v;
  const srcIds = ['gymvisual', ...(spec.sources || [])];
  const sources = [{ id: 'gymvisual', title: `GymVisual #${productRef}, ${title}, ${/animated-gifs/.test(url) ? 'animated GIF' : 'video'} (movement reference)`, url }]
    .concat(srcIds.slice(1).map(source));
  const meta = {
    exercise: {
      id: spec.id, name: spec.name, aliases: spec.aliases || [],
      reference: {
        source: 'GymVisual', productRef, title, url,
        listing: readable ? `${/animated-gifs/.test(url) ? 'Animated GIF' : 'Video'} (page read for the movement only)` : `${/animated-gifs/.test(url) ? 'Animated GIF' : 'Video'} (title and number from the catalog listing; the page could not be read from this environment, so the movement follows the exercise name and standard coaching)`,
        note: '',
      },
      type: spec.type || 'Strength', bodyPart: spec.bodyPart, secondaryBodyParts: spec.secondary || [], equipment: spec.equipment,
      difficulty: spec.difficulty || 'Intermediate', mechanics: spec.mechanics, plane: spec.plane || 'Sagittal', laterality: spec.laterality || 'Bilateral, symmetric',
      authoredSide: spec.side || 'bilateral', muscles,
      breathing: { pattern: spec.breathing[0], cadence: spec.breathing[1] },
      prescription: { sets: spec.rx[0], reps: spec.rx[1], tempo: spec.rx[2], frequency: spec.rx[3], progression: spec.rx[4] },
      cues: phases.map((p) => ({ id: p.cue, phase: p.id, text: p.text })),
      mistakes: spec.mistakes.map(([m, f], i) => ({ id: `m${i + 1}`, mistake: m, fix: f })),
      kinematics: spec.kin.map(([measure, norm, src = []]) => ({ measure, setup: '', peak: '', norm, sources: src })),
      sources,
      safety: Object.assign({ cautions: [], modify: [], regressions: [], progressions: [] }, spec.safety),
      muscleNotes: notes,
    },
    camera: CAMERA(spec.camera || 'side', spec.cameraOver || {}),
    props: [],
    timeline: {
      duration: phases[phases.length - 1].end, fps: 60, loop: true, interpolation: 'monotoneCubic',
      phases: phases.map(({ id, label, start, end, breath, cue }) => ({ id, label, start, end, breath, cue })),
    },
    activation: activation(muscles, phases, spec.level),
    guides: spec.guides || [],
    checks: { stillJoints: spec.still || [], plantedContacts: spec.planted || [], measure: { name: spec.measure || 'rootTravel', min: 0, max: 0 }, floorTolerance: spec.floorTol ?? 0.5 },
  };
  if (!meta.exercise.safety.cautions.some((c) => /EMG/.test(c))) meta.exercise.safety.cautions.push('Muscle glow colours and activation curves are illustrative, not measured EMG.');
  for (const k of meta.exercise.kinematics) for (const s of k.sources) if (!srcIds.includes(s)) throw new Error(`${spec.id}: kinematics source ${s} not in sources`);
  const txt = JSON.stringify(meta, null, 1);
  if (txt.includes(String.fromCharCode(0xa7))) throw new Error(`${spec.id}: section symbol`);
  return meta;
}
function write(spec) { const m = build(spec); fs.writeFileSync(path.join(META, `${spec.id}.json`), JSON.stringify(m, null, 1)); return m; }

module.exports = { build, write, mus, source, activation, CAMERA };
