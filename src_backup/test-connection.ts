import { JobManClient } from './api/jobman.js';
import { GoogleSheetsClient } from './api/google.js';
import dotenv from 'dotenv';

dotenv.config();

async function runDiagnostic() {
  console.log('-------------------------------------------');
  console.log('🚀 JOBMAN TO GOOGLE SHEETS DIAGNOSTIC');
  console.log('-------------------------------------------');

  // 1. Check JobMan
  try {
    console.log('🔍 Testing JobMan Connection...');
    const jobman = new JobManClient();
    const quotes = await jobman.getQuotes(1, 1);
    console.log('✅ JobMan API: Connected!');
    // @ts-ignore
    console.log(`📊 Found ${quotes?.meta?.total || 0} total quotes in your system.`);
  } catch (error: any) {
    console.log('❌ JobMan API: Failed!');
    console.log(`   Error: ${error.message}`);
    if (error.response?.status === 401) console.log('   (Hint: Your API Key might be wrong)');
    if (error.response?.status === 403) console.log('   (Hint: Check your API Key permissions/scopes)');
  }

  console.log('\n-------------------------------------------');

  // 2. Check Google Sheets
  try {
    console.log('🔍 Testing Google Sheets Connection...');
    const google = new GoogleSheetsClient();
    await google.loadInfo();
    console.log('✅ Google Sheets: Connected!');
    console.log(`📄 Spreadsheet Title: "${google['doc'].title}"`);
  } catch (error: any) {
    console.log('❌ Google Sheets: Failed!');
    console.log(`   Error: ${error.message}`);
    if (error.message.includes('403')) {
        console.log('   (Hint: Did you share the sheet with the Service Account email?)');
    }
  }

  console.log('\n-------------------------------------------');
  console.log('Next Step: Once both are ✅, you can run the full sync.');
}

runDiagnostic();
