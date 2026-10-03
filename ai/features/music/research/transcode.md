# Compact copies in the browser: encoders, playback and gapless (state as of Oct 2026)

**How this was researched.** The egress proxy blocks MDN, caniuse.com, webkit.org, chromestatus and the bug trackers, so the sources are primary ones reachable through GitHub and Apple: MDN browser-compat-data (BCD), the caniuse data files, Chromium / WebKit / Firefox source on their `main` branches (read 3 Oct 2026), Apple's Safari 26 release notes and TN2258, and mediabunny 1.61.0 as installed. Measurements come from `scripts/check-music-transcode.mjs` in Playwright's Chromium 141 on Linux. Claims that rest only on reading source are marked **(source)**; anything not checked on a device is **UNVERIFIED**. The module this informs is `src/lib/music/transcode.ts`.

## 1. WebCodecs `AudioEncoder`: AAC-LC (`mp4a.40.2`) and Opus

| Browser / OS                     | `AudioEncoder` since | AAC-LC encode                                                                                                    | Opus encode                         |
| -------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Chrome / Edge, Windows           | 94                   | ✅ Media Foundation; 44.1/48 kHz only and **only 96/128/160/192 kbps**, so 256 kbps is refused; not on Windows N | ✅ libopus                          |
| Chrome, macOS                    | 94                   | ✅ AudioToolbox; 44.1/48 kHz; the bitrate is lowered to the nearest one the encoder offers (256 OK)              | ✅                                  |
| Chrome, Linux                    | 94                   | ❌ (measured: `isConfigSupported` false at 44.1 and 48 kHz)                                                      | ✅ (measured)                       |
| Chrome, ChromeOS                 | 94                   | ❌ (same switch as Linux, **(source)**)                                                                          | ✅                                  |
| Chrome, Android                  | 94                   | ✅ MediaCodec through the NDK (default 192 kbps; 256 kbps depends on the phone's encoder, UNVERIFIED)            | ✅ (complexity 5 instead of 9)      |
| Safari, macOS and iOS/iPadOS     | **26.0**             | ✅ AudioToolbox: LC, HE, HE v2, LD, ELD; raw only (ADTS refused)                                                 | ✅ up to 2 channels, not Ogg format |
| Safari ≤ 18.x (all iOS browsers) | none                 | ❌ WebCodecs there is video-only (16.4–18.x)                                                                     | ❌                                  |
| Firefox desktop                  | 130                  | ❌ encodes only `opus` and `vorbis`                                                                              | ✅                                  |
| Firefox Android                  | none                 | ❌ WebCodecs off on Android (bug 1840508)                                                                        | ❌                                  |

- Versions: BCD [AudioEncoder.json](https://github.com/mdn/browser-compat-data/blob/main/api/AudioEncoder.json) and [AudioDecoder.json](https://github.com/mdn/browser-compat-data/blob/main/api/AudioDecoder.json) (Chrome 94, Firefox 130 desktop only, Safari 26 with iOS mirroring it); caniuse [webcodecs.json](https://github.com/Fyrd/caniuse/blob/main/features-json/webcodecs.json) ("video-only support" for Safari 16.4–18.x, full from 26.0); Apple's [Safari 26.0 release notes](https://developer.apple.com/documentation/safari-release-notes/safari-26-release-notes): "Added support for WebCodec's AudioEncoder and AudioDecoder."
- Chromium:
    - AAC exists only as a platform encoder. `MojoAudioEncoder::IsSupported(kAAC)` follows `kPlatformAudioEncoder` and excludes Windows N ([mojo_audio_encoder.cc](https://github.com/chromium/chromium/blob/main/media/mojo/clients/mojo_audio_encoder.cc)).
    - That switch is on by default for Windows, macOS and Android only ([media_switches.cc](https://github.com/chromium/chromium/blob/main/media/base/media_switches.cc)).
    - Blink accepts AAC at 44.1/48 kHz and 1, 2 or 6 channels, and on Windows only the four bitrates above ([audio_encoder.cc](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/modules/webcodecs/audio_encoder.cc), [mf_audio_encoder.cc](https://github.com/chromium/chromium/blob/main/media/gpu/windows/mf_audio_encoder.cc)).
    - macOS snaps the bitrate down ([audio_toolbox_audio_encoder.cc](https://github.com/chromium/chromium/blob/main/media/filters/mac/audio_toolbox_audio_encoder.cc)); Android uses [ndk_audio_encoder.cc](https://github.com/chromium/chromium/blob/main/media/gpu/android/ndk_audio_encoder.cc).
    - Opus resamples any other input rate to 48 kHz inside the encoder ([audio_opus_encoder.cc](https://github.com/chromium/chromium/blob/main/media/audio/audio_opus_encoder.cc)).
- WebKit: [AudioEncoderCocoa.cpp](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/platform/audio/cocoa/AudioEncoderCocoa.cpp) refuses Vorbis, FLAC and MP3 encoding. [AudioDecoderCocoa.cpp](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/platform/audio/cocoa/AudioDecoderCocoa.cpp) decodes AAC, MP3, Opus, FLAC, Vorbis and PCM, but has **no ALAC**. `isConfigSupported` actually creates the encoder ([WebCodecsAudioEncoder.cpp](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/Modules/webcodecs/WebCodecsAudioEncoder.cpp)).
- Firefox: `IsAudioEncodeSupported` returns true for `opus` and `vorbis` only, and `CanEncode` is false on Android ([AudioEncoder.cpp](https://github.com/mozilla-firefox/firefox/blob/main/dom/media/webcodecs/AudioEncoder.cpp)).
- No browser decodes ALAC through WebCodecs, and mediabunny has no ALAC codec and no AIFF, WavPack, APE or DSD demuxer. Copies of those originals therefore cannot be made in any browser (the check shows ALAC, AIFF and WavPack refused). Safari's `decodeAudioData` handles ALAC and AIFF, but it holds the whole file as PCM, so it is only a stopgap for single tracks.

## 2. Can an iPhone play the copy?

- **AAC in MP4**: Safari 4+ and iOS 4+ ([caniuse aac.json](https://github.com/Fyrd/caniuse/blob/main/features-json/aac.json)). It is a plain file, so Safari can also route it into Web Audio for the "enhanced" mode.
- **Opus in WebM**, per [caniuse opus.json](https://github.com/Fyrd/caniuse/blob/main/features-json/opus.json):
    - iOS 17.4: plays, with a known regression ([WebKit 245428](https://bugs.webkit.org/show_bug.cgi?id=245428)).
    - iOS 17.5+: plays at all bitrates.
    - Ogg Opus needs iOS 18.4, or macOS 15.4 for desktop Safari 18.4.
    - Safari plays WebM through its WebM/MSE path, which Web Audio cannot tap ([audio-quality.md](audio-quality.md) §3). On an iPhone an Opus copy therefore plays only through the plain `<audio>` path.

## 3. Gapless: priming, edit lists and pre-skip

- **AAC in MP4 gets no edit list.**
    - mediabunny writes `edts/elst` only when a track's first timestamp is not 0 (`trak()` in `isobmff-boxes.ts`; `startTimestampOffset` in `isobmff-muxer.ts`). It takes packet timestamps from the WebCodecs encoder as given (`AudioEncoderWrapper` in `media-source.ts`).
    - Every browser AAC encoder stamps its first packet at the first input's timestamp and reports no priming **(source)**: Chromium's three platform encoders count output frames from that timestamp. WebKit attaches priming trims only when its converter generates timestamps itself, and WebCodecs turns that off (`generateTimestamp = false` in AudioEncoderCocoa.cpp; [AudioSampleBufferConverter.mm](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/platform/audio/cocoa/AudioSampleBufferConverter.mm)).
    - So an AAC copy carries no `elst` and no `iTunSMPB`. It starts late by the encoder delay, which is implementation dependent; 2112 samples is the common value ([TN2258](https://developer.apple.com/library/archive/technotes/tn2258/_index.html)). It also ends with up to 1023 samples of padding. Not measurable here, because Linux Chromium has no AAC encoder.
    - Fix, if sample accuracy is ever needed: measure the delay once per device with an impulse, then feed the encoder timestamps from −delay. mediabunny then writes a trimming `elst`, since it supports negative timestamps through edit lists.
- **Opus in WebM lines up.**
    - Chromium's encoder puts the libopus lookahead (312 samples at 48 kHz) into the OpusHead pre-skip and flushes with that much silence ([audio_opus_encoder.cc](https://github.com/chromium/chromium/blob/main/media/audio/audio_opus_encoder.cc)).
    - mediabunny copies the OpusHead into CodecPrivate (`matroska-muxer.ts`). It sets SeekPreRoll to the pre-skip (6.5 ms) instead of the recommended 80 ms, and writes no CodecDelay and no DiscardPadding.
    - Measured in Chromium: copies line up with the original within 0.2 samples, so `decodeAudioData` honours the pre-skip. The decoded length is the slice plus 0–20 ms of padding (13.5 ms typical).
    - WebKit's WebM parser trims the start only from CodecDelay ([SourceBufferParserWebM.cpp](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/platform/graphics/cocoa/SourceBufferParserWebM.cpp)). Safari probably plays these copies 312 samples (6.5 ms) late (UNVERIFIED on a device).
- **Input side.**
    - mediabunny honours MP4 edit lists and the Ogg Opus pre-skip (timestamps are granule − pre-skip; measured lag −0.15 samples).
    - It ignores the LAME encoder delay: a copy of an MP3 starts 1105 samples (25 ms) after the original as `decodeAudioData` plays it (measured). This is harmless while `ingest.ts` copies only originals that are lossless or above 330 kbps.
- **Resampling.**
    - mediabunny's `AudioResampler` interpolates linearly with no low-pass ("suboptimal … especially for downsampling", its own comment in `resample.ts`). Measured with it, the 30 kHz tone of a 24/96 file aliases to 18 kHz at −30 dBFS, and the 60 kHz tone of a 24/192 file to 12 kHz at −30 dBFS.
    - `transcode.ts` therefore resamples with its own zero-delay Kaiser-windowed sinc (32 zero crossings per side: 64 taps for 44.1 → 48 kHz, 128 for 96 → 48 kHz). With it the same aliases measure −120 and −131 dBFS.
- **CUE slices.** Copies start exactly at the slice start; the decoder runs 0.2 s ahead to settle. A slice at 60–75 s of a noise-like FLAC lines up with its source within 0.2 samples. The album slice INDEX 00:15:00–00:30:37 (15.4933 s) decodes to 15.493 s.

## 4. Recommendation: which device makes the copy

| Uploader's device                            | `pickCopyFormat()`                       | Make copies there?                                                                                                        |
| -------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Mac: Safari 26+ or Chrome                    | AAC 256 / MP4                            | **Yes, the best maker**: the copy plays on every iPhone and goes through Safari's Web Audio                               |
| iPhone / iPad on iOS 26+ (every iOS browser) | AAC 256 / MP4                            | Yes. CUE images are copied one slice at a time; keep the page in front while it works                                     |
| Android Chrome                               | AAC 256 / MP4                            | Yes; check once on a real phone that 256 kbps is honoured                                                                 |
| Windows Chrome / Edge                        | Opus 160 / WebM (AAC capped at 192 kbps) | Yes for Android, desktop and iOS 17.5+. If iPhone listeners use the enhanced mode, add an AAC 192 rung or remake on a Mac |
| Linux / ChromeOS Chrome, Firefox desktop     | Opus 160 / WebM                          | Yes, with the same iPhone caveat                                                                                          |
| Safari / iOS ≤ 18, Firefox Android           | `null`                                   | No: upload the original and let another device make the copy                                                              |
| ALAC, AIFF, WavPack, APE or DSD originals    | refused on every browser                 | No browser path. Needs the media worker (M7), or Safari `decodeAudioData` for short tracks                                |

Rule of thumb: prefer AAC/MP4 copies made on Apple devices or Android. Accept Opus/WebM from Windows, Linux and Firefox: it is 37% smaller and plays everywhere except Safari before 17.4 and Safari's Web Audio. Record `made_on` (as `ingest.ts` does), so an Opus copy can be remade as AAC when a Mac next opens the library.
