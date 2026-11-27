// Cable Seated Crunch (GymVisual, Cable Seated Crunch; movement reference only): sitting tall on the end of a flat bench
// facing a high pulley, feet flat a little wider than the hips (planted leg contacts), thighs on the seat. A rope (cable
// attachment 'rope', two hands) is held beside the head, hands at the temples. The pelvis stays on the seat; the spine
// curls forward and down (lumbar and thoracic flexion, the head following) so the ribs move toward the pelvis and the
// elbows toward the knees, then uncurls under control. The hands stay fixed to the head (grip width constant).
// Bilateral (right arm solved, left mirrored). 1.2 s down, 0.4 s squeeze, 1.9 s up, 0.5 s pause. Some versions sit
// with the back to the stack and the rope over the shoulders; facing the pulley keeps the rope's knot and the cable
// clear of the head in this rig, and matches the kneeling crunch.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const EQ = require('./families/equip');
const C = require('./families/eq-cable');
const B = require('./families/b5-cablearms');
const meta = require('./meta/cable-seated-crunch.json');

const AT = [10, 8, 14];                                    // grip point in the head frame: beside the temple
const SPLIT = { spine_l5: 0.35, spine_t12: 0.38, spine_t6: 0.27 };
const S3 = require('./families/b4-shoulders3');
const k = S3.seatedFlat({ seatH: 45, stance: 18 });
const contacts = k.contacts;
// f = 0 (top) .. 1 (bottom): spine flexion (sum of the three segments), neck + head flexion; the pelvis stays put
const SP0 = 2, N0 = 4, N1 = 20;
let SP1 = 70;
let guess = null;
function key(f) {
  const p = clone(k.pose);
  const sp = SP0 + (SP1 - SP0) * f, nk = N0 + (N1 - N0) * f;
  for (const j in SPLIT) p.ch[j] = { rot: 0, flex: r1(sp * SPLIT[j]), latFlex: 0 };
  p.ch.neck_c7 = { rot: 0, flex: r1(nk * 0.5) }; p.ch.head_c1 = { rot: 0, flex: r1(nk * 0.5) };
  p.ch.sc_r = { protract: r1(4 + 4 * f), elevate: 2 }; p.ch.sc_l = clone(p.ch.sc_r);
  const r = B.headHands(p, contacts, { at: AT, guess });
  guess = C.guessOf(r.pose);
  r.pose.__e = r.err;
  return r.pose;
}
// bottom: the deepest curl at which the elbows still clear the thighs (they come down onto the front of the thighs)
const THIGHS = ['thigh_r', 'thigh_l', 'quad_r', 'quad_l'];
const elbowGap = (p) => { const W = L.fk(p, contacts); let b = 1e9; for (const s of ['r', 'l']) for (const id of THIGHS) b = Math.min(b, EQ.pointShape(W, W[`elbow_${s}`].p, id) - 4); return b; };
{ let lo = 20, hi = 70; for (let i = 0; i < 10; i++) { SP1 = (lo + hi) / 2; guess = null; key(0); const g = elbowGap(key(1)); if (g > 0.8) lo = SP1; else hi = SP1; } SP1 = r1(lo); guess = null; }
const FS = { top: 0, d1: 0.15, d2: 0.38, d3: 0.62, d4: 0.85, bottom: 1 };
const poses = {}, err = {};
for (const [n, f] of Object.entries(FS)) { poses[n] = key(f); err[n] = poses[n].__e; delete poses[n].__e; }
poses.squeeze = clone(poses.bottom);
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p])), D = meta.timeline.duration;
const dn = ['d1', 'd2', 'd3', 'd4'], ft = [0.15, 0.38, 0.62, 0.85];
const tc = (f) => r1(100 * (ph.crunch.start + (ph.crunch.end - ph.crunch.start) * f)) / 100, tr = (f) => r1(100 * (ph.return.start + (ph.return.end - ph.return.start) * f)) / 100;
const keyframes = [{ t: 0, pose: 'top' }, { t: ph.crunch.start, pose: 'top' }, ...dn.map((n, i) => ({ t: tc(ft[i]), pose: n })), { t: ph.squeeze.start, pose: 'bottom' }, { t: ph.squeeze.end, pose: 'squeeze' },
  ...dn.slice().reverse().map((n, i) => ({ t: tr(ft[i]), pose: n })), { t: ph.reset.start, pose: 'top' }, { t: D, pose: 'top' }];

const ex = H.module_(meta, contacts, poses, keyframes);
const ANCHOR_X = r1(L.fk(poses.top, contacts).head_c1.p[0] + 100);
const ANCHOR = [ANCHOR_X, 200, 0];
ex.props = [k.bench.prop, EQ.cableTower(ANCHOR), { id: 'rope', kind: 'cable', attachment: 'rope', anchor: ANCHOR, attach: { joint: 'wrist_r', with: 'wrist_l' } }];

// loop checks: knees and feet planted, floor, channel jumps, grip width, the cable line and rope strands clear of the
// body, the hands clear of the head, the elbows clear of the thighs
const rep = C.scan(ex, { line: (W) => [EQ.attachPoint(W, { two: true, rope: true, anchor: ANCHOR }), ANCHOR] });
let rc = { line: 1e9, strand: 1e9, sid: null, st: 0 }, hc = { d: 1e9 }, ec = { d: 1e9 };
const HEADS = ['head', 'hair', 'jaw', 'ear_r', 'ear_l', 'brow_r', 'brow_l'];
H.loopReport(ex, { probe: (W, pz, t) => {
  const c = B.ropeClear(W, ANCHOR); if (c.line.d < rc.line) rc.line = +c.line.d.toFixed(2); if (c.strand.d < rc.strand) Object.assign(rc, { strand: +c.strand.d.toFixed(2), sid: c.strand.id, st: +t.toFixed(2) });
  const h = B.handleClear(W, { ids: HEADS, r: 3.5 }); if (h.d < hc.d) hc = { d: +h.d.toFixed(2), id: h.id, t: +t.toFixed(2) };
  for (const s of ['r', 'l']) for (const id of THIGHS) { const d = EQ.pointShape(W, W[`elbow_${s}`].p, id) - 4; if (d < ec.d) ec = { d: +d.toFixed(2), id, t: +t.toFixed(2) }; }
} });
C.gate('cable-seated-crunch', rep, { minLine: 1 });
C.limits(poses);
const bad = [];
if (rc.line < 1) bad.push(`cable line ${rc.line} cm`);
if (rc.strand < -1.5) bad.push(`rope strand into the head ${JSON.stringify(rc)}`);
if (hc.d < 0) bad.push(`hand into the head ${JSON.stringify(hc)}`);
if (ec.d < 0) bad.push(`elbow into the thigh ${JSON.stringify(ec)}`);
if (bad.length) { console.error(`FAIL cable-seated-crunch: ${bad.join('; ')}`); process.exitCode = 1; }

const Wt = L.fk(poses.top, contacts), Wb = L.fk(poses.bottom, contacts), set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
const trunk = (W) => V.angle(V.sub(W.neck_c7.p, W.pelvis.p), [0, 1, 0]), spine = (p) => p.ch.spine_l5.flex + p.ch.spine_t12.flex + p.ch.spine_t6.flex;
set('Trunk', 'setup', `${d(trunk(Wt))} forward of vertical (pelvis to C7)`); set('Trunk', 'peak', `${d(trunk(Wb))} forward of vertical`);
set('Spine flexion', 'setup', `${d(spine(poses.top))} (sum of the lumbar and thoracic segments)`); set('Spine flexion', 'peak', `${d(spine(poses.bottom))} (lumbar ${d(poses.bottom.ch.spine_l5.flex)}, thoracic ${d(poses.bottom.ch.spine_t12.flex + poses.bottom.ch.spine_t6.flex)})`);
set('Seat', 'setup', `Sitting tall on a ${k.bench.top} cm flat bench, hip flexion ${d(poses.top.ch.hip_r.flex)}, feet flat`); set('Seat', 'peak', 'Pelvis and legs unchanged (the spine does the work)');
set('Hands', 'setup', `Beside the temples, ${Math.round(EQ.barAt(Wt).width)} cm apart`); set('Hands', 'peak', `Unchanged on the head (${rep.gripWidth.join('-')} cm); rope knot above the forehead`);
set('Tempo', 'setup', 'Pause 0.5 s at the top'); set('Tempo', 'peak', '1.2 s down, 0.4 s squeeze, 1.9 s up');
console.log(`Cable Seated Crunch: wrote ${L.write(ex)}\n  spine flexion at the bottom ${SP1}\n  bench ${JSON.stringify(k.bench.prop)}\n  keys ${JSON.stringify(err)}\n  top arm ${JSON.stringify(poses.top.ch.shoulder_r)} ${JSON.stringify(poses.top.ch.elbow_r)} bottom ${JSON.stringify(poses.bottom.ch.shoulder_r)} ${JSON.stringify(poses.bottom.ch.elbow_r)}\n  ${JSON.stringify(rep)}\n  rope ${JSON.stringify(rc)} hands ${JSON.stringify(hc)} elbows ${JSON.stringify(ec)}`);
