import fs from 'fs';
import { JobManClient } from '../lib/sync/api/jobman';

async function run() {
  const csvContent = fs.readFileSync('../docs/quotes_manual.csv', 'utf-8');
  
  const csvNumbers = new Set<string>();
  const lines = csvContent.split('\n');
  
  for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Usually the quote number is the first item before comma
      const match = line.match(/^([^,]+),/);
      if (match) {
          let num = match[1].trim();
          // Remove quotes if it was quoted
          if (num.startsWith('"') && num.endsWith('"')) {
              num = num.substring(1, num.length - 1);
          }
          if (num) {
              csvNumbers.add(num);
          }
      }
  }

  const client = new JobManClient();
  let allQuotes: any[] = [];
  let currentPage = 1;
  let hasMore = true;

  console.log('Fetching quotes from API...');
  while (hasMore) {
    const response: any = await client.getQuotes(currentPage, 50);
    const quotes = response.quotes?.data || [];
    allQuotes = allQuotes.concat(quotes);
    
    const meta = response.quotes?.meta || response.meta;
    if (meta && currentPage < meta.last_page) {
        currentPage++;
    } else {
        hasMore = false;
    }
  }

  const apiQuotes = allQuotes.map(q => ({
    number: q.number || q.quote_number || '',
    status: q.quote_status_name || q.status?.name || '',
    status_id: q.quote_status_id,
    deleted: q.deleted_at ? true : false,
    archived: q.is_archived || q.deleted_at !== null || false, // depending on API spec
    id: q.id
  }));

  const onlyInApi = apiQuotes.filter(q => !csvNumbers.has(q.number));
  
  console.log(`CSV total (distinct numbers): ${csvNumbers.size}`);
  console.log(`API total: ${apiQuotes.length}`);
  console.log(`Count Only in API: ${onlyInApi.length}`);
  
  const statuses: Record<string, number> = {};
  for (const q of onlyInApi) {
     const statusName = q.status || 'UNKNOWN';
     statuses[statusName] = (statuses[statusName] || 0) + 1;
  }
  
  console.log('--- Statuses of Quotes Only in API ---');
  console.log(statuses);

  const apiNumbers = new Set(apiQuotes.map(q => q.number));
  const onlyInCsv = Array.from(csvNumbers).filter(n => !apiNumbers.has(n));
  console.log(`Count Only in CSV: ${onlyInCsv.length}`);
  if (onlyInCsv.length > 0) {
      console.log('Sample missing in API: ', onlyInCsv.slice(0, 5));
  }
  
  // Log first few dropped by CSV to see what they look like
  console.log('\nSample Quotes found in API but missing in CSV (first 5):');
  console.log(onlyInApi.slice(0, 5));
}

run().catch(console.error);
