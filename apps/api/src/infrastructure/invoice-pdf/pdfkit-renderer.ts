import PDFDocument from 'pdfkit';

import {
  INVOICE_PDF_INTERNAL_NOTICE,
  INVOICE_PDF_ISSUER_NAME,
  INVOICE_PDF_NCF_FIELD,
  INVOICE_PDF_TEMPLATE_V1,
} from './constants.js';
import type { InvoicePdfFacts, InvoicePdfRenderer } from './types.js';

type PdfDocument = InstanceType<typeof PDFDocument>;
type TemplateWriter = (facts: InvoicePdfFacts, document: PdfDocument) => void;

function writeInternalV1Document(facts: InvoicePdfFacts, document: PdfDocument): void {
  document.fontSize(16).text(INVOICE_PDF_ISSUER_NAME);
  document.fontSize(9).text(INVOICE_PDF_INTERNAL_NOTICE);
  document.moveDown();
  document.fontSize(12).text(facts.number);
  document.fontSize(11).text(INVOICE_PDF_NCF_FIELD);
  document.moveDown();
  document.fontSize(10).text(`Cliente: ${facts.customerName}`);
  document.text(`Identificación fiscal / cédula: ${facts.customerRnc ?? '—'}`);
  document.text(`Moneda: ${facts.currency}`);
  document.text(
    facts.fiscal
      ? 'Factura con comprobante fiscal (impuesto ITBIS 18% incluido)'
      : 'Sin comprobante fiscal',
  );
  document.moveDown();

  for (const line of facts.lines) {
    document.text(
      `${line.description}  ${line.quantity} x ${line.unitPrice}  ${line.gross}  ITBIS ${line.itbis}`,
    );
  }

  document.moveDown();
  document.text(`Base: ${facts.totals.base}`);
  document.text(`ITBIS: ${facts.totals.itbis}`);
  document.fontSize(12).text(`Total: ${facts.totals.gross} ${facts.currency}`);
}

// Keep prior writers immutable so persisted invoices always use their original template.
const TEMPLATE_WRITERS: Readonly<Record<string, TemplateWriter>> = {
  [INVOICE_PDF_TEMPLATE_V1]: writeInternalV1Document,
};

export const pdfkitInvoicePdfRenderer: InvoicePdfRenderer = {
  render(facts) {
    const writeTemplate = TEMPLATE_WRITERS[facts.templateVersion];
    if (!writeTemplate) {
      return Promise.reject(
        new Error(`Unsupported invoice PDF template version: ${facts.templateVersion}`),
      );
    }
    return new Promise((resolve, reject) => {
      // Uncompressed streams keep FAC- and the blank NCF field as extractable literals for tests.
      const document = new PDFDocument({ compress: false, size: 'LETTER', margin: 50 });
      document.info.Title = facts.number;
      document.info.Subject = INVOICE_PDF_NCF_FIELD;
      const chunks: Buffer[] = [];
      document.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });
      document.on('end', () => resolve(Buffer.concat(chunks)));
      document.on('error', reject);
      writeTemplate(facts, document);
      document.end();
    });
  },
};
