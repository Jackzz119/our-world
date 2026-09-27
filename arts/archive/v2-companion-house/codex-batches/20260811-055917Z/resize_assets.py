"""Downsample built-in ImageGen PNGs to the required 256x256 deliverables.

Pure-standard-library area resampling keeps the workflow independent of Pillow.
"""
from __future__ import annotations

import struct
import zlib
from pathlib import Path


ROOT = Path(r"D:\Repo\our-world\codex-visual\20260811-055917Z")
JOBS = {
    Path(r"C:\Users\Jackzz\.codex\generated_images\019fef67-64a8-7741-8457-e2ec83d93c2b\exec-21f26c22-7fe4-4bb1-8672-ce798687bd70.png"): ROOT / "avatar-blue.png",
    Path(r"C:\Users\Jackzz\.codex\generated_images\019fef67-64a8-7741-8457-e2ec83d93c2b\exec-2394deb4-8f29-4383-88e6-a86e42dcf136.png"): ROOT / "avatar-pink.png",
    Path(r"C:\Users\Jackzz\.codex\generated_images\019fef67-64a8-7741-8457-e2ec83d93c2b\exec-1f7fa54d-d0dd-4d73-8566-a18904137605.png"): ROOT / "disc-cover.png",
}


def read_png(path):
    data = path.read_bytes(); pos = 8; idat = []
    assert data[:8] == b"\x89PNG\r\n\x1a\n"
    while pos < len(data):
        n = struct.unpack(">I", data[pos:pos+4])[0]
        kind = data[pos+4:pos+8]; payload = data[pos+8:pos+8+n]; pos += 12+n
        if kind == b"IHDR":
            w,h,depth,ctype,_,_,interlace = struct.unpack(">IIBBBBB",payload)
        elif kind == b"IDAT": idat.append(payload)
        elif kind == b"IEND": break
    assert depth == 8 and interlace == 0 and ctype in (2,6)
    ch = 4 if ctype == 6 else 3; raw = zlib.decompress(b"".join(idat)); stride=w*ch
    rows=[]; prev=bytearray(stride); i=0
    for _ in range(h):
        f=raw[i]; i+=1; src=raw[i:i+stride]; i+=stride; row=bytearray(stride)
        for j,val in enumerate(src):
            a=row[j-ch] if j>=ch else 0; b=prev[j]; c=prev[j-ch] if j>=ch else 0
            if f==0: q=val
            elif f==1: q=(val+a)&255
            elif f==2: q=(val+b)&255
            elif f==3: q=(val+((a+b)>>1))&255
            else:
                p=a+b-c; pa,pb,pc=abs(p-a),abs(p-b),abs(p-c)
                q=(val+(a if pa<=pb and pa<=pc else b if pb<=pc else c))&255
            row[j]=q
        rows.append(row); prev=row
    def get(x,y):
        q=tuple(rows[y][x*ch:x*ch+ch]); return q if ch==4 else (*q,255)
    return w,h,get


def write_png(path,w,h,pixels):
    raw=bytearray()
    for y in range(h):
        raw.append(0)
        for x in range(w): raw.extend(pixels[y][x])
    def chunk(k,p): return struct.pack(">I",len(p))+k+p+struct.pack(">I",zlib.crc32(k+p)&0xffffffff)
    blob=b"\x89PNG\r\n\x1a\n"+chunk(b"IHDR",struct.pack(">IIBBBBB",w,h,8,6,0,0,0))+chunk(b"IDAT",zlib.compress(bytes(raw),9))+chunk(b"IEND",b"")
    path.write_bytes(blob)


def resize_area(src,dst,size=256):
    sw,sh,get=read_png(src); assert sw==sh
    scale=sw/size; out=[]
    for oy in range(size):
        y0=oy*scale; y1=(oy+1)*scale; row=[]
        iy0=int(y0); iy1=min(sh-1,int(y1-1e-9))
        for ox in range(size):
            x0=ox*scale; x1=(ox+1)*scale; ix0=int(x0); ix1=min(sw-1,int(x1-1e-9))
            sums=[0.0]*4; total=0.0
            for iy in range(iy0,iy1+1):
                wy=min(y1,iy+1)-max(y0,iy)
                for ix in range(ix0,ix1+1):
                    wx=min(x1,ix+1)-max(x0,ix); wt=wx*wy; c=get(ix,iy)
                    for k in range(4): sums[k]+=c[k]*wt
                    total+=wt
            row.append(tuple(max(0,min(255,round(v/total))) for v in sums))
        out.append(row)
    write_png(dst,size,size,out)
    return sw,sh


for src,dst in JOBS.items():
    original=resize_area(src,dst)
    print(f"{src.name}: {original[0]}x{original[1]} -> {dst} 256x256")
