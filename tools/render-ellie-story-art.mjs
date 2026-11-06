#!/usr/bin/env node
// Original vector picture-book art. Run from any directory; no network or packages.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../games/spooky-stories');
const context = { window: { FAMILY_STORIES: [] } };
vm.runInNewContext(fs.readFileSync(path.join(root, 'ellie-stories.js'), 'utf8'), context);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const rect = (x,y,w,h,c,r=0,extra='') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${c}" ${extra}/>`;
const ellipse = (x,y,rx,ry,c,extra='') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${c}" ${extra}/>`;
const circle = (x,y,r,c,extra='') => ellipse(x,y,r,r,c,extra);
const line = (x1,y1,x2,y2,c,w=6,extra='') => `<path d="M${x1} ${y1}L${x2} ${y2}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" ${extra}/>`;
const red = '#db5265', blue = '#3981be';
function girl(x=170,y=400,s=1,pose='point') {
  return `<g transform="translate(${x} ${y}) scale(${s})" data-character="pretend-princess">
    ${ellipse(0,198,78,14,'#65526c','opacity=".13"')}
    <path d="M-25 152l-8 42m58-42 8 42" stroke="#edc9b0" stroke-width="17" stroke-linecap="round"/>
    ${ellipse(-36,195,22,10,'#986ea2')}${ellipse(36,195,22,10,'#986ea2')}
    <path d="M-29 55Q0 36 29 55L65 159Q0 188-65 159Z" fill="#a481bf"/>
    <path d="M-26 66L-54 155Q-13 167 14 166L0 59Z" fill="#b99bd0"/>
    <path d="M-28 58Q-52 72-47 91L-22 91Z M28 58Q52 72 47 91L22 91Z" fill="#cfb6dd"/>
    ${line(-38,91,-48,126,'#edc9b0',14)}
    ${pose==='lap' ? line(38,91,9,120,'#edc9b0',14) + line(-48,126,-5,121,'#edc9b0',14) : line(38,91,83,59,'#edc9b0',14)}
    ${rect(14,112,23,28,'#dbbddf',5)}${line(17,115,34,115,'#956aab',2)}
    ${rect(-11,28,22,31,'#edc9b0',8)}
    ${ellipse(0,5,44,53,'#60443d')}${ellipse(-33,43,16,26,'#60443d')}${ellipse(34,43,16,26,'#60443d')}
    ${ellipse(0,9,36,40,'#f3d3b7')}
    <path d="M-39-4Q-40-45 1-43Q41-42 39 5Q19-5 5-24Q-7-3-39-4Z" fill="#60443d"/>
    ${circle(-12,11,3,'#493a40')}${circle(12,11,3,'#493a40')}
    ${ellipse(-22,23,7,4,'#e7a0a0')}${ellipse(22,23,7,4,'#e7a0a0')}
    <path d="M-9 27Q0 36 9 27" fill="none" stroke="#a76572" stroke-width="3" stroke-linecap="round"/>
    <path d="M-28-37L-34-61-12-49 0-70 13-49 34-61 28-37Z" fill="#e8b84d" stroke="#c99b39" stroke-width="2"/>
    ${circle(0,-49,4,'#e9dbea')}${circle(-20,-47,3,'#a97cbe')}${circle(20,-47,3,'#a97cbe')}
    <path d="M-15 66Q0 74 15 66" fill="none" stroke="#f3dbb1" stroke-width="3"/>
  </g>`;
}
function bear(x,y,s=1,crown=false) {
  return `<g transform="translate(${x} ${y}) scale(${s})" data-character="teddy">
    ${ellipse(0,91,72,16,'#66555c','opacity=".15"')}${ellipse(0,44,54,61,'#bb865c')}
    ${ellipse(-49,43,18,36,'#c89568','transform="rotate(22 -49 43)"')}${ellipse(49,43,18,36,'#c89568','transform="rotate(-22 49 43)"')}
    ${ellipse(-32,87,27,18,'#c89568')}${ellipse(32,87,27,18,'#c89568')}
    ${circle(-34,-32,22,'#bb865c')}${circle(34,-32,22,'#bb865c')}${circle(-34,-32,12,'#dfb991')}${circle(34,-32,12,'#dfb991')}
    ${ellipse(0,-6,47,43,'#ca966d')}${ellipse(0,12,24,19,'#e4bf96')}
    ${circle(-16,-10,3,'#4f403c')}${circle(16,-10,3,'#4f403c')}${ellipse(0,6,7,5,'#57413b')}
    <path d="M0 11v9m-10-2q10 10 20 0" fill="none" stroke="#715044" stroke-width="2.5"/>
    ${crown ? '<path d="M-43-39L-49-65-23-55 0-78 23-55 49-65 43-39Z" fill="#edc95f" stroke="#c99735" stroke-width="2"/>' + Array.from({length:6},(_,j)=>ribbon(-38+j*15,-39,j%2?blue:red,.19)).join('') : ''}
  </g>`;
}
function ribbon(x,y,c,s=1) {
  return `<g transform="translate(${x} ${y}) scale(${s})" data-ribbon="${c===red?'red':'blue'}"><path d="M-26 0H26V108L0 92-26 108Z" fill="${c}"/><path d="M-18 5v83" stroke="#fff" opacity=".2" stroke-width="5"/><path d="M-26 0q26-8 52 0" fill="none" stroke="#754254" stroke-width="3" opacity=".2"/></g>`;
}
function room(palette='pink') {
  const wall=palette==='pink'?'#f6dfdc':'#ddeaf0';
  return `${rect(0,0,960,720,wall)}${rect(0,532,960,188,'#e7c9af')}
    <path d="M0 534H960" stroke="#fff1df" stroke-width="12"/>
    ${rect(58,63,208,275,'#c4abbc',100)}${rect(72,77,180,247,'#add2d6',90)}
    ${ellipse(163,248,86,67,'#d7e6bf')}${circle(208,126,25,'#f5dd98')}${line(162,86,162,318,'#fcf0dd',9)}${line(77,200,247,200,'#fcf0dd',9)}
    <path d="M61 75Q96 190 56 334H28Q62 197 29 75Z M262 75Q228 190 267 334H295Q260 197 294 75Z" fill="${palette==='pink'?'#c295ac':'#92b1c7'}"/>
    ${ellipse(567,567,335,110,'#bd9fb8')}${ellipse(567,567,313,94,'#ddc8d4')}
    <path d="M344 657Q564 696 791 651" fill="none" stroke="#faf0df" stroke-width="4" stroke-dasharray="7 11"/>`;
}
function ribbonScene(i) {
  let art = room() + girl(i===4?140:160,382,1.1,i===5?'lap':'point');
  if(i<4) {
    art += `${ellipse(820,362,96,28,'#aa8fba')}${bear(820,278,.72)}`;
    if(i===0) art += [0,1,2].map(j=>ribbon(450+j*12,440+j*10,red,.75)).join('') + [0,1,2].map(j=>ribbon(660+j*12,440+j*10,blue,.75)).join('');
    else {
      const colors = i===1?[red,blue,red,blue]:i===2?[red,blue,blue,blue]:[red,blue,red,blue,red];
      art += colors.map((c,j)=>ribbon(340+j*90,470,c,.85)).join('');
      if(i===2) art += `<path d="M230 253Q320 214 391 265T543 249M227 278Q341 250 389 287" fill="none" stroke="#fbf2e9" stroke-width="7" stroke-linecap="round"/>${ellipse(520,628,36,10,red)}${line(516,446,520,423,'#b9864a',4)}`;
      if(i===3) art += rect(766,465,52,96,'none',4,'stroke="#9d809c" stroke-width="3" stroke-dasharray="7 7"') + ribbon(841,405,blue,.65);
    }
  } else {
    art += ellipse(630,588,147,39,'#aa8fba') + bear(630,410,1.5,true);
    if(i===4) art += `<path d="M302 410l18-13m-5 36 24-2m-35 27 19 13" stroke="#c29243" stroke-width="6" stroke-linecap="round"/><path d="M310 630q22-18 40 0m18-19q22-18 40 0" fill="none" stroke="#a67d8b" stroke-width="4"/>`;
    if(i===5) art += ribbon(183,503,'#e4c85a',.2)+ribbon(196,505,'#69a280',.2);
  }
  return art;
}
function mouse(x,y,s=1) {
  return `<g transform="translate(${x} ${y}) scale(${s})" data-character="toy-mouse"><path d="M-25 13q-54 7-37-23" stroke="#c28a93" stroke-width="6" fill="none" stroke-linecap="round"/>${ellipse(0,0,37,24,'#aba0ab')}${circle(14,-18,18,'#b7aeba')}${circle(14,-18,11,'#dfb9c1')}${circle(29,-3,3,'#52464f')}${circle(39,7,4,'#d58b9c')}<path d="M36 9l20-3m-20 6 20 7" stroke="#786573" stroke-width="2"/></g>`;
}
function shapeScene(i) {
  let art = room('blue') + girl(143,392,1.05) + rect(335,196,548,431,'#c8b6a7',13) + rect(321,181,548,431,'#fffcf0',13);
  if(i===0) return art + rect(407,266,132,132,'#6eacd0',1,'data-shape="square"') + '<path d="M690 260L613 391H767Z" fill="#e28f7f" data-shape="triangle"/>' + circle(581,500,67,'#e8bd5a','data-shape="circle"') + mouse(278,553,.9);
  art += rect(468,338,218,218,'#6eacd0',1,'data-shape="square"');
  art += line(479,351,675,351,'#a3c8de',4);
  if(i>=2) art += '<path d="M577 215L443 338H711Z" fill="#e28f7f" stroke="#cb786e" stroke-width="2" data-shape="triangle"/>';
  if(i>=3) art += circle(577,408,43,'#e8bd5a','stroke="#cda74f" stroke-width="4" data-shape="circle"');
  if(i>=4) art += line(762,385,762,553,'#b99c7f',8) + '<path d="M766 380L834 420 766 460Z" fill="#79ab8e" data-shape="triangle"/>';
  if(i===5) art += '<path d="M549 556v-58q28-42 56 0v58M552 562l-51 40m100-40 54 40" stroke="#596e8c" stroke-width="5" fill="none" stroke-linecap="round"/>' + circle(595,526,3,'#596e8c') + mouse(578,552,.5);
  else art += mouse(707,555,.7);
  if(i===1) art += [0,1,2,3].map(j=>circle([577,712,577,441][j],[310,447,582,447][j],8,'#e8bd5a')).join('');
  return art;
}
function leaf(x,y,s=1,flip=1) {
  return `<g transform="translate(${x} ${y}) scale(${s*flip} ${s})"><path d="M0 0Q-69-77-87-40Q-71 9 0 0Z" fill="#6e9e64"/><path d="M-4-3l-62-35" fill="none" stroke="#b8ce89" stroke-width="3"/></g>`;
}
function sunflower(x,y,size=1) {
  return `<g transform="translate(${x} ${y}) scale(${size})">${Array.from({length:12},(_,j)=>ellipse(0,-54,18,44,j%2?'#e8b84b':'#f2cd60',`transform="rotate(${j*30})"`)).join('')}${circle(0,0,43,'#805d43')}${Array.from({length:22},(_,j)=>circle(Math.cos(j*2.4)*Math.sqrt(j)*7,Math.sin(j*2.4)*Math.sqrt(j)*7,2.5,'#bb9663')).join('')}</g>`;
}
function seed(x,y,s=1) {
  return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0-30Q-32-4-15 20Q0 39 15 20Q32-4 0-30Z" fill="#796555"/><path d="M-3-18Q-15 12-3 26m9-43q10 28 0 40" stroke="#e3d4b7" stroke-width="4" fill="none"/></g>`;
}
function gardenScene(i) {
  let art = `${rect(0,0,960,720,'#dbe9d8')}${circle(799,115,53,'#efd58b')}
    <path d="M0 408Q190 322 389 397T960 364V720H0Z" fill="#a8c194"/><path d="M0 508Q360 442 960 526V720H0Z" fill="#86a780"/>
    <path d="M30 344h900M30 397h900" stroke="#d4d4ae" stroke-width="13"/>
    ${Array.from({length:10},(_,j)=>`<path d="M${35+j*97} 440V308l12-16 12 16v132Z" fill="#e7e0bd"/>`).join('')}
    ${ellipse(621,610,181,29,'#557c62','opacity=".22"')}${girl(169,380,1.03,i===4?'lap':'point')}
    <path d="M535 492H731L712 610Q633 637 555 610Z" fill="#c48662"/><path d="M548 500H579L593 617 565 612Z" fill="#dca17b"/>
    ${rect(524,480,218,36,'#d89972',10)}${ellipse(633,484,96,17,'#6b5745')}`;
  if(i===0) art += ellipse(634,484,19,7,'#3f3d32') + seed(634,389,1.3);
  if(i===1) art += `<g transform="translate(355 418) rotate(14)">${rect(-49,-57,92,65,'#789eae',14)}<path d="M42-33L95-72 112-55 44-1Z" fill="#789eae"/><path d="M-46-50q-60-14-46 37q9 20 45 9" fill="none" stroke="#789eae" stroke-width="12"/></g><path d="M456 389l22 21m-1-36 25 21m-48 12 25 20" stroke="#acd4d6" stroke-width="5" stroke-linecap="round"/>`;
  if(i>=2) {
    const top = i===2?413:i===3?273:217;
    art += line(633,483,633,top,'#66885b',i===2?7:12);
    art += leaf(633,i===2?439:397,i===2?.62:1) + leaf(633,i===2?439:339,i===2?.62:1,-1);
    if(i===3) art += rect(751,249,62,248,'#fff4d4',6) + [453,363,273].map(y=>line(762,y,802,y,'#aa8064',5,'data-height-mark="true"')).join('');
    if(i===4) art += ellipse(633,214,40,51,'#6e965f') + '<path d="M633 165Q608 215 633 263Q658 215 633 165Z" fill="#8eae6d"/>';
    if(i===5) art += sunflower(633,209,1);
  }
  if(i===5) {
    art += [305,485,665].map(x=>rect(x,642,145,63,'#f8ecd6',12)).join('');
    art += seed(378,674,.65) + line(556,696,556,661,'#66885b',4) + leaf(556,678,.3) + leaf(556,678,.3,-1) + sunflower(737,673,.27);
    art += '<path d="M459 670l10 6-10 6m180-12 10 6-10 6" fill="none" stroke="#e9e4bb" stroke-width="4"/>';
  }
  return art;
}
const builders = { ribbons: ribbonScene, shapes: shapeScene, garden: gardenScene };
for(const story of context.window.ELLIE_STORIES) for(const [i,p] of story.pages.entries()) {
  const art = builders[story.artStyle](i);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 720" role="img" aria-labelledby="title description">
<title id="title">${esc(story.title+': '+p.title)}</title><desc id="description">${esc(p.alt)}</desc>
<defs><pattern id="paper" width="29" height="31" patternUnits="userSpaceOnUse"><circle cx="4" cy="9" r=".8" fill="#69534d" opacity=".07"/><circle cx="19" cy="24" r=".6" fill="#fff" opacity=".24"/></pattern></defs>
${art}
${rect(0,0,960,720,'url(#paper)')}
</svg>\n`;
  fs.mkdirSync(path.dirname(path.join(root,p.img)),{recursive:true});
  fs.writeFileSync(path.join(root,p.img),svg);
}
console.log('Rendered 18 original Ellie story illustrations.');
