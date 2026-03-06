import { JobManClient } from '../api/jobman';

export function formatDate(dateString: string) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export async function syncQuotes(client: JobManClient, limit: number | null = null) {
  console.log('--- Starting Quotes Sync ---');
  await client.initializeLookups();

  let allQuotes: any[] = [];
  let currentPage = 1;
  let hasMore = true;

  // 1. Fetch pages
  while (hasMore) {
    console.log(`Fetching page ${currentPage}...`);
    const response: any = await client.getQuotes(currentPage, limit ? Math.min(limit, 50) : 50);
    const quotes = response.quotes?.data || [];
    allQuotes = allQuotes.concat(quotes);

    if (limit && allQuotes.length >= limit) {
        allQuotes = allQuotes.slice(0, limit);
        hasMore = false;
        break;
    }

    const meta = response.quotes?.meta || response.meta;
    if (meta && currentPage < meta.last_page) {
        currentPage++;
    } else {
        hasMore = false;
    }
  }

  console.log(`📊 Found ${allQuotes.length} total quotes. Processing contacts...`);

  // Build a lead number -> lead ID map for salesperson lookup
  // Quote numbers follow pattern "LEAD_NUMBER/REVISION" (e.g. "2603-001/02" -> lead "2603-001")
  const leadNumberToId = new Map<string, string>();
  try {
    let leadPage = 1;
    let hasMoreLeads = true;
    while (hasMoreLeads) {
      const leadResp: any = await client.getLeads(leadPage, 50);
      const leads = leadResp.leads?.data || [];
      for (const l of leads) {
        if (l.number && l.id) leadNumberToId.set(l.number, l.id);
      }
      const leadMeta = leadResp.leads?.meta || leadResp.meta;
      if (leadMeta && leadPage < leadMeta.last_page) {
        leadPage++;
      } else {
        hasMoreLeads = false;
      }
    }
    console.log(`Loaded ${leadNumberToId.size} leads for salesperson lookup`);
  } catch (e) {
    console.log('Failed to load leads for salesperson lookup');
  }

  const processedQuotes = [];

  for (const quote of allQuotes) {
    const contact = quote.contact_id ? await client.getContactWithDetails(quote.contact_id) : null;

    // Resolve salesperson via the quote's parent lead (number prefix before "/")
    let salesperson = '';
    const quoteNumber = quote.number || '';
    const leadNumber = quoteNumber.split('/')[0];
    const leadId = leadNumberToId.get(leadNumber);
    if (leadId) {
      try {
        salesperson = await client.getLeadSalesperson(leadId);
      } catch (e) {
        // Best-effort
      }
    }

    processedQuotes.push({
      'Number': quote.number || quote.quote_number || '',
      'Description': quote.description || '',
      'Contact': contact?.name || 'Unknown',
      'Contact Type': contact?.type || '',
      'Contact Source': contact?.source || '',
      'Status': quote.quote_status_name || '',
      'Date': formatDate(quote.date),
      'Expiry Date': formatDate(quote.expiry_date),
      'Cost': quote.cost || 0,
      'Material Cost': 0,
      'Labour Cost': 0,
      'Service Cost': 0,
      'Appliance Cost': 0,
      'Overhead': quote.overhead || 0,
      'Wastage': quote.wastage || 0,
      'Discount': quote.discount || 0,
      'Discount %': quote.discount_percent ? `${quote.discount_percent}%` : '0%',
      'Subtotal': quote.subtotal || 0,
      'Tax': quote.tax || 0,
      'Total': quote.total || 0,
      'Net Profit': quote.profit || 0,
      'Net Profit %': quote.profit_percent ? `${quote.profit_percent}%` : '0%',
      'Created': formatDate(quote.created_at),
      'Updated': formatDate(quote.updated_at),
      'Jobman job no. / other comments': quote.job_number || '',
      'Salesperson': salesperson,
      'quotes': 'TRUE'
    });
  }

  return processedQuotes;
}
