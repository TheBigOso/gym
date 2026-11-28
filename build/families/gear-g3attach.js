// Group g3-attach: shared helpers for exercises with the attachment gear (ankle strap, band loop, dumbbell on the body,
// stability ball, medicine ball). Meta generator (compact spec -> build/meta/<id>.json), standing one-leg poses, generic
// keyframe rhythm, the rolling ball and medicine ball props (src/gear/g3attach-balls.js).
const fs = require('fs');
const path = require('path');
const L = require('../lib');
const { R, V, Q, rig, r1, clone } = L;
const H = require('./hips');
const EQ = require('./equip');
const GA = require('./gear-attach');

/* ---------------- meta generator ---------------- */
const SRC = {
  distefano2009: 'Distefano et al. 2009, gluteal muscle activation during common therapeutic exercises (J Orthop Sports Phys Ther 39(7):532-540)|https://pubmed.ncbi.nlm.nih.gov/19574661/',
  boren2011: 'Boren et al. 2011, EMG analysis of gluteus medius and gluteus maximus during rehabilitation exercises (Int J Sports Phys Ther 6(3):206-223; PMC3201064)|https://pmc.ncbi.nlm.nih.gov/articles/PMC3201064/',
  selkowitz2013: 'Selkowitz, Beneck & Powers 2013, which exercises target the gluteal muscles while minimizing activation of the tensor fascia lata? Fine-wire EMG of 11 exercises (J Orthop Sports Phys Ther 43(2):54-64)|https://pubmed.ncbi.nlm.nih.gov/23160432/',
  macadam2015: 'Macadam, Cronin & Contreras 2015, gluteal muscle activity in dynamic hip abduction and hip external rotation exercise: a systematic review (Int J Sports Phys Ther 10(5):573-591; PMC4595911)|https://pmc.ncbi.nlm.nih.gov/articles/PMC4595911/',
  macadam2019: 'Macadam and Feser 2019, gluteus maximus EMG excitation during dynamic body-weight hip extension: a systematic review (Int J Sports Phys Ther 14(1):14-31; PMC6350668)|https://pmc.ncbi.nlm.nih.gov/articles/PMC6350668/',
  contreras2015: 'Contreras et al. 2015, gluteus maximus, biceps femoris and vastus lateralis EMG in the back squat and barbell hip thrust (J Appl Biomech 31(6))|https://pubmed.ncbi.nlm.nih.gov/26214739/',
  lehecka2017: 'Lehecka et al. 2017, building a better gluteal bridge: EMG of hip muscles during modified single-leg bridges (Int J Sports Phys Ther 12(4):543-549; PMC5534144)|https://pmc.ncbi.nlm.nih.gov/articles/PMC5534144/',
  escamilla2016: 'Escamilla, Lewis, Pecson, Imamura and Andrews 2016, muscle activation among supine, prone and side position exercises with and without a Swiss ball (Sports Health 8(4):372-379; PMC4922527)|https://pmc.ncbi.nlm.nih.gov/articles/PMC4922527',
  escamilla2006: 'Escamilla et al. 2006, electromyographic analysis of traditional and nontraditional abdominal exercises (Phys Ther 86(5):656-671)|https://scholars.csus.edu/esploro/outputs/journalArticle/Electromyographic-Analysis-of-Traditional-and-Nontraditional/99257847129401671',
  escamilla1998: 'Escamilla et al. 1998, biomechanics of the knee during closed kinetic chain and open kinetic chain exercises (Med Sci Sports Exerc 30(4):556-569; PubMed 9565938)|https://pubmed.ncbi.nlm.nih.gov/9565938/',
  konrad2001: 'Konrad, Schmitz and Denner 2001, neuromuscular evaluation of trunk-training exercises (J Athl Train 36(2):109-118; PMC155519)|https://pmc.ncbi.nlm.nih.gov/articles/PMC155519',
  oliva2020: 'Oliva-Lozano and Muyor 2020, core muscle activity during physical fitness exercises: a systematic review (Int J Environ Res Public Health 17(12):4306)|https://www.mdpi.com/1660-4601/17/12/4306',
  andersen2010: 'Andersen, Andersen, Mortensen, Poulsen, Bjørnlund and Zebis 2010, muscle activation and perceived loading during rehabilitation exercises: comparison of dumbbells and elastic resistance (Phys Ther 90(4):538-549)|https://pubmed.ncbi.nlm.nih.gov/?term=Andersen+2010+muscle+activation+perceived+loading+dumbbells+elastic+resistance',
  ekstrom2003: 'Ekstrom, Donatelli & Soderberg 2003, surface electromyographic analysis of exercises for the trapezius and serratus anterior muscles (J Orthop Sports Phys Ther 33(5):247-258)|https://pubmed.ncbi.nlm.nih.gov/12774999/',
  ludewig2004: 'Ludewig, Hoff, Osowski, Meschke and Rundquist 2004, relative balance of serratus anterior and upper trapezius muscle activity during push-up exercises (Am J Sports Med 32(2):484-493)|https://pubmed.ncbi.nlm.nih.gov/14977678/',
  neto2020: 'Krause Neto, Soares, Vieira et al. 2020, gluteus maximus activation during common strength and hypertrophy exercises: a systematic review (J Sports Sci Med 19(1):195-203)|https://www.jssm.org/jssm-19-195.xml-abst',
};
const CAM = {
  side: { yaw: 0, pitch: 6, label: 'Side' }, threeQuarter: { yaw: -40, pitch: 16, label: '3/4' }, front: { yaw: 60, pitch: 14, label: 'Front' },
  back: { yaw: -120, pitch: 16, label: 'Back' }, top: { yaw: -15, pitch: 70, label: 'Top' },
};
// both sides of a sided muscle id ('core' is the only midline group)
const both = (...ids) => ids.flatMap((id) => (id === 'core' ? ['core'] : [`${id}_r`, `${id}_l`]));
const DEFAULT_CAUTIONS = ['Stop if sharp pain, numbness or cramping occurs.', 'Muscle glow colours and activation curves are illustrative, not measured EMG.'];
// spec: see the authors; phases [{ id, label, end, breath, cue, w }] (start = previous end, w = work level 0..1 at the
// phase end); act { muscle: [rest, peak] }; kin [[measure, norm, [source ids]]]; mistakes [[mistake, fix]]
function meta(s) {
  const num = (s.url.match(/\/(\d+)-/) || [])[1] || '';
  const title = s.refTitle || s.name;
  let t0 = 0; const phases = s.phases.map((p, i) => { const ph = { id: p.id, label: p.label, start: t0, end: p.end, breath: p.breath || 'natural', cue: `c${i + 1}` }; t0 = p.end; return ph; });
  const duration = s.phases[s.phases.length - 1].end;
  const wStart = s.phases[s.phases.length - 1].w ?? 0;
  const work = [[0, wStart], ...s.phases.map((p) => [p.end, p.w ?? 0])];
  const activation = {};
  for (const [m, [lo, hi]] of Object.entries(s.act)) activation[m] = work.map(([t, w]) => [+t.toFixed(2), +(lo + (hi - lo) * w).toFixed(2)]);
  const srcIds = ['gymvisual', ...new Set([...(s.sources || []), ...s.kin.flatMap((k) => k[2] || [])])];
  const sources = srcIds.map((id) => (id === 'gymvisual' ? { id, title: `GymVisual #${num}, ${title}, video (movement reference)`, url: s.url } : { id, title: SRC[id].split('|')[0], url: SRC[id].split('|')[1] }));
  const ex = {
    id: s.id, name: s.name, aliases: s.aliases || [],
    reference: { source: 'GymVisual', productRef: num, title, url: s.url, listing: 'Catalog entry only (gymvisual.com not read; blocked by the proxy). Movement from the exercise name and standard coaching.', note: '' },
    type: 'Strength', bodyPart: s.bodyPart, secondaryBodyParts: s.secondary || [], equipment: s.equipment, difficulty: s.difficulty || 'Beginner',
    mechanics: s.mechanics || 'Isolation', plane: s.plane || 'Sagittal', laterality: s.side === 'bilateral' ? 'Bilateral' : 'Unilateral', authoredSide: s.side || 'right',
    muscles: s.muscles, breathing: s.breathing,
    prescription: Object.assign({ sets: '2-4', reps: '10-15', tempo: '1-1-2-0', frequency: '2-3 times a week', rest: '45-75 s' }, s.rx || {}),
    cues: s.phases.map((p, i) => ({ id: `c${i + 1}`, phase: p.id, text: p.cue })),
    mistakes: s.mistakes.map(([m, f], i) => ({ id: `m${i + 1}`, mistake: m, fix: f })),
    kinematics: s.kin.map(([measure, norm, src]) => ({ measure, setup: '', peak: '', norm, sources: src || [] })),
    sources,
    safety: { cautions: [...DEFAULT_CAUTIONS, ...((s.safety && s.safety.cautions) || [])], modify: (s.safety && s.safety.modify) || [], regressions: (s.safety && s.safety.regressions) || [], progressions: (s.safety && s.safety.progressions) || [] },
    muscleNotes: s.notes || {},
  };
  const presets = Object.assign(clone(CAM), s.camPresets || {});
  const m = { exercise: ex, camera: { default: s.cam || 'threeQuarter', presets }, props: s.props || [], timeline: { duration, fps: 60, loop: true, interpolation: 'monotoneCubic', phases }, activation, guides: s.guides || [], checks: Object.assign({ floorTolerance: 0.5 }, s.checks || {}) };
  fs.writeFileSync(path.join(__dirname, `../meta/${s.id}.json`), JSON.stringify(m, null, 1));
  return m;
}

/* ---------------- rhythm ---------------- */
const ease = (x) => x * x * (3 - 2 * x);
// Standard rep: rest -> work (4 keys) -> hold -> return (4 keys) -> rest. T: { rest, top, hold, back, end } (s).
function rep(poseAt, T = {}) {
  const t = Object.assign({ rest: 0.8, top: 2.0, hold: 2.5, back: 4.3, end: 5.0, holdF: 1.02 }, T);
  const up = (k) => t.rest + ((t.top - t.rest) * k) / 4, dn = (k) => t.hold + ((t.back - t.hold) * k) / 4;
  const poses = { rest: poseAt(0), u25: poseAt(ease(0.25)), u50: poseAt(0.5), u75: poseAt(ease(0.75)), top: poseAt(1), hold: poseAt(t.holdF), d70: poseAt(ease(0.7)), d40: poseAt(ease(0.4)), d15: poseAt(ease(0.15)), near: poseAt(0.03) };
  const keyframes = [{ t: 0, pose: 'rest' }, { t: t.rest, pose: 'rest' }, { t: up(1), pose: 'u25' }, { t: up(2), pose: 'u50' }, { t: up(3), pose: 'u75' }, { t: t.top, pose: 'top' },
    { t: (t.top + t.hold) / 2, pose: 'hold' }, { t: t.hold, pose: 'top' }, { t: dn(1), pose: 'd70' }, { t: dn(2), pose: 'd40' }, { t: dn(3), pose: 'd15' }, { t: t.back, pose: 'near' }, { t: (t.back + t.end) / 2, pose: 'rest' }, { t: t.end, pose: 'rest' }]
    .map((k) => ({ t: +k.t.toFixed(3), pose: k.pose }));
  for (const p of Object.values(poses)) delete p.__cost;
  return { poses, keyframes };
}

// Dense variant: n keys up and n keys down (eased), for motions whose contacts need tight interpolation
function repDense(poseAt, T = {}, n = 8) {
  const t = Object.assign({ rest: 0.8, top: 2.0, hold: 2.5, back: 4.3, end: 5.0 }, T);
  const poses = { rest: poseAt(0), top: poseAt(1) }, keyframes = [{ t: 0, pose: 'rest' }, { t: t.rest, pose: 'rest' }];
  for (let i = 1; i < n; i++) { const k = `u${i}`; poses[k] = poseAt(ease(i / n)); keyframes.push({ t: +(t.rest + ((t.top - t.rest) * i) / n).toFixed(3), pose: k }); }
  keyframes.push({ t: t.top, pose: 'top' }, { t: t.hold, pose: 'top' });
  for (let i = 1; i < n; i++) { const k = `d${i}`; poses[k] = poseAt(ease(1 - i / n)); keyframes.push({ t: +(t.hold + ((t.back - t.hold) * i) / n).toFixed(3), pose: k }); }
  keyframes.push({ t: t.back, pose: 'rest' }, { t: t.end, pose: 'rest' });
  for (const p of Object.values(poses)) delete p.__cost;
  return { poses, keyframes };
}

/* ---------------- standing on the left leg ---------------- */
// opts: toe (deg), half (stance half-width), shiftZ (pelvis over the stance foot), hinge (deg forward trunk lean from
// the hips, pelvis pitch), kneeL (stance knee flexion), spineFlex (deg added at L5/T12), hands 'hips' | 'wall' | 'free',
// leg(f) -> { hip:{flex,abd,rot}, knee, ankle } for the right leg, lift (min foot clearance; bends the knee if needed)
function standLeg(opts = {}) {
  const o = Object.assign({ toe: 5, half: 9, shiftZ: -3.5, hinge: 0, kneeL: 5, hands: 'hips', lift: 1.5, lean: 0, x: 0 }, opts);
  const contacts = [H.legC('l', { rot: H.footQ(0, o.toe) })];
  if (o.hands === 'wall') contacts.push(H.wallHand('r'), H.wallHand('l'));
  const st = L.POSES.standing({ stance: o.half, toeOut: o.toe }).pose;
  const FOOT_L = [o.x, L.ANKLE_H, -o.half];
  let HAND = null;
  function poseAt(f, { arms = true } = {}) {
    const p = clone(st), hinge = typeof o.hinge === 'function' ? o.hinge(f) : o.hinge, kneeL = typeof o.kneeL === 'function' ? o.kneeL(f) : o.kneeL;
    p.root.pos = [o.x, 90, o.shiftZ]; p.root.rot = { pitch: r1(-hinge), roll: r1(-(typeof o.lean === 'function' ? o.lean(f) : o.lean)) };
    const sf = typeof o.spineFlex === 'function' ? o.spineFlex(f) : (o.spineFlex || 0);
    Object.assign(p.ch, { spine_l5: { rot: 0, flex: r1(sf * 0.5), latFlex: 0 }, spine_t12: { rot: 0, flex: r1(sf * 0.5), latFlex: 0 }, spine_t6: { rot: 0, flex: 0, latFlex: 0 } });
    const look = Math.min(30, hinge * 0.45 + sf * 0.5); p.ch.neck_c7 = { rot: 0, flex: r1(-look * 0.45) }; p.ch.head_c1 = { rot: 0, flex: r1(-look * 0.55) };
    const lg = o.leg(f);
    p.ch.hip_r = { flex: r1(lg.hip.flex), abd: r1(lg.hip.abd || 0), rot: r1(lg.hip.rot || 0) }; p.ch.knee_r = { flex: r1(lg.knee) }; p.ch.ankle_r = { dorsi: r1(lg.ankle ?? -4) };
    p.ik = { leg_l: { target: FOOT_L.slice(), weight: 1 } };
    let a = 50, b = 100;
    for (let i = 0; i < 50; i++) { const y = (a + b) / 2; p.root.pos[1] = y; if (H.kneeOf(L.fk(p, contacts), 'l') > kneeL) a = y; else b = y; }
    p.root.pos[1] = r1((a + b) / 2);
    // free foot clear of the floor: bend the knee a little more where needed
    if (o.lift != null && H.bottomOf(L.fk(p, contacts), 'foot_r') < o.lift) {
      let k0 = p.ch.knee_r.flex, k1 = k0 + 60;
      for (let i = 0; i < 40; i++) { p.ch.knee_r.flex = (k0 + k1) / 2; if (H.bottomOf(L.fk(p, contacts), 'foot_r') < o.lift) k0 = p.ch.knee_r.flex; else k1 = p.ch.knee_r.flex; }
      p.ch.knee_r.flex = r1(k1 + 0.2);
    }
    if (arms && o.hands === 'hips') { const ph = H.handsOnHips(p); Object.assign(p.ch, ph.ch); }
    let q = H.fitLeg(p, 'l', contacts[0], FOOT_L, { rot: -o.toe });
    if (arms && o.hands === 'wall') {
      q.ch.sc_r = { protract: 6, elevate: 2 }; q.ch.sc_l = { protract: 6, elevate: 2 };
      for (const s of ['r', 'l']) { q = H.fitArm(q, s, contacts.find((c) => c.id === `arm_${s}`), HAND[s], H.WALL_ARM_GUESS(s)); delete q.__cost; q.ik[`arm_${s}`] = { target: HAND[s].slice(), weight: 1 }; }
    }
    if (arms && o.hands === 'free' && o.arms) Object.assign(q.ch, clone(o.arms));
    return q;
  }
  if (o.hands === 'wall') { const W = L.fk(poseAt(0, { arms: false }), contacts.slice(0, 1)); HAND = H.wallHandTargets(W.shoulder_r.p, { flex: 40, drop: o.wallDrop ?? 6 }); }
  const planted = contacts.map((c) => c.id);
  return { poseAt, contacts, planted, FOOT_L, wallX: (pose) => H.wallFaceX(pose, contacts) };
}
// frontal / sagittal angle of the right leg (hip -> ankle) from vertical: abduction (+ out), flexion (+ forward)
const legAbd = (W) => Math.atan2(W.ankle_r.p[2] - W.hip_r.p[2], W.hip_r.p[1] - W.ankle_r.p[1]) / R.DEG;
const legFwd = (W) => Math.atan2(W.ankle_r.p[0] - W.hip_r.p[0], W.hip_r.p[1] - W.ankle_r.p[1]) / R.DEG;
const thighFwd = (W, s = 'r') => Math.atan2(W[`knee_${s}`].p[0] - W[`hip_${s}`].p[0], W[`hip_${s}`].p[1] - W[`knee_${s}`].p[1]) / R.DEG;
const trunkLean = (W) => V.angle(V.sub(W.neck_c7.p, W.pelvis.p), [0, 1, 0]);

/* ---------------- band loop and strap probes ---------------- */
function bandProbe(band) { const o = { gap: [1e9, -1e9], clear: 1e9 }; o.probe = (W) => { const b = GA.bandLoopAt(W, band); o.gap = [Math.min(o.gap[0], b.gap), Math.max(o.gap[1], b.gap)]; o.clear = Math.min(o.clear, b.clear); }; return o; }
function strapProbe(strap) { const o = { line: { d: 1e9 }, cable: [1e9, -1e9] }; o.probe = (W) => { const c = GA.strapLineClear(W, strap); if (c.d < o.line.d) o.line = c; const k = GA.strapCable(W, strap); o.cable = [Math.min(o.cable[0], k), Math.max(o.cable[1], k)]; }; return o; }
const fmt = (a) => a.map((v) => Math.round(v)).join('-');

/* ---------------- moving stability ball (src/gear/g3attach-balls.js) ---------------- */
// A ball whose centre is the midpoint of joints j1, j2 plus a rig-space offset (two-joint body mount)
function rollingBall(W, j1, j2, centre, { d = 65, id = 'ball', squash = 0.03 } = {}) {
  const mid = V.scale(V.add(W[j1].p, W[j2].p), 0.5);
  return { id, kind: 'stability_ball', size: [d, d, d], attach: { joint: j1, with: j2, offset: V.sub(centre, mid).map(r1) }, params: { squash } };
}
function rollingBallAt(W, prop) { const a = prop.attach, c = V.add(V.scale(V.add(W[a.joint].p, W[a.with].p), 0.5), a.offset); const r = prop.size[0] / 2; return { c, r, rx: r, ry: r }; }
// medicine ball between the hands
const medBall = ({ d = 24, id = 'medball', color = null } = {}) => Object.assign({ id, kind: 'plate', size: [d, d, d], attach: { joint: 'wrist_r', with: 'wrist_l', grip: 'handle' }, params: { shape: 'ball' } }, color ? { color } : {});
// ball centre and surface gap to the body for a two-hand medicine ball (centre = grip midpoint)
function medBallAt(W, prop) { const g = EQ.barAt(W, 'handle'); return { c: g.c || V.scale(V.add(EQ.gripPoint(W, 'r').p, EQ.gripPoint(W, 'l').p), 0.5), width: g.width, r: prop.size[0] / 2 }; }
function medBallClear(W, prop, skip = /^(hand|thumb|forearm)_/) {
  const b = medBallAt(W, prop), ball = { c: b.c, r: b.r, rx: b.r, ry: b.r };
  return GA.ballClear(W, ball, { skip });
}


/* ---------------- seated on the end of a flat bench ---------------- */
// Trunk tall (pitch deg, - = forward), hips about 90, buttocks on the seat top (rig shapes = body), shins vertical with the
// feet flat at +-half. Hands on the bench top beside the hips (planted hand contacts, palms down, fingers forward).
// Returns { pose, bench (D.bench result), FOOT, HAND, contacts { arms, legs } }.
const D = require('./dumbbell');
const seatYOf = (W) => Math.min(...['buttock_r', 'buttock_l', 'pelvis'].map((id) => H.bottomOf(W, id)));
function seatedBase({ seatH = 45, half = 12, toe = 4, pitch = -3, hipAbd = 4, benchLen = 120, handBack = 20, handZ = 12.5 } = {}) {
  const st = L.POSES.standing({ stance: half, toeOut: toe }).pose; let p = clone(st); delete p.ik;
  Object.assign(p.ch, { spine_l5: { rot: 0, flex: 2, latFlex: 0 }, spine_t12: { rot: 0, flex: 2, latFlex: 0 }, spine_t6: { rot: 0, flex: 2, latFlex: 0 },
    hip_r: { flex: 90, abd: hipAbd, rot: -toe }, hip_l: { flex: 90, abd: hipAbd, rot: -toe }, knee_r: { flex: 90 }, knee_l: { flex: 90 }, neck_c7: { rot: 0, flex: 2 }, head_c1: { rot: 0, flex: 2 } });
  p.root.pos = [0, 55, 0]; p.root.rot = { pitch };
  p = L.solvePose(p, ['root.pos.1'], [(W) => [(seatYOf(W) - seatH) * 3]]).pose;
  const W0 = L.fk(p);
  // bench: the seat's front edge under the mid-thigh, the rest behind
  const frontX = r1(W0.hip_r.p[0] + 22), bench = D.bench({ x: r1(frontX - benchLen / 2), seat: benchLen, height: seatH, width: 30, id: 'bench' });
  const legs = ['r', 'l'].map((s) => H.legC(s, { rot: H.footQ(0, s === 'r' ? -toe : toe), pole: [1, 0.2, s === 'r' ? 0.25 : -0.25] }));
  let FX = r1(W0.knee_r.p[0]);
  { let a = W0.hip_r.p[0] + 15, b = W0.hip_r.p[0] + 75; for (let i = 0; i < 40; i++) { const x = (a + b) / 2, q = clone(p); q.ik = { leg_r: { target: [x, L.ANKLE_H, half], weight: 1 } }; const W = L.fk(q, legs); if (W.knee_r.p[0] > x) a = x; else b = x; } FX = r1((a + b) / 2); }
  const FOOT = { r: [FX, L.ANKLE_H, half], l: [FX, L.ANKLE_H, -half] };
  const arms = ['r', 'l'].map((s) => H.handC(s, [-1, 0.1, s === 'r' ? 0.5 : -0.5]));
  // hands on the bench top just behind the buttocks, palms down, fingers forward
  const HAND = { r: [r1(W0.hip_r.p[0] - handBack), seatH + 2.7, handZ], l: [r1(W0.hip_r.p[0] - handBack), seatH + 2.7, -handZ] };
  return { pose: p, bench, FOOT, HAND, contacts: { arms, legs } };
}
// fit both hands onto HAND (planted) for a seated pose
const ARM_SEAT_GUESS = (s) => [{ [`shoulder_${s}`]: { plane: -30, elev: 30, axial: 0 }, [`elbow_${s}`]: { flex: 10 }, [`wrist_${s}`]: { pron: 0, flex: -70, dev: 0 } }, { [`shoulder_${s}`]: { plane: -50, elev: 35, axial: 40 }, [`elbow_${s}`]: { flex: 15 }, [`wrist_${s}`]: { pron: 80, flex: -70, dev: 0 } }];
function handsOn(p, arms, HAND, sc = { protract: 2, elevate: 2 }) {
  let q = p; q.ch.sc_r = clone(sc); q.ch.sc_l = clone(sc);
  for (const c of arms) { const s = c.id.slice(-1); q = H.fitArm(q, s, c, HAND[s], ARM_SEAT_GUESS(s)); delete q.__cost; q.ik = q.ik || {}; q.ik[c.id] = { target: HAND[s].slice(), weight: 1 }; }
  return q;
}

// hands resting on top of the thighs (no contact): wrist above the thigh at `at` from hip to knee, palms down, fingers
// toward the knee; solved per pose for the right arm and mirrored (symmetric legs)
function handsOnThighs(p, { at = 0.6, up = 9.5, side = 0 } = {}) {
  const W = L.fk(p), pt = V.add(V.lerp(W.hip_r.p, W.knee_r.p, at), [0, up, side]);
  const q = L.armToTarget(p, pt, { wrist: { pron: 0, flex: 10, dev: 0 }, axial: 0, axialW: 0.01, guess: [60, 40, 0] });
  for (const j of ['shoulder', 'elbow', 'wrist']) q.ch[`${j}_l`] = clone(q.ch[`${j}_r`]);
  q.ch.sc_r = { protract: 6, elevate: 0 }; q.ch.sc_l = { protract: 6, elevate: 0 };
  return q;
}

/* ---------------- lying prone (face down, head toward +X) on the mat or a bench ---------------- */
// y0: surface height (0 = mat; bench top). Root height, pitch and hip extension are solved so the chest, abdomen, pelvis
// and thighs rest on the surface (thighOnly: shapes that must rest; legs beyond a bench end may hang). Arms: 'overhead'
// (resting on the mat beyond the head, palms down) or 'bench' (hanging down, hands on the bench legs below the front end).
const PRONE_BODY = ['chest', 'ribcage', 'abdomen', 'pelvis'];
const z0 = () => ({ rot: 0, flex: 0, latFlex: 0 });
function proneLie({ y0 = 0, x = 0, knee = 2, ankle = -60, neck = -10, rest = ['thigh_r', 'quad_r'] } = {}) {
  const p = { root: { pos: [x, y0 + 12, 0], rot: { pitch: -90 } }, ch: { spine_l5: z0(), spine_t12: z0(), spine_t6: z0(), neck_c7: { rot: 0, flex: r1(neck * 0.45) }, head_c1: { rot: 0, flex: r1(neck * 0.55) } } };
  for (const s of ['r', 'l']) { p.ch[`hip_${s}`] = { flex: 0, abd: 3, rot: 0 }; p.ch[`knee_${s}`] = { flex: knee }; p.ch[`ankle_${s}`] = { dorsi: ankle }; p.ch[`sc_${s}`] = { protract: 0, elevate: 6 }; p.ch[`elbow_${s}`] = { flex: 6 }; p.ch[`shoulder_${s}`] = { plane: 80, elev: 165, axial: 0 }; p.ch[`wrist_${s}`] = { pron: 90, flex: 0, dev: 0 }; }
  const low = (W, ids) => Math.min(...ids.map((id) => H.bottomOf(W, id) - y0));
  const feet = y0 === 0;
  const sol = L.solvePose(p, ['root.pos.1', 'root.rot.pitch', 'ch.hip_r.flex', 'ch.hip_l.flex'].concat(feet ? ['ch.ankle_r.dorsi', 'ch.knee_r.flex'] : []), [
    (W) => [low(W, PRONE_BODY) * 3, low(W, rest) * 2, Math.min(0, low(W, rest)) * 6, Math.min(0, low(W, PRONE_BODY)) * 6],
    (W) => (feet ? [Math.min(0, H.bottomOf(W, 'foot_r') - 0.1) * 8, H.bottomOf(W, 'foot_r') * 0.5] : []),
    (W, q) => [Math.max(0, q.ch.hip_r.flex - 3) * 5, (q.ch.hip_l.flex - q.ch.hip_r.flex) * 3, feet ? Math.min(0, q.ch.ankle_r.dorsi + 73) * 5 : 0, feet ? Math.min(0, q.ch.knee_r.flex) * 5 + (q.ch.knee_r.flex - knee) * 0.05 : 0],
  ]).pose;
  sol.ch.hip_l = clone(sol.ch.hip_r); sol.ch.ankle_l = clone(sol.ch.ankle_r); sol.ch.knee_l = clone(sol.ch.knee_r);
  return sol;
}
// arms overhead, resting on the mat (palms down)
function armsOverhead(p, { handsY = 0 } = {}) {
  const s = L.solvePose(p, ['ch.shoulder_r.elev', 'ch.wrist_r.pron'], [(W) => [(H.bottomOf(W, 'hand_r') - handsY) * 3], (W) => [(Q.rot(W.wrist_r.q, [1, 0, 0])[1] + 1) * 6]]).pose;
  s.ch.shoulder_r = { plane: 80, elev: s.ch.shoulder_r.elev, axial: 0 }; s.ch.wrist_r = { pron: s.ch.wrist_r.pron, flex: 0, dev: 0 };
  s.ch.shoulder_l = clone(s.ch.shoulder_r); s.ch.wrist_l = clone(s.ch.wrist_r);
  return s;
}
// arms hanging from the bench's front end, hands on the bench legs (wrist target relative to the shoulder)
function armsDown(p, { fwd = 8, drop = 38, out = 6 } = {}) {
  const W = L.fk(p), S = W.shoulder_r.p, t = [S[0] + fwd, S[1] - drop, S[2] + out];
  const q = L.armToTarget(p, t, { wrist: { pron: 0, flex: 0, dev: 0 }, axial: 0, axialW: 0.01, guess: [90, 90, 0] });
  for (const j of ['shoulder', 'elbow', 'wrist']) q.ch[`${j}_l`] = clone(q.ch[`${j}_r`]);
  return q;
}

// clearance of a body-mounted dumbbell drawn by src/player.js dumbbellMesh: handle (r 1.6) and the two plate cylinders
// (as capsules of the plate radius) separately; { handle, plates } in cm (< 0 = into the body)
function dbParts(W, prop, { skip = /^(hand|thumb)_/ } = {}) {
  const d = GA.bodyDumbbellAt(W, prop), len = (prop.size && prop.size[0]) || 32, hl = Math.min(14, len * 0.45), pl = (len - hl) / 2, at = (x) => V.add(d.c, V.scale(d.ax, x));
  const handle = EQ.segmentClear(W, at(-hl / 2), at(hl / 2), 1.6, { skip, n: 8 });
  const pa = EQ.segmentClear(W, at(hl / 2 + 1), at(hl / 2 + pl - 1), d.r, { skip, n: 6 }), pb = EQ.segmentClear(W, at(-hl / 2 - 1), at(-hl / 2 - pl + 1), d.r, { skip, n: 6 });
  return { handle, plates: pa.d < pb.d ? pa : pb, c: d.c, ax: d.ax, ends: [at(hl / 2 + pl / 2), at(-hl / 2 - pl / 2)] };
}

/* ---------------- supine pelvis roll about the upper back (bridge family) ---------------- */
// Lying on the back (H.lieBase, legs straight-ish); trunk(dP) rolls the pelvis up by dP degrees while the upper back stays on
// the mat (shoulders keep their x) and the head rests (as in author-glute-bridge.js). Hands on the floor by the hips.
function supineRoll() {
  const UB = (W) => Math.min(H.bottomOf(W, 'chest'), H.bottomOf(W, 'traps_r'), H.bottomOf(W, 'traps_l'));
  const lie0 = (() => { const p = H.lieBase(); for (const s of ['r', 'l']) { p.ch[`hip_${s}`] = { flex: 0, abd: 3, rot: 0 }; p.ch[`knee_${s}`] = { flex: 8 }; p.ch[`ankle_${s}`] = { dorsi: 0 }; } return p; })();
  const W00 = L.fk(lie0), SX = W00.shoulder_r.p[0], P0 = lie0.root.rot.pitch, L5 = lie0.ch.spine_l5.flex;
  function trunk(dP) {
    const p = clone(lie0); p.root.rot.pitch = r1(P0 + dP); p.ch.spine_l5.flex = r1(L5 * (1 - Math.min(1, dP / 30)));
    return L.solvePose(p, ['root.pos.0', 'root.pos.1', 'ch.neck_c7.flex', 'ch.head_c1.flex'], [
      (W) => [(UB(W) - 0.2) * 2, Math.min(0, H.bottomOf(W, 'neck') - 0.5) * 6, Math.min(0, UB(W)) * 6, Math.min(0, H.bottomOf(W, 'buttock_r') - 0.1) * 4, Math.min(0, H.bottomOf(W, 'hair') - 0.3) * 6, (W.shoulder_r.p[0] - SX) * 2],
      (W, q) => [(q.ch.head_c1.flex - q.ch.neck_c7.flex * 0.5) * 0.3, (q.ch.neck_c7.flex - (-22 + dP * 0.6)) * 0.1, Math.max(0, q.ch.neck_c7.flex - 39) * 3, Math.max(0, q.ch.head_c1.flex - 29) * 3, Math.max(0, -27 - q.ch.neck_c7.flex) * 3, Math.max(0, -27 - q.ch.head_c1.flex) * 3]], { iters: 400 }).pose;
  }
  const HAND = { r: [r1(W00.hip_r.p[0] + 4), 2.7, 24], l: [r1(W00.hip_r.p[0] + 4), 2.7, -24] };
  const contacts = [H.handC('r', [0, 0.5, 1]), H.handC('l', [0, 0.5, -1])];
  const GUESS = (s) => [{ [`shoulder_${s}`]: { plane: 30, elev: 15, axial: 0 }, [`elbow_${s}`]: { flex: 10 }, [`wrist_${s}`]: { pron: 80, flex: 0, dev: 0 } }, { [`shoulder_${s}`]: { plane: -20, elev: 20, axial: 60 }, [`elbow_${s}`]: { flex: 10 }, [`wrist_${s}`]: { pron: 0, flex: 0, dev: 0 } }];
  function arms(p) {
    p.ch.sc_r = { protract: 0, elevate: 0 }; p.ch.sc_l = { protract: 0, elevate: 0 };
    for (const s of ['r', 'l']) { p = H.fitArm(p, s, contacts.find((c) => c.id === `arm_${s}`), HAND[s], GUESS(s)); delete p.__cost; }
    p.ik = Object.assign(p.ik || {}, { arm_r: { target: HAND.r.slice(), weight: 1 }, arm_l: { target: HAND.l.slice(), weight: 1 } });
    return p;
  }
  return { lie0, W00, trunk, arms, HAND, contacts };
}

/* ---------------- two hands on a medicine ball ---------------- */
// Right arm solved so its grip point sits at C + side * w/2 (side: unit vector toward the right hand, default +Z) with the
// grip axis across that line (palms on the ball's sides); the left arm mirrors it (pose symmetric about z = 0). Returns
// the pose with both arms set. Keep sc and trunk symmetric so the left hand lands at C - side * w/2.
function armsOnBall(p, C, w, { side = [0, 0, 1], guess = { plane: 80, elev: 90, axial: 0, elbow: 15, pron: 0, flex: 0, dev: 0 }, extra = null, cont = 0 } = {}) {
  const t = V.add(C, V.scale(V.norm(side), w / 2));
  const q0 = clone(p); q0.ch.shoulder_r = { plane: guess.plane, elev: guess.elev, axial: guess.axial }; q0.ch.elbow_r = { flex: guess.elbow }; q0.ch.wrist_r = { pron: guess.pron, flex: guess.flex, dev: guess.dev };
  const paths = ['ch.shoulder_r.plane', 'ch.shoulder_r.elev', 'ch.shoulder_r.axial', 'ch.elbow_r.flex', 'ch.wrist_r.pron', 'ch.wrist_r.flex', 'ch.wrist_r.dev'];
  const lim = (W, q) => paths.map((pth) => { const [, j, c] = pth.split('.'), l = rig.byId[j].limits && rig.byId[j].limits[c], v = L.getPath(q, pth) ?? 0; return l ? (Math.max(0, l[0] + 1 - v) + Math.max(0, v - l[1] + 1)) * 20 : 0; });
  const sol = L.solvePose(q0, paths, [(W) => V.sub(EQ.gripPoint(W, 'r').p, t).map((v) => v * 4), (W) => [V.dot(EQ.gripPoint(W, 'r').ax, V.norm(side)) * 6], (W, q) => [q.ch.wrist_r.flex * 0.03, q.ch.wrist_r.dev * 0.03, q.ch.shoulder_r.axial * 0.005], lim, (W, q) => (cont ? [(q.ch.shoulder_r.plane - guess.plane) * cont, (q.ch.shoulder_r.elev - guess.elev) * cont, (q.ch.shoulder_r.axial - guess.axial) * cont, (q.ch.elbow_r.flex - guess.elbow) * cont, (q.ch.wrist_r.pron - guess.pron) * cont] : []), ...(extra ? [extra] : [])], { iters: 500 });
  const out = sol.pose; for (const j of ['shoulder', 'elbow', 'wrist', 'sc']) if (out.ch[`${j}_r`]) out.ch[`${j}_l`] = clone(out.ch[`${j}_r`]);
  out.__err = V.len(V.sub(EQ.gripPoint(L.fk(out), 'r').p, t));
  return out;
}
const toLocal = (W, j, p) => Q.rot(Q.conj(W[j].q), V.sub(p, W[j].p));
const toWorld = (W, j, v) => V.add(W[j].p, Q.rot(W[j].q, v));

module.exports = { repDense, armsOnBall, toLocal, toWorld, supineRoll, dbParts, proneLie, armsOverhead, armsDown, PRONE_BODY, handsOnThighs, seatedBase, seatYOf, handsOn, ARM_SEAT_GUESS, SRC, CAM, both, meta, ease, rep, standLeg, legAbd, legFwd, thighFwd, trunkLean, bandProbe, strapProbe, fmt, rollingBall, rollingBallAt, medBall, medBallAt, medBallClear };
