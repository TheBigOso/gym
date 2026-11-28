// g3-lower family: helpers shared by the g3-lower authors (Smith, sled, lever, belt-squat, pendulum moves).
//  - fromBase(id): an authored exercise module (src/exercises/<id>.json) used as the movement base.
//  - resample(ex, dt): the base loop as dense keys (every dt s plus the base key times), so per-key corrections stay
//    tight between keys.
//  - armTo(p, side, g, opt): one arm solved so its 'bar' grip point sits on g (thumb axis along the bar, palm kept as
//    close as possible to opt.palm, optional elbow hint). Works for either side (no mirroring: asymmetric bodies too).
//  - smithify(base, opt): a free-barbell module turned into a Smith machine module. The rail line is fitted to the base
//    bar path (or given); every key is then corrected so the hands' midpoint sits ON the rail line:
//      mode 'root': the whole body shifts fore-aft on its planted feet (bar on the back / front rack);
//      mode 'arms': the arms are re-solved so the hands move onto the line (hanging or pressing arms).
//    The Smith prop (gear-smith.js) replaces the barbell (and any bench-press stands); other props (bench, box) stay.
//  - press(meta, opt): the lying press (b5-bbpress.js lyingPress) with a vertical bar path for the Smith machine.
// Units: cm, world axes (+X forward, +Y up, +Z the figure's right).
const L = require('../lib');
const { R, V, Q, rig, r1, clone } = L;
const EQ = require('./equip');
const SG = require('./gear-smith');

const GRIP = 'bar';
const ARM_GUESSES = [[0, 30, 0, 90, 90], [20, 40, 40, 120, 90], [40, 60, 60, 120, 0], [-20, 20, -30, 60, 90], [60, 80, 0, 100, 90], [10, 90, 90, 140, 0], [-40, 40, 0, 130, 90]];
function fromBase(id) { return clone(require(`../../src/exercises/${id}.json`)); }

/* ---------------- dense resampling of a base loop ---------------- */
function resample(ex, dt = 0.1, { minGap = 0.035 } = {}) {
  const tl = R.buildTimeline(ex), D = ex.timeline.duration, ts = new Set(ex.keyframes.map((k) => +k.t.toFixed(3)));
  for (let t = 0; t < D; t += dt) { const tt = +t.toFixed(3); if ([...ts].every((k) => Math.abs(k - tt) >= minGap)) ts.add(tt); }
  ts.add(+D.toFixed(3));
  const times = [...ts].sort((a, b) => a - b), poses = {}, keyframes = [];
  times.forEach((t, i) => { const nm = `s${i}`; const p = clone(tl.pose(t)); poses[nm] = round(p); keyframes.push({ t, pose: nm }); });
  return { poses, keyframes };
}
function round(p) {
  const q = clone(p);
  if (q.root) { q.root.pos = q.root.pos.map((v) => +v.toFixed(2)); if (q.root.rot) for (const k in q.root.rot) q.root.rot[k] = +q.root.rot[k].toFixed(2); }
  for (const j in q.ch) for (const c in q.ch[j]) q.ch[j][c] = +q.ch[j][c].toFixed(2);
  if (q.ik) for (const k in q.ik) { q.ik[k].target = q.ik[k].target.map((v) => +v.toFixed(2)); if (q.ik[k].weight != null) q.ik[k].weight = +q.ik[k].weight.toFixed(3); }
  return q;
}

/* ---------------- one arm onto a bar grip point ---------------- */
const armPaths = (s) => [`ch.shoulder_${s}.plane`, `ch.shoulder_${s}.elev`, `ch.shoulder_${s}.axial`, `ch.elbow_${s}.flex`, `ch.wrist_${s}.pron`, `ch.wrist_${s}.flex`, `ch.wrist_${s}.dev`];
function armTo(p, side, g, { palm = null, thumb = null, axis = [0, 0, 1], elbow = null, elbowW = 0.4, dirW = 1.0, contacts = null, iters = 300, extra = [], guesses = null, grip = GRIP, wristMin = -70 } = {}) {
  const s = side, a = V.norm(axis);
  const objs = [
    (W) => V.sub(EQ.gripPoint(W, s, grip).p, g).map((v) => v * 6),
    (W) => [(1 - Math.abs(V.dot(EQ.gripPoint(W, s, grip).ax, a))) * 30],
    (W) => (palm ? V.sub(Q.rot(W[`wrist_${s}`].q, [1, 0, 0]), palm).map((v) => v * dirW) : []),
    (W) => (thumb ? V.sub(Q.rot(W[`wrist_${s}`].q, [0, 0, 1]), thumb).map((v) => v * dirW * 0.5) : []),
    (W) => (elbow ? V.sub(W[`elbow_${s}`].p, elbow).map((v) => v * elbowW) : []),
    (W, q) => { const sh = q.ch[`shoulder_${s}`], el = q.ch[`elbow_${s}`].flex, w = q.ch[`wrist_${s}`]; return [Math.min(0, sh.elev - 1) * 3, Math.min(0, sh.plane + 58) * 3, Math.max(0, sh.plane - 138) * 3, Math.min(0, el - 1) * 3, Math.max(0, el - 148) * 3, Math.min(0, w.flex - wristMin) * 3, Math.max(0, w.flex - 70) * 3, Math.min(0, w.dev + 18) * 3, Math.max(0, w.dev - 33) * 3]; },
    ...extra,
  ];
  let r = null;
  for (const gs of [null, ...(guesses || [])]) {
    const q0 = clone(p); if (gs) { q0.ch[`shoulder_${s}`] = { plane: gs[0], elev: gs[1], axial: gs[2] }; q0.ch[`elbow_${s}`] = { flex: gs[3] }; q0.ch[`wrist_${s}`] = { pron: gs[4], flex: gs[5] ?? 0, dev: gs[6] ?? 0 }; }
    const rr = L.solvePose(q0, armPaths(s), objs, { iters, contacts }); if (!r || rr.cost < r.cost - 1e-6) r = rr;
  }
  const q = r.pose; q.__err = V.len(V.sub(EQ.gripPoint(L.fk(q, contacts), s, grip).p, g));
  return q;
}

/* ---------------- free barbell -> Smith machine ---------------- */
function lineFit(pts) {
  const n = pts.length, my = pts.reduce((s, p) => s + p[1], 0) / n, mx = pts.reduce((s, p) => s + p[0], 0) / n, mz = pts.reduce((s, p) => s + p[2], 0) / n;
  let sxy = 0, syy = 0; for (const p of pts) { sxy += (p[0] - mx) * (p[1] - my); syy += (p[1] - my) ** 2; }
  const b = syy > 1e-6 ? sxy / syy : 0;
  return { x0: mx - b * my, slope: b, z: mz };
}
// Point on the rail line at height y
const lineAt = (ln, y) => [ln.x0 + ln.slope * y, y, ln.z];
// Every pose moved so the hands' midpoint sits on the rail line ln (mode 'root' or 'arms'); returns the worst offsets
function correct(poses, contacts, ln, mode) {
  let worst = 0, gripWorst = 0;
  for (const nm in poses) {
    let p = poses[nm];
    if (mode === 'root') {
      for (let k = 0; k < 4; k++) { const c = EQ.barAt(L.fk(p, contacts), GRIP).c, t = lineAt(ln, c[1]); p.root.pos[0] = +(p.root.pos[0] + (t[0] - c[0])).toFixed(2); p.root.pos[2] = +(p.root.pos[2] + (t[2] - c[2])).toFixed(2); }
    } else {
      for (let k = 0; k < 2; k++) {
        const W = L.fk(p, contacts), b = EQ.barAt(W, GRIP), t = lineAt(ln, b.c[1]), d = V.sub(t, b.c);
        if (V.len(d) < 0.05 && (!ln.width || Math.abs(b.width - ln.width) < 0.1)) break;
        for (const s of ['r', 'l']) {
          const g = ln.width ? V.add(t, [0, 0, (s === 'r' ? 1 : -1) * ln.width / 2]) : V.add(EQ.gripPoint(W, s, GRIP).p, d);
          const q = armTo(p, s, g, { palm: Q.rot(W[`wrist_${s}`].q, [1, 0, 0]), thumb: Q.rot(W[`wrist_${s}`].q, [0, 0, 1]), elbow: V.add(W[`elbow_${s}`].p, d), contacts });
          gripWorst = Math.max(gripWorst, q.__err); delete q.__err; p = q;
        }
      }
      p = round(p);
    }
    poses[nm] = p;
    const c = EQ.barAt(L.fk(p, contacts), GRIP).c; worst = Math.max(worst, V.len(V.sub(c, lineAt(ln, c[1]))));
  }
  return { worst, gripWorst };
}
// Adaptive refinement: where the interpolated loop leaves the rail line by more than tol between two keys, a corrected
// key is inserted at the worst sample (a few rounds; the arm channels swing fast near the shoulder's elevation singularity)
function refineKeys(ex, ln, mode = 'arms', { tol = 0.3, rounds = 4 } = {}) {
  const contacts = ex.contacts || [];
  const off = (p) => { const c = EQ.barAt(L.fk(p, contacts), GRIP).c; return V.len(V.sub(c, lineAt(ln, c[1]))); };
  let added = 0;
  for (let k = 0; k < rounds; k++) {
    const tl = R.buildTimeline(ex), kf = ex.keyframes, add = [];
    for (let i = 0; i + 1 < kf.length; i++) {
      const t0 = kf[i].t, t1 = kf[i + 1].t; if (t1 - t0 < 0.006) continue;
      let worst = { d: 0 }; for (const f of [0.2, 0.4, 0.6, 0.8]) { const t = t0 + (t1 - t0) * f, d = off(tl.pose(t)); if (d > worst.d) worst = { d, t }; }
      if (worst.d > tol) add.push(+worst.t.toFixed(4));
    }
    if (!add.length) break;
    for (const t of add) { const nm = `r${k}_${added++}`, ps = { [nm]: round(clone(tl.pose(t))) }; correct(ps, contacts, ln, mode); ex.poses[nm] = ps[nm]; ex.keyframes.push({ t, pose: nm }); }
    ex.keyframes.sort((a, b) => a.t - b.t);
  }
  return added;
}
// Dense keys of a module re-fitted onto a rail line (used after a path builder whose keys are too far apart)
function railFix(ex, ln, mode = 'arms', dt = 0.05) {
  const { poses, keyframes } = resample(ex, dt);
  const r = correct(poses, ex.contacts || [], ln, mode);
  ex.poses = poses; ex.keyframes = keyframes;
  r.added = refineKeys(ex, ln, mode);
  return r;
}
// opt: { mode: 'root' | 'arms', incline (deg, null = fitted, clamped to maxIncline), x (rail x at the floor, null = fitted),
//        dt, iters (corrections per key), keepProps (RegExp of base prop kinds to keep), smith: extra gear-smith options,
//        hookDrop (cm under the top bar height), safetyDrop (cm under the lowest bar height) }
function smithify(base, opt = {}) {
  const { mode = 'arms', dt = 0.1, maxIncline = 8, keepProps = /^(bench|box|mat|wall)$/, hookDrop = 6, safetyDrop = 4 } = opt;
  const contacts = base.contacts || [];
  const { poses, keyframes } = resample(base, dt);
  // fit the rail line to the bar path
  const pts = Object.values(poses).map((p) => EQ.barAt(L.fk(p, contacts), GRIP).c);
  const fit = lineFit(pts);
  let slope = opt.incline != null ? Math.tan(opt.incline * R.DEG) : Math.max(-Math.tan(maxIncline * R.DEG), Math.min(Math.tan(maxIncline * R.DEG), fit.slope));
  const my = pts.reduce((s, p) => s + p[1], 0) / pts.length, mx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const ln = { x0: opt.x != null ? opt.x : mx - slope * my, slope, z: +fit.z.toFixed(1) };
  ln.x0 = r1(ln.x0);
  if (mode === 'arms') ln.width = +EQ.barAt(L.fk(poses[keyframes[0].pose], contacts), GRIP).width.toFixed(1);
  const { worst, gripWorst } = correct(poses, contacts, ln, mode);
  const ex = clone(base); ex.poses = poses; ex.keyframes = keyframes;
  refineKeys(ex, ln, mode);
  // Smith prop: rail line through (x0, 0) at the fitted incline; pegs under the top, safety stops under the bottom
  const ys = Object.values(poses).map((p) => EQ.barAt(L.fk(p, contacts), GRIP).c[1]);
  const top = Math.max(...ys), bot = Math.min(...ys);
  const incline = +(Math.atan(ln.slope) / R.DEG).toFixed(2);
  const smo = Object.assign({ x: ln.x0, z: ln.z, incline, hookY: Math.round(top - hookDrop), safetyY: Math.floor(bot - safetyDrop), restY: Math.round(top - hookDrop) }, opt.smith || {});
  if (smo.safetyY < 25) delete smo.safetyY;
  const sm = SG.smith(smo);
  ex.props = [...(base.props || []).filter((p) => keepProps.test(p.kind) && !p.attach), ...sm.props];
  return { ex, sm, line: ln, fit: { incline: +(Math.atan(fit.slope) / R.DEG).toFixed(1), keyWorst: +worst.toFixed(2), gripWorst: +gripWorst.toFixed(2) }, top, bot };
}

/* ---------------- Smith lying press (vertical bar path) ---------------- */
function press(meta, opt) {
  const F = require('./b5-bbpress');
  const P = F.lyingPress(meta, Object.assign({}, opt, { topDX: opt.bottomDX }));
  const railX = P.cb[0], sm0 = SG.smith({ x: railX });
  return Object.assign(P, { railX, sm0 });
}

/* ---------------- meta helpers ---------------- */
// fills empty kinematics setup / peak fields from a base module's filled rows (same measure names)
function kinFromBase(ex, base) {
  for (const k of ex.exercise.kinematics) { const b = base.exercise.kinematics.find((x) => x.measure === k.measure); if (b) { if (!k.setup) k.setup = b.setup; if (!k.peak) k.peak = b.peak; } }
}

/* ---------------- whole author for a Smith conversion of a free-barbell module ---------------- */
// Attaches the meta (exercise, camera, timeline, activation, guides, checks), keeps the base's filled kinematics, writes
// the bar-path row, runs the Smith sweep and the standard failures, and writes the module.
function attachMeta(ex, meta) {
  const H = require('./hips');
  ex.exercise = clone(meta.exercise); ex.exercise.reference.note = H.NOTE;
  ex.camera = meta.camera; ex.timeline = meta.timeline; ex.activation = meta.activation; ex.guides = meta.guides; ex.checks = clone(meta.checks);
  return ex;
}
function smithAuthor(id, baseId, opt = {}) {
  const H = require('./hips');
  const meta = require(`../meta/${id}.json`), base = fromBase(baseId);
  const r = smithify(base, opt), ex = attachMeta(r.ex, meta);
  kinFromBase(ex, base);
  const row = ex.exercise.kinematics.find((k) => /^Bar (path|position)/.test(k.measure));
  const ang = Math.abs(r.sm.incline) < 0.5 ? 'vertical rails' : `rails ${Math.abs(r.sm.incline).toFixed(1)}° from vertical (top toward the ${r.sm.incline > 0 ? 'front' : 'back'})`;
  if (row) { if (/^Bar path/.test(row.measure)) row.setup = `Smith ${ang}, bar ${r1(r.top)} cm high at the top`; row.peak = `${r1(r.bot)} cm at the bottom (${r1(r.top - r.bot)} cm along the rails); hands' midpoint within ${r.fit.keyWorst} cm of the rail line at every key`; }
  if (opt.edit) opt.edit(ex, r);
  const sw = SG.sweep(ex, r.sm, { skip: opt.skip || /^(hand|thumb|forearm)_/, planted: opt.planted });
  console.log(`${meta.exercise.name}: wrote ${L.write(ex)}\n  rail ${JSON.stringify(r.line)} incline ${r.sm.incline} (free-bar fit ${r.fit.incline}) keys ${Object.keys(ex.poses).length} gripErr ${r.fit.gripWorst}\n  sweep ${JSON.stringify(sw)}`);
  SG.fail(sw, opt.fail || {});
  return { ex, r, sw };
}

/* ---------------- whole author for a Smith lying press ---------------- */
// opt: lyingPress options (angle, GW, bottomDX, flare, dip, touch, wristBot / wristTop, base) + { baseId (free-bar module for
// the remaining kinematics rows), where (bar-path wording for the bottom), safetyDrop }
function smithPressAuthor(id, opt) {
  const H = require('./hips'), C = require('./b3-chest'), BB = require('./barbell');
  const meta = require(`../meta/${id}.json`), P = press(meta, opt);
  const ex = H.module_(meta, P.contacts, P.poses, P.keyframes);
  if (opt.fix) railFix(ex, { x0: P.railX, slope: 0, z: 0, width: opt.GW }, 'arms', opt.fix);
  const Wt = L.fk(P.poses.top, P.contacts), Wb = L.fk(P.poses.bottom, P.contacts);
  const bt = EQ.barAt(Wt, GRIP).c, bb = EQ.barAt(Wb, GRIP).c;
  const HOOK_Y = Math.round(bt[1] - 5), SAFETY_Y = Math.floor(bb[1] - (opt.safetyDrop ?? 4));
  const sm = SG.smith({ x: P.railX, hookY: HOOK_Y, safetyY: SAFETY_Y, restY: HOOK_Y });
  ex.props = [P.B.prop, ...sm.props];
  if (opt.baseId) kinFromBase(ex, fromBase(opt.baseId));
  const sw = SG.sweep(ex, sm, { planted: ['leg_r', 'leg_l'], skip: opt.skip });
  const set = (m, f, v) => { const k = ex.exercise.kinematics.find((x) => x.measure.startsWith(m)); if (k) k[f] = v; };
  const d = (v) => `≈${Math.round(v)}°`, S = P.S;
  set('Grip width', 'setup', `${opt.GW} cm between the bar grips (shoulder joints ${r1(2 * S[2])} cm apart)`); set('Grip width', 'peak', `Constant (${sw.width[0]}-${sw.width[1]} cm over the loop)`);
  set('Elbow flexion', 'setup', `${d(BB.elbowOf(Wt, 'r'))} at the top (arms straight, not locked)`); set('Elbow flexion', 'peak', `${d(BB.elbowOf(Wb, 'r'))} at the bottom`);
  set('Elbow tuck', 'setup', 'Arms reaching up to the bar'); set('Elbow tuck', 'peak', `${d(C.elbowFlare(Wb))} from the trunk at the bottom; upper arms ${d(C.armDip(Wb))} below the back plane`);
  set('Upper arm angle', 'setup', `${d(V.angle(V.sub(Wt.elbow_r.p, Wt.shoulder_r.p), [0, 1, 0]))} from vertical`); set('Upper arm angle', 'peak', `${d(V.angle(V.sub(Wb.elbow_r.p, Wb.shoulder_r.p), [0, 1, 0]))} from vertical at the bottom`);
  set('Bar path', 'setup', `Vertical Smith rails ${r1(P.railX - S[0])} cm toward the feet from the shoulder joints; top ${r1(bt[1] - P.B.top)} cm above the bench`);
  set('Bar path', 'peak', `Bottom ${opt.where || 'on the chest'}, ${r1(bt[1] - bb[1])} cm of travel straight down the rails`);
  set('Tempo', 'setup', `Top ${P.T.h} s`); set('Tempo', 'peak', `${r1(P.T.b - P.T.h)} s down, ${r1(P.T.p - P.T.b)} s at the bottom, ${r1(P.T.r - P.T.p)} s up, ${r1(P.T.D - P.T.r)} s at the top`);
  set('Knee flexion', 'setup', `${d(H.kneeOf(P.W0, 'r'))}, feet ${2 * P.foot[2]} cm apart`); set('Knee flexion', 'peak', 'Unchanged (feet planted)');
  if (opt.edit) opt.edit(ex, { P, sm, sw, Wt, Wb, set });
  console.log(`${meta.exercise.name}: wrote ${L.write(ex)}\n  rail x ${P.railX} bar ${r1(bb[1])} -> ${r1(bt[1])} hookY ${HOOK_Y} safetyY ${SAFETY_Y} gripErr ${P.gripWorst().toFixed(2)} keys ${Object.keys(ex.poses).length}\n  bottom elbow ${BB.elbowOf(Wb, 'r').toFixed(0)} flare ${C.elbowFlare(Wb).toFixed(0)} dip ${C.armDip(Wb).toFixed(0)}; top elbow ${BB.elbowOf(Wt, 'r').toFixed(0)}\n  sweep ${JSON.stringify(sw)}`);
  SG.fail(sw, opt.fail || {});
  if (P.gripWorst() > 0.5) { console.error('FAIL: hands off the bar grip points'); process.exitCode = 1; }
  return { ex, P, sm, sw };
}

/* ---------------- sled machines (src/gear/g3lower-sled.js) ---------------- */
const GS = require('../../src/gear/g3lower-sled.js');
// sled(type, params, opt): prop at opt.center (default origin) with params; returns { prop, P, toLocal, toWorld }
function sled(type, params = {}, { id = 'sled', center = [0, 0, 0], color = null } = {}) {
  const prop = { id, kind: 'sled', center: center.slice(), params: { type, ...clone(params) } };
  if (color) prop.color = color;
  const P = GS.g3sParams(prop), toLocal = (p) => V.sub(p, center), toWorld = (p) => V.add(p, center);
  return { prop, P, toLocal, toWorld };
}
const sledTarget = (S, W) => S.toWorld(GS.g3sTarget(S.P, (j) => S.toLocal(W[j].p), (sd, g) => S.toLocal(EQ.gripPoint(W, sd, g).p)));
const sledTravel = (S, W) => GS.g3sTravel(S.P, S.toLocal(sledTarget(S, W)));
// sample points of a part (world, carriage at travel s for carriage parts)
function partPts(part, off, k = 4) {
  const pts = [], xf = typeof off === 'function' ? off : (q) => V.add(off, q);
  if (part.t === 'box') {
    const a = ((part.rz || 0) * Math.PI) / 180, ax = [[Math.cos(a), Math.sin(a), 0], [-Math.sin(a), Math.cos(a), 0], [0, 0, 1]], h = part.s.map((v) => v / 2);
    for (let i = 0; i <= k; i++) for (let j = 0; j <= k; j++) for (let l = 0; l <= k; l++) {
      if (i % k && j % k && l % k) continue;
      const u = [(i / k) * 2 - 1, (j / k) * 2 - 1, (l / k) * 2 - 1];
      pts.push(xf(V.add(part.c, V.add(V.scale(ax[0], u[0] * h[0]), V.add(V.scale(ax[1], u[1] * h[1]), V.scale(ax[2], u[2] * h[2]))))));
    }
  } else {
    const d = V.sub(part.b, part.a), ax = V.norm(d), u = V.norm(V.cross(ax, Math.abs(ax[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])), w = V.cross(ax, u);
    const rings = part.m === 'plate' ? [0, 1] : [0, 0.25, 0.5, 0.75, 1], rr = part.m === 'plate' ? [0.5, 1] : [1];
    for (const t of rings) for (const r of rr) for (let i = 0; i < 12; i++) { const an = (i / 12) * 2 * Math.PI; pts.push(xf(V.add(V.add(part.a, V.scale(d, t)), V.add(V.scale(u, Math.cos(an) * part.r * r), V.scale(w, Math.sin(an) * part.r * r))))); }
  }
  return pts;
}
const BODY = rig.shapes.flatMap((s) => (s.bilateral ? [`${s.id}_r`, `${s.id}_l`] : [s.id]));
// least clearance of the sled's fixed parts and carriage (at the pose's travel) from the body; skip: { fixed, car } RegExps
function sledClear(S, W, skip = {}) {
  const parts = GS.g3sParts(S.P), s = sledTravel(S, W), fr = GS.g3sFrame(S.P, s), c0 = S.toWorld([0, 0, 0]);
  const carXf = (q) => S.toWorld(V.add(fr.o, V.add(V.scale(fr.x, q[0]), V.add(V.scale(fr.y, q[1]), [0, 0, q[2]]))));
  const out = {};
  for (const [grp, list, off] of [['fixed', parts.fixed, c0], ['car', parts.car, carXf]]) {
    let best = { d: 1e9 };
    for (const part of list) for (const p of partPts(part, off)) for (const id of BODY) { if (skip[grp] && skip[grp].test(id)) continue; const d = EQ.pointShape(W, p, id); if (d < best.d) best = { d: +d.toFixed(2), id, m: part.m }; }
    out[grp] = best;
  }
  return out;
}
// whole loop: carriage travel range, worst distance of the followed point from the line, clamp hits, clearances
function sledTrack(ex, S, { planted = [], skip = {}, every = 20 } = {}) {
  const H = require('./hips');
  const out = { travel: [1e9, -1e9], offLine: 0, offAt: null, clamp: 0, clear: {} };
  let i = 0;
  const rep = H.loopReport(ex, { planted, probe: (W, pz, t) => {
    const tg = S.toLocal(sledTarget(S, W)), s = GS.g3sTravel(S.P, tg), off = GS.g3sOffLine(S.P, tg);
    out.travel = [Math.min(out.travel[0], s), Math.max(out.travel[1], s)];
    if (off > out.offLine) { out.offLine = +off.toFixed(2); out.offAt = +t.toFixed(2); }
    if (s <= S.P.range[0] + 1e-6 || s >= S.P.range[1] - 1e-6) out.clamp++;
    if (i++ % every === 0) { const c = sledClear(S, W, skip); for (const k in c) if (!out.clear[k] || c[k].d < out.clear[k].d) out.clear[k] = { ...c[k], t: +t.toFixed(2) }; }
  } });
  out.travel = out.travel.map((v) => +v.toFixed(1));
  return Object.assign(rep, { sled: out });
}
function sledGate(name, rep, { maxOff = 1.0, minCar = -1.0, minFixed = -1.0, maxSlide = 0.05, floor = -0.5 } = {}) {
  const s = rep.sled, bad = [];
  if (s.offLine > maxOff) bad.push(`followed point ${s.offLine} cm off the travel line at ${s.offAt}s`);
  if (s.clamp) bad.push(`carriage pinned at its travel limit (${s.clamp} samples)`);
  if (s.clear.car && s.clear.car.d < minCar) bad.push(`carriage (${s.clear.car.m}) into the ${s.clear.car.id} by ${-s.clear.car.d} cm at ${s.clear.car.t}s`);
  if (s.clear.fixed && s.clear.fixed.d < minFixed) bad.push(`frame (${s.clear.fixed.m}) into the ${s.clear.fixed.id} by ${-s.clear.fixed.d} cm at ${s.clear.fixed.t}s`);
  if (rep.slide > maxSlide) bad.push(`planted contact slides ${rep.slide} cm`);
  if (rep.floor < floor) bad.push(`below the floor ${rep.floor}`);
  if (bad.length) { console.error(`FAIL ${name}: ${bad.join('; ')}`); process.exitCode = 1; }
  return bad;
}

/* ---------------- sled hack squat: the body slides rigidly along the rails ---------------- */
// The back rests on the carriage pad, so the trunk keeps its angle and the hips travel on a straight line parallel to the
// rails; the feet are planted on the fixed platform (leg IK), the hands hold the carriage handles (constant arm angles,
// since the trunk only translates). opt: { lean (trunk lean back from vertical, deg), platform tilt pf, stance, toe,
// beta (leg angle behind vertical at the top), kTop / kBot (knee flexion at the top / bottom), T (phase times) }
function hackSquat(opt = {}) {
  const H = require('./hips'), F = require('./b3-shoulders');
  const { lean = 40, pf = 15, stance = 14, toe = 12, beta = 16, kTop = 10, kBot = 100, padShift = 5 } = opt;
  const base = clone(L.POSES.standing({ stance, toeOut: toe }).pose); delete base.ik;
  base.root.rot = { pitch: lean };
  base.ch.neck_c7 = { rot: 0, flex: -lean * 0.35 }; base.ch.head_c1 = { rot: 0, flex: -lean * 0.3 }; // head on the pad, eyes forward
  const contacts = ['r', 'l'].map((sd) => H.legC(sd, { pole: [Math.cos(6 * R.DEG), 0.3, (sd === 'r' ? 1 : -1) * Math.sin(6 * R.DEG)], rot: H.footQ(-pf, sd === 'r' ? -toe : toe) }));
  const W0 = L.fk(base), up = V.norm(V.sub(W0.neck_c7.p, W0.pelvis.p)), dirDeg = Math.atan2(up[1], up[0]) / R.DEG;
  const dDown = [-up[0], -up[1], 0];
  // platform and ankle targets: platform surface centre P0, ankles ANKLE_H off the tilted surface
  const thigh = V.len(rig.byId.knee_r.offset), shank = V.len(rig.byId.ankle_r.offset);
  const legAt = (k) => Math.sqrt(thigh * thigh + shank * shank + 2 * thigh * shank * Math.cos(k * R.DEG));
  const P0 = [0, 14, 0], pa = pf * R.DEG, A = [r1(P0[0] - Math.sin(pa) * L.ANKLE_H + 4), r1(P0[1] + Math.cos(pa) * L.ANKLE_H), 0];
  const H0 = [A[0] - Math.sin(beta * R.DEG) * legAt(kTop), A[1] + Math.cos(beta * R.DEG) * legAt(kTop), 0];
  const hipAt = (sv) => V.add(H0, V.scale(dDown, sv));
  const kneeAtS = (sv) => { const d = V.len(V.sub(hipAt(sv), [A[0], A[1], 0])); return 180 - Math.acos(Math.max(-1, Math.min(1, (thigh * thigh + shank * shank - d * d) / (2 * thigh * shank)))) / R.DEG; };
  let a = 0, b = 90; for (let i = 0; i < 50; i++) { const m = (a + b) / 2; if (kneeAtS(m) < kBot) a = m; else b = m; }
  const sBot = r1(a);
  const poseAt = (sv) => {
    let p = clone(base); p.root.pos = hipAt(sv).map(r1); // hip joints sit at the root height (rig v2 standing base)
    p.ik = { leg_r: { target: [A[0], A[1], stance], weight: 1 }, leg_l: { target: [A[0], A[1], -stance], weight: 1 } };
    return F.plantLegs(p, contacts);
  };
  return { base, contacts, A, P0, H0, dDown, dirDeg, sBot, poseAt, kneeAtS, lean, pf, stance, toe, padShift };
}

function hackAuthor(id, opt = {}) {
  const H = require('./hips'), B = require('./b3-back'), GL = require('./gear-lever');
  const meta = require(`../meta/${id}.json`), hs = hackSquat(opt), ph = meta.timeline.phases, D = meta.timeline.duration;
  // carriage: followed point = top of the shoulders (shoulder joints' midpoint + padShift up); tune the shoulder-pad height
  // and the back-pad gap so both rest on the body (clearance about 0.3 cm)
  const Wt = L.fk(hs.poseAt(0), hs.contacts);
  const mk = (shift, gap) => sled('hack_squat', { dirDeg: r1(hs.dirDeg), o: [0, 0], range: [-(hs.sBot + 4), 4], follow: { joints: ['shoulder_r'], t: 0, shift: [0, shift, 0] }, pad: { len: 92, w: 40, t: 9, back: 78, gap }, platform: { x: hs.P0[0], y: hs.P0[1], w: 70, d: 50, angle: hs.pf } });
  const o0 = (S) => { const tg = sledTarget(S, Wt); S.P.o = [r1(tg[0]), r1(tg[1])]; S.prop.params.o = S.P.o; return S; };
  const clearOf = (S, pick) => { const parts = GS.g3sParts(S.P), o = GS.g3sOrigin(S.P, sledTravel(S, Wt)); let best = 1e9; for (const part of parts.car.filter(pick)) for (const p of partPts(part, o)) for (const bid of BODY) { if (/^(hand|thumb|forearm|upperarm|biceps|deltoid)_/.test(bid)) continue; best = Math.min(best, EQ.pointShape(Wt, p, bid)); } return best; };
  const isShoulderPad = (part) => part.t === 'box' && part.m === 'pad' && part.s[0] === 16, isBackPad = (part) => part.t === 'box' && part.m === 'pad' && part.s[0] > 50;
  let lo = -4, hi = 20; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (clearOf(o0(mk(m, 30)), isShoulderPad) < 0.3) lo = m; else hi = m; }
  const shift = r1(hi); let g0 = -5, g1 = 30; for (let i = 0; i < 30; i++) { const m = (g0 + g1) / 2; if (clearOf(o0(mk(shift, m)), isBackPad) < 0.3) g0 = m; else g1 = m; }
  const S = o0(mk(shift, r1(g1)));
  // hands on the carriage handles (vertical grips beside the shoulders), constant arm angles
  const og = sledTarget(S, Wt), grip = V.add(og, [10, -8, 26]);
  let armed = armTo(hs.poseAt(0), 'r', grip, { axis: [0, 1, 0], palm: [0, 0, -1], contacts: hs.contacts, iters: 400, guesses: ARM_GUESSES });
  const gErr = armed.__err; delete armed.__err; B.mirrorArm(armed);
  const arms = {}; for (const j of ['sc_r', 'sc_l', 'shoulder_r', 'shoulder_l', 'elbow_r', 'elbow_l', 'wrist_r', 'wrist_l']) arms[j] = clone(armed.ch[j]);
  const at = (f) => { const p = hs.poseAt(hs.sBot * f); Object.assign(p.ch, clone(arms)); return p; };
  // keys: top hold, lower (eased), bottom, rise, top
  const poses = {}, keyframes = [], ease = (u) => 0.5 - 0.5 * Math.cos(Math.PI * u), N = 6;
  poses.top = at(0); poses.bottom = at(1);
  keyframes.push({ t: 0, pose: 'top' }, { t: ph[0].end, pose: 'top' });
  for (let i = 1; i < N; i++) { const nm = `d${i}`; poses[nm] = at(ease(i / N)); keyframes.push({ t: r1(ph[0].end + (ph[1].end - ph[0].end) * i / N * 100) / 100, pose: nm }); }
  keyframes.push({ t: ph[1].end, pose: 'bottom' }, { t: ph[2].end, pose: 'bottom' });
  for (let i = 1; i < N; i++) { const nm = `u${i}`; poses[nm] = at(ease(1 - i / N)); keyframes.push({ t: r1(ph[2].end + (ph[3].end - ph[2].end) * i / N * 100) / 100, pose: nm }); }
  keyframes.push({ t: ph[3].end, pose: 'top' }, { t: D, pose: 'top' });
  for (const k of keyframes) k.t = +k.t.toFixed(3);
  const ex = H.module_(meta, hs.contacts, poses, keyframes);
  ex.props = [S.prop, ...GL.handProps()];
  const rep = sledTrack(ex, S, { planted: ['leg_r', 'leg_l'], skip: { car: /^(hand|thumb|forearm)_/ } });
  const Wb = L.fk(poses.bottom, hs.contacts), set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
  set('Knee flexion', 'setup', `${d(H.kneeOf(Wt, 'r'))} at the top`); set('Knee flexion', 'peak', `${d(H.kneeOf(Wb, 'r'))} at the bottom`);
  set('Hip flexion', 'setup', `${d(poses.top.ch.hip_r.flex)} (trunk reclined on the pad)`); set('Hip flexion', 'peak', `${d(poses.bottom.ch.hip_r.flex)} at the bottom`);
  set('Back angle', 'setup', `Back on the pad, trunk ${d(hs.lean)} back from vertical; rails parallel to it (${r1(hs.dirDeg - 90)}° from vertical)`); set('Back angle', 'peak', 'Unchanged: the trunk slides down the rails without tipping');
  set('Foot position', 'setup', `Feet ${2 * hs.stance} cm apart (ankle centres), toes out ${hs.toe}°, on a platform tilted ${hs.pf}° toes up`); set('Foot position', 'peak', `Unchanged (feet planted); ankle dorsiflexion ${d(poses.bottom.ch.ankle_r.dorsi)} at the bottom`);
  set('Carriage travel', 'setup', 'Carriage at the top of the rails'); set('Carriage travel', 'peak', `${r1(rep.sled.travel[1] - rep.sled.travel[0])} cm down the rails`);
  set('Tempo', 'setup', `Top ${ph[0].end} s`); set('Tempo', 'peak', `${r1(ph[1].end - ph[0].end)} s down, ${r1(ph[2].end - ph[1].end)} s at the bottom, ${r1(ph[3].end - ph[2].end)} s up`);
  console.log(`${meta.exercise.name}: wrote ${L.write(ex)}\n  dir ${r1(hs.dirDeg)} sBot ${hs.sBot} padShift ${shift} gap ${S.P.pad.gap} gripErr ${gErr.toFixed(2)} hip ${poses.top.ch.hip_r.flex} -> ${poses.bottom.ch.hip_r.flex} knee -> ${poses.bottom.ch.knee_r.flex} dorsi ${poses.bottom.ch.ankle_r.dorsi}\n  ${JSON.stringify({ floor: rep.floor, slide: rep.slide, sled: rep.sled })}`);
  sledGate(id, rep, { minCar: -1.0, minFixed: -1.0 });
  if (gErr > 0.5) { console.error('FAIL: hands off the handles'); process.exitCode = 1; }
  return { ex, S, hs, rep };
}

/* ---------------- seated leg presses (sled kind 'sled' type leg_press: linear 45-degree sled or lever mode) ---------------- */
// The athlete sits on the seat with the back on the pad (gear-lever.js seated), hands on the side handles; the feet push
// the plate, which travels on a line (sled) or swings on an arc about a pivot (lever, params.pivot). The ball of each
// working foot stays on one point of the plate, so the carriage follows it exactly (follow point = the ball of the foot).
// opt: { mode: 'sled' | 'lever', seat, back, dirDeg (plate push direction at the top), h (feet above the hip line along the
//   plate, cm), footOff (ankle along the plate from the plate's reference point), stance, toe, kTop, kBot, legs: 'both' | 'r',
//   radius (lever arm length), calf: { knee, dorsi, plantar } (calf press: knees fixed, the ankles push the plate),
//   freeFoot: [x ahead of the left hip, z] (single-leg: the left foot rests on the floor) }
const TOE = rig.byId.toe_r.offset, BALL = [TOE[0], -L.ANKLE_H, 0];
const ballFollow = (() => { const u = V.norm([TOE[0], TOE[1], 0]), pc = [-u[1], u[0]], lt = Math.hypot(TOE[0], TOE[1]); // ball = t (toe) + off * perp
  const det = TOE[0] * pc[1] - TOE[1] * pc[0], t = (BALL[0] * pc[1] - BALL[1] * pc[0]) / det, off = (TOE[0] * BALL[1] - TOE[1] * BALL[0]) / det; void lt; return { t: +t.toFixed(4), off: +off.toFixed(3) }; })();
function rot2(v, deg) { const a = deg * R.DEG, c = Math.cos(a), sn = Math.sin(a); return [v[0] * c - v[1] * sn, v[0] * sn + v[1] * c, v[2] || 0]; }
function legPress(opt = {}) {
  const H = require('./hips'), GL = require('./gear-lever'), B = require('./b3-back');
  const { mode = 'sled', seat, back, dirDeg = 45, h = 12, footOff = 0, stance = 13, toe = 8, kTop = 10, kBot = 95, legs = 'both', radius = 95, calf = null } = opt;
  const Mf = { P: { seat, back, pads: [] }, toWorld: (q) => q.slice() };
  const st = GL.seated(Mf, { knee: 90, feet: 'free', thighRise: opt.thighRise ?? 25, abd: 4 });
  const base = clone(st.pose); base.ch.neck_c7 = { rot: 0, flex: opt.neck ?? 4 }; base.ch.head_c1 = { rot: 0, flex: opt.head ?? 6 };
  const W0 = L.fk(base); seat.hx = r1(W0.hip_r.p[0] + (opt.handleX ?? 4)); seat.hz = opt.handleZ ?? seat.w / 2 + 6;
  const Hr = W0.hip_r.p, Hm = [(W0.hip_r.p[0] + W0.hip_l.p[0]) / 2, W0.hip_r.p[1], 0];
  const d0 = [Math.cos(dirDeg * R.DEG), Math.sin(dirDeg * R.DEG), 0], up0 = [-d0[1], d0[0], 0];
  const thigh = V.len(rig.byId.knee_r.offset), shank = V.len(rig.byId.ankle_r.offset);
  const kneeOfLen = (dl) => 180 - Math.acos(Math.max(-1, Math.min(1, (thigh * thigh + shank * shank - dl * dl) / (2 * thigh * shank)))) / R.DEG;
  // plate frame at travel u along the straight push line (used to find the top / bottom; the lever then swings through them)
  const lineF = (dd) => V.add(Hm, V.add(V.scale(d0, dd), V.scale(up0, h)));
  const footQ = (fr, sd) => { const x = fr.up, y = fr.nrm, z = V.cross(x, y); return Q.mul(Q.axis(y, sd === 'r' ? -toe : toe), Q.fromBasis(x, y, z)); };
  // foot on the plate: the ball of the foot at F + up * (footOff + ball offset) (+ z), ankle from the foot rotation
  const footAt = (fr, sd, calfDeg = 0) => {
    let q = footQ(fr, sd); if (calfDeg) q = Q.mul(Q.axis([0, 0, 1], -calfDeg), q); // plantarflexion turns the toes toward the plate
    const ball = V.add(fr.F, V.add(V.scale(fr.up, footOff + BALL[0]), [0, 0, sd === 'r' ? stance : -stance]));
    const ankle = V.sub(ball, Q.rot(q, BALL));
    return { ankle, q, ball };
  };
  const hipOf = (sd) => (sd === 'r' ? W0.hip_r.p : W0.hip_l.p);
  const kneeAt = (fr, sd, c = 0) => kneeOfLen(V.len(V.sub(footAt(fr, sd, c).ankle, hipOf(sd))));
  const tilt = opt.plateTilt || 0, nrmT = rot2(V.scale(d0, -1), -tilt), upT = rot2(up0, -tilt);
  const lin = (dd) => ({ F: lineF(dd), nrm: nrmT, up: upT });
  const bis = (f, lo, hi, target, n = 50) => { for (let i = 0; i < n; i++) { const m = (lo + hi) / 2; if (f(m) < target) lo = m; else hi = m; } return (lo + hi) / 2; }; // f increasing in its argument
  const c0 = calf ? calf.dorsi : 0;
  const dTop = bis((dd) => -kneeAt(lin(dd), 'r', calf ? calf.plantar : 0), 0, 140, -(calf ? calf.knee : kTop));
  const dBot = calf ? bis((dd) => -kneeAt(lin(dd), 'r', -c0), 0, 140, -calf.knee) : bis((dd) => -kneeAt(lin(dd), 'r'), 0, 140, -kBot);
  // the machine
  const params = { dirDeg, plateTilt: opt.plateTilt || 0, plates: opt.plates ?? 1, plateD: opt.plateD ?? 35, seat, back, plate: opt.plate || { w: 70, h: 48, t: 4 }, follow: { joints: ['ankle_r', 'toe_r'], t: ballFollow.t, off: ballFollow.off, along: 0, shift: null, side: legs === 'r' ? 'r' : 'both' } };
  let frameAt, travel;
  if (mode === 'lever') {
    const pT = lineF(dTop), pB = lineF(dBot), m = V.scale(V.add(pT, pB), 0.5), ch = V.sub(pT, pB), c = V.len(ch) / 2, hh = Math.sqrt(Math.max(0, radius * radius - c * c)), n = V.norm([-ch[1], ch[0], 0]);
    const pivot = V.add(m, V.scale(n, hh * (opt.pivotSide ?? 1)));
    params.pivot = [r1(pivot[0]), r1(pivot[1])]; params.o = [r1(pT[0]), r1(pT[1])];
    const aB = (Math.atan2(pB[1] - pivot[1], pB[0] - pivot[0]) - Math.atan2(pT[1] - pivot[1], pT[0] - pivot[0])) / R.DEG;
    params.range = [r1(Math.min(0, aB) - 4), r1(Math.max(0, aB) + 4)];
    const P0 = GS.g3sParams({ params: { type: 'leg_press', ...params } });
    frameAt = (a) => ({ F: GS.g3sOrigin(P0, a), nrm: rot2(nrmT, a), up: rot2(upT, a) });
    travel = { top: 0, bot: aB };
  } else {
    params.o = lineF(dTop).slice(0, 2).map(r1); params.range = [r1(dBot - dTop - 4), 4];
    frameAt = (sv) => lin(dTop + sv);
    travel = { top: 0, bot: dBot - dTop };
  }
  const S = sled('leg_press', params);
  // calf: the knee stays at calf.knee; for each ankle angle the plate travel is solved
  const contacts = ['r', 'l'].map((sd) => H.legC(sd, { pole: legs === 'r' && sd === 'l' ? [1, 0.2, -0.1] : [-0.2, 1, sd === 'r' ? 0.35 : -0.35], rot: H.footQ(0, sd === 'l' && legs === 'r' ? 6 : 0) }));
  // hands on the side handles (horizontal, fore-aft, beside the seat)
  const grip = [seat.hx + 3, seat.y + 4, seat.hz];
  const armed = armTo(base, 'r', grip, { axis: [1, 0, 0], palm: [0, 0, -1], iters: 400, guesses: ARM_GUESSES });
  const gErr = armed.__err; delete armed.__err; B.mirrorArm(armed);
  const freeFoot = legs === 'r' ? [r1(W0.hip_l.p[0] + (opt.freeFoot ? opt.freeFoot[0] : 38)), L.ANKLE_H, -(opt.freeFoot ? opt.freeFoot[1] : stance + 4)] : null;
  const poseAt = (tv, cdeg = 0) => {
    let p = clone(armed); p.ik = {};
    const fr = frameAt(tv);
    for (const sd of legs === 'r' ? ['r'] : ['r', 'l']) {
      const f = footAt(fr, sd, cdeg), hq = f.q.map((v) => +v.toFixed(6));
      p.ik[`leg_${sd}`] = { target: f.ankle.map((v) => +v.toFixed(2)), weight: 1, handRot: hq };
      p = H.fitLeg(p, sd, contacts.find((c) => c.id === `leg_${sd}`), p.ik[`leg_${sd}`].target, { handRot: hq });
    }
    if (freeFoot) { p.ik.leg_l = { target: freeFoot, weight: 1 }; p = H.fitLeg(p, 'l', contacts[1], freeFoot); }
    for (const j of ['hip_r', 'hip_l', 'knee_r', 'knee_l', 'ankle_r', 'ankle_l']) for (const c in p.ch[j]) p.ch[j][c] = r1(L.wrap(p.ch[j][c]));
    return p;
  };
  // knee-fixed calf keys: plate travel for an ankle angle (bisection on the knee angle)
  const calfPose = (deg) => {
    const g = (tv) => kneeAt(frameAt(tv), 'r', deg), a = Math.min(travel.top, travel.bot) - 15, b = Math.max(travel.top, travel.bot) + 15;
    const inc = g(b) > g(a); let lo = a, hi = b; for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if ((g(m) < calf.knee) === inc) lo = m; else hi = m; }
    return { tv: (lo + hi) / 2, pose: poseAt((lo + hi) / 2, deg) };
  };
  return { base, armed, contacts, S, params, travel, frameAt, poseAt, calfPose, dTop, dBot, gErr, W0, Hr, freeFoot, legs };
}
// keys for a press loop from a path function f(u) (u = 0 top ... 1 bottom) -> pose; eased, N keys per half
function pressLoop(meta, at, N = 6) {
  const ph = meta.timeline.phases, D = meta.timeline.duration, ease = (u) => 0.5 - 0.5 * Math.cos(Math.PI * u), poses = { top: at(0), bottom: at(1) }, keyframes = [];
  keyframes.push({ t: 0, pose: 'top' }, { t: ph[0].end, pose: 'top' });
  for (let i = 1; i < N; i++) { const nm = `d${i}`; poses[nm] = at(ease(i / N)); keyframes.push({ t: +(ph[0].end + (ph[1].end - ph[0].end) * i / N).toFixed(3), pose: nm }); }
  keyframes.push({ t: ph[1].end, pose: 'bottom' }, { t: ph[2].end, pose: 'bottom' });
  for (let i = 1; i < N; i++) { const nm = `u${i}`; poses[nm] = at(ease(1 - i / N)); keyframes.push({ t: +(ph[2].end + (ph[3].end - ph[2].end) * i / N).toFixed(3), pose: nm }); }
  keyframes.push({ t: ph[3].end, pose: 'top' }, { t: D, pose: 'top' });
  return { poses, keyframes };
}
function legPressAuthor(id, opt) {
  const H = require('./hips'), GL = require('./gear-lever');
  const meta = require(`../meta/${id}.json`), lp = legPress(opt);
  const at = opt.calf ? (u) => lp.calfPose(opt.calf.plantar - (opt.calf.dorsi + opt.calf.plantar) * u).pose : (u) => lp.poseAt(lp.travel.top + (lp.travel.bot - lp.travel.top) * u);
  const { poses, keyframes } = pressLoop(meta, at, opt.N || 6);
  const ex = H.module_(meta, lp.contacts, poses, keyframes);
  // the followed point at the top sets the carriage reference (the ball of the right foot or both feet's midpoint)
  const Wt = L.fk(poses.top, lp.contacts); lp.S.P.ref = lp.S.toLocal(sledTarget(lp.S, Wt)).slice(0, 2).map((v) => +v.toFixed(2)); lp.S.prop.params.ref = lp.S.P.ref;
  const tTop = sledTravel(lp.S, Wt);
  if (Math.abs(tTop) > 0.05) { lp.S.P.ref = null; } // never: the reference was just set from this pose
  ex.props = [lp.S.prop, ...GL.handProps()];
  const rep = sledTrack(ex, lp.S, { planted: lp.freeFoot ? ['leg_l'] : [], skip: { car: /^(hand|thumb|forearm)_|^foot_/, fixed: /^(hand|thumb|forearm)_/ } });
  const Wb = L.fk(poses.bottom, lp.contacts), set = (m, f, v) => { const k = ex.exercise.kinematics.find((x) => x.measure.startsWith(m)); if (k) k[f] = v; }, d = (v) => `≈${Math.round(v)}°`;
  set('Knee flexion', 'setup', `${d(H.kneeOf(Wt, 'r'))} at the top`); set('Knee flexion', 'peak', `${d(H.kneeOf(Wb, 'r'))} at the bottom`);
  set('Hip flexion', 'setup', `${d(poses.top.ch.hip_r.flex)} at the top`); set('Hip flexion', 'peak', `${d(poses.bottom.ch.hip_r.flex)} at the bottom (back on the pad)`);
  set('Ankle', 'setup', `${d(poses.top.ch.ankle_r.dorsi)} dorsiflexion at the top`); set('Ankle', 'peak', `${d(poses.bottom.ch.ankle_r.dorsi)} at the bottom`);
  set('Seat and back', 'setup', `Seat ${opt.seat.y} cm high, back pad ${opt.back.angle}° back from vertical`); set('Seat and back', 'peak', 'Unchanged (hips and back on the pads)');
  const tr = rep.sled.travel; set('Plate travel', 'setup', opt.mode === 'lever' ? `Plate on a ${opt.radius || 95} cm lever arm` : `Sled on rails at ${opt.dirDeg}° to the floor`); set('Plate travel', 'peak', opt.mode === 'lever' ? `${r1(tr[1] - tr[0])}° of lever swing` : `${r1(tr[1] - tr[0])} cm along the rails`);
  set('Foot position', 'setup', `${lp.legs === 'r' ? 'Right foot' : `Feet ${2 * (opt.stance || 13)} cm apart`} on the plate, toes out ${opt.toe ?? 8}°`); set('Foot position', 'peak', 'The ball of the foot stays on the same spot of the plate');
  set('Tempo', 'setup', `Top ${meta.timeline.phases[0].end} s`); set('Tempo', 'peak', `${r1(meta.timeline.phases[1].end - meta.timeline.phases[0].end)} s ${opt.calf ? 'heels down' : 'down'}, ${r1(meta.timeline.phases[2].end - meta.timeline.phases[1].end)} s pause, ${r1(meta.timeline.phases[3].end - meta.timeline.phases[2].end)} s ${opt.calf ? 'press' : 'up'}`);
  if (opt.edit) opt.edit(ex, { lp, rep, Wt, Wb, set, d });
  console.log(`${meta.exercise.name}: wrote ${L.write(ex)}\n  ${JSON.stringify({ pivot: lp.params.pivot, o: lp.params.o, range: lp.params.range, ref: lp.S.P.ref, gripErr: +lp.gErr.toFixed(2), hipTop: poses.top.ch.hip_r.flex, hipBot: poses.bottom.ch.hip_r.flex, kneeTop: poses.top.ch.knee_r.flex, kneeBot: poses.bottom.ch.knee_r.flex, dorsi: [poses.top.ch.ankle_r.dorsi, poses.bottom.ch.ankle_r.dorsi] })}\n  ${JSON.stringify({ floor: rep.floor, slide: rep.slide, sled: rep.sled, knee: rep.kneeR, hip: rep.hipFlexR })}`);
  sledGate(id, rep, { minFixed: -2.5, minCar: -1.0, maxOff: 0.6 });
  if (lp.gErr > 0.5) { console.error('FAIL: hands off the handles'); process.exitCode = 1; }
  if (rep.hipFlexR[1] > 138) { console.error('FAIL: hip flexion near the rig limit'); process.exitCode = 1; }
  return { ex, lp, rep };
}

/* ---------------- lever machines from a base module (belt squats, lever squat, pendulum, standing calf) ---------------- */
// The base module's body motion (feet planted by leg IK) is kept, resampled densely; each key's root is shifted fore-aft
// (feet stay planted) so the point the lever follows lies exactly on the lever end's arc about the pivot. The hands either
// keep the base arms (e.g. a bar on the back becomes the machine's yoke handles) or hold fixed frame handles (solved per
// key, each from the previous key). opt: { type (gear-lever preset), params (overrides; pivot given RELATIVE to the
// followed point at the first key as pivotRel: [dx, dy]), follow, endKind, handles: null | { r: [x, y, z], axis, palm },
// dt, skipClear, planted, gate }
function leverFromBase(id, baseId, opt = {}) {
  const H = require('./hips'), GL = require('./gear-lever'), B = require('./b3-back');
  const meta = require(`../meta/${id}.json`), base = fromBase(baseId), contacts = base.contacts;
  const { poses, keyframes } = resample(base, opt.dt ?? 0.1);
  const names = keyframes.map((k) => k.pose);
  // machine: preset + overrides; the followed point of the first key fixes the end (rest) and the pivot (pivotRel)
  const mk = (extra) => GL.machine(opt.type, Object.assign({}, opt.params || {}, { follow: opt.follow }, extra)); // center: machine origin (x, z of the pivot frame stay prop-local)
  const M0 = mk({});
  const W0 = L.fk(poses[names[0]], contacts), T0 = GL.targetOf(M0, W0, 'arm');
  let rel = opt.pivotRel;
  if (opt.fit) { // pivot (inside fit.x / fit.y ranges, relative to the first followed point) whose arc best matches the base path
    const pts = names.map((nm) => GL.targetOf(M0, L.fk(poses[nm], contacts), 'arm')); let best = null;
    for (let x = opt.fit.x[0]; x <= opt.fit.x[1]; x += 2.5) for (let y = opt.fit.y[0]; y <= opt.fit.y[1]; y += 2.5) {
      const q = [T0[0] + x, T0[1] + y], R0 = Math.hypot(T0[0] - q[0], T0[1] - q[1]); let w = 0; for (const pt of pts) w = Math.max(w, Math.abs(Math.hypot(pt[0] - q[0], pt[1] - q[1]) - R0));
      if (!best || w < best.w) best = { w, rel: [x, y] };
    }
    rel = best.rel; console.log(`  fitted pivot ${rel} (worst radial ${best.w.toFixed(2)} cm before the root correction)`);
  }
  const cz = r1(T0[2]), piv = [r1(T0[0] + rel[0]), r1(T0[1] + rel[1]), 0];
  const M = mk({ pivot: piv, end: [r1(T0[0]), r1(T0[1]), r1(opt.endZ ?? 0)], center: [0, 0, cz] }); // the machine centred on the followed point's z
  const Rr = Math.hypot(T0[0] - piv[0], T0[1] - piv[1]);
  // root correction: |target - pivot| = R (bisection on the root x shift; the feet stay on their IK targets)
  let worst = 0;
  const radial = (p) => { const T = GL.targetOf(M, L.fk(p, contacts), 'arm'); return Math.hypot(T[0] - piv[0], T[1] - piv[1]) - Rr; };
  const handPose = (p, prev) => {
    if (!opt.handles) return p;
    const hd = opt.handles; let q = p;
    for (const sd of ['r', 'l']) {
      const g = [hd.r[0], hd.r[1], sd === 'r' ? hd.r[2] : -hd.r[2]], pm = hd.palm ? [hd.palm[0], hd.palm[1], sd === 'r' ? hd.palm[2] : -hd.palm[2]] : null;
      const start = clone(q); if (prev) for (const j of [`shoulder_${sd}`, `elbow_${sd}`, `wrist_${sd}`]) start.ch[j] = clone(prev.ch[j]);
      q = armTo(start, sd, g, { axis: hd.axis || [0, 0, 1], palm: pm, contacts, iters: 300, guesses: prev ? null : ARM_GUESSES });
      worst = Math.max(worst, q.__err); delete q.__err;
    }
    return q;
  };
  let prev = null, rootWorst = 0;
  for (const nm of names) {
    let p = poses[nm];
    if (opt.correct !== false) {
      const f0 = radial(p); let a = -25, b = 25; const sgn = Math.sign(radial(Object.assign(clone(p), { root: Object.assign({}, p.root, { pos: [p.root.pos[0] + 1, p.root.pos[1], p.root.pos[2]] }) })) - f0) || 1;
      for (let i = 0; i < 40; i++) { const m = (a + b) / 2, q = clone(p); q.root.pos[0] = p.root.pos[0] + m; if (radial(q) * sgn < 0) a = m; else b = m; }
      const dx = (a + b) / 2; p.root.pos[0] = +(p.root.pos[0] + dx).toFixed(2); rootWorst = Math.max(rootWorst, Math.abs(dx));
    }
    p = handPose(p, prev); prev = p;
    // refit the leg channels to the IK so the stored angles match what is drawn
    for (const c of contacts) if (p.ik && p.ik[c.id] && (p.ik[c.id].weight ?? 1) > 0.999 && /^leg_/.test(c.id)) p = H.fitLeg(p, c.id.slice(-1), c, p.ik[c.id].target, p.ik[c.id].handRot ? { handRot: p.ik[c.id].handRot } : {});
    poses[nm] = round(p);
  }
  const ex = attachMeta(clone(base), meta); ex.poses = poses; ex.keyframes = keyframes; ex.contacts = contacts;
  ex.props = [...(base.props || []).filter((pp) => /^(bench|box|mat|wall)$/.test(pp.kind) && !pp.attach), M.prop, ...(opt.noHands ? [] : GL.handProps()), ...(opt.extraProps || [])];
  const rep = GL.track(ex, M, { planted: opt.planted || ex.checks.plantedContacts || [], skip: opt.skipClear || /^(hand|thumb|forearm)_/, partSkip: opt.partSkip, n: 800 });
  kinFromBase(ex, base);
  if (opt.edit) opt.edit(ex, { M, rep, piv, Rr });
  console.log(`${meta.exercise.name}: wrote ${L.write(ex)}\n  pivot ${piv} R ${r1(Rr)} root shift <= ${r1(rootWorst)} cm, hand err ${worst.toFixed(2)}\n  ${JSON.stringify({ floor: rep.floor, slide: rep.slide, arms: rep.arms, clear: rep.clear })}`);
  GL.gate(id, rep, Object.assign({ maxOffArc: 0.8 }, opt.gate || {}));
  if (worst > 0.6) { console.error('FAIL: hands off the handles'); process.exitCode = 1; }
  return { ex, M, rep };
}

// Belt squat machine: lever pivot in front and low, the arm runs back along the midline to the hip belt's front ring
// (21 cm ahead of the hip joints' midpoint, the held 'sled' belt item); a handle bar on two posts in front of the athlete.
// follow parameters { t, off } (a -> b line, perpendicular counter-clockwise from +Z) that hit point q of the plane frame where
// a is the origin and b - a = v (both 2D): q = t v + off perpCCW(v / |v|)
function lineFollow(v, q) { const u = V.norm([v[0], v[1], 0]), pc = [-u[1], u[0]], det = v[0] * pc[1] - v[1] * pc[0]; return { t: +((q[0] * pc[1] - q[1] * pc[0]) / det).toFixed(4), off: +((v[0] * q[1] - v[1] * q[0]) / det).toFixed(3) }; }
function beltAuthor(id, baseId, opt = {}) {
  const base = fromBase(baseId), W0 = L.fk(R.buildTimeline(base).pose(0), base.contacts), S = W0.shoulder_r.p;
  const hx = r1(S[0] + (opt.handleAhead ?? 32)), hy = r1(S[1] - (opt.handleDrop ?? 40)), hz = opt.handleZ ?? 24;
  const ring = opt.ring ?? 21, ringY = opt.ringY ?? 0, cz = r1(W0.pelvis.p[2]);
  // the belt rides on the pelvis (single-joint mount: it tips with the pelvis); the lever follows the same pelvis-fixed point
  // (hip joints -> L5 line, the hips' midpoint being the pelvis joint)
  const belt = { id: 'belt', kind: 'sled', params: { item: 'belt', mount: 'pelvis', ring, ringY }, attach: { joint: 'pelvis', offset: [0, 0, 0] } };
  const lf = lineFollow(rig.byId.spine_l5.offset, [ring, ringY]);
  const handles = opt.hands === 'free' ? null : { r: [hx, hy, hz], axis: [0, 0, 1], palm: [0, -0.4, -1] };
  const pads = opt.hands === 'free' ? [] : [{ c: [hx, hy, hz - cz], size: [14, 1.8], kind: 'bar', rot: [0, 0, 0], post: false }, { c: [hx, hy, -hz - cz], size: [14, 1.8], kind: 'bar', rot: [0, 0, 0], post: false }, { c: [hx + 3, hy / 2, hz + 8 - cz], size: [5, hy, 5], kind: 'box' }, { c: [hx + 3, hy / 2, -hz - 8 - cz], size: [5, hy, 5], kind: 'box' }, { c: [hx + 10, 2, 0 - cz], size: [18, 4, 2 * hz + 26], kind: 'box' }, { c: [hx, hy, 0 - cz], size: [2 * hz + 16, 1.6], kind: 'bar', rot: [0, 0, 0] }];
  return leverFromBase(id, baseId, Object.assign({
    type: 'calf_raise', follow: { joints: ['hip_r', 'spine_l5'], t: lf.t, off: lf.off, shift: null }, pivotRel: opt.pivotRel || [85, -62],
    params: { armZ: 0, endKind: 'pad', endSize: [7, 7, 9], range: [-60, 60], load: 'plates', plateAt: 0.25, pads },
    handles, extraProps: [belt], noHands: opt.hands === 'free',
    skipClear: /^(hand|thumb|forearm)_/, partSkip: { pads: /^(hand|thumb|forearm)_/ },
    edit: (ex, { rep, piv, M }) => { const k = ex.exercise.kinematics.find((x) => x.measure === 'Belt and lever'); const T0 = M.P.end; k.setup = `Belt ring ${ring} cm ahead of the hips (pelvis frame); lever pivot ${r1(piv[0] - T0[0])} cm ahead of and ${r1(T0[1] - piv[1])} cm below the ring`; k.peak = `Lever swings ${r1(rep.arms.arm.range[1] - rep.arms.arm.range[0])}°; ring within ${rep.arms.arm.offArc} cm of the lever end`; },
  }, opt));
}

/* ---------------- power sled: walking with the hands on the sled ---------------- */
// Gait from b4-power.js (short steps, the trunk pitched), both hands at a constant height (the sled's handles cannot move up
// or down) ahead of the shoulders; the sled (kind 'sled', type power_sled) follows the hands' midpoint along X. Rear drag:
// the forward walk played backward in time (a backward walk), the hands holding the strap handles ahead of the hips with
// the sled in front. opt: { style: 'push' | 'drag', step, period, pitch, knee, fwd (hands ahead of the shoulders), handY }
function sledWalk(id, opt = {}) {
  const P = require('./b4-power'), H = require('./hips'), GL = require('./gear-lever');
  const meta = require(`../meta/${id}.json`), drag = opt.style === 'drag';
  const F = P.makeFamily({ toe: 6, half: 10 });
  const { keys: gk, travel } = P.gait(F, { step: opt.step ?? 45, period: opt.period ?? 0.62, knee: opt.knee ?? 20, pitch: opt.pitch ?? -38, sc: drag ? { protract: -4, elevate: -2 } : { protract: 10, elevate: 4 }, lift: opt.lift ?? 6 });
  // hands: constant height, a fixed distance ahead of the right shoulder (out a little), thumbs up (push poles) or forward
  const HY = opt.handY, FWD = opt.fwd ?? 40;
  const arm = { w: (W) => [W.shoulder_r.p[0] + FWD, HY, W.shoulder_r.p[2] + (opt.out ?? 1)], elbow: (W) => V.add(W.shoulder_r.p, V.scale(V.norm([FWD, HY - W.shoulder_r.p[1], 4]), L.UA)), thumb: drag ? [1, 0, 0] : [0, 1, 0], elbowW: 0.4 };
  const keys = gk.map((k) => Object.assign(k, { arm }));
  keys.splice(1, 0, { same: 'stand', t: 0.6 });
  keys.push({ same: 'end', t: +(keys[keys.length - 1].t + 0.6).toFixed(3) });
  let { poses, keyframes } = P.chain(F, keys);
  const D = keyframes[keyframes.length - 1].t;
  if (drag) keyframes = keyframes.map((k) => ({ t: +(D - k.t).toFixed(3), pose: k.pose })).reverse();
  for (const k in poses) delete poses[k].__spec;
  const ex = H.module_(meta, F.contacts, poses, keyframes);
  const walkStart = drag ? +(D - keys[keys.length - 2].t).toFixed(3) : 0.6, walkEnd = drag ? +(D - 0.6).toFixed(3) : keys[keys.length - 2].t;
  ex.timeline = Object.assign({}, ex.timeline, { duration: D, phases: [Object.assign({}, meta.timeline.phases[0], { start: 0, end: walkStart }), Object.assign({}, meta.timeline.phases[1], { start: walkStart, end: walkEnd }), Object.assign({}, meta.timeline.phases[2], { start: walkEnd, end: D })] });
  const sc = (lv) => lv.map(([t, v]) => [+(t * D / meta.timeline.duration).toFixed(3), v]);
  ex.activation = Object.fromEntries(Object.entries(meta.activation).map(([m, c]) => [m, sc(c)]));
  // the sled: carriage origin at the hands' midpoint at t = 0, following the hands along X
  const W0 = L.fk(poses[keyframes[0].pose], F.contacts), g0 = V.scale(V.add(EQ.gripPoint(W0, 'r', 'handle').p, EQ.gripPoint(W0, 'l', 'handle').p), 0.5);
  const S = sled('power_sled', { o: [r1(g0[0]), r1(g0[1])], range: [-400, 400], sled: { style: drag ? 'drag' : 'push' }, follow: { grip: 'handle', side: 'both' }, dirDeg: 0 });
  S.prop.size = drag ? [2 * (g0[0] + 230), 90, 90] : [2 * (g0[0] + 120), 120, 90]; // viewer framing: the sled's reach in front of the hands
  ex.props = [S.prop, ...GL.handProps()];
  const rep = sledTrack(ex, S, { planted: ['leg_r', 'leg_l'], skip: { car: /^(hand|thumb|forearm)_/ } });
  const jump = P.jumps(ex), lr = F.report(ex), set = H.setKin(ex), Wm = L.fk(poses.k2swing || poses[keyframes[Math.floor(keyframes.length / 2)].pose], F.contacts), d = (v) => `≈${Math.round(v)}°`;
  set('Step length', 'setup', 'Feet together'); set('Step length', 'peak', `${opt.step ?? 45} cm steps, ${travel} cm per loop${drag ? ' (backward)' : ''}`);
  set('Cadence', 'setup', `${opt.period ?? 0.62} s per step`); set('Cadence', 'peak', `≈${Math.round(60 / (opt.period ?? 0.62))} steps per minute`);
  set('Body lean', 'setup', `${d(P.trunkLean(W0))} from vertical`); set('Body lean', 'peak', `${d(P.trunkLean(Wm))} mid-step; knees ${d(H.kneeOf(Wm, 'r'))}`);
  set('Sled', 'setup', `Hands ${r1(g0[1])} cm high, ${FWD} cm ahead of the shoulders`); set('Sled', 'peak', `Sled travels ${r1(rep.sled.travel[1] - rep.sled.travel[0])} cm; hands within ${rep.sled.offLine} cm of the handle line`);
  console.log(`${meta.exercise.name}: wrote ${L.write(ex)} (${keyframes.length} keys, ${D} s)\n  ${JSON.stringify({ floor: rep.floor, slide: rep.slide, sled: rep.sled, lr, jump })}`);
  sledGate(id, rep, { maxOff: 1.0, minCar: -1.0 });
  if (lr.slide > 0.05) { console.error('FAIL: planted feet slide'); process.exitCode = 1; }
  return { ex, S, rep };
}

module.exports = { sledWalk, lineFollow, beltAuthor, leverFromBase, legPress, pressLoop, legPressAuthor, ballFollow, hackAuthor, hackSquat, GS, sled, sledTarget, sledTravel, partPts, sledClear, sledTrack, sledGate, BODY, refineKeys, correct, railFix, smithPressAuthor, attachMeta, smithAuthor, GRIP, fromBase, resample, round, armTo, lineFit, lineAt, smithify, press, kinFromBase };
