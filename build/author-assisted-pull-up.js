// Assisted Pull-up (GymVisual; movement reference only, the page could not be read): kneeling on the counterweighted pad
// of an assisted pull-up machine (pull-up bar for the top handles, and a lever_machine arm carrying the knee pad from a
// pivot behind the athlete, with the counterweight stack), overhand grip a little wider than the shoulders. From a hang
// with the arms nearly straight the athlete sets the shoulder blades down and pulls until the chin clears the bar, then
// lowers under control; the knee pad rises and falls with the knees. Bilateral. The hands are planted on the bar with arm
// contacts (as author-pull-up.js); family build/families/gear-g3m.js (assisted).
const L = require('./lib');
const { V, r1 } = L;
const C = require('./families/eq-cable');
const G3 = require('./families/gear-g3m');
const meta = require('./meta/assisted-pull-up.json');

const R = G3.assisted(meta, { GZ: 26, TILT: 6 });
const { set, Wh, Wt, rep, M } = R, d = G3.deg;
set('Elbow flexion', 'setup', `${d(C.elbowAng(Wh))} in the hang`); set('Elbow flexion', 'peak', `${d(C.elbowAng(Wt))} at the top`);
set('Grip', 'setup', `Overhand, grip points ${2 * R.GZ} cm apart`); set('Grip', 'peak', 'Unchanged (hands planted on the bar)');
set('Body path', 'setup', `Kneeling on the pad, knees ${d(R.poses.hang.ch.knee_r.flex)}`); set('Body path', 'peak', `Body rises ${r1(R.travel)} cm; chin ${r1(R.chin)} cm above the bar`);
set('Assistance', 'setup', `Knee pad on a lever from a pivot ${r1(Wh.knee_r.p[0] - M.toWorld(M.P.pivot)[0])} cm behind the knees`); set('Assistance', 'peak', `Lever swings ${Math.abs(R.A1)}°; pad within ${G3.offArcOf(rep)} cm of the shins`);
set('Tempo', 'setup', 'Hang 0.5 s'); set('Tempo', 'peak', '1.3 s up, 0.4 s hold, 2 s down');
G3.fillDash(R.ex);
console.log(`Assisted Pull-up: wrote ${L.write(R.ex)}\n  pivot ${M.P.pivot} end ${M.P.end} A1 ${R.A1} chin ${r1(R.chin)} slide ${R.slide} bar ${r1(R.barMin)}\n  ${JSON.stringify({ floor: rep.floor, arms: rep.arms, clear: rep.clear })}`);
