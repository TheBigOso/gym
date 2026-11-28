// Lever Incline Hammer Chest Press (GymVisual; movement reference only, the page could not be read): seated on a
// plate-loaded incline press (prop kind 'lever_machine', type chest_press, load 'plates', back pad reclined 35 degrees,
// vertical neutral handles), feet flat. From beside the upper chest the handles ride the lever arc up and forward to the
// arms extended. Bilateral, right arm solved on the arc and mirrored. Family build/families/gear-g3m.js (arcPress).
const L = require('./lib');
const { V, r1 } = L;
const CH = require('./families/b3-chest');
const G3 = require('./families/gear-g3m');
const meta = require('./meta/lever-incline-hammer-chest-press.json');

const along = (S, Fr, u, v, w) => V.add(V.add(V.add(S, V.scale(Fr.u, u)), V.scale(Fr.v, v)), V.scale(Fr.w, w)).map(r1);
const R = G3.arcPress(meta, {
  type: 'chest_press', params: { load: 'plates', stack: null, endRot: [90, 0, 0], back: { angle: 35, h: 72 } },
  seat: { knee: 85, footAhead: 10 },
  arc: (W0, S, Fr) => ({ G0: along(S, Fr, -8, 18, 4), G1: along(S, Fr, 10, 48, 4), radius: 95, side: 1 }),
  palm: () => [0, 0, -1], wPalm: 3, g0: { plane: -20, elev: 55, axial: 10, pron: 15, flex: 135 }, g1: { plane: 40, elev: 85, axial: -30, pron: 15, flex: 20 },
  elbow0: (W0, S, Fr) => V.add(S, V.scale(CH.upperArmDir(Fr, 50, 20), L.UA)),
  elbow1: (W0, S, Fr, G0, G1) => V.add(S, V.scale(V.norm(V.sub(V.add(G1, V.scale(Fr.u, -6)), S)), L.UA)),
});
G3.kinPress(R, { grip: 'Neutral (palms facing) on vertical handles', bottom: 'with the hands beside the upper chest', rows: { Incline: [`Back pad reclined ${R.M.P.back.angle}°`, 'Hands finish above the shoulders'] } });
console.log(G3.summary('Lever Incline Hammer Chest Press', R));
