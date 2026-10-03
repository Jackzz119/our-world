#!/usr/bin/env python3
"""make-music-fixtures.py — build the music module's test corpus (ai/features/music/m0.md).

Everything is synthetic (sweeps, tones, pink noise, a glide, and the built-in soundscapes' chord
recipes), so every file is ours to share. Lyrics come from src/themes/cinnaglass/music/builtin-tracks.ts.
Writes into tmp/music-fixtures/ (gitignored) plus manifest.json: what each file is, its SHA-256 and
decoded-PCM MD5, and which browsers should play it. APE and DSF cannot be encoded with ffmpeg; add
one of each from your own library when testing the conversion path.

Needs Python 3.9+ and ffmpeg/ffprobe with libmp3lame, libopus and libvorbis
(Ubuntu: apt install ffmpeg). Usage: python3 scripts/make-music-fixtures.py [--out DIR]
"""
import argparse
import hashlib
import json
import math
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TRACKS_TS = ROOT / 'src/themes/cinnaglass/music/builtin-tracks.ts'

# Which browsers play a container/codec directly (ai/features/music/research/audio-quality.md §1).
ALL = {'chrome': True, 'firefox': True, 'safari': True, 'ios': True, 'android': True}
SAFARI_ONLY = {'chrome': False, 'firefox': False, 'safari': True, 'ios': True, 'android': False}
NONE = {k: False for k in ALL}
SUPPORT = {
    'flac': ALL, 'mp3': ALL, 'aac': ALL, 'wav': ALL,
    'alac': SAFARI_ONLY, 'aiff': SAFARI_ONLY,
    'opus-ogg': {**ALL, 'safari': '18.4+', 'ios': '18.4+'},
    'opus-webm': {**ALL, 'safari': '17.4+', 'ios': '17.4+'},
    'vorbis-ogg': {**ALL, 'safari': '18.4+', 'ios': '18.4+'},
    'wavpack': NONE,
}

# English lines for the bilingual LRC fixture (暖灯电台), in the same order as its Chinese lines.
WARM_LAMP_EN = [
    'Someone on the radio is saying goodnight', "One turn of the dial, and it's an old love song",
    'The desk lamp takes your shadow', 'and sets it on my side of the table',
    'The frequency hisses just a little', "like your voice when you're sleepy",
    'The song reaches its second verse', "and you're already humming along",
    'The night tunes us to the same channel', 'So we just listen',
    'until the radio says goodbye', 'Goodnight, see you tomorrow',
]


def run(cmd, capture=False):
    """Run a command, failing loudly; returns stderr text when capture is set (ffmpeg reports there)."""
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if proc.returncode != 0:
        sys.exit(f'command failed: {" ".join(map(str, cmd))}\n{proc.stderr[-2000:]}')
    return proc.stdout + proc.stderr if capture else None


def ffmpeg(*args):
    run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', *map(str, args)])


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def pcm_md5(path_or_args):
    """MD5 of the decoded audio as 32-bit PCM (the default 16-bit hash would hide 24-bit changes)."""
    src = path_or_args if isinstance(path_or_args, list) else ['-i', str(path_or_args)]
    out = run(['ffmpeg', '-hide_banner', '-loglevel', 'error', *src, '-map', '0:a',
               '-c:a', 'pcm_s32le', '-f', 'hash', '-hash', 'md5', '-'], capture=True)
    return re.search(r'MD5=([0-9a-f]{32})', out).group(1)


def probe(path):
    out = run(['ffprobe', '-v', 'error', '-select_streams', 'a:0', '-show_entries',
               'stream=codec_name,sample_rate,channels,bits_per_raw_sample,bits_per_sample,sample_fmt,duration_ts'
               ':format=duration,bit_rate,format_name', '-of', 'json', str(path)], capture=True)
    data = json.loads(out)
    st, fm = data['streams'][0], data['format']
    bits = int(st.get('bits_per_raw_sample') or st.get('bits_per_sample') or 0) or None
    return {
        'codec': st['codec_name'], 'sample_rate': int(st['sample_rate']), 'channels': st['channels'],
        'bit_depth': bits, 'sample_fmt': st.get('sample_fmt'),
        'duration_s': round(float(fm['duration']), 3), 'bit_rate': int(fm.get('bit_rate') or 0),
        'container': fm['format_name'],
    }


def loudness(path):
    """Integrated loudness and true peak via ffmpeg's EBU R128 meter, as ReplayGain 2.0 tags (-18 LUFS)."""
    out = run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(path), '-af', 'ebur128=peak=true',
               '-f', 'null', '-'], capture=True)
    lufs = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', out)[-1])
    peak_db = float(re.findall(r'Peak:\s+(-?[\d.inf]+) dBFS', out)[-1])
    return {'REPLAYGAIN_TRACK_GAIN': f'{-18 - lufs:+.2f} dB', 'REPLAYGAIN_TRACK_PEAK': f'{10 ** (peak_db / 20):.6f}'}


def soundscapes():
    """Title, duration, root, chord and lyrics of the built-in soundscapes, read from music/builtin-tracks.ts."""
    text = TRACKS_TS.read_text(encoding='utf-8')
    found = {}
    for m in re.finditer(r"title: '([^']+)',\s*artist: '([^']+)',\s*root: ([\d.]+),\s*chord: \[([^\]]+)\],"
                         r"\s*dur: (\d+),.*?lyrics: lines\(\[(.*?)\]\)", text, re.S):
        title, artist, root, chord, dur, body = m.groups()
        found[title] = {
            'artist': artist, 'root': float(root), 'chord': [int(x) for x in chord.split(',')],
            'dur': int(dur), 'lines': [(int(t), s) for t, s in re.findall(r"\[(\d+), '([^']*)'\]", body)],
        }
    return found


# --- signal sources (ffmpeg lavfi), all phase-continuous ------------------------------------------

def src_sweep(sr, dur, f0=20, f1=20000, amp=0.25):
    k = math.log(f1 / f0)
    expr = f'{amp}*sin(2*PI*{f0}*{dur}/{k}*(pow({f1}/{f0},t/{dur})-1))'
    return ['-f', 'lavfi', '-i', f"aevalsrc='{expr}|{expr}':s={sr}:d={dur}"]


def src_hires(sr, dur):
    """1 kHz at -20 dBFS, an ultrasonic tone only a real hi-res file carries, and a -110 dBFS tone
    that only survives at 24 bit."""
    ultra = 30000 if sr < 176400 else 60000
    parts = ['0.1*sin(2*PI*1000*t)', '0.0000031623*sin(2*PI*440*t)']
    if sr >= 88200:
        parts.append(f'0.0316*sin(2*PI*{ultra}*t)')
    expr = '+'.join(parts)
    return ['-f', 'lavfi', '-i', f"aevalsrc='{expr}|{expr}':s={sr}:d={dur}"]


def src_musiclike(sr, dur):
    """Pink noise plus a slow chord: compresses like real music, so file sizes and seeking are realistic."""
    graph = (f'anoisesrc=color=pink:amplitude=0.07:sample_rate={sr}:duration={dur}:seed=42,'
             f'aformat=channel_layouts=stereo[n];'
             f'aevalsrc=0.12*(sin(2*PI*220*t)+sin(2*PI*277.18*t)+sin(2*PI*329.63*t))*(0.8+0.2*sin(2*PI*0.2*t))'
             f'|0.12*(sin(2*PI*220*t)+sin(2*PI*277.18*t)+sin(2*PI*329.63*t))*(0.8+0.2*sin(2*PI*0.23*t))'
             f':s={sr}:d={dur}[c];[n][c]amix=inputs=2:normalize=0[out0]')
    return ['-f', 'lavfi', '-i', graph]


def src_glide(sr, dur, f0=220, f1=880, amp=0.25):
    """A continuous pitch glide: any gap or click at a track boundary is audible."""
    k = math.log(f1 / f0)
    expr = f'{amp}*sin(2*PI*{f0}*{dur}/{k}*(pow({f1}/{f0},t/{dur})-1))'
    return ['-f', 'lavfi', '-i', f"aevalsrc='{expr}|{expr}':s={sr}:d={dur}"]


def src_soundscape(sc, sr=44100):
    """The app's WebAudio pad (four voices, tremolo, low-pass) rendered to a file, with fades."""
    voices = [sc['root'] * 2 ** (semi / 12) / (2 if k == 0 else 1) for k, semi in enumerate(sc['chord'])]
    tone = '+'.join(f'sin(2*PI*{f:.3f}*t)' for f in voices)
    expr = f'0.09*({tone})*(0.85+0.15*sin(2*PI*0.18*t))'
    dur = sc['dur']
    chain = f'lowpass=f=900,afade=t=in:d=3,afade=t=out:st={dur - 4}:d=4'
    return ['-f', 'lavfi', '-i', f"aevalsrc='{expr}|{expr}':s={sr}:d={dur},{chain}"]


# --- tags and sidecars ---------------------------------------------------------------------------

def id3v23(frames):
    body = b''.join(frames) + b'\x00' * 512
    n = len(body)
    size = bytes([(n >> 21) & 0x7F, (n >> 14) & 0x7F, (n >> 7) & 0x7F, n & 0x7F])
    return b'ID3' + bytes([3, 0, 0]) + size + body


def id3_frame(fid, payload):
    return fid.encode('ascii') + len(payload).to_bytes(4, 'big') + b'\x00\x00' + payload


def id3_mislabelled(fid, text):
    """The classic Chinese-MP3 problem: GBK bytes inside a frame that claims ISO-8859-1."""
    return id3_frame(fid, b'\x00' + text.encode('gbk'))


def lrc_time(seconds):
    m, s = divmod(seconds, 60)
    return f'{int(m):02d}:{s:05.2f}'


def lrc_lines(title, artist, lines, extra=None):
    head = [f'[ti:{title}]', f'[ar:{artist}]', '[al:音乐模块测试集]', '[by:make-music-fixtures]']
    body = []
    for i, (t, text) in enumerate(lines):
        body.append(f'[{lrc_time(t)}]{text}')
        if extra:
            body.append(f'[{lrc_time(t)}]{extra[i]}')
    return '\n'.join(head + body) + '\n'


def lrc_words(title, artist, lines, dur):
    """Enhanced LRC: every character gets its own <mm:ss.xx> start inside the line."""
    out = [f'[ti:{title}]', f'[ar:{artist}]', '[al:音乐模块测试集]']
    for i, (t, text) in enumerate(lines):
        end = lines[i + 1][0] if i + 1 < len(lines) else min(t + 10, dur)
        span = max(1.0, min(end - t, 6.0))
        chars = list(text)
        cells = ''.join(f'<{lrc_time(t + span * j / len(chars))}>{c}' for j, c in enumerate(chars))
        out.append(f'[{lrc_time(t)}]{cells}<{lrc_time(t + span)}>')
    return '\n'.join(out) + '\n'


def main():
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    parser.add_argument('--out', default=str(ROOT / 'tmp/music-fixtures'))
    args = parser.parse_args()
    for tool in ('ffmpeg', 'ffprobe'):
        if not shutil.which(tool):
            sys.exit(f'{tool} not found (apt install ffmpeg)')

    out = Path(args.out)
    if out.exists():
        shutil.rmtree(out)
    for sub in ('formats', 'gapless', 'lyrics', 'cover'):
        (out / sub).mkdir(parents=True)
    entries = []

    def record(path, kind, lossless, support, note, **more):
        info = probe(path)
        entries.append({'path': str(path.relative_to(out)), 'kind': kind, 'lossless': lossless,
                        'bytes': path.stat().st_size, 'sha256': sha256(path), 'pcm_md5': pcm_md5(path),
                        'browsers': support, 'note': note, **info, **more})

    # Posters: the 雨天的窗边 tint from music/builtin-tracks.ts, as JPEG (folder art) and PNG (embedded).
    cover_jpg, cover_png = out / 'cover/cover.jpg', out / 'cover/cover.png'
    gradient = 'gradients=s=1200x1200:c0=0xbfd0f2:c1=0x8c9ddb:x0=0:y0=0:x1=1200:y1=1200:nb_colors=2:d=1'
    ffmpeg('-f', 'lavfi', '-i', gradient, '-frames:v', '1', '-q:v', '3', cover_jpg)
    ffmpeg('-f', 'lavfi', '-i', gradient.replace('1200', '600'), '-frames:v', '1', cover_png)
    for sub in ('formats', 'gapless'):
        shutil.copy(cover_jpg, out / sub / 'cover.jpg')

    tags = ['-metadata', 'artist=Lo-fi 时光', '-metadata', 'album=音乐模块测试集', '-metadata', 'date=2026']
    fmt = out / 'formats'

    # Format matrix (short clips; two long ones for seeking and hi-res streaming).
    p = fmt / '01-flac-16-44.flac'
    ffmpeg(*src_sweep(44100, 20), '-i', cover_png, '-map', '0:a', '-map', '1:v', '-c:a', 'flac',
           '-sample_fmt', 's16', '-c:v', 'png', '-disposition:v', 'attached_pic', *tags,
           '-metadata', 'title=扫频 20 Hz–20 kHz', '-metadata', 'track=1', p)
    record(p, 'sweep', True, SUPPORT['flac'], 'FLAC 16/44.1 with embedded cover; baseline')
    for name, sr, dur, kind, note in (
        ('02-flac-24-96.flac', 96000, 20, 'hires', '30 kHz tone proves the extra bandwidth; -110 dBFS tone needs 24 bit'),
        ('03-flac-24-192.flac', 192000, 20, 'hires', '60 kHz tone; check that iPhone plays 192 kHz'),
    ):
        p = fmt / name
        ffmpeg(*src_hires(sr, dur), '-c:a', 'flac', '-sample_fmt', 's32', '-bits_per_raw_sample', '24',
               *tags, '-metadata', f'title=Hi-Res 检查 {sr // 1000} kHz', p)
        record(p, kind, True, SUPPORT['flac'], note)
    p = fmt / '04-alac-16-44.m4a'
    ffmpeg(*src_sweep(44100, 20), '-c:a', 'alac', '-sample_fmt', 's16p', *tags, '-metadata', 'title=ALAC 16/44.1', p)
    record(p, 'sweep', True, SUPPORT['alac'], 'ALAC plays only in Safari; elsewhere needs the FLAC stream copy')
    p = fmt / '05-alac-24-96.m4a'
    ffmpeg(*src_hires(96000, 20), '-c:a', 'alac', '-sample_fmt', 's32p', *tags, '-metadata', 'title=ALAC 24/96', p)
    record(p, 'hires', True, SUPPORT['alac'], 'ALAC 24/96')
    p = fmt / '06-aac-256.m4a'
    ffmpeg(*src_musiclike(44100, 30), '-i', cover_jpg, '-map', '0:a', '-map', '1:v', '-c:a', 'aac', '-b:a', '256k',
           '-c:v', 'mjpeg', '-disposition:v', 'attached_pic', *tags, '-metadata', 'title=AAC 256',
           '-metadata', 'lyrics=[00:00.00]AAC 文件的内嵌歌词（©lyr）', p)
    record(p, 'musiclike', False, SUPPORT['aac'], 'AAC-LC 256 kbps with cover and ©lyr lyrics; the cellular copy format')

    # MP3 whose ID3v2.3 text frames hold GBK bytes but claim ISO-8859-1, plus UTF-16 lyrics and a cover.
    raw_mp3 = out / 'formats/.raw.mp3'
    ffmpeg(*src_musiclike(44100, 30), '-c:a', 'libmp3lame', '-b:a', '320k', '-id3v2_version', '0', raw_mp3)
    lyrics = '[00:00.00]窗外的灯一盏一盏亮起来\n[00:10.00]杯子里的热气慢慢变细\n'
    tag = id3v23([
        id3_mislabelled('TIT2', '雨天的窗边'), id3_mislabelled('TPE1', 'Lo-fi 时光'),
        id3_mislabelled('TALB', '音乐模块测试集'), id3_frame('TRCK', b'\x00' + b'7'),
        id3_frame('TYER', b'\x002026'),
        id3_frame('USLT', b'\x01' + b'chi' + ''.encode('utf-16') + b'\x00\x00' + lyrics.encode('utf-16')),
        id3_frame('APIC', b'\x00image/jpeg\x00\x03\x00' + cover_jpg.read_bytes()),
    ])
    p = fmt / '07-mp3-320-gbk-tags.mp3'
    p.write_bytes(tag + raw_mp3.read_bytes())
    raw_mp3.unlink()
    record(p, 'musiclike', False, SUPPORT['mp3'],
           'ID3v2.3 title/artist/album are GBK bytes labelled ISO-8859-1 (expect 雨天的窗边 after repair)',
           expect_tags={'title': '雨天的窗边', 'artist': 'Lo-fi 时光', 'album': '音乐模块测试集'})

    p = fmt / '08-wav-24-48.wav'
    ffmpeg(*src_hires(48000, 20), '-c:a', 'pcm_s24le', p)
    record(p, 'hires', True, SUPPORT['wav'], 'WAV 24/48 (integer PCM)')
    p = fmt / '09-wav-f32-48.wav'
    ffmpeg(*src_sweep(48000, 10), '-c:a', 'pcm_f32le', p)
    record(p, 'sweep', True, SUPPORT['wav'], 'WAV 32-bit float; kept as WAV, never squeezed into FLAC')
    p = fmt / '10-aiff-16-44.aiff'
    ffmpeg(*src_sweep(44100, 20), '-c:a', 'pcm_s16be', *tags, '-metadata', 'title=AIFF', p)
    record(p, 'sweep', True, SUPPORT['aiff'], 'AIFF plays only in Safari')
    p = fmt / '11-opus-160.ogg'
    ffmpeg(*src_musiclike(48000, 30), '-c:a', 'libopus', '-b:a', '160k', *tags, '-metadata', 'title=Opus Ogg', p)
    record(p, 'musiclike', False, SUPPORT['opus-ogg'], 'Ogg Opus: Safari 18.4+')
    p = fmt / '12-opus-160.webm'
    ffmpeg(*src_musiclike(48000, 30), '-c:a', 'libopus', '-b:a', '160k', p)
    record(p, 'musiclike', False, SUPPORT['opus-webm'], 'WebM Opus: Safari 17.4+; Safari cannot route WebM into Web Audio')
    p = fmt / '13-vorbis-q6.ogg'
    ffmpeg(*src_musiclike(44100, 30), '-c:a', 'libvorbis', '-q:a', '6', *tags, '-metadata', 'title=Vorbis', p)
    record(p, 'musiclike', False, SUPPORT['vorbis-ogg'], 'Ogg Vorbis: Safari 18.4+')
    p = fmt / '14-wavpack-16-44.wv'
    ffmpeg(*src_sweep(44100, 20), '-c:a', 'wavpack', '-sample_fmt', 's16p', p)
    record(p, 'sweep', True, SUPPORT['wavpack'], 'No browser plays WavPack: must be flagged "needs conversion"')
    p = fmt / '15-flac-16-44-4min.flac'
    ffmpeg(*src_musiclike(44100, 240), '-c:a', 'flac', '-sample_fmt', 's16', *tags,
           '-metadata', 'title=四分钟（拖动测试）', p)
    record(p, 'musiclike', True, SUPPORT['flac'], 'CD-size FLAC for Range requests and seek latency')
    p = fmt / '16-flac-24-192-30s.flac'
    ffmpeg(*src_musiclike(192000, 30), '-c:a', 'flac', '-sample_fmt', 's32', '-bits_per_raw_sample', '24', *tags,
           '-metadata', 'title=24/192 串流（30 秒）', p)
    record(p, 'musiclike', True, SUPPORT['flac'], 'Realistic 24/192 bitrate, under the 50 MB Free-plan file limit')

    # Gapless album: one continuous glide, as a FLAC image with a GBK cue sheet and as split tracks.
    gap = out / 'gapless'
    album = gap / 'album.flac'
    ffmpeg(*src_glide(44100, 45), '-c:a', 'flac', '-sample_fmt', 's16', '-metadata', 'title=无缝测试专辑', album)
    starts = [0, 15 * 75, 30 * 75 + 37]  # CUE frames (1/75 s); 588 samples each at 44.1 kHz
    total = int(probe(album)['duration_s'] * 44100 + 0.5)
    names = ['第一段 · 上升', '第二段 · 继续', '第三段 · 结束']
    cue = ['REM GENRE "测试"', 'REM DATE 2026', 'PERFORMER "测试乐队"', 'TITLE "无缝测试专辑"',
           'FILE "album.flac" WAVE']
    for i, frame in enumerate(starts):
        mm, rest = divmod(frame, 75 * 60)
        ss, ff = divmod(rest, 75)
        cue += [f'  TRACK {i + 1:02d} AUDIO', f'    TITLE "{names[i]}"', '    PERFORMER "测试乐队"',
                f'    INDEX 01 {mm:02d}:{ss:02d}:{ff:02d}']
    (gap / 'album.cue').write_bytes(('\r\n'.join(cue) + '\r\n').encode('gbk'))
    record(album, 'glide', True, SUPPORT['flac'], 'Whole-album image; album.cue (GBK) slices it into 3 virtual tracks',
           cue_starts_samples=[f * 588 for f in starts])
    parts = []
    bounds = [f * 588 for f in starts] + [total]
    for i in range(3):
        part = gap / f'{i + 1:02d}.flac'
        ffmpeg('-i', album, '-af', f'atrim=start_sample={bounds[i]}:end_sample={bounds[i + 1]},asetpts=PTS-STARTPTS',
               '-c:a', 'flac', '-sample_fmt', 's16', '-metadata', f'title={names[i]}', '-metadata', f'track={i + 1}',
               '-metadata', 'album=无缝测试专辑', part)
        parts.append(part)
        record(part, 'glide', True, SUPPORT['flac'], f'Split track {i + 1}, sample-exact')
    listing = gap / '.concat.txt'
    listing.write_text(''.join(f"file '{q.name}'\n" for q in parts), encoding='utf-8')
    joined = pcm_md5(['-f', 'concat', '-safe', '0', '-i', str(listing)])
    listing.unlink()
    album_md5 = next(e['pcm_md5'] for e in entries if e['path'] == 'gapless/album.flac')
    wv = gap / 'album-image.wv'
    ffmpeg('-i', album, '-c:a', 'wavpack', wv)
    record(wv, 'glide', True, SUPPORT['wavpack'], 'Same album as WavPack: an unplayable lossless image (stands in for APE)')

    # Lyrics: the built-in soundscapes rendered to audio, each with a different lyrics source.
    scapes = soundscapes()
    lyr = out / 'lyrics'
    plan = [
        ('雨天的窗边', 'lrc', 'Line-synced sidecar .lrc'),
        ('暖灯电台', 'bilingual', 'Sidecar .lrc with an English line under each Chinese line (same timestamp)'),
        ('一起散步', 'words', 'Word-synced sidecar .lrc (enhanced <mm:ss.xx> per character)'),
        ('云朵上的下午', 'gbk', 'Line-synced sidecar .lrc saved in GBK'),
        ('列车清晨', 'embedded', 'Lyrics only inside the FLAC (Vorbis LYRICS), no sidecar'),
    ]
    for title, style, note in plan:
        sc = scapes.get(title)
        if not sc:
            sys.exit(f'{title} not found in {TRACKS_TS}')
        p = lyr / f'{title}.flac'
        lrc = lrc_lines(title, sc['artist'], sc['lines'])
        extra = ['-metadata', f'LYRICS={lrc}'] if style == 'embedded' else []
        ffmpeg(*src_soundscape(sc), '-i', cover_png, '-map', '0:a', '-map', '1:v', '-c:a', 'flac', '-sample_fmt', 's16',
               '-c:v', 'png', '-disposition:v', 'attached_pic', '-metadata', f'title={title}',
               '-metadata', f'artist={sc["artist"]}', '-metadata', 'album=音乐模块测试集', *extra, p)
        gain = loudness(p)
        tagged = p.with_suffix('.tagged.flac')
        ffmpeg('-i', p, '-map', '0', '-c', 'copy', *sum((['-metadata', f'{k}={v}'] for k, v in gain.items()), []), tagged)
        tagged.replace(p)
        if style == 'lrc':
            (lyr / f'{title}.lrc').write_text(lrc, encoding='utf-8')
        elif style == 'bilingual':
            en = (WARM_LAMP_EN + [''] * len(sc['lines']))[: len(sc['lines'])]
            (lyr / f'{title}.lrc').write_text(lrc_lines(title, sc['artist'], sc['lines'], en), encoding='utf-8')
        elif style == 'words':
            (lyr / f'{title}.lrc').write_text(lrc_words(title, sc['artist'], sc['lines'], sc['dur']), encoding='utf-8')
        elif style == 'gbk':
            (lyr / f'{title}.lrc').write_bytes(lrc.encode('gbk'))
        record(p, 'soundscape', True, SUPPORT['flac'], note, lyrics_style=style, lyric_lines=len(sc['lines']),
               replaygain=gain)

    manifest = {
        'generator': 'scripts/make-music-fixtures.py',
        'doc': 'ai/features/music/m0.md',
        'gapless_check': {'album_pcm_md5': album_md5, 'joined_parts_pcm_md5': joined, 'match': album_md5 == joined},
        'not_generated': ['APE (+CUE) and DSF/DFF: ffmpeg cannot encode them; add one of each from your library'],
        'files': entries,
    }
    (out / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    size = sum(e['bytes'] for e in entries)
    print(f'{len(entries)} audio files, {size / 1e6:.1f} MB → {out}')
    print(f'gapless split is sample-exact: {album_md5 == joined}')
    if album_md5 != joined:
        sys.exit(1)


if __name__ == '__main__':
    main()
