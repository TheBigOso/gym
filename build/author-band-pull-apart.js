// Band Pull-Apart (GymVisual, Band Pull Apart; movement reference only): standing tall, feet about hip width (planted leg
// contacts), knees soft. A band is held in both hands (two-hand band, no anchor: drawn between the hands), palms down,
// arms straight in front at shoulder height, hands about shoulder width. The straight arms sweep out to the sides
// (horizontal abduction) until the band meets the chest, the shoulder blades squeezing together, then return. The hand
// distance changes on purpose (the band stretches), so the two-hand grip-width check does not apply to this module.
// Bilateral (right arm solved, left mirrored). 1 s apart, 0.5 s squeeze, 1.8 s back, 0.5 s pause.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const EQ = require('./families/equip');
const C = require('./families/eq-cable');
const meta = require('./meta/band-pull-apart.json');

const P0 = 84, ELEV = 88, FLEX = 5, PROT0 = 4, PROT1 = -14, BAND_R = 0.6, TOUCH = 0.3; // band surface TOUCH cm off the chest at the end
const st = F.standing({ stance: 12, knee: 6 });
const keyAt = (name, plane, f) => ({ name, plane, elev: ELEV, axial: 0, flex: FLEX, pron: 170, palm: [0, -1, 0], sc: { protract: r1(PROT0 + (PROT1 - PROT0) * f), elevate: 0 } });
const bandClear = (p) => { const W = L.fk(p, st.contacts), b = EQ.barAt(W); return EQ.lineClear(W, b.r, b.l, BAND_R); };
// end plane: the band just meets the chest (bisection on the plane, with the shoulder blades fully retracted)
let lo = 15, hi = 40;
for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2, { poses } = F.armKeys(st.pose, [keyAt('k', m, 1)], st.contacts); if (bandClear(poses.k).d < TOUCH) lo = m; else hi = m; }
const P1 = r1(hi + 0.05);
const FR = { start: 0, a25: 0.25, a50: 0.5, a75: 0.75, a90: 0.9, end: 1 };
const { poses, err } = F.armKeys(st.pose, Object.entries(FR).map(([n, f]) => keyAt(n, P0 + (P1 - P0) * f, f)), st.contacts);
Object.values(poses).forEach((p) => delete p.__err);
poses.endHold = clone(poses.end);
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p])), D = meta.timeline.duration;
const keyframes = [{ t: 0, pose: 'start' }, { t: ph.pull.start, pose: 'start' }, { t: 0.78, pose: 'a25' }, { t: 1.02, pose: 'a50' }, { t: 1.26, pose: 'a75' }, { t: 1.4, pose: 'a90' }, { t: ph.squeeze.start, pose: 'end' },
  { t: ph.squeeze.end, pose: 'endHold' }, { t: 2.3, pose: 'a90' }, { t: 2.6, pose: 'a75' }, { t: 3.05, pose: 'a50' }, { t: 3.45, pose: 'a25' }, { t: ph.reset.start, pose: 'start' }, { t: D, pose: 'start' }];

const ex = H.module_(meta, st.contacts, poses, keyframes);
ex.props = [{ id: 'band', kind: 'band', color: '#d9534f', attach: { joint: 'wrist_r', with: 'wrist_l' } }];

// loop checks: feet, floor, channel jumps, the band (drawn between the hands) not cutting into the body
const rep = C.scan(ex, { line: (W) => { const b = EQ.barAt(W); return [b.r, b.l]; } });
C.gate('band-pull-apart', rep, { minLine: TOUCH - 0.6, checkWidth: false });
C.limits(poses);

const Ws = L.fk(poses.start, st.contacts), We = L.fk(poses.end, st.contacts), set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
const hAbd = (W) => { const u = V.sub(W.wrist_r.p, W.shoulder_r.p); return Math.atan2(u[0], u[2]) / L.R.DEG; };
const elevOf = (W) => V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), V.sub(W.pelvis.p, W.neck_c7.p));
set('Horizontal abduction', 'setup', `Arms ${d(hAbd(Ws))} in front of the frontal plane, hands ${Math.round(EQ.barAt(Ws).width)} cm apart`); set('Horizontal abduction', 'peak', `Arms ${d(hAbd(We))} in front of the frontal plane, band at the chest, hands ${Math.round(EQ.barAt(We).width)} cm apart`);
set('Arm height', 'setup', `${d(elevOf(Ws))} of elevation, hands at shoulder height`); set('Arm height', 'peak', `${d(elevOf(We))}`);
set('Elbow flexion', 'setup', `${d(C.elbowAng(Ws))}`); set('Elbow flexion', 'peak', `${d(C.elbowAng(We))}`);
set('Shoulder blades', 'setup', `Slightly forward (protraction ${PROT0}°)`); set('Shoulder blades', 'peak', `Squeezed together (retraction ${-PROT1}°)`);
set('Grip', 'setup', 'Overhand, palms down'); set('Grip', 'peak', 'Unchanged');
set('Tempo', 'setup', 'Pause 0.5 s in front'); set('Tempo', 'peak', '1 s apart, 0.5 s at the chest, 1.8 s back');
console.log(`Band Pull-Apart: wrote ${L.write(ex)}\n  end plane ${P1} keys ${JSON.stringify(err)}\n  ${JSON.stringify(rep)}`);
