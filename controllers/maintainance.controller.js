// controllers/maintainance.controller.js
import { fetchAllLogs, findLogByDateAndShift, getPreviousDate } from '../middleware/validation.middleware.js';
import { google } from 'googleapis';
import { SPREADSHEET_ID, SHEET_NAME, GOOGLE_APPLICATION_CREDENTIALS } from '../config.js';

const auth = new google.auth.GoogleAuth({
  keyFile: GOOGLE_APPLICATION_CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

let sheets;
async function getSheetsInstance() {
  if (sheets) return sheets;
  const authClient = await auth.getClient();
  sheets = google.sheets({ version: 'v4', auth: authClient });
  return sheets;
}

// Debug log for SPREADSHEET_ID
// console.log('SPREADSHEET_ID in maintainance.controller.js:', SPREADSHEET_ID);
// console.log('SHEET_NAME in maintainance.controller.js:', SHEET_NAME);

// Append a new maintenance log to Google Sheets
export const appendMaintenanceLog = async (req, res) => {
  try {
    const { date, electrician1, electrician2, shift, equipment_status, timestamp } = req.body;
    const sheets = await getSheetsInstance();

    // Prepare row data
    const row = [
      timestamp || new Date().toISOString(),
      [electrician1, electrician2].filter(Boolean).join(', '),
      shift || '',
      equipment_status?.boiler || '',
      equipment_status?.solvent || '',
      equipment_status?.refinery || '',
      equipment_status?.np || '',
      equipment_status?.pp || '',
      equipment_status?.dryer || '',
      equipment_status?.prep_compressor || '',
      equipment_status?.pump || '',
      equipment_status?.prep || '',
      equipment_status?.wbsedcl_unit || ''
    ];

    // Append row to Google Sheets
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:L`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [row] },
    });

    res.status(201).json({
      success: true,
      message: 'Maintenance log added successfully',
      data: req.body
    });
  } catch (error) {
    // console.error('Error appending log:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add maintenance log',
      error: error.message
    });
  }
};
