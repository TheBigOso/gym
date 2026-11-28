// Barbell Incline Shoulders Press (GymVisual #16937 "Barbell Incline Shoulders Press (male)"; page not readable here,
// movement from the name and standard coaching): a high-incline barbell press. Lying back on an adjustable bench with the back
// pad at 60 degrees (buttocks in the seat-pad crease, upper back and head on the pad, feet planted). Overhand grip a little
// wider than the shoulders (62 cm between the handle centres). From straight arms over the shoulders the bar lowers to the top
// of the chest just under the chin (forearms about vertical, elbows a little in front of the bar), touches lightly and is
// pressed straight back up over the shoulders. Stands at the head end. Bilateral. Family b6-01 (pressPath).
const L = require('./lib');
const { V, r1 } = L;
const C = require('./families/b3-chest');
const BB = require('./families/barbell');
const H = require('./families/hips');
const P5 = require('./families/b5-bbpress');
const F = require('./families/b6-01');
const meta = require('./meta/barbell-incline-shoulders-press.json');

const ANGLE = +(process.env.ANG ?? 60), GW = 62, BOTTOM_DX = +(process.env.BDX ?? 12), FLARE = +(process.env.FLARE ?? 45), DIP = +(process.env.DIP ?? 30), TOP_DX = +(process.env.TDX ?? 4);
const P = F.pressPath(meta, { angle: ANGLE, GW, bottomDX: BOTTOM_DX, topDX: TOP_DX, flare: FLARE, dip: DIP, foreW: 1.0, wristBot: -15, wristTop: -8, palm: P5.PALM, thumb: P5.THUMB, seeds: P5.SEEDS, chestSkip: /^(hand|thumb|forearm|upperarm|biceps|deltoid|triceps)_/ });
const { poses, keyframes, contacts, B, W0, S, cb, ct, T, foot } = P;
const ex = H.module_(meta, contacts, poses, keyframes);
const st = P5.stands(W0, ct);
ex.props = [B.prop, BB.barbellProp(), st.prop];
let head = { d: 1e9 };
const sw = BB.sweep(ex, { planted: ['leg_r', 'leg_l'], probe: (W) => { const c = P5.clearHead(W); if (c.d < head.d) head = c; } });
const Wt = L.fk(poses.top, contacts), Wb = L.fk(poses.bottom, contacts);
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Bench angle', 'setup', `Back pad ${ANGLE}°, seat flat`); set('Bench angle', 'peak', `Trunk ${Math.round(V.angle(V.sub(W0.neck_c7.p, W0.pelvis.p), [0, 1, 0]))}° from vertical`);
set('Grip width', 'setup', `${GW} cm between the handle centres (shoulder joints ${r1(2 * S[2])} cm apart)`); set('Grip width', 'peak', `Constant (${sw.width[0]}-${sw.width[1]} cm)`);
set('Elbow flexion', 'setup', `${d(BB.elbowOf(Wt, 'r'))} at the top`); set('Elbow flexion', 'peak', `${d(BB.elbowOf(Wb, 'r'))} with the bar at the top of the chest`);
set('Bar path', 'setup', `Top: over the shoulder joints, ${r1(ct[1] - S[1])} cm above them`); set('Bar path', 'peak', `Bottom: top of the chest ${r1(cb[1] - S[1])} cm from shoulder height; ${r1(V.len(V.sub(ct, cb)))} cm of travel; bar ${r1(head.d)} cm or more from the chin`);
set('Tempo', 'setup', `Top ${T.h} s`); set('Tempo', 'peak', `${r1(T.b - T.h)} s down, ${r1(T.p - T.b)} s touch, ${r1(T.r - T.p)} s up, ${r1(T.D - T.r)} s at the top`);
const tf = V.angle(V.sub(W0.neck_c7.p, W0.pelvis.p), [0, 1, 0]);
ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(tf - 3), max: Math.ceil(tf + 3) };
const lim = require('./families/b5-bbsquat').limits(ex);
console.log(`Barbell Incline Shoulders Press: wrote ${L.write(ex)}\n  bar bottom ${cb} top ${ct} S ${S.map(r1)} hooks ${st.x}/${st.hookY} feet ${foot}\n  bottom elbow ${BB.elbowOf(Wb, 'r').toFixed(0)} flare ${C.elbowFlare(Wb).toFixed(0)}; top elbow ${BB.elbowOf(Wt, 'r').toFixed(0)} head ${JSON.stringify(head)}\n  sweep ${JSON.stringify(sw)} gripErr ${P.gripWorst().toFixed(2)} keys ${Object.keys(poses).length} limits ${JSON.stringify(lim)}`);
if (sw.widthRange > 1.0 || P.gripWorst() > 0.5) { console.error('FAIL: hands do not stay on the bar at a constant grip width'); process.exitCode = 1; }
if (sw.barFloor < 0 || sw.barBody < 0 || head.d < 0) { console.error('FAIL: bar through the body or plates through the floor'); process.exitCode = 1; }
if (sw.slide > 0.05) { console.error('FAIL: planted feet slide'); process.exitCode = 1; }
if (Object.keys(lim).length) { console.error('FAIL: joint limits'); process.exitCode = 1; }
