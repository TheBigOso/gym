// Inline engine, rig, exercise modules, schema and the 3D player into one player.html.
// Includes the Studio clay athlete (src/athlete.js + src/character/studio-clay.json).
// Three.js loads from jsDelivr (pinned 0.160.0) through an import map.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), r = (f) => fs.readFileSync(path.join(root, 'src', f), 'utf8');
const safe = (s) => s.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
const dir = path.join(root, 'src/exercises');
const order = ['kneeling-back-rotation-stretch.json', 'quadruped-thoracic-rotation.json'];
const files = order.concat(fs.readdirSync(dir).filter((f) => f.endsWith('.json') && !order.includes(f)));
const exercises = files.map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
const character = JSON.parse(r('character/studio-clay.json'));
const data = `const RR_DATA=${JSON.stringify({ rig: JSON.parse(r('rig.json')), exercises, schema: JSON.parse(r('schema.json')), character }).replace(/</g, '\\u003c')};`;
// The athlete module shares the player's module scope, so wrap it to keep its names private.
const athlete = r('athlete.js').replace(/^import .*$/m, '').replace(/^export /gm, '');
const app = `const RRAthlete = (() => {\n${athlete}\nreturn { loadCharacter, buildAthlete };\n})();\n` + r('player.js');
const html = r('template.html').replace('/*__ENGINE__*/', () => safe(r('engine.js'))).replace('/*__DATA__*/', () => data).replace('/*__APP__*/', () => safe(app));
fs.writeFileSync(path.join(root, 'player.html'), html);
console.log(`player.html ${html.length} bytes, ${exercises.length} exercises`);
