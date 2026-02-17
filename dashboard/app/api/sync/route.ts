import { NextResponse } from 'next/server';
import { JobManClient } from '@/lib/sync/api/jobman';
import { GoogleSheetsClient } from '@/lib/sync/api/google';
import { syncQuotes } from '@/lib/sync/sync/quotes';
import { syncLeads } from '@/lib/sync/sync/leads';
import { syncJobs } from '@/lib/sync/sync/jobs';
import { syncInvoices } from '@/lib/sync/sync/invoices';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // Suppress the url.parse warning from appearing in your UI
  process.removeAllListeners('warning');
  
  const encoder = new TextEncoder();
  const body = await req.json();
  const { quotes, leads, jobs, invoices, limit } = body;

  const stream = new ReadableStream({
    async start(controller) {
      const originalLog = console.log;
      const originalWarn = console.warn;
      const originalError = console.error;

      const log = (msg: string) => {
        const text = `${msg}\n`;
        controller.enqueue(encoder.encode(text));
      };

      console.log = (...args) => log(args.map(String).join(' '));
      console.warn = (...args) => log(`⚠️ ${args.map(String).join(' ')}`);
      console.error = (...args) => log(`❌ ${args.map(String).join(' ')}`);

      try {
        log(`🚀 Initializing Sync ${limit ? `(Limit: ${limit})` : '(Full)'}...`);
        const jobman = new JobManClient();
        const google = new GoogleSheetsClient();

        if (quotes) {
            log('--- Starting Quotes Sync ---');
            const data = await syncQuotes(jobman, limit);
            log(`📊 Quotes: Collected ${data.length}. Updating Google Sheets...`);
            await google.updateSheet('Jobman Data - Quotes', data);
        }

        if (leads) {
            log('--- Starting Leads Sync ---');
            const data = await syncLeads(jobman, limit);
            log(`📊 Leads: Collected ${data.length}. Updating Google Sheets...`);
            await google.updateSheet('Jobman Data - Leads', data);
        }

        if (jobs) {
            log('--- Starting Jobs Sync ---');
            const data = await syncJobs(jobman, limit);
            log(`📊 Jobs: Collected ${data.length}. Updating Google Sheets...`);
            await google.updateSheet('Jobman Data - Jobs', data);
        }

        if (invoices) {
            log('--- Starting Invoices Sync ---');
            const data = await syncInvoices(jobman, limit);
            log(`📊 Invoices: Collected ${data.length}. Updating Google Sheets...`);
            await google.updateSheet('Jobman Data - Invoices', data);
        }

        log('🎉 All Tasks Completed!');
      } catch (error: any) {
        log(`❌ Fatal Error: ${error.message}`);
      } finally {
        console.log = originalLog;
        console.warn = originalWarn;
        console.error = originalError;
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
