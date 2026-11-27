// Dumbbell Behind-the-Back Wrist Curl (GymVisual #636612, Dumbbell Standing Back Wrist Curl): standing tall, feet about
// hip width (planted leg contacts), a light dumbbell in each hand behind the hips, arms straight and hanging slightly
// back (shoulders drawn back) so the dumbbells clear the buttocks, palms facing back. The arms stay still (one constant
// arm pose); only the wrists move: from a straight wrist (dumbbells hanging) into flexion, curling the dumbbells up and
// back, short squeeze, slow lower. Bilateral.
const L = require('./lib');
const { V, R, r1, clone } = L;
const H = require('./families/hips');
const T = require('./families/b3-triceps');
const C = require('./families/b3-curls');
const F = require('./families/b4-forearms');
const meta = require('./meta/dumbbell-behind-back-wrist-curl.json');
const ENV = (k, d) => +(process.env[k] ?? d);
const ZW = ENV('ZW', 21), GAP = ENV('GAP', 3.5), LOW = ENV('LOW', -8), HIGH = ENV('HIGH', 55);

const st = L.POSES.standing({ stance: 11, toeOut: 8 });
const contacts = st.contacts;
let base = clone(st.pose);
Object.assign(base.ch, { sc_r: { protract: -12, elevate: -2 }, sc_l: { protract: -12, elevate: -2 }, neck_c7: { rot: 0, flex: 2 }, head_c1: { rot: 0, flex: 2 } });
const W0 = L.fk(base, contacts);
const buttBack = Math.min(T.extremePt(W0, T.shapeOf('buttock_r'), [-1, 0, 0])[0], T.extremePt(W0, T.shapeOf('buttock_l'), [-1, 0, 0])[0]);
// Right arm: straight (elbow 4), wrist GAP cm behind the buttocks at |z| = ZW, palm facing back, hand in line with the forearm
C.setArm(base, 'r', { plane: -40, elev: 15, axial: 0, flex: 4, pron: 150 });
const objs = [
  (W) => [(W.wrist_r.p[0] - (buttBack - GAP)) * 3, (W.wrist_r.p[2] - ZW) * 3],
  (W) => { const fa = V.norm(V.sub(W.wrist_r.p, W.elbow_r.p)), back = V.norm(V.sub([-1, 0, 0], V.scale(fa, -fa[0]))); return V.sub(C.palmDir(W, 'r'), back).map((v) => v * 6); },
  (W, q) => [Math.max(0, -58 - q.ch.shoulder_r.plane) * 5, Math.min(0, q.ch.shoulder_r.elev) * 5, q.ch.shoulder_r.axial * 0.005],
];
const sol = L.solvePose(base, ['ch.shoulder_r.plane', 'ch.shoulder_r.elev', 'ch.shoulder_r.axial', 'ch.wrist_r.pron'], objs, { iters: 500, contacts });
base = T.mirrorArm(sol.pose);
const poses = {}, keyframes = [];
for (const [t, fl] of [[0, LOW], [0.5, LOW], [1.0, Math.round((LOW + HIGH) / 2)], [1.5, HIGH], [1.9, HIGH + 3], [2.75, Math.round((LOW + HIGH) / 2)], [3.6, LOW], [4.0, LOW]]) {
  const k = `w${fl < 0 ? 'm' : 'p'}${Math.abs(fl)}`; if (!poses[k]) poses[k] = F.withWrist(base, fl); keyframes.push({ t, pose: k });
}
const ex = H.module_(meta, contacts, poses, keyframes);
const rep = F.forearmLoop(ex, { still: ['elbow_r', 'wrist_r'] });
const Wb = L.fk(poses[keyframes[0].pose], contacts);
const ext = V.angle(V.sub(Wb.elbow_r.p, Wb.shoulder_r.p), [0, -1, 0]), back = Math.atan2(-(Wb.wrist_r.p[0] - Wb.shoulder_r.p[0]), Wb.shoulder_r.p[1] - Wb.wrist_r.p[1]) / R.DEG;
const set = H.setKin(ex);
set('Wrist flexion', 'setup', LOW < 0 ? `${-LOW}° extension (hands hanging, wrist about straight)` : `${LOW}°`); set('Wrist flexion', 'peak', `${HIGH + 3}° flexion at the top (arc ≈${HIGH + 3 - LOW}°)`);
set('Arm position', 'setup', `Elbows ≈${Math.round(T.elbowOf(Wb, 'r'))}° (straight); arm ≈${Math.round(back)}° behind vertical, wrists ${Math.round(2 * Wb.wrist_r.p[2])} cm apart`); set('Arm position', 'peak', `Unchanged (arms move ${rep.drift} cm over the loop)`);
set('Dumbbell clearance', 'setup', `≥ ${rep.body.d} cm from the body (rig shapes, nearest ${rep.body.id})`); set('Dumbbell clearance', 'peak', `Dumbbells ${rep.pair} cm apart at the closest`);
set('Tempo', 'setup', 'Bottom 0.5 s'); set('Tempo', 'peak', '1 s up, 0.4 s squeeze, 1.7 s down, 0.4 s at the bottom');
console.log(`DB Behind-the-Back Wrist Curl: wrote ${L.write(ex)}\n  arm ${JSON.stringify({ sh: base.ch.shoulder_r, el: base.ch.elbow_r, wr: base.ch.wrist_r })} cost ${sol.cost.toFixed(3)} buttBack ${r1(buttBack)} wrist ${Wb.wrist_r.p.map(r1)} back ${r1(back)}\n  ${JSON.stringify(rep)}`);
if (rep.slide > 0.05) { console.error('FAIL: planted foot slides'); process.exitCode = 1; }
if (rep.body.d < 0.5 || rep.dbFloor < 0 || rep.pair < 0.5) { console.error('FAIL: dumbbell clearance'); process.exitCode = 1; }
if (process.env.DBG) { const W = L.fk(base, contacts); console.log('res', objs.map((f) => f(W, base).map((v) => +v.toFixed(2))), 'palm', C.palmDir(W, 'r').map((v) => +v.toFixed(2)), 'fingers', L.Q.rot(W.wrist_r.q, [0, -1, 0]).map((v) => +v.toFixed(2))); }
