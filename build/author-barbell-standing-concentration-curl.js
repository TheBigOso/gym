// Barbell Standing Concentration Curl (GymVisual #5605; page not readable here, movement from the name and standard
// coaching): feet about hip width and planted, soft knees, hip hinge with a flat back until the trunk is well inclined
// (about 60 degrees from vertical); underhand grip (palms forward, right thumb out) about shoulder width (42 cm between
// the handle points). The upper arms hang straight down under the shoulders and stay there; the forearms curl the bar up
// in an arc toward the face, short squeeze, slow lower to straight arms. The hinge is held still (balanced over mid-foot
// with the bar, b3-back.js hinge). Arms: b6-02.js curlPosesW with the elbow pinned under the shoulder. Bilateral.
const L = require('./lib');
const { V, r1 } = L;
const { makeFamily } = require('./families/lunge');
const B = require('./families/b3-back');
const C = require('./families/b3-curls');
const W6 = require('./families/b6-02');
const meta = require('./meta/barbell-standing-concentration-curl.json');

const ENV = (k, d) => +(process.env[k] ?? d);
const GW = ENV('GW', 42), PITCH = ENV('P', -66), KNEE = ENV('KN', 20), A1 = ENV('A1', 128), EZ = ENV('EZ', 0);
const F = makeFamily({ toe: 6, half: 11 });
const feet = { r: { c: 'flat', x: 0 }, l: { c: 'flat', x: 0 } };
const UA = V.len(L.rig.byId.elbow_r.offset);
// arms hanging straight down for the balance solve (the bar mass sits under the shoulders)
const hang = (p) => { const q = L.clone(p); for (const s of ['r', 'l']) C.setArm(q, s, { plane: 0, elev: 1, axial: 0, flex: 4, pron: 0 }); return q; };
const hn = B.hinge(F, { pitch: PITCH, knee: KNEE, feet, spine: { l5: -3, t12: 0, t6: 1 }, sc: { protract: 4, elevate: -2 }, kg: 12, midfoot: 5, grip: 'bar', arms: (p) => {
  // shoulder flexion so the upper arm is vertical in the world: the trunk is pitched forward
  const q = L.clone(p); const W = L.fk(q, F.contacts); const lean = B.trunkLean(W);
  for (const s of ['r', 'l']) C.setArm(q, s, { plane: 90, elev: lean * 0.95, axial: 0, flex: 4, pron: 0 }); return q; } });
const base = hn.pose, contacts = F.contacts, W0 = L.fk(base, contacts), S = W0.shoulder_r.p;
const E = [S[0], S[1] - UA, S[2] + EZ];
let headGap = 1e9;
W6.buildCurlW(meta, {
  base, contacts, E, a1: A1, gw: GW, under: true, name: 'Barbell Standing Concentration Curl', a0: ENV('A0', 4),
  tempo: ['Arms hanging 0.6 s', '1.2 s up, 0.3 s squeeze, 2.4 s down, 0.9 s at the bottom'],
  fixed: ['ankle_r', 'ankle_l', 'pelvis'],
  rows: (set, { sw, Wb, Wt, poses }) => {
    for (const p of Object.values(poses)) { const W = L.fk(p, contacts); headGap = Math.min(headGap, W6.barClear(W, 32, /^(?!(head|jaw|nose|neck)$)/).d); }
    set('Bar clearance', 'setup', `Underhand, ${GW} cm between the handle points; bar ${r1(sw.barBody)} cm or more off the body`);
    set('Bar clearance', 'peak', `Grip width steady within ${sw.widthRange} cm; at the top the bar is ${r1(headGap)} cm from the head`);
    set('Trunk angle', 'setup', `≈${Math.round(B.trunkLean(Wb))}° from vertical (hip channel ≈${Math.round(base.ch.hip_r.flex)}°), knees ≈${Math.round(B.kneeOf(Wb, 'r'))}°`);
    set('Trunk angle', 'peak', 'Unchanged (held); upper arms hang straight down');
  },
  checks: (sw, { Wb, Wt }) => [[headGap > 0.5, `bar into the head (${r1(headGap)})`], [V.len(V.sub(Wb.elbow_r.p, Wt.elbow_r.p)) < 2.5, 'elbow drifts']],
});
