/*! (c) Dmitry Chestnykh, D. Richard Hipp | BSD License | https://github.com/dchest/fossil-delta-js/ */
export type ByteArray = number[] | Uint8Array;
/**
 * Create a new delta array of bytes from source byte array to target byte array.
 */
export declare function createDelta<T extends ByteArray>(source: T, target: T): T;
/**
 * Return the size (in bytes) of the target from applying a delta.
 */
export declare function getDeltaTargetSize(delta: ByteArray): number;
export type Options = {
    verifyChecksum?: boolean;
};
/**
 * Apply a delta byte array to a source byte array, returning the target byte array.
 */
export declare function applyDelta<T extends ByteArray>(source: T, delta: T, opts?: Options): T;
/**
 * Create a new string delta from a source string to a target string.
 */
export declare function createStringDelta(source: string, target: string): string;
/**
 * Apply a string delta to a source string, returning the target string.
 */
export declare function applyStringDelta(source: string, delta: string, opts?: Options): string;
/**
 * Return the size (in bytes) of the target from applying a delta string.
 * Note that the returned size is in UTF-8 encoded bytes, not string length.
 */
export declare function getStringDeltaTargetSize(delta: string): number;
