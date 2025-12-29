// config.js
// import dotenv from 'dotenv';
// dotenv.config();

// export const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
// export const SHEET_NAME = 'Sheet1';
// export const GOOGLE_APPLICATION_CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS;
// config.js
import dotenv from "dotenv";
dotenv.config();

export const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
export const SHEET_NAME = "Sheet1";

// Parse JSON credentials safely
export const GOOGLE_CREDENTIALS = process.env.GOOGLE_CREDENTIALS_JSON
  ? JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON)
  : null;
