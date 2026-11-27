// Dumbbell Larsen Press (GymVisual #627212): flat bench press with no leg drive. Glutes near the end of the seat, upper back
// and head on the pad, legs held straight out with the feet off the floor (no foot contacts; the legs stay still). Pronated
// grip (palms toward the feet), elbows about 55 degrees from the trunk with the forearms vertical at the bottom, a short
// pause, then press up and slightly in. Bilateral. Family b4-benchpress.js (larsenBase + pressModule).
const L = require('./lib');
const { r1, V } = L;
const P = require('./families/b4-benchpress');
const meta = require('./meta/dumbbell-larsen-press.json');
const lying = P.larsenBase({ hipX: +(process.env.HIPX ?? 34), hipExt: +(process.env.HIPEXT ?? -12) });
P.pressModule(meta, { angle: 0, lying, label: 'Dumbbell Larsen Press', kin: (set, m) => {
  const { W0, T } = m, d = P.d0;
  const thigh = V.sub(W0.knee_r.p, W0.hip_r.p), tilt = Math.asin(-thigh[1] / V.len(thigh)) / L.R.DEG;
  const feet = Math.min(W0.toe_r.p[1], W0.ankle_r.p[1]);
  set('Leg position', 'setup', `Legs straight (knee ${d(180 - L.V.angle(V.sub(W0.hip_r.p, W0.knee_r.p), V.sub(W0.ankle_r.p, W0.knee_r.p)))}), ${d(tilt)} below horizontal, heels about ${r1(W0.ankle_r.p[1] - 5)} cm off the floor`);
  set('Leg position', 'peak', 'Unchanged: no foot contact and no leg drive');
  set('Elbow flexion', 'setup', `${d(m.elbowTop)} (arms straight, not locked)`); set('Elbow flexion', 'peak', `${d(m.elbowBot)} at the bottom`);
  set('Elbow flare', 'setup', 'Arms vertical over the shoulders'); set('Elbow flare', 'peak', `${d(m.flare)} at the bottom`);
  set('Upper arm depth', 'setup', '–'); set('Upper arm depth', 'peak', `${d(m.dip)} below the back plane`);
  set('Dumbbell path', 'setup', `Top: dumbbells ${r1(2 * m.dbT.c[2] - 32)} cm apart over the shoulders`); set('Dumbbell path', 'peak', `Bottom: centres ${r1(2 * m.dbB.c[2])} cm apart beside the chest, rise ${r1(m.dbT.c[1] - m.dbB.c[1])} cm`);
  set('Tempo', 'setup', `Top ${T.h} s`); set('Tempo', 'peak', `${r1(T.b - T.h)} s down, ${r1(T.p - T.b)} s pause, ${r1(T.r - T.p)} s up, ${r1(T.D - T.r)} s at the top`);
  console.log(`  legs: thigh tilt ${tilt.toFixed(1)} feet y ${feet.toFixed(1)} hip ${JSON.stringify(m.poses.top.ch.hip_r)}`);
} });
