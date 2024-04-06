import fs from "fs";
import path from "path";
import { expect, test } from "bun:test";
import { createDelta, applyDelta, createStringDelta, applyStringDelta, getDeltaTargetSize, getStringDeltaTargetSize} from "../fossil-delta.js"; // test JS, not TS

test('delta create and apply', () => {
  const NTESTS = 5;
  for (let i = 1; i <= NTESTS; i++) {
    const dir = path.join(__dirname, 'data', i.toString());
    const origin = fs.readFileSync(path.join(dir, 'origin'));
    const target = fs.readFileSync(path.join(dir, 'target'));
    const goodDelta = fs.readFileSync(path.join(dir, 'delta'));
    const goodSize = target.length;

    // Uint8Array
    const delta = createDelta(origin, target);
    expect(delta).toEqual(goodDelta);
    const applied = applyDelta(origin, delta);
    expect(applied).toEqual(target);
    const size = getDeltaTargetSize(delta);
    expect(size).toEqual(goodSize);

    // Array<number>
    const delta2 = createDelta(Array.from(origin), Array.from(target));
    expect(delta2).toEqual(Array.from(goodDelta));
    const applied2 = applyDelta(Array.from(origin), Array.from(delta2));
    expect(applied2).toEqual(Array.from(target));
    const size2 = getDeltaTargetSize(delta2);
    expect(size2).toEqual(goodSize);
  }
});

test('string delta create and apply', () => {
  // Just the first test file.
  const dir = path.join(__dirname, 'data', '1');
  const originBytes = fs.readFileSync(path.join(dir, 'origin'));
  const targetBytes = fs.readFileSync(path.join(dir, 'target'));
  const goodDeltaBytes = fs.readFileSync(path.join(dir, 'delta'));
  const goodSize = targetBytes.length;

  const origin = new TextDecoder().decode(originBytes);
  const target = new TextDecoder().decode(targetBytes);
  const goodDelta = new TextDecoder().decode(goodDeltaBytes);

  const delta = createStringDelta(origin, target);
  expect(typeof delta).toBe('string');
  expect(delta).toEqual(goodDelta);
  const applied = applyStringDelta(origin, delta);
  expect(typeof applied).toBe('string');
  expect(applied).toEqual(target);
  const size = getStringDeltaTargetSize(delta);
  expect(size).toEqual(goodSize);
});

test('returns the same type as source', () => {
  // Uint8Array
  const source = new Uint8Array([1, 2, 3]);
  const target = new Uint8Array([1, 2, 3, 4]);
  const delta = createDelta(source, target);
  expect(delta).toBeInstanceOf(Uint8Array);
  const applied = applyDelta(source, delta);
  expect(applied).toBeInstanceOf(Uint8Array);
  // Array<number>
  const source2 = [1, 2, 3];
  const target2 = [1, 2, 3, 4];
  const delta2 = createDelta(source2, target2);
  expect(delta2).toBeInstanceOf(Array);
  const applied2 = applyDelta(source2, delta2);
  expect(applied2).toBeInstanceOf(Array);
});

test('apply truncated delta', () => {
  const dir = path.join(__dirname, 'data', '1');
  const origin = fs.readFileSync(path.join(dir, 'origin'));
  const target = fs.readFileSync(path.join(dir, 'target'));
  const delta = fs.readFileSync(path.join(dir, 'delta'));
  const damagedDelta = delta.slice(0, delta.length - 1);
  expect(() => applyDelta(origin, damagedDelta)).toThrow();
});
