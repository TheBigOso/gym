// Build the exercise library app into app/dist/.
// The app reuses the 3D player (src/template.html, src/player.js, src/athlete.js, src/gear/*.js) and adds a library
// panel and a test mode (app/library.css, app/library.html, app/library.js).
// Exercise modules are written one file per exercise to app/dist/ex/<id>.json and fetched on demand, so the first load
// carries only the engine, the rig, the Studio clay athlete and a small catalog.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), src = (f) => fs.readFileSync(path.join(root, 'src', f), 'utf8'), app = (f) => fs.readFileSync(path.join(root, 'app', f), 'utf8');
const safe = (s) => s.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
// Options: --out <dir> (default app/dist) and --pack <n> (n exercises per data file; default 1, one file per exercise).
const argv = process.argv.slice(2), opt = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const out = path.resolve(root, opt('--out', 'app/dist')), exOut = path.join(out, 'ex'), PACK = Math.max(1, Number(opt('--pack', 1)) || 1);
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(exOut, { recursive: true });

// ---- exercises and the catalog ----
const dir = path.join(root, 'src/exercises');
const first = ['kneeling-back-rotation-stretch.json', 'quadruped-thoracic-rotation.json'];
const files = first.concat(fs.readdirSync(dir).filter((f) => f.endsWith('.json') && !first.includes(f)).sort());
const rig = JSON.parse(src('rig.json'));
const muscleName = Object.fromEntries(rig.muscles.map((m) => [m.id, m.name.split(' (')[0]]));
const base = (m) => (/_[rl]$/.test(m) ? m.slice(0, -2) : m);
const uniq = (a) => [...new Set(a)];

function bodyGroup(bp) {
  const s = String(bp || '').toLowerCase(), head = s.split('(')[0];
  const rules = [[/chest|pec/, 'Chest'], [/forearm|grip|wrist/, 'Forearms'], [/upper arm|biceps|triceps|arms/, 'Upper arms'], [/shoulder|delt|rotator/, 'Shoulders'], [/back|lat|trap|spine|erector/, 'Back'],
    [/waist|abdom|core|oblique|trunk/, 'Core'], [/hip|glute/, 'Hips and glutes'], [/thigh|quad|hamstring|adductor|leg/, 'Thighs'], [/calf|calves|ankle|shin/, 'Calves'], [/neck/, 'Neck'], [/full|total|whole/, 'Full body']];
  for (const [re, g] of rules) if (re.test(head)) return g;
  for (const [re, g] of rules) if (re.test(s)) return g;
  return 'Other';
}
function equipTags(list) {
  const rules = [[/ez[- ]?(curl )?bar|ez barbell/, 'EZ bar'], [/trap bar|hex bar/, 'Trap bar'], [/smith/, 'Smith machine'], [/landmine/, 'Landmine'], [/barbell|olympic bar|cambered/, 'Barbell'], [/dumbbell/, 'Dumbbell'], [/kettlebell/, 'Kettlebell'],
    [/cable|pulley|d-handle|v-handle|rope attachment|lat bar|straight bar attachment|ankle strap/, 'Cable'], [/band/, 'Resistance band'], [/power sled|drag strap/, 'Sled'], [/lever|machine|leg press|hack squat|sled \(|pec deck|plate-loaded/, 'Machine'],
    [/pull-up bar|chin-up bar|captain|dip cage/, 'Pull-up bar'], [/dip station|parallel bars|dip bars/, 'Dip station'], [/ring|suspension|trx/, 'Rings or straps'], [/preacher/, 'Preacher bench'],
    [/bench|box|step|chair/, 'Bench or box'], [/rack|stands/, 'Rack'], [/stability ball|exercise ball|swiss ball|bosu/, 'Stability ball'], [/medicine ball|slam ball/, 'Medicine ball'], [/plate/, 'Weight plate'], [/ab wheel/, 'Ab wheel'],
    [/wall/, 'Wall'], [/mat/, 'Mat'], [/body ?weight|none/, 'Body weight']];
  const tags = [];
  for (const e of list || []) { const s = e.toLowerCase(); for (const [re, t] of rules) if (re.test(s)) { tags.push(t); break; } }
  const t = uniq(tags);
  return t.filter((x) => x !== 'Mat' && x !== 'Wall').length ? t : uniq(['Body weight', ...t]);
}
function lateral(l) { const s = String(l || '').toLowerCase(); return /alternat/.test(s) ? 'Alternating' : /^unilateral|one side|single/.test(s) ? 'Unilateral' : 'Bilateral'; }

const catalog = [], packs = [];
for (const f of files) {
  const raw = fs.readFileSync(path.join(dir, f), 'utf8'), ex = JSON.parse(raw), e = ex.exercise;
  if (PACK === 1) fs.writeFileSync(path.join(exOut, `${e.id}.json`), JSON.stringify(ex)); else packs.push(ex);
  catalog.push({
    id: e.id, name: e.name, aliases: e.aliases || [], body: bodyGroup(e.bodyPart), bodyPart: e.bodyPart,
    targets: uniq((e.muscles.target || []).map(base)).map((m) => muscleName[m] || m), equip: equipTags(e.equipment), equipment: e.equipment,
    difficulty: e.difficulty, lat: lateral(e.laterality), ref: e.reference && e.reference.url ? e.reference.url : '', kb: Math.round(raw.length / 1024),
  });
}

// packed data files (used for hosts that limit the number of files): ex/p<k>.json holds PACK modules keyed by id
if (PACK > 1) for (let k = 0; k * PACK < packs.length; k++) fs.writeFileSync(path.join(exOut, `p${k}.json`), JSON.stringify(Object.fromEntries(packs.slice(k * PACK, (k + 1) * PACK).map((x) => [x.exercise.id, x]))));

// ---- player source, adapted for on-demand exercises ----
const patch = (s, from, to, what) => { if (!s.includes(from)) throw new Error(`build-app: could not patch ${what}; src/player.js changed`); return s.replace(from, to); };
let player = src('player.js');
// start on the exercise the boot script fetched, and leave exercise memory to the library
player = patch(player, 'const S = { ex: 0,', 'const S = { ex: RR_START,', 'start exercise');
player = patch(player, 'if (Number.isInteger(v.ex) && EXS[v.ex]) S.ex = v.ex; ', '', 'remembered exercise');
// outside the Claude artifact runtime, downloads (GLB, PNG, JSON, test results) fall back to a normal browser download
player = patch(player, 'async function save(name, data) { if (!dl) return false;', "async function save(name, data) { if (!dl) { const a = document.createElement('a'); a.href = URL.createObjectURL(data instanceof Blob ? data : new Blob([data])); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast(`Saved ${name}`); return true; }", 'downloads');
// the library replaces the A/B exercise buttons
player = player.replace(/\n\s*seg\(\$\('exSeg'\),[^\n]*\n/, () => '\n');
if (player.includes("$('exSeg')")) throw new Error('build-app: could not remove the exercise buttons; src/player.js changed');
const athlete = src('athlete.js').replace(/^import .*$/m, '').replace(/^export /gm, '');
const gearDir = path.join(root, 'src/gear'), gearFiles = fs.existsSync(gearDir) ? fs.readdirSync(gearDir).filter((f) => f.endsWith('.js')).sort() : [];
const gear = 'const GEAR = { props: {}, held: {}, prop(kind, def) { this.props[kind] = def; }, heldItem(kind, def) { this.held[kind] = def; } };\n' +
  gearFiles.map((f) => `// ---- gear: ${f} ----\n{\n` + fs.readFileSync(path.join(gearDir, f), 'utf8').replace(/^import .*$/gm, '').replace(/^export /gm, '') + '\n}').join('\n');
const appModule = 'await RR_BOOT;\n' + `const RRAthlete = (() => {\n${athlete}\nreturn { loadCharacter, buildAthlete };\n})();\n` + gear + '\n' + player + '\n// ---- library and test mode ----\n' + app('library.js');

// ---- data and boot: the catalog is inline, each exercise is fetched when opened ----
const character = JSON.parse(src('character/studio-clay.json'));
const data = `const RR_CATALOG=${JSON.stringify(catalog)};\nconst RR_DATA=${JSON.stringify({ rig, exercises: new Array(catalog.length).fill(null), schema: JSON.parse(src('schema.json')), character })};`.replace(/</g, '\\u003c');
const boot = `const RR_PACK=${PACK};const RR_FETCH=(i)=>RR_DATA.exercises[i]?Promise.resolve(RR_DATA.exercises[i]):fetch(RR_PACK>1?'ex/p'+Math.floor(i/RR_PACK)+'.json':'ex/'+RR_CATALOG[i].id+'.json').then((r)=>{if(!r.ok)throw new Error('HTTP '+r.status+' for '+RR_CATALOG[i].id);return r.json();}).then((j)=>{if(RR_PACK>1){const b=Math.floor(i/RR_PACK)*RR_PACK;for(let k=b;k<Math.min(b+RR_PACK,RR_CATALOG.length);k++)if(j[RR_CATALOG[k].id])RR_DATA.exercises[k]=j[RR_CATALOG[k].id];return RR_DATA.exercises[i];}return (RR_DATA.exercises[i]=j);});
let RR_START=0;try{const id=(location.hash.match(/^#(?:ex=)?([\\w-]+)$/)||[])[1]||JSON.parse(localStorage.getItem('reprig-app')||'{}').ex;const k=RR_CATALOG.findIndex((c)=>c.id===id);if(k>=0)RR_START=k;}catch(e){}
const RR_BOOT=RR_FETCH(RR_START).catch((e)=>{document.getElementById('loading').textContent='Could not load exercise data. Open the app through npm run app (a local server), not as a file.';throw e;});`;

// ---- page: the player layout with the library column and the test card ----
let html = src('template.html');
html = patch(html, '<title>RepRig Exercise Player</title>', '<title>RepRig Exercise Library</title>', 'title');
html = patch(html, '</style>', app('library.css') + '\n</style>', 'styles');
html = patch(html, '<header class="top">', app('library.html').split('<!--MAIN-->')[0] + '<header class="top">', 'library column');
html = patch(html, '    <div class="seg exsel" id="exSeg" role="group" aria-label="Exercise"></div>\n', '', 'exercise buttons');
html = patch(html, '</main>', '</main>' + app('library.html').split('<!--MAIN-->')[1], 'library close');
html = patch(html, '<aside class="panel" aria-label="Exercise card">', '<aside class="panel" aria-label="Exercise card">\n' + app('testcard.html'), 'test card');
html = patch(html, '<script>/*__DATA__*/</script>', '<script>/*__DATA__*/\n/*__BOOT__*/</script>', 'boot');
html = html.replace('/*__ENGINE__*/', () => safe(src('engine.js'))).replace('/*__DATA__*/', () => data).replace('/*__BOOT__*/', () => safe(boot)).replace('/*__APP__*/', () => safe(appModule));
fs.writeFileSync(path.join(out, 'index.html'), html);
const exBytes = fs.readdirSync(exOut).reduce((n, f) => n + fs.statSync(path.join(exOut, f)).size, 0);
console.log(`${path.relative(root, out)}/index.html ${(html.length / 1048576).toFixed(2)} MB first load, ${catalog.length} exercises in ${path.relative(root, exOut)} (${fs.readdirSync(exOut).length} files, ${(exBytes / 1048576).toFixed(1)} MB, average ${Math.round(exBytes / catalog.length / 1024)} KB each)`);
