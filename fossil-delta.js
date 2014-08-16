// Fossil SCM delta compression algorithm
// ======================================
//
// Format:
// http://www.fossil-scm.org/index.html/doc/tip/www/delta_format.wiki
//
// Algorithm:
// http://www.fossil-scm.org/index.html/doc/tip/www/delta_encoder_algorithm.wiki
//
// Original implementation:
// http://www.fossil-scm.org/index.html/artifact/d1b0598adcd650b3551f63b17dfc864e73775c3d
//
// LICENSE
// -------
//
// Copyright 2014 Dmitry Chestnykh (JavaScript port)
// Copyright 2007 D. Richard Hipp  (original C version)
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or
// without modification, are permitted provided that the
// following conditions are met:
//
//   1. Redistributions of source code must retain the above
//      copyright notice, this list of conditions and the
//      following disclaimer.
//
//   2. Redistributions in binary form must reproduce the above
//      copyright notice, this list of conditions and the
//      following disclaimer in the documentation and/or other
//      materials provided with the distribution.
//
// THIS SOFTWARE IS PROVIDED BY THE AUTHORS ``AS IS'' AND ANY EXPRESS
// OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
// WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED. IN NO EVENT SHALL THE AUTHORS OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR
// BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
// WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE
// OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
// EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
// The views and conclusions contained in the software and documentation
// are those of the authors and contributors and should not be interpreted
// as representing official policies, either expressed or implied, of anybody
// else.
//
(function(root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.fossilDelta = factory();
})(this, function() {

var fossilDelta = {};
/*
** The width of a hash window in bytes.  The algorithm only works if this
** is a power of 2.
*/
var NHASH = 16;

/*
** The current state of the rolling hash.
**
** z[] holds the values that have been hashed.  z[] is a circular buffer.
** z[i] is the first entry and z[(i+NHASH-1)%NHASH] is the last entry of
** the window.
**
** Hash.a is the sum of all elements of hash.z[].  Hash.b is a weighted
** sum.  Hash.b is z[i]*NHASH + z[i+1]*(NHASH-1) + ... + z[i+NHASH-1]*1.
** (Each index for z[] should be module NHASH, of course.  The %NHASH operator
** is omitted in the prior expression for brevity.)
*/
function Hash() {
  this.a = 0; // hash     (16-bit unsigned)
  this.b = 0; // values   (16-bit unsigned)
  this.i = 0; // start of the hash window (16-bit unsigned)
  this.z = new Uint8Array(NHASH); // the values that have been hashed.

  /*
   ** Initialize the rolling hash using the first NHASH characters of z[]
   */
  this.init = function(z, pos) {
    var a = 0, b = 0, i, x;
    for(i = 0; i < NHASH; i++){
      x = z[pos+i];
      a = (a + x) & 0xffff;
      b = (b + (NHASH-i)*x) & 0xffff;
      this.z[i] = x;
    }
    this.a = a & 0xffff;
    this.b = b & 0xffff;
    this.i = 0;
  };

  /*
   ** Advance the rolling hash by a single character "c"
   */
  this.next = function(c) {
    var old = this.z[this.i];
    this.z[this.i] = c;
    this.i = (this.i+1)&(NHASH-1);
    this.a = (this.a - old + c) & 0xffff;
    this.b = (this.b - NHASH*old + this.a) & 0xffff;
  };

  /*
   ** Return a 32-bit hash value
   */
  this.value = function() {
    return ((this.a & 0xffff) | (this.b & 0xffff)<<16)>>>0;
  };
}

var zDigits = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz~".
                split('').map(function (x) { return x.charCodeAt(0); });

var zValue = [
  -1, -1, -1, -1, -1, -1, -1, -1,   -1, -1, -1, -1, -1, -1, -1, -1,
  -1, -1, -1, -1, -1, -1, -1, -1,   -1, -1, -1, -1, -1, -1, -1, -1,
  -1, -1, -1, -1, -1, -1, -1, -1,   -1, -1, -1, -1, -1, -1, -1, -1,
   0,  1,  2,  3,  4,  5,  6,  7,    8,  9, -1, -1, -1, -1, -1, -1,
  -1, 10, 11, 12, 13, 14, 15, 16,   17, 18, 19, 20, 21, 22, 23, 24,
  25, 26, 27, 28, 29, 30, 31, 32,   33, 34, 35, -1, -1, -1, -1, 36,
  -1, 37, 38, 39, 40, 41, 42, 43,   44, 45, 46, 47, 48, 49, 50, 51,
  52, 53, 54, 55, 56, 57, 58, 59,   60, 61, 62, -1, -1, -1, 63, -1
];

function Buf(array) {
  this.a = array;
  this.pos = 0; // position in buffer

  this.toArray = function() {
    return this.a.subarray(0, this.pos);
  };

  this.get = function(index) {
    return this.a[this.pos + index];
  };

  this.set = function(index, value) {
    this.a[this.pos + index] = value;
  };

  this.haveBytes = function() {
    return this.pos < this.a.length;
  };

  this.subarray = function(start, end) {
    return this.a.subarray(this.pos+start, this.pos+end);
  };

  this.incPos = function(add) {
    this.pos += add;
    if (this.pos > this.a.length) throw new RangeError('out of bounds');
  };

  this.putByte = function(b) {
    this.a[this.pos] = b;
    this.incPos(1);
  };

  this.getByte = function() {
    var b = this.a[this.pos];
    this.incPos(1);
    return b;
  };

  this.getChar = function() {
    return String.fromCharCode(this.getByte());
  };

  this.putChar = function(s) {
    // ASCII only
    this.putByte(s.charCodeAt(0) & 0xff);
  };

  /*
  ** Write an base-64 integer into the buffer.
  */
  this.putInt = function(v){
    var i, j;
    var zBuf = [];
    if( v===0 ){
      this.putChar('0');
      return;
    }
    for(i=0; v>0; i++, v>>>=6){
      zBuf.push(zDigits[v&0x3f]);
    }
    for(j=i-1; j>=0; j--){
      this.putByte(zBuf[j]);
    }
  };

  /*
  ** Read bytes from *pz and convert them into a positive integer.  When
  ** finished, leave *pz pointing to the first character past the end of
  ** the integer.  The *pLen parameter holds the length of the string
  ** in *pz and is decremented once for each character in the integer.
  */
  this.getInt = function(){
    var v = 0, c;
    while( (c = zValue[0x7f & this.getByte()]) >= 0 ){
       v = (v<<6) + c;
    }
    this.pos--;
    return v >>> 0;
  };

  this.putArray = function(a) {
    for (var i = 0; i < a.length; i++) {
      this.a[this.pos++] = a[i];
    }
    if (this.pos > this.a.length) throw new RangeError('out of bounds: ' + a.length +' ' + this.pos);
  };
}

/*
** Return the number digits in the base-64 representation of a positive integer
*/
function digitCount(v){
  var i, x;
  for(i=1, x=64; v>=x; i++, x <<= 6){}
  return i;
}

/*
** Compute a 32-bit checksum on the N-byte buffer.  Return the result.
*/
function checksum(arr) {
  var sum0 = 0;
  var sum1 = 0;
  var sum2 = 0;
  var sum3 = 0;
  var N = arr.length;
  var z = 0;
  while(N >= 16){
    sum0 = sum0 + arr[z+0] | 0;
    sum1 = sum1 + arr[z+1] | 0;
    sum2 = sum2 + arr[z+2] | 0;
    sum3 = sum3 + arr[z+3] | 0;

    sum0 = sum0 + arr[z+4] | 0;
    sum1 = sum1 + arr[z+5] | 0;
    sum2 = sum2 + arr[z+6] | 0;
    sum3 = sum3 + arr[z+7] | 0;

    sum0 = sum0 + arr[z+8] | 0;
    sum1 = sum1 + arr[z+9] | 0;
    sum2 = sum2 + arr[z+10] | 0;
    sum3 = sum3 + arr[z+11] | 0;

    sum0 = sum0 + arr[z+12] | 0;
    sum1 = sum1 + arr[z+13] | 0;
    sum2 = sum2 + arr[z+14] | 0;
    sum3 = sum3 + arr[z+15] | 0;

    z += 16;
    N -= 16;
  }
  while(N >= 4){
    sum0 = sum0 + arr[z+0] | 0;
    sum1 = sum1 + arr[z+1] | 0;
    sum2 = sum2 + arr[z+2] | 0;
    sum3 = sum3 + arr[z+3] | 0;
    z += 4;
    N -= 4;
  }
  sum3 = (((sum3 + (sum2 << 8) | 0) + (sum1 << 16) | 0) + (sum0 << 24) | 0);
  /* jshint -W086 */
  switch(N){
    case 3:  sum3 = sum3 + (arr[z+2] <<  8) | 0; /* falls through */
    case 2:  sum3 = sum3 + (arr[z+1] << 16) | 0; /* falls through */
    case 1:  sum3 = sum3 + (arr[z+0] << 24) | 0; /* falls through */
  }
  return sum3 >>> 0;
}

/*
** Create a new delta.
**
** The delta is written into a preallocated buffer, zDelta, which
** should be at least 60 bytes longer than the target file, zOut.
** The delta string will be NUL-terminated, but it might also contain
** embedded NUL characters if either the zSrc or zOut files are
** binary.  This function returns the length of the delta string
** in bytes, excluding the final NUL terminator character.
**
** Output Format:
**
** The delta begins with a base64 number followed by a newline.  This
** number is the number of bytes in the TARGET file.  Thus, given a
** delta file z, a program can compute the size of the output file
** simply by reading the first line and decoding the base-64 number
** found there.  The delta_output_size() routine does exactly this.
**
** After the initial size number, the delta consists of a series of
** literal text segments and commands to copy from the SOURCE file.
** A copy command looks like this:
**
**     NNN@MMM,
**
** where NNN is the number of bytes to be copied and MMM is the offset
** into the source file of the first byte (both base-64).   If NNN is 0
** it means copy the rest of the input file.  Literal text is like this:
**
**     NNN:TTTTT
**
** where NNN is the number of bytes of text (base-64) and TTTTT is the text.
**
** The last term is of the form
**
**     NNN;
**
** In this case, NNN is a 32-bit bigendian checksum of the output file
** that can be used to verify that the delta applied correctly.  All
** numbers are in base-64.
**
** Pure text files generate a pure text delta.  Binary files generate a
** delta that may contain some binary data.
**
** Algorithm:
**
** The encoder first builds a hash table to help it find matching
** patterns in the source file.  16-byte chunks of the source file
** sampled at evenly spaced intervals are used to populate the hash
** table.
**
** Next we begin scanning the target file using a sliding 16-byte
** window.  The hash of the 16-byte window in the target is used to
** search for a matching section in the source file.  When a match
** is found, a copy command is added to the delta.  An effort is
** made to extend the matching section to regions that come before
** and after the 16-byte hash window.  A copy command is only issued
** if the result would use less space that just quoting the text
** literally. Literal text is added to the delta for sections that
** do not match or which can not be encoded efficiently using copy
** commands.
*/
fossilDelta.create = function(src, out) {
  // TODO make delta elastic buffer.
  var zDelta = new Buf(new Uint8Array(out.length+60));
  var lenOut = out.length;
  var lenSrc = src.length;
  var i, lastRead = -1;

  zDelta.putInt(lenOut);
  zDelta.putChar('\n');

  /* If the source file is very small, it means that we have no
  ** chance of ever doing a copy command.  Just output a single
  ** literal segment for the entire target and exit.
  */
  if (lenSrc <= NHASH) {
    zDelta.putInt(lenOut);
    zDelta.putChar(':');
    zDelta.putArray(out);
    zDelta.putInt(checksum(out));
    zDelta.putChar(';');
    return zDelta.toArray();
  }

  /* Compute the hash table used to locate matching sections in the
  ** source file.
  */
  var nHash = Math.ceil(lenSrc / NHASH);
  var collide =  new Array(nHash);
  var landmark = new Array(nHash);
  for (i = 0; i < collide.length; i++) collide[i] = -1;
  for (i = 0; i < landmark.length; i++) landmark[i] = -1;
  var hv, h = new Hash();
  for (i = 0; i < lenSrc-NHASH; i += NHASH) {
    h.init(src, i);
    hv = h.value() % nHash;
    collide[i/NHASH] = landmark[hv];
    landmark[hv] = i/NHASH;
  }

  var base = 0;
  var iSrc, iBlock, bestCnt, bestOfst, bestLitsz;
  while (base+NHASH<lenOut) {
    bestOfst=0;
    bestLitsz=0;
    h.init(out, base);
    i = 0; /* Trying to match a landmark against zOut[base+i] */
    bestCnt = 0;
    while(1) {
      var limit = 250;
      hv = h.value() % nHash;
      iBlock = landmark[hv];
      while (iBlock >= 0 && (limit--)>0 ) {
        /*
        ** The hash window has identified a potential match against
        ** landmark block iBlock.  But we need to investigate further.
        **
        ** Look for a region in zOut that matches zSrc. Anchor the search
        ** at zSrc[iSrc] and zOut[base+i].  Do not include anything prior to
        ** zOut[base] or after zOut[outLen] nor anything after zSrc[srcLen].
        **
        ** Set cnt equal to the length of the match and set ofst so that
        ** zSrc[ofst] is the first element of the match.  litsz is the number
        ** of characters between zOut[base] and the beginning of the match.
        ** sz will be the overhead (in bytes) needed to encode the copy
        ** command.  Only generate copy command if the overhead of the
        ** copy command is less than the amount of literal text to be copied.
        */
       var cnt, ofst, litsz;
       var j, k, x, y;
       var sz;

        /* Beginning at iSrc, match forwards as far as we can.  j counts
        ** the number of characters that match */
        iSrc = iBlock*NHASH;
        for(j=0, x=iSrc, y=base+i; x<lenSrc && y<lenOut; j++, x++, y++){
          if( src[x]!==out[y] ) break;
        }
        j--;

        /* Beginning at iSrc-1, match backwards as far as we can.  k counts
        ** the number of characters that match */
        for(k=1; k<iSrc && k<=i; k++){
          if( src[iSrc-k]!==out[base+i-k] ) break;
        }
        k--;

        /* Compute the offset and size of the matching region */
        ofst = iSrc-k;
        cnt = j+k+1;
        litsz = i-k;  /* Number of bytes of literal text before the copy */
        /* sz will hold the number of bytes needed to encode the "insert"
        ** command and the copy command, not counting the "insert" text */
        sz = digitCount(i-k)+digitCount(cnt)+digitCount(ofst)+3;
        if( cnt>=sz && cnt>bestCnt ){
          /* Remember this match only if it is the best so far and it
          ** does not increase the file size */
          bestCnt = cnt;
          bestOfst = iSrc-k;
          bestLitsz = litsz;
        }

        /* Check the next matching block */
        iBlock = collide[iBlock];
      }

      /* We have a copy command that does not cause the delta to be larger
      ** than a literal insert.  So add the copy command to the delta.
      */
      if( bestCnt>0 ){
        if( bestLitsz>0 ){
          /* Add an insert command before the copy */
          zDelta.putInt(bestLitsz);
          zDelta.putChar(':');
          zDelta.putArray(out.subarray(base, base+bestLitsz));
          base += bestLitsz;
        }
        base += bestCnt;
        zDelta.putInt(bestCnt);
        zDelta.putChar('@');
        zDelta.putInt(bestOfst);
        zDelta.putChar(',');
        if( bestOfst + bestCnt -1 > lastRead ){
          lastRead = bestOfst + bestCnt - 1;
        }
        bestCnt = 0;
        break;
      }

      /* If we reach this point, it means no match is found so far */
      if( base+i+NHASH>=lenOut ){
        /* We have reached the end of the file and have not found any
        ** matches.  Do an "insert" for everything that does not match */
        zDelta.putInt(lenOut-base);
        zDelta.putChar(':');
        zDelta.putArray(out.subarray(base, base+lenOut-base)); // XXX remove base
        base = lenOut;
        break;
      }

      /* Advance the hash by one character.  Keep looking for a match */
      h.next(out[base+i+NHASH]);
      i++;
    }
  }
  /* Output a final "insert" record to get all the text at the end of
  ** the file that does not match anything in the source file.
  */
  if( base<lenOut ){
    zDelta.putInt(lenOut-base);
    zDelta.putChar(':');
    zDelta.putArray(out.subarray(base));
  }
  /* Output the final checksum record. */
  zDelta.putInt(checksum(out));
  zDelta.putChar(';');
  return zDelta.toArray();
};

function logError(s) {
  fossilDelta.logError ? fossilDelta.logError(s) : console.log('ERROR: ' + s);
}

/*
** Return the size (in bytes) of the output from applying
** a delta.
**
** This routine is provided so that an procedure that is able
** to call delta_apply() can learn how much space is required
** for the output and hence allocate nor more space that is really
** needed.
*/
fossilDelta.outputSize = function(delta){
  var zDelta = new Buf(delta);
  var size = zDelta.getInt();
  if( zDelta.getChar() !== '\n' ){
    logError('size integer not terminated by \'\\n\'');
    return -1;
  }
  return size;
};

/*
** Apply a delta.
**
** The output buffer should be big enough to hold the whole output
** file and a NUL terminator at the end.  The delta_output_size()
** routine will determine this size for you.
**
** The delta string should be null-terminated.  But the delta string
** may contain embedded NUL characters (if the input and output are
** binary files) so we also have to pass in the length of the delta in
** the lenDelta parameter.
**
** This function returns the size of the output file in bytes (excluding
** the final NUL terminator character).  Except, if the delta string is
** malformed or intended for use with a source file other than zSrc,
** then this routine returns -1.
**
** Refer to the delta_create() documentation above for a description
** of the delta file format.
*/
fossilDelta.apply = function(src, delta) {
  var limit;
  var total = 0;
  var zDelta = new Buf(delta);
  var lenSrc = src.length;
  var lenDelta = delta.length;

  limit = zDelta.getInt();
  if( zDelta.getChar() !== '\n' ){
    logError('size integer not terminated by \'\\n\'');
    return null;
  }
  var zOut = new Buf(new Uint8Array(limit)); // TODO this is elastic
  while(zDelta.haveBytes()) {
    var cnt, ofst;
    cnt = zDelta.getInt();
    switch( zDelta.getChar() ){
      case '@': {
        ofst = zDelta.getInt();
        if( zDelta.haveBytes() && zDelta.getChar()!==',' ){
          logError('copy command not terminated by \',\'');
          return null;
        }
        total += cnt;
        if( total>limit ){
          logError('copy exceeds output file size');
          return null;
        }
        if( ofst+cnt > lenSrc ){
          logError('copy extends past end of input');
          return null;
        }
        zOut.putArray(src.subarray(ofst, ofst+cnt));
        break;
      }
      case ':': {
        total += cnt;
        if( total>limit ){
          logError('insert command gives an output larger than predicted');
          return null;
        }
        if( cnt>lenDelta ){
          logError('insert count exceeds size of delta');
          return null;
        }
        zOut.putArray(zDelta.subarray(0, cnt)); //XXX this toArray! make this delta.subarray(zDelta.pos, zDelta.pos+cnt)
        zDelta.pos += cnt; // XXX accessing private
        break;
      }
      case ';': {
        //zOut.putByte(0); // XXX wha? DONE
        var out = zOut.a; //XXX//zOut.toArray();
        if( cnt!==checksum(out) ){
          logError('bad checksum');
          return null;
        }
        if( total!==limit ){
          logError('generated size does not match predicted size');
          return null;
        }
        return out;
      }
      default: {
        logError('unknown delta operator');
        return null;
      }
    }
  }
  logError('unterminated delta');
  return null;
};

return fossilDelta;

});
