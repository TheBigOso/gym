// Push Press (GymVisual 1410, movement reference only; page not readable at authoring time): barbell on the front of the
// shoulders (overhand grip just outside the shoulders, 58 cm between the handle centres, held the whole rep), feet hip
// width, toes out 8 degrees. Short upright dip (knees about 40 degrees, trunk vertical, heels down), explosive drive up
// onto the balls of the feet that launches the bar off the shoulders, press through past the face (head back a little)
// to straight arms overhead with the heels back down, then lower the bar under control to the shoulders, softening the
// knees to cushion it. Bilateral. Bodies and arm solves from author-barbell-clean-and-press.js (b4-power.js body /
// lerpCfg: flat or rolling feet; both arms solved onto the bar at every key and in-between key on one continuous branch,
// so the grip width stays constant).
const L = require('./lib');
const { V, Q, r1 } = L;
const P = require('./families/b4-power');
const B = require('./families/b3-back');
const BB = require('./families/barbell');
const EQ = require('./families/equip');
const H = require('./families/hips');
const X = require('./families/b5-bbhinge');
const meta = require('./meta/push-press.json');

const F = P.makeFamily({ toe: 8, half: 12 });
const GW = +(process.env.GW ?? 58), KG = 30, MIDFOOT = 5, UAL = V.len(L.rig.byId.elbow_r.offset) - 0.1;
const flat = { r: { c: 'flat', x: 0 }, l: { c: 'flat', x: 0 } };
const roll = (pitch) => ({ r: { c: 'roll', pitch, ballX: F.BALL_X }, l: { c: 'roll', pitch, ballX: F.BALL_X } });
const THUMB = [0, 0, -1];
const sphere = (S, d) => V.add(S, V.scale(V.norm(d), UAL));
const straight = [(W, qq) => [(qq.ch.elbow_r.flex - 4) * 0.3]];
// overhand the whole rep: the right thumb points to the midline (never flips to an underhand hold)
const thumbIn = (W) => V.sub(Q.rot(W.wrist_r.q, [0, 0, 1]), [0, 0, -1]).map((v) => v * +(process.env.TW ?? 3));   // and along the bar

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
const sc = (protract, elevate) => ({ protract, elevate });
const DIP = +(process.env.DIP ?? 40);
const CFG = {
  rack: { feet: flat, knee: 5, pitch: 0, sc: sc(4, 8), neck: [0, 0] },
  dip: { feet: flat, knee: DIP, pitch: 0, spine: { l5: -1, t12: 0, t6: 0 }, sc: sc(4, 8), neck: [0, 0] },
  drive: { feet: roll(16), knee: 5, pitch: 0, sc: sc(3, 12), neck: [-6, -8] },
  pmid: { feet: flat, knee: 5, pitch: 1, sc: sc(2, 16), neck: [-8, -10] },
  ptop: { feet: flat, knee: 5, pitch: 0, sc: sc(0, 24), neck: [-2, -2] },
  catch: { feet: flat, knee: 14, pitch: 0, sc: sc(4, 8), neck: [0, 0] },
};
// drive: the bar just off the shoulders, in front of the chin
const DRIVE = { bar: (W) => X.touchAlong(W, [W.head_c1.p[0], S_(W)[1] + 8, 0], [1, 0, 0], GW / 2 - 8, { margin: 2.5, skip: touchSkip }), elbow: (W) => sphere(S_(W), [0.55, -0.2, 0.8]), elbowW: 0.6, th: +(process.env.THD ?? 28) };
// bar-on-the-shoulders keys (rack, dip, catch): the in-between keys use the same rack arm spec as the keys (body config
// lerped), each solved from the previous branch, so neighbouring keys land on the same arm solution
function linkR(A, nameB, cfgB, n, tA, tB, reuse = false) {
  const fr = Array.from({ length: n }, (_, i) => (i + 1) / (n + 1));
  state.guess = A.guess.slice();
  fr.forEach((f, i) => addK(`${nameB}_${i}`, solve(P.lerpCfg(A.cfg, cfgB, f), ARM.rack, true), tA + (tB - tA) * f));
  if (reuse) { seq.push({ t: +tB.toFixed(3), name: nameB }); return K[nameB]; }
  return addK(nameB, solve(cfgB, ARM.rack, true), tB);
}
let k = addK('rack', solve(CFG.rack, ARM.rack, false));
state.guess = k.guess.slice(); k = addK('rack', solve(CFG.rack, ARM.rack, true));
k = linkR(k, 'dip', CFG.dip, 3, T.dip[0], T.dip[1]);
k = link(k, 'drive', CFG.drive, DRIVE, 2, T.dip[1], T.drive[1]);
k = link(k, 'pmid', CFG.pmid, ARM.pmid, 3, T.drive[1], T.press[0] + 0.2);
k = link(k, 'ptop', CFG.ptop, ARM.ptop, [0.15, 0.3, 0.45, 0.6, 0.72, 0.82, 0.9, 0.96], T.press[0] + 0.2, T.press[1]);
// retime the press keys so the elbow straightens at an even rate (the in-betweens are spaced by bar distance, which
// bunches the last 30 degrees of elbow extension into a few hundredths of a second)
function retime(list, names, tA, tB) {
  const e = names.map((n) => poses[n].ch.elbow_r.flex), e0 = e[0], eN = e[e.length - 1];
  for (const x of list) { const i = names.indexOf(x.name); if (i > 0) x.t = +(tA + (tB - tA) * (e0 - e[i]) / (e0 - eN)).toFixed(3); }
}
const PRESS = ['pmid', ...Array.from({ length: 8 }, (_, i) => `ptop_${i}`), 'ptop'];
retime(seq, PRESS, T.press[0] + 0.2, T.press[1]);
const up = seq.slice();
// lowering: overhead -> past the face -> onto the shoulders with soft knees (catch) -> stand tall in the rack
seq.length = 0;
state.guess = K.ptop.guess.slice();
k = link(K.ptop, 'lmid', Object.assign({}, CFG.pmid, { feet: flat }), ARM.pmid, [0.04, 0.1, 0.18, 0.28, 0.4, 0.55, 0.7, 0.85], T.lower[0], T.lower[0] + 0.6);
// the catch key is solved from the rack branch first (bar back on the shoulders exactly as in the rack); the in-between
// keys then interpolate the arm targets from the mid press down to it
{
  const A = k, gA = A.guess.slice();
  state.guess = K.rack.guess.slice();
  const Bk = solve(CFG.catch, ARM.rack, true);
  state.guess = gA;
  const fr = [0.15, 0.3, 0.45, 0.6, 0.72, 0.82, 0.9, 0.96], tA = T.lower[0] + 0.6, tB = T.lower[1] - 0.15;
  between(A, Bk, fr).forEach((m, i) => addK(`lcatch_${i}`, m, tA + (tB - tA) * fr[i]));
  k = addK('lcatch', Bk, tB);
}
k = linkR(k, 'rack', CFG.rack, 2, T.lower[1] - 0.15, T.reset[0] + 0.5, true);
{ const LOW = ['ptop', ...Array.from({ length: 8 }, (_, i) => `lmid_${i}`), 'lmid'], e = LOW.map((n) => poses[n].ch.elbow_r.flex), tA = T.lower[0], tB = T.lower[0] + 0.6;
  for (const x of seq) { const i = LOW.indexOf(x.name); if (i > 0) x.t = +(tA + (tB - tA) * (e[i] - e[0]) / (e[e.length - 1] - e[0])).toFixed(3); } }
const down = seq.slice();
const keyframes = [{ t: 0, pose: 'rack' }, { t: T.setup[1], pose: 'rack' }];
for (const x of up) keyframes.push({ t: x.t, pose: x.name });
keyframes.push({ t: T.lockout[1], pose: 'ptop' });
for (const x of down) keyframes.push({ t: x.t, pose: x.name });
keyframes.push({ t: D, pose: 'rack' });

// forearm rotation: the solves keep one continuous branch, which can sit a whole turn up; shift every pose by the same
// whole turns so the channel lies in the schema range (interpolation unchanged)
{ const all = Object.values(poses).flatMap((p) => ['wrist_r', 'wrist_l'].map((j) => p.ch[j].pron)), turns = Math.round((Math.min(...all) + Math.max(...all)) / 2 / 360);
  if (turns) for (const p of Object.values(poses)) for (const j of ['wrist_r', 'wrist_l']) p.ch[j].pron = r1(p.ch[j].pron - 360 * turns); }
const ex = H.module_(meta, F.contacts, poses, keyframes);
ex.props = [BB.barbellProp()];
const SKIP = /^(hand|thumb|forearm)_|^deltoid_|^chest$|^pecs_|^traps_/;
const sw = BB.sweep(ex, { skip: SKIP, probe: (W, pz, t, o) => { const g = EQ.barGeometry(EQ.barAt(W, BB.GRIP)); let hd = 1e9; for (const [a, b, r] of g.caps.slice(0, 1)) for (const id of ['head', 'jaw', 'nose', 'neck']) { const c = EQ.segmentClear(W, a, b, r, { skip: new RegExp(`^(?!${id}$)`) }); hd = Math.min(hd, c.d); } if (hd < (o.head ?? 1e9)) { o.head = hd; o.headAt = +t.toFixed(2); } } }, 900);
const rest = BB.sweep(ex, {}, 300);
const jump = P.jumps(ex);
const W = (n) => L.fk(poses[n], F.contacts), Wr = W('rack'), Wd = W('dip'), Wv = W('drive'), Wt = W('ptop');
const humElev = (Wx) => V.angle(V.sub(Wx.elbow_r.p, Wx.shoulder_r.p), V.sub(Wx.pelvis.p, Wx.neck_c7.p));
const bt = EQ.barAt(Wt, BB.GRIP), br = EQ.barAt(Wr, BB.GRIP), bv = EQ.barAt(Wv, BB.GRIP);
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Dip', 'setup', `Rack: knees ${d(B.kneeOf(Wr, 'r'))}, bar ${r1(br.c[0] - Wr.shoulder_r.p[0])} cm in front of the shoulder joints`); set('Dip', 'peak', `Knees ${d(B.kneeOf(Wd, 'r'))}, trunk ${d(B.trunkLean(Wd))} from vertical, pelvis ${r1(Wr.pelvis.p[1] - Wd.pelvis.p[1])} cm lower`);
set('Drive', 'setup', 'From the bottom of the dip'); set('Drive', 'peak', `Knees ${d(B.kneeOf(Wv, 'r'))}, heels up (foot pitch ${CFG.drive.feet.r.pitch}°), bar ${r1(bv.c[1] - br.c[1])} cm off the shoulders`);
set('Press', 'setup', `Rack: elbows ${d(B.elbowOf(Wr, 'r'))}`); set('Press', 'peak', `Overhead: upper arm ${d(humElev(Wt))} from the trunk line, elbows ${d(B.elbowOf(Wt, 'r'))}, bar ${r1(bt.c[0] - MIDFOOT)} cm from mid-foot`);
set('Grip', 'setup', `Overhand, ${GW} cm between the handle centres`); set('Grip', 'peak', `Held: ${sw.width[0]}-${sw.width[1]} cm through the loop`);
set('Tempo', 'setup', `Rack ${T.setup[1]} s, dip ${r1(T.dip[1] - T.dip[0])} s, drive ${r1(T.drive[1] - T.drive[0])} s`); set('Tempo', 'peak', `Press ${r1(T.press[1] - T.press[0])} s, lockout ${r1(T.lockout[1] - T.lockout[0])} s, lower ${r1(T.lower[1] - T.lower[0])} s`);
console.log(`Push Press: wrote ${L.write(ex)}\n  errs ${JSON.stringify(errs)}\n  sweep ${JSON.stringify(sw)}\n  rest(nothing skipped) ${rest.barBody} at ${JSON.stringify(rest.barBodyAt)}, jump ${JSON.stringify(jump)}`);
const maxErr = Math.max(...Object.values(errs));
if (sw.widthRange > 1.3 || maxErr > 0.6) { console.error('FAIL: hands do not stay on the bar at a constant grip width'); process.exitCode = 1; }
if (sw.barFloor < -0.1 || sw.barBody < -0.3 || rest.barBody < -2 || sw.head < 0) { console.error('FAIL: bar or plates through the floor or the body'); process.exitCode = 1; }
if (sw.slide > 0.05) { console.error('FAIL: planted feet slide'); process.exitCode = 1; }
