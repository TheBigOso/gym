// Barbell Banded Bench Press (GymVisual #18277 "Barbell Banded Bench Press"; page not readable here, movement from the name
// and standard coaching): a flat barbell bench press with a resistance band looped over each end of the bar (on the sleeve,
// just inside the plates) and anchored low on the base rails of the bench-press stands, so the band tension rises as the bar
// goes up. Lying on a flat bench (the bench-press base: glutes on the seat, upper back and head on the pad, shoulder blades
// drawn back and down, feet planted); overhand grip 78 cm between the handle centres; the bar lowers to the lower chest with
// the forearms about vertical and the elbows about 55 degrees from the trunk, touches lightly and is pressed back up over the
// shoulders. Each band is a one-hand band prop on its hand whose end is moved out along the bar to the sleeve (attach.offset
// along the little-finger side of the hand, which lies along the bar). Bilateral. Family b6-01 (pressPath).
const L = require('./lib');
const { V, Q, r1 } = L;
const C = require('./families/b3-chest');
const BB = require('./families/barbell');
const EQ = require('./families/equip');
const H = require('./families/hips');
const P5 = require('./families/b5-bbpress');
const F = require('./families/b6-01');
const meta = require('./meta/barbell-banded-bench-press.json');

const GW = 78, BOTTOM_DX = 16, SLEEVE_Z = 67, RAIL_Y = 3, RAIL_Z = 60;
const P = F.pressPath(meta, { angle: 0, GW, bottomDX: BOTTOM_DX, topDX: 2, flare: 55, dip: 35, foreW: 1.2, wristBot: -20, wristTop: -10, palm: P5.PALM, thumb: P5.THUMB, seeds: P5.SEEDS });
const { poses, keyframes, contacts, B, W0, S, cb, ct, T, foot } = P;
const ex = H.module_(meta, contacts, poses, keyframes);
const st = P5.stands(W0, ct);
// band end: from the bar grip point out along the bar to the sleeve (hand frame [fingers, palm, little-finger side]: the bar
// grip offset plus the distance from the handle point to the sleeve, which is constant because the grip width is)
const BAR_OFF = [4.2, 2.6, 0], OUT = r1(SLEEVE_Z - GW / 2);
// anchors: on the stands' base rails (z = +-60) under the bar's lowest point, as far toward the feet as the rail reaches
const railEnd = st.x + 28 - 2, AX = r1(Math.min(cb[0], railEnd));
const band = (s) => ({ id: `band_${s}`, kind: 'band', color: '#d9534f', attach: { joint: `wrist_${s}`, grip: 'bar', offset: [BAR_OFF[0], BAR_OFF[1], OUT] }, anchor: [AX, RAIL_Y, s === 'r' ? RAIL_Z : -RAIL_Z] });
ex.props = [B.prop, BB.barbellProp(), st.prop, band('r'), band('l')];
// band end on the rig: the athlete hand frame is the rig hand frame (rig v2), so the end sits OUT cm along the bar from the
// handle point, outward; checked against the body and against the plates (it must stay inside the inner plate face)
let line = { d: 1e9 }, endZ = [1e9, -1e9], stretch = [1e9, -1e9];
const sw = BB.sweep(ex, { planted: ['leg_r', 'leg_l'], probe: (W) => {
  const b = EQ.barAt(W, BB.GRIP);
  for (const s of ['r', 'l']) {
    const g = s === 'r' ? b.r : b.l, end = V.add(g, V.scale(b.ax, (s === 'r' ? 1 : -1) * OUT)), anc = ex.props.find((p) => p.id === `band_${s}`).anchor;
    const c = EQ.lineClear(W, anc, end, 0.6, { skip: /^$/ }); if (c.d < line.d) line = { d: +c.d.toFixed(2), id: c.id };
    endZ = [Math.min(endZ[0], Math.abs(end[2])), Math.max(endZ[1], Math.abs(end[2]))]; const len = V.len(V.sub(end, anc)); stretch = [Math.min(stretch[0], len), Math.max(stretch[1], len)];
  }
} });
const Wt = L.fk(poses.top, contacts), Wb = L.fk(poses.bottom, contacts);
const set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
set('Grip width', 'setup', `${GW} cm between the handle centres (≈${(GW / (2 * S[2])).toFixed(1)}x the shoulder joints)`); set('Grip width', 'peak', `Constant (${sw.width[0]}-${sw.width[1]} cm)`);
set('Elbow flexion', 'setup', `${d(BB.elbowOf(Wt, 'r'))} at the top`); set('Elbow flexion', 'peak', `${d(BB.elbowOf(Wb, 'r'))} with the bar on the chest; elbows ${d(C.elbowFlare(Wb))} from the trunk`);
set('Bar path', 'setup', `Top: over the shoulder joints, ${r1(ct[1] - B.top)} cm above the bench`); set('Bar path', 'peak', `Bottom: lower chest, ${BOTTOM_DX} cm toward the feet from the shoulder joints; ${r1(ct[1] - cb[1])} cm of travel`);
set('Band', 'setup', `Looped over each sleeve (${OUT} cm outside the hands), anchored on the stands' base rails ${RAIL_Y} cm off the floor`); set('Band', 'peak', `Band length ${r1(stretch[0])} cm with the bar on the chest to ${r1(stretch[1])} cm at lockout (+${Math.round((stretch[1] / stretch[0] - 1) * 100)}%)`);
set('Tempo', 'setup', `Top ${T.h} s`); set('Tempo', 'peak', `${r1(T.b - T.h)} s down, ${r1(T.p - T.b)} s touch, ${r1(T.r - T.p)} s up, ${r1(T.D - T.r)} s at the top`);
const tf = V.angle(V.sub(W0.neck_c7.p, W0.pelvis.p), [0, 1, 0]);
ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(tf - 3), max: Math.ceil(tf + 3) };
const lim = require('./families/b5-bbsquat').limits(ex);
console.log(`Barbell Banded Bench Press: wrote ${L.write(ex)}\n  bar bottom ${cb} top ${ct} stands ${st.x}/${st.hookY} anchor x ${AX}\n  band line ${JSON.stringify(line)} endZ ${endZ.map(r1)} stretch ${stretch.map(r1)}\n  sweep ${JSON.stringify(sw)} gripErr ${P.gripWorst().toFixed(2)} limits ${JSON.stringify(lim)}`);
if (sw.widthRange > 1.0 || P.gripWorst() > 0.5) { console.error('FAIL: hands do not stay on the bar at a constant grip width'); process.exitCode = 1; }
if (sw.barFloor < 0 || sw.barBody < 0 || line.d < 0) { console.error('FAIL: bar or band through the body'); process.exitCode = 1; }
if (endZ[1] > EQ.BAR.plateX - EQ.BAR.plateW / 2 || endZ[0] < EQ.BAR.inner / 2 - 2) { console.error('FAIL: band end off the sleeve'); process.exitCode = 1; }
if (sw.slide > 0.05) { console.error('FAIL: planted feet slide'); process.exitCode = 1; }
if (Object.keys(lim).length) { console.error('FAIL: joint limits'); process.exitCode = 1; }
