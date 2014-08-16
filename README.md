Fossil SCM delta compression algorithm
======================================

The cool thing about it is that plain text inputs generate plain text deltas
(binary inputs, of course, may generate binary deltas).

* [Format](http://www.fossil-scm.org/index.html/doc/tip/www/delta_format.wiki)
* [Algorithm](http://www.fossil-scm.org/index.html/doc/tip/www/delta_encoder_algorithm.wiki)
* [Original implementation](http://www.fossil-scm.org/index.html/artifact/d1b0598adcd650b3551f63b17dfc864e73775c3d>)

[![Build Status](https://travis-ci.org/dchest/fossil-delta-js.svg?branch=master)
](https://travis-ci.org/dchest/fossil-delta-js)

Installation
------------

Via NPM:

    $ npm install fossil-delta

Via Bower:

    $ bower install fossil-delta


or just download `fossil-delta.min.js`.

Direct usage:

```html
<script src="fossil-delta.min.js"></script>
```

CommonJS:

```javascript
var fossilDelta = require('fossil-delta')
```


Usage
-----

### fossilDelta.create(origin, target)

Returns a delta (as `Array` of bytes) from origin to target (any array-like
object containing bytes, e.g. `Uint8Array`, `Buffer` or plain `Array`).

### fossilDelta.apply(origin, delta)

Returns target (as `Array` of bytes) by applying delta to origin.

Returns `null` if there was an error. It also logs the reason for error with
`console.log`. Logging can be overridden by setting `fossilDelta.logError`
to a function accepting a string.

### fossilDelta.outputSize(delta)

Returns a size of target for this delta.
