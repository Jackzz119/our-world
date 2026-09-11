Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Drawing.Drawing2D;
using System.IO;
public class PartsQA {
static Color Green=Color.FromArgb(0,255,0);
static bool IsGreen(Color c) {return c.G>c.R+25 && c.G>c.B+25;}
static Bitmap Extract(string file) {
 var src=new Bitmap(file); int l=src.Width,t=src.Height,r=0,b=0;
 for(int y=0;y<src.Height;y++) for(int x=0;x<src.Width;x++) if(!IsGreen(src.GetPixel(x,y))) {l=Math.Min(l,x);r=Math.Max(r,x);t=Math.Min(t,y);b=Math.Max(b,y);}
 var crop=new Bitmap(r-l+1,b-t+1);
 for(int y=t;y<=b;y++) for(int x=l;x<=r;x++) {var c=src.GetPixel(x,y); if(IsGreen(c)) crop.SetPixel(x-l,y-t,Color.Transparent); else crop.SetPixel(x-l,y-t,Color.FromArgb(c.R,Math.Min(c.G,Math.Max(c.R,c.B)),c.B));}
 Console.WriteLine(Path.GetFileName(file)+" source="+src.Width+"x"+src.Height+" bbox="+l+","+t+","+r+","+b);src.Dispose();return crop;
}
static Bitmap Resize(Bitmap src,int w,int h) {var d=new Bitmap(w,h);using(var g=Graphics.FromImage(d)){g.InterpolationMode=InterpolationMode.HighQualityBicubic;g.DrawImage(src,new Rectangle(0,0,w,h));}return d;}
static void SaveGreen(Bitmap rgba,string file){var d=new Bitmap(rgba.Width,rgba.Height);for(int y=0;y<d.Height;y++)for(int x=0;x<d.Width;x++){var c=rgba.GetPixel(x,y);d.SetPixel(x,y,c.A>=128?Color.FromArgb(c.R,c.G,c.B):Green);}d.Save(file,ImageFormat.Png);d.Dispose();}
static void Checker(Graphics g,Rectangle r){for(int y=r.Y;y<r.Bottom;y+=16)for(int x=r.X;x<r.Right;x+=16){using(var b=new SolidBrush(((x-r.X)/16+(y-r.Y)/16)%2==0?Color.FromArgb(210,210,210):Color.FromArgb(240,240,240)))g.FillRectangle(b,x,y,Math.Min(16,r.Right-x),Math.Min(16,r.Bottom-y));}}
public static void Run(string dir,string raw){
 File.Copy(raw+"exec-d1b89949-b33e-40de-88bf-080e7224528a.png",dir+"platter-attempt-1.png",true);
 File.Copy(raw+"exec-f6958453-add6-47f1-bfea-22f5bc9c5bdb.png",dir+"spindle-attempt-1.png",true);
 File.Copy(raw+"exec-16167e69-2dc6-4875-8091-b3d90c83c68a.png",dir+"spindle-attempt-2.png",true);
 var disc=Resize(Extract(dir+"platter-attempt-1.png"),1000,1000);var p=new Bitmap(1024,1024);
 for(int y=0;y<1000;y++)for(int x=0;x<1000;x++)if((x-499.5)*(x-499.5)+(y-499.5)*(y-499.5)<=250000){var c=disc.GetPixel(x,y);if(c.A<128)c=Color.FromArgb(29,28,28);p.SetPixel(x+12,y+12,Color.FromArgb(c.R,c.G,c.B));}
 var pin=Resize(Extract(dir+"spindle-attempt-2.png"),22,30);var s=new Bitmap(1020,780);using(var g=Graphics.FromImage(s))g.DrawImageUnscaled(pin,477,462);
 SaveGreen(p,dir+"platter.png");SaveGreen(s,dir+"spindle.png");
 var board=new Bitmap(1120,840);using(var g=Graphics.FromImage(board)){g.Clear(Color.FromArgb(35,35,35));var font=new Font("Arial",14);g.DrawString("PLATTER - 50% / 1024 x 1024",font,Brushes.White,20,12);Checker(g,new Rectangle(20,48,512,512));g.DrawImage(p,new Rectangle(20,48,512,512));g.DrawString("SPINDLE - full frame at 50%",font,Brushes.White,570,12);Checker(g,new Rectangle(570,48,510,390));g.DrawImage(s,new Rectangle(570,48,510,390));g.DrawString("Pin detail - 8x, nearest-neighbor",font,Brushes.White,570,470);Checker(g,new Rectangle(570,510,240,280));g.InterpolationMode=InterpolationMode.NearestNeighbor;g.PixelOffsetMode=PixelOffsetMode.Half;g.DrawImage(pin,new Rectangle(602,530,176,240));g.DrawString("Registration bbox: [477,462,499,492)\nTop highlight persists after 2 attempts.\nGreen is keyed out for this review only.\nFinal assets retain pure #00FF00.\nNo shadow added.",font,Brushes.White,new RectangleF(20,605,520,170));}board.Save(dir+"review.png",ImageFormat.Png);
 Console.WriteLine("Final platter: 1024x1024, circle diameter 1000, center (511.5,511.5). Final spindle: 1020x780, bbox [477,462,499,492). Background exact RGB 0,255,0; no mixed green edge pixels by binary key.");
}
}
'@
[PartsQA]::Run('D:\Repo\our-world\codex-visual\20260907-055939Z\','C:\Users\Jackzz\.codex\generated_images\01a07a73-6aab-7413-9dab-d7e74a7fd516\')
