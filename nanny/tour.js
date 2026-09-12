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
];
const montvale = {address:'152 Montvale Lane',zip:'14626',title:'Deep blue with warm brick',
  pano:'DpjZGR7T0-Jd1yOacGjk8A',point:'43.2252241,-77.7211305',heading:266.9645,date:'August 2025',
  note:'A deep blue contemporary house with tall gables, white trim and a prominent warm brick chimney. The open front lawn gives a clear view of the siding.',
  look:'Compare the blue beside the brick chimney and white garage. This is a darker, more saturated comparison to Smoky Azurite.',
  caveat:'Montvale / Northbridge area. Address and facade checked against Google Maps and the property listing; this is a visual comparison, not a confirmed paint match.',
  source:'https://www.zillow.com/homedetails/152-Montvale-Ln-Rochester-NY-14626/30936928_zpid/',
  samples:[3,0],leg:'Start here; navigate from your own starting point.'};
const rye = {address:'113 Rye Road',zip:'14626',title:'Blue-gray beneath mature trees',
  pano:'2jlUtXne4_LcN0SCcJNNfA',point:'43.2000521,-77.6843324',heading:195.71706,date:'August 2025',
  note:'A blue-gray colonial with white shutters and an attached garage on the left. Its shaded setting gives a useful contrast to the open, sunny facades elsewhere on the tour.',
  look:'Compare the upper siding, white shutters and garage gable. Trees partly screen the house, but the central blue facade is visible.',
  caveat:'Rye / Latona area. Google Maps and the listing identify 113 Rye Road. Expect the blue to read cooler and darker under the trees.',
  source:'https://www.homes.com/property/113-rye-rd-rochester-ny/spsc5lmkb75ds/',samples:[0,1],
  leg:'From Mt Ridge: Joanne Drive → Mt Read Boulevard → south service road → Ridgeway Avenue → Latona Road → Rye Road. About 7 minutes, 3.2 miles; follow Maps for connecting turns.'};
const school = [43.259546,-77.681902];
const distance = point => {
  const [lat,lon]=point.split(',').map(Number), rad=Math.PI/180;
  const a=Math.sin((lat-school[0])*rad/2)**2+Math.cos(lat*rad)*Math.cos(school[0]*rad)*Math.sin((lon-school[1])*rad/2)**2;
  return 3958.8*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
};
const stops = [houses[0], houses[2], montvale, houses[1], rye, houses[3]]
  .map(s=>({...s,miles:distance(s.point)}))
  .sort((a,b)=>a.miles-b.miles);
const fullAddress = s => `${s.address}, Rochester, NY ${s.zip}`;
const streetView = s => 'https://www.google.com/maps/@?' + new URLSearchParams({api:'1',map_action:'pano',pano:s.pano,viewpoint:s.point,heading:String(s.heading),pitch:'0',fov:'75'});
const thumbnail = s => 'https://streetviewpixels-pa.googleapis.com/v1/thumbnail?' + new URLSearchParams({cb_client:'maps_sv.tactile',w:'900',h:'600',pitch:'0',panoid:s.pano,yaw:String(s.heading)});
const colorGuess = s => s.samples.map(n=>`<span class="chip"><span class="dot" style="background:${paints[n].hex}"></span>${paints[n].name} · SW ${paints[n].code}</span>`).join('');
document.querySelector('#stops').innerHTML = stops.map((s,i)=>`<article class="stop" id="house-${i+1}"><figure><a href="${streetView(s)}" aria-label="See ${s.address} in Google Street View"><img src="${thumbnail(s)}" width="900" height="600" loading="lazy" alt="${s.title} at ${s.address}"></a><figcaption>Google Street View · ${s.date} · © Google</figcaption></figure><div><h2 class="address">${s.address}</h2><p>Rochester, NY ${s.zip}</p><p><strong>Color guess</strong> · similar paint samples</p><div class="tags">${colorGuess(s)}</div><p class="small">${s.caveat}</p><a href="${streetView(s)}">Open Street View ↗</a> · <a href="${s.source}">Address reference</a></div></article>`).join('');
document.querySelector('#print-guide').innerHTML = Array.from({length:Math.ceil(stops.length/2)},(_,page)=>`<section class="print-page"><h1>Nearby blue-gray houses</h1><p>All verified color fits found so far · September 12, 2026</p>${stops.slice(page*2,page*2+2).map(s=>`<article class="print-house"><h2>${s.address}</h2><p>Rochester, NY ${s.zip}</p><div class="print-house-body"><figure><img src="${thumbnail(s)}" width="900" height="600" alt="${s.title} at ${s.address}"><figcaption>Google Street View · ${s.date} · © Google</figcaption></figure><div><p><strong>Color guess:</strong></p>${colorGuess(s)}<p class="print-footnote">${s.caveat}</p></div></div><p class="print-notes">Notes: __________________________________________________________________</p></article>`).join('')}<p class="print-footnote">Colors are visual estimates, not confirmed paint matches. Photos may be older than the current finish. Live list: https://trimcrae.github.io/Kid-games/nanny/</p></section>`).join('');

async function printHouses() {
  const buttons = document.querySelectorAll('[data-print]');
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
document.querySelectorAll('[data-print]').forEach(button=>button.addEventListener('click',printHouses));
document.querySelectorAll('figure img').forEach(img=>img.addEventListener('error',()=>{
  img.hidden=true;
  const message=document.createElement('p');
  message.className='image-fallback';
  message.textContent='Photo preview unavailable. Open Street View to see this house.';
  img.parentElement.append(message);
},{once:true}));
