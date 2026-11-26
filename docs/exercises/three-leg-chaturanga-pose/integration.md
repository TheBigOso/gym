# 3 Leg Chaturanga Pose: integration notes

Issue #29. GymVisual #591513. Exercise id `three-leg-chaturanga-pose`. Built 2026-11-26.

## What was built

- `build/meta/three-leg-chaturanga-pose.json`: metadata (muscles by role with notes, breathing, prescription, cues per phase, mistakes, kinematics, sources, safety), camera presets, a 183 x 61 cm yoga mat, the timeline, illustrative activation curves, a shoulder path guide and the `checks` block.
- `build/author-three-leg-chaturanga-pose.js`: starts from `POSES.plank()`, adds four contacts (both hands, both feet) and solves every key pose with `solvePose` (root position and pitch against planted-limb distances, a straight-body term and a shoulder-height term). Writes `src/exercises/three-leg-chaturanga-pose.json`.
- `exports/three-leg-chaturanga-pose.glb`: two clips (`_right`, `_left`), 8 s.
- `authoredSide: "right"`: the right leg lifts; the player's side switch shows the left-leg rep, so reps alternate.

## Phases and timing (8 s loop)

| Phase | Time (s) | Breath | What happens |
|---|---|---|---|
| setup | 0 to 0.6 | natural | High plank, wrists under the shoulders, body in one line |
| dog | 0.6 to 2.3 | exhale | Hips up and back to downward dog (1.2 s), short hold |
| lift | 2.3 to 3.7 | inhale | Right leg lifts straight up behind, in line with the trunk; hold |
| shift | 3.7 to 4.9 | natural | Hips come down and forward into a three-legged plank, shoulders ahead of the wrists, leg still up |
| lower | 4.9 to 6.0 | exhale | Elbows bend straight back, hugging the ribs, to chaturanga |
| hold | 6.0 to 6.35 | exhale | Short pause at the bottom |
| press | 6.35 to 7.5 | inhale | Press back to plank; the right foot comes down and replants |
| reset | 7.5 to 8 | natural | Plank |

The real practice holds dog and three-legged dog for breaths and lowers over 2 to 3 s; the loop compresses this (stated in the prescription).

## Key angles (from the solved poses) vs research

| Measure | Animation | Research norm |
|---|---|---|
| Elbow flexion, bottom of chaturanga | about 98 degrees; shoulder joint 7 cm above the elbow (torso level with the elbows) | about 90 degrees, elbows close to the ribs; torso no lower than the elbows |
| Shoulders ahead of the wrists, bottom | about 21 cm | ahead of the wrists before the elbows bend (no number given) |
| Hip flexion, downward dog | 104 degrees (hip channel); thighs to trunk about 88 degrees | close to a right angle or tighter (estimate, no measured norm) |
| Lifted leg | in line with the trunk in three-legged dog (4 degrees above the line); 12 degrees above the body line through the lowering | roughly in line with the trunk or a little above, hips level |
| Wrist extension | about 84 (plank), 38 (dog), 70 (chaturanga) degrees | dog about 50; hand balance about 90; eight-limb pose 85 plus or minus 13 |
| Plank elbows and knees | about 10 and 7 degrees (straight, not locked) | not specified |

## Decisions on uncertain points

1. **Does the lifted leg stay up while lowering?** Yes. reference.md flagged this; videos.md resolves it from the FitWill guide ("keeping your lifted leg in the air") and Alo Moves. The leg stays lifted from three-legged dog through the pause and only comes down during the press back to plank.
2. **Breath.** Exhale to dog, inhale to lift the leg, natural breath on the shift, exhale to lower (the standard yoga cue; FitWill was inconsistent), inhale to press back.
3. **Heels in downward dog.** The standing foot stays on the ball of the foot (heels lifted, about 18 degrees plantarflexion). That keeps the foot planted on one spot through plank, dog and three-legged dog, and is a common way to do dog in a flow.
4. **How the shoulders get ahead of the wrists (main decision).** With both hands planted and the left ankle fixed, a straight body cannot move its shoulders ahead of the wrists: solving it with a fixed ankle gave a shoulder shift of only about 4 cm, and a chaturanga with 92 to 118 degree elbows pushed far behind the wrists, which is the "lowering without shifting forward first" mistake. Practitioners solve this by rolling forward onto the tips of the toes. So for the shift the left foot rolls 60 degrees over the toes (the ankle moves on an arc around the toe point, about 13 cm forward), and it rolls back during the press to plank. The foot stays planted on the ball of the foot throughout; its lowest point travels about 1 cm along the mat and lifts at most 0.26 cm, as a rolling toe tip does. This is done in module data only: `ik.leg_l.target` and `ik.leg_l.handRot` are keyed per pose, with 8 solved intermediate keys so the quaternion steps stay small.
   Because the left ankle target moves during the roll, `leg_l` is not listed in `checks.plantedContacts` (the verify check would see the moving ankle as sliding). The hands (`arm_r`, `arm_l`) and the right foot (`leg_r`, checked only while its weight is 1) are listed and pass at 0.000 cm. The author script reports the left-foot contact point travel instead.
5. **Chaturanga depth.** Shoulder joint height 31.5 cm (7 cm above the elbow joint): the chest is at about elbow height, not lower, matching "torso no lower than the elbows". The elbows end at about 98 degrees rather than exactly 90 because the shift forward is limited by how far the foot can roll.
6. **Elbow and knee direction.** Hand contacts use a pole pointing straight back (elbows hug the ribs). Foot contacts use a pole toward the mat, so the soft knees bend toward the floor in plank and toward the hands in dog (the default `legContact` pole let them drift sideways in a near-horizontal plank).
7. **Peak check measure.** None of the available measures captures elbow flexion, so the check uses `hipFlexion` (downward dog), range 85 to 120 degrees: the research only says "close to a right angle or tighter", and the rig's hip channel reads about 16 degrees above the thigh-to-trunk angle in this pose.
8. **Difficulty.** Advanced: research says intermediate to advanced, and the leg lift removes one support during the lowering.

## Verify results

`node build/author-three-leg-chaturanga-pose.js && node build/validate.js && node build/assemble.js && node build/export-gltf.mjs && node test/verify.mjs`

```
PASS  three-leg-chaturanga-pose: validates against schema
PASS  three-leg-chaturanga-pose: planted contacts (arm_r, arm_l, leg_r) do not slide (max 0.000 cm)
PASS  three-leg-chaturanga-pose: nothing below the floor (lowest -0.10 cm)
PASS  three-leg-chaturanga-pose: peak hipFlexion 104.4 (expected 85–120)
PASS  three-leg-chaturanga-pose: contact-driven legs within knee/ankle limits
PASS  three-leg-chaturanga-pose: has safety notes
PASS  three-leg-chaturanga-pose: joint limits respected
PASS  three-leg-chaturanga-pose: exports/three-leg-chaturanga-pose.glb present
PASS  player loads all exercises: Kneeling Back Rotation Stretch | Quadruped Thoracic Rotation | 3 Leg Chaturanga Pose
PASS  1.5× speed plays at 1.63× wall-clock
PASS  no page errors
```

The two existing exercises also still pass every check. Author-script sweep (801 samples): hands and planted feet never leave their targets (0.000 cm), lowest body point -0.10 cm (the hand, same as the base plank).

## Screenshots checked

Player index 2, rendered with `node test/shots.mjs 2 ... <cam> <side> dark <tag>`:

- Side, right: 0.3 (plank), 0.9, 1.8 and 2.0 (dog), 2.8 (leg lifting), 3.4 (three-legged dog), 4.1 (shift), 4.9 and 4.95 (three-legged plank, shoulders ahead of the wrists, foot on the toe tips), 6.1 (chaturanga), 6.9, 7.0 and 7.25 (press back, leg coming down).
- Three-quarter, right: 1.2, 3.4, 4.3, 5.5, 6.1, 7.3. Three-quarter, left (mirror): 4.4, 7.3.
- Front: 3.4, 6.1 (elbows tight to the ribs, no flare). Back: 3.4, 6.1 (hips square, leg straight behind).

Compared with reference.md: plank, dog, three-legged dog, forward shift, chaturanga with the leg up and the return all appear in order. No limbs pass through the body or the mat, the hands never move, and the right foot lands back on its own spot.

## Known limitations

- The rig foot has no toe joint, so "on the ball of the foot" is shown as the rigid foot standing on its toe tip (the foot is near vertical in plank and points past vertical while rolled).
- Elbows reach about 98 degrees, not exactly 90, at the bottom (see decision 4).
- Downward dog shows lifted heels and a slightly lower, less steep dog than a very flexible practitioner (wrist extension about 38 degrees vs about 50 cited).
- The left foot roll is not covered by verify's planted-contact check (see below).
- The player's HUD "Hip flexion" reads the stored channels; for the IK legs they are matched to the solved geometry by the author script.

## Needs from platform

- **Toe-pivot foot contact.** A planted contact that pins the toe (or foot-shape tip) and lets the ankle roll around it, for example a contact option `pivot: "toe"` in `src/engine.js` and the schema, would let feet roll onto the toes in push-up and plank-to-chaturanga moves without keying `ik.<id>.handRot` per pose. Today `applyIK` always pins the third chain joint (the ankle).
- **Planted-point check.** `test/verify.mjs` checks the ankle (chain[2]) against a constant target. A check on a named point (for example `checks.plantedPoints: [{ "joint": "toe_l" }]`, or the lowest point of the foot shape with a small travel tolerance) would let this module verify the rolling left foot too.
- **Elbow flexion measure.** A `elbowFlexion` option in `checks.measure` (both sides, from geometry) would allow checking the chaturanga depth (research range about 85 to 105 degrees) directly.
- **Quaternion tracks.** Keyed `handRot` values are interpolated per component by the timeline. That is fine with small steps (this module keeps the foot roll to at most 15 degrees between keys), but normalising or slerping `ik.*.handRot` in `buildTimeline` would make it safe for larger steps.
