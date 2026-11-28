// Inverted Row between Chairs (GymVisual #7574; page not readable here, movement from the name and standard coaching):
// two sturdy chairs stand side by side with their backrests toward the athlete, about shoulder width apart (boxes stand in
// for the chairs: a thin backrest and the seat block). The athlete lies between them, holds the top edge of each backrest
// (neutral grip, thumbs toward the head), heels on the floor and the body straight, then pulls the chest up between the
// chairs, elbows close to the body, and lowers to long arms. The hands stay fixed on the backrests while the body turns
// about the heels (gear-g3-bars.js leanRow, style 'fixed'). Bilateral.
const L = require('./lib');
const { V, r1 } = L;
const H = require('./families/hips');
const EQ = require('./families/equip');
const X = require('./families/gear-g3-bars');
const meta = require('./meta/inverted-row-between-chairs.json');

const ID = 'inverted-row-between-chairs', ENV = (k, d) => +(process.env[k] ?? d);
const res = X.leanRow(meta, {
  style: 'fixed', alphaT: ENV('AT', 38), reachFlex: ENV('RF', 22), FS: [0, 0.07, 0.14, 0.22, 0.3, 0.38, 0.46, 0.54, 0.62, 0.7, 0.78, 0.86, 0.93, 1],
  topHand: (W, u, n) => V.add(W.shoulder_r.p, V.add(V.scale(u, ENV('HU', -10)), V.add(V.scale(n, ENV('HN', 13)), [0, 0, ENV('HZ', 14)]))),
  sc: (f) => ({ protract: r1(6 - 16 * f), elevate: 0 }),
  arm: (f, W, ub, nb, S) => ({ thumb: ub, palm: [0, 0, -1], elbow: V.add(S, V.add(V.scale(ub, -18 * f), V.add(V.scale(nb, -6 * f + 10 * (1 - f)), [0, 0, 6 + 2 * f]))), wElbow: 0.3 * f }),
});
const { ex, lp, alphaB, alphaT, contacts, poses, N, timing, Ht, Ws } = res;
const fails = res.fails.filter((f) => !/hands slide/.test(f));
// chairs: backrest top edge 2 cm above the grip point, outside the arms
const backY = Ht[1] + 1.5, zc = Ht[2]; // the fist wraps the 3 cm top edge: grip point at the edge centre
const cx = Ht[0] + ENV('CX', 17); // the hand holds the head-side end of each backrest
ex.props = [...X.chairProps({ x: cx, z: zc, sgn: 1, backY, id: 'chair_r' }), ...X.chairProps({ x: cx, z: -zc, sgn: -1, backY, id: 'chair_l' })];
const gripHelper = { id: 'grip_helper', kind: 'rings', center: [0, 0, 0], size: [1, 1, 1], params: { role: 'grip' } }; // closes the hands on the backrests (src/gear/g3-bars.js)
// chairs clear of the body (the gripping hands and forearms skipped)
let chairClr = { d: 1e9 };
for (const [i, W] of Ws.entries()) for (const b of ex.props) { if (b.kind !== 'box') continue; const c = X.boxClear(W, b, /^(hand|thumb|forearm)_/); if (c.d < chairClr.d) chairClr = { ...c, d: r1(c.d), box: b.id, t: r1((i / 120) * res.D) }; }
ex.props.push(gripHelper);
if (chairClr.d < 0) fails.push(`body into a chair (${JSON.stringify(chairClr)})`);
// hands held on the backrests by the stored arm channels (dense keys keep the grip points on the edges; no arm
// contacts, so the hands stay closed on the edge: the player flattens the fingers of a planted arm contact)
const sw = X.sweep(ex, { planted: ['leg_r', 'leg_l'], probe: (W) => { for (const s of ['r', 'l']) lp.hand2 = Math.max(lp.hand2 || 0, V.len(V.sub(EQ.gripPoint(W, s, 'handle').p, s === 'r' ? Ht : [Ht[0], Ht[1], -Ht[2]]))); } });
if (sw.slide > 0.05) fails.push(`planted contacts slide ${sw.slide}`);
if (lp.hand2 > 1.0) fails.push(`hands off the holds ${r1(lp.hand2)} cm`);
// hands held on the holds by arm contacts at weight 1 (the body moves under fixed hands)
const Wb = L.fk(poses.r0, contacts), Wt = L.fk(poses[`r${N}`], contacts);
const set = H.setKin(ex);
set('Body angle', 'setup', `≈${Math.round(alphaB)}° above the floor, heels down, straight from heels to head`); set('Body angle', 'peak', `≈${Math.round(alphaT)}° at the top; backrests ${Math.round(backY)} cm high`);
set('Elbow flexion', 'setup', `≈${X.elbowDeg(Wb)}° (arms long)`); set('Elbow flexion', 'peak', `≈${X.elbowDeg(Wt)}° with the chest between the chairs`);
set('Grip', 'setup', `Neutral grip on the backrest tops, hands ${Math.round(2 * Ht[2])} cm apart`); set('Grip', 'peak', 'Hands fixed on the chairs; the body turns about the heels');
set('Tempo', 'setup', `Hang ${timing.t0} s`); set('Tempo', 'peak', `${r1(timing.t1 - timing.t0)} s up, ${r1(timing.t2 - timing.t1)} s squeeze, ${r1(timing.t3 - timing.t2)} s down`);
console.log(`Inverted Row between Chairs: wrote ${L.write(ex)}\n  ${JSON.stringify({ alpha: [alphaB, alphaT], Ht: Ht.map(r1), backY: r1(backY), gripErr: res.worst, chairClr, hand2: r1(lp.hand2), sweep: { floor: sw.floor, slide: sw.slide, jump: sw.jump } })}\n  loop ${JSON.stringify({ ...lp, floor: r1(lp.floor), slide: +lp.slide.toFixed(3), hand: +lp.hand.toFixed(2) })}`);
X.report(ID, fails);
