// Barbell Seated Overhead Triceps Extension (GymVisual #2939): seated tall on the end of a flat 45 cm bench (the seated
// front raise base: buttocks on the seat, trunk upright, feet flat and planted). The bar is held overhead with straight
// arms, overhand, 30 cm between the handle centres (a little narrower than the shoulders). The upper arms stay still beside
// the head, pointing up and a little forward and in (elbows about head width apart); only the elbows bend, lowering the bar
// behind the head until it is about 3 cm from the head / neck shapes (bottom bend solved by bisection), then they
// straighten. Shoulder blades raised and rotated up for the overhead arm. Bilateral. Family b5-bbpress.js (extDirs /
// extKey / refine / clearHead) on the b4-shoulders2.js seated base.
const L = require('./lib');
const { V, r1, clone } = L;
const BB = require('./families/barbell');
const EQ = require('./families/equip');
const H = require('./families/hips');
const S2 = require('./families/b4-shoulders2');
const F = require('./families/b5-bbpress');
const meta = require('./meta/barbell-seated-overhead-triceps-extension.json');

const GW = 30, FWD = +(process.env.FWD ?? 8), IN = +(process.env.IN ?? 0.18), FLEX_TOP = 6, CLEAR = 3, MAX_FLEX = +(process.env.MAXF ?? 125);
const T = { h: 0.6, b: 2.9, p: 3.2, r: 4.6, D: 5.2 };
const seat = S2.benchEnd({ footAhead: -4 });
const base = clone(seat.pose), contacts = seat.contacts;
base.ch.sc_r = { protract: 6, elevate: 14 }; base.ch.sc_l = clone(base.ch.sc_r);
const W0 = L.fk(base, contacts), S = W0.shoulder_r.p, dG = F.elbowToGrip(base);
const UP = V.norm([0, 1, -IN]), BACK = [-1, 0, 0];
const SEEDS = [[90, 170, 0, 10, 0], [90, 170, -90, 10, 90], [90, 165, 90, 10, -90], [60, 160, 0, 30, 180], [120, 165, 0, 20, 0]];
const key = (flex, prev) => F.extKey(base, contacts, F.extDirs(UP, BACK, FWD, flex), { S, GW, d: dG, seeds: prev ? [F.seedOf(prev)] : SEEDS, wrist: -4, elbowW: 3, flex });
// clearance of the bar behind the head: head / neck shapes and the upper back (traps)
const clr = (W) => Math.min(F.clearHead(W).d, BB.barBodyClear(W, { skip: /^(hand|thumb|forearm|upperarm|biceps|deltoid)_/ }).d);
let fa = 60, fb = 145, ref = key(60, null);
for (let i = 0; i < 18; i++) { const m = (fa + fb) / 2, q = key(m, ref); if (clr(L.fk(q, contacts)) > CLEAR && q.__err < 0.3) { fa = m; ref = q; } else fb = m; }
const FLEX_BOT = Math.min(r1(fa), MAX_FLEX);
const solve = (f, prev) => F.strip(key(FLEX_TOP + (FLEX_BOT - FLEX_TOP) * (1 - f), prev));
const path = F.refine(solve, 12, GW, contacts, { from: -1 });
const settle = F.strip(key(FLEX_BOT - 1.2, path[0].pose));
const { poses, keyframes } = F.repKeysF(path, T, settle);
const ex = H.module_(meta, contacts, poses, keyframes);
ex.props = [seat.bench.prop, BB.barbellProp()];
let head = { d: 1e9 }, uaDev = 0, gripErr = 0;
for (const k of path) gripErr = Math.max(gripErr, F.widthErr(k.pose, contacts, GW));
const Wt = L.fk(poses.top, contacts), Wb = L.fk(poses.bottom, contacts), uaT = V.norm(V.sub(Wt.elbow_r.p, Wt.shoulder_r.p));
const sw = BB.sweep(ex, { planted: ['leg_r', 'leg_l'], fixed: ['pelvis'], probe: (W, pz, t) => { const h = F.clearHead(W); if (h.d < head.d) head = { d: +h.d.toFixed(2), id: h.id, t: +t.toFixed(2) }; uaDev = Math.max(uaDev, V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), uaT)); } });
const bt = EQ.barAt(Wt, BB.GRIP), bb = EQ.barAt(Wb, BB.GRIP);
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`, tf = V.angle(V.sub(W0.neck_c7.p, W0.pelvis.p), [0, 1, 0]);
set('Grip width', 'setup', `${GW} cm between the handle centres (shoulder joints ${r1(2 * S[2])} cm apart)`); set('Grip width', 'peak', `Constant (${sw.width[0]}-${sw.width[1]} cm over the loop)`);
set('Elbow flexion', 'setup', `${d(BB.elbowOf(Wt, 'r'))} (arms straight overhead, not locked)`); set('Elbow flexion', 'peak', `${d(BB.elbowOf(Wb, 'r'))} with the bar behind the head`);
set('Shoulder elevation', 'setup', `Upper arms ${d(S2.humElev(Wt))} from the trunk line (pointing up, ${FWD}° forward), elbows ${r1(2 * Wt.elbow_r.p[2])} cm apart`); set('Shoulder elevation', 'peak', `Held: at most ${r1(uaDev)}° of drift over the loop`);
set('Bar clearance', 'setup', `Bar ${r1(bt.c[1] - S[1])} cm above the shoulder joints`); set('Bar clearance', 'peak', `${head.d} cm from the ${head.id} at the closest (rig shapes); bar ${r1(S[0] - bb.c[0])} cm behind the shoulder joints, ${r1(bb.c[1] - S[1])} cm above them`);
set('Seat', 'setup', `Bench end, seat 45 cm; trunk ${d(tf)} from vertical, knees ${d(H.kneeOf(W0, 'r'))}`); set('Seat', 'peak', 'Unchanged (trunk and pelvis still)');
set('Tempo', 'setup', `Overhead ${T.h} s`); set('Tempo', 'peak', `${r1(T.b - T.h)} s down, ${r1(T.p - T.b)} s pause, ${r1(T.r - T.p)} s up, ${r1(T.D - T.r)} s at the top`);
ex.checks.measure = { name: 'trunkFlexion', min: Math.max(0, Math.floor(tf - 3)), max: Math.ceil(tf + 3) };
console.log(`Barbell Seated Overhead Triceps Extension: wrote ${L.write(ex)}\n  keys ${path.length} flex bottom ${FLEX_BOT} bar top ${bt.c.map(r1)} bottom ${bb.c.map(r1)} elbow ${r1(BB.elbowOf(Wt, 'r'))}/${r1(BB.elbowOf(Wb, 'r'))} uaDev ${r1(uaDev)} wrist ${poses.top.ch.wrist_r.flex}/${poses.bottom.ch.wrist_r.flex} shoulder ${JSON.stringify(poses.top.ch.shoulder_r)}\n  sweep ${JSON.stringify(sw)} head ${JSON.stringify(head)} keyWidthErr ${gripErr.toFixed(2)}`);
if (sw.widthRange > 1.0 || gripErr > 0.5) { console.error('FAIL: hands do not stay on the bar at a constant grip width'); process.exitCode = 1; }
if (sw.barFloor < 0 || head.d < 2) { console.error('FAIL: bar too close to the head'); process.exitCode = 1; }
if (sw.slide > 0.05 || sw.drift > 0.05) { console.error('FAIL: planted feet slide or the pelvis moves'); process.exitCode = 1; }
if (uaDev > 4) { console.error('FAIL: upper arms swing'); process.exitCode = 1; }
