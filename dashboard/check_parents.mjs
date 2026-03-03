import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

async function run() {
  let allQuotes = [];
  let currentPage = 1;
  let hasMore = true;

  while (hasMore) {
    const res = await fetch(`https://api.jobmanapp.com/api/v1/organisations/${process.env.JOBMAN_ORG_ID}/quotes?page=${currentPage}&limit=50`, {
      headers: { Authorization: `Bearer ${process.env.JOBMAN_API_KEY}`, Accept: 'application/json' }
    });
    const data = await res.json();
    const quotes = data.quotes?.data || [];
    allQuotes = allQuotes.concat(quotes);
    const meta = data.quotes?.meta || data.meta;
    if (meta && currentPage < meta.last_page) {
      currentPage++;
    } else {
      hasMore = false;
    }
  }

  const csvContent = fs.readFileSync('../docs/quotes_manual.csv', 'utf-8');
  const csvNumbers = new Set(
     csvContent.split('\n').slice(1)
     .map(line => {
        const m = line.match(/^([^,]+),/);
        if (m) {
           let n = m[1].trim();
           if(n.startsWith('"')) n = n.slice(1, -1);
           return n;
        }
        return '';
     }).filter(Boolean)
  );

  const onlyInApi = allQuotes.filter(q => !csvNumbers.has(q.number && q.number.trim()));
  const inCsvAPI = allQuotes.filter(q => csvNumbers.has(q.number && q.number.trim()));
  
  // We want to fetch the detailed object of one quote to see if it contains lead_id or project_id.
  const sampleOmitted = onlyInApi[0];
  const url = `https://api.jobmanapp.com/api/v1/organisations/${process.env.JOBMAN_ORG_ID}/quotes/${sampleOmitted.id}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${process.env.JOBMAN_API_KEY}`, Accept: 'application/json' }});
  const detail = await res.json();
  const qDetail = detail.quote || detail;
  
  console.log('--- Sample Omitted Quote Detail Keys ---');
  console.log(Object.keys(qDetail).filter(k => k.includes('id')));
  
  if (qDetail.lead_id) console.log('Lead ID:', qDetail.lead_id);
  if (qDetail.project_id) console.log('Project ID:', qDetail.project_id);
  if (qDetail.job_id) console.log('Job ID:', qDetail.job_id);
  
}
run();
