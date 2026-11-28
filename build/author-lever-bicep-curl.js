// Lever Bicep Curl (GymVisual animated GIF; movement reference only, the page could not be read): seated arm-curl machine
// (prop kind 'lever_machine', type chest_press re-fitted: no back pad, a sloped arm pad in front of the chest, one lever per
// side with a handle). The backs of the upper arms rest on the pad sloping about 40 degrees down and forward; each lever
// pivot is put on the elbow joint, so the handle swings about the elbow with the forearm. Palms up. From the arms nearly
// straight the athlete curls to full elbow flexion and lowers under control. Bilateral, right arm solved with the elbow
// held on the pivot, left mirrored. Family build/families/gear-g3m.js (arcPress with the pivot at the elbow).
const L = require('./lib');
const { V, r1 } = L;
const G3 = require('./families/gear-g3m');
const meta = require('./meta/lever-bicep-curl.json');

const SLOPE = 40, R33 = 32.97, D2R = Math.PI / 180;
const ud = V.norm([Math.cos(SLOPE * D2R), -Math.sin(SLOPE * D2R), 0.14]);
const rotUp = (d, a) => { const c = Math.cos(a * D2R), s = Math.sin(a * D2R); return V.norm([d[0] * c - d[1] * s, d[0] * s + d[1] * c, 0]); };
let E = null, pad = null;
const R = G3.arcPress(meta, {
  type: 'chest_press', seq: true, NK: 10, ease: (f) => f, params: { back: null, stack: { x: -60, z: 30, h: 110 } },
  seat: { lean: -6, knee: 95, footAhead: 4 },
  prep: (b) => { const W = L.fk(b); E = V.add(W.shoulder_r.p, V.scale(ud, L.UA)); },
  arc: (W0, S) => ({ pivot: E, G0: V.add(E, V.scale(rotUp(ud, 128), R33)).map(r1), G1: V.add(E, V.scale(rotUp(ud, 18), R33)).map(r1) }),
  extra: (W0, S) => { const n = [Math.sin(SLOPE * D2R), Math.cos(SLOPE * D2R), 0], mid = V.scale(V.add(S, E), 0.5); const c = V.sub(V.add(S, V.scale(ud, L.UA * 0.66)), V.scale(n, 4.6 + 3)); pad = c; const zc = r1((S[2] + E[2]) / 2 + 1); return { pads: [{ c: [r1(c[0]), r1(c[1]), zc], size: [18, 6, 15], rot: [0, 0, -SLOPE], kind: 'box', post: true }, { c: [r1(c[0]), r1(c[1]), -zc], size: [18, 6, 15], rot: [0, 0, -SLOPE], kind: 'box' }], endSize: [12, 1.8] }; },
  range: (A1) => G3.rangeOf(0, A1, 3),
  palm: () => V.norm([-0.4, 1, 0]), wPalm: 0.3,
  g0: { plane: 80, elev: 55, axial: -80, pron: 0, flex: 125 }, g1: { plane: 80, elev: 55, axial: -80, pron: 0, flex: 20 },
  elbow0: () => E, elbow1: () => E, wElbow: 4,
  partSkip: { seat: /^(hand|thumb|forearm)_/, pad0: /^(hand|thumb|forearm|upperarm|triceps|biceps|elbow)_/, pad1: /^(hand|thumb|forearm|upperarm|triceps|biceps|elbow)_/ },
});
const { Wt, Wb } = R;
G3.kinPress(R, { grip: 'Palms up on the handles', top: 'with the arms nearly straight', bottom: 'at the top of the curl', rows: { 'Upper arm': [`On the pad, sloping ${SLOPE}° down and forward`, `Elbow within ${r1(V.len(V.sub(Wb.elbow_r.p, E)))} cm of the pivot`] }, tempo: ['Pause 0.5 s with the arms long', '1.3 s up, 0.4 s squeeze, 2 s down'] });
console.log(G3.summary('Lever Bicep Curl', R));
