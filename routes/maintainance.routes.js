// // routes/maintenance.routes.js
// import express from 'express';
// const router = express.Router();
// import { google } from 'googleapis';
// import { validateMaintenanceLog } from "../middleware/validation.middleware.js";
// import { SPREADSHEET_ID, SHEET_NAME, GOOGLE_CREDENTIALS } from '../config.js';




// // Initialize Google Sheets API
// const auth = new google.auth.GoogleAuth({
//   credentials: GOOGLE_CREDENTIALS,
//   scopes: ['https://www.googleapis.com/auth/spreadsheets'],
// });

// const sheets = google.sheets({ version: 'v4', auth });

// /**
//  * POST - Submit a new maintenance log to Google Sheets
//  * @route POST /api/maintenance-log
//  */
// router.post('/', validateMaintenanceLog, async (req, res) => {
//   try {
//     const { date, electrician1, electrician2, shift, equipment_status, timestamp } = req.body;

//     // Combine electrician names
//     const electricianNames = [electrician1, electrician2]
//       .filter(name => name && name.trim())
//       .join(', ');

//     // Prepare row data matching your headers
//     const rowData = [
//       timestamp || new Date().toISOString(),
//       electricianNames,
//       shift.toUpperCase(),
//       equipment_status.boiler || '',
//       equipment_status.solvent || '',
//       equipment_status.refinery || '',
//       equipment_status.np || '',
//       equipment_status.pp || '',
//       equipment_status.dryer || '',
//       equipment_status.prep_compressor || '',
//       equipment_status.pump || '',
//       equipment_status.prep || '',
//       equipment_status.wbsedcl_unit || '',
//       equipment_status.Pulverizer_Mega || '',
//       equipment_status.Pulverizer_Oils || '',
//       equipment_status.Boiler_12_Ton || '',

//     ];

//     // Check for duplicates (optional - check if date+shift already exists)
//     const checkRange = `${SHEET_NAME}!A:C`;
//     const checkResponse = await sheets.spreadsheets.values.get({
//       spreadsheetId: SPREADSHEET_ID,
//       range: checkRange,
//     });

//     const rows = checkResponse.data.values || [];
//     const dateStr = new Date(timestamp).toLocaleDateString();
//     const isDuplicate = rows.some((row, index) => {
//       if (index === 0) return false; // Skip header row
//       const rowDate = new Date(row[0]).toLocaleDateString();
//       const rowShift = row[2];
//       return rowDate === dateStr && rowShift === shift.toUpperCase();
//     });

//     if (isDuplicate) {
//       return res.status(409).json({
//         success: false,
//         message: 'This date and shift combination has already been submitted',
//         code: 'DUPLICATE_ENTRY'
//       });
//     }

//     // Append data to Google Sheets
//     await sheets.spreadsheets.values.append({
//       spreadsheetId: SPREADSHEET_ID,
//       range: `${SHEET_NAME}!A:L`,
//       valueInputOption: 'USER_ENTERED',
//       resource: {
//         values: [rowData]
//       }
//     });

//     res.status(201).json({
//       success: true,
//       message: 'Maintenance log submitted successfully',
//       data: {
//         timestamp: rowData[0],
//         electrician: rowData[1],
//         shift: rowData[2],
//         equipment_status
//       }
//     });

//   } catch (error) {
//     // console.error('Submission Error:', error);

//     if (error.code === 404) {
//       return res.status(404).json({
//         success: false,
//         message: 'Google Sheet not found. Please check SPREADSHEET_ID',
//         code: 'SHEET_NOT_FOUND'
//       });
//     }

//     if (error.code === 403) {
//       return res.status(403).json({
//         success: false,
//         message: 'Permission denied. Please check service account permissions',
//         code: 'PERMISSION_DENIED'
//       });
//     }

//     res.status(500).json({
//       success: false,
//       message: 'Failed to submit maintenance log',
//       error: error.message
//     });
//   }
// });

// /**
//  * GET - Get all maintenance logs from Google Sheets
//  * @route GET /api/maintenance-log?date=YYYY-MM-DD&shift=A
//  */
// router.get('/', async (req, res) => {
//   try {
//     const { date, shift, limit = 50 } = req.query;

//     const response = await sheets.spreadsheets.values.get({
//       spreadsheetId: SPREADSHEET_ID,
//       range: `${SHEET_NAME}!A:L`,
//     });

//     const rows = response.data.values || [];
    
//     if (rows.length === 0) {
//       return res.json({
//         success: true,
//         count: 0,
//         data: []
//       });
//     }

//     // Parse rows (skip header)
//     const logs = rows.slice(1).map(row => ({
//       timestamp: row[0] || '',
//       electrician: row[1] || '',
//       shift: row[2] || '',
//       equipment_status: {
//         boiler: row[3] || '',
//         solvent: row[4] || '',
//         np: row[5] || '',
//         pp: row[6] || '',
//         dryer: row[7] || '',
//         prep_compressor: row[8] || '',
//         pump: row[9] || '',
//         prep: row[10] || '',
//         wbsedcl_unit: row[11] || '',
//         Pulverizer_Mega: row[13] || '',
//         Pulverizer_Oils: row[14] || '',
//         Boiler_12_Ton: row[15] || ''

//       }
//     }));

//     // Apply filters
//     let filteredLogs = logs;

//     if (date) {
//       const searchDate = new Date(date).toLocaleDateString();
//       filteredLogs = filteredLogs.filter(log => {
//         const logDate = new Date(log.timestamp).toLocaleDateString();
//         return logDate === searchDate;
//       });
//     }

//     if (shift) {
//       filteredLogs = filteredLogs.filter(log => 
//         log.shift.toUpperCase() === shift.toUpperCase()
//       );
//     }

//     // Apply limit
//     filteredLogs = filteredLogs.slice(0, parseInt(limit));

//     res.json({
//       success: true,
//       count: filteredLogs.length,
//       data: filteredLogs
//     });

//   } catch (error) {
//     // console.error('Fetch Error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch maintenance logs',
//       error: error.message
//     });
//   }
// });

// /**
//  * GET - Check submission status for a date
//  * @route GET /api/maintenance-log/status?date=YYYY-MM-DD
//  */
// router.get('/status', async (req, res) => {
//   try {
//     const { date } = req.query;

//     if (!date) {
//       return res.status(400).json({
//         success: false,
//         message: 'Date parameter is required'
//       });
//     }

//     const response = await sheets.spreadsheets.values.get({
//       spreadsheetId: SPREADSHEET_ID,
//       range: `${SHEET_NAME}!A:C`,
//     });

//     const rows = response.data.values || [];
//     const searchDate = new Date(date).toLocaleDateString();

//     const submissions = {};
//     ['A', 'B', 'C'].forEach(shift => {
//       submissions[shift] = false;
//     });

//     rows.slice(1).forEach(row => {
//       const rowDate = new Date(row[0]).toLocaleDateString();
//       const shift = row[2];
//       if (rowDate === searchDate && submissions.hasOwnProperty(shift)) {
//         submissions[shift] = true;
//       }
//     });

//     res.json({
//       success: true,
//       date,
//       submissions
//     });

//   } catch (error) {
//     // console.error('Status Check Error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to check submission status',
//       error: error.message
//     });
//   }
// });

// /**
//  * DELETE - Delete a maintenance log (admin only)
//  * @route DELETE /api/maintenance-log/:timestamp/:shift
//  */
// router.delete('/:timestamp/:shift', async (req, res) => {
//   try {
//     const { timestamp, shift } = req.params;

//     const response = await sheets.spreadsheets.values.get({
//       spreadsheetId: SPREADSHEET_ID,
//       range: `${SHEET_NAME}!A:C`,
//     });

//     const rows = response.data.values || [];
//     const searchDate = new Date(timestamp).toLocaleDateString();
    
//     let rowIndex = -1;
//     rows.forEach((row, index) => {
//       if (index === 0) return; // Skip header
//       const rowDate = new Date(row[0]).toLocaleDateString();
//       if (rowDate === searchDate && row[2] === shift.toUpperCase()) {
//         rowIndex = index;
//       }
//     });

//     if (rowIndex === -1) {
//       return res.status(404).json({
//         success: false,
//         message: 'Maintenance log not found'
//       });
//     }

//     // Delete the row (note: index + 1 because sheets are 1-indexed)
//     await sheets.spreadsheets.batchUpdate({
//       spreadsheetId: SPREADSHEET_ID,
//       resource: {
//         requests: [
//           {
//             deleteDimension: {
//               range: {
//                 sheetId: 0, // Change this if your sheet has a different ID
//                 dimension: 'ROWS',
//                 startIndex: rowIndex,
//                 endIndex: rowIndex + 1
//               }
//             }
//           }
//         ]
//       }
//     });

//     res.json({
//       success: true,
//       message: 'Maintenance log deleted successfully'
//     });

//   } catch (error) {
//     // console.error('Delete Error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to delete maintenance log',
//       error: error.message
//     });
//   }
// });

// export default router;





// routes/maintenance.routes.js
import express from 'express';
const router = express.Router();
import { google } from 'googleapis';
import { validateMaintenanceLog } from "../middleware/validation.middleware.js";
import { SPREADSHEET_ID, SHEET_NAME, GOOGLE_CREDENTIALS } from '../config.js';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';

dayjs.extend(customParseFormat);

// Initialize Google Sheets API
const auth = new google.auth.GoogleAuth({
  credentials: GOOGLE_CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

/**
 * Helper function to format date to DD/MM/YYYY HH:mm:ss
 */
const formatTimestamp = (date) => {
  return dayjs(date).format('DD/MM/YYYY HH:mm:ss');
};

/**
 * Helper function to parse DD/MM/YYYY HH:mm:ss to YYYY-MM-DD for comparison
 */
const parseSheetDateToISO = (dateStr) => {
  if (!dateStr) return '';
  
  // Handle DD/MM/YYYY HH:mm:ss format
  const parsed = dayjs(dateStr, 'DD/MM/YYYY HH:mm:ss', true);
  if (parsed.isValid()) {
    return parsed.format('YYYY-MM-DD');
  }
  
  // Fallback to regular parsing
  const fallback = dayjs(dateStr);
  if (fallback.isValid()) {
    return fallback.format('YYYY-MM-DD');
  }
  
  return '';
};

/**
 * POST - Submit a new maintenance log to Google Sheets
 * @route POST /api/maintenance-log
 */
router.post('/', validateMaintenanceLog, async (req, res) => {
  try {
    const { date, electrician1, electrician2, shift, equipment_status, timestamp } = req.body;

    // Format timestamp to DD/MM/YYYY HH:mm:ss
    const formattedTimestamp = formatTimestamp(timestamp || new Date());

    // Combine electrician names
    const electricianNames = [electrician1, electrician2]
      .filter(name => name && name.trim())
      .join(', ');

    // Prepare row data matching your headers
    const rowData = [
      formattedTimestamp,
      electricianNames,
      shift.toUpperCase(),
      equipment_status.boiler || '',
      equipment_status.solvent || '',
      equipment_status.refinery || '',
      equipment_status.np || '',
      equipment_status.pp || '',
      equipment_status.dryer || '',
      equipment_status.prep_compressor || '',
      equipment_status.pump || '',
      equipment_status.prep || '',
      equipment_status.wbsedcl_unit || '',
      equipment_status.Pulverizer_Mega || '',
      equipment_status.Pulverizer_Oils || '',
      equipment_status.Boiler_12_Ton || '',
    ];

    // Check for duplicates
    const checkRange = `${SHEET_NAME}!A:C`;
    const checkResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: checkRange,
    });

    const rows = checkResponse.data.values || [];
    const dateStr = date; // Already in YYYY-MM-DD format from validation
    const isDuplicate = rows.some((row, index) => {
      if (index === 0) return false; // Skip header row
      const rowDate = parseSheetDateToISO(row[0]);
      const rowShift = row[2];
      return rowDate === dateStr && rowShift === shift.toUpperCase();
    });

    if (isDuplicate) {
      return res.status(409).json({
        success: false,
        message: 'This date and shift combination has already been submitted',
        code: 'DUPLICATE_ENTRY'
      });
    }

    // Append data to Google Sheets
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:P`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [rowData]
      }
    });

    res.status(201).json({
      success: true,
      message: 'Maintenance log submitted successfully',
      data: {
        timestamp: rowData[0],
        electrician: rowData[1],
        shift: rowData[2],
        equipment_status
      }
    });

  } catch (error) {
    if (error.code === 404) {
      return res.status(404).json({
        success: false,
        message: 'Google Sheet not found. Please check SPREADSHEET_ID',
        code: 'SHEET_NOT_FOUND'
      });
    }

    if (error.code === 403) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied. Please check service account permissions',
        code: 'PERMISSION_DENIED'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to submit maintenance log',
      error: error.message
    });
  }
});

/**
 * GET - Get all maintenance logs from Google Sheets
 * @route GET /api/maintenance-log?date=YYYY-MM-DD&shift=A
 */
router.get('/', async (req, res) => {
  try {
    const { date, shift, limit = 50 } = req.query;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:P`,
    });

    const rows = response.data.values || [];
    
    if (rows.length === 0) {
      return res.json({
        success: true,
        count: 0,
        data: []
      });
    }

    // Parse rows (skip header)
    const logs = rows.slice(1).map(row => ({
      timestamp: row[0] || '',
      electrician: row[1] || '',
      shift: row[2] || '',
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
        wbsedcl_unit: row[12] || '',
        Pulverizer_Mega: row[13] || '',
        Pulverizer_Oils: row[14] || '',
        Boiler_12_Ton: row[15] || ''
      }
    }));

    // Apply filters
    let filteredLogs = logs;

    if (date) {
      filteredLogs = filteredLogs.filter(log => {
        const logDate = parseSheetDateToISO(log.timestamp);
        return logDate === date;
      });
    }

    if (shift) {
      filteredLogs = filteredLogs.filter(log => 
        log.shift.toUpperCase() === shift.toUpperCase()
      );
    }

    // Apply limit
    filteredLogs = filteredLogs.slice(0, parseInt(limit));

    res.json({
      success: true,
      count: filteredLogs.length,
      data: filteredLogs
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch maintenance logs',
      error: error.message
    });
  }
});

/**
 * GET - Check submission status for a date
 * @route GET /api/maintenance-log/status?date=YYYY-MM-DD
 */
router.get('/status', async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date parameter is required'
      });
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:C`,
    });

    const rows = response.data.values || [];

    const submissions = {};
    ['A', 'B', 'C'].forEach(shift => {
      submissions[shift] = false;
    });

    rows.slice(1).forEach(row => {
      const rowDate = parseSheetDateToISO(row[0]);
      const shift = row[2];
      if (rowDate === date && submissions.hasOwnProperty(shift)) {
        submissions[shift] = true;
      }
    });

    res.json({
      success: true,
      date,
      submissions
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to check submission status',
      error: error.message
    });
  }
});

/**
 * DELETE - Delete a maintenance log (admin only)
 * @route DELETE /api/maintenance-log/:timestamp/:shift
 */
router.delete('/:timestamp/:shift', async (req, res) => {
  try {
    const { timestamp, shift } = req.params;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:C`,
    });

    const rows = response.data.values || [];
    
    let rowIndex = -1;
    rows.forEach((row, index) => {
      if (index === 0) return; // Skip header
      const rowDate = parseSheetDateToISO(row[0]);
      if (rowDate === timestamp && row[2] === shift.toUpperCase()) {
        rowIndex = index;
      }
    });

    if (rowIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Maintenance log not found'
      });
    }

    // Delete the row (note: index + 1 because sheets are 1-indexed)
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      resource: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: 0,
                dimension: 'ROWS',
                startIndex: rowIndex,
                endIndex: rowIndex + 1
              }
            }
          }
        ]
      }
    });

    res.json({
      success: true,
      message: 'Maintenance log deleted successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete maintenance log',
      error: error.message
    });
  }
});

export default router;