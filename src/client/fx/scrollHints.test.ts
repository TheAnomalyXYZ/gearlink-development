import assert from 'node:assert/strict';
import test from 'node:test';
import { scrollHint } from './scrollHints.js';

void test('a pane that fits shows no hint either way', () => {
  assert.deepEqual(scrollHint(0, 300, 300), { up: false, down: false });
});

void test('a pane at the top hints down only', () => {
  assert.deepEqual(scrollHint(0, 300, 900), { up: false, down: true });
});

void test('a pane mid-scroll hints both ways', () => {
  assert.deepEqual(scrollHint(300, 300, 900), { up: true, down: true });
});

void test('a pane at the bottom hints up only, forgiving sub-pixel rounding', () => {
  assert.deepEqual(scrollHint(599.5, 300, 900), { up: true, down: false });
});
