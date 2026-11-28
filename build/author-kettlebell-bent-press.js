// Kettlebell Bent Press (GymVisual 17218, movement reference only). Authored on the right: feet wider than the hips, both
// turned about 40 degrees to the left (planted), a kettlebell racked at the right shoulder with the elbow on the side of the
// ribs and the forearm vertical. Instead of pressing the bell up, the lifter bends the body away and down under it: hips
// out to the right and back, hinge and side-bend to the left with the chest turning open, the left hand sliding down the
// inside of the left leg, while the bell stays at about the same height and the right elbow straightens until the arm is
// locked vertical over the shoulder. Then stand up with the arm locked (as in a windmill), pause at the lockout and lower
// the bell back to the rack. Body keys are the dumbbell windmill's solve (planted legs, spine split, left hand on its path
// along the left leg, eyes on the bell); the right hand follows a world path from the rack to over the bottom shoulder.
// Note: the player draws a one-hand kettlebell past the knuckles, so with a vertical forearm the bell shows above the fist
// (bottoms-up look) instead of resting on the back of the forearm; see the batch report (needs a 'rack' grip).
const L = require('./lib');
const { R, V, Q, rig, r1, clone } = L;
const CA = require('./families/core-a');
const CB = require('./families/core-b');
const X = require('./families/b6-12');
const EQ = require('./families/equip');
const meta = require('./meta/kettlebell-bent-press.json');

const YAW = 40, HALF = +(process.env.HALF || 22);
const KNEE_R = +(process.env.KNEE_R || 9); // right knee nearly straight (soft enough that the leg never overreaches between keys)
const contacts = ['r', 'l'].map((s) => Object.assign(L.legContact(s), { pole: [Math.cos(YAW * R.DEG), 0.05, -Math.sin(YAW * R.DEG) + (s === 'r' ? 0.1 : -0.1)], handRot: CA.qArr(L.footRot(YAW)) }));
const FEET = { r: [0, L.ANKLE_H, HALF], l: [0, L.ANKLE_H, -HALF] };
const TH = V.len(rig.byId.knee_r.offset), SH = V.len(rig.byId.ankle_r.offset);
const legD = (knee) => Math.sqrt(TH * TH + SH * SH + 2 * TH * SH * Math.cos(knee * R.DEG));
const st = L.POSES.standing({ stance: HALF, toeOut: 0 }).pose;
delete st.ik;

// k: { u (0 top .. 1 bottom), yaw, pitch (pelvis; - = hinge forward), lat (spine, - = toward the left), rot (spine, + = chest
// turns right/open), kneeL, hand (left wrist target [x, y, z]) }
function key(k) {
  let p = clone(st);
  p.root.rot = { yaw: k.yaw, pitch: k.pitch, roll: 0 };
  const sp = { spine_l5: 0.2, spine_t12: 0.4, spine_t6: 0.4 };
  for (const j in sp) p.ch[j] = { rot: r1(k.rot * sp[j]), latFlex: r1(k.lat * sp[j]), flex: r1((k.flex || 0) * sp[j]) };
  // pelvis position from the two planted legs (right knee nearly straight, left knee kneeL); roll free, x pulled back
  p = L.solvePose(p, ['root.pos.0', 'root.pos.1', 'root.pos.2', 'root.rot.roll'], [
    (W) => [(V.len(V.sub(W.hip_r.p, FEET.r)) - legD(KNEE_R)) * 3, (V.len(V.sub(W.hip_l.p, FEET.l)) - legD(k.kneeL)) * 3],
    L.obj.reg('root.pos.0', k.x ?? 0, 0.3), L.obj.reg('root.pos.2', k.z ?? 0, 0.3), L.obj.reg('root.rot.roll', 0, 0.05)], { iters: 400 }).pose;
  p.ik = { leg_r: { target: FEET.r.slice(), weight: 1 }, leg_l: { target: FEET.l.slice(), weight: 1 } };
  for (const s of ['r', 'l']) { p = CA.fitLeg(p, s, FEET[s], contacts); for (const [j, c] of [[`ankle_${s}`, 'dorsi'], [`hip_${s}`, 'rot'], [`hip_${s}`, 'abd']]) p.ch[j][c] = r1(L.wrap(p.ch[j][c])); }
  // right arm locked straight up (world vertical) above the shoulder, palm facing forward-ish
  p.ch.sc_r = clone(k.sc || { protract: 4, elevate: 12 });
  const S = L.fk(p).shoulder_r.p;
  if (!k.hand_r) p = L.armToTarget(p, V.add(S, [0, L.reach(4), 0]), { flex: 4, wrist: { pron: 0, flex: 0, dev: 0 }, axial: 0, guess: k.armGuess || [90, 170, 0] });
  else { // forearm about vertical under the bell: the elbow sits below the wrist
    let tgt = k.hand_r; const lim = rig.byId.shoulder_r.limits;
    if (k.handRel) { const { o0, f } = k.handRel, u0 = V.norm(o0), dir = V.norm(V.add(V.scale(u0, 1 - f), V.scale([0, 1, 0], f))); tgt = V.add(S, V.scale(dir, V.len(o0) + (L.reach(4) - V.len(o0)) * f)); }
    { const dv = V.sub(tgt, S), dl = V.len(dv); if (dl < 14.5) tgt = V.add(S, V.scale(dv, 14.5 / dl)); } // the folded arm cannot reach closer
    const score = (q) => { const W = L.fk(q), e = V.sub(W.wrist_r.p, W.elbow_r.p), sh = q.ch.shoulder_r, out = (v, [a, b]) => Math.max(0, a - v, v - b);
      return V.len(V.sub(W.wrist_r.p, tgt)) * 3 + Math.max(0, Math.hypot(e[0], e[2]) - 4) + Math.max(0, W.elbow_r.p[1] - W.wrist_r.p[1] + 10) * 2 + out(sh.plane, lim.plane) + out(sh.elev, lim.elev) + out(q.ch.elbow_r.flex, [0, 150]) * 2; };
    let best = null;
    for (const g of [k.armGuess, [30, 25, 0], [60, 30, -40], [10, 20, 40], [80, 40, 0], [40, 60, -60]].filter(Boolean)) {
      const q = L.armToTarget(p, tgt, { wrist: { pron: 0, flex: -5, dev: 0 }, axial: 0, axialW: 0.005, guess: g, extra: (W) => { const e = V.sub(W.wrist_r.p, W.elbow_r.p), h = Math.hypot(e[0], e[2]); return [Math.max(0, h - 4) * 0.6]; } });
      const sc = score(q); if (!best || sc < best.sc) best = { q, sc };
    }
    p = best.q;
  }
  // left arm: solved as the right arm of the mirrored pose, then mirrored back
  const m = CB.mirror(p); m.ch.sc_r = { protract: 6, elevate: 0 };
  const hm = [k.hand[0], k.hand[1], -k.hand[2]];
  const ml = L.armToTarget(m, hm, { wrist: { pron: 0, flex: 0, dev: 0 }, axial: 0, guess: k.lGuess || [30, 40, 0], extra: (W) => [Math.max(0, W.elbow_r.p[2] - W.shoulder_r.p[2] - 6) * 0.5] });
  for (const j of ['shoulder', 'elbow', 'wrist', 'sc']) p.ch[`${j}_l`] = clone(ml.ch[`${j}_r`]);
  // eyes on the dumbbell (capped neck rotation and extension)
  p = L.gaze(p, 'wrist_r', k.gazeTol ?? 10, [k.headRot ?? 0, k.headFlex ?? 0], { rot: 60, ext: 30 });
  for (const j of ['neck_c7', 'head_c1']) p.ch[j].flex = Math.min(p.ch[j].flex, 28);
  return p;
}
// body keys from the windmill (top standing ... bottom hinged), the right hand on a world path in the bend-under
const KEYS = {
  top: { yaw: 25, pitch: 0, lat: 0, rot: -15, kneeL: 6, x: 0, z: 0, hand: [4, 72, -24], headRot: 0, headFlex: 0 },
  d1: { yaw: 30, pitch: -20, lat: -9, rot: 3, kneeL: 10, x: -3, z: 1.5, hand: [9, 62, -22], headRot: 15, headFlex: -10 },
  d2: { yaw: 34, pitch: -40, lat: -17, rot: 16, kneeL: 15, x: -7, z: 3, hand: [12, 50, -20], headRot: 30, headFlex: -20 },
  bottom: { yaw: 38, pitch: -60, lat: -24, rot: 26, kneeL: 20, x: -9.5, z: 4, hand: [14, 40, -19], headRot: 40, headFlex: -25 },
  bottomHold: { yaw: 38.5, pitch: -61.5, lat: -24.5, rot: 27, kneeL: 20.5, x: -9.7, z: 4.1, hand: [14, 38.5, -19], headRot: 40, headFlex: -25 },
};
const poses = {};
let prevArm = null, prevL = null;
const solveKey = (name, k) => { const p = key(Object.assign({ armGuess: prevArm, lGuess: prevL }, k)); prevArm = [p.ch.shoulder_r.plane, p.ch.shoulder_r.elev, p.ch.shoulder_r.axial]; prevL = [p.ch.shoulder_l.plane, p.ch.shoulder_l.elev, p.ch.shoulder_l.axial]; poses[name] = p; return p; };
// stand-up half: arm locked vertical (windmill keys, solved top -> bottom as in the windmill)
for (const n of ['top', 'd1', 'd2', 'bottom', 'bottomHold']) solveKey(`${n}_L`, KEYS[n]);
// rack: standing, elbow down on the side of the ribs, fist beside the shoulder at about shoulder height
const WTOP = L.fk(poses.top_L, contacts), S0 = WTOP.shoulder_r.p;
const RO0 = [+(process.env.RF ?? 11), +(process.env.RU ?? -4), +(process.env.RO ?? 9)], RACK_W = V.add(S0, RO0);
const WBOT = L.fk(poses.bottom_L, contacts), LOCK_W = WBOT.wrist_r.p;
// bend-under: the hand moves from the rack to the bottom lockout point, keeping about the same height
const lerp = (a, b, f) => a.map((v, i) => v + (b[i] - v) * f);
prevArm = [40, 30, 0]; prevL = null;
const UNDER = [['r0', 'top', 0, [20, 15, -80]], ['r1', 'd1', 0.25, [-15, 55, -90]], ['r2', 'd2', 0.6, [-40, 90, -40]], ['r3', 'bottom', 1]];
for (const [n, b, f, ag] of UNDER) solveKey(n, Object.assign({}, KEYS[b], { armGuess: ag, gazeTol: r1(35 - 25 * f), hand_r: n === 'r3' ? null : true, handRel: { o0: RO0, f }, sc: { protract: r1(4 + 2 * f), elevate: r1(-2 + 14 * f) } }));
poses.r3 = poses.bottom_L; delete poses.r3;
// lower from the lockout back to the rack (standing)
prevArm = [poses.top_L.ch.shoulder_r.plane, poses.top_L.ch.shoulder_r.elev, poses.top_L.ch.shoulder_r.axial];
solveKey('low1', Object.assign({}, KEYS.top, { gazeTol: 20, hand_r: V.add(S0, [+(process.env.L1F ?? 4), +(process.env.L1U ?? 34), +(process.env.L1O ?? 14)]), sc: { protract: 4, elevate: 8 } }));
solveKey('low2', Object.assign({}, KEYS.top, { gazeTol: 30, hand_r: V.add(S0, [+(process.env.L2F ?? 7), +(process.env.L2U ?? 10), +(process.env.L2O ?? 13)]), sc: { protract: 4, elevate: 3 } }));
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p])), D = meta.timeline.duration;
const keyframes = [{ t: 0, pose: 'r0' }, { t: ph.setup.end, pose: 'r0' }, ...X.easeTimes([0.3, 0.65], ph.under.start, ph.under.end).map((t, i) => ({ t, pose: `r${i + 1}` })), { t: ph.under.end, pose: 'bottom_L' },
  { t: +((ph.pause.start + ph.pause.end) / 2).toFixed(3), pose: 'bottomHold_L' }, { t: ph.pause.end, pose: 'bottom_L' },
  ...X.easeTimes([0.35, 0.7], ph.up.start, ph.up.end).map((t, i) => ({ t, pose: ['d2_L', 'd1_L'][i] })), { t: ph.up.end, pose: 'top_L' }, { t: ph.lockout.end, pose: 'top_L' },
  ...X.easeTimes([0.35, 0.7], ph.lower.start, ph.lower.end).map((t, i) => ({ t, pose: ['low1', 'low2'][i] })), { t: ph.lower.end, pose: 'r0' }, { t: D, pose: 'r0' }];
const props = [X.kbProp('r')];
const ex = { schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props, contacts,
  timeline: meta.timeline, poses, keyframes, activation: meta.activation, guides: meta.guides, checks: clone(meta.checks) };
ex.exercise.reference.note = 'Reference used only to identify the movement. No GymVisual media is stored here; this rig, model and animation are original.';

{ const pk = Math.max(poses.bottomHold_L.ch.hip_r.flex, poses.bottomHold_L.ch.hip_l.flex); ex.checks.measure = { name: 'hipFlexion', min: Math.floor(pk - 8), max: Math.ceil(pk + 4) }; }
const armVert = (W) => V.angle(V.sub(W.wrist_r.p, W.shoulder_r.p), [0, 1, 0]);
const trunkFlex = (W) => V.angle(V.sub(W.neck_c7.p, W.pelvis.p), [0, 1, 0]);
const segGap = (P, a, b) => { const ab = V.sub(b, a), t = Math.max(0, Math.min(1, V.dot(V.sub(P, a), ab) / V.dot(ab, ab))); return V.len(V.sub(P, V.add(a, V.scale(ab, t)))); };
const legGap = (W) => Math.min(segGap(W.wrist_l.p, W.hip_l.p, W.knee_l.p), segGap(W.wrist_l.p, W.knee_l.p, W.ankle_l.p)); // left hand to the left leg's bone line (cm)
const rep = CA.scan(ex, { armVert, trunk: trunkFlex, hipFlexR: (W, p) => p.ch.hip_r.flex, hipFlexL: (W, p) => p.ch.hip_l.flex, handY: (W) => W.wrist_l.p[1], legGap });
const kb = X.scan(ex, { planted: ['leg_r', 'leg_l'], kb: ['r'] });
const Wt = L.fk(poses.top_L, contacts), Wb = L.fk(poses.bottomHold_L, contacts), Wr = L.fk(poses.r0, contacts), kin = ex.exercise.kinematics, d = (v) => `≈${Math.round(v)}°`, pb = poses.bottomHold_L;
kin[0].setup = `Upright (${d(trunkFlex(Wt))} from vertical)`; kin[0].peak = `${d(trunkFlex(Wb))} from vertical (pelvis to C7): hips hinge ${d(-pb.root.rot.pitch)}, spine side-bends ${d(-(pb.ch.spine_l5.latFlex + pb.ch.spine_t12.latFlex + pb.ch.spine_t6.latFlex))} to the left and turns ${d(pb.ch.spine_l5.rot + pb.ch.spine_t12.rot + pb.ch.spine_t6.rot)} open toward the dumbbell`;
kin[1].setup = `Racked: fist ${Math.round(Wr.wrist_r.p[1])} cm up beside the shoulder, elbow ${d(X.elbowAng(Wr))}`; kin[1].peak = `Locked vertical over the shoulder at the bottom (${d(armVert(Wb))} off vertical, elbow ${d(X.elbowAng(Wb))}); the hand stays between ${Math.round(Math.min(Wr.wrist_r.p[1], Wb.wrist_r.p[1]))} and ${Math.round(Math.max(Wr.wrist_r.p[1], Wb.wrist_r.p[1]))} cm on the way under`;
kin[2].setup = `Hips ${d(poses.top_L.ch.hip_r.flex)} R / ${d(poses.top_L.ch.hip_l.flex)} L; knees ${d(CA.kneeOf(Wt, 'r'))} R / ${d(CA.kneeOf(Wt, 'l'))} L`; kin[2].peak = `Hips ${d(pb.ch.hip_r.flex)} R / ${d(pb.ch.hip_l.flex)} L; knees ${d(CA.kneeOf(Wb, 'r'))} R (locked) / ${d(CA.kneeOf(Wb, 'l'))} L (soft)`;
kin[3].setup = `Left hand beside the left thigh, ${Math.round(Wt.wrist_l.p[1])} cm up`; kin[3].peak = `Slides to ${Math.round(Wb.wrist_l.p[1])} cm above the floor along the inside of the left shin (wrist ${r1(legGap(Wb))} cm from the leg's bone line)`;
kin[4].setup = `Feet ${2 * HALF} cm apart, both turned ${YAW}° to the left`; kin[4].peak = 'Unchanged (planted)';
kin[5].setup = `Rack ${ph.setup.end} s`; kin[5].peak = `${r1(ph.under.end - ph.under.start)} s bend under, ${r1(ph.pause.end - ph.pause.start)} s pause, ${r1(ph.up.end - ph.up.start)} s stand up, ${r1(ph.lockout.end - ph.lockout.start)} s lockout, ${r1(ph.lower.end - ph.lower.start)} s back to the rack`;
console.log(`Kettlebell Bent Press: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}\n  kb ${JSON.stringify(kb.kb)} jump ${JSON.stringify(kb.jump)} slide ${kb.slide} floor ${kb.floor}`);
for (const n of Object.keys(poses)) { const p = poses[n], W = L.fk(p, contacts); console.log(`  ${n.padEnd(10)} root=${p.root.pos.map(r1)} rot=${JSON.stringify(p.root.rot)} hip=${p.ch.hip_r.flex}/${p.ch.hip_l.flex} knee=${CA.kneeOf(W, 'r').toFixed(0)}/${CA.kneeOf(W, 'l').toFixed(0)} armV=${armVert(W).toFixed(1)} handL=${W.wrist_l.p.map(r1)} shR=${JSON.stringify(p.ch.shoulder_r)} shL=${JSON.stringify(p.ch.shoulder_l)} neck=${JSON.stringify([p.ch.neck_c7, p.ch.head_c1])}`); }
X.gate('kettlebell-bent-press', kb, poses, { minBell: 0, extra: [rep.legGap[1] > 25 && 'left hand far from the leg'] });
