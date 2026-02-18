import { JobManClient } from '../api/jobman';
import { formatDate } from './quotes';

export async function syncLeads(client: JobManClient, limit: number | null = null) {
  console.log('--- Starting Leads Sync ---');
  await client.initializeLookups();
  
  const response: any = await client.getLeads(1, limit || 50); 
  const leads = response.leads?.data || [];
  
  const processedLeads = [];

  for (const lead of leads) {
    console.log(`Processing Lead: ${lead.number}`);
    
    // Resolve Contact Info (Name, Type, Source)
    const contact = lead.contact_id ? await client.getContactWithDetails(lead.contact_id) : null;

    // Resolve Person Info
    let person = { name: '', email: '', phone: '', mobile: '' };
    if (lead.contact_id && lead.contact_person_id) {
        person = await client.getContactPerson(lead.contact_id, lead.contact_person_id);
    }

    // Resolve Members
    const members = await client.getLeadMembers(lead.id);
    const memberNames = members.map((m: any) => `${m.first_name} ${m.last_name}`.trim()).join(', ');
    
    // Helper to find member by role (simple heuristic or if role is available in member object use that)
    // Assuming member object has 'role' or similar, but for now we just list them all or filter if we knew role IDs.
    // Since we don't know exact role IDs/Names mapping from member object without seeing it, 
    // we will map specific roles if the member list effectively contains them, otherwise leave blank or use a heuristic.
    // For now, based on the prompt, it seems the user wants to split them if possible. 
    // Without specific role data in member response (which we haven't seen fully), we will just use the full list for 'Members' column
    // and attempt to map if we can identify them. 
    // *Correction*: The prompt shows columns '01_Sales Person', '02_Designer', etc. 
    // If we can't distinguish, we'll leave specific columns blank or put all in Members.
    // Let's assume for now we just populate 'Members' column fully. 
    // If the user wants specific columns populated, we'd need to know how to identify a 'Designer' vs 'Sales Person' from the member object.
    // I will populate the 'Members' column as requested.

    // Calculate Progress based on status (heuristic)
    // If status is 'Sales', progress might be different than 'Job Awarded'. 
    // For now, we'll map Status to Progress if it makes sense, or leave blank if no direct mapping.
    // The sheet shows '0' for progress in examples. I will default to '0' or empty.

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
      'Person': person.name,
      'Person Email': person.email,
      'Person Phone': person.phone,
      'Person Mobile': person.mobile,
      'Project': lead.description || '', // Mapping Description to Project as fallback
      'Progress': '0', // Defaulting to 0 as seen in examples
      'Site Address': lead.address || '',
      'Site Address Line 1': lead.address_line1 || '',
      'Site Address Line 2': lead.address_line2 || '',
      'Site Address Suburb': lead.address_city || '',
      'Site Address State': lead.address_region || '',
      'Site Address Postcode': lead.address_postal_code || '',
      'Site Address Country': lead.address_country_id || '',
      'Members': memberNames,
      'Notes': lead.notes || '',
      '* What is the approval probabilty (%)?': lead.detail_13 || '',
      '* What budget range are you aiming for Cabinetry and Tops?': lead.detail_06 || '',
      '* Category': lead.detail_15 || '',
      'What\'s driving the new Kitchen?': lead.detail_01 || '',
      'Any must-haves or non-negotiables?': lead.detail_14 || '',
      'If we come back with a design and price that fits this, are you happy to move forward?': '',
      'Comments on approval probability estimate': '',
      '01_Sales Person': '', // Needs role logic to populate specific columns
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
