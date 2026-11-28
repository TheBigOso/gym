// Machine Inner Chest Press (GymVisual; movement reference only, the page could not be read): seated on a selectorized
// chest press with inner handles (prop kind 'lever_machine', type chest_press, iso-lateral arms, vertical handles close to
// the midline), back on the pad, feet flat. Neutral grip (palms facing), hands about a fist apart in front of the sternum;
// the handles ride the lever arc straight forward to the arms extended, elbows tucked. Bilateral, right arm solved on the
// arc and mirrored. Family build/families/gear-g3m.js (arcPress).
const L = require('./lib');
const { V, r1 } = L;
const CH = require('./families/b3-chest');
const G3 = require('./families/gear-g3m');
const meta = require('./meta/machine-inner-chest-press.json');

const R = G3.arcPress(meta, {
  type: 'chest_press', params: { endRot: [90, 0, 0], endSize: [16, 1.8] },
  arc: (W0, S) => { const z = 10; return { G0: [r1(S[0] + 26), r1(S[1] - 14), z], G1: [r1(S[0] + 50), r1(S[1] - 12), z], radius: 90, side: 1 }; },
  palm: () => [0, 0, -1], wPalm: 2, g0: { plane: 10, elev: 40, axial: 20, pron: 15, flex: 120 }, g1: { plane: 40, elev: 85, axial: -30, pron: 15, flex: 20 },
  elbow0: (W0, S, Fr) => V.add(S, V.scale(CH.upperArmDir(Fr, 30, 10), L.UA)),
  elbow1: (W0, S, Fr, G0, G1) => V.add(S, V.scale(V.norm(V.sub(V.add(G1, [0, -6, 4]), S)), L.UA)),
  partSkip: { seat: /^(hand|thumb|forearm)_/, back: /^(hand|thumb|forearm)_/ },
});
G3.kinPress(R, { grip: `Neutral, handles ${2 * 10} cm apart (centre to centre)`, bottom: 'with the hands in front of the sternum', rows: { 'Hand width': ['Hands about a fist apart', 'Unchanged'] } });
console.log(G3.summary('Machine Inner Chest Press', R));
