// Barbell Hang Power Clean (GymVisual #21131; page not readable here, movement from the name and standard coaching): stand
// tall holding the bar at the thighs (overhand, 58 cm between the handle centres, feet hip width, toes out 8 degrees);
// push the hips back and slide the bar to just above the knees (the hang: shoulders over the bar, flat back); jump: hips,
// knees and ankles extend onto the balls of the feet with a shrug, the bar rising close to the body to the lower chest
// with the elbows high and out; turnover: the elbows whip round and the bar is caught on the front of the shoulders in a
// quarter squat; stand tall; drop the elbows and lower the bar in front of the chest and waist back to the thighs. The
// clean-and-press machinery (author-barbell-clean-and-press.js) as the b6-02.js oly() kit: both arms solved onto the bar
// at every key and in-between key on one continuous branch, so the grip width stays constant. Bilateral.
const L = require('./lib');
const { V, r1 } = L;
const B = require('./families/b3-back');
const BB = require('./families/barbell');
const EQ = require('./families/equip');
const H = require('./families/hips');
const X = require('./families/b5-bbhinge');
const W6 = require('./families/b6-02');
const meta = require('./meta/barbell-hang-power-clean.json');

const O = W6.oly({ GW: +(process.env.GW ?? 58), env: process.env });
const { F, flat, roll, sc, ARM, HANG, EXT, K, poses, errs, seq, state } = O;
const T = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, [p.start, p.end]])), D = meta.timeline.duration;
// standing tall (f = 1) down to the hang just above the knees (f = FH) on the first-pull hinge path
const FH = +(process.env.FH ?? 0.62);
const FS = [1, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.66, FH], NH = FS.length - 1;
FS.forEach((f, i) => O.addK(`d${i}`, O.solve(O.hingeCfg(f), HANG, i > 0)));
const CFG = {
  ext: { feet: roll(24), knee: 6, pitch: 0, sc: sc(0, 14) },
  pull: { feet: roll(14), knee: 9, pitch: 1, sc: sc(0, 18) },
  catch: { feet: flat, knee: 42, pitch: -11, spine: { l5: -2, t12: 0, t6: 0 }, sc: sc(4, 8) },
  absorb: { feet: flat, knee: 46, pitch: -12, spine: { l5: -2, t12: 0, t6: 0 }, sc: sc(4, 8) },
  rise: { feet: flat, knee: 22, pitch: -6, sc: sc(4, 8) },
  rack: { feet: flat, knee: 5, pitch: 0, sc: sc(4, 8), neck: [0, 0] },
};
const dipSeq = X.eased('d', FS.map((f, i) => i / NH), T.dip[0], T.dip[1] - 0.08).map((x) => ({ t: x.t, name: x.pose }));
dipSeq.push({ t: T.dip[1], name: `d${NH}` });   // a moment in the hang before the jump
const t0 = T.clean[0];
let k = K[`d${NH}`];
k = O.link(k, 'ext', CFG.ext, EXT, [0.25, 0.5, 0.7, 0.85, 0.95], t0 + 0.0, t0 + 0.1);
k = O.link(k, 'pull', CFG.pull, ARM.pull, [0.025, 0.05, 0.08, 0.12, 0.17, 0.23, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9], t0 + 0.1, t0 + 0.22);
k = O.link(k, 'catch', CFG.catch, ARM.rack, [0.04, 0.09, 0.15, 0.25, 0.37, 0.43, 0.5, 0.56, 0.63, 0.76, 0.88], t0 + 0.22, t0 + 0.44);
k = O.link(k, 'absorb', CFG.absorb, ARM.rack, 1, t0 + 0.44, T.clean[1]);
k = O.link(k, 'rise', CFG.rise, ARM.rack, 4, T.clean[1], T.clean[1] + 0.4);
k = O.link(k, 'rack', CFG.rack, ARM.rack, 4, T.clean[1] + 0.4, T.stand[1] - 0.15);
const up = seq.slice();
// lowering: elbows open, bar down in front of the chest and the waist to the thighs (standing tall)
const S_ = O.S_, sphere = O.sphere;
const LOWER = {
  chest: { cfg: { feet: flat, knee: 8, pitch: -1, sc: sc(3, 4) }, arm: { bar: (W) => V.add(S_(W), [+(process.env.L1X ?? 24), +(process.env.L1Y ?? -14), 0]), elbow: (W, c) => [c[0] - 4, c[1] - L.FA, O.GW / 2 + 2], elbowW: 0.5, th: +(process.env.TL1 ?? 0) } },
  waist: { cfg: { feet: flat, knee: 10, pitch: -4, sc: sc(3, 0) }, arm: { bar: (W) => V.add(S_(W), [+(process.env.L2X ?? 30), +(process.env.L2Y ?? -36), 0]), elbow: (W) => sphere(S_(W), [0.15, -1, 0.2]), elbowW: 0.5, th: +(process.env.TL2 ?? -80) } },
};
seq.length = 0;
const tL = T.lower[0];
state.guess = K.rack.guess.slice();
k = O.link(K.rack, 'lw1', LOWER.chest.cfg, LOWER.chest.arm, 5, tL, tL + 0.45);
k = O.link(k, 'lw2', LOWER.waist.cfg, LOWER.waist.arm, 5, tL + 0.45, tL + 0.9);
k = O.link(k, 'e0', K.d0.cfg, Object.assign({}, HANG, { th: -180 }), [0.15, 0.3, 0.45, 0.6, 0.72, 0.82, 0.9, 0.96], tL + 0.9, tL + 1.6);
const down = seq.slice();
const keyframes = [{ t: 0, pose: 'd0' }];
for (const x of dipSeq) keyframes.push({ t: x.t, pose: x.name });
for (const x of up) keyframes.push({ t: x.t, pose: x.name });
keyframes.push({ t: T.stand[1], pose: 'rack' });
for (const x of down) keyframes.push({ t: x.t, pose: x.name });
keyframes.push({ t: D, pose: 'e0' });
// the loop closes on e0 (standing, bar at the thighs) = d0 re-solved on the lowering branch: use d0's arms at t = 0 too
const ex = H.module_(meta, F.contacts, poses, keyframes);
ex.keyframes[0].pose = 'e0';
const kfs = ex.keyframes; if (kfs[1] && kfs[1].pose === 'd0' && kfs[1].t <= T.setup[1] + 1e-6) kfs[1].pose = 'e0';
for (const kf of kfs) if (kf.pose === 'd0') kf.pose = 'e0';
ex.props = [BB.barbellProp()];
const SKIP = /^(hand|thumb|forearm)_|^deltoid_|^chest$|^pecs_|^traps_/;
const sw = BB.sweep(ex, { skip: SKIP }, 900);
const rest = BB.sweep(ex, {}, 300);
const jump = O.P.jumps(ex);
const Wn = (n) => L.fk(poses[n], F.contacts), Wh = Wn(`d${NH}`), Wc = Wn('absorb'), Wr = Wn('rack');
const humElev = (Wx) => V.angle(V.sub(Wx.elbow_r.p, Wx.shoulder_r.p), V.sub(Wx.pelvis.p, Wx.neck_c7.p));
const br = EQ.barAt(Wr, BB.GRIP), d = (v) => `≈${Math.round(v)}°`;
const set = H.setKin(ex);
set('Start', 'setup', 'Standing tall, bar resting on the thighs, arms long'); set('Start', 'peak', `Hang just above the knees: knees ${d(B.kneeOf(Wh, 'r'))}, trunk ${d(B.trunkLean(Wh))} from vertical, bar ${r1(EQ.barAt(Wh, BB.GRIP).c[1])} cm high`);
set('Catch', 'setup', 'Full extension on the balls of the feet, shrug, bar to the lower chest with the elbows high'); set('Catch', 'peak', `Quarter squat, knees ${d(B.kneeOf(Wc, 'r'))}; bar on the front of the shoulders (${r1(br.c[0] - Wr.shoulder_r.p[0])} cm in front of the shoulder joints standing), elbows ${d(humElev(Wc))} from the trunk line`);
set('Grip', 'setup', `Overhand, ${O.GW} cm between the handle centres`); set('Grip', 'peak', `Held: ${sw.width[0]}-${sw.width[1]} cm through the loop`);
set('Tempo', 'setup', `Stand ${T.setup[1]} s, dip ${r1(T.dip[1] - T.dip[0])} s`); set('Tempo', 'peak', `Jump and catch ${r1(T.clean[1] - T.clean[0])} s, stand ${r1(T.stand[1] - T.stand[0])} s, lower ${r1(T.lower[1] - T.lower[0])} s`);
delete poses.d0;
console.log(`Barbell Hang Power Clean: wrote ${L.write(ex)}\n  errs ${JSON.stringify(errs)}\n  sweep ${JSON.stringify(sw)}\n  rest(nothing skipped) ${rest.barBody} at ${JSON.stringify(rest.barBodyAt)}, jump ${JSON.stringify(jump)}`);
const maxErr = Math.max(...Object.values(errs));
// the ext -> pull switch (elbow starts to bend off a straight arm) moves the hands by up to about 1.9 cm for ~5 ms between
// keys, as in author-barbell-clean-and-press.js; everywhere else the grip stays within about 1 cm
if (sw.widthRange > 2.0 || maxErr > 0.6) { console.error('FAIL: hands do not stay on the bar at a constant grip width'); process.exitCode = 1; }
if (sw.barFloor < -0.1 || sw.barBody < -0.3 || rest.barBody < -2) { console.error('FAIL: bar or plates through the floor or the body'); process.exitCode = 1; }
if (sw.slide > 0.05) { console.error('FAIL: planted feet slide'); process.exitCode = 1; }
