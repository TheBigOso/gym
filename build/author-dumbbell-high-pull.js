// Dumbbell High Pull (GymVisual #566613): from the hang (dumbbells just above the knees, hips back, knees about 25 degrees,
// flat back, trunk about 50 degrees above horizontal, palms facing the thighs) the hips and knees extend fast and the
// shoulders shrug; the momentum carries the dumbbells up while the elbows pull high and out to about shoulder height, the
// dumbbells close to the chest. Lower under control back to the thighs and hinge into the hang. Feet stay flat (planted
// leg contacts; many lifters rise onto the toes at the top, not shown). Bilateral, a dumbbell in each hand (handle grip).
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const K = require('./families/b4-shoulders3');
const meta = require('./meta/dumbbell-high-pull.json');

const hang = F.hinge({ stance: 13, knee: 25, trunk: 50 });
const C = hang.contacts;
// Tall: same feet; pelvis level (no pitch), spine neutral, knees about 5 degrees, pelvis over the mid-foot
function tall(knee, pitch = 0) {
  const p = clone(hang.pose);
  p.root.rot = { pitch }; p.ch.spine_l5 = { rot: 0, flex: 0, latFlex: 0 }; p.ch.spine_t12 = { rot: 0, flex: 0, latFlex: 0 }; p.ch.spine_t6 = { rot: 0, flex: 1, latFlex: 0 };
  p.ch.neck_c7 = { rot: 0, flex: 0 }; p.ch.head_c1 = { rot: 0, flex: 0 };
  const fx = p.ik.leg_r.target[0];
  const bis = (lo, hi, fn) => { for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (fn(m)) lo = m; else hi = m; } return (lo + hi) / 2; };
  for (let it = 0; it < 4; it++) {
    p.root.pos[0] = r1(bis(fx - 30, fx + 30, (x) => { const q = clone(p); q.root.pos[0] = x; return L.fk(q, C).pelvis.p[0] < fx - 3; }));
    p.root.pos[1] = r1(bis(60, 110, (y) => { const q = clone(p); q.root.pos[1] = y; return H.kneeOf(L.fk(q, C), 'r') > knee; }));
  }
  return F.plantLegs(p, C);
}
// in-between of two bases (root and spine channels), legs refitted on the same contacts
function blend(a, b, f) {
  const p = clone(a);
  p.root.pos = a.root.pos.map((v, i) => r1(v + (b.root.pos[i] - v) * f));
  p.root.rot = { pitch: r1((a.root.rot.pitch || 0) + ((b.root.rot.pitch || 0) - (a.root.rot.pitch || 0)) * f) };
  for (const j of ['spine_l5', 'spine_t12', 'spine_t6', 'neck_c7', 'head_c1']) for (const c in a.ch[j]) p.ch[j][c] = r1(a.ch[j][c] + (b.ch[j][c] - a.ch[j][c]) * f);
  return F.plantLegs(p, C);
}
const T5 = tall(6);
// hanging arms: wrists under the shoulders, slid forward until the dumbbells clear the thighs by about 1 cm
function hangArms(p0, sc) {
  const p = clone(p0); p.ch.sc_r = clone(sc); p.ch.sc_l = clone(sc);
  const S = L.fk(p, C).shoulder_r.p, R8 = L.reach(8) * 0.998;
  const at = (dx) => { const w = [S[0] + dx, 0, S[2] + 2.5]; w[1] = S[1] - Math.sqrt(Math.max(1, R8 * R8 - dx * dx - 6.25)); return w; };
  let lo = -6, hi = 25, q = null;
  for (let i = 0; i < 18; i++) {
    const m = (lo + hi) / 2, w = at(m);
    const s = F.mirrorArm(F.solveArm(p, { wrist: w, palm: [-1, 0, 0], thumb: [0, 0, -1], wThumb: 3, guess: { plane: 60, elev: 15, axial: 40, flex: 8, pron: 160 } }));
    const c = K.heldClear(L.fk(s, C), [{ side: 'r' }, { side: 'l' }]);
    if (c.d > 1.0) { hi = m; q = s; } else lo = m;
  }
  return q;
}
// elbows high: wrist in front of the chest just below shoulder height, elbow up and out
function pullArms(p0, sc, f, pl1 = 12) {
  const p = clone(p0); p.ch.sc_r = clone(sc); p.ch.sc_l = clone(sc);
  const S = L.fk(p, C).shoulder_r.p;
  const lp = (x, y) => x + (y - x) * f, D2R = Math.PI / 180;
  const e = lp(48, 96) * D2R, pl = lp(22, pl1) * D2R;
  const E = V.add(S, V.scale([Math.sin(e) * Math.sin(pl), -Math.cos(e), Math.sin(e) * Math.cos(pl)], L.UA - 0.05));
  const d = V.norm([lp(0.3, 0.55), lp(-0.9, -0.38), lp(-0.32, -0.74)]);
  const Wt = V.add(E, V.scale(d, L.FA - 0.3));
  // dumbbell handle level (thumb axis horizontal, pointing back toward the body at the top), palm down / back
  const th = V.scale(V.norm(V.cross(d, [0, 1, 0])), -1), palmTop = V.norm(V.cross(th, d));
  const pb = V.norm([-1, -0.1, 0]), palm0 = V.norm(V.sub(pb, V.scale(d, V.dot(pb, d)))), palm = V.norm(V.add(V.scale(palm0, 1 - f), V.scale(palmTop, f)));
  const q = F.solveArm(p, { wrist: Wt, elbow: E, palm, wPalm: 4, guess: { plane: 15, elev: lp(45, 86), axial: lp(40, 70), flex: lp(50, 105), pron: 150 } });
  q.__e = q.__err; return F.mirrorArm(q);
}
// rig v2 has a fuller chest: the elbows come a little forward of the frontal plane (plane angle) until the dumbbells clear
// the chest by about 2.5 cm at the keys
function pullClear(p0, sc, f) {
  let q = null;
  for (let pl1 = 12; pl1 <= 45; pl1 += 1) { q = pullArms(p0, sc, f, pl1); if (K.heldClear(L.fk(q, C), [{ side: 'r' }, { side: 'l' }]).d >= 2.5) break; }
  return q;
}
const SC0 = { protract: 6, elevate: 0 }, SC1 = { protract: 2, elevate: 14 }, SC2 = { protract: -2, elevate: 16 };
const poses = {
  hang: hangArms(hang.pose, SC0),
  d1: hangArms(blend(hang.pose, T5, 0.55), { protract: 4, elevate: 4 }),
  d2: hangArms(T5, SC1),
  p1: pullClear(T5, SC2, 0.5),
  p2: pullClear(T5, SC2, 0.75),
  top: pullClear(T5, SC2, 1),
};
poses.down = hangArms(T5, { protract: 3, elevate: 2 });
for (const k in poses) delete poses[k].__e;
const keyframes = [{ t: 0, pose: 'hang' }, { t: 0.8, pose: 'hang' }, { t: 1.0, pose: 'd1' }, { t: 1.15, pose: 'd2' }, { t: 1.3, pose: 'p1' }, { t: 1.38, pose: 'p2' }, { t: 1.45, pose: 'top' }, { t: 1.8, pose: 'top' },
  { t: 2.0, pose: 'p2' }, { t: 2.2, pose: 'p1' }, { t: 2.5, pose: 'down' }, { t: 3.0, pose: 'hang' }, { t: 3.8, pose: 'hang' }];

const ex = H.module_(meta, C, poses, keyframes);
ex.props = clone(F.DUMBBELLS);
const rep = F.scan(ex, { maxJump: 8 });
F.gate('dumbbell-high-pull', rep, { maxJump: 12 });

const Wh = L.fk(poses.hang, C), Wt = L.fk(poses.top, C);
const trunkUp = (W) => Math.atan2(W.neck_c7.p[1] - W.pelvis.p[1], W.neck_c7.p[0] - W.pelvis.p[0]) * 180 / Math.PI;
const set = H.setKin(ex);
const dbY = (W) => require('./families/dumbbell').dumbbellAt(W, 'r').c[1];
set('Hang position', 'setup', `trunk ≈${Math.round(trunkUp(Wh))}° above horizontal, dumbbells at ${Math.round(dbY(Wh))} cm (knee joint ${Math.round(Wh.knee_r.p[1])} cm)`); set('Hang position', 'peak', '—');
set('Hip extension', 'setup', `hip ${Math.round(poses.hang.ch.hip_r.flex)}° flexion`); set('Hip extension', 'peak', `hip ${Math.round(poses.top.ch.hip_r.flex)}° (upright)`);
set('Knee flexion', 'setup', `≈${Math.round(H.kneeOf(Wh, 'r'))}°`); set('Knee flexion', 'peak', `≈${Math.round(H.kneeOf(Wt, 'r'))}°`);
set('Elbow height', 'setup', 'arms straight'); set('Elbow height', 'peak', `elbow ${Math.round(Wt.elbow_r.p[1] - Wt.shoulder_r.p[1])} cm from shoulder height, ${Math.round(Wt.elbow_r.p[1] - Wt.wrist_r.p[1])} cm above the wrist; elbow ${Math.round(K.elbowAng(Wt))}°`);
set('Tempo', 'setup', 'Hang 0.8 s'); set('Tempo', 'peak', 'Drive 0.35 s, pull 0.3 s, hold 0.35 s, lower 1.2 s');
console.log(`Dumbbell High Pull: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}`);
