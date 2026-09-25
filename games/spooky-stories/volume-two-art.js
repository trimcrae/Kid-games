/* Ten separate illustration treatments, with a composition for every spread.
   Original SVG art: small, deterministic, scalable, and available offline. */
(() => {
  const previous = window.familyIllustration;
  let serial = 0;
  const rect=(x,y,w,h,c,a='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}" ${a}/>`;
  const dot=(x,y,r,c,a='')=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" ${a}/>`;
  const path=(d,c,a='')=>`<path d="${d}" fill="${c}" ${a}/>`;
  const line=(x,y,X,Y,c,w=3)=>`<path d="M${x} ${y}L${X} ${Y}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
  const star=(x,y,r,c,a='')=>path(Array.from({length:10},(_,j)=>{
    const angle=-Math.PI/2+j*Math.PI/5, radius=j%2?r*.44:r;
    return `${j?'L':'M'}${x+Math.cos(angle)*radius} ${y+Math.sin(angle)*radius}`;
  }).join('')+'Z',c,a);
  const repeat=(n,fn)=>Array.from({length:n},(_,i)=>fn(i)).join('');
  const words=(x,y,t,c='#394455',size=16)=>`<text x="${x}" y="${y}" fill="${c}" font-family="Georgia,serif" font-size="${size}">${t}</text>`;
  function child(x,y,s,c,hair='short',ink='#53434b',skin='#efc6a7') {
    return `<g transform="translate(${x} ${y}) scale(${s})">`+
      path('M-15 23L-18 65M14 23L19 65','none',`stroke="${ink}" stroke-width="9" stroke-linecap="round"`)+
      path('M-18-12Q0-22 18-12L25 34Q0 42-25 34Z',c,`stroke="${ink}" stroke-width="2"`)+
      path('M-17-6L-31 18M17-6L31 12','none',`stroke="${skin}" stroke-width="9" stroke-linecap="round"`)+
      dot(0,-35,24,ink)+
      (hair==='long'?path('M-23-38L-27 4Q-14 12-13-14L15-14Q15 10 27 1L23-38Z',ink):'')+
      dot(0,-31,19,skin)+path('M-21-35Q-18-67 22-43L21-25Q6-43-11-38Z',ink)+
      dot(-7,-31,1.7,ink)+dot(7,-31,1.7,ink)+path('M-5-22Q0-17 6-23','none',`stroke="${ink}" stroke-width="1.5"`)+`</g>`;
  }
  function baby(x,y,s=1,ink='#6a5063') {
    return `<g transform="translate(${x} ${y}) scale(${s})">`+
      `<ellipse cy="29" rx="38" ry="31" fill="#d8ad70" stroke="${ink}" stroke-width="2"/>`+
      dot(0,-5,22,'#f2cdb0')+dot(-7,-6,1.8,ink)+dot(7,-6,1.8,ink)+
      path('M-3-23Q10-36 8-19','none',`stroke="${ink}" stroke-width="2"`)+
      path('M-5 3Q0 10 7 3','none',`stroke="${ink}" stroke-width="2"`)+`</g>`;
  }
  function flower(x,y,r=20,c='#e6b54d') {
    return `<g transform="translate(${x} ${y})">`+line(0,0,0,55,'#668a6c',3)+
      repeat(8,j=>`<ellipse cx="0" cy="-${r*.7}" rx="${r*.38}" ry="${r*.68}" transform="rotate(${j*45})" fill="${c}" opacity=".8"/>`)+dot(0,0,r*.28,'#bb8142')+'</g>';
  }
  function watercolor(i,id) {
    const leaf=repeat(22,j=>`<ellipse cx="${20+j*29}" cy="${320+(j%4)*24}" rx="38" ry="${35+j%3*10}" fill="${['#88a48c','#abc7ab','#6e9b86'][j%3]}" opacity=".48"/>`);
    const greenhouse=path('M384 334V143L486 65 591 143V334Z','#c3d9cf','fill-opacity=".45" stroke="#7f9e95" stroke-width="4"')+
      line(486,65,486,334,'#8da79d',3)+line(387,145,589,145,'#8da79d',3)+line(389,237,589,237,'#8da79d',3);
    const letter=(x,y,reply=false)=>`<g transform="translate(${x} ${y}) rotate(-8)">`+rect(0,0,170,118,'#fff9e9','stroke="#afaaa0" stroke-width="1.3"')+
      (reply?path('M0 0L85 67 170 0M0 118L61 61M170 118L110 61','none','stroke="#aba393" stroke-width="2"'):
      words(19,29,'Come','#6d737a')+words(19,57,'Yellow','#b08a44')+words(19,85,'Afternoon','#6d737a'))+flower(132,65,16)+`</g>`;
    return rect(0,0,640,480,'#f6f0e3')+`<g filter="url(#${id}-wash)">`+
      `<ellipse cx="290" cy="132" rx="338" ry="136" fill="#b4cbd3" opacity=".42"/>`+leaf+
      path('M0 420Q248 325 640 405V480H0Z','#c3bea1','opacity=".7"')+greenhouse+
      repeat(8,j=>flower(330+j*38,309+(j%3)*24,15,j%2?'#edbd53':'#f5d36d'))+
      (i===0?path('M29 181H228V382H29Z','none','stroke="#8b9081" stroke-width="4"')+repeat(7,j=>line(42+j*28,187,42+j*28,380,'#8b9081',3))+letter(200,188):'')+
      (i===1?rect(225,256,71,31,'#ddb458')+line(231,278,228,358,'#b39252',7)+line(287,278,293,358,'#b39252',7)+rect(227,192,64,65,'#edce70')+path('M84 334V295Q117 274 147 295V334Z','#daba58')+path('M141 302L182 277 172 294 148 317Z','#daba58'):'')+
      (i===2?repeat(4,j=>flower(90+j*48,246,24,j<2?'#fffbed':'#eabd47'))+words(436,201,'☕','#7e8b7e',25):'')+
      (i>=3?rect(251,293,256,23,'#d6aeb1')+line(277,312,264,412,'#9b8676',7)+line(479,312,489,412,'#9b8676',7)+dot(379,281,22,'#eee1be')+rect(352,270,50,19,'#e8d9c1','rx="6"')+rect(291,273,22,22,'#fff7df','rx="4"')+rect(452,273,22,22,'#fff7df','rx="4"'):'')+
      (i===4?letter(323,169,true):child(136,325,1,'#a182a6','long','#64564f'))+
      (i===3?child(550,289,1.1,'#91a6b2'):i===4?flower(144,292,45):'')+`</g>`+
      repeat(i<3?21:3,j=>line(20+j*31,45+(j*43)%170,17+j*31,56+(j*43)%170,'#91afb7',1));
  }
  function linocut(i,id) {
    const ink='#183f4e',cream='#f5e8bd',gold='#cf9850';
    const cut=(d,w=3)=>path(d,'none',`stroke="${cream}" stroke-width="${w}"`);
    const lamps=repeat(3,j=>line(239+j*105,130,239+j*105,283,cream,5)+dot(239+j*105,119,j===0?31:19,gold)+dot(239+j*105,119,j===0?23:12,cream));
    if(i===4) return rect(0,0,640,480,cream)+rect(24,24,592,432,ink)+repeat(16,j=>line(29,32+j*27,610,32+j*27,cream,.7))+
      rect(65,311,510,34,gold)+child(163,259,1.05,cream,'short',ink,cream)+child(462,258,1.05,cream,'long',ink,cream)+
      rect(267,287,88,20,cream,'rx="8"')+dot(235,300,13,gold)+line(235,301,202,330,cream,5)+cut('M88 358L79 449M550 358L558 449',9)+words(265,379,'LONG · short · short',cream,18);
    return rect(0,0,640,480,ink)+dot(102,86,49,cream)+repeat(22,j=>cut(`M${12+j*29} ${155+j%4*17}l20-12`,2))+
      repeat(7,j=>path(`M${16+j*103} 130l-40 141h80Z`,ink,`stroke="${cream}" stroke-width="2"`))+
      (i===1?`<g transform="translate(-75 4) scale(1.35)">${lamps}</g>`:lamps)+
      path('M0 381L640 336V480H0Z',cream)+cut('M0 428L640 378',6)+
      `<g transform="translate(${i===3?120:-45} 32)">`+rect(77,280,197,75,gold)+rect(204,235,77,119,gold)+rect(212,244,53,40,ink)+rect(81,245,24,57,gold)+
      rect(274,285,223,71,ink,`stroke="${cream}" stroke-width="4"`)+repeat(4,j=>rect(289+j*49,296,32,28,cream))+
      repeat(5,j=>dot(104+j*86,365,26,ink,`stroke="${cream}" stroke-width="4"`)+dot(104+j*86,365,8,gold))+
      repeat(5,j=>cut(`M${103+j*34} ${213-j*11}q-29-17-1-33q30-20 57-1`,3))+'</g>'+
      (i===0||i===2?child(543,352,.88,cream,'short',ink,cream):'')+
      (i===2?dot(440,217,7,gold)+cut('M427 200l-8-7m37 9 8-5m-24 27-4 9',2):'')+
      repeat(15,j=>line(j*47,466,j*47+30,436,ink,3));
  }
  function stainedglass(i,id) {
    const lead='stroke="#353047" stroke-width="6" stroke-linejoin="round"';
    const panels=repeat(5,j=>path(`M${86+j*91} 143L${130+j*91} 64 ${177+j*91} 143Z`,'#efca5c',lead));
    const shapes=repeat(3,r=>repeat(5,c=>{
      const x=131+c*91,y=190+r*77;
      if(r===0) return dot(x,y,27,i<2&&c===2?'#eee3ce':'#488dc5',lead);
      if(r===1)return path(`M${x} ${y-28}l-29 52h58Z`,'#efca5c',lead);
      return rect(x-25,y-23,50,48,'#c66d75',lead);
    }));
    return rect(0,0,640,480,'#d9c9b4')+rect(66,43,509,342,'#353047','rx="70"')+panels+shapes+
      path(i===3?'M403 355L600 480H402L251 355Z':'M131 350L237 480H37L77 350Z','#6199c5','opacity=".62"')+
      path('M300 350L452 480H251L219 350Z','#edc559','opacity=".65"')+
      (i===1||i===2?rect(195,306,246,126,'#efe2c7',lead)+path('M225 388l31-53 31 53Z','#488dc5',lead)+dot(344,371,32,'#488dc5',lead)+rect(391,329,27,28,'#c66d75',lead):'')+
      (i===0||i>=3?child(i===3?408:153,389,.9,'#ad83b0','long','#514355'):'')+
      (i===3?rect(437,379,159,15,'#82634e')+line(448,392,446,450,'#82634e',7)+line(585,392,590,450,'#82634e',7):'')+
      (i===4?child(463,378,1.03,'#759a92','long','#514355'):'');
  }
  function sock(x,y,c,mark='stripe',s=1) {
    return `<g transform="translate(${x} ${y}) scale(${s})">`+path('M0 0H36V51L58 66Q70 84 45 88L0 71Z',c,'stroke="#71576b" stroke-width="3"')+
      (mark==='sun'?dot(18,34,10,'#e98c39')+repeat(8,j=>{const a=j*Math.PI/4;return line(18+Math.cos(a)*13,34+Math.sin(a)*13,18+Math.cos(a)*18,34+Math.sin(a)*18,'#c77737',2);}):
      mark==='moon'?path('M24 19a14 14 0 1 0 4 27 13 13 0 0 1-4-27','#6976a8'):
      repeat(4,j=>line(4,10+j*12,32,10+j*12,'#eee4cd',4)))+'</g>';
  }
  function crayon(i,id) {
    const pile=repeat(5,j=>sock(216+j%3*102,181+Math.floor(j/3)*110,['#c96262','#769fba','#dcb85a'][j%3],j%3===2?'sun':'stripe',.75));
    return rect(0,0,640,480,'#fff6df')+`<g filter="url(#${id}-rough)" stroke-linecap="round" stroke-linejoin="round">`+
      repeat(32,j=>path(`M${20+j*20} 388q36-19 25 18t29 23`,'none',`stroke="${['#d5b092','#e2c4a6','#b7b8ae'][j%3]}" stroke-width="3" opacity=".5"`))+
      path('M46 243Q115 204 183 245L164 359H67Z','#d7b58b','stroke="#9d8069" stroke-width="4"')+
      repeat(6,j=>line(68+j*18,252,78+j*14,346,'#af8b6d',3))+repeat(4,j=>line(62,267+j*23,173,267+j*23,'#af8b6d',3))+
      (i===0?pile+baby(114,340,1.12)+sock(547,147,'#77a072','stripe',1.3):'')+
      (i===1?sock(213,132,'#c96262')+sock(306,132,'#c96262')+sock(420,132,'#769fba')+sock(513,132,'#769fba')+sock(290,290,'#e2bc60','sun')+sock(420,290,'#e2bc60','moon'):'')+
      (i===2?repeat(4,j=>line(244+j*96,350,244+j*96,260,'#dfb899',17)+sock(223+j*96,174,j<2?'#c96262':'#769fba'))+baby(113,342,1.1)+sock(134,283,'#e2bc60','sun',.65):'')+
      (i===3?path('M229 105Q352 147 519 110L557 306Q351 271 205 302Z','#e6e8d9','stroke="#989e9b" stroke-width="4"')+repeat(8,j=>line(235+j*35,148,218+j*40,270,'#a9b6bf',2))+sock(359,313,'#e2bc60','sun')+sock(462,313,'#e2bc60','sun'):'')+
      (i===4?baby(286,276,1.5)+sock(227,350,'#e2bc60','sun',.7)+sock(314,350,'#e2bc60','sun',.7)+child(514,248,1.4,'#819eac')+sock(469,339,'#77a072','stripe',.65):'')+
      path('M29 59q83-19 157 0m-155 13q87-19 150 0','none','stroke="#d6ae6e" stroke-width="4"')+star(566,72,25,'#e5ba57')+'</g>';
  }
  function rover(x,y,wall=false,parcel=true) {
    return `<g transform="translate(${x} ${y})">`+rect(0,0,132,48,'#e9bb67','stroke="#313753" stroke-width="5"')+
      (wall?path('M0-17H132V15H0Z','#df8562','stroke="#313753" stroke-width="4"'):'')+
      (parcel?rect(39,-40,62,38,'#fbecd0','stroke="#313753" stroke-width="3"')+line(70,-38,70,-3,'#d67065',5):'')+
      dot(25,54,20,'#353956')+dot(107,54,20,'#353956')+dot(25,54,8,'#dce2d5')+dot(107,54,8,'#dce2d5')+'</g>';
  }
  function comic(i,id) {
    const craters=repeat(5,j=>`<ellipse cx="${105+j*135}" cy="${260+(j%3)*50}" rx="${27+j*4}" ry="16" fill="#8682aa" stroke="#464463" stroke-width="3"/>`);
    return rect(0,0,640,480,'#f4dfaa')+rect(17,17,606,446,'#3d426c','stroke="#292b45" stroke-width="7"')+
      rect(22,22,596,191,`url(#${id}-halftone)`)+repeat(12,j=>star(50+j*49,52+(j%4)*34,j%3+3,'#f4e7bb'))+
      path('M22 254Q320 152 618 251V457H22Z','#afa6c4','stroke="#30334e" stroke-width="5"')+craters+
      rect(459,176,118,105,'#eee8ce','stroke="#313753" stroke-width="5"')+path('M444 176L516 126 589 176Z','#df815f','stroke="#313753" stroke-width="5"')+
      rect(497,213,38,67,'#596d9c','stroke="#313753" stroke-width="4"')+
      (i===0?rect(69,228,156,122,'#f4ead0','stroke="#313753" stroke-width="4"')+repeat(5,j=>line(85+j*30,232,85+j*30,345,'#b5b6b0',1))+repeat(4,j=>line(74,250+j*30,220,250+j*30,'#b5b6b0',1))+path('M101 326v-61h61','none','stroke="#dc6f56" stroke-width="7"'):'')+
      (i===1||i===2?`<ellipse cx="318" cy="285" rx="80" ry="37" fill="#6e6c94" stroke="#313753" stroke-width="5"/>`+path('M114 359L179 357 183 221 359 208 415 295','none','stroke="#f9e58e" stroke-width="5" stroke-dasharray="10 7"'):'')+
      rover(i===4?341:i===2?397:215,i===4?335:350,i>=3,i!==3)+
      (i===0||i===3?child(124,366,.83,'#e6bd62','short','#343750'):'')+
      (i===4?child(512,329,.79,'#d48d85','long','#343750')+child(209,333,.79,'#7aadb6','short','#343750'):'')+
      path('M32 37H254L239 101H32Z','#f2c356','stroke="#292b45" stroke-width="4"')+words(48,66,'MISSION', '#313753',21)+words(48,91,i===4?'COMPLETE!':'SANDWICH','#313753',22)+
      (i===1?star(173,210,35,'#edb35d','stroke="#313753" stroke-width="4"')+words(163,222,'!','#313753',34):'');
  }
  function leaf(x,y,s=1,type='narrow',c='#eaf5dc',ink='#4679a6') {
    let shape=type==='round'?'M0 90C-115 51-92-78 0-92C92-78 115 51 0 90Z':
      type==='lobed'?'M0 93L-24 43-87 26-48-5-70-51-18-34 0-103 18-34 70-51 48-5 87 26 24 43Z':
      type==='toothed'?'M0 106L-21 72-12 67-29 47-19 39-32 17-21 9-29-14-17-20-21-48-10-45 0-107 10-45 21-48 17-20 29-14 21 9 32 17 19 39 29 47 12 67 21 72Z':
      'M0 106C-48 25-42-48 0-107C42-48 48 25 0 106Z';
    const clip=`volume-two-leaf-${++serial}`;
    return `<g transform="translate(${x} ${y}) scale(${s})"><defs><clipPath id="${clip}">${path(shape,c)}</clipPath></defs>`+path(shape,c)+line(0,119,0,-88,ink,2)+`<g clip-path="url(#${clip})">`+repeat(7,j=>line(0,70-j*23,-(type==='round'?51:20),40-j*23,ink,1.5)+line(0,61-j*22,type==='round'?51:20,31-j*22,ink,1.5))+'</g></g>';
  }
  function cyanotype(i,id) {
    return rect(0,0,640,480,'#e9edd9')+rect(24,25,592,429,'#205c91')+
      repeat(18,j=>path(`M${34+j*34} 40q16-13 24 4`,'none','stroke="#5287b0" stroke-width="2" opacity=".6"'))+
      rect(83,86,475,292,'#2e6b9e','stroke="#aecfcd" stroke-width="2"')+line(317,88,317,375,'#a8cdcd',3)+
      leaf(202,232,1,i===0?'round':i===4?'lobed':i===1?'narrow':'toothed')+
      leaf(431,232,1,i===4?'lobed':'toothed')+
      (i===2?dot(464,203,57,'none','stroke="#eaf5dc" stroke-width="6"')+line(502,245,540,290,'#eaf5dc',9):'')+
      (i===3?path('M42 439Q179 343 231 46','none','stroke="#eaf5dc" stroke-width="7"')+repeat(4,j=>leaf(83+j*37,378-j*74,.36,'toothed')):'')+
      repeat(4,j=>line(348,329+j*10,516-(j%2)*30,329+j*10,'#a5ccce',1.5))+
      words(105,418,i===0?'SHAPE':i===1?'EDGE':i===2?'VEINS':i===3?'CHECK':'A NEW CASE','#eaf5dc',20)+
      (i===0?words(518,204,'?','#eaf5dc',39):'');
  }
  function mosaic(i,id) {
    const colors=['#c75d51','#e7ba57','#4c8db7'];
    const tiles=repeat(24,j=>{
      const a=j*Math.PI/12,x=320+Math.cos(a)*216,y=250+Math.sin(a)*153;
      return (i===0&&[1,8,15].includes(j)||i===1&&[8,15].includes(j)||i===2&&j===15)?
        rect(x-20,y-16,40,32,'#e9e1c7','stroke="#827c6d" stroke-dasharray="4 4"'):
        `<g transform="translate(${x} ${y}) rotate(${j*15+90})">${rect(-20,-16,40,32,colors[j%3],'stroke="#f4ecd4" stroke-width="3"')}</g>`;
    });
    return rect(0,0,640,480,'#d7c6a8')+rect(22,22,596,436,'#749e96','rx="35"')+
      `<ellipse cx="320" cy="250" rx="255" ry="191" fill="#efe2ba"/>`+
      `<ellipse cx="320" cy="250" rx="135" ry="95" fill="#385f8a" stroke="#f4e6c7" stroke-width="12"/>`+
      `<ellipse cx="320" cy="231" rx="113" ry="62" fill="#6abac2"/>`+
      repeat(5,j=>path(`M${233+j*13} ${216+j*11}q${70-j*8} 30 ${168-j*28} 0`,'none','stroke="#b4ded2" stroke-width="4"'))+tiles+
      (i===1?rect(493,345,40,32,colors[1],'stroke="#f4ecd4" stroke-width="3"')+path('M480 355q-55 20-45 43','none','stroke="#8f735b" stroke-width="3"'):'')+
      (i===2?path('M160 390q30-25 60 0l-8 34h-40Z',colors[0],'stroke="#f4ecd4" stroke-width="4"'):'')+
      (i>=3?flower(187,129,24,'#c75d51')+path('M398 329h74l-17 20h-38Z','#ca8056')+path('M433 282v44h32Z','#f4e1ad')+star(470,112,29,'#e7ba57'):'')+
      rect(22,22,596,436,`url(#${id}-grout)`,'rx="35" pointer-events="none"')+
      (i===4?line(348,191,397,162,'#987047',8):'');
  }
  function charcoal(i,id) {
    const ink='#57585b';
    const gate=rect(181,177,314,211,'none',`stroke="${ink}" stroke-width="4"`)+repeat(8,j=>line(196+j*40,184,196+j*40,386,ink,3))+line(182,377,493,195,ink,5);
    const bell=path('M470 188q0-33 20-33t20 33l11 14h-62Z','#727173',`stroke="${ink}" stroke-width="2"`)+dot(491,208,6,ink);
    return rect(0,0,640,480,'#ece9df')+`<g filter="url(#${id}-rough)">`+
      repeat(65,j=>line((j*79)%640,48+(j*47)%364,(j*79)%640+38,35+(j*47)%364,'#777779',.6))+
      path('M0 293Q204 185 640 235V480H0Z','#cdcdca')+
      gate+(i>=2?bell:'')+
      (i===1||i===4?rect(314,276,249,152,'#eeeae0','stroke="#747474" stroke-width="2"')+
        path('M341 371h173l-32 30h-112Z','none','stroke="#727273" stroke-width="3"')+path('M423 310v56h68Z','none','stroke="#727273" stroke-width="2"')+words(365,328,i===1?'?':'a story','#777779',29):'')+
      (i<4?child(111,342,1,'#94949a','long','#57565c','#dbd5ca'):'')+
      (i===0?child(40,303,1.23,'#b5b2ad','short','#57565c','#dbd5ca'):'')+
      (i===4?line(22,436,291,436,'#797777',9):'')+`</g>`+
      (i<3?repeat(5,j=>path(`M-50 ${100+j*66}Q200 ${30+j*66} 690 ${117+j*66}`,'none',`stroke="#f1f0e8" stroke-width="${42-j*2}" opacity="${i===0?.78:i===1?.65:.42}" filter="url(#${id}-fog)"`)):'');
  }
  function woodblock(i,id) {
    const wind=i>=2&&i<4;
    const kite=(x,y)=>`<g transform="translate(${x} ${y})">`+path('M0-48L39 0 0 61-39 0Z','#b95543','stroke="#624e41" stroke-width="2"')+line(0,-44,0,57,'#efd3a2',2)+line(-36,0,36,0,'#efd3a2',2)+
      path('M0 61Q27 92 2 115T10 174','none','stroke="#765342" stroke-width="2"')+repeat(3,j=>path(`M${j%2?0:10} ${88+j*33}l-13-6v14l26-14v14Z`,'#c47e54'))+'</g>';
    const ky=i===3?102:i===2?248:317,kx=i===3?410:460;
    return rect(0,0,640,480,'#eee1bb')+path('M0 0H640V213Q351 164 0 256Z','#8da8a4')+
      repeat(12,j=>path(`M${-40+j*69} ${36+j%4*22}q32-16 71-4t58 0`,'none','stroke="#e5ddbc" stroke-width="3"'))+
      path('M0 266Q123 104 348 228T640 177V480H0Z','#697e65')+path('M0 357Q271 202 640 295V480H0Z','#b6b172')+
      repeat(25,j=>path(`M${j*31-50} 480Q${j*31+54} 355 ${j*31+161} 304`,'none','stroke="#e7d49b" stroke-width="2"'))+
      (i===1?rect(195,321,213,92,'#b57760')+repeat(6,j=>line(214+j*33,324,214+j*33,410,'#dfc18f',3)):'')+
      (i===0||i===1||i===4?`<g transform="rotate(-63 460 317)">${kite(460,317)}</g>`:kite(kx,ky))+
      child(140,352,.98,'#bd8757','short','#4f5548')+
      (i===0||i===2?child(69,299,1.25,'#72928c','short','#4f5548'):'')+
      (i===1?child(300,278,.9,'#b1a8b0','long','#4f5548')+path('M328 289q-2 24 5 49','none','stroke="#a85165" stroke-width="6"'):'')+
      (i===2?child(554,325,.85,'#b1a8b0','long','#4f5548')+path('M580 335q25-12 45-10','none','stroke="#a85165" stroke-width="6"'):'')+
      (i===3?path('M166 364Q332 335 410 163','none','stroke="#635446" stroke-width="2"'):'')+
      (i===4?child(559,355,.74,'#bb947a','long','#4f5548'):'')+
      repeat(18,j=>path(`M${20+j*35} 467q${wind?32:5}-30 ${wind?43:8}-46`,'none','stroke="#586e51" stroke-width="2"'))+
      (wind?path('M38 173q100-32 166 0m-185 24q137-28 194-4','none','stroke="#eee1bb" stroke-width="3"'):'');
  }
  function lantern(x,y,s,shape,on=true) {
    const gold=on?'#f4ce78':'#827385';
    return `<g transform="translate(${x} ${y}) scale(${s})">`+
      (on?dot(0,0,87,'#bfa274','opacity=".2"')+dot(0,0,66,'#efc789','opacity=".16"'):'')+
      path('M-29-44Q0-66 29-44L36 43Q0 55-36 43Z','#926f80')+
      (shape==='circle'?dot(0,0,24,gold):shape==='star'?star(0,0,28,gold):path('M-25-4L0-28 25-4V28H-25Z',gold))+
      path('M-27-44Q0-99 27-44','none','stroke="#bca495" stroke-width="5"')+'</g>';
  }
  function pointillism(i,id) {
    const scene=rect(0,0,640,480,'#343857')+rect(48,54,203,226,'#77718a','rx="55"')+rect(62,67,175,197,'#555b7c','rx="43"')+
      dot(170,121,36,'#bdb7a5')+path('M0 375Q361 210 640 352V480H0Z','#68607c')+
      lantern(461,211,.65,'house',i!==4)+lantern(324,280,.85,'star',i!==4)+lantern(153,380,1.12,'circle',i!==4)+
      (i===2?path('M253 213L324 203 343 343 271 356Z','#aa8d9c'):'')+
      (i<4?child(554,i===1?193:282,1.25,'#859c9f','long','#504761')+baby(545,i===1?219:308,.75):'')+
      (i===3?child(252,358,.68,'#cb9c90','long','#504761'):'')+
      repeat(11,j=>star(50+j*57,26+(j%3)*13,3,'#d3c7b0'));
    return rect(0,0,640,480,'#2d304c')+`<g opacity=".22">${scene}</g><g mask="url(#${id}-dots)">${scene}</g>`+
      repeat(140,j=>dot((j*137)%630+5,(j*71)%465+7,.8+(j%3)*.35,['#c3b2a7','#8ba0b2','#a495b8'][j%3],'opacity=".38"'));
  }
  const painters={watercolor,linocut,stainedglass,crayon,comic,cyanotype,mosaic,charcoal,woodblock,pointillism};
  window.familyIllustration=(style,page)=>{
    if(!painters[style]) return previous(style,page);
    const id=`volume-two-${++serial}`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" aria-hidden="true" data-art-style="${style}"><defs>
      <filter id="${id}-wash" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".025" numOctaves="2" seed="8" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="3"/></filter>
      <filter id="${id}-rough" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".07" numOctaves="2" seed="17" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="2.7"/></filter>
      <filter id="${id}-fog"><feGaussianBlur stdDeviation="13"/></filter>
      <pattern id="${id}-halftone" width="9" height="9" patternUnits="userSpaceOnUse">${dot(3,3,2,'#8181a0','opacity=".45"')}</pattern>
      <pattern id="${id}-grout" width="13" height="13" patternUnits="userSpaceOnUse">${path('M0 13V0H13','none','stroke="#e8e0c5" stroke-width="1.4" opacity=".65"')}</pattern>
      <pattern id="${id}-dotpattern" width="7" height="7" patternUnits="userSpaceOnUse">${dot(2.5,2.5,2.25,'white')}</pattern>
      <mask id="${id}-dots">${rect(0,0,640,480,`url(#${id}-dotpattern)`)}</mask>
      </defs>${painters[style](page,id)}</svg>`;
  };
})();
