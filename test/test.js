var test = require('tape');
var fs = require('fs');
var path = require('path');
var fossilDelta = require('../fossil-delta.js');

var makeArray = function(buf) {
  var a = new Array(buf.length);
  for (var i = 0; i < buf.length; i++) a[i] = buf[i];
  return a;
}

test('delta create and apply', function(t) {
  var NTESTS = 3;
  for (var i = 1; i <= NTESTS; i++) {
    var dir = path.join(__dirname, 'data', i.toString());
    var origin = makeArray(fs.readFileSync(path.join(dir, 'origin')));
    var target = makeArray(fs.readFileSync(path.join(dir, 'target')));
    var goodDelta = makeArray(fs.readFileSync(path.join(dir, 'delta')));
    var delta = makeArray(fossilDelta.create(origin, target));
    t.deepEqual(delta, goodDelta);
    var applied = fossilDelta.apply(origin, delta);
    t.notEqual(applied, null);
    t.deepEqual(applied, target);
    console.log((new Buffer(applied)).toString());
  }
  t.end();
});
