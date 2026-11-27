// Dumbbell Alternate Biceps Curl (GymVisual #028512): standing, dumbbells at the sides with neutral palms. The right arm
// curls while supinating (neutral at the bottom, palm up at the top) and lowers back to neutral; then the left. The idle
// arm hangs still. One 8.4 s loop holds one right and one left rep. Bilateral (both sides authored).
const L = require('./lib');
const C = require('./families/b3-curls');
const meta = require('./meta/dumbbell-alternate-biceps-curl.json');

const BOT = { plane: 20, elev: 10, flex: 8, pron: 85 };
const TOP = { plane: 85, elev: 16, flex: 135, pron: 0 };
const SQZ = Object.assign({}, TOP, { flex: 137, elev: 17, pron: -5 });
// Supination leads a little on the way up (palm mostly turned by mid-range) and returns late on the way down
const up = (f, g) => { const m = C.mixArm(BOT, TOP, f); m.pron = BOT.pron + (TOP.pron - BOT.pron) * g; return m; };
const P = { bottom: { r: BOT, l: BOT } };
const ph = (id) => C.phase(meta, id);
const kf = [{ t: 0, pose: 'bottom' }];
for (const [s, o, u, tp, dn] of [['r', 'l', 'rightUp', 'rightTop', 'rightDown'], ['l', 'r', 'leftUp', 'leftTop', 'leftDown']]) {
  const set = (name, a) => { P[name] = { [s]: a, [o]: BOT }; return name; };
  const t0 = s === 'r' ? ph(u).start : 4.2, t1 = ph(tp).start, t2 = ph(tp).end, t3 = ph(dn).end;
  kf.push({ t: t0, pose: 'bottom' }, { t: +(t0 + (t1 - t0) * 0.5).toFixed(2), pose: set(`${s}Up50`, up(0.5, 0.7)) }, { t: t1, pose: set(`${s}Top`, TOP) }, { t: t2, pose: set(`${s}Squeeze`, SQZ) },
    { t: +(t2 + (t3 - t2) * 0.4).toFixed(2), pose: set(`${s}Down60`, up(0.6, 0.75)) }, { t: +(t2 + (t3 - t2) * 0.75).toFixed(2), pose: set(`${s}Down25`, up(0.25, 0.35)) }, { t: t3, pose: 'bottom' });
}
kf.push({ t: meta.timeline.duration, pose: 'bottom' });
const { contacts, poses } = C.standing(P);
const ex = C.assemble(meta, { contacts, poses, keyframes: kf });
const rep = C.loopCheck(ex), Wb = L.fk(poses.bottom, contacts), Wt = L.fk(poses.rSqueeze, contacts);
C.fillCurlKin(ex, Wb, Wt, poses.bottom, poses.rSqueeze, 'r', ['Arms straight 0.5 s', 'Per arm: 1.1 s up, 0.2 s squeeze, 2.0 s down; right rep then left rep']);
console.log(`Dumbbell Alternate Biceps Curl: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}`);
if (rep.slide > 0.05) { console.error('FAIL: planted foot slides'); process.exitCode = 1; }
if (rep.body.d < 0 || rep.dbFloor < 0) { console.error('FAIL: dumbbell passes into the body or the floor'); process.exitCode = 1; }
