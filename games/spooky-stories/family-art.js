/* Small, original SVG illustrations: no external assets or fonts.
   Page-specific compositions in paper-cut, isometric, and stitched-felt styles. */
(() => {
  let serial = 0;
  const rect = (x,y,w,h,fill,extra='') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;
  const circle = (x,y,r,fill,extra='') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" ${extra}/>`;
  function person(x,y,size,color,kind='child') {
    return `<g transform="translate(${x} ${y}) scale(${size})">
      <ellipse cy="68" rx="27" ry="6" fill="#252942" opacity=".16"/>
      <path d="M-15 42L-17 66M15 42L17 66" stroke="#44415c" stroke-width="9" stroke-linecap="round"/>
      <path d="M-17 6Q0-4 17 6L24 43Q0 50-24 43Z" fill="${color}"/>
      <path d="M-17 12L-30 31M17 12L30 25" stroke="#edbfa0" stroke-width="8" stroke-linecap="round"/>
      ${circle(0,-13,22,'#513b39')}${circle(0,-10,18,'#f1c8aa')}
      <path d="M-19-17Q-12-43 17-23L20-8Q8-24-4-22L-19-9Z" fill="#513b39"/>
      ${kind==='jeannie' ? '<path d="M-18-18Q-31 5-21 16M18-18Q31 5 21 16" fill="none" stroke="#513b39" stroke-width="9"/>' : ''}
      ${circle(-6,-10,1.6,'#403543')}${circle(6,-10,1.6,'#403543')}
      <path d="M-4-2Q0 2 5-2" fill="none" stroke="#9d5961" stroke-width="1.5" stroke-linecap="round"/>
    </g>`;
  }
  function cube(x,y,w=45,h=28,color='#e6ac57') {
    return `<g><path d="M${x} ${y}l${w} -18 ${w} 18 -${w} 18Z" fill="${color}"/>
      <path d="M${x} ${y}l${w} 18v${h}l-${w} -18Z" fill="#a96b42"/>
      <path d="M${x+w} ${y+18}l${w} -18v${h}l-${w} 18Z" fill="#cc8c4c"/>
      <path d="M${x+5} ${y}l${w-5} -15 ${w-5} 15" fill="none" stroke="#fff2ca" opacity=".5"/></g>`;
  }
  function paper(i,id) {
    const tree = (x,y) => `<g transform="translate(${x} ${y})"><path d="M0 0L-38 68H38Z" fill="#378b79"/><path d="M0 0V68H38Z" fill="#246962"/>${rect(-4,68,8,20,'#976647')}</g>`;
    return `${rect(0,0,640,480,'#efe6cd')}
      <path d="M0 160L150 58 270 147 418 50 640 134V480H0Z" fill="#c5d6a3"/>
      <path d="M0 258Q156 102 328 236T640 181V480H0Z" fill="#8bb993"/>
      <g filter="url(#${id}-shadow)"><path d="M48 162L540 126 590 399 77 436Z" fill="#fff6dc"/>
      <path d="M205 154Q419 205 319 269T419 412" fill="none" stroke="#479fae" stroke-width="42"/>
      <path d="M165 201Q200 250 318 269" fill="none" stroke="#479fae" stroke-width="13"/>
      <path d="M205 154Q419 205 319 269T419 412" fill="none" stroke="#a6d9d6" stroke-width="3"/>
      ${i<4 ? '<path d="M306 248l47 3 8 50 -55-3Z" fill="#b6a789" stroke="#826c52" stroke-dasharray="5 4"/>' : ''}
      ${tree(145,148)}${tree(494,215)}${tree(444,117)}
      ${rect(395,292,64,59,'#dcad76')}<path d="M383 294L427 257 472 294Z" fill="#bb6860"/>
      ${circle(399,337,23,'#b07b52','stroke="#674f48" stroke-width="4"')}<path d="M377 337h44M399 315v44M383 321l32 32M383 353l32-32" stroke="#674f48" stroke-width="3"/>
      ${i===1 ? '<path d="M154 219l40-8 9 41-43 4Z" fill="#82b38b"/><path d="M176 214l6 40" stroke="#479fae" stroke-width="16"/>' : ''}
      ${i===2 ? `${rect(186,278,54,54,'#3d88b9')}<path d="M190 293q6-8 12 0t12 0t12 0M190 314q6-8 12 0t12 0t12 0" stroke="#e6f4e9" fill="none" stroke-width="3"/>` : ''}
      ${i===3 ? '<path d="M365 364l47 3 8 50-55-3Z" fill="#82b38b"/><path d="M389 366l8 47" stroke="#479fae" stroke-width="22"/>' : ''}
      ${i===4 ? `${rect(90,327,100,69,'#f1e2b6','rx="5"')}${rect(102,341,19,6,'#479fae')}${rect(102,360,19,6,'#82b38b')}${rect(105,376,12,12,'#b07b52')}<path d="M133 344h42m-42 19h42m-42 19h42" stroke="#8c8169" stroke-width="3"/>` : ''}</g>
      ${person(100,300,.9,'#c57263','jeannie')}${i===4?person(537,320,.8,'#5477a4'):''}
      <path d="M0 452q150-40 250 0t390-14v42H0Z" fill="#3c7c6e"/>`;
  }
  function blocks(i,id) {
    const track = (row,count) => Array.from({length:count},(_,j)=>cube(195+j*61,228+row*45,31,15)).join('');
    return `${rect(0,0,640,480,'#ccdfea')}
      ${Array.from({length:9},(_,j)=>rect(j*84-35,85+(j%3)*16,61,22,'#eff4eb')).join('')}
      <path d="M0 261L228 160 640 256V480H0Z" fill="#679a85"/>
      <path d="M235 188L354 214 281 480H94Z" fill="#4b9fc2"/>
      <path d="M274 228l-48 164m68-137-43 150m-33-81-18 65" stroke="#9fd3e2" stroke-width="5"/>
      <g filter="url(#${id}-shadow)">
      ${cube(451,203,66,25,'#b6bca5')}${rect(488,117,50,112,'#f9edc9')}${rect(488,157,50,18,'#ba675a')}
      ${rect(480,104,66,18,'#4c566a')}${rect(493,77,40,28,i===4?'#ffe993':'#728e9c')}
      <path d="M477 78L512 54 551 78Z" fill="#be6e5b"/>
      ${i===4 ? '<path d="M494 81L289 21V133L494 102Z" fill="#fff1a1" opacity=".5"/>' : ''}
      ${i===0?Array.from({length:6},(_,j)=>cube(330+(j%2)*72,352+Math.floor(j/2)*30,30,16)).join(''):''}
      ${i===1?Array.from({length:3},(_,j)=>cube(380,364-j*27,31,15)).join('')+track(0,3):''}
      ${i>=2?track(0,3)+track(1,3):''}
      </g>
      ${person(i===4?401:103,283,.94,'#c45d4f')}
      ${i===4?person(572,238,.78,'#b895d2','jeannie'):''}
      <g transform="translate(${i===4?440:i===3?238:110} ${i===4?290:i===3?275:383})">
        ${rect(-27,-22,64,25,'#e4bc67','rx="4"')}${circle(-12,8,10,'#344660')}${circle(27,8,10,'#344660')}
        ${i===3?'':rect(-11,-51,32,28,'#f6dbaf')}${i===3?'':'<path d="M5-51v28" stroke="#a67264" stroke-width="4"/>'}
      </g>`;
  }
  function felt(i,id) {
    const stitch = 'stroke="#f4e2bd" stroke-width="2" stroke-dasharray="4 5"';
    const star = (x,y) => `<path d="M${x} ${y-13}l4 9 10 4-10 4-4 10-4-10-10-4 10-4Z" fill="#edc977" ${stitch}/>`;
    return `${rect(0,0,640,480,'#52465f')}${rect(31,33,578,414,'#655a78',`rx="34" ${stitch}`)}
      <g filter="url(#${id}-shadow)">${rect(350,71,200,225,'#b7a4b6','rx="60"')}${rect(363,84,174,200,'#323e60','rx="50"')}
      <path d="M467 106a41 41 0 1 0 42 62 36 36 0 0 1-42-62" fill="#f2d797" ${stitch}/>
      ${star(397,137)}${star(506,214)}${star(403,247)}
      <path d="M355 74q29 113-2 218l-28-2q23-110-2-207Z" fill="#aa7c91" ${stitch}/>
      ${i<4?'<path d="M393 177l-5 14m34-16-5 14m56 47-5 14" stroke="#7eaac4" stroke-width="4" stroke-linecap="round"/>':''}
      ${person(267,223,1.6,'#9cb5a6')}
      <ellipse cx="274" cy="325" rx="105" ry="71" fill="#d1a19a" ${stitch}/>
      ${Array.from({length:8},(_,j)=>rect(183+(j%4)*45,303+Math.floor(j/4)*36,43,34,j%2?'#a7babe':'#e4c79e',`rx="4" ${stitch}`)).join('')}
      ${circle(284,277,29,'#f0cbb1',stitch)}<path d="M276 253q13-13 13 1" fill="none" stroke="#8b6354" stroke-width="3"/>
      ${i===4?'<path d="M268 278q5 5 10 0m10 0q5 5 10 0" fill="none" stroke="#705465" stroke-width="2"/>':circle(275,277,2,'#705465')+circle(293,277,2,'#705465')}
      <path d="M279 290q6 5 12-1" fill="none" stroke="#ab7473" stroke-width="2"/>
      ${i===1||i===3?person(99,296,.9,'#c5aed1','jeannie')+'<path d="M73 327l27-5 27 6v29l-27-6-27 4Z" fill="#f0dfbb" stroke="#a98a85" stroke-width="2"/>':''}
      ${i===1||i===3?person(558,303,.9,'#98afc2'):''}
      ${i===2||i===3?person(433,359,.7,'#d7aa7e'):''}
      ${i===4?'<path d="M64 342h84v-52h18v143H54V290h10Z" fill="#b99e86"/>':''}</g>
      <path d="M66 429Q320 400 576 429" stroke="#c0a5b5" fill="none" stroke-width="3" stroke-dasharray="5 7"/>`;
  }
  window.familyIllustration = (style,page) => {
    const id = `family-art-${++serial}`;
    const art = style==='paper'?paper(page,id):style==='blocks'?blocks(page,id):felt(page,id);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" aria-hidden="true">
      <defs><filter id="${id}-shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#28243d" flood-opacity=".22"/></filter></defs>${art}</svg>`;
  };
})();
