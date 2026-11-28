// Cable Half Kneeling Pallof Press (GymVisual 14486; movement reference only, the page could not be read, so the movement
// follows the name and standard coaching): half-kneeling side-on to a cable tower, the pulley at chest height on the
// athlete's right (authored right; the player mirrors). The inside (right) knee is down on a pad with the toes tucked,
// the left foot flat in front, trunk tall. Both hands hold the D-handle together against the middle of the chest
// (attach wrist_r with wrist_l), press straight out to arm's length, hold square against the cable's turning pull, and
// bring it back. The pelvis, trunk and head do not move (anti-rotation). Same hand path as
// author-band-horizontal-pallof-press.js on the half-kneeling base (b4-shoulders3 halfKneel).
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const K = require('./families/b4-shoulders3');
const C = require('./families/eq-cable');
const EQ = require('./families/equip');
const B5 = require('./families/b5-bandcore');
const meta = require('./meta/cable-half-kneeling-pallof-press.json');

const ID = 'cable-half-kneeling-pallof-press';
const PAD = 3.5;
const base = K.halfKneel({ down: 'r', kneeY: 5.0, toePitch: 88, frontKnee: 90, width: 10, thigh: 4 });
const P0 = base.pose; P0.ch.sc_r = { protract: 4, elevate: 0 }; P0.ch.sc_l = { protract: 4, elevate: 0 };
const W0 = L.fk(P0, base.contacts), S0 = W0.shoulder_r.p;
const GZ = 2.6;                                       // grip points 5.2 cm apart: hands side by side on the D-handle
const CHEST = [r1(S0[0] + 21), r1(S0[1] - 10)];       // handle against the lower breastbone (x, y)
const OUT = [r1(S0[0] + 50.5), CHEST[1]];             // arm's length, elbows nearly straight
const ANCHOR = [CHEST[0], CHEST[1], 110];             // pulley beside the body on the right at chest height
// hand key at fraction f of the press: grip on the line chest -> out; at the chest the forearms angle in (palms face in
// and a little back, wrists straight, elbows down by the ribs), squaring up to straight ahead at arm's length
const spec = (f) => (W) => {
  const g = [CHEST[0] + (OUT[0] - CHEST[0]) * f, CHEST[1], GZ];
  const palm = V.norm(V.lerp([-0.75, 0, -0.66], [-0.25, 0, -0.97], f));
  return { grip: g, palm, wPalm: 2, guess: { plane: 25 + 60 * f, elev: 20 + 60 * f, axial: 14, pron: 70, flex: 120 - 110 * f } };
};
const FR = { start: 0, p20: 0.2, p40: 0.4, p60: 0.6, p80: 0.8, out: 1 };
const poses = {}, err = {};
let gPrev = null; // chain each key's guess from the previous key (one continuous arm branch)
for (const [n, f] of Object.entries(FR)) {
  const sp = (W) => { const o = spec(f)(W); if (gPrev) o.guess = { ...gPrev }; return o; };
  let p = B5.armSide(P0, base.contacts, 'r', sp); err[n] = p.__err;
  p = B5.armSide(p, base.contacts, 'l', sp); delete p.__err;
  gPrev = C.guessOf(p); poses[n] = p;
}
poses.hold = clone(poses.out);
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p])), D = meta.timeline.duration;
const seg = (t0, t1, names) => names.map((n, i) => ({ t: +(t0 + ((t1 - t0) * i) / (names.length - 1)).toFixed(3), pose: n }));
const keyframes = [{ t: 0, pose: 'start' }, ...seg(ph.press.start, ph.press.end, ['start', 'p20', 'p40', 'p60', 'p80', 'out']), { t: ph.hold.end, pose: 'hold' },
  ...seg(ph.return.start, ph.return.end, ['hold', 'p80', 'p60', 'p40', 'p20', 'start']).slice(1), { t: D, pose: 'start' }];
const ex = H.module_(meta, base.contacts, poses, keyframes);
const Wk = L.fk(P0, base.contacts);
ex.props = [{ id: 'mat', kind: 'mat', center: [r1(Wk.knee_r.p[0] - 4), 0, r1(Wk.knee_r.p[2])], size: [34, PAD, 26] }, EQ.cableTower(ANCHOR, { offset: [0, 12] }),
  { id: 'handle', kind: 'cable', attachment: 'handle', anchor: ANCHOR, attach: { joint: 'wrist_r', with: 'wrist_l' } }];
const rep = C.scan(ex, { line: (W) => [ANCHOR, EQ.attachPoint(W, { two: true })] });
C.gate(ID, rep, { minLine: 0.5 });
C.limits(poses);
const BC = B5.scan(ex, { still: meta.checks.stillJoints, measure: B5.MEASURE.kneeFlexion });
if (BC.drift > 0.05) { console.error(`FAIL ${ID}: still joints drift ${BC.drift}`); process.exitCode = 1; }
ex.checks.measure = { name: 'kneeFlexion', min: Math.floor(BC.peak - 6), max: Math.ceil(BC.peak + 6) };
const Ws = L.fk(poses.start, base.contacts), Wo = L.fk(poses.out, base.contacts), set = H.setKin(ex), mid = (W) => EQ.barAt(W).c;
set('Trunk rotation', 'setup', 'Square to the front'); set('Trunk rotation', 'peak', 'None: pelvis and shoulders stay square (still joints)');
set('Hand travel', 'setup', `Handle against the chest, ${Math.round(mid(Ws)[0] - Ws.spine_t6.p[0])} cm in front of the spine at T6, ${Math.round(mid(Ws)[1])} cm high`);
set('Hand travel', 'peak', `${Math.round(mid(Wo)[0] - mid(Ws)[0])} cm straight out at the same height; pulley ${ANCHOR[2]} cm to the side`);
set('Elbow flexion', 'setup', B5.deg(C.elbowAng(Ws))); set('Elbow flexion', 'peak', B5.deg(C.elbowAng(Wo)));
set('Stance', 'setup', `Half-kneeling: down (right) knee ${B5.deg(H.kneeOf(Ws, 'r'))}, front knee ${B5.deg(H.kneeOf(Ws, 'l'))}, down thigh about vertical`); set('Stance', 'peak', 'Unchanged');
set('Tempo', 'setup', 'Pause 0.6 s at the chest'); set('Tempo', 'peak', '1 s out, 1.5 s hold, 1 s back, 0.5 s pause');
console.log(`Cable Half Kneeling Pallof Press: wrote ${L.write(ex)}\n  arm err ${JSON.stringify(err)}\n  ${JSON.stringify(rep)}\n  drift ${BC.drift} peak knee ${BC.peak} kneel ${JSON.stringify(base.info)}`);
