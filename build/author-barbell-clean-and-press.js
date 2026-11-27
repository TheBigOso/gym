// Barbell Clean and Press (GymVisual "Barbell Clean and Press", movement reference only): power clean from the floor and a
// strict overhead press. Feet hip width, toes out 8 degrees; overhand grip just outside the shoulders (58 cm between the
// handle centres), held the whole rep. Start like a deadlift (plates on the floor, shins to the bar, hips above the knees,
// flat back); first pull to mid-thigh with the back angle held; second pull: hips, knees and ankles extend (onto the balls
// of the feet) with a shrug, the bar rising close to the body to the lower chest with the elbows high and out; turnover: the
// elbows whip round and the bar is caught at the front of the shoulders in a quarter squat (press start: palms forward,
// forearms about vertical under the bar); stand tall; press the bar past the face (head back a little) to straight arms
// overhead, bar over the shoulders; lower to the shoulders, then down in front of the chest and waist to the thighs, and to
// the floor like a deadlift. Bodies from the power family (b4-power.js body / lerpCfg: flat or
// rolling feet), the floor pull from the balanced barbell hinge; both arms solved onto the bar at every key and in-between
// key (barbell.js armsOnBar) on one continuous branch, so the grip width stays constant. Bilateral.
const L = require('./lib');
const { V, Q, r1, clone } = L;
const P = require('./families/b4-power');
const B = require('./families/b3-back');
const BB = require('./families/barbell');
const EQ = require('./families/equip');
const H = require('./families/hips');
const X = require('./families/b5-bbhinge');
const meta = require('./meta/barbell-clean-and-press.json');

const F = P.makeFamily({ toe: 8, half: 12 });
const GW = +(process.env.GW ?? 58), KG = 30, MIDFOOT = 5, UAL = V.len(L.rig.byId.elbow_r.offset) - 0.1;
const flat = { r: { c: 'flat', x: 0 }, l: { c: 'flat', x: 0 } };
const roll = (pitch) => ({ r: { c: 'roll', pitch, ballX: F.BALL_X }, l: { c: 'roll', pitch, ballX: F.BALL_X } });
const THUMB = [0, 0, -1];
const sphere = (S, d) => V.add(S, V.scale(V.norm(d), UAL));
const straight = [(W, qq) => [(qq.ch.elbow_r.flex - 4) * 0.3]];
// overhand the whole rep: the right thumb points to the midline (never flips to an underhand hold)
const thumbIn = (W) => V.sub(Q.rot(W.wrist_r.q, [0, 0, 1]), [0, 0, -1]).map((v) => v * +(process.env.TW ?? 3));   // and along the bar

/* ---- first pull: balanced deadlift hinge (as author-barbell-deadlift.js), turned into body configs ---- */
const st0 = {};
const hingeArms = (p) => { const q = X.hangBar(p, F.contacts, { gw: GW, clear: 0.8, state: st0 }); delete q.__bar; return q; };
const sp = (g) => ({ l5: r1(-3 * g), t12: 0, t6: r1(1 * g) }), scH = (g) => ({ protract: r1(6 * g), elevate: r1(-2 - 4 * g) });
const hinge = (pitch, knee, g) => B.hinge(F, { pitch: r1(pitch), knee: r1(knee), feet: flat, spine: sp(g), sc: scH(g), kg: KG, midfoot: MIDFOOT, arms: hingeArms });
const KNEE_B = 78, KNEE_T = 4;
let pa = -20, pb = -75;
for (let i = 0; i < 22; i++) { const pm = (pa + pb) / 2, r = hinge(pm, KNEE_B, 1); if (EQ.barMinY(r.W, { grip: BB.GRIP }) > 0.05) pa = pm; else pb = pm; }
const PITCH_B = r1((pa + pb) / 2);
function hingeCfg(f) {
  const gk = 1 - Math.pow(1 - f, 1.7), gp = Math.pow(f, 1.5), g = 1 - f, pitch = PITCH_B * (1 - gp), knee = KNEE_B + (KNEE_T - KNEE_B) * gk;
  const r = hinge(pitch, knee, g);
  return { feet: flat, knee: r1(knee), pitch: r1(pitch), x: r.spec.root[0], spine: sp(g), sc: scH(g), neck: [r.pose.ch.neck_c7.flex, r.pose.ch.head_c1.flex] };
}

/* ---- arm specs: bar centre (world) and elbow hint for a body pose ---- */
const S_ = (W) => W.shoulder_r.p;
const touchSkip = /^(hand|thumb|forearm|upperarm|biceps|triceps)_/;
// bar pushed forward until the shaft between the hands clears the whole body (pelvis and belly too, not only the legs)
function clearFwd(W, c, margin = 0.8) { const q = c.slice(), half = GW / 2 - 6; for (let i = 0; i < 40; i++) { if (EQ.segmentClear(W, [q[0], q[1], -half], [q[0], q[1], half], EQ.BAR.shaftR, { skip: touchSkip }).d >= margin) break; q[0] += 0.5; } return q; }
// with a straight elbow the humeral rotation and the forearm pronation trade off freely; hold the split the bent arm needs
// later (pronation about PRON_H) so the arm does not spin when the elbow starts to bend
const PRON_H = +(process.env.PH ?? 100), PRON_T = +(process.env.PT ?? 85);
const splitAt = (v) => (W, qq) => [(qq.ch.wrist_r.pron - v) * 0.05];
const HANG = { bar: (W, p) => clearFwd(W, X.hangPlace(p, F.contacts, { gw: GW, clear: 1.0 }), 1.5), th: 180, extra: [...straight, splitAt(PRON_H)] };
const ARM = {
  hang: HANG,
  // high pull: bar close to the lower chest, elbows high and out above the bar
  pull: { bar: (W) => X.touchAlong(W, V.lerp(W.pelvis.p, W.neck_c7.p, 0.66).map((v, i) => (i === 2 ? 0 : v)), [1, 0, 0], GW / 2 - 8, { margin: 1.5, skip: touchSkip }), elbow: (W) => sphere(S_(W), [-0.35, 0.3, +(process.env.EO ?? 0.6)]), elbowW: 0.8, th: +(process.env.THP ?? 205) },
  // rack (press start): bar at the front of the shoulders, forearms about vertical under it, elbows a little forward and out
  rack: { bar: (W) => V.add(X.touchAlong(W, [S_(W)[0] - 4, S_(W)[1] + +(process.env.RY ?? 1), 0], [1, 0, 0], GW / 2 - 9, { margin: +(process.env.RM ?? 9), skip: touchSkip }), [0, 0, 0]), elbow: (W, c) => [c[0] - 1, c[1] - L.FA - 3, GW / 2 + 1], elbowW: 0.6, th: +(process.env.THR ?? 25) },
  // mid press: bar in front of the forehead (head back a little), forearms about vertical under it
  pmid: { bar: (W) => X.touchAlong(W, [W.head_c1.p[0], S_(W)[1] + 17, 0], [1, 0, 0], GW / 2 - 8, { margin: 2.5, skip: touchSkip }), elbow: (W) => sphere(S_(W), [0.3, 0.05, 0.95]), elbowW: 0.6, th: +(process.env.THM ?? 30) },
  // overhead: straight arms, bar over the shoulder joints
  ptop: { bar: (W, p) => { const S = S_(W), r = BB.reachG(p, 4) - 0.5, dz = GW / 2 - S[2], dx = 1; return [S[0] + dx, S[1] + Math.sqrt(r * r - dz * dz - dx * dx), 0]; }, th: 90, extra: [...straight, splitAt(PRON_T)] },
};
const state = {};
function solve(cfg, arm, keep) {
  const b = P.body(F, cfg); delete b.__spec;
  const W = L.fk(b, F.contacts), c = arm.bar(W, b), E = arm.elbow ? arm.elbow(W, c) : null;
  c[2] = W.pelvis.p[2];   // the bar stays centred on the body
  state.keep = keep; state.nearest = keep;   // keyed solves pick the solution nearest the previous arm
  const th = arm.th * Math.PI / 180, palm = [Math.cos(th), Math.sin(th), 0];   // palm turned th degrees about the bar (180: facing back)
  const q = X.barArms(b, c, GW, { palm, thumb: THUMB, elbow: E, elbowW: arm.elbowW ?? 0.5, dirW: arm.pdw ?? +(process.env.PDW ?? 4), wristW: arm.wristW ?? 0.2, wflex: [-80, 70], lambda: +(process.env.LAM ?? 5e-4), extra: [...(arm.extra || []), thumbIn], guesses: arm.guesses }, state);
  const Wq = L.fk(q, F.contacts), S = S_(Wq);
  return { pose: X.wrapBody(q), guess: state.guess.slice(), cfg, rel: V.sub(c, S), e: V.norm(V.sub(Wq.elbow_r.p, S)), th: (() => { const pm = Q.rot(Wq.wrist_r.q, [1, 0, 0]); let a = Math.atan2(pm[1], pm[0]) * 180 / Math.PI; return a + 360 * Math.round((arm.th - a) / 360); })(), err: state.last, straight: !!arm.extra };   // th: the palm angle actually reached
}
// in-between keys from solved key A to solved key B: body config lerped, bar centre and elbow direction interpolated
// relative to the shoulder, palm angle about the bar interpolated; each solved from the previous branch
function between(A, Bk, n) {
  const out = [], fr = Array.isArray(n) ? n : Array.from({ length: n }, (_, i) => (i + 1) / (n + 1));
  for (const f of fr) {
    const cfg = P.lerpCfg(A.cfg, Bk.cfg, f);
    // bar relative to the shoulder: direction slerped and distance lerped (a chord would pull straight arms short)
    const rel = V.scale(X.slerpV(A.rel, Bk.rel, f), V.len(A.rel) + (V.len(Bk.rel) - V.len(A.rel)) * f);
    const arm = { bar: (W) => V.add(S_(W), rel), elbow: (W) => sphere(S_(W), X.slerpV(A.e, Bk.e, f)), elbowW: +(process.env.BEW ?? 0.25), th: A.th + (Bk.th - A.th) * f, pdw: +(process.env.MPDW ?? 4), extra: A.straight && Bk.straight ? [...straight, splitAt(A.cfg.feet && Bk.cfg.knee < 6 && A.cfg.knee < 6 ? PRON_T : PRON_H)] : [] };
    out.push(solve(cfg, arm, true));
  }
  return out;
}
const poses = {}, errs = {}, K = {}, seq = [];
function addK(name, k, t) { K[name] = k; poses[name] = k.pose; errs[name] = +(k.err ?? 0).toFixed(2); if (t != null) seq.push({ t: +t.toFixed(3), name }); return k; }
// chain: solve key B, then the in-betweens from A's branch, then re-solve B from the last in-between branch
function link(A, nameB, cfgB, armB, n, tA, tB) {
  const g0 = A.guess.slice();
  solve(cfgB, armB, false);                 // B alone, to find its targets
  const Bk0 = solve(cfgB, armB, true);
  state.guess = g0;
  const mids = between(A, Bk0, n);
  const fr = Array.isArray(n) ? n : Array.from({ length: n }, (_, i) => (i + 1) / (n + 1));
  mids.forEach((m, i) => addK(`${nameB}_${i}`, m, tA + (tB - tA) * fr[i]));
  return addK(nameB, solve(cfgB, armB, true), tB);
}
/* ---- the rep ---- */
const T = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, [p.start, p.end]])), D = meta.timeline.duration;
const FS = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.62], NH = FS.length - 1;
FS.forEach((f, i) => addK(`d${i}`, solve(hingeCfg(f), HANG, i > 0)));
const sc = (protract, elevate) => ({ protract, elevate });
const CFG = {
  ext: { feet: roll(24), knee: 6, pitch: 0, sc: sc(0, 14) },
  pull: { feet: roll(14), knee: 9, pitch: 1, sc: sc(0, 18) },
  catch: { feet: flat, knee: 46, pitch: -12, spine: { l5: -2, t12: 0, t6: 0 }, sc: sc(4, 8) },
  absorb: { feet: flat, knee: 50, pitch: -13, spine: { l5: -2, t12: 0, t6: 0 }, sc: sc(4, 8) },
  rise: { feet: flat, knee: 24, pitch: -6, sc: sc(4, 8) },
  rack: { feet: flat, knee: 5, pitch: 0, sc: sc(4, 8), neck: [0, 0] },
  pmid: { feet: flat, knee: 5, pitch: 1, sc: sc(2, 14), neck: [-8, -10] },
  ptop: { feet: flat, knee: 5, pitch: 0, sc: sc(0, 24), neck: [-2, -2] },
};
// first pull: eased in time
const pullSeq = X.eased('d', FS.map((f) => f / FS[NH]), T.pull[0], T.pull[1]).map((x) => ({ t: x.t, name: x.pose }));
pullSeq.push({ t: +(T.pull[1] + 0.03).toFixed(3), name: `d${NH}` });   // a moment in the power position before the jump
const t0 = T.clean[0];
let k = K[`d${NH}`];
// extension: the bar a few cm off the hips (arms hang a little forward, away from the shoulder singularity)
const EXT = Object.assign({}, HANG, { bar: (W, p) => clearFwd(W, X.hangPlace(p, F.contacts, { gw: GW, clear: 1.0 }), +(process.env.EXM ?? 4)) });
k = link(k, 'ext', CFG.ext, EXT, [0.25, 0.5, 0.7, 0.85, 0.95], t0 + 0.03, t0 + 0.12);
k = link(k, 'pull', CFG.pull, ARM.pull, [0.025, 0.05, 0.08, 0.12, 0.17, 0.23, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9], t0 + 0.12, t0 + 0.24);   // dense where the elbow starts to bend
// turnover: the in-between keys carry the bar from the chest to the shoulders while the palms turn from facing back to
// facing forward (palm angle interpolated), dense where the elbows whip round
k = link(k, 'catch', CFG.catch, ARM.rack, [0.04, 0.09, 0.15, 0.25, 0.37, 0.5, 0.63, 0.76, 0.88], t0 + 0.24, t0 + 0.46);
k = link(k, 'absorb', CFG.absorb, ARM.rack, 1, t0 + 0.46, t0 + 0.65);
k = link(k, 'rise', CFG.rise, ARM.rack, 2, t0 + 0.65, t0 + 1.05);
k = link(k, 'rack', CFG.rack, ARM.rack, 2, t0 + 1.05, T.stand[1]);
k = link(k, 'pmid', CFG.pmid, ARM.pmid, 5, T.press[0], T.press[0] + 0.5);
k = link(k, 'ptop', CFG.ptop, ARM.ptop, 4, T.press[0] + 0.5, T.press[1]);
const up = [...pullSeq, ...seq];
// lowering from the rack to the mid-thigh hang: the elbows open and the bar comes down in front of the chest and the waist
// (overhand, palms turning down, then back) to the hang; then the first pull in reverse, re-solved on that arm branch
const tR = T.lockout[1] + (T.press[1] - T.press[0]), tL = tR + 0.2, tH = tL + 0.85;
const LOWER = {
  chest: { cfg: { feet: flat, knee: 8, pitch: -1, sc: sc(3, 4) }, arm: { bar: (W) => V.add(S_(W), [+(process.env.L1X ?? 24), +(process.env.L1Y ?? -14), 0]), elbow: (W, c) => [c[0] - 4, c[1] - L.FA, GW / 2 + 2], elbowW: 0.5, th: +(process.env.TL1 ?? 0) } },
  waist: { cfg: { feet: flat, knee: 12, pitch: -6, sc: sc(3, 0) }, arm: { bar: (W) => V.add(S_(W), [+(process.env.L2X ?? 30), +(process.env.L2Y ?? -36), 0]), elbow: (W) => sphere(S_(W), [0.15, -1, 0.2]), elbowW: 0.5, th: +(process.env.TL2 ?? -80) } },
};
seq.length = 0;
state.guess = K.rack.guess.slice();
k = link(K.rack, 'lw1', LOWER.chest.cfg, LOWER.chest.arm, 5, tL, tL + 0.3);
k = link(k, 'lw2', LOWER.waist.cfg, LOWER.waist.arm, 5, tL + 0.3, tL + 0.6);
k = link(k, `e${NH}`, K[`d${NH}`].cfg, Object.assign({}, HANG, { th: -180 }), 5, tL + 0.6, tH);
for (let i = NH - 1; i >= 0; i--) addK(`e${i}`, solve(K[`d${i}`].cfg, Object.assign({}, HANG, { th: -180 }), true));
const downR = [{ t: +tL.toFixed(3), name: 'rack' }, ...seq];
// timeline
const keyframes = [{ t: 0, pose: 'd0' }];
for (const x of up) keyframes.push({ t: x.t, pose: x.name });
keyframes.push({ t: T.lockout[1], pose: 'ptop' });
const pressKeys = up.filter((x) => x.t > T.press[0] && x.t < T.press[1]);
for (const x of pressKeys.slice().reverse()) keyframes.push({ t: +(T.lockout[1] + (T.press[1] - x.t)).toFixed(3), pose: x.name });
keyframes.push({ t: +tR.toFixed(3), pose: 'rack' });
for (const x of downR) keyframes.push({ t: x.t, pose: x.name });
// first pull in reverse (re-solved keys e5 .. e0) back down to the floor
const tH2 = tH + 0.05;
keyframes.push({ t: +tH2.toFixed(3), pose: `e${NH}` });
X.eased('e', FS.map((f) => f / FS[NH]), tH2, T.lower[1], true).slice(1).forEach((x) => keyframes.push(x));
keyframes.push({ t: D, pose: 'd0' });

const ex = H.module_(meta, F.contacts, poses, keyframes);
ex.props = [BB.barbellProp()];
// whole loop: grip width, plates, bar vs body (the racked bar rests on the deltoids and the top of the chest, so those are
// skipped in the main check and reported separately), planted feet
const SKIP = /^(hand|thumb|forearm)_|^deltoid_|^chest$|^pecs_|^traps_/;
const sw = BB.sweep(ex, { skip: SKIP, probe: (W, pz, t, o) => { const g = EQ.barGeometry(EQ.barAt(W, BB.GRIP)); let hd = 1e9; for (const [a, b, r] of g.caps.slice(0, 1)) for (const id of ['head', 'jaw', 'nose', 'neck']) { const c = EQ.segmentClear(W, a, b, r, { skip: new RegExp(`^(?!${id}$)`) }); hd = Math.min(hd, c.d); } if (hd < (o.head ?? 1e9)) { o.head = hd; o.headAt = +t.toFixed(2); } } }, 900);
const rest = BB.sweep(ex, {}, 300);
const jump = P.jumps(ex);
const W = (n) => L.fk(poses[n], F.contacts), Wf = W('d0'), Wc = W('absorb'), Wr = W('rack'), Wt = W('ptop');
const humElev = (Wx) => V.angle(V.sub(Wx.elbow_r.p, Wx.shoulder_r.p), V.sub(Wx.pelvis.p, Wx.neck_c7.p));
const bt = EQ.barAt(Wt, BB.GRIP), br = EQ.barAt(Wr, BB.GRIP);
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Start', 'setup', `Plates on the floor; knees ${d(B.kneeOf(Wf, 'r'))}, hip channel ${d(poses.d0.ch.hip_r.flex)}, trunk ${d(B.trunkLean(Wf))} from vertical`); set('Start', 'peak', `Mid-thigh after the first pull: knees ${d(B.kneeOf(W(`d${NH}`), 'r'))}, trunk ${d(B.trunkLean(W(`d${NH}`)))}`);
set('Catch', 'setup', `Second pull on the balls of the feet, bar to the lower chest with the elbows high`); set('Catch', 'peak', `Quarter squat, knees ${d(B.kneeOf(Wc, 'r'))}; bar on the front of the shoulders, elbows ${d(humElev(Wc))} from the trunk line`);
set('Press', 'setup', `Rack: bar ${r1(br.c[0] - Wr.shoulder_r.p[0])} cm in front of the shoulder joints, elbows ${d(B.elbowOf(Wr, 'r'))}`); set('Press', 'peak', `Overhead: upper arm ${d(humElev(Wt))} from the trunk line, elbows ${d(B.elbowOf(Wt, 'r'))}, bar ${r1(bt.c[0] - MIDFOOT)} cm from mid-foot`);
set('Grip', 'setup', `Overhand, ${GW} cm between the handle centres`); set('Grip', 'peak', `Held: ${sw.width[0]}-${sw.width[1]} cm through the loop`);
set('Tempo', 'setup', `Set ${T.setup[1]} s, first pull ${r1(T.pull[1] - T.pull[0])} s, jump and catch ${r1(T.clean[1] - T.clean[0])} s`); set('Tempo', 'peak', `Press ${r1(T.press[1] - T.press[0])} s, lockout ${r1(T.lockout[1] - T.lockout[0])} s, down to the floor ${r1(T.lower[1] - T.lower[0])} s`);
console.log(`Barbell Clean and Press: wrote ${L.write(ex)}\n  bottom pitch ${PITCH_B}, errs ${JSON.stringify(errs)}\n  sweep ${JSON.stringify(sw)}\n  rest(nothing skipped) ${rest.barBody} at ${JSON.stringify(rest.barBodyAt)}, jump ${JSON.stringify(jump)}`);
const maxErr = Math.max(...Object.values(errs));
// the turnover and the extension next to the arm-hanging singularity keep the grip within about 1.2 cm (verify allows 1.5)
if (sw.widthRange > 1.3 || maxErr > 0.6) { console.error('FAIL: hands do not stay on the bar at a constant grip width'); process.exitCode = 1; }
if (sw.barFloor < -0.1 || sw.barBody < -0.3 || rest.barBody < -2 || sw.head < 0) { console.error('FAIL: bar or plates through the floor or the body'); process.exitCode = 1; }
if (sw.slide > 0.05) { console.error('FAIL: planted feet slide'); process.exitCode = 1; }
