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

test('create and apply', function(t) {
  var NTESTS = 1;
  for (var i = 1; i <= NTESTS; i++) {
    var dir = path.join(__dirname, 'data', i.toString());
    var origin = fs.readFileSync(path.join(dir, 'origin'));
    var target = fs.readFileSync(path.join(dir, 'target'));
    var goodDelta = fs.readFileSync(path.join(dir, 'delta'));
    var delta = fossilDelta.create(decodeUTF8(origin.toString()), decodeUTF8(target.toString()));  
    var deltaString = encodeUTF8(delta);
    //console.log(encodeUTF8(delta));
    t.equal(deltaString, goodDelta.toString());
    var applied = fossilDelta.apply(decodeUTF8(origin.toString()), delta);
    t.notEqual(applied, null);
    t.equal(encodeUTF8(applied), target.toString());
  }
  t.end();
});
