var test = require('tape');
var fs = require('fs');
var path = require('path');
var fossilDelta = require('../fossil-delta.js');

// Silence error logging.
fossilDelta.logError = function() {}

var makeArray = function(buf) {
  var a = new Array(buf.length);
  for (var i = 0; i < buf.length; i++) a[i] = buf[i];
  return a;
}

test('delta create and apply', function(t) {
  var NTESTS = 4;
  for (var i = 1; i <= NTESTS; i++) {
    var dir = path.join(__dirname, 'data', i.toString());
    var origin = makeArray(fs.readFileSync(path.join(dir, 'origin')));
    var target = makeArray(fs.readFileSync(path.join(dir, 'target')));
    var goodDelta = makeArray(fs.readFileSync(path.join(dir, 'delta')));
    var delta = makeArray(fossilDelta.create(origin, target));
    t.deepEqual(delta, goodDelta);
    var applied = fossilDelta.apply(origin, delta);
    t.deepEqual(applied, target);
  }
  t.end();
});

test('apply truncated delta', function(t) {
  var dir = path.join(__dirname, 'data', '1');
  var origin = makeArray(fs.readFileSync(path.join(dir, 'origin')));
  var target = makeArray(fs.readFileSync(path.join(dir, 'target')));
  var delta = makeArray(fs.readFileSync(path.join(dir, 'delta')));
  delta.pop();
  t.throws(function() { fossilDelta.apply(origin, delta) }, Error, 'should throw');
  t.end();
});
