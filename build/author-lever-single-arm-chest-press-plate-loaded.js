// Lever Single Arm Chest Press (plate loaded) (GymVisual; movement reference only, the page could not be read): seated on
// a plate-loaded iso-lateral chest press (prop kind 'lever_machine', type chest_press, load 'plates'), back on the pad, feet
// flat. Only the right lever is worked: the right hand presses its handle along the lever arc from beside the chest to the
// arm extended; the left hand rests on the left thigh and the left lever stays on its stop. Authored on the right side
// (the player mirrors it). Family build/families/gear-g3m.js (arcPress, restHandOnThigh).
const L = require('./lib');
const { V, r1, clone } = L;
const CH = require('./families/b3-chest');
const G3 = require('./families/gear-g3m');
const meta = require('./meta/lever-single-arm-chest-press-plate-loaded.json');

let rest = null;
const R = G3.arcPress(meta, {
  type: 'chest_press', params: { load: 'plates', stack: null },
  prep: (b) => { rest = G3.restHandOnThigh(b); },
  arc: (W0, S) => { const z = r1(S[2] + 5); return { G0: [r1(S[0] + 22), r1(S[1] - 12), z], G1: [r1(S[0] + 52), r1(S[1] - 10), z], radius: 90, side: 1 }; },
  range: (A1) => G3.rangeOf(0, A1, 3).map((v, i) => (i === 0 ? 0 : v)),
  palm: (Fr) => V.norm(V.add(V.scale(Fr.u, -1), V.scale(Fr.v, 0.2))),
  elbow0: (W0, S, Fr) => V.add(S, V.scale(CH.upperArmDir(Fr, 50, 30), L.UA)),
  elbow1: (W0, S, Fr, G0, G1) => V.add(S, V.scale(V.norm(V.sub(V.add(G1, [0, -6, 0]), S)), L.UA)),
  uni: (p) => { const q = clone(p); for (const j of ['shoulder', 'elbow', 'wrist']) q.ch[`${j}_l`] = clone(rest.ch[`${j}_l`]); return q; },
});
G3.kinPress(R, { grip: 'Right palm down on the handle; left hand on the left thigh', bottom: 'with the hand beside the chest', rows: { 'Anti-rotation': ['Both shoulder blades on the pad', 'Trunk square, hips level'] } });
console.log(G3.summary('Lever Single Arm Chest Press (plate loaded)', R));
