// Realistic athlete for RepRig: MakeHuman-derived skinned mesh driven by RepRig world quaternions.
// Coordinates: RepRig cm (+X fwd, +Y up, +Z figure's right) -> three metres (same axes).
import * as THREE from 'three';
const R = globalThis.RepRig, { V, Q } = R;
const U = 0.01;
const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const band = (a0, a1, b1, b0, x) => sm(a0, a1, x) * (1 - sm(b1, b0, x)); // rises a0..a1, falls b1..b0

const b64 = (s) => { const bin = atob(s), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); return u8; };
// Decode the packed character (src/character/*.json): u16 triangles, u8 skin weights, positions as int16 hundredths of a cm.
export function loadCharacter(d) {
  const sw8 = b64(d.skinW), skinW = new Float32Array(sw8.length); for (let i = 0; i < sw8.length; i++) skinW[i] = sw8[i] / 255;
  const t16 = new Uint16Array(b64(d.tris).buffer), tris = new Uint32Array(t16.length); tris.set(t16);
  const sh = { nv: d.nv, nt: d.nt, bones: d.bones, parents: d.parents, groups: d.groups, tris, skinIdx: b64(d.skinIdx), skinW, vgroup: b64(d.vgroup) };
  const variant = (k) => { const v = d.variants[k], p16 = new Int16Array(b64(v.pos).buffer), P = new Float32Array(p16.length); for (let i = 0; i < p16.length; i++) P[i] = p16[i] / 100; return { ch: v, pos: P.buffer, look: k === 'f' ? { ...d.look, ...d.femaleLook } : { ...d.look } }; };
  return { sh, variant, name: d.name };
}

// RepRig joint that drives each MakeHuman bone, and the RepRig child joint that defines the segment direction (for rest-pose alignment).
const DRIVE = {
  pelvis: ['pelvis'], spine_01: ['spine_l5'], spine_02: ['spine_l5', 'spine_t12'], spine_03: ['spine_t12'], spine_04: ['spine_t6'], neck_01: ['neck_c7'], head: ['head_c1'],
};
for (const [s, S] of [['r', 'r'], ['l', 'l']]) {
  DRIVE[`clavicle_${s}`] = [`sc_${S}`];
  DRIVE[`upperarm_${s}`] = [`shoulder_${S}`, null, `elbow_${S}`];
  DRIVE[`lowerarm_${s}`] = [`elbow_${S}`, null, `wrist_${S}`];
  DRIVE[`hand_${s}`] = [`wrist_${S}`, null, `handtip_${S}`];
  DRIVE[`thigh_${s}`] = [`hip_${S}`, null, `knee_${S}`];
  DRIVE[`calf_${s}`] = [`knee_${S}`, null, `ankle_${S}`];
  DRIVE[`foot_${s}`] = [`ankle_${S}`, null, `toe_${S}`];
}
const arc = (a, b) => { // shortest rotation taking unit a to unit b, as [w,x,y,z]
  a = V.norm(a); b = V.norm(b); const d = V.dot(a, b);
  if (d > 0.999999) return [1, 0, 0, 0];
  const c = V.cross(a, b); return Q.norm([1 + d, c[0], c[1], c[2]]);
};

export function buildAthlete(sh, ch, posBuf, rig, look) {
  const nv = sh.nv, P = new Float32Array(posBuf); // cm
  const B = sh.bones.slice(), par = sh.parents.slice();
  const head = ch.heads.map((h) => h.slice()), tail = ch.tails.map((h) => h.slice());
  const bi = (n) => B.indexOf(n);
  const H = (n) => head[bi(n)], T = (n) => tail[bi(n)];
  const skinIdx = new Uint16Array(nv * 4), skinW = new Float32Array(sh.skinW);
  for (let i = 0; i < nv * 4; i++) skinIdx[i] = sh.skinIdx[i];

  // ---- split spine_03 into spine_03 (lower thorax) + spine_04 (upper thorax) so RepRig's T12 and T6 both have a pivot
  const i3 = bi('spine_03'), yLo = H('spine_03')[1], yN = H('neck_01')[1];
  const y4 = yLo + (yN - yLo) * 0.46;
  const i4 = B.length; B.push('spine_04'); par.push('spine_03');
  head.push([H('spine_03')[0] - 2.0, y4, 0]); tail.push(H('neck_01').slice());
  for (const n of ['neck_01', 'clavicle_l', 'clavicle_r']) par[bi(n)] = 'spine_04';
  for (let v = 0; v < nv; v++) {
    for (let k = 0; k < 4; k++) if (skinIdx[v * 4 + k] === i3 && skinW[v * 4 + k] > 0) {
      const w = skinW[v * 4 + k], f = sm(y4 - 7, y4 + 7, P[v * 3 + 1]);
      if (f <= 0.001) break;
      // find a free/smallest slot for the new bone
      let slot = -1, min = 1e9;
      for (let m = 0; m < 4; m++) { if (m === k) continue; if (skinW[v * 4 + m] < min) { min = skinW[v * 4 + m]; slot = m; } }
      if (f >= 0.999) { skinIdx[v * 4 + k] = i4; break; }
      if (min < 0.08) { const lost = skinW[v * 4 + slot]; skinIdx[v * 4 + slot] = i4; skinW[v * 4 + slot] = w * f + lost * f; skinW[v * 4 + k] = w * (1 - f) + lost * (1 - f); }
      else if (f > 0.5) skinIdx[v * 4 + k] = i4;
      break;
    }
  }

  // ---- forearm twist bones: carry the hand's roll up the forearm so the wrist does not wring
  function shiftWeight(v, k, to, f) {
    if (f <= 0.001) return; const w = skinW[v * 4 + k];
    if (f >= 0.999) { skinIdx[v * 4 + k] = to; return; }
    let slot = -1, min = 1e9;
    for (let m = 0; m < 4; m++) { if (m === k) continue; if (skinIdx[v * 4 + m] === to && skinW[v * 4 + m] > 0) { skinW[v * 4 + m] += w * f; skinW[v * 4 + k] = w * (1 - f); return; } if (skinW[v * 4 + m] < min) { min = skinW[v * 4 + m]; slot = m; } }
    if (min < 0.1) { const lost = skinW[v * 4 + slot]; skinIdx[v * 4 + slot] = to; skinW[v * 4 + slot] = (w + lost) * f; skinW[v * 4 + k] = (w + lost) * (1 - f); }
    else if (f > 0.5) skinIdx[v * 4 + k] = to;
  }
  const FR = {}; // per-side rest frames
  for (const s of ['r', 'l']) {
    const iF = bi('lowerarm_' + s), a = H('lowerarm_' + s), b = H('hand_' + s), ax = V.norm(V.sub(b, a)), len = V.len(V.sub(b, a));
    const iT = B.length; B.push('lowerarm_twist_' + s); par.push('lowerarm_' + s); head.push(a.slice()); tail.push(b.slice());
    for (let v = 0; v < nv; v++) for (let k = 0; k < 4; k++) if (skinIdx[v * 4 + k] === iF && skinW[v * 4 + k] > 0) {
      const t = ((P[v * 3] - a[0]) * ax[0] + (P[v * 3 + 1] - a[1]) * ax[1] + (P[v * 3 + 2] - a[2]) * ax[2]) / len;
      shiftWeight(v, k, iT, sm(0.12, 0.88, t)); break;
    }
    // hand frame: fingers direction + palm normal (MakeHuman rest pose has the palms facing down)
    const f = V.norm(V.sub(H('middle_01_' + s), b)); let n = V.cross(f, V.sub(H('pinky_01_' + s), H('index_01_' + s)));
    if (n[1] > 0) n = V.scale(n, -1); n = V.norm(V.sub(n, V.scale(f, V.dot(n, f))));
    const nf = V.scale(f, -1);
    // foot frame: toe direction + up
    const fd = V.norm(V.sub(T('foot_' + s), H('foot_' + s))); let fu = V.norm(V.sub([0, 1, 0], V.scale(fd, fd[1])));
    FR[s] = { foreAx: ax, f, n, handQ: Q.fromBasis(n, nf, V.cross(n, nf)), footQ: Q.fromBasis(fd, fu, V.cross(fd, fu)), toe: V.norm(V.sub(T('ball_' + s), H('ball_' + s))) };
  }

  // ---- per-vertex helpers (rest pose) ----
  const wOf = (v, set) => { let s = 0; for (let k = 0; k < 4; k++) if (set.has(skinIdx[v * 4 + k])) s += skinW[v * 4 + k]; return s; };
  const setOf = (...names) => new Set(names.map(bi).filter((i) => i >= 0));
  const SIDE = { r: 1, l: -1 };
  const fingers = (s) => B.filter((n) => /^(thumb|index|middle|ring|pinky)_/.test(n) && n.endsWith('_' + s));
  const armSet = { r: setOf('upperarm_r', 'lowerarm_r', 'hand_r', ...fingers('r')), l: setOf('upperarm_l', 'lowerarm_l', 'hand_l', ...fingers('l')) };
  const armAll = new Set([...armSet.r, ...armSet.l]);
  const foreAll = setOf('lowerarm_r', 'hand_r', ...fingers('r'), 'lowerarm_l', 'hand_l', ...fingers('l'));
  const legSet = { r: setOf('thigh_r', 'calf_r', 'foot_r', 'ball_r'), l: setOf('thigh_l', 'calf_l', 'foot_l', 'ball_l') };
  const headSet = setOf('head', 'neck_01');

  const N = new Float32Array(nv * 3), tr = sh.tris;
  function computeNormals() {
    N.fill(0);
  for (let t = 0; t < tr.length; t += 3) {
      const a = tr[t] * 3, b = tr[t + 1] * 3, c = tr[t + 2] * 3;
      const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      for (const i of [a, b, c]) { N[i] += nx; N[i + 1] += ny; N[i + 2] += nz; }
    }
    for (let v = 0; v < nv; v++) { const l = Math.hypot(N[v * 3], N[v * 3 + 1], N[v * 3 + 2]) || 1; N[v * 3] /= l; N[v * 3 + 1] /= l; N[v * 3 + 2] /= l; }
  }
  computeNormals();

  let cav = new Float32Array(nv);
  function computeCavity() {
  // cavity (concavity) shading: Laplacian along the normal, smoothed -> darkens grooves between muscles
    const nbSum = new Float32Array(nv * 3), nbCnt = new Uint16Array(nv);
    for (let t = 0; t < tr.length; t += 3) for (let e = 0; e < 3; e++) {
      const a = tr[t + e], b = tr[t + (e + 1) % 3];
      nbSum[a * 3] += P[b * 3]; nbSum[a * 3 + 1] += P[b * 3 + 1]; nbSum[a * 3 + 2] += P[b * 3 + 2]; nbCnt[a]++;
    }
    cav = new Float32Array(nv);
    for (let v = 0; v < nv; v++) { const c = nbCnt[v] || 1; cav[v] = ((nbSum[v * 3] / c - P[v * 3]) * N[v * 3] + (nbSum[v * 3 + 1] / c - P[v * 3 + 1]) * N[v * 3 + 1] + (nbSum[v * 3 + 2] / c - P[v * 3 + 2]) * N[v * 3 + 2]); }
    for (let it = 0; it < 2; it++) { const acc = new Float32Array(nv), cnt = new Uint16Array(nv); for (let t = 0; t < tr.length; t += 3) for (let e = 0; e < 3; e++) { const a = tr[t + e], b = tr[t + (e + 1) % 3]; acc[a] += cav[b]; cnt[a]++; } for (let v = 0; v < nv; v++) cav[v] = cav[v] * 0.5 + (acc[v] / (cnt[v] || 1)) * 0.5; }


  }

  // ---- landmarks ----
  const hipY = H('thigh_r')[1], hipZ = Math.abs(H('thigh_r')[2]), hipX = H('thigh_r')[0];
  const pelY = H('pelvis')[1], neckY = H('neck_01')[1], L = neckY - pelY;
  const shZ = Math.abs(H('upperarm_r')[2]), shY = H('upperarm_r')[1];
  const uOf = (y) => (y - pelY) / L;
  const segFrame = (a, b) => { const ax = V.norm(V.sub(b, a)); let f = V.sub([1, 0, 0], V.scale(ax, ax[0])); f = V.norm(f); const l = V.cross(ax, f); return { a, len: V.len(V.sub(b, a)), ax, f, l }; };
  const segAt = (fr, v) => { const d = [P[v * 3] - fr.a[0], P[v * 3 + 1] - fr.a[1], P[v * 3 + 2] - fr.a[2]]; const t = V.dot(d, fr.ax) / fr.len; const rx = V.dot(d, fr.f), rl = V.dot(d, fr.l), rr = Math.hypot(rx, rl) || 1; return { t, cf: rx / rr, cl: rl / rr, r: rr }; };

  // ---- muscles: per-vertex weights for each RepRig muscle id ----
  const M = {}; const add = (id, v, w) => { if (w > 0.02) (M[id] || (M[id] = [])).push(v, Math.min(1, w)); };
  for (const s of ['r', 'l']) {
    const sg = SIDE[s];
    const thigh = segFrame(H('thigh_' + s), H('calf_' + s)), calf = segFrame(H('calf_' + s), H('foot_' + s)), arm = segFrame(H('upperarm_' + s), H('lowerarm_' + s));
    const up = (() => { let u = V.sub([0, 1, 0], V.scale(arm.ax, arm.ax[1])); return V.norm(u); })();
    const thSet = setOf('thigh_' + s), cfSet = setOf('calf_' + s), uaSet = setOf('upperarm_' + s, 'clavicle_' + s), ua1 = setOf('upperarm_' + s);
    for (let v = 0; v < nv; v++) {
      if (sh.vgroup[v] !== 0) continue;
      const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2] * sg, nx = N[v * 3], nz = N[v * 3 + 2] * sg;
      if (s === 'r' && N[v * 3] > 0.05) { // core is one group: rectus abdominis strip across the midline
        const wA = wOf(v, armAll), t0 = (1 - sm(0.25, 0.6, wA)) * (1 - sm(0.5, 0.9, wOf(v, legSet.r) + wOf(v, legSet.l)));
        if (t0 > 0.05) add('core', v, t0 * sm(0.05, 0.45, N[v * 3]) * band(0.0, 0.07, 0.5, 0.57, uOf(y)) * (1 - sm(6.2, 8.2, Math.abs(P[v * 3 + 2]))));
      }
      if (z < -1.5) continue;
      const wArm = wOf(v, armAll), wLeg = wOf(v, legSet[s]), wTh = wOf(v, thSet), wCf = wOf(v, cfSet);
      const torso = (1 - sm(0.25, 0.6, wArm)) * (1 - sm(0.5, 0.9, wOf(v, legSet.r) + wOf(v, legSet.l))) * (1 - sm(0.3, 0.7, wOf(v, headSet)));
      const u = uOf(y), zin = sm(-0.5, 1.0, z);
      const front = sm(0.05, 0.45, nx), back = sm(0.05, 0.45, -nx);
      if (torso > 0.05) {
        add('obliques_' + s, v, torso * zin * band(0.04, 0.1, 0.44, 0.52, u) * sm(6.0, 8.2, z) * sm(-0.55, -0.15, nx));
        add('serratus_' + s, v, torso * band(0.47, 0.52, 0.66, 0.72, u) * sm(9, 11.5, z) * sm(-0.1, 0.25, nx) * sm(0.25, 0.6, nz));
        add('pec_' + s, v, torso * front * band(0.57, 0.63, 0.84, 0.9, u) * sm(0.6, 2.2, z) * (1 - sm(shZ - 4.5, shZ - 1.5, z)));
        add('lats_' + s, v, torso * band(0.3, 0.38, 0.66, 0.74, u) * sm(4.5, 7, z) * sm(0.2, -0.2, nx) * (1 - sm(0.2, 0.6, nx)));
        add('spinal_extensors_' + s, v, torso * back * zin * band(0.03, 0.09, 0.58, 0.66, u) * (1 - sm(4.6, 6.6, z)));
        add('rhomboids_midtrap_' + s, v, torso * back * zin * band(0.6, 0.66, 0.9, 0.97, u) * (1 - sm(7.5, 10, z)));
        add('infraspinatus_' + s, v, torso * back * band(0.58, 0.64, 0.82, 0.88, u) * sm(8, 10.5, z) * (1 - sm(shZ - 3, shZ + 1, z)));
      }
      // hip girdle (pelvis + top of thigh)
      const girdle = (1 - sm(0.25, 0.6, wArm)) * sm(0.3, 0.7, wOf(v, setOf('pelvis', 'thigh_' + s, 'spine_01')));
      if (girdle > 0.05) {
        add('glute_max_' + s, v, girdle * sm(0.0, 0.35, -nx) * band(hipY - 13, hipY - 8, hipY + 6, hipY + 11, y) * sm(0.8, 2.5, z) * sm(hipX + 2, hipX - 2, x));
        add('glute_med_' + s, v, girdle * band(hipY + 0, hipY + 3.5, hipY + 10, hipY + 14, y) * sm(hipZ - 1.5, hipZ + 1.5, z) * (1 - sm(0.55, 0.85, Math.abs(nx))) * sm(0.3, 0.6, nz));
        add('hip_flexors_' + s, v, girdle * sm(0.25, 0.55, nx) * band(hipY - 7, hipY - 3, hipY + 6, hipY + 10, y) * band(3, 5.5, hipZ + 3, hipZ + 6, z));
      }
      if (wTh + wCf > 0.3 && wLeg > 0.5) {
        const a = segAt(thigh, v), med = -a.cl * sg; // medial positive
        const onTh = sm(0.3, 0.7, wTh + wCf * 0.5) * (1 - sm(0.97, 1.06, a.t));
        add('quads_' + s, v, onTh * band(0.1, 0.2, 0.9, 1.0, a.t) * sm(-0.25, 0.15, a.cf) * (1 - sm(0.55, 0.85, med) * (1 - sm(0.45, 0.7, a.t))));
        add('hamstrings_' + s, v, onTh * band(0.16, 0.26, 0.9, 1.0, a.t) * sm(-0.2, -0.55, a.cf) * (1 - sm(0.75, 0.95, med) * (1 - sm(0.4, 0.6, a.t))));
        add('adductors_' + s, v, onTh * band(-0.02, 0.06, 0.5, 0.68, a.t) * sm(0.5, 0.82, med));
      }
      if (wCf > 0.4) { const a = segAt(calf, v); add('calves_' + s, v, sm(0.4, 0.8, wCf) * band(0.02, 0.1, 0.58, 0.72, a.t) * sm(0.2, -0.2, a.cf)); }
      const wUa = wOf(v, uaSet);
      if (wUa > 0.3) {
        const a = segAt(arm, v), d = [x - arm.a[0], y - arm.a[1], P[v * 3 + 2] - arm.a[2]];
        const cu = V.dot(V.norm(d), up);
        const cap = sm(0.3, 0.6, wUa) * band(-0.32, -0.2, 0.3, 0.42, a.t) * sm(-0.25, 0.2, cu) * sm(4.0, 6.0, V.len(d) + (a.t > 0 ? 6 : 0)) * sm(shZ - 7.5, shZ - 4.5, z);
        add('ant_deltoid_' + s, v, cap * sm(-0.05, 0.3, a.cf));
        add('post_deltoid_' + s, v, cap * sm(0.05, -0.3, a.cf));
        add('triceps_' + s, v, sm(0.5, 0.85, wOf(v, ua1)) * band(0.28, 0.4, 0.9, 1.0, a.t) * sm(0.0, -0.4, a.cf));
      }
    }
  }

  // ---- cloth / hair / eye fields (cm; > 0 inside) ----
  const cloth = new Float32Array(nv * 3), part = new Float32Array(nv), iris = new Float32Array(nv);
  const thighLen = V.len(V.sub(H('calf_r'), H('thigh_r')));
  const waistY = hipY + (look.waist ?? 9.5), cutY = hipY - thighLen * (look.inseam ?? 0.38);
  // crop-top sports bra as a distance field in rest space: band from under-bust up over the shoulders, scoop neck, cut-away armholes
  const shJ = H('upperarm_r'), nkY = H('neck_01')[1];
  const braField = (x, y, az) => {
    const front = x > midX;
    const arm = Math.hypot((y - (shJ[1] - 1.5)) / 1.25, az - (shZ + 1.0), (x - shJ[0]) * 0.35) - 0.50 * shZ;      // armhole
    const neck = (Math.hypot(az / (0.40 * shZ), (y - (nkY + 2.0)) / (front ? 0.60 * shZ : 0.30 * shZ)) - 1.0) * 0.35 * shZ; // neckline scoop
    return Math.min(y - ubY, arm, neck, (shZ * 0.99 - az) * 1.5, nkY + 4.0 - y);
  };
  const ubY = pelY + L * 0.535, apY = pelY + L * 0.735, topY = shY + 7, midX = H('spine_03')[0] + 2.5, braF = new Float32Array(nv), rest0 = P.slice();
  const eyeC = { r: [0, 0, 0], l: [0, 0, 0] }, eyeN = { r: 0, l: 0 };
  for (let v = 0; v < nv; v++) if (sh.vgroup[v] === 1 || sh.vgroup[v] === 2) { const k = sh.vgroup[v] === 2 ? 'r' : 'l'; eyeC[k][0] += P[v * 3]; eyeC[k][1] += P[v * 3 + 1]; eyeC[k][2] += P[v * 3 + 2]; eyeN[k]++; }
  for (const k of ['r', 'l']) eyeC[k] = eyeC[k].map((c) => c / (eyeN[k] || 1));
  let headTop = 0; for (let v = 0; v < nv; v++) if (sh.vgroup[v] === 0 && P[v * 3 + 1] > headTop) headTop = P[v * 3 + 1];
  const ec = [eyeC.r[0], eyeC.r[1], 0], ks = (headTop - eyeC.r[1]) / 11.1, brow = new Float32Array(nv);
  const HAIRLINE = look.hairShape || [[-18, -6.6], [-12, -4.2], [-8.6, 1.4], [-6.2, 2.3], [-3.2, 4.6], [-0.6, 6.5], [4, 6.9]];
  const pw = (x, pts) => { if (x <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); } return pts[pts.length - 1][1]; };
  for (let v = 0; v < nv; v++) {
    const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2], g = sh.vgroup[v];
    part[v] = g === 0 ? 0 : g === 3 ? 2 : 1;
    if (g === 1 || g === 2) { const c = eyeC[g === 2 ? 'r' : 'l']; const d = V.norm([x - c[0], y - c[1], z - c[2]]); iris[v] = d[0]; continue; }
    if (g !== 0) continue;
    const wArm = wOf(v, armAll), wHead = wOf(v, headSet);
    const wFore = wOf(v, foreAll);
    cloth[v * 3] = Math.min(waistY - y, y - cutY) - sm(0.2, 0.6, wFore) * 16;
    // sports bra / crop top: band from under-bust to armpit level, wide straps over the shoulders, scooped neck, racer back
    const az = Math.abs(z);
    braF[v] = braField(x, y, az) - sm(0.2, 0.6, wFore) * 16;
    cloth[v * 3 + 1] = sm(0.2, 0.6, wFore) * 16; // exclusion only; the bra outline itself is evaluated per pixel from the rest position
    // hair: scalp above a hairline drawn in the side view (eye-relative units), plus eyebrows
    if (wHead > 0.4) {
      const dx = (x - ec[0]) / ks, dy = (y - ec[1]) / ks, az2 = Math.abs(z) / ks;
      const line = pw(dx, HAIRLINE) + (look.hairline ?? 0);
      cloth[v * 3 + 2] = (dy - line) * ks;
      const arch = 2.22 + 0.30 * Math.sin(Math.min(1, Math.max(0, (az2 - 1.0) / 4.3)) * 2.3);
      brow[v] = dx > -3.4 ? Math.min(0.40 - Math.abs(dy - arch), az2 - 1.0, 5.3 - az2) : -5;
    } else { cloth[v * 3 + 2] = -20; brow[v] = -5; }
  }
  // compression fit: smooth the surface under the sports bra so it reads as fabric, not skin
  if (look.braOn) {
    const nb = Array.from({ length: nv }, () => []);
    for (let t = 0; t < tr.length; t += 3) for (let e = 0; e < 3; e++) nb[tr[t + e]].push(tr[t + (e + 1) % 3]);
    // compress the bust the way a sports bra does: soft-cap how far the front protrudes, then smooth
    let apex = -1e9; for (let v = 0; v < nv; v++) if (braF[v] > 1 && P[v * 3] > apex) apex = P[v * 3];
    const c0 = apex - (look.bustCap ?? 3.4);
    for (let v = 0; v < nv; v++) if (braF[v] > -0.5 && P[v * 3] > c0) { const d = P[v * 3] - c0, k = sm(0.6, 3.0, braF[v]); P[v * 3] = c0 + d * (1 - 0.62 * k); }
    for (let it = 0; it < 24; it++) {
      const Pn = P.slice();
      for (let v = 0; v < nv; v++) { const f = sm(0.6, 3.0, braF[v]); if (f <= 0 || !nb[v].length) continue; let ax = 0, ay = 0, az = 0; for (const o of nb[v]) { ax += P[o * 3]; ay += P[o * 3 + 1]; az += P[o * 3 + 2]; } const c = nb[v].length, k = 0.6 * f; Pn[v * 3] += (ax / c - P[v * 3]) * k; Pn[v * 3 + 1] += (ay / c - P[v * 3 + 1]) * k; Pn[v * 3 + 2] += (az / c - P[v * 3 + 2]) * k; }
      P.set(Pn);
    }
    computeNormals();
  }
  computeCavity();

  // ---- geometry ----
  const pos = new Float32Array(nv * 3); for (let i = 0; i < nv * 3; i++) pos[i] = P[i] * U;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  geo.setAttribute('skinIndex', new THREE.BufferAttribute(skinIdx, 4));
  geo.setAttribute('skinWeight', new THREE.BufferAttribute(skinW, 4));
  geo.setAttribute('aCloth', new THREE.BufferAttribute(cloth, 3));
  geo.setAttribute('aMisc', new THREE.BufferAttribute(new Float32Array(nv * 3), 3)); // x cavity, y part, z iris
  const misc = geo.attributes.aMisc.array; for (let v = 0; v < nv; v++) { misc[v * 3] = cav[v]; misc[v * 3 + 1] = part[v]; misc[v * 3 + 2] = part[v] > 0.5 ? iris[v] : brow[v]; }
  geo.setAttribute('aRest', new THREE.BufferAttribute(new Float32Array([...rest0].flatMap((c, i) => (i % 3 === 2 ? [c, braF[(i - 2) / 3]] : [c]))), 4));
  const glow = new Float32Array(nv * 4); geo.setAttribute('aGlow', new THREE.BufferAttribute(glow, 4));
  geo.setIndex(new THREE.BufferAttribute(sh.tris, 1));

  const uni = {
    uSkin: { value: new THREE.Color(look.skin) }, uShorts: { value: new THREE.Color(look.shorts) }, uBra: { value: new THREE.Color(look.bra || look.shorts) },
    uHair: { value: new THREE.Color(look.hair) }, uTrim: { value: new THREE.Color(look.trim || '#ffffff') }, uIris: { value: new THREE.Color(look.eyes || '#3b2a1e') },
    uBraOn: { value: look.braOn ? 1 : 0 }, uBraP: { value: new THREE.Vector4(ubY, apY, topY, shZ) }, uMidX: { value: midX }, uSh: { value: new THREE.Vector3(shJ[0], shJ[1], nkY) }, uDef: { value: look.definition ?? 1 }, uHairLen: { value: look.hairVol ?? 0.5 },
  };
  const mat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.52, metalness: 0, sheen: 0.35, sheenRoughness: 0.5, sheenColor: new THREE.Color(look.skin).lerp(new THREE.Color('#ffd9c4'), 0.5), specularIntensity: 0.45 });
  mat.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, uni);
    s.vertexShader = s.vertexShader.replace('#include <common>', `#include <common>
      attribute vec3 aCloth; attribute vec3 aMisc; attribute vec4 aGlow; attribute vec4 aRest; uniform float uBraOn; uniform float uHairLen;
      varying vec3 vCloth; varying vec3 vMisc; varying vec4 vGlow; varying vec3 vRest;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
      vCloth = aCloth; vMisc = aMisc; vGlow = aGlow; vRest = aRest.xyz;
      float lift = max(smoothstep(-0.2, 0.6, aCloth.x), uBraOn * smoothstep(-0.2, 0.6, aRest.w) * 1.8) * 0.0022 + smoothstep(-0.3, 1.2, aCloth.z) * 0.0035 * uHairLen;
      transformed += objectNormal * lift;`);
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vCloth; varying vec3 vMisc; varying vec4 vGlow; varying vec3 vRest;
      uniform vec3 uSkin, uShorts, uBra, uHair, uTrim, uIris; uniform float uBraOn, uDef, uMidX; uniform vec4 uBraP; uniform vec3 uSh;`)
      .replace('#include <color_fragment>', `
      float cavv = clamp(vMisc.x * 4.5 * uDef, -0.10, 0.20);
      vec3 base = uSkin * (1.0 - cavv) * mix(vec3(1.0), vec3(1.06, 0.96, 0.94), clamp(cavv * 1.5, 0.0, 1.0));
      float mSh = smoothstep(0.0, 0.18, vCloth.x);
      float baz = abs(vRest.z), bsz = uBraP.w; bool bfront = vRest.x > uMidX;
      float barm = length(vec3((vRest.y - (uSh.y - 1.5)) / 1.25, baz - (bsz + 1.0), (vRest.x - uSh.x) * 0.35)) - 0.50 * bsz;
      float bneck = (length(vec2(baz / (0.40 * bsz), (vRest.y - (uSh.z + 2.0)) / (bfront ? 0.60 * bsz : 0.30 * bsz))) - 1.0) * 0.35 * bsz;
      float braField = min(min(min(vRest.y - uBraP.x, barm), bneck), min((bsz * 0.99 - baz) * 1.5, uSh.z + 4.0 - vRest.y)) - vCloth.y;
      float mBr = uBraOn * smoothstep(0.0, 0.18, braField);
      float mHa = smoothstep(-0.15, 0.35, vCloth.z);
      float clothM = max(mSh, mBr);
      float trimS = max(smoothstep(0.0, 0.18, vCloth.x) * (1.0 - smoothstep(1.3, 1.5, vCloth.x)), mBr * (1.0 - smoothstep(1.1, 1.3, vRest.y - uBraP.x)));
      base = mix(base, uHair * (0.85 + 0.3 * fract(sin(dot(floor(vViewPosition.xy * 900.0), vec2(12.9898, 78.233))) * 43758.5453)), mHa);
      base = mix(base, uShorts, mSh); base = mix(base, uBra, mBr); base = mix(base, uTrim, trimS * 0.9);
      float isEye = step(0.5, vMisc.y) * (1.0 - step(1.5, vMisc.y));
      base = mix(base, uHair, (1.0 - isEye) * smoothstep(0.0, 0.2, vMisc.z) * 0.85);
      vec3 eyeCol = mix(vec3(0.84, 0.83, 0.81), uIris, smoothstep(0.815, 0.84, vMisc.z)); eyeCol = mix(eyeCol, vec3(0.02), smoothstep(0.962, 0.972, vMisc.z));
      base = mix(base, eyeCol, isEye);
      float gA = vGlow.a * (1.0 - 0.72 * clothM) * (1.0 - mHa) * (1.0 - isEye);
      float lumB = dot(base, vec3(0.3, 0.55, 0.15)) / max(0.08, dot(uSkin, vec3(0.3, 0.55, 0.15)));
      base = mix(base, vGlow.rgb * (0.50 + 0.55 * clamp(lumB, 0.0, 1.3)), smoothstep(0.0, 0.42, gA) * 0.94);
      diffuseColor.rgb *= base;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      roughnessFactor = mix(roughnessFactor, 0.82, max(clothM, mHa)); roughnessFactor = mix(roughnessFactor, 0.12, isEye);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      totalEmissiveRadiance += vGlow.rgb * gA * 0.16;`);
  };
  mat.customProgramCacheKey = () => 'athlete-v8';

  // ---- skeleton (identity rest orientations; positions = rest joint heads) ----
  const bones = B.map((n) => { const b = new THREE.Bone(); b.name = n; return b; });
  B.forEach((n, i) => { const p = par[i] ? bi(par[i]) : -1; const h = head[i], ph = p >= 0 ? head[p] : [0, 0, 0]; bones[i].position.set((h[0] - ph[0]) * U, (h[1] - ph[1]) * U, (h[2] - ph[2]) * U); if (p >= 0) bones[p].add(bones[i]); });
  const mesh = new THREE.SkinnedMesh(geo, mat); mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
  const rootBone = bones[bi('Root')]; mesh.add(rootBone); mesh.updateMatrixWorld(true); mesh.bind(new THREE.Skeleton(bones));

  if (look.bun) { const g = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshStandardMaterial({ color: look.hair, roughness: 0.85 })); const hb = bones[bi('head')], hh0 = H('head'); g.scale.set(0.034 * ks, 0.031 * ks, 0.036 * ks); g.position.set((ec[0] - 16.4 * ks - hh0[0]) * U, (ec[1] + 7.2 * ks - hh0[1]) * U, 0); g.castShadow = true; hb.add(g); }
  // ---- retarget tables ----
  const rest = R.evalPose(rig, {});
  const legRR = rest.hip_r.p[1] - rest.ankle_r.p[1], legMH = H('thigh_r')[1] - H('foot_r')[1];
  const sLeg = legMH / legRR, ankleRR = 6.6, ankleMH = H('foot_r')[1];
  const hipMidRest = V.scale(V.add(H('thigh_r'), H('thigh_l')), 0.5), pelRest = H('pelvis');
  const align = {};
  for (const n in DRIVE) { const d = DRIVE[n]; if (d[2] && bi(n) >= 0) align[n] = arc(V.sub(T(n), H(n)), V.sub(rest[d[2]].p, rest[d[0]].p)); }
  for (const s of ['r', 'l']) {
    // RepRig rest hand: fingers -Y, palm +X (anatomical position). Match the whole frame, not just the direction, so palms never roll.
    align['hand_' + s] = Q.conj(FR[s].handQ);
    const td = V.norm(rest['toe_' + s].p.map((c, i) => c - rest['ankle_' + s].p[i])), tu = V.norm(V.sub([0, 1, 0], V.scale(td, td[1])));
    align['foot_' + s] = Q.mul(Q.fromBasis(td, tu, V.cross(td, tu)), Q.conj(FR[s].footQ));
    // palm thickness below the wrist joint, so a planted palm rests on the floor instead of in it
    const hs = setOf('hand_' + s), hw = H('hand_' + s), ds = [];
    for (let v = 0; v < nv; v++) if (sh.vgroup[v] === 0 && wOf(v, hs) > 0.6) ds.push((P[v * 3] - hw[0]) * FR[s].n[0] + (P[v * 3 + 1] - hw[1]) * FR[s].n[1] + (P[v * 3 + 2] - hw[2]) * FR[s].n[2]);
    ds.sort((x, y) => x - y); FR[s].palm = ds.length ? ds[Math.floor(ds.length * 0.93)] : 2.5;
  }
  const PALM_RR = 2.6;
  const FINGERS = { index: [10, 20, 14], middle: [14, 24, 16], ring: [18, 28, 18], pinky: [22, 30, 20], thumb: [6, 10, 8] };
  const FIST = { index: [62, 80, 45], middle: [66, 84, 48], ring: [68, 84, 48], pinky: [70, 82, 46], thumb: [14, 22, 30] };
  const PARTNER = (id) => (id.endsWith('_r') ? id.slice(0, -2) + '_l' : id.endsWith('_l') ? id.slice(0, -2) + '_r' : id);
  const Wq = new Array(B.length), Wp = new Array(B.length);
  const worldOf = (i) => Wq[i] || (Wq[i] = (par[i] ? worldOf(bi(par[i])) : [1, 0, 0, 0]));
  let pelPos = [0, 0, 0]; const iPel = bi('pelvis');
  const posOf = (i) => { if (Wp[i]) return Wp[i]; if (i === iPel) return (Wp[i] = pelPos); if (!par[i]) return (Wp[i] = [0, 0, 0]); const p = bi(par[i]); return (Wp[i] = V.add(posOf(p), Q.rot(worldOf(p), V.sub(head[i], head[p])))); };
  const clearPos = () => { for (let i = 0; i < B.length; i++) Wp[i] = null; };
  const axisQ = (ax, deg) => Q.axis(ax, deg);

  function limbIK(up, lo, end, Tg, w) {
    if (w <= 0.001) return;
    const iu = bi(up), il = bi(lo), ie = bi(end), S = posOf(iu), E = posOf(il), Wd = posOf(ie);
    const la = V.len(V.sub(head[il], head[iu])), lb = V.len(V.sub(head[ie], head[il]));
    let d = V.len(V.sub(Tg, S)); d = Math.max(Math.abs(la - lb) + 0.05, Math.min(la + lb - 0.05, d));
    const n = V.norm(V.sub(Tg, S));
    let pp = V.sub(V.sub(E, S), V.scale(n, V.dot(V.sub(E, S), n)));
    if (V.len(pp) < 0.05) { const alt = V.sub(V.sub(Wd, S), V.scale(n, V.dot(V.sub(Wd, S), n))); pp = V.len(alt) > 0.05 ? V.scale(alt, -1) : [0, 1, 0]; }
    pp = V.norm(pp);
    const x = (la * la - lb * lb + d * d) / (2 * d), h = Math.sqrt(Math.max(0, la * la - x * x));
    const E2 = V.add(V.add(S, V.scale(n, x)), V.scale(pp, h)), T2 = V.add(S, V.scale(n, d));
    const qU = Q.norm(Q.mul(arc(V.sub(E, S), V.sub(E2, S)), Wq[iu])), qL = Q.norm(Q.mul(arc(V.sub(Wd, E), V.sub(T2, E2)), Wq[il]));
    Wq[iu] = w >= 0.999 ? qU : Q.slerp(Wq[iu], qU, w); Wq[il] = w >= 0.999 ? qL : Q.slerp(Wq[il], qL, w);
    clearPos();
  }

  function pose(W, mirror, ik) {
    ik = ik || {};
    const g = (j) => { const s = W[mirror ? PARTNER(j) : j]; return mirror ? { p: [s.p[0], s.p[1], -s.p[2]], q: Q.mirrorZ(s.q) } : s; };
    for (let i = 0; i < B.length; i++) { Wq[i] = null; Wp[i] = null; }
    for (const n in DRIVE) {
      const i = bi(n); if (i < 0) continue; const d = DRIVE[n];
      let q = Q.mul(g(d[0]).q, Q.conj(rest[d[0]].q));
      if (d[1]) q = Q.slerp(q, Q.mul(g(d[1]).q, Q.conj(rest[d[1]].q)), 0.5);
      if (align[n]) q = Q.mul(q, align[n]);
      Wq[i] = Q.norm(q);
    }
    // place the pelvis so the hip midpoint follows RepRig's, scaled by leg length (feet stay on the floor)
    const hr = g('hip_r').p, hl = g('hip_l').p;
    const hm = [(hr[0] + hl[0]) / 2 * sLeg, ((hr[1] + hl[1]) / 2 - ankleRR) * sLeg + ankleMH, (hr[2] + hl[2]) / 2 * sLeg];
    const off = Q.rot(Wq[iPel], V.sub(hipMidRest, pelRest));
    pelPos = [hm[0] - off[0], hm[1] - off[1], hm[2] - off[2]];
    // hands held together in front of the body close into loose fists so the fingers never cross through each other
    const fist = 1 - sm(11, 22, V.len(V.sub(g('wrist_r').p, g('wrist_l').p)));
    for (const s of ['r', 'l']) {
      // legs: always re-solve so each ankle lands exactly where RepRig put it (scaled to this body)
      const ap = g('ankle_' + s).p;
      limbIK('thigh_' + s, 'calf_' + s, 'foot_' + s, [ap[0] * sLeg, (ap[1] - ankleRR) * sLeg + ankleMH, ap[2] * sLeg], 1);
      // arms: re-solve planted hands so the palm sits flat on the floor or prop
      const wA = Math.max(0, Math.min(1, ik['arm_' + (mirror ? (s === 'r' ? 'l' : 'r') : s)] || 0));
      if (wA > 0) { const wp = g('wrist_' + s).p; limbIK('upperarm_' + s, 'lowerarm_' + s, 'hand_' + s, [wp[0] * sLeg, wp[1] * sLeg + (FR[s].palm - PALM_RR * sLeg), wp[2] * sLeg], wA); }
      else { // a hand held at the head (behind the head, by the ear) keeps its place relative to this body's head
        const wp = g('wrist_' + s).p, hp = g('head_c1').p, rel = V.sub(wp, hp), wH = 1 - sm(17, 27, V.len(rel));
        if (wH > 0.01) limbIK('upperarm_' + s, 'lowerarm_' + s, 'hand_' + s, V.add(posOf(bi('head')), rel), wH);
      }
      // forearm twist: share the hand's roll about the forearm axis
      const iF = bi('lowerarm_' + s), iH = bi('hand_' + s), ax = Q.rot(Wq[iF], FR[s].foreAx);
      let dq = Q.mul(Wq[iH], Q.conj(Wq[iF])); if (dq[0] < 0) dq = dq.map((c) => -c);
      const pr = dq[1] * ax[0] + dq[2] * ax[1] + dq[3] * ax[2];
      const tw = Q.norm([dq[0], ax[0] * pr, ax[1] * pr, ax[2] * pr]);
      Wq[bi('lowerarm_twist_' + s)] = Q.norm(Q.mul(Q.slerp([1, 0, 0, 0], tw, 0.9), Wq[iF]));
      // fingers: relaxed curl when free, nearly flat when the palm is planted
      for (const fn in FINGERS) for (let k = 1; k <= 3; k++) {
        const i = bi(`${fn}_0${k}_${s}`); if (i < 0) continue;
        const dir = V.norm(V.sub(tail[i], head[i])), axr = V.norm(V.cross(dir, FR[s].n));
        const ang = (FINGERS[fn][k - 1] * (1 - fist) + FIST[fn][k - 1] * fist) * (1 - 0.88 * wA);
        Wq[i] = Q.norm(Q.mul(worldOf(bi(par[i])), axisQ(axr, ang)));
      }
      // toes: when the foot is up on its toes near the floor, let the toes lie flat instead of spearing the ground
      const iB = bi('ball_' + s), iFt = bi('foot_' + s), bp = posOf(iB), td = Q.rot(Wq[iFt], FR[s].toe);
      const wT = (1 - sm(3.5, 8, bp[1])) * sm(0.05, 0.25, -td[1]);
      if (wT > 0.01) { const flat = V.norm([td[0], 0.02, td[2]]); const full = Q.norm(Q.mul(arc(td, flat), Wq[iFt])); Wq[iB] = Q.slerp(Wq[iFt], full, wT); }
    }
    for (let i = 0; i < B.length; i++) {
      const q = worldOf(i), p = par[i] ? worldOf(bi(par[i])) : [1, 0, 0, 0];
      const l = Q.mul(Q.conj(p), q); bones[i].quaternion.set(l[1], l[2], l[3], l[0]);
    }
    bones[iPel].position.set(pelPos[0] * U, pelPos[1] * U, pelPos[2] * U);
    return sLeg;
  }

  const ROLE = { target: [0.92, 0.07, 0.05], synergist: [1.0, 0.42, 0.02], stabilizer: [0.05, 0.5, 0.95], lengthened: [0.55, 0.32, 0.92] };
  function setGlow(levels) { // levels: { muscleId: { a: 0..1, role } }
    glow.fill(0);
    for (const id in levels) {
      const m = M[id]; if (!m) continue; const { a, role } = levels[id]; if (a <= 0.01) continue; const c = ROLE[role] || ROLE.target;
      for (let k = 0; k < m.length; k += 2) { const v = m[k], w = m[k + 1] * a, o = v * 4; if (w > glow[o + 3]) { glow[o] = c[0]; glow[o + 1] = c[1]; glow[o + 2] = c[2]; glow[o + 3] = w; } }
    }
    geo.attributes.aGlow.needsUpdate = true;
  }
  function exportColors() { // per-vertex skin / shorts / sports bra / hair colours, for files that cannot carry the shader
    const col = new Float32Array(nv * 3), cs = new THREE.Color(look.skin), cc = new THREE.Color(look.shorts), cb = new THREE.Color(look.bra || look.shorts), ch2 = new THREE.Color(look.hair);
    const cl = geo.attributes.aCloth.array, rs = geo.attributes.aRest.array, ms = geo.attributes.aMisc.array;
    for (let v = 0; v < nv; v++) { let c = cs; if (cl[v * 3 + 2] > 0.1 || (ms[v * 3 + 1] < 0.5 && ms[v * 3 + 2] > 0.1)) c = ch2; if (look.braOn && rs[v * 4 + 3] - cl[v * 3 + 1] > 0.09) c = cb; if (cl[v * 3] > 0.09) c = cc; col[v * 3] = c.r; col[v * 3 + 1] = c.g; col[v * 3 + 2] = c.b; }
    return col;
  }
  return { mesh, bones, B, pose, setGlow, exportColors, muscles: M, uni, sLeg, height: ch.height };
}
