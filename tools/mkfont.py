from PIL import Image, ImageDraw, ImageFont
import json,sys
chars=''.join(chr(c) for c in range(32,127))
def build(path,size,name):
    f=ImageFont.truetype(path,size)
    asc,desc=f.getmetrics()
    H=asc+desc
    glyphs={}
    for ch in chars:
        adv=round(f.getlength(ch))
        im=Image.new('1',(adv+4,H),0)
        d=ImageDraw.Draw(im); d.fontmode='1'
        d.text((0,0),ch,font=f,fill=1)
        rows=[]
        for y in range(H):
            v=0
            for x in range(adv+4):
                if im.getpixel((x,y)): v|=1<<x
            rows.append(v)
        glyphs[ch]=[adv,rows]
    # trim common empty top/bottom rows
    top=min((i for g in glyphs.values() for i,r in enumerate(g[1]) if r),default=0)
    bot=max((i for g in glyphs.values() for i,r in enumerate(g[1]) if r),default=H-1)
    for g in glyphs.values(): g[1]=g[1][top:bot+1]
    return {'h':bot-top+1,'g':glyphs}
out={'big':build('PressStart2P-Regular.ttf',8,'big'),'small':build('Silkscreen-Regular.ttf',8,'small')}
for k,v in out.items():
    print(k,v['h'],v['g']['A'][0],v['g']['g'])
    for r in v['g']['A'][1]: print(''.join('#' if r>>x&1 else '.' for x in range(10)))
    for r in v['g']['g'][1]: print(''.join('#' if r>>x&1 else '.' for x in range(10)))
open('../js_font.json','w').write(json.dumps(out,separators=(',',':')))
