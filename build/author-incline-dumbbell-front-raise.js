// Incline Dumbbell Front Raise (GymVisual #117612): lying back on the adjustable bench with the back pad at 40 degrees,
// buttocks in the seat crease, upper back and head on the pad, feet planted (leg contacts). The arms start hanging straight
// down to the floor beside the bench, palms in (neutral grip, so the plates clear the pad), elbows soft; both arms rise
// forward in one arc until they point straight up over the shoulders: 2 s up, 0.4 s pause, 2.2 s down. Bilateral, handle
// grip. Lying base from the batch 3 chest family (pad / seat contact measured on the skinned mesh, b2/chest_mesh.mjs).
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const C = require('./families/b3-chest');
const S = require('./families/b4-shoulders2');
const meta = require('./meta/incline-dumbbell-front-raise.json');

const ANGLE = 40;
const { B, base, contacts, foot } = C.benchBase(ANGLE);
const W0 = L.fk(base, contacts), Sh = W0.shoulder_r.p, D2R = Math.PI / 180;
const FLEX = 12;
// Upper arm direction at arc angle th (deg, world: -90 = hanging down, 0 = horizontal toward the feet, 90 = straight up),
// tilted out by `out` (abduction, so the arms pass beside the bench pad); the forearm leads by FLEX degrees along the arc.
function armAt(th, out, guess, sc) {
  const p = clone(base); p.ch.sc_r = sc;
  const S0 = L.fk(p).shoulder_r.p, t = th * D2R, o = Math.tan(out * D2R);
  const d = V.norm([Math.cos(t), Math.sin(t), o]), tan = V.norm(V.sub([-Math.sin(t), Math.cos(t), 0], V.scale(d, V.dot([-Math.sin(t), Math.cos(t), 0], d))));
  const E = V.add(S0, V.scale(d, L.UA)), fd = V.add(V.scale(d, Math.cos(FLEX * D2R)), V.scale(tan, Math.sin(FLEX * D2R)));
  const Wt = V.add(E, V.scale(fd, L.FA));
  return F.solveArm(p, { wrist: Wt, elbow: E, wElbow: 1.5, palm: [0, 0, -1], wPalm: 4, guess });
}
const keysF = [['bottom', 0], ['r17', 1 / 6], ['r33', 2 / 6], ['r50', 3 / 6], ['r67', 4 / 6], ['r83', 5 / 6], ['top', 1]];
const OUT0 = Number(process.env.OUT0 ?? 20), OUT1 = Number(process.env.OUT1 ?? 6);
const poses = {}, err = {};
let g = { plane: -60, elev: 58, axial: 110, flex: FLEX, pron: 55 };
for (const [name, f] of keysF) {
  const k = f * f * (3 - 2 * f) * 0.3 + f * 0.7, th = -90 + 180 * k, out = OUT0 + (OUT1 - OUT0) * f;
  const q = armAt(th, out, g, { protract: r1(-6 + 12 * f), elevate: r1(-2 + 6 * f * f) });
  err[name] = q.__err; g = F.armGuess(q); poses[name] = F.mirrorArm(q);
}
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p]));
const at = (id, f) => +(ph[id].start + (ph[id].end - ph[id].start) * f).toFixed(3);
const keyframes = [{ t: 0, pose: 'bottom' }, { t: ph.raise.start, pose: 'bottom' }];
['r17', 'r33', 'r50', 'r67', 'r83'].forEach((n, i) => keyframes.push({ t: at('raise', (i + 1) / 6), pose: n }));
keyframes.push({ t: ph.top.start, pose: 'top' }, { t: ph.top.end, pose: 'top' });
['r83', 'r67', 'r50', 'r33', 'r17'].forEach((n, i) => keyframes.push({ t: at('lower', (i + 1) / 6), pose: n }));
keyframes.push({ t: ph.reset.start, pose: 'bottom' }, { t: meta.timeline.duration, pose: 'bottom' });

const ex = H.module_(meta, contacts, poses, keyframes);
ex.props = [B.prop, ...F.DUMBBELLS];
const rep = S.scan(ex, { pad: B, box: { center: B.prop.center, size: B.prop.size } });
const sw = C.sweep(ex, B, { grips: [{ side: 'r', grip: 'handle' }, { side: 'l', grip: 'handle' }], n: 300 });
F.gate('incline-dumbbell-front-raise', rep, { maxJump: 6 });
if (sw.dbBench > 0 || sw.bodyBench > 2.5) { console.error(`FAIL incline-dumbbell-front-raise: bench penetration ${JSON.stringify(sw)}`); process.exitCode = 1; }
const tf = V.angle(V.sub(W0.neck_c7.p, W0.pelvis.p), [0, 1, 0]);
ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(tf - 3), max: Math.ceil(tf + 3) };
const Wb = L.fk(poses.bottom, contacts), Wt = L.fk(poses.top, contacts), set = H.setKin(ex);
const armWorld = (W) => { const u = V.norm(V.sub(W.elbow_r.p, W.shoulder_r.p)); return Math.round(Math.asin(u[1]) / D2R); };
set('Back pad angle', 'setup', `${ANGLE}° (trunk line ≈${Math.round(90 - tf)}° above horizontal)`); set('Back pad angle', 'peak', 'unchanged; back and head on the pad');
set('Shoulder flexion', 'setup', `upper arm ${-armWorld(Wb)}° below horizontal (hanging), ≈${Math.round(S.humElev(Wb))}° from the trunk line, behind it`); set('Shoulder flexion', 'peak', `upper arm ${armWorld(Wt)}° above horizontal (vertical), ≈${Math.round(S.humElev(Wt))}° from the trunk line`);
set('Elbow flexion', 'setup', `≈${Math.round(S.elbowAng(Wb))}°`); set('Elbow flexion', 'peak', `≈${Math.round(S.elbowAng(Wt))}°`);
set('Grip', 'setup', 'palms in, dumbbells beside the bench'); set('Grip', 'peak', 'palms in, dumbbells over the shoulders');
set('Tempo', 'setup', 'Pause 0.6 s hanging'); set('Tempo', 'peak', '2.0 s up, 0.4 s at the top, 2.2 s down');
console.log(`Incline Dumbbell Front Raise: wrote ${L.write(ex)}\n  ${JSON.stringify({ err, foot, fit: C.benchFit(B, W0), sweep: sw, ...rep })}`);
