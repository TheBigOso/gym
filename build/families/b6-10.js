// Batch 6, family b6-10: band presses, flyes, rows, a pulldown, an overhead triceps extension and band curls. Builds on
// build/families/b3-shoulders.js (solveArm), b5-bandpull.js (rack anchors, strand scan) and b5-bandpush.js (band props)
// without changing them.
//  - armPath: the right arm solved onto a wrist path (wrist target, optional elbow target and palm direction per
//    fraction f of the rep), the left arm mirrored (bilateral) or left as in the base pose (one-arm moves).
//  - repKeys: the standard five-phase loop (setup hold, lift, hold, lower, reset) with eased key times.
//  - bandCheck: floor, planted contacts, channel jumps, every band strand's clearance from the body, rack uprights clear of
//    the body, joint limits.
//  - curlPath: wrist path for a curl about a (nearly) fixed elbow; palm forward (supinated) or thumb up (hammer).
//  - rackAt: a rack with one upright at (x, z) and a band looped round it at height y (one-arm moves: the upright in line
//    with the working shoulder).
const L = require('../lib');
const { V, r1, clone } = L;
const F = require('./b3-shoulders');
const EQ = require('./equip');
const C = require('./eq-cable');
const BP = require('./b5-bandpull');
const B5 = require('./b5-bandpush');

const ease = (u) => u * u * (3 - 2 * u);
const inv = (y) => { let a = 0, b = 1; for (let k = 0; k < 40; k++) { const m = (a + b) / 2; if (ease(m) < y) a = m; else b = m; } return (a + b) / 2; };
const lerp = (a, b, t) => V.add(V.scale(a, 1 - t), V.scale(b, t));
const POST = 6;

// spec(f) -> { sc (shoulder girdle, optional), at(S, f) -> { wrist, elbow?, palm?, thumb?, wElbow?, wPalm? } } where S is the
// right shoulder joint after the girdle change. Returns { poses: [..], err: [..] }.
function armPath(base, contacts, spec, FS, { mirror = true, guess = null } = {}) {
  const poses = [], err = [];
  let g = guess;
  for (const f of FS) {
    const k = spec(f), p = clone(base);
    if (k.sc) { p.ch.sc_r = clone(k.sc); if (mirror) p.ch.sc_l = clone(k.sc); }
    const S = L.fk(p, contacts).shoulder_r.p, t = k.at(S, f);
    const q = F.solveArm(p, Object.assign({ wPalm: 3 }, t, { guess: g || t.guess }));
    err.push(q.__err); g = F.armGuess(q);
    if (mirror) F.mirrorArm(q); else delete q.__err;
    poses.push(q);
  }
  return { poses, err };
}

// Five-phase loop: phases setup, lift, hold, lower, reset (ids as in the meta). keys: pose array for FS (0 = start, 1 = end
// of the lift). Returns { poses (named k0..kN), keyframes }.
function repKeys(meta, keys, FS) {
  const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p])), D = meta.timeline.duration, N = keys.length - 1;
  const poses = {}; keys.forEach((p, i) => { poses[`k${i}`] = p; });
  const t0 = ph.lift.start, t1 = ph.lift.end, t2 = ph.hold.end, t3 = ph.lower.end;
  const kf = [{ t: 0, pose: 'k0' }];
  if (t0 > 0) kf.push({ t: t0, pose: 'k0' });
  FS.forEach((f, i) => { if (i) kf.push({ t: +(t0 + (t1 - t0) * inv(f)).toFixed(3), pose: `k${i}` }); });
  kf.push({ t: t2, pose: `k${N}` });
  for (let i = N - 1; i >= 0; i--) kf.push({ t: +(t2 + (t3 - t2) * inv(1 - FS[i])).toFixed(3), pose: `k${i}` });
  if (t3 < D) kf.push({ t: D, pose: 'k0' });
  return { poses, keyframes: kf };
}

// Band strands of the module's band props, as [anchor, grip point] pairs
const strandsOf = (ex) => (W) => B5.strands(W, ex.props.filter((p) => p.kind === 'band')).map((s) => [s.a, s.b]);
function bandCheck(name, ex, { planted = ['leg_r', 'leg_l'], minLine = 0.5, skip, probe, maxJump = 4 } = {}) {
  const rep = BP.scan(ex, { planted, strands: strandsOf(ex), skip, probe });
  BP.gate(name, rep, { minLine, maxJump });
  C.limits(ex.poses);
  return rep;
}

// Rack with one upright at (x, z), the other `width` cm toward -Z (toward +Z when z < 0), the
// J-hooks toward the athlete (who faces +X; behind: the rack stands behind). Band anchor on the upright's face at height y.
function rackAt({ x, z = 0, y, width = 120, behind = false, hookY = null }) {
  const hy = hookY ?? (Math.abs(y - 140) < 25 ? (y > 140 ? y - 40 : y + 40) : 140);
  const cz = z >= 0 ? z - width / 2 : z + width / 2;
  const rk = EQ.rack({ x, z: r1(cz), width, hookY: r1(hy), facing: behind ? 1 : -1, id: 'rack' });
  return { rack: rk.prop, anchor: [r1(x + (behind ? 1 : -1) * POST / 2), r1(y), r1(z)] };
}

// Curl wrist path about an elbow E (world), upper arm toward `uDir` (from the shoulder), forearm sweeping from along the
// upper arm (flexion a0) toward `fwd` (flexion a1). palm: 'sup' (palm forward, turning up) or 'hammer' (thumb leading,
// palm toward the midline). Returns at(S, f) for armPath.
function curlPath({ elbow0, elbow1 = null, a0 = 6, a1 = 125, fwd = [1, 0, 0], palm = 'sup', medial = [0, 0, -1], wElbow = 2, inset = 0.3 }) {
  return (S, f) => {
    const E = elbow1 ? lerp(elbow0, elbow1, f) : elbow0, u = V.norm(V.sub(E, S));
    const fp = V.norm(V.sub(fwd, V.scale(u, V.dot(fwd, u)))), a = (a0 + (a1 - a0) * f) * Math.PI / 180;
    const fd = V.add(V.scale(u, Math.cos(a)), V.scale(fp, Math.sin(a)));
    const wrist = V.add(E, V.scale(fd, L.FA - inset));
    const pal = palm === 'sup' ? V.add(V.scale(fp, Math.cos(a)), V.scale(u, -Math.sin(a))) : V.norm(V.sub(medial, V.scale(fd, V.dot(medial, fd))));
    return { wrist, elbow: E, wElbow, palm: V.norm(pal), wPalm: 3 };
  };
}

// kinematics row setter that ignores rows the meta does not have
const setter = (ex) => (prefix, field, v) => { const k = ex.exercise.kinematics.find((x) => x.measure.startsWith(prefix)); if (k) k[field] = v; };
const slerp = BP.slerp;

// Standing band fly with a band looped round each upright of a rack behind the athlete (staggered stance, right foot
// forward). opt: { name, d0, d1 (arm directions, open and closed), hint0, hint1 (elbow side, open / closed), flex (elbow
// bend), anchorDY (anchor height above the shoulder joint, or anchorY), lean, rackX, rackW, rows(set, info) }
function flyModule(meta, opt) {
  const H = require('./hips');
  const st = B5.staggered({ front: 24, back: 22, stance: 13, knee: 10 });
  const base = clone(st.pose);
  base.root.rot = { pitch: -(opt.lean || 0) }; // slight forward lean (legs refitted to the same foot targets)
  const based = F.plantLegs(base, st.contacts);
  based.ch.neck_c7 = { rot: 0, flex: 0 }; based.ch.head_c1 = { rot: 0, flex: 2 + (opt.lean || 0) * 0.5 };
  const FLEX = opt.flex ?? 20;
  const dirAt = (f) => slerp(opt.d0, opt.d1, ease(f));
  const spec = (f) => ({
    sc: { protract: r1(-6 + 14 * ease(f)), elevate: 0 },
    at: (S) => {
      const d = dirAt(f), wrist = V.add(S, V.scale(d, L.reach(FLEX)));
      const hint = V.norm(lerp(opt.hint0, opt.hint1, ease(f)));
      // palm faces the direction of travel (tangent of the arc)
      const tg = V.sub(dirAt(Math.min(1, f + 0.02)), dirAt(Math.max(0, f - 0.02))), tan = V.norm(V.sub(tg, V.scale(d, V.dot(tg, d))));
      return { wrist, elbow: F.elbowFor(S, wrist, hint), wElbow: 1, palm: tan, wPalm: 2, guess: { plane: 0, elev: 85, axial: 0, flex: FLEX, pron: 90 } };
    },
  });
  const FS = [0, 0.2, 0.4, 0.6, 0.8, 1];
  const { poses: keys, err } = armPath(based, st.contacts, spec, FS);
  const { poses, keyframes } = repKeys(meta, keys, FS);
  const ex = H.module_(meta, st.contacts, poses, keyframes);
  const S0 = L.fk(poses.k0, st.contacts).shoulder_r.p;
  const RX = opt.rackX ?? -50, RW = opt.rackW ?? 150, AY = r1(opt.anchorY ?? S0[1] + (opt.anchorDY || 0));
  const rk = EQ.rack({ x: RX, width: RW, hookY: AY > 160 ? 120 : 160, facing: 1 });
  ex.props = [rk.prop, ...B5.bandProps({ anchor: [RX + POST / 2, AY, RW / 2], color: B5.COLOR.medium })];
  const rep = bandCheck(meta.exercise.id, ex, { minLine: 1 });
  const N = FS.length - 1, Wb = L.fk(poses.k0, st.contacts), Wt = L.fk(poses[`k${N}`], st.contacts), set = setter(ex);
  const hAbd = (W) => { const u = V.sub(W.wrist_r.p, W.shoulder_r.p); return Math.atan2(u[0], u[2]) / L.R.DEG; };
  const info = { hAbd0: d0(Math.abs(hAbd(Wb))), elev0: d0(humElev(Wb)), elev1: d0(humElev(Wt)), gap: r1(EQ.gripPoint(Wt, 'r').p[2] - EQ.gripPoint(Wt, 'l').p[2]), Wb, Wt, S0, AY };
  set('Elbow flexion', 'setup', `${d0(elbowAng(Wb))}, held`); set('Elbow flexion', 'peak', `${d0(elbowAng(Wt))} (unchanged)`);
  set('Band', 'setup', `Looped round the rack uprights ${-RX} cm behind, ${AY} cm up, ${RW} cm apart; strands ${rep.strand[0]} cm`);
  set('Band', 'peak', `Strands ${rep.strand[1]} cm with the hands together; at least ${r1(rep.line.d)} cm from the body`);
  set('Stance', 'setup', `Staggered: right foot 24 cm forward, left 22 cm back, knees soft, trunk ${d0(trunkFromVertical(Wb))} forward`); set('Stance', 'peak', 'Unchanged (trunk still)');
  set('Tempo', 'setup', 'Pause 0.6 s open'); set('Tempo', 'peak', '1.1 s in, 0.4 s squeeze, 1.8 s out, 0.4 s pause');
  if (opt.rows) opt.rows(set, info);
  console.log(`${opt.name}: wrote ${L.write(ex)}\n  err ${JSON.stringify(err)}\n  ${JSON.stringify(rep)}`);
  return { ex, rep, info };
}

const elbowAng = C.elbowAng;
const humElev = (W, s = 'r') => V.angle(V.sub(W[`elbow_${s}`].p, W[`shoulder_${s}`].p), V.sub(W.pelvis.p, W.neck_c7.p));
const trunkFromVertical = (W) => V.angle(V.sub(W.neck_c7.p, W.pelvis.p), [0, 1, 0]);
const d0 = (v) => `≈${Math.round(v)}°`;
const kneeOf = require('./hips').kneeOf;

module.exports = { setter, flyModule, ease, inv, lerp, armPath, repKeys, strandsOf, bandCheck, rackAt, curlPath, elbowAng, humElev, trunkFromVertical, d0, kneeOf };
