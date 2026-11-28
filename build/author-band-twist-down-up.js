// Band Twist (Down-Up) (GymVisual #25201, Band twist (down up); movement reference only, the page could not be read here,
// so the movement follows the name and standard coaching: a low-to-high chop, the reverse of author-band-twist-up-down.js).
// Standing side-on to a rack upright, the band tied low on it on the athlete's right (authored right; the player mirrors
// for the left). Feet a little wider than the hips, toes slightly out (planted leg contacts). Both hands on the band
// handle (two-hand band with an anchor). Start in a quarter squat (knees about 48 degrees), turned toward the anchor
// with the hands low beside the outside of the right thigh (elbows bent about 55 degrees: the left hand has to reach
// across the body); drive up and across to above the left shoulder, arms long, as the legs straighten and the pelvis
// (root yaw over the planted feet) and the ribs (spine rotation, mostly thoracic) turn left together; return slowly.
// The anchor sits on the line of the arms at the start, so the band pulls straight back down along them.
const L = require('./lib');
const { V, Q, r1, clone } = L;
const { makeFamily } = require('./families/lunge');
const H = require('./families/hips');
const C = require('./families/eq-cable');
const EQ = require('./families/equip');
const B5 = require('./families/b5-bandcore');
const meta = require('./meta/band-twist-down-up.json');

const F = makeFamily({ toe: 8, half: 17 });
const feet = { r: { c: 'flat', x: 0 }, l: { c: 'flat', x: 0 } };
const ENV = (k, d) => +(process.env[k] ?? d);
const K = { yaw: [ENV('Y0', 32), -18], rot: [ENV('R0', 50), -34], knee: [ENV('K0', 48), 8], pitch: [ENV('P0', -26), 0], elev: [-50, 48], side: [12, -12], neck: [0.35, 0.3] };
const SPLIT = { spine_l5: 0.12, spine_t12: 0.44, spine_t6: 0.44 };
const GZ = 2.2, ARM = [ENV('A0', 52), ENV('A1', 51)];
const lerp = (a, f) => a[0] + (a[1] - a[0]) * f;

function body(f) {
  const spec = F.rootY({ root: [0, 88, 0], pitch: lerp(K.pitch, f), rot: { yaw: lerp(K.yaw, f) }, spine: { l5: 0, t12: 0, t6: 0 }, feet }, lerp(K.knee, f));
  const p = F.pose(spec), th = lerp(K.rot, f);
  for (const j of Object.keys(SPLIT)) p.ch[j] = Object.assign({}, p.ch[j], { rot: r1(th * SPLIT[j]) });
  const tot = th + lerp(K.yaw, f);
  p.ch.neck_c7 = Object.assign({}, p.ch.neck_c7, { rot: r1(-th * 0.15) }); p.ch.head_c1 = Object.assign({}, p.ch.head_c1, { rot: r1(-th * 0.2), flex: r1((p.ch.head_c1.flex || 0) + (f < 0.5 ? 10 * (0.5 - f) : 0)) });
  p.ch.sc_r = { protract: 6, elevate: r1(6 * f) }; p.ch.sc_l = { protract: 6, elevate: r1(6 * f) };
  p.__tot = tot;
  return p;
}
// hands together on the handle, ARM cm from the mid-shoulder point. Start: pointing at the band's anchor (low, beside
// the body on the right, so the hands are low beside the outside of the right thigh); end: up and across, above the left
// shoulder. In between the direction is interpolated in the upper-trunk frame, so the hands sweep a diagonal arc as the trunk turns.
const ANCHOR = [ENV('AX', 34), ENV('AY', 14), ENV('AZ', 74)];
const midOf = (W) => V.scale(V.add(W.shoulder_r.p, W.shoulder_l.p), 0.5);
const W0b = F.fk(body(0)), LOC0 = Q.rot(Q.conj(W0b.spine_t6.q), V.norm(V.sub(ANCHOR, midOf(W0b))));
const e1 = K.elev[1] * Math.PI / 180, LOC1 = V.norm([Math.cos(e1), Math.sin(e1), K.side[1] / ARM[1]]);
const spec = (f) => (W, mirrored) => {
  const fr = W.spine_t6.q, u = V.norm(V.lerp(LOC0, LOC1, f)), loc = mirrored ? [u[0], u[1], -u[2]] : u;
  const dirW = Q.rot(fr, loc), up = Q.rot(fr, [0, 1, 0]), ax = V.norm(V.sub(up, V.scale(dirW, V.dot(up, dirW))));
  const zz = Q.rot(fr, [0, 0, GZ]);
  return { grip: V.add(V.add(midOf(W), V.scale(dirW, ARM[0] + (ARM[1] - ARM[0]) * f)), zz), axis: ax, palm: Q.rot(fr, [0, 0, -1]), wPalm: 1.5,
    guess: { plane: 80, elev: 90 + Math.asin(u[1]) * 180 / Math.PI, axial: 10, pron: 30, flex: 10 } };
};
const FR = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.88, 1], poses = {}, err = {};
FR.forEach((f, i) => {
  let p = body(f); delete p.__tot;
  p = B5.armSide(p, F.contacts, 'r', spec(f)); const e = p.__err;
  p = B5.armSide(p, F.contacts, 'l', spec(f)); err[`k${i}`] = [e.grip, p.__err.grip]; delete p.__err;
  poses[`k${i}`] = p;
});
poses.high = clone(poses[`k${FR.length - 1}`]);
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p])), D = meta.timeline.duration;
const ks = FR.map((_, i) => `k${i}`);
const seg = (t0, t1, names) => names.map((n, i) => ({ t: +(t0 + ((t1 - t0) * i) / (names.length - 1)).toFixed(3), pose: n }));
const keyframes = [{ t: 0, pose: 'k0' }, ...seg(ph.chop.start, ph.chop.end, ks), { t: ph.hold.end, pose: 'high' }, ...seg(ph.return.start, ph.return.end, ks.slice().reverse()).slice(1), { t: D, pose: 'k0' }];

const W0 = F.fk(poses.k0), g0 = EQ.barAt(W0).c, A = ANCHOR, ANCHOR_Z = A[2];
const rk = B5.uprightX(A[0], ANCHOR_Z, { toward: -1, hookY: 120 });
const ex = H.module_(meta, F.contacts, poses, keyframes);
ex.props = [rk.prop, B5.band('band', { joint: 'wrist_r', with: 'wrist_l' }, rk.anchor(A[1]))];
const rep = B5.scan(ex, { measure: B5.MEASURE.kneeFlexion });
B5.gate('band-twist-down-up', rep, { minBand: 0.3, range: [meta.checks.measure.min, meta.checks.measure.max] });

const Wl = F.fk(poses.high), gl = EQ.barAt(Wl).c, set = H.setKin(ex), rot = (c) => c.spine_l5.rot + c.spine_t12.rot + c.spine_t6.rot;
set('Trunk rotation', 'setup', `Turned ${B5.deg(K.yaw[0] + rot(poses.k0.ch))} toward the anchor (pelvis ${B5.deg(K.yaw[0])}, spine ${B5.deg(rot(poses.k0.ch))})`);
set('Trunk rotation', 'peak', `Turned ${B5.deg(-(K.yaw[1] + rot(poses.high.ch)))} away (pelvis ${B5.deg(-K.yaw[1])}, spine ${B5.deg(-rot(poses.high.ch))})`);
set('Hand path', 'setup', `Hands low beside the outside of the right thigh at ${Math.round(g0[1])} cm, band tied ${Math.round(A[1])} cm high, ${ANCHOR_Z} cm to the side`); set('Hand path', 'peak', `Above the left shoulder at ${Math.round(gl[1])} cm, ${Math.round(-gl[2])} cm left of the midline`);
set('Knee flexion', 'setup', B5.deg(H.kneeOf(W0, 'r'))); set('Knee flexion', 'peak', B5.deg(H.kneeOf(Wl, 'r')));
set('Elbow flexion', 'setup', B5.deg(C.elbowAng(W0))); set('Elbow flexion', 'peak', B5.deg(C.elbowAng(Wl)));
set('Tempo', 'setup', 'Low reach 0.6 s'); set('Tempo', 'peak', '1 s up, 0.3 s pause, 1.5 s down, 0.5 s reach');
console.log(`Band Twist (Down-Up): wrote ${L.write(ex)}\n  grip err ${JSON.stringify(err)} anchor ${A.map(Math.round)}\n  ${JSON.stringify(rep)}`);
