// Dumbbell Bent-Arm Pullover (GymVisual #432613): lying along a flat bench with the head at its end, glutes on the seat, feet
// planted (leg contacts). One dumbbell held across the body above the face with both fists side by side on the handle
// (overhand; the dumbbell is centred between the hands), elbows bent about 90 degrees, opening only to about 80. The upper
// arms swing back past the head until they are about in line with the body, so the dumbbell drops behind the bench end
// clear of the head, then pull back to above the face. Bilateral (left arm mirrors the right). Family b4-benchpress.js
// (pulloverModule, mode 'bent', grip 'handle2').
const L = require('./lib');
const { V, r1 } = L;
const P = require('./families/b4-benchpress');
const C = require('./families/b3-chest');
const H = require('./families/hips');
const meta = require('./meta/dumbbell-bent-arm-pullover.json');
const ELBOW = +(process.env.ELBOW ?? 90), ELBOW_BOT = +(process.env.ELBOWB ?? 80), TOP = +(process.env.TOPF ?? 70), BOT = +(process.env.BOTF ?? 165);
const m = P.pulloverModule(meta, { mode: 'bent', grip: 'handle2', elbow: ELBOW, elbowBot: ELBOW_BOT, topFlex: TOP, botFlex: BOT, hipX: +(process.env.HIPX ?? -7), scUp: 22 });
const { ex, poses, contacts, W0, B, T, sw, foot } = m, d = P.d0, set = H.setKin(ex);
const Wt = L.fk(poses.top, contacts), Wb = L.fk(poses.bottom, contacts), dbT = m.dbAt(Wt), dbB = m.dbAt(Wb);
set('Bench position', 'setup', `Along the bench, top of the head at the end of the pad (${r1(B.tip[0] - m.headTop)} cm past it)`); set('Bench position', 'peak', 'Glutes and upper back on the bench (rig shapes), back of the head just off the pad with a neutral neck');
set('Shoulder flexion', 'setup', `${d(m.flexOf(Wt))} (upper arms tilted toward the feet, dumbbell above the face)`); set('Shoulder flexion', 'peak', `${d(m.flexOf(Wb))} at the bottom (upper arms about in line with the body)`);
set('Elbow flexion', 'setup', `${d(C.elbowFlexOf(Wt))}`); set('Elbow flexion', 'peak', `${r1(m.el[0])}-${r1(m.el[1])}° through the arc (fixed)`);
set('Grip', 'setup', `Both fists side by side on the handle (overhand), dumbbell across the body, centre ${r1(dbT.c[1] - W0.shoulder_r.p[1])} cm above the shoulder joints`); set('Grip', 'peak', `Dumbbell behind the bench end, lowest point ${r1(Math.min(...dbB.ends.map((e) => e[1])) - dbB.r)} cm above the floor`);
set('Knee flexion', 'setup', `${d(H.kneeOf(W0, 'r'))}, feet ${2 * foot[2]} cm apart`); set('Knee flexion', 'peak', 'Unchanged (feet planted)');
set('Tempo', 'setup', `Top ${T.h} s`); set('Tempo', 'peak', `${r1(T.b - T.h)} s down, ${r1(T.p - T.b)} s stretch, ${r1(T.r - T.p)} s up, ${r1(T.D - T.r)} s at the top`);
P.finish(ex, 'Dumbbell Bent-Arm Pullover', m, `headTop ${r1(m.headTop)} tip ${B.tip[0]} shoulder ${m.sh.map(r1)} elbow ${m.el.map(r1)} costs ${m.path.map((k) => k.cost.toFixed(3)).join(',')} dbTop ${dbT.c.map(r1)} dbBot ${dbB.c.map(r1)}`);
