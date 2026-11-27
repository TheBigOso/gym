// Band Standing Crunch (GymVisual 8757, movement reference only; the page could not be read, so the movement follows the
// name and standard coaching). Standing facing a pull-up bar with the band looped over it (anchor on the bar), feet hip
// width, knees soft (planted leg contacts). Both hands hold the band by the forehead, elbows forward and down (two-hand
// band with an anchor: two strands up to the bar). The spine curls down (L5 / T12 / T6 flexion, mostly thoracic) with a
// small hip bend and the pelvis easing back over the heels for balance; the hands stay fixed by the forehead (solved in
// the head frame); then the trunk uncurls. Bilateral (right arm solved, left mirrored).
const L = require('./lib');
const { V, Q, r1, clone } = L;
const { makeFamily } = require('./families/lunge');
const H = require('./families/hips');
const EQ = require('./families/equip');
const B5 = require('./families/b5-bandcore');
const C = require('./families/eq-cable');
const meta = require('./meta/band-standing-crunch.json');

const F = makeFamily({ toe: 6, half: 10 });
const feet = { r: { c: 'flat', x: 0 }, l: { c: 'flat', x: 0 } };
const K = { l5: [0, 15], t12: [0, 28], t6: [0, 25], pitch: [0, -12], knee: [6, 14], x: [0, -7], neck: [0, 10] };
const lerp = (a, f) => a[0] + (a[1] - a[0]) * f;
function body(f) {
  const spec = F.rootY({ root: [lerp(K.x, f), 88, 0], pitch: lerp(K.pitch, f), spine: { l5: lerp(K.l5, f), t12: lerp(K.t12, f), t6: lerp(K.t6, f) }, feet }, lerp(K.knee, f));
  const p = F.pose(spec), nk = lerp(K.neck, f);
  p.ch.neck_c7 = { rot: 0, flex: r1(nk * 0.5) }; p.ch.head_c1 = { rot: 0, flex: r1(nk * 0.5) };
  p.ch.sc_r = { protract: 8, elevate: 4 }; p.ch.sc_l = { protract: 8, elevate: 4 };
  return p;
}
// fists by the forehead (head frame: forward, up, side), palms facing each other, elbows forward and down
const spec = (W) => {
  const hq = W.head_c1.q, at = (v) => V.add(W.head_c1.p, Q.rot(hq, v));
  return { grip: at([21, 6, 6]), axis: Q.rot(hq, [0.2, 1, 0]), palm: Q.rot(hq, [0, 0, -1]), wPalm: 1.5, elbow: at([8, -24, 15]), wElbow: 0.3,
    guess: { plane: 60, elev: 120, axial: -40, pron: 40, flex: 130 } };
};
const FR = [0, 0.2, 0.4, 0.6, 0.8, 1], poses = {}, err = {};
FR.forEach((f, i) => { let p = B5.armSide(body(f), F.contacts, 'r', spec); err[`k${i}`] = p.__err; p = C.mirrorArm(p); poses[`k${i}`] = p; });
poses.squeeze = clone(poses.k5);
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p])), D = meta.timeline.duration;
const ks = FR.map((_, i) => `k${i}`);
const seg = (t0, t1, names) => names.map((n, i) => ({ t: +(t0 + ((t1 - t0) * i) / (names.length - 1)).toFixed(3), pose: n }));
const keyframes = [{ t: 0, pose: 'k0' }, ...seg(ph.crunch.start, ph.crunch.end, ks), { t: ph.squeeze.end, pose: 'squeeze' }, ...seg(ph.return.start, ph.return.end, ks.slice().reverse()).slice(1), { t: D, pose: 'k0' }];

// pull-up bar in front, band looped over its middle
const W0 = F.fk(poses.k0), g0 = EQ.barAt(W0).c;
const BAR_X = r1(g0[0] + 85), BAR_H = 218, bar = EQ.pullupBar({ x: BAR_X, height: BAR_H });
const ex = H.module_(meta, F.contacts, poses, keyframes);
ex.props = [bar.prop, B5.band('band', { joint: 'wrist_r', with: 'wrist_l' }, [BAR_X, BAR_H - 1.6, 0])];
const rep = B5.scan(ex, { measure: B5.MEASURE.trunkFlexion, skip: /^(hand|thumb|forearm)_/ });
B5.gate('band-standing-crunch', rep, { minBand: 0.3, range: [meta.checks.measure.min, meta.checks.measure.max] });

const Wb = F.fk(poses.k5), set = H.setKin(ex), sp = (c) => c.spine_l5.flex + c.spine_t12.flex + c.spine_t6.flex;
set('Trunk flexion', 'setup', `Upright (pelvis to C7 ${B5.deg(B5.MEASURE.trunkFlexion(W0))} from vertical)`);
set('Trunk flexion', 'peak', `${B5.deg(B5.MEASURE.trunkFlexion(Wb))} from vertical; spine channels ${B5.deg(sp(poses.k5.ch))} of flexion (L5 ${poses.k5.ch.spine_l5.flex}, T12 ${poses.k5.ch.spine_t12.flex}, T6 ${poses.k5.ch.spine_t6.flex})`);
set('Hip flexion', 'setup', B5.deg(poses.k0.ch.hip_r.flex)); set('Hip flexion', 'peak', `${B5.deg(poses.k5.ch.hip_r.flex)} (joint channel)`);
set('Knee flexion', 'setup', B5.deg(H.kneeOf(W0, 'r'))); set('Knee flexion', 'peak', B5.deg(H.kneeOf(Wb, 'r')));
set('Hands', 'setup', `By the forehead, band up to the bar ${BAR_H} cm high, ${Math.round(BAR_X - g0[0])} cm in front of the hands`); set('Hands', 'peak', 'Unchanged relative to the head');
set('Tempo', 'setup', 'Stand 0.6 s'); set('Tempo', 'peak', '1.2 s down, 0.4 s squeeze, 1.4 s up, 0.4 s pause');
console.log(`Band Standing Crunch: wrote ${L.write(ex)}\n  arm err ${JSON.stringify(err)}\n  ${JSON.stringify(rep)}`);
