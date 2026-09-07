import { describe, expect, it } from 'vitest';

import { resolveUseMockApi } from '../../../src/api/client/http-client';

describe('resolveUseMockApi', () => {
  it('enables the in-memory prototype only when the flag is exactly true', () => {
    expect(resolveUseMockApi('true')).toBe(true);
    expect(resolveUseMockApi('false')).toBe(false);
    expect(resolveUseMockApi(undefined)).toBe(false);
    expect(resolveUseMockApi('')).toBe(false);
  });
});
