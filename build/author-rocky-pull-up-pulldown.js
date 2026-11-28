// Rocky Pull-up Pulldown (GymVisual 16053, movement reference only; page not readable at authoring time): "Rocky"
// pull-ups on a free-standing pull-up bar, wide overhand grip (grip points 64 cm apart). One rep in front of the bar (chin
// over the bar, chest toward it), lower to a full hang, then one rep behind the neck (body forward under the bar, head
// tilted a little forward, elbows straight down by the sides, bar level with the base of the neck), lower to a full hang.
// Legs hang with a slight knee bend. Bilateral. Hands planted on the bar (b6-15.js hang, keys of author-pull-up.js for the
// front rep); every key solved for the root height that gives the asked elbow angle, then moved back (front rep) or
// forward (behind the neck) until the face, neck and chest clear the bar.
const L = require('./lib');
const { V } = L;
const H = require('./families/hips');
const B = require('./families/b6-15');
const meta = require('./meta/rocky-pull-up-pulldown.json');

const GZ = 32, TILT = 8;
const Hh = B.hang({ barH: 212, grip: { r: [0, GZ], l: [0, -GZ] }, rot: B.GRIPS.over(TILT), pole: { r: [0.15, -0.25, 1], l: [0.15, -0.25, -1] }, plane: [20, 0] });
const K = B.pullKeys({ topFlex: 133, topPitch: 7, hangFlex: 12 });
const back = { dir: [0.5, 0], min: 2.5 };
// behind the neck: [name, elbow, pitch (- = top forward), neck flex (split C7 / C1), shoulder blades, legs]
for (const [n, f, pitch, nk, sc, lg] of [['b1', 55, -1, 4, { protract: -8, elevate: 2 }, B.legs(10, 22, -28)], ['b2', 95, -3, 10, { protract: -14, elevate: -2 }, B.legs(13, 25, -28)], ['b3', 120, -4, 14, { protract: -16, elevate: -5 }, B.legs(14, 26, -28)], ['bt', 140, -5, 16, { protract: -18, elevate: -8 }, B.legs(15, 27, -28)]])
  K[n] = { flex: f, sc, pitch, spine: [-1, -2, -3], neck: [nk / 2, nk / 2], legs: lg, x: 0, clear: back };
const poses = {}; for (const [n, k] of Object.entries(K)) poses[n] = Hh.solveKey(k);
const keyframes = [['hang', 0], ['hang', 0.8], ['scap', 1.1], ['m1', 1.5], ['m2', 1.85], ['m3', 2.1], ['top', 2.3], ['top', 2.7], ['m3', 3.05], ['m2', 3.4], ['m1', 3.85], ['scap', 4.4], ['hang', 4.6], ['hang', 4.85], ['scap', 5.1], ['b1', 5.5], ['b2', 5.85], ['b3', 6.1], ['bt', 6.3], ['bt', 6.7], ['b3', 7.05], ['b2', 7.4], ['b1', 7.85], ['scap', 8.4], ['hang', 8.6], ['hang', 9.2]].map(([pose, t]) => ({ t, pose }));
const ex = H.module_(meta, Hh.contacts, poses, keyframes);
ex.props = [Hh.PB.prop];
Hh.pin(ex);

const rep = B.hangCheck(ex, Hh);
const Wh = L.fk(poses.hang, Hh.contacts), Wt = L.fk(poses.top, Hh.contacts), Wb = L.fk(poses.bt, Hh.contacts);
const chin = H.bottomOf(Wt, 'jaw') - Hh.barH, c7 = Wb.neck_c7.p[1] - Hh.barH, shW = V.len(V.sub(Wh.shoulder_r.p, Wh.shoulder_l.p));
const set = H.setKin(ex);
set('Elbow flexion', 'setup', `≈${Math.round(B.elbowOf(Wh))}° in the dead hang`); set('Elbow flexion', 'peak', `≈${Math.round(B.elbowOf(Wt))}° (front) and ≈${Math.round(B.elbowOf(Wb))}° (behind the neck) at the top`);
set('Grip width', 'setup', `Overhand, grip points ${2 * GZ} cm apart (shoulder joints ${Math.round(shW)} cm): about ${Math.round(100 * 2 * GZ / shW)}% of shoulder width`); set('Grip width', 'peak', 'Unchanged (hands planted on the bar)');
set('Chin height', 'setup', `Chin ${Math.round(-(H.bottomOf(Wh, 'jaw') - Hh.barH))} cm below the bar in the hang`); set('Chin height', 'peak', `Front rep: chin ${chin.toFixed(1)} cm above the bar`);
set('Behind the neck', 'setup', 'Body moves forward under the bar as the pull starts'); set('Behind the neck', 'peak', `Bar behind the head, base of the neck (C7) ${Math.abs(c7).toFixed(1)} cm below it; head tilted ${K.bt.neck[0] + K.bt.neck[1]}° forward`);
set('Tempo', 'setup', 'Hang 0.8 s, set 0.3 s'); set('Tempo', 'peak', 'About 1.2 s up, 0.4 s hold, 1.9 s down for each rep');
console.log(`Rocky Pull-up Pulldown: wrote ${L.write(ex)}\n  chin ${chin.toFixed(1)} c7 ${c7.toFixed(1)} roots ${JSON.stringify(Object.fromEntries(Object.entries(poses).map(([n, p]) => [n, p.root.pos.map((v) => +v.toFixed(1))])))}\n  ${JSON.stringify(rep)}`);
B.hangGate(rep);
if (chin < 0) { console.error('FAIL: chin does not clear the bar'); process.exitCode = 1; }
if (c7 > 0 || c7 < -10) { console.error('FAIL: bar not at the back of the neck'); process.exitCode = 1; }
