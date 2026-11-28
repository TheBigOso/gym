// Assisted Single Arm Pull-up (GymVisual; movement reference only, the page could not be read): kneeling on the
// counterweighted lever knee pad of an assisted pull-up machine, right hand overhand on the top bar, left hand resting on
// the left thigh. The body hangs under the working hand (pelvis shifted toward it, trunk side-bent a little); from a hang
// with the arm nearly straight the athlete pulls until the chin reaches the bar beside the hand and lowers under control.
// Authored on the right side (the player mirrors it). Hand planted with an arm contact; family gear-g3m.js (assisted).
const L = require('./lib');
const { r1 } = L;
const C = require('./families/eq-cable');
const G3 = require('./families/gear-g3m');
const meta = require('./meta/assisted-single-arm-pull-up.json');

const R = G3.assisted(meta, { oneArm: true, GZ: 14, TILT: 4, topFlex: 132 });
const { set, Wh, Wt, rep, M } = R, d = G3.deg;
set('Elbow flexion', 'setup', `${d(C.elbowAng(Wh))} in the hang`); set('Elbow flexion', 'peak', `${d(C.elbowAng(Wt))} at the top`);
set('Grip', 'setup', `Right hand overhand, ${R.GZ} cm right of centre; left hand on the left thigh`); set('Grip', 'peak', 'Unchanged (hand planted on the bar)');
set('Body path', 'setup', 'Kneeling on the pad, pelvis under the working hand', ); set('Body path', 'peak', `Body rises ${r1(R.travel)} cm; chin ${r1(R.chin)} cm from the bar`);
set('Assistance', 'setup', 'Counterweighted knee pad (one arm needs much more help)'); set('Assistance', 'peak', `Lever swings ${Math.abs(R.A1)}°; pad within ${G3.offArcOf(rep)} cm of the shins`);
set('Tempo', 'setup', 'Hang 0.5 s'); set('Tempo', 'peak', '1.3 s up, 0.4 s hold, 2 s down');
G3.fillDash(R.ex);
console.log(`Assisted Single Arm Pull-up: wrote ${L.write(R.ex)}\n  pivot ${M.P.pivot} A1 ${R.A1} chin ${r1(R.chin)} slide ${R.slide} bar ${r1(R.barMin)}\n  ${JSON.stringify({ floor: rep.floor, arms: rep.arms, clear: rep.clear })}`);
