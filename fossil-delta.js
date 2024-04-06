/*! (c) Dmitry Chestnykh, D. Richard Hipp | BSD License | https://github.com/dchest/fossil-delta-js/ */
// Hash window width in bytes. Must be a power of two.
const NHASH = 16;
class RollingHash {
    a = 0; // hash     (16-bit unsigned)
    b = 0; // values   (16-bit unsigned)
    i = 0; // start of the hash window (16-bit unsigned)
    z = new Array(NHASH); // the values that have been hashed.
    // Initialize the rolling hash using the first NHASH bytes of
    // z at the given position.
    init(z, pos) {
        let a = 0, b = 0;
        for (let i = 0; i < NHASH; i++) {
            const x = z[pos + i];
            a = (a + x) & 0xffff;
            b = (b + (NHASH - i) * x) & 0xffff;
            this.z[i] = x;
        }
        this.a = a & 0xffff;
        this.b = b & 0xffff;
        this.i = 0;
    }
    // Advance the rolling hash by a single byte "c".
    next(c) {
        const old = this.z[this.i];
        this.z[this.i] = c;
        this.i = (this.i + 1) & (NHASH - 1);
        this.a = (this.a - old + c) & 0xffff;
        this.b = (this.b - NHASH * old + this.a) & 0xffff;
    }
    // Return a 32-bit hash value.
    value() {
        return ((this.a & 0xffff) | ((this.b & 0xffff) << 16)) >>> 0;
    }
}
const zDigits = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz~"
    .split("")
    .map(function (x) {
    return x.charCodeAt(0);
});
const zValue = [
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, -1, -1,
    -1, -1, -1, -1, -1, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
    24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, -1, -1, -1, -1, 36, -1, 37,
    38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56,
    57, 58, 59, 60, 61, 62, -1, -1, -1, 63, -1,
];
// Reader reads bytes, chars, ints from array.
class Reader {
    a;
    pos;
    constructor(array) {
        this.a = array; // source array
        this.pos = 0; // current position in array
    }
    haveBytes() {
        return this.pos < this.a.length;
    }
    getByte() {
        const b = this.a[this.pos];
        this.pos++;
        if (this.pos > this.a.length)
            throw new RangeError("out of bounds");
        return b;
    }
    getChar() {
        return String.fromCharCode(this.getByte());
    }
    // Read base64-encoded unsigned integer.
    getInt() {
        let v = 0;
        let c;
        while (this.haveBytes() && (c = zValue[0x7f & this.getByte()]) >= 0) {
            v = (v << 6) + c;
        }
        this.pos--;
        return v >>> 0;
    }
}
// Write writes an array.
class Writer {
    a = [];
    toByteArray(sourceType) {
        if (Array.isArray(sourceType)) {
            return this.a;
        }
        return new Uint8Array(this.a);
    }
    putByte(b) {
        this.a.push(b & 0xff);
    }
    // Write an ASCII character (s is a one-char string).
    putChar(s) {
        this.putByte(s.charCodeAt(0));
    }
    // Write a base64 unsigned integer.
    putInt(v) {
        const zBuf = [];
        if (v === 0) {
            this.putChar("0");
            return;
        }
        let i = 0;
        for (; v > 0; i++, v >>>= 6) {
            zBuf.push(zDigits[v & 0x3f]);
        }
        for (let j = i - 1; j >= 0; j--) {
            this.putByte(zBuf[j]);
        }
    }
    // Copy from array at start to end.
    putArray(a, start, end) {
        // TODO: optimize
        for (let i = start; i < end; i++)
            this.a.push(a[i]);
    }
}
// Return the number digits in the base64 representation of a positive integer.
function digitCount(v) {
    let i, x;
    for (i = 1, x = 64; v >= x; i++, x <<= 6) {
        /* nothing */
    }
    return i;
}
// Return a 32-bit checksum of the array.
function checksum(arr) {
    let sum0 = 0, sum1 = 0, sum2 = 0, sum3 = 0, z = 0, N = arr.length;
    //TODO measure if this unrolling is helpful.
    while (N >= 16) {
        sum0 = (sum0 + arr[z + 0]) | 0;
        sum1 = (sum1 + arr[z + 1]) | 0;
        sum2 = (sum2 + arr[z + 2]) | 0;
        sum3 = (sum3 + arr[z + 3]) | 0;
        sum0 = (sum0 + arr[z + 4]) | 0;
        sum1 = (sum1 + arr[z + 5]) | 0;
        sum2 = (sum2 + arr[z + 6]) | 0;
        sum3 = (sum3 + arr[z + 7]) | 0;
        sum0 = (sum0 + arr[z + 8]) | 0;
        sum1 = (sum1 + arr[z + 9]) | 0;
        sum2 = (sum2 + arr[z + 10]) | 0;
        sum3 = (sum3 + arr[z + 11]) | 0;
        sum0 = (sum0 + arr[z + 12]) | 0;
        sum1 = (sum1 + arr[z + 13]) | 0;
        sum2 = (sum2 + arr[z + 14]) | 0;
        sum3 = (sum3 + arr[z + 15]) | 0;
        z += 16;
        N -= 16;
    }
    while (N >= 4) {
        sum0 = (sum0 + arr[z + 0]) | 0;
        sum1 = (sum1 + arr[z + 1]) | 0;
        sum2 = (sum2 + arr[z + 2]) | 0;
        sum3 = (sum3 + arr[z + 3]) | 0;
        z += 4;
        N -= 4;
    }
    sum3 = (((((sum3 + (sum2 << 8)) | 0) + (sum1 << 16)) | 0) + (sum0 << 24)) | 0;
    switch (N) {
        case 3:
            sum3 = (sum3 + (arr[z + 2] << 8)) | 0; /* falls through */
        case 2:
            sum3 = (sum3 + (arr[z + 1] << 16)) | 0; /* falls through */
        case 1:
            sum3 = (sum3 + (arr[z + 0] << 24)) | 0; /* falls through */
    }
    return sum3 >>> 0;
}
/**
 * Create a new delta array of bytes from source byte array to target byte array.
 */
export function createDelta(source, target) {
    const zDelta = new Writer();
    const lenOut = target.length;
    const lenSrc = source.length;
    let lastRead = -1;
    zDelta.putInt(lenOut);
    zDelta.putChar("\n");
    // If the source is very small, it means that we have no
    // chance of ever doing a copy command.  Just output a single
    // literal segment for the entire target and exit.
    if (lenSrc <= NHASH) {
        zDelta.putInt(lenOut);
        zDelta.putChar(":");
        zDelta.putArray(target, 0, lenOut);
        zDelta.putInt(checksum(target));
        zDelta.putChar(";");
        return zDelta.toByteArray(source);
    }
    // Compute the hash table used to locate matching sections in the source.
    const nHash = Math.ceil(lenSrc / NHASH);
    const collide = new Array(nHash);
    const landmark = new Array(nHash);
    for (let i = 0; i < collide.length; i++) {
        collide[i] = -1;
    }
    for (let i = 0; i < landmark.length; i++) {
        landmark[i] = -1;
    }
    let hv;
    const h = new RollingHash();
    for (let i = 0; i < lenSrc - NHASH; i += NHASH) {
        h.init(source, i);
        hv = h.value() % nHash;
        collide[i / NHASH] = landmark[hv];
        landmark[hv] = i / NHASH;
    }
    let base = 0;
    let iSrc, iBlock, bestCnt, bestOfst, bestLitsz;
    while (base + NHASH < lenOut) {
        bestOfst = 0;
        bestLitsz = 0;
        h.init(target, base);
        let i = 0; // Trying to match a landmark against zOut[base+i]
        bestCnt = 0;
        while (1) {
            let limit = 250;
            hv = h.value() % nHash;
            iBlock = landmark[hv];
            while (iBlock >= 0 && limit-- > 0) {
                //
                // The hash window has identified a potential match against
                // landmark block iBlock.  But we need to investigate further.
                //
                // Look for a region in zOut that matches zSrc. Anchor the search
                // at zSrc[iSrc] and zOut[base+i].  Do not include anything prior to
                // zOut[base] or after zOut[outLen] nor anything after zSrc[srcLen].
                //
                // Set cnt equal to the length of the match and set ofst so that
                // zSrc[ofst] is the first element of the match.  litsz is the number
                // of characters between zOut[base] and the beginning of the match.
                // sz will be the overhead (in bytes) needed to encode the copy
                // command.  Only generate copy command if the overhead of the
                // copy command is less than the amount of literal text to be copied.
                //
                let cnt, ofst, litsz;
                let j, k, x, y;
                let sz;
                // Beginning at iSrc, match forwards as far as we can.
                // j counts the number of characters that match.
                iSrc = iBlock * NHASH;
                for (j = 0, x = iSrc, y = base + i; x < lenSrc && y < lenOut; j++, x++, y++) {
                    if (source[x] !== target[y])
                        break;
                }
                j--;
                // Beginning at iSrc-1, match backwards as far as we can.
                // k counts the number of characters that match.
                for (k = 1; k < iSrc && k <= i; k++) {
                    if (source[iSrc - k] !== target[base + i - k])
                        break;
                }
                k--;
                // Compute the offset and size of the matching region.
                ofst = iSrc - k;
                cnt = j + k + 1;
                litsz = i - k; // Number of bytes of literal text before the copy
                // sz will hold the number of bytes needed to encode the "insert"
                // command and the copy command, not counting the "insert" text.
                sz = digitCount(i - k) + digitCount(cnt) + digitCount(ofst) + 3;
                if (cnt >= sz && cnt > bestCnt) {
                    // Remember this match only if it is the best so far and it
                    // does not increase the file size.
                    bestCnt = cnt;
                    bestOfst = iSrc - k;
                    bestLitsz = litsz;
                }
                // Check the next matching block
                iBlock = collide[iBlock];
            }
            // We have a copy command that does not cause the delta to be larger
            // than a literal insert.  So add the copy command to the delta.
            if (bestCnt > 0) {
                if (bestLitsz > 0) {
                    // Add an insert command before the copy.
                    zDelta.putInt(bestLitsz);
                    zDelta.putChar(":");
                    zDelta.putArray(target, base, base + bestLitsz);
                    base += bestLitsz;
                }
                base += bestCnt;
                zDelta.putInt(bestCnt);
                zDelta.putChar("@");
                zDelta.putInt(bestOfst);
                zDelta.putChar(",");
                if (bestOfst + bestCnt - 1 > lastRead) {
                    lastRead = bestOfst + bestCnt - 1;
                }
                bestCnt = 0;
                break;
            }
            // If we reach this point, it means no match is found so far
            if (base + i + NHASH >= lenOut) {
                // We have reached the end and have not found any
                // matches.  Do an "insert" for everything that does not match
                zDelta.putInt(lenOut - base);
                zDelta.putChar(":");
                zDelta.putArray(target, base, base + lenOut - base);
                base = lenOut;
                break;
            }
            // Advance the hash by one character. Keep looking for a match.
            h.next(target[base + i + NHASH]);
            i++;
        }
    }
    // Output a final "insert" record to get all the text at the end of
    // the file that does not match anything in the source.
    if (base < lenOut) {
        zDelta.putInt(lenOut - base);
        zDelta.putChar(":");
        zDelta.putArray(target, base, base + lenOut - base);
    }
    // Output the final checksum record.
    zDelta.putInt(checksum(target));
    zDelta.putChar(";");
    return zDelta.toByteArray(source);
}
/**
 * Return the size (in bytes) of the target from applying a delta.
 */
export function getDeltaTargetSize(delta) {
    const zDelta = new Reader(delta);
    const size = zDelta.getInt();
    if (zDelta.getChar() !== "\n") {
        throw new Error("size integer not terminated by '\\n'");
    }
    return size;
}
/**
 * Apply a delta byte array to a source byte array, returning the target byte array.
 */
export function applyDelta(source, delta, opts) {
    let limit, total = 0;
    const zDelta = new Reader(delta);
    const lenSrc = source.length;
    const lenDelta = delta.length;
    limit = zDelta.getInt();
    if (zDelta.getChar() !== "\n")
        throw new Error("size integer not terminated by '\\n'");
    const zOut = new Writer();
    while (zDelta.haveBytes()) {
        let cnt = zDelta.getInt();
        let ofst;
        switch (zDelta.getChar()) {
            case "@":
                ofst = zDelta.getInt();
                if (zDelta.haveBytes() && zDelta.getChar() !== ",")
                    throw new Error("copy command not terminated by ','");
                total += cnt;
                if (total > limit)
                    throw new Error("copy exceeds output file size");
                if (ofst + cnt > lenSrc)
                    throw new Error("copy extends past end of input");
                zOut.putArray(source, ofst, ofst + cnt);
                break;
            case ":":
                total += cnt;
                if (total > limit)
                    throw new Error("insert command gives an output larger than predicted");
                if (cnt > lenDelta)
                    throw new Error("insert count exceeds size of delta");
                zOut.putArray(zDelta.a, zDelta.pos, zDelta.pos + cnt);
                zDelta.pos += cnt;
                break;
            case ";":
                const out = zOut.toByteArray(source);
                if ((!opts || opts.verifyChecksum !== false) && cnt !== checksum(out))
                    throw new Error("bad checksum");
                if (total !== limit)
                    throw new Error("generated size does not match predicted size");
                return out;
            default:
                throw new Error("unknown delta operator");
        }
    }
    throw new Error("unterminated delta");
}
/**
 * Create a new string delta from a source string to a target string.
 */
export function createStringDelta(source, target) {
    const deltaArray = createDelta(new TextEncoder().encode(source), new TextEncoder().encode(target));
    return new TextDecoder().decode(new Uint8Array(deltaArray));
}
/**
 * Apply a string delta to a source string, returning the target string.
 */
export function applyStringDelta(source, delta, opts) {
    const deltaArray = applyDelta(new TextEncoder().encode(source), new TextEncoder().encode(delta), opts);
    return new TextDecoder().decode(new Uint8Array(deltaArray));
}
/**
 * Return the size (in bytes) of the target from applying a delta string.
 * Note that the returned size is in UTF-8 encoded bytes, not string length.
 */
export function getStringDeltaTargetSize(delta) {
    const lineEnd = delta.indexOf("\n");
    if (lineEnd === -1) {
        throw new Error("size integer not terminated by '\\n'");
    }
    const sizeLine = delta.slice(0, lineEnd + 1);
    const zDelta = new Reader(new TextEncoder().encode(sizeLine));
    const size = zDelta.getInt();
    if (zDelta.getChar() !== "\n") {
        // This can happen if getInt didn't read the full line.
        throw new Error("size integer not terminated by '\\n'");
    }
    return size;
}
