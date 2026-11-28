// Batch 6 family b6-12 helpers: one-hand kettlebell props and a loop scan for them (bell clear of the floor and the body),
// a generic loop scan (floor, planted-contact slides, channel jumps between frames, joint limits), hands clasped in front of
// the chest for bodyweight squats, and a left-right key mirror for alternating loops.
// Builds on build/families/equip.js (EQ), hips.js (loopReport) and b4-squats2.js (mirrorPose) without changing them.
const L = require('../lib');
const { R, V, Q, rig, r1, clone } = L;
const H = require('./hips');
const EQ = require('./equip');
const K = require('./b4-squats2');

const NOTE = 'Reference used only to identify the movement. No GymVisual media is stored here; this rig, model and animation are original.';
// one kettlebell in one hand (grip 'handle': the bell hangs past the knuckles, as the player draws it)
const kbProp = (side, id) => ({ id: id || `kb${side.toUpperCase()}`, kind: 'kettlebell', size: [EQ.KB.width, EQ.KB.bell, EQ.KB.bell], attach: { joint: `wrist_${side}`, grip: 'handle' } });

// stored channels that matter for branch flips (both arms and both legs)
const JOINTS = ['shoulder_r', 'elbow_r', 'wrist_r', 'shoulder_l', 'elbow_l', 'wrist_l', 'hip_r', 'hip_l', 'spine_t6', 'neck_c7'];
const CH = (pz) => { const o = {}; for (const j of JOINTS) for (const c in pz.ch[j] || {}) o[`${j}.${c}`] = pz.ch[j][c]; return o; };

// Whole-loop scan: hips.js loopReport (floor, planted slides, knee/ankle ranges) plus channel jumps and, for each kettlebell
// side in `kb`, the bell's lowest point and its clearance from the body (the holding hand and forearm skipped; `skip`
// widens that per side, e.g. /^(hand|thumb|forearm|upperarm)_r$/ while the bell rests against the arm).
function scan(ex, { planted = [], kb = [], skipKb = {}, probe } = {}) {
  let jump = { v: 0 }, prevC = null;
  const bell = {}; for (const s of kb) bell[s] = { floor: 1e9, body: { d: 1e9 } };
  const rep = H.loopReport(ex, {
    planted,
    probe: (W, pz, t, out) => {
      const cc = CH(pz);
      if (prevC) for (const k in cc) { const d = Math.abs(cc[k] - (prevC[k] ?? cc[k])); if (d > jump.v) jump = { v: +d.toFixed(2), k, t: +t.toFixed(2) }; }
      prevC = cc;
      for (const s of kb) {
        bell[s].floor = Math.min(bell[s].floor, EQ.kettlebellMinY(W, s));
        const c = EQ.kettlebellClear(W, s, { skip: skipKb[s] || new RegExp(`^(hand|thumb|forearm)_${s}$`) });
        if (c.d < bell[s].body.d) bell[s].body = { d: +c.d.toFixed(2), id: c.id, t: +t.toFixed(2) };
      }
      if (probe) probe(W, pz, t, out);
    },
  });
  rep.jump = jump;
  for (const s of kb) bell[s].floor = +bell[s].floor.toFixed(2);
  if (kb.length) rep.kb = bell;
  return rep;
}
// stored channels outside the rig limits (0.5 deg tolerance, as verify)
function limits(poses) {
  const viol = [];
  for (const [n, p] of Object.entries(poses)) for (const j in p.ch) { const lim = rig.byId[j] && rig.byId[j].limits; if (!lim) continue; for (const c in p.ch[j]) if (lim[c] && (p.ch[j][c] < lim[c][0] - 0.5 || p.ch[j][c] > lim[c][1] + 0.5)) viol.push(`${n}.${j}.${c}=${p.ch[j][c]}`); }
  return viol;
}
// fail the author on slides, floor, jumps, limit violations and kettlebell collisions
function gate(name, rep, poses, { maxJump = 6, minBell = -0.5, bellFloor = 0, extra = [] } = {}) {
  const bad = [];
  if (rep.slide > 0.05) bad.push(`planted contact slides ${rep.slide} cm`);
  if (rep.floor < -0.5) bad.push(`below the floor ${rep.floor} (${rep.floorAt})`);
  if (rep.jump && rep.jump.v > maxJump) bad.push(`channel jump ${rep.jump.v} deg (${rep.jump.k} at ${rep.jump.t}s)`);
  for (const [s, b] of Object.entries(rep.kb || {})) { if (b.floor < bellFloor) bad.push(`kettlebell ${s} below the floor ${b.floor}`); if (b.body.d < minBell) bad.push(`kettlebell ${s} into the body ${JSON.stringify(b.body)}`); }
  const viol = limits(poses); if (viol.length) bad.push(`joint limits ${viol.slice(0, 6).join(', ')}`);
  if (rep.dorsiR && rep.dorsiR[1] > 35) bad.push(`right ankle dorsiflexion ${rep.dorsiR[1]}`);
  if (rep.kneeR && rep.kneeR[1] > 150.5) bad.push(`right knee ${rep.kneeR[1]}`);
  if (rep.kneeL && rep.kneeL[1] > 150.5) bad.push(`left knee ${rep.kneeL[1]}`);
  for (const e of extra) if (e) bad.push(e);
  if (bad.length) { console.error(`FAIL ${name}: ${bad.join('; ')}`); process.exitCode = 1; }
  return bad;
}

// Hands clasped in front of the chest (bodyweight squats): wrists in front of the sternum at about armpit height, the right
// palm facing in, elbows down and a little out. Solved on the right arm, mirrored (the hands meet at the midline).
function claspArms(p, { fwd = 27, down = 19, z = 4.5 } = {}) {
  const q0 = clone(p); q0.ch.sc_r = { protract: 6, elevate: 0 };
  const W = L.fk(q0), T = W.spine_t6, S = W.shoulder_r.p;
  // target in the upper-trunk frame so the clasp follows the trunk lean
  const loc = Q.rot(Q.conj(T.q), V.sub(S, T.p)), tgt = V.add(T.p, Q.rot(T.q, [loc[0] + fwd, loc[1] - down, z]));
  const elbow = V.add(T.p, Q.rot(T.q, [loc[0] + 6, loc[1] - 26, loc[2] + 2]));
  const q = L.armToTarget(q0, tgt, { wrist: { pron: 0, flex: -10, dev: 0 }, axial: 0, axialW: 0.005, guess: [70, 40, -60], extra: (Wx) => V.sub(Wx.elbow_r.p, elbow).map((v) => v * 0.6) });
  for (const j of ['shoulder', 'elbow', 'wrist', 'sc']) q.ch[`${j}_l`] = clone(q.ch[`${j}_r`]);
  return q;
}
// (ik entries without a target, e.g. the lunge family's __fit bookkeeping, are dropped)
// Left arm to a world target, solved as the right arm of the mirrored pose (L.armToTarget), channels copied back
function leftTo(p, tgt, guess, opt = {}) {
  const m = mirror(p); m.ch.sc_r = clone(p.ch.sc_l || { protract: 4, elevate: 0 });
  const q = L.armToTarget(m, [tgt[0], tgt[1], -tgt[2]], Object.assign({ wrist: { pron: 0, flex: 0, dev: 0 }, axial: 0, axialW: 0.01, guess }, opt));
  const out = clone(p); for (const j of ['shoulder', 'elbow', 'wrist', 'sc']) out.ch[`${j}_l`] = clone(q.ch[`${j}_r`]);
  return out;
}
const mirror = (p) => { const q = clone(p); if (q.ik) for (const k of Object.keys(q.ik)) if (!q.ik[k] || !q.ik[k].target) delete q.ik[k]; return K.mirrorPose(q); };
const kneeOf = H.kneeOf;
const trunkLean = (W) => V.angle(V.sub(W.neck_c7.p, W.pelvis.p), [0, 1, 0]);
const elbowAng = (W, s = 'r') => 180 - V.angle(V.sub(W[`shoulder_${s}`].p, W[`elbow_${s}`].p), V.sub(W[`wrist_${s}`].p, W[`elbow_${s}`].p));
const humElev = (W, s = 'r') => V.angle(V.sub(W[`elbow_${s}`].p, W[`shoulder_${s}`].p), V.sub(W.pelvis.p, W.neck_c7.p));
// eased in-between times for a list of fractions between t0 and t1 (smoothstep in time)
const easeTimes = (fs, t0, t1) => fs.map((f) => { let a = 0, b = 1; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (m * m * (3 - 2 * m) < f) a = m; else b = m; } return +(t0 + (t1 - t0) * (a + b) / 2).toFixed(3); });

module.exports = { leftTo, NOTE, kbProp, scan, limits, gate, claspArms, mirror, kneeOf, trunkLean, elbowAng, humElev, easeTimes, CH };
