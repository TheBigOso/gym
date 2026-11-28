// Hanging Straight Leg Raise (GymVisual 2948, movement reference only; the page could not be read at authoring time).
// Dead hang from a free-standing pull-up bar, overhand grip a little wider than the shoulders, shoulder blades set down.
// The straight legs rise together in front until they are level with the hips (an L), with the pelvis braced rather
// than curled (curling past level is the hanging leg hip raise); short hold, slow lowering without swinging. Bilateral.
// Hands planted on the bar (author-pull-up.js grip); root solved per key for arm length and balance (F.hanging).
const L = require('./lib');
const F = require('./families/b6-16');
const H = require('./families/hips');
const meta = require('./meta/hanging-straight-leg-raise.json');

const KEYS = {
  hang: { hip: 3, knee: 6, ankle: -14, spine: [0, 0, 0], neck: [0, 0], sc: { protract: 4, elevate: 22 }, shX: null, flex: 6 },
  set: { hip: 5, knee: 5, ankle: -16, spine: [0, 0, 0], neck: [0, 0], sc: { protract: 0, elevate: 8 }, shX: null, flex: 6 },
  r1: { hip: 32, knee: 4, ankle: -20, spine: [1, 1, 0], neck: [2, 2], sc: { protract: 0, elevate: 6 }, shX: -3, flex: 7 },
  r2: { hip: 62, knee: 4, ankle: -24, spine: [3, 2, 1], neck: [3, 3], sc: { protract: 0, elevate: 5 }, shX: -5, flex: 8 },
  top: { hip: 88, knee: 4, ankle: -26, spine: [6, 3, 1], neck: [5, 4], sc: { protract: 1, elevate: 4 }, shX: -7, flex: 9 },
  hold: { hip: 90, knee: 4, ankle: -26, spine: [6, 3, 1], neck: [5, 4], sc: { protract: 1, elevate: 4 }, shX: -7, flex: 9 },
};
const SEQ = [['hang', 0], ['hang', 0.5], ['set', 0.8], ['r1', 1.2], ['r2', 1.6], ['top', 2.0], ['hold', 2.4], ['r2', 3.3], ['r1', 4.0], ['set', 4.6], ['hang', 4.9], ['hang', 5.2]];
const { ex, poses, place, rep, fail } = F.hanging({ keys: KEYS, seq: SEQ, meta });
const Wh = L.fk(poses.hang, ex.contacts), Wt = L.fk(poses.hold, ex.contacts);
const set = H.setKin(ex);
const legAng = (W) => Math.round(F.legFromHorizontal(W));
set('Hip flexion', 'setup', `≈${KEYS.hang.hip}° in the dead hang`); set('Hip flexion', 'peak', `≈${KEYS.hold.hip}° at the top`);
set('Legs from horizontal', 'setup', `${legAng(Wh)}° (hanging)`); set('Legs from horizontal', 'peak', `${legAng(Wt)}° (hip-to-ankle line; 0 = level)`);
set('Knees', 'setup', `Straight (≈${KEYS.hang.knee}°)`); set('Knees', 'peak', `Straight (≈${KEYS.hold.knee}°)`);
set('Pelvis and low back', 'setup', 'Neutral'); set('Pelvis and low back', 'peak', `Braced, little curl (${KEYS.hold.spine.reduce((a, b) => a + b, 0)}° of spinal flexion); centre of mass within ${rep.comX.toFixed(1)} cm of the hands`);
set('Tempo', 'setup', 'Hang 0.5 s, set 0.3 s'); set('Tempo', 'peak', '1.2 s up, 0.4 s hold, 2.5 s down');
ex.checks.measure = { name: 'hipFlexion', min: 85, max: 95 };
console.log(`Hanging Straight Leg Raise: wrote ${L.write(ex)}\n  place ${JSON.stringify(place)}\n  ${JSON.stringify(rep)}\n  legs ${legAng(Wt)}° from level at the top; feet ${L.shapeMinY(Wh).y.toFixed(1)} cm off the floor in the hang`);
if (fail.length) { console.error('FAIL hanging-straight-leg-raise: ' + fail.join('; ')); process.exitCode = 1; }
