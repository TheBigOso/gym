// Half Squat Side Reach (GymVisual 15140, movement reference only; bodyweight): stand with the feet a little wider than the
// hips, toes slightly out, hands together in front of the chest. Sit back into a half squat (knees about 70 degrees) and at
// the same time reach both arms out to the right at about shoulder height, the chest turning about 30 degrees toward the
// hands and the eyes following them; stand back up as the hands return to the chest, then repeat to the left. Both feet stay
// planted (lunge family leg contacts at full weight). The left half of the loop is the mirror of the right half.
// Alternating (bilateral loop). Families: lunge.js (stance, root height for a knee angle), b6-12 (clasp, mirror, scan).
const L = require('./lib');
const { R, V, r1, clone } = L;
const { makeFamily } = require('./families/lunge');
const H = require('./families/hips');
const X = require('./families/b6-12');
const meta = require('./meta/half-squat-side-reach.json');

const HALF = 17, TOE = 10;
const F = makeFamily({ toe: TOE, half: HALF });
const KNEE = +(process.env.KNEE ?? 72), PITCH = +(process.env.PITCH ?? -24), ROT = +(process.env.ROT ?? 30), YAW = +(process.env.YAW ?? 62);
const feet = { r: { c: 'flat', x: 0, z: HALF }, l: { c: 'flat', x: 0, z: -HALF } };
const SPLIT = { spine_l5: 0.2, spine_t12: 0.35, spine_t6: 0.45 };
const ARMS = ['shoulder', 'elbow', 'wrist', 'sc'];
// left arm solved as the right arm of the mirrored pose
function leftTo(p, tgt, guess) {
  const m = X.mirror(p); m.ch.sc_r = clone(p.ch.sc_l || { protract: 6, elevate: 2 });
  const q = L.armToTarget(m, [tgt[0], tgt[1], -tgt[2]], { wrist: { pron: 0, flex: 0, dev: 0 }, axial: 0, axialW: 0.01, guess });
  for (const j of ARMS) p.ch[`${j}_l`] = clone(q.ch[`${j}_r`]);
  return p;
}
// key at fraction f of the way from standing (0) to the bottom of the half squat with the arms out to the right (1)
let gR = [70, 40, -60], gL = [70, 40, -60];
function key(f, { settle = 0 } = {}) {
  const knee = 5 + (KNEE - 5) * f + settle, pitch = PITCH * f, rot = ROT * f;
  const spec = F.rootY({ root: [r1(-7 * f), 85, 0], pitch: r1(pitch), spine: { l5: r1(-3 * f), t12: r1(-2 * f), t6: r1(1 * f) }, feet }, knee, 'r');
  const arms = (p0) => {
    let p = clone(p0);
    for (const j in SPLIT) p.ch[j].rot = r1(rot * SPLIT[j]);
    p.ch.sc_r = { protract: r1(6 + 6 * f), elevate: 2 }; p.ch.sc_l = { protract: r1(6 + 8 * f), elevate: 2 };
    const clasp = X.claspArms(p), Wc = L.fk(clasp);
    // reach targets: both wrists side by side, out to the right of the chest at shoulder height, the left arm nearly straight
    const W = L.fk(p), C = V.scale(V.add(W.shoulder_r.p, W.shoulder_l.p), 0.5), y = YAW * R.DEG;
    const d = V.norm([Math.cos(y), -0.12, Math.sin(y)]), perp = V.norm(V.cross([0, 1, 0], d));
    let a = 20, b = 90;
    for (let i = 0; i < 40; i++) { const m = (a + b) / 2, t = V.add(V.add(C, V.scale(d, m)), V.scale(perp, 4)); if (V.len(V.sub(t, W.shoulder_l.p)) < L.reach(10)) a = m; else b = m; }
    const tL = V.add(V.add(C, V.scale(d, a)), V.scale(perp, 4)), tR = V.add(V.add(C, V.scale(d, a)), V.scale(perp, -4));
    const lerp = (u, v) => u.map((x, i) => x + (v[i] - x) * f);
    p = L.armToTarget(p, lerp(Wc.wrist_r.p, tR), { wrist: { pron: r1(-10 * f), flex: 0, dev: 0 }, axial: 0, axialW: 0.01, guess: gR });
    p = leftTo(p, lerp(Wc.wrist_l.p, tL), gL);
    gR = [p.ch.shoulder_r.plane, p.ch.shoulder_r.elev, p.ch.shoulder_r.axial]; gL = [p.ch.shoulder_l.plane, p.ch.shoulder_l.elev, p.ch.shoulder_l.axial];
    if (f > 0) p = L.gaze(p, 'wrist_r', 12, [r1(25 * f), r1(-6 * f)], { rot: 50, ext: 20 });
    return p;
  };
  return F.pose(Object.assign(spec, { arms }));
}
const R0 = key(0), R1 = key(0.33), R2 = key(0.66), R3 = key(1), R3s = key(1, { settle: 1.5 });
const poses = { stand: R0, R1, R2, R3, R3s };
for (const n of ['R1', 'R2', 'R3', 'R3s']) poses[`L${n.slice(1)}`] = X.mirror(poses[n]);
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p])), D = meta.timeline.duration;
const side = (s) => {
  const dn = ph[`down${s}`], hd = ph[`hold${s}`], up = ph[`up${s}`], [t1, t2] = X.easeTimes([1 / 3, 2 / 3], dn.start, dn.end), [u1, u2] = X.easeTimes([1 / 3, 2 / 3], up.start, up.end);
  return [{ t: t1, pose: `${s}1` }, { t: t2, pose: `${s}2` }, { t: dn.end, pose: `${s}3` }, { t: +((hd.start + hd.end) / 2).toFixed(3), pose: `${s}3s` }, { t: hd.end, pose: `${s}3` },
    { t: u1, pose: `${s}2` }, { t: u2, pose: `${s}1` }, { t: up.end, pose: 'stand' }];
};
const keyframes = [{ t: 0, pose: 'stand' }, { t: ph.downR.start, pose: 'stand' }, ...side('R'), { t: ph.downL.start, pose: 'stand' }, ...side('L'), { t: D, pose: 'stand' }];
const ex = H.module_(meta, F.contacts, poses, keyframes);
const rep = X.scan(ex, { planted: ['leg_r', 'leg_l'] });
const Ws = F.fk(R0), Wb = F.fk(R3), set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
const chestRot = (p) => p.ch.spine_l5.rot + p.ch.spine_t12.rot + p.ch.spine_t6.rot;
const armDir = (W) => { const v = V.sub(V.scale(V.add(W.wrist_r.p, W.wrist_l.p), 0.5), V.scale(V.add(W.shoulder_r.p, W.shoulder_l.p), 0.5)); return Math.atan2(v[2], v[0]) / R.DEG; };
set('Stance', 'setup', `Ankles ${2 * HALF} cm apart, toes out ${TOE}°`); set('Stance', 'peak', 'Unchanged (feet planted)');
set('Knee flexion', 'setup', `${d(F.kneeOf(Ws, 'r'))}`); set('Knee flexion', 'peak', `${d(F.kneeOf(Wb, 'r'))} R / ${d(F.kneeOf(Wb, 'l'))} L (half squat)`);
set('Trunk', 'setup', 'Upright'); set('Trunk', 'peak', `${d(F.trunkLean(Wb))} forward, chest turned ${d(chestRot(R3))} toward the hands`);
set('Reach', 'setup', 'Hands together in front of the chest'); set('Reach', 'peak', `Both hands out ${d(armDir(Wb))} to the right of straight ahead, at ${Math.round(Wb.wrist_r.p[1])} cm (shoulders ${Math.round(Wb.shoulder_r.p[1])} cm), left elbow ${d(X.elbowAng(Wb, 'l'))}`);
set('Tempo', 'setup', `Stand ${ph.setup.end} s`); set('Tempo', 'peak', `Per side ${r1(ph.downR.end - ph.downR.start)} s down and reach, ${r1(ph.holdR.end - ph.holdR.start)} s hold, ${r1(ph.upR.end - ph.upR.start)} s up`);
const pk = Math.max(F.kneeOf(Wb, 'r'), F.kneeOf(Wb, 'l'));
ex.checks.measure = { name: 'kneeFlexion', min: Math.floor(pk - 8), max: Math.ceil(pk + 6) };
console.log(`Half Squat Side Reach: wrote ${L.write(ex)}\n  knee ${r1(F.kneeOf(Wb, 'r'))}/${r1(F.kneeOf(Wb, 'l'))} trunk ${r1(F.trunkLean(Wb))} rot ${chestRot(R3)} armDir ${r1(armDir(Wb))} hands ${Wb.wrist_r.p.map(Math.round)} / ${Wb.wrist_l.p.map(Math.round)}\n  ${JSON.stringify(rep)}`);
X.gate('half-squat-side-reach', rep, poses);
