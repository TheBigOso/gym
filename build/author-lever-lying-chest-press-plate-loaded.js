// Lever Lying Chest Press (plate loaded) (GymVisual; movement reference only, the page could not be read): lying on a
// flat bench (same lying base as the barbell bench press: head, upper back and buttocks on the pad, feet planted) under a
// plate-loaded iso-lateral press (prop kind 'lever_machine', type chest_press with no seat or back pad, plates on the
// horns). The levers pivot behind the head, so the handles ride an arc from beside the middle of the chest up and a little
// toward the head to the arms extended over the shoulders. Palms down. Bilateral, right arm solved on the arc and mirrored.
// Family build/families/gear-g3m.js (arcPress), build/families/b3-chest.js (benchBase).
const L = require('./lib');
const { V, r1 } = L;
const CH = require('./families/b3-chest');
const G3 = require('./families/gear-g3m');
const meta = require('./meta/lever-lying-chest-press-plate-loaded.json');

const along = (S, Fr, u, v, w) => V.add(V.add(V.add(S, V.scale(Fr.u, u)), V.scale(Fr.v, v)), V.scale(Fr.w, w)).map(r1);
const R = G3.arcPress(meta, {
  type: 'chest_press', seq: true, keepHead: true, NK: 10, params: { load: 'plates', stack: null, seat: null, back: null },
  base: () => { const b = CH.benchBase(0); return { pose: b.base, contacts: b.contacts, planted: ['leg_r', 'leg_l'], props: [b.B.prop] }; },
  arc: (W0, S, Fr) => ({ G0: along(S, Fr, -9, 13, 14), G1: along(S, Fr, -2, 52, 14), radius: 95, side: 1 }),
  palm: (Fr) => V.norm(V.add(V.scale(Fr.v, 1), V.scale(Fr.u, -0.25))), wPalm: 2,
  g0: { plane: 40, elev: 70, axial: 60, pron: 90, flex: 110 }, g1: { plane: 90, elev: 90, axial: 0, pron: 90, flex: 15 },
  elbow0: (W0, S, Fr) => V.add(S, V.scale(CH.upperArmDir(Fr, 55, 30), L.UA)),
  elbow1: (W0, S, Fr, G0, G1) => V.add(S, V.scale(V.norm(V.sub(G1, S)), L.UA)),
  partSkip: {},
});
G3.kinPress(R, { grip: 'Palms down on horizontal handles', top: 'with the arms extended', bottom: 'with the hands beside the chest', rows: { Bench: ['Head, upper back and buttocks on the bench, feet flat', 'Unchanged'] }, tempo: ['Pause 0.5 s with the arms long', '2 s down, 0.3 s pause, 1.3 s press'] });
console.log(G3.summary('Lever Lying Chest Press (plate loaded)', R));
