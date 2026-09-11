param([string]$Mood,[string]$Generated)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$outDir=$PSScriptRoot
$source=[System.Drawing.Bitmap]::new("D:\Repo\our-world\public\rooms\study\$Mood.png")
$mask=[System.Drawing.Bitmap]::new('C:\Users\Jackzz\AppData\Local\Temp\claude\D--Repo-our-world\5fc66000-0709-43fd-b121-8852f7b3474f\scratchpad\parts\arm-mask.png')
$candidate=[System.Drawing.Bitmap]::new($Generated)
if($candidate.Width -ne $source.Width -or $candidate.Height -ne $source.Height){throw "Generated dimensions differ: $($candidate.Width)x$($candidate.Height). No resizing authorized."}
$result=$source.Clone([System.Drawing.Rectangle]::new(0,0,$source.Width,$source.Height),[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$changed=0
for($y=0;$y -lt $source.Height;$y++){for($x=0;$x -lt $source.Width;$x++){
 if($mask.GetPixel($x,$y).R -eq 255){$result.SetPixel($x,$y,$candidate.GetPixel($x,$y));$changed++}
}}
$target=Join-Path $outDir "clean-$Mood.png"
$result.Save($target,[System.Drawing.Imaging.ImageFormat]::Png)
$check=[System.Drawing.Bitmap]::new($target)
$outsideDiff=0
for($y=0;$y -lt $source.Height;$y++){for($x=0;$x -lt $source.Width;$x++){
 if($mask.GetPixel($x,$y).R -ne 255 -and $source.GetPixel($x,$y).ToArgb() -ne $check.GetPixel($x,$y).ToArgb()){$outsideDiff++}
}}
$review=[System.Drawing.Bitmap]::new(1020,780)
$g=[System.Drawing.Graphics]::FromImage($review)
$g.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$g.PixelOffsetMode=[System.Drawing.Drawing2D.PixelOffsetMode]::Half
$g.DrawImage($check,[System.Drawing.Rectangle]::new(0,0,1020,780),800,680,340,260,[System.Drawing.GraphicsUnit]::Pixel)
$review.Save((Join-Path $outDir "review-$Mood.png"),[System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose();$review.Dispose();$check.Dispose();$result.Dispose();$candidate.Dispose();$mask.Dispose();$source.Dispose()
@{mood=$Mood;whiteMaskPixels=$changed;outsideChangedPixels=$outsideDiff;width=1586;height=992;reviewWidth=1020;reviewHeight=780}|ConvertTo-Json|Set-Content (Join-Path $outDir "validation-$Mood.json")
if($outsideDiff -ne 0){throw 'Outside-mask validation failed'}
