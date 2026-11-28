// Dumbbell Lying Hammer Press (GymVisual #930; page not readable here, movement from the name): lying on a flat bench, glutes
// on the seat, upper back and head on the pad, feet planted (leg contacts). Neutral grip (palms facing, handles along the
// trunk), elbows tucked about 30 degrees from the trunk with the forearms vertical; the dumbbells lower beside the lower chest
// and press straight up over the shoulders. Bilateral; the left arm mirrors the right. Family b6-04.js (benchPress).
const { r1 } = require('./lib');
const F = require('./families/b6-04');
const H = require('./families/hips');
const meta = require('./meta/dumbbell-lying-hammer-press.json');
F.benchPress(meta, { angle: 0, flare: 30, dip: 16, topTilt: [0.03, 1, 0.06], axAt: F.AX.neutral, label: 'Dumbbell Lying Hammer Press', kin: (set, m) => {
  const { W0, T } = m, d = F.d0;
  set('Grip', 'setup', `Neutral: handles along the trunk, dumbbell centres ${r1(2 * m.dbT.c[2])} cm apart at the top`); set('Grip', 'peak', `Neutral beside the chest, centres ${r1(2 * m.dbB.c[2])} cm apart`);
  set('Elbow flexion', 'setup', `${d(m.elbowTop)} (arms straight, not locked)`); set('Elbow flexion', 'peak', `${d(m.elbowBot)} at the bottom`);
  set('Elbow tuck', 'setup', 'Arms vertical over the shoulders'); set('Elbow tuck', 'peak', `${d(m.flare)} from the trunk at the bottom; upper arm ${d(m.dip)} below the back plane`);
  set('Knee flexion', 'setup', `${d(H.kneeOf(W0, 'r'))}, feet ${2 * m.foot[2]} cm apart`); set('Knee flexion', 'peak', 'Unchanged (feet planted)');
  set('Tempo', 'setup', `Top ${T.h} s`); set('Tempo', 'peak', `${r1(T.b - T.h)} s down, ${r1(T.p - T.b)} s pause, ${r1(T.r - T.p)} s up, ${r1(T.D - T.r)} s at the top`);
} });
