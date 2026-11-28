// Dumbbell Lateral Lunge with Cross Body Row (GymVisual "Dumbbell Lateral Lunge with Cross Body Row", movement reference
// only; the page could not be read, so the movement is taken from the name): one dumbbell in the left hand. Stand tall, feet
// hip width; take a wide step out to the right and sit the hips back over the right foot (right knee about 85 degrees, left
// leg straight, both heels down, trunk hinged forward with a flat back) while the left hand reaches the dumbbell down and
// across toward the inside of the right knee; hold the lunge and row the dumbbell diagonally across the body up to the left
// side of the waist (elbow driving back and up, shoulder blade squeezing), lower it back across, then push back to the
// middle and step the feet together. The right arm hangs relaxed. Authored stepping right with the dumbbell in the left hand
// (the player mirrors). Built on the barbell lateral lunge (lunge family side step); the rowing arm is the b4-power handArm,
// solved for the left arm through the mirrored pose (build/families/b6-03.js viaMirror).
const L = require('./lib');
const { V, Q, r1, clone } = L;
const { makeFamily } = require('./families/lunge');
const P = require('./families/b4-power');
const B = require('./families/b3-legs');
const K = require('./families/b4-squats2');
const G = require('./families/b6-03');
const meta = require('./meta/dumbbell-lateral-lunge-with-cross-body-row.json');

const F = makeFamily({ toe: 12, half: 9 });
const OUT = 70;
const flat = (x, z, extra = {}) => Object.assign({ c: 'flat', x, z }, extra);
const together = { r: flat(0, 9), l: flat(0, -9) }, wide = { r: flat(0, OUT), l: flat(0, -9) };
const stand = F.stand(together, { knee: 4 });
const onLeft = (rf, z, knee, pitch = -3) => F.rootY({ root: [0, 85, z], pitch, spine: { l5: 0, t12: 0, t6: 0 }, feet: { l: flat(0, -9), r: rf } }, knee, 'l');
const wideTop = F.rootY({ root: [-2, 85, r1((OUT - 9) / 2)], pitch: -4, spine: { l5: 0, t12: 0, t6: 0 }, feet: wide }, 11, 'r');
const BOTTOM_X = -30, PITCH_B = +(process.env.PB ?? -40);
const depth = (f) => {
  const x = r1(wideTop.root[0] + (BOTTOM_X - wideTop.root[0]) * f), pitch = r1(-4 + (PITCH_B + 4) * f), spine = { l5: r1(-2 * f), t12: 0, t6: r1(2 * f) };
  const at = (z) => F.rootY({ root: [x, 84, z], pitch, spine, feet: wide }, 10, 'l');
  let lo = wideTop.root[2], hi = OUT, best = null;
  for (let i = 0; i < 40; i++) { const z = (lo + hi) / 2, sp = at(z); best = sp; if (F.kneeOf(F.fk(F.build(sp)), 'r') < 8 + 77 * f) lo = z; else hi = z; }
  best.root[2] = r1(best.root[2]); return best;
};
const bottom = depth(1);
const ROWF = [0.15, 0.3, 0.45, 0.6, 0.75, 0.88, 1];
// bodies (arms filled in below): [name, spec, reach blend a (0 hang .. 1 reach), row fraction r (0 reach .. 1 top)]
const BODIES = [
  ['stand', stand, 0, 0], ['lift', onLeft(flat(0, 22, { lift: 6, w: 0 }), -1.5, 8), 0, 0], ['swingOut', onLeft(flat(0, 50, { lift: 6, w: 0 }), 4, 10), 0, 0],
  ['preLand', Object.assign(clone(wideTop), { root: [wideTop.root[0], wideTop.root[1], r1(wideTop.root[2] * 0.6)], feet: { l: flat(0, -9), r: flat(0, OUT, { lift: 0.8, w: 0 }) } }), 0, 0],
  ['wide', wideTop, 0, 0], ['d15', depth(0.15), 0.1, 0], ['d33', depth(0.33), 0.3, 0], ['d66', depth(0.66), 0.65, 0], ['bottom', bottom, 1, 0],
  ...ROWF.map((r, i) => [`row${i + 1}`, bottom, 1, r]),
  ['r50', depth(0.5), 0.5, 0], ['r20', depth(0.2), 0.15, 0],
  ['unload', Object.assign(clone(wideTop), { root: [wideTop.root[0], wideTop.root[1], r1(wideTop.root[2] * 0.5)], feet: { l: flat(0, -9), r: flat(0, OUT - 3, { lift: 2, w: 0 }) } }), 0, 0],
  ['swingIn', onLeft(flat(0, 34, { lift: 6, w: 0 }), 1, 10), 0, 0], ['preLand2', onLeft(flat(0, 9, { lift: 0.8, w: 0 }), -1, 6), 0, 0],
];
// right (free) arm hanging relaxed; the left arm is solved as the right arm of the mirrored pose (lunge to the left there)
const relax = (p) => { const q = B.armsHang(p, { out: 5, fwd: 2, elbow: 10 }); delete q.__armCost; return q; };
const tf = (W) => { const u = V.norm(V.sub(W.neck_c7.p, W.pelvis.p)), f = V.norm(Q.rot(W.spine_t12.q, [1, 0, 0])); return { u, f, s: V.norm(V.cross(f, u)) }; };
const RE = JSON.parse(process.env.RE || '[0.2, 22]'), TOPE = JSON.parse(process.env.TE || '[-8, -10, 12]'), WD = JSON.parse(process.env.WD || '[0.5, 1, -0.2]'), BOW = +(process.env.BOW ?? 18), BOWA = +(process.env.BOWA ?? 6);
const HANG = JSON.parse(process.env.HANG || '[0.42, -1, -0.22]'), THUMB_HANG = V.norm(JSON.parse(process.env.TH || '[0.15, 0, -1]'));
function armKey(a, r) {
  // mirrored frame: lunging leg is the left (z < 0), the dumbbell in the right hand
  const tgt = (W) => {
    const S = W.shoulder_r.p, T = tf(W);
    const hangDir = V.norm(HANG);   // in front of the thighs (mirrored frame: -z is toward the midline)
    // reach: toward a point between the knees (RE[0] of the way from the lunging knee to the other), RE[1] cm below them
    const K0 = V.lerp(W.knee_l.p, W.knee_r.p, RE[0]), reachDir = V.norm(V.sub(V.sub(K0, [0, RE[1], 0]), S));
    const dirA = V.norm(V.lerp(hangDir, reachDir, a));
    const bowA = V.scale(T.f, BOWA * Math.sin(Math.PI * a));   // the hand passes in front of the left thigh on its way down and across
    const w0 = V.add(V.add(S, V.scale(dirA, L.reach(8))), bowA), e0 = V.add(V.add(S, V.scale(dirA, L.UA)), V.scale(bowA, 0.5));
    // row top: elbow behind and above the trunk side, forearm hanging under it
    const eT = V.add(S, V.scale(V.norm(V.add(V.add(V.scale(T.u, TOPE[0]), V.scale(T.f, TOPE[1])), V.scale(T.s, TOPE[2]))), L.UA));
    const wT = V.add(eT, V.scale(V.norm(V.add(V.scale([0, -1, 0], WD[0]), V.add(V.scale(T.f, WD[1]), V.scale(T.s, WD[2])))), L.FA));
    // the path bows forward (in front of the straight leg's thigh, which runs under the trunk while the hips sit right)
    const bow = V.scale(T.f, BOW * Math.sin(Math.PI * r));
    return { w: V.add(V.lerp(w0, wT, r), bow), e: V.add(V.lerp(e0, eT, r), V.scale(bow, 0.5)) };
  };
  // grip: across the front of the thighs (thumb toward the midline) while hanging, turning to neutral (thumb forward) for
  // the reach and the row
  const thumb = V.norm(V.lerp(V.lerp(THUMB_HANG, [1, 0, -0.2], a), [1, 0, 0], r));
  return { w: (W) => tgt(W).w, elbow: (W) => tgt(W).e, thumb, elbowW: 1.2, axialW: +(process.env.AXW ?? 0.05) };
}
const state = {}, poses = {}, errs = {};
for (const [name, spec, a, r] of BODIES) {
  let p = F.pose(spec);
  p = relax(p);
  p = G.viaMirror(p, (m) => { m.ch.sc_r = { protract: r1(4 - 18 * r), elevate: -2 }; const q = P.handArm(m, armKey(a, r), state); errs[name] = state.err; return q; });
  delete p.__cost;
  poses[name] = p;
}
poses.rowTop = poses.row7; delete poses.row7;
poses.rowHold = clone(poses.rowTop);
poses.settle = clone(poses.bottom); poses.settle.root.pos[1] = r1(poses.settle.root.pos[1] - 0.3);
const lr = P.jumps;
const keyframes = [{ t: 0, pose: 'stand' }, { t: 0.8, pose: 'stand' }, { t: 0.95, pose: 'lift' }, { t: 1.12, pose: 'swingOut' }, { t: 1.28, pose: 'preLand' }, { t: 1.4, pose: 'wide' },
  { t: 1.62, pose: 'd15' }, { t: 1.85, pose: 'd33' }, { t: 2.2, pose: 'd66' }, { t: 2.6, pose: 'bottom' }, { t: 2.8, pose: 'bottom' },
  ...ROWF.map((r, i) => ({ t: +(2.8 + 0.8 * r).toFixed(3), pose: i === ROWF.length - 1 ? 'rowTop' : `row${i + 1}` })), { t: 3.9, pose: 'rowHold' },
  ...ROWF.slice(0, -1).reverse().map((r, i, a) => ({ t: +(3.9 + 1.2 * (1 - r)).toFixed(3), pose: `row${a.length - i}` })), { t: 5.1, pose: 'bottom' },
  { t: 5.5, pose: 'r50' }, { t: 5.75, pose: 'r20' }, { t: 5.95, pose: 'wide' }, { t: 6.1, pose: 'unload' }, { t: 6.28, pose: 'swingIn' }, { t: 6.45, pose: 'preLand2' }, { t: 6.6, pose: 'stand' }, { t: 7.4, pose: 'stand' }];
delete poses.settle;
const ex = { schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props: [B.heldProp('l')], contacts: F.contacts,
  timeline: meta.timeline, poses, keyframes, activation: meta.activation, guides: meta.guides, checks: meta.checks };
ex.exercise.reference.note = G.NOTE;
const rep = K.scan(ex, { holds: [{ side: 'l' }], planted: ['leg_r', 'leg_l'] });
const fr = F.report(ex), Wb = F.fk(poses.bottom), Wt = F.fk(poses.rowTop), Ws = F.fk(poses.stand);
const jump = P.jumps(ex), lim = G.limits(ex), set = G.setKin(ex);
const elbowF = (W) => 180 - V.angle(V.sub(W.shoulder_l.p, W.elbow_l.p), V.sub(W.wrist_l.p, W.elbow_l.p));
set('Step width', 'setup', '18 cm (hip width)'); set('Step width', 'peak', `${OUT + 9} cm between ankle centres (about one leg length)`);
set('Stepping knee', 'setup', `≈${Math.round(F.kneeOf(Ws, 'r'))}°`); set('Stepping knee', 'peak', `≈${Math.round(F.kneeOf(Wb, 'r'))}°; left knee ≈${Math.round(F.kneeOf(Wb, 'l'))}° (straight)`);
set('Trunk inclination', 'setup', `≈${Math.round(F.trunkLean(Ws))}°`); set('Trunk inclination', 'peak', `≈${Math.round(F.trunkLean(Wb))}° forward, flat back, held still through the row`);
set('Row', 'setup', `Reach: left hand ${r1(Wb.wrist_l.p[2] - Wb.pelvis.p[2])} cm right of the pelvis midline, ${r1(Wb.wrist_l.p[1])} cm above the floor, elbow ≈${Math.round(elbowF(Wb))}°`); set('Row', 'peak', `Top: hand ${r1(Wt.wrist_l.p[2] - Wt.pelvis.p[2])} cm (left of the midline) beside the waist, elbow ≈${Math.round(elbowF(Wt))}° and ${r1(Wt.elbow_l.p[1] - Wt.shoulder_l.p[1])} cm relative to the shoulder joint height`);
set('Tempo', 'setup', 'Stand 0.8 s'); set('Tempo', 'peak', 'Step out 0.6 s, 1.2 s down, row 0.8 s up, 0.3 s squeeze, 1.2 s down, 0.85 s up, step in 0.65 s');
console.log(`Dumbbell Lateral Lunge with Cross Body Row: wrote ${L.write(ex)}\n  ${JSON.stringify(fr)}\n  clear ${JSON.stringify(rep.clear)} dbFloor ${rep.dbFloor} jump ${JSON.stringify(jump)} limits ${JSON.stringify(lim)}\n  arm err ${JSON.stringify(Object.fromEntries(Object.entries(errs).map(([k, v]) => [k, v.wrist])))}`);
if (fr.slide > 0.05) { console.error('FAIL: planted foot slides'); process.exitCode = 1; }
K.gate('dumbbell-lateral-lunge-with-cross-body-row', rep, { maxJump: 8 });
if (Object.keys(lim).length) { console.error('FAIL: joint limits'); process.exitCode = 1; }
G.gateMeasure('dumbbell-lateral-lunge-with-cross-body-row', ex, fr.kneeR[1]);
