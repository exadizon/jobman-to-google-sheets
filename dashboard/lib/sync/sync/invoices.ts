import { JobManClient } from '../api/jobman';
import { formatDate } from './quotes';

export async function syncInvoices(client: JobManClient, limit: number | null = null) {
  console.log('--- Starting Invoices Sync ---');
  
  let allInvoices: any[] = [];
  let currentPage = 1;
  let hasMore = true;

  while (hasMore) {
    console.log(`Fetching page ${currentPage}...`);
    const response: any = await client.getInvoices(currentPage, limit ? Math.min(limit, 50) : 50);
    const invoices = response.invoices?.data || [];
    allInvoices = allInvoices.concat(invoices);

    if (limit && allInvoices.length >= limit) {
        allInvoices = allInvoices.slice(0, limit);
        hasMore = false;
        break;
    }

    const meta = response.invoices?.meta || response.meta;
    if (meta && currentPage < meta.last_page) {
        currentPage++;
    } else {
        hasMore = false;
    }
  }

  console.log(`📊 Found ${allInvoices.length} total invoices. Processing details...`);

  const processed = [];

  for (const inv of allInvoices) {
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
        }

        if (inv.lead_id) {
            const leadData = await client.getLeadDetails(inv.lead_id);
            leadNumber = leadData.number || '';
        }

    } catch (e) {
        console.warn(`Error resolving details for invoice ${inv.number}`);
    }

    const total = Number(inv.total) || 0;

    processed.push({
      'Number': inv.number || '',
      'Reference': inv.reference || '',
      'Contact Name': inv.contact_name || '',
      'Quote': '', // Requested to be empty 
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
