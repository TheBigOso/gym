// Close-Grip Dumbbell Press (GymVisual #029612): lying on a flat bench, glutes on the seat, upper back and head on the pad,
// feet planted (leg contacts). Neutral grip with the two dumbbells pressed together along their length (handles along the
// trunk, plates touching). They lower together to the middle of the chest with the elbows tucked close to the ribs and
// press back up over the chest. Bilateral; the left arm mirrors the right (dumbbell centres at z = ±HALF). Family
// b4-benchpress.js / b3-chest.js.
const L = require('./lib');
const { V, R, r1, clone } = L;
const C = require('./families/b3-chest');
const H = require('./families/hips');
const P = require('./families/b4-benchpress');
const meta = require('./meta/close-grip-dumbbell-press.json');

const HALF = 6.6;             // dumbbell centre off the midline: plates (12 cm) about 1 cm apart, i.e. visibly touching on the mesh
const TOP_ELBOW = 8, N = 6;
const T = C.phaseT(meta), { B, base, contacts, foot } = C.benchBase(0);
const W0 = L.fk(base, contacts), F = C.trunkFrame(W0), ax = F.u, S = W0.shoulder_r.p;
// Chest surface over the sternum: highest point of the chest / pec shapes in the band of x between the nipples and the xiphoid
const chestTop = Math.max(...L.rig.shapes.filter((s) => /^(chest|pecs_[rl]|ribcage)$/.test(s.id)).map((s) => P.d0 && require('./families/b3-triceps').extremePt(W0, s, [0, 1, 0])[1]));
const BOT_X = S[0] + +(process.env.BOTX ?? 22), BOT_Y = chestTop + 6 + +(process.env.BOTY ?? 1.5); // plate radius 6 above the chest surface + a light touch gap
// Key solve: dumbbell centre at (x, y, HALF) with the handle along the trunk; the top key asks for a nearly straight elbow
// (y free), the others a centre height. Elbows kept under / outside the dumbbell (no crossing) by a soft forearm term.
function key(x, y, prev, elbow = null, flare = null, E = null) {
  const extra = (W, q) => {
    const d = C.dbAt(W, 'r');
    const r = [(d.c[0] - x) * 3, (d.c[2] - HALF) * 4, d.ax[2] * 20];
    if (flare != null) r.push((C.elbowFlare(W) - flare) * 0.3);
    if (E) r.push(...V.sub(W.elbow_r.p, E).map((v) => v * 0.25));
    if (y != null) r.push((d.c[1] - y) * 3);
    r.push(Math.min(0, W.elbow_r.p[2] - (HALF + 4)) * 3); // elbow outside the hand line
    if (prev) r.push((q.ch.wrist_r.pron - prev.ch.wrist_r.pron) * 0.01, (q.ch.shoulder_r.axial - prev.ch.shoulder_r.axial) * 0.01);
    return r;
  };
  return C.solveArmDB(base, { c: null, ax, extra, elbowFlex: elbow, seeds: prev ? [{ shoulder_r: prev.ch.shoulder_r, elbow_r: prev.ch.elbow_r, wrist_r: prev.ch.wrist_r }] : C.ARM_SEEDS.concat([{ shoulder_r: { plane: 20, elev: 60, axial: 30 }, elbow_r: { flex: 100 }, wrist_r: { pron: 60, flex: 0, dev: 0 } }]) });
}
const TUCK = +(process.env.TUCK ?? 35);
const topX = S[0] + 4, top0 = key(topX, null, null, TOP_ELBOW);
const bot = key(BOT_X, BOT_Y, null, null, TUCK);
const top = key(topX, null, bot, TOP_ELBOW);
const topFlare = C.elbowFlare(L.fk(top, contacts));
const uaDir = (q) => { const W = L.fk(q, contacts); return V.norm(V.sub(W.elbow_r.p, W.shoulder_r.p)); }, dBot = uaDir(bot), dTop = uaDir(top);
console.log('  top0 cost', top0.__cost.toFixed(3), 'top cost', top.__cost.toFixed(3), 'bot cost', bot.__cost.toFixed(3), 'top flare', topFlare.toFixed(1), JSON.stringify(bot.ch.shoulder_r), JSON.stringify(top.ch.shoulder_r));
const topY = C.dbAt(L.fk(top, contacts), 'r').c[1];
const ease = (f) => f; // even spacing; monotone cubic interpolation smooths it
const path = []; let prev = bot;
for (let i = 0; i <= N; i++) {
  const f = i / N, x = BOT_X + (topX - BOT_X) * ease(f), y = BOT_Y + (topY - BOT_Y) * ease(f);
  const q = i === 0 ? bot : i === N ? top : key(x, y, prev, null, null, V.add(S, V.scale(C.slerpV(dBot, dTop, f), L.UA)));
  path.push({ f, pose: C.mirrorArm(C.strip(q)), cost: q.__cost }); prev = q;
}
const settle = C.mirrorArm(C.strip(key(BOT_X, BOT_Y + 0.6, bot, null, TUCK)));
const { poses, keyframes } = C.repKeys(path, T, settle);
const ex = H.module_(meta, contacts, poses, keyframes);
ex.props.find((p) => p.id === 'bench').center = B.prop.center;
let tuck = 0;
const sw = C.sweep(ex, B, { grips: [{ side: 'r', grip: 'handle' }, { side: 'l', grip: 'handle' }], probe: (W) => { tuck = Math.max(tuck, C.elbowFlare(W)); } });
const Wt = L.fk(poses.top, contacts), Wb = L.fk(poses.bottom, contacts), set = H.setKin(ex), d = P.d0;
const dbT = C.dbAt(Wt, 'r'), dbB = C.dbAt(Wb, 'r');
set('Grip', 'setup', `Neutral, dumbbells together: centres ${r1(2 * HALF)} cm apart (plates about ${r1(sw.dbGap)} cm apart at the closest)`); set('Grip', 'peak', 'Unchanged through the rep');
set('Elbow flexion', 'setup', `${d(C.elbowFlexOf(Wt))} (arms straight over the chest)`); set('Elbow flexion', 'peak', `${d(C.elbowFlexOf(Wb))} with the dumbbells on the chest`);
set('Elbow tuck', 'setup', 'Arms angled in over the chest'); set('Elbow tuck', 'peak', `${d(C.elbowFlare(Wb))} from the trunk at the bottom`);
set('Dumbbell path', 'setup', `Top: centres ${r1(dbT.c[1] - S[1])} cm above the shoulder joints, ${r1(dbT.c[0] - S[0])} cm toward the feet`); set('Dumbbell path', 'peak', `Bottom: plates ${r1(BOT_Y - 6 - chestTop)} cm above the mid-chest surface (rig shapes), ${r1(dbB.c[0] - S[0])} cm below the shoulder line; rise ${r1(dbT.c[1] - dbB.c[1])} cm`);
set('Knee flexion', 'setup', `${d(H.kneeOf(W0, 'r'))}, feet ${2 * foot[2]} cm apart`); set('Knee flexion', 'peak', 'Unchanged (feet planted)');
set('Tempo', 'setup', `Top ${T.h} s`); set('Tempo', 'peak', `${r1(T.b - T.h)} s down, ${r1(T.p - T.b)} s on the chest, ${r1(T.r - T.p)} s up, ${r1(T.D - T.r)} s at the top`);
P.finish(ex, 'Close-Grip Dumbbell Press', { W0, sw, fit: C.benchFit(B, W0) }, `chestTop ${r1(chestTop)} elbow ${r1(C.elbowFlexOf(Wt))}/${r1(C.elbowFlexOf(Wb))} flare max ${r1(tuck)} costs ${path.map((k) => k.cost.toFixed(3)).join(',')}`, { dbGapMin: 0 });
