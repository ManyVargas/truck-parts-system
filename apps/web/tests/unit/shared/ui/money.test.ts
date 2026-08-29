import { describe, expect, it } from 'vitest';

import { money } from '../../../../src/shared/ui/money';

describe('money', () => {
  it('formats DOP with two decimals by default', () => {
    expect(money(1250)).toContain('1,250.00');
    expect(money(1250)).toMatch(/RD\$|DOP/);
  });

  it('formats USD independently from DOP', () => {
    expect(money(19.5, 'USD')).toBe('$19.50');
  });
});
