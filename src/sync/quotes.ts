import { JobManClient } from '../api/jobman.js';

export function formatDate(dateString: string) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

export async function syncQuotes(client: JobManClient) {
  console.log('--- Syncing Quotes ---');
  
  // Warm up the caches first
  await client.initializeLookups();
  
  const response: any = await client.getQuotes(1, 5); 
  const quotes = response.quotes?.data || [];
  const processedQuotes = [];

  for (const quote of quotes) {
    console.log(`Processing Quote: ${quote.number || quote.quote_number}`);
    
    // 1. Fetch Contact Details using the new cache/lookup system
    let contactName = 'Unknown';
    let contactType = '';
    let contactSource = '';
    
    if (quote.contact_id) {
        try {
            const contact = await client.getContactWithDetails(quote.contact_id);
            contactName = contact.name;
            contactType = contact.type;
            contactSource = contact.source;
        } catch (e) {
            console.warn(`Could not resolve contact ${quote.contact_id}`);
        }
    }

    // 2. Fetch costs from details
    let fullQuote: any = {};
    try {
        fullQuote = await client.getQuoteDetails(quote.id);
    } catch (e) {
        // ...
    }

    const costs = { material: 0, labour: 0, service: 0, appliance: 0, overhead: 0, wastage: 0 };
    const sections = fullQuote.sections || [];
    for (const section of sections) {
        for (const item of (section.items || [])) {
            for (const cost of (item.costs || [])) {
                const amount = Number(cost.amount) || 0;
                const type = (cost.type_name || cost.type || '').toLowerCase();
                if (type.includes('material')) costs.material += amount;
                else if (type.includes('labour')) costs.labour += amount;
                else if (type.includes('service')) costs.service += amount;
                else if (type.includes('appliance')) costs.appliance += amount;
                else if (type.includes('overhead')) costs.overhead += amount;
                else if (type.includes('wastage')) costs.wastage += amount;
            }
        }
    }

    processedQuotes.push({
      'Number': quote.number || quote.quote_number || '',
      'Description': quote.description || '',
      'Contact': contactName,
      'Contact Type': contactType,
      'Contact Source': contactSource,
      'Status': quote.status?.name || '',
      'Date': formatDate(quote.date),
      'Expiry Date': formatDate(quote.expiry_date),
      'Cost': quote.total_cost || 0,
      'Material Cost': costs.material,
      'Labour Cost': costs.labour,
      'Service Cost': costs.service,
      'Appliance Cost': costs.appliance,
      'Overhead': costs.overhead,
      'Wastage': costs.wastage,
      'Discount': quote.discount_amount || 0,
      'Discount %': quote.discount_percent ? `${quote.discount_percent}%` : '0%',
      'Subtotal': quote.subtotal || 0,
      'Tax': quote.tax_total || 0,
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
