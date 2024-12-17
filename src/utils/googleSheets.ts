import { ExtractedData } from '@/types/data';
import { google } from 'googleapis';
import { authenticate } from '@google-cloud/local-auth';

export const exportDataToSheets = async (data: ExtractedData[]) => {
  try {
    const auth = await authenticate({
      keyfilePath: 'credentials.json',
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const values = data.map((item) => [
      item.firstName,
      item.surname,
      item.phoneNumber,
      item.fileName,
    ]);

    // You'll need to replace this with your actual spreadsheet ID
    const spreadsheetId = 'YOUR_SPREADSHEET_ID';

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Sheet1!A1:D1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [
          ['First Name', 'Surname', 'Phone Number', 'File Name'],
          ...values,
        ],
      },
    });
  } catch (error) {
    console.error('Error exporting to Google Sheets:', error);
    throw error;
  }
};