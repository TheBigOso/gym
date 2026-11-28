// Band Reverse Spider Curl (GymVisual #16971, Band Reverse Spider Curl; movement reference only, the page could not be read
// here, so the movement follows the name): spider-curl set-up (as author-dumbbell-spider-curl.js): back pad set low (30
// degrees), lie chest-down high on the pad so the shoulders sit at the top edge and the upper arms hang straight down in
// front of it, balls of the feet planted behind the bench. A band is looped low round the upright of a power rack
// standing in front of the bench, and the hands hold the two strands with an overhand grip (palms facing back, knuckles
// forward). Both forearms curl about the elbow hinge, knuckles leading and wrists straight, to the top; short squeeze,
// slow lower. The upper arms stay vertical (no shoulder swing); the band pulls down and forward from in front, so it
// loads the whole arc. Bilateral.
const L = require('./lib');
const { V, r1, clone } = L;
const C = require('./families/b3-curls');
const B3 = require('./families/b3-back');
const K = require('./families/b4-curls2');
const BP = require('./families/b5-bandpull');
const CB = require('./families/eq-cable');
const F = require('./families/b6-11');
const meta = require('./meta/band-reverse-spider-curl.json');

const ENV = (k, d) => +(process.env[k] ?? d);
const ANG = 30;
const P = K.chestOnPad({ ang: ANG, along: ENV('SA', 34), foot: [ENV('FX', -28), 24], neck: ENV('NK', -18), head: ENV('HD', -18) });
const { bench, contacts, body } = P;
const base = clone(body);
for (const s of ['r', 'l']) base.ch[`sc_${s}`] = { protract: 4, elevate: 0 };
const S = L.fk(base, contacts).shoulder_r.p;
const FS = [0, 0.2, 0.4, 0.6, 0.8, 1];
// bottom: the arm hangs straight down from the shoulder, a little out so it clears the pad edge; overhand grip, so the
// handle axis (thumb side) points to the midline
const reach = ENV('REACH', 61.3), hangOut = ENV('HO', 2), axisB = [0, 0, -1];
const p0 = K.handleArm(base, [S[0] + 0.5, S[1] - Math.sqrt(reach * reach - hangOut * hangOut), S[2] + hangOut], { axis: axisB, guesses: [[60, 75, 20, 8, 180], [90, 60, 0, 8, 170], [30, 80, 40, 8, 175]], contacts, minElev: 8 });
// top: pure elbow hinge, the hand finishing in front of the shoulder, knuckles up (handle axis still to the midline)
const keysR = K.hingeCurl(p0, { flexTop: ENV('FT', 122), target: V.add(S, [ENV('TGX', 8), 0, 2]), axisB, axisT: [0, 0, -1], FS, contacts });
const poses = {}, names = [];
keysR.forEach((q, i) => { delete q.__cost; K.mirrorArmTo(q); B3.wrapPose(q); if (i) K.unwrapTo(q, poses[names[i - 1]]); poses[`c${i}`] = q; names.push(`c${i}`); });
const top = names[names.length - 1];
poses.squeeze = clone(poses[top]); for (const s of ['r', 'l']) poses.squeeze.ch[`elbow_${s}`].flex = r1(poses.squeeze.ch[`elbow_${s}`].flex + 2);
const ph = (id) => C.phase(meta, id);
const keyframes = K.keys(names, FS, { t0: ph('lift').start, t1: ph('lift').end, t2: ph('top').end, t3: ph('lower').end, D: meta.timeline.duration, squeeze: 'squeeze' });
// band: looped low round the rack upright in front of the bench (clear of the head), two strands to the hands
const Wb = L.fk(poses.c0, contacts), handX = BP.feetStrands(Wb)[0][1][0];
const AX = r1(Math.max(handX + ENV('AXD', 30), Wb.head_c1.p[0] + ENV('HCL', 34))), AY = ENV('AY', 10);
const RK = BP.rackAnchor({ x: AX, y: AY }), ANCHOR = RK.anchor;
const ex = K.assemble(meta, { contacts, poses, keyframes, props: [bench.prop, RK.rack, RK.band] });
const rep = B3.sweep(ex, { fixed: ['pelvis', 'ankle_r', 'ankle_l'], boxes: P.boxes, bodySkip: ['chest', 'pecs_r', 'pecs_l', 'ribcage', 'abdomen'] }, 600);
let strandBox = { d: 1e9 };
const sc = BP.scan(ex, { strands: BP.rackStrands(ANCHOR), probe: (W, pz, t) => { for (const [a, b] of BP.rackStrands(ANCHOR)(W)) for (let k = 0; k <= 40; k++) { const p = V.lerp(a, b, k / 40); for (const bx of P.boxes) { const d = B3.boxDist(p, bx) - 0.6; if (d < strandBox.d) strandBox = { d: +d.toFixed(2), box: bx.id, t: +t.toFixed(2) }; } } } });
BP.gate('band-reverse-spider-curl', sc, { minLine: 0.3 });
CB.limits(poses);
if (strandBox.d < 0.5) { console.error(`FAIL: band through the bench ${JSON.stringify(strandBox)}`); process.exitCode = 1; }
if (rep.drift > 0.05) { console.error('FAIL: pelvis or feet drift'); process.exitCode = 1; }
if (rep.bodyBox < -0.5) { console.error(`FAIL: body through the bench ${JSON.stringify(rep.bodyBoxAt)}`); process.exitCode = 1; }
const Wt = L.fk(poses.squeeze, contacts);
C.fillCurlKin(ex, Wb, Wt, poses.c0, poses.squeeze, 'r', ['Arms hanging 0.8 s', '1.2 s up, 0.3 s squeeze, 2.3 s down, 1.0 s at the bottom']);
const ua = V.norm(V.sub(Wb.elbow_r.p, Wb.shoulder_r.p));
C.setKin(ex, 'Upper arm', 'setup', `≈${Math.round(V.angle(ua, [0, -1, 0]))}° from vertical (hanging); ≈${Math.round(C.upperArmFromTrunk(Wb, 'r'))}° from the trunk line (shoulder flexed)`);
C.setKin(ex, 'Upper arm', 'peak', 'Unchanged: pure elbow hinge');
C.setKin(ex, 'Bench angle', 'setup', `${ANG}° back pad (80 cm), seat 45 cm`);
C.setKin(ex, 'Bench angle', 'peak', `Trunk ≈${Math.round(90 - B3.trunkLean(Wb))}° above horizontal, along the pad`);
C.setKin(ex, 'Chest on the pad', 'setup', `Chest on the pad; head ${r1(P.along(Wb, 'head_c1') - P.PAD)} cm past the top edge, shoulders ${r1(P.along(Wb, 'shoulder_r') - P.PAD)} cm`);
C.setKin(ex, 'Chest on the pad', 'peak', 'Unchanged (the trunk does not move)');
F.bandRow(ex, `Looped round the rack upright ${ANCHOR[1]} cm off the floor, ${Math.round(ANCHOR[0] - handX)} cm in front of the hands; strands ${sc.strand[0]} cm with the arms hanging`, `Strands ${sc.strand[1]} cm at the top of the curl`);
const tf = B3.trunkLean(Wb);
ex.checks.measure = { name: 'trunkFlexion', min: Math.floor(tf - 3), max: Math.ceil(tf + 3) };
console.log(`Band Reverse Spider Curl: wrote ${L.write(ex)}\n  ${JSON.stringify(rep)}\n  ${JSON.stringify(sc)} strandBox ${JSON.stringify(strandBox)} pron ${poses.c0.ch.wrist_r.pron}->${poses[top].ch.wrist_r.pron} anchor ${ANCHOR}`);
