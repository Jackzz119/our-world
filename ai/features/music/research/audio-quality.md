# Audio quality research for the "Our World" music player (state as of Sep 2026)

**How this was researched.** The egress proxy blocked MDN, caniuse, webkit.org, chromestatus, the WebKit, Chromium and Mozilla bug trackers, and most vendor help sites. The web-search budget also ran out partway through. To compensate I used primary sources hosted on GitHub: MDN content and browser-compat-data (BCD), the caniuse data files, Chromium/Firefox/WebKit source (main branches, Sep 2026), W3C specs, the TIDAL web player SDK (npm `@tidal-music/player` 0.20.1, which ships with source maps), mpv, rsgain, FFmpeg and Shaka. I also used developer.apple.com and developer.android.com. Where a claim rests only on a search-result summary, or on my own reading of source code, I say so. Anything I could not confirm is marked **UNVERIFIED**.

---

## 1. Codec and container support matrix (`<audio src=…>`)

| Format                                 | Chrome/Edge desktop                        | Firefox desktop                                                    | Safari macOS                                              | iOS/iPadOS Safari and Home-Screen app               | Android Chrome |
| -------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------ | --------------------------------------------------------- | --------------------------------------------------- | -------------- |
| FLAC (.flac)                           | ✅ (56+)                                   | ✅ (51+)                                                           | ✅ 11+ (macOS 10.13+)                                     | ✅ iOS 11+                                          | ✅             |
| FLAC in Ogg                            | ✅                                         | ✅                                                                 | UNVERIFIED (18.4 notes cover only Opus and Vorbis in Ogg) | UNVERIFIED                                          | ✅             |
| FLAC in MP4                            | ✅ (`flac`/`fLaC`)                         | ✅ (`flac`/`fLaC`)                                                 | ✅ (see §2)                                               | ✅ (see §2)                                         | ✅             |
| ALAC (.m4a)                            | ❌                                         | ❌                                                                 | ✅                                                        | ✅                                                  | ❌             |
| WAV PCM 16/24/32-bit int, 32-bit float | ✅                                         | ✅ (bundled FFmpeg decoders: u8, s16, s24, s32, f32, A-law, µ-law) | ✅                                                        | ✅                                                  | ✅             |
| AIFF                                   | ❌                                         | ❌                                                                 | ✅                                                        | ✅                                                  | ❌             |
| MP3                                    | ✅                                         | ✅                                                                 | ✅                                                        | ✅                                                  | ✅             |
| AAC-LC / HE-AAC (MP4, ADTS)            | ✅ (LC, HE v1/v2; xHE depends on platform) | ✅ via OS decoders only                                            | ✅                                                        | ✅                                                  | ✅             |
| Opus in Ogg                            | ✅                                         | ✅                                                                 | ✅ 18.4+ (needs macOS 15.4)                               | ✅ 18.4+                                            | ✅             |
| Opus in WebM                           | ✅                                         | ✅                                                                 | ✅ 17.4+                                                  | ✅ 17.4+ (17.4 has a regression, WebKit bug 245428) | ✅             |
| Opus in MP4                            | ✅                                         | ✅                                                                 | UNVERIFIED (see §2)                                       | UNVERIFIED                                          | ✅             |
| Opus in CAF                            | ❌                                         | ❌                                                                 | ✅ 11+ (constant bitrate only)                            | ✅ 11+ (constant bitrate only)                      | ❌             |
| Vorbis                                 | ✅ Ogg and WebM                            | ✅                                                                 | WebM 14.1+ (macOS 11.3+); Ogg 18.4+                       | WebM 17.4+; Ogg 18.4+                               | ✅             |
| Matroska audio (.mka)                  | ✅ in current Chromium main                | Demuxer exists; whether it is on by default is UNVERIFIED          | ❌ UNVERIFIED                                             | ❌                                                  | ✅             |
| DSD (DSF/DFF), APE, WavPack            | ❌                                         | ❌                                                                 | ❌                                                        | ❌                                                  | ❌             |

Sources for the matrix:

- Chromium container and codec sets: [mime_util_internal.cc](https://github.com/chromium/chromium/blob/main/media/base/mime_util_internal.cc).
    - `audio/mp4` accepts FLAC, MP3 and Opus, plus AAC (including xHE-AAC).
    - `audio/ogg` accepts FLAC, Opus and Vorbis; `audio/webm` accepts Opus and Vorbis.
    - `audio/matroska` accepts PCM, FLAC, MP3, Opus and Vorbis.
    - There is no ALAC and no AIFF.
- Firefox:
    - Bundled FFmpeg codecs: [codec_list.c](https://github.com/mozilla-firefox/firefox/blob/main/media/ffvpx/libavcodec/codec_list.c).
    - MP4 accepts only AAC, MP3, Opus and FLAC: [MP4Decoder.cpp](https://github.com/mozilla-firefox/firefox/blob/main/dom/media/mp4/MP4Decoder.cpp).
    - Ogg accepts Opus, Vorbis and FLAC: [OggDecoder.cpp](https://github.com/mozilla-firefox/firefox/blob/main/dom/media/ogg/OggDecoder.cpp).
    - There is no AIFF demuxer: [DecoderTraits.cpp](https://github.com/mozilla-firefox/firefox/blob/main/dom/media/DecoderTraits.cpp).
    - Old write-ups saying "Firefox can't play 24-bit or float WAV" are out of date. [WaveDemuxer.cpp](https://github.com/mozilla-firefox/firefox/blob/main/dom/media/wave/WaveDemuxer.cpp) parses WAVEFORMATEXTENSIBLE and float.
- Safari and first versions: caniuse data files for [opus](https://github.com/Fyrd/caniuse/blob/main/features-json/opus.json), [flac](https://github.com/Fyrd/caniuse/blob/main/features-json/flac.json) and [ogg-vorbis](https://github.com/Fyrd/caniuse/blob/main/features-json/ogg-vorbis.json). ALAC as Safari-only comes from the [MDN codec guide](https://github.com/mdn/content/blob/main/files/en-us/web/media/guides/formats/audio_codecs/index.md).
- Home-Screen web apps use the same WebKit engine, so codec support is identical. Background behaviour differs (§4).

**Hi-res and multichannel**

- **Chrome** decoders accept 3 kHz–768 kHz, up to 32 channels and up to 32 bits per sample ([limits.h](https://github.com/chromium/chromium/blob/main/media/base/limits.h)). Audio is decoded to float32, then down-mixed and resampled to the output device (§3).
- **Firefox** opens its output stream at the file's own rate for anything ≥44.1 kHz (capped at 384 kHz) and leaves any conversion to cubeb or the OS ([VideoUtils.cpp `DecideAudioPlaybackSampleRate`](https://github.com/mozilla-firefox/firefox/blob/main/dom/media/VideoUtils.cpp)).
- **Safari** decodes through AVFoundation/CoreAudio, and 24/96 FLAC/ALAC plays. Whether 176.4/192 kHz FLAC plays in iOS Safari is UNVERIFIED.
- **32-bit integer FLAC** (FLAC 1.4+) is UNVERIFIED in every browser.
- The FLAC spec allows up to 32-bit samples and sample rates up to about 1 MHz. MDN's "1–65,535 Hz" figure is wrong.

## 2. Media Source Extensions (MSE) and streaming-service web players

| MSE type                               | Chrome                                                                                                                                                                                         | Firefox                                                                                                                                                                                      | Safari                                                                                                                                                              | iPhone                  |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `audio/mp4; codecs="flac"` or `"fLaC"` | ✅ since 62 ([Chrome 62 notes](https://developer.chrome.com/blog/media-updates-in-chrome-62); [parser](https://github.com/chromium/chromium/blob/main/media/filters/stream_parser_factory.cc)) | ✅ both spellings ([MP4Decoder.cpp](https://github.com/mozilla-firefox/firefox/blob/main/dom/media/mp4/MP4Decoder.cpp); [bug 1783453](https://bugzilla.mozilla.org/show_bug.cgi?id=1783453)) | ✅ 17+ (see below)                                                                                                                                                  | ManagedMediaSource only |
| `audio/mp4; codecs="opus"`             | ✅ since 70 ([chromestatus](https://chromestatus.com/feature/5100845653819392))                                                                                                                | ✅                                                                                                                                                                                           | Probably (see below), UNVERIFIED                                                                                                                                    | ManagedMediaSource      |
| `audio/webm; codecs="opus"`            | ✅                                                                                                                                                                                             | ✅                                                                                                                                                                                           | ✅ ([WebKit WebM parser](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/platform/graphics/cocoa/SourceBufferParserWebM.cpp) handles `A_OPUS`/`A_VORBIS`) | ManagedMediaSource      |

- **Safari and FLAC in MP4.**
    - Safari 17 beta broke MSE FLAC playback. The fix maps `flac` to `fLaC` ([WebKit bug 260491](https://bugs.webkit.org/show_bug.cgi?id=260491)).
    - Older builds claimed support but played silence ([WebKit bug 198583](https://bugs.webkit.org/show_bug.cgi?id=198583)).
- **Safari and Opus in MP4.** Shaka Player rewrites codec strings for WebKit: `fLaC` always, and `Opus` inside MP4 ([mime_utils.js](https://github.com/shaka-project/shaka-player/blob/main/lib/util/mime_utils.js)). An Apple engineer said Opus is supported "beginning in iOS 17, and only in MP4 files" for AVFoundation/HLS ([forum 759210](https://developer.apple.com/forums/thread/759210)). Always check at runtime with `isTypeSupported()`.
- **Firefox and fragmented MP4.** Firefox rejected Bilibili's 24/96 FLAC fMP4 because of how that stream's sidx/moof layout was packaged, not because of 96 kHz FLAC as such ([bug 2060830](https://bugzilla.mozilla.org/show_bug.cgi?id=2060830), from a search summary). Standards-conformant fragments work.
- **iOS.**
    - Classic `MediaSource` is exposed on iPad but not on iPhone.
    - `ManagedMediaSource` (MMS) is available in Safari 17 on macOS and on iOS 17.1+ ([BCD MMS](https://github.com/mdn/browser-compat-data/blob/main/api/ManagedMediaSource.json), [BCD MediaSource](https://github.com/mdn/browser-compat-data/blob/main/api/MediaSource.json)).
    - On iOS and Mac, WebKit will not open an MMS source until the element has `disableRemotePlayback` set or offers an AirPlay alternative source ([`deferredMediaSourceOpenCanProgress`](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/html/HTMLMediaElement.cpp); `defaultManagedMediaSourceNeedsAirPlay()` in [WebPreferencesDefaultValues.cpp](https://github.com/WebKit/WebKit/blob/main/Source/WebKit/Shared/WebPreferencesDefaultValues.cpp)).
    - MMS buffer thresholds default to High 30 / Low 10 (units presumably seconds) in [UnifiedWebPreferences.yaml](https://github.com/WebKit/WebKit/blob/main/Source/WTF/Scripts/Preferences/UnifiedWebPreferences.yaml).

**How the big services deliver audio on the web**

| Service (web player)          | Delivery                                                                                                                                                                                                                                                                                                                                                                                                   | Best quality on web                                                                                                                   |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **TIDAL**                     | Shaka Player with DASH manifests (plus "BTS" JSON manifests that carry direct URLs). Formats: HE-AAC v1 (LOW), AAC-LC (HIGH), FLAC (LOSSLESS), FLAC_HIRES (HI_RES_LOSSLESS). DRM is Widevine `SW_SECURE_CRYPTO` or FairPlay. Two `<video>` elements run for preloading. Details from the [TIDAL SDK source](https://github.com/tidal-music/tidal-sdk-web/tree/main/packages/player).                       | FLAC up to 24/192 on web ([TIDAL support](https://support.tidal.com/hc/en-us/articles/17412130162961-HiRes-FLAC-audio))               |
| **Qobuz**                     | `track/getFileUrl` format IDs: 5 = MP3 320, 6 = FLAC 16/44.1, 7 = FLAC 24/≤96, 27 = FLAC 24/≤192 ([api-evangelist/qobuz](https://github.com/api-evangelist/qobuz)). Web transport (element vs MSE) is UNVERIFIED.                                                                                                                                                                                          | Up to 24/192 claimed ([Qobuz help](https://help.qobuz.com/en/articles/10202-how-do-i-experience-hi-res-on-pc), from a search summary) |
| **Amazon Music**              | Amazon says the web player supports HD/Ultra HD ([Amazon help](https://www.amazon.com/gp/help/customer/display.html?nodeId=G8X4YJYLED87FSH2)). Users report "browser not supported" errors, so it depends on the browser. Codec and container UNVERIFIED.                                                                                                                                                  | HD / Ultra HD (browser-dependent)                                                                                                     |
| **Apple Music** (MusicKit JS) | HLS with FairPlay (Safari) or Widevine; AAC at 64 or 256 kbps. Apple staff: "playback of music with Lossless or Hi-Res Lossless quality is not currently supported" ([forum 683021](https://developer.apple.com/forums/thread/683021), June 2021). I found no later change.                                                                                                                                | AAC 256                                                                                                                               |
| **Spotify**                   | Widevine EME with AAC 128 (Free) / 256 (Premium) ([Spotify support](https://support.spotify.com/us/article/audio-quality/), from a search summary). Lossless (FLAC up to 24/44.1) launched 10 Sep 2025 for mobile, desktop, tablet and Connect only ([newsroom](https://newsroom.spotify.com/2025-09-10/lossless-listening-arrives-on-spotify-premium-with-a-richer-more-detailed-listening-experience/)). | AAC 256; no lossless on web                                                                                                           |
| **YouTube Music**             | MSE. itag 141 = AAC 256; itag 774 = Opus 256 (always resampled to 48 kHz, 20 kHz lowpass); both Premium ([yt-dlp #9724](https://github.com/yt-dlp/yt-dlp/issues/9724)). Which itags the web client picks per browser is UNVERIFIED.                                                                                                                                                                        | 256 kbps lossy                                                                                                                        |

## 3. What happens to sample rate and bit depth in the browser

- **Chrome, `<audio>` element path.**
    - Media is decoded to float32.
    - `ComputeHardwareOutputConfig` says "always resample to the hardware rate" so that mid-stream sample-rate changes are seamless ([audio_renderer_impl.cc](https://github.com/chromium/chromium/blob/main/media/renderers/audio_renderer_impl.cc)). The OS resampler is used instead only on Android (7.1+), ChromeOS and Fuchsia, and only for streams at 44.1 kHz or higher ([audio_latency.cc](https://github.com/chromium/chromium/blob/main/media/base/audio_latency.cc)).
    - A browser-side `AudioOutputResampler` guarantees output at the device's parameters ([header](https://github.com/chromium/chromium/blob/main/media/audio/audio_output_resampler.h)).
    - The resampler is a windowed sinc with 32–64 taps and 32 sub-sample offsets ([sinc_resampler.h](https://github.com/chromium/chromium/blob/main/media/base/sinc_resampler.h)).
    - On Windows Chrome uses WASAPI **shared** mode with the device mix format. A legacy `--enable-exclusive-audio` switch still exists; its own log message warns it "can lead to bad performance" ([audio_low_latency_output_win.cc](https://github.com/chromium/chromium/blob/main/media/audio/win/audio_low_latency_output_win.cc)).
- **Web Audio.**
    - An `AudioContext` defaults to the output device's preferred rate. If you pass a custom `sampleRate` that differs from the device, the browser MUST resample the output.
    - `decodeAudioData` resamples decoded audio to the context rate.
    - The spec requires 3,000–768,000 Hz ([Web Audio spec](https://github.com/WebAudio/web-audio-api/blob/main/index.bs)). Chrome and Firefox accept 3k–768k ([WebAudioUtils.h](https://github.com/mozilla-firefox/firefox/blob/main/dom/media/webaudio/WebAudioUtils.h)); WebKit accepts 3k–384k ([BaseAudioContext.cpp](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/Modules/webaudio/BaseAudioContext.cpp)).
    - The pipeline is float32 throughout. float32 holds 24-bit integer PCM exactly, so the float conversion is not a lossy step. Gain changes do alter the samples.
- **OS mixers.**
    - **Windows:** shared-mode streams must match the mix format's channel count and sample rate. The audio engine processes in float, and the user picks the shared format in mmsys.cpl. Exclusive mode bypasses the engine entirely ([MS device formats](https://learn.microsoft.com/en-us/windows/win32/coreaudio/device-formats), [exclusive-mode streams](https://github.com/MicrosoftDocs/win32/blob/docs/desktop-src/CoreAudio/exclusive-mode-streams.md)).
    - **macOS:** the device runs at its nominal rate ([`kAudioDevicePropertyNominalSampleRate`](https://developer.apple.com/documentation/coreaudio/kaudiodevicepropertynominalsamplerate)); exclusive access is "hog mode" ([`kAudioDevicePropertyHogMode`](https://developer.apple.com/documentation/coreaudio/kaudiodevicepropertyhogmode)).
    - **Android:** the mixer typically runs at 48 kHz, and "a sample rate greater than 48 kHz will typically result in decreased quality because a resampler must be used" ([NDK guide](https://developer.android.com/ndk/guides/audio/sampling-audio)). Android 14+ offers `MIXER_BEHAVIOR_BIT_PERFECT` for USB devices, but apps must opt in ([AOSP](https://source.android.com/docs/core/audio/preferred-mixer-attr)). Chrome only reads `PROPERTY_OUTPUT_SAMPLE_RATE` and does not use that API ([AudioManagerAndroid.java](https://github.com/chromium/chromium/blob/main/media/base/android/java/src/org/chromium/media/AudioManagerAndroid.java)).
    - **iOS:** the hardware rate is controlled by AVAudioSession. Web pages have no way to change it.
- **Bit-perfect playback in a browser: in practice, no.** Every browser outputs through the shared mixer at the mixer's rate.
    - Closest case A: Firefox opens its stream at the file's rate, so Linux with PipeWire `allowed-rates` could pass the native rate through (UNVERIFIED).
    - Closest case B: on a Mac with the device manually set to the file's rate and every volume at 100%, output _may_ be bit-transparent (UNVERIFIED; test with a DTS-in-WAV file over S/PDIF).
- **Routing `<audio>` through `MediaElementAudioSourceNode` (MEASN).**
    - In Chrome, once Web Audio is attached, the media pipeline switches to the file's own parameters ([web_audio_source_provider_impl.cc](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/platform/media/web_audio_source_provider_impl.cc)). Blink then resamples to the context rate with the SincResampler ([media_element_audio_source_handler.cc](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/modules/webaudio/media_element_audio_source_handler.cc)). With the default context rate that is still a single resampling stage.
    - Forcing a context rate adds a second stage. Cider v1 does this with `new AudioContext({sampleRate: 96000})` ([audio.js](https://github.com/ciderapp/Cider/blob/main/src/renderer/audio/audio.js)).
    - Cross-origin media without CORS outputs **silence**, as the spec requires. You need `crossorigin="anonymous"` plus CORS headers on Supabase Storage.
    - **Safari can only feed MEASN from AVFoundation-backed playback.** The GPU process builds an audio source provider only from `AudioSourceProviderAVFObjC` ([RemoteMediaPlayerProxy.cpp](https://github.com/WebKit/WebKit/blob/main/Source/WebKit/GPUProcess/media/RemoteMediaPlayerProxy.cpp)). The MSE/MMS player ([header](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/platform/graphics/avfoundation/objc/MediaPlayerPrivateMediaSourceAVFObjC.h)) and the WebM player ([header](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/platform/graphics/cocoa/MediaPlayerPrivateWebM.h)) don't implement it. So gain, EQ and visualizers can't act on MSE, MMS or WebM (probably also Ogg) playback in Safari. This is inferred from source; verify on a device.
    - Firefox BCD notes that older versions threw when the context rate didn't match the media. Current source has no such check.

## 4. Mobile specifics

- **iOS audio session behaviour** ([MediaSessionManagerCocoa.mm](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/platform/audio/cocoa/MediaSessionManagerCocoa.mm)):
    - An audible `<audio>` element gets the `MediaPlayback` category. It ignores the silent switch, keeps playing when the screen locks, and appears in Now Playing.
    - Web Audio on its own gets `AmbientSound`, so it **is muted by the silent switch**.
    - While any Web Audio session is active, WebKit sets the preferred hardware buffer to 128 frames. That likely costs battery (my inference).
- **`navigator.audioSession`.**
    - Types are `auto | playback | transient | transient-solo | ambient | play-and-record`; states are `active | inactive | interrupted` ([spec](https://github.com/w3c/audio-session/blob/main/index.bs)).
    - Support: Safari 16.4 (`type` only); Firefox preview; Chrome no ([BCD](https://github.com/mdn/browser-compat-data/blob/main/api/AudioSession.json)).
    - WebKit maps `playback` to MediaPlayback, `transient`/`ambient` to Ambient, and `transient-solo` to SoloAmbient ([DOMAudioSession.cpp](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/Modules/audiosession/DOMAudioSession.cpp)).
- **Web Audio in the background.** An `AudioContext` is interrupted when the app goes to the background **unless** `audioSession.type` is `playback` or `play-and-record`. The same condition controls whether it appears in Now Playing ([AudioContext.cpp](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/Modules/webaudio/AudioContext.cpp)). The bug where contexts suspended even with `playback` set ([WebKit 261554](https://bugs.webkit.org/show_bug.cgi?id=261554)) was fixed in March 2024 and reportedly shipped in iOS 17.5 ([secondary source](https://github.com/fischnall3r/sadiss/issues/134)). MEASN was broken in iOS 17.0.x and fixed in 17.1 ([forum 740276](https://developer.apple.com/forums/thread/740276)).
- **iPhone volume lock.** `HTMLMediaElement.volume` is locked on iPhone: `defaultVolumeLocked()` is true on small-screen iOS, and a script-set value reverts ([HTMLMediaElement.cpp](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/html/HTMLMediaElement.cpp); [Apple guide](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/Using_HTML5_Audio_Video/Device-SpecificConsiderations/Device-SpecificConsiderations.html)). iPad allows it. On iPhone, any fade or normalization therefore needs Web Audio.
- **Lockdown Mode** disables Web Audio (`disableInLockdownMode` in [WebKit preferences](https://github.com/WebKit/WebKit/blob/main/Source/WTF/Scripts/Preferences/UnifiedWebPreferences.yaml)). The player must still work without Web Audio.
- **Home-Screen web app background audio** is UNVERIFIED. Test on the target iOS version.
- **Android Chrome.** Background playback of media elements works. Chrome pauses _muted_ background media on Android by default (`kPauseMutedBackgroundAudio` in [media_switches.cc](https://github.com/chromium/chromium/blob/main/media/base/media_switches.cc)), so a silent pre-roll element may get paused when the screen is off. Test this.
- **Media Session** ([BCD](https://github.com/mdn/browser-compat-data/blob/main/api/MediaSession.json)):
    - Chrome 73 desktop / 57 Android; Firefox 82 (Android exposes the API with no UI); Safari 15 and iOS 15.
    - `setPositionState`: Chrome 81, Safari 15, Firefox 82. `seekto` handler: Chrome 78.
- **Autoplay.** Audible playback needs a user gesture, engagement, or an allowlist ([MDN autoplay guide](https://github.com/mdn/content/blob/main/files/en-us/web/media/guides/autoplay/index.md)). `navigator.getAutoplayPolicy` exists only in Firefox 112+. On iOS, `play()`/`load()` do nothing until the user initiates playback ([Apple guide](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/Using_HTML5_Audio_Video/Device-SpecificConsiderations/Device-SpecificConsiderations.html)). TIDAL calls `load()` on both of its media elements inside the first click.

## 5. Output device selection (`setSinkId`)

| API                                        | Chrome              | Edge | Firefox              | Safari                                                         |
| ------------------------------------------ | ------------------- | ---- | -------------------- | -------------------------------------------------------------- |
| `HTMLMediaElement.setSinkId`               | 49 (not on Android) | 17   | 116 (not on Android) | 18.4 (BCD says iOS mirrors this; usefulness on iOS UNVERIFIED) |
| `AudioContext.setSinkId` / `sinkId` option | 110                 | 110  | ❌                   | ❌                                                             |
| `MediaDevices.selectAudioOutput()`         | ❌                  | ❌   | 116                  | ❌                                                             |

- Sources: [BCD HTMLMediaElement](https://github.com/mdn/browser-compat-data/blob/main/api/HTMLMediaElement.json), [BCD AudioContext](https://github.com/mdn/browser-compat-data/blob/main/api/AudioContext.json).
- A non-default device needs user permission, gated by the `speaker-selection` permission policy ([spec](https://github.com/w3c/mediacapture-output/blob/main/index.html)). Chrome and Safari in practice expose output device IDs only after getUserMedia permission (UNVERIFIED detail).
- WebKit additionally requires a user gesture for speaker selection (`SpeakerSelectionRequiresUserGesture`).
- The TIDAL web SDK uses `setSinkId` on both of its media elements.

## 6. Gapless playback, crossfade and smart transitions

- **MSE with trimming** ([Chrome article, source on GitHub](https://github.com/GoogleChrome/developer.chrome.com/blob/main/site/en/blog/media-source-extensions-for-audio/index.md); seamless since Chrome 38):
    - Set `appendWindowStart = t` and `appendWindowEnd = t + audioDuration`, and `timestampOffset = t − frontPadding`.
    - Works regardless of codec or container.
    - Encoder padding: LAME adds 576 samples at each end. AAC priming is typically 2112 samples (iTunSMPB tag or edit list; UNVERIFIED). Opus has a pre-skip, typically 312 samples (UNVERIFIED).
    - FLAC, ALAC and PCM have **no padding**, so exact sample counts are enough.
    - Sample-rate changes inside one SourceBuffer are fine in Chrome, which always resamples to the hardware rate. In Safari and Firefox this is UNVERIFIED; group runs of tracks by format or use `changeType()`.
- **Web Audio `decodeAudioData`.**
    - Sample-accurate `start(when)`, but the whole file must be decoded first, and it is resampled to the context rate.
    - Memory for float32 stereo: 21 MB/min at 44.1 kHz, 23 MB/min at 48 kHz, 46 MB/min at 96 kHz, 92 MB/min at 192 kHz.
    - For streaming decode, use WebCodecs `AudioDecoder` (Chrome 94, Firefox 130, Safari 26; [BCD](https://github.com/mdn/browser-compat-data/blob/main/api/AudioDecoder.json)) or WASM decoders into an AudioWorklet. On iOS that inherits all the Web Audio caveats from §4.
- **Two `<audio>` elements handed off.** Switch latency causes gaps. TIDAL's production web player does **not** attempt true gapless: it runs two Shaka instances and applies a **250 ms micro-crossfade** starting 0.25 s before the end, using element volume ramps (`#GAPLESS_CROSSFADE_MS = 250` in `shakaPlayer.ts`, [SDK](https://github.com/tidal-music/tidal-sdk-web)). This cannot work on iPhone, because element volume is locked there.
- **Libraries** (latest npm versions):
    - Gapless-5 1.6.2 (May 2026): starts with HTML5 audio, then switches to Web Audio once the file is decoded; `loadLimit` controls memory ([README](https://github.com/regosen/Gapless-5)).
    - Howler 2.2.4: last release Sep 2023, no MSE; its `html5` mode is for large files ([README](https://github.com/goldfire/howler.js)).
    - Shaka Player 5.2.12, dash.js 5.2.1, hls.js 1.7.3.
- **Smart transitions.** Plexamp's "Sweet Fades" is said to crossfade except between consecutive tracks of the same album, which stay gapless (UNVERIFIED). Any crossfade needs two decoders running at once plus gain control, which on iPhone means Web Audio fed from AVFoundation sources.

## 7. Loudness normalization

- **Reference levels.** ReplayGain 2.0 measures with BS.1770 against **−18 LUFS**; EBU R128 targets **−23 LUFS**. Opus files use `R128_TRACK/ALBUM_GAIN` tags in Q7.8 fixed point, referenced to −23 LUFS, plus an output-gain field in the header ([rsgain README](https://github.com/complexlogic/rsgain); RFC 7845).
- **Service targets.**
    - rsgain lists −14 LUFS for Spotify, YouTube Music and Amazon, and −16 LUFS for Apple Music. That table is a secondary source; I could not reach the official vendor pages.
    - TIDAL's SDK computes `min(10^((replayGain + 4)/20), 1/peak)` ([normalize-volume.ts](https://github.com/tidal-music/tidal-sdk-web)). That is a +4 dB pre-amp, capped at unity (attenuation only), with separate ALBUM and TRACK modes. It matches −14 LUFS if TIDAL's gains are referenced to −18 LUFS (my inference).
    - Spotify's Loud (−11) and Quiet (−19) presets are UNVERIFIED.
- **Clipping protection.**
    - Players should cap gain using the peak tag. mpv's default `--replaygain-clip=no` lowers the gain to avoid clipping ([mpv options](https://github.com/mpv-player/mpv/blob/master/DOCS/man/options.rst)).
    - Peak measurement differs by tool: rsgain defaults to sample peak, loudgain always uses true peak, and true-peak scans run 2–4× slower.
    - rsgain Easy Mode uses −18 LUFS, writes album tags, and protects against clipping only for positive gains.
- **Tools.**
    - **rsgain** handles FLAC, APE, M4A (AAC/ALAC), WAV, WavPack, DSF, AIFF and Opus.
    - **FFmpeg `ebur128`** is a meter.
    - **FFmpeg `loudnorm`** _rewrites the audio_: defaults are I = −24, LRA = 7, TP = −2, and dynamic mode upsamples to 192 kHz ([filters.texi](https://github.com/FFmpeg/FFmpeg/blob/master/doc/filters.texi)). Never use it on masters.
- **Applying gain in a web player.**
    - `volume` only accepts values in [0, 1]; anything else throws IndexSizeError.
    - Negative gain: multiply it into the element's volume (desktop, Android, iPad).
    - Positive gain, or any gain on iPhone: use a `GainNode`.
    - Cap using the peak so no limiter is needed. `DynamicsCompressorNode` is not a true-peak brickwall limiter (UNVERIFIED characteristics).
    - The NetEase song-URL API also returns a `gain` field ([docs](https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced)).

## 8. Electron (future desktop shell): bit-perfect and exclusive output

- **Plain Electron** plays through Chromium's pipeline, so it has the same shared-mode resampling as the browser (§3). The `--enable-exclusive-audio` switch is legacy and Windows-only, and it still mixes at a fixed rate. It is not a bit-perfect solution.
- **mpv / libmpv.**
    - `--audio-exclusive` works with the wasapi, coreaudio, pipewire and audiounit outputs. `--audio-spdif=dsd` gives bit-perfect DSD over DoP via WASAPI exclusive.
    - `--gapless-audio=weak` (the default) reopens the device when the format changes; `yes` locks to the first file's format.
    - Other relevant flags: `--replaygain*` and `--coreaudio-change-physical-format` ([options.rst](https://github.com/mpv-player/mpv/blob/master/DOCS/man/options.rst), [ao.rst](https://github.com/mpv-player/mpv/blob/master/DOCS/man/ao.rst)).
    - **Feishin 1.17** (Electron ^43.7) drives an external mpv binary over a JSON IPC socket via node-mpv; its web backend uses react-player ([repo](https://github.com/jeffvli/feishin)).
    - **Supersonic** embeds libmpv with `gapless-audio=weak`, ReplayGain via mpv properties, and `audio-exclusive` turned on during playback and off when paused ([player.go](https://github.com/dweymouth/supersonic/blob/main/backend/player/mpv/player.go)).
- **Rust cpal 0.18.2** (Aug 2026): WASAPI is shared-only in the source; ASIO is supported; on CoreAudio it switches the device's nominal sample rate; on PipeWire it sets `node.rate` so `allowed-rates` works ([cpal](https://github.com/RustAudio/cpal)). Pair it with symphonia via napi-rs. WASAPI exclusive would need custom code.
- **TIDAL's desktop pattern.** The same web SDK hands playback to `window.NativePlayerComponent`, which exposes `shared` and `exclusive` device modes and a `deviceexclusivemodenotallowed` error (`nativePlayer.ts`). Copying this architecture means swapping the engine behind the player interface while keeping the UI.
- **Other apps.**
    - The macOS Music app did not auto-switch the device sample rate from launch through at least macOS 12.3.1, while the iOS Music app does ([LosslessSwitcher README](https://github.com/vincentneo/LosslessSwitcher)). That tool is still maintained for macOS 15.4+, which suggests the Mac app still doesn't switch (my inference).
    - Cider v1 is Web Audio on MusicKit at 96 kHz, so not bit-perfect.
    - Roon, Plexamp and foobar2000 exclusive-mode and rate-switching behaviour is UNVERIFIED (docs were blocked).

## 9. Offline caching

- **Service Worker, Cache Storage and Range requests.**
    - Media elements send Range requests. Precache the _full_ file (`cache.add`) and add `RangeRequestsPlugin`, which slices the cached Blob and returns 206/416. Put `crossorigin` on the element even for same-origin files ([Workbox guide](https://github.com/GoogleChrome/developer.chrome.com/blob/main/site/en/docs/workbox/serving-cached-audio-and-video/index.md); workbox-range-requests 7.4.1).
    - Caching a response _while it streams_ does not work, because only partial content passes through.
- **Simpler alternative:** store files in OPFS or IndexedDB and play them through `URL.createObjectURL(file)`. Blob URLs handle seeking internally, with no Service Worker Range logic needed. OPFS is available in Chrome 86 (Android 109), Firefox 111 and Safari 15.2 ([BCD](https://github.com/mdn/browser-compat-data/blob/main/api/StorageManager.json)).
- **Quotas** ([MDN](https://github.com/mdn/content/blob/main/files/en-us/web/api/storage_api/storage_quotas_and_eviction_criteria/index.md)):
    - Chrome: 60% of disk per origin, 80% in total.
    - Firefox: best-effort is the smaller of 10% of disk or a 10 GiB group limit; persistent storage gets 50% (up to 8 TiB).
    - Safari (macOS 14 / iOS 17+): about 60% per origin for Safari **and for Home-Screen web apps**, 15% for other WebKit apps; 80% in total.
    - **Safari evicts script-written data after 7 days of browser use with no user interaction.** Call `navigator.storage.persist()`; Safari and Chrome approve it silently based on engagement.

## 10. Quality tiers currently offered

| Service                                                                                                                | Tiers                                                                                                                                                                                                                                                                                            |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **NetEase Cloud Music** (API `level`, unofficial [docs](https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced)) | See breakdown below                                                                                                                                                                                                                                                                              |
| **QQ Music** (reverse-engineered, [qqmusic-api-python 0.7.3](https://github.com/l-1124/QQMusicApi))                    | See breakdown below                                                                                                                                                                                                                                                                              |
| **Apple Music**                                                                                                        | API `audioVariants`: `lossy-stereo`, `lossless`, `hi-res-lossless`, `dolby-atmos`, `dolby-audio` ([docs](https://developer.apple.com/documentation/applemusicapi/songs/attributes-data.dictionary)). AAC 256; ALAC 16/44.1–24/48; Hi-Res ALAC up to 24/192 (bit depths UNVERIFIED this session). |
| **Spotify**                                                                                                            | Web: AAC 128/256. Apps: Vorbis up to 320 kbps (tier numbers UNVERIFIED); Lossless FLAC up to 24/44.1 (Sep 2025).                                                                                                                                                                                 |
| **YouTube Music**                                                                                                      | Low 48 / Normal 128 / High 256 kbps (Premium). High is AAC (itag 141) or Opus (itag 774). The 48/128 figures are UNVERIFIED.                                                                                                                                                                     |
| **TIDAL**                                                                                                              | HE-AAC v1 (LOW, about 96 kbps), AAC-LC (HIGH, about 320 kbps), FLAC 16/44.1, FLAC up to 24/192. MQA was dropped in July 2024 (search summary). Bitrates UNVERIFIED.                                                                                                                              |
| **Qobuz**                                                                                                              | MP3 320, FLAC 16/44.1, FLAC 24/≤96, FLAC 24/≤192                                                                                                                                                                                                                                                 |
| **Amazon Music**                                                                                                       | SD up to 320 kbps, HD FLAC 16/44.1, Ultra HD 24-bit up to 192 kHz, plus spatial formats (Amazon help)                                                                                                                                                                                            |

- **NetEase Cloud Music levels:**
    - `standard`, `higher`, `exhigh`: 128, 192 and 320 kbps (`br` values of 128000, 192000 and 320000; 999000 means "maximum available").
    - `lossless`: FLAC.
    - `hires`: Hi-Res.
    - `jyeffect`: 高清臻音.
    - `sky`: 沉浸环绕声, with immersive types c51, ste, aac and the newer c512, ste2, aac2.
    - `dolby`: Dolby Atmos.
    - `vivid`: 臻音全景声 (Audio Vivid).
    - `jymaster`: 超清母带.
    - Bit depths and sample rates are UNVERIFIED.
- **QQ Music file types** (code and container):

    | Tier              | Codec / bitrate  | Code (container)         |
    | ----------------- | ---------------- | ------------------------ |
    | 标准              | MP3 128          | M500 (.mp3)              |
    | HQ                | MP3 320          | M800 (.mp3)              |
    | HQ                | Ogg 320          | O800 (.ogg)              |
    | HQ                | AAC 192          | C600 (.m4a)              |
    | 流畅              | AAC 96 or Ogg 96 | C400 (.m4a), O400 (.ogg) |
    | 低品质            | AAC 48           | C200 (.m4a)              |
    | SQ                | FLAC             | F000 (.flac)             |
    | SQ                | Ogg 640          | O801 (.ogg)              |
    | 臻品音质          | FLAC             | Q000 (.flac)             |
    | 臻品全景声 5.1    | FLAC             | Q001 (.flac)             |
    | 臻品全景声 7.1    | Ogg              | Q003 (.ogg)              |
    | 杜比全景声        | Dolby Atmos      | D004 (.mp4)              |
    | DTS:X             | DTS:X            | DT03 (.mp4)              |
    | 臻品母带 (Master) | FLAC             | AI00 (.flac)             |
    | Tencent AI codec  | NAC              | TL01 (.nac)              |

    Hi-Res is an entitlement in the API; its file code is UNVERIFIED.

## 11. Transparent lossy bitrates for a cellular rendition

- **Opus.** opusenc defaults to 96 kbps per stereo pair and gives 160 kbps as its "very high quality" example ([opusenc(1)](https://github.com/xiph/opus-tools/blob/master/man/opusenc.1)). Community consensus is roughly 128 kbps VBR near-transparent and 160 kbps safe (UNVERIFIED). Opus always decodes at 48 kHz.
- **AAC.**
    - Apple's encoder (FFmpeg `aac_at`, macOS only) and libfdk_aac are generally considered transparent around 192–256 kbps VBR (UNVERIFIED).
    - FFmpeg's native `aac` encoder defaults to 128 kbps CBR; give it at least 256 kbps (UNVERIFIED).
    - libfdk_aac is non-free and requires `--enable-nonfree`, which makes that FFmpeg build non-redistributable ([encoders.texi](https://github.com/FFmpeg/FFmpeg/blob/master/doc/encoders.texi)).
- **Compatibility.**
    - AAC-LC in MP4 plays on every target, including old iOS, and runs through AVFoundation in Safari, so Web Audio can process it.
    - Opus needs iOS 17.4+ (WebM) or 18.4+ (Ogg), and in Safari it plays through the WebM player, which Web Audio cannot process (§3).
    - **Choice:** AAC-LC 256 kbps in MP4 as the single universal rendition. An optional Opus 160 kbps rendition could serve Android and desktop.

---

## Recommendations for our player

**1. Default playback path: one plain `<audio>` element with no Web Audio.**

- Set `crossorigin="anonymous"`, `playsinline`, and `volume = 1` in Pure mode.
- Play the **original file** whenever `canPlayType` / `MediaCapabilities` says it can. This is the fewest processing stages available on every platform, it keeps iOS lock-screen and silent-switch behaviour correct, and it works in Lockdown Mode.
- Use Media Session metadata, action handlers and `setPositionState`.
- Unlock every media element inside the first user gesture.

**2. Ingest pipeline: never a lossy step on the lossless path.**

- Store originals untouched, with a SHA-256.
- Create a derived file only when the browser can't play the original:
    - ALAC → FLAC (for Chrome, Firefox and Android).
    - APE, WavPack, TTA, TAK → FLAC. (FFmpeg has decoders for all of these.)
    - WAV/AIFF → FLAC, unless the source is float; keep float as WAV.
    - DSD → 24-bit/176.4 or 88.2 kHz FLAC, and label it "converted from DSD". DSD-to-PCM can never be bit-exact.
- **Prove every lossless conversion.** Decode both files and hash them with `ffmpeg -i X -map 0:a -c:a pcm_s32le -f hash -hash md5 -`. The hash muxer converts to s16 by default, which would hide 24-bit differences ([muxers.texi](https://github.com/FFmpeg/FFmpeg/blob/master/doc/muxers.texi)).
- Also store a FLAC-in-fragmented-MP4 remux for MSE gapless (same FLAC frames, so lossless), and an AAC-LC 256 rendition for cellular.
- Where to run it: FFmpeg on Supabase Edge Functions is UNVERIFIED and probably a poor fit. Use a small worker container, or do it in the desktop browser at upload time with ffmpeg.wasm 0.12.15 or mediabunny 1.61.
- Run rsgain easy (−18 LUFS, album + track, peaks) and **store the tags in the database; never rewrite the audio**.

**3. Gapless, by tier.**

- **APE+CUE and gapless albums:** keep one continuous album file and play "virtual tracks" as time offsets. This is truly gapless with a single element and is robust in the background.
- **General queues:** MSE (desktop, Android) or ManagedMediaSource (iOS 17.1+, with `disableRemotePlayback = true`), appending FLAC fMP4 sequentially. Lossless files need no trimming. Lossy renditions need the priming/padding trims from §6.
- **Fallback:** hand off between two elements with a ~250 ms micro-crossfade (TIDAL's approach), only where volume is settable. On iPhone, accept small gaps or use the album-file approach. Test iOS background behaviour on a device.

**4. Use Web Audio only on opt-in, and only when needed.**

- When it's needed: positive ReplayGain, any normalization or crossfade on iPhone, EQ, visualizer.
- How to set it up:
    - Set `navigator.audioSession.type = "playback"` before creating the context. Require iOS 17.5+; disable these features below that.
    - `new AudioContext({latencyHint: "playback"})` with **no custom sampleRate**.
    - Handle the `interrupted` state.
- On Safari, only feed it AVFoundation sources (MP4/M4A/FLAC/WAV/MP3 files via `src=`), never MSE or WebM.
- Normalization: default to album mode for sequential album play and track mode for shuffle, at −18 LUFS. Use `gain = min(10^(G/20), 1/peak)`. Apply negative gain through element volume where it's settable and through a `GainNode` otherwise.

**5. Output device.** Use `setSinkId` where available (Chrome, Edge, Firefox, Safari 18.4+). Hide the picker on Android.

**6. Tell users the truth about quality.** Show a signal-path panel:

- _Source:_ for example "FLAC 24/96, original" or "converted from APE, bit-identical".
- _Processing:_ ReplayGain −6.2 dB / none.
- _Output:_ "System mixer at N kHz". Read N from a context's `sampleRate`; on iOS read it only after the first gesture.
- Badges: "Lossless", "Hi-Res (source)", "Lossy 256k (cellular)".
- State plainly that browsers resample to the system rate and are never bit-perfect, and that the desktop app with exclusive mode can be.
- Tell users they can set the OS device rate to 44.1 kHz (Audio MIDI Setup on macOS, Sound panel on Windows) to avoid resampling most CD-rate music.
- Hide the in-app volume slider on iPhone.

**7. Electron later.** Define a `Player` interface now, following TIDAL's browser / shaka / native split. In Electron, back it with libmpv or mpv via IPC:

- `--audio-exclusive=yes`, released when paused.
- `--gapless-audio=weak`.
- `--replaygain=album|track` with clip prevention.
- `--audio-spdif=dsd` for DoP.

That brings true bit-perfect output and sample-rate switching on Windows, macOS and Linux.
