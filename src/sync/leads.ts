import { JobManClient } from '../api/jobman.js';

export async function syncLeads(client: JobManClient) {
  console.log('--- Syncing Leads ---');
  const response = await client.getLeads(1, 100);
  const leads = response.data || [];
  const processed = [];

  for (const lead of leads) {
    processed.push({
      'Number': lead.number,
      'Priority': lead.priority,
      'Contact': lead.contact?.name || '',
      'Description': lead.description,
      'Lead Type': lead.lead_type?.name || '',
      'Status': lead.status?.name || '',
      'Value': lead.value,
      'Person': lead.person?.name || '',
      'Site Address': lead.site_address?.formatted_address || '',
      'Created': lead.created_at,
      'Updated': lead.updated_at,
    });
  }
  return processed;
}
