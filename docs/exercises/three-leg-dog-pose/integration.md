# 3 Leg Dog Pose: integration notes

Issue #34. GymVisual #588713. Exercise id `three-leg-dog-pose`, authored side right (the right leg lifts, the left leg stands). Built 2026-11-26.

Files: `build/meta/three-leg-dog-pose.json`, `build/author-three-leg-dog-pose.js`, `src/exercises/three-leg-dog-pose.json`, `exports/three-leg-dog-pose.glb`.

## What was built

The clip is 12 s and loops. It starts from `POSES.plank()`.

| Phase id | Time (s) | Breath | What happens |
|---|---|---|---|
| setup | 0 to 0.8 | natural | High plank. Hands under the shoulders, on the balls of the feet. |
| toDog | 0.8 to 2.8 | exhale | Hips go up and back into down dog. The hands stay put and the feet roll from tucked toes to heels reaching down, pivoting on the balls of the feet. |
| dog | 2.8 to 3.6 | natural | Down dog. The leg contacts are switched on here (weight 0 to 1 over 2.8 to 3.2 while the pose holds still). |
| lift | 3.6 to 5.4 | inhale | Right leg lifts up and back, straight, hips square. The right foot contact is released over 3.6 to 4.2. |
| hold | 5.4 to 7.6 | natural | Three-legged dog. The leg rises 3° more on the breath at 6.5 s, then settles. |
| lower | 7.6 to 9.2 | exhale | Right foot comes back down beside the left. Contact weight goes back to 1 over 8.6 to 9.2, so it lands softly. |
| toPlank | 9.2 to 11.4 | inhale | Both leg contacts are released while dog holds still (9.2 to 9.6), then the same roll plays in reverse to plank. |
| reset | 11.4 to 12 | natural | Plank. |

Contacts: `arm_r`, `arm_l` (hand contacts from the plank helper, weight 1 the whole time), and `leg_r`, `leg_l` (`legContact` with the foot pitched 15° heel-up). The leg contacts use one constant target each, at the down-dog ankle position. They have weight 1 only while the dog is held: 3.2 to 9.2 for the left leg, and 3.2 to 3.6 plus 9.2 for the right.

How the feet stay put: going from plank to dog the ankle really moves, because the foot rolls over the toes. The leg contact pins the ankle with a fixed foot rotation, so it can't show that roll. The roll is done with FK instead: 16 eased keys each way. At each key the trunk is re-solved so the elbows keep a 5° bend and the hip-to-ankle distance matches the knee bend. Then hip flexion and ankle dorsiflexion are solved so the toe joint lands exactly on its plank spot, with the foot pitch blended from tucked (61.5°) to 15° heel-up. The worst toe drift between keys is 0.028 cm. `toe_l` is listed in `checks.stillJoints`, so verify tests it over the whole clip.

### Key angles at the peak compared with research norms

| Measure | Rig | Research |
|---|---|---|
| Standing hip flexion (dog) | 88.9° at the hip joint; 83.4° trunk (pelvis to C7) to thigh | About 83° wall dog (Salem 2013); 49° and 67° means, up to about 92 to 95°, in Parvatasana (Mullerpatan 2019); suggested 80 to 90° |
| Shoulder flexion, arm to trunk | 172° | 160 to 175° estimate, head between the upper arms |
| Standing ankle dorsiflexion | 28.9° (heels about 5 cm off the floor) | Peak 30.5° (SD 11.4°) in Parvatasana; rig limit 35° |
| Standing knee | 4° | 2.5° (SD 5.7°); 0 to 10° soft knee |
| Elbows | 5° | 0 to 10°, straight not locked |
| Lifted hip | 5.4° flexion at the hip joint, which puts the thigh exactly on the trunk line (2.4° at the top of the breath); hip rotation 4° internal so the toes point down; ankle 6° dorsiflexed (heel reaching back) | No measured value; in line with the trunk, at most 10 to 20° past it |
| Pelvis | Level, no roll or yaw during the lift | Square-hip version |

`checks.measure` is `hipFlexion` with a range of 75 to 95°, taken from the numbers above.

## Decisions on uncertain points

- **Square or open hip:** square, as videos.md says GymVisual shows. The pelvis does not roll and the lifted leg stays in the sagittal plane with slight internal rotation.
- **Leg height:** reference.md says "up and back" with no angle. I used the research estimate: the thigh in line with the trunk line, plus 3° on the breath. It never goes past the trunk line by more than 3°.
- **Heels:** with the hands and the balls of the feet kept where the plank put them, flat heels would need about 44° of dorsiflexion, which is beyond the 35° rig limit. So the feet are pitched 15° heel-up (heels about 5 cm off the floor), giving 29°. That is close to the 30.5° research peak and matches the cue "heels reach toward the floor but need not touch".
- **No step between plank and dog:** the hands and toes do not move, as in the reference flow. The wrist-to-toe distance therefore comes from `POSES.plank()` (about 125 cm). The resulting dog has the trunk about 33° below horizontal, a little flatter than many demos.
- **Hips during the lift:** they stay still. I tried a 2 cm drift toward the hands, but with the hands and standing foot fixed it changed the arm line from 172° to 162° and bent the elbows to 13° partway through, so I left it out.
- **Hold or flow:** flow, as in the reference (a 2.2 s hold, about one breath). The prescription gives the static option (3 to 5 breaths per side).
- **Breathing:** exhale into dog (Yoga Journal), inhale to lift, exhale to lower, inhale back to plank (research.md estimate and caller brief).
- **Sources:** the Yoga Journal "Back Basics: Three-Legged Downward Dog Dissected" piece named in videos.md has no URL in the inputs, so it is not listed in `exercise.sources`. The video sources are the two YouTube links from videos.md with the clearest match (Maria De Noda, Dani Winks). Their content was not watched (see videos.md).

## Verify results

`node build/author-three-leg-dog-pose.js && node build/validate.js && node build/assemble.js && node build/export-gltf.mjs && node test/verify.mjs`

```
PASS  three-leg-dog-pose: validates against schema
PASS  three-leg-dog-pose: planted contacts (arm_r, arm_l, leg_l, leg_r) do not slide (max 0.000 cm)
PASS  three-leg-dog-pose: still joints (wrist_r, wrist_l, toe_l) stay put (max 0.028 cm)
PASS  three-leg-dog-pose: nothing below the floor (lowest -0.10 cm)
PASS  three-leg-dog-pose: peak hipFlexion 88.9 (expected 75–95)
PASS  three-leg-dog-pose: contact-driven legs within knee/ankle limits
PASS  three-leg-dog-pose: has safety notes
PASS  three-leg-dog-pose: joint limits respected
PASS  three-leg-dog-pose: exports/three-leg-dog-pose.glb present
PASS  player loads all exercises: Kneeling Back Rotation Stretch | Quadruped Thoracic Rotation | 3 Leg Dog Pose
PASS  1.5× speed plays at 1.59× wall-clock
PASS  no page errors
```

Both existing exercises still pass every check. `test/glb-roundtrip.mjs three-leg-dog-pose right 6.0` loads both 12 s clips (`three-leg-dog-pose_right`, `three-leg-dog-pose_left`) and shows the three-legged dog. That script logs the same "Cannot set properties of null" page error for the existing exercises too, so it is not caused by this module.

## Screenshots checked

Player index 2 (`node test/shots.mjs 2 ... _3ld`):

- Side, right: 0.4 (plank), 1.4, 1.8, 2.3 (rolling into dog), 3.2 (dog), 4.0 and 4.4 (lift-off), 6.0 (hold), 8.4 (lowering), 10.5 (back to plank).
- 3/4: 0.4, 1.8, 3.2, 6.0.
- Front: 3.2, 6.0. Back: 6.0. Left side (mirrored): 6.0.

What I checked in them: the hands stay flat; the balls of the feet stay on their spot while the heels drop back; the head hangs between the upper arms in dog; the lifted leg is straight and on the trunk line; the front view shows the pelvis level with the leg straight up behind it (no hip opening); nothing goes through the floor or the body; the mat is under hands and feet.

## Known limitations

- The spine is kept neutral (no flexion). There is no extra "chest toward the thighs" thoracic extension.
- The dog trunk is a little flatter than in many demos, because the hand-to-foot distance comes from the plank (see decisions).
- Muscle activation curves are illustrative, not EMG.
- The right leg's lift-off and landing are blended by contact weight. They look smooth, but the exact foot path in the first 0.6 s comes from that blend, not from an explicit key.

## Needs from platform

- **Foot roll while planted:** `legContact` pins the ankle with a fixed foot rotation, so a foot that pivots on the ball (plank to dog, heel raises, lunges) can't be a planted contact. Two fixes would work: a contact mode that pins the toe joint and keys the foot pitch per pose, or a documented, normalized per-pose `ik.<id>.handRot`. The engine already reads `k.handRot`, but it isn't in the schema and its components would be lerped without normalizing. Until then, FK keys with `toe_*` in `stillJoints` work, as here.
- **Lifted-leg measure:** `hipFlexion` takes the larger of the two hips, so here it can only check the standing leg. A per-side or minimum hip measure (for example `hipExtension`) would let verify check the lifted leg's height against the research band.
- **Screenshots in /tmp collide:** `test/shots.mjs` writes `/tmp/s3d-<index>-...png`, and parallel integrate agents all use index 2. One of my first renders was another agent's frame. Putting the exercise id in the default filename would fix this. I used the tag argument (`_3ld`) to work around it.
- **Player:** only the first `path` guide is drawn, so each module gets a single path.
- **Verify timing:** the 1.5× speed check read between 1.59× and 1.65× in this container (limit 1.7×). It could flake on a slow runner.
