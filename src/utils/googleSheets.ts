import { ExtractedData } from '@/types/data';

declare global {
  interface Window {
    gapi: any;
  }
}

const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

export const exportDataToSheets = async (data: ExtractedData[]) => {
  try {
    // Initialize the Google Sheets API
    await window.gapi.client.init({
      apiKey: 'YOUR_API_KEY', // Replace with your API key
      discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
      clientId: 'YOUR_CLIENT_ID', // Replace with your client ID
      scope: SCOPES,
    });

    // Sign in the user
    await window.gapi.auth2.getAuthInstance().signIn();

    const values = data.map((item) => [
      item.firstName,
      item.surname,
      item.phoneNumber,
      item.fileName,
    ]);

    // You'll need to replace this with your actual spreadsheet ID
    const spreadsheetId = 'YOUR_SPREADSHEET_ID';

    await window.gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Sheet1!A1:D1',
      valueInputOption: 'RAW',
      resource: {
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