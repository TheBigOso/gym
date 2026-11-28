// Batch 6, family b6-09: cable face pulls (rope, seated or standing), shared by author-cable-seated-face-pull-with-rope.js
// and author-cable-standing-face-pull.js, plus small helpers for the other b6-09 authors. Builds on equip.js (EQ),
// eq-cable.js (C), b5-cablepull.js (B) and hips.js (H) without changing them.
const L = require('../lib');
const { V, r1, clone } = L;
const H = require('./hips');
const EQ = require('./equip');
const C = require('./eq-cable');
const B = require('./b5-cablepull');

// Rope face pull. opt: { base: { pose, contacts }, trunkAt(f, k) (optional; default: base pose with the shoulder blades
// moving from protracted to retracted), anchorY (pulley height, cm; default eye level), anchorDX (pulley distance in front
// of the shoulders), half (half the distance between the grip points, constant), meta, id, extraProps }
// The hands travel from a long reach toward the pulley to beside the face (grip midpoint 4 cm in front of the face so
// the rope's knot and strands stay in front of it), the elbows rising out to the sides at about shoulder height, the
// palms turning from facing each other to facing forward-in as the shoulders rotate out.
function facePull({ base, meta, id, anchorDY = 6, anchorDX = 120, half = 22, reachFlex = 12, elbowEnd = [12, 88], trunkAt = null, extraProps = [] }) {
  const tAt = trunkAt || ((f, k) => {
    const p = clone(base.pose);
    p.ch.sc_r = { protract: r1(10 - 24 * k), elevate: r1(2 + 2 * k) }; p.ch.sc_l = clone(p.ch.sc_r);
    p.ch.neck_c7 = { rot: 0, flex: 0 }; p.ch.head_c1 = { rot: 0, flex: 0 };
    return p;
  });
  const W0 = L.fk(tAt(0, 0), base.contacts), W1 = L.fk(tAt(1, 1), base.contacts), S0 = W0.shoulder_r.p;
  const eyeY = W1.head_c1.p[1] + 5;
  const ANCHOR = [r1(S0[0] + anchorDX), r1(eyeY + anchorDY), 0];
  const REACH = L.reach(reachFlex) + 7, toA = V.norm([ANCHOR[0] - S0[0], ANCHOR[1] - S0[1], 0]);
  const G0 = V.add([S0[0], S0[1], half], V.scale(toA, Math.sqrt(REACH * REACH - (S0[2] - half) ** 2)));
  const face = B.extreme(W1, 'head', [1, 0, 0])[0];
  const G1 = [r1(face + 4), r1(eyeY), half];
  const D0 = V.norm(V.sub(G0, S0)), D1 = B.armDir(elbowEnd[0], elbowEnd[1]);
  const P0 = [0, 0, -1], P1 = [0, 0, -1];
  const { poses, err, names } = B.pullKeys({
    contacts: base.contacts, trunkAt: tAt, N: 14, guess: { plane: 80, elev: 90, axial: -40, pron: 90, flex: reachFlex },
    gripAt: (f, k) => { const g = B.lerpV(G0, G1, k); g[1] += 3 * Math.sin(Math.PI * k); g[2] = half; return g; },
    elbowAt: (f, k, W) => V.add(W.shoulder_r.p, V.scale(V.norm(B.lerpV(D0, D1, k)), L.UA)), wElbowAt: (k) => 0.3 + 0.5 * k,
    palmAt: (f, k) => V.norm(B.lerpV(P0, P1, k)), wPalm: 2,
  });
  const keyframes = B.pullFrames(meta, names, { go: 'pull', hold: 'hold', back: 'return', rest: 'reset' });
  const ex = H.module_(meta, base.contacts, poses, keyframes);
  ex.props = [...extraProps, EQ.cableTower(ANCHOR, { offset: [10, -45] }), { id: 'rope', kind: 'cable', attachment: 'rope', anchor: ANCHOR, attach: { joint: 'wrist_r', with: 'wrist_l' } }];
  // loop checks: feet, floor, jumps, constant grip width, the cable line, the rope strands and the hands clear of the face
  const knot = (W) => EQ.attachPoint(W, { two: true, rope: true, anchor: ANCHOR });
  const rep = C.scan(ex, { line: (W) => [ANCHOR, knot(W)] });
  let ropeClr = { d: 1e9 }, handClr = { d: 1e9 };
  H.loopReport(ex, { probe: (W, pz, t) => {
    const rc = B.ropeClear(W, ANCHOR); if (rc.d < ropeClr.d) ropeClr = { d: +rc.d.toFixed(2), id: rc.id, t: +t.toFixed(2) };
    for (const s of ['r', 'l']) { const gp = EQ.gripPoint(W, s).p; for (const sid of ['head', 'jaw', 'nose', 'ear_r', 'ear_l', 'neck', 'chest', `deltoid_${s}`]) { const d = EQ.pointShape(W, gp, sid) - 2.5; if (d < handClr.d) handClr = { d: +d.toFixed(2), id: sid, t: +t.toFixed(2) }; } }
  } });
  C.gate(id, rep, { minLine: 1 });
  C.limits(poses);
  const fail = (m) => { console.error(`FAIL ${id}: ${m}`); process.exitCode = 1; };
  if (ropeClr.d < 0) fail(`rope into the body ${JSON.stringify(ropeClr)}`);
  if (handClr.d < 0) fail(`hands into the head ${JSON.stringify(handClr)}`);
  return { ex, poses, err, rep, ropeClr, handClr, ANCHOR, S0, G0, G1 };
}
// Kinematics rows shared by the face pulls
function facePullKin(ex, { poses, rep, ANCHOR, S0 }, contacts) {
  const Wb = L.fk(poses.start, contacts), Wt = L.fk(poses.end, contacts), set = H.setKin(ex), d = (v) => `≈${Math.round(v)}°`;
  const elevOf = (W) => V.angle(V.sub(W.elbow_r.p, W.shoulder_r.p), V.sub(W.pelvis.p, W.neck_c7.p));
  const hAbd = (W) => { const u = V.sub(W.elbow_r.p, W.shoulder_r.p); return Math.atan2(u[0], u[2]) / L.R.DEG; };
  const foreUp = (W) => V.angle(V.sub(W.wrist_r.p, W.elbow_r.p), [0, 1, 0]);
  set('Elbow height', 'setup', `Arms reaching to the pulley, ${d(elevOf(Wb))} of elevation`); set('Elbow height', 'peak', `${d(elevOf(Wt))} of elevation, elbow ${Math.round(Wt.elbow_r.p[1] - Wt.shoulder_r.p[1])} cm vs the shoulder joint`);
  set('Horizontal abduction', 'setup', `Upper arm ${d(hAbd(Wb))} in front of the frontal plane`); set('Horizontal abduction', 'peak', `Upper arm ${d(Math.abs(hAbd(Wt)))} ${hAbd(Wt) < 0 ? 'behind' : 'in front of'} the frontal plane`);
  set('External rotation', 'setup', `Forearm in line with the cable (${d(foreUp(Wb))} from vertical)`); set('External rotation', 'peak', `Forearm ${d(foreUp(Wt))} from vertical, hands beside the face`);
  set('Elbow flexion', 'setup', d(C.elbowAng(Wb))); set('Elbow flexion', 'peak', d(C.elbowAng(Wt)));
  set('Rope', 'setup', `Pulley ${ANCHOR[1]} cm high, ${Math.round(ANCHOR[0] - S0[0])} cm in front of the shoulders; ${Math.round(EQ.barAt(Wb).width)} cm between the hands`); set('Rope', 'peak', `Grip width unchanged (${rep.gripWidth.join('-')} cm); cable clear of the face by ${rep.line.d} cm or more`);
  set('Tempo', 'setup', 'Pause 0.5 s with the arms long'); set('Tempo', 'peak', '1.2 s pull, 0.5 s hold, 2 s back');
}


// One-arm pushdown keys (right arm, D-handle, palm down at 90 degrees turning back at the bottom): the upper arm comes from
// one free solve at mid range (elbow at the side, uaFwd degrees forward of the trunk line) and is then held, so the elbow
// stays still; one key per entry of `flexes` {name: elbow flexion}. Returns { arms: {name: right-arm channels}, err }.
function pushdownKeys(base, contacts, { uaFwd = 12, axial = -60, flexes, gz = null }) {
  const W0 = L.fk(base, contacts), S = W0.shoulder_r.p, GZ = gz ?? r1(S[2] - 1);
  const tr = V.norm(V.sub(W0.neck_c7.p, W0.pelvis.p)), lean = Math.atan2(tr[0], tr[1]);
  const a = uaFwd * Math.PI / 180 - lean, E = V.add(S, V.scale([Math.sin(a), -Math.cos(a), 0], L.UA));
  const palmAt = (flex) => { const b = a + flex * Math.PI / 180; return [-Math.cos(b), -Math.sin(b), 0]; };
  const mid = C.armR(base, contacts, { flex: 45, elbow: E, gripZ: GZ, axis: [0, 0, 1], palm: palmAt(45), guess: { plane: 60, elev: 6, axial, pron: 165, flex: 45 }, axialRef: axial, wAxial: 0.3, wDev: 0.03 });
  const arms = {}, err = {};
  let g = C.guessOf(mid);
  for (const [name, flex] of Object.entries(flexes)) {
    const p = C.armR(base, contacts, { flex, lockUA: true, gripZ: GZ, axis: [0, 0, 1], palm: palmAt(flex), guess: { ...g, flex }, axialRef: axial, wAxial: 0.05, wDev: 0.03 });
    err[name] = p.__err; g = C.guessOf(p);
    arms[name] = { shoulder_r: clone(p.ch.shoulder_r), elbow_r: clone(p.ch.elbow_r), wrist_r: clone(p.ch.wrist_r), sc_r: clone(p.ch.sc_r) };
  }
  return { arms, err, GZ };
}
// pose with the right arm from key `r` and the left arm from key `l` (mirrored copy of the right-arm channels)
function twoArms(base, arms, r, l) {
  const p = clone(base);
  for (const j of ['shoulder', 'elbow', 'wrist', 'sc']) { p.ch[`${j}_r`] = clone(arms[r][`${j}_r`]); p.ch[`${j}_l`] = clone(arms[l][`${j}_r`]); }
  return p;
}

// Inner surface of a thigh: the thigh axis point at fraction t (hip to knee), the inward direction (toward the midline,
// perpendicular to the thigh) and the rig thigh radius there (as in author-dumbbell-concentration-curl.js)
function thighInner(W, s, t) {
  const a = W[`hip_${s}`].p, b = W[`knee_${s}`].p, ax = V.norm(V.sub(b, a)), c = V.add(a, V.scale(V.sub(b, a), t));
  let m = [0, 0, s === 'r' ? -1 : 1]; m = V.norm(V.sub(m, V.scale(ax, V.dot(m, ax))));
  return { c, m, r: 8.7 + (5.4 - 8.7) * t };
}
// Right-arm keys with the elbow on a fixed world point E and the elbow bent to each value of `flexes` {name: deg}. The
// forearm moves in the plane of the upper arm and `fwd` (world); `palm`: 'front' = the forearm's flexor side faces the
// way the forearm folds (underhand on a curl / extension path), 'down' = the opposite (overhand), 'medial' = toward the
// midline (neutral, thumb along the fold direction). The upper arm comes from a free solve at `mid` and is then held.
function elbowKeys(base, contacts, { E, flexes, fwd = [1, 0, 0], palm = 'front', mid = 60, guess, wAxial = 0.05, wristFlex = 0 }) {
  const W0 = L.fk(base, contacts), u = V.norm(V.sub(E, W0.shoulder_r.p)), n = V.norm(V.sub(fwd, V.scale(u, V.dot(fwd, u))));
  const lat = V.norm(V.cross(u, n));
  const palmAt = (flex) => {
    const t = flex * Math.PI / 180, pf = V.add(V.scale(u, -Math.sin(t)), V.scale(n, Math.cos(t)));
    return palm === 'front' ? pf : palm === 'down' ? V.scale(pf, -1) : (lat[2] < 0 ? lat : V.scale(lat, -1));
  };
  const g0 = guess || { plane: 30, elev: 20, axial: 0, pron: 10, flex: mid };
  const m = C.armR(base, contacts, { flex: mid, elbow: E, wElbow: 4, palm: palmAt(mid), guess: g0, axialRef: g0.axial, wAxial: 0.05, wDev: 0.03, wristFlex });
  const poses = {}, err = { mid: m.__err };
  // the grip point follows the forearm in the u-n plane (its distance from the elbow taken from the mid solve)
  const Wm = L.fk(m, contacts), gd = V.len(V.sub(EQ.gripPoint(Wm, 'r').p, Wm.elbow_r.p)), Em = Wm.elbow_r.p;
  const gripAt = (flex) => { const t = flex * Math.PI / 180; return V.add(Em, V.scale(V.add(V.scale(u, Math.cos(t)), V.scale(n, Math.sin(t))), gd)); };
  const names = Object.keys(flexes).sort((a, b) => flexes[a] - flexes[b]);
  for (const list of [names.filter((k) => flexes[k] >= mid), names.filter((k) => flexes[k] < mid).reverse()]) {
    let g = C.guessOf(m);
    for (const name of list) {
      const p = C.armR(base, contacts, { flex: flexes[name], lockUA: true, palm: palmAt(flexes[name]), grip: gripAt(flexes[name]), wGrip: 1, guess: { ...g, flex: flexes[name] }, axialRef: g.axial, wAxial, wDev: 0.03, wristFlex });
      err[name] = p.__err; g = C.guessOf(p); poses[name] = C.strip(p);
    }
  }
  return { poses, err, mid: m, palmAt, gripAt };
}

// Lying (supine) cable cross lateral raise on a flat bench (head toward -X), one or both arms. The arm sweeps in the body's
// frontal plane (the world horizontal plane, a little above the shoulders) from beside the hips (abduction a0) to about
// shoulder level (a1), elbow soft, palm facing the feet / the thigh (the direction it moves away from). Cables cross: the
// right hand's cable runs to a pulley beyond the feet on the LEFT side and the left hand's to one on the right, about
// 1 m high, so the cables cross above the knees and pull the hands toward the feet and the midline. opt: { meta, id,
// two, a0, a1, lift (deg above horizontal), flex (elbow) }. Returns the module plus reports.
function lyingCrossRaise({ meta, id, two = true, a0 = 14, a1 = 84, lift = 8, flex = 14, N = 6 }) {
  const CH = require('./b3-chest');
  const { B: BB, base, contacts } = CH.benchBase(0);
  const p0 = clone(base);
  p0.ch.neck_c7 = { ...p0.ch.neck_c7 }; p0.ch.sc_r = { protract: 0, elevate: 0 }; p0.ch.sc_l = clone(p0.ch.sc_r);
  const W0 = L.fk(p0, contacts), S = W0.shoulder_r.p, reach = L.reach(flex) + 7;
  const DEG = Math.PI / 180, dirAt = (a) => V.norm([Math.cos(a * DEG), Math.sin(lift * DEG), Math.sin(a * DEG)]);
  const palmAt = (a) => V.norm([Math.sin(a * DEG), 0, -Math.cos(a * DEG)]);
  const poses = {}, err = {}, names = [];
  let g = { plane: 10, elev: a0, axial: 0, pron: 90, flex };
  const rest = (() => { const q = C.armR(p0, contacts, { flex, grip: V.add(S, V.scale(dirAt(a0), reach)), palm: palmAt(a0), guess: g, wPalm: 2, wDev: 0.05 }); return C.strip(q); })();
  for (let i = 0; i <= N; i++) {
    const f = i / N, k = B5ease(f), a = a0 + (a1 - a0) * k, name = i === 0 ? 'start' : i === N ? 'end' : `k${i}`;
    const q = C.armR(p0, contacts, { flex, grip: V.add(S, V.scale(dirAt(a), reach)), palm: palmAt(a), guess: g, wPalm: 2, wDev: 0.05, axialRef: g.axial, wAxial: 0.004 });
    err[name] = q.__err; g = C.guessOf(q);
    let pz = C.strip(q);
    if (two) pz = C.mirrorArm(pz); else for (const j of ['shoulder', 'elbow', 'wrist', 'sc']) pz.ch[`${j}_l`] = clone(rest.ch[`${j}_r`]);
    poses[name] = pz; names.push(name);
  }
  poses.endHold = clone(poses.end); poses.startHold = clone(poses.start);
  const keyframes = B.pullFrames(meta, names, { go: 'raise', hold: 'top', back: 'lower', rest: 'reset' });
  const ex = H.module_(meta, contacts, poses, keyframes);
  const benchProp = ex.props.find((p) => p.kind === 'bench') || BB.prop; benchProp.center = BB.prop.center;
  const feetX = Math.max(W0.toe_r.p[0], W0.toe_l.p[0]);
  const AR = [r1(feetX + 60), 100, -45], AL = [r1(feetX + 72), 112, 45]; // offset so the crossed cables pass clear of each other // right hand -> left pulley, left hand -> right pulley
  ex.props = [BB.prop, EQ.cableTower(AR, { offset: [12, -12], id: 'towerL' }), { id: 'handle_r', kind: 'cable', attachment: 'handle', anchor: AR, attach: { joint: 'wrist_r' } }];
  if (two) ex.props.push(EQ.cableTower(AL, { offset: [12, 12], id: 'towerR' }), { id: 'handle_l', kind: 'cable', attachment: 'handle', anchor: AL, attach: { joint: 'wrist_l' } });
  const rep = C.scan(ex, { line: (W) => [AR, EQ.gripPoint(W, 'r').p], lineSkip: /^(hand|thumb|forearm)_r$/ });
  let lineL = { d: 1e9 }, padHand = 1e9, lineCross = 1e9;
  H.loopReport(ex, { probe: (W, pz, t) => {
    if (two) { const c = EQ.lineClear(W, AL, EQ.gripPoint(W, 'l').p, 0.5, { skip: /^(hand|thumb|forearm)_l$/ }); if (c.d < lineL.d) lineL = { d: +c.d.toFixed(2), id: c.id, t: +t.toFixed(2) }; }
    for (const sd of two ? ['r', 'l'] : ['r']) { const gp = EQ.gripPoint(W, sd).p; if (Math.abs(gp[2]) < 18) padHand = Math.min(padHand, gp[1] - 3 - BB.top); }
    if (two) { const a = EQ.gripPoint(W, 'r').p, b = EQ.gripPoint(W, 'l').p; lineCross = Math.min(lineCross, segSeg(AR, a, AL, b)); }
  } });
  C.gate(id, rep, { minLine: 1, checkWidth: false });
  C.limits(poses);
  const fail = (m) => { console.error(`FAIL ${id}: ${m}`); process.exitCode = 1; };
  if (two && lineL.d < 1) fail(`left cable into the body ${JSON.stringify(lineL)}`);
  if (padHand < 0) fail(`hand into the bench ${padHand.toFixed(2)}`);
  if (two && lineCross < 1.5) fail(`the two cables touch (${lineCross.toFixed(2)} cm)`);
  return { ex, poses, err, rep, lineL, padHand, lineCross, AR, AL, contacts, B: BB };
}
const B5ease = (f) => f * f * (3 - 2 * f);
// closest distance between segments p1-q1 and p2-q2 (sampled)
function segSeg(p1, q1, p2, q2, n = 40) {
  let best = 1e9;
  for (let i = 0; i <= n; i++) { const a = V.add(p1, V.scale(V.sub(q1, p1), i / n)); for (let j = 0; j <= n; j++) best = Math.min(best, V.len(V.sub(a, V.add(p2, V.scale(V.sub(q2, p2), j / n))))); }
  return best;
}

module.exports = { facePull, facePullKin, pushdownKeys, twoArms, thighInner, elbowKeys, lyingCrossRaise };
