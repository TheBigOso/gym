// Barbell Curl Press Extension (GymVisual #14937 "Barbell Curl Press Extension (male)"; page not readable here, movement from
// the name and standard coaching): a standing arm complex with one underhand (supinated) grip about shoulder width (40 cm
// between the handle centres). From the bar hanging at the thighs: curl it to the shoulders with the elbows at the sides; press
// it overhead (palms still facing back, bar path pushed just far enough forward to pass the face) to straight arms; keep the
// upper arms beside the head and bend only the elbows to lower the bar behind the head (overhead triceps extension), extend
// back up; then reverse: lower to the shoulders and uncurl to the thighs. Feet hip width and planted. Each part is one
// arm-path segment (b6-01 segment: barbell.js armsOnBar mirrored, so the grip width stays constant, keys refined where the
// blend could drift) and each segment starts from the previous one's last pose, so the parts join without a jump. Bilateral.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const BB = require('./families/barbell');
const EQ = require('./families/equip');
const P5 = require('./families/b5-bbpress');
const F = require('./families/b6-01');
const S5 = require('./families/b5-bbsquat');
const meta = require('./meta/barbell-curl-press-extension.json');

const GW = 40, THUMB = [0, 0, 1], PLATE_D = 32, CLEAR = 3;
const st = L.POSES.standing({ stance: 11, toeOut: 8 });
const contacts = st.contacts, P0 = clone(st.pose);
Object.assign(P0.ch, { neck_c7: { rot: 0, flex: 0 }, head_c1: { rot: 0, flex: 0 } });
const lerp = (a, b, f) => a + (b - a) * f;
const scAt = (u) => ({ protract: r1(lerp(-2, 4, u)), elevate: r1(lerp(0, 18, u)) }); // u: 0 arms down ... 1 overhead
const body = (u, neck = 0) => { const p = clone(P0); p.ch.sc_r = scAt(u); p.ch.sc_l = scAt(u); p.ch.neck_c7 = { rot: 0, flex: r1(neck * 0.45) }; p.ch.head_c1 = { rot: 0, flex: r1(neck * 0.55) }; return p; };
const supin = (w = 0.06) => (W, q) => [(q.ch.wrist_r.pron - 0) * w]; // forearms supinated (pron about 0, as in the strict curl)
const SEEDS = [[0, 10, 0, 20, 0], [-20, 10, 30, 20, 0], [20, 15, -20, 30, 0], [0, 5, 60, 10, -30], [10, 20, -40, 60, 10]];

/* A: curl. Elbow pinned beside the trunk (a little forward); the handle point swings on its circle about the elbow */
const W0 = L.fk(body(0), contacts), S0 = W0.shoulder_r.p, zm = W0.neck_c7.p[2];
const E0 = [S0[0] + 3, S0[1] - L.UA + 0.6, S0[2] + 1.5];
const dG = P5.elbowToGrip(P0);
const gAt = (a) => [E0[0] + dG * Math.sin(a * Math.PI / 180), E0[1] - dG * Math.cos(a * Math.PI / 180), GW / 2];
// start angle: the smallest that keeps the bar shaft 1 cm off the thighs
const thighClear = (c) => EQ.segmentClear(W0, [c[0], c[1], -GW / 2 + 6], [c[0], c[1], GW / 2 - 6], EQ.BAR.shaftR, { skip: /^(hand|thumb|forearm)_/ }).d;
let A0 = 0; while (A0 < 40 && thighClear(gAt(A0)) < 1) A0 += 0.5;
const A1 = 142;
const curl = {
  body: (f) => body(0.15 * f),
  bar: (W, p, f) => { const g = gAt(lerp(A0, A1, f)); return [g[0], g[1], zm]; },
  elbow: () => E0, elbowW: () => 2.0,
  palm: (f) => { const a = lerp(A0, A1, f) * Math.PI / 180; return [Math.cos(a), Math.sin(a), 0]; }, thumb: THUMB, dirW: 0.8,
  wrist: () => -5, extra: () => [supin()],
};
const segA = F.segment(curl, contacts, GW, { n: 10, seeds: SEEDS });

/* C geometry first (B ends where C starts): upper arm up beside the head, tilted forward FWD and in; forearm folds back */
const FWD = 6, UP = V.norm([0, 1, -0.12]), BACK = [-1, 0, 0], FLEX_TOP = 5;
let FRAME = { up: UP, back: BACK, tilt: FWD };
const extPose = (flex, prev, fseed) => {
  const p = body(1), W = L.fk(p, contacts), S = W.shoulder_r.p, dirs = P5.extDirs(FRAME.up, FRAME.back, FRAME.tilt, flex);
  const { E, g } = P5.extTarget(S, dirs.ua, dirs.fa, dG, GW);
  const q = P5.armKey(p, contacts, g, { palm: V.scale(dirs.palm, -1), thumb: THUMB, E, elbowW: 3, wrist: -4, wristW: 0.3, dirW: 0.6, seeds: prev ? [P5.seedOf(prev)] : fseed, extra: [(Wx, qq) => [(qq.ch.elbow_r.flex - flex) * 0.15], supin(0.03)] });
  return q;
};

/* B: press, from the curl's last key to the extension's top (straight arms overhead) */
const curlTop = segA[segA.length - 1].pose;
const Wct = L.fk(curlTop, contacts), cTop0 = EQ.barAt(Wct, BB.GRIP).c;
const top0 = extPose(FLEX_TOP, null, [[0, 165, 0, 8, 0], [20, 160, -40, 8, 10], [-20, 165, 40, 8, -10], [0, 170, 80, 8, -40]]);
const Wtop = L.fk(top0, contacts), cTop = EQ.barAt(Wtop, BB.GRIP).c;
const headBack = (f) => Math.sin(Math.PI * Math.min(1, f / 0.8));
const press = {
  body: (f) => body(lerp(0.15, 1, F.smooth(f)), -16 * headBack(f)),
  bar: (W, p, f) => { const S = W.shoulder_r.p, c0 = V.add(S, V.sub(cTop0, S0)), c1 = V.add(S, V.sub(cTop, Wtop.shoulder_r.p)); const c = [lerp(c0[0], c1[0], F.smooth(f)), lerp(c0[1], c1[1], f), zm]; return f > 0.02 && f < 0.98 ? F.clearFront(W, c, GW / 2 - 8, 1.5) : c; },
  // forearms about vertical under the bar the whole press (the elbows travel forward and up from the sides), easing in from
  // the curl's last key
  elbow: null,
  palm: (f) => { const p0 = V.norm(Q_palm(Wct)), p1 = V.norm(Q_palm(Wtop)); return V.norm(V.add(V.scale(p0, 1 - f), V.scale(p1, f))); }, thumb: THUMB, dirW: 0.6,
  extra: (f) => [supin(0.03), (W) => { const d = V.norm(V.sub(W.wrist_r.p, W.elbow_r.p)); const w = +(process.env.FV ?? 1.0) * Math.min(1, f * 4); return [d[0] * w, (d[2] - 0.05) * w]; }],
};
function Q_palm(W) { return L.Q.rot(W.wrist_r.q, [1, 0, 0]); }
const segB = F.segment(press, contacts, GW, { n: 12, from: curlTop, tol: 0.15 });
segB[0].pose = clone(curlTop);
const bEnd = segB[segB.length - 1].pose; // the press ends on the extension's top target; C continues from this pose
// the extension keeps the upper arms where the press left them: fold frame from the press's last key
{ const Wb = L.fk(bEnd, contacts), ua = V.norm(V.sub(Wb.elbow_r.p, Wb.shoulder_r.p)), bk = V.norm(V.sub(BACK, V.scale(ua, V.dot(BACK, ua)))); FRAME = { up: ua, back: bk, tilt: 0 }; }
const FLEX0 = r1(BB.elbowOf(L.fk(bEnd, contacts), 'r'));

/* C: overhead extension, bend chosen so the bar stops CLEAR cm from the head / neck / upper back */
const clr = (W) => Math.min(P5.clearHead(W).d, BB.barBodyClear(W, { skip: /^(hand|thumb|forearm|upperarm|biceps|deltoid)_/ }).d);
let fa = 50, fb = 140, ref = extPose(50, bEnd);
for (let i = 0; i < 16; i++) { const m = (fa + fb) / 2, q = extPose(m, ref); if (clr(L.fk(q, contacts)) > CLEAR && q.__err < 0.3) { fa = m; ref = q; } else fb = m; }
const FLEX_BOT = Math.min(r1(fa), 125);
const segC = P5.refine((f, prev) => P5.strip(extPose(FLEX0 + (FLEX_BOT - FLEX0) * f, prev || bEnd)), 10, GW, contacts, { tol: 0.15 });
segC[0].pose = clone(bEnd);
for (let i = 1; i < segC.length; i++) P5.unwrapTo(segC[i].pose, segC[i - 1].pose);
let worst = Math.max(segA.worst, segB.worst);
for (const k of segC) worst = Math.max(worst, P5.widthErr(k.pose, contacts, GW));

/* keyframes: setup, curl, press, extension down / up, lower to the shoulders, uncurl, reset */
const T = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, [p.start, p.end]]));
const poses = {}, kf = [];
const add = (name, pose, t) => { poses[name] = pose; kf.push({ t: +t.toFixed(3), pose: name }); };
const run = (seg, tag, t0, t1, rev = false) => { const ks = rev ? seg.slice().reverse() : seg; ks.forEach((k, i) => { if (i === 0) return; const f = rev ? 1 - k.f : k.f; const nm = `${tag}${Math.round(k.f * 1000)}`; if (!poses[nm]) poses[nm] = k.pose; kf.push({ t: +(t0 + (t1 - t0) * f).toFixed(3), pose: nm }); }); };
add('hang', segA[0].pose, 0); add('hang', segA[0].pose, T.setup[1]);
run(segA, 'a', T.curl[0], T.curl[1]);
run(segB, 'b', T.press[0], T.press[1]);
run(segC, 'c', T.extDown[0], T.extDown[1]);
run(segC, 'c', T.extUp[0], T.extUp[1], true);
run(segB, 'b', T.lower[0], T.lower[1], true);
run(segA, 'a', T.uncurl[0], T.uncurl[1], true);
kf.push({ t: meta.timeline.duration, pose: 'hang' });
// segment joins share one pose: name the shared keys once (the last key of A is B's first, B's last is C's first)
poses.b0 = poses.a1000; poses.c0 = poses.b1000;
for (const k of kf) { if (k.pose === 'b0') k.pose = 'a1000'; if (k.pose === 'c0') k.pose = 'b1000'; }
delete poses.b0; delete poses.c0;
// drop duplicate times (a reversed run starts where the previous ended)
const kf2 = []; for (const k of kf) { const l = kf2[kf2.length - 1]; if (l && Math.abs(l.t - k.t) < 1e-6) { if (l.pose !== k.pose) kf2[kf2.length - 1] = k; continue; } kf2.push(k); }
const ex = H.module_(meta, contacts, poses, kf2);
ex.props = [BB.barbellProp({ plateD: PLATE_D })];
let head = { d: 1e9 }, thumbOut = 1;
let thumbAt = null;
const sw = BB.sweep(ex, { skip: /^(hand|thumb|forearm)_/, fixed: ['ankle_r', 'ankle_l'], probe: (W, pz, t) => { const h = P5.clearHead(W); if (h.d < head.d) head = { d: +h.d.toFixed(2), id: h.id, t: +t.toFixed(2) }; const tz = L.Q.rot(W.wrist_r.q, [0, 0, 1])[2]; if (tz < thumbOut) { thumbOut = tz; thumbAt = +t.toFixed(2); } } });
const Wa = L.fk(segA[0].pose, contacts), Wc = L.fk(segC[segC.length - 1].pose, contacts);
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Grip', 'setup', `Underhand, ${GW} cm between the handle centres (shoulder joints ${r1(2 * S0[2])} cm apart)`); set('Grip', 'peak', `Constant (${sw.width[0]}-${sw.width[1]} cm over the loop)`);
set('Curl', 'setup', `Arms hanging, elbow ${d(BB.elbowOf(Wa, 'r'))}, bar 1 cm off the thighs`); set('Curl', 'peak', `Elbow ${d(BB.elbowOf(Wct, 'r'))} with the bar at the shoulders, elbows kept at the sides`);
set('Press', 'setup', 'From the shoulders, palms facing back'); set('Press', 'peak', `Arms straight overhead (elbow ${d(BB.elbowOf(Wtop, 'r'))}), bar ${r1(cTop[1] - Wtop.shoulder_r.p[1])} cm above the shoulder joints`);
set('Overhead extension', 'setup', `Upper arms beside the head, ${FWD}° forward`); set('Overhead extension', 'peak', `Elbow ${d(BB.elbowOf(Wc, 'r'))} with the bar behind the head (${CLEAR} cm or more from the head / neck; closest ${head.d} cm)`);
set('Tempo', 'setup', `Hang ${T.setup[1]} s`); set('Tempo', 'peak', `Curl ${r1(T.curl[1] - T.curl[0])} s, press ${r1(T.press[1] - T.press[0])} s, extension ${r1(T.extDown[1] - T.extDown[0])} s down and ${r1(T.extUp[1] - T.extUp[0])} s up, lower ${r1(T.lower[1] - T.lower[0])} s, uncurl ${r1(T.uncurl[1] - T.uncurl[0])} s`);
ex.checks.measure = { name: 'trunkFlexion', min: 0, max: 8 };
const lim = S5.limits(ex);
console.log(`Barbell Curl Press Extension: wrote ${L.write(ex)}\n  A0 ${A0} keys A ${segA.length} B ${segB.length} C ${segC.length} flexBot ${FLEX_BOT} gripErr ${worst.toFixed(2)} thumbOut ${thumbOut.toFixed(2)} at ${thumbAt}\n  sweep ${JSON.stringify(sw)} head ${JSON.stringify(head)} limits ${JSON.stringify(lim)}`);
const bad = [];
if (sw.widthRange > 1.0 || worst > 0.5) bad.push('grip width');
if (sw.barFloor < 0 || sw.barBody < 0 || head.d < 1) bad.push(`bar collision ${JSON.stringify(sw.barBodyAt)}`);
if (sw.slide > 0.05 || sw.drift > 0.05) bad.push('feet move');
if (thumbOut < 0.2) bad.push('not underhand somewhere');
if (Object.keys(lim).length) bad.push('joint limits');
if (bad.length) { console.error(`FAIL barbell-curl-press-extension: ${bad.join('; ')}`); process.exitCode = 1; }
