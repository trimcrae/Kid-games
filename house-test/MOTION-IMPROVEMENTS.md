# House 3D motion review — September 25, 2026

This pass focuses on how creatures look and move through the house. The earlier
menu, keyboard and mobile HUD fixes are excluded. Three GPT-6 Sol specialists
implemented the creature, furniture and world changes, with integration review.

## Creatures

1. **Planted walking feet:** step timing follows signed world displacement and
   model scale, reducing skating in forward and reverse movement.
2. **Four-paw cat gait:** front and rear paws take diagonal steps with lifted
   recovery arcs, instead of swinging the front legs in place.
3. **Jump and landing posture:** paws tuck during physical airborne movement,
   expressive hops lift the feet with the body, and landings compress the body.
   The root-bound contact shadow disappears in the air.
4. **Coherent hovering creatures:** glimmr feet tuck into the floating body;
   shaped wing lobes and animated wingbeats make the flying silhouette clearer.
5. **Grounded resting poses:** sitting, stretching and sleeping adjust the limbs
   as well as the torso; sleeping pets curl down onto the mattress.
6. **Distinct petpet anatomy:** species features replace the shared generic
   silhouette, including bills, webbed feet, shells, feelers, spines and wings.
7. **Petpet following through turns:** the companion follows a delayed heel
   path instead of instantly orbiting with its owner's rotation. Room changes
   reset that trail immediately. Cat whiskers are an additional visual detail.

## Furniture and moving objects

8. **Swing mounting:** the pet moves onto the seat over time instead of snapping.
9. **Swing coast:** the abandoned seat continues its pendulum motion and settles.
10. **Piano seating:** the pet approaches and sits on the actual piano cushion.
11. **Car pitch:** front and rear ground support tilt the car over changes in slope.
12. **Bed climbing:** pets rise above the mattress before crossing its edge;
    reaching the upper bunk goes around the open side.
13. **Monkey-bar release:** horizontal swing momentum carries into the fall,
    instead of relocating the pet sideways in one frame; landing clears it.
14. **Roomba clearance:** the moving vacuum checks its bumper footprint and
    avoids the pet, rather than testing only its center.
15. **Swing dismount:** exiting starts a real fall and lands the pet on the lawn,
    fixing a pet suspended above the ground.
16. **Swing view:** the activity camera keeps the moving pet visible instead of
    looking through the nearby tree trunks.

## Camera and movement through rooms

17. **Stopped-turn camera recovery:** obstruction preview expires when turning
    stops or reverses, allowing the camera to recover its distance.
18. **Smooth camera clearance:** the clearance boundary is refined between
    samples, reducing abrupt distance changes beside obstacles.
19. **Correct stair support:** seam tolerance can bridge a same-level floor gap
    without raising the pet onto the next tread before its center reaches it.
20. **Continuous ledge departure:** a wall slide finishes before a fall starts,
    removing the sideways position jump at a ledge.
21. **Visible companion arrivals:** companions walk when their destination is
    visible, even if they start outside the visible area.
22. **Companion obstacle recovery:** companions try a short clear side route,
    rest if blocked, and resume when the way clears instead of marching in place.

## Verification

Focused movement regressions cover planted feet, airborne and resting poses,
bed entry, release momentum, bumper clearance, camera recovery, stair support
and companion routing. Browser checks exercise the rendered house and moving
activities using a synthetic save. Private before/after frames and measurements
are retained outside the repository; no family save or reference photo is used.

Cache revision updates ensure that the changed modules load together. Tests,
documentation and cache updates are not counted as additional improvements.
