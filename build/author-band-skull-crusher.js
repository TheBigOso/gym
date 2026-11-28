// Band Skull Crusher (GymVisual 14725, movement reference only): lying face up on a flat bench (the barbell bench press base:
// glutes on the seat, upper back and head on the pad, feet planted), head toward a rack. A band is looped round each rack
// upright behind the head; a band handle in each hand, overhand, hands a little inside shoulder width. The upper arms are
// held still, tilted about 8 degrees back toward the head from vertical, and only the elbows bend: the band draws the hands
// down and back toward the forehead (the bottom elbow bend stops with the hands about 3 cm above the head shapes), pause,
// then straighten against the band. Arm keys are the barbell skull crusher's (b5-bbpress extKey at a fixed hand spacing);
// the band strands (one per hand, b5-bandpush bandProps) are checked clear of the head and body over the loop. Bilateral.
const L = require('./lib');
const { V, r1 } = L;
const C = require('./families/b3-chest');
const BB = require('./families/barbell');
const EQ = require('./families/equip');
const H = require('./families/hips');
const B5 = require('./families/b5-bandpush');
const X = require('./families/b6-12');
const F = require('./families/b5-bbpress');
const meta = require('./meta/band-skull-crusher.json');

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
const Wh = L.fk(base, contacts), RACK_X = r1(Wh.head_c1.p[0] - +(process.env.BACK ?? 38)), AY = +(process.env.AY ?? 78), RW = +(process.env.RW ?? 90);
const rk = EQ.rack({ x: RACK_X, width: RW, hookY: 150, id: 'rack' }), anchor = [RACK_X, AY, RW / 2];
ex.props = [B.prop, rk.prop, ...B5.bandProps({ anchor, color: B5.COLOR.light })];
const band = B5.scanBands(ex, { planted: ['leg_r', 'leg_l'] });
let head = { d: 1e9 }, uaDev = 0, gripErr = 0;
for (const k of path) gripErr = Math.max(gripErr, F.widthErr(k.pose, contacts, GW));
const Wt = L.fk(poses.top, contacts), Wb = L.fk(poses.bottom, contacts), uaT = V.norm(V.sub(Wt.elbow_r.p, Wt.shoulder_r.p));
const sw = X.scan(ex, { planted: ['leg_r', 'leg_l'], probe: (W, pz, t) => { const h = F.clearHead(W); if (h.d < head.d) head = { d: +h.d.toFixed(2), id: h.id, t: +t.toFixed(2) }; uaDev = Math.max(uaDev, V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), uaT)); } });
const bt = EQ.barAt(Wt, 'handle'), bb = EQ.barAt(Wb, 'handle');
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Grip width', 'setup', `Hands ${GW} cm apart (shoulder joints ${r1(2 * S[2])} cm apart), overhand on the band handles`); set('Grip width', 'peak', 'Unchanged');
set('Elbow flexion', 'setup', `${d(BB.elbowOf(Wt, 'r'))} (straight, not locked)`); set('Elbow flexion', 'peak', `${d(BB.elbowOf(Wb, 'r'))} at the bottom`);
set('Upper arm angle', 'setup', `${d(V.angle(uaT, [0, 1, 0]))} from vertical, tilted back toward the head`); set('Upper arm angle', 'peak', `Held: at most ${r1(uaDev)}° of drift over the loop`);
set('Band', 'setup', `One band round each rack upright ${anchor[1]} cm up, ${r1(Wh.head_c1.p[0] - RACK_X)} cm beyond the head, ${RW} cm apart; strands ${band.bandLen[0]} cm at the bottom`); set('Band', 'peak', `Strands ${band.bandLen[1]} cm with the arms straight; at least ${r1(band.band.d)} cm from the head and body; hands ${head.d} cm above the head at the bottom (rig shapes)`);
set('Knee flexion', 'setup', `${d(H.kneeOf(W0, 'r'))}, feet ${2 * foot[2]} cm apart`); set('Knee flexion', 'peak', 'Unchanged (feet planted)');
set('Tempo', 'setup', `Top ${T.h} s`); set('Tempo', 'peak', `${r1(T.b - T.h)} s down, ${r1(T.p - T.b)} s pause, ${r1(T.r - T.p)} s up, ${r1(T.D - T.r)} s at the top`);
const tf = V.angle(V.sub(W0.neck_c7.p, W0.pelvis.p), [0, 1, 0]);
ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(tf - 3), max: Math.ceil(tf + 3) };
console.log(`Band Skull Crusher: wrote ${L.write(ex)}\n  keys ${path.length} flex bottom ${FLEX_BOT} hands top ${bt.c.map(r1)} bottom ${bb.c.map(r1)} elbow ${r1(BB.elbowOf(Wt, 'r'))}/${r1(BB.elbowOf(Wb, 'r'))} uaDev ${r1(uaDev)}\n  scan ${JSON.stringify(sw)} head ${JSON.stringify(head)} band ${JSON.stringify(band.band)} len ${band.bandLen}`);
X.gate('band-skull-crusher', sw, poses, { extra: [head.d < 2 && `hands ${head.d} cm from the head`, uaDev > 4 && 'upper arms swing', band.band.d < 0.5 && `band ${JSON.stringify(band.band)}`] });
