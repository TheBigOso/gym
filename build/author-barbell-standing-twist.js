// Barbell Standing Twist (GymVisual #14577; page not readable here, movement from the name and standard coaching): a
// light bar across the upper back (high bar on the upper traps, fixed in the spine_t6 frame as in the full squat), hands
// just outside the shoulders (80 cm between the handle centres), overhand, elbows down; feet about shoulder width and
// planted, knees soft. The shoulders and the bar turn to the right about 40 degrees, back to the middle, then to the left
// and back, while the pelvis keeps facing forward (rotation shared by L5, T12 and T6 within the rig limits; head turns a
// little with the trunk). With the trunk rotated the body is not symmetric, so each arm is solved onto its own grip point
// (b6-02.js armsOnBarBoth: the left arm as the right arm of the mirrored pose). Bilateral (both directions in the loop).
const L = require('./lib');
const { V, Q, r1, clone } = L;
const C = require('./families/b3-curls');
const BB = require('./families/barbell');
const EQ = require('./families/equip');
const H = require('./families/hips');
const X = require('./families/b5-bbhinge');
const W6 = require('./families/b6-02');
const meta = require('./meta/barbell-standing-twist.json');

const ENV = (k, d) => +(process.env[k] ?? d);
const GW = 80, ROT = ENV('ROT', 40), PLATE_D = 32;
const BAR_T6 = [-5.2, 14.4, 0], ELBOW_T6 = [-8, -20, 10], SC = { protract: -8, elevate: 4 };
const SPLIT = { spine_l5: 0.1, spine_t12: 0.45, spine_t6: 0.45 };
const st = C.standing({}, { stance: 16, toeOut: 10, sc: SC });
const contacts = st.contacts, base0 = st.base;
base0.root.pos[1] = r1(base0.root.pos[1] - 2.5);   // soft knees (and the wider stance reaches the floor)
const barOn = (W) => ({ c: V.add(W.spine_t6.p, Q.rot(W.spine_t6.q, BAR_T6)), ax: V.norm(Q.rot(W.spine_t6.q, [0, 0, 1])) });
const state = {};
function at(theta) {
  const p = clone(base0);
  for (const [j, k] of Object.entries(SPLIT)) p.ch[j] = { rot: r1(theta * k), flex: 0, latFlex: 0 };
  p.ch.neck_c7 = { rot: r1(theta * 0.15), flex: 0 }; p.ch.head_c1 = { rot: r1(theta * 0.1), flex: 0 };
  const W = L.fk(p, contacts), b = barOn(W), grips = EQ.barGrips(b.c, b.ax, GW), fwd = Q.rot(W.spine_t6.q, [1, 0, 0]);
  const ER = V.add(W.shoulder_r.p, V.scale(V.norm(Q.rot(W.spine_t6.q, ELBOW_T6)), L.UA)), EL = V.add(W.shoulder_l.p, V.scale(V.norm(Q.rot(W.spine_t6.q, [ELBOW_T6[0], ELBOW_T6[1], -ELBOW_T6[2]])), L.UA));
  const thR = V.scale(b.ax, -1);   // overhand: right thumb toward the midline
  const q = W6.armsOnBarBoth(p, grips.r, grips.l, { palm: fwd, thumb: thR, elbow: ER, elbowL: EL, elbowW: 0.3, dirW: 1.5, ax: b.ax, left: { palm: [fwd[0], fwd[1], -fwd[2]], thumb: [-thR[0], -thR[1], thR[2]] }, guesses: [[-20, 20, -120, 135, 0], [-30, 40, -100, 130, 60], [0, 50, -110, 120, 0], [-40, 50, -60, 130, 0]] }, state);
  return X.wrapBody(q);
}
// keys: middle, right turn, middle, left turn (each solved from the previous key's arms)
const TH = [0, 0.25, 0.5, 0.75, 1].map((f) => r1(ROT * f));
const poses = {};
poses.m = at(0);
TH.slice(1).forEach((t, i) => { poses[`r${i + 1}`] = at(t); });
state.keep = false; poses.m2 = at(0);
TH.slice(1).forEach((t, i) => { poses[`l${i + 1}`] = at(-t); });
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, [p.start, p.end]])), D = meta.timeline.duration;
const FS = [0, 0.25, 0.5, 0.75, 1];
const names = (s) => ['m', `${s}1`, `${s}2`, `${s}3`, `${s}4`];
const ek = (s, t0, t1, rev) => X.eased('k', FS, t0, t1, rev).map((k) => ({ t: k.t, pose: names(s)[+k.pose.slice(1)] }));
const keyframes = [{ t: 0, pose: 'm' }, ...ek('r', ph.right[0], ph.right[1]), ...ek('r', ph.back1[0], ph.back1[1], true).slice(1), ...ek('l', ph.left[0], ph.left[1]).slice(1), ...ek('l', ph.back2[0], ph.back2[1], true).slice(1)];
if (keyframes[keyframes.length - 1].t < D) keyframes.push({ t: D, pose: 'm' });
const ex = H.module_(meta, contacts, poses, keyframes);
ex.props = [BB.barbellProp({ plateD: PLATE_D })];
delete poses.m2;
const SKIP = /^(hand|thumb|forearm)_|^traps_|^chest$|^neck$/;
const sw = BB.sweep(ex, { skip: SKIP, fixed: ['ankle_r', 'ankle_l', 'pelvis'] });
const rest = BB.sweep(ex, {}, 200).barBody;
const Wm = L.fk(poses.m, contacts), Wr = L.fk(poses.r4, contacts);
const shAng = (W) => Math.atan2(-(W.shoulder_r.p[0] - W.shoulder_l.p[0]), W.shoulder_r.p[2] - W.shoulder_l.p[2]) * 180 / Math.PI;
const set = H.setKin(ex);
set('Trunk rotation', 'setup', 'Shoulders square to the front');
set('Trunk rotation', 'peak', `±${ROT}° of spine rotation (L5 ${r1(ROT * SPLIT.spine_l5)}°, T12 ${r1(ROT * SPLIT.spine_t12)}°, T6 ${r1(ROT * SPLIT.spine_t6)}°): shoulder line turned ≈${Math.round(Math.abs(shAng(Wr) - shAng(Wm)))}°; pelvis still`);
set('Bar position', 'setup', `High bar on the upper traps, ${GW} cm grip (handle centres), light ${PLATE_D} cm plates`); set('Bar position', 'peak', `Rides with the upper back; grip width ${sw.width[0]}-${sw.width[1]} cm`);
set('Tempo', 'setup', `Stand ${ph.setup[1]} s`); set('Tempo', 'peak', `${r1(ph.right[1] - ph.right[0])} s to each side, ${r1(ph.back1[1] - ph.back1[0])} s back to the middle`);
console.log(`Barbell Standing Twist: wrote ${L.write(ex)}\n  sweep ${JSON.stringify(sw)} trapsRest ${rest} gripErr ${state.err.toFixed(2)} shoulder turn ${r1(shAng(Wr) - shAng(Wm))}`);
if (sw.widthRange > 1.0 || state.err > 0.5) { console.error('FAIL: hands do not stay on the bar'); process.exitCode = 1; }
if (sw.barFloor < 0 || sw.barBody < 0 || rest < -1.5) { console.error('FAIL: bar through the body'); process.exitCode = 1; }
if (sw.slide > 0.05 || sw.drift > 0.05) { console.error('FAIL: planted feet move'); process.exitCode = 1; }
