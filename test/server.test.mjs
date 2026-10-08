import test from 'node:test';
import assert from 'node:assert/strict';
import { parseReport, validateRequest } from '../server.mjs';

const notes = [{ id: 'N1', text: 'The footpath narrows beside a pile of bricks.' }, { id: 'N2', text: 'There is no shade at the bus stop.' }];

test('accepts short authored notes and optional manually entered place', () => {
  assert.equal(validateRequest({ notes, place: 'near the bus stop' }), null);
  assert.match(validateRequest({ notes: [{ id: 'N1', text: '' }] }), /short note/);
  assert.match(validateRequest({ notes: Array.from({ length: 13 }, (_, i) => ({ id: `N${i + 1}`, text: 'note' })) }), /1 and 12/);
  assert.match(validateRequest({ notes, place: 'x'.repeat(101) }), /under 100/);
});

test('preserves exact source note IDs and quotes and keeps unknowns visible', () => {
  const result = parseReport(JSON.stringify({
    title: 'Two things I noticed', summary: 'A brief first-hand note.',
    items: [{ noteId: 'N1', quote: 'narrows beside a pile of bricks', observation: 'The path narrows at this point.' }],
    unknowns: ['How long the obstruction remains is unknown.']
  }), notes);
  assert.equal(result.items[0].noteId, 'N1');
  assert.equal(notes[0].text.includes(result.items[0].quote), true);
  assert.match(result.unknowns[0], /unknown/);
});

test('rejects invented IDs and quotes that do not match user input', () => {
  assert.throws(() => parseReport(JSON.stringify({ title: 'x', summary: 'y', items: [{ noteId: 'N3', quote: 'some quote', observation: 'claim' }], unknowns: [] }), notes), /source that does not match/);
  assert.throws(() => parseReport(JSON.stringify({ title: 'x', summary: 'y', items: [{ noteId: 'N1', quote: 'there is no ramp', observation: 'claim' }], unknowns: [] }), notes), /source that does not match/);
});

test('rejects malformed or incomplete model output', () => {
  assert.throws(() => parseReport('{oops', notes), SyntaxError);
  assert.throws(() => parseReport(JSON.stringify({ title: '', summary: 'fine', items: [], unknowns: [] }), notes), /incomplete/);
});
