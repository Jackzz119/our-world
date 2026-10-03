// music.ts — the music library's data contracts: rows as the app reads them from the music_* tables
// (supabase/migrations/20261001100000_music_library.sql, 20261003100000_music_ingest.sql), the
// payloads of the upload RPCs, and the backend seam the player talks to (Supabase in the app, an
// in-memory fake in the fixtures). Feature doc: ai/features/music/music.md, details in impl.md.

export type MusicVisibility = 'world' | 'private';
export type RenditionKind = 'original' | 'lossless' | 'lossy';
export type LyricsKind = 'main' | 'translation' | 'pronunciation';
export type LyricsFormat = 'plain' | 'lrc' | 'lrc_word' | 'ttml' | 'yrc' | 'qrc' | 'krc';
export type LyricsSource = 'embedded' | 'sidecar' | 'manual' | 'lrclib';
export type ArtworkSource = 'embedded' | 'folder' | 'upload' | 'matched' | 'generated';

// ReplayGain values in dB / linear peak, as read from tags or a later scan.
export type MusicGain = {
    track_gain?: number | null;
    track_peak?: number | null;
    album_gain?: number | null;
    album_peak?: number | null;
};

// One stored object (or one object split into numbered parts on the Free plan) the player can stream.
export type MusicRendition = {
    id: string;
    kind: RenditionKind;
    path: string;
    container: string;
    codec: string;
    lossless: boolean;
    sampleRate: number | null;
    bitDepth: number | null;
    channels: number | null;
    bitrate: number | null;
    sizeBytes: number;
    partSize: number | null;
    partCount: number | null;
};

// Cover art: variant size ('256' | '512' | '1200') -> storage path; palette colours as CSS strings.
export type MusicArtwork = {
    id: string;
    variants: Record<string, string>;
    palette: { dominant?: string; muted?: string; light?: string; dark?: string } | null;
};

// Which lyrics a track has (the text itself is loaded when the track plays).
export type LyricsSummary = { id: string; kind: LyricsKind; format: LyricsFormat; synced: boolean; preferred: boolean };

export type LyricsRow = LyricsSummary & {
    lang: string | null;
    wordSynced: boolean;
    offsetMs: number;
    rawText: string;
    source: LyricsSource;
};

// A row of the library as the player sees it. startSample/endSample slice a whole-album image
// (CUE); sampleRate is the original file's, needed to turn those samples into time.
export type LibraryTrack = {
    id: string;
    worldId: string;
    ownerId: string;
    visibility: MusicVisibility;
    title: string;
    artists: string[];
    album: { id: string; title: string; albumArtist: string; releaseDate: string | null } | null;
    discNo: number | null;
    trackNo: number | null;
    fileId: string;
    sampleRate: number | null;
    startSample: number | null;
    endSample: number | null;
    durationMs: number;
    gain: MusicGain | null;
    artwork: MusicArtwork | null;
    renditions: MusicRendition[];
    lyrics: LyricsSummary[];
    likedBy: string[];
    createdAt: string;
};

// What music_existing_hashes reports for each hash the world already holds.
export type ExistingHash = {
    sha256: string;
    fileId: string | null;
    status: 'uploading' | 'uploaded' | 'verified' | 'corrupt' | 'trashed';
    mine: boolean;
    readable: boolean;
};

// The reservation row written before an upload starts (path is derived from world + hash + ext).
export type FileReservation = {
    worldId: string;
    sha256: string;
    ext: string;
    sizeBytes: number;
    partSize: number | null;
    partCount: number | null;
    originalName: string;
    relativePath: string;
    container: string;
    codec: string;
    lossless: boolean;
    sampleRate: number | null;
    bitDepth: number | null;
    channels: number | null;
    durationSamples: number | null;
    audioMd5: string | null;
};

export type ReservedFile = {
    id: string;
    path: string;
    status: ExistingHash['status'];
    sizeBytes: number;
    partSize: number | null;
    partCount: number | null;
};

export type IngestLyrics = {
    kind: LyricsKind;
    lang?: string | null;
    format: LyricsFormat;
    synced: boolean;
    word_synced: boolean;
    offset_ms?: number;
    raw_text: string;
    source: LyricsSource;
};

export type IngestTrack = {
    title: string;
    artists: string[];
    disc_no?: number | null;
    track_no?: number | null;
    start_sample?: number | null;
    end_sample?: number | null;
    duration_ms: number;
    isrc?: string | null;
    gain?: MusicGain | null;
    tags?: Record<string, unknown>;
    tags_raw?: Record<string, unknown>;
    lyrics?: IngestLyrics[];
};

// music_ingest's argument (snake_case: it is passed through as JSON).
export type IngestPayload = {
    world_id: string;
    file_id: string;
    visibility?: MusicVisibility;
    album?: { key: string; title: string; album_artist: string; release_date: string | null } | null;
    artwork?: {
        sha256: string;
        source: ArtworkSource;
        base_path: string;
        width: number;
        height: number;
        variants: Record<string, string>;
        palette: MusicArtwork['palette'];
    } | null;
    rendition?: { bitrate: number | null };
    tracks: IngestTrack[];
};

// music_record_copy's argument: a compact copy already stored under <world>/r/<track>/.
export type CopyPayload = {
    path: string;
    container: string;
    codec: string;
    sample_rate: number;
    channels: number;
    bitrate: number;
    size_bytes: number;
    part_size: number | null;
    part_count: number | null;
    params?: Record<string, unknown>;
};

// A row-level change pushed on the world's music topic (ids only).
export type LibraryChange = {
    table: string;
    op: 'INSERT' | 'UPDATE' | 'DELETE';
    id: string | null;
    trackId: string | null;
};

export type StorageUsage = { bucket: string; objects: number; bytes: number };

export type UploadOptions = {
    contentType: string;
    onProgress?: (sentBytes: number) => void;
    signal?: AbortSignal;
};

// Everything the music UI needs from a backend. The app uses the Supabase one (lib/music/library.ts);
// fixtures pass an in-memory one so the real components run without an account.
export interface MusicBackend {
    /** the signed-in user's id */
    me(): Promise<string>;
    /** the library of a world as the caller may see it, newest first */
    loadLibrary(worldId: string): Promise<LibraryTrack[]>;
    /** the lyrics texts of one track */
    loadLyrics(trackId: string): Promise<LyricsRow[]>;
    /** short-lived URLs for storage paths, keyed by path */
    sign(paths: string[], ttlSeconds: number): Promise<Record<string, string>>;
    /** live changes of the world's library; returns the unsubscribe */
    subscribe(
        worldId: string,
        onChange: (change: LibraryChange) => void,
        onStatus?: (status: string) => void
    ): () => void;
    existingHashes(worldId: string, hashes: string[]): Promise<ExistingHash[]>;
    /** insert the reservation, or return the caller's existing row for the same content */
    reserveFile(reservation: FileReservation): Promise<ReservedFile>;
    /** store one object (resumable where the backend supports it); an object that already exists counts as stored */
    uploadObject(path: string, blob: Blob, options: UploadOptions): Promise<void>;
    finishUpload(fileId: string): Promise<string>;
    ingest(payload: IngestPayload): Promise<string[]>;
    recordCopy(trackId: string, payload: CopyPayload): Promise<string>;
    storageUsage(): Promise<StorageUsage[]>;
    updateTrack(trackId: string, patch: { title?: string; visibility?: MusicVisibility }): Promise<void>;
    trashTrack(trackId: string): Promise<void>;
    setLike(trackId: string, worldId: string, liked: boolean): Promise<void>;
    saveLyrics(trackId: string, worldId: string, lyrics: IngestLyrics): Promise<void>;
    recordPlay(trackId: string, worldId: string, msPlayed: number): Promise<void>;
}
