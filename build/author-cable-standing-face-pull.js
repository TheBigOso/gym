// Cable Standing Face Pull (GymVisual 14055, Cable Standing Face Pull; movement reference only, page not readable):
// standing tall facing a cable pulley set at about eye level, feet hip width (planted leg contacts), knees soft. A rope
// (cable attachment 'rope', two hands, 44 cm between the grip points throughout) is pulled from the arms reaching toward
// the pulley to beside the face: the elbows travel out and back at about shoulder height, the shoulder blades draw
// together and the shoulders turn out (palms facing each other, thumbs back) at the finish. Slow return. Bilateral (right arm
// solved, left mirrored). Built with build/families/b6-09.js facePull (on b5-cablepull.js pullKeys).
// Tempo: 1.2 s pull, 0.5 s hold, 2 s back, 0.5 s pause.
const L = require('./lib');
const F = require('./families/b3-shoulders');
const X = require('./families/b6-09');
const meta = require('./meta/cable-standing-face-pull.json');

const ID = 'cable-standing-face-pull';
const st = F.standing({ stance: 12, knee: 6 });
const r = X.facePull({ base: st, meta, id: ID, anchorDX: 120 });
X.facePullKin(r.ex, r, st.contacts);
console.log(`Cable Standing Face Pull: wrote ${L.write(r.ex)}\n  keys ${JSON.stringify(r.err)}\n  anchor ${r.ANCHOR} G0 ${r.G0.map(L.r1)} G1 ${r.G1}\n  ${JSON.stringify(r.rep)}\n  rope ${JSON.stringify(r.ropeClr)} hands ${JSON.stringify(r.handClr)}`);
