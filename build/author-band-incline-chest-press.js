// Band Incline Chest Press (GymVisual, Band Incline Chest Press; movement reference only, page not readable): standing in
// a staggered stance (right foot forward, knees soft, planted leg contacts) with the back to a rack. A band is looped
// around each rack upright behind the lifter, below shoulder height, and a handle held in each hand (one strand per hand),
// palms down. From the hands beside the chest with the elbows back and out about 50 degrees, the arms press forward and
// up along a line about 30 degrees above horizontal (a low-to-high, "incline" press) to nearly straight, then return.
// The strands run from the uprights past the outside of the elbows. Bilateral (right arm solved, left mirrored). This
// standing version is a judgement call (the bench version is band-incline-bench-press); see the report.
const L = require('./lib');
const { V, R, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const EQ = require('./families/equip');
const C = require('./families/eq-cable');
const B5 = require('./families/b5-bandpush');
const meta = require('./meta/band-incline-chest-press.json');
const ENV = (k, d) => +(process.env[k] ?? d);
const INCL = ENV('INCL', 12), RACK_X = ENV('RACK_X', -50), ANCHOR_Y = ENV('ANCHOR_Y', 118), RACK_W = ENV('RACK_W', 150);
const st = B5.staggered({ front: 24, back: 22, stance: 13, knee: 10 });
const base = clone(st.pose);
base.ch.neck_c7 = { rot: 0, flex: 0 }; base.ch.head_c1 = { rot: 0, flex: 2 };
const dir = V.norm([Math.cos(INCL * R.DEG), Math.sin(INCL * R.DEG), -0.1]);
function poseAt(f, guess) {
  const p = clone(base);
  p.ch.sc_r = { protract: r1(-8 + 16 * f), elevate: r1(2 * f) }; // shoulder blades back at the chest, reach forward at the top
  const S = L.fk(p, st.contacts).shoulder_r.p;
  const w0 = V.add(S, [12, -14, 6]), w1 = V.add(S, V.scale(dir, L.reach(10)));
  const k = f * f * (3 - 2 * f), wrist = V.add(V.scale(w0, 1 - k), V.scale(w1, k));
  const hint = V.norm(V.add(V.scale([-0.75, -0.6, 0.3], 1 - f), V.scale([-0.1, -0.8, 0.6], f)));
  const elbow = F.elbowFor(S, wrist, hint);
  return F.solveArm(p, { wrist, elbow, wElbow: 1, palm: V.norm([dir[0], dir[1], 0]), wPalm: 2, guess });
}
const FR = { bottom: 0, p25: 0.25, p50: 0.5, p75: 0.75, top: 1 }, poses = {}, err = {};
let g = { plane: -20, elev: 60, axial: 30, flex: 110, pron: 90 };
for (const [n, f] of Object.entries(FR)) { const q = poseAt(f, g); err[n] = q.__err; g = F.armGuess(q); poses[n] = F.mirrorArm(q); }
poses.topHold = clone(poses.top); poses.topHold.ch.elbow_r.flex = poses.topHold.ch.elbow_l.flex = r1(poses.top.ch.elbow_r.flex + 2);
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p])), D = meta.timeline.duration;
// timeline: start at the chest, press, hold, return
const keyframes = [{ t: 0, pose: 'bottom' }, { t: ph.setup.end, pose: 'bottom' }, { t: 0.95, pose: 'p25' }, { t: 1.2, pose: 'p50' }, { t: 1.45, pose: 'p75' }, { t: ph.press.end, pose: 'top' },
  { t: ph.hold.end, pose: 'topHold' }, { t: 2.65, pose: 'p75' }, { t: 3.05, pose: 'p50' }, { t: 3.45, pose: 'p25' }, { t: ph.return.end, pose: 'bottom' }, { t: D, pose: 'bottom' }];
const ex = H.module_(meta, st.contacts, poses, keyframes);
const S0 = L.fk(poses.bottom, st.contacts).shoulder_r.p;
const rk = EQ.rack({ x: RACK_X, width: RACK_W, hookY: 140, facing: 1 });
const anchor = [RACK_X, ANCHOR_Y, RACK_W / 2];
ex.props = [rk.prop, ...B5.bandProps({ anchor, color: B5.COLOR.medium })];
const rep = B5.scanBands(ex, { planted: ['leg_r', 'leg_l'] });
B5.gateBands('band-incline-chest-press', rep);
const crep = C.scan(ex, {}); crep.line = { d: 1e9 }; C.gate('band-incline-chest-press', crep, { checkWidth: false }); C.limits(poses);
const Wb = L.fk(poses.bottom, st.contacts), Wt = L.fk(poses.top, st.contacts), set = H.setKin(ex), d = B5.d0;
const gT = EQ.gripPoint(Wt, 'r').p, gB = EQ.gripPoint(Wb, 'r').p, path = V.sub(gT, gB);
const pathAng = Math.atan2(path[1], path[0]) / R.DEG;
const flare = (W) => { const u = V.norm(V.sub(W.elbow_r.p, W.shoulder_r.p)); return Math.acos(Math.max(-1, Math.min(1, -u[1] / Math.hypot(u[1], u[2])))) / R.DEG; };
set('Press angle', 'setup', `Hands beside the chest, ${r1(gB[1] - S0[1])} cm from shoulder height`); set('Press angle', 'peak', `Hands travel ${d(pathAng)} above horizontal to ${r1(gT[1] - Wt.shoulder_r.p[1])} cm above the shoulders`);
set('Elbow flexion', 'setup', `${d(C.elbowAng(Wb))} at the chest`); set('Elbow flexion', 'peak', `${d(C.elbowAng(Wt))} (nearly straight)`);
set('Elbow flare', 'setup', `Upper arm ${d(flare(Wb))} out from the side (front view)`); set('Elbow flare', 'peak', 'Arms reach forward and up');
set('Band', 'setup', `Looped around the rack uprights ${-RACK_X} cm behind, ${ANCHOR_Y} cm up, ${RACK_W} cm apart; strands ${rep.bandLen[0]} cm`); set('Band', 'peak', `Strands ${rep.bandLen[1]} cm at the top; at least ${r1(rep.band.d)} cm from the body`);
set('Stance', 'setup', 'Staggered: right foot 24 cm forward, left 22 cm back, knees soft'); set('Stance', 'peak', 'Unchanged (trunk still)');
set('Tempo', 'setup', `Pause ${ph.setup.end} s at the chest`); set('Tempo', 'peak', `${r1(ph.press.end - ph.press.start)} s press, ${r1(ph.hold.end - ph.hold.start)} s hold, ${r1(ph.return.end - ph.return.start)} s return`);
console.log(`Band Incline Chest Press: wrote ${L.write(ex)}\n  err ${JSON.stringify(err)}\n  path ${r1(pathAng)} band ${JSON.stringify(rep.band)} len ${rep.bandLen} slide ${rep.slide} jump ${JSON.stringify(crep.jump)}`);
