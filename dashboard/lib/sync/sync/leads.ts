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

    // Resolve Members and Roles via Tasks (similar to Jobs)
    let members: any[] = [];
    
    try {
        // Try to fetch tasks for the lead. Endpoint might be /leads/{id}/tasks or similar. 
        // Assuming standard pattern:
        let tasksData = [];
        try {
             const tasksResponse: any = await client.request({ method: 'GET', url: `/organisations/${client.orgId}/leads/${lead.id}/tasks` });
             tasksData = tasksResponse.tasks?.data || tasksResponse.data || tasksResponse.tasks || [];
        } catch(e) { 
             console.log(`No tasks found for lead ${lead.number}, falling back to direct members.`);
        }

        if (Array.isArray(tasksData) && tasksData.length > 0) {
            const allMembers = tasksData.flatMap((t: any) => t.members || []);
            const seenMembers = new Set();
            for (const m of allMembers) {
                const memberId = m.staff_id || m.id;
                if (memberId && !seenMembers.has(memberId)) {
                    seenMembers.add(memberId);
                    const fullStaff = await client.getStaffMember(memberId);
                    members.push({ ...m, ...fullStaff }); 
                }
            }
        } else {
            // Fallback to direct members if no tasks or tasks endpoint fails
             const directMembers = await client.getLeadMembers(lead.id);
             for (const m of directMembers) {
                 const memberId = m.staff_id || m.id;
                 if (memberId) {
                     const fullStaff = await client.getStaffMember(memberId);
                     members.push({ ...m, ...fullStaff });
                 }
             }
        }
    } catch (e) {
        console.error(`Failed to fetch members for lead ${lead.id}`, e);
    }

    const memberNames = members.map((m: any) => m.name).join(', ');
    
    // Role Mapping Helper
    const getMemberByRole = (roleKeyword: string) => {
        return members
            .filter((m: any) => m.role && m.role.toLowerCase().includes(roleKeyword.toLowerCase()))
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
      '01_Sales Person': getMemberByRole('Sales'),
      '02_Designer': getMemberByRole('Design'),
      '03_Accounts Person': getMemberByRole('Account'),
      '04_ Design Manager': getMemberByRole('Design Manager'),
      'Created': formatDate(lead.created_at),
      'Updated': formatDate(lead.updated_at),
      'leads': 'TRUE'
    });
  }

  return processedLeads;
}
