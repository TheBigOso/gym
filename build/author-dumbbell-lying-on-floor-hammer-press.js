// Dumbbell Lying on Floor Hammer Press (GymVisual #9372; page not readable here, movement from the name): lying on the mat,
// knees bent and feet flat (planted leg contacts), a dumbbell in each hand with a neutral grip (palms facing, handles along
// the body). Elbows tucked about 30 degrees from the trunk with the forearms vertical; the dumbbells lower until the backs of
// the upper arms rest on the floor (depth solved on the arm shapes), pause, and press straight up. Bilateral; the left arm
// mirrors the right. Family b6-04.js (floorPress).
const { r1 } = require('./lib');
const F = require('./families/b6-04');
const H = require('./families/hips');
const meta = require('./meta/dumbbell-lying-on-floor-hammer-press.json');
F.floorPress(meta, { mode: 'both', flare: 30, axAt: F.AX.neutral, topTilt: [0.03, 1, 0.06], label: 'Dumbbell Lying on Floor Hammer Press', kin: (set, m) => {
  const { W0, T } = m, d = F.d0;
  set('Elbow flexion', 'setup', `${d(m.elbowTop)} (arms straight, not locked)`); set('Elbow flexion', 'peak', `${d(m.elbowBot)} with the upper arms on the floor`);
  set('Elbow tuck', 'setup', 'Arms vertical over the chest, palms facing'); set('Elbow tuck', 'peak', `${d(m.flare)} from the trunk at the bottom`);
  set('Range of motion', 'setup', `Dumbbell centre ${r1(m.dbT.c[1])} cm above the floor at the top`); set('Range of motion', 'peak', `${r1(m.dbB.c[1])} cm at the bottom: ${r1(m.dbT.c[1] - m.dbB.c[1])} cm of travel`);
  set('Upper arm on the floor', 'setup', '–'); set('Upper arm on the floor', 'peak', `Arm shapes ${r1(m.armFloor)} cm above the floor (resting)`);
  set('Knee flexion', 'setup', `${d(H.kneeOf(W0, 'r'))}, feet ${2 * m.foot[2]} cm apart`); set('Knee flexion', 'peak', 'Unchanged (feet planted)');
  set('Tempo', 'setup', `Top ${T.h} s`); set('Tempo', 'peak', `${r1(T.b - T.h)} s down, ${r1(T.p - T.b)} s pause on the floor, ${r1(T.r - T.p)} s up, ${r1(T.D - T.r)} s at the top`);
} });
