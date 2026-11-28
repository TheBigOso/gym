// Kettlebell Alternating Press on Floor (GymVisual 13771, movement reference only): lying on the mat, knees bent and feet
// flat (planted leg contacts), a kettlebell in each hand by the handle, palms toward the feet, both arms pressed up over the
// chest. The right bell lowers with the elbow about 45 degrees from the trunk and the forearm vertical until the back of
// the upper arm rests on the floor, pauses, and presses back up while the left arm stays locked out; then the left does the
// same. Press keys are the dumbbell floor press solve (b4-floorpush lieFloor, b3-chest pressPath; the bottom depth is
// solved so the arm shapes rest on the floor); each half of the loop moves one arm along that path and holds the other at
// the top. Alternating (bilateral loop).
const L = require('./lib');
const { V, r1, clone } = L;
const B = require('./families/b4-floorpush');
const C = require('./families/b3-chest');
const H = require('./families/hips');
const X = require('./families/b6-12');
const EQ = require('./families/equip');
const meta = require('./meta/kettlebell-alternating-press-on-floor.json');

const FLARE = 45, N = 6;
const { base, contacts, foot } = B.lieFloor();
const W0 = L.fk(base, contacts), F = C.trunkFrame(W0), ax = V.scale(F.w, -1);
const topTilt = [0.03, 1, 0.12];
const bottomAt = (dip) => C.pressPath(base, { flare: FLARE, dip, topDir: topTilt, ax, n: 1 })[0].pose;
const DIP = r1(B.bisect((dip) => B.armMinY(L.fk(bottomAt(dip), contacts)) - 0.05, 0, 35));
const path = C.pressPath(base, { flare: FLARE, dip: DIP, topDir: topTilt, ax, n: N }).map((k) => C.strip(k.pose)); // index 0 = bottom, N = top
const settle = C.strip(C.pressPath(base, { flare: FLARE, dip: DIP - 1.2, topDir: topTilt, ax, n: 1 })[0].pose);
const ARM = ['sc', 'shoulder', 'elbow', 'wrist'];
// combine: right arm from pose a (its right channels), left arm from pose b (its right channels copied to the left)
const combine = (a, b) => { const q = clone(a); for (const j of ARM) if (b.ch[`${j}_r`]) q.ch[`${j}_l`] = clone(b.ch[`${j}_r`]); q.ik = clone(base.ik); return q; };
const top = path[N], poses = { top: combine(top, top) };
for (let i = 0; i < N; i++) { poses[`R${i}`] = combine(path[i], top); poses[`L${i}`] = combine(top, path[i]); }
poses.Rhold = combine(settle, top); poses.Lhold = combine(top, settle);
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p])), D = meta.timeline.duration;
const fr = Array.from({ length: N - 1 }, (_, k) => (k + 1) / N); // 1/6 .. 5/6
const down = (s, t0, t1) => X.easeTimes(fr, t0, t1).map((t, k) => ({ t, pose: `${s}${N - 1 - k}` }));
const up = (s, t0, t1) => X.easeTimes(fr, t0, t1).map((t, k) => ({ t, pose: `${s}${k + 1}` }));
const side = (s) => [...down(s, ph[`lower${s}`].start, ph[`lower${s}`].end), { t: ph[`lower${s}`].end, pose: `${s}0` }, { t: +((ph[`pause${s}`].start + ph[`pause${s}`].end) / 2).toFixed(3), pose: `${s}hold` },
  { t: ph[`pause${s}`].end, pose: `${s}0` }, ...up(s, ph[`press${s}`].start, ph[`press${s}`].end), { t: ph[`press${s}`].end, pose: 'top' }];
const keyframes = [{ t: 0, pose: 'top' }, { t: ph.lowerR.start, pose: 'top' }, ...side('R'), ...side('L'), { t: D, pose: 'top' }];
const ex = H.module_(meta, contacts, poses, keyframes);
ex.props = [X.kbProp('r'), X.kbProp('l')];
// loop checks: floor, feet, bells vs the floor and the body, the two bells apart, the lowered arm resting on the floor
let gap = 1e9, armFloor = 1e9;
const rep = X.scan(ex, { planted: ['leg_r', 'leg_l'], kb: ['r', 'l'], probe: (W) => {
  const a = EQ.kettlebellAt(W, 'r'), b = EQ.kettlebellAt(W, 'l'); gap = Math.min(gap, V.len(V.sub(a.c, b.c)) - a.r - b.r);
  armFloor = Math.min(armFloor, B.armMinY(W));
} });
const Wt = L.fk(poses.top, contacts), Wb = L.fk(poses.R0, contacts), set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Elbow flexion', 'setup', `${d(C.elbowFlexOf(Wt))} (arms straight, not locked)`); set('Elbow flexion', 'peak', `${d(C.elbowFlexOf(Wb))} with the upper arm on the floor`);
set('Elbow flare', 'setup', 'Arms vertical over the shoulders'); set('Elbow flare', 'peak', `${d(C.elbowFlare(Wb))} from the trunk at the bottom`);
set('Holding arm', 'setup', 'Both arms straight'); set('Holding arm', 'peak', `Left arm straight over the shoulder (${d(X.elbowAng(Wb, 'l'))} elbow) while the right is down; then the reverse`);
set('Upper arm on the floor', 'setup', '–'); set('Upper arm on the floor', 'peak', `Arm shapes ${r1(B.armMinY(Wb))} cm above the floor (resting)`);
set('Knee flexion', 'setup', `${d(H.kneeOf(W0, 'r'))}, feet ${2 * foot[2]} cm apart`); set('Knee flexion', 'peak', 'Unchanged (feet planted)');
set('Tempo', 'setup', `Both up ${ph.setup.end} s`); set('Tempo', 'peak', `Per arm ${r1(ph.lowerR.end - ph.lowerR.start)} s down, ${r1(ph.pauseR.end - ph.pauseR.start)} s on the floor, ${r1(ph.pressR.end - ph.pressR.start)} s up`);
const tf = V.angle(V.sub(W0.neck_c7.p, W0.pelvis.p), [0, 1, 0]);
ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(tf - 3), max: Math.ceil(tf + 3) };
console.log(`Kettlebell Alternating Press on Floor: wrote ${L.write(ex)}\n  dip ${DIP} elbow ${r1(C.elbowFlexOf(Wt))}/${r1(C.elbowFlexOf(Wb))} flare ${r1(C.elbowFlare(Wb))} bell gap ${r1(gap)} armFloor ${r1(armFloor)}\n  ${JSON.stringify(rep)}`);
X.gate('kettlebell-alternating-press-on-floor', rep, poses, { extra: [gap < 1 && `bells collide (${r1(gap)} cm)`, armFloor < -0.5 && 'arm through the floor'] });
