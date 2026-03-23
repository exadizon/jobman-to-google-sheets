import { JobManClient } from '../api/jobman';
import { formatDate } from './quotes';

export async function syncLeads(client: JobManClient, limit: number | null = null) {
  console.log('--- Starting Leads Sync ---');
  await client.initializeLookups();
  
  let allLeads: any[] = [];
  let currentPage = 1;
  let hasMore = true;

  while (hasMore) {
    console.log(`Fetching page ${currentPage}...`);
    const response: any = await client.getLeads(currentPage, limit ? Math.min(limit, 50) : 50);
    const leads = response.leads?.data || [];
    allLeads = allLeads.concat(leads);

    if (limit && allLeads.length >= limit) {
        allLeads = allLeads.slice(0, limit);
        hasMore = false;
        break;
    }

    const meta = response.leads?.meta || response.meta;
    if (meta && currentPage < meta.last_page) {
        currentPage++;
    } else {
        hasMore = false;
    }
  }

  console.log(`📊 Found ${allLeads.length} total leads. Processing members...`);
  
  const processedLeads = [];

  for (const lead of allLeads) {
    console.log(`Processing Lead: ${lead.number}`);
    
    // Resolve Contact Info (Name, Type, Source)
    const contact = lead.contact_id ? await client.getContactWithDetails(lead.contact_id) : null;

    // Resolve Person Info
    let person = { name: '', email: '', phone: '', mobile: '' };
    if (lead.contact_id && lead.contact_person_id) {
        person = await client.getContactPerson(lead.contact_id, lead.contact_person_id);
    }

    // Resolve Members and Roles via direct members endpoint (uses lead_member_type_id for accurate role)
    let members: any[] = [];
    try {
        members = await client.getLeadMembers(lead.id);
    } catch (e) {
        console.error(`Failed to fetch members for lead ${lead.id}`, e);
    }

    const memberNames = members.map((m: any) => m.name).join(', ');
    
    // Role Mapping Helper — matches exact role name from lead_member_type_id
    const getMemberByRole = (roleName: string) => {
        return members
            .filter((m: any) => m.role === roleName)
            .map((m: any) => m.name)
            .join(', ');
    };

    // Map Lead Types array to string
    const leadTypes = (lead.types || []).map((t: any) => t.name).join(', ');

    const priorityName = client.priorityCache.get(String(lead.priority)) || lead.priority || '';

    processedLeads.push({
      'Number': lead.number || '',
      'Priority': priorityName,
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
      'Project': lead.description || '', 
      'Progress': lead.progress_name || lead.progress || '0', 
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
      '01_Sales Person': getMemberByRole('01_Sales Person'),
      '02_Designer': getMemberByRole('02_Designer'),
      '03_Accounts Person': getMemberByRole('03_Accounts Person'),
      '04_ Design Manager': getMemberByRole('Design Manager'),
      'Created': formatDate(lead.created_at),
      'Updated': formatDate(lead.updated_at),
      
    });
  }

  return processedLeads;
}
