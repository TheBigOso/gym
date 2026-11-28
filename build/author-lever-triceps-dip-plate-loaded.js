// Lever Triceps Dip (plate loaded) (GymVisual; movement reference only, the page could not be read): seated dip machine
// (prop kind 'lever_machine', type chest_press preset re-fitted: iso-lateral arms pivoting low in front, handles running
// fore and aft, plates on the horns), back on the pad, feet flat. Neutral grip; from the arms straight beside the hips the
// handles rise on the lever arc until the elbows bend to about 90 degrees (pointing back), then the athlete presses them
// back down. Bilateral, right arm solved on the arc and mirrored. Family build/families/gear-g3m.js (arcPress).
const L = require('./lib');
const { V, r1 } = L;
const G3 = require('./families/gear-g3m');
const meta = require('./meta/lever-triceps-dip-plate-loaded.json');

const R = G3.arcPress(meta, {
  type: 'chest_press', seq: true, NK: 10, ease: (f) => f, params: { load: 'plates', stack: null, endRot: [-90, 70, 0], back: { angle: 6 } },
  arc: (W0, S) => ({ G0: [r1(S[0] + 19), r1(S[1] - 22), r1(S[2] + 8)], G1: [r1(S[0] + 4), r1(S[1] - 50), r1(S[2] + 8)], radius: 70, side: -1 }),
  palm: () => [0, 0, -1], wPalm: 2, g0: { plane: -40, elev: 35, axial: 30, pron: 90, flex: 95 }, g1: { plane: 0, elev: 8, axial: 0, pron: 90, flex: 8 },
  elbow0: (W0, S) => V.add(S, V.scale(V.norm([-0.45, -0.88, 0.12]), L.UA)),
  elbow1: (W0, S) => V.add(S, V.scale(V.norm([-0.05, -1, 0.1]), L.UA)),
  partSkip: { seat: /^(hand|thumb|forearm)_/, back: /^(hand|thumb|forearm|upperarm|biceps|triceps|elbow)_/ },
});
G3.kinPress(R, { grip: 'Neutral (palms in) on fore-aft handles', top: 'with the arms straight', bottom: 'at the top of the arc', rows: { 'Shoulder extension': ['Upper arms beside the trunk', `Elbows ${r1(R.S[0] - R.Wb.elbow_r.p[0])} cm behind the shoulders`] }, tempo: ['Pause 0.5 s with the arms straight', '2 s up, 0.3 s pause, 1.3 s press'] });
console.log(G3.summary('Lever Triceps Dip (plate loaded)', R));
