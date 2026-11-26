# 123 Back Drill: integration notes

Issue #14, GymVisual #598413, exercise id `one-two-three-back-drill`. Built 2026-11-26.

Files: `build/meta/one-two-three-back-drill.json`, `build/author-one-two-three-back-drill.js`, `src/exercises/one-two-three-back-drill.json`, `exports/one-two-three-back-drill.glb`.

## What was built

A seamless 4.75 s loop of one anticlockwise lap of the three-cone triangle, facing the front cones the whole time:

| Phase id | Label | Time (s) | What happens |
|---|---|---|---|
| `setup` | Athletic stance at cone 1 | 0-0.25 | Feet about hip width, knees soft, on the balls of the feet, cone 1 just behind the heels. |
| `drive` | Sprint 1 to 3 | 0.25-1.15 | Right foot first; three quick running steps diagonally toward front-right cone 3, with brief flight phases, forward lean and arms pumping opposite to the legs. |
| `brake` | Brake and plant at cone 3 | 1.15-1.66 | Penultimate braking step (left) lands ahead of the body, final plant (right) outside the line next to the cone; hips sink, trunk comes back. |
| `shuffle` | Shuffle 3 to 2 | 1.66-2.98 | Five lateral shuffle cycles to the left: the lead (left) foot steps out, the trail (right) foot follows, feet never cross, hips and chest stay forward. Ends with the left foot planted outside next to cone 2. |
| `backpedal` | Backpedal 2 to 1 | 2.98-4.42 | Short pause on the plant, then six short, quick backpedal steps diagonally back to cone 1 (right foot first), shoulders slightly ahead of the hips. The last two steps close into the start stance. |
| `reset` | Back in stance at cone 1 | 4.42-4.75 | Rises back to the start stance. The last key is the first pose (`k000`), so the loop is seamless: every joint matches at t = 0 and t = D (gap 0.0000 cm) and the pelvis is at rest at both ends. |

How it is authored: a footstep table (touchdown time, toe-off time, floor position for every strike). While a foot is planted its leg contact has weight 1 and a constant target; for each swing the weight ramps to 0 (over at most 40 ms) and the swing leg is posed by FK solves along a lifted path (sprint 17 cm, shuffle 6 cm, backpedal 9 cm). The planted FK solution is solved to match the IK solution (ankle, toe and knee), and the swing knee is kept in the IK pole plane, so the FK/IK blends at toe-off and touchdown do not pop. The pelvis follows its own track (position along each segment, height, pitch, roll); arm swing comes from the planned foot positions, smoothed over about 60 ms. 128 keyframes in total.

Layout: cone props at 40% scale of the 5 yd triangle. Front cones 183 cm apart (z = ±91.5), cone 1 183 cm behind their midpoint (x = -91.5 vs +91.5). Cone 1 is yellow to mark the start. The pelvis path runs 141 cm (sprint), 115 cm (shuffle) and 141 cm (backpedal) between the stance spots next to the cones.

## Key values vs research norms

| Measure | This animation | Norm (source) |
|---|---|---|
| Knee flexion, deepest stance | ≈76° (left foot on the plant at cone 3); ≈52° in the start stance | Up to about 100° on the penultimate braking step (Dos'Santos 2019). Within range. |
| Knee flexion, swing | ≈98° (sprint steps) | No drill-specific data. |
| Hip flexion, peak | ≈79° (sprint swing) | No drill-specific data. |
| Trunk lean (pelvis to C7 vs vertical) | ≈24° forward in the drive, ≈6° in the start stance, back toward upright on the plants | About 45° in early acceleration of a full sprint start (Turner 2026, coaching article). Drill pace over a 1.4 m leg uses less; trunk slightly back when braking (Dos'Santos 2019). |
| Shuffle base | 32-55 cm between ankles, feet never cross | Feet never cross, hips and chest forward (T-test rule). |
| Facing direction | Root yaw 0 for the whole lap | Physitrack: forwards, sidestep, backwards, no turning. |
| Peak pelvis speed | 1.8 m/s sprint, 1.1 m/s shuffle, 1.7 m/s backpedal | Controlled drill pace (NSCA: start new drills slow). |
| `checks.measure` rootTravel | 141.5 cm, range 130-205 | 205 cm = cone 1 to a front cone at 40% scale (sqrt(91.5² + 183²)); the lower bound allows for the space the athlete leaves around the cones. |

## Decisions on uncertain points

1. **Cone order and segments.** reference.md said the athlete "shuffles/backpedals across or diagonally" and flagged the order as uncertain. Following videos.md (Physitrack triangle exercise, JMU convention): sprint 1 to 3 (front-right), lateral shuffle 3 to 2 along the front edge, diagonal backpedal 2 to 1, facing forward throughout. Fitwill's straight-line variant was not used.
2. **Direction and sides.** Anticlockwise (to the right first) is authored as the right side, `authoredSide: "right"`, not bilateral: the lap is asymmetric. The player's Left side and the `_left` GLB clip mirror it into the clockwise lap, which covers the research advice to run both directions.
3. **Scale.** 40% of the 5 yd layout so the whole lap fits the player's camera framing; stated in the Cone layout kinematics row. The 5 yd spacing is itself a convention (clinical opinion in research.md), not a source for this drill.
4. **On the balls of the feet.** The leg contacts use the standard `legContact()` with a module-level `handRot` pitched 15° toes-down (heel just off the floor). Two reasons: research.md's cues (weight on the balls of the feet in the stance and the backpedal), and the rig's ankle limit (dorsi max 25°), which a flat foot cannot respect in a low athletic stance. The effective ankle angle with IK applied stays in -18° to +24.6° over the whole loop (checked in the author script, since verify only checks FK channels).
5. **Pace.** A controlled drill pace (lap 4.2 s of movement plus stance) rather than a maximal effort, matching NSCA's advice to start new drills slow. The sprint is three running steps plus two braking steps at this scale.
6. **Camera.** The default 3/4 preset is from behind-right and elevated (yaw -30, pitch 28), like GymVisual's elevated wide shot. A front-right 3/4 (yaw ≈40) cannot fit the lap with the player's framing at any pitch, because cone 3 sits straight under the camera line. I checked every preset numerically against the framing formula in player.js (all joints over the loop plus the cones within the frame at aspect 1.65 and 1.25), except Top, which is at the edge (0.97 of the frame height).
7. **Muscles.** Targets: quadriceps and glute max (GymVisual highlights, research.md). Synergists: glute med, adductors, calves, hamstrings, hip flexors. Stabilizers: core, obliques, spinal extensors. Activation curves are illustrative (quads peak on the plants, glute med and adductors in the shuffle).

## Verify results

`node build/author-one-two-three-back-drill.js && node build/validate.js && node build/assemble.js && node build/export-gltf.mjs && node test/verify.mjs`: 26 PASS, 0 FAIL. Lines for this exercise and the player:

```
PASS  one-two-three-back-drill: validates against schema
PASS  one-two-three-back-drill: planted contacts (leg_r, leg_l) do not slide (max 0.000 cm)
PASS  one-two-three-back-drill: nothing below the floor (lowest 0.10 cm)
PASS  one-two-three-back-drill: peak rootTravel 141.5 (expected 130–205)
PASS  one-two-three-back-drill: has safety notes
PASS  one-two-three-back-drill: joint limits respected
PASS  one-two-three-back-drill: exports/one-two-three-back-drill.glb present
PASS  player loads all exercises: Kneeling Back Rotation Stretch | Quadruped Thoracic Rotation | 123 Back Drill
PASS  1.5× speed plays at 1.64× wall-clock
PASS  no page errors
```

GLB: 24 joints, clips `one-two-three-back-drill_right` and `_left` (25 channels, 144 keys at 30 fps), plus prop nodes `cone1`, `cone2`, `cone3`. The two existing GLBs are unchanged byte for byte.

Extra author-script checks (printed on each run): minimum leg reach margin on planted keys 7.3 cm, effective ankle angle -18.2° to 24.6°, and the loop seam. A 240 fps scan of joint accelerations finds peaks under 380 m/s² for knees and wrists, plus three brief toe spikes of about 430 m/s² at shuffle and sprint touchdowns.

## Screenshots checked

Player index 2 (`node test/shots.mjs 2 ...`):
- threeQuarter R dark: 0.1, 0.6, 0.85, 1.25, 1.55, 1.9, 2.4, 2.95, 3.4, 3.8, 4.2, 4.7 (whole lap; layout and direction of travel).
- top R dark: 0.1, 1.62, 3.0, 4.6 (confirms apex start, cone 3 front-right, cone 2 front-left, return to cone 1).
- top L light: 0.85, 1.6, 2.4, 3.6 (mirror gives the clockwise lap).
- side R light: 0.55-1.6 (sprint lean, arm pump, braking plant) and 3.4-4.0 (backpedal posture).
- front R light/dark: 0.1, 0.6, 1.6, 2.1, 2.2, 2.25, 3.45, 3.5, 3.6 (shuffle base, feet not crossing, knees over feet).
- back R light: 0.85, 1.6, 2.4, 3.6.

Fixed while iterating: arms held forward like a tray, with the hands crossing the midline (ISB plane and axial now move together so the forearm stays forward while the upper arm swings); ankle dorsiflexion above the 25° limit with a flat foot (heel-up contact, retimed steps); knee pops at FK/IK blends in the shuffle (knee matched to IK, swing knee kept in the pole plane); swing feet snapping off the floor (shorter stance, longer swing, gentler lift curve); camera presets that cropped the near cone and the head.

## Known limitations

- The planted foot keeps one fixed 15° heel-up angle for every strike. There is no heel-to-toe roll, and no flatter foot on the braking plant.
- The trunk stays square (no pelvis or shoulder counter-rotation with the stride). That is right for the shuffle and backpedal and simplified for the sprint.
- In the mirrored (Left, clockwise) view the phase labels still say "cone 3" and "cone 2", meaning the first and second front cones of that lap. videos.md numbers the clockwise lap as sprint to cone 2 first.
- At 40% scale the sprint is short (three strides plus two braking steps). Real 5 yd laps take about 5-10 s.
- The backpedal has very short double-support periods (10 ms) between steps.
- Activation curves are illustrative, not EMG.

## Needs from platform

1. **Stale rotation arc in the player.** `update()` in `src/player.js` only redraws `arcLine`, `bandMesh`, `refLine` and `labels.arc` when the module has a `rotationArc` guide, and never hides them otherwise. After switching from exercise A or B, this drill shows a leftover "44° rotation" arc and label (visible in every screenshot). The fix is to hide them when `arcG` is undefined.
2. **HUD rows are fixed to the quadruped measures** (thoracic/lumbar rotation, shoulder-line tilt, support elbow). For locomotion drills they read 0° and add nothing; only Hips / knees is useful. Suggest module-driven HUD rows (for example knee flexion, hip flexion, trunk lean, root travel).
3. **Framing.** `loadExercise()` frames on joints only, with a 0.82 radius factor that crops wide locomotion layouts, and ignores props. Suggest including props in the framing box and/or an optional per-module camera distance, so front-facing 3/4 views can fit.
4. **Per-strike foot orientation.** A contact's `handRot` is fixed, so a heel-strike or flat braking plant can't be mixed with forefoot steps. A per-key `ik.<id>.handRot` would need the timeline to slerp (or normalise) quaternions instead of interpolating components.
5. **Joint limits for IK limbs.** `test/verify.mjs` checks joint limits on the pose channels only; limbs driven by IK at weight 1 are not checked. Suggest computing the effective joint angles from the solved world rotations (as this author script does for the ankle).
