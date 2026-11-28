// Palm Up - Palm Down Rotation (GymVisual #11810; page not readable here, movement from the name and standard coaching).
// Stand tall, feet hip width (both feet planted). Raise the straight arms out to the sides to shoulder height, palms
// down; turn the palms up to the ceiling and back down three times, the whole arm rotating from the shoulder (about 60
// degrees of shoulder rotation) with the forearm turning the rest (about 120 degrees, from pronated to supinated), the
// hands staying at shoulder height; lower the arms. The palm normal is solved per key (wrist +X axis, as the core
// family's overhead arms). Bilateral (right arm solved, left mirrored), body weight only.
const L = require('./lib');
const { V, Q, r1, clone } = L;
const H = require('./families/hips');
const CA = require('./families/core-a');
const B = require('./families/b6-18');
const meta = require('./meta/palm-up-palm-down-rotation.json');

const S = B.standing({ stance: 10, toeOut: 6 });
const base = clone(S.pose);
Object.assign(base.ch, { shoulder_r: { plane: 10, elev: 7, axial: 0 }, shoulder_l: { plane: 10, elev: 7, axial: 0 }, elbow_r: { flex: 10 }, elbow_l: { flex: 10 }, wrist_r: { pron: 10, flex: 0, dev: 0 }, wrist_l: { pron: 10, flex: 0, dev: 0 } });
const mirrorArm = (p) => { for (const j of ['shoulder', 'elbow', 'wrist', 'sc']) p.ch[`${j}_l`] = clone(p.ch[`${j}_r`]); return p; };
const Sh = L.fk(base, S.contacts).shoulder_r.p;
const PATHS = ['ch.shoulder_r.plane', 'ch.shoulder_r.elev', 'ch.shoulder_r.axial', 'ch.wrist_r.pron'];
// Arm straight out at `elev` deg from hanging (90 = shoulder height), slightly forward of the frontal plane; palm normal
// `palm` (world), shoulder axial regularised toward axRef.
function arm(elev, palm, axRef, g, elbow = 4) {
  const q = clone(base); q.ch.elbow_r = { flex: elbow }; q.ch.sc_r = { protract: 2, elevate: r1(elev / 90 * 4) };
  const a = elev * Math.PI / 180, dir = V.norm([0.12 * Math.sin(a), -Math.cos(a), Math.sin(a)]);
  const tgt = V.add(Sh, V.scale(dir, L.reach(elbow)));
  q.ch.shoulder_r = { plane: g[0], elev: g[1], axial: g[2] }; q.ch.wrist_r = { pron: g[3], flex: 0, dev: 0 };
  const s = L.solvePose(q, PATHS, [L.obj.at('wrist_r', tgt, 3), (W) => V.sub(Q.rot(W.wrist_r.q, [1, 0, 0]), palm).map((v) => v * 5), L.obj.reg('ch.shoulder_r.axial', axRef, 0.03), CA.limitPen(PATHS, 3)], { iters: 400 });
  s.pose.__cost = s.cost; return s.pose;
}
const DOWN = [0, -1, 0], UP = [0, 1, 0];
const out = arm(90, DOWN, 0, [5, 90, 0, 90]);
const ax0 = out.ch.shoulder_r.axial, pr0 = out.ch.wrist_r.pron;
const up = arm(90, UP, ax0 - 60, [out.ch.shoulder_r.plane, out.ch.shoulder_r.elev, ax0 - 60, pr0 - 120]);
const mid = clone(out); for (const c of ['plane', 'elev', 'axial']) mid.ch.shoulder_r[c] = r1((out.ch.shoulder_r[c] + up.ch.shoulder_r[c]) / 2); mid.ch.wrist_r.pron = r1((pr0 + up.ch.wrist_r.pron) / 2); mid.__cost = 0; // half way: thumbs up
// raising: arm at 45 deg, palm facing the floor-ish/in
const half = arm(45, V.norm([0, -0.7, -0.7]), 0, [5, 45, 0, 90], 8);
const COST = [out, up, mid, half].map((p) => p.__cost.toFixed(4));
const poses = { stand: base, half: mirrorArm(half), out: mirrorArm(out), mid: mirrorArm(mid), up: mirrorArm(up) };
for (const k of ['half', 'out', 'mid', 'up']) delete poses[k].__cost;
const keyframes = [{ t: 0, pose: 'stand' }, { t: 0.5, pose: 'half' }, { t: 1.0, pose: 'out' }];
let t = 1.0;
for (let i = 0; i < 3; i++) for (const n of ['mid', 'up', 'mid', 'out']) { t = +(t + 0.4).toFixed(2); keyframes.push({ t, pose: n }); }
keyframes.push({ t: 6.5, pose: 'half' }, { t: 7.0, pose: 'stand' }, { t: 7.6, pose: 'stand' });
const ex = H.module_(meta, S.contacts, poses, keyframes);
const rep = H.loopReport(ex, { planted: ['leg_r', 'leg_l'] });
const lim = CA.scan(ex).limits;
const Wo = L.fk(poses.out, S.contacts), Wu = L.fk(poses.up, S.contacts);
const palmAng = (W) => V.angle(Q.rot(W.wrist_r.q, [1, 0, 0]), DOWN);
const armElev = (W) => V.angle(V.sub(W.wrist_r.p, W.shoulder_r.p), [0, -1, 0]);
const set = H.setKin(ex);
set('Arm elevation', 'setup', 'Hanging by the sides'); set('Arm elevation', 'peak', `≈${Math.round(armElev(Wo))}° out to the sides (hands at shoulder height)`);
set('Arm rotation', 'setup', `Palms down (palm ${Math.round(palmAng(Wo))}° from facing the floor)`); set('Arm rotation', 'peak', `Palms up (${Math.round(palmAng(Wu))}° turned): shoulder rotation ${Math.round(Math.abs(up.ch.shoulder_r.axial - ax0))}°, forearm ${Math.round(Math.abs(up.ch.wrist_r.pron - pr0))}°`);
set('Elbow', 'setup', 'Soft'); set('Elbow', 'peak', `≈${out.ch.elbow_r.flex}° (nearly straight)`);
set('Trunk', 'setup', 'Tall'); set('Trunk', 'peak', 'Unchanged');
set('Tempo', 'setup', '1 s to raise the arms'); set('Tempo', 'peak', 'Three palm-up and palm-down turns of 1.6 s, 1 s to lower');
ex.exercise.reference.note = B.NOTE;
console.log(`Palm Up - Palm Down Rotation: wrote ${L.write(ex)}  costs ${COST} out=${JSON.stringify(out.ch.shoulder_r)}/${out.ch.wrist_r.pron} up=${JSON.stringify(up.ch.shoulder_r)}/${up.ch.wrist_r.pron} mid=${JSON.stringify(mid.ch.shoulder_r)}/${mid.ch.wrist_r.pron}\n  ${JSON.stringify(rep)} limits ${lim.length}`);
if (rep.slide > 0.05 || rep.floor < -0.5 || lim.length) { console.error('FAIL palm-up-palm-down-rotation', lim.slice(0, 4)); process.exitCode = 1; }
