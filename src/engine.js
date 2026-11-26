/* RepRig engine — data-driven 2.5D exercise rig.
   Pure math: no DOM. Used by the browser renderer and by the Node authoring/verification scripts.
   Units: centimetres, degrees. World: +X forward (figure's head direction in quadruped), +Y up, +Z figure's right. */
(function (root) {
  'use strict';
  const DEG = Math.PI / 180;

  const V = {
    add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    scale: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    len: (a) => Math.hypot(a[0], a[1], a[2]),
    norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
    lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
    angle: (a, b) => Math.acos(Math.max(-1, Math.min(1, V.dot(V.norm(a), V.norm(b))))) / DEG,
  };

  const Q = {
    id: () => [1, 0, 0, 0],
    axis: (ax, deg) => { const h = (deg * DEG) / 2, s = Math.sin(h), n = V.norm(ax); return [Math.cos(h), n[0] * s, n[1] * s, n[2] * s]; },
    mul: (a, b) => [
      a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
      a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
      a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
      a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0]],
    conj: (q) => [q[0], -q[1], -q[2], -q[3]],
    norm: (q) => { const l = Math.hypot(q[0], q[1], q[2], q[3]) || 1; return [q[0] / l, q[1] / l, q[2] / l, q[3] / l]; },
    rot: (q, v) => {
      const w = q[0], x = q[1], y = q[2], z = q[3];
      const tx = 2 * (y * v[2] - z * v[1]), ty = 2 * (z * v[0] - x * v[2]), tz = 2 * (x * v[1] - y * v[0]);
      return [v[0] + w * tx + (y * tz - z * ty), v[1] + w * ty + (z * tx - x * tz), v[2] + w * tz + (x * ty - y * tx)];
    },
    mirrorZ: (q) => [q[0], -q[1], -q[2], q[3]],
    fromBasis: (x, y, z) => {
      const m00 = x[0], m10 = x[1], m20 = x[2], m01 = y[0], m11 = y[1], m21 = y[2], m02 = z[0], m12 = z[1], m22 = z[2];
      const tr = m00 + m11 + m22; let q;
      if (tr > 0) { const s = 0.5 / Math.sqrt(tr + 1); q = [0.25 / s, (m21 - m12) * s, (m02 - m20) * s, (m10 - m01) * s]; }
      else if (m00 > m11 && m00 > m22) { const s = 2 * Math.sqrt(1 + m00 - m11 - m22); q = [(m21 - m12) / s, 0.25 * s, (m01 + m10) / s, (m02 + m20) / s]; }
      else if (m11 > m22) { const s = 2 * Math.sqrt(1 + m11 - m00 - m22); q = [(m02 - m20) / s, (m01 + m10) / s, 0.25 * s, (m12 + m21) / s]; }
      else { const s = 2 * Math.sqrt(1 + m22 - m00 - m11); q = [(m10 - m01) / s, (m02 + m20) / s, (m12 + m21) / s, 0.25 * s]; }
      return Q.norm(q);
    },
  };
  const X = [1, 0, 0], Y = [0, 1, 0], Z = [0, 0, 1];

  /* ---------- Joint conventions (right side; left side is the Z-mirror) ----------
     spine / neck : flex (+ forward), latFlex (+ toward right), rot (+ toward right)
     clavicle     : protract (+ forward), elevate (+ up)
     shoulder     : ISB globe Y-X-Y: plane (0 = abduction plane, 90 = flexion plane), elev, axial (+ internal)
     elbow        : flex          knee: flex          ankle: dorsi (+ dorsiflexion, - plantarflexion)
     wrist        : pron (+ pronation), flex (+ palmar flexion), dev (+ ulnar deviation)
     hip          : flex, abd, rot (+ internal) */
  const CHANNELS = {
    spine: ['flex', 'latFlex', 'rot'], neck: ['flex', 'latFlex', 'rot'], clavicle: ['protract', 'elevate'],
    shoulder: ['plane', 'elev', 'axial'], elbow: ['flex'], wrist: ['pron', 'flex', 'dev'],
    hip: ['flex', 'abd', 'rot'], knee: ['flex'], ankle: ['dorsi'], root: [], end: [],
  };
  function localQuatRight(type, c) {
    const g = (k) => (c && typeof c[k] === 'number' ? c[k] : 0);
    switch (type) {
      case 'spine': case 'neck':
        return Q.mul(Q.mul(Q.axis(Y, -g('rot')), Q.axis(X, g('latFlex'))), Q.axis(Z, -g('flex')));
      case 'clavicle': return Q.mul(Q.axis(Y, g('protract')), Q.axis(X, -g('elevate')));
      case 'shoulder': return Q.mul(Q.mul(Q.axis(Y, g('plane')), Q.axis(X, -g('elev'))), Q.axis(Y, g('axial')));
      case 'elbow': return Q.axis(Z, g('flex'));
      case 'wrist': return Q.mul(Q.mul(Q.axis(Y, g('pron')), Q.axis(Z, g('flex'))), Q.axis(X, -g('dev')));
      case 'hip': return Q.mul(Q.mul(Q.axis(Z, g('flex')), Q.axis(X, -g('abd'))), Q.axis(Y, g('rot')));
      case 'knee': return Q.axis(Z, -g('flex'));
      case 'ankle': return Q.axis(Z, g('dorsi'));
      default: return Q.id();
    }
  }
  function localQuat(joint, c) {
    const q = localQuatRight(joint.type, c);
    return joint.side === 'l' ? Q.mirrorZ(q) : q;
  }
  function rootQuat(r) {
    r = r || {};
    return Q.mul(Q.mul(Q.axis(Y, r.yaw || 0), Q.axis(Z, r.pitch || 0)), Q.axis(X, r.roll || 0));
  }
  const mz = (v) => [v[0], v[1], -v[2]];

  /* ---------- Rig build: expands bilateral definitions into _r / _l ---------- */
  function buildRig(def) {
    const bil = new Set(def.joints.filter((j) => j.bilateral).map((j) => j.id));
    const joints = [], byId = {};
    const push = (o) => { joints.push(o); byId[o.id] = o; };
    for (const j of def.joints) {
      if (j.bilateral) {
        for (const side of ['r', 'l']) {
          const parent = j.parent && bil.has(j.parent) ? `${j.parent}_${side}` : j.parent;
          push({ id: `${j.id}_${side}`, base: j.id, parent, side, type: j.type, offset: side === 'l' ? mz(j.offset) : j.offset.slice(), limits: j.limits || null });
        }
      } else push({ id: j.id, base: j.id, parent: j.parent || null, side: null, type: j.type, offset: (j.offset || [0, 0, 0]).slice(), limits: j.limits || null });
    }
    const resolveJoint = (name, side) => (bil.has(name) ? `${name}_${side}` : name);
    const shapes = [];
    for (const s of def.shapes) {
      const sides = s.bilateral ? ['r', 'l'] : [null];
      for (const side of sides) {
        const sfx = side ? `_${side}` : '';
        const o = { id: s.id + sfx, base: s.id, kind: s.kind, tone: s.tone || 'body', side, bias: s.depthBias || 0 };
        if (s.kind === 'capsule') { o.from = resolveJoint(s.from, side || 'r'); o.to = resolveJoint(s.to, side || 'r'); o.r = s.r.slice(); }
        else { o.joint = resolveJoint(s.joint, side || 'r'); o.c = side === 'l' ? mz(s.c) : s.c.slice(); o.r = s.r.slice(); }
        shapes.push(o);
      }
    }
    const muscles = [];
    for (const m of def.muscles) {
      const sides = m.bilateral ? ['r', 'l'] : [null];
      for (const side of sides) {
        const sfx = side ? `_${side}` : '';
        muscles.push({
          id: m.id + sfx, base: m.id, side, name: m.name,
          parts: m.parts.map((p) => ({ joint: resolveJoint(p.joint, side || 'r'), c: side === 'l' ? mz(p.c) : p.c.slice(), r: p.r.slice() })),
        });
      }
    }
    return { def, joints, byId, shapes, muscles, bilateral: bil };
  }

  /* ---------- Forward kinematics + two-bone IK ---------- */
  function evalPose(rig, pose, contacts) {
    const W = {};
    for (const j of rig.joints) {
      if (!j.parent) { W[j.id] = { p: (pose.root && pose.root.pos ? pose.root.pos : [0, 0, 0]).slice(), q: rootQuat(pose.root && pose.root.rot) }; continue; }
      const P = W[j.parent];
      const lq = localQuat(j, (pose.ch && pose.ch[j.id]) || {});
      W[j.id] = { p: V.add(P.p, Q.rot(P.q, j.offset)), q: Q.norm(Q.mul(P.q, lq)) };
    }
    if (contacts) for (const c of contacts) if (pose.ik && pose.ik[c.id] && (pose.ik[c.id].weight ?? 1) > 0.5) applyIK(rig, W, c, pose.ik[c.id]);
    return W;
  }
  function applyIK(rig, W, c, k) {
    const [a, b, e, tip] = c.chain; // e.g. shoulder_l, elbow_l, wrist_l, handtip_l
    const S = W[a].p, T = k.target;
    const la = V.len(rig.byId[b].offset), lb = V.len(rig.byId[e].offset);
    let d = V.len(V.sub(T, S));
    d = Math.max(Math.abs(la - lb) + 1e-3, Math.min(la + lb - 1e-3, d));
    const n = V.norm(V.sub(T, S));
    const x = (la * la - lb * lb + d * d) / (2 * d), h = Math.sqrt(Math.max(0, la * la - x * x));
    const pole = V.norm(c.pole);
    let pp = V.sub(pole, V.scale(n, V.dot(pole, n)));
    if (V.len(pp) < 1e-6) pp = [0, 1, 0];
    pp = V.norm(pp);
    const E = V.add(V.add(S, V.scale(n, x)), V.scale(pp, h));
    const Wt = V.add(S, V.scale(n, d));
    const ant = V.scale(pp, -1);
    const frame = (prox, dist) => {
      const y = V.norm(V.sub(prox, dist));
      let xa = V.sub(ant, V.scale(y, V.dot(ant, y))); xa = V.norm(xa);
      return Q.fromBasis(xa, y, V.cross(xa, y));
    };
    W[a].q = frame(S, E);
    W[b] = { p: E, q: frame(E, Wt) };
    W[e] = { p: Wt, q: k.handRot || c.handRot || W[b].q };
    if (tip && rig.byId[tip]) W[tip] = { p: V.add(Wt, Q.rot(W[e].q, rig.byId[tip].offset)), q: W[e].q };
  }

  /* ---------- Monotone cubic (Fritsch–Carlson) tracks ---------- */
  function makeTrack(ts, vs) {
    const n = ts.length, d = [], m = new Array(n).fill(0);
    for (let i = 0; i < n - 1; i++) d.push((vs[i + 1] - vs[i]) / (ts[i + 1] - ts[i] || 1e-9));
    for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
      const al = m[i] / d[i], be = m[i + 1] / d[i], hh = al * al + be * be;
      if (hh > 9) { const tau = 3 / Math.sqrt(hh); m[i] = tau * al * d[i]; m[i + 1] = tau * be * d[i]; }
    }
    return (t) => {
      if (t <= ts[0]) return vs[0];
      if (t >= ts[n - 1]) return vs[n - 1];
      let i = 0; while (i < n - 2 && t > ts[i + 1]) i++;
      const h = ts[i + 1] - ts[i], s = (t - ts[i]) / h, s2 = s * s, s3 = s2 * s;
      return (2 * s3 - 3 * s2 + 1) * vs[i] + (s3 - 2 * s2 + s) * h * m[i] + (-2 * s3 + 3 * s2) * vs[i + 1] + (s3 - s2) * h * m[i + 1];
    };
  }

  /* ---------- Timeline: named poses + keyframes -> continuous pose(t) ---------- */
  function flatten(pose, out, prefix) {
    for (const k in pose) {
      const v = pose[k], p = prefix ? `${prefix}.${k}` : k;
      if (typeof v === 'number') out[p] = v;
      else if (Array.isArray(v)) v.forEach((x, i) => { if (typeof x === 'number') out[`${p}.${i}`] = x; });
      else if (v && typeof v === 'object') flatten(v, out, p);
    }
    return out;
  }
  function setPath(obj, path, val) {
    const ks = path.split('.'); let o = obj;
    for (let i = 0; i < ks.length - 1; i++) {
      const k = ks[i], nk = ks[i + 1];
      if (!(k in o)) o[k] = /^\d+$/.test(nk) ? [] : {};
      o = o[k];
    }
    o[ks[ks.length - 1]] = val;
  }
  function buildTimeline(ex) {
    const kfs = ex.keyframes.map((k) => {
      const flat = flatten(ex.poses[k.pose] || {}, {}, '');
      if (k.set) Object.assign(flat, k.set);
      return { t: k.t, flat };
    });
    const paths = new Set(); kfs.forEach((k) => Object.keys(k.flat).forEach((p) => paths.add(p)));
    const tracks = {};
    for (const p of paths) {
      let last = null;
      const firstDefined = kfs.find((k) => p in k.flat);
      const vals = kfs.map((k) => { if (p in k.flat) last = k.flat[p]; return last === null ? firstDefined.flat[p] : last; });
      tracks[p] = makeTrack(kfs.map((k) => k.t), vals);
    }
    const act = {};
    for (const id in ex.activation || {}) {
      const pts = ex.activation[id];
      act[id] = makeTrack(pts.map((p) => p[0]), pts.map((p) => p[1]));
    }
    const duration = ex.timeline.duration;
    return {
      duration,
      pose(t) {
        const out = {};
        for (const p in tracks) setPath(out, p, tracks[p](t));
        return out;
      },
      activation(id, t) { const f = act[id]; return f ? Math.max(0, Math.min(1, f(t))) : 0; },
      phaseAt(t) { return ex.timeline.phases.find((ph) => t >= ph.start && t < ph.end) || ex.timeline.phases[ex.timeline.phases.length - 1]; },
    };
  }

  /* ---------- Camera + projection (orthographic) ---------- */
  function camera(yawDeg, pitchDeg) {
    const ps = yawDeg * DEG, ph = pitchDeg * DEG;
    const c = [Math.sin(ps) * Math.cos(ph), Math.sin(ph), Math.cos(ps) * Math.cos(ph)];
    const d = V.scale(c, -1);
    let r = V.cross(d, Y); if (V.len(r) < 1e-6) r = [1, 0, 0]; r = V.norm(r);
    const u = V.cross(r, d);
    return { c, r, u };
  }
  function project(cam, p, mirror) { const x = V.dot(p, cam.r); return [mirror ? -x : x, V.dot(p, cam.u), V.dot(p, cam.c)]; }

  // Orthographic outline of an ellipsoid (axes = world semi-axis vectors) -> {cx, cy, rx, ry, rot, depth}
  function ellipseOf(cam, center, axes, mirror) {
    const pc = project(cam, center, mirror);
    let a = 0, b = 0, d = 0; // S = P A A^T P^T
    for (const ax of axes) {
      let px = V.dot(ax, cam.r); if (mirror) px = -px;
      const py = V.dot(ax, cam.u);
      a += px * px; b += px * py; d += py * py;
    }
    const tr = a + d, det = a * d - b * b, disc = Math.sqrt(Math.max(0, (tr * tr) / 4 - det));
    const l1 = tr / 2 + disc, l2 = Math.max(1e-6, tr / 2 - disc);
    const rot = Math.abs(b) < 1e-9 ? (a >= d ? 0 : Math.PI / 2) : Math.atan2(l1 - a, b);
    return { cx: pc[0], cy: pc[1], rx: Math.sqrt(l1), ry: Math.sqrt(l2), rot, depth: pc[2] };
  }
  function shapeWorld(W, s) {
    if (s.kind === 'capsule') return { kind: 'capsule', a: W[s.from].p, b: W[s.to].p, r: s.r };
    const J = W[s.joint];
    return { kind: 'ellipsoid', c: V.add(J.p, Q.rot(J.q, s.c)), axes: [Q.rot(J.q, [s.r[0], 0, 0]), Q.rot(J.q, [0, s.r[1], 0]), Q.rot(J.q, [0, 0, s.r[2]])] };
  }

  /* ---------- Measurements used by HUD + verification ---------- */
  function measures(W, side) {
    // side: authored working side 'r'. Shoulder-line inclination about the trunk axis (inclinometer analogue, T1-T2).
    const axis = V.norm(V.sub(W.neck_c7.p, W.spine_t12.p));
    const sl = V.sub(W.shoulder_r.p, W.shoulder_l.p);
    const perp = (v) => V.sub(v, V.scale(axis, V.dot(v, axis)));
    const slp = perp(sl);
    let hz = perp([0, 0, 1]); hz = V.norm(hz);
    let up = V.norm(V.cross(axis, hz)); if (up[1] < 0) up = V.scale(up, -1);
    const incl = Math.atan2(V.dot(slp, up), V.dot(slp, hz)) / DEG;
    const elbowFlex = (s, e, w) => 180 - V.angle(V.sub(W[s].p, W[e].p), V.sub(W[w].p, W[e].p));
    return {
      shoulderLineIncl: incl,
      elbowL: elbowFlex('shoulder_l', 'elbow_l', 'wrist_l'),
      elbowR: elbowFlex('shoulder_r', 'elbow_r', 'wrist_r'),
      knee: 180 - V.angle(V.sub(W.hip_r.p, W.knee_r.p), V.sub(W.ankle_r.p, W.knee_r.p)),
      hip: 180 - V.angle(V.sub(W.spine_t12.p, W.pelvis.p), V.sub(W.knee_r.p, W.hip_r.p)) ,
      axis, hz, up,
    };
  }

  /* ---------- Small Levenberg–Marquardt solver (used for authoring) ---------- */
  function solveLM(x0, res, opt) {
    opt = opt || {}; let x = x0.slice(), lam = 1e-2;
    const cost = (r) => r.reduce((s, v) => s + v * v, 0);
    let r = res(x), c = cost(r);
    for (let it = 0; it < (opt.iters || 120); it++) {
      const n = x.length, m = r.length, J = [];
      for (let j = 0; j < n; j++) { const xp = x.slice(); xp[j] += 1e-3; const rp = res(xp); J.push(rp.map((v, i) => (v - r[i]) / 1e-3)); }
      const A = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, k) => { let s = 0; for (let q = 0; q < m; q++) s += J[i][q] * J[k][q]; return s; }));
      const g = Array.from({ length: n }, (_, i) => { let s = 0; for (let q = 0; q < m; q++) s += J[i][q] * r[q]; return -s; });
      for (let i = 0; i < n; i++) A[i][i] *= 1 + lam;
      const dx = gauss(A, g); if (!dx) break;
      const xn = x.map((v, i) => v + dx[i]), rn = res(xn), cn = cost(rn);
      if (cn < c) { x = xn; r = rn; const done = c - cn < 1e-10; c = cn; lam = Math.max(1e-7, lam * 0.4); if (done) break; } else lam *= 5;
    }
    return { x, cost: c };
  }
  function gauss(A, b) {
    const n = b.length, M = A.map((row, i) => row.concat([b[i]]));
    for (let i = 0; i < n; i++) {
      let p = i; for (let k = i + 1; k < n; k++) if (Math.abs(M[k][i]) > Math.abs(M[p][i])) p = k;
      if (Math.abs(M[p][i]) < 1e-12) return null;
      [M[i], M[p]] = [M[p], M[i]];
      for (let k = i + 1; k < n; k++) { const f = M[k][i] / M[i][i]; for (let j = i; j <= n; j++) M[k][j] -= f * M[i][j]; }
    }
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) { let s = M[i][n]; for (let j = i + 1; j < n; j++) s -= M[i][j] * x[j]; x[i] = s / M[i][i]; }
    return x;
  }

  root.RepRig = { DEG, V, Q, CHANNELS, localQuat, rootQuat, buildRig, evalPose, applyIK, makeTrack, buildTimeline, camera, project, ellipseOf, shapeWorld, measures, solveLM };
})(typeof globalThis !== 'undefined' ? globalThis : this);
