import sys,glob,os
from PIL import Image, ImageDraw
ids=sys.argv[2].split(','); out=sys.argv[1]
n=len(ids)
W=Image.new('RGB',(n*380,420),'black'); d=ImageDraw.Draw(W)
for i,e in enumerate(ids):
    for j,suf in enumerate(['0_0','1_0']):
        f=f'shots/all/{e}_{suf}.png'
        if not os.path.exists(f): continue
        im=Image.open(f); w,h=im.size
        im=im.resize((190,int(h*190/w))); W.paste(im.crop((0,0,190,400)),(i*380+j*190,18))
    d.text((i*380+4,3),e,fill='white')
W.save(out)
