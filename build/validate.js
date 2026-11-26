// Validate every exercise module against src/schema.json and check its rig ref.
const fs = require('fs'), path = require('path');
const Ajv = require('ajv/dist/2020');
const schema = require('../src/schema.json'), rig = require('../src/rig.json');
const v = new Ajv({ strict: false, allErrors: true }).compile(schema);
const dir = path.join(__dirname, '../src/exercises');
let bad = 0;
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
  const ex = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const ok = v(ex) && ex.rig.ref === rig.rigId;
  console.log(`${ok ? 'valid  ' : 'INVALID'} ${f}`);
  if (!ok) { bad++; console.log(JSON.stringify(v.errors || `rig ref ${ex.rig.ref} != ${rig.rigId}`, null, 1)); }
}
process.exit(bad ? 1 : 0);
