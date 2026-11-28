// Lever Decline Chest Press (GymVisual, Lever Decline Chest Press; movement reference only, the page could not be read):
// seated on a selectorized decline press (prop kind 'lever_machine', type chest_press, iso-lateral arms), back on the pad,
// feet flat. The lever pivot sits high behind the athlete, so the handles travel on a decline arc: from beside the lower
// chest forward and down to the arms extended about 25 cm below the shoulders. Palms down. Bilateral: right arm solved on
// the arc, left mirrored. Family build/families/gear-g3m.js (arcPress).
const L = require('./lib');
const { V, r1 } = L;
const CH = require('./families/b3-chest');
const C = require('./families/eq-cable');
const GL = require('./families/gear-lever');
const G3 = require('./families/gear-g3m');
const meta = require('./meta/lever-decline-chest-press.json');

const R = G3.arcPress(meta, {
  type: 'chest_press',
  arc: (W0, S) => { const z = r1(S[2] + 3); return { G0: [r1(S[0] + 18), r1(S[1] - 20), z], G1: [r1(S[0] + 44), r1(S[1] - 30), z], radius: 95, side: 1 }; },
  palm: (Fr) => V.norm(V.add(V.scale(Fr.u, -1), V.scale(Fr.v, 0.1))),
  elbow0: (W0, S, Fr) => V.add(S, V.scale(CH.upperArmDir(Fr, 40, 35), L.UA)),
  elbow1: (W0, S, Fr, G0, G1) => V.add(S, V.scale(V.norm(V.sub(V.add(G1, [0, -6, 0]), S)), L.UA)),
});
const { set, Wt, Wb, M, rep } = R, d = G3.deg;
set('Elbow flexion', 'setup', `${d(C.elbowAng(Wt))} with the arms extended`); set('Elbow flexion', 'peak', `${d(C.elbowAng(Wb))} with the hands beside the lower chest`);
set('Elbow flare', 'setup', '–'); set('Elbow flare', 'peak', `${d(CH.elbowFlare(Wb))} from the trunk`);
set('Grip', 'setup', `Palms down, handles ${r1(2 * R.arc.G0[2])} cm apart`); set('Grip', 'peak', 'Unchanged');
set('Lever', 'setup', `Pivot ${M.P.pivot[1]} cm high; hands end ${r1(R.S[1] - R.arc.G1[1])} cm below the shoulders`); set('Lever', 'peak', `Lever swings ${R.A1}°; hands within ${G3.offArcOf(rep)} cm of the arc`);
set('Trunk', 'setup', `Back on the ${M.P.back.angle}° pad`); set('Trunk', 'peak', 'Unchanged');
set('Seat', 'setup', `Seat ${GL.seatTop(M)} cm, knees ${d(L.fk(R.poses.top, R.st.contacts) && 90)}, feet flat`); set('Seat', 'peak', 'Unchanged');
set('Tempo', 'setup', 'Pause 0.5 s with the arms extended'); set('Tempo', 'peak', '2 s back, 0.3 s pause, 1.3 s press');
console.log(G3.summary('Lever Decline Chest Press', R));
