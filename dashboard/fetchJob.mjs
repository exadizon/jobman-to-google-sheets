import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const org = process.env.JOBMAN_ORG_ID;
  const client = axios.create({ baseURL: 'https://api.jobmanapp.com/api/v1', headers: { Authorization: `Bearer ${process.env.JOBMAN_API_KEY}` } });
  const id = 'da34a8eb-af18-4f1c-a961-3388790b8cd6'; // parent_job_id from job 0271.2 ( Job 0271 )

  const job = await client.get(`/organisations/${org}/jobs/${id}`).catch(e=>null);
  console.log('JOB 0271 DETAILS:', JSON.stringify(job?.data?.job || job?.data || {}, null, 2));

  // Get job members of 0271
  const membersRes = await client.get(`/organisations/${org}/jobs/${id}/members`).catch(e => ({data:[]}));
  const membersData = membersRes.data.data || membersRes.data.job_members?.data || membersRes.data.job_members || membersRes.data || [];
  console.log('--- JOB 0271 MEMBERS FROM API ---');
  for (const m of membersData) {
      const staffId = m.staff_id || m.id;
      if (!staffId) continue;
      const staffRes = await client.get(`/organisations/${org}/staff/${staffId}`).catch(e => ({data:{}}));
      const staff = staffRes.data.staff || staffRes.data;
      console.log(`Member: ${staff.first_name} ${staff.last_name} | Role: ${staff.job_title} | ID: ${staff.id}`);
  }
}
run().catch(console.error);
