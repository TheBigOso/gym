// Lever Preacher Curl (Turned Torso) (GymVisual; movement reference only, the page could not be read): one-arm curl on a
// lever preacher machine (prop kind 'lever_machine', type chest_press re-fitted: no back pad, a steep arm pad, levers with
// a handle). The athlete sits with the trunk turned about 25 degrees to the left so the right upper arm lies straight down
// the pad (sloping 50 degrees), armpit over its top edge; the machine is yawed to the arm's plane and the lever pivot put
// on the right elbow, so the handle swings about the elbow. Palm up; the left hand rests on the left thigh and the left
// lever stays on its stop. Authored on the right side (the player mirrors it). Family build/families/gear-g3m.js.
const L = require('./lib');
const { V, r1, clone } = L;
const G3 = require('./families/gear-g3m');
const GL = require('./families/gear-lever');
const meta = require('./meta/lever-preacher-curl-turned-torso.json');

const SLOPE = 50, TURN = 25, R33 = 32.97, D2R = Math.PI / 180;
const ud = V.norm([Math.cos(SLOPE * D2R) * Math.cos(TURN * D2R), -Math.sin(SLOPE * D2R), -Math.cos(SLOPE * D2R) * Math.sin(TURN * D2R)]);
const fwd = [Math.cos(TURN * D2R), 0, -Math.sin(TURN * D2R)], side = V.norm(V.cross(fwd, [0, 1, 0])); // side: horizontal, perpendicular to the lever plane
const rotUp = (d, a) => { const h = V.norm([d[0], 0, d[2]]), c = Math.cos(a * D2R), s = Math.sin(a * D2R), dh = V.dot(d, h); const x = dh * c - d[1] * s, y = dh * s + d[1] * c; return V.norm(V.add(V.scale(h, x), [0, y, 0])); };
let E = null, rest = null;
const R = G3.arcPress(meta, {
  type: 'chest_press', seq: true, NK: 10, ease: (f) => f, params: { back: null, stack: null, load: 'stack', rotY: TURN },
  base: () => { const s = GL.seated(GL.machine('chest_press', { back: null }), { feet: 'floor', knee: 95, stance: 18, footAhead: 4, lean: -10 }); return { pose: s.pose, contacts: s.contacts, planted: ['leg_r', 'leg_l'] }; },
  prep: (b) => { b.ch.spine_l5.rot = -4; b.ch.spine_t12.rot = r1(-(TURN - 4) / 2); b.ch.spine_t6.rot = r1(-(TURN - 4) / 2); b.ch.neck_c7 = { rot: 4, flex: 4 }; b.ch.head_c1 = { rot: 3, flex: 8 }; rest = G3.restHandOnThigh(b); const W = L.fk(b); E = V.add(W.shoulder_r.p, V.scale(ud, L.UA)); },
  arc: () => ({ pivot: E, G0: V.add(E, V.scale(rotUp(ud, 130), R33)).map(r1), G1: V.add(E, V.scale(rotUp(ud, 20), R33)).map(r1) }),
  extra: (W0, S, arc) => { const n = rotUp(ud, 90), c = V.sub(V.add(S, V.scale(ud, L.UA * 0.78)), V.scale(n, 4.6 + 3)); const M0 = GL.machine('chest_press', { rotY: TURN }), lc = M0.toLocal(c); return { pads: [{ c: lc.map(r1), size: [14, 6, 16], rot: [0, 0, -SLOPE], kind: 'box', post: true }], endSize: [12, 1.8] }; },
  palm: () => rotUp(ud, 160), wPalm: 0.3,
  g0: { plane: 60, elev: 50, axial: -80, pron: 0, flex: 125 }, g1: { plane: 60, elev: 50, axial: -80, pron: 0, flex: 20 },
  elbow0: () => E, elbow1: () => E, wElbow: 4,
  uni: (p) => { const q = clone(p); for (const j of ['shoulder', 'elbow', 'wrist']) q.ch[`${j}_l`] = clone(rest.ch[`${j}_l`]); return q; },
  partSkip: { seat: /^(hand|thumb|forearm)_/, pad0: /^(hand|thumb|forearm|upperarm|triceps|biceps|elbow)_r$/ },
});
G3.kinPress(R, { grip: 'Right palm up on the handle; left hand on the left thigh', top: 'with the arm nearly straight', bottom: 'at the top of the curl', rows: { 'Upper arm': [`Down the pad, sloping ${SLOPE}°`, `Elbow within ${r1(V.len(V.sub(R.Wb.elbow_r.p, E)))} cm of the pivot`], 'Turned torso': [`Trunk turned ${TURN}° to the left; machine yawed to match`, 'Unchanged'] }, tempo: ['Pause 0.5 s with the arm long', '1.3 s up, 0.4 s squeeze, 2 s down'] });
console.log(G3.summary('Lever Preacher Curl (Turned Torso)', R));
