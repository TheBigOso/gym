// g3-benches family (phase 3): exercises on the gear-pack benches and stations (src/gear/benches.js via
// build/families/gear-benches.js) plus the floor / flat-bench variants on the same list. Each builder takes the meta and a
// few options, writes the module and runs its own checks (planted contacts, floor, body vs gear, grip width, measure).
// Shared pieces:
//   armsAt(p, targets, opt)  right arm (and the left, solved mirrored) onto grip points with palm / thumb wishes
//   chestFrame(W)           t6 frame helpers: world point from a chest-frame offset (x forward, y up the spine, z right)
//   fail(id, list)          print and flag failures
const L = require('../lib');
const { R, V, Q, r1, clone } = L;
const H = require('./hips');
const GB = require('./gear-benches');
const GBR = require('./gear-bars');
const EQ = require('./equip');
const D = require('./dumbbell');
const GA = require('./gear-attach');
const B = require('./b3-back');

const ENV = (k, d) => +(process.env[k] ?? d);
const dg = (v) => `≈${Math.round(v)}°`;
function fail(id, list) {
  const f = list.filter(([ok]) => !ok).map(([, m]) => m);
  if (f.length) { console.error(`FAIL ${id}: ${f.join('; ')}`); process.exitCode = 1; }
}
// world point from an offset in a joint's frame
const inFrame = (W, j, off) => V.add(W[j].p, Q.rot(W[j].q, off));
const dirIn = (W, j, d) => Q.rot(W[j].q, d);
// copy the arm channels of side s from pose a into pose b
function copyArm(b, a, s) { for (const j of ['sc', 'shoulder', 'elbow', 'wrist']) if (a.ch[`${j}_${s}`]) b.ch[`${j}_${s}`] = clone(a.ch[`${j}_${s}`]); return b; }
// mirror a world point / direction across the sagittal plane
const mz = (v) => [v[0], v[1], -v[2]];
// Solve both arms: R = { g, palm?, thumb?, axis?, elbow? } for the right hand (world), Lh = the same for the left hand (world;
// solved as a mirrored right arm). grip: 'handle' | 'bar'.
function armsAt(p, Rh, Lh, { grip = 'handle', contacts = null, guesses } = {}) {
  const o = (h) => ({ grip, palm: h.palm, thumb: h.thumb, axis: h.axis, elbow: h.elbow, wElbow: h.wElbow ?? 0.5, contacts, guesses: guesses || undefined });
  const qr = GBR.armTo(p, Rh.g, o(Rh));
  let out = qr;
  if (Lh) {
  const m = (v) => (v ? mz(v) : v);
    const ql = GBR.armTo(p, mz(Lh.g), o({ palm: m(Lh.palm), thumb: m(Lh.thumb), axis: m(Lh.axis), elbow: m(Lh.elbow), wElbow: Lh.wElbow }));
    out = clone(p); copyArm(out, qr, 'r'); for (const j of ['shoulder', 'elbow', 'wrist']) out.ch[`${j}_l`] = clone(ql.ch[`${j}_r`]);
    out.__err = Math.max(qr.__err, ql.__err);
  } else out.__err = qr.__err;
  return out;
}

/* =====================================================================================================================
   45-degree back extension (hyperextension_bench angle 45) with the arms crossed on the chest: nothing in the hands,
   a plate hugged to the chest (two-hand plate held at 3 and 9 o'clock) or a dumbbell held across the chest (body-mounted
   on spine_t6, both forearms over it). Same body and pad fit as author-hyperextension.js; the arms are fixed in the
   chest frame, so the hands keep their place on the item while the trunk hinges.
   ===================================================================================================================== */
function hyper45(meta, opt = {}) {
  const id = meta.exercise.id, ANGLE = opt.angle ?? 45, STANCE = 11, KNEE = 4, HIPGAP = opt.hipGap ?? 16;
  const hb0 = GB.hyperBench({ x: 0, params: { angle: ANGLE } });
  const feet = GB.hyperFeet(hb0, { stance: STANCE });
  const contacts = feet.contacts, d = hb0.points.legDir, n = hb0.points.legNormal, e = hb0.points.elevation;
  const z0 = () => ({ rot: 0, flex: 0, latFlex: 0 });
  const P0 = e - 90;
  let base = { root: { pos: [0, 100, 0], rot: { pitch: P0 } }, ch: { spine_l5: z0(), spine_t12: z0(), spine_t6: { rot: 0, flex: 2, latFlex: 0 }, neck_c7: { rot: 0, flex: 6 }, head_c1: { rot: 0, flex: 4 },
    sc_r: { protract: 6, elevate: 2 }, sc_l: { protract: 6, elevate: 2 }, hip_r: { flex: 0, abd: 2, rot: 0 }, hip_l: { flex: 0, abd: 2, rot: 0 }, knee_r: { flex: KNEE }, knee_l: { flex: KNEE }, ankle_r: { dorsi: 0 }, ankle_l: { dorsi: 0 },
    shoulder_r: { plane: 0, elev: 10, axial: 0 }, shoulder_l: { plane: 0, elev: 10, axial: 0 }, elbow_r: { flex: 10 }, elbow_l: { flex: 10 }, wrist_r: { pron: 0, flex: 0, dev: 0 }, wrist_l: { pron: 0, flex: 0, dev: 0 } } };
  base = L.solvePose(base, ['root.pos.0', 'root.pos.1', 'ch.hip_r.abd', 'ch.hip_l.abd'], [L.obj.at('ankle_r', feet.targets.r, 3), L.obj.at('ankle_l', feet.targets.l, 3)]).pose;
  // arms in the chest frame (t6: x forward out of the chest, y up the spine, z to the right)
  const Wb0 = L.fk(base), T6 = (off) => inFrame(Wb0, 'spine_t6', off), Tx = (v) => dirIn(Wb0, 'spine_t6', v);
  const front = Math.max(...['pecs_r', 'chest', 'ribcage'].map((s) => GB.shapePlane(Wb0, s, { o: Wb0.spine_t6.p, n: V.scale(Tx([1, 0, 0]), -1) }) * -1)); // depth of the chest front from t6 (cm)
  const chestF = -Math.min(...['pecs_r', 'pecs_l', 'chest', 'ribcage'].map((s) => GB.shapePlane(Wb0, s, { o: Wb0.spine_t6.p, n: Tx([-1, 0, 0]) })));
  let arms, item = null, itemInfo = {};
  const mode = opt.arms || 'cross';
  if (mode === 'plate') {
    const Dp = opt.plateD ?? 34, gw = GBR.plateGripWidth(Dp), y = opt.plateY ?? -3, c = T6([chestF + 2.6 + (opt.plateOff ?? 0), y, 0]);
    const ax = Tx([0, 1, 0]);
    arms = armsAt(base, { g: V.add(c, V.scale(Tx([0, 0, 1]), gw / 2)), palm: Tx([0, 0, -1]), axis: ax, elbow: T6([chestF - 4, -16, 34]), wElbow: 0.3 },
      { g: V.add(c, V.scale(Tx([0, 0, -1]), gw / 2)), palm: Tx([0, 0, 1]), axis: ax, elbow: T6([chestF - 4, -16, -34]), wElbow: 0.3 });
    item = GBR.plateProp({ two: true, D: Dp, thick: 4 });
    itemInfo = { plateD: Dp, gripW: gw };
  } else {
    // crossed: right hand over the left upper chest, left hand under it over the right upper chest; palms on the chest
    const dy = opt.crossY ?? 0;
    const gR = T6([chestF + (mode === 'dumbbell' ? 20.5 : 4.5), 4 + dy, -13]), gL = T6([chestF + (mode === 'dumbbell' ? 15.5 : 2.5), -2 + dy, 13]);
    arms = armsAt(base, { g: gR, palm: Tx([-1, 0, 0]), elbow: T6([chestF + 14, -8, 20]), wElbow: 0.4 }, { g: gL, palm: Tx([-1, 0, 0]), elbow: T6([chestF + 10, -12, -20]), wElbow: 0.4 });
  }
  base = arms; const armErr = arms.__err; delete base.__err; delete base.__cost;
  if (mode === 'dumbbell') {
    // dumbbell held upright on the sternum under the crossed forearms: grid-search its offset and tilt in the chest frame
    // for the largest clearance (heads radius 5.5, handle radius 1.8) from the body
    const Wa = L.fk(base);
    const dbClear = (off, ax) => { const c = inFrame(Wa, 'spine_t6', off), A = dirIn(Wa, 'spine_t6', ax); const seg = (a, b, r) => EQ.segmentClear(Wa, V.add(c, V.scale(A, a)), V.add(c, V.scale(A, b)), r, { skip: /^(hand|thumb)_/, n: 6 }); return [seg(-15, -8, 5.5), seg(8, 15, 5.5), seg(-8, 8, 1.8)].reduce((m, v) => (v.d < m.d ? v : m)); };
    let best = null;
    for (let x = 4; x <= 10; x += 1) for (let y = -10; y <= 6; y += 2) for (const tl of [-0.2, 0, 0.2, 0.4]) { const ax = V.norm([tl, 1, 0]), off = [r1(chestF + x), y, 0], c = dbClear(off, ax).d - Math.abs(x - 6) * 0.05; if (!best || c > best.c) best = { c, off, ax: ax.map((v) => +v.toFixed(3)) }; }
    item = { id: 'db', kind: 'dumbbell', size: [30, 11, 11], attach: { joint: 'spine_t6', offset: best.off }, params: { axis: best.ax } };
    itemInfo = { dbOffset: best.off, dbAxis: best.ax };
  }
  const ARM = { r: H.qArr ? null : null };
  base.ik = { leg_r: { target: feet.targets.r, weight: 1 }, leg_l: { target: feet.targets.l, weight: 1 } };
  const Wb = L.fk(base, contacts), HIP = Wb.hip_r.p.slice();
  const F = hb0.points.F, alongHip = V.dot(V.sub(HIP, F), d);
  const FRONT = -Math.min(...['quad_r', 'quad_l', 'thigh_r', 'thigh_l'].map((s) => GB.shapePlane(Wb, s, { o: F, n })));
  const hb = GB.hyperBench({ x: 0, params: { angle: ANGLE, padDist: r1(alongHip - HIPGAP), padDrop: r1(FRONT - 0.2) } });
  function key(h, spine) {
    const q = clone(base);
    Object.assign(q.ch, { spine_l5: { rot: 0, flex: spine[0], latFlex: 0 }, spine_t12: { rot: 0, flex: spine[1], latFlex: 0 } });
    q.root.rot.pitch = r1(P0 - h);
    q.ch.hip_r.flex = r1(base.ch.hip_r.flex + h); q.ch.hip_l.flex = r1(base.ch.hip_l.flex + h);
    let s = L.solvePose(q, ['root.pos.0', 'root.pos.1'], [L.obj.at('hip_r', HIP, 3)]).pose;
    for (const sd of ['r', 'l']) s = H.fitLeg(s, sd, contacts.find((c) => c.id === `leg_${sd}`), feet.targets[sd], { abd: base.ch[`hip_${sd}`].abd, rot: 0, handRot: feet.footRot });
    for (const sd of ['r', 'l']) copyArm(s, base, sd);
    return s;
  }
  const HMAX = opt.hmax ?? (mode === 'plate' ? 80 : 74), SP = opt.spine || [10, 10];
  const KEYS = { top: [0, [0, 0]], d1: [HMAX * 0.3, [SP[0] * 0.2, SP[1] * 0.2]], d2: [HMAX * 0.6, [SP[0] * 0.55, SP[1] * 0.55]], d3: [HMAX * 0.85, [SP[0] * 0.85, SP[1] * 0.85]], bottom: [HMAX, SP], bottomHold: [HMAX - 1, SP] };
  if (opt.ext) KEYS.ext = [-opt.ext, [-3, -3]]; // a little past the line (only where the exercise asks for it)
  const poses = {}; for (const [k, [h, sp]] of Object.entries(KEYS)) poses[k] = key(h, sp);
  const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p]));
  const t = (pid, f) => +(ph[pid].start + (ph[pid].end - ph[pid].start) * f).toFixed(3);
  const top = opt.ext ? 'ext' : 'top';
  const keyframes = [{ t: 0, pose: 'top' }, { t: t('lower', 0), pose: 'top' }, { t: t('lower', 0.3), pose: 'd1' }, { t: t('lower', 0.58), pose: 'd2' }, { t: t('lower', 0.8), pose: 'd3' }, { t: t('lower', 1), pose: 'bottom' },
    { t: t('bottom', 1), pose: 'bottomHold' }, { t: t('raise', 0.2), pose: 'd3' }, { t: t('raise', 0.45), pose: 'd2' }, { t: t('raise', 0.72), pose: 'd1' }, { t: t('raise', 1), pose: top },
    ...(opt.ext ? [{ t: t('top', 0.5), pose: 'ext' }] : []), { t: meta.timeline.duration, pose: 'top' }];
  const ex = H.module_(meta, contacts, poses, keyframes);
  ex.props = [hb.prop].concat(item ? [item] : []);
  const pr = { body: { d: 1e9 }, thigh: [1e9, -1e9], hipDrift: 0, low: 1e9, item: 1e9, w: [1e9, -1e9] };
  const pad = hb.surfaces.pad;
  const rep = H.loopReport(ex, { planted: ['leg_r', 'leg_l'], probe: (W, pz, tt) => {
    const b = GB.bodyClear(W, hb, { skip: /^(foot_|toe|calf_|shank_|quad_|thigh_|hand_|thumb_)/ }); if (b.d < pr.body.d) pr.body = Object.assign(b, { t: +tt.toFixed(2) });
    const th = Math.min(...['quad_r', 'quad_l'].map((s) => GB.shapePlane(W, s, pad))); pr.thigh = [Math.min(pr.thigh[0], th), Math.max(pr.thigh[1], th)];
    pr.hipDrift = Math.max(pr.hipDrift, V.len(V.sub(W.hip_r.p, HIP)));
    pr.low = Math.min(pr.low, L.shapeMinY(W).y);
    if (mode === 'plate') { const pa = GBR.plateAt(W, { D: itemInfo.plateD }); pr.w = [Math.min(pr.w[0], pa.width), Math.max(pr.w[1], pa.width)]; pr.item = Math.min(pr.item, GBR.geomMinY ? pa.c[1] - pa.r : 1e9); }
  } });
  // item vs the body at the top (the plate sits on the chest, the dumbbell under the forearms)
  const Wt = L.fk(poses.top, contacts), Wbot = L.fk(poses.bottom, contacts);
  if (mode === 'plate') itemInfo.chestGap = GBR.plateClear(Wt, { D: itemInfo.plateD }, /^(hand|thumb|forearm)_/);
  if (mode === 'dumbbell') { const c = inFrame(Wt, 'spine_t6', item.attach.offset), ax = dirIn(Wt, 'spine_t6', item.params.axis); const seg = (a, b, r) => EQ.segmentClear(Wt, V.add(c, V.scale(ax, a)), V.add(c, V.scale(ax, b)), r, { skip: /^(hand|thumb)_/, n: 6 });
    const parts = [seg(-15, -8, 5.5), seg(8, 15, 5.5), seg(-8, 8, 1.8)]; const worst = parts.reduce((m, v) => (v.d < m.d ? v : m)); itemInfo.dbClear = { d: r1(worst.d), id: worst.id }; itemInfo.dbLow = r1(Math.min(...[-1, 1].map((s) => V.add(c, V.scale(ax, 11 * s))[1])) - 5.5); }
  const forearms = EQ.segmentClear ? null : null;
  const trunkFromLeg = (W) => V.angle(V.sub(W.neck_c7.p, W.pelvis.p), d);
  const set = H.setKin(ex);
  set('Hip flexion', 'setup', `${dg(poses.top.ch.hip_r.flex)} (body in one line along the ${ANGLE}° bench)`); set('Hip flexion', 'peak', `${dg(poses.bottom.ch.hip_r.flex)} at the bottom`);
  set('Lumbar flexion', 'setup', opt.ext ? `0°, then about ${opt.ext}° of hip extension past the line at the top` : '0° (neutral, no arching past the line)'); set('Lumbar flexion', 'peak', `${dg(SP[0] + SP[1])} (L5 and T12 segments) at the bottom`);
  set('Trunk to the leg line', 'setup', dg(trunkFromLeg(Wt))); set('Trunk to the leg line', 'peak', `${dg(trunkFromLeg(Wbot))} (trunk ${dg(V.angle(V.sub(Wbot.neck_c7.p, Wbot.pelvis.p), [0, -1, 0]))} from straight down)`);
  set('Hip pad', 'setup', `Pad top edge ${HIPGAP} cm below the hip joints along the leg line; thighs on the pad`); set('Hip pad', 'peak', `Hip joints move ≤${r1(pr.hipDrift)} cm; thigh-to-pad gap ${r1(pr.thigh[0])} to ${r1(pr.thigh[1])} cm`);
  set('Arms', 'setup', opt.armsText || 'Crossed on the chest'); set('Arms', 'peak', 'Fixed to the chest through the rep');
  ex.checks.measure = { name: 'hipFlexion', min: Math.floor(HMAX - 3), max: Math.ceil(HMAX + 3) };
  console.log(`${meta.exercise.name}: wrote ${L.write(ex)}\n  ${JSON.stringify({ params: hb.prop.params, armErr, hipDrift: r1(pr.hipDrift), thigh: pr.thigh.map(r1), body: pr.body, low: r1(pr.low), slide: rep.slide, w: pr.w.map(r1), ...itemInfo })}`);
  fail(id, [[rep.slide <= 0.05, 'planted feet slide'], [pr.low >= 1, `body near the floor (${r1(pr.low)})`], [pr.body.d >= -1.5, `body into the bench ${JSON.stringify(pr.body)}`],
    [pr.thigh[0] >= -1.2 && pr.thigh[1] <= 1.5, `thighs off the pad ${pr.thigh.map(r1)}`], [pr.hipDrift <= 1, 'hips move'], [armErr < 1, `hands off target ${armErr}`],
    [mode !== 'plate' || pr.w[1] - pr.w[0] < 1, 'plate grip width drifts'], [mode !== 'plate' || itemInfo.chestGap.d > -1.5, `plate into the chest ${JSON.stringify(itemInfo.chestGap)}`],
    [mode !== 'dumbbell' || itemInfo.dbClear.d > -1.5, `dumbbell into the body ${JSON.stringify(itemInfo.dbClear)}`]]);
  return ex;
}


/* =====================================================================================================================
   Parallel-bar dips (dip_station), generalized from author-triceps-dip.js. Hands planted on top of the bars (dipHands);
   each key solves the root (x, height, lean) for a shoulder height, the lean blending from lean0 at the top to lean1 at
   the bottom. opt: lean0, lean1, dx1 (shoulders forward of the hands at the bottom), hip, knee, ankle (legs),
   par (elbow height vs shoulder at the bottom, 0 = upper arm parallel), assist: null | 'band' (band stretched between the
   bars under the shins) | 'kneel' (assisted dip machine: a knee pad that rises with the knees, dip_station params.assist,
   src/gear/g3-benches-assist.js)
   ===================================================================================================================== */
const T3 = require('./b3-triceps');
function dips(meta, opt = {}) {
  const id = meta.exercise.id, assist = opt.assist || null;
  const params = Object.assign({ barH: opt.barH ?? 125, gap: opt.gap ?? 52 }, opt.params || {});
  const ds0 = GB.dipStation({ x: 0, params });
  const hands = GB.dipHands(ds0, { x: 0, tilt: opt.tilt ?? 35, pole: opt.pole ?? 0.5 });
  const HAND = { r: hands.r.wrist, l: hands.l.wrist };
  const contacts = [hands.r.contact, hands.l.contact];
  const LEAN0 = opt.lean0 ?? 4, LEAN1 = opt.lean1 ?? 12, DX1 = opt.dx1 ?? 20, TOP_FLEX = 6;
  const SC = { protract: opt.protract ?? -6, elevate: -6 };
  const base = (() => {
    const p = L.POSES.standing().pose; delete p.ik;
    Object.assign(p.ch, { spine_l5: { rot: 0, flex: 2, latFlex: 0 }, spine_t12: { rot: 0, flex: opt.t12 ?? 2, latFlex: 0 }, spine_t6: { rot: 0, flex: opt.t6 ?? 0, latFlex: 0 }, neck_c7: { rot: 0, flex: 2 }, head_c1: { rot: 0, flex: 2 },
      sc_r: clone(SC), sc_l: clone(SC), hip_r: { flex: opt.hip ?? 12, abd: 3, rot: 0 }, hip_l: { flex: opt.hip ?? 12, abd: 3, rot: 0 }, knee_r: { flex: opt.knee ?? 80 }, knee_l: { flex: opt.knee ?? 80 },
      ankle_r: { dorsi: opt.ankle ?? -20 }, ankle_l: { dorsi: opt.ankle ?? -20 } });
    return p;
  })();
  const trunkLean = (W) => V.angle(V.sub(W.neck_c7.p, W.pelvis.p), [0, 1, 0]) * Math.sign(W.neck_c7.p[0] - W.pelvis.p[0]);
  function rootFor(shY, u) {
    const b = clone(base);
    if (opt.legsWorld) for (const sd of ['r', 'l']) b.ch[`hip_${sd}`].flex = r1(base.ch[`hip_${sd}`].flex + (LEAN1 - LEAN0) * u); // thighs keep their angle to the floor as the trunk leans
    return L.solvePose(b, ['root.pos.0', 'root.pos.1', 'root.rot.pitch'], [
      (W) => [(W.shoulder_r.p[0] - (HAND.r[0] + DX1 * u)) * 3], (W) => [(trunkLean(W) - (LEAN0 + (LEAN1 - LEAN0) * u)) * 0.5], (W) => [(W.shoulder_r.p[1] - shY) * 3],
    ], { iters: 300 }).pose;
  }
  const GUESS = (s) => [{ [`shoulder_${s}`]: { plane: 0, elev: 5, axial: 0 }, [`elbow_${s}`]: { flex: 6 }, [`wrist_${s}`]: { pron: 90, flex: -30, dev: 0 } }, { [`shoulder_${s}`]: { plane: -40, elev: 50, axial: 30 }, [`elbow_${s}`]: { flex: 90 }, [`wrist_${s}`]: { pron: 90, flex: -40, dev: 0 } }];
  function poseFor(shY, u) {
    let p = rootFor(shY, u);
    p.ik = { arm_r: { target: HAND.r.slice(), weight: 1 }, arm_l: { target: HAND.l.slice(), weight: 1 } };
    for (const s of ['r', 'l']) { p = H.fitArm(p, s, contacts.find((c) => c.id === `arm_${s}`), HAND[s], GUESS(s)); p[`__cost_${s}`] = p.__cost; delete p.__cost; }
    return p;
  }
  const armDist = (shY) => { const W = L.fk(rootFor(shY, 0)); return V.len(V.sub(W.shoulder_r.p, HAND.r)); };
  let lo = HAND.r[1] + 20, hi = HAND.r[1] + 70, shTop = 0;
  for (let i = 0; i < 40; i++) { shTop = (lo + hi) / 2; if (armDist(shTop) > L.reach(TOP_FLEX)) hi = shTop; else lo = shTop; }
  const elbowUp = (shY, u) => { const W = L.fk(Object.assign(rootFor(shY, u), { ik: { arm_r: { target: HAND.r, weight: 1 } } }), contacts); return W.elbow_r.p[1] - W.shoulder_r.p[1]; };
  lo = shTop - 50; hi = shTop - 5; let shBot = shTop - 25;
  for (let i = 0; i < 30; i++) { shBot = (lo + hi) / 2; if (elbowUp(shBot, 1) > (opt.par ?? 0)) lo = shBot; else hi = shBot; }
  shTop = r1(shTop); shBot = r1(shBot);
  const at = (u) => poseFor(shTop + (shBot - shTop) * u, u);
  const ease = T3.ease;
  const poses = { top: at(0), d1: at(ease(0.25)), d2: at(ease(0.5)), d3: at(ease(0.75)), bottom: at(1), bottomHold: at(0.985) };
  const costs = Object.values(poses).map((p) => Math.max(p.__cost_r, p.__cost_l)); Object.values(poses).forEach((p) => { delete p.__cost_r; delete p.__cost_l; });
  const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p]));
  const t = (pid, f) => +(ph[pid].start + (ph[pid].end - ph[pid].start) * f).toFixed(3);
  const keyframes = [{ t: 0, pose: 'top' }, { t: t('lower', 0), pose: 'top' }, { t: t('lower', 0.25), pose: 'd1' }, { t: t('lower', 0.5), pose: 'd2' }, { t: t('lower', 0.75), pose: 'd3' }, { t: t('lower', 1), pose: 'bottom' }, { t: t('bottom', 0.5), pose: 'bottomHold' }, { t: t('bottom', 1), pose: 'bottom' },
    { t: t('press', 0.25), pose: 'd3' }, { t: t('press', 0.5), pose: 'd2' }, { t: t('press', 0.75), pose: 'd1' }, { t: t('press', 1), pose: 'top' }, { t: meta.timeline.duration, pose: 'top' }];
  const ex = H.module_(meta, contacts, poses, keyframes);
  // assist props
  const Wt = L.fk(poses.top, contacts), Wb = L.fk(poses.bottom, contacts);
  const SHIN = [5.6, -6, 0]; // front of the shin just below the knee, knee frame
  let ds = ds0, extra = [], aInfo = {};
  if (assist === 'band') {
    const kx = r1((Wt.knee_r.p[0] + Wb.knee_r.p[0]) / 2), bars = ds0.points.bars;
    extra = ['r', 'l'].map((s) => ({ id: `band_${s}`, kind: 'band', color: '#3f7fd9', anchor: [kx, r1(bars[s].a[1] - bars[s].r), bars[s].a[2]], attach: { joint: `knee_${s}`, offset: SHIN } }));
    extra.push({ id: 'band_x', kind: 'band', color: '#3f7fd9', attach: { joint: 'knee_r', with: 'knee_l' } });
    aInfo = { bandX: kx };
  }
  if (assist === 'kneel') {
    // knee pad top under the shins: offset from the knees' midpoint (world cm) measured at the top pose
    const sh = (W, s) => inFrame(W, `knee_${s}`, [5.6, -14, 0]);
    const mid = (W) => V.scale(V.add(W.knee_r.p, W.knee_l.p), 0.5);
    const padY = (W) => Math.min(...['r', 'l'].map((s) => Math.min(...[-4, -10, -18].map((y) => inFrame(W, `knee_${s}`, [0, y, 0])[1] - 5.2))));
    const off = [-12, r1(padY(Wt) - mid(Wt)[1]), 0];
    params.assist = { padOff: off, padSize: [36, 4, 40], columnX: opt.columnX ?? -55 };
    ds = GB.dipStation({ x: 0, params });
    aInfo = { padOff: off, padTravel: r1(mid(Wt)[1] - mid(Wb)[1]) };
    // the shins must stay on the pad: lowest shin underside vs the pad top through the loop
    const tl = R.buildTimeline(ex); let g = [1e9, -1e9];
    for (let i = 0; i <= 100; i++) { const W = R.evalPose(L.rig, tl.pose((i / 100) * ex.timeline.duration), contacts), v = padY(W) - (mid(W)[1] + off[1]); g = [Math.min(g[0], v), Math.max(g[1], v)]; }
    aInfo.shinPadGap = g.map(r1);
  }
  ex.props = [ds.prop, ...extra];
  const pr = { body: { d: 1e9 }, feet: 1e9 };
  const rep = H.loopReport(ex, { planted: ['arm_r', 'arm_l'], probe: (W, pz, tt) => {
    const b = GB.bodyClear(W, ds0, { skip: /^(hand_|thumb_|forearm_)/ }); if (b.d < pr.body.d) pr.body = Object.assign(b, { t: +tt.toFixed(2) });
    pr.feet = Math.min(pr.feet, L.shapeMinY(W).y);
  } });
  const uaTilt = (W) => Math.asin(V.norm(V.sub(W.elbow_r.p, W.shoulder_r.p))[1]) / R.DEG;
  const set = H.setKin(ex);
  set('Elbow flexion', 'setup', `${dg(T3.elbowOf(Wt, 'r'))} (straight, not locked)`); set('Elbow flexion', 'peak', `${dg(T3.elbowOf(Wb, 'r'))} at the bottom`);
  set('Trunk lean', 'setup', `${dg(trunkLean(Wt))} forward of vertical`); set('Trunk lean', 'peak', `${dg(trunkLean(Wb))} at the bottom${opt.leanNote ? ' (' + opt.leanNote + ')' : ''}`);
  set('Upper arm angle to the floor', 'setup', `${dg(-uaTilt(Wt))} (arms straight down to the bars)`); set('Upper arm angle to the floor', 'peak', `${dg(Math.abs(uaTilt(Wb)))} at the bottom`);
  const travel = V.len(V.sub(Wt.pelvis.p, Wb.pelvis.p));
  set('Body travel', 'setup', `Shoulders ${Math.round(Wt.shoulder_r.p[1] - HAND.r[1])} cm above the wrists`); set('Body travel', 'peak', `${Math.round(travel)} cm down; feet stay ${r1(pr.feet)} cm or more off the floor`);
  if (opt.assistRow) { set(opt.assistRow[0], 'setup', opt.assistRow[1]); set(opt.assistRow[0], 'peak', opt.assistRow[2]); }
  ex.checks.measure = { name: 'rootTravel', min: Math.floor(travel - 2), max: Math.ceil(travel + 2) };
  console.log(`${meta.exercise.name}: wrote ${L.write(ex)}\n  ${JSON.stringify({ shTop, shBot, travel: r1(travel), elbow: [r1(T3.elbowOf(Wt, 'r')), r1(T3.elbowOf(Wb, 'r'))], lean: [r1(trunkLean(Wt)), r1(trunkLean(Wb))], uaTilt: r1(uaTilt(Wb)), armFit: +Math.max(...costs).toExponential(1), feet: r1(pr.feet), body: pr.body, slide: rep.slide, ...aInfo })}`);
  fail(id, [[rep.slide <= 0.05, 'planted hands slide'], [pr.feet >= 2, `feet near the floor (${r1(pr.feet)} cm)`], [pr.body.d >= -0.5, `body into the station ${JSON.stringify(pr.body)}`], [Math.max(...costs) <= 2, 'arm fit'], [!aInfo.shinPadGap || (aInfo.shinPadGap[0] > -1.2 && aInfo.shinPadGap[1] < 1.5), `shins off the knee pad ${aInfo.shinPadGap}`]]);
  return ex;
}

/* =====================================================================================================================
   Captain's chair (dip_station variant 'captain'): back against the pad, forearms on the rests, hands on the vertical
   handles (arm contacts, world-locked hands), legs hanging. The chair is fitted to the body: back pad surface at the
   back of the trunk, rests under the forearms, handles in the hands, high enough that the hanging feet clear the floor.
   Leg raise keys turn the pelvis back (posterior tilt) under a fixed upper trunk while the hips flex.
   opt.legs: 'bent' (knees to the chest) | 'straight' (legs to horizontal)
   ===================================================================================================================== */
function captain(meta, opt = {}) {
  const id = meta.exercise.id, straight = opt.legs === 'straight', FEET = opt.feet ?? 14;
  const z0 = () => ({ rot: 0, flex: 0, latFlex: 0 });
  let base = { root: { pos: [0, 110, 0], rot: { pitch: 0 } }, ch: { spine_l5: z0(), spine_t12: z0(), spine_t6: z0(), neck_c7: { rot: 0, flex: 2 }, head_c1: { rot: 0, flex: 2 }, sc_r: { protract: 2, elevate: 10 }, sc_l: { protract: 2, elevate: 10 },
    hip_r: { flex: 2, abd: 3, rot: 0 }, hip_l: { flex: 2, abd: 3, rot: 0 }, knee_r: { flex: 6 }, knee_l: { flex: 6 }, ankle_r: { dorsi: -25 }, ankle_l: { dorsi: -25 },
    shoulder_r: { plane: 0, elev: 5, axial: 0 }, shoulder_l: { plane: 0, elev: 5, axial: 0 }, elbow_r: { flex: 90 }, elbow_l: { flex: 90 }, wrist_r: { pron: 0, flex: 0, dev: 0 }, wrist_l: { pron: 0, flex: 0, dev: 0 } } };
  // arms: upper arm about vertical, forearm forward on the rest, fist round a vertical handle (palm in)
  let W0 = L.fk(base); const S = W0.shoulder_r.p, E = [S[0] + 2, S[1] - L.UA, S[2] + 3.5];
  base = armsAt(base, { g: [E[0] + 31, E[1] + 4, E[2] - 1], palm: [0, 0, -1], axis: [0, 1, 0], elbow: E, wElbow: 2 }, { g: mz([E[0] + 31, E[1] + 4, E[2] - 1]), palm: [0, 0, 1], axis: [0, 1, 0], elbow: mz(E), wElbow: 2 });
  const armErr = base.__err; delete base.__err; delete base.__cost;
  // height: lowest point FEET cm above the floor; depth: back of the trunk at x = -16 (default back pad)
  W0 = L.fk(base); base.root.pos[1] = r1(base.root.pos[1] - L.shapeMinY(W0).y + FEET);
  const backOf = (W) => Math.min(...['ribcage', 'chest', 'traps_r', 'traps_l', 'abdomen', 'pelvis'].map((sid) => { const g = R.shapeWorld(W, L.rig.shapes.find((x) => x.id === sid)); return g.kind === 'capsule' ? Math.min(g.a[0] - g.r[0], g.b[0] - g.r[1]) : g.c[0] - Math.hypot(g.axes[0][0], g.axes[1][0], g.axes[2][0]); }));
  W0 = L.fk(base); base.root.pos[0] = r1(base.root.pos[0] + (-16 - backOf(W0)) + 0.2);
  const Wb = L.fk(base);
  const EQg = (s) => EQ.gripPoint(Wb, s, 'handle').p;
  const foreBot = Math.min(...['forearm_r', 'upperarm_r'].map((sid) => { const g = R.shapeWorld(Wb, L.rig.shapes.find((x) => x.id === sid)); return g.kind === 'capsule' ? Math.min(g.a[1] - g.r[0], g.b[1] - g.r[1]) : 1e9; }));
  const gR = EQg('r'), armH = r1(foreBot - 0.2), bx = -16, x0 = bx - 4, handleX = r1(gR[0]);
  const params = { variant: 'captain', armH, gap: r1(2 * Wb.elbow_r.p[2]), armLen: r1(handleX - x0 - 2), backX: bx, backY: [r1(Wb.pelvis.p[1] - 6), r1(Wb.shoulder_r.p[1] - 6)], handleX, handleH: r1(gR[1] - armH + 7) };
  const ds = GB.dipStation({ x: 0, params });
  // contacts: hands world-locked on the handles
  const contacts = ['r', 'l'].map((sd) => Object.assign(L.handContact(sd), { label: `${sd === 'r' ? 'Right' : 'Left'} hand (handle)`, pole: [-1, -0.2, sd === 'r' ? 0.3 : -0.3], handRot: Wb[`wrist_${sd}`].q.map((v) => +v.toFixed(6)) }));
  const HAND = { r: Wb.wrist_r.p.map(r1), l: Wb.wrist_l.p.map(r1) };
  const T6 = Wb.spine_t6.p.slice();
  function key(thigh, knee, tilt) {
    const q = clone(base);
    q.root.rot.pitch = r1(tilt);
    q.ch.spine_l5.flex = r1(tilt * 0.6); q.ch.spine_t12.flex = r1(tilt * 0.4);
    for (const sd of ['r', 'l']) { q.ch[`hip_${sd}`].flex = r1(thigh - tilt); q.ch[`knee_${sd}`].flex = r1(knee); q.ch[`ankle_${sd}`].dorsi = r1(straight ? -20 + (thigh / 90) * 10 : -25); }
    let s2 = L.solvePose(q, ['root.pos.0', 'root.pos.1'], [L.obj.at('spine_t6', T6, 3)]).pose;
    s2.ik = { arm_r: { target: HAND.r, weight: 1 }, arm_l: { target: HAND.l, weight: 1 } };
    for (const sd of ['r', 'l']) { s2 = H.fitArm(s2, sd, contacts.find((c) => c.id === `arm_${sd}`), HAND[sd], [{ [`shoulder_${sd}`]: clone(base.ch[`shoulder_${sd}`]), [`elbow_${sd}`]: clone(base.ch[`elbow_${sd}`]), [`wrist_${sd}`]: clone(base.ch[`wrist_${sd}`]) }]); delete s2.__cost; }
    return s2;
  }
  const TOPT = straight ? (opt.top ?? 92) : (opt.top ?? 108), TOPK = straight ? 8 : 100, TILT = straight ? 10 : 16;
  const K = (f) => key(4 + (TOPT - 4) * f, 6 + (TOPK - 6) * (straight ? f : Math.min(1, f * 1.25)), TILT * f * f);
  const poses = { hang: K(0), r1: K(0.3), r2: K(0.6), r3: K(0.85), top: K(1), topHold: K(0.985) };
  const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p]));
  const t = (pid, f) => +(ph[pid].start + (ph[pid].end - ph[pid].start) * f).toFixed(3);
  const keyframes = [{ t: 0, pose: 'hang' }, { t: t('raise', 0), pose: 'hang' }, { t: t('raise', 0.33), pose: 'r1' }, { t: t('raise', 0.66), pose: 'r2' }, { t: t('raise', 0.86), pose: 'r3' }, { t: t('raise', 1), pose: 'top' }, { t: t('top', 1), pose: 'topHold' },
    { t: t('lower', 0.25), pose: 'r3' }, { t: t('lower', 0.55), pose: 'r2' }, { t: t('lower', 0.8), pose: 'r1' }, { t: t('lower', 1), pose: 'hang' }, { t: meta.timeline.duration, pose: 'hang' }];
  const ex = H.module_(meta, contacts, poses, keyframes);
  ex.props = [ds.prop];
  const pr = { body: { d: 1e9 }, back: [1e9, -1e9], feet: 1e9, t6: 0 };
  const rep = H.loopReport(ex, { planted: ['arm_r', 'arm_l'], probe: (W, pz, tt) => {
    const b = GB.bodyClear(W, ds, { skip: /^(hand_|thumb_|forearm_)/, parts: /^(?!pad0$)/ }); if (b.d < pr.body.d) pr.body = Object.assign(b, { t: +tt.toFixed(2) });
    const bk = backOf(W) - bx; pr.back = [Math.min(pr.back[0], bk), Math.max(pr.back[1], bk)];
    pr.feet = Math.min(pr.feet, L.shapeMinY(W).y); pr.t6 = Math.max(pr.t6, V.len(V.sub(W.spine_t6.p, T6)));
  } });
  const fa = GB.bodyClear(Wb, ds, { skip: /^(?!forearm_r|upperarm_r)/, parts: /^pad[1-9]/ });
  const Wt = L.fk(poses.top, contacts);
  const thighAng = (W) => V.angle(V.sub(W.knee_r.p, W.hip_r.p), [0, -1, 0]);
  const set = H.setKin(ex);
  set('Hip flexion', 'setup', `${dg(poses.hang.ch.hip_r.flex)} (legs hanging)`); set('Hip flexion', 'peak', `${dg(poses.top.ch.hip_r.flex)} at the top; thighs ${dg(thighAng(Wt))} from hanging`);
  set('Knee', 'setup', dg(poses.hang.ch.knee_r.flex)); set('Knee', 'peak', straight ? `${dg(poses.top.ch.knee_r.flex)} (legs straight)` : `${dg(poses.top.ch.knee_r.flex)} (knees to the chest)`);
  set('Pelvic tilt', 'setup', 'Neutral, back flat on the pad'); set('Pelvic tilt', 'peak', `${dg(TILT)} posterior tilt at the top (low back rounds into the pad)`);
  set('Support', 'setup', `Forearms on the rests (${armH} cm high), hands on the handles; feet ${r1(pr.feet)} cm or more off the floor`); set('Support', 'peak', `Upper trunk still (moves ≤${r1(pr.t6)} cm)`);
  ex.checks.measure = { name: 'hipFlexion', min: Math.floor(poses.top.ch.hip_r.flex - 3), max: Math.ceil(poses.top.ch.hip_r.flex + 3) };
  console.log(`${meta.exercise.name}: wrote ${L.write(ex)}\n  ${JSON.stringify({ params, armErr, slide: rep.slide, body: pr.body, back: pr.back.map(r1), feet: r1(pr.feet), t6: r1(pr.t6), forearmRest: fa.d, top: [poses.top.ch.hip_r.flex, poses.top.ch.knee_r.flex], knee: rep.kneeR })}`);
  fail(id, [[rep.slide <= 0.05, 'planted hands slide'], [pr.feet >= 2, `feet near the floor (${r1(pr.feet)})`], [pr.body.d >= -1, `body into the chair ${JSON.stringify(pr.body)}`], [pr.back[0] > -1.5, `back into the pad ${pr.back}`], [armErr < 1, `hands off ${armErr}`], [fa.d < 1.5 && fa.d > -1.5, `forearm not on the rest ${fa.d}`]]);
  return ex;
}

/* =====================================================================================================================
   Neutral-grip pull-up on the high parallel bars of a dip cage (dip_station with the bars at pull-up height): hands
   palms facing in, fingers over the top of each bar, thumbs back (arm contacts, world-locked). Same key scheme as
   author-pull-up.js (root height from the elbow angle, root x for clearance); the bars run front to back beside the
   head, so the face passes between them.
   ===================================================================================================================== */
function cagePullup(meta, opt = {}) {
  const id = meta.exercise.id, BAR_H = opt.barH ?? 212, GZ = opt.gz ?? 26, TILT = opt.tilt ?? 6;
  const ds = GB.dipStation({ x: 0, params: { barH: BAR_H, gap: 2 * GZ, barLen: 60 } });
  const D2R = Math.PI / 180, c = Math.cos(TILT * D2R), sn = Math.sin(TILT * D2R);
  const rotR = Q.fromBasis([0, sn, -c], [0, -c, -sn], [-1, 0, 0]), rotL = Q.mirrorZ(rotR);
  const qArr = (q) => q.map((v) => +v.toFixed(6));
  const contacts = ['r', 'l'].map((sd) => Object.assign(L.handContact(sd), { label: `${sd === 'r' ? 'Right' : 'Left'} hand (bar)`, pole: [0.6, -0.3, sd === 'r' ? 0.8 : -0.8], handRot: qArr(sd === 'r' ? rotR : rotL) }));
  const grip = { r: [0, BAR_H, GZ], l: [0, BAR_H, -GZ] };
  const wristT = (sd) => V.sub(grip[sd], Q.rot(sd === 'r' ? rotR : rotL, [2.2 + ds.points.bars.r.r * 0.3, -7.2, 0])).map((v) => +v.toFixed(2));
  const WT = { r: wristT('r'), l: wristT('l') };
  const legs = (hip, knee, ankle) => ({ hip, knee, ankle });
  const KEY = {
    hang: { flex: 8, sc: { protract: 4, elevate: 26 }, pitch: 0, spine: [0, 0, 0], neck: [0, 0], legs: legs(4, 16, -28) },
    scap: { flex: 10, sc: { protract: 0, elevate: 8 }, pitch: 2, spine: [-1, -2, -2], neck: [-2, -2], legs: legs(6, 18, -28) },
    m1: { flex: 55, sc: { protract: -6, elevate: 2 }, pitch: 3, spine: [-2, -3, -3], neck: [-3, -3], legs: legs(10, 22, -28) },
    m2: { flex: 95, sc: { protract: -12, elevate: -2 }, pitch: 4, spine: [-2, -4, -5], neck: [-4, -4], legs: legs(14, 26, -28) },
    m3: { flex: 118, sc: { protract: -14, elevate: -6 }, pitch: 4, spine: [-2, -5, -6], neck: [-3, -3], legs: legs(15, 27, -28) },
    top: { flex: opt.topFlex ?? 140, sc: { protract: -16, elevate: -10 }, pitch: 4, spine: [-2, -5, -6], neck: [-3, -3], legs: legs(16, 28, -28) },
  };
  const st = L.POSES.standing();
  function bodyPose(k, x, y) {
    const p = clone(st.pose); delete p.ik;
    p.root.pos = [x, y, 0]; p.root.rot = { pitch: k.pitch };
    ['spine_l5', 'spine_t12', 'spine_t6'].forEach((j, i) => { p.ch[j] = { rot: 0, latFlex: 0, flex: k.spine[i] }; });
    p.ch.neck_c7 = { rot: 0, flex: k.neck[0] }; p.ch.head_c1 = { rot: 0, flex: k.neck[1] };
    p.ch.sc_r = clone(k.sc); p.ch.sc_l = clone(k.sc);
    for (const sd of ['r', 'l']) { p.ch[`hip_${sd}`] = { flex: k.legs.hip, abd: 2, rot: 0 }; p.ch[`knee_${sd}`] = { flex: k.legs.knee }; p.ch[`ankle_${sd}`] = { dorsi: k.legs.ankle }; }
    p.ch.shoulder_r = { plane: 40, elev: 160, axial: 0 }; p.ch.shoulder_l = clone(p.ch.shoulder_r); p.ch.elbow_r = { flex: k.flex }; p.ch.elbow_l = { flex: k.flex };
    return p;
  }
  function rootY(k, x) {
    const want = L.reach(k.flex); let a = 60, b = 200;
    for (let i = 0; i < 40; i++) { const y = (a + b) / 2, S = L.fk(bodyPose(k, x, y)).shoulder_r.p; if (S[1] < WT.r[1] && V.len(V.sub(S, WT.r)) > want) a = y; else b = y; }
    return r1((a + b) / 2);
  }
  const guessArm = (k, sd) => [{ [`shoulder_${sd}`]: { plane: 40, elev: 180 - k.flex * 0.8, axial: 0 }, [`elbow_${sd}`]: { flex: k.flex } }, { [`shoulder_${sd}`]: { plane: 60, elev: 170 - k.flex * 0.7, axial: -40 }, [`elbow_${sd}`]: { flex: k.flex } }];
  const X0 = opt.x0 ?? -2;
  const poses = {};
  for (const [n, k] of Object.entries(KEY)) {
    let p = bodyPose(k, X0, rootY(k, X0));
    p.ik = { arm_r: { target: WT.r, weight: 1 }, arm_l: { target: WT.l, weight: 1 } };
    for (const sd of ['r', 'l']) { p = H.fitArm(p, sd, contacts.find((cc) => cc.id === `arm_${sd}`), WT[sd], guessArm(k, sd)); delete p.__cost; }
    poses[n] = p;
  }
  const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p]));
  const t = (pid, f) => +(ph[pid].start + (ph[pid].end - ph[pid].start) * f).toFixed(3);
  const keyframes = [['hang', 0], ['hang', t('set', 0)], ['scap', t('set', 1)], ['m1', t('pull', 0.36)], ['m2', t('pull', 0.64)], ['m3', t('pull', 0.82)], ['top', t('pull', 1)], ['top', t('top', 1)], ['m3', t('lower', 0.18)], ['m2', t('lower', 0.35)], ['m1', t('lower', 0.58)], ['scap', t('lower', 0.85)], ['hang', t('lower', 1)], ['hang', meta.timeline.duration]].map(([pose, tt]) => ({ t: tt, pose }));
  const ex = H.module_(meta, contacts, poses, keyframes);
  ex.props = [ds.prop];
  const pr = { body: { d: 1e9 }, gripErr: 0 };
  const rep = H.loopReport(ex, { planted: ['arm_r', 'arm_l'], probe: (W, pz, tt) => {
    const b = GB.bodyClear(W, ds, { skip: /^(hand_|thumb_)/ }); if (b.d < pr.body.d) pr.body = Object.assign(b, { t: +tt.toFixed(2) });
    for (const sd of ['r', 'l']) pr.gripErr = Math.max(pr.gripErr, V.len(V.sub(EQ.gripPoint(W, sd).p, grip[sd])));
  } });
  const Wh = L.fk(poses.hang, contacts), Wt = L.fk(poses.top, contacts);
  const chin = H.bottomOf(Wt, 'jaw') - BAR_H, travel = V.len(V.sub(Wt.pelvis.p, Wh.pelvis.p)), shW = V.len(V.sub(Wh.shoulder_r.p, Wh.shoulder_l.p));
  const set = H.setKin(ex);
  set('Elbow flexion', 'setup', `${dg(T3.elbowOf(Wh, 'r'))} in the dead hang`); set('Elbow flexion', 'peak', `${dg(T3.elbowOf(Wt, 'r'))} at the top`);
  set('Grip width', 'setup', `Neutral handles ${2 * GZ} cm apart (shoulder joints ${Math.round(shW)} cm), palms facing each other`); set('Grip width', 'peak', 'Unchanged (hands planted on the bars)');
  set('Chin height', 'setup', `Chin ${Math.round(BAR_H - H.bottomOf(Wh, 'jaw'))} cm below the bars in the hang`); set('Chin height', 'peak', `Chin ${chin.toFixed(1)} cm above the bars at the top (face between them); body rises ${Math.round(travel)} cm`);
  set('Shoulder blades', 'setup', `Elevated (${KEY.hang.sc.elevate}) in the hang`); set('Shoulder blades', 'peak', `Depressed and retracted (elevate ${KEY.top.sc.elevate}, protract ${KEY.top.sc.protract}) at the top`);
  ex.checks.measure = { name: 'rootTravel', min: Math.floor(travel - 2), max: Math.ceil(travel + 2) };
  console.log(`${meta.exercise.name}: wrote ${L.write(ex)}\n  ${JSON.stringify({ slide: rep.slide, floor: rep.floor, body: pr.body, gripErr: r1(pr.gripErr), chin: r1(chin), travel: r1(travel), elbow: [r1(T3.elbowOf(Wh, 'r')), r1(T3.elbowOf(Wt, 'r'))] })}`);
  fail(id, [[rep.slide <= 0.05, 'hands slide'], [rep.floor > 1, `feet near the floor ${rep.floor}`], [pr.body.d > -0.5, `body into the cage ${JSON.stringify(pr.body)}`], [chin > 0, 'chin below the bars'], [pr.gripErr < 2, `hands off the bars ${pr.gripErr}`]]);
  return ex;
}

/* =====================================================================================================================
   Preacher bench curls (preacher_bench), seated base and pad fit as author-barbell-preacher-curl.js. The handle point
   swings about the pinned elbow on the pad; the arm is solved with gear-bars armTo per key (grip point on the arc, palm /
   thumb along the arc, elbow held on the pad).
   opt.item: 'cable-bar' (two hands, straight cable bar from a low pulley in front of the pad), 'cable-handle' (right
   hand only, D-handle), 'dumbbell' (right hand only). opt.grip: 'under' | 'over' | 'neutral'. One-hand versions rest
   the left hand on the pad.
   ===================================================================================================================== */
const C3 = require('./b3-curls');
const K4 = require('./b4-curls2');
function preacher(meta, opt = {}) {
  const id = meta.exercise.id, item = opt.item, two = item === 'cable-bar' || item === 'band', gripKind = opt.grip || 'under', ball = opt.support === 'ball';
  const SEAT_H = opt.kneel ? (ball ? 1 : 12) : 52, ANGLE = opt.angle ?? 45, STANCE = 16, FOOT_DX = 30;
  let contacts, base0;
  if (opt.kneel) {
    // kneeling: shins on a cushion (the preacher bench seat set low; on the mat for the ball), thighs leaning a little
    // forward, trunk leaning over the support; legs planted (ankle targets, world-locked feet)
    const z0 = () => ({ rot: 0, flex: 0, latFlex: 0 });
    let p = { root: { pos: [0, 70, 0], rot: { pitch: opt.pitch ?? -24 } }, ch: { spine_l5: { rot: 0, flex: 2, latFlex: 0 }, spine_t12: { rot: 0, flex: 6, latFlex: 0 }, spine_t6: { rot: 0, flex: 6, latFlex: 0 }, neck_c7: { rot: 0, flex: -6 }, head_c1: { rot: 0, flex: -4 },
      sc_r: { protract: 26, elevate: 0 }, sc_l: { protract: 26, elevate: 0 }, hip_r: { flex: opt.hip ?? 34, abd: 6, rot: 0 }, hip_l: { flex: opt.hip ?? 34, abd: 6, rot: 0 }, knee_r: { flex: opt.knee ?? 100 }, knee_l: { flex: opt.knee ?? 100 }, ankle_r: { dorsi: -60 }, ankle_l: { dorsi: -60 },
      shoulder_r: { plane: 0, elev: 10, axial: 0 }, shoulder_l: { plane: 0, elev: 10, axial: 0 }, elbow_r: { flex: 10 }, elbow_l: { flex: 10 }, wrist_r: { pron: 0, flex: 0, dev: 0 }, wrist_l: { pron: 0, flex: 0, dev: 0 } } };
    const shinLow = (W) => Math.min(...['shank_r', 'shank_l', 'calf_r', 'calf_l', 'foot_r', 'foot_l'].map((sid) => M4.bottomOf(W, sid)));
    p = L.solvePose(p, ['root.pos.1'], [(W) => [(shinLow(W) - SEAT_H - 0.2) * 3]]).pose;
    const Wk = L.fk(p); p.root.pos[0] = r1(p.root.pos[0] + (opt.kneeX ?? 16) - Wk.knee_r.p[0]);
    const Wk2 = L.fk(p);
    contacts = ['r', 'l'].map((sd) => Object.assign(L.legContact(sd), { label: `${sd === 'r' ? 'Right' : 'Left'} foot (kneeling)`, pole: [1, -0.3, sd === 'r' ? 0.1 : -0.1], handRot: Wk2[`ankle_${sd}`].q.map((v) => +v.toFixed(6)) }));
    p.ik = { leg_r: { target: Wk2.ankle_r.p.map(r1), weight: 1 }, leg_l: { target: Wk2.ankle_l.p.map(r1), weight: 1 } };
    base0 = p;
  } else {
  const st = L.POSES.standing({ stance: STANCE, toeOut: 10 });
  contacts = st.contacts;
  let p = clone(st.pose); delete p.ik;
  Object.assign(p.ch, { spine_l5: { rot: 0, flex: 2, latFlex: 0 }, spine_t12: { rot: 0, flex: 6, latFlex: 0 }, spine_t6: { rot: 0, flex: 6, latFlex: 0 },
    hip_r: { flex: 88, abd: 6, rot: -4 }, hip_l: { flex: 88, abd: 6, rot: -4 }, knee_r: { flex: 90 }, knee_l: { flex: 90 }, sc_r: { protract: 26, elevate: 0 }, sc_l: { protract: 26, elevate: 0 },
    neck_c7: { rot: 0, flex: -6 }, head_c1: { rot: 0, flex: -4 } });
  p.root.pos = [-2, 60, 0]; p.root.rot = { pitch: -24 };
  const seatY = (W) => Math.min(...['buttock_r', 'buttock_l', 'pelvis'].map((sid) => C3.shapePlaneDist(W, sid, [0, SEAT_H, 0], [0, 1, 0])));
  p = L.solvePose(p, ['root.pos.1'], [(W) => [seatY(W) * 4]]).pose;
  const W0 = L.fk(p);
  p.ik = { leg_r: { target: [r1(W0.hip_r.p[0] + FOOT_DX), L.ANKLE_H, STANCE], weight: 1 }, leg_l: { target: [r1(W0.hip_l.p[0] + FOOT_DX), L.ANKLE_H, -STANCE], weight: 1 } };
  base0 = p;
  }
  const S = L.fk(base0, contacts).shoulder_r.p, UA = V.len(L.rig.byId.elbow_r.offset);
  const EZ = opt.ez ?? (two ? 16 : 18), dz = EZ - S[2], cc = Math.sqrt(UA * UA - dz * dz), UAA = (ANGLE + 7) * R.DEG;
  const E = [r1(S[0] + cc * Math.cos(UAA)), r1(S[1] - cc * Math.sin(UAA)), EZ];
  const TRUNK = /^(chest|ribcage|abdomen|pecs_[rl]|pelvis|traps_[rl]|lats_[rl]|neck|head)/, NOT_TRUNK = new RegExp(`^(?!${TRUNK.source.slice(2, -1)})`);
  const Wbase = L.fk(base0, contacts);
  const benchAt = (armpit) => GB.preacherBench({ x: 0, params: Object.assign({ seatH: SEAT_H }, opt.kneel ? { seatD: 50, seatW: 44 } : {}, GB.preacherFit(S, E, { angle: ANGLE, armpit, gap: 4.8 })) });
  let pb, ballInfo = null;
  if (ball) {
    // stability ball whose surface is the 'pad' plane at the elbow: centre below the elbow along the pad normal, resting on
    // the floor (radius from that condition); the ball is one sphere part for the clearance helpers
    const a = ANGLE * R.DEG, n = [Math.sin(a), Math.cos(a), 0], g = 4.8, Rb = (E[1] - g * Math.cos(a)) / (1 + Math.cos(a));
    const C = V.sub(E, V.scale(n, Rb + g)), bp = GA.stabilityBall({ x: r1(C[0]), d: r1(2 * Rb), squash: 0 });
    pb = { prop: bp.prop, parts: [{ id: 'ball', kind: 'cyl', a: bp.c, b: bp.c, r: bp.r }], surfaces: { pad: { o: V.sub(E, V.scale(n, g)), u: [Math.cos(a), -Math.sin(a), 0], n } }, points: { padLow: V.sub(E, V.scale(n, g)) }, ball: bp };
    ballInfo = { d: bp.prop.size[0], x: bp.prop.center[0] };
  } else {
    let lo = -24, hi = 6; for (let i = 0; i < 16; i++) { const m = (lo + hi) / 2; if (GB.bodyClear(Wbase, benchAt(m), { skip: NOT_TRUNK, parts: /^(?!pad0$)/ }).d >= -0.8) lo = m; else hi = m; }
    pb = benchAt(r1(lo - 0.05));
  }
  const pad = pb.surfaces.pad;
  // left hand resting on the pad (one-hand versions)
  let base = base0;
  if (!two) {
    const g = ball ? V.add(pb.ball.c, V.scale(V.norm([Math.sin(ANGLE * R.DEG), Math.cos(ANGLE * R.DEG) * 0.8, -0.55]), pb.ball.r + 3.2)) : GB.padPoint(pad, 18, 3.2, -14);
    const ql = armsAt(base0, { g: mz(g), palm: mz(V.scale(pad.n, -1)), elbow: mz([E[0], E[1], -EZ]), wElbow: 1.5 }, null);
    base = clone(base0); for (const j of ['shoulder', 'elbow', 'wrist']) base.ch[`${j}_l`] = clone(ql.ch[`${j}_r`]);
  }
  // reach from the elbow to the handle point with a straight wrist
  const GRIP = 'handle';
  const reachOf = (pron) => { const q = clone(base); C3.setArm(q, 'r', { plane: 0, elev: 0.01, axial: 0, flex: 0, pron }); const W = L.fk(q); return V.len(V.sub(EQ.gripPoint(W, 'r', GRIP).p, W.elbow_r.p)); };
  const PRON = { under: 0, over: 175, neutral: 90 }[gripKind];
  const GZ = two ? (opt.gw ?? 42) / 2 : EZ;
  const rr = Math.sqrt(reachOf(PRON) ** 2 - (GZ - E[2]) ** 2);
  const wish = (a) => { const v = [Math.cos(a * R.DEG), Math.sin(a * R.DEG), 0]; return gripKind === 'under' ? { palm: v, thumb: [0, 0, 1] } : gripKind === 'over' ? { palm: V.scale(v, -1), thumb: [0, 0, -1] } : { palm: [0, 0, -1], thumb: v }; };
  let guesses = null;
  const solve = (a) => {
    const g = [E[0] + rr * Math.sin(a * R.DEG), E[1] - rr * Math.cos(a * R.DEG), GZ], w = wish(a);
    const q = GBR.armTo(base, g, { grip: GRIP, palm: w.palm, thumb: w.thumb, elbow: E, wElbow: 2.5, wDir: 1.2, mirror: two, guesses: guesses || undefined, contacts });
    return q;
  };
  // item clearance vs the pad (and the forearm vs the pad) for the start angle
  const DBS = { length: 30, diameter: 11 };
  const itemPad = (W) => {
    if (item === 'dumbbell') { const d = D.dumbbellAt(W, 'r', 'handle', DBS); return GB.segClear(d.ends[1], d.ends[0], d.r, pb); }
    if (item === 'cable-bar') { const b = EQ.barAt(W, GRIP); return GB.segClear(V.sub(b.c, V.scale(b.ax, 25)), V.add(b.c, V.scale(b.ax, 25)), 1.6, pb); }
    return GB.segClear(EQ.gripPoint(W, 'r', GRIP).p, V.add(EQ.gripPoint(W, 'r', GRIP).p, [0, 0, 6]), 1.8, pb);
  };
  const forearm = (W) => GB.bodyClear(W, pb, { skip: /^(?!forearm_r|hand_r|thumb_r)/ }).d;
  let a0 = opt.a0 || 0;
  if (!a0) { let l2 = ANGLE, h2 = ANGLE + 60; for (let i = 0; i < 14; i++) { const m = (l2 + h2) / 2, W = L.fk(solve(m), contacts); if (itemPad(W) >= 0.8 && forearm(W) >= -0.6) h2 = m; else l2 = m; } a0 = r1(h2 + 0.1); }
  const A1 = opt.a1 ?? 168;
  const FS = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1], poses = {}, names = [];
  let err = 0;
  FS.forEach((f, i) => { const q = solve(a0 + (A1 - a0) * f); err = Math.max(err, q.__err); guesses = [GBR.guessOf(q)]; delete q.__err; delete q.__cost; if (i) K4.unwrapTo(q, poses[names[i - 1]]); poses[`c${i}`] = q; names.push(`c${i}`); });
  poses.squeeze = clone(poses[names[names.length - 1]]); poses.squeeze.ch.wrist_r.flex = r1(poses.squeeze.ch.wrist_r.flex + 3); if (two) poses.squeeze.ch.wrist_l.flex = poses.squeeze.ch.wrist_r.flex;
  const ph = (pid) => C3.phase(meta, pid);
  const keyframes = K4.keys(names, FS, { t0: ph('lift').start, t1: ph('lift').end, t2: ph('top').end, t3: ph('lower').end, D: meta.timeline.duration, squeeze: 'squeeze' });
  const ex = H.module_(meta, contacts, poses, keyframes);
  // cable: low pulley on the pad plane extended past its low end, a little above it
  const props = [pb.prop];
  let anchor = null;
  if (item === 'band') {
    // band from the floor in front of the bench (looped round the front foot, or a block bandDx cm further out), two strands
    const col = pb.points.padLow[0] + 12;
    anchor = [r1(col + (opt.bandDx ?? 0)), 4, 0];
    props.push({ id: 'band', kind: 'band', color: '#d9534f', anchor, attach: { joint: 'wrist_r', with: 'wrist_l', grip: 'handle' } });
    if (opt.bandDx) props.push({ id: 'block', kind: 'box', center: [anchor[0], 0, 0], size: [14, 8, 30] }); // heavy block on the floor the band is looped round
  } else if (item !== 'dumbbell') {
    const lowEnd = pb.points.padLow, a = V.add(V.add(lowEnd, V.scale(pad.u, opt.pulleyAlong ?? 42)), V.scale(pad.n, opt.pulleyUp ?? 9));
    anchor = [r1(a[0]), r1(Math.max(12, a[1])), two ? 0 : r1(GZ)];
    props.push(EQ.cableTower(anchor, { offset: [12, 0] }));
    props.push(two ? { id: 'bar', kind: 'cable', attachment: 'bar', size: [50, 3, 3], anchor, attach: { joint: 'wrist_r', with: 'wrist_l' } } : { id: 'handle', kind: 'cable', attachment: 'handle', size: [13, 3, 3], anchor, attach: { joint: 'wrist_r', grip: 'handle' } });
  } else props.push({ id: 'db', kind: 'dumbbell', size: [DBS.length, DBS.diameter, DBS.diameter], attach: { joint: 'wrist_r', grip: 'handle' } });
  ex.props = props;
  // loop checks
  const pr = { item: 1e9, arms: { d: 1e9 }, body: { d: 1e9 }, elbow: 0, line: { d: 1e9 }, linePad: 1e9, w: [1e9, -1e9], floor: 1e9 };
  const ARMS = /^(?!upperarm_r|biceps_r|triceps_r|forearm_r|deltoid_r)/;
  const rep = H.loopReport(ex, { planted: ['leg_r', 'leg_l'], probe: (W, pz, tt) => {
    pr.item = Math.min(pr.item, itemPad(W));
    const ar = GB.bodyClear(W, pb, { skip: ARMS }); if (ar.d < pr.arms.d) pr.arms = Object.assign(ar, { t: +tt.toFixed(2) });
    const bo = GB.bodyClear(W, pb, { skip: /^(upperarm|biceps|triceps|forearm|elbow|deltoid|hand|thumb|thigh|buttock|pelvis)/ }); if (bo.d < pr.body.d) pr.body = Object.assign(bo, { t: +tt.toFixed(2) });
    pr.elbow = Math.max(pr.elbow, V.len(V.sub(W.elbow_r.p, E)));
    if (anchor) { const ends = item === 'band' ? [EQ.gripPoint(W, 'r', GRIP).p, EQ.gripPoint(W, 'l', GRIP).p] : [two ? EQ.barAt(W, GRIP).c : EQ.gripPoint(W, 'r', GRIP).p]; for (const end of ends) { const lc = EQ.lineClear(W, anchor, end, 0.5); if (lc.d < pr.line.d) pr.line = Object.assign(lc, { t: +tt.toFixed(2) }); pr.linePad = Math.min(pr.linePad, GB.segClear(anchor, V.add(anchor, V.scale(V.sub(end, anchor), 0.85)), 0.4, pb)); } }
    if (two && item !== 'band') { const w = EQ.barAt(W, GRIP).width; pr.w = [Math.min(pr.w[0], w), Math.max(pr.w[1], w)]; }
    if (item === 'dumbbell') pr.floor = Math.min(pr.floor, D.dumbbellMinY(W, 'r', 'handle', DBS));
  } });
  const Wb = L.fk(poses.c0, contacts), Wt = L.fk(poses.squeeze, contacts);
  C3.fillCurlKin(ex, Wb, Wt, poses.c0, poses.squeeze, 'r', ['Arm nearly straight on the pad 0.6 s', '1.2 s up, 0.3 s squeeze, 2.4 s down, 0.9 s at the bottom']);
  const set = H.setKin(ex), gapE = (W) => r1(V.dot(V.sub(W.elbow_r.p, pad.o), pad.n));
  set('Upper arm on the pad', 'setup', ball ? `Upper arm draped over a ${ballInfo.d} cm ball; elbow ${gapE(Wb)} cm off its surface` : `Pad ${ANGLE}° (top edge ${r1(pad.o[1])} cm high); elbow ${gapE(Wb)} cm off the pad surface (upper-arm radius)`);
  set('Upper arm on the pad', 'peak', `Elbow stays on the pad (drift ≤${r1(pr.elbow)} cm)`);
  const trunk = (W) => V.angle(V.sub(W.neck_c7.p, W.pelvis.p), [0, 1, 0]);
  ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(trunk(Wb) - 2), max: Math.ceil(trunk(Wb) + 2) };
  console.log(`${meta.exercise.name}: wrote ${L.write(ex)}\n  ${JSON.stringify({ a0, a1: A1, err: r1(err), elbow: [r1(C3.elbowFlex(Wb, 'r')), r1(C3.elbowFlex(Wt, 'r'))], pron: [poses.c0.ch.wrist_r.pron, poses.squeeze.ch.wrist_r.pron], item: r1(pr.item), arms: pr.arms, body: pr.body, drift: r1(pr.elbow), ballInfo, line: pr.line.d < 1e8 ? { d: r1(pr.line.d), id: pr.line.id, t: pr.line.t } : null, linePad: r1(pr.linePad), w: pr.w.map(r1), floor: r1(pr.floor), slide: rep.slide, anchor })}`);
  fail(id, [[err < 0.6, `hand off the arc ${err}`], [pr.item > -0.5, 'item into the bench'], [pr.arms.d > -1.0, 'arm sinks into the pad'], [pr.body.d > -1.0, `body into the bench ${JSON.stringify(pr.body)}`], [pr.elbow < 2.5, 'elbow leaves the pad'],
    [!anchor || pr.line.d > -0.5, `cable into the body ${JSON.stringify(pr.line)}`], [!anchor || pr.linePad > -0.3, `cable through the pad ${pr.linePad}`], [!two || item === 'band' || pr.w[1] - pr.w[0] < 1.2, `grip width ${pr.w}`], [pr.floor > 0, 'dumbbell below the floor'], [rep.slide <= 0.05, 'feet slide']]);
  return ex;
}

/* =====================================================================================================================
   Decline bench (decline_bench), head toward the low end, feet flat on the board and hooked under the ankle roller, as
   author-decline-sit-up.js: the body is authored lying on a flat floor (the board's flat frame), shifted so the ankles
   sit ANK_X from the high edge and moved onto the board with gear-benches.boardFrame; the roller is fitted over the
   insteps.
   ===================================================================================================================== */
const CA = require('./core-a');
const CB = require('./core-b');
const M4 = require('./b4-core2');
// verify.mjs measures (peak over the loop) so the module's expected range can be set from the authored motion
function peakMeasure(ex, name) {
  const tl = R.buildTimeline(ex), W0 = R.evalPose(L.rig, tl.pose(0), ex.contacts); let pk = -1e9;
  for (let i = 0; i <= 800; i++) {
    const pose = tl.pose((i / 800) * tl.duration), W = R.evalPose(L.rig, pose, ex.contacts);
    const v = name === 'kneeFlexion' ? Math.max(R.measures(W).knee, 180 - V.angle(V.sub(W.hip_l.p, W.knee_l.p), V.sub(W.ankle_l.p, W.knee_l.p))) : name === 'trunkFlexion' ? V.angle(V.sub(W.neck_c7.p, W.pelvis.p), [0, 1, 0]) : name === 'hipFlexion' ? Math.max(pose.ch.hip_r?.flex ?? 0, pose.ch.hip_l?.flex ?? 0) : name === 'rootTravel' ? V.len(V.sub(W.pelvis.p, W0.pelvis.p)) : 0;
    pk = Math.max(pk, v);
  }
  return pk;
}
const setMeasure = (ex, name, pad = 2) => { const v = peakMeasure(ex, name); ex.checks.measure = { name, min: Math.floor(v - pad), max: Math.ceil(v + pad) }; return v; };

function declineSetup({ angle = 25, ankX = -26, knee = 88, headRest = 'hands' } = {}) {
  const lie0 = M4.lie({ kneeFlex: 90, headRest });
  const F = CA.plantFeet(lie0, knee);
  const lie = F.pose;
  const dx = ankX - F.targets.r[0];
  const shift = (p) => { const q = clone(p); q.root.pos[0] = r1(q.root.pos[0] + dx); if (q.ik) for (const k in q.ik) q.ik[k].target[0] = r1(q.ik[k].target[0] + dx); return q; };
  const benchAt = (rollerAt, rollerUp) => GB.declineBench({ x: 0, params: { angle, rollerAt, rollerUp } });
  const frame = GB.boardFrame(benchAt(10, 13));
  const contacts = frame.contacts(F.contacts);
  const onBoard = (p) => frame.pose(shift(p));
  const Wl = L.fk(onBoard(lie), contacts);
  const rollerAt = r1(-(ankX + 7));
  const footGap = (db) => GB.bodyClear(Wl, db, { skip: /^(?!foot_|toe|shank_|calf_)/, parts: /^pad[5-7]$/ }).d;
  let lo = 6, hi = 24; for (let i = 0; i < 20; i++) { const m = (lo + hi) / 2; if (footGap(benchAt(rollerAt, m)) >= 0.3) hi = m; else lo = m; }
  const db = benchAt(rollerAt, r1(hi + 0.05));
  const pad = db.surfaces.pad;
  return { lie, F, contacts, frame, onBoard, shift, db, pad, angle, padPlane: { o: pad.o, n: pad.n } };
}
// whole-loop board checks: planted feet, no shape sinks into the board, body clear of the rest of the bench, feet under
// the roller, nothing near the floor
function boardChecks(ex, db, { skipSink = /^(hand|thumb)_/, skipParts = /^(foot_|toe|hand_|thumb_)/, extra } = {}) {
  const pad = db.surfaces.pad, padPlane = { o: pad.o, n: pad.n };
  const pr = { sink: { d: 1e9 }, parts: { d: 1e9 }, roll: [1e9, -1e9], floor: 1e9 };
  const rep = H.loopReport(ex, { planted: ['leg_r', 'leg_l'], probe: (W, pz, t) => {
    if (Math.round(t * 1000) % 3) return;
    for (const sh of L.rig.shapes) { if (skipSink.test(sh.id) || ['eye', 'brow', 'nose', 'ear'].includes(sh.base)) continue; const g = GB.shapePlane(W, sh.id, padPlane); if (g < pr.sink.d) pr.sink = { d: +g.toFixed(2), shape: sh.id, t: +t.toFixed(2) }; }
    const b = GB.bodyClear(W, db, { skip: skipParts, parts: /^(?!pad0$)/ }); if (b.d < pr.parts.d) pr.parts = Object.assign(b, { t: +t.toFixed(2) });
    const r = GB.bodyClear(W, db, { skip: /^(?!foot_)/, parts: /^pad[5-7]$/ }).d; pr.roll = [Math.min(pr.roll[0], r), Math.max(pr.roll[1], r)];
    pr.floor = Math.min(pr.floor, L.shapeMinY(W).y);
    if (extra) extra(W, pz, t);
  } });
  return { rep, pr, fails: [[rep.slide <= 0.05, 'planted feet slide'], [pr.sink.d >= -0.8, `body sinks into the board ${JSON.stringify(pr.sink)}`], [pr.parts.d >= -0.5, `body into the bench ${JSON.stringify(pr.parts)}`],
    [pr.roll[0] >= -0.6 && pr.roll[0] <= 1.5, `feet not under the roller ${pr.roll.map(r1)}`], [pr.floor >= 1, 'body near the floor']] };
}

// Sit-up family on the decline. opt.keys: list of { name, l5, t12, t6, neck, pitch | fromFloor, floor, rot }; opt.kf:
// [[pose, t]]; opt.arms: 'cradle' (fingertips behind the head) | 'band' (the same cradle, each hand holding a band anchored low at
// the head end of the bench); opt.rot: trunk rotation added per key (twisting sit-up).
const SITUP_KEYS = [
  { name: 'lie', l5: 0, t12: 0, t6: 0, neck: null, pitch: 0, floor: true },
  { name: 'curl', l5: 3, t12: 12, t6: 16, neck: 30, pitch: 1 },
  { name: 'rise', l5: 20, t12: 20, t6: 17, neck: 26, fromFloor: 40 },
  { name: 'top', l5: 30, t12: 17, t6: 12, neck: 18, fromFloor: 80 },
  { name: 'topHold', l5: 31, t12: 18, t6: 12.5, neck: 18, fromFloor: 81 },
  { name: 'lower', l5: 32, t12: 22, t6: 16, neck: 22, fromFloor: 45 },
  { name: 'lowBack', l5: 8, t12: 16, t6: 17, neck: 28, pitch: 0 },
  { name: 'touch', l5: 0, t12: 3, t6: 6, neck: 16, pitch: 0, floor: true },
];
const SITUP_KF = [['lie', 0], ['lie', 0.8], ['curl', 1.5], ['rise', 1.95], ['top', 2.4], ['topHold', 2.9], ['lower', 3.9], ['lowBack', 4.6], ['touch', 5.0], ['lie', 5.5], ['lie', 6.4]];
function declineSitup(meta, opt = {}) {
  const id = meta.exercise.id, ANGLE = opt.angle ?? 25, bandMode = opt.arms === 'band', armsMode = bandMode ? 'cradle' : opt.arms || 'cradle';
  const SU = declineSetup({ angle: ANGLE, ankX: opt.ankX ?? -26, headRest: 'hands' });
  const { lie, F } = SU;
  const P0 = lie.root.rot.pitch, NECK0 = r1(lie.ch.neck_c7.flex + lie.ch.head_c1.flex);
  const LEG = { hip: clone(lie.ch.hip_r), hipL: clone(lie.ch.hip_l) };
  const trunkFromFloor = (W) => 90 - V.angle(V.sub(W.neck_c7.p, W.pelvis.p), [0, 1, 0]);
  const sitBottom = (W) => Math.min(M4.bottomOf(W, 'buttock_r'), M4.bottomOf(W, 'buttock_l'), M4.bottomOf(W, 'pelvis'));
  const SIT0 = sitBottom(L.fk(lie));
  function setP(q, P, drop = 0) {
    q.root.rot.pitch = r1(P); q.root.pos[1] = r1(lie.root.pos[1] - drop);
    q.ch.hip_r = Object.assign(clone(LEG.hip), { flex: r1(LEG.hip.flex + (P0 - P)) });
    q.ch.hip_l = Object.assign(clone(LEG.hipL), { flex: r1(LEG.hipL.flex + (P0 - P)) });
    return q;
  }
  function trunk(k, guess) {
    const p = CA.spine(clone(lie), lie, { l5: k.l5, t12: k.t12, t6: k.t6 });
    CA.neck(p, k.neck == null ? NECK0 : k.neck);
    let P = P0;
    if (k.fromFloor != null) {
      let hi = P0 + 10, lo = hi;
      while (lo > 0 && trunkFromFloor(L.fk(setP(clone(p), lo))) <= k.fromFloor) { hi = lo; lo -= 2; }
      for (let i = 0; i < 60; i++) { P = (lo + hi) / 2; if (trunkFromFloor(L.fk(setP(clone(p), P))) > k.fromFloor) lo = P; else hi = P; }
    } else P = P0 + (k.pitch || 0);
    // twist after the pitch is set (the untwisted trunk sets how far the pelvis rolls)
    if (k.rot) { const sp = [0.2, 0.4, 0.4]; ['spine_l5', 'spine_t12', 'spine_t6'].forEach((j, i) => { p.ch[j].rot = r1(k.rot * sp[i]); }); p.ch.neck_c7.rot = r1(-k.rot * 0.15); }
    setP(p, P);
    const W = L.fk(p, F.contacts), drop = Math.max(0, sitBottom(W) - SIT0);
    setP(p, P, drop);
    let q = p;
    for (const sd of ['r', 'l']) q = CA.fitLeg(q, sd, F.targets[sd], F.contacts);
    q.ik = clone(lie.ik);
    if (armsMode !== 'cradle') return q;
    const out = CB.cradle(q, { floor: k.floor ? 0.2 : 1.0, elbowAnt: k.elbowAnt ?? -3, elbowOut: 20, guess, ref: k.floor ? guess : null });
    if (k.rot) { const l = CB.cradle(q, { side: 'l', floor: k.floor ? 0.2 : 1.0, elbowAnt: -3, elbowOut: 20 }); for (const j of ['shoulder', 'elbow', 'wrist', 'sc']) out.ch[`${j}_l`] = clone(l.ch[`${j}_l`]); }
    return out;
  }
  const KEYS = opt.keys || SITUP_KEYS;
  let ARM0 = null;
  if (armsMode === 'cradle') {
    let seed = null;
    for (const pron of [-30, 30, 90]) for (const axial of [-130, -70]) { const g = { shoulder: { plane: -5, elev: 126, axial }, elbow: { flex: 136 }, wrist: { pron, flex: 16, dev: -20 }, sc: { protract: -2, elevate: 2 } }; const pp = trunk(KEYS[1], g); if (!seed || pp.__cost < seed.__cost) seed = pp; }
    ARM0 = CB.armOf(seed, 'r');
  }
  const poses = {}; let prev = ARM0;
  for (const k of KEYS) { const pp = trunk(k, k.floor ? ARM0 : prev); if (armsMode === 'cradle') prev = CB.armOf(pp, 'r'); delete pp.__cost; poses[k.name] = pp; }
  let bandInfo = bandMode ? { armErr: 0 } : null;
  const keyframes = (opt.kf || SITUP_KF).map(([pose, t]) => ({ t, pose }));
  const onBoard = {}; for (const k in poses) onBoard[k] = SU.onBoard(poses[k]);
  const ex = H.module_(meta, SU.contacts, onBoard, keyframes);
  ex.props = [SU.db.prop];
  if (bandMode) {
    const low = SU.db.points.low;
    const anc = (sd) => [r1(low[0] - 2), r1(low[1] - 8), sd === 'r' ? 17 : -17];
    ex.props.push(...['r', 'l'].map((sd) => ({ id: `band_${sd}`, kind: 'band', color: '#d9534f', anchor: anc(sd), attach: { joint: `wrist_${sd}`, grip: 'handle' } })));
    bandInfo.anchor = anc('r');
  }
  const lineMin = { d: 1e9 };
  const chk = boardChecks(ex, SU.db, { extra: bandMode ? (W, pz, t) => { for (const sd of ['r', 'l']) { const a = ex.props.find((x) => x.id === `band_${sd}`).anchor, lc = EQ.lineClear(W, a, EQ.gripPoint(W, sd).p, 0.6, { skip: new RegExp(`^(hand|thumb|forearm|traps|deltoid)_|_${sd === 'r' ? 'l' : 'r'}$`) }); if (lc.d < lineMin.d) Object.assign(lineMin, lc, { t: +t.toFixed(2) }); } } : null });
  const pad = SU.pad, trunkBoard = (W) => 90 - V.angle(V.sub(W.neck_c7.p, W.pelvis.p), pad.n);
  const topName = opt.topName || 'topHold', Wt = L.fk(onBoard[topName], SU.contacts), Wl = L.fk(onBoard[KEYS[0].name], SU.contacts), pk = poses[topName];
  const set = H.setKin(ex);
  set('Trunk', 'setup', `Lying on the ${ANGLE}° decline (shoulder blades on the board)`); set('Trunk', 'peak', `${dg(trunkBoard(Wt))} from the board (${dg(trunkBoard(Wt) - ANGLE)} from the floor)`);
  set('Lumbar flexion', 'setup', dg(lie.ch.spine_l5.flex) + ' (slight lordosis)'); set('Lumbar flexion', 'peak', `${dg(pk.ch.spine_l5.flex)} (L5-T12 segment)`);
  set('Thoracic flexion', 'setup', dg(lie.ch.spine_t12.flex + lie.ch.spine_t6.flex) + ' (resting curve)'); set('Thoracic flexion', 'peak', `${dg(pk.ch.spine_t12.flex + pk.ch.spine_t6.flex)} at the top`);
  set('Hip flexion', 'setup', dg(lie.ch.hip_r.flex)); set('Hip flexion', 'peak', `${dg(pk.ch.hip_r.flex)}`);
  if (opt.rotRow) { set('Trunk rotation', 'setup', '0° (square to the board)'); set('Trunk rotation', 'peak', `${dg(Math.abs(pk.ch.spine_l5.rot + pk.ch.spine_t12.rot + pk.ch.spine_t6.rot))} toward the right knee at the top`); }
  if (opt.bandRow) { set('Band', 'setup', 'Hands behind the head holding the band ends; bands anchored low at the head end of the bench'); set('Band', 'peak', 'Bands stretch as the trunk rises'); }
  setMeasure(ex, opt.measure || 'hipFlexion');
  console.log(`${meta.exercise.name}: wrote ${L.write(ex)}\n  ${JSON.stringify({ params: SU.db.prop.params, slide: chk.rep.slide, sink: chk.pr.sink, parts: chk.pr.parts, roll: chk.pr.roll.map(r1), floor: r1(chk.pr.floor), trunkTop: r1(trunkBoard(Wt)), measure: ex.checks.measure, band: bandInfo, line: lineMin.d < 1e8 ? { d: r1(lineMin.d), id: lineMin.id, t: lineMin.t } : null })}`);
  fail(id, chk.fails.concat([[!bandInfo || bandInfo.armErr < 1, 'hands off the band handles'], [!bandMode || lineMin.d > -0.5, `band into the body ${JSON.stringify(lineMin)}`]]));
  return ex;
}

// Arm work lying on the decline (head on the board, feet hooked). opt.keys(ctx) -> { name: wish } where a wish is the
// right hand's { g, palm, thumb, axis, elbow, wElbow } in world cm (the left hand mirrors it); opt.kf: [[name, t]];
// opt.item: 'dumbbells' | 'barbell' | 'band' | 'cable'; opt.grip: 'handle' | 'bar'; opt.anchors(ctx) -> { r, l } for
// band / cable; opt.rows(set, ctx, poses) fills the kinematics rows.
const BBF = require('./barbell');
function declineArms(meta, opt = {}) {
  const id = meta.exercise.id, ANGLE = opt.angle ?? 25, item = opt.item, grip = opt.grip || (item === 'barbell' ? 'bar' : 'handle');
  const SU = declineSetup({ angle: ANGLE, ankX: opt.ankX ?? -26, headRest: 'floor' });
  const lie = clone(SU.lie);
  for (const sd of ['r', 'l']) { lie.ch[`sc_${sd}`] = { protract: 0, elevate: 0 }; }
  const lieB = SU.onBoard(lie), W = L.fk(lieB, SU.contacts);
  const head = V.scale(SU.frame.ex, -1), n = SU.pad.n, up = [0, 1, 0], Z = [0, 0, 1];
  const T6 = (o) => inFrame(W, 'spine_t6', o);
  const chestTop = Math.max(...['pecs_r', 'chest', 'ribcage'].map((sid) => -GB.shapePlane(W, sid, { o: W.spine_t6.p, n: V.scale(dirIn(W, 'spine_t6', [1, 0, 0]), -1) }))); // depth of the chest front from t6 (cm, along the chest normal)
  const ctx = { W, S: W.shoulder_r.p, head, n, up, Z, T6, chestTop, db: SU.db, frame: SU.frame };
  // shoulder joint to grip point with the elbow at `flex` (wrist straight), measured on the rig
  ctx.gripReach = (flex, pron = 90) => { const q = clone(lieB); C3.setArm(q, 'r', { plane: 90, elev: 90, axial: 0, flex, pron }); const Wq = L.fk(q, SU.contacts); return V.len(V.sub(EQ.gripPoint(Wq, 'r', grip).p, Wq.shoulder_r.p)); };
  const wishes = opt.keys(ctx);
  const m = (v) => (v ? mz(v) : v);
  const poses = {}; let err = 0, guesses = null;
  for (const [name, w] of Object.entries(wishes)) {
    const q = armsAt(lieB, w, { g: mz(w.g), palm: m(w.palm), thumb: m(w.thumb), axis: m(w.axis), elbow: m(w.elbow), wElbow: w.wElbow }, { grip, guesses: guesses || undefined, contacts: SU.contacts });
    err = Math.max(err, q.__err); guesses = [GBR.guessOf(q), ...(GBR.armTo ? [] : [])]; delete q.__err; delete q.__cost;
    const prev = Object.values(poses).pop(); if (prev) K4.unwrapTo(q, prev);
    q.ik = clone(lieB.ik); poses[name] = q;
  }
  const keyframes = opt.kf.map(([pose, t]) => ({ t, pose }));
  const ex = H.module_(meta, SU.contacts, poses, keyframes);
  ex.props = [SU.db.prop];
  const DBS = { length: 32, diameter: 12 };
  let anchors = null;
  if (item === 'dumbbells') ex.props.push(...['r', 'l'].map((sd) => ({ id: `db${sd.toUpperCase()}`, kind: 'dumbbell', size: [DBS.length, DBS.diameter, DBS.diameter], attach: { joint: `wrist_${sd}`, grip: 'handle' } })));
  if (item === 'barbell') ex.props.push(BBF.barbellProp({ plateD: opt.plateD ?? 32 }));
  if (item === 'band' || item === 'cable') {
    anchors = opt.anchors(ctx);
    for (const sd of ['r', 'l']) {
      if (item === 'band') ex.props.push({ id: `band_${sd}`, kind: 'band', color: '#d9534f', anchor: anchors[sd], attach: { joint: `wrist_${sd}`, grip: 'handle' } });
      else { ex.props.push(EQ.cableTower(anchors[sd], { x: anchors[sd][0], z: anchors[sd][2] + (sd === 'r' ? 8 : -8), id: `tower_${sd}` })); ex.props.push({ id: `handle_${sd}`, kind: 'cable', attachment: 'handle', size: [13, 3, 3], anchor: anchors[sd], attach: { joint: `wrist_${sd}`, grip: 'handle' } }); }
    }
  }
  if (opt.extraProps) ex.props.push(...opt.extraProps(ctx));
  // checks: board + item vs body / bench / floor + lines
  const pr = { item: { d: 1e9 }, itemBench: 1e9, itemFloor: 1e9, line: { d: 1e9 }, lineBench: 1e9, w: [1e9, -1e9] };
  const chk = boardChecks(ex, SU.db, { skipSink: /^(hand|thumb|forearm|upperarm|biceps|triceps|deltoid)_/, skipParts: /^(foot_|toe|hand_|thumb_)/, extra: (Wx, pz, t) => {
    if (item === 'dumbbells') for (const sd of ['r', 'l']) {
      const d = D.dumbbellAt(Wx, sd, 'handle', DBS), heads = [[d.ends[0], V.add(d.ends[0], V.scale(d.ax, 4))], [d.ends[1], V.sub(d.ends[1], V.scale(d.ax, 4))]];
      for (const [a, b] of heads) { const c = EQ.segmentClear(Wx, a, b, d.r, { skip: /^(hand|thumb)_/, n: 3 }); if (c.d < pr.item.d) pr.item = Object.assign(c, { t: +t.toFixed(2) }); pr.itemBench = Math.min(pr.itemBench, GB.segClear(a, b, d.r, SU.db, 3)); }
      pr.itemFloor = Math.min(pr.itemFloor, D.dumbbellMinY(Wx, sd, 'handle', DBS));
    }
    if (item === 'barbell') {
      const c = BBF.barBodyClear(Wx, { plates: 1, plateD: opt.plateD ?? 32 }); if (c.d < pr.item.d) pr.item = Object.assign(c, { t: +t.toFixed(2) });
      const b = EQ.barAt(Wx, 'bar'); pr.itemBench = Math.min(pr.itemBench, GB.segClear(V.sub(b.c, V.scale(b.ax, 70)), V.add(b.c, V.scale(b.ax, 70)), 2.5, SU.db, 20));
      pr.itemFloor = Math.min(pr.itemFloor, EQ.barMinY(Wx, { plates: 1, plateD: opt.plateD ?? 32 })); pr.w = [Math.min(pr.w[0], b.width), Math.max(pr.w[1], b.width)];
    }
    if (anchors) for (const sd of ['r', 'l']) {
      const g = EQ.gripPoint(Wx, sd).p, lc = EQ.lineClear(Wx, anchors[sd], g, 0.6); if (lc.d < pr.line.d) pr.line = Object.assign(lc, { t: +t.toFixed(2) });
      pr.lineBench = Math.min(pr.lineBench, GB.segClear(anchors[sd], V.lerp(anchors[sd], g, 0.97), 0.5, SU.db, 16));
    }
  } });
  const set = H.setKin(ex);
  if (opt.rows) opt.rows(set, ctx, poses, (k) => L.fk(poses[k], SU.contacts));
  setMeasure(ex, 'trunkFlexion');
  const info = { err: r1(err), slide: chk.rep.slide, sink: chk.pr.sink, parts: chk.pr.parts, roll: chk.pr.roll.map(r1), floor: r1(chk.pr.floor), item: pr.item.d < 1e8 ? { d: r1(pr.item.d), id: pr.item.id, t: pr.item.t } : null, itemBench: r1(pr.itemBench), itemFloor: r1(pr.itemFloor), line: pr.line.d < 1e8 ? { d: r1(pr.line.d), id: pr.line.id, t: pr.line.t } : null, lineBench: r1(pr.lineBench), w: pr.w.map(r1), elbow: Object.fromEntries(Object.entries(poses).map(([k, q]) => [k, q.ch.elbow_r.flex])) };
  console.log(`${meta.exercise.name}: wrote ${L.write(ex)}\n  ${JSON.stringify(info)}`);
  fail(id, chk.fails.concat([[err < 1, `hands off target ${r1(err)}`], [!info.item || info.item.d > -0.8, `item into the body ${JSON.stringify(info.item)}`], [pr.itemBench > -0.3, `item into the bench ${r1(pr.itemBench)}`], [pr.itemFloor > 0.5, `item at the floor ${r1(pr.itemFloor)}`],
    [!anchors || pr.line.d > -0.6, `line into the body ${JSON.stringify(info.line)}`], [!anchors || pr.lineBench > -0.3, `line through the bench ${r1(pr.lineBench)}`], [item !== 'barbell' || pr.w[1] - pr.w[0] < 1.2, `grip width ${pr.w}`]]));
  return ex;
}

// keyframes [[name, t]] for a rep that goes k0 -> kN over phase `down` (smoothstep spacing), holds through `bottom`,
// and comes back over `up`; names: key names in order, fs: their fractions (0..1)
function kfDownUp(meta, names, fs, { down = 'lower', bottom = 'bottom', up = 'press' } = {}) {
  const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p]));
  const at = (pid, f) => +(ph[pid].start + (ph[pid].end - ph[pid].start) * f).toFixed(3);
  const inv = (y) => { let a = 0, b = 1; for (let k = 0; k < 40; k++) { const mm = (a + b) / 2; if (mm * mm * (3 - 2 * mm) < y) a = mm; else b = mm; } return (a + b) / 2; };
  const kf = [[names[0], 0], [names[0], at(down, 0)]];
  for (let i = 1; i < names.length; i++) kf.push([names[i], at(down, inv(fs[i]))]);
  if (ph[bottom]) kf.push([names[names.length - 1], at(bottom, 1)]);
  for (let i = names.length - 2; i >= 0; i--) kf.push([names[i], at(up, inv(1 - fs[i]))]);
  kf.push([names[0], meta.timeline.duration]);
  return kf.filter((k, i) => i === 0 || k[1] > kf[i - 1][1] + 1e-6);
}
const perpTo = (v, a) => V.norm(V.sub(v, V.scale(a, V.dot(v, a))));
// grip target at the reach of elbow `flex` from the shoulder c.S, along dir nudged by `extra` (cm)
const aim = (c, dir, flex, extra = [0, 0, 0], from = null) => { const S0 = from || c.S, d = c.gripReach(flex), g0 = V.add(V.add(S0, V.scale(V.norm(dir), d)), extra); return V.add(S0, V.scale(V.norm(V.sub(g0, S0)), d)); };

/* =====================================================================================================================
   Head-high on the decline bench (an incline from the athlete's view): lying with the head toward the high end, hands
   gripping the ankle roller behind the head (planted arm contacts), legs free. Authored in the board's flat frame with
   the root turned 180 degrees (head toward +X); boardPose moves it onto the board (yaw 180: the board angle subtracts
   from the pitch). Each key sets the pelvis curl (lumbar flexion with the upper back held in place on the board), the
   thigh angle from the board and the knee bend.
   ===================================================================================================================== */
function declineHeadUp(meta, opt = {}) {
  const id = meta.exercise.id, ANGLE = opt.angle ?? 25;
  let lie = M4.lie({ kneeFlex: 90, headRest: 'floor' });
  delete lie.ik;
  lie.root.rot = Object.assign({}, lie.root.rot, { yaw: 180 });
  lie.root.pos[0] = 0;
  const benchAt = (rollerAt, rollerUp = 13) => GB.declineBench({ x: 0, params: { angle: ANGLE, rollerAt, rollerUp } });
  const db0 = benchAt(9), frame = GB.boardFrame(db0), ang = frame.angle;
  const boardPose = (pp) => { const q = clone(pp); q.root.pos = frame.pt(pp.root.pos).map(r1); q.root.rot = Object.assign({}, q.root.rot, { pitch: r1((q.root.rot.pitch || 0) - ang) }); if (q.ik) for (const k in q.ik) q.ik[k].target = frame.pt(q.ik[k].target).map(r1); return q; };
  const flatOf = (W, j) => { const d = V.sub(W[j].p, frame.H); return [V.dot(d, frame.ex), V.dot(d, frame.ey), d[2]]; };
  // place the body so that the shoulders sit SH cm (flat) below the roller's grip line: grip reach with the elbows a little bent
  const RA = opt.rollerAt ?? 9, rollerX = -RA;
  const shFlat0 = flatOf(L.fk(boardPose(lie)), 'shoulder_r');
  const SH = opt.reachX ?? 50;
  lie.root.pos[0] = r1(rollerX - SH - shFlat0[0]);
  // keys in the flat frame
  const T60 = L.fk(lie).spine_t6, LEG0 = { l5: lie.ch.spine_l5.flex, t12: lie.ch.spine_t12.flex };
  const t6q = T60.q;
  function key(k) {
    let q = clone(lie);
    q.ch.spine_l5.flex = r1(LEG0.l5 + (k.curl || 0) * 0.6); q.ch.spine_t12.flex = r1(LEG0.t12 + (k.curl || 0) * 0.4);
    // keep the upper back where it lies: t6 position and orientation fixed
    q = L.solvePose(q, ['root.pos.0', 'root.pos.1', 'root.rot.pitch'], [L.obj.at('spine_t6', T60.p, 3), (W) => V.sub(Q.rot(W.spine_t6.q, [0, 1, 0]), Q.rot(t6q, [0, 1, 0])).map((v) => v * 40)], { iters: 300 }).pose;
    const th = k.thigh * R.DEG, dvec = [-Math.cos(th), Math.sin(th), 0];
    for (const sd of ['r', 'l']) { q.ch[`knee_${sd}`] = { flex: k.knee }; q.ch[`ankle_${sd}`] = { dorsi: k.ankle ?? -20 }; q.ch[`hip_${sd}`] = { flex: 30, abd: 2, rot: 0 }; }
    q = L.solvePose(q, ['ch.hip_r.flex'], [L.obj.aim('hip_r', 'knee_r', dvec)]).pose; q.ch.hip_l = clone(q.ch.hip_r);
    return q;
  }
  const flatPoses = {}; for (const k of opt.keys) flatPoses[k.name] = key(k);
  const board = {}; for (const k in flatPoses) board[k] = boardPose(flatPoses[k]);
  // roller over the grip line; hands on the roller (grip 'handle' round its axis), solved on the first key, then planted
  const db = benchAt(RA, opt.rollerUp ?? 13);
  const rc = db.points.roller, GZ = opt.gz ?? 11;
  const B0 = board[opt.keys[0].name];
  const n = db.surfaces.pad.n, headDir = frame.ex; // toward the high end (the head)
  const arms = armsAt(B0, { g: [rc[0], rc[1], GZ], axis: [0, 0, 1], palm: V.norm(V.add(n, V.scale(headDir, -0.3))), wElbow: 0 }, { g: [rc[0], rc[1], -GZ], axis: [0, 0, 1], palm: V.norm(V.add(n, V.scale(headDir, -0.3))), wElbow: 0 });
  const armErr = arms.__err;
  const Wa = L.fk(arms);
  const contacts = ['r', 'l'].map((sd) => Object.assign(L.handContact(sd), { label: `${sd === 'r' ? 'Right' : 'Left'} hand (roller)`, pole: [0, -1, sd === 'r' ? 0.6 : -0.6], handRot: Wa[`wrist_${sd}`].q.map((v) => +v.toFixed(6)) }));
  const HAND = { r: Wa.wrist_r.p.map(r1), l: Wa.wrist_l.p.map(r1) };
  const poses = {};
  for (const [name, b] of Object.entries(board)) {
    let q = clone(b); copyArm(q, arms, 'r'); copyArm(q, arms, 'l');
    q.ik = { arm_r: { target: HAND.r, weight: 1 }, arm_l: { target: HAND.l, weight: 1 } };
    for (const sd of ['r', 'l']) { q = H.fitArm(q, sd, contacts.find((c) => c.id === `arm_${sd}`), HAND[sd], [{ [`shoulder_${sd}`]: clone(arms.ch[`shoulder_${sd}`]), [`elbow_${sd}`]: clone(arms.ch[`elbow_${sd}`]), [`wrist_${sd}`]: clone(arms.ch[`wrist_${sd}`]) }]); delete q.__cost; }
    poses[name] = q;
  }
  const keyframes = opt.kf.map(([pose, t]) => ({ t, pose }));
  const ex = H.module_(meta, contacts, poses, keyframes);
  ex.props = [db.prop];
  const padPlane = { o: db.surfaces.pad.o, n };
  const pr = { sink: { d: 1e9 }, parts: { d: 1e9 }, floor: 1e9, lift: [1e9, -1e9], back: [1e9, -1e9] };
  const rep = H.loopReport(ex, { planted: ['arm_r', 'arm_l'], probe: (W, pz, t) => {
    for (const sh of L.rig.shapes) { if (/^(hand|thumb)_/.test(sh.id) || ['eye', 'brow', 'nose', 'ear'].includes(sh.base)) continue; const g = GB.shapePlane(W, sh.id, padPlane); if (g < pr.sink.d) pr.sink = { d: +g.toFixed(2), shape: sh.id, t: +t.toFixed(2) }; }
    const b = GB.bodyClear(W, db, { skip: /^(hand_|thumb_|forearm_)/, parts: /^(?!pad0$)/ }); if (b.d < pr.parts.d) pr.parts = Object.assign(b, { t: +t.toFixed(2) }); // the forearms lie against the roller the hands hold
    pr.floor = Math.min(pr.floor, L.shapeMinY(W).y);
    const lf = Math.min(GB.shapePlane(W, 'buttock_r', padPlane), GB.shapePlane(W, 'pelvis', padPlane)); pr.lift = [Math.min(pr.lift[0], lf), Math.max(pr.lift[1], lf)];
    const bk = Math.min(GB.shapePlane(W, 'traps_r', padPlane), GB.shapePlane(W, 'chest', padPlane)); pr.back = [Math.min(pr.back[0], bk), Math.max(pr.back[1], bk)];
  } });
  const set = H.setKin(ex);
  if (opt.rows) opt.rows(set, poses, (k) => L.fk(poses[k], contacts), pr);
  setMeasure(ex, 'hipFlexion');
  console.log(`${meta.exercise.name}: wrote ${L.write(ex)}\n  ${JSON.stringify({ params: db.prop.params, armErr, slide: rep.slide, sink: pr.sink, parts: pr.parts, floor: r1(pr.floor), pelvisLift: pr.lift.map(r1), back: pr.back.map(r1), measure: ex.checks.measure, hip: rep.hipFlexR, knee: rep.kneeR })}`);
  fail(id, [[rep.slide <= 0.05, 'hands slide'], [armErr < 1, `hands off the roller ${armErr}`], [pr.sink.d >= -0.8, `body into the board ${JSON.stringify(pr.sink)}`], [pr.parts.d >= -0.5, `body into the bench ${JSON.stringify(pr.parts)}`], [pr.floor >= 1, 'near the floor'], [pr.back[1] < 2, `upper back leaves the board ${pr.back}`]]);
  return ex;
}

// Arms crossed on the chest (right hand over the left upper chest, left hand under it), solved on pose p; returns the pose
function crossArms(p, { dx = 0 } = {}) {
  const W = L.fk(p), T6 = (off) => inFrame(W, 'spine_t6', off), Tx = (v) => dirIn(W, 'spine_t6', v);
  const chestF = -Math.min(...['pecs_r', 'pecs_l', 'chest', 'ribcage'].map((sid) => GB.shapePlane(W, sid, { o: W.spine_t6.p, n: Tx([-1, 0, 0]) })));
  const q = armsAt(p, { g: T6([chestF + 4.5 + dx, 4, -13]), palm: Tx([-1, 0, 0]), elbow: T6([chestF + 14, -8, 20]), wElbow: 0.4 }, { g: T6([chestF + 2.5 + dx, -2, 13]), palm: Tx([-1, 0, 0]), elbow: T6([chestF + 10, -12, -20]), wElbow: 0.4 });
  return q;
}

/* =====================================================================================================================
   Glute-ham raise on a GHD (hyperextension_bench variant 'ghd', legs horizontal): soles on the foot plate between the
   rollers (planted), lower thighs on the round pad, arms crossed on the chest. The shins stay put; the straight
   knee-to-shoulder line turns about the knee from horizontal to upright (knee flexion) and back. The pad position is
   searched so the thighs rest on it at the start and nothing sinks into it through the rep.
   ===================================================================================================================== */
function gluteHam(meta, opt = {}) {
  const id = meta.exercise.id, STANCE = 11, KMAX = opt.kmax ?? 88;
  const hb0 = GB.hyperBench({ x: 0, params: { variant: 'ghd' } });
  const feet = GB.hyperFeet(hb0, { stance: STANCE });
  const contacts = feet.contacts.map((c) => Object.assign(c, { pole: [0.15, -1, 0] })); // knees point at the pad, no lateral drift
  const z0 = () => ({ rot: 0, flex: 0, latFlex: 0 });
  let base = { root: { pos: [60, 100, 0], rot: { pitch: -90 } }, ch: { spine_l5: z0(), spine_t12: z0(), spine_t6: { rot: 0, flex: 2, latFlex: 0 }, neck_c7: { rot: 0, flex: 4 }, head_c1: { rot: 0, flex: 4 },
    sc_r: { protract: 6, elevate: 2 }, sc_l: { protract: 6, elevate: 2 }, hip_r: { flex: 0, abd: 2, rot: 0 }, hip_l: { flex: 0, abd: 2, rot: 0 }, knee_r: { flex: 2 }, knee_l: { flex: 2 }, ankle_r: { dorsi: 0 }, ankle_l: { dorsi: 0 },
    shoulder_r: { plane: 0, elev: 10, axial: 0 }, shoulder_l: { plane: 0, elev: 10, axial: 0 }, elbow_r: { flex: 10 }, elbow_l: { flex: 10 }, wrist_r: { pron: 0, flex: 0, dev: 0 }, wrist_l: { pron: 0, flex: 0, dev: 0 } } };
  base = L.solvePose(base, ['root.pos.0', 'root.pos.1', 'ch.hip_r.abd', 'ch.hip_l.abd'], [L.obj.at('ankle_r', feet.targets.r, 3), L.obj.at('ankle_l', feet.targets.l, 3)]).pose;
  base = crossArms(base); const armErr = base.__err; delete base.__err; delete base.__cost;
  base.ik = { leg_r: { target: feet.targets.r, weight: 1 }, leg_l: { target: feet.targets.l, weight: 1 } };
  const Wb = L.fk(base, contacts), KNEE = Wb.knee_r.p.slice(), P0 = base.root.rot.pitch;
  function key(k, hipFlex = 0) {
    const q = clone(base); q.root.rot.pitch = r1(P0 + k);
    for (const sd of ['r', 'l']) { q.ch[`knee_${sd}`].flex = r1(2 + k); q.ch[`hip_${sd}`].flex = r1(hipFlex); }
    const ANK0 = Wb.ankle_r.p;
    let s2 = L.solvePose(q, ['root.pos.0', 'root.pos.1', 'root.rot.pitch'], [L.obj.at('knee_r', KNEE, 3), L.obj.at('ankle_r', ANK0, 2)]).pose;
    for (const sd of ['r', 'l']) s2 = H.fitLeg(s2, sd, contacts.find((c) => c.id === `leg_${sd}`), feet.targets[sd], { abd: base.ch[`hip_${sd}`].abd, rot: 0, handRot: feet.footRot });
    return s2;
  }
  const FS = [0, 0.25, 0.5, 0.75, 1], names = FS.map((f, i) => `k${i}`), poses = {};
  FS.forEach((f, i) => { poses[names[i]] = key(KMAX * f, opt.hip ? opt.hip * Math.sin(Math.PI * f) : 0); });
  poses.topHold = key(KMAX - 1);
  // pad: search padDist / padDrop (round pad radius 13) for contact under the lower thighs at the start, least sinking
  const TH = /^(quad_|thigh_|shank_|calf_)/, SK = /^(?!quad_|thigh_|shank_|calf_)/;
  const Ws = Object.values(poses).map((q) => L.fk(q, contacts)), F = hb0.points.F;
  let best = null;
  const alongK = V.dot(V.sub(KNEE, F), hb0.points.legDir);
  for (let dd = alongK - 2; dd <= alongK + 24; dd += 1) {
    const at = (drop) => GB.hyperBench({ x: 0, params: { variant: 'ghd', padDist: r1(dd), padDrop: r1(drop) } });
    let lo = 0, hi = 40; for (let i = 0; i < 18; i++) { const mm = (lo + hi) / 2; if (GB.bodyClear(Ws[0], at(mm), { skip: SK, parts: /^pad2$/ }).d < 0.2) lo = mm; else hi = mm; }
    const hb = at(hi), sink = Math.min(...Ws.map((W) => GB.bodyClear(W, hb, { skip: SK, parts: /^pad2$/ }).d));
    const score = sink - Math.abs(dd - (alongK + 8)) * 0.02;
    if (!best || score > best.score) best = { score, hb, sink, dd };
  }
  const hb = best.hb;
  const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p]));
  const keyframes = kfDownUp(meta, names, FS, { down: 'raise', bottom: 'top', up: 'lower' }).map(([pose, t]) => ({ t, pose: pose === names[4] && Math.abs(t - ph.top.end) < 1e-3 ? 'topHold' : pose }));
  const ex = H.module_(meta, contacts, poses, keyframes);
  ex.props = [hb.prop];
  const pr = { body: { d: 1e9 }, legs: { d: 1e9 }, low: 1e9, kneeDrift: 0 };
  const rep = H.loopReport(ex, { planted: ['leg_r', 'leg_l'], probe: (W, pz, t) => {
    const b = GB.bodyClear(W, hb, { skip: /^(foot_|toe|calf_|shank_|quad_|thigh_|hand_|thumb_)/ }); if (b.d < pr.body.d) pr.body = Object.assign(b, { t: +t.toFixed(2) });
    const lg = GB.bodyClear(W, hb, { skip: SK, parts: /^pad2$/ }); if (lg.d < pr.legs.d) pr.legs = Object.assign(lg, { t: +t.toFixed(2) });
    pr.low = Math.min(pr.low, L.shapeMinY(W).y); pr.kneeDrift = Math.max(pr.kneeDrift, V.len(V.sub(W.knee_r.p, KNEE)));
  } });
  const Wt = L.fk(poses.topHold, contacts), W0 = L.fk(poses.k0, contacts);
  const lineAng = (W) => Math.atan2(W.neck_c7.p[1] - W.knee_r.p[1], W.neck_c7.p[0] - W.knee_r.p[0]) / R.DEG;
  const set = H.setKin(ex);
  set('Knee flexion', 'setup', `${dg(poses.k0.ch.knee_r.flex)} (body horizontal over the pad)`); set('Knee flexion', 'peak', `${dg(poses.topHold.ch.knee_r.flex)} at the top`);
  set('Hip', 'setup', 'Extended (knee, hip and shoulder in one line)'); set('Hip', 'peak', opt.hip ? `Slight bend mid-rep (up to ${opt.hip}°), straight at the top` : 'Still extended at the top');
  set('Body line', 'setup', `${dg(lineAng(W0))} from horizontal`); set('Body line', 'peak', `${dg(lineAng(Wt))} from horizontal (upright)`);
  set('Pad', 'setup', 'Lower thighs on the round pad, knees just behind it'); set('Pad', 'peak', `Shins fixed (knee drift ≤${r1(pr.kneeDrift)} cm)`);
  setMeasure(ex, 'kneeFlexion');
  console.log(`${meta.exercise.name}: wrote ${L.write(ex)}\n  ${JSON.stringify({ params: hb.prop.params, armErr, slide: rep.slide, body: pr.body, legsPad: pr.legs, low: r1(pr.low), kneeDrift: r1(pr.kneeDrift), knee: rep.kneeR, measure: ex.checks.measure })}`);
  fail(id, [[rep.slide <= 0.05, 'feet slide'], [armErr < 1, 'arms'], [pr.body.d >= -1, `body into the GHD ${JSON.stringify(pr.body)}`], [pr.legs.d >= -1.5, `thighs sink into the pad ${JSON.stringify(pr.legs)}`], [pr.low >= 1, 'near the floor'], [pr.kneeDrift < 1, 'knees move']]);
  return ex;
}

/* =====================================================================================================================
   Inverse (Nordic) leg curl: kneeling on a pad with the ankles hooked under a roller. The pad and roller are the gear-pack
   decline_bench set flat (angle 0): topH 6 = a kneeling pad on the floor, topH 50 = a flat bench. Shins stay on the pad
   (planted leg contacts, world-locked feet); the knee-to-shoulder line turns forward about the knees from upright and
   back. opt.bench: 'floor' | 'bench'; opt.assist: null | 'band' (band from a rack behind round the chest) | 'hands'
   (catch on the floor with the hands and push back up).
   ===================================================================================================================== */
function nordic(meta, opt = {}) {
  const id = meta.exercise.id, onBench = opt.bench === 'bench', assist = opt.assist || null;
  const TOP = onBench ? 50 : 6, KMIN = opt.kmin ?? (assist === 'hands' ? 14 : 30), HIPB = opt.hipBottom ?? 12;
  const z0 = () => ({ rot: 0, flex: 0, latFlex: 0 });
  let base = { root: { pos: [0, 80, 0], rot: { pitch: 0 } }, ch: { spine_l5: z0(), spine_t12: z0(), spine_t6: { rot: 0, flex: 2, latFlex: 0 }, neck_c7: { rot: 0, flex: 4 }, head_c1: { rot: 0, flex: 4 },
    sc_r: { protract: 6, elevate: 2 }, sc_l: { protract: 6, elevate: 2 }, hip_r: { flex: 0, abd: 2, rot: 0 }, hip_l: { flex: 0, abd: 2, rot: 0 }, knee_r: { flex: 90 }, knee_l: { flex: 90 }, ankle_r: { dorsi: opt.ankle ?? -62 }, ankle_l: { dorsi: opt.ankle ?? -62 },
    shoulder_r: { plane: 0, elev: 10, axial: 0 }, shoulder_l: { plane: 0, elev: 10, axial: 0 }, elbow_r: { flex: 10 }, elbow_l: { flex: 10 }, wrist_r: { pron: 0, flex: 0, dev: 0 }, wrist_l: { pron: 0, flex: 0, dev: 0 } } };
  const shinLow = (W) => Math.min(...['shank_r', 'shank_l', 'calf_r', 'calf_l'].map((sid) => M4.bottomOf(W, sid)));
  base = L.solvePose(base, ['root.pos.1'], [(W) => [(shinLow(W) - TOP - 0.2) * 3]]).pose;
  base = crossArms(base); const armErr0 = base.__err; delete base.__err; delete base.__cost;
  const Wb = L.fk(base), KNEE = Wb.knee_r.p.slice(), ANK = { r: Wb.ankle_r.p.map(r1), l: Wb.ankle_l.p.map(r1) };
  const contacts = ['r', 'l'].map((sd) => Object.assign(L.legContact(sd), { label: `${sd === 'r' ? 'Right' : 'Left'} foot (under the roller)`, pole: [0.2, -1, 0], handRot: Wb[`ankle_${sd}`].q.map((v) => +v.toFixed(6)) }));
  base.ik = { leg_r: { target: ANK.r, weight: 1 }, leg_l: { target: ANK.l, weight: 1 } };
  // pad: the board along -X from in front of the knees to past the feet; roller over the lower shins near the ankles
  const toeX = Math.min(Wb.toe_r.p[0], Wb.ankle_r.p[0]) - 8, frontX = KNEE[0] + 14, padLen = r1(frontX - toeX);
  // decline_bench turned 180 degrees: origin at the feet end, the board runs +X under the shins and knees, the roller sits
  // rollerAt cm in from the feet end, over the lower shins
  const benchK = (rUp) => GB.declineBench({ x: r1(toeX), rotY: 180, params: { angle: 0, topH: TOP, padLen, padW: onBench ? 36 : 44, rollerAt: r1(Wb.ankle_r.p[0] - toeX + 3), rollerUp: rUp } });
  const footGap = (db) => GB.bodyClear(Wb, db, { skip: /^(?!foot_|shank_|calf_)/, parts: /^pad[5-7]$/ }).d;
  let lo = 4, hi = 30; for (let i = 0; i < 20; i++) { const mm = (lo + hi) / 2; if (footGap(benchK(mm)) >= 0.3) hi = mm; else lo = mm; }
  const db = benchK(r1(hi + 0.05));
  function key(k, hip) {
    const q = clone(base);
    for (const sd of ['r', 'l']) { q.ch[`knee_${sd}`].flex = r1(k); q.ch[`hip_${sd}`].flex = r1(hip); }
    let s2 = L.solvePose(q, ['root.pos.0', 'root.pos.1', 'root.rot.pitch'], [L.obj.at('knee_r', KNEE, 3), L.obj.at('ankle_r', Wb.ankle_r.p, 2)]).pose;
    for (const sd of ['r', 'l']) s2 = H.fitLeg(s2, sd, contacts.find((c) => c.id === `leg_${sd}`), ANK[sd], { abd: base.ch[`hip_${sd}`].abd, rot: 0, handRot: contacts[0].handRot });
    return s2;
  }
  const FS = [0, 0.25, 0.5, 0.75, 1], names = FS.map((f, i) => `k${i}`), poses = {};
  FS.forEach((f, i) => { poses[names[i]] = key(90 - (90 - KMIN) * f, HIPB * f * f); });
  let handInfo = null;
  if (assist === 'hands') {
    // arms reach forward on the way down; at the bottom the hands land on the floor in front (planted), the arms push the
    // body back up a little, then the hamstrings take over
    const reachArms = (q, f) => armsAt(q, { g: V.add(inFrame(L.fk(q), 'shoulder_r', [0, 0, 0]), [30 * f + 10, -40 * f - 10, 2]), palm: [0.2, -1, 0], thumb: [0, 0, -1] }, { g: V.add(inFrame(L.fk(q), 'shoulder_l', [0, 0, 0]), [30 * f + 10, -40 * f - 10, -2]), palm: [0.2, -1, 0], thumb: [0, 0, 1] });
    for (let i = 2; i < 4; i++) { const a = reachArms(poses[names[i]], (i - 1) / 3); delete a.__err; delete a.__cost; for (const sd of ['r', 'l']) copyArm(poses[names[i]], a, sd); }
    const bot = poses[names[4]], Wbot = L.fk(bot);
    const handT = (sd) => [r1(Wbot[`shoulder_${sd}`].p[0] + 6), 2.6 + (TOP > 10 ? 0 : 0), r1(Wbot[`shoulder_${sd}`].p[2] * 1.15)];
    const HT = { r: handT('r'), l: handT('l') };
    const hc = ['r', 'l'].map((sd) => Object.assign(L.handContact(sd), { label: `${sd === 'r' ? 'Right' : 'Left'} hand (floor)` }));
    contacts.push(...hc);
    const plant = (q) => { q.ik = Object.assign({}, q.ik, { arm_r: { target: HT.r, weight: 1 }, arm_l: { target: HT.l, weight: 1 } }); for (const sd of ['r', 'l']) { q = H.fitArm(q, sd, hc.find((c) => c.id === `arm_${sd}`), HT[sd], [{ [`shoulder_${sd}`]: { plane: 80, elev: 80, axial: 0 }, [`elbow_${sd}`]: { flex: 30 } }]); delete q.__cost; } return q; };
    poses[names[4]] = plant(poses[names[4]]);
    poses.push = plant(key(90 - (90 - KMIN) * 0.8, HIPB * 0.8));
    for (const nm of Object.keys(poses)) if (!poses[nm].ik.arm_r) poses[nm].ik = Object.assign({}, poses[nm].ik, { arm_r: { target: HT.r, weight: 0 }, arm_l: { target: HT.l, weight: 0 } });
    handInfo = { hands: HT };
  }
  const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p]));
  const at = (pid, f) => +(ph[pid].start + (ph[pid].end - ph[pid].start) * f).toFixed(3);
  let kf;
  if (assist === 'hands') kf = [[names[0], 0], [names[0], at('lower', 0)], [names[1], at('lower', 0.3)], [names[2], at('lower', 0.6)], [names[3], at('lower', 0.85)], [names[4], at('lower', 1)], [names[4], at('catch', 1)], ['push', at('push', 1)], [names[3], at('curl', 0.3)], [names[2], at('curl', 0.6)], [names[1], at('curl', 0.82)], [names[0], at('curl', 1)], [names[0], meta.timeline.duration]];
  else kf = kfDownUp(meta, names, FS, { down: 'lower', bottom: 'bottom', up: 'curl' });
  // arms on the hands pose: release the planted hands smoothly (weight 0 before and after)
  const keyframes = kf.map(([pose, t]) => ({ t, pose }));
  const ex = H.module_(meta, contacts, poses, keyframes);
  ex.props = [db.prop];
  let bandInfo = null;
  if (assist === 'band') {
    const ax = r1(Wb.pelvis.p[0] - 70), ay = r1(Wb.spine_t6.p[1] - 4);
    const rk = EQ.rack({ x: ax - 3, width: 110, hookY: 150 });
    ex.props.push(rk.prop, ...['r', 'l'].map((sd) => ({ id: `band_${sd}`, kind: 'band', color: '#3f7fd9', anchor: [ax, ay, sd === 'r' ? 20 : -20], attach: { joint: 'spine_t6', offset: [-2, 4, sd === 'r' ? 15 : -15] } })));
    bandInfo = { anchor: [ax, ay] };
  }
  const pr = { body: { d: 1e9 }, legs: [1e9, -1e9], low: 1e9, kneeDrift: 0, line: { d: 1e9 } };
  const rep = H.loopReport(ex, { planted: assist === 'hands' ? ['leg_r', 'leg_l', 'arm_r', 'arm_l'] : ['leg_r', 'leg_l'], probe: (W, pz, t) => {
    const b = GB.bodyClear(W, db, { skip: /^(foot_|toe|calf_|shank_|hand_|thumb_)/ }); if (b.d < pr.body.d) pr.body = Object.assign(b, { t: +t.toFixed(2) });
    const sl = GB.shapePlane(W, 'shank_r', { o: db.surfaces.pad.o, n: [0, 1, 0] }); pr.legs = [Math.min(pr.legs[0], sl), Math.max(pr.legs[1], sl)];
    pr.low = Math.min(pr.low, L.shapeMinY(W).y); pr.kneeDrift = Math.max(pr.kneeDrift, V.len(V.sub(W.knee_r.p, KNEE)));
    if (bandInfo) for (const sd of ['r', 'l']) { const pp = ex.props.find((x) => x.id === `band_${sd}`), end = inFrame(W, 'spine_t6', pp.attach.offset), lc = EQ.lineClear(W, pp.anchor, V.lerp(pp.anchor, end, 0.9), 0.6, { skip: /^(hand|thumb)_/ }); if (lc.d < pr.line.d) pr.line = Object.assign(lc, { t: +t.toFixed(2) }); }
  } });
  const W0 = L.fk(poses.k0, contacts), W4 = L.fk(poses.k4, contacts);
  const lineAng = (W) => Math.atan2(W.neck_c7.p[1] - W.knee_r.p[1], W.neck_c7.p[0] - W.knee_r.p[0]) / R.DEG;
  const set = H.setKin(ex);
  set('Knee flexion', 'setup', `${dg(poses.k0.ch.knee_r.flex)} (kneeling upright)`); set('Knee flexion', 'peak', `${dg(poses.k4.ch.knee_r.flex)} at the bottom`);
  set('Body line', 'setup', `${dg(lineAng(W0))} from the floor`); set('Body line', 'peak', `${dg(lineAng(W4))} from the floor at the bottom`);
  set('Hip', 'setup', 'Extended (knee, hip and shoulder in line)'); set('Hip', 'peak', `${dg(HIPB)} of hip bend at the bottom`);
  if (opt.assistRow) { set(opt.assistRow[0], 'setup', opt.assistRow[1]); set(opt.assistRow[0], 'peak', opt.assistRow[2]); }
  setMeasure(ex, 'kneeFlexion');
  console.log(`${meta.exercise.name}: wrote ${L.write(ex)}\n  ${JSON.stringify({ params: db.prop.params, armErr0, slide: rep.slide, body: pr.body, shinPad: pr.legs.map(r1), low: r1(pr.low), kneeDrift: r1(pr.kneeDrift), knee: rep.kneeR, measure: ex.checks.measure, line: pr.line.d < 1e8 ? { d: r1(pr.line.d), id: pr.line.id } : null, handInfo })}`);
  fail(id, [[rep.slide <= 0.05, 'planted contacts slide'], [pr.body.d >= -1, `body into the pad ${JSON.stringify(pr.body)}`], [pr.legs[0] >= -1 && pr.legs[1] <= 1.5, `shins off the pad ${pr.legs.map(r1)}`], [pr.low >= (assist === 'hands' ? -0.4 : 1), 'body on the floor'], [pr.kneeDrift < 1.6, 'knees move'], [!bandInfo || pr.line.d > -0.8, `band into the body ${JSON.stringify(pr.line)}`]]);
  return ex;
}

/* =====================================================================================================================
   Dips with the hands behind the hips on a low support (generalized from author-bench-dip.js): hands planted (palm down,
   fingers forward, pitched over the edge), feet planted, each key solves the root for a shoulder height with the buttocks
   just in front of the support edge. opt.surfaceH: 0 = hands on the floor (support = floor), else a box (chair seat) of
   that height; opt.footX, opt.knee: legs; opt.minHip: lowest hip-joint height (floor version: the buttocks stop short
   of the floor).
   ===================================================================================================================== */
const T3b = require('./b3-triceps');
function handsBehindDip(meta, opt = {}) {
  const id = meta.exercise.id, SH = opt.surfaceH ?? 0, EDGE = 0, PALM = 2.6, HZ = opt.hz ?? 22;
  const FPITCH = SH > 0 ? 35 : 0, A_CORNER = SH > 0 ? 6 : 8;
  const handQ = (sd) => Q.mul(Q.axis([0, 1, 0], (opt.fingerYaw ?? 0) * (sd === 'r' ? -1 : 1)), Q.mul(Q.axis([0, 0, 1], -FPITCH), sd === 'r' ? L.handRotR : L.handRotL));
  const a = FPITCH * R.DEG, pal = [EDGE - A_CORNER * Math.cos(a), SH + A_CORNER * Math.sin(a)], WRIST = [r1(pal[0] + PALM * Math.sin(a)), r1(pal[1] + PALM * Math.cos(a))];
  const BACK = opt.back ?? (SH > 0 ? 0 : 3), FOOT_X = opt.footX ?? 58, FOOT_Z = 13, TOP_FLEX = 8, LEAN = opt.lean ?? 4;
  const HAND = { r: [WRIST[0], WRIST[1], HZ], l: [WRIST[0], WRIST[1], -HZ] };
  const FY = opt.heel ? opt.heelY ?? 8 : L.ANKLE_H, FP = opt.heel ? -(opt.heel) : 0;
  const FOOT = { r: [FOOT_X, FY, FOOT_Z], l: [FOOT_X, FY, -FOOT_Z] };
  const POLE = [-1, 0, 0.3];
  const contacts = [Object.assign(H.handC('r', POLE), { handRot: H.qArr(handQ('r')) }), Object.assign(H.handC('l', [POLE[0], POLE[1], -POLE[2]]), { handRot: H.qArr(handQ('l')) }), H.legC('r', { pole: [1, 0.2, 0.15], rot: H.footQ(FP, -6) }), H.legC('l', { pole: [1, 0.2, -0.15], rot: H.footQ(FP, 6) })];
  const SC = { protract: -18, elevate: -4 };
  const base = (() => { const pp = L.POSES.standing().pose; delete pp.ik;
    Object.assign(pp.ch, { spine_l5: { rot: 0, flex: 4, latFlex: 0 }, spine_t12: { rot: 0, flex: 0, latFlex: 0 }, spine_t6: { rot: 0, flex: -2, latFlex: 0 }, neck_c7: { rot: 0, flex: 4 }, head_c1: { rot: 0, flex: 2 },
      sc_r: clone(SC), sc_l: clone(SC), hip_r: { flex: opt.hip ?? 85, abd: 4, rot: 0 }, hip_l: { flex: opt.hip ?? 85, abd: 4, rot: 0 }, knee_r: { flex: opt.knee ?? 90 }, knee_l: { flex: opt.knee ?? 90 } }); return pp; })();
  const trunkLean = (W) => V.angle(V.sub(W.neck_c7.p, W.pelvis.p), [0, 1, 0]) * Math.sign(W.neck_c7.p[0] - W.pelvis.p[0]);
  const rearX = (W) => Math.min(...['buttock_r', 'buttock_l', 'pelvis'].map((sid) => T3b.extremePt(W, T3b.shapeOf(sid), [-1, 0, 0])[0]));
  // floor version (opt.seatTop): the buttocks' height drops with the shoulders (seatTop with straight arms, 1:1 below
  // opt.sh0) instead of a fixed trunk lean
  const seatOf = (W) => Math.min(H.bottomOf(W, 'buttock_r'), H.bottomOf(W, 'pelvis'));
  const third = (shY) => (opt.seatTop != null ? (W) => [(seatOf(W) - Math.max(1, opt.seatTop - Math.max(0, (opt.sh0 ?? 52) - shY) * (opt.seatK ?? 1.4))) * 1.5] : (W) => [(trunkLean(W) - LEAN) * 0.5]);
  const rootFor = (shY) => L.solvePose(clone(base), ['root.pos.0', 'root.pos.1', 'root.rot.pitch'], [(W) => [(rearX(W) - (EDGE + BACK)) * 3], third(shY), (W) => [(W.shoulder_r.p[1] - shY) * 3]], { iters: 300 }).pose;
  function poseFor(shY) {
    let pp = rootFor(shY);
    pp.ik = { arm_r: { target: HAND.r.slice(), weight: 1 }, arm_l: { target: HAND.l.slice(), weight: 1 }, leg_r: { target: FOOT.r.slice(), weight: 1 }, leg_l: { target: FOOT.l.slice(), weight: 1 } };
    for (const sd of ['r', 'l']) {
      pp = H.fitLeg(pp, sd, contacts.find((c) => c.id === `leg_${sd}`), FOOT[sd], { rot: 0, abd: 4, handRot: contacts.find((c) => c.id === `leg_${sd}`).handRot });
      pp = H.fitArm(pp, sd, contacts.find((c) => c.id === `arm_${sd}`), HAND[sd], [{ [`shoulder_${sd}`]: { plane: -50, elev: 30, axial: 0 }, [`elbow_${sd}`]: { flex: 30 }, [`wrist_${sd}`]: { pron: 0, flex: -80, dev: 0 } }, { [`shoulder_${sd}`]: { plane: -55, elev: 70, axial: 40 }, [`elbow_${sd}`]: { flex: 90 }, [`wrist_${sd}`]: { pron: 0, flex: -80, dev: 0 } }]);
      pp[`__cost_${sd}`] = pp.__cost; delete pp.__cost;
    }
    return pp;
  }
  const armDist = (shY) => { const W = L.fk(rootFor(shY)); return V.len(V.sub(W.shoulder_r.p, HAND.r)); };
  let lo = SH + 20, hi = SH + 80, shTop = SH + 50;
  for (let i = 0; i < 40; i++) { shTop = (lo + hi) / 2; if (armDist(shTop) > L.reach(TOP_FLEX)) hi = shTop; else lo = shTop; }
  // bottom: upper arm parallel to the floor, or the hips at minHip (floor version)
  lo = shTop - 45; hi = shTop - 5; let shBot = shTop - 20;
  const lowEnough = (shY) => { const W = L.fk(Object.assign(rootFor(shY), { ik: { arm_r: { target: HAND.r, weight: 1 } } }), contacts); return W.elbow_r.p[1] >= W.shoulder_r.p[1] || (opt.minHip != null && Math.min(H.bottomOf(W, 'buttock_r'), H.bottomOf(W, 'pelvis')) <= opt.minHip); };
  for (let i = 0; i < 30; i++) { shBot = (lo + hi) / 2; if (!lowEnough(shBot)) hi = shBot; else lo = shBot; }
  shTop = r1(shTop); shBot = r1(shBot);
  const ease = T3b.ease, at = (u) => poseFor(shTop + (shBot - shTop) * u);
  const poses = { top: at(0), d1: at(ease(0.25)), d2: at(ease(0.5)), d3: at(ease(0.75)), bottom: at(1), bottomHold: at(0.985) };
  const costs = Object.values(poses).map((pp) => Math.max(pp.__cost_r, pp.__cost_l)); Object.values(poses).forEach((pp) => { delete pp.__cost_r; delete pp.__cost_l; });
  const names = ['top', 'd1', 'd2', 'd3', 'bottom'];
  const kf = kfDownUp(meta, names, [0, 0.25, 0.5, 0.75, 1]).map(([pose, t], i, arr) => ({ t, pose }));
  const ex = H.module_(meta, contacts, poses, kf);
  const box = SH > 0 ? { id: 'chair', kind: 'box', center: [EDGE - 20, 0, 0], size: [40, SH, 44] } : null;
  ex.props = box ? [opt.bench ? Object.assign(D.bench({ x: EDGE - 15, z: -40, seat: 40, height: SH, width: 30, angle: 0, back: 80 }).prop, { rotY: 90 }) : box] : [{ id: 'mat', kind: 'mat', center: [20, 0, 0], size: [180, 1, 60] }];
  if (box && opt.bench) { box.center = [EDGE - 15, 0, 0]; box.size = [30, SH, 120]; }
  const pr = { face: 1e9, top: 1e9, seat: 1e9 };
  const rep = H.loopReport(ex, { planted: ['arm_r', 'arm_l', 'leg_r', 'leg_l'], probe: (W) => {
    pr.face = Math.min(pr.face, rearX(W) - EDGE);
    if (box) { const ob = T3b.bodyOverBox(W, box, /^(hand_[rl]|thumb_[rl])$/); if (ob.d < pr.top) { pr.top = ob.d; pr.topAt = ob.id; } }
    pr.seat = Math.min(pr.seat, H.bottomOf(W, 'buttock_r'), H.bottomOf(W, 'pelvis'));
  } });
  const Wt = L.fk(poses.top, contacts), Wb = L.fk(poses.bottom, contacts);
  const shExt = (W) => { const t = V.norm(V.sub(W.neck_c7.p, W.pelvis.p)), ua = V.norm(V.sub(W.elbow_r.p, W.shoulder_r.p)); return V.angle(ua, V.scale(t, -1)) * (V.dot(ua, [1, 0, 0]) < 0 ? 1 : -1); };
  const uaTilt = (W) => Math.asin(V.norm(V.sub(W.elbow_r.p, W.shoulder_r.p))[1]) / R.DEG;
  const set = H.setKin(ex);
  set('Elbow flexion', 'setup', `${dg(T3b.elbowOf(Wt, 'r'))} (straight, not locked)`); set('Elbow flexion', 'peak', `${dg(T3b.elbowOf(Wb, 'r'))} at the bottom`);
  set('Shoulder extension', 'setup', `${dg(shExt(Wt))} (upper arm behind the trunk line)`); set('Shoulder extension', 'peak', `${dg(shExt(Wb))} at the bottom`);
  set('Upper arm angle to the floor', 'setup', `${dg(-uaTilt(Wt))} (arm pointing down and back)`); set('Upper arm angle to the floor', 'peak', `${dg(-uaTilt(Wb))} at the bottom`);
  const travel = V.len(V.sub(Wt.pelvis.p, Wb.pelvis.p));
  set('Hip travel', 'setup', `Hips ${Math.round(Wt.hip_r.p[1])} cm above the floor`); set('Hip travel', 'peak', `${Math.round(travel)} cm down (buttocks ${Math.round(pr.seat)} cm off the floor at the lowest)`);
  ex.checks.measure = { name: 'rootTravel', min: Math.floor(travel - 2), max: Math.ceil(travel + 2) };
  console.log(`${meta.exercise.name}: wrote ${L.write(ex)}\n  ${JSON.stringify({ shTop, shBot, travel: r1(travel), elbow: [r1(T3b.elbowOf(Wt, 'r')), r1(T3b.elbowOf(Wb, 'r'))], cost: +Math.max(...costs).toExponential(1), slide: rep.slide, floor: rep.floor, face: r1(pr.face), top: r1(pr.top), seat: r1(pr.seat) })}`);
  fail(id, [[rep.slide <= 0.05, 'planted contacts slide'], [rep.floor > -0.5, `below the floor ${rep.floor}`], [Math.max(...costs) < 2, 'arm fit'], [!box || pr.top > -1, `body into the chair ${pr.top}`], [pr.face > -1.5, 'buttocks behind the support edge'], [pr.seat > 0.5, 'buttocks on the floor']]);
  return ex;
}

/* =====================================================================================================================
   Prone floor back extension (lying on a mat, head toward +X; lying pose from author-superman.js): legs stay on the mat,
   the pelvis is the pivot (root fixed), the chest lifts by lumbar and thoracic extension with the neck long. Arms fixed in
   the chest frame: opt.arms 'head' (fingertips behind the head, elbows wide) | 'band' (band handles at the shoulders,
   elbows bent back; a band from each hand runs forward and down to a low anchor on a rack in front). opt.lift: spine
   extension at the top [l5, t12, t6]; opt.kf: [[pose, t]] with poses rest, up1, up2, top, topHold.
   ===================================================================================================================== */
const PR = require('./prone');
function floorExt(meta, opt = {}) {
  const id = meta.exercise.id, z0 = () => ({ rot: 0, flex: 0, latFlex: 0 });
  const sym = (pp, j, v) => { pp.ch[`${j}_r`] = clone(v); pp.ch[`${j}_l`] = clone(v); };
  const lowest = (W, ids) => Math.min(...ids.map((sid) => PR.bottomOf(W, sid)));
  const BODY = ['chest', 'pecs_r', 'ribcage', 'abdomen', 'pelvis'], THIGH = ['thigh_r', 'quad_r', 'shank_r'];
  const NOT_ARMS = L.rig.shapes.map((x) => x.id).filter((sid) => !/^(deltoid|upperarm|biceps|forearm|hand|thumb)_/.test(sid));
  const prone = ({ spine = [0, 0, 0], neck = -10 } = {}) => { const pp = { root: { pos: [0, 12, 0], rot: { pitch: -90 } }, ch: { spine_l5: { ...z0(), flex: spine[0] }, spine_t12: { ...z0(), flex: spine[1] }, spine_t6: { ...z0(), flex: spine[2] }, neck_c7: { rot: 0, flex: 0 }, head_c1: { rot: 0, flex: 0 } } };
    sym(pp, 'hip', { flex: 0, abd: 3, rot: 0 }); sym(pp, 'knee', { flex: 2 }); sym(pp, 'ankle', { dorsi: -62 }); sym(pp, 'sc', { protract: 0, elevate: 6 }); sym(pp, 'elbow', { flex: 90 });
    sym(pp, 'shoulder', { plane: 90, elev: 90, axial: 0 }); sym(pp, 'wrist', { pron: 0, flex: 0, dev: 0 }); PR.head(pp, neck); return pp; };
  const s0 = L.solvePose(prone(), ['root.pos.1', 'root.rot.pitch', 'ch.hip_r.flex', 'ch.ankle_r.dorsi', 'ch.knee_r.flex'], [
    (W) => [lowest(W, BODY) * 3, lowest(W, THIGH) * 2, lowest(W, ['foot_r']) * 1, Math.min(0, lowest(W, ['foot_r']) + 0.1) * 8, Math.min(0, lowest(W, NOT_ARMS)) * 6],
    (W, q) => [Math.min(0, q.ch.ankle_r.dorsi + 73) * 5, (q.ch.knee_r.flex - 2) * 0.05, Math.min(0, q.ch.knee_r.flex) * 5, Math.max(0, q.ch.hip_r.flex - 3) * 5]]);
  let rest = s0.pose; sym(rest, 'hip', rest.ch.hip_r); sym(rest, 'ankle', rest.ch.ankle_r); sym(rest, 'knee', rest.ch.knee_r);
  const LIFT = opt.lift || [-10, -10, -6];
  const keyPose = (f) => { const q = clone(rest); q.ch.spine_l5.flex = r1(rest.ch.spine_l5.flex + LIFT[0] * f); q.ch.spine_t12.flex = r1(rest.ch.spine_t12.flex + LIFT[1] * f); q.ch.spine_t6.flex = r1(rest.ch.spine_t6.flex + LIFT[2] * f); PR.head(q, -10 + 4 * f); return q; };
  // arms solved on the top pose (the chest is off the mat there), fixed in the chest frame; the head channels change a
  // little, so the hands rest just behind the head with a small gap
  const top = keyPose(1), Wt0 = L.fk(top);
  const T6 = (o) => inFrame(Wt0, 'spine_t6', o), Tx = (v) => dirIn(Wt0, 'spine_t6', v);
  let arms;
  if ((opt.arms || 'head') === 'head') {
    // grip point on the back of the head: from the head shape's centre out toward the back (and a little up), where it is
    // GAP cm off the head surface
    const hc = R.shapeWorld(Wt0, L.rig.shapes.find((x) => x.id === 'head')).c, dirB = V.norm(V.add(V.add(Tx([-1, 0, 0]), V.scale(Tx([0, 1, 0]), 0.35)), [0, 0, 0.25]));
    const back = () => { let lo = 0, hi = 25; for (let i = 0; i < 30; i++) { const mm = (lo + hi) / 2; if (EQ.pointShape(Wt0, V.add(hc, V.scale(dirB, mm)), 'head') < (opt.gap ?? 1.8)) lo = mm; else hi = mm; } return V.add(hc, V.scale(dirB, hi)); };
    arms = armsAt(top, { g: back('r'), palm: Tx([1, 0, 0]), elbow: T6([-2, 18, 30]), wElbow: 0.5 }, { g: mz(back('r')), palm: Tx([1, 0, 0]), elbow: mz(T6([-2, 18, 30])), wElbow: 0.5 });
  } else {
    arms = armsAt(top, { g: T6([4, 18, 26]), palm: Tx([1, 0.3, 0]), thumb: Tx([0, 1, 0]), elbow: T6([-6, 2, 32]), wElbow: 0.6 }, { g: mz(T6([4, 18, 26])), palm: Tx([1, 0.3, 0]), thumb: Tx([0, 1, 0]), elbow: mz(T6([-6, 2, 32])), wElbow: 0.6 });
  }
  const armErr = arms.__err;
  const poses = {}; for (const [nm, f] of [['rest', 0], ['up1', 0.35], ['up2', 0.7], ['top', 1], ['topHold', opt.holdF ?? 0.97]]) { const q = keyPose(f); copyArm(q, arms, 'r'); copyArm(q, arms, 'l'); poses[nm] = q; }
  const keyframes = opt.kf.map(([pose, t]) => ({ t, pose }));
  const ex = H.module_(meta, [], poses, keyframes);
  ex.props = [{ id: 'mat', kind: 'mat', center: [10, 0, 0], size: [190, 1, 65] }];
  let anchors = null;
  if (opt.arms === 'band') {
    const Wr = L.fk(poses.rest), x = r1(Wr.head_c1.p[0] + 60);
    anchors = { r: [x, 12, 30], l: [x, 12, -30] };
    ex.props.push(EQ.rack({ x: x + 3, width: 60, hookY: 120, facing: -1 }).prop, ...['r', 'l'].map((sd) => ({ id: `band_${sd}`, kind: 'band', color: '#d9534f', anchor: anchors[sd], attach: { joint: `wrist_${sd}`, grip: 'handle' } })));
  }
  const pr = { floor: 1e9, line: { d: 1e9 }, headHands: 1e9 };
  const rep = H.loopReport(ex, { probe: (W, pz, t) => {
    pr.floor = Math.min(pr.floor, L.shapeMinY(W).y);
    if (anchors) for (const sd of ['r', 'l']) { const lc = EQ.lineClear(W, anchors[sd], EQ.gripPoint(W, sd).p, 0.6); if (lc.d < pr.line.d) pr.line = Object.assign(lc, { t: +t.toFixed(2) }); }
    if (opt.arms !== 'band') pr.headHands = Math.min(pr.headHands, EQ.pointShape(W, EQ.gripPoint(W, 'r').p, 'head'));
  } });
  const Wr = L.fk(poses.rest), Wt = L.fk(poses.top);
  const set = H.setKin(ex);
  set('Chest lift', 'setup', `Chest on the mat`); set('Chest lift', 'peak', `${Math.round(lowest(Wt, ['chest', 'pecs_r', 'ribcage']))} cm off the mat`);
  set('Spine extension', 'setup', '0° added'); set('Spine extension', 'peak', `${dg(-(LIFT[0] + LIFT[1] + LIFT[2]))} (lumbar ${-LIFT[0]}°, thoracic ${-(LIFT[1] + LIFT[2])}°)`);
  set('Legs', 'setup', 'Legs straight on the mat'); set('Legs', 'peak', 'Legs stay down; the pelvis is the pivot');
  setMeasure(ex, 'trunkFlexion');
  console.log(`${meta.exercise.name}: wrote ${L.write(ex)}\n  ${JSON.stringify({ armErr, floor: r1(pr.floor), floorAt: rep.floorAt, line: pr.line.d < 1e8 ? { d: r1(pr.line.d), id: pr.line.id, t: pr.line.t } : null, headHands: r1(pr.headHands), chestTop: r1(lowest(Wt, ['chest', 'pecs_r', 'ribcage'])), measure: ex.checks.measure })}`);
  fail(id, [[armErr < 1, `hands off target ${armErr}`], [pr.floor > -0.5, `below the floor ${r1(pr.floor)} ${JSON.stringify(rep.floorAt)}`], [!anchors || pr.line.d > -0.6, `band into the body ${JSON.stringify(pr.line)}`], [opt.arms === 'band' || pr.headHands > -1, `hands into the head ${r1(pr.headHands)}`]]);
  return ex;
}

/* =====================================================================================================================
   On a flat bench (dumbbell.js bench: 45 cm, 120 cm long), trunk resting on the pad, root fixed:
   - frogReverseHyper: prone, hips at the -X end of the bench, legs hanging off it in a frog position (hips abducted and
     turned out, knees bent, heels together); the thighs lift to about horizontal by hip extension and lower. Hands hold
     the sides of the bench.
   - neckFlexion: supine, head off the -X end (the bench ends at the shoulders), knees bent with the feet on the bench;
     the head lowers a little below the bench line and curls up chin to chest. Hands hold the sides of the bench.
   ===================================================================================================================== */
const BENCH_H = 45, BENCH_W = 30;
const benchBox = (b) => ({ center: [(b.x0 + b.x1) / 2, 0, 0], size: [b.x1 - b.x0, BENCH_H, BENCH_W] });
function onBench(base, { prone }) {
  // root height so the trunk rests on the pad (top at BENCH_H)
  const ids = prone ? ['chest', 'ribcage', 'abdomen', 'pelvis'] : ['chest', 'traps_r', 'ribcage', 'pelvis', 'buttock_r'];
  return L.solvePose(base, ['root.pos.1'], [(W) => [(Math.min(...ids.map((sid) => M4.bottomOf(W, sid))) - BENCH_H - 0.2) * 3]]).pose;
}
function holdBench(p, sx, { prone }) {
  // hands round the side edges of the pad at x = sx: palms in, fingers down
  const g = [sx, BENCH_H - 2.5, BENCH_W / 2 + 1.8];
  const q = armsAt(p, { g, palm: [0, 0, -1], thumb: prone ? [-1, 0, 0] : [1, 0, 0] }, { g: mz(g), palm: [0, 0, 1], thumb: prone ? [-1, 0, 0] : [1, 0, 0] });
  return q;
}
function frogReverseHyper(meta, opt = {}) {
  const id = meta.exercise.id, z0 = () => ({ rot: 0, flex: 0, latFlex: 0 });
  let p = { root: { pos: [0, 60, 0], rot: { pitch: -90 } }, ch: { spine_l5: z0(), spine_t12: z0(), spine_t6: z0(), neck_c7: { rot: 0, flex: -4 }, head_c1: { rot: 0, flex: -6 }, sc_r: { protract: 8, elevate: 4 }, sc_l: { protract: 8, elevate: 4 },
    hip_r: { flex: 62, abd: 30, rot: -39 }, hip_l: { flex: 62, abd: 30, rot: -39 }, knee_r: { flex: 110 }, knee_l: { flex: 110 }, ankle_r: { dorsi: 0 }, ankle_l: { dorsi: 0 } } };
    // frog: hips abducted 30 and turned out 39 degrees (near the rig limit), knees bent 110: the heels meet
  p = onBench(p, { prone: true });
  const W0 = L.fk(p), EDGE = r1(W0.hip_r.p[0] + (opt.edge ?? 9)); // the bench's -X end, a little in front of the hip joints
  const b = { x0: EDGE, x1: EDGE + 120 }, bench = D.bench({ x: EDGE + 100, seat: 40, height: BENCH_H, width: BENCH_W, angle: 0, back: 80 });
  p = holdBench(p, W0.shoulder_r.p[0] + 14, { prone: true }); const armErr = p.__err; delete p.__err; delete p.__cost;
  const ROT = p.ch.hip_r.rot;
  const key = (h) => { const q = clone(p); for (const sd of ['r', 'l']) q.ch[`hip_${sd}`] = { flex: r1(h), abd: 30, rot: ROT }; return q; };
  const FS = [0, 0.25, 0.5, 0.75, 1], H0 = opt.hang ?? 62, H1 = opt.top ?? -6, names = FS.map((f, i) => `k${i}`), poses = {};
  FS.forEach((f, i) => { poses[names[i]] = key(H0 + (H1 - H0) * f); });
  const kf = kfDownUp(meta, names, FS, { down: 'raise', bottom: 'top', up: 'lower' }).map(([pose, t]) => ({ t, pose }));
  const ex = H.module_(meta, [], poses, kf);
  ex.props = [bench.prop];
  const box = benchBox(b), pr = { legs: 1e9, trunk: [1e9, -1e9], floor: 1e9, heel: [1e9, -1e9] };
  const rep = H.loopReport(ex, { probe: (W) => {
    const ob = T3b.bodyOverBox(W, box, /^(hand_[rl]|thumb_[rl]|chest|ribcage|abdomen|pelvis|pecs_[rl]|neck|head|jaw|nose|traps_[rl]|lats_[rl])$/); pr.legs = Math.min(pr.legs, ob.d);
    const tr = Math.min(...['chest', 'ribcage', 'abdomen'].map((sid) => M4.bottomOf(W, sid))) - BENCH_H; pr.trunk = [Math.min(pr.trunk[0], tr), Math.max(pr.trunk[1], tr)];
    pr.floor = Math.min(pr.floor, L.shapeMinY(W).y); const hz = V.len(V.sub(W.ankle_r.p, W.ankle_l.p)); pr.heel = [Math.min(pr.heel[0], hz), Math.max(pr.heel[1], hz)];
  } });
  const set = H.setKin(ex);
  set('Hip extension', 'setup', `${dg(poses.k0.ch.hip_r.flex)} of hip flexion (legs hanging off the bench)`); set('Hip extension', 'peak', `${dg(poses.k4.ch.hip_r.flex)} (thighs about level with the bench)`);
  set('Frog position', 'setup', `Hips abducted 30° and turned out (${-ROT}°), knees ${dg(poses.k0.ch.knee_r.flex)}, ankles ${Math.round(pr.heel[0])} cm apart`); set('Frog position', 'peak', 'Unchanged through the lift');
  set('Trunk on the bench', 'setup', 'Chest and stomach on the pad, hands holding its sides'); set('Trunk on the bench', 'peak', 'Trunk still');
  setMeasure(ex, 'hipFlexion');
  console.log(`${meta.exercise.name}: wrote ${L.write(ex)}\n  ${JSON.stringify({ armErr, edge: EDGE, legsBench: r1(pr.legs), trunk: pr.trunk.map(r1), floor: r1(pr.floor), heels: pr.heel.map(r1), rot: ROT, measure: ex.checks.measure })}`);
  fail(id, [[armErr < 1, 'hands off the bench'], [pr.legs > -1, `legs into the bench ${r1(pr.legs)}`], [pr.trunk[0] > -1 && pr.trunk[0] < 1.5, `trunk not on the pad ${pr.trunk}`], [pr.floor > 1, 'feet near the floor']]);
  return ex;
}
function neckFlexion(meta, opt = {}) {
  const id = meta.exercise.id, z0 = () => ({ rot: 0, flex: 0, latFlex: 0 });
  let p = { root: { pos: [0, 60, 0], rot: { pitch: 90 } }, ch: { spine_l5: z0(), spine_t12: z0(), spine_t6: z0(), neck_c7: { rot: 0, flex: 0 }, head_c1: { rot: 0, flex: 0 }, sc_r: { protract: 0, elevate: 0 }, sc_l: { protract: 0, elevate: 0 },
    hip_r: { flex: 50, abd: 4, rot: 0 }, hip_l: { flex: 50, abd: 4, rot: 0 }, knee_r: { flex: 100 }, knee_l: { flex: 100 }, ankle_r: { dorsi: 0 }, ankle_l: { dorsi: 0 } } };
  p = onBench(p, { prone: false });
  // feet flat on the pad
  p = L.solvePose(p, ['ch.hip_r.flex', 'ch.ankle_r.dorsi'], [(W) => [(M4.bottomOf(W, 'foot_r') - BENCH_H - 0.2) * 3, (W.toe_r.p[1] - W.ankle_r.p[1] + (L.ANKLE_H - 3)) * 1]]).pose;
  p.ch.hip_l = clone(p.ch.hip_r); p.ch.ankle_l = clone(p.ch.ankle_r);
  const W0 = L.fk(p), EDGE = r1(W0.shoulder_r.p[0] - (opt.edge ?? 6)); // the bench ends just above the shoulders (head toward -X)
  const footX = Math.max(W0.toe_r.p[0], W0.ankle_r.p[0]) + 6;
  const b = { x0: EDGE, x1: Math.max(EDGE + 120, footX) }, bench = D.bench({ x: b.x1 - 20, seat: 40, height: BENCH_H, width: BENCH_W, angle: 0, back: b.x1 - b.x0 - 40 });
  p = holdBench(p, W0.hip_r.p[0] - 8, { prone: false }); const armErr = p.__err; delete p.__err; delete p.__cost;
  const NE = opt.ext ?? -24, NF = opt.flex ?? 48;
  const key = (tot) => { const q = clone(p); q.ch.neck_c7 = { rot: 0, flex: r1(tot * 0.6) }; q.ch.head_c1 = { rot: 0, flex: r1(Math.max(-28, tot * 0.4)) }; return q; };
  const FS = [0, 0.25, 0.5, 0.75, 1], names = FS.map((f, i) => `k${i}`), poses = {};
  FS.forEach((f, i) => { poses[names[i]] = key(NE + (NF - NE) * f); });
  const kf = kfDownUp(meta, names, FS, { down: 'raise', bottom: 'top', up: 'lower' }).map(([pose, t]) => ({ t, pose }));
  const ex = H.module_(meta, [], poses, kf);
  ex.props = [bench.prop];
  const box = benchBox(b), pr = { head: 1e9, body: [1e9, -1e9], floor: 1e9 };
  const rep = H.loopReport(ex, { probe: (W) => {
    const ob = T3b.bodyOverBox(W, box, /^(?!head$|jaw$|neck$|hair$)/); pr.head = Math.min(pr.head, ob.d);
    const tr = Math.min(...['traps_r', 'chest', 'pelvis'].map((sid) => M4.bottomOf(W, sid))) - BENCH_H; pr.body = [Math.min(pr.body[0], tr), Math.max(pr.body[1], tr)];
    pr.floor = Math.min(pr.floor, L.shapeMinY(W).y);
  } });
  const set = H.setKin(ex);
  set('Neck flexion', 'setup', `${dg(NE)} (head a little below the bench line)`); set('Neck flexion', 'peak', `${dg(NF)} (chin toward the chest)`);
  set('Head support', 'setup', 'Head off the end of the bench, shoulders on the pad'); set('Head support', 'peak', 'Only the head and neck move');
  setMeasure(ex, 'trunkFlexion');
  console.log(`${meta.exercise.name}: wrote ${L.write(ex)}\n  ${JSON.stringify({ armErr, edge: EDGE, headBench: r1(pr.head), body: pr.body.map(r1), floor: r1(pr.floor) })}`);
  fail(id, [[armErr < 1, 'hands off the bench'], [pr.head > -0.5, `head into the bench ${r1(pr.head)}`], [pr.body[0] > -1 && pr.body[0] < 1.5, `body not on the pad ${pr.body}`]]);
  return ex;
}

module.exports = { ENV, dg, fail, inFrame, dirIn, copyArm, mz, armsAt, hyper45, dips, captain, cagePullup, preacher, peakMeasure, setMeasure, declineSetup, boardChecks, declineSitup, SITUP_KEYS, SITUP_KF, declineArms, kfDownUp, perpTo, aim, declineHeadUp, crossArms, gluteHam, nordic, handsBehindDip, floorExt, frogReverseHyper, neckFlexion };
