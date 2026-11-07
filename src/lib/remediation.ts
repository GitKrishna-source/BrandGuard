import type { RemediateResponse, RemediationEdit } from '../types';

/** Validate server offsets against the immutable original before applying any edits. */
export function applyRemediationEdits(original: string, edits: RemediationEdit[], accepted: ReadonlySet<string>): string {
  let cursor = 0;
  let result = '';
  const ids = new Set<string>();
  const isBoundary = (offset: number) => !(offset > 0 && offset < original.length
    && /[\uD800-\uDBFF]/.test(original[offset - 1]) && /[\uDC00-\uDFFF]/.test(original[offset]));
  for (const edit of edits) {
    if (typeof edit.id !== 'string' || !edit.id || ids.has(edit.id)
      || typeof edit.original !== 'string' || typeof edit.replacement !== 'string'
      || !Number.isInteger(edit.start) || !Number.isInteger(edit.end)
      || edit.start < cursor || edit.end < edit.start || edit.end > original.length
      || !isBoundary(edit.start) || !isBoundary(edit.end)
      || original.slice(edit.start, edit.end) !== edit.original) {
      throw new Error('The proposed edits no longer match this draft. Generate a new review.');
    }
    ids.add(edit.id);
    result += original.slice(cursor, edit.start);
    result += accepted.has(edit.id) ? edit.replacement : edit.original;
    cursor = edit.end;
  }
  if ([...accepted].some((id) => !ids.has(id))) throw new Error('An accepted edit is missing from this review.');
  return result + original.slice(cursor);
}

export function validateRemediationProposal(proposal: RemediateResponse, currentDraft: string): void {
  if (proposal.original !== currentDraft || !Array.isArray(proposal.edits)) {
    throw new Error('This review belongs to an earlier draft. Generate a new review.');
  }
  const reconstructed = applyRemediationEdits(proposal.original, proposal.edits, new Set(proposal.edits.map((edit) => edit.id)));
  if (reconstructed !== proposal.fixed_content) throw new Error('The proposed comparison is incomplete. Generate a new review.');
}
