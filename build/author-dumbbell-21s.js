// Dumbbell 21s (GymVisual 13339; movement reference only, the page could not be read, so the movement follows the name
// and standard coaching): standing, a dumbbell in each hand, palms forward (supinated), elbows by the sides. A set is 7
// lower-half curls (straight arms to forearms level), 7 upper-half curls (forearms level to the top) and 7 full curls; the
// loop shows one rep of each block: lower half up and down, curl to halfway, upper half up and down, lower to straight
// arms, one full curl with a squeeze and a slow 2 s lowering. Same standing base and arm states as the dumbbell biceps
// curl (b3-curls.js). Bilateral.
const L = require('./lib');
const C = require('./families/b3-curls');
const H = require('./families/hips');
const meta = require('./meta/dumbbell-21s.json');

const BOT = { plane: 25, elev: 12, flex: 8, pron: 6 };
const TOP = { plane: 85, elev: 16, flex: 135, pron: 0 };
const SQZ = Object.assign({}, TOP, { flex: 137, elev: 17 });
const at = (f) => { const m = C.mixArm(BOT, TOP, f); m.flex = BOT.flex + (TOP.flex - BOT.flex) * f; return m; };
const fMid = (90 - BOT.flex) / (TOP.flex - BOT.flex); // forearms level: elbow at 90 degrees
const both = (a) => ({ r: a, l: a });
const { contacts, poses } = C.standing({ bottom: both(BOT), q1: both(at(fMid / 2)), mid: both(at(fMid)), q3: both(at((fMid + 1) / 2)), top: both(TOP), squeeze: both(SQZ) });
const ph = (id) => C.phase(meta, id);
const keyframes = [{ t: 0, pose: 'bottom' }, { t: ph('lowUp').start, pose: 'bottom' }, { t: ph('lowUp').end, pose: 'mid' }, { t: ph('lowDown').end, pose: 'bottom' },
  { t: ph('toMid').end, pose: 'mid' }, { t: 3.05, pose: 'q3' }, { t: ph('upUp').end, pose: 'top' }, { t: ph('upDown').end, pose: 'mid' }, { t: ph('toBottom').end, pose: 'bottom' },
  { t: 5.5, pose: 'mid' }, { t: ph('fullUp').end, pose: 'top' }, { t: ph('squeeze').end, pose: 'squeeze' }, { t: 7.0, pose: 'q3' }, { t: 7.6, pose: 'q1' },
  { t: ph('fullDown').end, pose: 'bottom' }, { t: meta.timeline.duration, pose: 'bottom' }];
const ex = C.assemble(meta, { contacts, poses, keyframes });
const rep = C.loopCheck(ex), Wb = L.fk(poses.bottom, contacts), Wm = L.fk(poses.mid, contacts), Wt = L.fk(poses.squeeze, contacts);
C.fillCurlKin(ex, Wb, Wt, poses.bottom, poses.squeeze, 'r', ['Arms straight 0.5 s', 'Half reps 0.7 s up / 0.8 s down; full rep 1.2 s up, 0.2 s squeeze, 2 s down']);
C.setKin(ex, 'Partial ranges', 'setup', `Lower half: ≈${Math.round(C.elbowFlex(Wb, 'r'))}° to ≈${Math.round(C.elbowFlex(Wm, 'r'))}° (forearms level)`);
C.setKin(ex, 'Partial ranges', 'peak', `Upper half: ≈${Math.round(C.elbowFlex(Wm, 'r'))}° to ≈${Math.round(C.elbowFlex(Wt, 'r'))}°; full rep ≈${Math.round(C.elbowFlex(Wb, 'r'))}° to ≈${Math.round(C.elbowFlex(Wt, 'r'))}°`);
console.log(`Dumbbell 21s: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}`);
if (rep.slide > 0.05) { console.error('FAIL: planted foot slides'); process.exitCode = 1; }
if (rep.body.d < 0 || rep.dbFloor < 0) { console.error('FAIL: dumbbell passes into the body or the floor'); process.exitCode = 1; }
