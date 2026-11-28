// Cable Lying Single Arm Cross Lateral Raise (GymVisual 21722; movement reference only, page not readable): lying face up
// on a flat bench, head, upper back and hips on the pad, feet flat (planted leg contacts). A cable tower stands beyond the
// feet on the left; the right hand holds its D-handle, so the cable crosses over the legs (pulley about 1 m high, the
// cable passing above the knees) and pulls the hand toward the feet and the midline. The right arm sweeps out along the
// bench (the body's frontal plane, a little above shoulder level) from beside the hip to about shoulder level, elbow
// soft, palm facing the feet, then returns slowly; the left arm rests at the side. Authored right (the player mirrors
// the clip and the tower for the left arm). Built with build/families/b6-09.js lyingCrossRaise.
// Tempo: 1.8 s out, 0.4 s hold, 2 s back, 0.6 s pause.
const L = require('./lib');
const { V } = L;
const H = require('./families/hips');
const C = require('./families/eq-cable');
const B = require('./families/b5-cablepull');
const X = require('./families/b6-09');
const meta = require('./meta/cable-lying-single-arm-cross-lateral-raise.json');

const ID = 'cable-lying-single-arm-cross-lateral-raise';
const r = X.lyingCrossRaise({ meta, id: ID, two: false });
const { ex, poses, contacts } = r;
const Ws = L.fk(poses.start, contacts), We = L.fk(poses.end, contacts), set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Shoulder abduction', 'setup', `${d(B.armTrunk(Ws))} from the trunk line (hand beside the hip)`); set('Shoulder abduction', 'peak', `${d(B.armTrunk(We))} (arm out at shoulder level)`);
set('Elbow flexion', 'setup', d(C.elbowAng(Ws))); set('Elbow flexion', 'peak', d(C.elbowAng(We)));
set('Cable', 'setup', `Crossed: pulley ${r.AR[1]} cm high beyond the feet on the left, held in the right hand`); set('Cable', 'peak', `Cable clear of the body by at least ${r.rep.line.d} cm`);
set('Body on the bench', 'setup', 'Head, upper back and hips on the pad, feet flat'); set('Body on the bench', 'peak', `Unchanged; hands at least ${r.padHand.toFixed(1)} cm above the pad`);
set('Tempo', 'setup', 'Pause 0.6 s, hand beside the hip'); set('Tempo', 'peak', '1.8 s out, 0.4 s hold, 2 s back');
console.log(`Cable Lying Single Arm Cross Lateral Raise: wrote ${L.write(ex)}\n  keys ${JSON.stringify(r.err)}\n  ${JSON.stringify(r.rep)}\n  pad ${r.padHand.toFixed(2)}`);
