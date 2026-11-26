# 4 Cone Single Foot Lateral Hops: integration notes

Issue #48 (Batch 1, exercise 10 of 10). Movement reference: GymVisual #906712 (see `reference.md`). Built 2026-11-26.

Files: `build/meta/four-cone-single-foot-lateral-hops.json`, `build/author-four-cone-single-foot-lateral-hops.js`, `src/exercises/four-cone-single-foot-lateral-hops.json`, `exports/four-cone-single-foot-lateral-hops.glb` (two clips, `_right` and `_left`).

## What was built

**Layout.** Four orange `cone` props, 15 cm tall with a 12 cm base, in a straight line along Z at z = -52.5, -17.5, 17.5 and 52.5 cm (35 cm apart), centred under the midfoot (x = 6 cm). The figure faces +X and travels sideways along Z. Foot spots are midway between cones plus one outside each end (z = -70, -35, 0, 35, 70), so each hop is 35 cm.

**Stance.** `POSES.standing` with the left foot lifted: right foot planted through the `leg_r` contact, left leg FK only (hip flexion 6-14 degrees, knee 88-95 degrees, ankle plantarflexed), so the free foot hangs behind the support leg about 31 cm off the floor. Arms bent about 70-85 degrees at the elbow, hands forward of the hips, with small changes for drive, flight and landing balance. The head cancels most of the trunk lean so the eyes stay forward.

**Pelvis placement.** For every key with the foot on the floor, the author script solves the pelvis position so the right knee has the wanted bend and a simple segment-mass centre of mass sits over the midfoot (or over the ball of the foot at push-off), shifted along Z: about 4 cm toward the travel direction while loading, 11 cm at toe-off, 9 cm behind the foot at touch-down, back over the foot in the stick.

**Contact handling (seamless weights).** While the foot is flat, `leg_r` has weight 1 and a constant target. On push-off the contact hands over to FK on an identical pose (weight 1 to 0 in 15 ms with no visible change), then FK keys roll the heel up about the ball (18 then 38 degrees heel-up) to toe-off. Landing mirrors this: touch-down on the ball (20 degrees), heel settles (9 degrees), flat FK pose, then weight 0 to 1 on the identical pose. In flight the pelvis follows a ballistic arc (g = 981 cm/s², 0.30 s flight) between the toe-off and touch-down pelvis positions; the foot lifts, passes over the cone at mid-flight and reaches toward the landing spot.

| Phase id | Label | Time (s) | What happens |
|---|---|---|---|
| setup | Balance on one leg | 0.0-0.8 | Stand tall on the right leg (knee about 22 degrees), sink into the stick |
| hop1 | Hop out over cone 1 | 0.8-2.2 | Load, push off, hop to z = -35, land, stick |
| hop2 | Hop out over cone 2 | 2.2-3.6 | Same, to z = 0 |
| hop3 | Hop out over cone 3 | 3.6-5.0 | Same, to z = 35 |
| hop4 | Hop out over cone 4, stick | 5.0-6.8 | Same, to z = 70, plus a 0.4 s longer stick before changing direction |
| hop5-hop8 | Hop back over cone 4 to 1 | 6.8-12.4 | Four hops back down the line on the same foot, to z = -70 |
| reset | Stand tall and reset | 12.4-13.2 | Rise back to the setup pose (first and last frames are the same pose, so the loop is seamless) |

Each hop (1.4 s): load 0.20 s, push 0.14 s to toe-off, 0.30 s flight, 0.07 s ball-to-heel landing, absorb to peak knee flexion by 0.88 s, stick held about 0.5 s (0.9 s at the turn). All phases use natural breathing (research: breathe out lightly on take-off or landing, quick breath in the stick).

**Key angles vs research.**

| Measure | Animation | Research |
|---|---|---|
| Knee flexion at initial contact | 32 degrees (all 8 landings) | about 30-37 degrees (Markström 2020: controls 30, ACLR 37) |
| Peak knee flexion on landing | 60 degrees (59.9-60.1) | about 59-63 degrees (Markström 2020) |
| Knee at take-off | 12 degrees | not reported |
| Knee in the stick / balancing | 50 / 22 degrees | soft knee |
| Hip flexion at peak landing | about 57 degrees, trunk about 18 degrees from vertical | more hip and trunk flexion in ACLR limbs; no norm for controls |
| Ankle dorsiflexion at peak landing | about 27 degrees (limit 35) | not reported |
| Pelvis rise in flight | about 9 cm above toe-off, apex about 104 cm | "just high enough to clear the cone" |
| Foot clearance over a cone | at least 5.8 cm (foot ellipsoid vs cone surface) | just enough to clear |
| Cone spacing / height | 35 cm / 15 cm | 30-40 cm side hop lines; about 15 cm cones |
| Lateral travel per pass | 140 cm (4 x 35 cm) | four hops |

**Muscles** (rig ids only). Target: calves_r, quads_r, glute_max_r. Synergists: hamstrings_r, adductors_r. Stabilizers: glute_med_r, core, obliques_r, obliques_l, hamstrings_l and hip_flexors_l (holding the free leg up). The six hopping-leg curves are generated in the author script in sync with the hop phases (calves peak at toe-off, quads at the bottom of the landing, low in flight); the trunk and free-leg curves are in the meta file. All illustrative, not EMG. Tibialis anterior and the peroneals (measured by Suwanmana 2026 and Webster 2016) have no rig region; this is noted in `muscleNotes.calves_r`.

**Checks.** `plantedContacts: [leg_r]`, peak `rootTravel` 120-165 cm (4 hops at the 30-40 cm research spacing plus the small pelvis offsets), floor tolerance 0.5 cm. No still joints (the whole body travels). `kneeFlexion` was not used as the measure because verify takes the larger of both knees, and the bent free knee (about 95 degrees) would always be the peak. Instead the author script fails if any touch-down knee is outside 27-40 degrees, any landing peak is outside 55-66 degrees, the hopping foot comes within 1 cm of a cone surface, or the free foot passes over a cone.

## Decisions on uncertain points

1. **Cone spacing and height.** reference.md gave no numbers; videos.md suggested 45-60 cm (labelled as inference), research.md anchors 30-40 cm to the side hop test lines and about 15 cm cones. Followed research.md and the issue context: 35 cm apart, 15 cm tall, landing midway between cones.
2. **Stick vs continuous.** GymVisual says "sticking briefly"; coach videos stick 1-2 s. Animated a brief stick (about 0.5 s held after the landing, about 1.1 s total ground contact per hop) to keep the loop readable; the prescription and the "Stick" kinematics row give the 1-2 s practice value.
3. **Return direction.** Out over all four cones, then back over them on the same leg (Next Level Rochester, Live Lean TV), with a slightly longer stick at the far end. Legs switch after the set; the player's side switch shows the left leg (authoredSide "right", two GLB clips).
4. **Free leg.** Knee bent with the foot behind the support leg (GymVisual "behind/beside", Live Lean TV "behind"). Behind was chosen because it also keeps the free foot clear of the cones when hopping toward the free-leg side.
5. **Ball-first landing.** Research cue "land on the ball of the foot, then let the heel settle" is shown with a 20 degree heel-up touch-down and a 0.07 s heel settle before the contact plants.
6. **Phase labels are side-neutral** ("Hop out", "Hop back", "Hopping foot path") because the player does not relabel phases when the side switch mirrors the exercise.

## Verify results

`node build/author-four-cone-single-foot-lateral-hops.js && node build/validate.js && node build/assemble.js && node build/export-gltf.mjs && node test/verify.mjs`:

```
valid   four-cone-single-foot-lateral-hops.json
PASS  four-cone-single-foot-lateral-hops: validates against schema
PASS  four-cone-single-foot-lateral-hops: planted contacts (leg_r) do not slide (max 0.000 cm)
PASS  four-cone-single-foot-lateral-hops: nothing below the floor (lowest -0.26 cm)
PASS  four-cone-single-foot-lateral-hops: peak rootTravel 140.1 (expected 120–165)
PASS  four-cone-single-foot-lateral-hops: contact-driven legs within knee/ankle limits
PASS  four-cone-single-foot-lateral-hops: has safety notes
PASS  four-cone-single-foot-lateral-hops: joint limits respected
PASS  four-cone-single-foot-lateral-hops: exports/four-cone-single-foot-lateral-hops.glb present
PASS  player loads all exercises: Kneeling Back Rotation Stretch | Quadruped Thoracic Rotation | 4 Cone Single Foot Lateral Hops
PASS  1.5× speed plays at 1.64× wall-clock
PASS  no page errors
```

The two existing exercises still pass all their checks. Author self-check: `coneClearance 5.8 cm, free foot never over a cone, floor -0.26 cm, stance knee 22-60 degrees, travel 140.1 cm`, touch-down knees 32.0-32.1, landing peaks 59.9-60.1. GLB: 24 joints, clips `four-cone-single-foot-lateral-hops_right` and `_left` (397 keys at 30 fps), cones included.

Note: one earlier verify run on a heavily loaded machine (load average 5 on 2 cores, other agents running Chrome) reported the 1.5x speed check at 1.26x; reruns pass. That check is sensitive to CPU load, not to this module.

## Screenshots checked

Player index 2, `node test/shots.mjs 2 ...`:

- threeQuarter, dark: setup and first hop sequence 0.2, 0.8, 1.08, 1.14, 1.3, 1.46, 1.6, 1.9; far end and turn 5.3, 5.5, 6.2, 7.14; reset 12.0, 12.6, 13.1; left side at 1.29 (mirrored leg and cones).
- front, dark: 0.8, 1.14, 1.3, 1.6 (outward hop: toe-off with the foot medial to the pelvis, foot over cone 1, landing between cones 1 and 2) and 8.4-9.1 (return hop toward the free-leg side: load, toe-off, lift, clear, reach, touch).
- side, dark: 0.2, 0.8, 1.04-1.51, 1.68, 2.2 (trunk lean, free foot behind, knee bend through the landing).
- back, dark: 1.29, 5.5. top, dark: 0.8, 1.29, 4.13, 9.68 (foot passes over the cone line, lands between cones).

Fixed along the way: pelvis solve diverging at toe-off (better initial guess from the hip-ankle distance); the foot drifting during the IK-to-FK weight blend while the pelvis moved (hand-over on identical poses, then FK heel roll); straight knee just after toe-off and before touch-down (foot carried higher in flight, flight shortened to 0.30 s); forearms crossing in front of the hips (more external shoulder rotation); camera presets moved (3/4 yaw 68, back yaw -100) so the far end of the line stays in frame.

## Known limitations

- Muscle activation is illustrative, not EMG.
- The rig knee is a hinge and the ankle has dorsiflexion only, so knee valgus control and ankle inversion/eversion (the main ankle load in the research) are not shown.
- The free leg is held in one position (small changes only); no arm swing beyond small preset changes.
- At the flight apex at either end of the line, the top of the head touches the frame edge in the 3/4 and back presets (player auto-framing uses 0.82 x the bounding radius).
- Cone clearance is checked only by the author script; verify.mjs has no prop collision check.
- The module is about 277 KB pretty-printed (114 complete poses).
- GLB is baked at 30 fps, so each 0.30 s flight has about 9 samples.

## Needs from platform

1. **kneeFlexion measure for single-leg drills.** `verify.mjs` takes the larger of the two knees, so a bent free leg always wins. Suggest `measure.side` (`"r"`, `"l"` or `"both"`) or a weight-bearing filter, so peak landing knee flexion (59-63 degrees here) can be a real check.
2. **Phase timing measures.** A check for knee flexion at a given time or phase (for example at each `*_touch` key) would let verify test the initial-contact norm (30-37 degrees) instead of the author script.
3. **Side-aware labels.** The player keeps "right" in phase labels and guide labels when the side switch mirrors the exercise; labels here were made neutral as a workaround.
4. **Prop collision check.** A generic foot-vs-prop clearance check in verify (cones, hurdles, boxes) would cover the hop drills.
5. **Optional lib helpers.** `fitLeg`, the centre-of-mass function and the planted-to-FK hand-over pattern in the author script would suit other single-leg hop and jump drills if moved into `build/lib.js`.
