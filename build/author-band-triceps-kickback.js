// Band Triceps Kickback (GymVisual #10725, Band Triceps Kickback; movement reference only, the page could not be read here,
// so the movement follows the name): standing on the middle of the band, feet about hip width (planted leg contacts), one
// band end under the ball of each foot. Hip hinge with a flat back until the trunk is about 35 degrees above horizontal,
// knees bent about 25 degrees. The upper arms are drawn back along the sides of the trunk (elbows tucked, a little above
// the trunk line) and held still; only the elbows move, from about 95 degrees (forearms hanging) to straight back, short
// squeeze, slow return. Neutral grip (palms facing in). The strands run from the feet back and up past the outside of
// the legs to the hands. Bilateral: right arm solved from upper-arm and forearm directions, left mirrored.
const L = require('./lib');
const { V, r1, clone } = L;
const H = require('./families/hips');
const F3 = require('./families/b3-shoulders');
const B = require('./families/b5-bandpull');
const CB = require('./families/eq-cable');
const F = require('./families/b6-11');
const meta = require('./meta/band-triceps-kickback.json');

const ENV = (k, d) => +(process.env[k] ?? d);
const TRUNK = ENV('TRUNK', 35), base = F3.hinge({ stance: ENV('ST', 9), knee: 25, trunk: TRUNK });
const D2R = Math.PI / 180, W0 = L.fk(base.pose, base.contacts);
// upper arm: back along the trunk, A deg below horizontal, a little out to the side (OUT, z component)
const A = ENV('A', 20), OUT = ENV('OUT', 0.2);
const u = V.norm([-Math.cos(A * D2R), -Math.sin(A * D2R), OUT]);
// forearm at elbow flexion phi: the upper-arm direction turned by phi toward the front (sagittal plane), same z share
const fAt = (phi) => { const a = (180 + A + phi) * D2R; return V.norm([Math.cos(a), Math.sin(a), OUT * Math.max(0, Math.cos(phi * D2R)) + 0.04]); };
const FL = { bottom: 95, e25: 72, e50: 50, e75: 28, top: ENV('TOPF', 6) };
const poses = {}, err = {}; let guess = { plane: -55, elev: 50, axial: 0, flex: 95, pron: 90 };
for (const [name, phi] of Object.entries(FL)) {
  const q = B.armFrom(base.pose, base.contacts, { sc: { protract: -6, elevate: 0 }, u, f: fAt(phi), palm: [0, 0, -1], guess, flexCap: 0.3 });
  err[name] = q.__err; guess = F3.armGuess(q); poses[name] = F3.mirrorArm(q);
}
poses.squeeze = clone(poses.top); poses.squeeze.ch.sc_r.protract = poses.squeeze.ch.sc_l.protract = -8;
const ph = Object.fromEntries(meta.timeline.phases.map((p) => [p.id, p])), D = meta.timeline.duration;
const keyframes = [{ t: 0, pose: 'bottom' }, { t: ph.extend.start, pose: 'bottom' }, { t: 0.95, pose: 'e25' }, { t: 1.2, pose: 'e50' }, { t: 1.45, pose: 'e75' }, { t: ph.squeeze.start, pose: 'top' },
  { t: ph.squeeze.end, pose: 'squeeze' }, { t: 2.8, pose: 'e75' }, { t: 3.3, pose: 'e50' }, { t: 3.8, pose: 'e25' }, { t: ph.reset.start, pose: 'bottom' }, { t: D, pose: 'bottom' }];
const ex = H.module_(meta, base.contacts, poses, keyframes);
ex.props = B.feetBands();
const rep = F.feetScan(ex);
B.gate('band-triceps-kickback', rep, { minLine: 0.3 });
CB.limits(poses);
const Wb = L.fk(poses.bottom, base.contacts), Wt = L.fk(poses.squeeze, base.contacts), set = H.setKin(ex);
const elbowAng = (W) => 180 - V.angle(V.sub(W.shoulder_r.p, W.elbow_r.p), V.sub(W.wrist_r.p, W.elbow_r.p));
const trunkUp = (W) => Math.atan2(W.neck_c7.p[1] - W.pelvis.p[1], W.neck_c7.p[0] - W.pelvis.p[0]) / D2R;
const uaTrunk = (W) => V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), V.sub(W.pelvis.p, W.neck_c7.p));
set('Elbow flexion', 'setup', `≈${Math.round(elbowAng(Wb))}° (forearms hanging)`); set('Elbow flexion', 'peak', `≈${Math.round(elbowAng(Wt))}° (arms straight back)`);
set('Upper arm to trunk', 'setup', `≈${Math.round(uaTrunk(Wb))}° from the trunk line, ${Math.round(A)}° below horizontal`); set('Upper arm to trunk', 'peak', `≈${Math.round(uaTrunk(Wt))}° (held still)`);
set('Trunk inclination', 'setup', `≈${Math.round(trunkUp(Wb))}° above horizontal; knees ≈${Math.round(rep.kneeR[0])}°`); set('Trunk inclination', 'peak', 'Unchanged');
F.bandRow(ex, `One band per hand, under the ball of each foot; strand ${rep.strand[0]} cm with the forearms hanging`, `Strand ${rep.strand[1]} cm with the arms straight back (most stretch, most tension)`);
set('Tempo', 'setup', 'Hold the hinge 0.5 s'); set('Tempo', 'peak', '1.0 s back, 0.6 s squeeze, 1.8 s forward');
console.log(`Band Triceps Kickback: wrote ${L.write(ex)}\n  keys ${JSON.stringify(err)}\n  ${JSON.stringify(rep)} trunk ${r1(trunkUp(Wb))}`);
