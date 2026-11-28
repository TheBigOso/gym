// Dumbbell Alternating Floor Press (GymVisual #13814; page not readable here, movement from the name): lying on the mat, knees
// bent and feet flat (planted leg contacts), both dumbbells straight up over the chest (palms toward the feet). The right
// dumbbell lowers (elbow about 45 degrees from the trunk, forearm vertical) until the back of the upper arm rests on the floor,
// pauses and presses back up while the left arm holds straight; then the left does the same. Bilateral loop (one rep per arm);
// the left arm's keys mirror the right's. Family b6-04.js (floorPress, mode 'alternate').
const { r1 } = require('./lib');
const F = require('./families/b6-04');
const H = require('./families/hips');
const meta = require('./meta/dumbbell-alternating-floor-press.json');
F.floorPress(meta, { mode: 'alternate', flare: 45, axAt: F.AX.pronated, topTilt: [0.03, 1, 0.1], label: 'Dumbbell Alternating Floor Press', kin: (set, m) => {
  const { W0 } = m, d = F.d0, ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p])), du = (id) => r1(ph[id].end - ph[id].start);
  set('Elbow flexion', 'setup', `${d(m.elbowTop)} (arms straight, not locked)`); set('Elbow flexion', 'peak', `${d(m.elbowBot)} with the upper arm on the floor`);
  set('Elbow flare', 'setup', 'Arms vertical over the chest'); set('Elbow flare', 'peak', `${d(m.flare)} from the trunk at the bottom`);
  set('Opposite arm', 'setup', 'Both arms straight over the chest'); set('Opposite arm', 'peak', `Holds straight (elbow ${d(m.elbowTop)}) while the other arm works`);
  set('Upper arm on the floor', 'setup', '–'); set('Upper arm on the floor', 'peak', `Arm shapes ${r1(m.armFloor)} cm above the floor (resting)`);
  set('Knee flexion', 'setup', `${d(H.kneeOf(W0, 'r'))}, feet ${2 * m.foot[2]} cm apart`); set('Knee flexion', 'peak', 'Unchanged (feet planted)');
  set('Tempo', 'setup', `Both up ${du('setup')} s`); set('Tempo', 'peak', `Per arm ${du('lowerR')} s down, ${du('bottomR')} s pause, ${du('pressR')} s up`);
} });
