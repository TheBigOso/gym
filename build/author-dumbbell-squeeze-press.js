// Dumbbell Squeeze Press (GymVisual #368112): lying on a flat bench, glutes on the seat, upper back and head on the pad, feet
// planted (leg contacts). Two dumbbells held with a neutral grip (palms facing each other) and pressed together, plates
// touching, over the chest; they lower together to just above the sternum with the elbows close to the body, then press
// straight up while still squeezing. Bilateral; the left arm mirrors the right. Lying base and dumbbell arm solve from
// b3-chest.js (benchBase, solveArmDB); the dumbbell centres follow a vertical line over the lower chest, 13.2 cm apart.
const L = require('./lib');
const { V, r1, clone } = L;
const C = require('./families/b3-chest');
const H = require('./families/hips');
const meta = require('./meta/dumbbell-squeeze-press.json');
const HALF_GAP = 6.7;   // dumbbell centre |z|: plates (6 cm radius) about 1.4 cm apart on the rig, i.e. pressed together on screen
const CLEAR = 4;        // bottom: plates this far above the highest point of the chest
const T = C.phaseT(meta), { B, base, contacts, foot } = C.benchBase(0);
const W0 = L.fk(base, contacts), F = C.trunkFrame(W0), ax = F.u;
const chestTop = Math.max(...['chest', 'pecs_r', 'ribcage'].map((id) => C.planePoint(W0, id, [0, -1, 0])[1]));
const X = r1(F.mid[0] + 10); // over the lower chest (toward the feet from the shoulder line)
const yBot = chestTop + CLEAR + 6;
const seeds = [{ shoulder_r: { plane: 30, elev: 60, axial: 0 }, elbow_r: { flex: 100 }, wrist_r: { pron: 0, flex: 0, dev: 0 } }, { shoulder_r: { plane: 60, elev: 80, axial: 40 }, elbow_r: { flex: 90 }, wrist_r: { pron: 60, flex: 0, dev: 0 } }, { shoulder_r: { plane: 20, elev: 70, axial: -40 }, elbow_r: { flex: 90 }, wrist_r: { pron: -40, flex: 0, dev: 0 } }];
const at = (y, prev) => C.solveArmDB(base, { c: [X, y, HALF_GAP], ax, seeds: prev ? [{ shoulder_r: prev.ch.shoulder_r, elbow_r: prev.ch.elbow_r, wrist_r: prev.ch.wrist_r }] : seeds, wristW: 0.1, extra: (W) => [Math.max(0, C.elbowFlare(W) - 45) * 0.1] }); // elbows tucked
// top: highest point with the elbow still a little soft (8 degrees)
let lo = yBot + 10, hi = yBot + 60;
const err = (q, y) => V.len(V.sub(C.dbAt(L.fk(q), 'r').c, [X, y, HALF_GAP]));
for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2, q = at(m); if (err(q, m) < 0.3 && C.elbowFlexOf(L.fk(q)) > 8) lo = m; else hi = m; }
const yTop = r1(lo);
const n = 6, path = []; let prev = null;
for (let i = 0; i <= n; i++) { const f = i / n, q = at(yBot + (yTop - yBot) * f, prev); prev = q; path.push({ f, pose: q }); }
const fin = (q) => C.mirrorArm(C.strip(q));
const P = path.map((k) => ({ f: k.f, pose: fin(k.pose) }));
const settle = fin(at(yBot + 0.6, path[0].pose));
const { poses, keyframes } = C.repKeys(P, T, settle);
const ex = H.module_(meta, contacts, poses, keyframes);
ex.props.find((p) => p.id === 'bench').center = B.prop.center;
const sw = C.sweep(ex, B, { grips: [{ side: 'r', grip: 'handle' }, { side: 'l', grip: 'handle' }] });
const Wt = L.fk(poses.top, contacts), Wb = L.fk(poses.bottom, contacts), set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
const costs = path.map((k, i) => +err(k.pose, yBot + (yTop - yBot) * k.f).toFixed(2)); // dumbbell centre error (cm)
set('Dumbbell contact', 'setup', `Plates ${r1(2 * HALF_GAP - 12)} cm apart (pressed together), handles along the body`); set('Dumbbell contact', 'peak', `Closest plate gap through the loop ${sw.dbGap} cm`);
set('Elbow flexion', 'setup', `${d(C.elbowFlexOf(Wt))} (straight, not locked)`); set('Elbow flexion', 'peak', `${d(C.elbowFlexOf(Wb))} at the bottom, plates ${CLEAR} cm above the chest`);
set('Elbow tuck', 'setup', 'Arms vertical over the chest'); set('Elbow tuck', 'peak', `${d(C.elbowFlare(Wb))} from the trunk at the bottom`);
set('Bench angle', 'setup', 'Flat (0°)'); set('Bench angle', 'peak', 'Glutes on the seat, upper back and head on the pad');
set('Knee flexion', 'setup', `${d(H.kneeOf(W0, 'r'))}, feet ${2 * foot[2]} cm apart`); set('Knee flexion', 'peak', 'Unchanged (feet planted)');
set('Tempo', 'setup', `Top ${T.h} s`); set('Tempo', 'peak', `${r1(T.b - T.h)} s down, ${r1(T.p - T.b)} s pause, ${r1(T.r - T.p)} s up, ${r1(T.D - T.r)} s squeeze at the top`);
const tf = V.angle(V.sub(W0.neck_c7.p, W0.pelvis.p), [0, 1, 0]);
ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(tf - 3), max: Math.ceil(tf + 3) };
console.log(`Dumbbell Squeeze Press: wrote ${L.write(ex)}\n  x ${X} y ${r1(yBot)}..${yTop} costs ${costs} top elbow ${C.elbowFlexOf(Wt).toFixed(0)} bottom elbow ${C.elbowFlexOf(Wb).toFixed(0)} flare ${C.elbowFlare(Wb).toFixed(0)}\n  sweep ${JSON.stringify(sw)}`);
if (sw.slide > 0.05) { console.error('FAIL: planted foot slides'); process.exitCode = 1; }
if (sw.dbBody > 0.5 || sw.dbBench > 0 || sw.dbFloor < 0 || sw.dbGap < -0.3 || sw.bodyBench > 2.5 || Math.max(...costs) > 0.5) { console.error('FAIL: dumbbell or body collision / unsolved key'); process.exitCode = 1; }
