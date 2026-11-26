# 3 Sec Sumo Squat: integration notes

Issue #44 (Batch 1, exercise 9 of 10). Movement reference: GymVisual #735012 (see `reference.md`). Built 2026-11-26.

Files: `build/meta/three-second-sumo-squat.json`, `build/author-three-second-sumo-squat.js`, `src/exercises/three-second-sumo-squat.json`, `exports/three-second-sumo-squat.glb` (one clip, bilateral).

## What was built

**Stance (held throughout).** Started from `POSES.standing({ stance: 28, toeOut: 30 })`: ankle centres 56 cm apart (about 1.5x the rig's 37 cm shoulder width), each foot turned out 30 degrees, hands clasped in front of the chest (fingers interlaced, elbows down and slightly out; the same clasp as the 1 2 Stick Drill, fixed in the chest frame so one arm solution fits every depth). No props (body weight).

**Feet.** Both legs are IK contacts with weight 1 and a constant target for the whole loop. Each contact gets a world-locked foot rotation turned out 30 degrees and a knee pole aimed 44.1 degrees out from straight ahead. The script finds that pole angle by bisection so that at the bottom the knee sits 2 cm outside the foot's long axis (over the 2nd-3rd toe, "knees out"). Hip, knee and ankle channels are fitted to the IK legs, so the stored channels match what is drawn.

**Movement.** The pelvis moves only down and slightly back (root x 0 to -17 cm, no sideways or turning motion). The pelvis tips forward up to 30 degrees, the lumbar and lower thoracic spine extend 6 degrees to keep the chest tall, and the neck extends so the eyes stay level. The hips travel back and the trunk inclines mostly in the first half of the descent, as in real squats; pelvis height drives depth. Key poses are solved at pelvis-height fractions 0, 0.12, 0.30, 0.48, 0.66, 0.84 and 1 (the bottom pelvis height is found by bisection for 110 degrees of knee flexion).

| Phase id | Label | Time (s) | Breath | What happens |
|---|---|---|---|---|
| setup | Stand tall and brace | 0.0-1.0 | natural | Standing, soft knees (about 2 degrees) |
| lower | Lower for 3 seconds | 1.0-4.0 | inhale | Keys every 0.5 s: near-constant speed, easing in and out |
| bottom | Brief pause | 4.0-4.5 | hold | Held at depth with a 0.3 cm settle so it does not look frozen |
| rise | Stand up (about 1 s) | 4.5-5.6 | exhale | One mid key at 5.05 s |
| reset | Stand tall, reset | 5.6-8.0 | natural | Standing; the loop is seamless |

**Key values at the bottom (rig) vs research.**

| Measure | Animation | Research |
|---|---|---|
| Knee flexion | 110 degrees peak (verify: 110.4); thigh 3 degrees below horizontal | About 100-120 degrees at thighs-parallel; wide-stance 3RM back squats about 119-120 degrees (Larsen 2021) |
| Hip flexion | 116 degrees joint channel (shown in the HUD); about 100 degrees between the thigh and the pelvis-to-T12 line | About 110-112 degrees in loaded squats with a 46-53 degree trunk lean (Larsen 2021) |
| Trunk from vertical | 21 degrees at the bottom (5 degrees standing, a rig baseline), so about 16 degrees of added lean | About 20-35 degrees suggested for bodyweight (clinical opinion); loaded high-bar wide squats about 46 degrees |
| Hip abduction | About 14 degrees standing, about 44 degrees at the bottom (thigh angle out of the pelvis sagittal plane) | About 33 degrees at 42 degrees toe-out, habitual width (Sinclair 2022, Sensors); more with a wider stance |
| Ankle dorsiflexion | At most 23 degrees (rig limit 35) | Not given |
| Stance / toe-out | 56 cm (1.5x shoulder width) / 30 degrees | 1.4-1.7x shoulder width; 30-45 degrees reference, 0-42 degrees tested |
| Knee line | 2 cm outside the foot axis at the bottom; at most 5.6 cm inside it when the knee is still under about 45 degrees | Knee over the 2nd-3rd toe |
| Tempo | 3.0 s down, 0.5 s pause, 1.1 s up | 3 s lowering (reference), brief pause, stand in about 1 s (tempo demos) |

**Muscles** (rig ids only). Target: quads, glute_max, adductors. Synergists: hamstrings, calves. Stabilizers: glute_med, spinal_extensors, core. The activation curves (in the meta file) build through the lowering, hold at the pause, peak while standing up, and drop back at the top. They are illustrative, not EMG.

**Checks.** `stillJoints: [ankle_r, ankle_l, toe_r, toe_l]`, `plantedContacts: [leg_r, leg_l]`, peak `kneeFlexion` 100-120 (research range at thighs-parallel), floor tolerance 0.5 cm. The author script also fails if ankle dorsiflexion exceeds 34 degrees or a foot moves.

## Decisions on uncertain points

1. **Toe-out.** The reference says 30-45 degrees. Used 30 degrees: the research card recommends it, it is inside the 0-42 degree range that was actually tested, and it keeps the hip abduction from growing further.
2. **Depth.** "About thighs parallel" was set as 110 degrees of knee flexion, the middle of the 100-120 degree band. Loaded wide-stance studies reached about 120 degrees; the extra context says bodyweight may be a little less.
3. **Trunk.** The reference says "trunk upright"; the research suggests 20-35 degrees for bodyweight. Chose about 16 degrees of added lean (21 degrees from vertical on the HUD), the upright end, with the hands at the chest as the counterweight.
4. **Tempo.** The 3 seconds are the lowering (reference, videos.md). The pause is 0.5 s (videos.md suggests 0.3-0.5 s; the 2 s hold in one demo was not copied). Standing up takes 1.1 s; the rest of the 8 s loop is a standing reset.
5. **Knee line.** Knees are aimed slightly outside the foot axis at depth so they never look as if they cave. With a fixed pole per contact, the knee sits a little inside the foot axis early in the descent (shallow bend), which is the normal geometry of a toed-out wide stance.

## Verify results

`node build/author-three-second-sumo-squat.js && node build/validate.js && node build/assemble.js && node build/export-gltf.mjs && node test/verify.mjs` (30 PASS, 0 FAIL; the two existing exercises still pass all their checks):

```
valid   three-second-sumo-squat.json
PASS  three-second-sumo-squat: validates against schema
PASS  three-second-sumo-squat: planted contacts (leg_r, leg_l) do not slide (max 0.000 cm)
PASS  three-second-sumo-squat: still joints (ankle_r, ankle_l, toe_r, toe_l) stay put (max 0.000 cm)
PASS  three-second-sumo-squat: nothing below the floor (lowest -0.00 cm)
PASS  three-second-sumo-squat: peak kneeFlexion 110.4 (expected 100–120)
PASS  three-second-sumo-squat: contact-driven legs within knee/ankle limits
PASS  three-second-sumo-squat: has safety notes
PASS  three-second-sumo-squat: joint limits respected
PASS  three-second-sumo-squat: exports/three-second-sumo-squat.glb present
PASS  player loads all exercises: Kneeling Back Rotation Stretch | Quadruped Thoracic Rotation | 3 Sec Sumo Squat
PASS  1.5× speed plays at 1.63× wall-clock
PASS  no page errors
```

Author self-check: `floor 0 cm, knee 2-110, kneeLine -5.6 to +2.0 cm, maxDorsi 23.4, feetDrift 0, elbowThigh >= 19.1 cm`. GLB: 24 joints, one clip `three-second-sumo-squat` (241 keys at 30 fps).

## Screenshots checked

Player index 2 in this worktree (the third module), `node test/shots.mjs 2 ...`:

- threeQuarter, dark: 0.5 (standing), 1.5, 2.5, 3.5 (lowering), 4.2 and 4.4 (bottom pause), 5.05 (rising), 5.6 (standing).
- front, dark: 0.5, 1.6, 2.5, 3.0, 4.2, 4.4. Toes turned out, knees over the feet at depth, symmetric, hands clasped at the sternum.
- side, dark: 0.5, 2.5, 4.2, 4.4. Hips down and slightly back, chest tall, heels flat, thighs about parallel.
- back, dark: 4.4.

No limbs pass through the body or floor, the feet do not slide, and the elbows stay clear of the thighs.

## Known limitations

- **Standing frames are cropped at the top of the head** in the player's camera presets. The player frames from joint positions sampled over the clip (head joint, not the top of the head), and a standing, non-travelling exercise has a small box. The bottom position is framed well.
- Hip abduction at depth (about 44 degrees) is above the 33 degrees measured at a habitual width; it comes from the 1.5x width plus the knees-out alignment.
- The hip `rot` channel trades off against `abd` at high flexion (flex-abd-rot order), so the stored hip rotation drifts from -25 degrees standing to about -1 degree at the bottom. The legs are drawn from IK, so this does not change what is shown.

## Needs from platform

- **Player framing:** include body shape extents (or add a head-top margin) when sizing the camera in `src/player.js` `loadExercise`, so standing exercises without travel are not cropped at the head.
- **Optional:** a per-keyframe IK pole (or a pole that blends between two directions) would let the knee track the toes exactly at every depth instead of only at the bottom.
