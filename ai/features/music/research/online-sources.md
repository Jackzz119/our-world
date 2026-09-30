# Online & self-hosted music sources: research for the "Our World" player

_Research date: 2026-09-30. Scope: Phase-2 online sources, metadata/lyrics enrichment, "listen together", integration architecture. This is not legal advice._

**Method note.** The research sandbox's network proxy blocked direct fetches of many primary domains, including developer.spotify.com, developers.google.com, developer.tidal.com, musicbrainz.org, supabase.com and most Chinese sites. For those I checked claims in three ways:

- search-engine extracts of the primary page;
- GitHub mirrors (official repos, OpenTermsArchive);
- decoding the official Apple DPLA PDF (UK edition, dated 18 Aug 2026) locally.

Anything I could not confirm from a primary or strong secondary source is marked **UNVERIFIED**.

## 0. Key findings

1. **No mainstream service gives a web app lossless audio.**
    - Spotify Web Playback SDK: about AAC 256 kbps.
    - Apple MusicKit JS: at most AAC 256 kbps.
    - YouTube: only a visible, lossy video embed.
    - TIDAL: third-party apps get 30-second previews only.
    - Qobuz: lossless and not DRM-protected, but open to partners only.
    - Deezer and Amazon Music: closed to new developers.
2. **Lossless in a browser is only possible for content that we or the user control.** That means our own uploads, a user's Navidrome/Jellyfin server, Bandcamp purchases, and FLAC files from Jamendo or the Internet Archive.
3. **Spotify tightened access in 2025–26.**
    - Development Mode now allows 1 Client ID, up to 5 allowlisted users, and requires Premium for both the developer and the users.
    - Extended quota is only available to registered businesses with at least 250k monthly active users.
    - Verdict: fine for 2 people; impossible for a public product. Its policy also forbids crossfading, mixing, and copying core features such as Jam.
4. **Apple Music (MusicKit JS) is the only official full-catalog option that works both abroad and in mainland China.** Web playback inside China is UNVERIFIED. Integrating it needs the Apple Developer Program (US$99/yr), and because its audio is DRM-protected it cannot pass through our own audio processing (EQ, normalization, crossfade).
5. **China:**
    - NetEase has opened an official route for individual developers (ncm-cli, 2026), but the songs it can play are a strict subset of what the official app can play.
    - Every unofficial route is unsafe for a public product; there are civil and criminal court precedents.
6. **Listen together:**
    - On our own playback engine, about ±20–50 ms is realistic (estimate).
    - On DRM SDKs we can only correct drift by seeking (hundreds of ms), and the terms are grey: Spotify effectively says no; Apple requires each user to start playback themselves.

## 1. Comparison table

| Source                                                                                        | Full-track playback?                     | Auth / subscription needed                                               | Max quality on web                                      | Web SDK                              | Mainland China availability                                  | Key ToS constraints                                                                                                                               | OK for 2-person private app?         | OK for public product?               | Our recommendation                     |
| --------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ------------------------------------ | -------------------------------------- |
| Own uploads (Supabase Storage)                                                                | Yes                                      | Our auth                                                                 | FLAC up to 24/192 decoded; resampled to the device rate | n/a (our own engine)                 | Yes (whether Supabase is reachable from China is UNVERIFIED) | Only content we have rights to; UGC and takedown process if public                                                                                | Yes                                  | Yes                                  | **Core; build first**                  |
| Navidrome / any OpenSubsonic server                                                           | Yes                                      | User's server + API key or token                                         | Original FLAC/hi-res, or server transcode               | REST (OpenSubsonic)                  | Yes, self-hosted (home-ISP inbound limits apply)             | User's own content                                                                                                                                | Yes                                  | Yes (bring your own server)          | **First online source**                |
| Jellyfin                                                                                      | Yes                                      | User's server token                                                      | Original or transcoded                                  | REST                                 | Yes                                                          | Same as above                                                                                                                                     | Yes                                  | Yes                                  | Second (same adapter family)           |
| Plex / Plexamp                                                                                | Yes                                      | Plex account; remote-play rules UNVERIFIED                               | Original                                                | REST (official docs UNVERIFIED)      | UNVERIFIED                                                   | Plex ToS                                                                                                                                          | Maybe                                | Maybe                                | Later / optional                       |
| Spotify                                                                                       | Yes, Premium only                        | Dev Mode: owner and users Premium, ≤5 users, 1 Client ID                 | ≈AAC 256 kbps; Lossless not on web                      | Web Playback SDK (Widevine)          | Not offered                                                  | No mixing, crossfade or overlap; no sync with visual media; don't replicate core features; only temporary caching; no ML; Dev Mode non-commercial | Technically yes (no listen-together) | **No** (extended quota unattainable) | Optional; private only                 |
| Apple Music                                                                                   | Yes, subscribers only                    | Dev Program ($99/yr), ES256 developer JWT, Music User Token              | AAC 256 kbps (HIGH); no lossless                        | MusicKit JS v3 (FairPlay/Widevine)   | Service operates; web playback UNVERIFIED                    | Users start playback with standard controls; no download, modify or sync; no monetizing access; no re-hosting the JS                              | Yes                                  | Yes (if compliant, not paywalled)    | **Main official catalog**              |
| YouTube / YT Music                                                                            | Only via a visible IFrame (video)        | Data API key (search)                                                    | Lossy embed                                             | IFrame Player API                    | Blocked                                                      | No audio-only, hidden or background player; min 200×200; no extraction; **no official YT Music API**                                              | Only as a visible video panel        | Only as a visible video embed        | Low priority                           |
| TIDAL                                                                                         | **No** (30 s previews for third parties) | Client ID + user login                                                   | Previews only                                           | tidal-sdk-web (official Player only) | Not available                                                | Official unmodified Player module only                                                                                                            | No value                             | No                                   | Watch; don't build                     |
| Qobuz                                                                                         | Partner only                             | app_id via api@qobuz.com + subscription                                  | FLAC 24/192 (not DRM-protected)                         | None                                 | Not available                                                | Partner terms (French law)                                                                                                                        | Only if approved                     | Only if approved                     | Ask later; never scrape                |
| Deezer                                                                                        | No (previews); new apps closed           | Cannot create new apps                                                   | 30 s MP3 previews                                       | Old SDKs deprecated                  | Not offered (UNVERIFIED)                                     | Personal apps; no circumvention                                                                                                                   | Metadata only                        | Metadata only (grey)                 | Artwork fallback only                  |
| Amazon Music                                                                                  | Closed beta                              | Business-development contact                                             | n/a                                                     | None public                          | No                                                           | Private agreement                                                                                                                                 | No                                   | No                                   | Ignore                                 |
| SoundCloud                                                                                    | Yes (API streams)                        | Approved app (request form), OAuth 2.1 PKCE                              | AAC HLS 160 kbps                                        | Widget iframe + REST                 | Reportedly blocked (UNVERIFIED)                              | Credit uploader and SoundCloud, backlinks; no "alternative digital content service"                                                               | Yes, if approved                     | Risky                                | Optional                               |
| Audius                                                                                        | Yes                                      | None; API key optional                                                   | MP3 320 kbps / 48 kHz                                   | JS SDK + REST                        | UNVERIFIED                                                   | Audius API terms (UNVERIFIED)                                                                                                                     | Yes                                  | Yes                                  | Nice-to-have                           |
| Jamendo                                                                                       | Yes                                      | client_id; free for non-commercial use                                   | MP3 ~192k / OGG streams; FLAC downloads                 | REST                                 | UNVERIFIED                                                   | API non-commercial; per-track Creative Commons terms                                                                                              | Yes                                  | Only with a deal                     | Optional                               |
| Internet Archive / LMA                                                                        | Yes                                      | None                                                                     | FLAC originals                                          | REST                                 | Reportedly blocked (UNVERIFIED)                              | Per-item rights                                                                                                                                   | Yes                                  | Yes (check rights per item)          | Niche (live shows)                     |
| Free Music Archive                                                                            | Download only                            | None                                                                     | Varies                                                  | API shut down                        | UNVERIFIED                                                   | Host copies yourself under CC                                                                                                                     | Import                               | Import                               | Import-only                            |
| Bandcamp                                                                                      | Via purchased downloads                  | Account                                                                  | FLAC/ALAC/WAV downloads                                 | Embeds only; no fan API              | UNVERIFIED                                                   | No public fan API                                                                                                                                 | Yes (buy → upload)                   | Yes (user uploads)                   | **Promote as the "buy lossless" path** |
| NetEase Cloud Music, official open platform                                                   | Partial (per-channel rights)             | Individual or enterprise developer (appId + privateKey), user login, VIP | Up to lossless where licensed (UNVERIFIED)              | REST / ncm-cli                       | Yes (overseas geo-limits)                                    | Platform agreement not reviewed (UNVERIFIED)                                                                                                      | Possibly: spike it                   | Enterprise contract needed           | **Investigate for China**              |
| QQ Music/TME, Kugou, Kuwo (official)                                                          | Partners only                            | Enterprise contracts                                                     | Contract-specific                                       | OpenAPI / H5 SDK                     | Yes                                                          | Commercial licensing                                                                                                                              | No (no individual route found)       | With a contract                      | Only for a CN launch                   |
| Unofficial CN APIs (NeteaseCloudMusicApi forks, LX Music sources, MusicFree plugins, Listen1) | Yes (grey)                               | Your VIP cookies                                                         | Up to lossless                                          | n/a                                  | Yes                                                          | Platform ToS; unfair competition; circumvention laws                                                                                              | Works, but ToS / ban / legal risk    | **Never**                            | Never in product                       |
| YouTube stream extraction (yt-dlp, ytmusicapi)                                                | Yes (grey)                               | Cookies                                                                  | Lossy                                                   | n/a                                  | Blocked                                                      | YouTube ToS; anti-circumvention rulings                                                                                                           | Not recommended                      | **Never**                            | Never                                  |

## 2. Streaming services

### 2.1 Spotify

**Development Mode**

- New Client IDs from 11 Feb 2026, and existing apps from 9 Mar 2026:
    - Premium required;
    - one Development Mode Client ID per developer;
    - up to 5 authorized users per Client ID (it used to be 25);
    - a smaller set of endpoints.
- The mode is reserved for "personal projects for non-commercial use by individual developers" ([blog 2026-02-06](https://developer.spotify.com/blog/2026-02-06-update-on-developer-access-and-platform-security), [TechCrunch](https://techcrunch.com/2026/02/06/spotify-changes-developer-mode-api-to-require-premium-accounts-limits-test-users/)).
- The endpoint restrictions for existing apps were postponed on 9 Mar 2026; the Premium requirement and user cap still applied ([Mar 2026 changelog](https://developer.spotify.com/documentation/web-api/references/changes/march-2026)).
- For new Client IDs:
    - search `limit` max is 10;
    - Top Tracks, New Releases and `POST /users/{id}/playlists` are removed ([migration guide](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide)).
- May 2026 added a stable `account_id` field ([May 2026 changelog](https://developer.spotify.com/documentation/web-api/references/changes/may-2026)).

**Extended quota**

- Since 15 May 2025, only registered businesses with at least 250k monthly active users, operating in key Spotify markets with a launched service, can apply ([blog 2025-04-15](https://developer.spotify.com/blog/2025-04-15-updating-the-criteria-for-web-api-extended-access)).

**27 Nov 2024 deprecations** (new or Dev Mode apps)

- Related Artists, Recommendations, Audio Features/Analysis, featured/category playlists, algorithmic/editorial playlists, and 30 s `preview_url` in multi-get responses ([blog](https://developer.spotify.com/blog/2024-11-27-changes-to-the-web-api)).

**Playback**

- The Web Playback SDK needs Premium (mobile-only plans excluded) and uses Widevine EME.
- Mobile browsers are supported with autoplay and background limits ([docs](https://developer.spotify.com/documentation/web-playback-sdk)).
- Quality is not officially documented. It is about AAC 256 kbps (web player: AAC 128 Free / 256 Premium, per [support](https://support.spotify.com/us/article/audio-quality/)).
- Spotify Lossless (10 Sep 2025, FLAC up to 24/44.1) is on mobile, desktop, tablet and Spotify Connect devices, **not the web player** ([newsroom](https://newsroom.spotify.com/2025-09-10/lossless-listening-arrives-on-spotify-premium-with-a-richer-more-detailed-listening-experience/)).
- I found no announcement of lossless for the SDK or Web API.
- Best-quality pattern: use the Web API to _remote-control_ the user's native Spotify app (Connect), which can play lossless; keep the SDK as a fallback.

**Developer Policy/Terms** ([policy](https://developer.spotify.com/policy), [terms](https://developer.spotify.com/terms); section numbers from a mirror dated 2026-09-26, [clademusic doc](https://raw.githubusercontent.com/kaospan/clademusic/main/docs/LICENSING_AND_UNIVERSAL_PLAYER.md), Terms v10 effective 2025-05-15)

- III.7: "Do not permit any device or system to segue, mix, re-mix, or overlap any Spotify Content with any other audio content (including other Spotify Content)". So no crossfade, and no voice notes or UI sounds over Spotify audio.
- III.6: "Do not synchronize any sound recordings with any visual media … slideshow, video, or similar content". Synced-lyrics overlays are a grey area.
- III.11: don't "mimic, or replicate or attempt to replace a core user experience of Spotify" (Jam is a core feature).
- III.4: no non-interactive webcasting (one source playing to several simultaneous listeners).
- III.13: no analysis. III.14 / Terms IV.2.1: no ML training. Terms IV.2.2: no stream ripping. IV.3.1.1: no databases of Spotify Content.
- Only temporary caching of metadata and cover art. Artwork must not be cropped or overlaid ([design](https://developer.spotify.com/documentation/design)). Must attribute and link back (II.4/II.5).
- No commercial use of streaming apps without written approval.
- Must not target children; block known users under 13.
- **Lyrics:** there is no official lyrics API. Spotify's in-app lyrics are licensed from Musixmatch. Unofficial endpoints such as [akashrchandran/spotify-lyrics-api](https://github.com/akashrchandran/spotify-lyrics-api) violate the ToS.
- Not available in mainland China.

### 2.2 Apple Music (MusicKit JS v3)

**Requirements**

- Apple Developer Program membership, plus a MusicKit key that signs an ES256 developer JWT (`kid`, `iss`=Team ID, `iat`, `exp` ≤ 15,777,000 s ≈ 6 months, optional `origin` array for web).
- A Music User Token, obtained through `authorize()`.
- Without an active subscription, users only get previews ([MusicKit](https://developer.apple.com/musickit/), [user auth](https://developer.apple.com/documentation/applemusicapi/user-authentication-for-musickit)).

**Quality and DRM**

- The `PlaybackBitrate` enum is HIGH = 256 kbps and STANDARD = 64 kbps ([docs](https://developer.apple.com/documentation/musickitjs/musickit/playbackbitrate)).
- An Apple engineer stated that Lossless and Hi-Res Lossless are "not currently supported" in MusicKit JS ([forum, 2021](https://developer.apple.com/forums/thread/683021)).
- The WWDC26 MusicKit session announced no web changes ([session 254](https://developer.apple.com/videos/play/wwdc2026/254/)).
- DRM is FairPlay in Safari and Widevine in Chromium and Firefox. Platforms without these (e.g. HarmonyOS WebView) cannot play full tracks.
- **MusicKit on Android** exists as a Java SDK (auth and playback libraries, [docs](https://developer.apple.com/musickit/android/)). Developers complain it is stale ([forum](https://developer.apple.com/forums/thread/772358)).

**DPLA §3.3.6(D) "MusicKit"** (verbatim from the 18 Aug 2026 edition, [agreement](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/))

- "full songs must be enabled for playback, and users must initiate playback and be able to navigate playback using standard media controls".
- "You may not … download, upload or modify any MusicKit Content and MusicKit Content cannot be synchronised with any other content".
- Album art and music text may not be "used separately from music playback or managing playlists".
- "not to require payment for or indirectly monetise access to the Apple Music service".
- "not to recombine MusicKit JS with any other JavaScript code or separately download and re-host it". So it must load from Apple's CDN, not be bundled by Vite.
- Must follow the Apple Music Identity Guidelines.

**Lyrics**

- The public API exposes only a `hasLyrics` attribute. Timed TTML lyrics use private endpoints that need privileged tokens ([MusanovaKit](https://github.com/rryam/MusanovaKit) warns that shipping this likely violates the terms).

**China**

- Apple Music operates in China (since 2015).
- The catalog API accepts the `cn` storefront, per a tested community plugin ([example](https://github.com/ray5378/MusicFlow-plugins)).
- MusicKit JS _playback_ in China is UNVERIFIED. Expect more than 1 s round trips to Apple endpoints from mainland China.

### 2.3 YouTube / YouTube Music

- **There is no official YouTube Music API.** [ytmusicapi](https://github.com/sigma67/ytmusicapi) "emulates YouTube Music web client requests using the user's cookie data" and is not endorsed by Google.
- **Developer Policies** ([policy](https://developers.google.com/youtube/terms/developer-policies); verbatim mirror in [OpenTermsArchive](https://github.com/OpenTermsArchive/pga-versions/blob/main/YouTube/Developer%20Terms.md), last updated 2026-09-14):
    - must not "separate, isolate, or modify the audio or video components";
    - must not "promote separately the audio or video components";
    - must not play "from a background player, meaning a player that is not displayed in the page, tab, or screen that the user is viewing".
- **Required Minimum Functionality:** player at least 200×200 and no overlays or obscuring ([RMF](https://developers.google.com/youtube/terms/required-minimum-functionality)).
- So there is no audio-only or hidden mode and no lock-screen playback, which is fatal on phones. Extracting streams also violates the YouTube ToS.
- **Legal:**
    - The RIAA's 2020 DMCA §1201 takedown of youtube-dl was reversed ([GitHub](https://github.blog/news-insights/policy-news-and-insights/standing-up-for-developers-youtube-dl-is-back/)).
    - In Germany, the OLG Hamburg (Nov 2024) held that youtube-dl circumvents "effective technical protection measures" ([heise](https://www.heise.de/en/news/OLG-Hamburg-Uberspace-liable-for-hosting-Youtube-DL-10179284.html)).
    - Since 2025, YouTube's SABR streaming and PO tokens keep breaking extractors ([yt-dlp #12482](https://github.com/yt-dlp/yt-dlp/issues/12482)).
- **Data API quota:** 10,000 units/day by default, with search.list limited to 100 calls/day ([overview](https://developers.google.com/youtube/v3/getting-started)). Increases require a compliance audit.
- Blocked in mainland China.

### 2.4 TIDAL

- The web SDK has auth, catalogue API and Player modules ([tidal-sdk-web](https://github.com/tidal-music/tidal-sdk-web)).
- The Player spec covers LOW (96k HE-AAC) up to LOSSLESS (FLAC 16/44.1) and HI_RES_LOSSLESS, as CMAF over DASH/HLS with Widevine or FairPlay ([Player.md](https://github.com/tidal-music/tidal-sdk/blob/main/Player.md)).
- **But** the terms make the "official, unmodified" Player module the only allowed way to play TIDAL content, and third parties can only play **previews** ([terms 2.0](https://developer.tidal.com/documentation/guidelines-developer-terms-2_0)).
- This was reconfirmed on 29 Sep 2026: "playback is limited to 30 second previews for all third-party developers" ([ListenBrainz PR #3681](https://github.com/metabrainz/listenbrainz-server/pull/3681)). Developers have raised this since 2023 with no staff answers ([#8](https://github.com/orgs/tidal-music/discussions/8), [#214](https://github.com/orgs/tidal-music/discussions/214)).
- Not available in China.

### 2.5 Other sources

- **Qobuz:** partner-only API (email api@qobuz.com for app_id/app_secret). `format_id` 5 = MP3 320, 6 = FLAC 16/44.1, 7 = 24/96, 27 = 24/192; streams are not DRM-protected ([profile](https://github.com/api-evangelist/qobuz)). Qobuz Connect for hardware launched May 2025. Using the web player's app_id is a ToS breach.
- **Deezer:** the portal shows "We're not accepting new application creation at this time" because of abuse ([community](https://en.deezercommunity.com/features-feedback-44/api-auth-impossible-80857)). The Native and JS playback SDKs are deprecated. The API gives only 30 s previews. The public catalog API needs no key (about 50 requests per 5 s) and offers covers up to 1000 px.
- **Amazon Music:** Web API v1 and v2 are "closed Beta … limited to already approved developers" ([v2](https://developer.amazon.com/docs/music/API_web_overview_v2.html)).
- **SoundCloud:**
    - Registration is by application only, using OAuth 2.1 + PKCE.
    - Since 15 Sep 2025, `/tracks/{urn}/streams` returns `hls_aac_160_url` / `hls_aac_96_url`. The MP3 and Opus fields were scheduled for removal on 15 Nov 2025 ([issue #441](https://github.com/soundcloud/api/issues/441)). The blog post is marked "Deadline Extended", with final removal on 31 Dec 2025 ([blog](https://developers.soundcloud.com/blog/api-streaming-urls/)). Only `preview_mp3_128_url` remains.
    - The terms require crediting the uploader and SoundCloud with backlinks, and prohibit creating "any kind of alternative digital content service" ([terms](https://developers.soundcloud.com/docs/api/terms-of-use)).
- **Audius:**
    - Streams are 320 kbps MP3 at 48 kHz; artists can offer lossless downloads ([help](https://help.audius.co/product/supported-files)).
    - The stream endpoint supports Range requests; an API key is optional except for gated tracks ([docs](https://docs.audius.org/developers/api/stream-track/)).
    - Free tier: 10 req/s and 500k/month ([plans](https://api.audius.co/plans)).
- **Jamendo:**
    - Free for non-commercial use (about 35k req/month); commercial use needs a quote ([help](https://help-licensing.jamendo.com/hc/en-us/articles/20699346005661-Jamendo-API)).
    - Formats: mp31 = 96k, mp32 ≈ 192k, ogg ≈ 112k, flac = lossless; downloads only where `audiodownload_allowed` is set ([tracks](https://developer.jamendo.com/v3.0/tracks)).
    - Each track has its own Creative Commons licence, some non-commercial.
- **Internet Archive / Live Music Archive:** advancedsearch, metadata and download APIs with no key. The LMA accepts only lossless formats (flac, shn and others) plus derived MP3/OGG ([help](https://help.archive.org/help/live-music-archive-etree-org/)). Rights are per item.
- **FMA:** the API was shut down "due to the heavy load"; developers may host tracks themselves under their CC licences ([FMA](https://freemusicarchive.org/app-developers)).
- **Bandcamp:** the official API covers only artist/label sales and embeds; there is no fan API ([developer](https://bandcamp.com/developer)). Purchased music downloads as FLAC, ALAC, WAV and similar, which is the cleanest legal route to lossless files for our library.

## 3. Self-hosted / personal-server sources

**OpenSubsonic** ([spec](https://opensubsonic.netlify.app/), [repo](https://github.com/opensubsonic/open-subsonic-api), which ships `openapi/openapi.json` we can use for codegen)

- It extends the Subsonic API; servers advertise features through `getOpenSubsonicExtensions`.
- Extensions:
    - `apiKeyAuthentication`: `apiKey=` replaces `u/t/s`; sending `u` as well is error 43.
    - `formPost`: API arguments as POST x-www-form-urlencoded.
    - `songLyrics`: `getLyricsBySongId`. v1 is line-synced and multi-language; v2 (`enhanced=true`) adds word/syllable cues, translation/pronunciation layers and agents.
    - `transcodeOffset`: `timeOffset` on `stream`.
    - `transcoding`: `getTranscodeDecision` (POST client capabilities) plus `getTranscodeStream`.
    - Also `playbackReport` (`reportPlayback`), `indexBasedQueue`, `getPodcastEpisode`, `topSongsByArtistId`, `sonicSimilarity`.
- Songs carry `replayGain {trackGain, albumGain, trackPeak, albumPeak, baseGain…}`.

**Navidrome** ([releases](https://github.com/navidrome/navidrome/releases))

- Current version: v0.64.2 (24 Sep 2026).
- v0.64.0 (12 Sep 2026) added an **experimental Jellyfin Music API** (Finamp and Jellify can connect), with ReplayGain and lyrics.
- v0.63.0 (Jul 2026): synced sidecar lyrics in TTML, ELRC, SRT, YAML and LRC with word-level timing; sharing on by default.
- v0.62.0 (Jun 2026): `sonicSimilarity`, `playbackReport`.
- v0.61.0 (2026): server-managed transcoding through the OpenSubsonic `transcoding` extension; built-in Spotify integration removed.
- v0.60 (2026): WebAssembly plugins.
- v0.58 (mid-2025): multi-library with per-user permissions.

**Jellyfin**

- Current: Server 12.1 (GitHub latest, Sept 2026).
- Relevant endpoints: `GET /Audio/{itemId}/universal` (direct play or transcode) and `GET /Audio/{itemId}/Lyrics` ([source](https://github.com/jellyfin/jellyfin)).

**Plex**

- Official API documentation at developer.plex.tv and the remote-play subscription rules are UNVERIFIED (the domain was blocked). Low priority.

**Clients**

- Symfonium (Android, paid; Subsonic/Jellyfin/Plex/Emby/local; UNVERIFIED this session).
- [Feishin](https://github.com/jeffvli/feishin): desktop and web; MPV or web engine; lyrics from LRCLIB and NetEase.
- [Supersonic](https://github.com/dweymouth/supersonic): MPV gapless, ReplayGain, 15-band EQ.
- [Amperfy](https://github.com/BLeeEZ/amperfy): iOS/macOS; Ampache and Subsonic; offline, CarPlay, ReplayGain.
- substreamer (iOS/Android).
- [音流 Stream Music](https://github.com/gitbobobo/StreamMusic): Subsonic, Navidrome, Jellyfin, Emby, AudioStation, Plex; closed-source; the GitHub repo is archived while a new version is built.

**(a) Using a user's server as a source: yes.**

- The browser should stream directly from their server; don't proxy audio through Supabase.
- Requirements: HTTPS (to avoid mixed-content blocking) and CORS (Navidrome works with web clients such as Feishin).
- Chinese home broadband often lacks inbound 80/443 or a public IPv4 address, so a tunnel or IPv6 may be needed (UNVERIFIED specifics).
- Store server credentials encrypted (Supabase Vault). Prefer `apiKey`.

**(b) Exposing our library through OpenSubsonic: feasible.**

- Minimum endpoint set: `ping`, `getLicense`, `getOpenSubsonicExtensions`, `getMusicFolders`, `getArtists`/`getIndexes`, `getAlbumList2`, `getAlbum`, `getSong`, `search3`, playlist CRUD, `star`/`getStarred2`, `scrobble`, `getCoverArt`, `getLyricsBySongId`, `stream`.
- `stream` should 302-redirect to short-lived signed Storage URLs; Edge Functions must never proxy audio bytes. Transcoding is out of scope, so pre-generate renditions.
- Auth: a per-user app password (token auth needs the plain secret) and/or an API key.
- Output JSON (`f=json`) and XML.
- This buys offline playback, CarPlay and Android Auto through existing clients. The alternative is running Navidrome on a VPS over the Storage S3 API.

## 4. Metadata, lyrics and artwork

| Service           | Access / limits                                                                                                                                                                                                                                                                                                           | License / terms                                                                                                                                                      | Production verdict                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| MusicBrainz WS/2  | No key; about 1 req/s per IP average; meaningful `User-Agent` ("App/1.0 (contact)") required ([rate limiting](https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting), not re-fetched)                                                                                                                                 | Core data CC0; supplementary data CC BY-NC-SA ([license](https://musicbrainz.org/doc/About/Data_License))                                                            | **Safe.** Cache results; use a mirror at scale                                     |
| Cover Art Archive | No key; images hosted on archive.org                                                                                                                                                                                                                                                                                      | Images copyrighted by rights holders                                                                                                                                 | Safe in practice; may fail in CN                                                   |
| AcoustID          | App key; "Do not make more than 3 requests per second"                                                                                                                                                                                                                                                                    | "free for non-commercial use only"; commercial via acoustid.biz ([source](https://github.com/acoustid/acoustid-server/blob/master/acoustid/web/pages/webservice.md)) | Private yes; public needs the paid plan                                            |
| Discogs           | Token; 60/min authenticated (UNVERIFIED this session)                                                                                                                                                                                                                                                                     | Attribution; images need auth                                                                                                                                        | OK with attribution                                                                |
| Last.fm           | API key                                                                                                                                                                                                                                                                                                                   | Non-commercial; attribution ([ToS](https://www.last.fm/api/tos), not re-fetched)                                                                                     | Private yes; public needs an agreement if commercial                               |
| ListenBrainz      | User token                                                                                                                                                                                                                                                                                                                | Open data                                                                                                                                                            | **Safe** (scrobbles, recommendations)                                              |
| LRCLIB            | No key; `GET /api/get`, `/api/get/:id`, `/api/search`, `POST /api/request-challenge` + `/api/publish` (proof-of-work), `/api/flag`; CORS `*`; send `X-User-Agent`/`Lrclib-Client` ([router.rs](https://github.com/tranxuanthang/lrclib/blob/main/server/src/router.rs)); no app-level rate limiter, `Retry-After` exposed | Code is MIT; lyrics copyright belongs to publishers; data licence not stated                                                                                         | Private yes; **public: licensing risk**. Use as a fallback with a takedown process |
| Musixmatch        | Free tier gives partial lyrics; synced lyrics are paid/commercial (UNVERIFIED numbers)                                                                                                                                                                                                                                    | Commercial licence                                                                                                                                                   | The licensed path for a public product                                             |
| Genius            | API has no lyrics text                                                                                                                                                                                                                                                                                                    | Scraping pages breaches ToS                                                                                                                                          | Metadata only                                                                      |
| iTunes Search API | No key; about 20 calls/min (UNVERIFIED)                                                                                                                                                                                                                                                                                   | Meant to promote/link Apple content                                                                                                                                  | Private yes; public grey                                                           |
| Deezer public API | No key; about 50 req / 5 s                                                                                                                                                                                                                                                                                                | Personal-app terms (UNVERIFIED wording)                                                                                                                              | Private yes; public grey                                                           |

## 5. China: landscape and risk assessment

**Official routes**

- **NetEase open platform** ([site](https://developer.music.163.com/st/developer)):
    - It was historically an enterprise/partner program (IoT, car, apps; company sign-up reportedly by invitation code, UNVERIFIED).
    - In March 2026 NetEase released the official `@music163/ncm-cli` / Agent Skills for OpenClaw: search, recommendations, playlists and playback ([NetEase/skills](https://github.com/NetEase/skills)).
    - It requires appId + privateKey, including a new **individual** application path (`…/apply/account?type=INDIVIDUAL`).
    - A September 2026 field test found the open-platform channel's rights are "the official App's true subset":
        - 18 of 30 of a VIP user's liked songs returned `userMaxBr=0` and no URL;
        - there were no 30 s previews;
        - "VIP payment can't save songs the channel isn't licensed for";
        - each end user must register their own credentials ([openncm-player #1](https://github.com/waliean/openncm-player/issues/1)).
    - The platform agreement was not reviewed (UNVERIFIED).
- **QQ Music / TME:** [QQ音乐开发者平台](https://developer.y.qq.com/docs/openapi) offers TME Connect, login, OpenAPI, large-screen and car solutions, plus H5 SDKs through Tencent Cloud IoT ([doc](https://cloud.tencent.com/document/product/1081/104286)). This is for partners; I found no individual route.
- **Kugou:** "曲库开放计划" offers paid catalog licensing and an SDK ([open.kugou.com](https://open.kugou.com/docs/open-player/)). Kuwo focuses on car makers.

**Unofficial routes and enforcement**

- **Binaryify/NeteaseCloudMusicApi (30k★):**
    - In Jan 2024 NetEase sent a legal notice demanding removal of the "hotlinking" methods.
    - The repo was emptied to "保护版权，此仓库不再维护" and archived on 16 Apr 2024 ([news](https://news.qq.com/rain/a/20240124A039F200), [repo](https://github.com/Binaryify/NeteaseCloudMusicApi)). Forks continue.
- **LX Music:** Tencent's warning letter (18 Oct 2023) led it to remove built-in sources; it now relies on user "custom sources".
- **[MusicFree](https://github.com/maotoumao/MusicFree):** plugin-only with no built-in sources, AGPL, non-commercial.
- **Listen1 / UnblockNeteaseMusic:** still active.
- **Cases:**
    - NetEase v. iFlytek "发条" app, which aggregated NetEase's catalog from 2018 to 2021: the second instance awarded **¥800k** (first instance, 20 Jul 2023: ¥100k) ([judgment](https://www.ciplawyer.cn/articles/152403.html)).
    - Chongqing Yuzhong, Apr 2023: cracking and distributing paid songs through an app (100k+ works) led to **3 years (suspended) + ¥550k fine**. It is a Supreme People's Procuratorate typical case ([SPP 2024-01](https://www.spp.gov.cn/xwfbh/dxal/202401/t20240105_639390.shtml)).
- **Law:**
    - Copyright Law Art. 49 protects technical measures.
    - Criminal Law Art. 217 (Amendment XI, 2021) criminalizes intentional circumvention.
    - The revised Anti-Unfair Competition Law (effective **15 Oct 2025**) bans obtaining or using other operators' data "by circumventing or destroying technical management measures" ([text mirror](https://github.com/LawRefBook/Laws)).

**Risk assessment**

| Scenario                                                   | Legal risk                                                                                                            | Other risks                                                                         | Verdict                                   |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------- |
| Unofficial APIs in a **public** product or distributed app | **Very high** (civil ¥100k–800k+; criminal if profit + circumvention)                                                 | Takedowns, store removal                                                            | **Never**                                 |
| Unofficial APIs in our 2-person private deployment         | Low chance of enforcement (no cases found against private non-distributing users; UNVERIFIED), but a clear ToS breach | Account bans, frequent breakage, storing VIP cookies                                | Not recommended; keep out of the codebase |
| Plugin model (MusicFree-style) for a public product        | High (liability shifts, doesn't disappear)                                                                            | Community-supplied malware                                                          | Never                                     |
| NetEase official individual route                          | Low (within agreement)                                                                                                | Catalog gaps; per-user signup; terms unknown                                        | **Spike first**                           |
| Enterprise deals (NetEase/TME/Kugou)                       | Low                                                                                                                   | Cost; likely needs a company, ICP filing and a network-culture licence (UNVERIFIED) | Only for a real CN launch                 |
| Decrypting `.ncm`/`.qmc` downloads                         | Circumvention (Art. 49/217)                                                                                           | n/a                                                                                 | Never build                               |

Also note that Chinese platforms geo-restrict much of their catalog outside the mainland. Of the overseas services, only Apple Music is officially available in China.

## 6. "Listen together" (two users)

**Clock sync** (over Supabase Realtime Broadcast; private channel with RLS)

- Free plan: 200 connections and 100 msg/s; Pro: 500 msg/s; Broadcast Replay supports `since` ([limits](https://supabase.com/docs/guides/realtime/limits)).
- Run NTP-style ping/pong against the leader or an Edge Function time endpoint:
    - offset θ = ((t1−t0)+(t2−t3))/2;
    - round-trip time δ = (t3−t0)−(t2−t1).
- Take 8–16 samples and keep the one with the smallest δ, since the error is at most δ/2. Re-sync every 30–60 s and on `visibilitychange` or network change.
- Use `performance.timeOrigin + performance.now()`, not `Date.now()`.
- Keep the authoritative state (track, position at a reference time, rate, playing, version) in a Postgres row so late joiners can catch up.

**Scheduling**

- The leader sets `startAt = now + 400–800 ms`; followers pre-buffer.
- On the Web Audio path, schedule with AudioContext time and compensate using `outputLatency` (Chrome 102, Firefox 70, Safari 18.4) and `getOutputTimestamp()` (Chrome 57, Firefox 70, Safari 14.1) ([BCD](https://github.com/mdn/browser-compat-data)).
- Add a per-device manual offset for Bluetooth.

**Drift correction** (every 1–2 s; thresholds are engineering estimates)

- Error |e| < 30–40 ms: ignore.
- 40 ms up to about 1 s: set `playbackRate = 1 ± min(|e|/2 s, 3%)` with `preservesPitch` (Chrome 86, Firefox 101, Safari 17.2) until converged. On AudioBufferSource nodes the pitch shifts, so keep adjustments ≤1%.
- More than 1 s, or after a stall: hard seek.
- DRM SDKs have no rate control and only coarse position reports, so correction there is seek-only with a ±300–500 ms dead band.
- Background tabs on iOS pause timers, so re-sync when the page returns to the foreground.

**Terms**

- **Spotify:** III.11 (replicating Jam) and III.4 make it a no for public use and inadvisable in private.
- **Apple:** each listener must start playback themselves (a "Join" tap), and syncing with "other content" is ambiguous. Sync only same-source pairs, and ask Apple before a public launch.
- **TIDAL:** moot (previews only).
- **YouTube:** the policies don't mention it, but the player must stay visible.
- **Our own content:** no restrictions. Deep-link to built-in features for catalog content (Spotify Jam, NetEase/QQ "一起听", SharePlay).

## 7. Integration architecture

```ts
type EngineKind = 'owned' | 'drm-sdk' | 'visible-embed';
interface ProviderCapabilities {
    search: boolean;
    userLibrary: boolean;
    playlistWrite: boolean;
    playback: 'none' | 'preview' | 'full';
    engine: EngineKind; // owned = we get bytes/URL into our pipeline
    maxQuality: { codec: string; bitrateKbps?: number; bitDepth?: number; sampleRateHz?: number; lossless: boolean };
    dsp: boolean; // can route through Web Audio (EQ, ReplayGain, crossfade, analyser)
    gapless: 'native' | 'within-provider-queue' | 'none';
    normalization: 'metadata' | 'provider-internal' | 'none';
    lyrics: 'synced-word' | 'synced-line' | 'plain' | 'none';
    backgroundPlayback: boolean; // YouTube: false
    sync: { seek: boolean; rate: boolean; positionAccuracyMs: number };
    policy: {
        noMixing?: boolean;
        noCrossfade?: boolean;
        ephemeralMetadataOnly?: boolean;
        mustShowPlayer?: boolean;
        attribution?: string;
        userMustInitiate?: boolean;
        listenTogether: 'ok' | 'same-source-only' | 'forbidden';
    };
}
interface MusicProvider {
    id: string;
    caps(): ProviderCapabilities;
    auth: { connect(): Promise<void>; status(): Promise<'ok' | 'expired' | 'none'>; token?(): Promise<string> };
    search(q: string, o?: SearchOpts): Promise<Page<ProviderItemRef>>;
    resolve(ref: ProviderTrackRef): Promise<TrackMeta>; // title, artists, album, durationMs, ISRC, MBID
    match?(meta: TrackMeta): Promise<ProviderTrackRef[]>; // ISRC-first cross-provider matching
    getSource(ref: ProviderTrackRef, prefs: QualityPrefs): Promise<PlaybackSource>;
    lyrics?(ref: ProviderTrackRef): Promise<Lyrics | null>;
    artwork?(ref: ProviderTrackRef, px: number): Promise<string | null>;
}
type PlaybackSource =
    | { kind: 'url'; url: string; mime: string; quality: Quality; replayGain?: RG; expiresAt?: number }
    | { kind: 'sdk'; engine: 'spotify' | 'musickit'; uri: string; quality: Quality /* provider-reported */ }
    | { kind: 'embed'; engine: 'youtube'; videoId: string };
```

**Design rules**

- **Canonical tracks.** Store a canonical `tracks` table (ISRC, MBID, duration) with `track_sources(provider, ref, quality, region, checked_at)`. "Our playlist" points at canonical tracks, and each partner resolves the song to their own entitled source.
- **What to store for Spotify and Apple.** Keep only IDs plus metadata snapshots with a TTL, because Spotify allows only temporary caching and Apple forbids using album art separately.
- **Engines.** An `EngineRouter` runs exactly one engine at a time:
    - OwnedEngine: `<audio>`/MSE → GainNode (ReplayGain/R128) → EQ → limiter → analyser.
    - SpotifyEngine and MusicKitEngine, which load the vendor JS from its CDN.
    - YouTubeEngine, a visible panel.
- **DRM engines can't use our Web Audio processing.** EME audio can't be routed into Web Audio, and the SDKs don't expose a media element. The consequences:
    - no EQ, visualizer or crossfade (crossfade is also forbidden by Spotify III.7);
    - volume only through the SDK;
    - switching between engines leaves a gap (roughly 0.1–1 s);
    - gapless playback only by handing the provider its whole queue.
- **Quality badges.**
    - Owned sources: compute the badge from the real stream (codec, bit depth, sample rate), e.g. "Hi-Res 24/96", "Lossless 16/44.1", and show "→48 kHz" when `AudioContext.sampleRate` differs.
    - DRM sources: show "AAC 256 · provider-reported".
- **Normalization.**
    - Analyse ReplayGain 2.0 / EBU R128 at upload.
    - In mixed queues, aim our tracks at about −14 LUFS to match typical streaming defaults (approximate), plus a user-adjustable per-provider trim.
- **Electron.**
    - DRM SDKs need castLabs ECS (Widevine; production VMP signing through EVS) ([ECS](https://github.com/castlabs/electron-releases)).
    - For bit-perfect or exclusive output of owned sources, use libmpv the way Feishin and Supersonic do.
- **Browser formats.** Transcode ALAC to FLAC at upload, because Chrome and Firefox don't play ALAC (general knowledge; not checked this session).

## 8. Recommended roadmap

**1. First (Phase 1 → 2a)**

- Own lossless library:
    - keep FLAC originals and generate Opus/AAC renditions for mobile data;
    - R128/ReplayGain analysis at upload;
    - enrich metadata with MusicBrainz + AcoustID (non-commercial) + Cover Art Archive, with iTunes/Deezer artwork as a China fallback;
    - lyrics from LRCLIB, embedded tags, or user-supplied `.lrc`.
- Provider-adapter framework, with the local provider as the first implementation.
- Listen together on our own engine.

**2. Second (Phase 2b)**

- OpenSubsonic client adapter (Navidrome and others), then Jellyfin.
- Expose our own library through OpenSubsonic so the couple can use Symfonium, Amperfy or 音流 for offline, CarPlay and Android Auto.

**3. Third**

- Apple Music via MusicKit JS as the official full-catalog source for both China and abroad. Treat it as a DRM engine; listen-together only for same-source pairs where each listener joins manually.
- Spike on NetEase's official individual route: read its agreement, measure catalog coverage, and check whether it can be used from a browser.
- Optional, private only: Spotify in Dev Mode (both of you on Premium), preferably remote-controlling the native Spotify app. No crossfade, no listen-together, no synced-lyrics overlays.

**4. Public-release track**

- Enterprise deals (NetEase/TME/Kugou) for China.
- A Qobuz partnership.
- A Musixmatch or LyricFind licence for lyrics.
- The AcoustID commercial plan and a MusicBrainz mirror.
- SoundCloud, Audius and Jamendo as discovery sources, within their terms.

**Never build**

- YouTube stream extraction, yt-dlp or ytmusicapi.
- Unofficial Chinese APIs, source scripts or plugins.
- `.ncm`/`.qmc` decryption.
- Scraped Qobuz or Deezer app IDs.
- Apple's private lyrics endpoints or Spotify's unofficial lyrics endpoints.
- TIDAL integration while it is previews-only.
