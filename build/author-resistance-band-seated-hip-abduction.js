// Resistance Band Seated Hip Abduction (GymVisual #11511, movement reference only): seated tall on the end of a flat bench,
// hips and knees about 90 degrees, feet flat about hip width, hands resting on the thighs. A mini band sits
// just above both knees. Both knees press out against the band, the thighs opening about 30 degrees each about the hips
// while the feet stay where they are (they roll a little onto their outer edges); pause and return slowly. Bilateral.
// Gear: GA.bandLoop around the knees (src/gear/attach.js). Seat and hands: build/families/gear-g3attach.js (seatedBase).
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b4-calvesglutes');
const GA = require('./families/gear-attach');
const G = require('./families/gear-g3attach');

const meta = G.meta({
  id: 'resistance-band-seated-hip-abduction', name: 'Resistance Band Seated Hip Abduction', url: 'https://gymvisual.com/videos/11511-resistance-band-seated-hip-abduction.html',
  aliases: ['Mini band seated abduction', 'Banded seated knee push-out'], bodyPart: 'Hips (gluteus medius)', secondary: ['Gluteus maximus'], equipment: ['Resistance band (mini loop above the knees)', 'Flat bench'],
  mechanics: 'Isolation (hip abduction)', plane: 'Transverse', side: 'bilateral', cam: 'front',
  muscles: { target: G.both('glute_med'), synergist: G.both('glute_max'), stabilizer: ['core'], lengthened: G.both('adductors') },
  notes: { glute_med_r: 'Abducts the flexed hip against the band (Macadam 2015).', glute_med_l: 'Abducts the flexed hip against the band (Macadam 2015).', glute_max_r: 'Upper fibres abduct and externally rotate the flexed hip (Selkowitz 2013; Macadam 2015).', glute_max_l: 'Upper fibres abduct and externally rotate the flexed hip (Selkowitz 2013; Macadam 2015).', core: 'Keeps the trunk tall (clinical opinion).', adductors_r: 'Lengthen as the knees open (clinical opinion).', adductors_l: 'Lengthen as the knees open (clinical opinion).' },
  breathing: { pattern: 'Exhale as the knees press out, inhale as they return.', cadence: 'About 1 s out, 0.6 s hold, 1.8 s in' },
  rx: { reps: '15-25', tempo: '1-0.5-2-0', progression: 'Stronger band, or lean forward a little to bias the gluteus maximus' },
  phases: [
    { id: 'setup', label: 'Seated, band on', end: 0.8, cue: 'Sit tall at the end of the bench, band above the knees, feet flat about hip width, hands resting on the thighs.', w: 0.1 },
    { id: 'out', label: 'Knees out', end: 1.9, breath: 'exhale', cue: 'Breathe out and press both knees out against the band.', w: 1 },
    { id: 'hold', label: 'Pause', end: 2.5, cue: 'Pause wide; the feet stay put.', w: 1 },
    { id: 'in', label: 'Return with control', end: 4.3, breath: 'inhale', cue: 'Breathe in and let the knees come back in slowly.', w: 0.2 },
    { id: 'reset', label: 'Reset', end: 5.0, cue: 'Keep tension in the band; repeat.', w: 0.1 },
  ],
  mistakes: [['Lifting the feet', 'Keep the feet flat; the knees move, the feet stay.'], ['Slumping', 'Sit tall on the sit bones.'], ['Letting the band snap the knees in', 'Control the return.'], ['Rocking the trunk', 'Only the thighs move.']],
  kin: [['Hip abduction', 'About 25-35 degrees each side from the knees together (clinical opinion); seated and side-lying abduction load the gluteus medius (Macadam 2015)', ['macadam2015']], ['Hips and knees', 'About 90 degrees, feet flat (standard setup)', []], ['Band', 'Mini loop above both knees (elastic resistance, Andersen 2010)', ['andersen2010']], ['Tempo', 'Controlled (clinical opinion)', []]],
  safety: { cautions: ['Check the band for nicks before use.'], modify: ['Hip pinching: smaller range.'], regressions: ['Lighter band.'], progressions: ['Heavier band.', 'Longer pause.', 'Lever seated hip abduction.'] },
  act: { glute_med_r: [0.12, 0.62], glute_med_l: [0.12, 0.62], glute_max_r: [0.08, 0.42], glute_max_l: [0.08, 0.42], core: [0.1, 0.16] },
  guides: [{ id: 'kneePath', kind: 'path', joint: 'knee_r', from: 0.8, to: 1.9, label: 'Knees press out' }, { id: 'hipAngle', kind: 'jointAngle', joint: 'hip_r', normBand: [25, 35], label: 'About 30 degrees each side' }],
  checks: { stillJoints: ['pelvis'] },
});

const OPEN = 30;
const S = G.seatedBase({ half: 11, toe: 4, hipAbd: 3 });
const contacts = [];
// legs placed by FK: knee rotates about the hip-ankle axis, ankle fixed over the foot's spot
const legsOn = (() => { const q = clone(S.pose); q.ik = { leg_r: { target: S.FOOT.r, weight: 1 }, leg_l: { target: S.FOOT.l, weight: 1 } }; let p = H.fitLeg(q, 'r', S.contacts.legs[0], S.FOOT.r, { rot: -4 }); p = H.fitLeg(p, 'l', S.contacts.legs[1], S.FOOT.l, { rot: -4 }); delete p.ik; return p; })();
const W0 = L.fk(legsOn);
function poseAt(f) {
  let p = clone(legsOn);
  for (const s of ['r', 'l']) {
    const hp = W0[`hip_${s}`].p, an = W0[`ankle_${s}`].p, ax = V.norm(V.sub(an, hp)), sg = s === 'r' ? 1 : -1;
    let kn = V.add(hp, L.Q.rot(L.Q.axis(ax, OPEN * f * sg), V.sub(W0[`knee_${s}`].p, hp)));
    if ((kn[2] - W0[`knee_${s}`].p[2]) * sg < 0) kn = V.add(hp, L.Q.rot(L.Q.axis(ax, -OPEN * f * sg), V.sub(W0[`knee_${s}`].p, hp)));
    p = F.legTo(p, s, { knee: kn, ankle: an }); delete p.__cost;
  }
  // keep the soles on the floor: lift both ankles if the rolled foot dips below
  let lift = 0;
  for (let it = 0; it < 4; it++) {
    const Wp = L.fk(p), need = 0.1 - Math.min(H.bottomOf(Wp, 'foot_r'), H.bottomOf(Wp, 'foot_l')); if (need < 0.02) break; lift += need;
    for (const s of ['r', 'l']) { const an = V.add(W0[`ankle_${s}`].p, [0, lift, 0]); p = F.legTo(p, s, { knee: L.fk(p)[`knee_${s}`].p, ankle: an }); delete p.__cost; }
  }
  return G.handsOnThighs(p, { at: 0.55 });
}
const { poses, keyframes } = G.rep(poseAt, { top: 1.9 });
F.wrapAll(poses);
const ex = H.module_(meta, contacts, poses, keyframes);
const band = GA.bandLoop({ where: 'knees', id: 'miniband' });
ex.props = [S.bench.prop, band];
const B = G.bandProbe(band); let seatGap = [1e9, -1e9], footLo = 1e9, footHi = -1e9;
const rep = H.loopReport(ex, { planted: [], probe: (W) => { B.probe(W); const sy = G.seatYOf(W) - S.bench.top; seatGap = [Math.min(seatGap[0], sy), Math.max(seatGap[1], sy)];
  const fb = Math.min(H.bottomOf(W, 'foot_r'), H.bottomOf(W, 'foot_l')); footLo = Math.min(footLo, fb); footHi = Math.max(footHi, fb); } });
const Wr = L.fk(poses.rest, contacts), Wt = L.fk(poses.top, contacts);
const set = H.setKin(ex);
const kneeGap = (W) => Math.round(W.knee_r.p[2] - W.knee_l.p[2]);
set('Hip abduction', 'setup', `Knees ${kneeGap(Wr)} cm apart`); set('Hip abduction', 'peak', `Thighs open ${OPEN}° each about the hip-ankle axis; knees ${kneeGap(Wt)} cm apart (hip abd ${poses.top.ch.hip_r.abd}°, rot ${poses.top.ch.hip_r.rot}°)`);
set('Hips and knees', 'setup', `Hip ≈${Math.round(poses.rest.ch.hip_r.flex)}°, knee ≈${Math.round(H.kneeOf(Wr, 'r'))}°`); set('Hips and knees', 'peak', `Feet stay put (sole ${footHi.toFixed(1)} cm off the floor at most)`);
set('Band', 'setup', `Above both knees (${Math.round(B.gap[0])} cm apart)`); set('Band', 'peak', `Stretched to ${Math.round(B.gap[1])} cm`);
set('Tempo', 'setup', 'Seated 0.8 s'); set('Tempo', 'peak', '1.1 s out, 0.6 s hold, 1.8 s in');
console.log(`Band Seated Hip Abduction: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)} seatGap ${seatGap.map((v) => v.toFixed(2))} foot ${footLo.toFixed(2)}..${footHi.toFixed(2)} band ${G.fmt(B.gap)} clear ${B.clear.toFixed(1)}`);
if (footLo < -0.5 || footHi > 2) { console.error('FAIL: feet leave the floor or sink'); process.exitCode = 1; }
