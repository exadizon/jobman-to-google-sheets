import { JobManClient } from './api/jobman.js';
import { GoogleSheetsClient } from './api/google.js';
import { syncInvoices } from './sync/invoices.js';
import dotenv from 'dotenv';

dotenv.config();

async function startSync() {
  console.log('🚀 Starting Test Sync (Invoices Focus)...');
  
  const jobman = new JobManClient();
  const google = new GoogleSheetsClient();

  try {
    const data = await syncInvoices(jobman);
    console.log(`📊 Collected ${data.length} invoices. Sending to Google Sheets...`);
    
    await google.updateSheet('Jobman Data - Invoices', data);

    console.log('✅ Invoices Sync Completed successfully!');
  } catch (error: any) {
    console.error('❌ Sync Failed:', error.message);
  }
}

startSync();
