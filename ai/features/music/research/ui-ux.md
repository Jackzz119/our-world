# Music player UI/UX research: Our World · Cinnaglass (2026-09-30)

**Method.** Sources are WebSearch results plus primary sources I could read directly: Apple HIG (JSON), raw GitHub READMEs/LICENSE/package.json, and npm registry metadata. The egress proxy blocked direct fetches of most news sites, so some claims rest on the search-result text for the linked page. **UNVERIFIED** means I could not confirm it from a primary or credible source. The search budget ran out before a few final checks.

## 1. Now playing and lyrics

**Apple Music (iOS 26)**

- **Controls get out of the way.** The Liquid Glass tab bar floats over content and shrinks while browsing ([newsroom](https://www.apple.com/newsroom/2025/06/apple-elevates-the-iphone-experience-with-ios-26/)). Since 26.1 you can swipe along the MiniPlayer to change track ([9to5Mac](https://9to5mac.com/2025/11/04/ios-26-1-gave-apple-music-convenient-new-trick/)).
- **Artwork is the hero.**
    - Full-screen animated album art on the Lock Screen ([MacRumors](https://www.macrumors.com/2025/06/11/ios-26-animated-lock-screen-album-art/)).
    - In 26.4, album pages go full-bleed. The track list sits on a color that "pairs with" the art, and the text is only ever white or black ([9to5Mac](https://9to5mac.com/2026/03/25/apple-music-in-ios-26-4-has-new-design-for-albums-playlists-and-more/), [Mayo](https://bzamayo.com/ios-26-new-album-page-design-music)).
- **Lyrics.**
    - Words "dance to the rhythm". Background vocals animate on their own, and duet singers sit on opposite sides ([Apple Music Sing](https://www.apple.com/newsroom/2022/12/apple-introduces-apple-music-sing/)).
    - iOS 26 adds line-by-line Translation and Pronunciation under the original. A Translate button at the lower left offers Show Translation, Show Pronunciation and Hide Original ([AppleInsider](https://appleinsider.com/inside/ios-26/tips/how-to-view-translated-lyrics-in-apple-music), [MacObserver](https://www.macobserver.com/tips/how-to/use-the-apple-music-lyrics-translation-feature/)).
    - Also new: AutoMix and Music Pins.
- **HIG rules that fit Cinnaglass.**
    - Glass is for the control layer, not content.
    - Use the _clear_ variant over media, plus a roughly 35% dark dimming layer when the content is bright.
    - Keep labels monochrome over colorful content, and use color "sparingly" ([Materials](https://developer.apple.com/design/human-interface-guidelines/materials), [Color](https://developer.apple.com/design/human-interface-guidelines/color)).

**YouTube Music**

- **Constant re-layouts.**
    - September 2025: a two-pane Now Playing. Lyrics moved into the button carousel, and Related opens from the song title. The progress bar lost its playhead and thickens while you scrub ([9to5Google](https://9to5google.com/2025/09/11/youtube-now-playing-2025-redesign/)).
    - April 2026: a split view gives the lower half to Up Next ([9to5Google](https://9to5google.com/2026/04/23/youtube-music-split-now-playing-redesign/)).
    - July 2026: testing full-screen cover art ([9to5Google](https://9to5google.com/2026/07/16/youtube-music-fullscreen-art/)).
- **Lyrics paywall.** Free users get 5 lyric views a month, then the lyrics blur ([MacRumors](https://www.macrumors.com/2026/02/09/youtube-music-paywalls-song-lyrics/)).
- **Samples.** A vertical feed of 30-second video cuts, each starting at a "musically interesting" point ([YouTube blog](https://blog.youtube/news-and-events/taking-music-discovery-to-the-next-level-with-samples/)).

**NetEase Cloud Music**

- **The vinyl play page (黑胶) is the brand.**
    - The 2024 relaunch "-1点，离音乐近一点" cut ads and refocused on listening ([China Daily](https://cn.chinadaily.com.cn/a/202401/09/WS659d1531a310af3247ffb5d1.html)).
    - 动态封面: full-screen animated covers on the vinyl page ([163](https://www.163.com/dy/article/IPSDMPSR05178FFG.html)).
    - Nine player styles, including 极简唱机 and 复古唱机 ([Sina](https://news.sina.cn/sx/2023-03-28/detail-imynmkrx8267976.d.html)).
    - The 2025 DIY player: a background image or up to 20 s of video, a choice of disc material, and a physically modeled tonearm ([数英](https://www.digitaling.com/articles/1307718.html)).
- **Lyrics.**
    - 逐字歌词 (word-by-word lyrics) plus a translation switch; human-translated lyrics since 2014 ([网易科技](http://tech.163.com/14/0404/16/9P0IV0HV00092594.html)).
    - 歌词海报 (lyric poster): long-press a line → pick lines → choose a template with or without the cover → share ([how-to](https://www.pc0359.cn/article/azjc/154951.html)).
- **一起听 (listen together, 2020).**
    - One-to-one: track, seek and song changes stay in sync, with emoji and voice.
    - The stranger mode unlocks chat after 5 minutes ([woshipm](https://www.woshipm.com/evaluating/5594262.html)).
    - Comments are the community.

**Spotify**

- **Desktop Now Playing View.** A resizable right sidebar with art, credits, artist and queue. It opens on play by default; this can be turned off ([Community](https://community.spotify.com/t5/Desktop-Windows/Desktop-New-quot-Now-Playing-View-quot-sidebar/td-p/5600889)).
- **February 2026 lyrics update.** Translations under each line, offline lyrics, and a lyrics preview directly under the art or Canvas loop, added "after tests suggested it increased engagement" ([Spotify](https://newsroom.spotify.com/2026-02-04/lyric-translations-offline-previews/)).
- **Jam.**
    - Everyone can play, pause, skip and add songs, and you can see who added each one ([Support](https://support.spotify.com/us/article/jam/)).
    - Remote Jams drift out of sync for some users ([thread](https://community.spotify.com/t5/Other-Podcasts-Partners-etc/Remote-Jam-not-in-sync/td-p/7027327)).

**Plexamp and Roon**

- **Plexamp UltraBlur.** Pulls the key colors out of the art and renders them "like looking through smoked glass"; every album page gets its own look ([Plexamp v3](https://medium.com/plexlabs/plexamp-v3-9af3b10063b4)).
- **Plexamp audio.** Loudness leveling, true gapless playback, and Sweet Fades, which picks the best crossover point for each track pair, based on MixRamp ([plex.tv](https://www.plex.tv/plexamp/), [ref](https://github.com/orgs/music-assistant/discussions/3929)). Users dislike that it also crossfades tracks within an album ([forum](https://forums.plex.tv/t/plexamp-always-sweet-fades-crossfades-album-tracks/933027)).
- **Roon.** One colored dot sums up the signal path; tap it for the full chain ([Roon](https://help.roonlabs.com/portal/en/kb/articles/signal-path)):
    - purple: lossless
    - blue: enhanced (processing you asked for)
    - green: high quality (the OS may resample)
    - yellow: lossy

**Doppler, Marvis and Albums**

- **Doppler.**
    - Local files; its "design adapts itself to match your music".
    - Artwork Search, Merge Albums and Recently Added.
    - Wi-Fi transfer: open doppler-transfer.com, scan a QR code, then drag and drop ([App Store](https://apps.apple.com/us/app/doppler-mp3-flac-player/id1468459747), [docs](https://brushedtype.co/docs/doppler/import-wifi/)).
- **Marvis.** The Home screen is made of user-defined sections that act as smart playlists ([MacStories](https://www.macstories.net/reviews/marvis-review-the-ultra-customizable-apple-music-client/)).
- **Albums.** Album-first, with an _album_ progress bar and credits from MusicBrainz/Discogs ([MacStories](https://www.macstories.net/reviews/albums-4-0-a-must-have-app-for-music-lovers/)).

**Open-source players**

- **YesPlayMusic (MIT).** Calm and Apple-like, and advertises "无任何社交功能" (no social features at all). Now in maintenance mode ([GitHub](https://github.com/qier222/YesPlayMusic)).
- **SPlayer (AGPL-3.0; its README also bans commercial use).** Cover-adaptive theme color, word-by-word and translated lyrics, local library, spectrum and fades. Its dev branch uses AMLL core 0.5 and Material Color Utilities ([GitHub](https://github.com/imsyy/SPlayer)).
- **Feishin (GPL-3.0).** A Navidrome/Jellyfin client with synced lyrics ([GitHub](https://github.com/jeffvli/feishin)).
- **Cider.** v1 is archived (AGPL); v2 is paid. Its immersive mode is an album-art collage with auto-scrolling lyrics over an animated color background ([How-To Geek](https://www.howtogeek.com/i-paid-for-a-better-apple-music-client-and-it-was-totally-worth-it/)).
- **Lyricify 4 (closed source).** Syllable-level lyrics, duet view and background vocals ([lyricify.app](https://lyricify.app/lyricify-4/)).

**Copy**

- Cover art as the only source of color.
- Lyrics one tap away (like Spotify's preview under the art).
- Translation as a quieter second line behind a single switch.
- Duet lines split left and right, with smaller background vocals.
- A scrubber that thickens when pressed.
- Album-level progress when playing an album.
- Roon's one-dot quality honesty.
- Gapless playback by default.

**Avoid**

- Skin marketplaces and comment feeds.
- Upsampled "quality" tiers.
- Quarterly re-layouts and feed-style discovery.
- Panels that open on their own.
- Upsells inside the lyrics.
- Crossfading album tracks.
- Glass everywhere.

## 2. Color from the cover art

**Extraction libraries**

- **Material Color Utilities (Apache-2.0).** QuantizerCelebi plus Score gives a source color and HCT tones, in roughly 10–100 ms per image ([repo](https://github.com/material-foundation/material-color-utilities), [DeepWiki](https://deepwiki.com/material-foundation/material-color-utilities/5.1-quantization-algorithms)).
- **colorthief v3 (MIT, 2026).** Quantizes in OKLCH and returns Vibrant/Muted swatches. It also has WCAG contrast helpers and runs in a Worker via OffscreenCanvas ([npm](https://www.npmjs.com/package/colorthief)).

**Rules that make it look designed**

1. **Harmonize.** Harmonize the background color and use only black or white text (Apple's 26.4 rule).
2. **Clamp in OKLCH.** For a dark field, keep lightness around 0.28–0.42 and chroma at or below 0.10. Then blend in 20–30% of the room's time-of-day light, so the player still takes its light from the room.
3. **Guard contrast.** At least 4.5:1 for body text and 3:1 for large text and controls ([WCAG 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)).
    - CSS `contrast-color()` returns black or white. Safari 26 has it ([WebKit](https://webkit.org/blog/16929/contrast-color/)); Chrome 147 and Firefox 146 reportedly do too (**UNVERIFIED**). Keep a JavaScript fallback.
    - Spotify's color pipeline is only reverse-engineered (**UNVERIFIED**, [analysis](https://inobtenio.com/en/posts/spotify-song-colors/)).

**Fluid backgrounds**

- **AMLL's mesh-gradient renderer.** A source comment says it "should be Apple Music's method"; it builds on [movingparts.io gradient meshes](https://movingparts.io/gradient-meshes). It exposes the right controls ([source](https://github.com/amll-dev/applemusic-like-lyrics/blob/main/packages/core/src/bg-render/index.ts)):
    - `setRenderScale`, `setFPS`, `setFlowSpeed`
    - `setStaticMode`, `pause`/`resume`
    - `setLowFreqVolume` (reacts to bass)
    - `setAlbum` (image or video)

    It is AGPL, so copy those controls, not the code.

- **Permissive options.** Paper Shaders `MeshGradient` (Apache-2.0, [repo](https://github.com/paper-design/shaders)) and `@mesh-gradient/core` (MIT, with frame pacing and accessibility options, [repo](https://github.com/mikhailmogilnikov/mesh-gradient)).
- **Plexamp's lesson.** Blurred _extracted colors_ beat a blurred cover, because the cover's text and borders smear.

**Performance on mobile**

- Blur a 32–64 px copy of the cover once.
- Then animate only transform and opacity, or a 4–5-point mesh at 0.25–0.5 render scale and at most 30 fps.
- Pause when the music is paused, the panel is hidden or the tab is in the background.
- Go static under low-motion, 减少透明效果 (reduce transparency) or low battery.
- Never animate `filter: blur()`, and don't stack `backdrop-filter` over the Pixi room, which already owns the GPU.
- `prefers-reduced-transparency` is Chromium-only ([Chrome](https://developer.chrome.com/blog/css-prefers-reduced-transparency), [caniuse](https://caniuse.com/wf-prefers-reduced-transparency)), so keep your own setting.

## 3. Library structure (1k–10k tracks)

- **Tabs.** 歌曲 · 专辑 · 歌手 · 歌单 (songs · albums · artists · playlists). "Recent" is a sort order, not a tab.
    - Apple pins a few items to the top of the Library, with a chosen tap action (open, play or shuffle). The limit was 6 in the beta; the final limit is **UNVERIFIED** ([MacRumors](https://www.macrumors.com/how-to/use-ios-new-music-pins-feature/)).
    - Marvis's saved filters act as smart playlists.
- **Ownership is a filter, not a separate tree.** Chips for 我的 / TA的 / 我们的 (mine / theirs / ours) on every list.
- **Sort:** recently added (default), title or artist by pinyin, year, play count.
- **Filters:** 收藏 (favorites), 无损 (lossless), Hi-Res (≥24-bit and >48 kHz, Apple's definition), 有逐字歌词 (has word-level lyrics), and 缺封面/缺歌词 (missing cover or lyrics) as a fix-up queue.
- **Index rail.** A–Z and # by pinyin initial.
- **Search.**
    - A client-side index is fine at 10k tracks (MiniSearch, MIT).
    - Tokenize Chinese with `Intl.Segmenter`, supported in all major browsers since 2024 ([web.dev](https://web.dev/blog/intl-segmenter)).
    - `pinyin-pro`'s `match` handles initials ("zwp"), full pinyin, and a mix of both ([npm](https://www.npmjs.com/package/pinyin-pro)).
    - Group results into songs / albums / artists / lyric snippets.
- **Album page.** Large art over a harmonized field, discs grouped, album progress and total time, the format in small type, and credits.
- **Long lists.** Virtualize them with `@tanstack/react-virtual` (MIT).
- **Empty states.** One sentence and one action, and the empty list _is_ the drop zone. For 我们的歌单: "放第一首你想让 TA 听的歌" ("add the first song you want them to hear").
- **Multi-select.**
    - Desktop, following Koel: shift/cmd-click, drag the selection onto a playlist, and batch-edit to change all selected songs at once ([Koel docs](https://github.com/koel/koel/blob/master/docs/usage/web-interface.md)).
    - Phone: long-press starts selection mode, and a bottom bar offers 加入我们的歌单 (add to our playlist) · 编辑 (edit) · 删除 (delete).
    - In batch edit, a field whose values differ shows "多个值" (multiple values).

## 4. Upload

**What others do**

- **YouTube Music.** Drag files anywhere onto the page; up to 100k songs in FLAC, M4A, MP3, OGG or WMA; no uploads from the mobile apps ([Help](https://support.google.com/youtubemusic/answer/9716522?hl=en)).
- **Koel.** Accepts dragged files _and folders_. It detects duplicates by file hash, not tags, and holds them in a panel where you discard or keep each one ([docs](https://github.com/koel/koel/blob/master/docs/usage/music-discovery.md)).
- **Funkwhale.** A status for each file, then server-side processing and metadata checks ([docs](https://docs.funkwhale.audio/stable/user/libraries/content/upload.html)).
- **Apple Sync Library.** Each song shows an iCloud status: Matched, Uploaded, Duplicate, Ineligible or Error ([iMore](https://www.imore.com/how-check-if-your-macs-songs-are-uploaded-matched-purchased-or-apple-music-drm-laden)).
- **Google Play Music Manager.** A desktop app for up to 50k songs; "scan and match" skipped songs the catalog already had ([Android Police](https://www.androidpolice.com/2012/12/18/google-finally-brings-scan-and-match-to-play-music-doesnt-require-uploading-your-whole-friggin-library-anymore/)).
- **Doppler.** Pair a desktop browser with a QR code, then drag and drop.

**The pattern to build**

1. **Drop files or folders anywhere in the player.**
    - For folders, `webkitGetAsEntry` works widely; `getAsFileSystemHandle` works in Chromium ([web.dev](https://web.dev/articles/files/drag-and-drop-directories)).
    - Also offer a picker with a folder button (`webkitdirectory`).
    - `showDirectoryPicker` is Chromium-only ([caniuse](https://caniuse.com/native-filesystem-api)).
2. **Read everything on the device before uploading,** using `music-metadata`'s `parseBlob` (MIT, [repo](https://github.com/Borewit/music-metadata)). It returns:
    - the tags and embedded cover
    - USLT/SYLT lyrics
    - the audio format: `lossless`, sample rate, bit depth, duration
    - ReplayGain loudness

    Pair side files by name: `song.lrc` or `.ttml`, and `cover.jpg` or `folder.jpg`.

3. **Preview cards, grouped by album.** Each shows the cover, a format chip ("FLAC 24/96") and a lyrics chip (逐字 word-level / 逐行 line-level / 无 none). Flag problems: missing cover, and garbled GBK tags.
4. **Duplicates.**
    - Take a quick fingerprint on the device (file size plus a hash of the first and last MB, with `hash-wasm`); the server then hashes the whole file.
    - Skip exact copies with the note "已在库里 · 查看" (already in library · view).
    - When it's likely the same song (same title and artist, duration within 2 s), ask "保留两个版本？" (keep both?).
5. **A state on every row.** 读取中 (reading) → 待上传 (waiting) → 上传 42% → 处理中 (processing: transcode, cover, loudness) → 完成 (done) / 重复 (duplicate) / 失败·重试 (failed · retry).
    - Show an overall progress bar, and tell the user they can close the panel.
    - Make uploads resumable (`tus-js-client`, or Uppy with Golden Retriever; all MIT).
6. **Edit inline**, with 应用到整张专辑 (apply to the whole album). Drop an image to replace the cover, drop an .lrc to attach lyrics, and nudge the lyric timing by ±0.1 s with a live preview.

**Limits on phones**

- On iOS, a web page can only pick from the Files app, not the Music library.
- Folder picking reportedly works in iOS Safari 18.4+ and Android Chrome 147+ (**UNVERIFIED**, [TestMu](https://www.testmuai.com/learning-hub/input-file-directory-browser-support/)).
- Background tabs get suspended: use resumable chunks and ask the user to keep the page open.
- Warn before sending big FLAC files over mobile data.
- It's fine to treat desktop as the bulk-upload path.

## 5. Audio-quality labels

**How the services label quality**

- **Apple.** Two badges: Lossless (up to 24-bit/48 kHz) and Hi-Res Lossless (above 48 kHz). Tap a badge to see the resolution; above 48 kHz may need a DAC ([Apple](https://support.apple.com/guide/iphone/play-lossless-audio-iph14e213417/ios), [MacRumors](https://www.macrumors.com/guide/apple-music-lossless/)).
- **Tidal.** "Max" means 24-bit above 44.1 kHz; tap the format for details ([Tidal](https://support.tidal.com/hc/en-us/articles/17412130162961-HiRes-FLAC-audio)).
- **Spotify.** A Lossless indicator in Now Playing and in the device picker, up to 24-bit/44.1 kHz ([Spotify](https://newsroom.spotify.com/2025-09-10/lossless-listening-arrives-on-spotify-premium-with-a-richer-more-detailed-listening-experience/)).
- **NetEase.** Its top tiers are effects sold as quality ([快科技](https://news.mydrivers.com/1/918/918553.htm), [X](https://x.com/Vincy1230/status/1848848797008597006)):
    - 标准/极高/无损/Hi-Res come from the original master.
    - 高清臻音/沉浸环绕声/超清母带 are made by AI upsampling and AI vocal/instrument separation.

**Being honest in a browser**

- Browsers resample audio to the device rate, usually 44.1 or 48 kHz ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/AudioContextOptions/sampleRate), [Mozilla bug](https://bugzilla.mozilla.org/show_bug.cgi?id=1675878)).
- Android resamples everything to 48 kHz ([Darko](https://darko.audio/2025/10/apple-musics-hi-res-audio-is-still-standing-in-its-own-light/)).

**Recommendation**

- One small monochrome chip by the time: "无损", "Hi-Res" (true of the source file, using Apple's thresholds), or nothing for lossy files.
- Tapping it opens a 播放链路 (playback chain) sheet, e.g. 文件 FLAC 24-bit/96 kHz → 浏览器解码 → 设备输出 48 kHz（已重采样） (file → browser decode → device output 48 kHz, resampled).
- Never claim Hi-Res _output_ in a browser. Roon's green "high quality" is the right level of honesty.

## 6. Mini player, queue, keyboard and accessibility

- **Mini player.** Keep your phone design (no floating bar; bars on the nav icon while music plays). Add Apple's swipe-to-skip on the sheet's top strip or the poster, with a rubber-band pull and the next cover peeking in.
- **Queue.**
    - Apple has Play Next / Play Last. Spotify's single "Add to queue" builds a block that plays before the rest of the playlist ([How-To Geek](https://www.howtogeek.com/spotifys-play-queue-is-the-best-in-the-business-heres-why/)).
    - Offer 下一首播放 (play next) and 加到末尾 (add to end).
    - Show the queue as 接下来 · 你加的 (up next · you added) / 来自：我们的歌单 (from: our playlist).
    - Drag to reorder; swipe to remove, with undo.
- **Desktop keys** (Koel and YouTube Music conventions, [Koel](https://github.com/koel/koel/blob/master/docs/usage/web-interface.md), [9to5Google](https://9to5google.com/2019/10/28/youtube-music-desktop-pwa/)):
    - Space: play/pause
    - ←/→: seek 10 s
    - ↑/↓: volume
    - M: mute · L: like
    - J/K: next/previous
    - F or /: search
    - ?: list all shortcuts

    Never act on these keys while the user is typing in a field.

- **Lock screen (Media Session).**
    - Artwork in several sizes, 96–512 px.
    - Call `setPositionState` on every seek, or the lock-screen scrubber freezes.
    - Handle play, pause, next, previous and seekto ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Media_Session_API), [iOS notes](https://dbushell.com/2023/03/20/ios-pwa-media-session-api/)).
    - Lock-screen controls may be more reliable with a real `<audio>` element than with WebAudio synthesis (**UNVERIFIED** on iOS).
- **Seek slider** (WAI-ARIA example, [APG](https://www.w3.org/WAI/ARIA/apg/patterns/slider/examples/slider-seek/)): the value is in seconds, `aria-valuetext` says it in words, arrows move one step, PageUp/PageDown move 15 steps, and Home/End jump to the ends.
    - Ours is a native range input, so the browser already handles the keys.
    - But `musicTime` produces "3:20，总时长 4:03". Switch it to words, e.g. "3 分 20 秒，共 4 分 3 秒", as the APG example does.
- **Lyrics and screen readers.**
    - Don't `aria-live` every line; it talks over the music.
    - Keep the full list, keep `aria-current` on the sung line, and offer an optional 朗读歌词 (read lyrics aloud) switch.
    - Auto-scroll that lasts longer than 5 s needs a pause (WCAG 2.2.2, [W3C](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)). Scrolling by hand pauses the follow, and a 回到当前句 (back to current line) pill resumes it.
- **Reduced motion** ([HIG](https://developer.apple.com/design/human-interface-guidelines/accessibility)): tighter springs, no motion at the edges of the view, and keep the fades.

## 7. Features for a couple

**What others do**

- **Apple collaborative playlists.** A contributor avatar on each song, emoji reactions, and a list of who reacted ([MacRumors](https://www.macrumors.com/2023/12/13/ios-17-3-collaborative-playlist-emoji/)).
- **Spotify.**
    - Jam shows who added each song.
    - Messages lets you send a track with text and emoji ([Spotify](https://newsroom.spotify.com/2025-08-26/introducing-messages-a-new-way-to-share-what-you-love-on-spotify-with-friends-and-family/)).
    - Blend shows a "taste match" percentage ([Spotify](https://newsroom.spotify.com/2021-08-31/how-spotifys-newest-personalized-experience-blend-creates-a-playlist-for-you-and-your-bestie/)).
- **Airbuds.** A widget showing friends' live listening, with reactions and a Ghost Mode ([App Store](https://apps.apple.com/us/app/airbuds-widget/id1638906106)).
- **SharePlay.** Everyone shares the controls and can add or reorder songs ([Apple](https://support.apple.com/guide/iphone/shareplay-watch-listen-play-iphb657eb791/ios)).

**Worth doing**

- **Who added it:** a small dot on each row of 我们的歌单.
- **Reactions:** one per person per song (a heart plus one emoji), shown as tiny faces.
- **"我们都喜欢" (we both like it):** two overlapping dots, plus a filter.
- **Song notes (送一首歌, "give a song").**
    - A song, one lyric line and a note of up to 60 characters.
    - Delivered as your existing gold letter (金亮信纸), and it plays from the quoted line.
- **Presence.**
    - "TA 在听《…》" (they're listening to …), shown only when true.
    - A 悄悄听 (listen privately) switch.
- **Later: listen together.**
    - Both people get the same controls.
    - Drift is corrected silently.
    - When sync drops, it says so plainly: 各自在听 (listening separately).
    - Never imply you're in sync when you aren't (already a rule in `interaction.md`).

**Gimmicky; avoid**

- compatibility percentages
- matching with strangers
- voice chat inside the player
- public comments
- streaks
- AI DJ chatter

## 8. Lyric renderers: AMLL and alternatives

**What AMLL offers**

- **Packages.** `@applemusic-like-lyrics/core`, `/react`, `/vue` (0.6.0, 2026-09-19), `/lyric` and `/ttml` ([npm](https://www.npmjs.com/package/@applemusic-like-lyrics/core), [repo](https://github.com/amll-dev/applemusic-like-lyrics)).
- **Features:**
    - Word-timed lines with translation and romanization.
    - Duet and background-vocal lines (`isDuet`, `isBG`).
    - Switches for spring motion, blur and scaling: `setEnableSpring`, `setEnableBlur`, `setEnableScale`.
    - Tunable word-fill softness and line springs: `setWordFadeWidth`, `setLinePosYSpringParams`.
    - The fluid background.
    - Parsers for LRC, YRC, QRC and TTML.

**License: AGPL-3.0-only on every package** (npm metadata and the repo LICENSE)

- **What the license says.**
    - Serving a JavaScript bundle to a browser transfers a copy, which the AGPL calls "conveying". Section 0: "Mere interaction… with no transfer of a copy, is not conveying"; a bundle is a transferred copy.
    - Section 5(c) then requires licensing "the entire work, as a whole" under the AGPL.
    - Section 13 adds a duty to offer the source to network users of any _modified_ version ([LICENSE](https://github.com/amll-dev/applemusic-like-lyrics/blob/main/LICENSE)).
- **My reading (not legal advice).**
    - Bundling AMLL makes our frontend AGPL, with a duty to offer users the source.
    - With two users the practical risk is small. But it rules out staying closed-source, it spreads to the whole app bundle, and it blocks any later distribution.
    - Isolating it in an iframe is a legal gray area.

**Technical fit is poor as well**

- The README says "please do not use it directly in production environments", and the project is seeking maintainers.
- It needs Pixi v7 (`@pixi/core` 7.4.3). The app runs `pixi.js` 8.19, so this means a second Pixi and a second WebGL context.
- Its stated needs (a CPU of at least 3.0 GHz for 60 fps; a GTX 10-series GPU for 1080p) are heavy for phones already drawing the room.

**Alternatives**

- **`@uimaxbai/am-lyrics`** (MPL-2.0, per npm; no LICENSE file found in the repo, **UNVERIFIED**).
    - A web component; its `ttml` attribute renders local lyrics with no network access.
    - Has background vocals and breathing dots during instrumental breaks.
    - By default it calls third-party lyric services, so always pass `ttml` ([npm](https://www.npmjs.com/package/@uimaxbai/am-lyrics)).
- **YouLy+ (MIT).** A lyrics engine built on CSS animations that claims 60 fps "on almost any machine"; a good permissive reference ([repo](https://github.com/ibratabian17/YouLyPlus)).
- **Small MIT pieces.** `react-lrc` (line-level display), `liricle` (word-level sync), `clrc` (parser).
- **Lyricify Lyrics Helper (Apache-2.0).** Documents the formats, including Apple's TTML extensions for translation, background vocals and singer alignment ([repo](https://github.com/WXRIW/Lyricify-Lyrics-Helper)).
- **Lyrics data.**
    - AMLL TTML DB: the parts contributors wrote are CC0, but the lyrics themselves stay copyrighted ([repo](https://github.com/amll-dev/amll-ttml-db)).
    - LRCLIB: MIT server code ([repo](https://github.com/tranxuanthang/lrclib)).

**Recommendation: build our own, clean-room** (no one writing it should read AMLL's code).

- **Data model.** Each line has start/end times, timed words, a singer (me / them / both), a background-vocal flag, and an optional translation.
- **Parsers.** LRC, enhanced LRC (with `<mm:ss.xx>` word tags) and TTML. TTML's `ttm:agent` marks the singer and `x-bg` marks background vocals (attribute names **UNVERIFIED**).
- **Motion.**
    - Fill each word with a `background-clip:text` or `mask-image` gradient.
    - One critically damped spring moves each line (translateY + scale), staggered 30–50 ms.
    - Distance blur on desktop only.
- **Layout.**
    - The second singer's lines align right.
    - Background vocals at 0.65× size and 60% opacity.
    - Breathing dots for gaps longer than 4 s.
- **Size.** About 500–800 lines of code with no new dependencies, which fits the CSS-first stance in `ui-motion.md`.

## Design recommendations

**A · 「唱片柜」 Crate: the objects are the interface**

- **Idea.** Extend the sleeve and vinyl you've built into the library. Albums are sleeves; the room's record player is the stage.
- **Desktop dock.** A two-column grid of sleeves that can switch to spines, with 我们的歌单 (our playlist) first.
- **Phone sheet.** At half height, a "recently added" shelf plus search; at full height, grid or list.
- **Now playing.** As built, plus swipe-to-skip on the sleeve.
- **Upload: 放进唱片柜 ("put it in the crate").** Dropped albums become paper inner sleeves whose covers come into focus as they're read, with a thin gold progress ring and an 已在柜里 (already in the crate) state for duplicates.
- **Why it feels premium.** Physical feel held back: inertia, paper, one gold accent.
- **Risks.** Singles without album tags need "单曲" (single) sleeves; it can tip into skeuomorphism; a 10k-track library needs a strict text mode.

**B · 「一页纸」 Paper: typographic minimalism**

- **Idea.** Like iOS 26.4 and Albums: one page of type, where the artwork and its harmonized color are the only decoration.
- **Library.**
    - A segmented control, owner chips, sort and the index rail.
    - Album pages have full-bleed art fading into its color field, with only black or white text.
    - Phone sheet at half height: search + 继续听 (keep listening) + 我们的歌单.
- **Now playing.** A 56 px strip that stays pinned while you browse, expanding to art plus lyrics. Immersive lyrics are large and left-aligned, with the translation as a lighter second line.
- **Upload.** A tray at the top of the library that unfolds into an editable table, with a status chip on each row and "apply to album".
- **Why it feels premium.** Chinese typesetting, with 站酷小薇 kept for titles; quiet metadata; zero chrome.
- **Risks.** It can feel generic next to the painted room, and it demands exacting typography and contrast guards.

**C · 「两个座位」 Two Seats: built around the relationship**

- **Idea.** 我们的 · 我的 · TA的 (ours · mine · theirs) is the first level, and the social pieces stay tiny.
- **Library.** Opens on 我们的歌单. Rows carry the who-added dot and reactions, and 最近 (recent) becomes a shared timeline.
- **Now playing.** A "TA 放的" (they put this on) tag, their reaction stamped on the sleeve, and a "TA 也在听" (they're listening too) pulse only when true.
- **Upload and gifts.** Upload ends with "放进我们的歌单？" (add to our playlist?). A song note appears as a record on the partner's side of the desk in the room scene.
- **Why it feels premium.** Emotional precision; the room itself becomes the notification surface.
- **Risks.** Needs a realtime backend and privacy controls; notification fatigue; scope creep; must never fake sync.

**Suggested path**

- B's library structure and upload table.
- A's Now Playing (already built) and its sleeve physics.
- C's three features (who added it, reactions, song notes) inside 我们的歌单.
- Leave listen-together for the planned bench ritual in `interaction.md`.

## Micro-interactions that make it feel high-end

1. **Vinyl inertia.** The record spins up and down over about 600 ms, and the tonearm settles when play starts.
2. **No clicks.** Fade the volume over 120–200 ms on play, pause and seek. Play albums gapless; crossfade only in shuffle.
3. **A responsive scrubber.** It thickens when pressed, a time bubble follows the thumb, and the lyric at that point previews while you drag.
4. **Swipe to skip.** A rubber-band pull with the next cover peeking in.
5. **Shared artwork.** The artwork moves as a shared element from the list row to Now Playing. On a track change, the cover and background blend in OKLCH over about 700 ms.
6. **Living lyrics.** Words fill with a feathered edge, lines spring in 30–50 ms apart, and dots breathe during instrumental breaks.
7. **Manual scroll.** Scrolling the lyrics by hand pauses auto-follow; a "回到当前句" (back to current line) pill appears after 3 s idle.
8. **Two hearts.** Your heart burst (already built), and the partner's heart arrives as a second dot with a soft pop.
9. **Queue dragging.** The row lifts (1.02× scale plus a shadow) and its neighbors spring apart. "下一首播放" (play next) shows a toast with undo.
10. **Upload cards.** A blurred placeholder sharpens into the real cover once it's read, with a progress ring on each card.
11. **Volume.** A perceptual volume curve; unmuting restores the previous level.
12. **Lock screen.** The same poster on the lock screen, updated the instant the track changes.
13. **Low-motion mode.** Frozen vinyl, crossfaded lyrics and a static background, while keeping the fades (your existing three-level setting).
14. **The quality chip.** Tapping it opens the playback-chain sheet: honesty as a small delight.
