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
        console.warn(`Sheet "${sheetTitle}" not found.`);
        return;
    }

    await sheet.clear();
    
    if (data.length > 0) {
      await sheet.setHeaderRow(Object.keys(data[0]));
      await sheet.addRows(data);
    }
    
    console.log(`Updated ${sheetTitle} with ${data.length} rows.`);
  }
}
