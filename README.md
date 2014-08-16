Fossil SCM delta compression algorithm
======================================

The cool thing about it is that plain text inputs generate plain text deltas
(binary inputs, of course, may generate binary deltas).

* [Format](http://www.fossil-scm.org/index.html/doc/tip/www/delta_format.wiki)
* [Algorithm](http://www.fossil-scm.org/index.html/doc/tip/www/delta_encoder_algorithm.wiki)
* [Original implementation](http://www.fossil-scm.org/index.html/artifact/d1b0598adcd650b3551f63b17dfc864e73775c3d>)

[![Build Status](https://travis-ci.org/dchest/fossil-delta-js.svg?branch=master)
](https://travis-ci.org/dchest/fossil-delta-js)

Usage
-----

### fossilDelta.create(origin, target)

Returns a delta (as `Array` of bytes) from origin to target.

### fossilDelta.apply(origin, delta)

Returns target (as `Array` of bytes) by applying delta to origin.

### fossilDelta.outputSize(delta)

Returns a size of target for this delta.
