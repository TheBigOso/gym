// Resistance Band Standing Y-Raise (GymVisual #24717, Resistance Band Standing Y-Raise; movement reference only, the page
// could not be read here, so the movement follows the name): standing tall on the middle of the band, feet about hip width
// (planted leg contacts), knees soft, one band end under the ball of each foot. Hands start just in front of and outside
// the thighs, thumbs up; straight arms (soft elbows) rise in a Y, about 30 degrees in front of the frontal plane, to
// about 135-140 degrees overhead (arms about 45 degrees out from vertical) with the thumbs pointing up and back and the
// shoulder blades turning up, then lower slowly against the band. 2 s up, 0.4 s at the top, 2.2 s down. Bilateral.
// Built with the standing band raise builder in build/families/b6-11.js.
const L = require('./lib');
const { r1 } = L;
const H = require('./families/hips');
const F = require('./families/b6-11');
const meta = require('./meta/resistance-band-standing-y-raise.json');

const ENV = (k, d) => +(process.env[k] ?? d);
const PLANE = ENV('PLANE', 30), E0 = ENV('E0', 20), E1 = ENV('E1', 138);
const R = F.standingRaise(meta, { plane: PLANE, e0: E0, e1: E1, palm: 'thumbUp', axial: 10, pron: 30, flex: [12, 10], sc: (f) => ({ protract: r1(2 + 6 * f), elevate: r1(14 * f * f) }) });
const { ex, rep, err, Wb, Wt } = R, set = H.setKin(ex);
set('Shoulder elevation', 'setup', `≈${Math.round(F.humElev(Wb))}° (hands by the thighs)`); set('Shoulder elevation', 'peak', `≈${Math.round(F.humElev(Wt))}° (arms in a Y overhead)`);
set('Plane of elevation', 'setup', `≈${Math.round(F.planeDeg(Wb))}° in front of the frontal plane`); set('Plane of elevation', 'peak', `≈${Math.round(F.planeDeg(Wt))}°`);
set('Elbow flexion', 'setup', `≈${Math.round(F.elbowAng(Wb))}°`); set('Elbow flexion', 'peak', `≈${Math.round(F.elbowAng(Wt))}°`);
set('Tempo', 'setup', 'Pause 0.6 s at the thighs'); set('Tempo', 'peak', '2.0 s up, 0.4 s at the top, 2.2 s down');
console.log(`Resistance Band Standing Y-Raise: wrote ${L.write(ex)}\n  keys ${JSON.stringify(err)}\n  ${JSON.stringify(rep)}`);
