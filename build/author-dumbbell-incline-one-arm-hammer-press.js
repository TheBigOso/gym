// Dumbbell Incline One Arm Hammer Press (GymVisual #13799; page not readable here, movement from the name): back pad at 30
// degrees, glutes in the crease, feet planted wide (leg contacts), one dumbbell in the right hand with a neutral grip (palm
// facing in, handle along the trunk). Elbow tucked about 30 degrees from the trunk, forearm vertical; the dumbbell lowers beside
// the upper chest and presses straight up over the shoulder. The free left hand rests on the stomach. Authored right (the
// player mirrors). Family b6-04.js (benchPress).
const { V, r1 } = require('./lib');
const F = require('./families/b6-04');
const H = require('./families/hips');
const meta = require('./meta/dumbbell-incline-one-arm-hammer-press.json');
F.benchPress(meta, { angle: 30, flare: 30, dip: 6, topTilt: [0.02, 1, 0.03], axAt: F.AX.neutral, single: true, label: 'Dumbbell Incline One Arm Hammer Press', kin: (set, m) => {
  const { W0, T } = m, d = F.d0;
  set('Bench angle', 'setup', '30° back pad, flat seat'); set('Bench angle', 'peak', 'Glutes in the crease, upper back and head on the pad');
  set('Elbow flexion', 'setup', `${d(m.elbowTop)} (arm straight, not locked)`); set('Elbow flexion', 'peak', `${d(m.elbowBot)} at the bottom`);
  set('Elbow flare', 'setup', 'Arm vertical over the shoulder, palm facing in'); set('Elbow flare', 'peak', `${d(m.flare)} from the trunk at the bottom; upper arm ${d(m.dip)} below the back plane`);
  set('Dumbbell path', 'setup', `Top: dumbbell centre ${r1(m.dbT.c[2])} cm out from the midline`); set('Dumbbell path', 'peak', `Bottom: ${r1(m.dbB.c[2])} cm out beside the upper chest, travel ${r1(V.len(V.sub(m.dbT.c, m.dbB.c)))} cm`);
  set('Free arm', 'setup', 'Left hand resting on the stomach'); set('Free arm', 'peak', 'Unchanged');
  set('Knee flexion', 'setup', `${d(H.kneeOf(W0, 'r'))}, feet ${2 * m.foot[2]} cm apart`); set('Knee flexion', 'peak', 'Unchanged (feet planted)');
  set('Tempo', 'setup', `Top ${T.h} s`); set('Tempo', 'peak', `${r1(T.b - T.h)} s down, ${r1(T.p - T.b)} s pause, ${r1(T.r - T.p)} s up, ${r1(T.D - T.r)} s at the top`);
} });
