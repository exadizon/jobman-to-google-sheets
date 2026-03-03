import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

async function run() {
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

  let allQuotes = [];
  let currentPage = 1;
  let hasMore = true;

  while (hasMore) {
    const res = await fetch(`https://api.jobmanapp.com/api/v1/organisations/${process.env.JOBMAN_ORG_ID}/quotes?page=${currentPage}&limit=50`, {
      headers: {
        Authorization: `Bearer ${process.env.JOBMAN_API_KEY}`,
        Accept: 'application/json'
      }
    });
    
    if (!res.ok) break;
    
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

  const apiQuotes = allQuotes.map(q => ({
    number: q.number || q.quote_number || q.quote_status_name,
    raw: q
  }));

  const onlyInApi = apiQuotes.filter(q => !csvNumbers.has(q.number));
  const inCsv = apiQuotes.filter(q => csvNumbers.has(q.number));
  
  if (onlyInApi.length > 0) {
      console.log('--- RAW FIELDS for quote only in API ---');
      console.log(JSON.stringify(onlyInApi[0].raw, null, 2));
      console.log('\n--- Object properties on onlyInApi[0] ---');
      console.log(Object.keys(onlyInApi[0].raw));
      
      let allDeleted = true;
      let allArchived = true;
      onlyInApi.forEach(q => {
          if (!q.raw.deleted_at && !q.raw.deleted) allDeleted = false;
          if (!q.raw.archived && !q.raw.is_archived) allArchived = false;
      });
      console.log('Are all 75 quotes in API deleted?', allDeleted);
      console.log('Are all 75 quotes in API archived?', allArchived);
  }
}
run().catch(console.error);
