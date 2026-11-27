// Barbell Seated Front Raise (GymVisual #17672): seated tall on the end of a flat 45 cm bench (the seated dumbbell front
// raise base: buttocks on the seat, trunk upright, feet flat and planted). Overhand grip on the bar, 44 cm between the
// handle centres (about shoulder width), arms nearly straight (elbows soft). The bar starts just above the thighs (the
// lowest arm angle at which the bar and the hands clear the thighs, by bisection) and is raised straight forward with the
// arms nearly straight to shoulder height (upper arms horizontal), then lowered slowly back to just above the thighs; it
// never rests on them. The shoulder blades protract and rise a little as the arms go up. Bilateral. Family b5-bbpress.js
// (armKey, refine, shapesClear) on the b4-shoulders2.js seated base.
const L = require('./lib');
const { V, r1, clone } = L;
const BB = require('./families/barbell');
const EQ = require('./families/equip');
const H = require('./families/hips');
const S2 = require('./families/b4-shoulders2');
const F = require('./families/b5-bbpress');
const meta = require('./meta/barbell-seated-front-raise.json');

const GW = 44, ELBOW = 8, TOP = 90, GAP = 1.5;
const seat = S2.benchEnd({ footAhead: -8 });
const contacts = seat.contacts, base0 = clone(seat.pose);
const reach = BB.reachG(base0, ELBOW);
const scAt = (f) => ({ protract: r1(2 + 4 * f), elevate: r1(4 * f * f) });
const LEGS = ['thigh_r', 'thigh_l', 'quad_r', 'quad_l'], HANDS = ['hand_r', 'hand_l', 'thumb_r', 'thumb_l'];
const SEEDS = [[0, 30, 0, 8, 90], [10, 40, -30, 8, 60], [0, 40, 30, 8, 120], [-10, 35, 0, 8, 0], [20, 60, 0, 10, 90]];
// key for shoulder flexion th (deg, 0 = arms hanging, 90 = forward horizontal); f = share of the lift (for the shoulder blades)
function key(th, f, prev) {
  const p = clone(base0); p.ch.sc_r = scAt(f); p.ch.sc_l = clone(p.ch.sc_r);
  const S = L.fk(p, contacts).shoulder_r.p, t = th * L.R.DEG, dz = GW / 2 - S[2], dxy = Math.sqrt(reach * reach - dz * dz);
  const g = [S[0] + dxy * Math.sin(t), S[1] - dxy * Math.cos(t), GW / 2], palm = [-Math.cos(t), -Math.sin(t), 0];
  return F.armKey(p, contacts, g, { palm, thumb: [0, 0, -1], dirW: 0.8, wrist: 0, wristW: 0.2, seeds: prev ? [F.seedOf(prev)] : SEEDS, extra: [(W, q) => [(q.ch.elbow_r.flex - ELBOW) * 0.3]] });
}
const legClear = (W) => { const b = EQ.barAt(W, BB.GRIP); return Math.min(BB.barLegClear(W, b.c[0], b.c[1], GW / 2 - 4), F.shapesClear(W, HANDS, LEGS).d); };
let ta = 20, tb = 70, q0 = null;
for (let i = 0; i < 16; i++) { const m = (ta + tb) / 2, q = key(m, 0, q0); if (legClear(L.fk(q, contacts)) > GAP) { tb = m; q0 = q; } else ta = m; }
const TH0 = r1(tb);
const thAt = (f) => TH0 + (TOP - TH0) * f;
const solve = (f, prev) => F.strip(key(thAt(f), f, prev));
const path = F.refine(solve, 10, GW, contacts, { from: 1 }); // f = 0 bottom ... 1 top
// keyframes: hold at the bottom, raise (f up), pause at the top, lower (f down), pause
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p])), D = meta.timeline.duration, poses = {}, keyframes = [];
path.forEach((k, i) => { poses[i === 0 ? 'bottom' : i === path.length - 1 ? 'top' : `k${i}`] = k.pose; });
const nm = (i) => (i === 0 ? 'bottom' : i === path.length - 1 ? 'top' : `k${i}`);
keyframes.push({ t: 0, pose: 'bottom' });
path.forEach((k, i) => keyframes.push({ t: +(ph.raise.start + (ph.raise.end - ph.raise.start) * k.f).toFixed(3), pose: nm(i) }));
for (let i = path.length - 1; i >= 0; i--) keyframes.push({ t: +(ph.lower.start + (ph.lower.end - ph.lower.start) * (1 - path[i].f)).toFixed(3), pose: nm(i) });
keyframes.push({ t: D, pose: 'bottom' });
const ex = H.module_(meta, contacts, poses, keyframes);
ex.props = [seat.bench.prop, BB.barbellProp()];
let legs = { d: 1e9 }, gripErr = 0;
for (const k of path) gripErr = Math.max(gripErr, F.widthErr(k.pose, contacts, GW));
const sw = BB.sweep(ex, { planted: ['leg_r', 'leg_l'], fixed: ['pelvis'], probe: (W, pz, t) => { const c = legClear(W); if (c < legs.d) legs = { d: +c.toFixed(2), t: +t.toFixed(2) }; } });
const Wb = L.fk(poses.bottom, contacts), Wt = L.fk(poses.top, contacts), bb = EQ.barAt(Wb, BB.GRIP), bt = EQ.barAt(Wt, BB.GRIP);
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`, tf = V.angle(V.sub(Wb.neck_c7.p, Wb.pelvis.p), [0, 1, 0]);
set('Shoulder flexion', 'setup', `${d(S2.humElev(Wb))} (bar ${legs.d} cm above the thighs at the closest)`); set('Shoulder flexion', 'peak', `${d(S2.humElev(Wt))} (bar ${r1(bt.c[1] - Wt.shoulder_r.p[1])} cm vs the shoulder joints)`);
set('Elbow flexion', 'setup', d(S2.elbowAng(Wb))); set('Elbow flexion', 'peak', d(S2.elbowAng(Wt)));
set('Grip width', 'setup', `Overhand, ${GW} cm between the handle centres (shoulder joints ${r1(2 * Wb.shoulder_r.p[2])} cm apart)`); set('Grip width', 'peak', `Constant (${sw.width[0]}-${sw.width[1]} cm over the loop)`);
set('Seat', 'setup', `Bench end, seat 45 cm; trunk ${d(tf)} from vertical, knees ${d(H.kneeOf(Wb, 'r'))}`); set('Seat', 'peak', 'Unchanged (no rocking back)');
set('Tempo', 'setup', `Pause ${ph.setup.end} s above the thighs`); set('Tempo', 'peak', `${r1(ph.raise.end - ph.raise.start)} s up, ${r1(ph.top.end - ph.top.start)} s at the top, ${r1(ph.lower.end - ph.lower.start)} s down`);
ex.checks.measure = { name: 'trunkFlexion', min: Math.max(0, Math.floor(tf - 3)), max: Math.ceil(tf + 3) };
console.log(`Barbell Seated Front Raise: wrote ${L.write(ex)}\n  keys ${path.length} th0 ${TH0} bar bottom ${bb.c.map(r1)} top ${bt.c.map(r1)} elbow ${r1(S2.elbowAng(Wb))}/${r1(S2.elbowAng(Wt))} wrist ${poses.bottom.ch.wrist_r.flex}/${poses.top.ch.wrist_r.flex}\n  sweep ${JSON.stringify(sw)} legs ${JSON.stringify(legs)} keyWidthErr ${gripErr.toFixed(2)}`);
if (sw.widthRange > 1.0 || gripErr > 0.5) { console.error('FAIL: hands do not stay on the bar at a constant grip width'); process.exitCode = 1; }
if (sw.barFloor < 0 || sw.barBody < 0 || legs.d < 0.5) { console.error('FAIL: bar or hands into the body'); process.exitCode = 1; }
if (sw.slide > 0.05 || sw.drift > 0.05) { console.error('FAIL: planted feet slide or the pelvis moves'); process.exitCode = 1; }
