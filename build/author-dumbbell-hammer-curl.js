// Dumbbell Hammer Curl (GymVisual #031312): standing, neutral grip (palms facing in, thumbs up) the whole way. Both arms
// curl together with the elbows by the sides, short squeeze, slow 2.4 s lower. Bilateral.
const L = require('./lib');
const C = require('./families/b3-curls');
const meta = require('./meta/dumbbell-hammer-curl.json');

const BOT = { plane: 20, elev: 10, flex: 8, pron: 88 };
const TOP = { plane: 85, elev: 16, flex: 130, pron: 88 };
const SQZ = Object.assign({}, TOP, { flex: 132, elev: 17 });
const at = (f) => C.mixArm(BOT, TOP, f);
const both = (a) => ({ r: a, l: a });
const { contacts, poses } = C.standing({ bottom: both(BOT), up50: both(at(0.5)), top: both(TOP), squeeze: both(SQZ), down66: both(at(0.66)), down33: both(at(0.33)) });
const ph = (id) => C.phase(meta, id);
const keyframes = [{ t: 0, pose: 'bottom' }, { t: ph('lift').start, pose: 'bottom' }, { t: 1.2, pose: 'up50' }, { t: ph('top').start, pose: 'top' }, { t: ph('top').end, pose: 'squeeze' },
  { t: 2.9, pose: 'down66' }, { t: 3.7, pose: 'down33' }, { t: ph('lower').end, pose: 'bottom' }, { t: meta.timeline.duration, pose: 'bottom' }];
const ex = C.assemble(meta, { contacts, poses, keyframes });
const rep = C.loopCheck(ex), Wb = L.fk(poses.bottom, contacts), Wt = L.fk(poses.squeeze, contacts);
C.fillCurlKin(ex, Wb, Wt, poses.bottom, poses.squeeze, 'r', ['Arms straight 0.6 s', '1.2 s up, 0.3 s squeeze, 2.4 s down, 0.9 s at the bottom']);
console.log(`Dumbbell Hammer Curl: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}`);
if (rep.slide > 0.05) { console.error('FAIL: planted foot slides'); process.exitCode = 1; }
if (rep.body.d < 0 || rep.dbFloor < 0) { console.error('FAIL: dumbbell passes into the body or the floor'); process.exitCode = 1; }
