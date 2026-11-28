// Lever Kneeling Leg Curl (plate loaded) (GymVisual; movement reference only, the page could not be read): kneeling leg
// curl machine (prop kind 'lever_machine', type leg_curl_seated re-fitted: raised knee pad, forearm pads, thigh pad, one
// lever with a heel roller and plates on its horn; only the right lever is drawn, params.only 'r'). The left knee and shin
// rest on the knee pad, the forearms on the arm pads with the trunk inclined forward, and the front of the right thigh
// against the thigh pad. The lever pivot is put on the right knee joint axis, so the roller behind the right lower calf
// swings with the shin. The right knee curls from about 35 to 125 degrees and lowers. Authored on the right side.
// Family build/families/gear-lever.js, gear-g3m.js.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const C = require('./families/eq-cable');
const EQ = require('./families/equip');
const GL = require('./families/gear-lever');
const G3 = require('./families/gear-g3m');
const meta = require('./meta/lever-kneeling-leg-curl-plate-loaded.json');

const PITCH = -52, KNEE0 = 35, KNEE1 = 125, ROLLER_T = 0.84, ROLLER_R = 5, PAD_Y = 58;
const body = (y, x = 0) => {
  const p = clone(L.POSES.standing({ stance: 10, toeOut: 0 }).pose); delete p.ik;
  p.root.pos = [x, y, 0]; p.root.rot = { pitch: PITCH };
  for (const j of ['spine_l5', 'spine_t12', 'spine_t6']) p.ch[j] = { rot: 0, flex: 2, latFlex: 0 };
  p.ch.neck_c7 = { rot: 0, flex: -10 }; p.ch.head_c1 = { rot: 0, flex: -8 };
  p.ch.hip_l = { flex: -PITCH + 2, abd: 0, rot: 0 }; p.ch.knee_l = { flex: 92 }; p.ch.ankle_l = { dorsi: -30 };
  p.ch.hip_r = { flex: -PITCH + 22, abd: 0, rot: 0 }; p.ch.knee_r = { flex: KNEE0 }; p.ch.ankle_r = { dorsi: 0 };
  p.ch.sc_r = { protract: 6, elevate: 0 }; p.ch.sc_l = clone(p.ch.sc_r);
  p.ch.shoulder_r = { plane: 90, elev: -PITCH + 4, axial: 0 }; p.ch.shoulder_l = clone(p.ch.shoulder_r);
  p.ch.elbow_r = { flex: 92 }; p.ch.elbow_l = clone(p.ch.elbow_r); p.ch.wrist_r = { pron: 90, flex: 0, dev: 0 }; p.ch.wrist_l = clone(p.ch.wrist_r);
  return p;
};
// root height: the left shin rests on the knee pad (top PAD_Y)
let lo = 40, hi = 160;
for (let i = 0; i < 40; i++) { const y = (lo + hi) / 2, W = L.fk(body(y)); if (Math.min(GL.planeClear(W, 'shank_l', [0, 1, 0], PAD_Y), GL.planeClear(W, 'calf_l', [0, 1, 0], PAD_Y)) > 0.3) hi = y; else lo = y; }
const base = body(r1((lo + hi) / 2 * 10) / 10), W0 = L.fk(base);
const bot = (id) => H.bottomOf(W0, id);
// pads fitted to the body: knee pad under the left shin, forearm pads under the forearms, thigh pad in front of the right thigh
const kl = W0.knee_l.p, al = W0.ankle_l.p, ew = (s) => V.scale(V.add(W0[`elbow_${s}`].p, W0[`wrist_${s}`].p), 0.5);
const foreY = r1(Math.min(bot('forearm_r'), bot('forearm_l')) - 3);
const tr = V.add(W0.knee_r.p, V.scale(V.sub(W0.hip_r.p, W0.knee_r.p), 0.25)), tdir = V.norm(V.sub(W0.hip_r.p, W0.knee_r.p)), tn = [tdir[1], -tdir[0], 0]; // tn: in front of the thigh
const tOff = 20 - Math.min(EQ.pointShape(W0, V.add(tr, V.scale(tn, 20)), 'thigh_r'), EQ.pointShape(W0, V.add(tr, V.scale(tn, 20)), 'quad_r'));
const tc = V.add(tr, V.scale(tn, tOff + 3.3)), tAng = r1((Math.atan2(tdir[1], tdir[0]) * 180) / Math.PI - 90);
// lever on the right knee axis, roller behind the lower calf
const knee = GL.kneeAxis(W0), sp = V.add(W0.knee_r.p, V.scale(V.sub(W0.ankle_r.p, W0.knee_r.p), ROLLER_T));
const sdir = V.norm(V.sub(W0.ankle_r.p, W0.knee_r.p)), back = [-sdir[1], sdir[0], 0].map((v) => -v); // behind the shin (opposite of +off)
const calfOff = r1(20 - EQ.pointShape(W0, V.add(sp, V.scale(back, 20)), 'shank_r') + ROLLER_R + 0.3);
const tgt0 = V.add(sp, V.scale(back, calfOff));
const M = GL.machine('leg_curl_seated', {
  arms: 'split', only: 'r', pivot: [r1(knee[0]), r1(knee[1]), 0], end: [r1(tgt0[0]), r1(tgt0[1]), r1(W0.ankle_r.p[2])], armZ: 24, endSize: [16, ROLLER_R],
  follow: { joints: ['knee_r', 'ankle_r'], t: ROLLER_T, off: -calfOff }, range: [-100, 5], seat: null, back: null, load: 'plates', stack: null, plateAt: 0.5,
  pads: [
    { c: [r1((kl[0] + al[0]) / 2), r1(PAD_Y - 4), r1(kl[2])], size: [44, 8, 16], kind: 'box', post: true },
    { c: [r1((ew('r')[0] + ew('l')[0]) / 2), r1(foreY - 0.5), 0], size: [30, 6, 50], kind: 'box', post: true },
    { c: tc.map(r1), size: [6.5, 22, 14], rot: [0, 0, tAng], kind: 'box', post: false },
  ],
});
const at = (k) => { const p = clone(base); p.ch.knee_r = { flex: k }; p.ch.ankle_r = { dorsi: k > 90 ? -10 : 0 }; return p; };
const poses = { ext: at(KNEE0), curled: at(KNEE1) };
const keyframes = [{ t: 0, pose: 'ext' }, { t: 0.5, pose: 'ext' }, { t: 1.7, pose: 'curled' }, { t: 2.3, pose: 'curled' }, { t: 4.6, pose: 'ext' }, { t: 5.0, pose: 'ext' }];
const ex = H.module_(meta, [], poses, keyframes);
ex.props = [M.prop];
const rep = GL.track(ex, M, { partSkip: { pad0: /^(foot|toe)_/, pad1: /^(hand|thumb)_/ } });
G3.gateArms('lever-kneeling-leg-curl-plate-loaded', rep, { maxOffArc: 0.6, ignore: ['arm_l'], ignoreParts: [/^arm_l:/] });
C.limits(ex.poses);
const We = L.fk(poses.ext), Wc = L.fk(poses.curled), set = H.setKin(ex), d = G3.deg;
set('Knee flexion', 'setup', `${d(H.kneeOf(We, 'r'))} with the leg extended`); set('Knee flexion', 'peak', `${d(H.kneeOf(Wc, 'r'))} at the top of the curl`);
set('Knee axis', 'setup', `Lever pivot on the right knee (${M.P.pivot[0]}, ${M.P.pivot[1]} cm)`); set('Knee axis', 'peak', `Roller within ${rep.arms.arm_r.offArc} cm of its arc`);
set('Roller', 'setup', `Behind the right calf, ${Math.round(ROLLER_T * 100)}% of the way from knee to ankle`); set('Roller', 'peak', `Lever ${-rep.arms.arm_r.range[0]}° up`);
set('Hip', 'setup', `Right hip ${d(base.ch.hip_r.flex)} (relative to the trunk), thigh on its pad; trunk ${-PITCH}° forward on the forearms`); set('Hip', 'peak', 'Unchanged');
set('Tempo', 'setup', 'Pause 0.5 s with the leg extended'); set('Tempo', 'peak', '1.2 s up, 0.6 s squeeze, 2.3 s down');
G3.fillDash(ex);
console.log(`Lever Kneeling Leg Curl (plate loaded): wrote ${L.write(ex)}\n  pivot ${M.P.pivot} end ${M.P.end} off ${calfOff}\n  ${JSON.stringify({ floor: rep.floor, arms: rep.arms, clear: rep.clear })}`);
