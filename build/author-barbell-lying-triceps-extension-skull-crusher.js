// Barbell Lying Triceps Extension Skull Crusher (GymVisual #4994): lying face up on a flat bench (the barbell bench press base:
// glutes on the seat, upper back and head on the pad, feet planted). Overhand grip a little inside shoulder width (34 cm
// between the handle centres). The upper arms are held still, tilted about 8 degrees back toward the head from vertical,
// and only the elbows bend: the bar arcs down until it is about 3 cm above the forehead (the bottom elbow bend is solved
// by bisection on the bar's clearance from the head shapes), pauses, and the elbows straighten again. The hands are solved
// onto the bar at a constant grip width for each elbow bend. No rack (the bar is taken from the floor or a spotter).
// Bilateral. Family b5-bbpress.js (extDirs / extKey / refine / clearHead).
const L = require('./lib');
const { V, r1 } = L;
const C = require('./families/b3-chest');
const BB = require('./families/barbell');
const EQ = require('./families/equip');
const H = require('./families/hips');
const F = require('./families/b5-bbpress');
const meta = require('./meta/barbell-lying-triceps-extension-skull-crusher.json');

const GW = 34, TILT = -8, FLEX_TOP = 5, HEAD_CLEAR = 3;
const T = { h: 0.6, b: 2.8, p: 3.1, r: 4.5, D: 5.0 };
const { B, base, contacts, foot } = C.benchBase(0);
const W0 = L.fk(base, contacts), S = W0.shoulder_r.p, dG = F.elbowToGrip(base);
const SEEDS = [[90, 90, -90, 10, -170], [90, 90, 0, 10, 90], [60, 80, -60, 30, 170], [100, 70, -80, 60, 170], [90, 80, 90, 40, 0]];
const key = (flex, prev) => F.extKey(base, contacts, F.extDirs([0, 1, 0], [-1, 0, 0], TILT, flex), { S, GW, d: dG, seeds: prev ? [F.seedOf(prev)] : SEEDS, wrist: -4, elbowW: 3, flex });
// bottom elbow bend: bar HEAD_CLEAR cm above the head shapes (bisection; the bar nears the forehead as the elbows bend)
let fa = 60, fb = 140, ref = key(60, null);
for (let i = 0; i < 18; i++) { const m = (fa + fb) / 2, q = key(m, ref); if (F.clearHead(L.fk(q, contacts)).d > HEAD_CLEAR) { fa = m; ref = q; } else fb = m; }
const FLEX_BOT = r1(fa);
const solve = (f, prev) => F.strip(key(FLEX_TOP + (FLEX_BOT - FLEX_TOP) * (1 - f), prev));
const path = F.refine(solve, 12, GW, contacts, { from: -1 });
const settle = F.strip(key(FLEX_BOT - 1.2, path[0].pose));
const { poses, keyframes } = F.repKeysF(path, T, settle);
const ex = H.module_(meta, contacts, poses, keyframes);
ex.props = [B.prop, BB.barbellProp()];
let head = { d: 1e9 }, uaDev = 0, gripErr = 0;
for (const k of path) gripErr = Math.max(gripErr, F.widthErr(k.pose, contacts, GW));
const Wt = L.fk(poses.top, contacts), Wb = L.fk(poses.bottom, contacts), uaT = V.norm(V.sub(Wt.elbow_r.p, Wt.shoulder_r.p));
const sw = BB.sweep(ex, { planted: ['leg_r', 'leg_l'], probe: (W, pz, t) => { const h = F.clearHead(W); if (h.d < head.d) head = { d: +h.d.toFixed(2), id: h.id, t: +t.toFixed(2) }; uaDev = Math.max(uaDev, V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), uaT)); } });
const bt = EQ.barAt(Wt, BB.GRIP), bb = EQ.barAt(Wb, BB.GRIP);
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Grip width', 'setup', `${GW} cm between the handle centres (shoulder joints ${r1(2 * S[2])} cm apart)`); set('Grip width', 'peak', `Constant (${sw.width[0]}-${sw.width[1]} cm over the loop)`);
set('Elbow flexion', 'setup', `${d(BB.elbowOf(Wt, 'r'))} (straight, not locked)`); set('Elbow flexion', 'peak', `${d(BB.elbowOf(Wb, 'r'))} at the bottom`);
set('Upper arm angle', 'setup', `${d(V.angle(uaT, [0, 1, 0]))} from vertical, tilted back toward the head`); set('Upper arm angle', 'peak', `Held: at most ${r1(uaDev)}° of drift over the loop`);
set('Bar clearance', 'setup', `Bar over the shoulders, ${r1(bt.c[1] - B.top)} cm above the bench`); set('Bar clearance', 'peak', `${head.d} cm above the ${head.id === 'brow_r' || head.id === 'brow_l' ? 'brow' : head.id} at the bottom (rig shapes); bar ${r1(S[0] - bb.c[0])} cm toward the head from the shoulder joints`);
set('Knee flexion', 'setup', `${d(H.kneeOf(W0, 'r'))}, feet ${2 * foot[2]} cm apart`); set('Knee flexion', 'peak', 'Unchanged (feet planted)');
set('Tempo', 'setup', `Top ${T.h} s`); set('Tempo', 'peak', `${r1(T.b - T.h)} s down, ${r1(T.p - T.b)} s pause, ${r1(T.r - T.p)} s up, ${r1(T.D - T.r)} s at the top`);
const tf = V.angle(V.sub(W0.neck_c7.p, W0.pelvis.p), [0, 1, 0]);
ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(tf - 3), max: Math.ceil(tf + 3) };
console.log(`Barbell Skull Crusher: wrote ${L.write(ex)}\n  keys ${path.length} flex bottom ${FLEX_BOT} bar top ${bt.c.map(r1)} bottom ${bb.c.map(r1)} elbow ${r1(BB.elbowOf(Wt, 'r'))}/${r1(BB.elbowOf(Wb, 'r'))} uaDev ${r1(uaDev)} wrist ${poses.bottom.ch.wrist_r.flex}\n  sweep ${JSON.stringify(sw)} head ${JSON.stringify(head)} keyWidthErr ${gripErr.toFixed(2)}`);
if (sw.widthRange > 1.0 || gripErr > 0.5) { console.error('FAIL: hands do not stay on the bar at a constant grip width'); process.exitCode = 1; }
if (sw.barFloor < 0 || sw.barBody < 0 || head.d < 2) { console.error('FAIL: bar too close to the body or head'); process.exitCode = 1; }
if (sw.slide > 0.05) { console.error('FAIL: planted feet slide'); process.exitCode = 1; }
if (uaDev > 4) { console.error('FAIL: upper arms swing'); process.exitCode = 1; }
