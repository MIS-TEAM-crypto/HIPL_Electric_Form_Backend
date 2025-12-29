// middleware/validation.middleware.js
import { google } from 'googleapis';
import { SPREADSHEET_ID, SHEET_NAME, GOOGLE_CREDENTIALS } from '../config.js';

// Initialize Google Sheets API
const auth = new google.auth.GoogleAuth({
  credentials: GOOGLE_CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

let sheets;

async function initSheets() {
  const authClient = await auth.getClient();
  sheets = google.sheets({ version: 'v4', auth: authClient });
}


async function getSheetsInstance() {
  if (sheets) return sheets;

  if (!process.env.GOOGLE_CREDENTIALS) {
    throw new Error('GOOGLE_CREDENTIALS is not set');
  }

  const auth = new google.auth.GoogleAuth({
    credentials: GOOGLE_CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const authClient = await auth.getClient();

  sheets = google.sheets({
    version: 'v4',
    auth: authClient,
  });

  // console.log('Google Sheets initialized');
  return sheets;
}


/**
 * Get previous date in YYYY-MM-DD format
 */
const getPreviousDate = (dateString) => {
  const date = new Date(dateString);
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0];
};

/**
 * Check if equipment status has negative values
 */
const hasNegativeValues = (equipmentStatus) => {
  if (!equipmentStatus || typeof equipmentStatus !== 'object') {
    return false;
  }

  return Object.values(equipmentStatus).some(value => {
    const numValue = parseFloat(value);
    return !isNaN(numValue) && numValue < 0;
  });
};

// Make shift comparison robust
const findLogByDateAndShift = (logs, date, shift) => {
  return logs.find(log =>
    log.date === date &&
    log.shift &&
    log.shift.trim().toUpperCase() === shift.trim().toUpperCase()
  );
};

// Helper to parse Google Sheets date (handles DD/MM/YYYY HH:mm:ss and serial numbers)
function parseSheetDate(dateStr) {
  if (!dateStr) return '';
  // If it's a number, treat as Google Sheets serial date
  if (!isNaN(dateStr)) {
    const jsDate = new Date((Number(dateStr) - 25569) * 86400 * 1000);
    return jsDate.toISOString().split('T')[0];
  }
  // If it's a string in DD/MM/YYYY or DD/MM/YYYY HH:mm:ss
  const [datePart, timePart] = dateStr.split(' ');
  if (datePart && datePart.includes('/')) {
    const [day, month, year] = datePart.split('/');
    if (day && month && year) {
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  // Try native Date parse as fallback
  const d = new Date(dateStr);
  if (!isNaN(d)) return d.toISOString().split('T')[0];
  return '';
}

const fetchAllLogs = async () => {
  try {
    const sheets = await getSheetsInstance();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:L`,
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) return [];

    return rows.slice(1).map(row => ({
      timestamp: row[0] || '',
      electrician: row[1] || '',
      shift: row[2] || '',
      date: parseSheetDate(row[0]),
      equipment_status: {
        boiler: row[3] || '',
        solvent: row[4] || '',
        refinery: row[5] || '',
        np: row[6] || '',
        pp: row[7] || '',
        dryer: row[8] || '',
        prep_compressor: row[9] || '',
        pump: row[10] || '',
        prep: row[11] || '',
        wbsedcl_unit: row[12] || ''
      }
    }));
  } catch (error) {
    // console.error('Error fetching logs:', error.message);
    throw error;
  }
};

/**
 * Find a specific log by date and shift
 */
// const findLogByDateAndShift = (logs, date, shift) => {
//   return logs.find(log =>
//     log.date === date &&
//     log.shift &&
//     log.shift.trim().toUpperCase() === shift.trim().toUpperCase()
//   );
// };

/**
 * Main Validation Middleware
 */
const validateMaintenanceLog = async (req, res, next) => {
  try {
    const { date, electrician1, electrician2, shift, equipment_status } = req.body;

    // ============================================
    // VALIDATION 1: Basic Required Fields
    // ============================================
    if (!date || !shift) {
      return res.status(400).json({
        success: false,
        message: 'Date and shift are required fields'
      });
    }

    // Validate shift value
    if (!['A', 'B', 'C'].includes(shift.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Shift must be A, B, or C'
      });
    }

    // ============================================
    // VALIDATION 2: At least one electrician required
    // ============================================
    if (!electrician1 && !electrician2) {
      return res.status(400).json({
        success: false,
        message: 'At least one electrician must be present for the shift'
      });
    }

    // ============================================
    // VALIDATION 3: No negative values in equipment status
    // ============================================
    if (equipment_status && hasNegativeValues(equipment_status)) {
      return res.status(400).json({
        success: false,
        message: 'Negative values are not allowed in any field'
      });
    }

    // Fetch all existing logs from Google Sheets
    const allLogs = await fetchAllLogs();
    // console.log('All logs fetched for validation:', allLogs);

    // ============================================
    // VALIDATION 4: Check for duplicate date-shift combination
    // ============================================
    const existingLog = findLogByDateAndShift(allLogs, date, shift);

    if (existingLog) {
      return res.status(409).json({
        success: false,
        message: `Form for ${date} - Shift ${shift} has already been submitted`,
        code: 'DUPLICATE_ENTRY'
      });
    }

    // ============================================
    // VALIDATION 5: Previous date's Shift C must be submitted
    // ============================================
    const previousDate = getPreviousDate(date);
    // Only consider logs from the previous date
    const previousDayLogs = allLogs.filter(log => log.date === previousDate);
    // console.log('Checking previousDayLogs:', previousDayLogs, 'for shift:', previousDate, 'C');
    const previousShiftC = findLogByDateAndShift(previousDayLogs, previousDate, 'C');
    // console.log(`Previous date: ${previousDate}, Previous Shift C:`, previousShiftC);

    // console.log('Checking previousDayLogs:', previousDayLogs, 'for shift:', previousDate, shift);

    if (!previousShiftC) {
      return res.status(403).json({
        success: false,
        message: `Cannot submit form for ${date}. Previous date's Shift C (${previousDate}) has not been submitted yet.`,
        code: 'PREVIOUS_SHIFT_C_MISSING',
        requiredDate: previousDate,
        requiredShift: 'C'
      });
    }

    // ============================================
    // VALIDATION 6: Shift B can only be submitted after Shift A
    // ============================================
    // if (shift.toUpperCase() === 'B') {
    //   const shiftA = findLogByDateAndShift(allLogs, date, 'A');

    //   if (!shiftA) {
    //     return res.status(403).json({
    //       success: false,
    //       message: `Cannot submit Shift B for ${date}. Shift A for this date has not been submitted yet.`,
    //       code: 'SHIFT_A_REQUIRED',
    //       requiredDate: date,
    //       requiredShift: 'A'
    //     });
    //   }
    // }

    // ============================================
    // VALIDATION 7: Shift C can only be submitted after Shift B
    // ============================================
    if (shift.toUpperCase() === 'C') {
      const shiftB = findLogByDateAndShift(allLogs, date, 'B');

      if (!shiftB) {
        return res.status(403).json({
          success: false,
          message: `Cannot submit Shift C for ${date}. Shift B for this date has not been submitted yet.`,
          code: 'SHIFT_B_REQUIRED',
          requiredDate: date,
          requiredShift: 'B'
        });
      }
    }

    // All validations passed
    next();
  } catch (error) {
    console.error('Validation Error:', error);
    // Send detailed error info for frontend display
    return res.status(500).json({
      success: false,
      message: error.message || 'Validation error occurred',
      error: error.message,
      details: error.details || error // Pass extra info if available
    });
  }
};

/**
 * Additional middleware to check submission status
 */
const checkSubmissionStatus = async (req, res, next) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date parameter is required'
      });
    }

    // Fetch all logs from Google Sheets
    const allLogs = await fetchAllLogs();
    
    // Filter logs for the requested date
    const logsForDate = allLogs.filter(log => log.date === date);
    const submittedShifts = logsForDate.map(log => log.shift.toUpperCase());

    // Check if previous date's Shift C is submitted
    const previousDate = getPreviousDate(date);
    const previousShiftC = findLogByDateAndShift(allLogs, previousDate, 'C');
    const canSubmitAny = !!previousShiftC;

    res.json({
      success: true,
      date,
      submittedShifts,
      canSubmit: {
        A: canSubmitAny && !submittedShifts.includes('A'),
        B: canSubmitAny && submittedShifts.includes('A') && !submittedShifts.includes('B'),
        C: canSubmitAny && submittedShifts.includes('B') && !submittedShifts.includes('C')
      },
      previousDateCheck: {
        date: previousDate,
        shiftCSubmitted: !!previousShiftC
      }
    });

  } catch (error) {
    // console.error('Status Check Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking submission status',
      error: error.message
    });
  }
};

// Google Sheets Configuration
// console.log('SPREADSHEET_ID in validation.middleware.js:', SPREADSHEET_ID);
// console.log('SHEET_NAME in validation.middleware.js:', SHEET_NAME);

export{
  validateMaintenanceLog,
  checkSubmissionStatus,
  getPreviousDate,
  hasNegativeValues,
  fetchAllLogs,
  findLogByDateAndShift
};