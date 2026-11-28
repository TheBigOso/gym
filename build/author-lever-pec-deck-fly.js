// Lever Pec Deck Fly (GymVisual; movement reference only, the page could not be read): seated on a pec deck (prop kind
// 'lever_machine', type pec_deck: two lever arms hanging from overhead axles, a forearm pad on each), back on the pad,
// feet flat. Upper arms level with the shoulders, elbows bent 90 degrees, forearms upright against the pads; each axle is
// lined up over its shoulder joint, so the pads turn with the forearms as the shoulders adduct horizontally. From the arms
// open (elbows just behind the trunk line) the pads close in front of the chest and open again under control. Bilateral.
// Family build/families/gear-g3m.js (fly).
const L = require('./lib');
const { V, r1 } = L;
const G3 = require('./families/gear-g3m');
const meta = require('./meta/lever-pec-deck-fly.json');

const R = G3.fly(meta, { mode: 'pad', planeStart: -6, planeTurn: 104, elbow: 90 });
const { set, Wt, Wb, rep, M } = R, d = G3.deg;
const gap = (W) => r1(W.elbow_r.p[2] - W.elbow_l.p[2]);
set('Horizontal adduction', 'setup', `Shoulder plane ${d(R.poses.top.ch.shoulder_r.plane)}, elbows ${gap(Wt)} cm apart`); set('Horizontal adduction', 'peak', `Shoulder plane ${d(R.poses.bottom.ch.shoulder_r.plane)}, elbows ${gap(Wb)} cm apart`);
set('Elbow', 'setup', `${d(R.poses.top.ch.elbow_r.flex)}, forearms upright on the pads`); set('Elbow', 'peak', 'Unchanged');
set('Shoulder elevation', 'setup', `${d(R.poses.top.ch.shoulder_r.elev)}`); set('Shoulder elevation', 'peak', 'Unchanged');
set('Lever', 'setup', `Axles over the shoulders (${M.P.pivot[0]}, ±${M.P.pivot[2]} cm)`); set('Lever', 'peak', `Arms turn ${Math.abs(R.A1)}°; pads within ${G3.offArcOf(rep)} cm of the forearms`);
set('Tempo', 'setup', 'Pause 0.5 s open'); set('Tempo', 'peak', '1.3 s in, 0.5 s squeeze, 2 s out');
G3.fillDash(R.ex);
console.log(G3.summary('Lever Pec Deck Fly', R));
