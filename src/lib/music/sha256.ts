// sha256.ts — SHA-256 of picked files, the key that keeps one copy of each original per world (upload
// dedupe) and proves a download is bit-identical. WebCrypto does it when the page has it and the file
// fits comfortably in memory; otherwise an incremental pure-TypeScript hash reads the file slice by
// slice, because crypto.subtle is missing on insecure origins (http://192.168.x.x while testing on a
// phone) and has no streaming API. Feature doc: ai/features/music/music.md (上传与入库; 验收线: 取回文件
// SHA-256 与本地一致).

// Bytes read from the file per step.
const SLICE_BYTES = 4 * 1024 * 1024;
// Largest file hashed with crypto.subtle, which needs the whole file in one buffer.
const SUBTLE_MAX_BYTES = 128 * 1024 * 1024;

// The SHA-256 round constants (FIPS 180-4 §4.2.2).
const K = new Int32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98,
    0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8,
    0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819,
    0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7,
    0xc67178f2
]);

// The initial hash value (FIPS 180-4 §5.3.3).
const INITIAL_STATE = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];

// Run the compression function over every whole 64-byte block of data[pos, pos + length), updating state
// in place with w as the message schedule scratch; returns the position after the last block hashed.
const hashBlocks = (state: Int32Array, w: Int32Array, data: Uint8Array, pos: number, length: number): number => {
    let a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number;
    let t1: number, t2: number, u: number, i: number, j: number;
    while (length >= 64) {
        a = state[0];
        b = state[1];
        c = state[2];
        d = state[3];
        e = state[4];
        f = state[5];
        g = state[6];
        h = state[7];
        for (i = 0; i < 16; i++) {
            j = pos + i * 4;
            w[i] = (data[j] << 24) | (data[j + 1] << 16) | (data[j + 2] << 8) | data[j + 3];
        }
        for (i = 16; i < 64; i++) {
            u = w[i - 2];
            t1 = ((u >>> 17) | (u << 15)) ^ ((u >>> 19) | (u << 13)) ^ (u >>> 10);
            u = w[i - 15];
            t2 = ((u >>> 7) | (u << 25)) ^ ((u >>> 18) | (u << 14)) ^ (u >>> 3);
            w[i] = (((t1 + w[i - 7]) | 0) + ((t2 + w[i - 16]) | 0)) | 0;
        }
        for (i = 0; i < 64; i++) {
            t1 =
                ((((((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7))) +
                    ((e & f) ^ (~e & g))) |
                    0) +
                    ((h + ((K[i] + w[i]) | 0)) | 0)) |
                0;
            t2 =
                ((((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10))) +
                    ((a & b) ^ (a & c) ^ (b & c))) |
                0;
            h = g;
            g = f;
            f = e;
            e = (d + t1) | 0;
            d = c;
            c = b;
            b = a;
            a = (t1 + t2) | 0;
        }
        state[0] += a;
        state[1] += b;
        state[2] += c;
        state[3] += d;
        state[4] += e;
        state[5] += f;
        state[6] += g;
        state[7] += h;
        pos += 64;
        length -= 64;
    }
    return pos;
};

// Incremental SHA-256: feed chunks with update(), read the result once with digestHex(). Updating after
// the digest throws.
export class Sha256 {
    private readonly state = Int32Array.from(INITIAL_STATE);
    private readonly schedule = new Int32Array(64);
    private readonly pending = new Uint8Array(64);
    private pendingLength = 0;
    private totalBytes = 0;
    private hex: string | null = null;

    // Add bytes to the hash; whole blocks are hashed straight from the chunk without copying.
    update(chunk: Uint8Array): this {
        if (this.hex !== null) throw new Error('Sha256: update() after digestHex()');
        let pos = 0;
        let length = chunk.length;
        this.totalBytes += length;
        if (this.pendingLength > 0) {
            const take = Math.min(64 - this.pendingLength, length);
            this.pending.set(chunk.subarray(0, take), this.pendingLength);
            this.pendingLength += take;
            pos = take;
            length -= take;
            if (this.pendingLength === 64) {
                hashBlocks(this.state, this.schedule, this.pending, 0, 64);
                this.pendingLength = 0;
            }
        }
        if (length >= 64) {
            pos = hashBlocks(this.state, this.schedule, chunk, pos, length);
            length %= 64;
        }
        if (length > 0) {
            this.pending.set(chunk.subarray(pos, pos + length), 0);
            this.pendingLength = length;
        }
        return this;
    }

    // Finish the hash (padding and the 64-bit bit length) and return it as lowercase hex; later calls
    // return the same value.
    digestHex(): string {
        if (this.hex !== null) return this.hex;
        const tail = new Uint8Array(this.pendingLength < 56 ? 64 : 128);
        tail.set(this.pending.subarray(0, this.pendingLength));
        tail[this.pendingLength] = 0x80;
        const view = new DataView(tail.buffer);
        view.setUint32(tail.length - 8, Math.floor(this.totalBytes / 0x20000000));
        view.setUint32(tail.length - 4, (this.totalBytes % 0x20000000) * 8);
        hashBlocks(this.state, this.schedule, tail, 0, tail.length);
        this.hex = Array.from(this.state, (word) => (word >>> 0).toString(16).padStart(8, '0')).join('');
        return this.hex;
    }
}

// Throw the abort reason when the signal has fired.
const throwIfAborted = (signal?: AbortSignal): void => {
    if (signal?.aborted) throw signal.reason ?? new DOMException('已取消', 'AbortError');
};

// Read bytes [start, start + SLICE_BYTES) of the blob; a failed read becomes a user-facing error.
const readSlice = async (blob: Blob, start: number): Promise<Uint8Array> => {
    try {
        return new Uint8Array(await blob.slice(start, Math.min(start + SLICE_BYTES, blob.size)).arrayBuffer());
    } catch (error) {
        throw new Error('读取文件失败，文件可能已被移动或删除', { cause: error });
    }
};

// Lowercase hex of a byte array.
const toHex = (bytes: Uint8Array): string => Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

// SHA-256 of a whole blob as lowercase hex, read in 4 MiB slices. onProgress gets (bytes read, total)
// after every slice and at least once; an aborted signal rejects with its reason (an AbortError).
export const sha256Blob = async (
    blob: Blob,
    onProgress?: (done: number, total: number) => void,
    signal?: AbortSignal
): Promise<string> => {
    const total = blob.size;
    const subtle = globalThis.crypto?.subtle;
    if (total === 0) onProgress?.(0, 0);
    if (subtle && total <= SUBTLE_MAX_BYTES) {
        const whole = new Uint8Array(total);
        for (let done = 0; done < total; ) {
            throwIfAborted(signal);
            const part = await readSlice(blob, done);
            whole.set(part, done);
            done += part.length;
            onProgress?.(done, total);
        }
        throwIfAborted(signal);
        return toHex(new Uint8Array(await subtle.digest('SHA-256', whole)));
    }
    const hash = new Sha256();
    let done = 0;
    let next: Promise<Uint8Array> | null = total > 0 ? readSlice(blob, 0) : null;
    while (next) {
        throwIfAborted(signal);
        const part = await next;
        done += part.length;
        // Read the next slice while this one is hashed; an unawaited failure is reported on its turn.
        next = done < total ? readSlice(blob, done) : null;
        next?.catch(() => undefined);
        hash.update(part);
        onProgress?.(done, total);
    }
    throwIfAborted(signal);
    return hash.digestHex();
};
