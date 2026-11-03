"""Generate all signage from vector primitives and type. Never reads photos."""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import math
ROOT=Path(__file__).resolve().parents[2]
FONT='/usr/share/fonts/truetype/open-sans/OpenSans-Bold.ttf'
REG='/usr/share/fonts/truetype/open-sans/OpenSans-Regular.ttf'
NAMES=['logo','welcome','exterior','exit','motto','tenets','olympic','rings','us','korea','tenetPoster','promise','award','abstract','best','gear','office','training','street']
ATLAS=Image.new('RGB',(2560,2048),'#d8dfde')

def text(d,xy,s,size,fill='#293637',font=FONT):
    f=ImageFont.truetype(font,size);d.text(xy,s,font=f,fill=fill,anchor='mm')
def fit(d,xy,s,width,size=70,fill='#293637'):
    while d.textbbox((0,0),s,font=ImageFont.truetype(FONT,size))[2]>width and size>10:size-=1
    text(d,xy,s,size,fill)
def logo(im,box):
    d=ImageDraw.Draw(im);x,y,r=box
    d.ellipse((x-r,y-r,x+r,y+r),fill='#1b2531',outline='#fff8e5',width=max(2,int(r*.025)))
    rr=r*.76
    d.ellipse((x-rr,y-rr,x+rr,y+rr),fill='#c93b43')
    d.pieslice((x-rr,y-rr,x+rr,y+rr),0,180,fill='#214a87')
    # An abstract kicking dobok emblem, drawn from geometric shapes.
    def p(points):return [(x+a*r,y+b*r) for a,b in points]
    d.ellipse((x-.13*r,y-.47*r,x+.07*r,y-.27*r),fill='#fff8e9')
    d.polygon(p([(-.08,-.24),(.12,-.18),(.08,.12),(-.12,.22),(-.24,.05)]),fill='#fff8e9')
    d.line(p([(-.1,-.16),(-.31,-.02),(-.53,-.08)]),fill='#fff8e9',width=int(r*.14))
    d.line(p([(.04,-.12),(.27,-.29),(.36,-.4)]),fill='#fff8e9',width=int(r*.12))
    d.polygon(p([(.03,.06),(.2,.16),(.62,-.12),(.68,-.02),(.25,.34),(.04,.3)]),fill='#fff8e9')
    d.polygon(p([(-.07,.09),(.08,.19),(-.24,.57),(-.42,.6),(-.42,.51)]),fill='#fff8e9')
    for s,yy in [("MASTER KIM'S",y-r*.86),('TAE KWON DO',y+r*.86)]:fit(d,(x,yy),s,r*1.32,int(r*.15),'#fff9ed')

def panel(kind):
    ratio={'exterior':12,'welcome':5.5,'exit':2.7,'motto':13.6,'tenets':35,'olympic':24,'rings':2.35,'us':.69,'korea':.75,'tenetPoster':.58,'promise':11,'award':.8,'abstract':1.4,'best':5,'gear':5.6,'office':5.6,'training':3.2,'street':4}.get(kind,1)
    w=1600 if ratio>6 else 900;h=int(w/ratio)
    im=Image.new('RGB',(w,h),'#d2dad9');d=ImageDraw.Draw(im)
    if kind=='logo':logo(im,(w/2,h/2,w*.49))
    elif kind in ('exterior','welcome'):
        d.rectangle((0,0,w,h),fill='#f3efe3' if kind=='welcome' else '#1e3d56')
        fit(d,(w*.5,h*.36),"MASTER KIM'S",w*.9,int(h*.38),'#233843' if kind=='welcome' else '#f7e9be')
        fit(d,(w*.5,h*.77),'TAE KWON DO INSTITUTE',w*.9,int(h*.20),'#435b68' if kind=='welcome' else '#f3eee0')
    elif kind=='exit':
        d.rectangle((0,0,w,h),fill='#e8e8d8');text(d,(w/2,h/2),'EXIT',int(h*.75),'#ae3336')
    elif kind=='motto':
        fit(d,(w/2,h*.3),'A BLACK BELT IS A WHITE BELT',w*.93,int(h*.35));fit(d,(w/2,h*.77),'THAT NEVER GAVE UP!',w*.9,int(h*.35))
    elif kind=='tenets':fit(d,(w/2,h/2),'COURTESY  •  INTEGRITY  •  PERSEVERANCE  •  SELF CONTROL  •  INDOMITABLE SPIRIT',w*.98,int(h*.8))
    elif kind=='olympic':
        d.rectangle((0,0,w,h),fill='#bf343a');fit(d,(w/2,h/2),'Official Sport of the Summer Olympic Games',w*.97,int(h*.71),'#f7d769')
    elif kind=='rings':
        for x,y,c in [(.28,.4,'#2865a4'),(.5,.4,'#41494a'),(.72,.4,'#be3c43'),(.39,.6,'#ddb948'),(.61,.6,'#389762')]:
            r=h*.26;d.ellipse((x*w-r,y*h-r,x*w+r,y*h+r),outline=c,width=int(h*.04))
        fit(d,(w/2,h*.4),'U S A',w*.65,int(h*.28))
    elif kind=='us':
        d.rectangle((0,0,w,h),fill='#f3eee4')
        for i in range(0,13,2):d.rectangle((i*w/13,0,(i+1)*w/13,h),fill='#a93944')
        d.rectangle((0,0,w*.54,h*.45),fill='#243f69')
        for x in range(6):
            for y in range(8):
                cx=(x+.5)*w*.54/6;cy=(y+.5)*h*.45/8;r=w*.016
                d.regular_polygon((cx,cy,r),5,fill='#f5eee0')
    elif kind=='korea':
        d.rectangle((0,0,w,h),fill='#f3eee4');x,y=w/2,h/2;r=w*.24
        d.ellipse((x-r,y-r,x+r,y+r),fill='#c93f49');d.pieslice((x-r,y-r,x+r,y+r),0,180,fill='#29548d')
        d.ellipse((x-r,y-r/2,x,y+r/2),fill='#c93f49');d.ellipse((x,y-r/2,x+r,y+r/2),fill='#29548d')
        for sx,sy,pattern in [(-1,-1,[0,0,0]),(1,1,[1,1,1]),(1,-1,[1,0,1]),(-1,1,[0,1,0])]:
            tile=Image.new('RGBA',(220,140));td=ImageDraw.Draw(tile)
            for k,broken in enumerate(pattern):
                if broken:
                    td.rectangle((10,10+k*43,95,33+k*43),fill='#20272b');td.rectangle((120,10+k*43,210,33+k*43),fill='#20272b')
                else:td.rectangle((10,10+k*43,210,33+k*43),fill='#20272b')
            tile=tile.rotate(-sx*sy*36,expand=True);im.paste(tile,(int(x+sx*w*.29-tile.width/2),int(y+sy*h*.29-tile.height/2)),tile)
    elif kind=='tenetPoster':
        d.rectangle((0,0,w,h),fill='#293b4a');d.rectangle((15,15,w-15,h-15),outline='#c7b274',width=9)
        logo(im,(w/2,h*.35,w*.32));d=ImageDraw.Draw(im)
        for s,yy in [('RESPECT',.64),('FOCUS',.73),('PRACTICE',.82)]:fit(d,(w/2,h*yy),s,w*.8,int(w*.11),'#f4ead5')
    elif kind=='promise':fit(d,(w/2,h/2),'BLACK BELT PLEDGE  •  Do your best every day',w*.96,int(h*.57))
    elif kind=='award':
        d.rectangle((0,0,w,h),fill='#7a5836');d.rectangle((20,20,w-20,h-20),outline='#d2b879',width=15);d.rectangle((45,45,w-45,h-45),fill='#273536')
        d.regular_polygon((w/2,h*.22,w*.12),5,fill='#c2a458')
        for s,yy in [('EXCELLENCE',.4),('TAEKWONDO',.51),('DEDICATION',.66),('RESPECT',.75)]:fit(d,(w/2,h*yy),s,w*.75,int(w*.065),'#e3d3ac')
        d.line((w*.22,h*.85,w*.78,h*.85),fill='#c4aa6c',width=4)
    elif kind=='abstract':
        d.rectangle((0,0,w,h),fill='#34414b');d.rectangle((15,15,w-15,h-15),outline='#b8ac84',width=12)
        for i,c in enumerate(['#e0d7c4','#bd4546','#295183']):d.polygon([(w*(.1+i*.25),h*.75),(w*(.3+i*.25),h*.2),(w*(.45+i*.23),h*.75)],fill=c)
        fit(d,(w/2,h*.9),'SPIRIT • COMMUNITY',w*.86,int(h*.075),'#e8ddc3')
    elif kind=='best':
        d.rectangle((0,0,w,h),fill='#f2efe1');d.rectangle((5,5,w-5,h-5),outline='#9d9987',width=5);fit(d,(w/2,h/2),'Do Your Best Today!',w*.9,int(h*.55))
    elif kind in ['gear','office']:
        d.rectangle((0,0,w,h),fill='#ede9dd');fit(d,(w/2,h/2),'SHOES & GEAR' if kind=='gear' else 'OFFICE',w*.9,int(h*.55))
    elif kind=='training':
        d.rectangle((0,0,w,h),fill='#31598a');fit(d,(w/2,h*.34),'RESPECT • FOCUS • PRACTICE',w*.94,int(h*.19),'#d9e5e8');fit(d,(w/2,h*.68),'Count your steps: 1  2  3  4',w*.9,int(h*.17),'#e5d19a')
    elif kind=='street':
        d.rectangle((0,0,w,h),fill='#1d4357');fit(d,(w/2,h*.32),"MASTER KIM'S →",w*.9,int(h*.30),'#f3e5b9');fit(d,(w/2,h*.76),'Taekwondo • Come on in',w*.9,int(h*.18),'#d9e6e5')
    return im.resize((512,512),Image.Resampling.LANCZOS)
for i,name in enumerate(NAMES):ATLAS.paste(panel(name),((i%5)*512,(i//5)*512))
p=ROOT/'house-test/master-kim/signs.png';p.parent.mkdir(exist_ok=True);ATLAS.save(p,optimize=True)
print(p, p.stat().st_size)
