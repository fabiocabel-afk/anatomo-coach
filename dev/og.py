# imagem de compartilhamento (WhatsApp, Teams...): 1200x630
from PIL import Image, ImageDraw, ImageFont, ImageFilter
W,H=1200,630
F='/usr/share/fonts/opentype/inter/'
def fonte(n,s): return ImageFont.truetype(F+n,s)
# fundo: roxo bem escuro com brilho atrás do ícone
bg=Image.new('RGB',(W,H),(12,7,20))
gl=Image.new('L',(W,H),0); d=ImageDraw.Draw(gl)
d.ellipse((40,20,620,600),fill=255); gl=gl.filter(ImageFilter.GaussianBlur(120))
cor=Image.new('RGB',(W,H),(88,34,140)); bg=Image.composite(cor,bg,gl.point(lambda v:int(v*0.55)))
gl2=Image.new('L',(W,H),0); d=ImageDraw.Draw(gl2); d.ellipse((760,380,1320,760),fill=255); gl2=gl2.filter(ImageFilter.GaussianBlur(140))
bg=Image.composite(Image.new('RGB',(W,H),(236,53,125)),bg,gl2.point(lambda v:int(v*0.18)))
# ícone com cantos arredondados, sombra e contorno suave
ic=Image.open('assets/icon-512.png').convert('RGBA').resize((470,470),Image.LANCZOS)
m=Image.new('L',ic.size,0); ImageDraw.Draw(m).rounded_rectangle((0,0,469,469),radius=96,fill=255)
x0,y0=70,80
sh=Image.new('L',(W,H),0); ImageDraw.Draw(sh).rounded_rectangle((x0-6,y0+14,x0+476,y0+496),radius=100,fill=200); sh=sh.filter(ImageFilter.GaussianBlur(28))
bg=Image.composite(Image.new('RGB',(W,H),(0,0,0)),bg,sh)
borda=Image.new('RGBA',(W,H),(0,0,0,0)); ImageDraw.Draw(borda).rounded_rectangle((x0-3,y0-3,x0+472,y0+472),radius=99,outline=(157,95,224,160),width=3)
bg=bg.convert('RGBA'); bg.alpha_composite(borda); bg.paste(ic,(x0,y0),m)
d=ImageDraw.Draw(bg)
# logotipo: Anato (branco) Motion (roxo)
tx=592; f1=fonte('InterDisplay-Bold.otf',84)
d.text((tx,200),'Anato',font=f1,fill=(255,255,255))
wa=d.textlength('Anato',font=f1)
d.text((tx+wa,200),'Motion',font=f1,fill=(157,95,224))
# linha e frase
d.rounded_rectangle((tx+4,318,tx+84,324),radius=3,fill=(157,95,224))
f2=fonte('Inter-Medium.otf',34)
d.text((tx+2,350),'Seu treino guiado',font=f2,fill=(236,230,245))
d.text((tx+2,394),'com corpo humano em 3D',font=f2,fill=(236,230,245))
# selos
f3=fonte('Inter-SemiBold.otf',20); x=tx+2; y=470
for t in ['Músculos em 3D','Contagem por voz','Histórico']:
    w=d.textlength(t,font=f3)+30
    d.rounded_rectangle((x,y,x+w,y+42),radius=21,fill=(40,24,62),outline=(110,62,170),width=2)
    d.text((x+15,y+10),t,font=f3,fill=(222,206,245)); x+=w+10
assert x<W-30, x
bg.convert('RGB').save('assets/og-image.jpg',quality=88,optimize=True,progressive=True)
print('ok')
