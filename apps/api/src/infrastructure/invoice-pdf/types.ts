export type InvoicePdfLineFacts = {
  description: string;
  notes: string | null;
  quantity: string;
  unitPrice: string;
  gross: string;
  itbis: string;
};

export type InvoicePdfFacts = {
  number: string;
  currency: 'DOP' | 'USD';
  fiscal: boolean;
  customerName: string;
  customerRnc: string | null;
  confirmedAt: Date;
  lines: InvoicePdfLineFacts[];
  totals: { gross: string; base: string; itbis: string };
  templateVersion: string;
};

export type InvoicePdfRenderer = {
  render(facts: InvoicePdfFacts): Promise<Buffer>;
};
