// ============================================================
//  ระบบส่งอัดท่อ และ รับเข้าสำเร็จ — Google Apps Script API Backend
//  Google Sheet ID: 17P5h9MaiRrJpklQb7osAtvHdzrJ1xkqaf8T63kUkOeE
//  ===========================================================
//  System 'Tank' (ส่งอัดท่อ):
//  Sheet Tank:        InvDeliveryID | Date | image
//  Sheet Detail_Tank: Date | InvDeliveryID | Product | Qty
//
//  System 'Recripte' (รับเข้าสำเร็จ):
//  Sheet Recripte_Tank:        InvoiceID | Date | image
//  Sheet Recripte_Detail_Tank: Date | InvoiceID | Product | Qty
// ============================================================

const SPREADSHEET_ID = '17P5h9MaiRrJpklQb7osAtvHdzrJ1xkqaf8T63kUkOeE';
const TANK_SHEET     = 'Tank';
const DETAIL_SHEET   = 'Detail_Tank';
const RECRIPTE_SHEET = 'Recripte_Tank';
const RECRIPTE_DETAIL_SHEET = 'Recripte_Detail_Tank';

// ------------------------------------------------------------------
// HELPER — Get target sheet names based on system
// ------------------------------------------------------------------
function getSheetInfo(system) {
  if (system === 'Recripte') {
    return { main: RECRIPTE_SHEET, detail: RECRIPTE_DETAIL_SHEET, idHeader: 'InvoiceID', prefix: 'REC_' };
  }
  return { main: TANK_SHEET, detail: DETAIL_SHEET, idHeader: 'InvDeliveryID', prefix: 'INV_' };
}

// ------------------------------------------------------------------
// HELPER — Get sheet or create it with headers if it doesn't exist
// ------------------------------------------------------------------
function getOrCreateSheet(ss, sheetName) {
  let sheet = ss.getSheetByName(sheetName);
  if (sheet) return sheet;

  // Auto-create the sheet with correct headers
  sheet = ss.insertSheet(sheetName);
  if (sheetName === TANK_SHEET) {
    sheet.appendRow(['InvDeliveryID', 'Date', 'image']);
  } else if (sheetName === DETAIL_SHEET) {
    sheet.appendRow(['Date', 'InvDeliveryID', 'Product', 'Qty']);
  } else if (sheetName === RECRIPTE_SHEET) {
    sheet.appendRow(['InvoiceID', 'Date', 'image']);
  } else if (sheetName === RECRIPTE_DETAIL_SHEET) {
    sheet.appendRow(['Date', 'InvoiceID', 'Product', 'Qty']);
  }
  return sheet;
}

// ------------------------------------------------------------------
// doGet — Handle GET requests (read operations)
// ------------------------------------------------------------------
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || '';
  const system = (e && e.parameter && e.parameter.system) || 'Tank';
  let result;

  try {
    switch (action) {
      case 'getAllData':
        result = {
          tankMain: getTankList('', '', 'Tank'),
          tankDetail: getDetailList('', 'Tank'),
          recMain: getTankList('', '', 'Recripte'),
          recDetail: getDetailList('', 'Recripte')
        };
        break;
      case 'getTankList':
        result = getTankList(e.parameter.filterDate || '', e.parameter.filterInvID || '', system);
        break;
      case 'getDetailList':
        result = getDetailList(e.parameter.invDeliveryID || '', system);
        break;
      default:
        result = { error: 'Unknown action: ' + action };
    }
  } catch (err) {
    result = { error: err.message };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ------------------------------------------------------------------
// doPost — Handle POST requests (write / delete operations)
// ------------------------------------------------------------------
function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: 'Invalid JSON: ' + err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const action = data.action || '';
  const system = data.system || 'Tank';
  let result;

  try {
    switch (action) {
      case 'saveTank':
        result = saveTank(data.invDeliveryID, data.date, data.imageData || '', data.imageFilename || 'invoice.jpg', system);
        break;
      case 'saveDetails':
        result = saveDetails(data.invDeliveryID, data.date, data.details || [], system);
        break;
      case 'deleteTank':
        result = deleteTank(data.invDeliveryID, system);
        break;
      default:
        result = { error: 'Unknown action: ' + action };
    }
  } catch (err) {
    result = { error: err.message };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ------------------------------------------------------------------
// READ — Get Tank/Recripte list with optional filters
// ------------------------------------------------------------------
function getTankList(filterDate, filterInvID, system) {
  const info  = getSheetInfo(system);
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getOrCreateSheet(ss, info.main);
  const data  = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const rows = [];
  for (let i = 1; i < data.length; i++) {
    const row   = data[i];
    const invID = String(row[0] || '').trim();
    const rawDate = row[1];
    const image   = String(row[2] || '').trim();

    if (!invID) continue;

    let dateStr = '';
    if (rawDate instanceof Date) {
      dateStr = Utilities.formatDate(rawDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    } else {
      dateStr = String(rawDate || '').trim();
    }

    if (filterDate && dateStr !== filterDate) continue;
    if (filterInvID && !invID.toLowerCase().includes(filterInvID.toLowerCase())) continue;

    rows.push({ invDeliveryID: invID, date: dateStr, image: image, rowIndex: i + 1 });
  }

  return rows;
}

// ------------------------------------------------------------------
// READ — Get Detail items for a given InvDeliveryID/InvoiceID
// ------------------------------------------------------------------
function getDetailList(invDeliveryID, system) {
  const info  = getSheetInfo(system);
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getOrCreateSheet(ss, info.detail);
  const data  = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const items = [];
  for (let i = 1; i < data.length; i++) {
    const row     = data[i];
    const rawDate = row[0];
    const invID   = String(row[1] || '').trim();
    const product = String(row[2] || '').trim();
    const qty     = row[3];

    if (invDeliveryID && invID !== String(invDeliveryID).trim()) continue;

    let dateStr = '';
    if (rawDate instanceof Date) {
      dateStr = Utilities.formatDate(rawDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    } else {
      dateStr = String(rawDate || '').trim();
    }

    items.push({ date: dateStr, invDeliveryID: invID, product: product, qty: qty, rowIndex: i + 1 });
  }
  return items;
}

// ------------------------------------------------------------------
// CREATE / UPDATE — Save Main header (upsert by ID)
// ------------------------------------------------------------------
function saveTank(invDeliveryID, date, imageData, imageFilename, system) {
  const info  = getSheetInfo(system);
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getOrCreateSheet(ss, info.main);
  const data  = sheet.getDataRange().getValues();

  // Upload image to Drive if provided
  let imageUrl = '';
  if (imageData && imageData.length > 100) {
    imageUrl = uploadImageToDrive(imageData, imageFilename || 'invoice.jpg', invDeliveryID, info.prefix);
  }

  // Find existing row
  let existingRow = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(invDeliveryID).trim()) {
      existingRow = i + 1;
      break;
    }
  }

  if (existingRow > 0) {
    sheet.getRange(existingRow, 1).setValue(invDeliveryID);
    sheet.getRange(existingRow, 2).setValue(new Date(date));
    if (imageUrl) sheet.getRange(existingRow, 3).setValue(imageUrl);
  } else {
    sheet.appendRow([invDeliveryID, new Date(date), imageUrl]);
  }

  return { success: true, invDeliveryID: invDeliveryID, imageUrl: imageUrl };
}

// ------------------------------------------------------------------
// CREATE / UPDATE — Save Detail items (replace all for ID)
// ------------------------------------------------------------------
function saveDetails(invDeliveryID, date, details, system) {
  const info  = getSheetInfo(system);
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getOrCreateSheet(ss, info.detail);
  const data  = sheet.getDataRange().getValues();

  // Delete existing detail rows for this InvDeliveryID/InvoiceID (bottom-up)
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][1]).trim() === String(invDeliveryID).trim()) {
      sheet.deleteRow(i + 1);
    }
  }

  // Insert new rows
  for (const d of details) {
    if (d.qty !== '' && d.qty !== null && d.qty !== undefined) {
      sheet.appendRow([new Date(date), invDeliveryID, d.product, Number(d.qty)]);
    }
  }

  return { success: true };
}

// ------------------------------------------------------------------
// DELETE — Remove Tank header and all related Detail rows
// ------------------------------------------------------------------
function deleteTank(invDeliveryID, system) {
  const info        = getSheetInfo(system);
  const ss          = SpreadsheetApp.openById(SPREADSHEET_ID);
  const tankSheet   = getOrCreateSheet(ss, info.main);
  const detailSheet = getOrCreateSheet(ss, info.detail);

  // Delete from Main Sheet (bottom-up)
  let tankData = tankSheet.getDataRange().getValues();
  for (let i = tankData.length - 1; i >= 1; i--) {
    if (String(tankData[i][0]).trim() === String(invDeliveryID).trim()) {
      tankSheet.deleteRow(i + 1);
    }
  }

  // Delete from Detail Sheet (bottom-up)
  let detailData = detailSheet.getDataRange().getValues();
  for (let i = detailData.length - 1; i >= 1; i--) {
    if (String(detailData[i][1]).trim() === String(invDeliveryID).trim()) {
      detailSheet.deleteRow(i + 1);
    }
  }

  return { success: true };
}

// ------------------------------------------------------------------
// HELPER — Upload base64 image to Google Drive
// ------------------------------------------------------------------
function uploadImageToDrive(base64Data, filename, invDeliveryID, prefixStr) {
  // Strip data URI prefix (handles jpeg, png, webp, gif, etc.)
  const base64Clean = base64Data.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
  
  // Detect MIME type from original data
  let mimeType = 'image/jpeg';
  const mimeMatch = base64Data.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
  if (mimeMatch) mimeType = mimeMatch[1];

  const blob = Utilities.newBlob(
    Utilities.base64Decode(base64Clean),
    mimeType,
    filename
  );

  // Find or create folder
  let folder;
  const folders = DriveApp.getFoldersByName('TankInvoices');
  if (folders.hasNext()) {
    folder = folders.next();
  } else {
    folder = DriveApp.createFolder('TankInvoices');
  }

  // Delete old file with same ID and prefix if exists
  const safeName = prefixStr + invDeliveryID + '_' + filename;
  const existingFiles = folder.getFilesByName(safeName);
  while (existingFiles.hasNext()) {
    existingFiles.next().setTrashed(true);
  }

  const file = folder.createFile(blob.setName(safeName));
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return 'https://drive.google.com/uc?id=' + file.getId();
}
