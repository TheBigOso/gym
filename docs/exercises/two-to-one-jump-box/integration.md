# 2 to 1 Jump Box: integration notes

Issue #19. GymVisual #420813 (movement reference only). Exercise id `two-to-one-jump-box`, authored for the right landing leg (`authoredSide: "right"`); the Left/Right switch mirrors it, and the GLB has `_right` and `_left` clips.

## What was built

- `build/meta/two-to-one-jump-box.json`: metadata, cues, mistakes, kinematics, sources, safety, camera presets, one `box` prop, phases, activation, guides and checks.
- `build/author-two-to-one-jump-box.js`: key poses come from high-level targets. These are pelvis position and tilt, trunk and head flexion, arm swing, and, for each leg, a planted ankle, a toe-on-floor point, or a free ankle target. Leg channels are solved with `solvePose`. Both legs use `legContact` IK, and the IK weight blends for takeoff and landing. The script also checks the timeline for floor clearance and for any body shape entering the box. The peak and setup values in the kinematics table are written from the solved poses.
- Prop: plyo box **30 cm tall**, 45 cm deep, 60 cm wide (`center [57.5, 0, 0]`). The front edge is at x = 35 cm, so it is about 17 cm in front of the toes at the start.

### Phases and timing (8 s loop)

| Phase | Time (s) | What happens |
|---|---|---|
| setup | 0–0.55 | `POSES.standing`-style stance facing the box, feet hip-width, eyes on the box |
| dip | 0.55–1.18 | Countermovement into a quarter-to-half squat (knee ≈70°, hips back, trunk ≈44° forward), arms swing back |
| takeoff | 1.18–1.84 | Drive (1.34), two-foot toe-off at 1.47 with heels up and arms swinging forward and up. Flight is 0.37 s; the pelvis follows a ballistic arc (g = 981 cm/s²) up and onto the box |
| land | 1.84–2.35 | Right foot touches down at 1.84 (knee ≈10°) and absorbs to its peak at 2.08 (knee ≈47°, hip ≈42°). The left leg trails behind and below, arms forward |
| stick | 2.35–3.35 | 1 s hold on one leg (knee ≈43° easing to ≈41°), free leg off the box |
| stand | 3.35–4.35 | Stand tall on the right leg on the box, arms down |
| stepdown | 4.35–5.8 | Step backwards off the box: the left foot reaches down and lands toe-first at 14 cm (5.0 to 5.12 s). The right foot lifts, clears the box edge and steps down to the start mark (5.8) |
| reset | 5.8–8 | The left foot steps back to the start mark; stand tall |

Contacts: `leg_r` is planted on the floor until toe-off and on the box from 1.84 to 5.12, then planted on the floor again from 5.8. `leg_l` is planted on the floor until toe-off, at the step-down spot from 5.12 to 6.1, and at the start mark from 6.5. Targets change only while the weight is 0.

### Key angles vs research norms

| Measure | Animation | Research norm or target |
|---|---|---|
| Countermovement knee flexion | ≈70° | Quarter-to-half squat (no verified box-jump knee angle; McHugh 2024 depth vs height) |
| Countermovement pelvis drop | ≈16 cm | Reference shows a quarter squat; maximal CMJ self-selects ≈36 cm |
| Knee at initial contact | ≈10° | ≈9–13° (Li 2023, Song 2024, Baldazzi 2026) |
| Peak knee flexion on the catch | ≈47° | ≈46° natural, ≈50° soft; target 45–50° |
| Hip flexion on the catch | ≈42° | Target 30–45° visible hinge (lateral jump-landing data ≈26–27°) |
| Frontal-plane knee | Knee over the foot, no inward collapse (front view checked) | 2D valgus norms 1–12° |
| Pelvis travel (check measure) | ≈54 cm peak (30 cm up, ≈45 cm forward) | Animation choice for a 30 cm box |

## Decisions on uncertain points

- **Box height:** neither the reference nor the research gives one. I chose 30 cm. That is the low end of the 30–45 cm suggested in videos.md, and the top of the 15–30 cm starting range in the research prescription. At 30 cm the backward step down also stays physically plausible (see Known limitations).
- **Where the foot lands:** near the middle of the box top, slightly toward the front (foot spans x 41–66 cm on a 35–80 cm box top). Landing flat-footed under IK, with a toes-down approach just before contact.
- **Free leg:** held behind and below the body. Hip flexion ≈18–20° and knee ≈66–70°, foot relaxed and pointing down, clear of the box at all times.
- **Step down:** videos.md says to stand tall, step down rather than jump down, and reset facing the box. I authored a backward step: the left foot goes down first, then the right. Then a short step returns the left foot to the start mark, so the loop is seamless.
- **Check measure:** `kneeFlexion` peaks over the whole clip and both legs, so the countermovement, trailing leg and step down would mask the landing value. I used `rootTravel` (range 50–66 cm) to confirm that the figure actually ends up on the box. The landing knee (≈47°) and hip (≈42°) are reported here and in the kinematics table.
- **Muscles:** rig ids only. Tibialis anterior, peroneus longus and the foot intrinsics have no rig region; they are mentioned in the `calves_r` note.

## Verify results

```
PASS  two-to-one-jump-box: validates against schema
PASS  two-to-one-jump-box: planted contacts (leg_r, leg_l) do not slide (max 0.001 cm)
PASS  two-to-one-jump-box: nothing below the floor (lowest -0.06 cm)
PASS  two-to-one-jump-box: peak rootTravel 54.1 (expected 50–66)
PASS  two-to-one-jump-box: contact-driven legs within knee/ankle limits
PASS  two-to-one-jump-box: has safety notes
PASS  two-to-one-jump-box: joint limits respected
PASS  two-to-one-jump-box: exports/two-to-one-jump-box.glb present
PASS  player loads all exercises: Kneeling Back Rotation Stretch | Quadruped Thoracic Rotation | 2 to 1 Jump Box
PASS  1.5× speed plays at 1.65× wall-clock
PASS  no page errors
```

All checks for the two existing exercises still pass. The author script's own check reports no body shape entering the box at any time (box penetration 0.00 cm, sampled every 5 ms).

## Screenshots checked

- Side view, right: 0.3, 1.15, 1.34, 1.47, 1.58/1.62, 1.79, 1.84, 2.08, 2.6, 4.05, 4.75, 5.0, 5.12, 5.32, 5.4, 5.48, 5.56, 5.63, 5.72, 5.8, 6.1, 6.2, 6.3, 6.6 s.
- 3/4 view, right: 0.3, 1.15, 1.34, 1.47, 1.58, 1.69, 1.79, 1.84, 2.08, 2.6, 4.05, 4.75 s.
- Front and back views, right: 1.15, 1.69, 2.08, 4.05, 5.0, 5.48 s. The landing knee tracks over the foot and the pelvis shifts over the stance foot.
- 3/4 view, left (mirror): 2.6 and 7.9 s. The box mirrors correctly, and the loop end matches the start.

Fixes made after looking: the arms read too low on the catch and stick (shoulder elevation is relative to the thorax, so I raised it about 25°). The right foot clipped the box edge during the step down; I added a `rightBack` key pose so the foot clears the edge before it drops. A too-deep, high-knee step down was eased by moving the pelvis back. A straight-knee standing pose on the box reached past the IK target; I added a little knee bend.

## Known limitations

- **Arms on the back swing flare outward:** the rig limits shoulder plane to -60° or more, so pure shoulder extension (plane -90°) is not possible. In the dip the arms go back and about 30° out to the side.
- **The backward step down is deep:** the support knee reaches ≈93° while the left foot plants, and the right swing knee briefly reaches ≈112° as it lifts over the box edge. With a 30 cm box and the left foot kept clear of the box front edge, the geometry needs this. A taller box would need more.
- The landing is flat-footed once planted (IK feet are world-locked flat); the ball-to-heel roll is only suggested by a toes-down approach just before contact.
- Activation curves are illustrative, not EMG.
- The `jointAngle` guide (landing knee, band 45–50°) is stored in the module but the player does not draw `jointAngle` guides yet.

## Needs from platform

- `src/rig.json`: allow shoulder `plane` down to about -90° (shoulder extension in the sagittal plane), so the arms can swing straight back on jumps.
- `src/rig.json`: optional muscle regions for tibialis anterior / peroneals (landing ankle control).
- `src/player.js`: render `jointAngle` guides (for example, a knee arc with a norm band) for landing drills.
- `test/verify.mjs` / schema `checks.measure`: a way to measure within a time window and for one leg (for example, peak `kneeFlexion` of the right leg between 1.8 and 2.4 s), and a prop-penetration check for box drills.
