import { JobManClient } from '../api/jobman';

export async function syncJobs(client: JobManClient, limit: number | null = null) {
  console.log('--- Syncing Jobs ---');
  // Helper to format date
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-AE'); 
  };

  const response: any = await client.getJobs(1, limit || 50);

  // Robustly extract jobs data
  let jobs = [];
  if (Array.isArray(response)) {
      jobs = response;
  } else if (response.jobs && Array.isArray(response.jobs.data)) {
      jobs = response.jobs.data;
  } else if (response.data && Array.isArray(response.data)) {
      jobs = response.data;
  } else if (response.jobs && Array.isArray(response.jobs)) {
      jobs = response.jobs; 
  }
  
  console.log(`Found ${jobs.length} jobs to process`);

  const processed = [];

  for (const job of jobs) {
    console.log(`Processing Job: ${job.number}`);
    
    // Resolve Contact Info
    let contact = null;
    if (job.contact_id) {
        try {
             contact = await client.getContactWithDetails(job.contact_id);
        } catch (e) {
            console.error(`Failed to fetch contact ${job.contact_id}`, e);
        }
    }

    // Resolve Person Info
    let person = { name: '', email: '', phone: '', mobile: '' };
    if (job.contact_id && job.contact_person_id) {
        try {
            person = await client.getContactPerson(job.contact_id, job.contact_person_id);
        } catch (e) {
            console.error(`Failed to fetch person ${job.contact_person_id}`, e);
        }
    }

    // Resolve Members, Progress, and Install Date via Tasks
    let members: any[] = [];
    let installDate = '';
    let totalProgress = 0;
    let taskCount = 0;

    try {
        const tasksResponse: any = await client.request({ method: 'GET', url: `/organisations/${client.orgId}/jobs/${job.id}/tasks` });
        const tasksData = tasksResponse.tasks?.data || tasksResponse.data || tasksResponse.tasks || [];
        
        if (Array.isArray(tasksData)) {
            // 1. Extract Members and Fetch Details
            const allMembers = tasksData.flatMap((t: any) => t.members || []);
            const seenMembers = new Set();
            
            for (const m of allMembers) {
                const memberId = m.staff_id || m.id; // Task member might have 'staff_id' or just 'id'
                if (memberId && !seenMembers.has(memberId)) {
                    seenMembers.add(memberId);
                    // Fetch full details to get the Role
                    const fullStaff = await client.getStaffMember(memberId);
                    // Merge task member name with full staff details (prefer full staff role)
                    members.push({ ...m, ...fullStaff }); 
                }
            }

            // 2. Find Install Date
            const installTask = tasksData.find((t: any) => t.name && (
                t.name.toLowerCase().includes('install') || 
                t.name.toLowerCase().includes('delivery') // Fallback check
            ));
            
            if (installTask && installTask.target_date) {
                installDate = formatDate(installTask.target_date);
            }

            // 3. Calculate Progress (Average of all tasks)
            // Progress field requested to be empty
        }
    } catch (e) {
        console.error(`Failed to fetch tasks for job ${job.id}`, e);
    }

    const memberNames = members.map((m: any) => m.name).join(', ');

    // Role Mapping Helper
    const getMemberByRole = (roleKeyword: string) => {
        return members
            .filter((m: any) => m.role && m.role.toLowerCase().includes(roleKeyword.toLowerCase()))
            .map((m: any) => m.name)
            .join(', ');
    };

    processed.push({
      'Number': job.number || '',
      'Priority': '',
      'Contact': contact?.name || '',
      'Contact Type': contact?.type || '',
      'Contact Source': contact?.source || '',
      'Contact Email': contact?.email || '',
      'Contact Phone': contact?.phone || '',
      'Contact Mobile': contact?.mobile || '',
      'Person': person.name,
      'Person Email': person.email,
      'Person Phone': person.phone,
      'Person Mobile': person.mobile,
      'Description': job.description || '',
      'Status': job.job_status_name || job.status?.name || '',
      'Progress': '',

      'Job Type': (job.types || []).map((t: any) => t.name).join(', '),
      'Lead': '', // No direct lead_id in job object to fetch lead details easily without extra calls
      'Project': job.description || '',
      'Site Address': job.address || '',
      'Site Address Line 1': job.address_line1 || '',
      'Site Address Line 2': job.address_line2 || '',
      'Site Address Suburb': job.address_city || '',
      'Site Address State': job.address_region || '',
      'Site Address Postcode': job.address_postal_code || '',
      'Site Address Country': job.address_country_id || '',
      'Value': job.value || 0,
      'Members': memberNames,
      'Notes': job.notes || '',
      'Accounts': getMemberByRole('Account'),
      'CNC Operator': getMemberByRole('CNC'),
      'Designer': getMemberByRole('Design'),
      'Design Manager': getMemberByRole('Design Manager'),
      'Edge Bander': getMemberByRole('Edge'),
      'Installer': getMemberByRole('Install'),
      'Operations Staff': getMemberByRole('Operation'),
      'Project Manager': getMemberByRole('Project Manager'),
      'Salesperson': getMemberByRole('Sales'),
      'Store Manager': getMemberByRole('Store'),
      '{Lock in Install Date}': installDate,
      'Created': formatDate(job.created_at),
      'Updated': formatDate(job.updated_at),
      'Production Manager': '',
      'AKL Factory Staff': '',
      'jobs': 'TRUE'
    });
  }
  return processed;
}
