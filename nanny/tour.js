'use strict';
const paints = [
  {name:'Smoky Azurite',code:'9148',hex:'#708d9e',note:'Nanny’s starting point'},
  {name:'Favorite Jeans',code:'9147',hex:'#8aa3b1',note:'A lighter denim blue'},
  {name:'Blustery Sky',code:'9140',hex:'#6f848c',note:'A grayer, deeper comparison'},
  {name:'Smoky Blue',code:'7604',hex:'#5e717d',note:'The darker blue-gray option'}
];
document.querySelector('#palette').innerHTML = paints.map(p=>`<a class="swatch" href="https://www.sherwin-williams.com/sherwinwilliams/SW${p.code}-${p.name.toLowerCase().replaceAll(' ','-')}"><span class="swatch-color" style="background:${p.hex}"></span><span class="swatch-label"><strong>${p.name}</strong>SW ${p.code}<br>${p.note}</span></a>`).join('');

const school = '299 Kirk Road, Rochester, NY 14612';
const stops = [
  {address:'26 Picturesque Drive',zip:'14616',title:'Soft blue, white shutters',
    pano:'0ybSiZEOktnT6EzIbijJpQ',point:'43.2478795,-77.6623822',heading:186.47214,date:'July 2025',
    note:'A muted blue-gray colonial with white shutters and a warm brown roof. This is the best first comparison for how Smoky Azurite’s color family reads across a broad, sunny facade.',
    look:'Compare the sunny upstairs siding with the shaded ground floor. The white shutters make the blue feel stronger.',
    caveat:'Google’s panorama label says 27 Picturesque Dr—the camera position across the street. The blue house shown is 26, confirmed against the address pin and listing facade.',
    source:'https://www.howardhanna.com/property/26-picturesque-drive-rochester-ny-14616-360004264825',
    samples:[0,1],leg:'From the school: Taybrook Lane → Kirk Road → Latta Road → Picturesque Drive / Nurmi Drive. About 5 minutes, 1.8 miles.'},
  {address:'466 Mt Ridge Circle',zip:'14616',title:'Blue on a low ranch',
    pano:'3WU3OzZ_Tip2nocI8YJ7YA',point:'43.2102659,-77.6560764',heading:193.08311,date:'June 2021',
    note:'A soft, slightly gray blue ranch with light trim and an attached garage on the left. Useful for seeing this palette on a lower, wider house.',
    look:'Look at the siding beside the porch and garage. The deep roof overhang makes the same blue read darker in shade.',
    caveat:'Older imagery: June 2021. A blur covers part of the right side of the panorama; the central facade is visible. Check the current finish when you drive by.',
    source:'https://www.movoto.com/greece-ny/466-mount-ridge-cir-greece-ny-14616-486_r321376_1/',
    samples:[1,2],leg:'From Picturesque: Marie Elaina Drive → Mt Read Boulevard south → Medimount Drive → Mt Ridge Circle. About 7 minutes, 3.0 miles.'},
  {address:'1050 Latta Road',zip:'14612',title:'A stronger denim blue',
    pano:'blcVAbEFz4rLGV6UdaYdXQ',point:'43.2529562,-77.6396313',heading:6.7130017,date:'July 2025',
    note:'A two-story blue house with white window trim and a matching blue garage on the left. A richer-looking comparison to the quieter blue-gray at Picturesque.',
    look:'Compare the blue garage door and sunlit lower facade. Tree cover partly hides the upper story. This is a drive-by on a busier road; a passenger can observe while the driver watches traffic.',
    caveat:'Google’s panorama label says 1055 Latta Rd—the camera position across the road. The centered blue house is 1050, verified with Google’s address pin.',
    source:'https://www.redfin.com/NY/Rochester/1050-Latta-Rd-14612/home/79313684',
    samples:[0,3],leg:'From Mt Ridge: Kohl Drive → Stone Road → Dewey Avenue north → Latta Road east. About 9 minutes, 3.8 miles.'}
];
const fullAddress = s => `${s.address}, Rochester, NY ${s.zip}`;
const directions = (origin,destination,waypoints=[]) => 'https://www.google.com/maps/dir/?' + new URLSearchParams({api:'1',origin,destination,travelmode:'driving',...(waypoints.length?{waypoints:waypoints.join('|')}:{})});
const streetView = s => 'https://www.google.com/maps/@?' + new URLSearchParams({api:'1',map_action:'pano',pano:s.pano,viewpoint:s.point,heading:String(s.heading),pitch:'0',fov:'75'});
const thumbnail = s => 'https://streetviewpixels-pa.googleapis.com/v1/thumbnail?' + new URLSearchParams({cb_client:'maps_sv.tactile',w:'900',h:'600',pitch:'0',panoid:s.pano,yaw:String(s.heading)});
document.querySelector('#route-details').innerHTML = `<ol>${stops.map((s,i)=>`<li><a href="#stop-${i+1}">${s.address}</a> · Rochester, NY ${s.zip}</li>`).join('')}<li>Return to 299 Kirk Road · About 6 minutes, 2.6 miles via Latta Road west, Kirk Road and Taybrook Lane.</li></ol><a class="button" href="${directions(school,school,stops.map(fullAddress))}">Open the full route in Google Maps ↗</a><button class="button secondary" type="button" id="print">Print the tour</button><p>If your Maps app drops the stops, use each house’s “Drive this leg” button in order, then <a href="${directions(fullAddress(stops[2]),school)}">navigate back to the school</a>.</p>`;
document.querySelector('#stops').innerHTML = stops.map((s,i)=>`<article class="stop" id="stop-${i+1}"><figure><a href="${streetView(s)}" aria-label="See ${s.address} in Google Street View"><img src="${thumbnail(s)}" width="900" height="600" loading="lazy" alt="${s.title} at ${s.address}, viewed from the public street"></a><figcaption>Google Street View · Image capture: ${s.date} · © Google<br><a href="${s.source}">Address reference</a></figcaption></figure><div><span class="number">Stop ${i+1} / 3</span><h3>${s.title}</h3><p class="address"><strong>${s.address}</strong><br>Rochester, NY ${s.zip}</p><p>${s.note}</p><p>${s.look}</p><p><strong>Sample these for a similar feel:</strong></p><div class="tags">${s.samples.map(n=>`<a class="chip" href="#palette"><span class="dot" style="background:${paints[n].hex}"></span>${paints[n].name} · SW ${paints[n].code}</a>`).join('')}</div><p class="small">${s.caveat}</p><details><summary>Driving leg</summary><p>${s.leg}</p></details><a class="button" href="${streetView(s)}">Street View ↗</a><a class="button secondary" href="${directions(i?fullAddress(stops[i-1]):school,fullAddress(s))}">Drive this leg ↗</a></div></article>`).join('');
document.querySelector('#print').addEventListener('click',()=>window.print());
document.querySelectorAll('figure img').forEach(img=>img.addEventListener('error',()=>{
  img.hidden=true;
  const message=document.createElement('p');
  message.className='image-fallback';
  message.textContent='Photo preview unavailable. Open Street View to see this house.';
  img.parentElement.append(message);
},{once:true}));
