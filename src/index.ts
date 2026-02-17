import { JobManClient } from './api/jobman.js';
import { GoogleSheetsClient } from './api/google.js';
import { syncQuotes } from './sync/quotes.js';
import dotenv from 'dotenv';

dotenv.config();

async function startSync() {
  console.log('🚀 Starting Test Sync (Quotes Only)...');
  
  const jobman = new JobManClient();
  const google = new GoogleSheetsClient();

  try {
    // 1. Sync Quotes only for now
    const quotesData = await syncQuotes(jobman);
    
    console.log(`📊 Collected ${quotesData.length} quotes. Sending to Google Sheets...`);
    
    // Using your exact tab name
    await google.updateSheet('JobMan Data: Quotes', quotesData);

    console.log('✅ Quotes Sync Completed successfully!');
  } catch (error: any) {
    console.error('❌ Sync Failed:', error.message);
  }
}

startSync();
