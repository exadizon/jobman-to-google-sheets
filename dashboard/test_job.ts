import { JobManClient } from './lib/sync/api/jobman';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const client = new JobManClient();
  const orgs = await client.request({ method: 'GET', url: '/user' });
  client.orgId = orgs.user.organisations[0].id;
  
  const jobs = await client.getJobs(1, 5);
  console.log(JSON.stringify(jobs.data[0], null, 2));

  // let's also fetch tasks for this job
  const tasks = await client.request({ method: 'GET', url: `/organisations/${client.orgId}/jobs/${jobs.data[0].id}/tasks` });
  console.log(JSON.stringify(tasks.data || tasks, null, 2));
}

run().catch(console.error);
