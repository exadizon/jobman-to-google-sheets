import { JobManClient } from '../api/jobman.js';
import { formatDate } from './quotes.js';

export async function syncInvoices(client: JobManClient) {
  console.log('--- Starting Invoices Sync (Linked Resource Lookup) ---');
  
  const response: any = await client.getInvoices(1, 5); 
  const invoices = response.invoices?.data || [];
  
  const processed = [];

  for (const inv of invoices) {
    console.log(`Processing Invoice: ${inv.number}`);

    let details: any = {};
    let quoteNumber = '';
    let amountPaid = 0;

    try {
        // 1. Fetch Invoice Details
        const detailsResponse = await client.getInvoiceDetails(inv.id);
        details = detailsResponse.invoice || detailsResponse.data || detailsResponse;

        // 2. Fetch Payments to calculate Amount Paid
        const payments = await client.getInvoicePayments(inv.id);
        amountPaid = payments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);

        // 3. Resolve "Quote" Column from Lead or Job
        if (inv.job_id) {
            const job = await client.getJobDetails(inv.job_id);
            const jobData = job.data || job.job || job;
            // Often the Quote Number is stored on the Job as 'quote_number' or it IS the job number
            quoteNumber = jobData.quote_number || jobData.number || '';
        } else if (inv.lead_id) {
            const lead = await client.getLeadDetails(inv.lead_id);
            const leadData = lead.data || lead.lead || lead;
            quoteNumber = leadData.quote_number || leadData.number || '';
        }

        // Fallback to reference if still empty
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
      'Lead': inv.lead_id || '',
      'Job': inv.job_id || '',
      'Project': inv.project_id || '',
      'Created': formatDate(inv.created_at),
      'Updated': formatDate(inv.updated_at),
    });
  }

  return processed;
}
