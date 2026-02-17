import { JobManClient } from '../lib/sync/api/jobman';
import { GoogleSheetsClient } from '../lib/sync/api/google';
import { syncQuotes } from '../lib/sync/sync/quotes';
import { syncLeads } from '../lib/sync/sync/leads';
import { syncJobs } from '../lib/sync/sync/jobs';
import { syncInvoices } from '../lib/sync/sync/invoices';
import dotenv from 'dotenv';

dotenv.config();

// Add helper for timestamps
const log = (msg: string) => {
    const time = new Date().toLocaleTimeString('en-GB', { timeZone: 'Pacific/Auckland' });
    console.log(`[${time}] ${msg}`);
};

async function runFullAutomation() {
  log('🚀 STARTING DAILY AUTOMATION');
  
  const jobman = new JobManClient();
  const google = new GoogleSheetsClient();

  try {
    // 1. Quotes
    log('--- Quotes ---');
    const quotes = await syncQuotes(jobman, null);
    await google.updateSheet('Jobman Data - Quotes', quotes);

    // 2. Leads
    log('--- Leads ---');
    const leads = await syncLeads(jobman, null);
    await google.updateSheet('Jobman Data - Leads', leads);

    // 3. Jobs
    log('--- Jobs ---');
    const jobs = await syncJobs(jobman, null);
    await google.updateSheet('Jobman Data - Jobs', jobs);

    // 4. Invoices
    log('--- Invoices ---');
    const invoices = await syncInvoices(jobman, null);
    await google.updateSheet('Jobman Data - Invoices', invoices);

    log('🎉 AUTOMATION FINISHED SUCCESSFULLY');
  } catch (error: any) {
    log(`❌ AUTOMATION FAILED: ${error.message}`);
    process.exit(1);
  }
}

runFullAutomation();
