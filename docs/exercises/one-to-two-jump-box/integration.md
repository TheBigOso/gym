# 1 to 2 Jump Box: integration notes

Issue #9. GymVisual #420913 (movement reference only; no GymVisual media is stored or copied). Exercise id `one-to-two-jump-box`.

## What was built

- `build/meta/one-to-two-jump-box.json`: metadata (muscles by role with notes, breathing, prescription, 9 cues tied to phase ids, 7 mistakes, kinematics, 19 sources, safety), camera presets, the box prop, timeline and phases, illustrative activation curves, guides and checks.
- `build/author-one-to-two-jump-box.js`: solves 26 named key poses and writes `src/exercises/one-to-two-jump-box.json`.
- `exports/one-to-two-jump-box.glb`: right and left clips (`authoredSide: "right"`, right leg = takeoff leg).

### Prop and layout

- **Box: 60 × 45 × 75 cm (depth × height × width), 45 cm tall.** That is 18 in, the top of NASM's 12-18 in beginner range, and about knee height on the 172 cm rig (knee joint at 48 cm), which matches the reference.
- Start: feet together, toes 34 cm behind the box edge (inside Signum's 12-24 in).
- Landing: ankles 11 cm in from the edge, so heels sit about 4 cm in and the whole foot is on the box top (Lenz 2024: slips off the edge cause the wounds).
- The figure faces +X; the box is ahead of it.

### Phases and timing (9 s loop)

| Phase | Time (s) | What happens |
|---|---|---|
| setup | 0-0.7 | Stand tall, arms at the sides |
| stagger | 0.7-1.4 | Left foot steps back 30 cm; the right (takeoff) foot stays in front |
| load | 1.4-1.95 | Hinge, sink into the front leg (knee about 42°), back heel rises, arms swing back |
| drive | 1.95-2.32 | Arms swing through and up, free (left) knee drives up, right leg extends onto the ball of the foot; toe-off at 2.32 |
| flight | 2.32-2.70 | Ballistic pelvis arc (0.38 s, pelvis rises about 38 cm). The takeoff leg recovers and comes up to meet the swing leg (both knees about 90° at 2.5 s), then both legs reach for the box |
| land | 2.70-3.40 | Both feet touch down flat at the same instant (knees 26°), absorb to a quarter-to-half squat (knees 66°, hips back, trunk about 35° forward, arms forward), stick |
| stand | 3.40-4.60 | Stand tall on the box |
| stepdown | 4.60-6.90 | Step down backward: left foot reaches back, lands toe first behind the box, heel lowers; the right foot rises onto its toes, lifts off and steps down and back to the start spot |
| reset | 6.90-9.00 | Left foot steps back beside the right; stand |

Breathing: inhale stagger and load, exhale on the drive, hold through flight and landing, natural afterward (research.md).

### Key angles vs research norms

| Measure | Animation | Research (all indirect) |
|---|---|---|
| Landing knee at contact | ≈26° | 16-29° in 30 cm double-leg drop landings (Etnoyer 2013, Li 2023) |
| Landing knee, settled | ≈66° | Quarter-to-half squat, animation estimate 45-75°; drop-landing peaks 81-96° are upper bounds |
| Landing hip, settled | ≈74° | 77-86° at peak knee flexion in drop landings (deeper knees than ours) |
| Takeoff knee at the bottom of the load | ≈42° | No norm; a shallow single-leg countermovement |
| Trunk at takeoff | ≈19° at the bottom of the load, ≈10° at toe-off | "Slightly forward" (ACE); no number |
| Box height | 45 cm | 30-46 cm for beginners (NASM) |

## Decisions on uncertain points

- **Box height:** reference.md said "about knee height, confirm with demos". The video descriptions give no number, so 45 cm (NASM's upper beginner value, about knee height on the rig) was used, as the ticket asked.
- **Start:** GymVisual steps into the stagger and Signum starts on one leg. GymVisual's version (step back into the stagger) was animated. The non-takeoff leg steps **back**, so the takeoff foot stays a safe 34 cm from the box.
- **Takeoff leg:** right (authoredSide "right"); the player mirrors it for a left takeoff.
- **Step down:** both matching videos and GymVisual step back down. The left (non-takeoff) foot goes first, then the right foot steps down and back to the start spot, then the left foot steps back beside it, so the loop closes on the start pose.
- **Peak check:** `checks.measure` is `rootTravel` 64-99 cm, not `kneeFlexion`. verify.mjs takes the peak over the whole loop, and in a backward step-down from a 45 cm box the trailing leg has to fold to about 130° to clear the box edge (the support knee reaches about 94-107° as the left foot lands). That is far above any landing value, so a knee check could not test the landing. The rootTravel range comes from research: vertical rise = box height 30-46 cm (NASM); horizontal pelvis travel = toe gap 30-61 cm (Signum) + about 27 cm (toe-to-ankle plus landing in from the edge). Ours: 75.8 cm. The landing knee is reported by the author script instead (26° contact, 66° settled).

## Verify results

`node build/author-one-to-two-jump-box.js && node build/validate.js && node build/assemble.js && node build/export-gltf.mjs && node test/verify.mjs`

```
PASS  one-to-two-jump-box: validates against schema
PASS  one-to-two-jump-box: planted contacts (leg_r, leg_l) do not slide (max 0.014 cm)
PASS  one-to-two-jump-box: nothing below the floor (lowest -0.13 cm)
PASS  one-to-two-jump-box: peak rootTravel 75.8 (expected 64–99)
PASS  one-to-two-jump-box: contact-driven legs within knee/ankle limits
PASS  one-to-two-jump-box: has safety notes
PASS  one-to-two-jump-box: joint limits respected
PASS  one-to-two-jump-box: exports/one-to-two-jump-box.glb present
PASS  player loads all exercises: Kneeling Back Rotation Stretch | Quadruped Thoracic Rotation | 1 to 2 Jump Box
PASS  1.5× speed plays at 1.64× wall-clock
PASS  no page errors
```

The other two exercises still pass all their checks.

The author script also checks every body shape against the box volume over the whole loop (0.00 cm penetration) and the floor (lowest -0.13 cm, at the left toe pivot during the step down).

## Screenshots checked

Player index 2 (`test/shots.mjs`, tagged `_jbx9`):

- Side, right: 0.3, 0.85, 1.2, 1.4, 1.75, 1.95, 2.1, 2.22, 2.27, 2.32, 2.41, 2.45, 2.55, 2.62, 2.7, 2.85, 3.2, 3.6, 4.2, 5.0, 5.3, 5.6, 5.75, 5.9, 6.05, 6.25, 6.4, 6.6, 6.85, 7.2, 7.4, 8.5.
- 3/4, right: 0.3, 1.95, 2.27, 2.55, 2.7, 3.2, 4.2, 5.75.
- Front: 1.95, 2.27, 2.55, 3.2, 5.75, 6.25, 6.4, 7.2.
- Back: 3.2, 6.4. 3/4, left (mirror): 2.27, 5.75.

What they showed: the stagger, arm swing, single-leg push-off, both knees up together in flight, a simultaneous flat two-foot landing on the box, hips back on the absorb, and a backward step-down. No limb passes through the box or floor, and no planted foot slides.

## Known limitations

- **Framing:** when the figure stands on the box the player's auto-framing crops the top of the head in the 3/4 and side presets. The framing samples joint positions, not shape extents, and the head top is about 20 cm above `head_c1`. Raising the camera pitch did not fix it. See "Needs from platform".
- **Back-swing arms** go back and slightly out (shoulder plane -60°), because the rig's shoulder plane limit (-60°) excludes pure extension (plane -90°).
- **Ball-of-foot contacts** (back foot in the load, push-off, step-down toe touch, right heel rise on the box) are FK, not IK, because the leg IK holds the foot flat. They sit 0.8 cm above the surface so channel interpolation never dips through it, and they are not covered by the `plantedContacts` check.
- **COM:** the flight arc is computed for the pelvis, not the true centre of mass. The tuck shifts the COM a few cm, which is not visible at this speed.
- **Activation curves** are illustrative, not EMG.

## Needs from platform

1. **Phase-scoped measure:** let `checks.measure` take an optional `phase` (or time window), so verify can test the landing knee (for example `kneeFlexion` 45-96 during `land`) instead of the whole-loop peak. Exercises with a step-down or big swing-leg tuck can't use `kneeFlexion` today.
2. **Framing:** in `loadExercise`, include body shape extents (or pad the box by the head radius) when framing, so standing-on-box poses are not cropped.
3. **Optional `ik.<id>.pitch`** (or a toe-pivot contact): heel rises and toe touches could then be IK-planted at the ball of the foot and covered by the slide check.
4. **jointAngle guide:** the module includes a `jointAngle` guide (landing knee, band 45-75°). It is valid schema, but the player does not draw `jointAngle` guides yet.
