import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import dotenv from 'dotenv';

dotenv.config();

export class GoogleSheetsClient {
  public doc: GoogleSpreadsheet;

  constructor() {
    const sheetId = process.env.GOOGLE_SHEET_ID;
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!sheetId || !email || !key) {
      throw new Error('Google Sheets credentials missing in .env');
    }

    const auth = new JWT({
      email: email,
      key: key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    this.doc = new GoogleSpreadsheet(sheetId, auth);
  }

  async loadInfo() {
    await this.doc.loadInfo();
  }

  async updateSheet(sheetTitle: string, data: any[]) {
    await this.loadInfo();
    let sheet = this.doc.sheetsByTitle[sheetTitle];

    if (!sheet) {
        const availableSheets = Object.keys(this.doc.sheetsByTitle).join(', ');
        console.warn(`❌ Sheet "${sheetTitle}" not found.`);
        console.warn(`   Available: [${availableSheets}]`);
        return;
    }

    // Ensure sheet has enough columns before writing
    if (data.length > 0) {
      const requiredCols = Object.keys(data[0]).length;
      if (sheet.columnCount < requiredCols) {
        await sheet.resize({ rowCount: sheet.rowCount, columnCount: requiredCols });
      }
    }

    // Ensure enough rows for data + 2 header rows
    const requiredRows = data.length + 2;
    if (sheet.rowCount < requiredRows) {
      await sheet.resize({ rowCount: requiredRows, columnCount: sheet.columnCount });
    }

    await sheet.clear();

    if (data.length > 0) {
      const headers = Object.keys(data[0]);
      const today = new Date().toLocaleDateString('en-GB');

      // Build all rows: row 1 = date export info, row 2 = headers, rows 3+ = data
      const dateRow = ['Date Exported:', today, ...Array(Math.max(0, headers.length - 2)).fill('')];
      const dataRows = data.map((row: any) => headers.map(h => row[h] ?? ''));
      const allValues = [dateRow, headers, ...dataRows];

      // Write everything in one API call using raw values.update
      // This bypasses setHeaderRow/addRows which have issues with header row on row 2
      const sheetsApi = (sheet as any)._spreadsheet.sheetsApi;
      await sheetsApi.put(
        `values/${sheet.encodedA1SheetName}!A1`,
        {
          searchParams: { valueInputOption: 'USER_ENTERED' },
          json: {
            range: `${sheet.a1SheetName}!A1`,
            majorDimension: 'ROWS',
            values: allValues,
          },
        }
      );
    } else {
      // No data, just write the date
      const today = new Date().toLocaleDateString('en-GB');
      await sheet.loadCells('A1:B1');
      const cellA1 = sheet.getCell(0, 0);
      cellA1.value = 'Date Exported:';
      const cellB1 = sheet.getCell(0, 1);
      cellB1.value = today;
      await sheet.saveUpdatedCells();
    }

    console.log(`Updated ${sheetTitle} with ${data.length} rows.`);
  }
}
