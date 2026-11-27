// Barbell Incline Close Grip Bench Press (GymVisual #11208, Barbell Incline Close Grip Bench Press): lying back on an adjustable
// bench with the back pad at 30 degrees (the incline dumbbell press base: buttocks in the seat-pad crease, upper back and
// head on the pad, shoulder blades back and down, feet planted). Overhand grip about shoulder width (36 cm between the
// handle centres). From straight arms over the shoulders the bar lowers to the upper chest with the elbows tucked about 25
// degrees from the trunk, touches lightly and is pressed back up over the shoulders. Bench-press stands at the head end.
// Bilateral. Family b5-bbpress.js (lyingPress).
const L = require('./lib');
const { V, r1 } = L;
const C = require('./families/b3-chest');
const BB = require('./families/barbell');
const H = require('./families/hips');
const F = require('./families/b5-bbpress');
const meta = require('./meta/barbell-incline-close-grip-bench-press.json');

const ANGLE = 30, GW = 36, BOTTOM_DX = +(process.env.BDX ?? 18), FLARE = +(process.env.FLARE ?? 22), DIP = +(process.env.DIP ?? 38);
const P = F.lyingPress(meta, { angle: ANGLE, GW, bottomDX: BOTTOM_DX, flare: FLARE, dip: DIP, foreW: 1.0, wristBot: -15, wristTop: -8 });
const { poses, keyframes, contacts, B, W0, S, cb, ct, T, foot } = P;
const ex = H.module_(meta, contacts, poses, keyframes);
const st = F.stands(W0, ct);
ex.props = [B.prop, BB.barbellProp(), st.prop];
const sw = BB.sweep(ex, { planted: ['leg_r', 'leg_l'], probe: (W, pz, t, o) => { o.flareMax = Math.max(o.flareMax || 0, +C.elbowFlare(W).toFixed(1)); } });
const Wt = L.fk(poses.top, contacts), Wb = L.fk(poses.bottom, contacts), fit = C.benchFit(B, W0);
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Bench angle', 'setup', `Back pad ${ANGLE}°, seat flat`); set('Bench angle', 'peak', `Buttocks in the crease, upper back and head on the pad (rig shapes); trunk ${Math.round(V.angle(V.sub(W0.neck_c7.p, W0.pelvis.p), [0, 1, 0]))}° from vertical`);
set('Grip width', 'setup', `${GW} cm between the handle centres (shoulder joints ${r1(2 * S[2])} cm apart)`); set('Grip width', 'peak', `Constant (${sw.width[0]}-${sw.width[1]} cm over the loop)`);
set('Elbow flexion', 'setup', `${d(BB.elbowOf(Wt, 'r'))} at the top (arms straight, not locked)`); set('Elbow flexion', 'peak', `${d(BB.elbowOf(Wb, 'r'))} with the bar on the chest`);
set('Elbow tuck', 'setup', 'Arms vertical over the shoulders'); set('Elbow tuck', 'peak', `${d(C.elbowFlare(Wb))} from the trunk at the bottom; upper arms ${d(C.armDip(Wb))} below the back plane, wrists extended ${d(-poses.bottom.ch.wrist_r.flex)}`);
set('Bar path', 'setup', `Top: over the shoulder joints, ${r1(ct[1] - B.top)} cm above the bench`); set('Bar path', 'peak', `Bottom: upper chest, ${BOTTOM_DX} cm toward the feet from the shoulder joints; ${r1(ct[1] - cb[1])} cm of travel`);
set('Knee flexion', 'setup', `${d(H.kneeOf(W0, 'r'))}, feet ${2 * foot[2]} cm apart`); set('Knee flexion', 'peak', 'Unchanged (feet planted)');
set('Tempo', 'setup', `Top ${T.h} s`); set('Tempo', 'peak', `${r1(T.b - T.h)} s down, ${r1(T.p - T.b)} s touch, ${r1(T.r - T.p)} s up, ${r1(T.D - T.r)} s at the top`);
const tf = V.angle(V.sub(W0.neck_c7.p, W0.pelvis.p), [0, 1, 0]);
ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(tf - 3), max: Math.ceil(tf + 3) };
console.log(`Barbell Incline Close Grip Bench Press: wrote ${L.write(ex)}\n  bench ${JSON.stringify(fit)} bar bottom ${cb} top ${ct} hooks ${st.x}/${st.hookY}\n  bottom elbow ${BB.elbowOf(Wb, 'r').toFixed(0)} flare ${C.elbowFlare(Wb).toFixed(0)} dip ${C.armDip(Wb).toFixed(0)} wrist ${poses.bottom.ch.wrist_r.flex}; top elbow ${BB.elbowOf(Wt, 'r').toFixed(0)}\n  sweep ${JSON.stringify(sw)} gripErr ${P.gripWorst().toFixed(2)}`);
if (sw.widthRange > 1.0 || P.gripWorst() > 0.5) { console.error('FAIL: hands do not stay on the bar at a constant grip width'); process.exitCode = 1; }
if (sw.barFloor < 0 || sw.barBody < 0) { console.error('FAIL: bar through the body or plates through the floor'); process.exitCode = 1; }
if (sw.slide > 0.05) { console.error('FAIL: planted feet slide'); process.exitCode = 1; }
