import { JobManClient } from './lib/sync/api/jobman';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

async function verify() {
  const client = new JobManClient();
  let allQuotes: any[] = [];
  let currentPage = 1;
  let hasMore = true;

  console.log('Fetching quotes with new trashed: 0 default...');
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
  
  console.log(`Successfully fetched ${allQuotes.length} active Quotes.`);
  if (allQuotes.length === 694) {
      console.log('Verification PASSED. 694 returned (missing the 75 trashed quotes).');
  } else {
      console.log('Verification FAILED. Count did not match 694.');
  }
}
verify().catch(console.error);
