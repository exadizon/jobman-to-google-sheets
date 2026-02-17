import { JobManClient } from '../api/jobman.js';

export async function syncQuotes(client: JobManClient) {
  console.log('--- Syncing Quotes ---');
  const quotesResponse = await client.getQuotes(1, 100); 
  const quotes = quotesResponse.data || [];

  const processedQuotes = [];

  for (const quote of quotes) {
    console.log(`Processing Quote: ${quote.number}`);
    
    // Get Contact details for the sheet
    let contactName = 'Unknown';
    let contactType = '';
    if (quote.contact_id) {
        try {
            const contact = await client.getContact(quote.contact_id);
            contactName = contact.name || contact.display_name || 'Unknown';
            contactType = contact.contact_type?.name || '';
        } catch (e) {
            console.warn(`Could not fetch contact ${quote.contact_id}`);
        }
    }

    // Attempt to break down costs by fetching sections
    // Note: JobMan API structures vary, we'll sum up items if available
    let materialCost = 0;
    let labourCost = 0;
    let serviceCost = 0;

    try {
        const sections = await client.getQuoteSections(quote.id);
        for (const section of (sections.data || [])) {
            // This is where we solve the "missing fields" issue by aggregating
            if (section.items) {
                for (const item of section.items) {
                    materialCost += Number(item.material_cost) || 0;
                    labourCost += Number(item.labour_cost) || 0;
                    serviceCost += Number(item.service_cost) || 0;
                }
            }
        }
    } catch (e) {
        console.warn(`Could not fetch sections for quote ${quote.number}`);
    }

    processedQuotes.push({
      'Number': quote.number,
      'Description': quote.description,
      'Contact': contactName,
      'Contact Type': contactType,
      'Status': quote.status?.name || '',
      'Date': quote.date,
      'Expiry Date': quote.expiry_date,
      'Cost': quote.total_cost,
      'Material Cost': materialCost,
      'Labour Cost': labourCost,
      'Service Cost': serviceCost,
      'Total': quote.total_amount,
      'Net Profit': quote.net_profit,
      'Created': quote.created_at,
      'Updated': quote.updated_at,
      'Jobman job no. / other comments': quote.job_number || '',
    });
  }

  return processedQuotes;
}
