import { JobManClient } from '../api/jobman';

export async function syncQuotes(client: JobManClient) {
  console.log('Fetching Quotes...');
  const quotesResponse = await client.getQuotes(1, 100); // Adjust pagination as needed
  const quotes = quotesResponse.data || [];

  const processedQuotes = [];

  for (const quote of quotes) {
    console.log(`Processing Quote: ${quote.number}`);
    
    // 1. Get detailed Quote info
    const fullQuote = await client.getQuoteDetails(quote.id);
    
    // 2. Get Contact details for name and type
    let contactName = 'Unknown';
    let contactType = '';
    if (quote.contact_id) {
        const contact = await client.getContact(quote.contact_id);
        contactName = contact.name || contact.display_name || 'Unknown';
        contactType = contact.contact_type?.name || '';
    }

    // 3. Deep Dive into Sections/Items for Costs
    // This is where we solve the "missing fields" problem
    // The goal is to aggregate Material, Labour, Service, Appliance costs
    const sections = await client.getQuoteSections(quote.id);
    
    const costs = {
        material: 0,
        labour: 0,
        service: 0,
        appliance: 0,
        overhead: 0,
        wastage: 0
    };

    // Note: The specific field names below are placeholders based on typical JobMan structures
    // We will refine these once we see the actual API response payloads.
    for (const section of (sections.data || [])) {
        // Aggregate costs from items within sections
        // (Pseudocode logic until actual payload structure is confirmed)
        /*
        for (const item of section.items) {
            costs.material += item.material_cost || 0;
            costs.labour += item.labour_cost || 0;
            ...
        }
        */
    }

    processedQuotes.push({
      'Number': quote.number,
      'Description': quote.description,
      'Contact': contactName,
      'Contact Type': contactType,
      'Status': quote.status?.name,
      'Date': quote.date,
      'Expiry Date': quote.expiry_date,
      'Cost': quote.total_cost,
      'Material Cost': costs.material,
      'Labour Cost': costs.labour,
      'Service Cost': costs.service,
      'Appliance Cost': costs.appliance,
      'Overhead': costs.overhead,
      'Wastage': costs.wastage,
      'Discount': quote.discount_amount,
      'Discount %': quote.discount_percentage,
      'Subtotal': quote.subtotal,
      'Tax': quote.tax_total,
      'Total': quote.total_amount,
      'Net Profit': quote.net_profit,
      'Net Profit %': quote.net_profit_percentage,
      'Created': quote.created_at,
      'Updated': quote.updated_at,
      'Jobman job no. / other comments': quote.job_number || '',
    });
  }

  return processedQuotes;
}
