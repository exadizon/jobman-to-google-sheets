import { JobManClient } from '../api/jobman.js';

export async function syncInvoices(client: JobManClient) {
  console.log('--- Syncing Invoices ---');
  const response = await client.getInvoices(1, 100);
  const invoices = response.data || [];
  const processed = [];

  for (const invoice of invoices) {
    processed.push({
      'Number': invoice.number,
      'Reference': invoice.reference,
      'Contact Name': invoice.contact?.name || '',
      'Status': invoice.status?.name || '',
      'Type': invoice.type || '',
      'Date': invoice.date,
      'Due Date': invoice.due_date,
      'Subtotal': invoice.subtotal,
      'Total': invoice.total_amount,
      'Amount Paid': invoice.amount_paid,
      'Amount Due': invoice.amount_due,
      'Created': invoice.created_at,
      'Updated': invoice.updated_at,
    });
  }
  return processed;
}
