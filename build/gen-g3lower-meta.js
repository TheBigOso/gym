// g3-lower meta generator: writes build/meta/<id>.json for the g3-lower exercises from a base meta (an authored exercise
// close to the move) plus the per-exercise changes listed in build/g3lower-specs.js. Run: node build/gen-g3lower-meta.js
// [ids...]. The authors then fill the kinematics setup / peak fields and write src/exercises/<id>.json.
const fs = require('fs'), path = require('path');
const SPECS = require('./g3lower-specs');
const clone = (o) => JSON.parse(JSON.stringify(o));
const LISTING = 'Video (title from the listing URL; the page could not be fetched from this environment, so the movement follows the exercise name and standard coaching)';

// activation curve from a phase pattern: levels [rest, working, peak]; shape picks where the peak sits
//  'concentric': rises through the lowering phase, peaks early in the lifting phase; 'hold': flat at working level
function curve(phases, D, [rest, work, peak], shape = 'concentric', liftId = null, lowerId = null) {
  if (shape === 'hold') return [[0, work], [D, work]];
  const lift = phases.find((p) => p.id === liftId) || phases[3] || phases[phases.length - 2], lower = phases.find((p) => p.id === lowerId) || phases[1];
  const pts = [[0, rest], [phases[0].end, rest], [lower.end, +(work + (peak - work) * 0.5).toFixed(2)], [+(lift.start + (lift.end - lift.start) * 0.35).toFixed(2), peak], [lift.end, +((rest + work) / 2).toFixed(2)], [D, rest]];
  const out = []; for (const p of pts) if (!out.length || p[0] > out[out.length - 1][0] + 1e-6) out.push(p); return out;
}

function build(spec) {
  const baseMeta = require(`./meta/${spec.base}.json`);
  const m = clone(baseMeta), e = m.exercise;
  e.id = spec.id; e.name = spec.name; e.aliases = spec.aliases || [];
  const ref = spec.url.match(/videos\/(\d+)-/)[1];
  e.reference = { source: 'GymVisual', productRef: ref, title: spec.name, url: spec.url, listing: LISTING, note: '' };
  for (const k of ['type', 'bodyPart', 'secondaryBodyParts', 'equipment', 'difficulty', 'mechanics', 'plane', 'laterality', 'authoredSide', 'muscles', 'breathing', 'prescription', 'muscleNotes']) if (spec[k]) e[k] = clone(spec[k]);
  if (spec.cues) for (const [id, text] of Object.entries(spec.cues)) { const c = e.cues.find((x) => x.id === id); if (c) c.text = text; else e.cues.push({ id, phase: text.phase, text: text.text }); }
  if (spec.cueList) e.cues = clone(spec.cueList);
  if (spec.mistakes) e.mistakes = clone(spec.mistakes);
  if (spec.addMistakes) e.mistakes = e.mistakes.concat(spec.addMistakes);
  if (spec.safety) e.safety = Object.assign(e.safety, clone(spec.safety));
  if (spec.cautions) { const keep = e.safety.cautions.filter((c) => /^Stop if|^Muscle glow/.test(c)); e.safety.cautions = [...spec.cautions, ...keep]; }
  if (spec.kinematics) e.kinematics = clone(spec.kinematics);
  for (const k of e.kinematics) { k.setup = ''; k.peak = ''; }
  if (spec.kin) for (const [meas, norm] of Object.entries(spec.kin)) { if (norm == null) continue; const k = e.kinematics.find((x) => x.measure === meas); if (k) Object.assign(k, typeof norm === 'string' ? { norm } : norm); else e.kinematics.push(Object.assign({ measure: meas, setup: '', peak: '' }, typeof norm === 'string' ? { norm, sources: [] } : norm)); }
  // sources: the GymVisual reference first, then the base's literature (plus any extra)
  const lit = (spec.dropSources || []).includes('*') ? [] : e.sources.filter((s) => s.id !== 'gymvisual' && !(spec.dropSources || []).includes(s.id));
  e.sources = [{ id: 'gymvisual', title: `GymVisual, ${spec.name}, video (movement reference)`, url: spec.url }, ...lit, ...(spec.addSources || [])];
  const ids = new Set(e.sources.map((s) => s.id));
  for (const k of e.kinematics) k.sources = (k.sources || []).filter((s) => ids.has(s));
  if (spec.camera) m.camera = clone(spec.camera);
  if (spec.timeline) m.timeline = clone(spec.timeline);
  if (spec.guides) m.guides = clone(spec.guides);
  if (spec.checks) m.checks = Object.assign(m.checks || {}, clone(spec.checks));
  if (spec.act) { // activation from levels: { muscle: [rest, work, peak, shape?] }
    const ph = m.timeline.phases, D = m.timeline.duration; m.activation = {};
    for (const [mu, lv] of Object.entries(spec.act)) m.activation[mu] = curve(ph, D, lv, lv[3] || 'concentric', spec.liftPhase, spec.lowerPhase);
  }
  if (spec.patch) spec.patch(m);
  // muscle notes for every listed muscle
  const all = [...(e.muscles.target || []), ...(e.muscles.synergist || []), ...(e.muscles.stabilizer || [])];
  e.muscleNotes = Object.fromEntries(all.map((mu) => [mu, (e.muscleNotes || {})[mu] || (spec.notes && spec.notes[mu.replace(/_[rl]$/, '')]) || 'Works with the movement as shown (clinical opinion).']));
  for (const mu of Object.keys(m.activation)) if (!all.includes(mu)) delete m.activation[mu];
  for (const mu of all) if (!m.activation[mu]) m.activation[mu] = [[0, 0.2], [m.timeline.duration, 0.2]];
  const txt = JSON.stringify(e);
  if (/\u00a7/.test(txt)) throw new Error(`${spec.id}: section symbol`);
  for (const w of spec.warnWords || ['unrack', 'J-hook', 'stands', 'spotter', 'squat rack', 'barbell']) { const re = new RegExp(w, 'i'); for (const c of [...e.cues.map((x) => x.text), ...e.safety.cautions, ...e.mistakes.map((x) => x.mistake + ' ' + x.fix)]) if (re.test(c)) console.warn(`  ${spec.id}: check "${w}": ${c.slice(0, 120)}`); }
  return m;
}
const want = process.argv.slice(2);
for (const spec of SPECS) {
  if (want.length && !want.includes(spec.id)) continue;
  const m = build(spec);
  fs.writeFileSync(path.join(__dirname, 'meta', `${spec.id}.json`), JSON.stringify(m, null, 1) + '\n');
  console.log(`meta ${spec.id} (base ${spec.base})`);
}
module.exports = { build, curve };
