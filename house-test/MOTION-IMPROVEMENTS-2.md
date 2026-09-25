# Second house 3D review — September 25, 2026

These are additional changes after the [first 21 improvements](MOTION-IMPROVEMENTS.md).
GPT-6 Sol specialists implemented the creature, furniture and world changes;
the integrated result was reviewed separately.

## Creatures and petpets

1. **Turn in place:** feet step and plant while the body turns, rather than
   sweeping both paws across the floor with the rotating model.
2. **Sideways steps:** foot travel follows lateral movement instead of stepping
   forward while the creature slides sideways. Planted paws stay on the floor.
3. **Cat limb attachment:** upper legs blend into the shoulders and hips while
   paws move, removing the gaps made by rigid, translating limb capsules.
4. **Snail locomotion:** the snail has a continuous gliding sole and no pumping
   arms or alternating biped feet.
5. **Petpet airborne support:** the small follower tucks its paws and hides its
   contact shadow on its own delayed jump, including a flier's delayed descent.
6. **Petpet walking cadence:** the follower animates from its own movement, so
   it keeps stepping while catching up after its owner stops or turns.
7. **Activity poses stay in control:** idle sniffing, looking around, hopping
   and sleep behavior no longer interrupt a seated or riding interaction.

## Furniture and vehicles

8. **Rocking-chair mounting:** the pet rises beside the seat before moving
   across it, replacing an instantaneous jump to the chair.
9. **Rocking-chair dismount:** getting off returns the pet toward the floor
   rather than leaving it standing on the seat.
10. **Fridge-door collisions:** collision bounds follow the opening doors and
    remain in the walking world's spatial index; closing pauses against the pet.
11. **Car collision orientation:** the footprint now turns in the same direction
    as the rendered car, so clearance checks match its visible corners.
12. **Driver alignment:** the seated pet and exit-side calculations follow the
    car's transform instead of swinging opposite the body during turns.
13. **Piano exit:** the pet leaves from the visible cushion height and clears
    its edge before descending, rather than teleporting through it.
14. **Bed waking:** the pet leaves the mattress before descending along a safe
    return path. A new activity, movement or room change cancels that transition.

## Moving through the house

15. **Companion furniture hops:** cats and family pets rise clear of furniture
    before crossing its edge, and check the landing before dismounting.
16. **Trips through view:** a companion walks when the middle of its trip is
    visible, even if both its starting point and destination are hidden.
17. **Floor finish boundaries:** ground-height samples stay close to the actual
    paw position, avoiding stale rug/tile offsets inherited across a large cell.
18. **Names behind walls:** nearby walls can hide companion name and emote
    markers even when the wall is close to the pet, preventing labels through it.
19. **Complete ball rollout:** the after-play ball reaches the end of its roll
    before the chase, rather than freezing halfway through the animation.
20. **Clear swing views:** each swing is viewed from the opposite side, keeping
    the rider clear of the nearby tree and frame through its motion.

## Verification

All 13 focused Node suites passed. The combined browser walkthrough reported
zero JavaScript errors and confirmed floor landings after rocker and bed exits
and a stable seated piano pose. A separate frame-by-frame jump check recorded
21 owner-airborne frames and 30 follower-airborne frames, including the follower
landing after its owner.

Focused regressions cover planted paws, limb attachment, snail motion,
independent follower timing, ride behavior, furniture clearance and cancellation,
fridge collision indexing, vehicle transforms, companion routes, ground samples,
wall visibility, ball rollout and camera clearance. Browser checks use a
synthetic save and retain private screenshots and movement measurements outside
the repository. Tests, cache versions and documentation are excluded from the
improvement count.

The tight kitchen camera remains a limitation. A proposed adjustment increased
camera distance but still hid the pet in the rendered view, so it was rejected
and is not included in this pass.
