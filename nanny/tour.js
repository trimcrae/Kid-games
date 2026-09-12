'use strict';
const paints = [
  {name:'Smoky Azurite',code:'9148',hex:'#708d9e',note:'The reference color'},
  {name:'Favorite Jeans',code:'9147',hex:'#8aa3b1',note:'A lighter denim blue'},
  {name:'Blustery Sky',code:'9140',hex:'#6f848c',note:'A grayer, deeper comparison'},
  {name:'Smoky Blue',code:'7604',hex:'#5e717d',note:'The darker blue-gray option'}
];
document.querySelector('#palette').innerHTML = paints.map(p=>`<a class="swatch" href="https://www.sherwin-williams.com/sherwinwilliams/SW${p.code}-${p.name.toLowerCase().replaceAll(' ','-')}"><span class="swatch-color" style="background:${p.hex}"></span><span class="swatch-label"><strong>${p.name}</strong>SW ${p.code}<br>${p.note}</span></a>`).join('');

const houses = [
  {address:'26 Picturesque Drive',zip:'14616',title:'Soft blue, white shutters',
    pano:'0ybSiZEOktnT6EzIbijJpQ',point:'43.2478795,-77.6623822',heading:186.47214,date:'July 2025',
    note:'A muted blue-gray colonial with white shutters and a warm brown roof. This is the best first comparison for how Smoky Azurite’s color family reads across a broad, sunny facade.',
    look:'Compare the sunny upstairs siding with the shaded ground floor. The white shutters make the blue feel stronger.',
    caveat:'Google’s panorama label says 27 Picturesque Dr—the camera position across the street. The blue house shown is 26, confirmed against the address pin and listing facade.',
    source:'https://www.howardhanna.com/property/26-picturesque-drive-rochester-ny-14616-360004264825',
    samples:[0,1],leg:'Start here. Use “Directions to first house” to navigate from your own starting point.'},
  {address:'466 Mt Ridge Circle',zip:'14616',title:'Blue on a low ranch',
    pano:'3WU3OzZ_Tip2nocI8YJ7YA',point:'43.2102659,-77.6560764',heading:193.08311,date:'June 2021',
    note:'A soft, slightly gray blue ranch with light trim and an attached garage on the left. Useful for seeing this palette on a lower, wider house.',
    look:'Look at the siding beside the porch and garage. The deep roof overhang makes the same blue read darker in shade.',
    caveat:'Older imagery: June 2021. A blur covers part of the right side of the panorama; the central facade is visible. Check the current finish when you drive by.',
    source:'https://www.movoto.com/greece-ny/466-mount-ridge-cir-greece-ny-14616-486_r321376_1/',
    samples:[1,2],leg:'From Latta: Latta Road west → Dewey Avenue south → Stone Road west → Kohl Drive → Mt Ridge Circle. About 9 minutes, 3.8 miles.'},
  {address:'1050 Latta Road',zip:'14612',title:'A stronger denim blue',
    pano:'blcVAbEFz4rLGV6UdaYdXQ',point:'43.2529562,-77.6396313',heading:6.7130017,date:'July 2025',
    note:'A two-story blue house with white window trim and a matching blue garage on the left. A richer-looking comparison to the quieter blue-gray at Picturesque.',
    look:'Compare the blue garage door and sunlit lower facade. Tree cover partly hides the upper story. This is a drive-by on a busier road; a passenger can observe while the driver watches traffic.',
    caveat:'Google’s panorama label says 1055 Latta Rd—the camera position across the road. The centered blue house is 1050, verified with Google’s address pin.',
    source:'https://www.redfin.com/NY/Rochester/1050-Latta-Rd-14612/home/79313684',
    samples:[0,3],leg:'From Picturesque: Marie Elaina Drive → Mt Read Boulevard north → Latta Road east. About 3 minutes, 1.5 miles.'},
  {address:'383 Doewood Lane',zip:'14606',title:'A lighter blue colonial',
    pano:'XYFa-FfZMIKkhe95lTZpfw',point:'43.1807021,-77.7365415',heading:99.382965,date:'July 2025',
    note:'A pale, muted blue colonial with white trim and an attached two-car garage. A lighter comparison if Smoky Azurite feels too deep across a large facade.',
    look:'Compare the open upstairs siding with the shaded porch. The broad tree screens the left side, but the center and garage remain visible.',
    caveat:'Southwest Greece extension. Google labels the camera position 378 Doewood; the house facing it is 383, verified against the address pin and listing facade.',
    source:'https://www.compass.com/homedetails/383-Doewood-Ln-Greece-NY-14606/3GF17_pid/',
    samples:[1,0],leg:'From Mt Ridge: Joanne Drive, then the route via Ridgeway Avenue and Elmgrove Road → Cross Gates Road → Doewood Lane. About 14 minutes, 7.0 miles. Follow Maps for the connecting turns.'},
  {address:'353 Doewood Lane',zip:'14606',title:'A deeper slate blue',
    pano:'_TioTrbYSTXXWXvCNxr6Lw',point:'43.1802281,-77.7365297',heading:88.992226,date:'July 2025',
    note:'A deeper blue-gray house with a white garage door and white trim. This is a useful darker comparison to Smoky Azurite, especially beside its lighter blue neighbor.',
    look:'Look at the triangular garage gable and the broad wall to the right. The blue is visible on both upper and lower sections, despite the shrubs.',
    caveat:'Southwest Greece extension. The centered darker blue house is 353; the lighter house to its right is the next stop, 339.',
    source:'https://www.google.com/maps/search/?api=1&query=353+Doewood+Lane+Rochester+NY+14606',
    samples:[2,3],leg:'Continue south on Doewood Lane for about 157 feet. This stop is just down the street from 383.'},
  {address:'339 Doewood Lane',zip:'14606',title:'Soft blue beside slate',
    pano:'_TioTrbYSTXXWXvCNxr6Lw',point:'43.1802285,-77.7365651',heading:117.3984551350036,date:'July 2025',
    note:'The lighter blue two-story house on the right is a useful side-by-side comparison with the deeper slate blue at 353. White trim and dark shutters give the softer siding definition.',
    look:'Compare both houses from the street: which depth of blue would work better with your roof and trim?',
    caveat:'Southwest Greece extension. This view looks toward 339 from outside 353, so Google labels the panorama 353. The default panorama directly at 339 is screened by trees; the address was checked separately.',
    source:'https://www.compass.com/homedetails/339-Doewood-Ln-Greece-NY-14606/3ETIF_pid/',
    samples:[1,0],leg:'Continue south on Doewood Lane for about 161 feet. The tour finishes here.'}
];
const stops = [houses[0], houses[2], houses[1], ...houses.slice(3)];
const fullAddress = s => `${s.address}, Rochester, NY ${s.zip}`;
const directions = (origin,destination,waypoints=[]) => 'https://www.google.com/maps/dir/?' + new URLSearchParams({api:'1',...(origin?{origin}:{}),destination,travelmode:'driving',...(waypoints.length?{waypoints:waypoints.join('|')}:{})});
const streetView = s => 'https://www.google.com/maps/@?' + new URLSearchParams({api:'1',map_action:'pano',pano:s.pano,viewpoint:s.point,heading:String(s.heading),pitch:'0',fov:'75'});
const thumbnail = s => 'https://streetviewpixels-pa.googleapis.com/v1/thumbnail?' + new URLSearchParams({cb_client:'maps_sv.tactile',w:'900',h:'600',pitch:'0',panoid:s.pano,yaw:String(s.heading)});
document.querySelector('#route-details').innerHTML = `<ol>${stops.map((s,i)=>`<li><a href="#stop-${i+1}">${s.address}</a> · Rochester, NY ${s.zip}</li>`).join('')}</ol><a class="button" href="${directions(null,fullAddress(stops[0]))}">Directions to first house ↗</a><p>For the drive, open Part 1 first. At 383 Doewood Lane, switch to Part 2 for the final two houses. These shorter links keep every stop on phone versions of Maps.</p><a class="button" href="${directions(fullAddress(stops[0]),fullAddress(stops[3]),stops.slice(1,3).map(fullAddress))}">Part 1: houses 1–4 ↗</a><a class="button" href="${directions(fullAddress(stops[3]),fullAddress(stops[5]),[fullAddress(stops[4])])}">Part 2: houses 4–6 ↗</a><p><a href="${directions(fullAddress(stops[0]),fullAddress(stops.at(-1)),stops.slice(1,-1).map(fullAddress))}">View all six in Google Maps</a> · <button class="button secondary" type="button" id="print">Print the tour</button></p>`;
document.querySelector('#stops').innerHTML = stops.map((s,i)=>`<article class="stop" id="stop-${i+1}"><figure><a href="${streetView(s)}" aria-label="See ${s.address} in Google Street View"><img src="${thumbnail(s)}" width="900" height="600" loading="lazy" alt="${s.title} at ${s.address}, viewed from the public street"></a><figcaption>Google Street View · Image capture: ${s.date} · © Google<br><a href="${s.source}">Address reference</a></figcaption></figure><div><span class="number">Stop ${i+1} / ${stops.length}</span><h3>${s.title}</h3><p class="address"><strong>${s.address}</strong><br>Rochester, NY ${s.zip}</p><p>${s.note}</p><p>${s.look}</p><p><strong>Sample these for a similar feel:</strong></p><div class="tags">${s.samples.map(n=>`<a class="chip" href="#palette"><span class="dot" style="background:${paints[n].hex}"></span>${paints[n].name} · SW ${paints[n].code}</a>`).join('')}</div><p class="small">${s.caveat}</p><details><summary>Driving leg</summary><p>${s.leg}</p></details><a class="button" href="${streetView(s)}">Street View ↗</a><a class="button secondary" href="${directions(i?fullAddress(stops[i-1]):null,fullAddress(s))}">Drive this leg ↗</a></div></article>`).join('');
document.querySelector('#print-guide').innerHTML = `<section class="print-page"><h1>Blue house color tour</h1><p>Greece, New York · Six houses · September 12, 2026</p><h2>Your driving plan</h2><p><strong>Start at 26 Picturesque Drive. Finish at 339 Doewood Lane.</strong><br>About 30 minutes / 12.4 miles between houses; allow 60–75 minutes to look. Travel to the first house and home afterward is extra.</p><ol>${stops.map(s=>`<li><strong>${fullAddress(s)}</strong><br>${s === stops[0] ? 'Navigate here from your own starting point.' : s.leg}</li>`).join('')}</ol><h2>Paint samples to compare</h2><div class="print-palette">${paints.map(p=>`<div><span class="dot" style="background:${p.hex}"></span><strong>${p.name}</strong><br>SW ${p.code}</div>`).join('')}</div><p>Reference: Smoky Azurite SW 9148. Suggestions are visual estimates, not confirmed paint matches. Printed colors vary; compare real samples beside your roof and trim in sun and shade.</p><p class="print-footnote">View from public streets; keep driveways clear. Street View images are dated and houses may have changed. Live photos, maps and sources: https://trimcrae.github.io/Kid-games/nanny/</p></section>${[0,2,4].map(start=>`<section class="print-page">${stops.slice(start,start+2).map((s,j)=>`<article class="print-house"><h2>${start+j+1}. ${s.address}</h2><p>Rochester, NY ${s.zip} · ${s.title}</p><div class="print-house-body"><figure><img src="${thumbnail(s)}" width="900" height="600" alt="${s.title} at ${s.address}"><figcaption>Google Street View · ${s.date} · © Google</figcaption></figure><div><p>${s.note}</p><p><strong>Compare:</strong> ${s.samples.map(n=>`${paints[n].name} (SW ${paints[n].code})`).join(' / ')}</p><p class="print-footnote">${s.caveat}</p></div></div><p><strong>Look for:</strong> ${s.look}</p><p class="print-notes">Notes: __________________________________________________________________<br>_________________________________________________________________________</p></article>`).join('')}</section>`).join('')}`;

async function printTour() {
  const buttons = document.querySelectorAll('[data-print], #print');
  buttons.forEach(button=>button.disabled=true);
  const status = document.querySelector('#print-status');
  status.textContent='Preparing photos…';
  await Promise.all([...document.querySelectorAll('#print-guide img')].map(img=>Promise.race([
    img.decode().catch(()=>{}), new Promise(resolve=>setTimeout(resolve,8000))
  ])));
  status.textContent='Choose your printer or “Save as PDF”. Use portrait orientation.';
  buttons.forEach(button=>button.disabled=false);
  window.print();
}
document.querySelectorAll('[data-print], #print').forEach(button=>button.addEventListener('click',printTour));
document.querySelectorAll('figure img').forEach(img=>img.addEventListener('error',()=>{
  img.hidden=true;
  const message=document.createElement('p');
  message.className='image-fallback';
  message.textContent='Photo preview unavailable. Open Street View to see this house.';
  img.parentElement.append(message);
},{once:true}));
