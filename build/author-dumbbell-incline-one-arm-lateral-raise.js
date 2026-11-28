// Dumbbell Incline One Arm Lateral Raise (GymVisual #1368; page not read, movement from the name): side-lying on an
// incline bench. Authored on the right: the adjustable bench is turned across the athlete (rotY -90, back pad at 45
// degrees rising toward the athlete's left). The athlete sits side-saddle on the seat (left buttock on it), leans the left
// side of the trunk on the pad, left arm hooked over the top of the pad, knees bent with both feet on the floor in front
// (planted). The right arm, long with a soft fixed elbow and the thumb forward, starts angled down across the front of
// the body and rises out and up in the frontal plane (a little forward) to about vertical; pause; slow lowering. The
// incline makes the start of the raise the hardest part. Pelvis and legs still.
const L = require('./lib');
const { R, V, Q, rig, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const K = require('./families/b4-shoulders3');
const T = require('./families/b3-triceps');
const DBF = require('./families/dumbbell');
const G = require('./families/b6-06');
const meta = require('./meta/dumbbell-incline-one-arm-lateral-raise.json');
const ID = meta.exercise.id;

const SZ = [meta.props[0].size[0], meta.props[0].size[1]];
const ANG = 45, SEAT_H = 45, LEAN = +(process.env.LEAN || 50), FLEX = 12, PLANE = +(process.env.PLANE || 20), TOP = +(process.env.TOP || 178), CLR = +(process.env.CLR || 2);
const a = ANG * R.DEG;
// Bench along Z: seat centre at (BX, BZ), pad hinge on its -Z edge, rising toward -Z
const BX = 0, BZ = +(process.env.BZ || 14);
const PADL = +(process.env.PADL || 40);
const bench0 = DBF.bench({ x: BX, z: BZ, seat: 40, height: SEAT_H, width: 30, angle: ANG, back: PADL, side: -1 });
const benchProp = Object.assign(clone(bench0.prop), { rotY: -90 });
const hinge = [BX, SEAT_H, BZ - 20], padDir = [0, Math.sin(a), -Math.cos(a)], padN = [0, Math.cos(a), Math.sin(a)];
const padTop = V.add(hinge, V.scale(padDir, PADL));
// how far a shape pokes into the pad slab (5 cm thick, PADL long, 30 wide): > 0 means inside
const inPad = (W, id) => { let m = -1e9; const g = R.shapeWorld(W, T.shapeOf(id)); const pts = g.kind === 'capsule' ? [0, 0.25, 0.5, 0.75, 1].map((t) => [V.add(g.a, V.scale(V.sub(g.b, g.a), t)), g.r[0] + (g.r[1] - g.r[0]) * t]) : [[g.c, Math.min(...g.axes.map(V.len))]]; for (const [c, r] of pts) { const al = V.dot(V.sub(c, hinge), padDir), dn = padDist(c), x = Math.abs(c[0] - BX); if (al > -r && al < PADL + r && x < 15 + r) m = Math.max(m, Math.min(r - dn, dn + 5 + r)); } return m; };
const seatBox = { center: [BX, 0, BZ], size: [30, SEAT_H, 40] };
const padDist = (p) => V.dot(V.sub(p, hinge), padN);
// signed distance of a shape's surface from the pad plane (extreme point toward -n)
const shapePad = (W, id) => padDist(T.extremePt(W, T.shapeOf(id), V.scale(padN, -1)));
const SIDE = ['ribcage', 'chest', 'pecs_l', 'abdomen'];
const sidePad = (W) => Math.min(...SIDE.map((id) => shapePad(W, id)));
const seatLow = (W) => Math.min(H.bottomOf(W, 'buttock_l'), H.bottomOf(W, 'pelvis')) - SEAT_H;

const z0 = () => ({ rot: 0, flex: 0, latFlex: 0 });
const st = L.POSES.standing({ stance: 10, toeOut: 6 }).pose;
let p = clone(st); delete p.ik;
p.root = { pos: [BX + 2, 70, BZ], rot: { roll: -LEAN } };
p.ch.spine_l5 = { rot: 0, flex: 2, latFlex: 4 }; p.ch.spine_t12 = { rot: 0, flex: 2, latFlex: 3 }; p.ch.spine_t6 = z0();
p.ch.neck_c7 = { rot: 0, flex: 2 }; p.ch.head_c1 = { rot: 0, flex: 2 };
p.ch.hip_r = { flex: 85, abd: 0, rot: 0 }; p.ch.hip_l = { flex: 85, abd: 0, rot: 0 }; p.ch.knee_r = { flex: 90 }; p.ch.knee_l = { flex: 90 };
p.ch.sc_r = { protract: 4, elevate: 0 }; p.ch.sc_l = { protract: +(process.env.PROL || 20), elevate: 8 };
p.ch.shoulder_l = { plane: 40, elev: 150, axial: 0 }; p.ch.elbow_l = { flex: 40 }; p.ch.wrist_l = { pron: 0, flex: 0, dev: 0 };
// root height / side position so the left side of the trunk rests on the pad and the left buttock on the seat
for (let it = 0; it < 3; it++) p = L.solvePose(p, ['root.pos.1', 'root.pos.2', 'root.rot.roll'], [(W) => [sidePad(W) * 4, seatLow(W) * 4], L.obj.reg('root.rot.roll', -LEAN, 0.3)], { iters: 300 }).pose;
p.root.pos = p.root.pos.map(r1); p.root.rot.roll = r1(p.root.rot.roll);
if (process.env.DBG) { const Wd = L.fk(p); console.log('root', JSON.stringify(p.root), 'sidePad', sidePad(Wd), SIDE.map((id) => [id, r1(shapePad(Wd, id))]), 'seat', seatLow(Wd), ['buttock_l', 'pelvis', 'thigh_l'].map((id) => r1(H.bottomOf(Wd, id)))); }
// feet flat on the floor in front of the seat, a little apart
const W1 = L.fk(p);
const contacts = [H.legC('r', { pole: [1, 0.2, 0.3], rot: L.footRot(-8) }), H.legC('l', { pole: [1, 0.2, -0.1], rot: L.footRot(8) })];
const FT = { r: [r1(W1.hip_r.p[0] + +(process.env.FRX || 32)), L.ANKLE_H, r1(W1.hip_r.p[2] + +(process.env.FRZ || 26))], l: [r1(W1.hip_l.p[0] + +(process.env.FLX || 30)), L.ANKLE_H, r1(W1.hip_l.p[2] + +(process.env.FLZ || 22))] };
p.ik = { leg_r: { target: FT.r, weight: 1 }, leg_l: { target: FT.l, weight: 1 } };
p = H.fitLeg(p, 'r', contacts[0], FT.r); p = H.fitLeg(p, 'l', contacts[1], FT.l);
for (const j of ['hip_r', 'hip_l', 'knee_r', 'knee_l', 'ankle_r', 'ankle_l']) for (const c in p.ch[j]) p.ch[j][c] = r1(G.wrapA(p.ch[j][c]));
// left arm hooked over the top edge of the (short) pad: upper arm over the edge, forearm hanging behind the pad (FK fit)
{ const S = L.fk(p).shoulder_l.p;
  const E = V.add(S, V.scale(V.norm(V.add(V.add(V.scale(padDir, +(process.env.UPA || 0.6)), V.scale(padN, -(+(process.env.UPN || 0.8)))), [0.15, 0, 0])), L.UA - 0.05));
  const Wt = V.add(E, V.scale(V.norm([0.15, -1, 0.1]), L.FA - 0.3));
  const paths = ['ch.shoulder_l.plane', 'ch.shoulder_l.elev', 'ch.shoulder_l.axial', 'ch.elbow_l.flex', 'ch.wrist_l.pron'];
  p.ch.shoulder_l = { plane: 40, elev: 120, axial: 0 }; p.ch.elbow_l = { flex: 60 }; p.ch.wrist_l = { pron: 0, flex: 0, dev: 0 };
  p = L.solvePose(p, paths, [L.obj.at('elbow_l', E, 2), L.obj.at('wrist_l', Wt, 2), (W) => [(Q.rot(W.wrist_l.q, [1, 0, 0])[2] - 1) * 1], L.obj.reg('ch.shoulder_l.axial', 0, 0.005), G.limitPen(paths.slice(0, 2), 10)], { iters: 300 }).pose; }
const base = p;
if (process.env.DBG2) { const Wd = L.fk(p); console.log('inPad', ['upperarm_l', 'forearm_l', 'hand_l', 'biceps_l', 'deltoid_l', 'thumb_l'].map((id) => [id, r1(inPad(Wd, id))]), 'E', Wd.elbow_l.p.map(r1), 'W', Wd.wrist_l.p.map(r1), 'S', Wd.shoulder_l.p.map(r1), 'top', padTop.map(r1)); }
if (process.env.DBG) { const Wd = L.fk(p, contacts); console.log('along', ['shoulder_l', 'neck_c7', 'head_c1', 'pelvis', 'wrist_l'].map((j) => [j, r1(V.dot(V.sub(Wd[j].p, hinge), padDir)), r1(padDist(Wd[j].p))])); }
// right arm: direction in the frontal (Y-Z) plane tipped PLANE degrees forward; th measured from straight down
const D2R = Math.PI / 180;
const armDir = (th) => { const v = [0, -Math.cos(th * D2R), Math.sin(th * D2R)]; const c = Math.cos(PLANE * D2R) , s = Math.sin(PLANE * D2R); return V.norm([s * Math.max(0, Math.sin(th * D2R)) + 0.25, v[1], v[2] * c]); };
let g = { plane: 30, elev: 30, axial: 0, flex: FLEX, pron: 90 };
function key(th, sc) {
  const q0 = clone(base); q0.ch.sc_r = sc;
  const S = L.fk(q0).shoulder_r.p, dir = armDir(th), wrist = V.add(S, V.scale(dir, L.reach(FLEX)));
  const thumb = V.norm(V.sub([1, 0, 0], V.scale(dir, dir[0])));
  const elbow = F.elbowFor(S, wrist, V.cross(dir, thumb));
  const q = F.solveArm(q0, { wrist, elbow, wElbow: 1, thumb, wThumb: 5, guess: g });
  g = F.armGuess(q);
  return q;
}
const held = [{ side: 'r', grip: 'handle', size: SZ }];
const clrAt = (th) => { g = { plane: 30, elev: 30, axial: 0, flex: FLEX, pron: 90 }; const W = L.fk(key(th, { protract: 4, elevate: 0 }), contacts); return Math.min(K.heldClear(W, held).d, DBF.dumbbellBoxClearance(W, 'r', seatBox, 'handle', { length: SZ[0], diameter: SZ[1] })); };
let lo = 0, hi = 90; for (let i = 0; i < 22; i++) { const m = (lo + hi) / 2; if (clrAt(m) < CLR) lo = m; else hi = m; }
const TH0 = r1(hi);
g = { plane: 30, elev: 30, axial: 0, flex: FLEX, pron: 90 };
const FS = [0, 0.2, 0.4, 0.6, 0.8, 1];
const poses = {}, err = {};
FS.forEach((f, i) => { const q = key(G.lerp(TH0, TOP, f), { protract: r1(4 + 2 * f), elevate: r1(14 * f * f) }); err[`k${i}`] = q.__err; poses[`k${i}`] = G.strip(q); });
const up = G.easeTimes(FS.slice(1), 0.6, 2.1), dn = G.easeTimes(FS.slice(1), 2.6, 4.6);
const keyframes = [{ t: 0, pose: 'k0' }, { t: 0.6, pose: 'k0' }, ...up.map((t, i) => ({ t, pose: `k${i + 1}` })), { t: 2.6, pose: 'k5' }, ...dn.map((t, i) => ({ t, pose: `k${4 - i}` })), { t: 5.2, pose: 'k0' }];
const ex = H.module_(meta, contacts, poses, keyframes);
ex.props = [benchProp, ...ex.props];
const rep = K.scanHeld(ex, held, { planted: ['leg_r', 'leg_l'], probe: (W, pz, t, out) => { out.seatDb = Math.min(out.seatDb ?? 1e9, DBF.dumbbellBoxClearance(W, 'r', seatBox, 'handle', { length: SZ[0], diameter: SZ[1] })); out.padDb = Math.min(out.padDb ?? 1e9, ...K.platePoints(W, 'r', 'handle', null, SZ).filter((q) => V.dot(V.sub(q, hinge), padDir) > 0 && V.dot(V.sub(q, hinge), padDir) < 80 && Math.abs(q[0] - BX) < 15).map((q) => padDist(q))); } });
const Wa = L.fk(poses.k0, contacts), Wb = L.fk(poses.k5, contacts);
const fromDown = (W) => V.angle(V.sub(W.wrist_r.p, W.shoulder_r.p), [0, -1, 0]);
const info = { sidePad: r1(sidePad(Wa)), seat: r1(seatLow(Wa)), lean: r1(V.angle(V.sub(Wa.neck_c7.p, Wa.pelvis.p), [0, 1, 0])), shIncl: r1(R.measures(Wa).shoulderLineIncl), handPad: r1(padDist(Wa.wrist_l.p)), deltPad: r1(inPad(Wa, 'deltoid_l')), ribIn: r1(Math.max(...SIDE.map((id) => inPad(Wa, id)))), armIn: r1(Math.max(...['upperarm_l', 'forearm_l', 'hand_l', 'biceps_l'].map((id) => inPad(Wa, id)))) };
const set = H.setKin(ex), dg = G.deg;
set('Shoulder abduction', 'setup', `Arm ${dg(fromDown(Wa))} up from hanging, across the front of the body (${dg(K.humElev(Wa))} from the trunk)`); set('Shoulder abduction', 'peak', `Arm ${dg(180 - fromDown(Wb))} from vertical (${dg(K.humElev(Wb))} from the trunk)`);
set('Bench angle', 'setup', `Pad ${ANG}°, seat ${SEAT_H} cm; trunk leaning ${dg(info.lean)} onto it`); set('Bench angle', 'peak', 'Unchanged');
set('Elbow flexion', 'setup', dg(K.elbowAng(Wa))); set('Elbow flexion', 'peak', dg(K.elbowAng(Wb)));
set('Trunk', 'setup', 'Left side on the pad, left arm hooked over its top edge, feet on the floor'); set('Trunk', 'peak', 'Unchanged');
set('Tempo', 'setup', 'Pause 0.6 s'); set('Tempo', 'peak', '1.5 s up, 0.5 s at the top, 2.0 s down');
console.log(`${meta.exercise.name}: wrote ${L.write(ex)}\n  ${JSON.stringify({ TH0, info, root: base.root, legs: [base.ch.hip_r, base.ch.knee_r, base.ch.hip_l], armL: [base.ch.shoulder_l, base.ch.elbow_l], err, ...rep })}`);
G.fail(ID, [rep.slide > 0.05 && 'slide', rep.floor < -0.5 && 'below floor', rep.clear.d < 0 && `dumbbell clearance ${JSON.stringify(rep.clear)}`, rep.seatDb < 0 && 'dumbbell in the seat', rep.padDb < 0 && 'dumbbell in the pad', rep.dbFloor < 0 && 'dumbbell below floor', rep.jump.v > 4 && `channel jump ${JSON.stringify(rep.jump)}`, Math.abs(info.sidePad) > 0.6 && 'trunk off the pad', Math.abs(info.seat) > 0.6 && 'not on the seat', ...G.limits(poses)]);
