/*
 * TradeEase – Google Apps Script Backend
 *
 * SETUP:
 *   1. Open Google Sheets and create a new blank spreadsheet.
 *   2. Go to Extensions > Apps Script.
 *   3. Delete any existing code and paste this entire file.
 *   4. Click Deploy > New deployment.
 *   5. Select type: Web app.
 *   6. Set "Execute as": Me.
 *   7. Set "Who has access": Anyone.
 *   8. Click Deploy and authorize when prompted.
 *   9. Copy the Web app URL and paste it into TradeEase Settings > Google Sheets Sync URL.
 *
 * The spreadsheet will automatically get one sheet tab per data table
 * (Products, Customers, Sales_Header, Sales_Details, etc.).
 * You can view and edit data directly in the spreadsheet.
 */

var TABLES = [
  'products', 'categories', 'customers',
  'sales_header', 'sales_details', 'stock_ledger', 'settings'
];

function doGet(e) {
  var callback = e.parameter.callback || '';
  try {
    var action = (e.parameter.action || '').toLowerCase();
    var table  = (e.parameter.table  || '').toLowerCase();

    if (action === 'pull' && table) {
      return respond(pullTable(table), callback);
    }

    if (action === 'pull_all') {
      var result = {};
      TABLES.forEach(function(t) { result[t] = pullTable(t); });
      return respond(result, callback);
    }

    if (action === 'ping') {
      return respond({ ok: true, tables: TABLES }, callback);
    }

    if (action === 'verify') {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var counts = {};
      TABLES.forEach(function(t) {
        var sheet = ss.getSheetByName(t);
        counts[t] = sheet ? Math.max(0, sheet.getLastRow() - 1) : 0;
      });
      return respond({ ok: true, counts: counts }, callback);
    }

    return respond({ error: 'Unknown action' }, callback);
  } catch (err) {
    return respond({ error: err.message }, callback);
  }
}

function doPost(e) {
  try {
    var payload;
    if (e.parameter && e.parameter.payload) {
      payload = JSON.parse(e.parameter.payload);
    } else {
      payload = JSON.parse(e.postData.contents);
    }
    var action  = (payload.action || '').toLowerCase();

    if (action === 'push' && payload.table && payload.data) {
      pushTable(payload.table.toLowerCase(), payload.data);
      return respond({ ok: true, table: payload.table, rows: payload.data.length }, '');
    }

    if (action === 'push_all' && payload.data) {
      var summary = {};
      for (var t in payload.data) {
        if (payload.data.hasOwnProperty(t) && Array.isArray(payload.data[t])) {
          pushTable(t.toLowerCase(), payload.data[t]);
          summary[t] = payload.data[t].length;
        }
      }
      return respond({ ok: true, tables: summary }, '');
    }

    return respond({ error: 'Unknown action. POST { action: "push", table: "name", data: [...] } or { action: "push_all", data: {...} }' }, '');
  } catch (err) {
    return respond({ error: err.message }, '');
  }
}

function pullTable(tableName) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(tableName);
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  var headers = data[0];
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var row = {};
    for (var j = 0; j < headers.length; j++) {
      var val = data[i][j];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      }
      row[headers[j]] = val;
    }
    rows.push(row);
  }
  return rows;
}

function pushTable(tableName, rows) {
  if (!rows || rows.length === 0) return;

  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(tableName);

  if (!sheet) {
    sheet = ss.insertSheet(tableName);
  } else {
    sheet.clear();
  }

  var headers = Object.keys(rows[0]);
  var output  = [headers];

  rows.forEach(function(row) {
    var r = [];
    headers.forEach(function(h) {
      var v = row[h];
      if (v === null || v === undefined) v = '';
      r.push(v);
    });
    output.push(r);
  });

  sheet.getRange(1, 1, output.length, headers.length).setValues(output);

  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#1e3a5f');
  headerRange.setFontColor('#ffffff');

  sheet.setFrozenRows(1);

  try {
    sheet.autoResizeColumns(1, headers.length);
  } catch(e) {}
}

function respond(data, callback) {
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + JSON.stringify(data) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
