var test = require('tape');
var fs = require('fs');
var path = require('path');
var fossilDelta = require('../fossil-delta.js');

var decodeUTF8 = function(s) {
  var i, d = unescape(encodeURIComponent(s)), b = new Uint8Array(d.length);
  for (i = 0; i < d.length; i++) b[i] = d.charCodeAt(i);
  return b;
};

var encodeUTF8 = function(arr) {
  var i, s = [];
  for (i = 0; i < arr.length; i++) s.push(String.fromCharCode(arr[i]));
  return decodeURIComponent(escape(s.join('')));
};

var makeArray = function(buf) {
  var a = new Uint8Array(buf.length);
  for (var i = 0; i < buf.length; i++) a[i] = buf[i];
  return a;
}

test('delta create and apply', function(t) {
  var NTESTS = 2;
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
  }
  t.end();
});
