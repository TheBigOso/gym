// Barbell Incline Reverse Grip Press (GymVisual #22761 "Barbell Incline Reverse Grip Press"; page not readable here, movement
// from the name and standard coaching): lying back on an adjustable bench with the back pad at 30 degrees (the incline press
// base: buttocks in the seat-pad crease, upper back and head on the pad, shoulder blades back and down, feet planted).
// Underhand (supinated) grip a little wider than the shoulders (56 cm between the handle centres), palms toward the face,
// thumbs pointing out. From straight arms over the shoulders the bar lowers to the lower chest with the elbows tucked close to
// the trunk (about 20 degrees of flare), touches lightly and is pressed back up over the shoulders. Bench-press stands at the
// head end. Bilateral. Family b6-01 (pressPath: the b5-bbpress lying-press path with the hand orientation as an option).
const L = require('./lib');
const { V, r1 } = L;
const C = require('./families/b3-chest');
const BB = require('./families/barbell');
const H = require('./families/hips');
const P5 = require('./families/b5-bbpress');
const F = require('./families/b6-01');
const meta = require('./meta/barbell-incline-reverse-grip-press.json');

const ANGLE = 30, GW = 56, BOTTOM_DX = +(process.env.BDX ?? 22), FLARE = +(process.env.FLARE ?? 20), DIP = +(process.env.DIP ?? 40);
const PALM = V.norm([-1, 0.7, 0]), THUMB = [0, 0, 1];
const SEEDS = [];
for (const pr of [-150, -100, -60, -20, 20]) for (const [pl, el, ax] of [[0, 55, 0], [20, 70, -60], [10, 80, 60], [30, 60, 30]]) SEEDS.push([pl, el, ax, 100, pr]);
const P = F.pressPath(meta, { angle: ANGLE, GW, bottomDX: BOTTOM_DX, flare: FLARE, dip: DIP, foreW: 1.0, wristBot: -20, wristTop: -10, palm: PALM, thumb: THUMB, seeds: SEEDS, dirW: +(process.env.DW ?? 0.6), pron: -20 });
const { poses, keyframes, contacts, B, W0, S, cb, ct, T, foot } = P;
const ex = H.module_(meta, contacts, poses, keyframes);
const st = P5.stands(W0, ct);
ex.props = [B.prop, BB.barbellProp(), st.prop];
let thumbOut = 1;
const sw = BB.sweep(ex, { planted: ['leg_r', 'leg_l'], probe: (W, pz, t, o) => { o.flareMax = Math.max(o.flareMax || 0, +C.elbowFlare(W).toFixed(1)); thumbOut = Math.min(thumbOut, L.Q.rot(W.wrist_r.q, [0, 0, 1])[2]); } });
const Wt = L.fk(poses.top, contacts), Wb = L.fk(poses.bottom, contacts);
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Bench angle', 'setup', `Back pad ${ANGLE}°, seat flat`); set('Bench angle', 'peak', `Trunk ${Math.round(V.angle(V.sub(W0.neck_c7.p, W0.pelvis.p), [0, 1, 0]))}° from vertical`);
set('Grip', 'setup', `Underhand, ${GW} cm between the handle centres (shoulder joints ${r1(2 * S[2])} cm apart)`); set('Grip', 'peak', `Constant (${sw.width[0]}-${sw.width[1]} cm over the loop)`);
set('Elbow flexion', 'setup', `${d(BB.elbowOf(Wt, 'r'))} at the top`); set('Elbow flexion', 'peak', `${d(BB.elbowOf(Wb, 'r'))} with the bar on the chest`);
set('Elbow tuck', 'setup', 'Arms vertical over the shoulders'); set('Elbow tuck', 'peak', `${d(C.elbowFlare(Wb))} from the trunk at the bottom`);
set('Bar path', 'setup', `Top: over the shoulder joints, ${r1(ct[1] - B.top)} cm above the bench`); set('Bar path', 'peak', `Bottom: lower chest, ${BOTTOM_DX} cm toward the feet from the shoulder joints; ${r1(ct[1] - cb[1])} cm of travel`);
set('Tempo', 'setup', `Top ${T.h} s`); set('Tempo', 'peak', `${r1(T.b - T.h)} s down, ${r1(T.p - T.b)} s touch, ${r1(T.r - T.p)} s up, ${r1(T.D - T.r)} s at the top`);
const tf = V.angle(V.sub(W0.neck_c7.p, W0.pelvis.p), [0, 1, 0]);
ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(tf - 3), max: Math.ceil(tf + 3) };
const lim = require('./families/b5-bbsquat').limits(ex);
console.log(`Barbell Incline Reverse Grip Press: wrote ${L.write(ex)}\n  bar bottom ${cb} top ${ct} hooks ${st.x}/${st.hookY} feet ${foot}\n  bottom elbow ${BB.elbowOf(Wb, 'r').toFixed(0)} flare ${C.elbowFlare(Wb).toFixed(0)} wrist ${poses.bottom.ch.wrist_r.flex} pron ${poses.bottom.ch.wrist_r.pron}; top elbow ${BB.elbowOf(Wt, 'r').toFixed(0)} pron ${poses.top.ch.wrist_r.pron} thumbOut(min z) ${thumbOut.toFixed(2)}\n  sweep ${JSON.stringify(sw)} gripErr ${P.gripWorst().toFixed(2)} keys ${Object.keys(poses).length} limits ${JSON.stringify(lim)}`);
if (sw.widthRange > 1.0 || P.gripWorst() > 0.5) { console.error('FAIL: hands do not stay on the bar at a constant grip width'); process.exitCode = 1; }
if (sw.barFloor < 0 || sw.barBody < 0) { console.error('FAIL: bar through the body or plates through the floor'); process.exitCode = 1; }
if (sw.slide > 0.05) { console.error('FAIL: planted feet slide'); process.exitCode = 1; }
if (thumbOut < 0.3) { console.error('FAIL: not an underhand grip somewhere in the loop'); process.exitCode = 1; }
if (Object.keys(lim).length) { console.error('FAIL: joint limits'); process.exitCode = 1; }
