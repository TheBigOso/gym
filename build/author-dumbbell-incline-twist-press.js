// Dumbbell Incline Twist Press (GymVisual #15555; page not readable here, movement from the name and standard descriptions):
// back pad at 30 degrees, glutes in the crease, feet planted (leg contacts). The dumbbells start beside the upper chest with a
// neutral grip (palms facing, elbows tucked about 30 degrees) and turn smoothly to a pronated grip (palms toward the feet) as
// they press up over the shoulders; the turn reverses on the way down. The handle axis is interpolated per press key
// (b6-04.js twistAx). Bilateral; the left arm mirrors the right. Family b6-04.js (benchPress).
const { r1 } = require('./lib');
const F = require('./families/b6-04');
const H = require('./families/hips');
const meta = require('./meta/dumbbell-incline-twist-press.json');
F.benchPress(meta, { angle: 30, flare: 32, dip: 6, topTilt: [0.03, 1, 0.1], axAt: F.twistAx('neutral', 'pronated'), label: 'Dumbbell Incline Twist Press', kin: (set, m) => {
  const { W0, T } = m, d = F.d0, pr = (k) => m.poses[k].ch.wrist_r.pron;
  set('Grip rotation', 'setup', `Pronated at the top (forearm pronation ${Math.round(pr('top'))})`); set('Grip rotation', 'peak', `Neutral beside the chest (pronation ${Math.round(pr('bottom'))}): about ${Math.round(Math.abs(pr('top') - pr('bottom')))}° of turn`);
  set('Elbow flexion', 'setup', `${d(m.elbowTop)} (arms straight, not locked)`); set('Elbow flexion', 'peak', `${d(m.elbowBot)} at the bottom`);
  set('Elbow tuck', 'setup', 'Arms vertical over the shoulders'); set('Elbow tuck', 'peak', `${d(m.flare)} from the trunk at the bottom; upper arm ${d(m.dip)} below the back plane`);
  set('Bench angle', 'setup', '30° back pad, flat seat'); set('Bench angle', 'peak', 'Glutes in the crease, upper back and head on the pad');
  set('Knee flexion', 'setup', `${d(H.kneeOf(W0, 'r'))}`); set('Knee flexion', 'peak', 'Unchanged (feet planted)');
  set('Tempo', 'setup', `Top ${T.h} s`); set('Tempo', 'peak', `${r1(T.b - T.h)} s down, ${r1(T.p - T.b)} s pause, ${r1(T.r - T.p)} s up, ${r1(T.D - T.r)} s at the top`);
} });
