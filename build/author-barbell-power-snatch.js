// Barbell Power Snatch (GymVisual #11621; page not readable here, movement from the name and standard coaching): from the
// floor with a wide snatch grip (90 cm between the handle centres: about 2.2 times the rig's shoulder width), feet hip
// width, toes out 8 degrees, planted throughout (heels rise in the jump). First pull with the back angle held to above the
// knees; jump: hips, knees and ankles extend onto the balls of the feet with a shrug as the bar reaches the hips; high pull
// with the elbows high and out (bar to the lower chest); turnover: the bar passes the face and the arms punch up to lock
// out overhead (palms up, bar over the back of the neck) as the lifter drops into a quarter squat; stand; lower the bar in
// front of the face and chest to the hips, then to the floor like a deadlift. b6-02.js oly() kit with the wide grip (both
// arms on the bar at every key and in-between key on one continuous branch). Rig limit: with the wide grip the hands sit
// low, so the floor start needs a little thoracic flexion (T12 10, T6 12 degrees) and shoulder-blade depression to keep
// the hip channel inside its 140 degree limit; a wider (110 cm) grip would need more hip flexion than the rig allows.
// Bilateral.
const L = require('./lib');
const { V, r1 } = L;
const B = require('./families/b3-back');
const BB = require('./families/barbell');
const EQ = require('./families/equip');
const H = require('./families/hips');
const X = require('./families/b5-bbhinge');
const W6 = require('./families/b6-02');
const meta = require('./meta/barbell-power-snatch.json');

const O = W6.oly({ GW: +(process.env.GW ?? 90), env: Object.assign({ PUP: 0.62, EO: 0.8, PDX: -1, PRANGE: '-20,200', EXM: 2, KNEE_B: 88, SPT12: 10, SPT6: 12, SCE: 8 }, process.env) });
const { F, flat, roll, sc, ARM, HANG, EXT, K, poses, errs, seq, state } = O;
const T = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, [p.start, p.end]])), D = meta.timeline.duration;
const FS = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.58, 0.65, 0.72], NH = FS.length - 1;
// wide-grip hang: start the first pull on the arm branch the lowering comes back on (elbow pits forward, wrist bent a
// little toward the thumb), so the loop closes without the humerus spinning half a turn
const HANG0 = Object.assign({}, HANG, { guesses: [[36, 84, 11, 8, 95, 3, 15]] });
FS.forEach((f, i) => O.addK(`d${i}`, O.solve(O.hingeCfg(f), HANG0, i > 0)));
const CFG = {
  ext: { feet: roll(24), knee: 6, pitch: 0, sc: sc(0, 14) },
  pull: { feet: roll(14), knee: 9, pitch: 1, sc: sc(0, 22) },
  catch: { feet: flat, knee: 44, pitch: -10, spine: { l5: -2, t12: 0, t6: 0 }, sc: sc(0, 24), neck: [-2, -2] },
  absorb: { feet: flat, knee: 48, pitch: -11, spine: { l5: -2, t12: 0, t6: 0 }, sc: sc(0, 24), neck: [-2, -2] },
  rise: { feet: flat, knee: 22, pitch: -5, sc: sc(0, 24), neck: [-2, -2] },
  top: { feet: flat, knee: 5, pitch: 0, sc: sc(0, 24), neck: [-2, -2] },
};
const pullSeq = X.eased('d', FS.map((f) => f / FS[NH]), T.pull[0], T.pull[1]).map((x) => ({ t: x.t, name: x.pose }));
pullSeq.push({ t: +(T.pull[1] + 0.03).toFixed(3), name: `d${NH}` });
const t0 = T.snatch[0];
let k = K[`d${NH}`];
k = O.link(k, 'ext', CFG.ext, EXT, [0.25, 0.5, 0.7, 0.85, 0.95], t0 + 0.03, t0 + 0.12);
k = O.link(k, 'pull', CFG.pull, ARM.pull, [0.025, 0.05, 0.08, 0.12, 0.17, 0.23, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9], t0 + 0.12, t0 + 0.25);
// turnover: the bar passes in front of the face (elbows high, palms turning up), then the arms punch up to the lockout
const FACE = { bar: (W) => X.touchAlong(W, [W.head_c1.p[0], O.S_(W)[1] + +(process.env.FY ?? 18), 0], [1, 0, 0], O.GW / 2 - 8, { margin: +(process.env.FM ?? 4), skip: O.touchSkip }), elbow: (W) => O.sphere(O.S_(W), [-0.1, 0.55, 0.85]), elbowW: 0.6, th: +(process.env.FTH ?? 150) };
CFG.face = { feet: flat, knee: 16, pitch: 0, sc: sc(0, 22), neck: [-4, -4] };
// (a rolling foot lerped to a flat one degenerates for heel pitches under about 2 degrees: in-betweens stop at 0.85)
k = O.link(k, 'face', CFG.face, FACE, [0.06, 0.13, 0.2, 0.28, 0.36, 0.45, 0.55, 0.65, 0.75, 0.85], t0 + 0.25, t0 + 0.36, true);
k = O.link(k, 'catch', CFG.catch, ARM.ptop, [0.06, 0.13, 0.2, 0.28, 0.32, 0.36, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.75, 0.85, 0.93], t0 + 0.36, t0 + 0.5, true);
k = O.link(k, 'absorb', CFG.absorb, ARM.ptop, 1, t0 + 0.5, T.snatch[1]);
k = O.link(k, 'rise', CFG.rise, ARM.ptop, 3, T.snatch[1], T.snatch[1] + 0.4);
k = O.link(k, 'top', CFG.top, ARM.ptop, 3, T.snatch[1] + 0.4, T.stand[1] - 0.2);
const up = [...pullSeq, ...seq];
// lowering: bar down in front of the face to the upper chest (elbows high and out), then to the hips (arms long), and the
// first pull in reverse to the floor
const S_ = O.S_, sphere = O.sphere;
const CHEST = { cfg: { feet: flat, knee: 10, pitch: 0, sc: sc(0, 16), neck: [-4, -4] }, arm: { bar: (W) => V.add(S_(W), [+(process.env.LCX ?? 20), +(process.env.LCY ?? -8), 0]), elbow: (W) => sphere(S_(W), [-0.2, 0.35, 0.9]), elbowW: 0.6, th: +(process.env.LTH ?? 200) } };
seq.length = 0;
const tL = T.lower[0];
k = O.link(K.top, 'lw1', CHEST.cfg, CHEST.arm, [0.08, 0.16, 0.22, 0.28, 0.32, 0.36, 0.4, 0.45, 0.5, 0.55, 0.65, 0.75, 0.85, 0.93], tL, tL + 0.6, true);
k = O.link(k, `e${NH}`, K[`d${NH}`].cfg, HANG, [0.08, 0.16, 0.25, 0.35, 0.45, 0.55, 0.65, 0.74, 0.82, 0.88, 0.93, 0.97, 0.99], tL + 0.6, tL + 1.3, true);
for (let i = NH - 1; i >= 0; i--) O.addK(`e${i}`, O.solve(K[`d${i}`].cfg, HANG, true));
const down = seq.slice();
const keyframes = [{ t: 0, pose: 'd0' }];
for (const x of up) keyframes.push({ t: x.t, pose: x.name });
keyframes.push({ t: T.stand[1], pose: 'top' });
for (const x of down) keyframes.push({ t: x.t, pose: x.name });
const tH2 = tL + 1.35;
keyframes.push({ t: +tH2.toFixed(3), pose: `e${NH}` });
X.eased('e', FS.map((f) => f / FS[NH]), tH2, T.lower[1], true).slice(1).forEach((x) => keyframes.push(x));
keyframes.push({ t: D, pose: 'd0' });
const ex = H.module_(meta, F.contacts, poses, keyframes);
ex.props = [BB.barbellProp()];
const SKIP = /^(hand|thumb|forearm)_/;
const sw = BB.sweep(ex, { skip: SKIP, probe: (W, pz, t, o) => { const g = EQ.barGeometry(EQ.barAt(W, BB.GRIP)); let hd = 1e9; for (const [a, b, r] of g.caps.slice(0, 1)) for (const id of ['head', 'jaw', 'nose', 'neck']) { const c = EQ.segmentClear(W, a, b, r, { skip: new RegExp(`^(?!${id}$)`) }); hd = Math.min(hd, c.d); } if (hd < (o.head ?? 1e9)) { o.head = hd; o.headAt = +t.toFixed(2); } } }, 1100);
const jump = O.P.jumps(ex);
const Wn = (n) => L.fk(poses[n], F.contacts), Wf = Wn('d0'), Wc = Wn('absorb'), Wt = Wn('top');
const humElev = (Wx) => V.angle(V.sub(Wx.elbow_r.p, Wx.shoulder_r.p), V.sub(Wx.pelvis.p, Wx.neck_c7.p));
const bt = EQ.barAt(Wt, BB.GRIP), d = (v) => `≈${Math.round(v)}°`;
const set = H.setKin(ex);
set('Start', 'setup', `Plates on the floor; knees ${d(B.kneeOf(Wf, 'r'))}, hip channel ${d(poses.d0.ch.hip_r.flex)}, trunk ${d(B.trunkLean(Wf))} from vertical`); set('Start', 'peak', `Above the knees after the first pull: knees ${d(B.kneeOf(Wn(`d${NH}`), 'r'))}, trunk ${d(B.trunkLean(Wn(`d${NH}`)))}`);
set('Catch', 'setup', 'Full extension on the balls of the feet, shrug, elbows high and out'); set('Catch', 'peak', `Quarter squat, knees ${d(B.kneeOf(Wc, 'r'))}, arms locked overhead (elbows ${d(B.elbowOf(Wc, 'r'))}); standing: upper arm ${d(humElev(Wt))} from the trunk line, bar ${r1(bt.c[0] - O.MIDFOOT)} cm from mid-foot`);
set('Grip', 'setup', `Wide snatch grip, ${O.GW} cm between the handle centres`); set('Grip', 'peak', `Held: ${sw.width[0]}-${sw.width[1]} cm through the loop`);
set('Tempo', 'setup', `Set ${T.setup[1]} s, first pull ${r1(T.pull[1] - T.pull[0])} s`); set('Tempo', 'peak', `Jump and catch ${r1(T.snatch[1] - T.snatch[0])} s, stand ${r1(T.stand[1] - T.stand[0])} s, down ${r1(T.lower[1] - T.lower[0])} s`);
const maxErr = Math.max(...Object.values(errs));
console.log(`Barbell Power Snatch: wrote ${L.write(ex)}\n  pitchB ${O.PITCH_B} maxErr ${maxErr} at ${Object.entries(errs).sort((a, b) => b[1] - a[1])[0]}\n  sweep ${JSON.stringify(sw)}\n  jump ${JSON.stringify(jump)}`);
// the ext -> pull switch moves the hands by up to about 2 cm for a few ms between keys (as in the clean and press)
if (sw.widthRange > 2.0 || maxErr > 0.6) { console.error('FAIL: hands do not stay on the bar at a constant grip width'); process.exitCode = 1; }
if (sw.barFloor < -0.1 || sw.barBody < -0.3 || sw.head < 0) { console.error('FAIL: bar or plates through the floor or the body'); process.exitCode = 1; }
if (sw.slide > 0.05) { console.error('FAIL: planted feet slide'); process.exitCode = 1; }
