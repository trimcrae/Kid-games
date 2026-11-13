// Fixed city, never device geolocation. Current conditions are model estimates:
// https://open-meteo.com/en/docs (CC BY 4.0). No key or game-save writes.
export const ROCHESTER=Object.freeze({latitude:43.1566,longitude:-77.6088,timeZone:'America/New_York'});
export const CACHE_KEY='craepets.rochester-weather.v1';
export const REFRESH_MS=15*60e3,RETRY_MS=5*60e3,FRESH_MS=45*60e3,MAX_AGE_MS=6*60*60e3;
export const WEATHER_URL='https://api.open-meteo.com/v1/forecast?latitude=43.1566&longitude=-77.6088&current=temperature_2m,precipitation,snowfall,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m&temperature_unit=fahrenheit&wind_speed_unit=ms&timeformat=unixtime&timezone=GMT&forecast_days=1';
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const rad=Math.PI/180,mod=(v,n)=>((v%n)+n)%n;
const localFormat=new Intl.DateTimeFormat('en-US',{timeZone:ROCHESTER.timeZone,year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'2-digit',hourCycle:'h23'});
const clockFormat=new Intl.DateTimeFormat('en-US',{timeZone:ROCHESTER.timeZone,hour:'numeric',minute:'2-digit',timeZoneName:'short'});
const stampFormat=new Intl.DateTimeFormat('en-US',{timeZone:ROCHESTER.timeZone,month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'});
export function rochesterClock(now=Date.now()){
  const parts=Object.fromEntries(localFormat.formatToParts(now).map(p=>[p.type,p.value]));
  const month=Number(parts.month);
  return {year:+parts.year,month,day:+parts.day,hour:+parts.hour,minute:+parts.minute,
    label:clockFormat.format(now),date:`${parts.year}-${parts.month.padStart(2,'0')}-${parts.day.padStart(2,'0')}`,
    // Northern-hemisphere meteorological seasons; independent of viewer timezone.
    season:month>=3&&month<=5?'spring':month>=6&&month<=8?'summer':month>=9&&month<=11?'autumn':'winter'};
}
// NOAA/Meeus solar geometry, UTC Julian centuries + equation of time. Geometric
// elevation (no atmospheric refraction). https://gml.noaa.gov/grad/solcalc/calcdetails.html
// World convention: east +x, up +y, north -z; not a surveyed house bearing.
export function solarPosition(now=Date.now()){
  const date=new Date(now),t=(date.getTime()/864e5+2440587.5-2451545)/36525;
  const l=mod(280.46646+t*(36000.76983+t*.0003032),360)*rad;
  const m=(357.52911+t*(35999.05029-.0001537*t))*rad;
  const e=.016708634-t*(.000042037+.0000001267*t);
  const center=Math.sin(m)*(1.914602-t*(.004817+.000014*t))+Math.sin(2*m)*(.019993-.000101*t)+Math.sin(3*m)*.000289;
  const omega=(125.04-1934.136*t)*rad;
  const lambda=l+(center-.00569-.00478*Math.sin(omega))*rad;
  const epsilon=(23+(26+(21.448-t*(46.815+t*(.00059-t*.001813)))/60)/60+.00256*Math.cos(omega))*rad;
  const decl=Math.asin(Math.sin(epsilon)*Math.sin(lambda)),y=Math.tan(epsilon/2)**2;
  const eq=4/rad*(y*Math.sin(2*l)-2*e*Math.sin(m)+4*e*y*Math.sin(m)*Math.cos(2*l)-.5*y*y*Math.sin(4*l)-1.25*e*e*Math.sin(2*m));
  const minutes=date.getUTCHours()*60+date.getUTCMinutes()+date.getUTCSeconds()/60+date.getUTCMilliseconds()/60000;
  const hourAngle=(mod(minutes+eq+4*ROCHESTER.longitude,1440)/4-180)*rad,lat=ROCHESTER.latitude*rad;
  const up=Math.sin(lat)*Math.sin(decl)+Math.cos(lat)*Math.cos(decl)*Math.cos(hourAngle);
  const east=-Math.cos(decl)*Math.sin(hourAngle),north=Math.cos(lat)*Math.sin(decl)-Math.sin(lat)*Math.cos(decl)*Math.cos(hourAngle);
  const elevation=Math.asin(clamp(up,-1,1))/rad,azimuth=mod(Math.atan2(east,north)/rad,360);
  return {elevation,azimuth,direction:[east,up,-north],daylight:elevation>-.833,
    time:elevation< -6?'night':elevation<6?(hourAngle<0?'dawn':'dusk'):'day'};
}
const snow=new Set([71,73,75,77,85,86]),rain=new Set([51,53,55,56,57,61,63,65,66,67,80,81,82,95,96,97,99]);
const codes=new Set([0,1,2,3,45,48,...snow,...rain]);
export function mapWeather(code,cloudCover,windSpeed){
  if(!codes.has(code))throw new Error('Unknown weather code');
  if(snow.has(code))return {weather:'snowy',description:'Snow',emoji:'🌨️',precipitation:'snow'};
  if(rain.has(code))return {weather:'rainy',description:code>=95?'Thunderstorms':code===66||code===67?'Freezing rain':code===56||code===57?'Freezing drizzle':code<60?'Drizzle':'Rain',emoji:'🌧️',precipitation:'rain'};
  if(code===45||code===48)return {weather:'cloudy',description:'Fog',emoji:'🌫️',precipitation:null};
  if(windSpeed>=8)return {weather:'windy',description:'Windy',emoji:'🌬️',precipitation:null};
  if(code>=2||cloudCover>=.65)return {weather:'cloudy',description:code===3||cloudCover>=.85?'Overcast':'Partly cloudy',emoji:'☁️',precipitation:null};
  return {weather:'sunny',description:code===1?'Mainly clear':'Clear',emoji:'☀️',precipitation:null};
}
function number(v,min,max){if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw new Error('Invalid weather data');return v;}
export function parseWeather(payload,now=Date.now()){
  const c=payload?.current;if(!c)throw new Error('Missing current weather');
  const observedAt=number(c.time,0,1e11)*1000;
  if(observedAt>now+5*60e3||now-observedAt>MAX_AGE_MS)throw new Error('Weather timestamp out of date');
  const cloudCover=number(c.cloud_cover,0,100)/100,windSpeed=number(c.wind_speed_10m,0,150),windDirection=number(c.wind_direction_10m,0,360);
  const code=number(c.weather_code,0,99),temperature=number(c.temperature_2m,-150,160);
  const amount=number(c.precipitation,0,1000),snowfall=number(c.snowfall,0,1000);
  const mapped=mapWeather(code,cloudCover,windSpeed);
  // Falling snow reported alongside rain codes is rendered as snow (mixed weather).
  if(snowfall>0&&!snow.has(code))Object.assign(mapped,{weather:'snowy',description:rain.has(code)?'Wintry mix':'Snow',emoji:'🌨️',precipitation:'snow'});
  return {...mapped,observedAt,cloudCover,windSpeed,windDirection,temperature,code,amount,snowfall};
}
export function previewWeather(weather){
  const presets={sunny:[0,12,2],cloudy:[3,90,3],rainy:[63,100,6],snowy:[73,95,3],windy:[1,40,10]};
  if(!Object.hasOwn(presets,weather))return null;
  const [code,cover,windSpeed]=presets[weather];
  return {...mapWeather(code,cover/100,windSpeed),cloudCover:cover/100,windSpeed,windDirection:250,amount:weather==='rainy'?1:0,snowfall:weather==='snowy'?.2:0,temperature:null};
}
const neutral=Object.freeze({weather:'unavailable',description:'Weather unavailable',emoji:'◌',cloudCover:.5,windSpeed:0,windDirection:0,precipitation:null,temperature:null});
export function createWeatherClient({fetchFn=globalThis.fetch?.bind(globalThis),storage=null,now=Date.now,timeoutMs=8000}={}){
  let record=null,failed=false,inflight=null,nextAttempt=0,stopped=false,controller=null;
  try{
    const cached=JSON.parse(storage?.getItem(CACHE_KEY)||'null');
    if(cached?.version===1&&Number.isFinite(cached.fetchedAt)&&cached.fetchedAt<=now()+5*60e3&&now()-cached.fetchedAt<MAX_AGE_MS){
      record={...cached,data:parseWeather(cached.payload,now())};
      nextAttempt=Math.min(cached.fetchedAt+REFRESH_MS,now()+REFRESH_MS);
    }
  }catch{/* A corrupt weather cache must never prevent the game from opening. */}
  function snapshot(){
    const time=now(),age=record?Math.max(time-record.data.observedAt,time-record.fetchedAt):Infinity;
    if(age>MAX_AGE_MS)return {...neutral,status:inflight&&!failed?'loading':'unavailable'};
    return {...record.data,status:failed||age>FRESH_MS?'stale':'live',fetchedAt:record.fetchedAt};
  }
  function refresh(){
    if(stopped||inflight||now()<nextAttempt)return inflight||Promise.resolve(snapshot());
    const requestController=new AbortController();controller=requestController;
    inflight=(async()=>{
      let timer;
      try{
        // One deadline covers both response headers and body decoding. Capture
        // this request's controller so cancellation cannot race a later retry.
        const payload=await Promise.race([
          Promise.resolve().then(async()=>{
            const response=await fetchFn(WEATHER_URL,{signal:requestController.signal,credentials:'omit',referrerPolicy:'no-referrer'});
            if(!response.ok)throw new Error('Weather service unavailable');
            return response.json();
          }),
          new Promise((_,reject)=>{
            requestController.signal.addEventListener('abort',()=>reject(new Error('Weather cancelled')),{once:true});
            timer=setTimeout(()=>{requestController.abort();reject(new Error('Weather timeout'));},timeoutMs);
          }),
        ]);
        const fetchedAt=now(),data=parseWeather(payload,fetchedAt);
        if(stopped)return snapshot();
        record={version:1,payload,fetchedAt,data};failed=false;nextAttempt=fetchedAt+REFRESH_MS;
        try{storage?.setItem(CACHE_KEY,JSON.stringify({version:1,payload,fetchedAt}));}catch{/* Private mode / full storage: in-memory data still works. */}
      }catch{failed=true;nextAttempt=now()+RETRY_MS;}
      finally{clearTimeout(timer);inflight=null;controller=null;}
      return snapshot();
    })();
    return inflight;
  }
  return {snapshot,refresh,stop(){stopped=true;controller?.abort();}};
}
export function createRochesterEnvironment({query=new URLSearchParams(),client,now=Date.now}={}){
  const phase=['day','dawn','dusk','night'].includes(query.get('phase'))?query.get('phase'):null;
  // A phase-only pin retains the established sunny, deterministic comparison.
  const preview=previewWeather(query.get('weather'))||(phase?previewWeather('sunny'):null);
  return {refresh:()=>preview?Promise.resolve():client.refresh(),snapshot(){
    const time=now(),sun=solarPosition(time),local=rochesterClock(time),data=preview?{...preview,status:'preview'}:client.snapshot();
    return {...data,time:phase||sun.time,sun:phase?null:sun,local,phaseOverride:phase,weatherOverride:!!preview};
  }};
}
export function weatherLabel(s){
  const condition=s.status==='loading'?'Loading weather…':s.status==='unavailable'?'Weather unavailable':`${s.description}${s.temperature===null?'':` · ${Math.round(s.temperature)}°F`}`;
  const state=s.status==='preview'?'Preview':s.status==='stale'?`Cached ${stampFormat.format(s.observedAt)}`:s.status==='live'?`Updated ${clockFormat.format(s.observedAt)}`:'';
  return `Rochester, NY · ${s.local.label} · ${condition}${state?' · '+state:''}`;
}
