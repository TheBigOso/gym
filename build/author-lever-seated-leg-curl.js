// Lever Seated Leg Curl (GymVisual; movement reference only, the page could not be read): seated leg curl machine (prop
// kind 'lever_machine', type leg_curl_seated), back on the pad, hands on the side handles, a hold-down roller on top of the
// thighs just above the knees. The lever pivot is put on the knee joint axis, so the roller behind the lower calves swings
// about the knees with the shins and never slides. From the legs nearly straight both knees bend to about 95 degrees,
// squeeze, and straighten under control. Bilateral, no planted contacts. Family build/families/gear-lever.js, gear-g3m.js.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const C = require('./families/eq-cable');
const EQ = require('./families/equip');
const GL = require('./families/gear-lever');
const G3 = require('./families/gear-g3m');
const meta = require('./meta/lever-seated-leg-curl.json');

const KNEE0 = 12, KNEE1 = 95, ROLLER_T = 0.82, ROLLER_R = 5;
const M0 = GL.machine('leg_curl_seated');
const st = GL.seated(M0, { knee: KNEE0, dorsi: 4, thighRise: 4 });
const base = clone(st.pose);
base.ch.neck_c7 = { rot: 0, flex: 2 }; base.ch.head_c1 = { rot: 0, flex: 4 };
const hs = G3.handsOnSide(base, [], { top: GL.seatTop(M0) });
const armed = hs.pose, Wa = L.fk(armed), grip = hs.grip;
// roller behind the lower calf (negative offset: behind a forward-pointing shank), pivot on the knee axis
const knee = GL.kneeAxis(Wa), sp = V.add(Wa.knee_r.p, V.scale(V.sub(Wa.ankle_r.p, Wa.knee_r.p), ROLLER_T));
const calfOff = r1(-EQ.pointShape(Wa, V.add(sp, [0, -30, 0]), 'shank_r') + 30 + ROLLER_R + 0.3);
const follow = { joints: ['knee_r', 'ankle_r'], t: ROLLER_T, off: -calfOff };
const tgt0 = (() => { const a = Wa.knee_r.p, b = Wa.ankle_r.p, p = V.add(a, V.scale(V.sub(b, a), ROLLER_T)); const d = V.norm([b[0] - a[0], b[1] - a[1], 0]); return V.add(p, [d[1] * calfOff, -d[0] * calfOff, 0]); })();
const holdX = r1(Wa.knee_r.p[0] + (Wa.hip_r.p[0] - Wa.knee_r.p[0]) * 0.22);
const holdY = r1(H.lowPoint ? Math.max(Wa.knee_r.p[1], Wa.hip_r.p[1]) + 9 + 6 : 0);
const M = GL.machine('leg_curl_seated', {
  pivot: [r1(knee[0]), r1(knee[1]), 0], end: [r1(tgt0[0]), r1(tgt0[1]), 0], armZ: 27, endSize: [40, ROLLER_R], follow, range: [-100, 5],
  pads: [{ c: [holdX, holdY, 0], size: [40, 12], kind: 'roller', post: false }, ...G3.sideBars(grip)],
});
const at = (k, dorsi) => { const p = clone(armed); p.ch.knee_r = { flex: k }; p.ch.knee_l = { flex: k }; p.ch.ankle_r = { dorsi }; p.ch.ankle_l = { dorsi }; return p; };
const poses = { ext: at(KNEE0, 4), curled: at(KNEE1, 0) };
const keyframes = [{ t: 0, pose: 'ext' }, { t: 0.5, pose: 'ext' }, { t: 1.7, pose: 'curled' }, { t: 2.3, pose: 'curled' }, { t: 4.6, pose: 'ext' }, { t: 5.0, pose: 'ext' }];
const ex = H.module_(meta, [], poses, keyframes);
ex.props = [M.prop, ...GL.handProps()];
const rep = GL.track(ex, M, { partSkip: { seat: /^(hand|thumb|forearm)_/, back: /^(hand|thumb|forearm)_/, pad0: /^(hand|thumb|forearm)_/ } });
GL.gate('lever-seated-leg-curl', rep, { maxOffArc: 0.6 });
C.limits(ex.poses);
const We = L.fk(poses.ext), Wc = L.fk(poses.curled), set = H.setKin(ex), d = G3.deg;
set('Knee flexion', 'setup', `${d(H.kneeOf(We, 'r'))} with the legs extended`); set('Knee flexion', 'peak', `${d(H.kneeOf(Wc, 'r'))} at the bottom of the curl`);
set('Knee axis', 'setup', `Lever pivot on the knee joint (${M.P.pivot[0]}, ${M.P.pivot[1]} cm)`); set('Knee axis', 'peak', `Roller within ${rep.arms.arm.offArc} cm of its arc`);
set('Roller', 'setup', `Behind the calves, ${Math.round(ROLLER_T * 100)}% of the way from knee to ankle`); set('Roller', 'peak', `Lever ${-rep.arms.arm.range[0]}° down`);
set('Hip', 'setup', `Seated, back on the ${M.P.back.angle}° pad, hips ${d(armed.ch.hip_r.flex)}; thigh roller above the knees`); set('Hip', 'peak', 'Unchanged');
set('Tempo', 'setup', 'Pause 0.5 s with the legs extended'); set('Tempo', 'peak', '1.2 s down, 0.6 s squeeze, 2.3 s up');
G3.fillDash(ex);
console.log(`Lever Seated Leg Curl: wrote ${L.write(ex)}\n  fit ${JSON.stringify(st.fit)} pivot ${M.P.pivot} end ${M.P.end} off ${calfOff}\n  ${JSON.stringify({ floor: rep.floor, arms: rep.arms, clear: rep.clear })}`);
