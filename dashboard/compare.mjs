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
    
    if (!res.ok) {
        console.error('API Error', res.status);
        break;
    }
    
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
    status: q.quote_status_name || q.status?.name || '',
    deleted: q.deleted_at ? true : false,
    archived: q.is_archived || q.archived || false,
    statusName: q.quote_status_name
  }));

  const onlyInApi = apiQuotes.filter(q => !csvNumbers.has(q.number));
  console.log(`CSV total (distinct numbers): ${csvNumbers.size}`);
  console.log(`API total: ${apiQuotes.length}`);
  console.log(`Count Only in API: ${onlyInApi.length}`);

  const statuses = {};
  onlyInApi.forEach(q => statuses[q.status] = (statuses[q.status] || 0) + 1);
  console.log('\n--- Statuses of Quotes Only in API ---');
  console.log(statuses);

  const apiNumbers = new Set(apiQuotes.map(q => q.number));
  const onlyInCsv = Array.from(csvNumbers).filter(n => !apiNumbers.has(n));
  console.log(`\nCount Only in CSV (not in API): ${onlyInCsv.length}`);

  console.log('\nExample only in API (first 5):');
  console.log(onlyInApi.slice(0, 5));
}
run();
