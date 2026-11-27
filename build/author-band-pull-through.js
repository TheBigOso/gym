// Band Pull Through (GymVisual 9055, movement reference only; the page could not be read, so the movement follows the name
// and standard coaching). Standing facing away from a rack turned side-on behind the athlete, the band tied low on the near
// upright and running forward between the legs to both hands (two-hand band with an anchor). Feet wider than the hips,
// toes out (planted contacts). Hip hinge with a flat back and soft knees: the hands, on long arms, are drawn back between
// the thighs; then the hips drive forward to stand tall, hands in front of the hips. Hinge and straight-arm solve as in
// author-kettlebell-swing.js (b4-power): every key, in-betweens too, is solved on an interpolated body with the arms at an
// interpolated angle, hands side by side (wrists at z = +-ZW). Bilateral.
const L = require('./lib');
const { V, r1 } = L;
const P = require('./families/b4-power');
const H = require('./families/hips');
const EQ = require('./families/equip');
const B5 = require('./families/b5-bandcore');
const meta = require('./meta/band-pull-through.json');

const env = (k, d) => +(process.env[k] ?? d);
const F = P.makeFamily({ toe: 14, half: env('HALF', 26) });
const ZW = 5, D2R = Math.PI / 180;
const flat = { r: { c: 'flat', x: 0 }, l: { c: 'flat', x: 0 } };
// straight arms at `a` degrees from hanging (+ forward), overhand (palms toward the body), as in the kettlebell swing
const arm = (a, flex = 6) => {
  const dir = (W) => { const S = W.shoulder_r.p, len = L.reach(flex), dz = ZW - S[2], ls = Math.sqrt(len * len - dz * dz); return [ls * Math.sin(a * D2R), -ls * Math.cos(a * D2R), dz]; };
  return { w: (W) => V.add(W.shoulder_r.p, dir(W)), elbow: (W) => V.add(W.shoulder_r.p, V.scale(V.norm(dir(W)), L.UA)), palm: [-Math.cos(a * D2R), -Math.sin(a * D2R), 0], thumb: [0, 0, -1], elbowW: 0.6 };
};
const sc = (e, p) => ({ protract: p, elevate: e });
const Bd = {
  stand: { feet: flat, knee: 5, pitch: 0, sc: sc(-2, 4) },
  mid: { feet: flat, knee: 14, pitch: -32, shX: 6, spine: { l5: -1, t12: 0, t6: 0.5 }, sc: sc(-3, 6), neck: [-8, -6] },
  bottom: { feet: flat, knee: env('KB', 22), pitch: env('PB', -60), shX: 9, spine: { l5: -2, t12: 0, t6: 1 }, sc: sc(-4, 7), neck: [-14, -10] },
};
const ANG = { stand: 6, mid: -6, bottom: env('AB', -16) };
const KEYS = [['stand', 0], ['stand', 0.6], ['mid', 1.3, 2], ['bottom', 2.0, 2], ['bottom', 2.3], ['mid', 2.8, 2], ['stand', 3.3, 2], ['stand', 3.8]];
const poses = {}, keyframes = [], err = {}, state = {}, cfgs = {};
const solveKey = (name, cfg, ang) => { const b = P.body(F, cfg), p = P.mirror(P.handArm(b, arm(ang), state)); delete p.__spec; err[name] = state.err; return p; };
for (const [n] of KEYS) if (!cfgs[n]) { cfgs[n] = JSON.parse(JSON.stringify(Bd[n])); P.body(F, cfgs[n]); }
let prev = null, mid = 0;
for (const [n, t, between] of KEYS) {
  if (prev && between) for (let i = 1; i <= between; i++) {
    const f = i / (between + 1), nm = `${n}_m${mid++}`;
    poses[nm] = solveKey(nm, P.lerpCfg(cfgs[prev.n], cfgs[n], f), ANG[prev.n] + (ANG[n] - ANG[prev.n]) * f);
    keyframes.push({ t: +(prev.t + (t - prev.t) * f).toFixed(3), pose: nm });
  }
  if (!poses[n]) poses[n] = solveKey(n, cfgs[n], ANG[n]);
  keyframes.push({ t, pose: n }); prev = { n, t };
}
// rack behind, turned side-on (uprights one behind the other on the midline); band tied low on the near upright
const ANCHOR_X = -95, ANCHOR_Y = env('AY', 22);
const rk = B5.uprightX(ANCHOR_X, 0, { toward: -1, hookY: 120 });
const ex = H.module_(meta, F.contacts, poses, keyframes);
ex.props = [rk.prop, B5.band('band', { joint: 'wrist_r', with: 'wrist_l' }, rk.anchor(ANCHOR_Y))];
const rep = B5.scan(ex, { measure: B5.MEASURE.hipFlexion });
B5.gate('band-pull-through', rep, { minBand: 0.3, range: [meta.checks.measure.min, meta.checks.measure.max] });

const W = (n) => L.fk(poses[n], F.contacts), Wb = W('bottom'), Wt = W('stand'), set = H.setKin(ex), g = (Wx) => EQ.barAt(Wx).c;
set('Hip flexion', 'setup', `${B5.deg(poses.stand.ch.hip_r.flex)} standing tall`); set('Hip flexion', 'peak', `${B5.deg(poses.bottom.ch.hip_r.flex)} (joint channel), trunk ${B5.deg(P.trunkLean(Wb))} forward`);
set('Knee flexion', 'setup', B5.deg(P.kneeOf(Wt, 'r'))); set('Knee flexion', 'peak', B5.deg(P.kneeOf(Wb, 'r')));
set('Hands', 'setup', `In front of the hips, ${Math.round(g(Wt)[1])} cm high; band tied ${ANCHOR_Y} cm up an upright ${-ANCHOR_X} cm behind the heels`); set('Hands', 'peak', `Drawn back between the thighs, ${Math.round(g(Wb)[0])} cm from the ankles (forward +), ${Math.round(g(Wb)[1])} cm high`);
set('Stance', 'setup', `Ankles ${Math.round(2 * F.half)} cm apart, toes out`); set('Stance', 'peak', 'Unchanged');
set('Tempo', 'setup', 'Stand 0.6 s'); set('Tempo', 'peak', '1.4 s down, 0.3 s pause, 1 s up, 0.5 s squeeze');
console.log(`Band Pull Through: wrote ${L.write(ex)}\n  err ${JSON.stringify(err)}\n  ${JSON.stringify(rep)}\n  hands top ${g(Wt).map(Math.round)} bottom ${g(Wb).map(Math.round)}`);
