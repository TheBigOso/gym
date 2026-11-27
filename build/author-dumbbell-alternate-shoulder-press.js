// Dumbbell Alternate Shoulder Press (GymVisual #397212; seated, since GymVisual lists a separate standing alternate
// press): seated on the adjustable bench with the back pad at 85 degrees, back and buttocks on the pad, feet flat (planted
// leg contacts). Both dumbbells at shoulder height, palms forward, elbows under the wrists and a little in front (scapular
// plane). The right arm presses to nearly straight (1.5 s), pauses and lowers (1.8 s) while the left holds at the shoulder;
// then the left arm does the same. Bilateral loop (one rep per arm), handle grip in both hands. Seat placement as in the
// batch 3 seated press (rig shapes on the seat and pad).
const L = require('./lib');
const { r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const S = require('./families/b4-shoulders2');
const meta = require('./meta/dumbbell-alternate-shoulder-press.json');

const ANGLE = 85;
const SEAT = {}; // rig v2: rig shapes = drawn body, buttocks rest on the seat and the back on the pad (no mesh offsets)
const base = F.seated({ angle: ANGLE, ...SEAT });
const { poses: P, err } = S.pressKeys(base.pose, { bottom: 0, p25: 0.25, p50: 0.5, p75: 0.75, top: 1 }, { plane: 30, elev0: 82 });
P.topHold = clone(P.top); P.topHold.ch.elbow_r.flex = P.topHold.ch.elbow_l.flex = r1(P.top.ch.elbow_r.flex + 2);
const poses = { both: S.combine(base.pose, P.bottom, P.bottom) };
for (const k of ['p25', 'p50', 'p75', 'top', 'topHold']) { poses[`R_${k}`] = S.combine(base.pose, P[k], P.bottom); poses[`L_${k}`] = S.combine(base.pose, P.bottom, P[k]); }
const T = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p]));
const rep1 = (side, s, h, l) => {
  const u = (T[s].end - T[s].start) / 4, d = (T[l].end - T[l].start) / 4;
  return [{ t: T[s].start, pose: 'both' }, { t: T[s].start + u * 1.1, pose: `${side}_p25` }, { t: T[s].start + u * 2.05, pose: `${side}_p50` }, { t: T[s].start + u * 3, pose: `${side}_p75` }, { t: T[h].start, pose: `${side}_top` },
    { t: T[h].end, pose: `${side}_topHold` }, { t: T[l].start + d * 1.1, pose: `${side}_p75` }, { t: T[l].start + d * 2.1, pose: `${side}_p50` }, { t: T[l].start + d * 3.05, pose: `${side}_p25` }, { t: T[l].end, pose: 'both' }];
};
const keyframes = [{ t: 0, pose: 'both' }, ...rep1('R', 'pressR', 'topR', 'lowerR'), ...rep1('L', 'pressL', 'topL', 'lowerL'), { t: meta.timeline.duration, pose: 'both' }]
  .map((k) => ({ t: +k.t.toFixed(3), pose: k.pose }));

const ex = H.module_(meta, base.contacts, poses, keyframes);
ex.props = [base.bench.prop, ...F.DUMBBELLS];
const rep = S.scan(ex, { pad: base.bench, box: { center: base.bench.prop.center, size: base.bench.prop.size }, backPad: base.bench });
F.gate('dumbbell-alternate-shoulder-press', rep);
const tf = L.V.angle(L.V.sub(L.fk(poses.both, base.contacts).neck_c7.p, L.fk(poses.both, base.contacts).pelvis.p), [0, 1, 0]);
ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(tf - 3), max: Math.ceil(tf + 3) };

const Wb = L.fk(poses.both, base.contacts), Wt = L.fk(poses.R_top, base.contacts), set = H.setKin(ex);
set('Back pad angle', 'setup', `${ANGLE}° from the floor; back and buttocks on the pad`); set('Back pad angle', 'peak', 'unchanged (trunk still)');
set('Shoulder elevation', 'setup', `≈${Math.round(S.humElev(Wb))}° (upper arm vs trunk)`); set('Shoulder elevation', 'peak', `≈${Math.round(S.humElev(Wt))}° (pressing arm)`);
set('Elbow flexion', 'setup', `≈${Math.round(S.elbowAng(Wb))}°, forearm vertical`); set('Elbow flexion', 'peak', `≈${Math.round(S.elbowAng(Wt))}° (nearly straight)`);
set('Opposite arm', 'setup', 'both dumbbells at shoulder height'); set('Opposite arm', 'peak', `holds at the shoulder (elbow ≈${Math.round(S.elbowAng(Wt, 'l'))}°)`);
set('Tempo', 'setup', 'Pause 0.7 s, both at the shoulders'); set('Tempo', 'peak', '1.5 s up, 0.3 s at the top, 1.8 s down per arm, 0.6 s between arms');
console.log(`Dumbbell Alternate Shoulder Press: wrote ${L.write(ex)}\n  ${JSON.stringify({ err, bench: base.bench.prop.center, back: base.backGap, tf: +tf.toFixed(1), ...rep })}`);
