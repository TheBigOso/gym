// Front Plank (GymVisual #046312): forearm plank on a mat. Start on forearms and knees (toes tucked), lift the knees
// into one straight line from shoulders to ankles, hold 9 s with a slight breathing settle, lower the knees.
// Forearms: wrist IK targets with palms flat; the elbow point sits on the mat directly under the shoulder and the
// shoulders stay exactly one upper-arm length from it in every key, so a downward pole keeps the elbow planted.
// Feet: ankle IK targets with a constant (world-locked) foot on the balls of the feet.
const L = require('./lib');
const { R, V, Q, rig, clone } = L;
const P = require('./families/prone');
const meta = require('./meta/front-plank.json');

const r3 = (v) => Math.round(v * 1000) / 1000;
const ease = (u) => u * u * (3 - 2 * u);
const KNEEL_BACK = -5;    // kneeling: shoulders 5 cm behind the elbows (upper arm leans back slightly)
const WRIST_Y = +(process.env.WY ?? 4.2);      // wrist joint height (palms down)
const HEAD = -12;         // neck long, eyes on the mat just ahead of the hands
const DROP = +(process.env.DROP ?? 3.2);       // rig shoulder lowered this far below a vertical upper arm (cm)
const TILT = +(process.env.TILT ?? 15);       // hand roll (deg): thumb side up

// Precise solve (3 decimals): the elbow stays planted only if the shoulder stays on its sphere.
function solve(pose, paths, objs, contacts) {
  const set = (x) => { const q = clone(pose); paths.forEach((p, i) => L.setPathV(q, p, x[i])); return q; };
  const res = (x) => { const q = set(x), W = L.fk(q, contacts); return objs.flatMap((f) => f(W, q)); };
  const sol = R.solveLM(paths.map((p) => L.getPath(pose, p) ?? 0), res, { iters: 400 });
  return { pose: set(sol.x.map(r3)), cost: sol.cost };
}

/* ---------- Plank frame: shoulders one upper arm above the elbow points, toes on the mat, body straight ---------- */
const base = clone(L.POSES.plank().pose); delete base.ik;
Object.assign(base.ch, { knee_r: { flex: 3 }, knee_l: { flex: 3 }, sc_r: { protract: 6, elevate: 0 }, sc_l: { protract: 6, elevate: 0 } });
P.head(base, HEAD);
const plank0 = solve(base, ['root.pos.1', 'root.rot.pitch'], [L.obj.atY('shoulder_r', P.ELBOW_Y + P.UA - DROP, 3), L.obj.atY('toe_r', 1.5, 3)]).pose;
const W0 = L.fk(plank0);
const BACK = Math.sqrt(P.UA ** 2 - (P.UA - DROP) ** 2);
const E = { r: [r3(W0.shoulder_r.p[0] - BACK), P.ELBOW_Y, r3(W0.shoulder_r.p[2])], l: [r3(W0.shoulder_l.p[0] - BACK), P.ELBOW_Y, r3(W0.shoulder_l.p[2])] };
const WT = {}; for (const s of ['r', 'l']) { const dy = WRIST_Y - P.ELBOW_Y; WT[s] = [r3(E[s][0] + Math.sqrt(P.FA ** 2 - dy * dy)), WRIST_Y, E[s][2]]; }
const AT = { r: W0.ankle_r.p.map(r3), l: W0.ankle_l.p.map(r3) };
const handQ = (s) => { const q = Q.mul(Q.axis([1, 0, 0], TILT), L.handRotR); return P.qArr(s === 'r' ? q : Q.mirrorZ(q)); };
const contacts = [
  Object.assign(L.handContact('r'), { label: 'Right forearm', pole: [-0.5, -1, 0], handRot: handQ('r') }),
  Object.assign(L.handContact('l'), { label: 'Left forearm', pole: [-0.5, -1, 0], handRot: handQ('l') }),
  Object.assign(L.legContact('r'), { pole: [0.3, -1, 0.08], handRot: P.qArr(W0.ankle_r.q) }),   // prone: knees toward the mat
  Object.assign(L.legContact('l'), { pole: [0.3, -1, -0.08], handRot: P.qArr(W0.ankle_l.q) }),
];
plank0.ik = { arm_r: { target: WT.r, weight: 1 }, arm_l: { target: WT.l, weight: 1 }, leg_r: { target: AT.r, weight: 1 }, leg_l: { target: AT.l, weight: 1 } };

// The planted elbows must stay on their mat points: residual on the IK elbows themselves.
const sphere = (W) => ['r', 'l'].flatMap((s) => V.sub(W[`elbow_${s}`].p, E[s]).map((v) => v * 6));
const shoulderX = (dx) => (W) => [(W.shoulder_r.p[0] - E.r[0] - dx) * 2];
const finish = (p) => P.fitAll(p, contacts);

// Kneeling on forearms: knees on the mat (shank touches), shoulders slightly behind the elbows, same feet.
const kneel = solve(plank0, ['root.pos.0', 'root.pos.1', 'root.rot.pitch'], [sphere, (W) => [P.bottomOf(W, 'shank_r') * 3], shoulderX(BACK + KNEEL_BACK)], contacts).pose;
// Lift / lower family: u = 0 kneeling -> 1 plank. Pitch eases between the two; x, y keep the shoulders on their spheres.
function between(u) {
  const p = clone(plank0); p.root.rot.pitch = r3(kneel.root.rot.pitch + (plank0.root.rot.pitch - kneel.root.rot.pitch) * u);
  p.root.pos = [r3(kneel.root.pos[0] + (plank0.root.pos[0] - kneel.root.pos[0]) * u), r3(kneel.root.pos[1] + (plank0.root.pos[1] - kneel.root.pos[1]) * u), 0];
  return finish(solve(p, ['root.pos.0', 'root.pos.1'], [sphere, shoulderX(BACK + KNEEL_BACK * (1 - ease(u)))], contacts).pose);
}
// Hold variants: pelvis dy (cm) with a matching small spine change; shoulders stay over the elbows.
const PELVIS_Y = W0.pelvis.p[1];
function breath(dy, spineFlex) {
  const p = clone(plank0);
  p.ch.spine_l5 = { rot: 0, latFlex: 0, flex: r3(spineFlex * 0.5) }; p.ch.spine_t12 = { rot: 0, latFlex: 0, flex: r3(spineFlex * 0.5) };
  return finish(solve(p, ['root.pos.0', 'root.pos.1', 'root.rot.pitch'], [sphere, shoulderX(BACK), (W) => [(W.pelvis.p[1] - PELVIS_Y - dy) * 3]], contacts).pose);
}
const poses = { kneel: finish(kneel), plank: finish(plank0), inhale: breath(-0.5, -0.8), exhale: breath(0.3, 0.4), settle: breath(-0.8, -1.2) };
const LIFT_N = 5;
for (let i = 1; i < LIFT_N; i++) poses[`lift${i}`] = between(i / LIFT_N);

const lift = (t0, t1, rev) => Array.from({ length: LIFT_N - 1 }, (_, i) => ({ t: +(t0 + ((t1 - t0) * (i + 1)) / LIFT_N).toFixed(3), pose: `lift${rev ? LIFT_N - 1 - i : i + 1}` }));
const keyframes = [
  { t: 0, pose: 'kneel' }, { t: 1.0, pose: 'kneel' }, ...lift(1.0, 2.0), { t: 2.0, pose: 'plank' },
  { t: 3.5, pose: 'inhale' }, { t: 5.0, pose: 'exhale' }, { t: 6.5, pose: 'inhale' }, { t: 8.0, pose: 'exhale' }, { t: 9.5, pose: 'settle' }, { t: 10.6, pose: 'plank' },
  { t: 11.0, pose: 'plank' }, ...lift(11.0, 12.0, true), { t: 12.0, pose: 'kneel' }, { t: 13.0, pose: 'kneel' },
];
const ex = { schemaVersion: '1.0.0', rig: { ref: L.rigDef.rigId }, exercise: clone(meta.exercise), camera: meta.camera, props: meta.props, contacts,
  timeline: meta.timeline, poses, keyframes, activation: meta.activation, guides: meta.guides, checks: meta.checks };

/* ---------- Measures, kinematics fill, checks ---------- */
const deg = (v) => `≈${Math.round(v)}°`;
const meas = (name) => {
  const W = L.fk(poses[name], contacts);
  const line = 180 - V.angle(V.sub(W.shoulder_r.p, W.hip_r.p), V.sub(W.ankle_r.p, W.hip_r.p));
  const trunk = V.angle(V.sub(W.neck_c7.p, W.pelvis.p), [1, 0, 0]);
  return { line, trunk, elbow: P.elbowAngle(W, 'r'), knee: P.kneeAngle(W, 'r'), hip: poses[name].ch.hip_r.flex, elbowAhead: E.r[0] - W.shoulder_r.p[0], forearm: P.bottomOf(W, 'forearm_r'), hand: P.bottomOf(W, 'hand_r'), shank: P.bottomOf(W, 'shank_r'), min: L.shapeMinY(W) };
};
const mk = meas('kneel'), mp = meas('plank');
const kin = ex.exercise.kinematics, set = (p, f, v) => { const k = kin.find((x) => x.measure.startsWith(p)); if (k) k[f] = v; };
set('Body line', 'setup', `Kneeling: shoulder-hip-knee nearly in line (hip ${deg(mk.hip)})`); set('Body line', 'peak', `${deg(mp.line)} off straight (shoulder-hip-ankle)`);
set('Elbow position', 'setup', `Elbows on the mat, shoulders ${Math.round(-mk.elbowAhead)} cm behind them`); set('Elbow position', 'peak', `Directly under the shoulders, ${Math.round(2 * E.r[2])} cm apart (joint centres)`);
set('Elbow flexion', 'setup', deg(mk.elbow)); set('Elbow flexion', 'peak', deg(mp.elbow));
set('Hip flexion', 'setup', deg(mk.hip)); set('Hip flexion', 'peak', deg(mp.hip));
set('Knee flexion', 'setup', `${deg(mk.knee)}, knees on the mat`); set('Knee flexion', 'peak', deg(mp.knee));
set('Trunk angle', 'setup', deg(mk.trunk)); set('Trunk angle', 'peak', deg(mp.trunk));
set('Tempo', 'setup', '1 s kneeling'); set('Tempo', 'peak', '1 s lift, 9 s hold with breathing settles, 1 s lower, 1 s rest');
ex.exercise.reference.note = P.NOTE;
console.log(`Front Plank: wrote ${L.write(ex)}`);
for (const n of Object.keys(poses)) { const m = meas(n); console.log(`  ${n.padEnd(7)} line=${m.line.toFixed(1)} trunk=${m.trunk.toFixed(1)} elbow=${m.elbow.toFixed(1)} knee=${m.knee.toFixed(1)} hip=${m.hip} forearm=${m.forearm.toFixed(2)} hand=${m.hand.toFixed(2)} shank=${m.shank.toFixed(2)} min=${m.min.y.toFixed(2)}(${m.min.id})`); }
const fixed = ['r', 'l'].map((s) => ({ joint: `elbow_${s}`, p: E[s] }));
const sw = P.sweep(ex, fixed);
console.log('  sweep', JSON.stringify(sw));
if (sw.slide > 0.05 || sw.drift > 0.05) { console.error('FAIL: planted forearm or foot slides'); process.exitCode = 1; }
