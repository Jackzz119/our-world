# Music ingest, processing and storage: research notes (2026-09-30)

**Labels.**

- No label: checked this session against the linked primary source. Supabase and Cloudflare docs were read from their GitHub doc sources, which hold the same text as the linked pages.
- **(snippet)**: taken from a search summary of the linked page, because the sandbox proxy blocked the page itself. Re-check before quoting prices.
- **UNVERIFIED**: prior knowledge only.

**Repo context.** Photos live in a private `memories` bucket. RLS keys on the first path segment (`world_id`), files are capped at 25 MB, thumbnails are made on the client, and signed URLs last 1 h (`src/lib/storage.ts`, `sql/storage-memories-bucket.sql`). The music design reuses this pattern.

---

## 1. Supabase: Storage, Edge Functions, job pipeline

|                                     | Free       | Pro                                                           | Team              |
| ----------------------------------- | ---------- | ------------------------------------------------------------- | ----------------- |
| Price                               | $0         | $25/mo (snippet, [pricing](https://supabase.com/pricing))     | $599/mo (snippet) |
| Global max file size                | **50 MB**  | **≤500 GB** (set in Storage Settings; applies to all buckets) | ≤500 GB           |
| Storage included, then overage      | 1 GB, none | 100 GB, then **$0.0213/GB-mo** (GB-hours, cycle average)      | same              |
| Egress included (uncached / cached) | 5 / 5 GB   | 250 / 250 GB, then **$0.09 / $0.03 per GB**                   | same              |

Sources: [file limits](https://supabase.com/docs/guides/storage/uploads/file-limits), [storage size](https://supabase.com/docs/guides/platform/manage-your-usage/storage-size), [egress](https://supabase.com/docs/guides/platform/manage-your-usage/egress).

- **Free is not usable for this feature.** One 24/192 track is about 150–210 MB.
- **Pro's Spend Cap is on by default.** When a quota runs out, further use of that item "is disallowed until the next billing cycle" ([cost control](https://supabase.com/docs/guides/platform/cost-control)). At 100 GB, uploads would fail, so either monitor usage or turn the cap off.
- **Buckets:**
    - A bucket's `file_size_limit` must be at or below the global limit.
    - `allowed_mime_types` accepts wildcards such as `image/*` ([buckets](https://supabase.com/docs/guides/storage/buckets/creating-buckets)).
    - The MIME check uses the Content-Type the client declares, so it is not a security control (UNVERIFIED).
    - Browsers report no type for `.ape`, `.dsf`, `.cue` and `.lrc`, so sniff magic bytes and always pass `contentType`.
- **Standard upload:** recommended only up to 6 MB. Don't overwrite files; the CDN is slow to pick up changes, so write to new paths ([docs](https://supabase.com/docs/guides/storage/uploads/standard-uploads)).
- **Resumable upload (TUS)** ([docs](https://supabase.com/docs/guides/storage/uploads/resumable-uploads)):
    - Endpoint: `https://<ref>.storage.supabase.co/storage/v1/upload/resumable`. Use the direct storage host for large files.
    - **Chunk size must be 6 MB.**
    - Headers: `authorization: Bearer <user JWT>`, plus optional `x-upsert` and `apikey`.
    - Metadata: `bucketName, objectName, contentType, cacheControl, metadata`.
    - An upload URL lasts up to 24 h. A second client writing to the same URL gets 409.
    - Max size is the lower of the global and bucket limits ([server](https://github.com/supabase/storage/blob/master/src/http/routes/tus/index.ts)).
    - `createSignedUploadUrl` tokens (valid 2 h) work with TUS via the `x-signature` header. A server can use this to grant upload rights to one exact path.
    - tus-js-client ([API](https://github.com/tus/tus-js-client/blob/main/docs/api.md)) provides `retryDelays`, fingerprint resume (`findPreviousUploads`), `onProgress`, and `abort()`/`start()`.
    - Its `parallelUploads` needs the Concatenation extension, which Supabase doesn't document (UNVERIFIED). Upload several files at once instead. Uppy `@uppy/tus` also works.
- **S3 protocol** ([compatibility](https://supabase.com/docs/guides/storage/s3/compatibility), [auth](https://supabase.com/docs/guides/storage/s3/authentication)):
    - Supported: multipart upload, Range GET, conditional requests, SigV4 presigned URLs.
    - Not supported: versioning ("deleted objects are permanently removed"), Content-MD5, SSE, tagging.
    - Unfinished multipart uploads are aborted after 24 h ([S3 uploads](https://supabase.com/docs/guides/storage/uploads/s3-uploads)).
    - Access keys bypass RLS and are server-only. Session-token auth (project ref + anon key + user JWT) enforces RLS and is safe in the browser.
- **Range requests work.** The server passes `Range` through and sets `Accept-Ranges` and `Content-Range` ([asset.ts](https://github.com/supabase/storage/blob/master/src/storage/renderer/asset.ts), [renderer.ts](https://github.com/supabase/storage/blob/master/src/storage/renderer/renderer.ts)). This shipped in 2021 ([#20](https://github.com/supabase/storage/issues/20)).
    - **Risk:** an unanswered May 2025 report says iOS AVPlayer can't play Supabase-hosted m4a/mp3 that plays fine from S3 ([#35866](https://github.com/orgs/supabase/discussions/35866)). **Test iOS Safari `<audio>` with signed URLs first.**
- **Signed URLs and the CDN:**
    - `createSignedUrl(path, seconds)` and `createSignedUrls` embed a token. Revoking a token doesn't purge cached copies; deleting the object does ([Smart CDN](https://supabase.com/docs/guides/storage/cdn/smart-cdn)).
    - Smart CDN is Pro and up. Invalidation takes up to 60 s, and files are cached "as long as possible". `cacheControl` sets the browser TTL (default about 1 h).
    - **Each unique token is its own cache entry**, so the first request to any URL misses. Private buckets hit the cache less often ([fundamentals](https://supabase.com/docs/guides/storage/cdn/fundamentals)).
    - Reuse one signed URL per rendition to earn the $0.03 cached rate.
    - For audio, use a 6–12 h TTL. On a playback error, re-sign and resume at `currentTime` (how a URL behaves when it expires mid-stream is UNVERIFIED).
- **Image transformations:** Pro and up, 100 source images included, then $5 per 1,000. Limits: ≤2,500 px, ≤25 MB, ≤50 MP; WebP output by default ([docs](https://supabase.com/docs/guides/storage/serving/image-transformations)). It is cheaper to make our own cover variants.
- **Database backups exclude Storage objects** ([backups](https://supabase.com/docs/guides/platform/backups)), and there is no versioning, so protecting originals is up to us.
- **Keys:** `anon` and `service_role` are phased out by the end of 2026, replaced by `sb_publishable_…` and `sb_secret_…` ([keys](https://supabase.com/docs/guides/getting-started/api-keys)).
- **Edge Functions** ([limits](https://supabase.com/docs/guides/functions/limits)):
    - Limits: 256 MB memory, **2 s CPU per request**, 150 s (Free) / 400 s (paid) wall clock, 20 MB bundle.
    - No Web Workers. Multithreaded libraries such as sharp are unsupported. WASM is allowed ([wasm](https://supabase.com/docs/guides/functions/wasm)).
    - `waitUntil` background work is under the same limits ([background tasks](https://supabase.com/docs/guides/functions/background-tasks)).
    - **So there is no native FFmpeg, and ffmpeg.wasm is impractical.**
    - Good uses: signing URLs, lookups against LRCLIB/MusicBrainz/AcoustID, waking the worker, and reading tags over HTTP Range with music-metadata plus [`@tokenizer/range`](https://github.com/Borewit/tokenizer-range) (MIT).
- **Building a pipeline:**
    - **Queues (pgmq):** durable, "guaranteed delivery", exactly-once within the visibility window ([Queues](https://supabase.com/docs/guides/queues)). `pgmq_public.send / send_batch / read(queue, vt, n) / pop / archive / delete` can be exposed through the Data API ([API](https://supabase.com/docs/guides/queues/api)).
    - **Database Webhooks** are triggers plus pg_net ([docs](https://supabase.com/docs/guides/database/webhooks)).
    - **pg_net** ([docs](https://supabase.com/docs/guides/database/extensions/pg_net)):
        - Async, with a 2 s default timeout and about 200 requests/s.
        - Responses are kept 6 h in an unlogged table.
        - Delivery is **not guaranteed**, so use it only to wake the worker.
    - **Triggers on `storage.objects`** are possible but discouraged. Storage inserts a row, uploads, then updates or deletes it ([#18021](https://github.com/orgs/supabase/discussions/18021)), and the docs say to treat the storage schema as read-only ([schema](https://supabase.com/docs/guides/storage/schema/design)). Drive the pipeline from our own RPCs instead.
    - **Realtime:** `realtime.broadcast_changes()` triggers are the recommended method; Postgres Changes "does not scale as well" ([docs](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes)).

## 2. Alternatives

|                                                                              | Storage                                                                           | Egress                                                                                                                                                                                                                                                                      | Notes                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cloudflare R2** ([pricing](https://developers.cloudflare.com/r2/pricing/)) | $0.015/GB-mo                                                                      | **free**                                                                                                                                                                                                                                                                    | Class A $4.50/M, Class B $0.36/M; free tier 10 GB. Presigned URLs last 1 s–7 d and work **only on the S3 domain, not custom domains** ([presigned](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)). Objects up to ~5 TiB, 10k parts ([limits](https://developers.cloudflare.com/r2/platform/limits/)).                                                                                                         |
| R2 + Worker                                                                  | n/a                                                                               | free                                                                                                                                                                                                                                                                        | The Worker's `get(key,{range})` supports Range ([API](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/)). Verify Supabase JWTs against the JWKS at `/auth/v1/.well-known/jwks.json` (ES256/RS256) ([keys](https://supabase.com/docs/guides/auth/signing-keys)). Workers Paid is $5/mo for 10M requests, with no egress fees ([pricing](https://developers.cloudflare.com/workers/platform/pricing/)). |
| Backblaze B2                                                                 | $6.95/TB-mo (snippet, [pricing](https://www.backblaze.com/cloud-storage/pricing)) | free up to 3× stored, then $0.01/GB; free through Cloudflare (snippet)                                                                                                                                                                                                      | S3-compatible                                                                                                                                                                                                                                                                                                                                                                                                                |
| S3 + CloudFront                                                              | ~$0.023/GB (UNVERIFIED)                                                           | $0.09/GB after 100 GB (snippet, [S3](https://aws.amazon.com/s3/pricing/)); CloudFront gives 1 TB/mo free permanently (snippet, [AWS](https://aws.amazon.com/blogs/aws/aws-free-tier-data-transfer-expansion-100-gb-from-regions-and-1-tb-from-amazon-cloudfront-per-month)) | Most IAM work                                                                                                                                                                                                                                                                                                                                                                                                                |

**Mainland China: Aliyun OSS or Tencent COS with CDN**

- A custom domain on a mainland bucket or CDN **requires an ICP filing** (snippet, [OSS](https://www.alibabacloud.com/help/en/icp-filing/use-oss/), [Tencent](https://www.tencentcloud.com/solutions/icp-registration-support)).
- Since 2025-03-20, new OSS users can't call data APIs through the default public endpoint in mainland regions (`PublicEndpointForbidden`), so they need an ICP-filed domain (snippet, [notice](https://www.alibabacloud.com/en/notice/oss_update_notice_policy_change_in_calling_data_api_operations_via_the_default_public_domain_name_45a)).
- Foreign entities can't file; a mainland individual can (limits of a personal filing UNVERIFIED). Hong Kong regions need no ICP (UNVERIFIED).

**Takeaway.** Stay on Supabase for phase 1: RLS carries over and there is one vendor. Add a `storage_backend` column so renditions can move to R2 later. At 1 TB, R2 costs about $15/mo against about $19 of Supabase overage, and has no egress fees.

## 3. Where to run FFmpeg, flac, chromaprint and friends

| Option                                                                                                                                                                         | Cost                                                                                                                                                         | Fit                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Edge Functions                                                                                                                                                                 | n/a                                                                                                                                                          | No (see §1)                                                                                                           |
| **Cloudflare Containers** ([pricing](https://developers.cloudflare.com/containers/platform/pricing/), [limits](https://developers.cloudflare.com/containers/platform/limits/)) | Billed per 10 ms. The $5 Workers plan includes **375 vCPU-min**, 25 GiB-h and 200 GB-h; then $0.00002/vCPU-s                                                 | Scales to zero; ≤4 vCPU, 12 GiB, 20 GB disk. Needs a Worker and Durable Object in front.                              |
| **Cloud Run Jobs** ([pricing](https://cloud.google.com/run/pricing))                                                                                                           | Free tier of 240k vCPU-s and 450k GiB-s per month (snippet)                                                                                                  | Free at our volume. Needs a GCP service account to trigger.                                                           |
| **Fly Machines** ([pricing](https://fly.io/docs/about/pricing/))                                                                                                               | Per second; shared-cpu-1x 1 GB ≈ $5.92/mo if always on; stopped machines pay rootfs only ($0.15/GB); no free tier (snippet)                                  | Start and stop through the API.                                                                                       |
| Railway / Render                                                                                                                                                               | $20/vCPU-mo + $10/GB RAM (snippet, [Railway](https://docs.railway.com/pricing/plans)) / from $7/mo always-on (snippet, [Render](https://render.com/pricing)) | Acceptable, but pays for idle.                                                                                        |
| Home NAS or PC                                                                                                                                                                 | ~$0                                                                                                                                                          | Pulls from pgmq over outbound connections. Availability is the risk, and each original it downloads counts as egress. |

**Rough workload (UNVERIFIED estimate).** A 4-min 16/44.1 track takes about 2–5 CPU-seconds natively; 24/192 takes 3–4× more. A 1,000-track backfill is about 1–3 CPU-hours, so **$0–5/month** on any option above.

**What the browser can do:**

- **Hashing:** [hash-wasm](https://github.com/Daninet/hash-wasm) (MIT) streams SHA-256 at **426 MB/s** (Ryzen 7900X, Chrome 131). WebCrypto can't hash incrementally.
- **Decoding:** [@wasm-audio-decoders/flac](https://github.com/eshaz/wasm-audio-decoders) (MIT, ~67 KiB) decodes FLAC as a stream, up to 24-bit/192 kHz, in a Worker. That is enough for waveform peaks and loudness.
- **WebCodecs `AudioDecoder`:** Chrome 94, Firefox 130 (desktop only), Safari 26 ([BCD](https://github.com/mdn/browser-compat-data/blob/main/api/AudioDecoder.json)). The codec registry has flac, mp3, mp4a, opus and vorbis, but **no ALAC** ([registry](https://w3c.github.io/webcodecs/codec_registry.html)).
- **ffmpeg.wasm** ([repo](https://github.com/ffmpegwasm/ffmpeg.wasm)):
    - `@ffmpeg/core` 0.12.10 is **GPL-2.0+**.
    - 2 GB hard limit per file ([FAQ](https://github.com/ffmpegwasm/ffmpeg.wasm/blob/main/apps/website/docs/faq.md)).
    - Runs at **0.04× native speed single-threaded, 0.08× multithreaded** ([bench](https://github.com/ffmpegwasm/ffmpeg.wasm/blob/main/apps/website/docs/performance.md)).
    - Multithreading needs cross-origin isolation (COOP/COEP). Safari lacks COEP `credentialless` ([BCD](https://github.com/mdn/browser-compat-data/blob/main/http/headers/Cross-Origin-Embedder-Policy.json)), so every cross-origin image and audio request would need CORS/CORP headers.
    - Keep it as an optional desktop fallback.

## 4. Reading tags, and fixing garbled text

- **[music-metadata](https://github.com/Borewit/music-metadata)** (MIT, v11.16.1, ESM):
    - Browser API: `parseBlob`, `parseWebStream`.
    - Formats: MP3, FLAC, Ogg, WAV, AIFF, APE, WV, MPC, MP4/ALAC, DSF, DSDIFF, Matroska.
    - Tag systems: ID3v1/v2.2–2.4, APEv2, Vorbis, iTunes, RIFF.
    - How tags map to its common fields ([table](https://github.com/Borewit/music-metadata/blob/master/doc/common_metadata.md)):
        - lyrics: USLT/SYLT, Vorbis `LYRICS`, `©lyr`, APE `LYRICS`
        - pictures: APIC, `METADATA_BLOCK_PICTURE`, `covr`
        - ReplayGain: `REPLAYGAIN_*` in TXXX, Vorbis and iTunes form
        - MusicBrainz and AcoustID IDs
    - `skipCovers` saves memory.
- **Other tag libraries:**
    - [mutagen](https://github.com/quodlibet/mutagen): GPL-2.0+, Python ≥3.10. Fine inside a worker we never distribute.
    - [TagLib](https://github.com/taglib/taglib): LGPL/MPL, handles DSF/DFF, APE and WavPack.
    - [taglib-wasm](https://github.com/CharlesWiltgen/taglib-wasm): MIT + LGPL. Reads and writes tags in browsers, Node, Deno and Workers, which is useful for tagging split tracks.
- **Where garbled text (mojibake) comes from:**
    - ID3v1, which has no encoding field.
    - ID3v2.3 frames flagged ISO-8859-1 that actually hold GBK. [chineseid3fix](https://github.com/wks/chineseid3fix) re-decodes exactly these as GB18030 (snippet).
    - APEv2 tags that should be UTF-8 but are GBK.
    - CUE and LRC files.
    - RIFF INFO, which defaults to latin1 unless `CSET` says otherwise ([PR #2727](https://github.com/Borewit/music-metadata/pull/2727), snippet).
    - Vorbis comments and MP4 atoms are UTF-8.
- **Decoding in the browser:**
    - `TextDecoder` supports `gbk`/`gb18030`, `big5`, `shift_jis` and `euc-kr`.
    - The `latin1` label actually decodes as **windows-1252**, so byte recovery must invert that mapping. `TextEncoder` is UTF-8 only ([spec](https://encoding.spec.whatwg.org/), UNVERIFIED, page blocked).
    - Check whether music-metadata's latin1 decoding is byte-transparent. If not, re-read the raw frames.
- **Detection libraries:**
    - [jschardet](https://github.com/aadsm/jschardet) 4.0.0: **0BSD**, a port of chardet 7 claiming 99.4% accuracy. chardet 7's AI rewrite and relicensing is disputed ([LWN](https://lwn.net/Articles/1061534/), snippet).
    - [node-chardet](https://github.com/runk/node-chardet): MIT, based on ICU, 22 KB.
- **Detection heuristic** (short titles defeat statistical detectors):
    1. If the bytes are strictly valid UTF-8, accept them.
    2. Otherwise decode each candidate (gb18030, big5, shift_jis, euc-kr, windows-1252) with `fatal:true`.
    3. Score by share of CJK characters, common-character frequency, and no private-use or control characters.
    4. **Decide once per album** from all its tags plus the CUE text.
    5. Show a preview with an override, and keep the raw bytes.

## 5. CUE sheets

- **Parsers:**
    - [@maxmellon/cue-parser](https://github.com/MaxMEllon/cue-parser): MIT, TypeScript. Handles INDEX 00/01, multiple FILEs, per-line errors, encoding detection.
    - [FFcuesplitter](https://github.com/jeanslack/FFcuesplitter): GPL-3.0, built on FFmpeg. Detects charset, embeds tags, copies or re-encodes.
    - **FFmpeg has no CUE demuxer** ([formats](https://ffmpeg.org/ffmpeg-formats.html)). Its FLAC demuxer does expose an embedded CUESHEET as chapters (snippet, [flacdec.c](https://github.com/FFmpeg/FFmpeg/blob/master/libavformat/flacdec.c)).
- **Sample-exact math.** A CUE frame is 1/75 s, a whole number of samples at every common rate (44.1k → 588, 48k → 640, 96k → 1280, 192k → 2560). Sample = `(mm·60+ss)·sr + ff·sr/75`.
- **Lossless split.** Decode, trim, re-encode FLAC; the PCM stays bit-exact. Use `ffmpeg -i img -af atrim=start_sample=S:end_sample=E -c:a flac` ([atrim](https://ffmpeg.org/ffmpeg-filters.html#atrim); that `end_sample` is exclusive is UNVERIFIED). Avoid `-ss`/`-to` with stream copy, which cuts at frame boundaries. APE and WV decode natively.
- **Verify** that the MD5 of all tracks' PCM joined together equals the original's PCM MD5, and for FLAC its STREAMINFO MD5.
- **Gaps:**
    - Track n runs from INDEX 01(n) to INDEX 01(n+1), so each gap goes to the previous track.
    - INDEX 01 > 0 on track 1 means hidden audio before track 1 (HTOA). Keep it as track 0.
    - PREGAP and POSTGAP are silence that isn't in the file.
- **Tags.** Decode the CUE text with the detector first (usually GBK). Map per-track TITLE/PERFORMER/SONGWRITER and album-level TITLE, `REM DATE/GENRE/DISCID/REPLAYGAIN_*`, CATALOG and ISRC to Vorbis tags.
- **No-server option.** Store **virtual tracks** (`start_sample`/`end_sample`) on the image and let the player seek. It stays bit-exact, but per-track renditions have to wait for the worker.

## 6. Lyrics

**Formats:**

- **LRC:** `[mm:ss.xx]`. Several stamps per line are allowed. Header tags: `[ar:][ti:][al:][offset:±ms]`. Players disagree on the sign of offset (UNVERIFIED), so store `offset_ms` separately.
- **Word-timed LRC variants:**
    - **A2 (enhanced):** inline `<mm:ss.xx>` word starts.
    - **ESLyric:** word end times in square brackets.
    - **SPL:** explicit line ends; translations share timestamps.
    - Source: [AMLL docs](https://github.com/amll-dev/applemusic-like-lyrics/blob/main/packages/docs/src/content/docs/en/guides/lyric/formats.md).
- **Apple TTML** ([spec](https://github.com/amll-dev/amll-ttml-db/blob/main/instructions/ttml-specification-en.md)):
    - `itunes:timing="Word|Line"`; each line is a `<p begin end ttm:agent itunes:key>` containing timed `<span>` syllables.
    - Singers are agents `v1`, `v2`, and `v1000` for a group (duets).
    - Background vocals: `ttm:role="x-bg"`.
    - Translations and romanization: `x-translation` / `x-roman` spans with `xml:lang`, or `<iTunesMetadata>` translations keyed by `itunes:key`.
    - `itunes:song-part` marks sections.
- **Chinese service formats:**
    - **YRC** (NetEase): `[start,dur](start,dur,0)word`, in ms.
    - **QRC** (QQ): `[start,dur]word(start,dur)`, often encrypted.
    - **KRC** (Kugou): `krc1` header, XOR, then zlib; word offsets relative to the line (UNVERIFIED).
- **Embedded:** USLT, SYLT, Vorbis `LYRICS` and `©lyr`, all read by music-metadata.

**AMLL** ([amll-dev/applemusic-like-lyrics](https://github.com/amll-dev/applemusic-like-lyrics); the Steve-xmh repo is a fork):

- 2.2k stars, currently "looking for co-maintainers".
- Packages:
    - `core` 0.6.0 (PixiJS)
    - `react`, `react-full`, `vue`
    - `ttml`
    - `lyric` 1.1.0: parses LRC, A2, ESLyric, SPL, YRC, QRC, Lyricify and TTML. Its README warns "do not use it directly in production".
- **License: [AGPL-3.0](https://github.com/amll-dev/applemusic-like-lyrics/blob/main/LICENSE), and every package is `AGPL-3.0-only`.** Bundling it makes our SPA or Electron app AGPL, so full source must be offered to every network user or recipient. That's harmless for the two of you, but it blocks closed distribution.
- The [TTML DB](https://github.com/amll-dev/amll-ttml-db) is **CC0**, fetchable by NetEase, QQ, Apple or Spotify ID.

**Permissive alternatives:**

- [lrc-kit](https://github.com/weirongxu/lrc-kit): MIT; A2 word stamps, offset, several stamps per line, a sync runner.
- [react-lrc](https://github.com/mebtte/react-lrc): MIT, line-level only.
- [lyric-kit](https://github.com/MoYingJi/lyric-kit) is AGPL.
- Navidrome 0.63 (Jul 2026, GPL) added word-level TTML and ELRC sidecars ([releases](https://github.com/navidrome/navidrome/releases)). Its **OpenSubsonic songLyrics v2 shape is a good schema to adopt**: `kind` (main, translation, pronunciation), `lang`, `synced`, `offset`, `agents`, and `line{start,end,value,cue[{start,end,value,agentId}]}` ([lyrics.go](https://github.com/navidrome/navidrome/blob/master/model/lyrics.go)).
- **Recommendation:** write our own small parsers for LRC, A2 and TTML (TTML via `DOMParser`) and our own renderer. Treat AMLL as a UX reference unless we accept AGPL.

**[LRCLIB](https://github.com/tranxuanthang/lrclib)** (MIT code; [architecture notes](https://github.com/tranxuanthang/lrclib/blob/master/ARCHITECTURE.md)):

- Endpoints:
    - `GET /api/get?track_name&artist_name[&album_name][&duration]`: duration must match within ±2 s ([source](https://github.com/tranxuanthang/lrclib/blob/master/server/src/routes/get_lyrics_by_metadata.rs)).
    - `GET /api/get/{id}` and `GET /api/search`.
    - `POST /api/request-challenge` plus `/api/publish` (proof-of-work).
- Returns `plainLyrics`, `syncedLyrics`, `instrumental` and `lyricsfile` (structured YAML).
- No API key. Identify via User-Agent; in browsers use `X-User-Agent` or `Lrclib-Client` (snippet, [docs](https://lrclib.net/docs)).
- Overload: the server returns 503 with `Retry-After: 1`; the docs suggest spacing requests 200–500 ms apart (snippet).
- **The data license is not stated**, so record where each lyric came from.

## 7. Cover art

- **Extraction:** `common.picture[]` (APIC, FLAC/Vorbis `METADATA_BLOCK_PICTURE`, `covr`) plus folder images named `cover`, `folder` or `front`. Keep the original bytes and deduplicate by SHA-256.
- **Sizes:** 256, 512 and 1200 px (list at 3×, grid, full-width now-playing; UNVERIFIED heuristic). WebP at q≈80 with a JPEG fallback; AVIF from the worker only.
- **Browser generation:**
    - Use `createImageBitmap` with a canvas.
    - **Safari and iOS can't encode WebP**; canvas and OffscreenCanvas silently return PNG ([BCD](https://github.com/mdn/browser-compat-data/blob/main/api/HTMLCanvasElement.json), [OffscreenCanvas](https://github.com/mdn/browser-compat-data/blob/main/api/OffscreenCanvas.json)). Output JPEG there, or use [jSquash](https://github.com/jamsinclair/jSquash) (Apache-2.0 WASM encoders).
    - _Side finding:_ in the current code, `storage.ts` thumbnails made on iPhones are PNG files saved as `.thumb.webp`.
- **Server generation:** [sharp](https://github.com/lovell/sharp) (Apache-2.0, libvips, "4–5× faster than ImageMagick", native binaries).
- **Palette** (run on a 64–128 px copy):
    - [node-vibrant](https://github.com/Vibrant-Colors/node-vibrant) 4.0.4: MIT; Vibrant, Muted, Dark and Light swatches; works in a Worker.
    - [colorthief](https://github.com/lokesh/color-thief) 3.5.0: MIT.
    - [fast-average-color](https://github.com/fast-average-color/fast-average-color): MIT.
- **Placeholder:** [ThumbHash](https://github.com/evanw/thumbhash) (MIT) stores aspect ratio and alpha and shows more detail and truer colour than BlurHash. Keep it as `bytea` (about 25 bytes, UNVERIFIED).
- **Online sources** (UNVERIFIED because the sites were blocked; the images are copyrighted, so private use only; store where each came from):
    - Cover Art Archive `release/{mbid}/front-500|1200`, via MusicBrainz, which allows about 1 request/s and needs a User-Agent.
    - iTunes Search API: about 20 requests/min; artwork resizable through the URL.
    - Deezer: `cover_xl` is 1000 px.

## 8. Audio analysis

| Task                    | Tool (license)                                                                                                                                                                                                                                                    | Notes                                                                                                                                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loudness                | **[rsgain](https://github.com/complexlogic/rsgain)** (BSD-2)                                                                                                                                                                                                      | ReplayGain 2.0 at −18 LUFS: track, album and true peak, Opus R128. Handles FLAC, MP3, M4A, Opus, WV, APE and DSD. Docker image; it is Picard's backend.                                       |
| Loudness in the browser | [ebur128_wasm](https://github.com/streamonkey/ebur128_wasm) (Apache-2.0), [libebur128](https://github.com/jiixyj/libebur128) (MIT)                                                                                                                                | Feed it PCM from the streaming decoder inside a Worker.                                                                                                                                       |
| Waveform                | [audiowaveform](https://github.com/bbc/audiowaveform) (GPL-3.0 command-line tool)                                                                                                                                                                                 | Writes `.dat` or JSON at 8 or 16 bits. [wavesurfer.js](https://github.com/wavesurfer-js/wavesurfer.js) v8 (BSD-3) takes `peaks` plus `duration`; streaming only works with precomputed peaks. |
| Fingerprint             | [Chromaprint](https://github.com/acoustid/chromaprint) (MIT code, **LGPL-2.1 overall** because it bundles FFmpeg code)                                                                                                                                            | `fpcalc`, then AcoustID (key required, non-commercial free, ≤3 requests/s; snippet, [webservice](https://acoustid.org/webservice)), then MusicBrainz.                                         |
| BPM and key             | [Essentia.js](https://github.com/MTG/essentia.js) (**AGPL-3.0**, commercial licence available), [aubio](https://github.com/aubio/aubio) (GPL-3.0), [web-audio-beat-detector](https://github.com/chrisguttandin/web-audio-beat-detector) (MIT, 90–180 BPM default) | Optional. Keep GPL and AGPL tools in the worker.                                                                                                                                              |
| Integrity               | `flac -t`; STREAMINFO MD5 of the decoded audio (0 means unknown; RFC 9639, UNVERIFIED); `ffmpeg -v error -f null` for other formats                                                                                                                               | Also re-check the SHA-256 after upload, since there is no Content-MD5.                                                                                                                        |
| Deduplication           | four layers, strictest first                                                                                                                                                                                                                                      | 1. File SHA-256. 2. PCM MD5. 3. AcoustID. 4. Metadata key.                                                                                                                                    |

## 9. Transcoding and packaging

- **Lossless to lossless.** ALAC, APE, WV, AIFF and WAV become FLAC via `ffmpeg … -c:a flac -compression_level 8`, or `flac -8 --verify`. Keep the original bit depth and sample rate, and assert the PCM MD5 matches. **Don't transcode FLAC up to 24/192 stereo; serve it as is.**
- **DSD to PCM:**
    - FFmpeg decodes DSD64 to float at 352.8 kHz (UNVERIFIED).
    - Resample with `aresample=176400:resampler=soxr:precision=28` ("very high quality", snippet, [docs](https://ffmpeg.org/ffmpeg-resampler.html)), or to 88200.
    - Apply a lowpass (snippet). A +6 dB gain is common (UNVERIFIED): measure true peak first.
    - Write 24-bit FLAC with triangular dither, and keep the DSD original.
- **Lossy renditions:**
    - **Opus** at 128–160 kbps is "effectively transparent" at 128 (snippet, [Xiph](https://wiki.xiph.org/Opus_Recommended_Settings)). Ogg Opus plays in Safari 18.4+ (snippet, [WebKit](https://webkit.org/blog/16574/webkit-features-in-safari-18-4/)) and in Chromium and Firefox.
    - **AAC:** libfdk_aac is "non-free" (GPL-incompatible, not redistributable). Use FFmpeg's native `aac` (LGPL) at 256 kbps; the two converge above ~192 kbps (snippet, [wiki mirror](https://mirror.hjertaas.com/trac.ffmpeg.org/trac.ffmpeg.org/wiki/Encode/AAC.html)).
- **Gapless playback:**
    - FLAC is gapless by nature. Opus stores a pre-skip (~312 samples, UNVERIFIED). AAC priming delay is handled by an edit list or `iTunSMPB` (UNVERIFIED).
    - Switching `<audio>` elements is never gapless. True gapless needs Web Audio scheduling, or MSE with fMP4; Chrome's MSE accepts FLAC in MP4 (snippet, [w3c](https://github.com/w3c/media-source/issues/188)).
- **Packaging:**
    - Apple HLS requires FLAC and ALAC to be in fMP4 with codec `fLaC` (snippet, [HLS spec](https://developer.apple.com/documentation/http-live-streaming/hls-authoring-specification-for-apple-devices)).
    - Tools: FFmpeg `-hls_segment_type fmp4` (older builds needed `-strict experimental`; current status UNVERIFIED). [Shaka Packager](https://github.com/shaka-project/shaka-packager) has FLAC HLS and DASH test fixtures.
    - **In a private bucket every segment needs its own signed URL**, so defer HLS and serve progressive files with Range.

## 10. Open-source reference designs

| Project                                                                                                                                           | License, stack                                    | What to copy                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Navidrome](https://github.com/navidrome/navidrome)                                                                                               | GPL-3.0; Go; v0.64.2 (Sep 2026)                   | [MediaFile](https://github.com/navidrome/navidrome/blob/master/model/mediafile.go) fields: codec, bitrate, bit depth, channels, gain and peak, MBIDs, `Participants`, `Missing`. **Persistent IDs**: track = `musicbrainz_trackid\|albumid,discnumber,tracknumber,title`; album = `musicbrainz_albumid\|albumartistid,album,albumversion,releasedate` ([consts.go](https://github.com/navidrome/navidrome/blob/master/consts/consts.go)). On-the-fly transcoding with a 100MB LRU cache. Structured lyrics. |
| [Koel](https://github.com/koel/koel)                                                                                                              | MIT; Laravel                                      | S3 sync runs as a **Lambda on ObjectCreated/ObjectRemoved** events; FLAC is transcoded to MP3 on the fly ([docs](https://github.com/koel/docs/blob/master/src/README.md)).                                                                                                                                                                                                                                                                                                                                  |
| Funkwhale                                                                                                                                         | AGPL-3.0; Django (UNVERIFIED)                     | Upload (file) is separate from Track; import status per upload.                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| [beets](https://github.com/beetbox/beets)                                                                                                         | MIT; Python                                       | MusicBrainz autotagger with match-distance scores (apply / as-is / skip) and plugins for chroma, replaygain, fetchart, lyrics and duplicates.                                                                                                                                                                                                                                                                                                                                                               |
| [Polaris](https://github.com/agersant/polaris) · [Jellyfin](https://github.com/jellyfin/jellyfin) · [Ampache](https://github.com/ampache/ampache) | MIT (Rust, serves originals) · GPL-2.0 · AGPL-3.0 | Minor references.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

**What to copy:**

- Keep file, track and rendition as separate records.
- Group albums by a persistent-ID key.
- Store raw tags as jsonb next to normalized columns.
- Protect user edits with `locked_fields`.
- Soft-delete.
- **Keep renditions permanently** instead of an LRU cache.
- Use the OpenSubsonic lyrics schema.
- Enrichment suggests changes and the user confirms, beets-style.

## 11. Upload UX

- **Picking files:**
    - `<input multiple>` plus `webkitdirectory` for folders.
    - Folder selection works in Chrome, Firefox, Safari 11.1+, **iOS Safari 18.4+** (ignored earlier), Chrome Android 132+ and Firefox Android 142+ ([BCD](https://github.com/mdn/browser-compat-data/blob/main/api/HTMLInputElement.json)).
    - For drag and drop, use `webkitGetAsEntry()` and loop `readEntries()`. Group by `webkitRelativePath`.
- **iOS limits:**
    - Files, iCloud Drive and other providers are reachable; the **Music app library isn't**, and Apple Music files are DRM-protected (UNVERIFIED).
    - Background tabs are suspended and there is no Background Fetch ([BCD](https://github.com/mdn/browser-compat-data/blob/main/api/BackgroundFetchManager.json)). Use Wake Lock (iOS 18.4+, including home-screen apps; [BCD](https://github.com/mdn/browser-compat-data/blob/main/api/WakeLock.json)), resumable TUS, and a "keep open" banner.
- **Flow:**
    1. Pre-parse each file in a Worker (tags, cover, duration, SHA-256; about 1 s per file).
    2. Show an **instant album-grouped preview** with editing and an encoding override; `createObjectURL` lets the user play the local file right away.
    3. **Deduplicate before upload**: skip identical hashes; warn on matching PCM MD5 or persistent ID.
    4. Upload 3 files at a time with per-file progress, pause/resume, backoff, and resume after reload (state kept in IndexedDB).
    5. Commit, then follow progress through Realtime.
- **States:**
    - Normal path: parsing → duplicate → queued → uploading/paused → processing (stage) → ready.
    - **Warnings** (still usable): no lyrics, low-resolution art, garbled text auto-fixed.
    - **Needs review:** CUE encoding unclear, or a CUE file refers to missing audio.
    - **Failed:** unsupported format, DRM `.m4p`, corrupt file or MD5 mismatch, hash mismatch, quota reached, network error.

---

## Recommended pipeline for our app

### Storage layout: private bucket `music`, same RLS predicate as `memories` (first path segment = `world_id`)

```
<world_id>/orig/<sha256>.<ext>          original files: bit-exact, immutable, named by content hash
                                        (audio, cue, lrc/ttml, scans); cacheControl '31536000'
<world_id>/r/<track_id>/flac-v1.flac    lossless playback copy (only if the original can't be served)
<world_id>/r/<track_id>/opus160-v1.opus lossy copy; optionally aac256-v1.m4a
<world_id>/r/<track_id>/peaks-v1.json   waveform data
<world_id>/art/<sha256>/{256,512,1200}.webp|.jpg
```

- To change a file, write a new versioned name instead of overwriting.
- **Clients may not delete under `*/orig/*`.** Deletes go through a `trash` RPC and a cron job purges after 30 days. Optionally copy weekly to B2, R2 or the NAS.
- Set the global size limit to ~5 GB. Leave `allowed_mime_types` null and sniff file contents instead.

### Data model sketch (every table has `world_id` and RLS `is_world_member(world_id)`)

```sql
media_files   (id, world_id, sha256 bytea, size_bytes, storage_path unique, role /*audio|cue|lyrics|image*/,
               original_name, relative_path, container, codec, sample_rate, bit_depth, channels,
               duration_samples, audio_md5 /*STREAMINFO or PCM*/, text_encoding,
               status /*uploading|uploaded|verified|corrupt|trashed*/, verified_at, uploaded_by,
               unique (world_id, sha256))
ingest_jobs   (id bigint identity, world_id, batch_id, media_file_id, stage,
               status /*queued|running|done|failed|needs_review*/, attempts, progress, error jsonb, heartbeat_at)
artists       (id, world_id, name, sort_name, mbid)
albums        (id, world_id, album_key /*Navidrome-style persistent ID*/, title, album_artist_id, date,
               mbid_release, artwork_id, rg_album_gain, rg_album_peak, unique (world_id, album_key))
tracks        (id, world_id, album_id, title, disc_no, track_no, source_file_id,
               start_sample, end_sample /*CUE virtual tracks*/, duration_ms, isrc, mbid_recording, acoustid,
               fingerprint, rg_track_gain, rg_track_peak, lufs, true_peak, bpm, artwork_id,
               tags jsonb, tags_raw jsonb, locked_fields text[], status)
track_artists (track_id, artist_id, role /*main|feat|composer|lyricist*/, position)
renditions    (id, world_id, track_id, kind /*original|lossless|lossy_hi|lossy_lo*/, storage_path,
               storage_backend, codec, container, sample_rate, bit_depth, bitrate, size_bytes, sha256,
               audio_md5, gapless jsonb, params jsonb, unique (track_id, kind))
artworks      (id, world_id, sha256, source /*embedded|folder|upload|caa|itunes|deezer*/, original_path,
               width, height, thumbhash bytea, palette jsonb, variants jsonb, unique (world_id, sha256))
lyrics        (id, world_id, track_id, source /*uslt|sylt|vorbis|sidecar|pasted|lrclib*/,
               format /*plain|lrc|lrc_a2|ttml|yrc|qrc|krc*/, kind /*main|translation|pronunciation*/,
               lang, synced, word_synced, offset_ms, raw_text, doc jsonb /*OpenSubsonic-style*/, is_preferred)
```

**RPCs** (security definer, membership checked):

- `begin_upload(world, sha256, size, ext, name)` returns `exists` or a reserved path.
- `finish_upload(id)`.
- `existing_hashes(world, bytea[])`.
- `ingest_commit(batch jsonb)`: upserts artists, albums by `album_key`, tracks, lyrics, artworks, and a `renditions(kind='original')` row.

A trigger then calls `realtime.broadcast_changes('world:<id>:library', …)`.

### (a) No server: browser + Supabase Pro (~$25/mo + ~$0.02/GB above 100 GB)

1. **In a Worker, per file:**
    - sniff the file type and parse tags with music-metadata
    - fix garbled text
    - parse CUE, LRC and TTML into `doc`
    - compute SHA-256 and read the FLAC MD5
    - make art variants (WebP, JPEG on Safari), ThumbHash and palette
    - optionally compute peaks and loudness (@wasm-audio-decoders/flac + ebur128-wasm)
2. **Upload:** `existing_hashes`, then `begin_upload`, TUS (6 MB chunks, 3 files at once) to the content-hash path, then `finish_upload` and `ingest_commit`.
3. **Playback:** signed URLs with a 6–12 h TTL, reused.
    - FLAC, MP3, AAC, Ogg Opus and WAV originals play directly.
    - ALAC and AIFF play in Safari only.
    - APE, WV and DSD get `needs_transcode`; desktop can optionally convert them with ffmpeg.wasm.
    - CUE images are played as virtual tracks.
4. **Egress:** CD-quality FLAC is ~0.4 GB/h and 24/96 ~1.4 GB/h, so 4 h of listening a day fits in 250 GB.

### (b) Production: add a media worker

1. **Image:** Docker with FFmpeg (no non-free codecs), flac, fpcalc, audiowaveform, rsgain and sharp, plus a TypeScript runner (music-metadata, taglib-wasm).
2. **Hosting:** Fly Machine, Cloud Run Job or Cloudflare Container (each $0–5/mo). The same image runs on the NAS for backfills, and later inside Electron so desktop uploads arrive already processed.
3. **Waking it:**
    - `ingest_commit` does `pgmq.send`.
    - A trigger fires pg_net at the Edge Function `kick-worker`, which starts the worker.
    - The worker loops on `read(vt=900)` until the queue is empty, then exits.
    - A pg_cron sweeper re-kicks every 5 min if messages are waiting and no heartbeat is fresh.
    - After 5 failed attempts the job is archived and marked failed.
4. **Stages** (each idempotent):
    1. Check the SHA-256 and run `flac -t` or a decode scan.
    2. Probe the file.
    3. Split CUE images sample-exactly and check the PCM MD5.
    4. Make a lossless copy only for ALAC, APE, WV, AIFF, DSD, split images, or FLAC above 24/192 or multichannel.
    5. Make Opus 160 (AAC 256 only for older iOS).
    6. Run rsgain (track and album gain), audiowaveform and fpcalc.
    7. Suggest enrichment from AcoustID → MusicBrainz → Cover Art Archive, and from LRCLIB. Never overwrite `locked_fields`.
    8. Finalize and broadcast.
5. **Worker egress:** it downloads each original once, which counts as uncached egress. Pace large backfills.
6. **Test first:**
    - iOS playback of signed Supabase URLs (#35866)
    - Safari playing 24/192 FLAC
    - whether music-metadata's latin1 decoding keeps the original bytes
    - the AGPL decision on AMLL
