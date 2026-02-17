import { JobManClient } from '../api/jobman.js';

export async function syncQuotes(client: JobManClient) {
  console.log('--- Syncing Quotes ---');
  
  // 1. Fetch quotes - limiting to 5 for quick testing
  const response: any = await client.getQuotes(1, 5); 
  
  // The structure is response.quotes.data
  const quotes = response.quotes?.data || [];
  console.log(`DEBUG: Found ${quotes.length} quotes (Limited to 5 for test).`);

  const processedQuotes = [];

  for (const quote of quotes) {
    console.log(`Processing Quote: ${quote.number || quote.quote_number}`);
    
    // Fetch full details to get sections and deeper cost info
    let fullQuote: any = {};
    try {
        fullQuote = await client.getQuoteDetails(quote.id);
    } catch (e) {
        console.warn(`Could not fetch details for quote ${quote.id}`);
    }

    // Handle Contact - check both top level and inside fullQuote
    const contactObj = quote.contact || fullQuote.contact;
    let contactName = contactObj?.name || contactObj?.display_name || 'Unknown';
    let contactType = contactObj?.contact_type?.name || '';

    // Aggregate costs from sections -> items -> costs
    const costs = {
        material: 0,
        labour: 0,
        service: 0,
        appliance: 0,
        overhead: 0,
        wastage: 0
    };

    const sections = fullQuote.sections || [];
    for (const section of sections) {
        const items = section.items || [];
        for (const item of items) {
            const itemCosts = item.costs || [];
            for (const cost of itemCosts) {
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

    // Mapping to your EXACT Google Sheet headers
    processedQuotes.push({
      'Number': quote.number || quote.quote_number || '',
      'Description': quote.description || '',
      'Contact': contactName,
      'Contact Type': contactType,
      'Contact Source': quote.contact_source?.name || '',
      'Status': quote.status?.name || '',
      'Date': quote.date || '',
      'Expiry Date': quote.expiry_date || '',
      'Cost': quote.total_cost || 0,
      'Material Cost': costs.material,
      'Labour Cost': costs.labour,
      'Service Cost': costs.service,
      'Appliance Cost': costs.appliance,
      'Overhead': costs.overhead,
      'Wastage': costs.wastage,
      'Discount': quote.discount_amount || 0,
      'Discount %': quote.discount_percentage ? `${quote.discount_percentage}%` : '0%',
      'Subtotal': quote.subtotal || 0,
      'Tax': quote.tax_total || 0,
      'Total': quote.total || quote.total_amount || 0,
      'Net Profit': quote.net_profit || 0,
      'Net Profit %': quote.net_profit_percentage ? `${quote.net_profit_percentage}%` : '0%',
      'Created': quote.created_at || '',
      'Updated': quote.updated_at || '',
      'Jobman job no. / other comments': quote.job_number || '',
      'quotes': 'TRUE'
    });
  }

  return processedQuotes;
}
