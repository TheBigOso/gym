// Band Seated Twist (GymVisual 23083, movement reference only; the page could not be read, so the movement follows the
// name and standard coaching). Seated on the mat side-on to a rack upright, the band tied round it at chest height on the
// athlete's right (authored right; the player mirrors for the left). Knees bent, feet flat (planted contacts), trunk tall
// and leaning back a little. Both hands hold the band handle together, arms long in front of the chest (two-hand band with
// an anchor). The ribs and shoulders turn away from the anchor (to the left) through the spine channels, mostly
// thoracic; the hands stay in front of the breastbone (solved in the upper-trunk frame); pelvis still. Seated base and
// feet as in author-russian-twist.js (core-b), with a more upright trunk.
const L = require('./lib');
const { R, V, Q, rig, r1, clone } = L;
const CB = require('./families/core-b');
const B5 = require('./families/b5-bandcore');
const meta = require('./meta/band-seated-twist.json');

const LEAN = 20, KNEE = 80;
const sitBottom = (W) => Math.min(CB.bottomOf(W, 'pelvis'), CB.bottomOf(W, 'buttock_r'), CB.bottomOf(W, 'buttock_l'));

/* ---------------- seated, trunk LEAN degrees back from vertical, long spine ---------------- */
let base = CB.lie({ kneeFlex: 90, spine: { l5: 2, t12: 2, t6: 4 }, pitch: 93 });
Object.assign(base.ch, { spine_l5: { rot: 0, latFlex: 0, flex: 4 }, spine_t12: { rot: 0, latFlex: 0, flex: 2 }, spine_t6: { rot: 0, latFlex: 0, flex: 0 } });
CB.neck(base, -2);
const setPitch = (p, P) => { p.root.rot = { pitch: r1(P) }; return p; };
{ let lo = -10, hi = 90; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2, a = CB.trunkFromVertical(L.fk(setPitch(clone(base), m))); if (a < LEAN) lo = m; else hi = m; } setPitch(base, (lo + hi) / 2); }
for (const s of ['r', 'l']) { base.ch[`hip_${s}`] = { flex: 95, abd: 0, rot: 0 }; base.ch[`knee_${s}`] = { flex: KNEE }; base.ch[`ankle_${s}`] = { dorsi: -20 }; }
base.root.pos[1] = r1(base.root.pos[1] - sitBottom(L.fk(base)) + 0.2);

/* ---------------- feet planted: ankles on the floor with the knees at about KNEE ---------------- */
const TH = V.len(rig.byId.knee_r.offset), SH = V.len(rig.byId.ankle_r.offset);
const HIP = L.fk(base).hip_r.p;
const hipToAnkle = Math.sqrt(TH * TH + SH * SH - 2 * TH * SH * Math.cos((180 - KNEE) * R.DEG));
const ankleX = r1(HIP[0] + Math.sqrt(hipToAnkle ** 2 - (HIP[1] - L.ANKLE_H) ** 2));
const T = { r: [ankleX, L.ANKLE_H, r1(HIP[2] + 1)], l: [ankleX, L.ANKLE_H, -r1(HIP[2] + 1)] };
const contacts = ['r', 'l'].map((sd) => Object.assign(L.legContact(sd), { pole: [0.2, 1, sd === 'r' ? 0.06 : -0.06] }));
function fitLeg(pose, s) {
  const c = contacts.find((x) => x.id === `leg_${s}`), q = clone(pose); q.ik = { [c.id]: { target: T[s], weight: 1 } };
  const Wi = R.evalPose(rig, q, [c]);
  return L.solvePose(pose, [`ch.hip_${s}.flex`, `ch.hip_${s}.abd`, `ch.hip_${s}.rot`, `ch.knee_${s}.flex`, `ch.ankle_${s}.dorsi`],
    [L.obj.at(`knee_${s}`, Wi[`knee_${s}`].p, 2), L.obj.at(`ankle_${s}`, Wi[`ankle_${s}`].p, 3), L.obj.at(`toe_${s}`, Wi[`toe_${s}`].p, 2), L.obj.reg(`ch.hip_${s}.abd`, 0, 0.05), L.obj.reg(`ch.hip_${s}.rot`, 0, 0.05)], { iters: 300 }).pose;
}
base = fitLeg(fitLeg(base, 'r'), 'l');
base.ik = { leg_r: { target: T.r, weight: 1 }, leg_l: { target: T.l, weight: 1 } };
base.ch.sc_r = { protract: 6, elevate: 0 }; base.ch.sc_l = { protract: 6, elevate: 0 };

/* ---------------- arms long in front of the chest, hands together (upper-trunk frame) ---------------- */
const GZ = 2.2, REACH = 57, DROP = 2; // grip 57 cm in front of T6, level with it (chest height)
const spec = (W) => {
  const fr = W.spine_t6.q, o = W.spine_t6.p, at = (v) => V.add(o, Q.rot(fr, v));
  return { grip: at([REACH, -DROP, GZ]), axis: Q.rot(fr, [0, 1, 0]), palm: Q.rot(fr, [0, 0, -1]), wPalm: 2, guess: { plane: 85, elev: 75, axial: 10, pron: 30, flex: 15 } };
};
const SPLIT = { spine_l5: 0.12, spine_t12: 0.44, spine_t6: 0.44 };
function turn(theta) {
  let p = clone(base);
  for (const j of Object.keys(SPLIT)) p.ch[j] = Object.assign({}, p.ch[j], { rot: r1(theta * SPLIT[j]) });
  CB.neck(p, -2, theta * 0.5);
  p = B5.armSide(p, contacts, 'r', spec); const e = p.__err;
  p = B5.armSide(p, contacts, 'l', spec); p.__err = [e, p.__err];
  return p;
}
const START = 12, END = -44; // start turned a little toward the anchor (+ = right), finish turned away
const FR = [0, 0.2, 0.4, 0.6, 0.8, 1], poses = {}, err = {};
FR.forEach((f, i) => { const p = turn(START + (END - START) * (f * f * (3 - 2 * f) * 0.5 + f * 0.5)); err[`k${i}`] = p.__err; delete p.__err; poses[`k${i}`] = p; });
poses.hold = turn(END - 2); delete poses.hold.__err;
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p])), D = meta.timeline.duration;
const seg = (t0, t1, names) => names.map((n, i) => ({ t: +(t0 + ((t1 - t0) * i) / (names.length - 1)).toFixed(3), pose: n }));
const ks = FR.map((_, i) => `k${i}`);
const keyframes = [{ t: 0, pose: 'k0' }, ...seg(ph.twist.start, ph.twist.end, ks), { t: ph.hold.end, pose: 'hold' }, ...seg(ph.return.start + 0.25, ph.return.end, ks.slice().reverse()), { t: D, pose: 'k0' }];

// band: rack upright beside the athlete on the right, tied at the height of the hands at the start
const W0 = L.fk(poses.k0, contacts), EQ = require('./families/equip'), h0 = EQ.barAt(W0).c;
const ANCHOR_Z = 88, rk = B5.uprightX(h0[0] + 14, ANCHOR_Z, { toward: -1, hookY: 175 });
const ex = CB.moduleOf(meta, poses, keyframes, contacts);
ex.props = [...meta.props, rk.prop, B5.band('band', { joint: 'wrist_r', with: 'wrist_l' }, rk.anchor(h0[1]))];
const rep = B5.scan(ex, { still: meta.checks.stillJoints, measure: B5.MEASURE.hipFlexion });
B5.gate('band-seated-twist', rep, { minBand: 0.3, range: [meta.checks.measure.min, meta.checks.measure.max] });

const We = L.fk(poses.hold, contacts), rh = poses.hold.ch, rot = (c) => c.spine_l5.rot + c.spine_t12.rot + c.spine_t6.rot;
CB.setKin(ex, 'Trunk rotation', `${B5.deg(rot(poses.k0.ch))} toward the anchor`, `${B5.deg(-rot(rh))} away from the anchor (lumbar ${B5.deg(-rh.spine_l5.rot)}, thoracic ${B5.deg(-(rh.spine_t12.rot + rh.spine_t6.rot))}), head turning with the hands`);
CB.setKin(ex, 'Trunk lean', `${B5.deg(CB.trunkFromVertical(W0))} back from vertical (pelvis to C7)`, 'Held');
CB.setKin(ex, 'Hands', `Together, ${Math.round(V.len(V.sub(h0, W0.spine_t6.p)))} cm in front of the upper back at ${Math.round(h0[1])} cm, band tied ${ANCHOR_Z} cm to the side at the same height`, `Still in front of the breastbone, ${Math.round(EQ.barAt(We).c[2])} cm across the midline`);
CB.setKin(ex, 'Knees and hips', `Knees ${B5.deg(CB.kneeOf(W0, 'r'))}, hips ${B5.deg(poses.k0.ch.hip_r.flex)}, feet flat`, 'Feet and pelvis do not move');
CB.setKin(ex, 'Tempo', 'Sit 0.6 s', '1.2 s away, 0.5 s pause, 1.5 s back, 0.6 s pause');
CB.finish(ex, rep, 'Band Seated Twist');
console.log(`  arm err ${JSON.stringify(err)}`);
