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
  
  const inApiZeros = onlyInApi.filter(q => parseFloat(q.total) === 0).length;
  const inCsvZeros = inCsvAPI.filter(q => parseFloat(q.total) === 0).length;
  console.log(`Of 75 only in API: ${inApiZeros} have total == 0`);
  console.log(`Of ${inCsvAPI.length} in CSV: ${inCsvZeros} have total == 0`);
}
run();
