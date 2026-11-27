// Kneeling Leg Half Circle (GymVisual #469312): all fours on a mat (the bird dog's base). The right leg straightens behind
// with the toes pointed just above the mat, then the straight leg traces a half circle up and out: it rises to about level
// behind the hip and comes down out to the side (about 40 degrees out), toes ending just off the mat; the same arc back,
// then the knee returns under the hip. Pelvis and trunk stay still. authoredSide 'right'.
// The arc is a half ellipse in (azimuth, elevation) of the hip-to-ankle direction; each key solves the hip channels
// (flex, abduction, rotation within the rig limits) that aim the straight leg along it. Contacts as in the donkey kick.
const L = require('./lib');
const { R, V, r1, clone } = L;
const P = require('./families/prone');
const H = require('./families/hips');
const F = require('./families/b4-calvesglutes');
const meta = require('./meta/kneeling-leg-half-circle.json');

const A = P.allFours(), { fours, contacts, Wf } = A;
const LEG = V.len(L.rig.byId.knee_r.offset) + V.len(L.rig.byId.ankle_r.offset);
const AZ = +(process.env.AZ ?? 46), EL_TOP = +(process.env.ELTOP ?? 1), KNEE = 3, POINT = -45;
const HIP = Wf.hip_r.p;
const dirOf = (az, el) => { const a = az * R.DEG, e = el * R.DEG; return [-Math.cos(e) * Math.cos(a), Math.sin(e), Math.cos(e) * Math.sin(a)]; };
// lowest elevation that keeps the pointed foot ~2 cm above the mat at a given azimuth
function lowEl(az) {
  let a = -40, b = 0;
  for (let i = 0; i < 30; i++) { const m = (a + b) / 2; if (H.bottomOf(L.fk(aim(az, m)), 'foot_r') < 2) a = m; else b = m; }
  return b;
}
function aim(az, el, ankle = POINT) {
  const q = clone(fours); q.ik.leg_r.weight = 0;
  q.ch.ankle_r = { dorsi: ankle };
  const out = F.legTo(q, 'r', { ankle: V.add(HIP, V.scale(dirOf(az, el), L.reach ? LEG * 0.9995 : LEG)), kneeFlex: KNEE });
  delete out.__cost; return out;
}
const EL0 = lowEl(0), EL1 = lowEl(AZ);
const arc = (u) => { const ph = Math.PI * (1 - u); return { az: AZ / 2 + (AZ / 2) * Math.cos(ph), el: (u < 0.5 ? EL0 : EL1) + (EL_TOP - (u < 0.5 ? EL0 : EL1)) * Math.sin(ph) }; };
const at = (u) => { const a = arc(u); return aim(a.az, a.el); };
// tuck: from all fours the knee lifts (hip extends, knee bent) and then the knee straightens into the start of the arc
function tuck(g) { // g: 0 = all fours, 1 = start of the arc
  const s = at(0), q = clone(fours); q.ik.leg_r.weight = g > 0 ? 0 : 1;
  const h0 = fours.ch.hip_r, h1 = s.ch.hip_r, k0 = fours.ch.knee_r.flex;
  const gh = F.easeIO(Math.min(1, g / 0.75)), gk = F.easeIO(Math.max(0, (g - 0.35) / 0.65));
  q.ch.hip_r = { flex: r1(h0.flex + (h1.flex - h0.flex) * gh), abd: r1(h0.abd + (h1.abd - h0.abd) * gh), rot: r1(h0.rot + (h1.rot - h0.rot) * gh) };
  q.ch.knee_r = { flex: r1(k0 + 6 * Math.sin(Math.PI * Math.min(1, g / 0.4)) + (KNEE - k0) * gk) };
  q.ch.ankle_r = { dorsi: r1(fours.ch.ankle_r.dorsi + (POINT - fours.ch.ankle_r.dorsi) * gh) };
  return q;
}
const poses = { fours, t1: tuck(0.08), t2: tuck(0.35), t3: tuck(0.65), start: at(0) };
const U = [0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1];
U.forEach((u, i) => { poses[`a${i + 1}`] = at(u); });
poses.end2 = (() => { const a = arc(1); return aim(a.az + 1, a.el + 0.5); })();
const keyframes = [{ t: 0, pose: 'fours' }, { t: 0.6, pose: 'fours' }, { t: 0.75, pose: 't1' }, { t: 1.05, pose: 't2' }, { t: 1.35, pose: 't3' }, { t: 1.6, pose: 'start' }];
U.forEach((u, i) => keyframes.push({ t: +(1.6 + 2.0 * u).toFixed(3), pose: `a${i + 1}` }));             // arc out, 2 s
keyframes.push({ t: 3.85, pose: 'end2' });                                                                // short pause, reaching a touch further
for (let i = 7; i >= 1; i--) keyframes.push({ t: +(3.85 + 1.75 * (8 - i) / 8).toFixed(3), pose: `a${i}` }); // arc back, 1.75 s
keyframes.push({ t: 5.6, pose: 'start' }, { t: 5.85, pose: 't3' }, { t: 6.1, pose: 't2' }, { t: 6.3, pose: 't1' }, { t: 6.4, pose: 'fours' }, { t: 7.0, pose: 'fours' });
F.wrapAll(poses);
const ex = H.module_(meta, contacts, poses, keyframes);
const sw = P.sweep(ex, [{ joint: 'knee_l', p: Wf.knee_l.p }]);
let footMin = 1e9, kneeMax = 0; H.loopReport(ex, { probe: (W, pz) => { if (pz.ik.leg_r.weight < 0.999) { footMin = Math.min(footMin, H.bottomOf(W, 'foot_r')); } } });
const legAng = (W) => { const d = V.sub(W.ankle_r.p, W.hip_r.p); return { az: Math.atan2(d[2], -d[0]) / R.DEG, el: Math.asin(d[1] / V.len(d)) / R.DEG }; };
const Ws = L.fk(poses.start, contacts), Wm = L.fk(poses.a4, contacts), We = L.fk(poses.a8, contacts);
const set = H.setKin(ex);
set('Hands and knees', 'setup', `Hands under the shoulders, knees under the hips (hip ${Math.round(fours.ch.hip_r.flex)}°)`); set('Hands and knees', 'peak', 'Hands and the left knee stay planted');
set('Hip extension', 'setup', `Leg straight behind, ${Math.round(-legAng(Ws).el)}° below level (hip ${poses.start.ch.hip_r.flex}° flexion channel)`); set('Hip extension', 'peak', `Top of the arc: leg ${r1(legAng(Wm).el)}° from level, hip ${poses.a4.ch.hip_r.flex}°`);
set('Hip abduction', 'setup', `≈${Math.round(poses.start.ch.hip_r.abd)}°`); set('Hip abduction', 'peak', `≈${Math.round(poses.a8.ch.hip_r.abd)}° (leg ${Math.round(legAng(We).az)}° out from straight back at the end of the arc)`);
set('Knee', 'setup', `≈${Math.round(P.kneeAngle(Ws, 'r'))}° (straight)`); set('Knee', 'peak', `≈${Math.round(P.kneeAngle(Wm, 'r'))}°`);
set('Tempo', 'setup', '0.6 s on all fours, 1 s to straighten the leg'); set('Tempo', 'peak', '2 s arc out, 0.25 s pause, 1.75 s arc back, 0.8 s knee back');
console.log(`Kneeling Leg Half Circle: wrote ${L.write(ex)}  EL0=${r1(EL0)} EL1=${r1(EL1)}\n  sweep ${JSON.stringify(sw)} liftedFootMin ${footMin.toFixed(2)}`);
for (const n of ['t1', 't2', 't3']) console.log(`  ${n} foot ${H.bottomOf(L.fk(poses[n], contacts), 'foot_r').toFixed(2)} hip ${JSON.stringify(poses[n].ch.hip_r)} knee ${poses[n].ch.knee_r.flex}`);
for (const n of ['start', 'a2', 'a4', 'a6', 'a8']) { const W = L.fk(poses[n], contacts), a = legAng(W); console.log(`  ${n} az ${r1(a.az)} el ${r1(a.el)} hip ${JSON.stringify(poses[n].ch.hip_r)} knee ${r1(P.kneeAngle(W, 'r'))}`); }
console.log('  keys', keyframes.map((k) => `${k.t}:${k.pose}`).join(' '));
if (sw.slide > 0.05 || sw.drift > 0.05) { console.error('FAIL: planted hand or knee slides'); process.exitCode = 1; }
