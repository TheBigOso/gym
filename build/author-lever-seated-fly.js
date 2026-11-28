// Lever Seated Fly (GymVisual; movement reference only, the page could not be read): seated fly machine with vertical
// handles (prop kind 'lever_machine', type pec_deck re-fitted with handles: two lever arms hanging from overhead axles),
// back on the pad, feet flat. Arms level with the shoulders, elbows softly bent (15 degrees), palms forward on the vertical
// handles; each axle is lined up over its shoulder joint, so the handles turn with the hands as the shoulders adduct
// horizontally. From the arms open the hands sweep together in front of the chest and open again under control.
// Bilateral. Family build/families/gear-g3m.js (fly).
const L = require('./lib');
const { r1 } = L;
const EQ = require('./families/equip');
const G3 = require('./families/gear-g3m');
const meta = require('./meta/lever-seated-fly.json');

const R = G3.fly(meta, { mode: 'handles', planeStart: -6, planeTurn: 99, elbow: 15 });
const { set, Wt, Wb, rep, M } = R, d = G3.deg;
const gap = (W) => r1(EQ.gripPoint(W, 'r').p[2] - EQ.gripPoint(W, 'l').p[2]);
set('Horizontal adduction', 'setup', `Shoulder plane ${d(R.poses.top.ch.shoulder_r.plane)}, hands ${gap(Wt)} cm apart`); set('Horizontal adduction', 'peak', `Shoulder plane ${d(R.poses.bottom.ch.shoulder_r.plane)}, hands ${gap(Wb)} cm apart`);
set('Elbow', 'setup', `${d(R.poses.top.ch.elbow_r.flex)} (soft bend)`); set('Elbow', 'peak', 'Unchanged');
set('Shoulder elevation', 'setup', `${d(R.poses.top.ch.shoulder_r.elev)}`); set('Shoulder elevation', 'peak', 'Unchanged');
set('Lever', 'setup', `Axles over the shoulders (${M.P.pivot[0]}, ±${M.P.pivot[2]} cm)`); set('Lever', 'peak', `Arms turn ${Math.abs(R.A1)}°; handles within ${G3.offArcOf(rep)} cm of the hands`);
set('Tempo', 'setup', 'Pause 0.5 s open'); set('Tempo', 'peak', '1.3 s in, 0.5 s squeeze, 2 s out');
G3.fillDash(R.ex);
console.log(G3.summary('Lever Seated Fly', R));
