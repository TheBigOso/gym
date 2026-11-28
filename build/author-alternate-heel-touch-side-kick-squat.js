// Alternate Heel Touch Side Kick Squat (GymVisual 7630, movement reference only; bodyweight): stand with the feet about
// hip width, hands together in front of the chest. Squat down and reach the right hand down the outside of the right leg
// to touch the right heel (trunk leaning forward and side-bending to the right, the left arm reaching forward for balance),
// stand up, shift onto the left leg and kick the straight right leg out to the side (hip abduction, foot flexed, trunk
// leaning a little left), bring it back down beside the left foot. Then the same to the left. The planted foot stays put
// (lunge family leg contacts at full weight); the kicking leg is set by its joint channels (contacts at weight 0). The left
// half of the loop is the mirror of the right half. Alternating (bilateral loop). Families: lunge.js, b6-12.
const L = require('./lib');
const { R, V, Q, r1, clone } = L;
const { makeFamily } = require('./families/lunge');
const H = require('./families/hips');
const X = require('./families/b6-12');
const meta = require('./meta/alternate-heel-touch-side-kick-squat.json');

const HALF = 12, TOE = 8;
const F = makeFamily({ toe: TOE, half: HALF });
const env = (k, d) => +(process.env[k] ?? d);
const KNEE_T = env('KNEE_T', 102), LAT = env('LAT', 24), ABD = env('ABD', 42), ROLL = env('ROLL', 8);
const flat = (s, o = {}) => Object.assign({ c: 'flat', x: 0, z: s === 'r' ? HALF : -HALF }, o);
const ARMS = ['shoulder', 'elbow', 'wrist', 'sc'];
const SPL = { spine_l5: 0.25, spine_t12: 0.35, spine_t6: 0.4 };
function leftTo(p, tgt, guess, wrist = { pron: 0, flex: 0, dev: 0 }) {
  const m = X.mirror(p); m.ch.sc_r = clone(p.ch.sc_l || { protract: 6, elevate: 2 });
  const q = L.armToTarget(m, [tgt[0], tgt[1], -tgt[2]], { wrist, axial: 0, axialW: 0.01, guess });
  for (const j of ARMS) p.ch[`${j}_l`] = clone(q.ch[`${j}_r`]);
  return p;
}
const clasp = (p) => X.claspArms(p);
// heel-touch target: right wrist just above and outside the right heel, fingers pointing down to it
const ANK = [0, L.ANKLE_H, HALF], HEEL_W = [ANK[0] + env('HX', -2), env('HY', 24), ANK[2] + env('HZ', 12)];
// squat key: knee angle, pelvis pitch, side bend (deg, + toward the right), reach fraction u (0 = hands at chest, 1 = touch)
function squatKey(knee, pitch, lat, u) {
  const spec = F.rootY({ root: [r1(env('RX', -14) * u), 80, 0], pitch: r1(pitch), spine: { l5: r1(-2 * u), t12: r1(2 * u), t6: r1(4 * u) }, feet: { r: flat('r'), l: flat('l') } }, knee, 'r');
  const arms = (p0) => {
    let p = clone(p0);
    for (const j in SPL) { p.ch[j].latFlex = r1(lat * SPL[j]); p.ch[j].rot = r1(-8 * u * SPL[j]); }
    const c = clasp(p), Wc = L.fk(c);
    p.ch.sc_r = { protract: r1(6 + 4 * u), elevate: r1(-4 * u) };
    const lerp = (a, b) => a.map((x, i) => x + (b[i] - x) * u);
    p = L.armToTarget(p, lerp(Wc.wrist_r.p, HEEL_W), { wrist: { pron: r1(-60 * u), flex: 0, dev: 0 }, axial: 0, axialW: 0.01, guess: [40, 30, -30] });
    // left arm reaches forward at about shoulder height for balance
    const W = L.fk(p), SL = W.shoulder_l.p, fwd = V.add(SL, [L.reach(8) * 0.97, -6, 8]);
    p = leftTo(p, lerp(Wc.wrist_l.p, fwd), [80, 60, -20]);
    const lean = -pitch; p.ch.neck_c7 = { rot: r1(8 * u), flex: r1(-lean * 0.18) }; p.ch.head_c1 = { rot: r1(8 * u), flex: r1(-lean * 0.2) };
    return p;
  };
  return F.pose(Object.assign(spec, { arms }));
}
// pitch for the touch: lean until the wrist target is within reach (elbow about 8 degrees) of the right shoulder
let pa = -10, pb = -80;
for (let i = 0; i < 30; i++) { const m = (pa + pb) / 2, p = squatKey(KNEE_T, m, LAT, 1), S = F.fk(p).shoulder_r.p; if (V.len(V.sub(S, HEEL_W)) > L.reach(8)) pa = m; else pb = m; }
const PT = r1(pb);
// standing on the left leg, right foot off the floor; kick: right hip abducted ABD degrees, knee nearly straight, foot flexed
function onLeft(kick, rollDeg, shiftZ) {
  const spec = F.rootY({ root: [0, 88, r1(-shiftZ)], pitch: 0, rot: { roll: r1(rollDeg) }, spine: { l5: 0, t12: 0, t6: 0 }, feet: { l: flat('l'), r: flat('r', { lift: 4, w: 0 }) } }, env('KNEE_K', 9), 'l');
  let p = F.pose(Object.assign(spec, { arms: clasp }));
  if (kick > 0) { p.ch.hip_r = { flex: r1(6 * kick), abd: r1(ABD * kick), rot: r1(-6 * kick) }; p.ch.knee_r = { flex: r1(14 - 10 * kick) }; p.ch.ankle_r = { dorsi: r1(4 + 6 * kick) }; }
  return p;
}
// roll sign that leans the trunk away from the kick (head toward -Z)
const rollSign = (() => { const a = F.fk(onLeft(0, ROLL, 0)).head_c1.p[2], b = F.fk(onLeft(0, -ROLL, 0)).head_c1.p[2]; return a < b ? 1 : -1; })();
const stand = F.pose(Object.assign(F.stand({ r: flat('r'), l: flat('l') }, { knee: 6 }), { arms: clasp }));
const P = {
  stand,
  d1: squatKey(5 + (KNEE_T - 5) * 0.35, PT * 0.3, LAT * 0.3, 0.3), d2: squatKey(5 + (KNEE_T - 5) * 0.7, PT * 0.65, LAT * 0.65, 0.65),
  touch: squatKey(KNEE_T, PT, LAT, 1), touchS: squatKey(KNEE_T + 1.5, PT - 1, LAT, 1),
  shift: onLeft(0, rollSign * ROLL * 0.3, 4), k50: onLeft(0.5, rollSign * ROLL * 0.6, 5), kick: onLeft(1, rollSign * ROLL, 6), kickS: onLeft(1.04, rollSign * ROLL * 1.05, 6),
};
const poses = { stand: P.stand };
for (const [n, p] of Object.entries(P)) if (n !== 'stand') { poses[`R_${n}`] = p; poses[`L_${n}`] = X.mirror(p); }
for (const p of Object.values(poses)) p.root.rot = { pitch: p.root.rot.pitch ?? 0, roll: p.root.rot.roll ?? 0 }; // every key carries roll (no carry-over)
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p])), D = meta.timeline.duration;
const side = (s) => {
  const sq = ph[`squat${s}`], to = ph[`touch${s}`], up = ph[`up${s}`], ki = ph[`kick${s}`], ho = ph[`hold${s}`], dn = ph[`down${s}`];
  const [a1, a2] = X.easeTimes([0.35, 0.7], sq.start, sq.end), [b1, b2] = X.easeTimes([0.3, 0.65], up.start, up.end);
  return [{ t: a1, pose: `${s}_d1` }, { t: a2, pose: `${s}_d2` }, { t: sq.end, pose: `${s}_touch` }, { t: +((to.start + to.end) / 2).toFixed(3), pose: `${s}_touchS` }, { t: to.end, pose: `${s}_touch` },
    { t: b1, pose: `${s}_d2` }, { t: b2, pose: `${s}_d1` }, { t: +(up.end - 0.06).toFixed(3), pose: 'stand' }, { t: +(ki.start + 0.04).toFixed(3), pose: 'stand' }, { t: +(ki.start + 0.17).toFixed(3), pose: `${s}_shift` }, { t: +(ki.start + 0.33).toFixed(3), pose: `${s}_k50` },
    { t: ki.end, pose: `${s}_kick` }, { t: +((ho.start + ho.end) / 2).toFixed(3), pose: `${s}_kickS` }, { t: ho.end, pose: `${s}_kick` }, { t: +(dn.start + 0.2).toFixed(3), pose: `${s}_k50` },
    { t: +(dn.start + 0.38).toFixed(3), pose: `${s}_shift` }, { t: +(dn.end - 0.04).toFixed(3), pose: 'stand' }];
};
const keyframes = [{ t: 0, pose: 'stand' }, { t: ph.squatR.start, pose: 'stand' }, ...side('R'), { t: ph.squatL.start, pose: 'stand' }, ...side('L'), { t: D, pose: 'stand' }];
const ex = H.module_(meta, F.contacts, poses, keyframes);
// loop checks: planted feet (only while their contact is at full weight), floor, kicking foot clear of the floor
let kickFoot = 1e9;
const rep = X.scan(ex, { planted: ['leg_r', 'leg_l'], probe: (W, pz, t) => { if ((pz.ik.leg_r.weight ?? 1) < 0.5 && (pz.ik.ball_r.weight ?? 0) < 0.5) kickFoot = Math.min(kickFoot, H.bottomOf(W, 'foot_r')); } });
const Wt = F.fk(P.touch), Wk = F.fk(P.kick), Ws = F.fk(P.stand), set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
const tipToHeel = V.len(V.sub(Wt.handtip_r.p, [ANK[0] - 6, 3, ANK[2] + 4]));
const abdOf = (W) => V.angle(V.sub(W.ankle_r.p, W.hip_r.p), [0, -1, 0]);
set('Stance', 'setup', `Ankles ${2 * HALF} cm apart, toes out ${TOE}°`); set('Stance', 'peak', 'Back to the same spot after each kick');
set('Knee flexion', 'setup', `${d(F.kneeOf(Ws, 'r'))}`); set('Knee flexion', 'peak', `${d(F.kneeOf(Wt, 'r'))} R / ${d(F.kneeOf(Wt, 'l'))} L at the heel touch`);
set('Heel touch', 'setup', 'Hands together at the chest'); set('Heel touch', 'peak', `Trunk ${d(F.trunkLean(Wt))} forward, side-bent ${d(LAT)} to the right; right fingertips ${r1(tipToHeel)} cm from the outside of the right heel (rig hand tip)`);
set('Side kick', 'setup', 'Both feet down'); set('Side kick', 'peak', `Right leg ${d(abdOf(Wk))} out from vertical (hip abduction ${d(P.kick.ch.hip_r.abd)}), foot ${r1(Wk.ankle_r.p[1])} cm up; trunk leaning ${d(F.trunkLean(Wk))} away`);
set('Tempo', 'setup', `Stand ${ph.setup.end} s`); set('Tempo', 'peak', `Per side ${r1(ph.squatR.end - ph.squatR.start)} s down, ${r1(ph.touchR.end - ph.touchR.start)} s touch, ${r1(ph.upR.end - ph.upR.start)} s up, ${r1(ph.kickR.end - ph.kickR.start)} s kick, ${r1(ph.downR.end - ph.downR.start)} s back`);
const pk = Math.max(F.kneeOf(Wt, 'r'), F.kneeOf(Wt, 'l'));
ex.checks.measure = { name: 'kneeFlexion', min: Math.floor(pk - 8), max: Math.ceil(pk + 6) };
console.log(`Alternate Heel Touch Side Kick Squat: wrote ${L.write(ex)}\n  touch pitch ${PT} knee ${r1(F.kneeOf(Wt, 'r'))} hipFlex ${P.touch.ch.hip_r.flex}/${P.touch.ch.hip_l.flex} tip-heel ${r1(tipToHeel)} wrist ${Wt.wrist_r.p.map(r1)} handtip ${Wt.handtip_r.p.map(r1)} kick abd ${r1(abdOf(Wk))} foot ${r1(Wk.ankle_r.p[1])} roll ${rollSign * ROLL} kickFootMin ${r1(kickFoot)}\n  ${JSON.stringify(rep)}`);
X.gate('alternate-heel-touch-side-kick-squat', rep, poses, { extra: [tipToHeel > 12 && `hand ${r1(tipToHeel)} cm from the heel`] });
