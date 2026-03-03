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

  const baseQuoteRevs = new Map();
  // e.g. "2509-087/06" -> base: 2509-087, rev: 6
  // e.g. "Q1234" -> base: Q1234, rev: 0
  allQuotes.forEach(q => {
     const numRaw = q.number || q.quote_number || '';
     const match = numRaw.match(/^(.*?)\/(\d+)$/);
     let base = numRaw;
     let rev = 0;
     if (match) {
        base = match[1];
        rev = parseInt(match[2], 10);
     }
     
     if (!baseQuoteRevs.has(base) || baseQuoteRevs.get(base).rev < rev) {
         baseQuoteRevs.set(base, { rev, quote: q, raw: numRaw });
     }
  });

  const latestQuotesOnly = Array.from(baseQuoteRevs.values()).map(x => x.quote);
  console.log(`API total (raw): ${allQuotes.length}`);
  console.log(`API total (only latest revisions): ${latestQuotesOnly.length}`);
  
  // also check how many are omitted
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

  console.log(`CSV total (distinct numbers): ${csvNumbers.size}`);
  
  const latestNumbers = new Set(latestQuotesOnly.map(q => q.number || q.quote_number));
  const latestInCsv = Array.from(latestNumbers).filter(q => csvNumbers.has(q));
  const latestNotInCsv = Array.from(latestNumbers).filter(q => !csvNumbers.has(q));
  console.log(`Latest out of API that are ALSO in CSV: ${latestInCsv.length}`);
  console.log(`Latest out of API that are NOT in CSV: ${latestNotInCsv.length}`);
}
run();
