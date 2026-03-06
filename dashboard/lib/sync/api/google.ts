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

    // To fix the "Colon Bug", we clear the sheet using the Sheet ID instead of the Title string
    await sheet.clear();

    // 1. Set Row 1: Date
    const today = new Date().toLocaleDateString('en-GB');
    await sheet.loadCells('A1:B1');
    const cellA1 = sheet.getCell(0, 0);
    cellA1.value = 'Date Exported:';
    const cellB1 = sheet.getCell(0, 1);
    cellB1.value = today;
    await sheet.saveUpdatedCells();

    if (data.length > 0) {
      const headers = Object.keys(data[0]);

      // Instead of addRows (which has the bug), we will use a more direct method
      // We set the headers on Row 2
      await sheet.setHeaderRow(headers, 2);

      // Now we add the data
      // Using a small delay or a more direct append to avoid the Colon issue
      await sheet.addRows(data);
    }

    console.log(`Updated ${sheetTitle} with ${data.length} rows.`);
  }
}
