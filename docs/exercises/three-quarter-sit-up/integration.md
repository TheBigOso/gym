# 3/4 Sit-up: integration notes

Issue #24. GymVisual #247613. Exercise id `three-quarter-sit-up`. Built 2026-11-26.

Files: `build/meta/three-quarter-sit-up.json`, `build/author-three-quarter-sit-up.js`, `src/exercises/three-quarter-sit-up.json`, `exports/three-quarter-sit-up.glb`.

## What was built

Bilateral, symmetric module (`authoredSide: "bilateral"`, one GLB clip `three-quarter-sit-up`). Start pose is `POSES.supine()` with these changes:

- The pelvis pitch (96.5°) and a small spine curve (L5 -5°, T12 +8°, T6 +8°) are solved so the buttocks, low ribs and upper back all rest on the mat. The helper's trunk floated about 5 cm above the mat.
- The feet are flat and free (not anchored), hip-width (ankles at z = ±8.6 cm). Knees are at 90°. Both legs are leg IK contacts at weight 1 with a constant target for the whole loop. The pole is +Y so the knees point at the ceiling.
- The stored hip, knee and ankle channels are fitted to the IK solution. Hip flexion grows by exactly the change in pelvis pitch, so FK and IK agree and the stored hip angle is the real one.
- Fingertips cradle the back of the head and meet at the midline. The palms face the head. Elbows stay wide, about 3 cm behind the shoulder line in the upper-back frame, and are re-solved at every key. The left arm mirrors the right channels.

The pelvis joint never moves. The trunk rises from two things: segmental spine flexion, and the pelvis rolling toward the thighs (hip flexion). The pitch is solved by bisection so the pelvis-to-C7 line hits the chosen angle from the floor.

### Phases and timing (8 s loop)

| Phase | Time (s) | Breath | What happens |
|---|---|---|---|
| setup | 0.0-0.8 | natural | Lying, head resting on the hands |
| curl | 0.8-1.7 | exhale | Head and shoulder blades peel off the mat (T12 +12°, T6 +18°, neck +19°). The pelvis stays down. |
| rise | 1.7-2.9 | exhale | The lumbar spine peels up, then the hips flex. Passes 38° from the floor at 2.3 s and reaches 66° at 2.9 s. |
| hold | 2.9-3.6 | natural | Brief pause at 67° from the floor, short of vertical |
| lower | 3.6-6.1 | inhale | The pelvis rolls back first (42° at 4.6 s), then the low back reaches the mat (5.5 s) with the shoulders still up, then the upper back (6.1 s) |
| reset | 6.1-8.0 | natural | The head settles back onto the hands last (6.8 s), then a short reset |

That is about 2.1 s up, a 0.7 s pause and 2.5 s down. It matches the videos.md suggestion (1.5-2 s up, about 0.5 s hold, 2-2.5 s down) and the research tempo (about 2 s per rep, controlled).

### Key angles at the top vs research norms

| Measure | Setup | Peak (top) | Norm | Source |
|---|---|---|---|---|
| Trunk (pelvis to C7) from the floor | lying flat | 67° (66° at 2.9 s, 67° in the hold) | 60-70° | GymVisual reference, FitnessVolt |
| Lumbar flexion (L5 channel) | -5° | 25° (+30° from lying) | About 30° in a bent-knee sit-up | Escamilla 2016 citing Halpern and Bleck 1979 |
| Thoracic flexion (T12 + T6) | 17° resting curve | 47° (+30°) | Head and shoulders curl first | Youdas 2008, Physiopedia |
| Hip flexion (channel) | 30° (thigh 37° above the floor) | 68° | About 45° at the start (clinical opinion) | research.md |
| Knees | 90° | 90°, unchanged | About 90° | GymVisual, FitnessVolt |
| Neck + head flexion | 11° (head on the hands) | 30° in the curl, 16° at the top | Chin slightly tucked, off the chest | research.md cues |

All spine, neck, hip and arm channels stay inside the rig limits. The spine segments are clamped 1° inside them.

## Decisions on uncertain points

1. **What "3/4" means.** I followed reading 1 from videos.md (partial ascent: GymVisual and FitnessVolt). The trunk rises to about 60-70° from the floor and the rep lowers all the way back to the mat. I did not use reading 2 (feet anchored, torso up to vertical, lowering only three-quarters of the way; Bodybuilding.com and iFitness) or Fitwill's crunch-height version. The peak was set to 66-67°, inside the band. The author script throws an error if the peak trunk angle leaves 60-70°.
2. **Feet.** Flat and not anchored, as in the reference, FitnessVolt and the research mistake "regress rather than anchor the feet". No foot strap or bar prop.
3. **Hip angle at the start.** research.md gives about 45° as clinical opinion, derived from "feet flat, knees at 90". With the rig's hip about 8 cm above the ankle joint, a 90° knee puts the thigh 37° above the floor, which is 30° of hip flexion relative to the resting pelvis. I kept the 90° knee from the reference rather than bending the knees more to reach 45°.
4. **Where the abdominals hand over to the hip flexors.** The research says the "about 30°" figure is not confirmed. The animation curls first (spine only, pelvis still) and adds pelvic roll only after the shoulder blades are up, which is the commonly taught order. The activation curves are illustrative: core and obliques peak in the curl and the late lowering, and hip flexors and rectus femoris (quads) peak near the top.
5. **Lowering order.** The research cues say "back and then head returning to the mat". The lowering keys roll the pelvis back first, then the lumbar spine, then the thoracic spine, with the head touching down last.
6. **Hands.** The fingertips cradle the head, palms toward it, and meet at the midline (the two hands' fingertips overlap by about 1.5 cm, which reads as lightly laced fingers). The hands follow the head and never lead it. Elbows stay wide in every key, and the front view confirms this.
7. **Peak measure (deviation from the brief).** The brief asked for `checks.measure` = `trunkFlexion` with a range matching 60-70° from the floor (20-30° from vertical). `test/verify.mjs` takes the maximum of the measure over the loop. For a sit-up the maximum of "pelvis-to-C7 angle from vertical" is the lying pose (99.4°), not the top, so a 20-30° range would always fail and a range around 99° would test nothing. I used `hipFlexion` instead (max of the stored hip channel, which is the real hip angle here). Its band, 61-72°, is computed by the author script: it solves the top-of-rep spine curl at exactly 60° and 70° from the floor and reads the hip angle each time. So the check is equivalent to "trunk 60-70° from the floor" for this curl. The trunk angle itself is asserted in the author script (it throws if the peak is outside 60-70°) and shows in the player HUD ("Trunk from vertical 24°" at the top). See "Needs from platform".
8. **Safety.** `exercise.safety.cautions` states the McGill low-back debate fairly: the case for caution (more than 3,000 N compression, McGill 1995 and 1998; curl-ups best ratio, Axler and McGill 1997), the counter-view (Contreras and Schoenfeld 2011; Ross, ACE 2011) and the soldier trial (Childs 2010). It ends with "not settled". It also lists the clear modify groups (low-back pain or disc issues, osteoporosis, pregnancy and postpartum diastasis, neck pain), the session cap and the morning-timing advice.

## Verify results

`node build/author-three-quarter-sit-up.js && node build/validate.js && node build/assemble.js && node build/export-gltf.mjs && node test/verify.mjs`

```
PASS  three-quarter-sit-up: validates against schema
PASS  three-quarter-sit-up: planted contacts (leg_r, leg_l) do not slide (max 0.000 cm)
PASS  three-quarter-sit-up: still joints (pelvis, hip_r, hip_l, knee_r, knee_l, ankle_r, ankle_l) stay put (max 0.000 cm)
PASS  three-quarter-sit-up: nothing below the floor (lowest -0.41 cm)
PASS  three-quarter-sit-up: peak hipFlexion 67.9 (expected 61–72)
PASS  three-quarter-sit-up: contact-driven legs within knee/ankle limits
PASS  three-quarter-sit-up: has safety notes
PASS  three-quarter-sit-up: joint limits respected
PASS  three-quarter-sit-up: exports/three-quarter-sit-up.glb present
PASS  player loads all exercises: Kneeling Back Rotation Stretch | Quadruped Thoracic Rotation | 3/4 Sit-up
PASS  1.5× speed plays at 1.66× wall-clock
PASS  no page errors
```

Both existing exercises still pass every check. The author script's own scan reports: trunk peak 67.0° from the floor, feet move 0.000 cm, pelvis drift 0.000 cm. `test/inspect-glb.mjs` shows one clip, `three-quarter-sit-up` (25 channels, 241 keys).

## Screenshots checked

`node test/shots.mjs 2 ...` (the exercise is index 2 in the player list):

- Side view at 0.3, 1.7, 2.3, 3.2, 4.6, 5.5, 6.1 and 6.8 s. Checked: lying flat with the head on the hands; head and shoulders up first in the curl; trunk peeling up with the feet flat; 3/4 position short of vertical; pelvis rolling back first on the way down; low back down with the shoulders still up; head down last.
- 3/4 view at 0.3, 1.7 and 3.2 s. Checked: knees pointing at the ceiling, feet hip-width and flat, elbows wide, hands behind the head.
- Front view at 0.3 and 3.2 s. Checked: symmetric pose, elbows wide in line with the ears, hands behind the head, no limbs through the body.

## Known limitations

- The pelvis joint is fixed. Because the pelvis rolls about that joint rather than on the buttocks, the buttocks sit 0.5 cm above the floor at rest and press up to 0.41 cm into it near the top (inside the 0.5 cm floor tolerance and the 0.6 cm mat).
- When lying, the forearms rest on the mat but the elbow joints sit about 10 cm above it (upper arms slightly raised), because the hands under the head lift it about 4 cm.
- The `hipAngle` guide is a `jointAngle` guide, which the current player does not draw. The C7 path guide does draw.
- The GymVisual model is female; the rig is unisex. No GymVisual media was downloaded or stored.
- The activation curves are illustrative 0-1 values shaped by the EMG ranking in research.md, not EMG data.

## Needs from platform

1. **Minimum-type peak measures in `test/verify.mjs`.** `checks.measure` always takes the maximum over the loop. Exercises whose key position is a minimum (sit-up trunk angle from vertical, squat depth by hip height, and so on) cannot be checked directly. Suggest an optional `"mode": "min"` (or `"at": "min"`) on `checks.measure`, read as `peak = Math.min(...)`. With that, this module should use `{ "name": "trunkFlexion", "mode": "min", "min": 20, "max": 30 }` (the current peak is 23.0° from vertical).
2. **`POSES.supine()` in `build/lib.js`.** With the default `kneeFlex: 90`, the ankles end up about 25 cm above the floor (feet not on the mat), and the upper back floats about 5 cm above the mat because the spine line sits below the pelvis joint. Suggest a supine helper that solves pelvis pitch and spine curve so the back rests on the mat, and returns leg contacts with flat feet.
3. **`legContact()` pole for lying exercises.** The pole `[1, 0, ±0.15]` is right for standing, but in supine it splays the knees about 45° outward. This module overrides it with `[0.15, 1, ±0.04]`. Suggest a `pole` option on `legContact(side, bend, pole)`.
