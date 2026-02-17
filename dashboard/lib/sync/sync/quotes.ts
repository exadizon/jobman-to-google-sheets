import { JobManClient } from '../api/jobman';

export function formatDate(dateString: string) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
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

  const processedQuotes = [];

  for (const quote of allQuotes) {
    // We only fetch the contact details (cached automatically)
    // No more deep dive into components to keep it fast and stable
    const contact = quote.contact_id ? await client.getContactWithDetails(quote.contact_id) : null;

    processedQuotes.push({
      'Number': quote.number || quote.quote_number || '',
      'Description': quote.description || '',
      'Contact': contact?.name || 'Unknown',
      'Contact Type': contact?.type || '',
      'Contact Source': contact?.source || '',
      'Status': quote.quote_status_name || '',
      'Date': formatDate(quote.date),
      'Expiry Date': formatDate(quote.expiry_date),
      'Cost': quote.total_cost || 0,
      'Material Cost': 0, // Set to 0 since we removed the deep dive
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
      'quotes': 'TRUE'
    });
  }

  return processedQuotes;
}
