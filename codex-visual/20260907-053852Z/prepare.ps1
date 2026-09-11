Add-Type -AssemblyName System.Drawing
$outDir = $PSScriptRoot
$paths = Get-Content -Raw "$outDir/generated-paths.json" | ConvertFrom-Json
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
public class PartQA {
 public static string Process(string src,string dst,int w,int h,bool green) {
  using(var im= new Bitmap(src)) using(var b=new Bitmap(w,h)) {
   using(var g=Graphics.FromImage(b)){g.InterpolationMode=InterpolationMode.HighQualityBicubic; g.DrawImage(im,0,0,w,h);}
   int count=0, fringe=0,x0=w,y0=h,x1=0,y1=0;
   if(green) for(int y=0;y<h;y++)for(int x=0;x<w;x++) {
    var c=b.GetPixel(x,y);
    if(c.G>c.R+12 && c.G>c.B+12){ b.SetPixel(x,y,Color.FromArgb(0,255,0));count++; }
    else { if(c.G>Math.Max(c.R,c.B)) {b.SetPixel(x,y,Color.FromArgb(c.R,Math.Max(c.R,c.B),c.B));fringe++;} x0=Math.Min(x0,x);y0=Math.Min(y0,y);x1=Math.Max(x1,x);y1=Math.Max(y1,y); }
   }
   b.Save(dst,System.Drawing.Imaging.ImageFormat.Png);
   return String.Format("source={0}x{1}; final={2}x{3}; pure_green={4}; despilled={5}; foreground_bbox={6},{7},{8},{9}",im.Width,im.Height,w,h,count,fringe,x0,y0,x1,y1);
  }
 }
 public static void Board(string dir){
  using(var b=new Bitmap(1536,564)) using(var g=Graphics.FromImage(b)) {
   g.Clear(Color.FromArgb(32,32,36));
   string[] names={"machine-twilight","platter","tonearm"};
   for(int i=0;i<3;i++){
    for(int y=44;y<556;y+=16)for(int x=i*512;x<(i+1)*512;x+=16){using(var br=new SolidBrush(((x/16+y/16)%2==0)?Color.FromArgb(185,185,185):Color.FromArgb(225,225,225)))g.FillRectangle(br,x,y,16,16);}
    using(var im=new Bitmap(dir+"/"+names[i]+".png")){
     if(i>0)im.MakeTransparent(Color.FromArgb(0,255,0));
     int height=(i==1)?512:392;g.DrawImage(im,new Rectangle(i*512,44+(512-height)/2,512,height));
    }
    using(var f=new Font("Arial",16))g.DrawString(names[i],f,Brushes.White,i*512+12,10);
   }
   b.Save(dir+"/review.png",System.Drawing.Imaging.ImageFormat.Png);
  }
 }
}
'@
$stats=@()
foreach($m in @('golden','twilight','night')) {
 Copy-Item -LiteralPath $paths.$m -Destination "$outDir/machine-$m-attempt1.png"
 $stats += "$m : " + [PartQA]::Process($paths.$m,"$outDir/machine-$m.png",1020,780,$false)
}
Copy-Item -LiteralPath $paths.platter -Destination "$outDir/platter-attempt1.png"
Copy-Item -LiteralPath $paths.tonearm -Destination "$outDir/tonearm-attempt1.png"
Copy-Item -LiteralPath $paths.tonearm2 -Destination "$outDir/tonearm-attempt2.png"
$stats += 'platter : ' + [PartQA]::Process($paths.platter,"$outDir/platter.png",1024,1024,$true)
$stats += 'tonearm : ' + [PartQA]::Process($paths.tonearm2,"$outDir/tonearm.png",1020,780,$true)
[PartQA]::Board($outDir)
$stats | Set-Content -Encoding utf8 "$outDir/qa-metrics.txt"
$stats
