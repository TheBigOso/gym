// Cable Zercher Squat (GymVisual 21628, male; movement reference only, the page could not be read, so the movement
// follows the name and standard coaching): a straight cable bar from a low pulley in front is cradled in the crooks of
// the elbows (Zercher hold), hands clasped in front of the chest, elbows forward and down, trunk tall. Feet about
// shoulder width, toes out; squat down to the thighs a little below parallel, the elbows passing just inside the knees,
// then drive back up. Both feet planted. The bar is a body-mounted cable bar between the two elbow joints (attach
// elbow_r with elbow_l, lifted into the crook by the attach offset), so it rides in the elbows exactly; the cable runs
// from the bar down to the low pulley. Squat family body (as the goblet squat). Bilateral.
const L = require('./lib');
const { V, r1, clone } = L;
const F = require('./families/squat');
const H = require('./families/hips');
const EQ = require('./families/equip');
const G = require('./families/b6-07');
const meta = require('./meta/cable-zercher-squat.json');

const ID = 'cable-zercher-squat';
const STANCE = 20, TOE = 18, BAR = 60, OFF = JSON.parse(process.env.OFF || '[2, 4.5, 0]');
// clasped grip points 2.6 cm either side of the midline (the rig shoulder sits about 20 cm out)
const armsFn = (p, f) => { const Sz = L.fk(p).shoulder_r.p[2]; return G.zercherArms(p, { at: [+(process.env.AX || 27), +(process.env.AY || 2), 2.6 - Sz], elbow: [+(process.env.EXX || 16), -20, -1 + f], palm: [-0.7, 0.3, -0.65], wPalm: 0.5, wWrist: 0.5 }); };
const { ex, report: r, contacts, poses } = F.author({
  stance: STANCE, toe: TOE, kneeTop: 3, kneeBottom: 112, pitchBottom: -30, backBottom: -16, kneeOut: 1.5,
  spine: { l5: -4, t12: -3, t6: 0 }, arms: 'none', armsFn, lead: 1.5, settle: 0.3,
  depths: { stand: 0, l25: 0.25, l50: 0.5, l75: 0.75, bottom: 1, rise50: 0.5 },
  keyframes: [{ t: 0, pose: 'stand' }, { t: 0.8, pose: 'stand' }, { t: 1.3, pose: 'l25' }, { t: 1.8, pose: 'l50' }, { t: 2.3, pose: 'l75' }, { t: 2.8, pose: 'bottom' },
    { t: 3.0, pose: 'bottomSettle' }, { t: 3.2, pose: 'bottom' }, { t: 3.8, pose: 'rise50' }, { t: 4.4, pose: 'stand' }, { t: 6, pose: 'stand' }],
}, meta);
const armCost = {}; for (const k in poses) { armCost[k] = +(poses[k].__armCost || 0).toFixed(3); delete poses[k].__armCost; }
const Wt = L.fk(poses.stand, contacts), Wb = L.fk(poses.bottom, contacts);
const barC = (W) => V.add(V.scale(V.add(W.elbow_r.p, W.elbow_l.p), 0.5), OFF);
const ANCHOR = [r1(barC(Wt)[0] + 120), 12, 0];
ex.props = [EQ.cableTower(ANCHOR), { id: 'bar', kind: 'cable', attachment: 'bar', size: [BAR, 3, 3], anchor: ANCHOR, attach: { joint: 'elbow_r', with: 'elbow_l', offset: OFF } }];
// loop checks: the bar clear of the trunk and thighs (arms skipped: it rests in the elbow crooks), the cable clear of
// the legs, the clasped hands' gap constant (verify measures it), elbow gap (the bar length must span it)
let barClr = { d: 1e9 }, line = { d: 1e9 }, gap = [1e9, -1e9], elw = [1e9, -1e9];
H.loopReport(ex, { probe: (W, pz, t) => {
  const c = barC(W), ax = V.norm(V.sub(W.elbow_r.p, W.elbow_l.p)), a = V.add(c, V.scale(ax, BAR / 2)), b = V.sub(c, V.scale(ax, BAR / 2));
  const bc = EQ.segmentClear(W, a, b, 1.5, { skip: /^(hand|thumb|forearm|upperarm|biceps|triceps|elbow|deltoid)_/ }); if (bc.d < barClr.d) barClr = { d: +bc.d.toFixed(2), id: bc.id, t: +t.toFixed(2) };
  const lc = EQ.lineClear(W, ANCHOR, c, 0.5, { skip: /^(hand|thumb|forearm|upperarm|biceps|triceps)_/ }); if (lc.d < line.d) line = { d: +lc.d.toFixed(2), id: lc.id, t: +t.toFixed(2) };
  const w = EQ.barAt(W).width; gap = [Math.min(gap[0], w), Math.max(gap[1], w)];
  const ew = V.len(V.sub(W.elbow_r.p, W.elbow_l.p)); elw = [Math.min(elw[0], ew), Math.max(elw[1], ew)];
} });
require('./families/eq-cable').limits(poses);
const fail = (m) => { console.error(`FAIL ${ID}: ${m}`); process.exitCode = 1; };
if (barClr.d < -0.5) fail(`bar into the body ${JSON.stringify(barClr)}`);
if (line.d < 0.5) fail(`cable into the body ${JSON.stringify(line)}`);
if (gap[1] - gap[0] > 1.5) fail(`clasped hands drift ${gap.map(r1)}`);
if (elw[1] > BAR - 6) fail(`elbows wider than the bar ${elw.map(r1)}`);
if (r.slide > 0.05) fail('planted feet slide');
const kin = ex.exercise.kinematics, set = (prefix, field, v) => { const k = kin.find((x) => x.measure.startsWith(prefix)); if (k) k[field] = v; };
set('Stance width', 'setup', `${2 * STANCE} cm (≈${(2 * STANCE / F.SHOULDER_W).toFixed(1)}x the rig's ${Math.round(F.SHOULDER_W)} cm shoulder width), toes out ${TOE}°`); set('Stance width', 'peak', 'Unchanged');
set('Knee flexion', 'setup', `≈${Math.round(F.kneeOf(Wt, 'r'))}°`); set('Knee flexion', 'peak', `≈${r.knee[1]}°`);
set('Hip flexion', 'setup', `≈${Math.round(r.hipTop)}°`); set('Hip flexion', 'peak', `≈${Math.round(r.hipBottom)}° (joint channel, as in the HUD)`);
set('Trunk inclination', 'setup', `≈${Math.round(r.trunkTop)}°`); set('Trunk inclination', 'peak', `≈${Math.round(r.trunkBottom)}° forward`);
set('Zercher hold', 'setup', `Bar in the elbow crooks, elbows bent ≈${Math.round(G.elbowAng(Wt))}°, hands clasped ${Math.round(EQ.gripPoint(Wt, 'r').p[1] - Wt.shoulder_r.p[1])} cm from shoulder height`);
set('Zercher hold', 'peak', `Unchanged; bar ≥${barClr.d} cm off the trunk and thighs, cable ≥${line.d} cm off the legs`);
set('Tempo', 'setup', 'Stand 0.8 s'); set('Tempo', 'peak', '2.0 s down, 0.4 s pause, 1.2 s up, 1.6 s reset');
delete r.Wb; delete r.Wt;
console.log(`Cable Zercher Squat: wrote ${L.write(ex)}\n  ${JSON.stringify(r)}\n  arm cost ${JSON.stringify(armCost)}\n  bar ${JSON.stringify(barClr)} line ${JSON.stringify(line)} hands ${gap.map(r1)} elbows ${elw.map(r1)}`);
