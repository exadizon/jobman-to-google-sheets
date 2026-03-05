import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const org = process.env.JOBMAN_ORG_ID;
  const client = axios.create({ baseURL: 'https://api.jobmanapp.com/api/v1', headers: { Authorization: `Bearer ${process.env.JOBMAN_API_KEY}` } });
  const id = 'da34a8eb-af18-4f1c-a961-3388790b8cd6'; // parent_job_id from job 0271.2

  console.log('Testing ID:', id);

  const lead = await client.get(`/organisations/${org}/leads/${id}`).catch(e=>null);
  console.log('Lead?', lead ? 'YES' : 'NO');
  if (lead) console.log(lead.data.lead?.number || lead.data?.number);
  
  const quote = await client.get(`/organisations/${org}/quotes/${id}`).catch(e=>null);
  console.log('Quote?', quote ? 'YES' : 'NO');
  if (quote) console.log(quote.data.quote?.number || quote.data?.number);

  const job = await client.get(`/organisations/${org}/jobs/${id}`).catch(e=>null);
  console.log('Job?', job ? 'YES' : 'NO');
  if (job) console.log(job.data.job?.number || job.data?.number);
}
run();
