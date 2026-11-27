// Band Horizontal Pallof Press (GymVisual 9299, movement reference only; the page could not be read, so the movement
// follows the name and standard coaching). Standing side-on to a rack upright with the band tied round it at chest
// height on the athlete's right (authored right; the player mirrors for the left). Feet about shoulder width, knees soft
// (planted leg contacts). Both hands hold the band handle together against the middle of the chest (two-hand band with
// an anchor: two strands from the upright to the hands), press straight out to arm's length, hold square, return. The
// trunk, pelvis and head do not move (anti-rotation): only the arms move. 1 s out, 1.5 s hold, 1 s back, 0.5 s pause.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const F = require('./families/b3-shoulders');
const C = require('./families/eq-cable');
const B5 = require('./families/b5-bandcore');
const meta = require('./meta/band-horizontal-pallof-press.json');

const st = F.standing({ stance: 18, knee: 9 });
st.pose.ch.sc_r = { protract: 4, elevate: 0 }; st.pose.ch.sc_l = { protract: 4, elevate: 0 };
const W0 = L.fk(st.pose, st.contacts), S0 = W0.shoulder_r.p;
const GZ = 2.2;                                       // grip points 4.4 cm apart: hands wrapped round one handle
const CHEST = [r1(S0[0] + 21), r1(S0[1] - 10)];       // handle against the lower breastbone (x, y)
const OUT = [r1(S0[0] + 50.5), CHEST[1]];             // arm's length, elbows nearly straight
const ANCHOR_Z = 92;                                  // the upright, beside the body on the right
const rk = B5.uprightX(CHEST[0], ANCHOR_Z, { toward: -1, hookY: 175 });
const anchor = rk.anchor(CHEST[1]);

// hand key at fraction f of the press: grip on the line chest -> out; elbows tucked by the ribs at the chest
const spec = (f) => (W) => {
  const S = W.shoulder_r.p, g = [CHEST[0] + (OUT[0] - CHEST[0]) * f, CHEST[1], GZ];
  const d = V.sub(g, S), e = V.add(S, V.scale(V.norm(V.add(d, [0, -V.len(d) * 0.75 * (1 - f) ** 1.5, 2 * (1 - f)])), L.UA));
  return { grip: g, axis: [0, 1, 0], palm: [0, 0, -1], wPalm: 2, elbow: e, wElbow: 0.8 * (1 - f) + 0.1, guess: { plane: 80, elev: 40 + 40 * f, axial: 20, pron: 40, flex: 100 - 90 * f } };
};
const FR = { start: 0, p20: 0.2, p40: 0.4, p60: 0.6, p80: 0.8, out: 1 };
const poses = {}, err = {};
for (const [n, f] of Object.entries(FR)) {
  let p = B5.armSide(st.pose, st.contacts, 'r', spec(f)); err[n] = p.__err;
  p = B5.armSide(p, st.contacts, 'l', spec(f)); delete p.__err;
  poses[n] = p;
}
poses.hold = clone(poses.out);
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p])), D = meta.timeline.duration;
const seg = (t0, t1, names) => names.map((n, i) => ({ t: +(t0 + ((t1 - t0) * i) / (names.length - 1)).toFixed(3), pose: n }));
const keyframes = [{ t: 0, pose: 'start' }, ...seg(ph.press.start, ph.press.end, ['start', 'p20', 'p40', 'p60', 'p80', 'out']), { t: ph.hold.end, pose: 'hold' },
  ...seg(ph.return.start, ph.return.end, ['hold', 'p80', 'p60', 'p40', 'p20', 'start']).slice(1), { t: D, pose: 'start' }];

const ex = H.module_(meta, st.contacts, poses, keyframes);
ex.props = [rk.prop, B5.band('band', { joint: 'wrist_r', with: 'wrist_l' }, anchor)];
const rep = B5.scan(ex, { still: meta.checks.stillJoints, measure: B5.MEASURE.kneeFlexion });
B5.gate('band-horizontal-pallof-press', rep, { minBand: 0.3, range: [meta.checks.measure.min, meta.checks.measure.max] });

const Ws = L.fk(poses.start, st.contacts), Wo = L.fk(poses.out, st.contacts), set = H.setKin(ex);
const EQ = require('./families/equip'), mid = (W) => EQ.barAt(W).c;
set('Trunk rotation', 'setup', 'Square to the front'); set('Trunk rotation', 'peak', 'None: pelvis and shoulders stay square (still joints)');
set('Hand travel', 'setup', `Handle against the chest, ${Math.round(mid(Ws)[0] - Ws.spine_t6.p[0])} cm in front of the spine at T6, ${Math.round(mid(Ws)[1])} cm high`);
set('Hand travel', 'peak', `${Math.round(mid(Wo)[0] - mid(Ws)[0])} cm straight out at the same height; band tied ${ANCHOR_Z} cm to the side`);
set('Elbow flexion', 'setup', B5.deg(C.elbowAng(Ws))); set('Elbow flexion', 'peak', B5.deg(C.elbowAng(Wo)));
set('Stance', 'setup', `Feet ${Math.round(2 * st.pose.ik.leg_r.target[2])} cm apart (ankle centres), knees ${B5.deg(H.kneeOf(Ws, 'r'))}`); set('Stance', 'peak', 'Unchanged');
set('Tempo', 'setup', 'Pause 0.6 s at the chest'); set('Tempo', 'peak', '1 s out, 1.5 s hold, 1 s back, 0.5 s pause');
console.log(`Band Horizontal Pallof Press: wrote ${L.write(ex)}\n  arm err ${JSON.stringify(err)}\n  ${JSON.stringify(rep)}`);
