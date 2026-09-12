# Nanny's house-color tour — evidence

Research and visual checks: September 12, 2026, approximately 12:18–12:27 America/New_York.
This page is a separate static route on the existing GitHub Pages site; the repository's explicit main/push deployment instruction takes precedence over the Sites default hosting workflow. No new hosted project or dependencies were created.

## Confirmed scope

- Reference: Sherwin-Williams Smoky Azurite SW 9148 (user spelled it Smokey).
- Start/end: Renaissance Academy Charter School of the Arts, 299 Kirk Road, Rochester, NY 14612. School identity and address verified in Google Maps.
- Three visually inspected blue house exteriors in Greece, with exact address references, panorama links and capture dates. Paint suggestions are estimates of a similar appearance, never claims about the finish used.

## House observations

1. **26 Picturesque Drive, Rochester, NY 14616**. Google address pin 43.2476142,-77.6624201. Panorama `0ybSiZEOktnT6EzIbijJpQ`, July 2025, camera 43.2478795,-77.6623822, heading 186.47214. Muted blue colonial, white shutters, brown roof, attached right garage. Google panorama title is 27 Picturesque (camera-side label); facade corroborated against [Howard Hanna](https://www.howardhanna.com/property/26-picturesque-drive-rochester-ny-14616-360004264825). Suggested Smoky Azurite / Favorite Jeans.
2. **466 Mt Ridge Circle, Rochester, NY 14616**. Google address pin 43.2100399,-77.6561453. Panorama `3WU3OzZ_Tip2nocI8YJ7YA`, June 2021, camera 43.2102659,-77.6560764, heading 193.08311. Blue ranch, light trim, left garage. Right of panorama is blurred; visible central facade supports color assessment. Older imagery explicitly flagged. [Address reference](https://www.movoto.com/greece-ny/466-mount-ridge-cir-greece-ny-14616-486_r321376_1/). Suggested Favorite Jeans / Blustery Sky.
3. **1050 Latta Road, Rochester, NY 14612**. Google address pin 43.2532295,-77.6395821. Panorama `blcVAbEFz4rLGV6UdaYdXQ`, July 2025, camera 43.2529562,-77.6396313, heading 6.7130017. Stronger denim-blue two-story facade, white trim, blue garage at left. Tree cover upper story. Google panorama title 1055 is across-street camera label. Address located between 1060 and 1040 and individually verified in Maps, also [Redfin](https://www.redfin.com/NY/Rochester/1050-Latta-Rd-14612/home/79313684). Suggested Smoky Azurite / Smoky Blue.

Rejected candidates: 128 Ridgecrest Road looks very pale/near white in August 2025 imagery, despite blue-looking older listing image. 1060 Latta and 124 Sweet Birch Lane have more heavily screened views. They are not included as tour stops.

## Route verification

Opened the three-waypoint Google Maps driving link, verified all five address fields, then opened Details. On September 12, 2026 at approximately 12:25 EDT it showed **27 minutes, 11.1 miles**, school → Picturesque → Mt Ridge → Latta → school.

- School to Picturesque: 5 minutes, 1.8 miles, Taybrook/Kirk/Latta/Picturesque/Nurmi.
- Picturesque to Mt Ridge: 7 minutes, 3.0 miles, Marie Elaina/Mt Read/Medimount/Mt Ridge.
- Mt Ridge to Latta: 9 minutes, 3.8 miles, Mt Ridge/Kohl/Stone/Dewey/Latta.
- Return: 6 minutes, 2.6 miles, Latta/Kirk/Taybrook.

Google rounds leg figures independently, so their sum can differ from the displayed total. Site uses about 30 minutes driving and 45–60 minutes with viewing as a planning allowance. No claim of globally optimal waypoint ordering. Full route and separate per-leg links are provided.

## Swatch sources

- [Smoky Azurite official color](https://www.sherwin-williams.com/sherwinwilliams/SW9148-smoky-azurite), official HEX 708D9E (RGB 112/141/158).
- [Favorite Jeans SW 9147](https://www.sherwin-williams.com/sherwinwilliams/SW9147-favorite-jeans), official HEX 8AA3B1.
- [Blustery Sky SW 9140](https://www.sherwin-williams.com/sherwinwilliams/SW9140-blustery-sky), official HEX 6F848C.
- [Smoky Blue SW 7604](https://www.sherwin-williams.com/en-us/color/color-family/neutral-paint-colors/SW7604-smoky-blue), official [RGB table](https://images.sherwin-williams.com/content_images/sw-pdf-sherwin-williams-color.pdf) 94/113/125 (#5E717D).

House thumbnails are loaded from the Google thumbnail URLs exposed in the inspected panorama URLs. No images were downloaded into the repository. Original Google watermarks remain; captions link to Street View and state capture dates and Google attribution. Failures show a descriptive link fallback.

## Page verification

- Local HTTP server returned 200 for `/nanny/`; `node --check nanny/tour.js` passed.
- Desktop browser: all three Google thumbnails loaded; each rendered with original 3:2 proportions. No horizontal overflow. No browser console warnings or errors.
- 390-pixel phone viewport: two-column sample palette remained readable with no horizontal overflow. Anchor navigation from house swatches to palette worked.
- Full route verified in Google Maps as above; panorama IDs, headings and coordinates retained from visual checks, with separate per-leg navigation links.
- Existing unrelated deleted workflow files and untracked cleanup report excluded from this change.
