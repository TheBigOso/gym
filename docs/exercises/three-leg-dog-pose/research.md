# 3 Leg Dog Pose: research

Exercise: plank to downward-facing dog (Adho Mukha Svanasana), then one leg raised up and back (three-legged dog, also called one-legged or Eka Pada downward dog), then back through dog to plank. GymVisual reference #588713 (see `reference.md`). Researched 2026-11-26.

Evidence tags: **[trial evidence]** = measured in a study (lab, controlled trial or review). **[clinical opinion]** = teacher, clinician or professional-body guidance, not tested. **[estimate]** = our own reasoning for the rig, built from the sources named next to it.

**Where evidence is thin (read this first):**

- No study found measures the three-legged variation itself. Everything about the lifted leg is clinical opinion or our estimate.
- No study found reports shoulder, elbow or wrist loads or upper-body EMG for downward dog. The one dog study with EMG and joint moments (Salem 2013) measured the lower body only, and it used a wall-supported dog in older adults.
- The joint-angle studies use small samples (10 to 26 people) and different angle conventions, so their numbers do not line up neatly.
- PubMed and PMC pages blocked our fetcher, and the web-search budget ran out partway through. Some papers below were verified only through their Crossref or Semantic Scholar record, and that is stated on each line.

## Exercise card

| Field | Value |
|---|---|
| Type | Stretching / dynamic mobility with isometric upper-body support (GymVisual data sheet: Stretching) |
| Body part | Posterior chain: hamstrings and calves (standing leg); secondary: shoulders, glutes (lifted leg), core |
| Equipment | Body weight; exercise mat (optional) |
| Difficulty | Beginner to intermediate: the dog is a beginner pose; the single-leg hold adds balance and shoulder load [clinical opinion] |
| Mechanics | Compound (closed chain through hands and feet) |
| Plane | Sagittal |
| Laterality | Bilateral dog, then unilateral leg lift (alternate sides). Authored side: right leg lifts, left leg stands |

### Muscles

Rig ids are from `src/rig.json` (`_r` = right, lifted leg; `_l` = left, standing leg).

| Role | Muscles (rig id) | Basis |
|---|---|---|
| Target (lengthened, standing leg) | Hamstrings (`hamstrings_l`), calves (`calves_l`) | Yoga Journal and Cleveland Clinic list hamstrings and calves as the main stretch [clinical opinion]; Mullerpatan 2019 says the dorsiflexed ankle stretches gastrocnemius and soleus [trial evidence for the angle, clinical opinion for the stretch] |
| Target (working, lifted leg) | Gluteus maximus (`glute_max_r`), hamstrings (`hamstrings_r`) | Hip extension lifts the leg; no EMG study of the lifted leg found [clinical opinion] |
| Synergist | Anterior deltoid (`ant_deltoid_r`, `ant_deltoid_l`), triceps (`triceps_r`, `triceps_l`), quadriceps (`quads_l`) | Yoga Journal (Ray Long's anatomy notes) names triceps on straight elbows and quadriceps; Cleveland Clinic names shoulders and triceps [clinical opinion]. No upper-body EMG found |
| Stabilizer | Serratus anterior (`serratus_r`, `serratus_l`), core (`core`), spinal extensors (`spinal_extensors_r`, `spinal_extensors_l`), gluteus medius (`glute_med_l`) | Salem 2013 (wall dog, older adults): erector spinae about 71% and rectus abdominis about 58% of walking peak EMG; gluteus medius about 11% [trial evidence, label mapping in the figure is uncertain]. Serratus role is clinical opinion ("push the floor away") |
| Lengthened (secondary) | Latissimus dorsi (`lats_r`, `lats_l`), hip flexors of the lifted leg (`hip_flexors_r`) only if the leg rises above trunk line | Arms overhead lengthen the lats [estimate]; Yoga Journal lists the whole back body as stretched [clinical opinion] |

Lower-body EMG from Salem 2013 (wall-supported dog, normalised to walking, not to maximum effort): hamstrings about 50%, quadriceps about 23%, gastrocnemius about 22% [trial evidence]. The authors concluded these poses are unlikely to train the ankle dorsiflexors [trial evidence].

### Angle norms

| Measure | Reported values | Suggested rig target | Sources |
|---|---|---|---|
| Hip flexion, dog (trunk to thigh) | About 83° in a wall-supported dog in older adults (figure labels uncertain) [trial evidence]; 49° (SD 26°) and 67° (SD 13°) for the two Parvatasana poses in trained practitioners, with ranges up to about 92 to 95° [trial evidence; table is partly garbled in the source]. AAOS reference maximum 120° | About 80 to 90° [estimate]. Bend the knees in a beginner variant, which lets the pelvis tilt further | Salem 2013, Mullerpatan 2019, Physiopedia ROM |
| Shoulder flexion, dog (arm overhead relative to trunk) | Mullerpatan 2019 reports shoulder values for Parvatasana, but its convention ("overhead extension" up to 183°) does not map cleanly to anatomical flexion, so we do not use it. AAOS reference maximum 180° | About 160 to 175°, arms in line with the trunk, head between the upper arms [estimate built on the Yoga Journal cue] | Mullerpatan 2019, Physiopedia ROM, Yoga Journal |
| Ankle dorsiflexion, dog (standing leg) | Peak 30.5° (SD 11.4°) in Parvatasana, closed chain [trial evidence]; about 13° in the wall-supported version (label uncertain) [trial evidence]. AAOS reference 20° (non-weight-bearing) | About 20 to 25°, heels slightly off the floor. Note: the rig ankle limit is 25° dorsiflexion, below the 30° peak reported | Mullerpatan 2019, Salem 2013, Physiopedia ROM |
| Lifted-leg hip extension (three-legged dog) | No measured value found. The leg travels from the dog's hip flexion (about 80 to 90°) toward neutral. AAOS reference hip extension is only 20°, so a leg raised high above trunk line has to come from the pelvis opening, which breaks "hips square" | Hip near 0° (leg in line with the trunk), at most about 10 to 20° past it with the pelvis level [estimate]. Rig hip limit is -20° | Physiopedia ROM; Cleveland Clinic (lift toward the ceiling) [clinical opinion] |
| Knee, standing leg | 2.5° (SD 5.7°) flexion in the later Parvatasana pose [trial evidence] | 0 to 10° flexion (soft knee); 20 to 30° for a bent-knee variant [estimate] | Mullerpatan 2019, Yoga Journal |
| Elbow | Mullerpatan table lists about 22 to 27° for Parvatasana, convention unclear [trial evidence, low confidence] | 0 to 10° (straight, not locked) [clinical opinion: Yoga Journal flags elbow hyperextension] | Mullerpatan 2019, Yoga Journal |

Training effect on angles: in 26 male college athletes, a 10-week yoga group showed larger right hip and right knee angles in downward dog than controls (P = 0.01 each), plus better sit-and-reach and shoulder flexibility [trial evidence; small sample, abstract only read].

### Breathing

- Exhale as the hips lift up and back from plank into dog (Yoga Journal pose page and the Lasater archive both enter dog on an exhale) [clinical opinion].
- Inhale as the right leg lifts up and back [clinical opinion, common yoga convention; no source fetched states it for this variation].
- Breathe slowly and evenly in the hold; Yoga Journal (Lasater) asks for slow, even breath and a relaxed neck [clinical opinion].
- Exhale as the leg lowers; inhale as you shift forward to plank [estimate].
- Suggested cadence for the animation: about 2 s plank to dog, 2 s leg up, 3 to 4 s hold (1 to 2 breaths), 2 s leg down, 2 s back to plank [estimate].

### Prescription

- Dog hold: 10 to 15 s, breathing throughout (Cleveland Clinic) [clinical opinion]; "several breaths", building up over time (Yoga Journal, Lasater) [clinical opinion]; 8 to 20 breaths for a fully supported restorative dog (Yoga International) [clinical opinion].
- Three-legged hold: no source gives a number; Cleveland Clinic says hold as long as is comfortable [clinical opinion]. Suggested: 3 to 5 breaths (about 15 to 25 s) per side [estimate].
- Flow version (as in the reference GIF): 4 to 6 reps per side, 1 to 2 breath pause at the top [estimate].
- Sets: 1 to 3 rounds per side, as a warm-up or in a mobility session [estimate].
- Frequency: daily or as a warm-up is plausible; flexibility trials used yoga 1 to 2 times a week for 8 to 20 weeks (Polsgrove 2016, Raj 2021, Grabara 2015) [trial evidence for those schedules, not for this pose alone].

### Cues (5 to 7)

1. **Setup (plank):** Hands shoulder-width, fingers spread; press through the index finger and thumb, not the heel of the hand (Yoga Journal, Rachel Land; Cleveland Clinic) [clinical opinion].
2. **Into dog:** On an exhale, lift the hips up and back into an inverted V; lift from the hips rather than shoving with the arms (Yoga Journal) [clinical opinion].
3. **Arms and head:** Push the floor away; head relaxed between the upper arms (Yoga Journal; Cleveland Clinic) [clinical opinion].
4. **Spine first:** Keep the back long; bend the knees if the back rounds (Cleveland Clinic; Yoga Journal, Motz) [clinical opinion].
5. **Heels:** Reach the heels toward the floor; they do not need to touch (Cleveland Clinic; Yoga Journal) [clinical opinion].
6. **Three-legged:** Inhale and lift the right leg up and back, in line with the trunk, hips level and square to the floor (Cleveland Clinic for the lift; hips square from the reference description) [clinical opinion].
7. **Return:** Exhale, lower the foot beside the other, then shift forward through dog to plank and switch sides [estimate].

### Common mistakes and fixes

| Mistake | Fix | Basis |
|---|---|---|
| Rounded back, often from tight hamstrings or shoulders | Bend the knees and send the hips up and back until the spine is long | Cleveland Clinic; Yoga Journal [clinical opinion] |
| Hands and feet too close together (or feet set too wide) | Adjust the hand-to-foot distance until the spine can lengthen; feet about hip-width | Yoga Journal (Lasater); Cleveland Clinic [clinical opinion] |
| Weight sinking into the heel of the hand or outer wrist | Press the index finger and thumb down so the palm arches; spreads load off the carpal tunnel | Yoga Journal (Rachel Land) [clinical opinion] |
| Shoulders collapsing or elbows hyperextending (common in very flexible people) | Push the floor away and keep a micro-bend in the elbows | Yoga Journal [clinical opinion] |
| Lifted hip opening or leg cranked too high | Lower the leg until the hips are level; aim for the leg in line with the trunk | Our estimate from AAOS hip-extension norm of 20° (Physiopedia ROM) |
| Forcing the heels to the floor | Let the heels lift or support them on a rolled towel or mat | Yoga Journal (Motz); Fitness Volt [clinical opinion] |
| Lifting the head or tensing the neck | Let the head hang between the arms, neck long | Yoga Journal (Lasater) [clinical opinion] |

### Safety and who should modify

- **Wrist, shoulder or ankle injury:** Yoga Journal advises avoiding the pose [clinical opinion]. Modify with a rolled towel under the heels of the hands (Cleveland Clinic), one forearm down (Yoga Journal, Motz), or hands on a wall or desk [clinical opinion].
- **High blood pressure, glaucoma, heart problems, dizziness or fainting:** check with a clinician or instructor first; the head is below the heart (Cleveland Clinic) [clinical opinion]. Sources disagree: the Yoga Journal pose page says avoid with high blood pressure, while the 1986 Lasater piece offers dog as an alternative to headstand for such students. Treat as "check first".
- **Tight hamstrings, calves or low back pain:** bent-knee dog or heels-against-wall version (Yoga Journal) [clinical opinion].
- **Balance or shoulder fatigue in the leg lift:** keep both feet down, or lift the leg only a few centimetres [estimate].
- **General:** warm up first, work within your limits and stop with pain (AAOS OrthoInfo) [clinical opinion]. A meta-analysis of randomised trials found yoga's adverse-event rate no different from usual care or exercise [trial evidence], but it does not single out this pose.
- **Not researched here:** pregnancy, osteoporosis and post-surgical cases; no verified source was read for these.

## 1. Scientific studies

- [Salem et al. 2013, Physical demand profiles of hatha yoga postures performed by older adults (Evid Based Complement Alternat Med)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3814077/). Lab study; includes a wall-supported downward dog: about 83° hip flexion, lower-body joint moments and EMG (lower body only). PMC blocked our fetcher; figures read from the copy on the next line.
- [Salem et al. 2013, open-access text (SlideShare copy, DOI 10.1155/2013/165763)](https://www.slideshare.net/slideshow/yoga-57793204/57793204). Source of the EMG (as percent of walking) and joint-moment figures quoted above.
- [Mullerpatan et al. 2019, Kinematics of Suryanamaskar using 3D motion capture (Int J Yoga, DOI 10.4103/ijoy.IJOY_26_18)](https://rcastoragev2.blob.core.windows.net/5454d7121b1d4dc732973d81227041c7/PMC6521759.pdf). 10 trained practitioners; ankle peaks at 30.5° dorsiflexion in Parvatasana (downward dog); hip and shoulder table partly garbled.
- [Polsgrove et al. 2016, Impact of 10 weeks of yoga on flexibility and balance of college athletes (Int J Yoga)](https://doi.org/10.4103/0973-6131.171710). 26 athletes; yoga group improved sit-and-reach and shoulder flexibility, and had larger hip and knee angles in downward dog. Verified via Crossref and Semantic Scholar records; abstract only.
- [Raj et al. 2021, Hamstring flexibility and sprint speed after 8 weeks of yoga in rugby players (Int J Yoga, DOAJ)](https://doaj.org/article/66448b3e18e64ab896c4e5780cdd1bee). Controlled trial, n = 31; yoga kept hamstring flexibility steady in season while controls lost about 15%. Poses not listed in the abstract.
- [Grabara and Szopa 2015, Hatha yoga and spine flexibility in women over 50 (J Phys Ther Sci)](https://doi.org/10.1589/jpts.27.361). 56 women, 20 weeks; spinal mobility and hamstring flexibility improved. Specific poses not named in the abstract. Verified via Crossref.
- [Kelley et al. 2018, An electromyographic analysis of selected asana in experienced yogic practitioners (J Bodyw Mov Ther)](https://doi.org/10.1016/j.jbmt.2017.05.018). 13 practitioners, five lower-limb muscles; includes downward dog per Liu 2021. Full results not read (paywalled); best lead for lower-limb EMG.
- [Mears et al. 2019, Ankle motion in common yoga poses (The Foot)](https://doi.org/10.1016/j.foot.2019.02.001). 20 practitioners, seven poses; ankle load highest in single-leg poses. Whether downward dog is one of the seven was not confirmed.
- [Liu et al. 2021, Lower-limb biomechanics of standing yoga (IJERPH)](https://www.mdpi.com/1660-4601/18/16/8402). Not a dog study; useful for its reference list (Kelley 2018, Mears 2019, yoga injury papers).
- [Cramer et al. 2015, The safety of yoga: systematic review and meta-analysis of RCTs (Am J Epidemiol)](https://academic.oup.com/aje/article-abstract/182/4/281/113378). Adverse events with yoga no different from usual care or exercise.
- [Amin and Goodman 2014, Selected Iyengar asanas and flexibility: pilot study (J Bodyw Mov Ther)](https://doi.org/10.1016/j.jbmt.2013.11.008). Verified via Crossref; abstract not accessible, so whether it used downward dog is unknown.
- [Tracy and Hart 2013, Bikram yoga training and physical fitness in healthy young adults (J Strength Cond Res)](https://doi.org/10.1519/JSC.0b013e31825c340f). Verified via Crossref; abstract not accessible, results not read.

## 2. Clinical and professional articles

- [Yoga Journal, Downward-Facing Dog pose page](https://www.yogajournal.com/poses/downward-facing-dog/). Alignment cues, Ray Long anatomy notes, bent-knee and wall variations; avoid with wrist, shoulder, ankle injury or high blood pressure.
- [Yoga Journal, Rachel Land: the one cue that can transform your downward dog](https://www.yogajournal.com/practice/beginners/the-one-cue-that-can-transform-your-downward-facing-dog/?scope=anon). Press through index finger and thumb to unload the carpal tunnel.
- [Yoga Journal archive, Judith Hanson Lasater (1986): Down Dog](https://www.yogajournal.com/practice/down-dog-adho-mukha-svanasana/?scope=anon). Entry on an exhale, hold several breaths, hand-foot distance and neck mistakes.
- [Yoga Journal, Erin Motz: 3 ways to make downward dog feel better](https://www.yogajournal.com/poses/3-ways-make-downward-facing-dog-feel-better-for-you/?scope=anon). Bent knees, heels supported, one forearm down.
- [Yoga International, Old dog, new tricks: two variations on downward dog](https://yogainternational.com/article/view/old-dog-new-tricks-two-variations-on-downward-facing-dog). Strap-supported and restorative dog; hold 8 to 20 breaths. No three-legged content.
- [Cleveland Clinic, Downward dog (Adho Mukha Svanasana)](https://health.clevelandclinic.org/downward-dog-adho-mukha-svanasana). Cues, mistakes, 10 to 15 s holds, cautions (blood pressure, glaucoma, heart, dizziness), and a single-leg lift variation.
- [AAOS OrthoInfo, Yoga injury prevention](https://www.orthoinfo.org/staying-healthy/fitness--exercise/yoga-injury-prevention). General guidance: warm up, know your limits, tell the instructor about injuries.
- [Physiopedia, Range of motion normative values](https://www.physio-pedia.com/Range_of_Motion_Normative_Values). AAOS reference values: shoulder flexion 180°, hip flexion 120°, hip extension 20°, ankle dorsiflexion 20°.
- [Physiopedia, Yoga](https://www.physio-pedia.com/Yoga). Overview only; no downward dog specifics, cites Cramer 2015.
- [Wikipedia, Downward Dog Pose](https://en.wikipedia.org/wiki/Downward_Dog_Pose). Describes the single-leg raise and other variations; lists Yoga Journal and Yoga International sources.
- [Fitness Volt, Downward-facing dog](https://fitnessvolt.com/downward-facing-dog/). Low-authority fitness site; muscles list, mistakes (forcing heels down, tucked tailbone), mentions three-legged dog.
- ACE: no ACE page on downward dog or three-legged dog could be found or verified in this pass.
