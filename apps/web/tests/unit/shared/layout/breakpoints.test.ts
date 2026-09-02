import { describe, expect, it } from 'vitest';

import { commercialNavModeForWidth } from '../../../../src/shared/layout/breakpoints';

describe('commercialNavModeForWidth', () => {
  it('uses a full sidebar from the xl cut used by 1280×720 and wider laptops', () => {
    expect(commercialNavModeForWidth(1920)).toBe('full');
    expect(commercialNavModeForWidth(1440)).toBe('full');
    expect(commercialNavModeForWidth(1366)).toBe('full');
    expect(commercialNavModeForWidth(1280)).toBe('full');
  });

  it('compacts the sidebar on 1024×768 so it does not dominate the content column', () => {
    expect(commercialNavModeForWidth(1279)).toBe('compact');
    expect(commercialNavModeForWidth(1024)).toBe('compact');
    expect(commercialNavModeForWidth(768)).toBe('compact');
  });

  it('switches to a drawer below md, including zoom-200% of a 1280px window', () => {
    expect(commercialNavModeForWidth(767)).toBe('drawer');
    expect(commercialNavModeForWidth(640)).toBe('drawer');
    expect(commercialNavModeForWidth(360)).toBe('drawer');
  });
});
