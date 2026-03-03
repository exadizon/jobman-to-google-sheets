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

  const q05 = allQuotes.find(q => q.number === '2509-087/05');
  const q06 = allQuotes.find(q => q.number === '2509-087/06');

  if (q05) fs.writeFileSync('q05.json', JSON.stringify(q05, null, 2));
  if (q06) fs.writeFileSync('q06.json', JSON.stringify(q06, null, 2));
  
  if (q05 && q06) {
      console.log('Keys only in 05:', Object.keys(q05).filter(k => !(k in q06)));
      console.log('Keys only in 06:', Object.keys(q06).filter(k => !(k in q05)));
      
      const diffProps = [];
      for (const k of Object.keys(q05)) {
          if (q05[k] !== q06[k]) {
              // Ignore timestamps/ids that are obviously different
              if (['id', 'number', 'created_at', 'updated_at', 'date', 'expiry_date'].includes(k)) continue;
              diffProps.push(k);
          }
      }
      console.log('Differing properties (ignoring IDs and timestamps):');
      for (const k of diffProps) {
          console.log(`  ${k} -> 05:"${q05[k]}" vs 06:"${q06[k]}"`);
      }
  }
}
run();
