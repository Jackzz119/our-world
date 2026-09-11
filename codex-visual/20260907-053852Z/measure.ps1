Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System; using System.Drawing; using System.IO;
public class MeasureParts {
 public static void Run(string dir,string refs){
  using(var wr=new StreamWriter(dir+"/qa-registration.txt")){
   foreach(string m in new[]{"golden","twilight","night"}) using(var a=new Bitmap(refs+"/crop-"+m+".png"))using(var b=new Bitmap(dir+"/machine-"+m+".png")){
    double err=0;int n=0;
    for(int y=20;y<320;y++)for(int x=400;x<850;x++){var c=a.GetPixel(x,y);var d=b.GetPixel(x,y);err+=Math.Abs(c.R-d.R)+Math.Abs(c.G-d.G)+Math.Abs(c.B-d.B);n+=3;}
    wr.WriteLine(m+" unchanged lid ROI [400,20,850,320] RGB mean absolute difference: "+(err/n).ToString("F2")+" /255. This is photometric difference, NOT geometric registration error.");
   }
   using(var b=new Bitmap(dir+"/platter.png")){
    double lo=255,hi=0;
    for(int s=0;s<12;s++){double sum=0;int n=0;for(int r=260;r<440;r++)for(int t=0;t<30;t++){double angle=(s*30+t)*Math.PI/180;var c=b.GetPixel(511+(int)(r*Math.Cos(angle)),510+(int)(r*Math.Sin(angle)));sum+=(c.R+c.G+c.B)/3.0;n++;}double v=sum/n;lo=Math.Min(lo,v);hi=Math.Max(hi,v);wr.WriteLine("platter angular sector "+s+" mean RGB intensity: "+v.ToString("F2"));}
    wr.WriteLine("platter sector range: "+(hi-lo).ToString("F2")+" /255; strict angular uniformity requires zero, watercolor texture can produce variation.");
   }
   using(var a=new Bitmap(refs+"/crop-twilight.png"))using(var b=new Bitmap(dir+"/tonearm.png"))using(var g=Graphics.FromImage(a)){
    b.MakeTransparent(Color.FromArgb(0,255,0));g.DrawImageUnscaled(b,0,0);a.Save(dir+"/registration-overlay.png",System.Drawing.Imaging.ImageFormat.Png);
   }
  }
 }
}
'@
[MeasureParts]::Run('D:/Repo/our-world/codex-visual/20260907-053852Z','C:/Users/Jackzz/AppData/Local/Temp/claude/D--Repo-our-world/5fc66000-0709-43fd-b121-8852f7b3474f/scratchpad/parts/gen2')
Get-Content D:/Repo/our-world/codex-visual/20260907-053852Z/qa-registration.txt
