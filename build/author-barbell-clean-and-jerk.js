// Barbell Clean and Jerk (GymVisual #11458; page not readable here, movement from the name and standard coaching): power
// clean from the floor and a power jerk. Feet hip width, toes out 8 degrees, planted throughout (heels rise in the jumps);
// overhand grip just outside the shoulders (58 cm between the handle centres). Clean as in author-barbell-clean-and-press
// (first pull with the back angle held, jump, pull under, quarter-squat catch on the front of the shoulders, stand). Jerk:
// a short straight dip (knees about 20 degrees, trunk upright), drive up onto the balls of the feet as the bar leaves the
// shoulders past the face, punch under and catch on locked arms over the shoulders in a quarter squat, stand. Lower to the
// shoulders, then in front of the chest and waist to the thighs and to the floor like a deadlift. Feet stay planted: this
// is a power jerk (the split jerk would move the feet; stated in the safety notes). b6-02.js oly() kit. Bilateral.
const L = require('./lib');
const { V, r1 } = L;
const B = require('./families/b3-back');
const BB = require('./families/barbell');
const EQ = require('./families/equip');
const H = require('./families/hips');
const X = require('./families/b5-bbhinge');
const W6 = require('./families/b6-02');
const meta = require('./meta/barbell-clean-and-jerk.json');

const O = W6.oly({ GW: +(process.env.GW ?? 58), env: process.env });
const { F, flat, roll, sc, ARM, HANG, EXT, K, poses, errs, seq, state } = O;
const T = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, [p.start, p.end]])), D = meta.timeline.duration;
const FS = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.62], NH = FS.length - 1;
FS.forEach((f, i) => O.addK(`d${i}`, O.solve(O.hingeCfg(f), HANG, i > 0)));
const CFG = {
  ext: { feet: roll(24), knee: 6, pitch: 0, sc: sc(0, 14) },
  pull: { feet: roll(14), knee: 9, pitch: 1, sc: sc(0, 18) },
  catch: { feet: flat, knee: 46, pitch: -12, spine: { l5: -2, t12: 0, t6: 0 }, sc: sc(4, 8) },
  absorb: { feet: flat, knee: 50, pitch: -13, spine: { l5: -2, t12: 0, t6: 0 }, sc: sc(4, 8) },
  rise: { feet: flat, knee: 24, pitch: -6, sc: sc(4, 8) },
  rack: { feet: flat, knee: 5, pitch: 0, sc: sc(4, 8), neck: [0, 0] },
  dip: { feet: flat, knee: 22, pitch: -1, sc: sc(4, 8), neck: [0, 0] },
  drive: { feet: roll(20), knee: 5, pitch: 1, sc: sc(2, 14), neck: [-8, -10] },
  jcatch: { feet: flat, knee: 30, pitch: -4, sc: sc(0, 24), neck: [-2, -2] },
  jstand: { feet: flat, knee: 5, pitch: 0, sc: sc(0, 24), neck: [-2, -2] },
  lr1: { feet: flat, knee: 10, pitch: 0, sc: sc(2, 14), neck: [-8, -10] },
  rack2: { feet: flat, knee: 12, pitch: -1, sc: sc(4, 8), neck: [0, 0] },
};
const pullSeq = X.eased('d', FS.map((f) => f / FS[NH]), T.pull[0], T.pull[1]).map((x) => ({ t: x.t, name: x.pose }));
pullSeq.push({ t: +(T.pull[1] + 0.03).toFixed(3), name: `d${NH}` });
const t0 = T.clean[0];
let k = K[`d${NH}`];
k = O.link(k, 'ext', CFG.ext, EXT, [0.25, 0.5, 0.7, 0.85, 0.95], t0 + 0.03, t0 + 0.12);
k = O.link(k, 'pull', CFG.pull, ARM.pull, [0.025, 0.05, 0.08, 0.12, 0.17, 0.23, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9], t0 + 0.12, t0 + 0.24);
k = O.link(k, 'catch', CFG.catch, ARM.rack, [0.04, 0.09, 0.15, 0.25, 0.37, 0.43, 0.5, 0.56, 0.63, 0.76, 0.88], t0 + 0.24, t0 + 0.46);
k = O.link(k, 'absorb', CFG.absorb, ARM.rack, 1, t0 + 0.46, T.clean[1] + 0.1);
k = O.link(k, 'rise', CFG.rise, ARM.rack, 4, T.clean[1] + 0.1, T.clean[1] + 0.5);
k = O.link(k, 'rack', CFG.rack, ARM.rack, 4, T.clean[1] + 0.5, T.stand[1] - 0.15);
// jerk: dip, drive (the bar leaves the shoulders, passes the face), catch on locked arms, stand
k = O.link(k, 'dip', CFG.dip, ARM.rack, 2, T.dip[0], T.dip[1]);
k = O.link(k, 'drive', CFG.drive, ARM.pmid, [0.15, 0.3, 0.45, 0.6, 0.75, 0.88], T.dip[1], T.jerk[0] + 0.18, true);
k = O.link(k, 'jcatch', CFG.jcatch, ARM.ptop, [0.05, 0.12, 0.2, 0.3, 0.4, 0.55, 0.7, 0.85], T.jerk[0] + 0.18, T.jerk[1]);
k = O.link(k, 'jstand', CFG.jstand, ARM.ptop, 3, T.jerk[1], T.recover[1] - 0.2);
const up = [...pullSeq, ...seq];
// lowering: overhead to the front of the shoulders (knees soft to absorb), then elbows open, bar down in front of the chest
// and the waist to the hang above the knees, and the first pull in reverse to the floor
const S_ = O.S_, sphere = O.sphere;
const LOWER = {
  chest: { cfg: { feet: flat, knee: 8, pitch: -1, sc: sc(3, 4) }, arm: { bar: (W) => V.add(S_(W), [24, -14, 0]), elbow: (W, c) => [c[0] - 4, c[1] - L.FA, O.GW / 2 + 2], elbowW: 0.5, th: 0 } },
  waist: { cfg: { feet: flat, knee: 12, pitch: -6, sc: sc(3, 0) }, arm: { bar: (W) => V.add(S_(W), [30, -36, 0]), elbow: (W) => sphere(S_(W), [0.15, -1, 0.2]), elbowW: 0.5, th: -80 } },
};
seq.length = 0;
const tL = T.lower[0];
k = O.link(K.jstand, 'lr1', CFG.lr1, ARM.pmid, [0.15, 0.3, 0.45, 0.6, 0.72, 0.84, 0.93], tL, tL + 0.35, true);
k = O.link(k, 'rack2', CFG.rack2, ARM.rack, [0.07, 0.15, 0.25, 0.37, 0.5, 0.63, 0.76, 0.88], tL + 0.35, tL + 0.75);
k = O.link(k, 'lw1', LOWER.chest.cfg, LOWER.chest.arm, 5, tL + 0.95, tL + 1.25);
k = O.link(k, 'lw2', LOWER.waist.cfg, LOWER.waist.arm, 5, tL + 1.25, tL + 1.55);
k = O.link(k, `e${NH}`, K[`d${NH}`].cfg, Object.assign({}, HANG, { th: -180 }), [0.15, 0.3, 0.45, 0.6, 0.72, 0.82, 0.88, 0.93, 0.97, 0.99], tL + 1.55, tL + 2.3, true, false);
for (let i = NH - 1; i >= 0; i--) O.addK(`e${i}`, O.solve(K[`d${i}`].cfg, Object.assign({}, HANG, { th: -180 }), true));
const down = seq.slice();
const keyframes = [{ t: 0, pose: 'd0' }];
for (const x of up) keyframes.push({ t: x.t, pose: x.name });
keyframes.push({ t: T.recover[1], pose: 'jstand' });
for (const x of down) keyframes.push({ t: x.t, pose: x.name });
const tH2 = tL + 2.35;
keyframes.push({ t: +tH2.toFixed(3), pose: `e${NH}` });
X.eased('e', FS.map((f) => f / FS[NH]), tH2, T.lower[1], true).slice(1).forEach((x) => keyframes.push(x));
keyframes.push({ t: D, pose: 'd0' });
const ex = H.module_(meta, F.contacts, poses, keyframes);
ex.props = [BB.barbellProp()];
const SKIP = /^(hand|thumb|forearm)_|^deltoid_|^chest$|^pecs_|^traps_/;
const sw = BB.sweep(ex, { skip: SKIP, probe: (W, pz, t, o) => { const g = EQ.barGeometry(EQ.barAt(W, BB.GRIP)); let hd = 1e9; for (const [a, b, r] of g.caps.slice(0, 1)) for (const id of ['head', 'jaw', 'nose', 'neck']) { const c = EQ.segmentClear(W, a, b, r, { skip: new RegExp(`^(?!${id}$)`) }); hd = Math.min(hd, c.d); } if (hd < (o.head ?? 1e9)) { o.head = hd; o.headAt = +t.toFixed(2); } } }, 1100);
const rest = BB.sweep(ex, {}, 300);
const jump = O.P.jumps(ex);
const Wn = (n) => L.fk(poses[n], F.contacts), Wf = Wn('d0'), Wc = Wn('absorb'), Wr = Wn('rack'), Wd = Wn('dip'), Wj = Wn('jcatch'), Wt = Wn('jstand');
const humElev = (Wx) => V.angle(V.sub(Wx.elbow_r.p, Wx.shoulder_r.p), V.sub(Wx.pelvis.p, Wx.neck_c7.p));
const bt = EQ.barAt(Wt, BB.GRIP), d = (v) => `≈${Math.round(v)}°`;
const set = H.setKin(ex);
set('Start', 'setup', `Plates on the floor; knees ${d(B.kneeOf(Wf, 'r'))}, hip channel ${d(poses.d0.ch.hip_r.flex)}, trunk ${d(B.trunkLean(Wf))} from vertical`); set('Start', 'peak', `Above the knees after the first pull: knees ${d(B.kneeOf(Wn(`d${NH}`), 'r'))}, trunk ${d(B.trunkLean(Wn(`d${NH}`)))}`);
set('Catch', 'setup', 'Second pull on the balls of the feet, bar to the lower chest with the elbows high'); set('Catch', 'peak', `Quarter squat, knees ${d(B.kneeOf(Wc, 'r'))}; bar on the front of the shoulders, elbows ${d(humElev(Wc))} from the trunk line`);
set('Jerk', 'setup', `Dip: knees ${d(B.kneeOf(Wd, 'r'))}, trunk upright, bar on the shoulders`); set('Jerk', 'peak', `Catch on locked arms (elbows ${d(B.elbowOf(Wj, 'r'))}) in a quarter squat, knees ${d(B.kneeOf(Wj, 'r'))}; standing: upper arm ${d(humElev(Wt))} from the trunk line, bar ${r1(bt.c[0] - O.MIDFOOT)} cm from mid-foot`);
set('Grip', 'setup', `Overhand, ${O.GW} cm between the handle centres`); set('Grip', 'peak', `Held: ${sw.width[0]}-${sw.width[1]} cm through the loop`);
set('Tempo', 'setup', `Set ${T.setup[1]} s, first pull ${r1(T.pull[1] - T.pull[0])} s, clean ${r1(T.clean[1] - T.clean[0])} s`); set('Tempo', 'peak', `Dip ${r1(T.dip[1] - T.dip[0])} s, drive and catch ${r1(T.jerk[1] - T.jerk[0])} s, recover ${r1(T.recover[1] - T.recover[0])} s, down to the floor ${r1(T.lower[1] - T.lower[0])} s`);
console.log(`Barbell Clean and Jerk: wrote ${L.write(ex)}\n  pitchB ${O.PITCH_B} maxErr ${Math.max(...Object.values(errs))} at ${Object.entries(errs).sort((a, b) => b[1] - a[1])[0]}\n  sweep ${JSON.stringify(sw)}\n  rest(nothing skipped) ${rest.barBody} at ${JSON.stringify(rest.barBodyAt)}, jump ${JSON.stringify(jump)}`);
const maxErr = Math.max(...Object.values(errs));
// the ext -> pull switch (elbow starts to bend off a straight arm) moves the hands by up to about 1.9 cm for ~5 ms between
// keys, as in author-barbell-clean-and-press.js; everywhere else the grip stays within about 1 cm
if (sw.widthRange > 2.0 || maxErr > 0.6) { console.error('FAIL: hands do not stay on the bar at a constant grip width'); process.exitCode = 1; }
if (sw.barFloor < -0.1 || sw.barBody < -0.3 || rest.barBody < -2 || sw.head < 0) { console.error('FAIL: bar or plates through the floor or the body'); process.exitCode = 1; }
if (sw.slide > 0.05) { console.error('FAIL: planted feet slide'); process.exitCode = 1; }
