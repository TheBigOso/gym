// Incline Dumbbell Hammer Press (GymVisual #032112): back pad at 30 degrees, seat flat, glutes in the crease, upper back and
// head on the pad, feet planted (leg contacts). Neutral grip (palms facing each other, handles along the trunk) with the
// elbows tucked about 30 degrees from the trunk and the forearms vertical; the dumbbells lower beside the upper chest and
// press straight up over the shoulders. Bilateral; the left arm mirrors the right. Family b4-benchpress.js.
const L = require('./lib');
const { r1 } = L;
const P = require('./families/b4-benchpress');
const C = require('./families/b3-chest');
const H = require('./families/hips');
const meta = require('./meta/incline-dumbbell-hammer-press.json');
P.pressModule(meta, { angle: 30, flare: 30, dip: 14, topTilt: [0.03, 1, 0.06], grip: 'neutral', label: 'Incline Dumbbell Hammer Press', kin: (set, m) => {
  const { W0, T } = m, d = P.d0;
  set('Bench angle', 'setup', '30° back pad, flat seat'); set('Bench angle', 'peak', 'Glutes in the crease, upper back and head on the pad (skinned-mesh offsets from b2/chest_mesh.mjs)');
  set('Grip', 'setup', `Neutral: handles along the trunk, dumbbells ${r1(2 * m.dbT.c[2] - 12)} cm apart at the top`); set('Grip', 'peak', `Neutral beside the chest, centres ${r1(2 * m.dbB.c[2])} cm apart`);
  set('Elbow flexion', 'setup', `${d(m.elbowTop)} (arms straight, not locked)`); set('Elbow flexion', 'peak', `${d(m.elbowBot)} at the bottom`);
  set('Elbow tuck', 'setup', 'Arms vertical over the shoulders'); set('Elbow tuck', 'peak', `${d(m.flare)} from the trunk at the bottom; upper arm ${d(m.dip)} below the back plane`);
  set('Knee flexion', 'setup', `${d(H.kneeOf(W0, 'r'))}`); set('Knee flexion', 'peak', 'Unchanged (feet planted)');
  set('Tempo', 'setup', `Top ${T.h} s`); set('Tempo', 'peak', `${r1(T.b - T.h)} s down, ${r1(T.p - T.b)} s pause, ${r1(T.r - T.p)} s up, ${r1(T.D - T.r)} s at the top`);
} });
