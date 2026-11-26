// Inline engine, rig, exercise modules, schema and the 3D player into one player.html.
// Three.js loads from jsDelivr (pinned 0.160.0) through an import map.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), r = (f) => fs.readFileSync(path.join(root, 'src', f), 'utf8');
const safe = (s) => s.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
const dir = path.join(root, 'src/exercises');
const order = ['kneeling-back-rotation-stretch.json', 'quadruped-thoracic-rotation.json'];
const files = order.concat(fs.readdirSync(dir).filter((f) => f.endsWith('.json') && !order.includes(f)));
const exercises = files.map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
const data = `const RR_DATA=${JSON.stringify({ rig: JSON.parse(r('rig.json')), exercises, schema: JSON.parse(r('schema.json')) }).replace(/</g, '\\u003c')};`;
const html = r('template.html').replace('/*__ENGINE__*/', () => safe(r('engine.js'))).replace('/*__DATA__*/', () => data).replace('/*__APP__*/', () => safe(r('player.js')));
fs.writeFileSync(path.join(root, 'player.html'), html);
console.log(`player.html ${html.length} bytes, ${exercises.length} exercises`);
