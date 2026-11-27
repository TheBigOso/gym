// Dumbbell Pullover (GymVisual #037512): lying ALONG a flat bench (head near the end so the dumbbell clears the pad behind
// the head), glutes on the seat, feet planted (leg contacts). One dumbbell held over the chest with both palms cupping the
// top plate ('end' grip on the right hand with a custom offset so the plate sits in the palms and the dumbbell hangs along
// the forearms; the left hand mirrors the right beside it). Arms nearly straight (elbows fixed at a soft bend); the dumbbell
// lowers in an arc behind the head until the arms are about in line with the body, pauses in the stretch, then is pulled
// back over the chest. Bilateral (symmetric arms). Family b3-chest.js.
const L = require('./lib');
const { V, R, r1, clone } = L;
const C = require('./families/b3-chest');
const H = require('./families/hips');
const meta = require('./meta/dumbbell-pullover.json');

const GRIP = 'end', OFF = [-7, 6.5, 0]; // player offset [toward fingers, out of palm, t]: the top plate sits against the palm with the
// fingers hooked over its face and the dumbbell hanging along the forearms; palms face each other so the plate is held between them
const ELBOW = 10, DIP = -14, HIP_X = 2, N = 7; // DIP < 0: the bottom stops a little above the line of the back (the drawn arm is shorter than the rig arm, so this keeps the plate clear of the head)
const T = C.phaseT(meta), { B, base, contacts, foot } = C.benchBase(0, { hipX: HIP_X });
const W0 = L.fk(base, contacts), F = C.trunkFrame(W0), mid = F.mid;
const dTop = [0, 1, 0], dBot = V.norm(V.sub(F.u, V.scale(F.v, Math.tan(DIP * R.DEG)))); // overhead, a little below the back plane
function key(f, prev) {
  const d = C.slerpV(dTop, dBot, f);
  const p = clone(base); const e = r1(4 + 26 * f); p.ch.sc_r = { protract: r1(SC0.protract + 6 * (1 - f)), elevate: e }; // blades glide up as the arms go overhead
  const prevCh = prev && clone(prev.ch);
  const extra = (W, q) => {
    const db = C.dbAt(W, 'r', GRIP, OFF), rel = V.sub(db.c, mid), off = V.sub(rel, V.scale(d, V.dot(rel, d)));
    const palm = V.norm(Q.rot(W.wrist_r.q, [1, 0, 0]));
    const a2 = V.norm([db.ax[0], db.ax[1], 0]); // dumbbell along the arc direction in side view (it may lean in a little)
    return [db.c[2] * 3, ...off.map((v) => v * 2), ...V.sub(a2, d).map((v) => v * 15), db.ax[2] * 10, (V.dot(palm, V.scale(F.w, -1)) - 1) * 4].concat(prev ? [(q.ch.wrist_r.pron - prevCh.wrist_r.pron) * 0.01, (q.ch.shoulder_r.axial - prevCh.shoulder_r.axial) * 0.01] : []);
  };
  const seeds = prev ? [{ shoulder_r: prevCh.shoulder_r, elbow_r: prevCh.elbow_r, wrist_r: prevCh.wrist_r }] : [{ shoulder_r: { plane: 90, elev: 90, axial: 0 }, elbow_r: { flex: ELBOW }, wrist_r: { pron: 0, flex: 0, dev: 0 } }, { shoulder_r: { plane: 80, elev: 90, axial: 30 }, elbow_r: { flex: ELBOW }, wrist_r: { pron: -30, flex: 0, dev: 0 } }, { shoulder_r: { plane: 100, elev: 90, axial: -30 }, elbow_r: { flex: ELBOW }, wrist_r: { pron: 30, flex: 0, dev: 0 } }];
  const q = C.solveArmDB(p, { c: null, ax: null, grip: GRIP, off: OFF, elbowFlex: ELBOW, seeds, extra: (W, q) => [...extra(W, q), (q.ch.shoulder_r.axial || 0) * 0.02, (q.ch.wrist_r.pron || 0) * 0.02], wristW: 0.03 });
  return q;
}
const { Q } = L;
const SC0 = C.SC;
const path = []; let prev = null;
for (let i = 0; i <= N; i++) { const q = key(i / N, prev); path.push({ f: 1 - i / N, pose: C.mirrorArm(C.strip(q)), cost: q.__cost }); prev = q; }
path.reverse(); // f: 0 bottom .. 1 top
const settle = C.mirrorArm(C.strip(key(0.985, path[1].pose)));
const { poses, keyframes } = C.repKeys(path, T, settle);
const ex = H.module_(meta, contacts, poses, keyframes);
ex.props.find((p) => p.id === 'bench').center = B.prop.center;
ex.props.find((p) => p.id === 'dbR').attach.offset = OFF;
const both = [/^(hand|thumb|forearm)_[rl]$/];
let shR = [999, -999];
const flexOf = (W) => { const F2 = C.trunkFrame(W), ua = V.norm(V.sub(W.elbow_r.p, W.shoulder_r.p)); return Math.atan2(V.dot(ua, F2.u), -V.dot(ua, F2.u) * 0 + V.dot(ua, F2.v)) / R.DEG + 90; }; // 90 = arm vertical, 180 = along the trunk overhead
const sw = C.sweep(ex, B, { grips: [{ side: 'r', grip: GRIP, off: OFF, skip: both }], probe: (W) => { const s = flexOf(W); shR = [Math.min(shR[0], s), Math.max(shR[1], s)]; } });
const Wt = L.fk(poses.top, contacts), Wb = L.fk(poses.bottom, contacts), set = H.setKin(ex), dd = (v) => `≈${Math.round(v)}°`;
const fit = C.benchFit(B, W0), dbT = C.dbAt(Wt, 'r', GRIP, OFF), dbB = C.dbAt(Wb, 'r', GRIP, OFF);
const headTop = Math.min(...L.rig.shapes.filter((s) => /^(hair|head)$/.test(s.id)).map((s) => { const g = L.R.shapeWorld(W0, s); return g.c[0] - Math.hypot(g.axes[0][0], g.axes[1][0], g.axes[2][0]); }));
set('Bench position', 'setup', `Along the bench, top of the head at the end of the pad (${r1(B.tip[0] - headTop)} cm past it)`); set('Bench position', 'peak', 'Glutes, upper back and head on the bench (skinned mesh within about 1 cm, measured with b2/chest_mesh.mjs)');
set('Shoulder flexion', 'setup', `${dd(flexOf(Wt))} (arms over the chest)`); set('Shoulder flexion', 'peak', `${dd(flexOf(Wb))} at the bottom (arms aimed ${Math.abs(DIP)}° ${DIP < 0 ? 'above' : 'below'} the line of the back so the dumbbell clears the head and the bench end)`);
set('Elbow flexion', 'setup', `${dd(C.elbowFlexOf(Wt))} (elbow angle ${dd(180 - C.elbowFlexOf(Wt))})`); set('Elbow flexion', 'peak', `${dd(C.elbowFlexOf(Wb))}, unchanged through the arc`);
set('Grip', 'setup', `Both palms on the top plate, dumbbell hanging ${r1(dbT.c[1] - W0.shoulder_r.p[1])} cm above the shoulder line at its centre`); set('Grip', 'peak', `Dumbbell behind the head, lowest point ${r1(Math.min(...dbB.ends.map((e) => e[1])) - dbB.r)} cm above the floor, beyond the bench end`);
set('Knee flexion', 'setup', `${dd(H.kneeOf(W0, 'r'))}, feet ${2 * foot[2]} cm apart`); set('Knee flexion', 'peak', 'Unchanged (feet planted)');
set('Tempo', 'setup', `Top ${T.h} s`); set('Tempo', 'peak', `${r1(T.b - T.h)} s down, ${r1(T.p - T.b)} s stretch, ${r1(T.r - T.p)} s up, ${r1(T.D - T.r)} s over the chest`);
const tf = V.angle(V.sub(W0.neck_c7.p, W0.pelvis.p), [0, 1, 0]);
ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(tf - 3), max: Math.ceil(tf + 3) };
console.log(`Dumbbell Pullover: wrote ${L.write(ex)}\n  bench ${JSON.stringify(fit)} headTop ${r1(headTop)} tip ${B.tip[0]} knee ${H.kneeOf(W0, 'r').toFixed(0)} hip ${base.ch.hip_r.flex}\n  shoulder ${shR.map(r1)} elbow ${r1(C.elbowFlexOf(Wt))}/${r1(C.elbowFlexOf(Wb))} costs ${path.map((k) => k.cost.toFixed(3)).join(',')}\n  top ${JSON.stringify(poses.top.ch.shoulder_r)} ${JSON.stringify(poses.top.ch.wrist_r)} bottom ${JSON.stringify(poses.bottom.ch.shoulder_r)} ${JSON.stringify(poses.bottom.ch.wrist_r)}\n  dbTop ${dbT.c.map(r1)} dbBot ${dbB.c.map(r1)} sweep ${JSON.stringify(sw)}`);
if (sw.slide > 0.05) { console.error('FAIL: planted foot slides'); process.exitCode = 1; }
if (sw.dbBody > 0.5 || sw.dbBench > 0 || sw.dbFloor < 0 || sw.bodyBench > 2.5) { console.error('FAIL: dumbbell or body collision'); process.exitCode = 1; }
