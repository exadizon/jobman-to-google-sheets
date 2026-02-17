import { JobManClient } from '../api/jobman.js';
import { formatDate } from './quotes.js';

export async function syncInvoices(client: JobManClient) {
  console.log('--- Starting Invoices Sync (Restoring Financials + Hunting Quote) ---');
  
  const response: any = await client.getInvoices(1, 5); 
  const invoices = response.invoices?.data || [];
  const processed = [];

  for (const inv of invoices) {
    console.log(`Processing Invoice: ${inv.number}`);

    let details: any = {};
    let quoteNumber = '';
    let leadNumber = '';
    let jobNumber = '';
    let amountPaid = 0;

    try {
        // 1. Restore Financials
        const detailsResponse = await client.getInvoiceDetails(inv.id);
        details = detailsResponse.invoice || detailsResponse.data || detailsResponse;

        const payments = await client.getInvoicePayments(inv.id);
        amountPaid = payments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);

        // 2. Resolve Numbers for Lead/Job/Quote
        if (inv.job_id) {
            const jobData = await client.getJobDetails(inv.job_id);
            jobNumber = jobData.number || '';
            
            // Look for Quote Number inside Job
            quoteNumber = jobData.quote_number || (jobData.quote ? jobData.quote.number : '');
            
            // DEEP DEBUG (Only for first one)
            if (processed.length === 0) {
                console.log('--- DEBUG JOB STRUCTURE ---');
                console.log('Job Keys:', Object.keys(jobData));
                if (jobData.quotes) console.log('Job has quotes array:', jobData.quotes.length);
            }
        }

        if (inv.lead_id) {
            const leadData = await client.getLeadDetails(inv.lead_id);
            leadNumber = leadData.number || '';
            if (!quoteNumber) {
                quoteNumber = leadData.quote_number || (leadData.quote ? leadData.quote.number : '');
            }
        }

        if (!quoteNumber) quoteNumber = inv.reference || '';

    } catch (e) {
        console.warn(`Error resolving details for invoice ${inv.number}`);
    }

    const total = Number(inv.total) || 0;

    processed.push({
      'Number': inv.number || '',
      'Reference': inv.reference || '',
      'Contact Name': inv.contact_name || '',
      'Quote': quoteNumber, 
      'Status': inv.invoice_status_name || '',
      'Type': inv.invoice_type_name || '',
      'Date': formatDate(inv.date),
      'Due Date': formatDate(inv.due_date),
      'Subtotal': inv.subtotal || 0,
      'Tax': inv.tax || 0,
      'Total': total,
      'Amount Paid': amountPaid,
      'Amount Due': Math.max(0, total - amountPaid),
      'Lead': leadNumber,
      'Job': jobNumber,
      'Project': inv.project_id || '',
      'Created': formatDate(inv.created_at),
      'Updated': formatDate(inv.updated_at),
    });
  }

  return processed;
}
