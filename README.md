Fossil SCM delta compression algorithm
======================================

The cool thing about it is that plain text inputs generate plain text deltas
(binary inputs, of course, may generate binary deltas).

* [Format](http://www.fossil-scm.org/index.html/doc/tip/www/delta_format.wiki)
* [Algorithm](http://www.fossil-scm.org/index.html/doc/tip/www/delta_encoder_algorithm.wiki)
* [Original implementation](http://www.fossil-scm.org/index.html/artifact/d1b0598adcd650b3551f63b17dfc864e73775c3d)
* [Demo](https://dchest.github.io/fossil-delta-js/)

Installation
------------

    $ npm install fossil-delta

Usage
-----

```javascript
import { createDelta, applyDelta } from 'fossil-delta';
```

### createDelta(source, target)

Returns a delta from source to target.

`source` and `target` must be a `Uint8Array` or an `Array` of bytes.
The same type will be returned.

### applyDelta(origin, delta[, opts])

Returns the target by applying the delta to the origin.

`origin` and `delta` must be a `Uint8Array` or an `Array` of bytes.
The same type will be returned.

Throws an error if the delta fails to apply (e.g., if it is corrupted).

Optional argument `opts` can be:

```javascript
{
    verifyChecksum: false
}
```

to disable checksum verification (which is enabled by default.)

### getDeltaTargetSize(delta)

Returns the size of the target for this delta.

Throws an error if it cannot read the size from the delta.


## Strings

A nice property of the Fossil Delta Encoding is that it produces pure plain text deltas
if the source and target are plain text.

To simplify working with plain text strings, the library provides the following convenience functions,
which automatically encode and decode strings using `TextEncoder` and `TextDecoder` before processing:

* `createStringDelta(source: string, target: string): string`
* `applyStringDelta(origin: string, delta: string, [, opts]): string`
* `getStringDeltaTargetSize(delta: string): number`

Note that `getStringDeltaTargetSize()` will return the size of the target string in UTF-8 bytes,
not characters (that is, it's not always equal to `string` length of the resulting target).


Development
-----------

I develop with Bun.

To build the library, run:

    $ bun run build

npm, yarn will also work for building.

To run tests, run:

    $ bun test


Migration from v1.x.x
---------------------

fossil-delta.js is now an ES module and there is no minified version included.

API renames:

- `create` -> `createDelta`
- `apply` -> `applyDelta`
- `outputSize` -> `getDeltaTargetSize`

Important: `createDelta` and `applyDelta` now return the same type as the input (`Uint8Array` if given `Uint8Array`, `Array` if given `Array`), instead of always returning an `Array`.
