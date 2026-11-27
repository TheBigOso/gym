// Dumbbell Straight-Arm Pullover (GymVisual #043312): lying along a flat bench with the head near its end, glutes on the
// seat, feet planted (leg contacts). One dumbbell over the chest, both palms cupping the top plate, arms straight (elbows at
// a fixed 4 degrees of flexion). The dumbbell lowers in a long arc behind the head until the arms are about in line with the
// body, pauses in the stretch, and is pulled back over the chest with straight arms. Bilateral. Family b4-benchpress.js.
const L = require('./lib');
const { V, r1 } = L;
const P = require('./families/b4-benchpress');
const H = require('./families/hips');
const meta = require('./meta/dumbbell-straight-arm-pullover.json');
const ELBOW = +(process.env.ELBOW ?? 4), DIP = +(process.env.DIP ?? -8);
const m = P.pulloverModule(meta, { mode: 'straight', elbow: ELBOW, dip: DIP, hipX: +(process.env.HIPX ?? 2) });
const { ex, poses, contacts, W0, B, T, sw, foot } = m, d = P.d0, set = H.setKin(ex);
const Wt = L.fk(poses.top, contacts), Wb = L.fk(poses.bottom, contacts), dbT = m.dbAt(Wt), dbB = m.dbAt(Wb);
set('Bench position', 'setup', `Along the bench, top of the head at the end of the pad (${r1(B.tip[0] - m.headTop)} cm past it)`); set('Bench position', 'peak', 'Glutes, upper back and head on the bench (skinned-mesh offsets from b2/chest_mesh.mjs)');
set('Shoulder flexion', 'setup', `${d(m.flexOf(Wt))} (arms over the chest)`); set('Shoulder flexion', 'peak', `${d(m.flexOf(Wb))} at the bottom (arms aimed ${Math.abs(DIP)}° ${DIP < 0 ? 'above' : 'below'} the line of the back so the dumbbell clears the head)`);
set('Elbow flexion', 'setup', `${d(C_elbow(Wt))} (elbow angle ${d(180 - C_elbow(Wt))})`); set('Elbow flexion', 'peak', `${r1(m.el[0])}-${r1(m.el[1])}° through the arc (fixed)`);
set('Grip', 'setup', 'Both palms on the top plate, dumbbell hanging along the forearms'); set('Grip', 'peak', `Dumbbell behind the head, lowest point ${r1(Math.min(...dbB.ends.map((e) => e[1])) - dbB.r)} cm above the floor`);
set('Knee flexion', 'setup', `${d(H.kneeOf(W0, 'r'))}, feet ${2 * foot[2]} cm apart`); set('Knee flexion', 'peak', 'Unchanged (feet planted)');
set('Tempo', 'setup', `Top ${T.h} s`); set('Tempo', 'peak', `${r1(T.b - T.h)} s down, ${r1(T.p - T.b)} s stretch, ${r1(T.r - T.p)} s up, ${r1(T.D - T.r)} s over the chest`);
function C_elbow(W) { return require('./families/b3-chest').elbowFlexOf(W); }
P.finish(ex, 'Dumbbell Straight-Arm Pullover', m, `headTop ${r1(m.headTop)} tip ${B.tip[0]} shoulder ${m.sh.map(r1)} elbow ${m.el.map(r1)} costs ${m.path.map((k) => k.cost.toFixed(3)).join(',')} dbBot ${dbB.c.map(r1)}`);
