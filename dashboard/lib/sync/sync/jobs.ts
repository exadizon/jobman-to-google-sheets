import { JobManClient } from '../api/jobman';

export async function syncJobs(client: JobManClient, limit: number | null = null) {
  console.log('--- Syncing Jobs ---');
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  // Helper: find task date by keyword match on task name (case-insensitive, ignores emojis)
  const getTaskDate = (tasks: any[], keyword: string) => {
    const task = tasks.find((t: any) => {
      if (!t.name) return false;
      const cleanName = t.name.replace(/[\p{Emoji_Presentation}\p{Emoji}\u200d\ufe0f]/gu, '').trim();
      return cleanName.toLowerCase().includes(keyword.toLowerCase());
    });
    return task?.target_date ? formatDate(task.target_date) : '';
  };

  // Helper: find LAST task matching keyword (for B2B vs B2C distinction)
  const getLastTaskDate = (tasks: any[], keyword: string) => {
    const matches = tasks.filter((t: any) => {
      if (!t.name) return false;
      const cleanName = t.name.replace(/[\p{Emoji_Presentation}\p{Emoji}\u200d\ufe0f]/gu, '').trim();
      return cleanName.toLowerCase().includes(keyword.toLowerCase());
    });
    const task = matches.length > 0 ? matches[matches.length - 1] : null;
    return task?.target_date ? formatDate(task.target_date) : '';
  };

  let allJobs: any[] = [];
  let currentPage = 1;
  let hasMore = true;

  while (hasMore) {
    console.log(`Fetching page ${currentPage}...`);
    const response: any = await client.getJobs(currentPage, limit ? Math.min(limit, 50) : 50);

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

    allJobs = allJobs.concat(jobs);

    if (limit && allJobs.length >= limit) {
        allJobs = allJobs.slice(0, limit);
        hasMore = false;
        break;
    }

    const meta = response.jobs?.meta || response.meta;
    if (meta && currentPage < meta.last_page) {
        currentPage++;
    } else {
        hasMore = false;
    }
  }

  console.log(`Found ${allJobs.length} jobs to process`);

  const processed = [];

  for (const job of allJobs) {
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

    // Resolve Members via Job Members endpoint (uses job_member_type_id for accurate role)
    let members: any[] = [];
    try {
        members = await client.getJobMembers(job.id);
    } catch (e) {
        console.error(`Failed to fetch members for job ${job.id}`, e);
    }

    // Sort members alphabetically
    members.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));

    const memberNames = members.map((m: any) => m.name).filter(Boolean).join(', ');

    // Role Mapping Helper — uses job_member_type_id resolved to role name
    const getMembersByRole = (roleName: string) => {
        return members
            .filter((m: any) => m.role === roleName)
            .map((m: any) => m.name)
            .join(', ');
    };

    // Fetch tasks for this job (with pagination)
    let jobTasks: any[] = [];
    try {
        jobTasks = await client.getJobTasks(job.id);
    } catch (e) {
        console.error(`Failed to fetch tasks for job ${job.id}`, e);
    }

    // Task-date columns use only this job's own tasks (not parent's)
    const taskDateSource = jobTasks;

    // Resolve Lead via job items
    let leadDisplay = '';
    try {
        let items = await client.getJobItems(job.id);
        // If no items with lead_id on this job, check parent job
        if ((!items.length || !items.find((i: any) => i.lead_id)) && job.parent_job_id) {
            items = await client.getJobItems(job.parent_job_id);
        }
        const itemWithLead = items.find((i: any) => i.lead_id);
        if (itemWithLead) {
            const lead = await client.getLeadDetails(itemWithLead.lead_id);
            if (lead) {
                leadDisplay = `${lead.number} - ${lead.description || ''}`.trim();
            }
        }
    } catch (e) {
        // Lead resolution is best-effort
    }

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
      'Lead': leadDisplay,
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
      'Accounts': getMembersByRole('Accounts'),
      'Admin Support': getMembersByRole('Admin Support'),
      'AKL Factory Staff': getMembersByRole('AKL Factory Staff'),
      'Assembly technicians': getMembersByRole('Assembly technicians'),
      'CNC Operator': getMembersByRole('CNC Operator'),
      'Designer': getMembersByRole('Designer'),
      'Design Manager': getMembersByRole('Design Manager'),
      'Edge Bander': getMembersByRole('Edge Bander'),
      'Installer': getMembersByRole('Installer'),
      'Production Manager': getMembersByRole('Production Manager'),
      'Project Manager': getMembersByRole('Project Manager'),
      'Salesperson': getMembersByRole('Salesperson'),
      'Store Manager': getMembersByRole('Store Manager'),
      '{B2B Deposit Invoice sent}': getTaskDate(taskDateSource, 'B2B Deposit Invoice'),
      '{Create and send final Invoice (B2C)}': getTaskDate(taskDateSource, 'Create and Send Final Invoice'),
      '{Primary Installation}': getTaskDate(taskDateSource, 'Primary Installation'),
      '{Worktop Install}': getTaskDate(taskDateSource, 'Worktop Install'),
      '{Final Fit Off}': getTaskDate(taskDateSource, 'Final Fit Off'),
      '{Create and Send Final Invoice (B2B)}': getLastTaskDate(taskDateSource, 'Create and Send Final Invoice'),
      'Created': formatDate(job.created_at),
      'Updated': formatDate(job.updated_at),
    });
  }
  return processed;
}
