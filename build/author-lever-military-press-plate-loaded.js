// Lever Military Press (plate loaded) (GymVisual; movement reference only, the page could not be read): seated on a
// plate-loaded shoulder press (prop kind 'lever_machine', type shoulder_press, iso-lateral arms, plates on the horns), back
// on the 8 degree pad, feet flat. Palms forward on horizontal handles: from beside the head at about chin height the
// handles ride the lever arc up to the arms long overhead; the pivot sits low behind the seat. Bilateral, right arm solved
// on the arc and mirrored. Family build/families/gear-g3m.js (arcPress).
const L = require('./lib');
const { V, r1 } = L;
const G3 = require('./families/gear-g3m');
const meta = require('./meta/lever-military-press-plate-loaded.json');

const R = G3.arcPress(meta, {
  type: 'shoulder_press', seq: true, NK: 10, ease: (f) => f,
  arc: (W0, S) => ({ G0: [r1(S[0] + 6), r1(S[1] + 19), r1(S[2] + 16)], G1: [r1(S[0] + 2), r1(S[1] + 49), r1(S[2] + 16)], radius: 85, side: 1 }),
  palm: () => [1, 0.15, 0], wPalm: 2, g0: { plane: 8, elev: 66, axial: -80, pron: 100, flex: 120 }, g1: { plane: 20, elev: 165, axial: 30, pron: 90, flex: 15 },
  elbow0: (W0, S) => V.add(S, V.scale(V.norm([0.2, -0.3, 1]), L.UA)),
  elbow1: (W0, S, Fr, G0, G1) => V.add(S, V.scale(V.norm(V.sub(G1, S)), L.UA)),
});
G3.kinPress(R, { grip: 'Palms forward on horizontal handles', top: 'overhead', bottom: 'at the shoulders', rows: { 'Shoulder elevation': [`${G3.deg(R.poses.top.ch.shoulder_r.elev)} overhead`, `${G3.deg(R.poses.bottom.ch.shoulder_r.elev)} at the shoulders`] }, tempo: ['Pause 0.5 s overhead', '2 s down, 0.3 s pause, 1.3 s press'] });
console.log(G3.summary('Lever Military Press (plate loaded)', R));
