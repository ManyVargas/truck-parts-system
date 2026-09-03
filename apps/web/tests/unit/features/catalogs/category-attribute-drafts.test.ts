import { describe, expect, it } from 'vitest';

import {
  definitionsFromDrafts,
  draftsFromDefinitions,
  resolveDraftAttributeKey,
  type AttributeDraft,
} from '../../../../src/features/catalogs/CategoryAttributeDefinitionsEditor';

function unlockedDraft(overrides: Partial<AttributeDraft> = {}): AttributeDraft {
  return {
    key: '',
    keyLocked: false,
    label: '',
    type: 'text',
    required: false,
    optionsText: '',
    ...overrides,
  };
}

describe('category attribute drafts', () => {
  it('derives the storage key from a new label', () => {
    expect(resolveDraftAttributeKey(unlockedDraft({ label: 'Cilindrada (L)' }))).toBe(
      'cilindrada_l',
    );
  });

  it('keeps the stored key when the label of a saved attribute changes', () => {
    const drafts = draftsFromDefinitions([
      { key: 'displacement', label: 'Cilindrada', type: 'text' },
    ]);
    drafts[0] = { ...drafts[0], label: 'Cilindrada (L)' };

    expect(definitionsFromDrafts(drafts)).toEqual([
      { key: 'displacement', label: 'Cilindrada (L)', type: 'text' },
    ]);
  });
});
