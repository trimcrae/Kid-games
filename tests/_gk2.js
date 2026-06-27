const http=require("http"),fs=require("fs"),path=require("path");
const {chromium}=require("playwright-core");
const ROOT=path.resolve(__dirname,"..");const PORT=8185;const BASE=`http://127.0.0.1:${PORT}`;
const MIME={".html":"text/html",".js":"text/javascript",".css":"text/css",".svg":"image/svg+xml"};
const srv=http.createServer((req,res)=>{let rel=decodeURIComponent(req.url.split("?")[0]);if(rel.endsWith("/"))rel+="index.html";const f=path.join(ROOT,rel);fs.readFile(f,(e,d)=>{if(e){res.writeHead(404).end();return;}res.writeHead(200,{"Content-Type":MIME[path.extname(f)]||"application/octet-stream"});res.end(d);});});
(async()=>{await new Promise(r=>srv.listen(PORT,"127.0.0.1",r));
const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium",args:["--no-sandbox"]});
// narrow mobile to check fit + width stability
let c=await b.newContext({viewport:{width:390,height:760},isMobile:true,deviceScaleFactor:2});let p=await c.newPage();
await p.goto(`${BASE}/games/soccer-roster/`,{waitUntil:"networkidle"});
await p.evaluate(()=>localStorage.clear());await p.reload({waitUntil:"networkidle"});
// width stability across the 3 states on row 1
const sel=".player-row .chip.gk-yes, .player-row .chip.gk-must, .player-row .chip.gk-no";
const w1=await p.evaluate(s=>document.querySelector(s).getBoundingClientRect().width,sel);
await p.locator(".player-row").nth(0).locator(sel).click(); // ->must
const w2=await p.evaluate(s=>document.querySelector(s).getBoundingClientRect().width,sel);
await p.locator(".player-row").nth(0).locator(sel).click(); // ->no
const w3=await p.evaluate(s=>document.querySelector(s).getBoundingClientRect().width,sel);
console.log("goalie chip widths (can/must/no):",w1,w2,w3,(w1===w2&&w2===w3)?"STABLE":"JUMPS");
// set row2 must so screenshot shows all three states
await p.locator(".player-row").nth(0).locator(sel).click(); // back to can (row1)
await p.locator(".player-row").nth(1).locator(sel).click(); // row2 -> must
await p.locator(".player-row").nth(2).locator(sel).click(); await p.locator(".player-row").nth(2).locator(sel).click(); // row3 -> no
await p.waitForTimeout(120);
await p.locator("#teamList").screenshot({path:path.join(ROOT,"../gk2.png")});
await c.close();await b.close();srv.close();console.log("done");
})();
