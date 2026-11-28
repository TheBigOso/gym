// Glute Bridge Walk (GymVisual #17712, page not readable; movement from the name): bridge walk-out. Lift into a glute bridge
// (b6-14 makeBridge, the author-glute-bridge.js solve), then keep the hips up while the heels take small alternating steps
// away (right, left, right, left: 2 x 10 cm), hold, step back in, and lower. Each foot configuration has its own pelvis
// roll (the knee-hip-shoulder line kept straight, averaged over the two legs), so the hips sink a little as the knees
// straighten. A stepping foot hands over to FK on an identical key, lifts about 3 cm at mid-step and is planted again.
const L = require('./lib');
const { R, V, r1, clone } = L;
const H = require('./families/hips');
const X = require('./families/b6-14');
const meta = require('./meta/glute-bridge-walk.json');

const Bq = X.makeBridge({ kneeTop: 90 });
const STEP = 10, NSTEP = 2, LIFT = 3;
const memo = {}, T = (x) => (memo[x] ??= Bq.topFor(Bq.feetAt(x)));
const feet = (xr, xl, yr = 0, yl = 0) => { const f = Bq.feetAt(0); f.r = Bq.footT('r', xr); f.l = Bq.footT('l', xl); f.r[1] = r1(f.r[1] + yr); f.l[1] = r1(f.l[1] + yl); return f; };
const cfg = (xr, xl, o = {}) => Bq.poseAt(1, Object.assign({ feet: feet(xr, xl, o.yr, o.yl), dP: r1((T(xr) + T(xl)) / 2) }, o.release ? { release: o.release } : {}));
const ph = meta.timeline.phases.map((p) => p.end), D = meta.timeline.duration; // setup, lift, out, hold, in, lower, reset
const A0 = Bq.AX, poses = { lie: Bq.poseAt(0), top: Bq.poseAt(1), u25: Bq.poseAt(0.25), u50: Bq.poseAt(0.5), u75: Bq.poseAt(0.75), touch: Bq.poseAt(0.03) };
const keyframes = [{ t: 0, pose: 'lie' }, { t: ph[0], pose: 'lie' }];
const add = (t, n, p) => { if (p) poses[n] = p; keyframes.push({ t: +t.toFixed(3), pose: n }); };
add(ph[0] + (ph[1] - ph[0]) * 0.3, 'u25'); add(ph[0] + (ph[1] - ph[0]) * 0.55, 'u50'); add(ph[0] + (ph[1] - ph[0]) * 0.78, 'u75'); add(ph[1], 'top');
// one step of foot s from x0 to x1 while the other foot stays at xo; t0..t1
let k = 0;
function step(s, x0, x1, xo, t0, t1) {
  const at = (xs, o = {}) => (s === 'r' ? cfg(xs, xo, o) : cfg(xo, xs, Object.assign({}, o, o.yr != null ? { yl: o.yr, yr: 0 } : {})));
  const d = t1 - t0, n = `s${k++}`;
  add(t0 + d * 0.1, `${n}a`, at(x0, { release: s }));
  add(t0 + d * 0.5, `${n}m`, at((x0 + x1) / 2, { release: s, yr: LIFT }));
  add(t0 + d * 0.9, `${n}b`, at(x1, { release: s }));
  add(t1, `${n}p`, at(x1));
}
const out = [], dt = (ph[2] - ph[1]) / (2 * NSTEP);
let xr = A0, xl = A0, t = ph[1];
for (let i = 0; i < NSTEP; i++) { step('r', xr, xr + STEP, xl, t, t + dt); xr += STEP; t += dt; step('l', xl, xl + STEP, xr, t, t + dt); xl += STEP; t += dt; }
add((ph[2] + ph[3]) / 2, 'holdOut', cfg(xr, xl, { yr: 0 })); add(ph[3], `s${k - 1}p`);
const Wout = L.fk(poses.holdOut, Bq.contacts);
t = ph[3]; const di = (ph[4] - ph[3]) / (2 * NSTEP);
for (let i = 0; i < NSTEP; i++) { step('r', xr, xr - STEP, xl, t, t + di); xr -= STEP; t += di; step('l', xl, xl - STEP, xr, t, t + di); xl -= STEP; t += di; }
const Lo = ph[4], Lr = ph[5]; add(Lo + (Lr - Lo) * 0.25, 'u75'); add(Lo + (Lr - Lo) * 0.5, 'u50'); add(Lo + (Lr - Lo) * 0.75, 'u25'); add(Lr, 'touch'); add(Lr + 0.25, 'lie'); add(D, 'lie');
X.wrapPoses(poses);
const ex = H.module_(meta, Bq.contacts, poses, keyframes);
const rep = H.loopReport(ex, { planted: ['leg_r', 'leg_l', 'arm_r', 'arm_l'] });
const tl = R.buildTimeline(ex); let footMin = 1e9;
for (let i = 0; i <= 900; i++) { const pz = tl.pose((i / 900) * D); for (const s of ['r', 'l']) if (pz.ik[`leg_${s}`].weight < 0.999) { const W = R.evalPose(L.rig, pz, ex.contacts); footMin = Math.min(footMin, H.bottomOf(W, `foot_${s}`)); } }
const Wl = L.fk(poses.lie, Bq.contacts), Wt = L.fk(poses.top, Bq.contacts);
const set = H.setKin(ex);
set('Hip flexion', 'setup', `≈${Math.round(poses.lie.ch.hip_r.flex)}° (lying)`); set('Hip flexion', 'peak', `≈${Math.round(poses.top.ch.hip_r.flex)}° at the top; ≈${Math.round(poses.holdOut.ch.hip_r.flex)}° walked out`);
set('Knee flexion', 'setup', `≈${Math.round(H.kneeOf(Wl, 'r'))}° lying, ≈${Math.round(H.kneeOf(Wt, 'r'))}° at the top`); set('Knee flexion', 'peak', `≈${Math.round(H.kneeOf(Wout, 'r'))}° walked out`);
set('Hip height', 'setup', `Hip joint ${r1(Wl.hip_r.p[1])} cm above the floor`); set('Hip height', 'peak', `${r1(Wt.hip_r.p[1])} cm at the top, ${r1(Wout.hip_r.p[1])} cm walked out`);
set('Walk-out', 'setup', `Feet ${A0} cm from the hip line at the top (feet x)`); set('Walk-out', 'peak', `${NSTEP} heel steps of ${STEP} cm per foot (feet ${r1(A0 + NSTEP * STEP)} cm); each foot lifts about ${LIFT} cm mid-step`);
set('Tempo', 'setup', `Lying ${ph[0]} s; ${r1(ph[1] - ph[0])} s up`); set('Tempo', 'peak', `${r1(dt)} s per step out, ${r1(ph[3] - ph[2])} s hold, ${r1(di)} s per step in, ${r1(ph[5] - ph[4])} s down`);
ex.exercise.reference.note = X.NOTE;
const pk = X.fitMeasure(ex, 'kneeFlexion');
console.log(`Glute Bridge Walk: feet ${A0} -> ${A0 + NSTEP * STEP}, rolls ${JSON.stringify(memo)} wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} stepping foot min ${footMin.toFixed(2)} peak knee ${pk.toFixed(1)}`);
X.finishChecks(ex, 'glute-bridge-walk', rep);
if (footMin < -0.3) { console.error('FAIL: stepping foot drags through the floor'); process.exitCode = 1; }
