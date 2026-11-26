// Read each GLB back and report skin, joints, clips and frame counts.
import { NodeIO } from '@gltf-transform/core';
import fs from 'fs';
const io = new NodeIO();
for (const f of fs.readdirSync('exports').filter((x) => x.endsWith('.glb'))) {
  const doc = await io.read(`exports/${f}`), r = doc.getRoot();
  const skin = r.listSkins()[0], mesh = r.listMeshes()[0], prim = mesh.listPrimitives()[0];
  const anims = r.listAnimations().map((a) => `${a.getName()} (${a.listChannels().length} ch, ${a.listSamplers()[0].getInput().getCount()} keys)`);
  console.log(f, `| joints ${skin.listJoints().length} | verts ${prim.getAttribute('POSITION').getCount()} | attrs ${prim.listSemantics().join(',')} | clips ${anims.join('; ')}`);
}
