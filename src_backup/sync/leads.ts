import { JobManClient } from '../api/jobman.js';
import { formatDate } from './quotes.js';

export async function syncLeads(client: JobManClient) {
  console.log('--- Starting Leads Sync (Test Limit: 5) ---');
  await client.initializeLookups();
  
  // Fetching first 5 for testing as requested
  const response: any = await client.getLeads(1, 5); 
  const leads = response.leads?.data || [];
  
  const processedLeads = [];

  for (const lead of leads) {
    console.log(`Processing Lead: ${lead.number}`);
    
    // Resolve Contact Info (Name, Type, Source)
    const contact = lead.contact_id ? await client.getContactWithDetails(lead.contact_id) : null;

    // Map Lead Types array to string
    const leadTypes = (lead.types || []).map((t: any) => t.name).join(', ');

    processedLeads.push({
      'Number': lead.number || '',
      'Priority': lead.priority || '',
      'Contact': contact?.name || 'Unknown',
      'Description': lead.description || '',
      'Lead Type': leadTypes,
      'Status': lead.lead_status_name || '',
      'Value': lead.value || 0,
      'Contact Source': contact?.source || '',
      'Person': '', // Person details usually require another person_id lookup if needed
      'Person Email': '',
      'Person Phone': '',
      'Person Mobile': '',
      'Project': '',
      'Progress': '',
      'Site Address': lead.address || '',
      'Site Address Line 1': lead.address_line1 || '',
      'Site Address Line 2': lead.address_line2 || '',
      'Site Address Suburb': lead.address_city || '',
      'Site Address State': lead.address_region || '',
      'Site Address Postcode': lead.address_postal_code || '',
      'Site Address Country': lead.address_country_id || '',
      'Members': '', // Usually requires 'members' include or lookup
      'Notes': lead.notes || '',
      '* What is the approval probabilty (%)?': lead.detail_13 || '',
      '* What budget range are you aiming for Cabinetry and Tops?': lead.detail_06 || '',
      '* Category': lead.detail_15 || '',
      'What\'s driving the new Kitchen?': lead.detail_01 || '',
      'Any must-haves or non-negotiables?': lead.detail_14 || '',
      'If we come back with a design and price that fits this, are you happy to move forward?': '',
      'Comments on approval probability estimate': '',
      '01_Sales Person': '',
      '02_Designer': '',
      '03_Accounts Person': '',
      '04_ Design Manager': '',
      'Created': formatDate(lead.created_at),
      'Updated': formatDate(lead.updated_at),
      'leads': 'TRUE'
    });
  }

  return processedLeads;
}
