// Hanging Knee Raise (GymVisual 21522, movement reference only; the page could not be read at authoring time). Dead hang
// from a free-standing pull-up bar, overhand grip a little wider than the shoulders, shoulder blades set down. Bend the
// knees and draw them up past the hips (hips about 110 degrees, knees about 100), finishing with a small pelvic curl;
// short hold, lower slowly without swinging. Bilateral. Hands planted on the bar (author-pull-up.js grip); each key
// solves the root so the arms keep their length and the centre of mass stays under the hands (F.hanging).
const L = require('./lib');
const F = require('./families/b6-16');
const H = require('./families/hips');
const meta = require('./meta/hanging-knee-raise.json');

const KEYS = {
  hang: { hip: 3, knee: 8, ankle: -12, spine: [0, 0, 0], neck: [0, 0], sc: { protract: 4, elevate: 22 }, shX: null, flex: 6 },
  set: { hip: 5, knee: 10, ankle: -12, spine: [0, 0, 0], neck: [0, 0], sc: { protract: 0, elevate: 8 }, shX: null, flex: 6 },
  r1: { hip: 40, knee: 45, ankle: -16, spine: [2, 1, 0], neck: [2, 2], sc: { protract: 0, elevate: 6 }, shX: -2, flex: 7 },
  r2: { hip: 78, knee: 85, ankle: -20, spine: [6, 3, 1], neck: [4, 3], sc: { protract: 0, elevate: 4 }, shX: -4, flex: 8 },
  top: { hip: 110, knee: 102, ankle: -22, spine: [14, 8, 3], neck: [6, 5], sc: { protract: 2, elevate: 3 }, shX: -5, flex: 9 },
  hold: { hip: 112, knee: 104, ankle: -22, spine: [15, 9, 3], neck: [6, 5], sc: { protract: 2, elevate: 3 }, shX: -5, flex: 9 },
};
const SEQ = [['hang', 0], ['hang', 0.5], ['set', 0.8], ['r1', 1.15], ['r2', 1.5], ['top', 1.9], ['hold', 2.3], ['r2', 3.0], ['r1', 3.7], ['set', 4.3], ['hang', 4.7], ['hang', 5.0]];
const { ex, poses, place, rep, fail } = F.hanging({ keys: KEYS, seq: SEQ, meta });
const Wh = L.fk(poses.hang, ex.contacts), Wt = L.fk(poses.hold, ex.contacts);
const kneeAboveHip = (W) => W.knee_r.p[1] - W.hip_r.p[1];
const set = H.setKin(ex);
set('Hip flexion', 'setup', `≈${KEYS.hang.hip}° in the dead hang`); set('Hip flexion', 'peak', `≈${KEYS.hold.hip}° (knees ${kneeAboveHip(Wt).toFixed(0)} cm above the hip joints)`);
set('Knees', 'setup', `≈${KEYS.hang.knee}°`); set('Knees', 'peak', `≈${KEYS.hold.knee}°`);
set('Pelvis and low back', 'setup', 'Neutral in the hang'); set('Pelvis and low back', 'peak', `Small curl: about ${KEYS.hold.spine.reduce((a, b) => a + b, 0)}° of spinal flexion (low back ${KEYS.hold.spine[0]}°)`);
set('Body swing', 'setup', 'Body hangs under the hands'); set('Body swing', 'peak', `Centre of mass within ${rep.comX.toFixed(1)} cm of the hands`);
set('Tempo', 'setup', 'Hang 0.5 s, set 0.3 s'); set('Tempo', 'peak', '1.1 s up, 0.4 s hold, 2.4 s down');
ex.checks.measure = { name: 'hipFlexion', min: KEYS.hold.hip - 8, max: KEYS.hold.hip + 4 };
console.log(`Hanging Knee Raise: wrote ${L.write(ex)}\n  place ${JSON.stringify(place)}\n  ${JSON.stringify(rep)}\n  feet ${L.shapeMinY(Wh).y.toFixed(1)} cm off the floor in the hang`);
if (fail.length) { console.error('FAIL hanging-knee-raise: ' + fail.join('; ')); process.exitCode = 1; }
