// Dumbbell Lying One Arm Press (GymVisual #13762; page not readable here, movement from the name): lying on a flat bench, feet
// planted wide (leg contacts), one dumbbell in the right hand (palm toward the feet). The forearm stays vertical under the
// dumbbell while the upper arm swings from about 50 degrees out from the trunk, just below the back plane, to vertical over
// the shoulder. The free left hand rests on the stomach. Authored right (the player mirrors). Family b6-04.js (benchPress).
const { V, r1 } = require('./lib');
const F = require('./families/b6-04');
const H = require('./families/hips');
const meta = require('./meta/dumbbell-lying-one-arm-press.json');
F.benchPress(meta, { angle: 0, flare: 50, dip: 16, topTilt: [0.02, 1, 0.04], axAt: F.AX.pronated, single: true, label: 'Dumbbell Lying One Arm Press', kin: (set, m) => {
  const { W0, T } = m, d = F.d0;
  set('Bench angle', 'setup', 'Flat (0°)'); set('Bench angle', 'peak', 'Glutes on the seat, upper back and head on the pad');
  set('Elbow flexion', 'setup', `${d(m.elbowTop)} (arm straight, not locked)`); set('Elbow flexion', 'peak', `${d(m.elbowBot)} at the bottom`);
  set('Elbow flare', 'setup', 'Arm vertical over the shoulder'); set('Elbow flare', 'peak', `${d(m.flare)} at the bottom; upper arm ${d(m.dip)} below the back plane`);
  set('Dumbbell path', 'setup', `Top: dumbbell centre ${r1(m.dbT.c[2])} cm out from the midline`); set('Dumbbell path', 'peak', `Bottom: ${r1(m.dbB.c[2])} cm out beside the chest, travel ${r1(V.len(V.sub(m.dbT.c, m.dbB.c)))} cm`);
  set('Free arm', 'setup', 'Left hand resting on the stomach'); set('Free arm', 'peak', 'Unchanged');
  set('Knee flexion', 'setup', `${d(H.kneeOf(W0, 'r'))}, feet ${2 * m.foot[2]} cm apart`); set('Knee flexion', 'peak', 'Unchanged (feet planted)');
  set('Tempo', 'setup', `Top ${T.h} s`); set('Tempo', 'peak', `${r1(T.b - T.h)} s down, ${r1(T.p - T.b)} s pause, ${r1(T.r - T.p)} s up, ${r1(T.D - T.r)} s at the top`);
} });
