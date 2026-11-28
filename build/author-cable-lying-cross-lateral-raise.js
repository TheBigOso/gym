// Cable Lying Cross Lateral Raise (GymVisual 21699; movement reference only, page not readable): lying face up on a flat
// bench, head, upper back and hips on the pad, feet flat (planted leg contacts). Two cable towers stand beyond the feet;
// the cables cross: the right hand holds a D-handle from the left tower and the left hand one from the right tower, the
// pulleys about 1 m high so the crossed cables pass above the knees and pull the hands toward the feet and the midline.
// Both arms sweep out along the bench (the body's frontal plane, a little above shoulder level) from beside the hips to
// about shoulder level, elbows soft, palms facing the feet, then return slowly. Bilateral (right arm solved, left
// mirrored). Built with build/families/b6-09.js lyingCrossRaise. Tempo: 1.8 s out, 0.4 s hold, 2 s back, 0.6 s pause.
const L = require('./lib');
const { V } = L;
const H = require('./families/hips');
const C = require('./families/eq-cable');
const B = require('./families/b5-cablepull');
const X = require('./families/b6-09');
const meta = require('./meta/cable-lying-cross-lateral-raise.json');

const ID = 'cable-lying-cross-lateral-raise';
const r = X.lyingCrossRaise({ meta, id: ID, two: true });
const { ex, poses, contacts } = r;
const Ws = L.fk(poses.start, contacts), We = L.fk(poses.end, contacts), set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Shoulder abduction', 'setup', `${d(B.armTrunk(Ws))} from the trunk line (hands beside the hips)`); set('Shoulder abduction', 'peak', `${d(B.armTrunk(We))} (arms out at shoulder level)`);
set('Elbow flexion', 'setup', d(C.elbowAng(Ws))); set('Elbow flexion', 'peak', d(C.elbowAng(We)));
set('Cable', 'setup', `Crossed: pulleys ${r.AR[1]} and ${r.AL[1]} cm high beyond the feet, right hand to the left tower`); set('Cable', 'peak', `Cables clear of the body by at least ${Math.min(r.rep.line.d, r.lineL.d)} cm and of each other by ${r.lineCross.toFixed(1)} cm`);
set('Body on the bench', 'setup', 'Head, upper back and hips on the pad, feet flat'); set('Body on the bench', 'peak', `Unchanged; hands at least ${r.padHand.toFixed(1)} cm above the pad`);
set('Tempo', 'setup', 'Pause 0.6 s, hands beside the hips'); set('Tempo', 'peak', '1.8 s out, 0.4 s hold, 2 s back');
console.log(`Cable Lying Cross Lateral Raise: wrote ${L.write(ex)}\n  keys ${JSON.stringify(r.err)}\n  ${JSON.stringify(r.rep)}\n  lineL ${JSON.stringify(r.lineL)} pad ${r.padHand.toFixed(2)} cross ${r.lineCross.toFixed(2)}`);
