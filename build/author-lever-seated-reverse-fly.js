// Lever Seated Reverse Fly (GymVisual; movement reference only, the page could not be read): seated facing a reverse-fly
// machine (prop kind 'lever_machine', type pec_deck re-fitted: chest pad in front, two lever arms with vertical handles
// hanging from overhead axles, frame in front), chest on the pad, feet flat. Arms level with the shoulders, elbows softly
// bent, palms facing each other on the handles in front; each axle is lined up over its shoulder joint. The arms sweep out
// and back until in line with the shoulders, the shoulder blades squeeze, and the handles return to the front under
// control. Bilateral. Family build/families/gear-g3m.js (fly, reverse).
const L = require('./lib');
const { r1 } = L;
const EQ = require('./families/equip');
const G3 = require('./families/gear-g3m');
const meta = require('./meta/lever-seated-reverse-fly.json');

const R = G3.fly(meta, { mode: 'handles', reverse: true, planeStart: 98, planeTurn: -8, elbow: 12 });
const { set, Wt, Wb, rep, M } = R, d = G3.deg;
const gap = (W) => r1(EQ.gripPoint(W, 'r').p[2] - EQ.gripPoint(W, 'l').p[2]);
set('Horizontal abduction', 'setup', `Shoulder plane ${d(R.poses.top.ch.shoulder_r.plane)}, hands ${gap(Wt)} cm apart in front`); set('Horizontal abduction', 'peak', `Shoulder plane ${d(R.poses.bottom.ch.shoulder_r.plane)}, arms in line with the shoulders`);
set('Elbow', 'setup', `${d(R.poses.top.ch.elbow_r.flex)} (soft bend)`); set('Elbow', 'peak', 'Unchanged');
set('Shoulder elevation', 'setup', `${d(R.poses.top.ch.shoulder_r.elev)}`); set('Shoulder elevation', 'peak', 'Unchanged');
set('Lever', 'setup', `Axles over the shoulders (${M.P.pivot[0]}, ±${M.P.pivot[2]} cm); chest pad in front`); set('Lever', 'peak', `Arms turn ${Math.abs(R.A1)}°; handles within ${G3.offArcOf(rep)} cm of the hands`);
set('Tempo', 'setup', 'Pause 0.5 s with the arms in front'); set('Tempo', 'peak', '1.3 s out, 0.5 s squeeze, 2 s back');
G3.fillDash(R.ex);
console.log(G3.summary('Lever Seated Reverse Fly', R));
