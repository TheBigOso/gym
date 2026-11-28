// Lever Front Pulldown (GymVisual; movement reference only, the page could not be read): seated in a plate-loaded
// iso-lateral pulldown (prop kind 'lever_machine', type pulldown: arms hanging from a pivot high behind the athlete), thighs
// under the roller pad, feet flat. Palms forward on horizontal handles a little wider than the shoulders: from the arms
// long overhead the handles ride the lever arc down and slightly back to beside the upper chest, then rise again.
// Bilateral, right arm solved on the arc and mirrored. Family build/families/gear-g3m.js (arcPress).
const L = require('./lib');
const { V, r1 } = L;
const H = require('./families/hips');
const G3 = require('./families/gear-g3m');
const meta = require('./meta/lever-front-pulldown.json');

let roller = null;
const R = G3.arcPress(meta, {
  type: 'pulldown', seq: true, NK: 12, params: { stack: null },
  prep: (b) => { const W = L.fk(b); roller = [r1(W.knee_r.p[0] - 9), r1(H.bottomOf(W, 'thigh_r') + 0) , 0]; },
  arc: (W0, S) => { const z = r1(S[2] + 18); return { G0: [r1(S[0] + 4), r1(S[1] + 4), z], G1: [r1(S[0] + 14), r1(S[1] + 45), z], radius: 100, side: 1 }; },
  extra: (W0) => { const top = Math.max(W0.knee_r.p[1], W0.hip_r.p[1]) + 8.5; return { pads: [{ c: [r1(W0.knee_r.p[0] - 10), r1(top + 5.5), 0], size: [44, 11], kind: 'roller', post: true }] }; },
  palm: () => [1, 0, 0], wPalm: 0.4, g0: { plane: 30, elev: 70, axial: -70, pron: 80, flex: 120 }, g1: { plane: 30, elev: 160, axial: 0, pron: 80, flex: 15 },
  elbow0: (W0, S) => V.add(S, V.scale(V.norm([0.15, -0.9, 0.45]), L.UA)),
  elbow1: (W0, S, Fr, G0, G1) => V.add(S, V.scale(V.norm(V.sub(G1, S)), L.UA)),
  partSkip: { seat: /^(hand|thumb|forearm)_/, pad0: /^(hand|thumb|forearm)_/ },
});
G3.kinPress(R, { grip: 'Palms forward on horizontal handles', top: 'with the arms long overhead', bottom: 'with the hands beside the upper chest', rows: { Shoulder: [`Arms overhead (elevation ${G3.deg(R.poses.top.ch.shoulder_r.elev)})`, `Upper arms down beside the trunk (${G3.deg(R.poses.bottom.ch.shoulder_r.elev)})`] }, tempo: ['Pause 0.5 s with the arms long', '1.3 s down, 0.4 s squeeze, 2 s up'] });
console.log(G3.summary('Lever Front Pulldown', R));
