// Band Front Lateral Raise (GymVisual #9226, Band front lateral raise; movement reference only, the page could not be read
// here, so the movement follows the name): a raise on the diagonal between a front raise and a lateral raise. Standing
// tall on the middle of the band, feet about hip width (planted leg contacts), knees soft, one band end under the ball of
// each foot. Hands start in front of the thighs, thumbs forward; the straight arms (soft elbows) rise forward and out,
// about 55 degrees in front of the frontal plane (halfway between the front raise at 80-90 and the scapular-plane lateral
// raise at 30), thumbs up, to shoulder height; then lower slowly against the band. 1.8 s up, 0.4 s at the top, 2 s down.
// Bilateral. Built with the standing band raise builder in build/families/b6-11.js.
const L = require('./lib');
const { r1 } = L;
const H = require('./families/hips');
const F = require('./families/b6-11');
const meta = require('./meta/band-front-lateral-raise.json');

const ENV = (k, d) => +(process.env[k] ?? d);
const PLANE = ENV('PLANE', 55), E0 = ENV('E0', 16), E1 = ENV('E1', 88);
const R = F.standingRaise(meta, { plane: PLANE, e0: E0, e1: E1, palm: 'thumbUp', axial: 0, pron: 40, flex: [12, 12], sc: (f) => ({ protract: r1(2 + 4 * f), elevate: r1(5 * f * f) }) });
const { ex, rep, err, Wb, Wt } = R, set = H.setKin(ex);
set('Shoulder elevation', 'setup', `≈${Math.round(F.humElev(Wb))}° (hands in front of the thighs)`); set('Shoulder elevation', 'peak', `≈${Math.round(F.humElev(Wt))}° (hands at shoulder height)`);
set('Plane of elevation', 'setup', `≈${Math.round(F.planeDeg(Wb))}° in front of the frontal plane`); set('Plane of elevation', 'peak', `≈${Math.round(F.planeDeg(Wt))}°`);
set('Elbow flexion', 'setup', `≈${Math.round(F.elbowAng(Wb))}°`); set('Elbow flexion', 'peak', `≈${Math.round(F.elbowAng(Wt))}°`);
set('Tempo', 'setup', 'Pause 0.6 s at the thighs'); set('Tempo', 'peak', '1.8 s up, 0.4 s at the top, 2.0 s down');
console.log(`Band Front Lateral Raise: wrote ${L.write(ex)}\n  keys ${JSON.stringify(err)}\n  ${JSON.stringify(rep)}`);
