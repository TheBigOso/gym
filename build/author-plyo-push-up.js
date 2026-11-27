// Plyo Push-up (GymVisual #130612): high plank, hands a little wider than the shoulders; lower under control, then push
// explosively so the hands leave the floor for a moment, land softly on the same spot with the elbows giving, and reset.
// Bilateral, one rep per loop. The feet stay planted (leg contacts, constant targets): the rigid body pivots on the balls of
// the feet. The palms are planted (weight 1, constant targets) except in flight: at take-off the contact hands over to FK
// arms (fitted to the planted arms, wrists included) over 0.06 s, the body rises on a ballistic arc with the hands a few cm
// up, and the contact takes over again at touch-down. Family b4-floorpush.js (batch 2 push-up solver).
const L = require('./lib');
const { r1, clone } = L;
const B = require('./families/b4-floorpush');
const H = require('./families/hips');
const meta = require('./meta/plyo-push-up.json');

const HAND_X = 46, HAND_Z = 25, BOT_CHEST = 12;
const RISE = 7;     // chest rise above the top position at the apex of the flight (cm)
const LIFT = 6;     // wrists this far above their planted height at the apex
const F = B.makePushG({ handY: 0, handZ: HAND_Z, ankleZ: 8, footTilt: -8, flarePole: [-1, 0.4, 0.45] });
const ph = meta.timeline.phases, P = ph.map((p) => p.end); // setup, lower, explode, flight, land, reset ends
const top = F.topKey(HAND_X, { topElbow: 8 }).pose, cTop = F.chestMinY(L.fk(top, F.contacts)), cBot = BOT_CHEST;
const at = (c, u) => F.key(HAND_X, { chestY: c, u }).pose;
const fly = (c, lift, u = 0) => F.freeArms(at(c, u), HAND_X, lift);
const ease = (f) => f * f * (3 - 2 * f);
const poses = { top }, keyframes = [];
const add = (t, name, pose) => { if (pose) poses[name] = pose; keyframes.push({ t: +t.toFixed(3), pose: name }); };
add(0, 'top'); add(P[0], 'top');
// lowering (controlled)
for (let i = 1; i <= 5; i++) { const f = ease(i / 5); add(P[0] + ((P[1] - P[0]) * i) / 5, i === 5 ? 'bottom' : `down${i}`, at(cTop + (cBot - cTop) * f, f)); }
// explode: fast extension back to straight arms (accelerating), take-off on the straight-arm pose
add(P[1] + 0.12, 'push1', at(cBot + (cTop - cBot) * 0.3, 0.75));
add(P[1] + 0.22, 'push2', at(cBot + (cTop - cBot) * 0.75, 0.35));
add(P[2], 'takeoff', clone(top));
// flight: FK arms, ballistic chest height (parabola through take-off, apex and touch-down)
const Tf = P[3] - P[2] - 0.04, tAp = P[2] + Tf / 2, h = (t) => { const x = (t - P[2]) / Tf; return 4 * RISE * x * (1 - x); };
const ts = [P[2] + 0.06, tAp - 0.03, tAp + 0.04, P[3] - 0.04];
ts.forEach((t, i) => { const x = (t - P[2]) / Tf, lift = LIFT * Math.min(1, 4 * x * (1 - x) * 1.05); add(t, `fly${i + 1}`, fly(cTop + h(t), +lift.toFixed(2), 0)); });
add(P[3], 'land', clone(top)); // planted again on the straight-arm pose
// absorb into a half push-up, then back to the top
add(P[3] + 0.22, 'absorb1', at(cTop + (cBot - cTop) * 0.3, 0.3));
add(P[4], 'absorb2', at(cTop + (cBot - cTop) * 0.42, 0.42));
add(P[4] + 0.35, 'rise1', at(cTop + (cBot - cTop) * 0.2, 0.2));
add(P[4] + 0.6, 'top'); add(meta.timeline.duration, 'top');

const ex = H.module_(meta, F.contacts, poses, keyframes);
const sw = F.sweep(ex, [], 1440), st = F.stats(top), sb = F.stats(poses.bottom);
const Wa = L.fk(poses.fly2, F.contacts);
const apexChest = F.chestMinY(Wa), apexWrist = Math.min(Wa.wrist_r.p[1], Wa.wrist_l.p[1]) - B.PALM;
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Elbow flexion', 'setup', `${d(st.elbow)} at the top (arms straight, not locked)`); set('Elbow flexion', 'peak', `${d(sb.elbow)} at the bottom (chest ${BOT_CHEST} cm above the floor)`);
set('Hand clearance', 'setup', 'Palms planted'); set('Hand clearance', 'peak', `Wrists about ${r1(apexWrist)} cm up and the chest ${r1(apexChest - cTop)} cm above its top position at the apex; about ${r1(P[3] - P[2])} s from take-off to touch-down`);
set('Body line', 'setup', `Trunk ${d(st.bodyAng)} above horizontal; bend ${st.bend.toFixed(1)}°`); set('Body line', 'peak', `Rigid through the flight (pivoting on the toes); trunk ${d(F.stats(poses.fly2).bodyAng)} at the apex`);
set('Force', 'setup', '–'); set('Force', 'peak', 'Not modelled (kinematics only)');
set('Hand width', 'setup', `Wrists ${2 * HAND_Z} cm apart (shoulder joints ${Math.round(st.shW)} cm)`); set('Hand width', 'peak', 'Hands land on the same spot');
set('Tempo', 'setup', `Top ${P[0]} s`); set('Tempo', 'peak', `${r1(P[1] - P[0])} s down, ${r1(P[2] - P[1])} s explosive push, ${r1(P[3] - P[2])} s in the air, ${r1(P[4] - P[3])} s landing, ${r1(meta.timeline.duration - P[4])} s reset`);
console.log(`Plyo Push-up: wrote ${L.write(ex)}\n  top elbow ${st.elbow.toFixed(0)} chest ${cTop.toFixed(1)}; bottom elbow ${sb.elbow.toFixed(0)} flare ${sb.flare.toFixed(0)}; apex chest +${(apexChest - cTop).toFixed(1)} wrist ${apexWrist.toFixed(1)}\n  sweep ${JSON.stringify(sw)}`);
if (sw.arm > 0.05 || sw.leg > 0.05) { console.error('FAIL: planted contact slides'); process.exitCode = 1; }
if (sw.floor < -0.5) { console.error('FAIL: below the floor'); process.exitCode = 1; }
