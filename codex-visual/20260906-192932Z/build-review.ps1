Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Drawing.Drawing2D;
public class ReviewBuilder {
 public static string Build(string originalPath,string platePath,string partPath,string dir,string mood) {
  using(var original=new Bitmap(originalPath))
  using(var rp=new Bitmap(platePath))
  using(var rt=new Bitmap(partPath))
  using(var plate=new Bitmap(1020,780))
  using(var part=new Bitmap(1020,780))
  using(var check=new Bitmap(1020,780))
  using(var comp=new Bitmap(1020,780)) {
   using(var g=Graphics.FromImage(plate)){g.InterpolationMode=InterpolationMode.HighQualityBicubic;g.DrawImage(rp,0,0,1020,780);}
   using(var g=Graphics.FromImage(part)){g.InterpolationMode=InterpolationMode.HighQualityBicubic;g.DrawImage(rt,0,0,1020,780);}
   long sum=0,count=0,over=0,greens=0,exact=0; int max=0,minX=1020,minY=780,maxX=0,maxY=0;
   for(int y=0;y<780;y++)for(int x=0;x<1020;x++) {
    Color p=part.GetPixel(x,y), a=plate.GetPixel(x,y), o=original.GetPixel(x,y);
    bool green=p.G-Math.Max(p.R,p.B)>80;
    if(green){greens++;if(p.R==0&&p.G==255&&p.B==0)exact++;part.SetPixel(x,y,Color.Lime);int v=((x/20+y/20)%2==0)?230:190;check.SetPixel(x,y,Color.FromArgb(v,v,v));comp.SetPixel(x,y,a);}
    else {minX=Math.Min(minX,x);maxX=Math.Max(maxX,x);minY=Math.Min(minY,y);maxY=Math.Max(maxY,y);check.SetPixel(x,y,p);comp.SetPixel(x,y,p);}
    if(!(x>=475&&x<870&&y>=440&&y<725)) {int r=Math.Abs(a.R-o.R),g=Math.Abs(a.G-o.G),b=Math.Abs(a.B-o.B);int m=Math.Max(r,Math.Max(g,b));sum+=r+g+b;count++;max=Math.Max(max,m);if(m>2)over++;}
   }
   plate.Save(dir+"/plate-"+mood+".png",ImageFormat.Png);part.Save(dir+"/part-tonearm-"+mood+".png",ImageFormat.Png);
   using(var board=new Bitmap(4080,820))using(var g=Graphics.FromImage(board))using(var font=new Font("Arial",16)){
    g.Clear(Color.FromArgb(30,30,30));Bitmap[] arr={original,plate,check,comp};string[] labels={"INPUT","GENERATED PLATE","GENERATED PART / CHECKER","PLATE + PART (NO ALIGNMENT)"};
    for(int i=0;i<4;i++){g.DrawImageUnscaled(arr[i],i*1020,40);g.DrawString(labels[i],font,Brushes.White,i*1020+12,8);}board.Save(dir+"/review-"+mood+".png",ImageFormat.Png);
   }
   return String.Format(System.Globalization.CultureInfo.InvariantCulture,"{0},{1}x{2},{3:F3},{4},{5:F3},{6},{7},{8},{9},{10:F6}",mood,rp.Width,rp.Height,(double)sum/count/3,max,100.0*over/count,minX,minY,maxX+1,maxY+1,(double)exact/greens);
  }
 }
}
'@
$outDir=$PSScriptRoot
$manifest=Get-Content -Raw -Encoding utf8 "$outDir/generation-manifest.json" | ConvertFrom-Json
$second=Get-Content -Raw -Encoding utf8 "$outDir/attempt2-manifest.json" | ConvertFrom-Json
$referenceDir='C:\Users\Jackzz\AppData\Local\Temp\claude\D--Repo-our-world\5fc66000-0709-43fd-b121-8852f7b3474f\scratchpad\parts\gen'
$rows=@('mood,raw_plate_size,safe_rgb_mae,max_channel_error,safe_pixels_over_2_percent,part_min_x,part_min_y,part_max_x,part_max_y,raw_exact_green_fraction')
foreach($mood in @('golden','twilight','night')){
 $plate=$manifest."plate-$mood"; $part=$manifest."part-$mood"
 Copy-Item -LiteralPath $plate -Destination "$outDir/raw-plate-$mood-attempt1.png"
 Copy-Item -LiteralPath $part -Destination "$outDir/raw-part-$mood-attempt1.png"
 $part=$second.$mood
 Copy-Item -LiteralPath $part -Destination "$outDir/raw-part-$mood-attempt2.png"
 $rows += [ReviewBuilder]::Build("$referenceDir/crop-$mood.png",$plate,$part,$outDir,$mood)
}
$rows | Set-Content -Encoding utf8 "$outDir/metrics.csv"
$rows
