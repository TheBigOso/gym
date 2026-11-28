// Batch 6, family b6-11: resistance-band curls, kickbacks, raises, rotations and the kneeling rear kick.
// Builds on build/families/b5-bandpull.js (band props, strand scan and gate), b3-curls.js (standing curl poses and curl
// rows), b3-shoulders.js (standing base, arm keys) and eq-cable.js (joint limits) without changing them.
//  - Bands under the feet: one band per hand looped under the ball of its own foot (B.feetBands).
//  - Bands round a rack upright: B.rackAnchor (two strands from one upright) or B.rackPair (one band per upright).
const L = require('../lib');
const { V, r1 } = L;
const C = require('./b3-curls');
const B = require('./b5-bandpull');
const CB = require('./eq-cable');

// strands from the balls of the feet; the feet (the band runs under them) and the hands / forearms are skipped
const FEET_SKIP = /^(hand|thumb|forearm|foot)_/;
const feetScan = (ex, opt = {}) => B.scan(ex, Object.assign({ strands: B.feetStrands, skip: FEET_SKIP }, opt));

// Fill the 'Band' kinematics row
function bandRow(ex, setup, peak) {
  const k = ex.exercise.kinematics.find((x) => x.measure === 'Band'); if (!k) throw new Error('no Band row');
  k.setup = setup; k.peak = peak;
}

// Standing band curl (hammer, reverse): feet hip width on the band, one band per hand under the ball of its foot.
// BOT / TOP are arm states for C.standing ({ plane, elev, twist, flex, pron }); the curl keys are mixes between them.
function standingCurl(meta, { BOT, TOP, label, tempo, minLine = 0.3 }) {
  const SQZ = Object.assign({}, TOP, { flex: TOP.flex + 2, elev: TOP.elev + 1 });
  const at = (f) => C.mixArm(BOT, TOP, f), both = (a) => ({ r: a, l: a });
  const { contacts, poses } = C.standing({ bottom: both(BOT), up25: both(at(0.25)), up50: both(at(0.5)), up75: both(at(0.75)), top: both(TOP), squeeze: both(SQZ), down66: both(at(0.66)), down33: both(at(0.33)) });
  const ph = (id) => C.phase(meta, id);
  const keyframes = [{ t: 0, pose: 'bottom' }, { t: ph('lift').start, pose: 'bottom' }, { t: 0.95, pose: 'up25' }, { t: 1.2, pose: 'up50' }, { t: 1.48, pose: 'up75' }, { t: ph('top').start, pose: 'top' }, { t: ph('top').end, pose: 'squeeze' },
    { t: 2.9, pose: 'down66' }, { t: 3.7, pose: 'down33' }, { t: ph('lower').end, pose: 'bottom' }, { t: meta.timeline.duration, pose: 'bottom' }];
  const ex = C.assemble(meta, { contacts, poses, keyframes, props: B.feetBands() });
  const rep = feetScan(ex);
  B.gate(meta.exercise.id, rep, { minLine });
  CB.limits(poses);
  const Wb = L.fk(poses.bottom, contacts), Wt = L.fk(poses.squeeze, contacts);
  C.fillCurlKin(ex, Wb, Wt, poses.bottom, poses.squeeze, 'r', tempo);
  bandRow(ex, `One band per hand, under the ball of each foot; strand ${rep.strand[0]} cm with the arms straight`, `Strand ${rep.strand[1]} cm at the top of the curl (most stretch, most tension)`);
  console.log(`${label}: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}`);
  return { ex, rep, poses, contacts };
}

module.exports = { FEET_SKIP, feetScan, bandRow, standingCurl };

// Standing feet-band raise (straight arms, soft elbows): the arm rises in a fixed plane of elevation (ISB plane: 0 =
// straight out to the side, 90 = straight forward) from elev e0 to e1. palm: 'down' (palms down at shoulder height) or
// 'thumbUp' (thumbs up, palms forward / in). Bilateral (right arm solved, left mirrored). Keys bottom, r25..r75, top.
const F3 = require('./b3-shoulders');
const H = require('./hips');
const D2R = Math.PI / 180;
const armDir = (e, p) => [Math.sin(e * D2R) * Math.sin(p * D2R), -Math.cos(e * D2R), Math.sin(e * D2R) * Math.cos(p * D2R)];
const palmDown = (e, p) => [-Math.cos(e * D2R) * Math.sin(p * D2R), -Math.sin(e * D2R), -Math.cos(e * D2R) * Math.cos(p * D2R)];
const palmThumbUp = (e, p) => V.norm(V.cross(armDir(e, p), palmDown(e, p)));
function raiseKeys(base, { plane, e0, e1, palm = 'down', flex = [12, 14], axial = -20, pron = 90, sc = (f) => ({ protract: r1(2 + 3 * f), elevate: r1(6 * f * f) }), planeAt = null }) {
  const FS = { bottom: 0, r25: 0.25, r50: 0.5, r75: 0.75, top: 1 };
  const keys = Object.entries(FS).map(([name, f]) => {
    const elev = e0 + (e1 - e0) * f, pl = planeAt ? planeAt(f) : plane;
    return { name, plane: pl, elev, axial, flex: flex[0] + (flex[1] - flex[0]) * f, pron, palm: palm === 'down' ? palmDown(elev, pl) : palmThumbUp(elev, pl), sc: sc(f) };
  });
  return F3.armKeys(base.pose, keys, base.contacts);
}
// keyframes for a raise: bottom pause, up through r25..r75 to top, hold, down, pause (phase ids: raise, top, lower, reset)
function raiseFrames(meta) {
  const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p])), D = meta.timeline.duration, r = ph.raise, l = ph.lower;
  const up = (k) => +(r.start + (r.end - r.start) * k).toFixed(2), dn = (k) => +(l.start + (l.end - l.start) * k).toFixed(2);
  return [{ t: 0, pose: 'bottom' }, { t: r.start, pose: 'bottom' }, { t: up(0.25), pose: 'r25' }, { t: up(0.5), pose: 'r50' }, { t: up(0.75), pose: 'r75' }, { t: r.end, pose: 'top' },
    { t: l.start, pose: 'top' }, { t: dn(0.25), pose: 'r75' }, { t: dn(0.5), pose: 'r50' }, { t: dn(0.75), pose: 'r25' }, { t: l.end, pose: 'bottom' }, { t: D, pose: 'bottom' }];
}
const humElev = (W) => V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), V.sub(W.pelvis.p, W.neck_c7.p));
const planeDeg = (W) => { const u = V.sub(W.elbow_r.p, W.shoulder_r.p); return Math.atan2(u[0], u[2]) / (Math.PI / 180); };
const elbowAng = (W) => 180 - V.angle(V.sub(W.shoulder_r.p, W.elbow_r.p), V.sub(W.wrist_r.p, W.elbow_r.p));
function standingRaise(meta, opt) {
  const base = F3.standing({ stance: opt.stance ?? 12, knee: 6 });
  const { poses, err } = raiseKeys(base, opt);
  const ex = H.module_(meta, base.contacts, poses, raiseFrames(meta));
  ex.props = B.feetBands();
  const rep = feetScan(ex);
  B.gate(meta.exercise.id, rep, { minLine: opt.minLine ?? 0.3 });
  CB.limits(poses);
  const Wb = L.fk(poses.bottom, base.contacts), Wt = L.fk(poses.top, base.contacts);
  bandRow(ex, `One band per hand, under the ball of each foot; strand ${rep.strand[0]} cm at the bottom`, `Strand ${rep.strand[1]} cm at the top (most stretch, most tension)`);
  return { ex, rep, poses, err, base, Wb, Wt };
}
module.exports = Object.assign(module.exports, { armDir, palmDown, palmThumbUp, raiseKeys, raiseFrames, standingRaise, humElev, planeDeg, elbowAng });

