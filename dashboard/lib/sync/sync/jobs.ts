import { JobManClient } from '../api/jobman';

export async function syncJobs(client: JobManClient) {
  console.log('--- Syncing Jobs ---');
  const response = await client.getJobs(1, 100);
  const jobs = response.data || [];
  const processed = [];

  for (const job of jobs) {
    processed.push({
      'Number': job.number,
      'Contact': job.contact?.name || '',
      'Description': job.description,
      'Status': job.status?.name || '',
      'Job Type': job.job_type?.name || '',
      'Value': job.value,
      'Created': job.created_at,
      'Updated': job.updated_at,
    });
  }
  return processed;
}
