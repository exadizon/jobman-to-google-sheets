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
  
  const response: any = await client.getQuotes(1, 5); 
  const quotes = response.quotes?.data || [];
  
  if (quotes.length > 0) {
      console.log('DEBUG: First Quote Object Keys:', Object.keys(quotes[0]));
      // Check for specific fields the user mentioned
      console.log('DEBUG: Sample Quote Financials:', {
          total_cost: quotes[0].total_cost,
          profit: quotes[0].profit,
          profit_percent: quotes[0].profit_percent,
          status: quotes[0].status?.name
      });
  }

  const processedQuotes = [];

  for (const quote of quotes) {
    console.log(`Processing Quote: ${quote.number || quote.quote_number}`);
    
    let fullQuote: any = {};
    try {
        fullQuote = await client.getQuoteDetails(quote.id);
    } catch (e) {
        console.warn(`Could not fetch details for quote ${quote.id}`);
    }

    const contactObj = quote.contact || fullQuote.contact;
    let contactName = contactObj?.name || contactObj?.display_name || 'Unknown';
    let contactType = contactObj?.contact_type?.name || '';

    // Simple aggregate for now - we'll refine material/labour later
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
      'Number': quote.number || '',
      'Description': quote.description || '',
      'Contact': contactName,
      'Contact Type': contactType,
      'Contact Source': quote.contact_source?.name || '',
      'Status': quote.quote_status_name || '', 
      'Expiry Date': formatDate(quote.expiry_date),
      'Cost': quote.cost || 0,
      'Material Cost': costs.material,
      'Labour Cost': costs.labour,
      'Service Cost': costs.service,
      'Appliance Cost': costs.appliance,
      'Overhead': quote.overhead,
      'Wastage': quote.wastage,
      'Discount': quote.discount_amount || 0,
      'Discount %': quote.discount_percent ? `${quote.discount_percent}%` : '0%',
      'Subtotal': quote.subtotal || 0,
      'Tax': quote.tax || 0,
      'Total': quote.total || 0,
      'Net Profit': quote.profit || 0, // profit -> Net Profit
      'Net Profit %': quote.profit_percent ? `${quote.profit_percent}%` : '0%', // profit_percent -> Net Profit %
      'Created': formatDate(quote.created_at),
      'Updated': formatDate(quote.updated_at),
      'Jobman job no. / other comments': quote.job_number || '',
      'quotes': 'TRUE'
    });
  }

  return processedQuotes;
}
