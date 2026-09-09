import { describe, expect, it } from 'vitest';

import {
  INVOICE_PDF_NCF_FIELD,
  pdfkitInvoicePdfRenderer,
} from '../../../src/infrastructure/invoice-pdf/index.js';

const facts = {
  number: 'FAC-000001',
  currency: 'DOP' as const,
  fiscal: false,
  customerName: 'Cliente contado',
  customerRnc: null,
  confirmedAt: new Date('2026-09-08T18:00:00.000Z'),
    lines: [
    {
      description: 'Filtro',
      notes: null,
      quantity: '1.00',
      unitPrice: '118.00',
      gross: '118.00',
      itbis: '0.00',
    },
  ],
  totals: { gross: '118.00', base: '118.00', itbis: '0.00' },
  templateVersion: 'internal-v1',
};

describe('invoice PDF renderer (SALE-004)', () => {
  it('embeds FAC- number, one currency, two-decimal totals, and a blank NCF field', async () => {
    const pdf = await pdfkitInvoicePdfRenderer.render(facts);
    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    const text = pdf.toString('latin1');
    expect(text).toContain('(FAC-000001)');
    expect(text).toContain(`(${INVOICE_PDF_NCF_FIELD})`);
    expect(text).toContain('444f50');
    expect(text).toContain('3131382e3030');
    expect(text).not.toContain('e-CF');
  });

  it('prints optional line notes below the description on internal-v2', async () => {
    const pdf = await pdfkitInvoicePdfRenderer.render({
      ...facts,
      lines: [
        {
          ...facts.lines[0],
          notes: 'Installed water pump',
        },
      ],
      templateVersion: 'internal-v2',
    });
    const text = pdf.toString('latin1');
    expect(text).toContain('46696c74726f');
    expect(text).toContain('496e7374616c6c6564');
  });

  it('rejects an unsupported persisted template version instead of changing the document', async () => {
    await expect(
      pdfkitInvoicePdfRenderer.render({ ...facts, templateVersion: 'internal-unknown' }),
    ).rejects.toThrow('Unsupported invoice PDF template version: internal-unknown');
  });
});
