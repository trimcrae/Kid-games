// Run with node tests/house-mobile-hud.mjs after setting PLAYWRIGHT_MODULE.
// A small DOM fixture keeps the layout check independent of the 3D house load.
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const css=readFileSync(resolve(fileURLToPath(new URL('..',import.meta.url)),'house-test/style.css'),'utf8');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
  for(const [width,height,count,fromGame,interact] of [[390,844,2,false,false],[320,568,2,false,false],[430,844,2,false,false],[520,844,2,false,false],[600,844,2,false,false],[390,844,3,false,false],[320,568,3,false,true],[390,844,2,true,true],[320,568,3,true,true]]){
    const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
    await page.setContent(`<meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><body class="${fromGame?'from-game':''}">
      <header class="topbar"><div class="player"><button id="player-chip"><span id="chip-face">🐾</span><span class="chip-text"><strong id="pet-status">A Very Long Craepet Name</strong><small id="chip-coins">🪙 1,234,567,890</small></span><span id="weather-status">☁️</span></button><div id="pet-needs"><span class="meter">🍽️</span><span class="meter">😊</span><span class="meter">⚡</span><span class="meter">🧼</span></div><a id="back-to-game" class="game-only">⬅ Back to the Craepets game</a></div><div class="actions"><button>👪</button><button>🗺️</button><button>📜</button><button id="pause-button">Ⅱ</button></div></header>
      <div class="location show"><span>Living room</span><small>Main floor</small></div><p id="coach">Drag the pad to walk · swipe the screen to look around</p><aside id="nearby"><div id="nearby-actions">${Array.from({length:count},(_,i)=>`<button>${i===0?'💛 Pet & family':'🪑 Furnish & decorate'}</button>`).join('')}</div></aside>
      <button id="interact" ${interact?'':'hidden'}><span id="interact-label">Open the fridge</span></button>
      <div id="touch-controls"><div id="joystick"><span></span></div><button id="jump">🐾</button></div>`);
    const boxes=await page.evaluate(()=>{
      const box=s=>{const r=document.querySelector(s).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
      return {chip:box('#player-chip'),needs:box('#pet-needs'),back:box('#back-to-game'),actions:box('.actions'),toast:box('.location'),toastVisible:getComputedStyle(document.querySelector('.location')).opacity!=='0',coach:box('#coach'),coachVisible:getComputedStyle(document.querySelector('#coach')).visibility!=='hidden',nearby:box('#nearby'),interact:box('#interact'),buttons:[...document.querySelectorAll('#nearby-actions button')].map(b=>{const r=b.getBoundingClientRect();return {width:r.width,height:r.height,scrollWidth:b.scrollWidth};})};
    });
    const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
    if(boxes.toastVisible&&overlap(boxes.toast,boxes.nearby))throw new Error(`${width}x${height}: location covers nearby actions ${JSON.stringify(boxes)}`);
    if(boxes.toastVisible&&boxes.coachVisible&&overlap(boxes.toast,boxes.coach))throw new Error(`${width}x${height}: location covers coach ${JSON.stringify(boxes)}`);
    if(overlap(boxes.chip,boxes.actions)||overlap(boxes.needs,boxes.actions))throw new Error(`${width}x${height}: top controls collide ${JSON.stringify(boxes)}`);
    if(fromGame&&overlap(boxes.back,boxes.actions))throw new Error(`${width}x${height}: back link covers top controls ${JSON.stringify(boxes)}`);
    if(interact&&(overlap(boxes.interact,boxes.actions)||overlap(boxes.interact,boxes.nearby)))throw new Error(`${width}x${height}: interaction pill covered ${JSON.stringify(boxes)}`);
    if(boxes.chip.left<0||boxes.chip.right>width||boxes.actions.right>width)throw new Error(`${width}x${height}: top controls leave viewport ${JSON.stringify(boxes)}`);
    if(boxes.buttons.some(b=>b.height<44||b.scrollWidth>b.width+1))throw new Error(`${width}x${height}: action label clipped or touch target too small ${JSON.stringify(boxes)}`);
    console.log(`${width}x${height}, ${count} actions: clear`);
    await page.close();
  }
}finally{await browser.close();}
