// Lying Toe Tap (GymVisual #15136; page not readable here, movement from the name and standard coaching): supine on a
// mat, palms planted by the hips (arm contacts), both legs in tabletop (hips and knees at 90 degrees, shins level). Keeping
// the knee bent, the right leg lowers from the hip until the toes lightly tap the mat, then returns to tabletop; then the
// left. The pelvis and trunk stay still (low back flat). Bilateral, alternating.
const F = require('./families/b6-20');
const { L, r1, clone } = F;
const meta = require('./meta/lying-toe-tap.json');

const { base, HC } = F.supineHands({ kneeFlex: 0 });
// Tabletop: thigh vertical, shin level (as the dead bug)
function table(p0, s) {
  const p = F.leg(p0, s, { flex: 90, abd: 0, rot: 0, knee: 90, dorsi: -15 });
  return L.solvePose(p, [`ch.hip_${s}.flex`, `ch.knee_${s}.flex`], [(W) => [(W[`knee_${s}`].p[0] - W[`hip_${s}`].p[0]) * 2, (W[`ankle_${s}`].p[1] - W[`knee_${s}`].p[1]) * 2]]).pose;
}
const top = table(table(base, 'r'), 'l');
const KNEE = top.ch.knee_r.flex;
// Tap: same knee angle, hip extends until the lowest point of the foot is `clr` cm above the mat (toes pointed a little)
function tap(s, clr = 0.4) {
  const p = F.leg(top, s, { dorsi: -30 });
  let lo = 0, hi = 90;
  for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; p.ch[`hip_${s}`].flex = m; if (F.minOf(L.fk(p), [`foot_${s}`]) < clr) lo = m; else hi = m; }
  p.ch[`hip_${s}`].flex = r1(hi + 0.05);
  return p;
}
const tapR = tap('r'), tapL = tap('l');
const poses = { top, tapR, tapL };
const keyframes = [{ t: 0, pose: 'top' }, { t: 0.6, pose: 'top' }, { t: 1.8, pose: 'tapR' }, { t: 2.0, pose: 'tapR' }, { t: 3.2, pose: 'top' }, { t: 3.6, pose: 'top' },
  { t: 4.8, pose: 'tapL' }, { t: 5.0, pose: 'tapL' }, { t: 6.2, pose: 'top' }, { t: 6.8, pose: 'top' }];
const ex = F.CA.buildModule(meta, poses, keyframes, HC);
const pk = Math.max(top.ch.hip_r.flex, top.ch.hip_l.flex);
ex.checks.measure = { name: 'hipFlexion', min: Math.floor(pk) - 3, max: Math.ceil(pk) + 3 };

const rep = F.report(ex, { foot: (W) => Math.min(F.minOf(W, ['foot_r']), F.minOf(W, ['foot_l'])), gap: (W) => F.legGap(W).d });
const Wt = L.fk(top, HC), Wr = L.fk(tapR, HC);
F.setKin(ex, 'Tabletop', `Hip ${F.deg(top.ch.hip_r.flex)}, knee ${F.deg(F.CA.kneeOf(Wt, 'r'))}`, 'Held on the non-tapping leg');
F.setKin(ex, 'Tap', `Hip ${F.deg(top.ch.hip_r.flex)}`, `Hip ${F.deg(tapR.ch.hip_r.flex)} (lowered ${F.deg(top.ch.hip_r.flex - tapR.ch.hip_r.flex)}), knee ${F.deg(F.CA.kneeOf(Wr, 'r'))}; toes ${F.minOf(Wr, ['foot_r']).toFixed(1)} cm from the mat`);
F.setKin(ex, 'Pelvis', 'On the mat, low back flat', `Unchanged (pelvis moves ${rep.still} cm)`);
F.setKin(ex, 'Tempo', 'Tabletop 0.6 s', '1.2 s down, 0.2 s tap, 1.2 s up, 0.4 s pause; then the other leg');
console.log(`Lying Toe Tap: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} top hip ${top.ch.hip_r.flex} knee ${KNEE} tap hip ${tapR.ch.hip_r.flex}`);
F.CA.guard('lying-toe-tap', rep, [rep.foot[0] < -0.2 && `foot through the mat (${rep.foot[0]})`, rep.gap[0] < -0.3 && `legs touch (${rep.gap[0]})`]);
