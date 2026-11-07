import assert from 'node:assert/strict';
import test from 'node:test';
import { applyRemediationEdits, validateRemediationProposal } from '../src/lib/remediation.ts';
import type { RemediateResponse, RemediationEdit } from '../src/types/index.ts';

function edit(id: string, start: number, end: number, original: string, replacement: string): RemediationEdit {
  return { id, start, end, original, replacement, explanation: 'Review the supporting evidence before using this change.', source: null };
}

function proposal(original: string, edits: RemediationEdit[]): RemediateResponse {
  return { original, edits, fixed_content: applyRemediationEdits(original, edits, new Set(edits.map((entry) => entry.id))), changes_summary: 'Proposed changes.', analysis_engine: 'test' };
}

test('only explicitly accepted edits change the draft, and review does not mutate the proposal', () => {
  const original = 'Try kicks. More kicks.';
  const edits = [edit('first', 4, 9, 'kicks', 'shoes'), edit('second', 16, 21, 'kicks', 'walking shoes')];
  const review = proposal(original, edits);
  validateRemediationProposal(review, original);
  assert.equal(applyRemediationEdits(original, edits, new Set()), original);
  assert.equal(applyRemediationEdits(original, edits, new Set(['second'])), 'Try kicks. More walking shoes.');
  assert.equal(applyRemediationEdits(original, edits, new Set(['first'])), 'Try shoes. More kicks.');
  assert.equal(review.original, original);
  assert.equal(edits[0].original, 'kicks');
});

test('insertion, deletion and replacement retain untouched whitespace and line breaks', () => {
  const original = 'Hi\nold  copy!';
  const edits = [edit('insert', 2, 2, '', ' there'), edit('delete', 3, 8, 'old  ', ''), edit('replace', 8, 12, 'copy', 'draft')];
  assert.equal(applyRemediationEdits(original, edits, new Set(['insert', 'delete', 'replace'])), 'Hi there\ndraft!');
  assert.equal(applyRemediationEdits(original, edits, new Set(['replace'])), 'Hi\nold  draft!');
});

test('UTF-16 offsets work after emoji and with non-Latin text', () => {
  const original = '👟 नमस्ते kicks';
  const start = original.indexOf('kicks');
  assert.equal(applyRemediationEdits(original, [edit('term', start, start + 5, 'kicks', 'shoes')], new Set(['term'])), '👟 नमस्ते shoes');
  assert.throws(() => applyRemediationEdits('👟', [edit('half', 0, 1, '\ud83d', 'x')], new Set(['half'])), /no longer match/);
});

test('old draft proposals cannot be applied after manual edits', () => {
  const review = proposal('Try kicks.', [edit('term', 4, 9, 'kicks', 'shoes')]);
  assert.throws(() => validateRemediationProposal(review, 'Try new kicks.'), /earlier draft/);
});

test('malformed, overlapping, duplicate and missing edits are rejected before mutation', () => {
  const original = 'Try kicks.';
  assert.throws(() => applyRemediationEdits(original, [edit('wrong', 0, 5, 'kicks', 'shoes')], new Set()), /no longer match/);
  assert.throws(() => applyRemediationEdits(original, [edit('one', 4, 9, 'kicks', 'shoes'), edit('two', 5, 9, 'icks', '')], new Set()), /no longer match/);
  assert.throws(() => applyRemediationEdits(original, [edit('same', 0, 0, '', 'a'), edit('same', 1, 1, '', 'b')], new Set()), /no longer match/);
  assert.throws(() => applyRemediationEdits(original, [], new Set(['missing'])), /missing/);
  const incomplete = { ...proposal(original, []), fixed_content: 'Something else.' };
  assert.throws(() => validateRemediationProposal(incomplete, original), /incomplete/);
});

test('explanations and citation labels never become replacement copy', () => {
  const changes = [edit('term', 4, 9, 'kicks', 'shoes')];
  changes[0].source = '[S1] Brand guidelines, p. 2';
  changes[0].explanation = 'Replace it with: shoes. Verify with a manager.';
  const result = applyRemediationEdits('Try kicks.', changes, new Set(['term']));
  assert.equal(result, 'Try shoes.');
  assert.ok(!result.includes('Replace it with'));
  assert.ok(!result.includes('[S1]'));
});

test('unchanged proposals are valid and contain no automatic edits', () => {
  const review = proposal('Approved text.', []);
  assert.doesNotThrow(() => validateRemediationProposal(review, review.original));
  assert.equal(applyRemediationEdits(review.original, review.edits, new Set()), review.original);
});
