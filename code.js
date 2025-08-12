/*******************************
* Creative Asset Tracker & Approvals
* Author: Tushar Bansal
* Date: 2025-08-11
*******************************/

const SHEET_NAME = "Sheet1";
const APPROVAL_PENDING = "Pending";
const REMINDER_HOURS = 24;

// MAIN: Send daily reminders
function sendDailyReminders() {
  const sheet = getTargetSheet();
  if (!sheet) return;

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    console.log("⚠ No data found in sheet.");
    return;
  }

  const now = new Date();

  for (let i = 1; i < data.length; i++) {
    const [
      assetName, version, owner, uploadedDate,
      approvalStatus, approverEmail, lastReminder, notes
    ] = data[i];

    if (approvalStatus === APPROVAL_PENDING && approverEmail) {
      let sendReminder = false;

      if (!lastReminder) {
        sendReminder = true;
      } else {
        const lastReminderDate = new Date(lastReminder);
        const hoursSince = (now - lastReminderDate) / (1000 * 60 * 60);
        if (hoursSince >= REMINDER_HOURS) {
          sendReminder = true;
        }
      }

      if (sendReminder) {
        sendApprovalEmail(assetName, version, approverEmail);
        sheet.getRange(i + 1, 7).setValue(new Date());
        console.log(`✅ Reminder sent for: ${assetName} (${version})`);
      }
    }
  }
}

// Send approval request email
function sendApprovalEmail(assetName, version, approverEmail) {
  const approvalLink = SpreadsheetApp.getActiveSpreadsheet().getUrl();
  const subject = `Approval Needed: ${assetName} (${version})`;
  const body = `Dear Approver,\n\nPlease review and approve the asset:\nAsset: ${assetName}\nVersion: ${version}\n\nClick here to approve:\n${approvalLink}\n\nThank you.`;

  MailApp.sendEmail(approverEmail, subject, body);
}

// Trigger on any edit
function onEdit(e) {
  if (!e || !e.range) {
    console.warn("⚠ onEdit triggered without event object — likely run manually.");
    return;
  }

  const sheet = e.range.getSheet();
  if (sheet.getName() !== SHEET_NAME) return;

  const row = e.range.getRow();
  const col = e.range.getColumn();

  const statusCol = 5;
  const approverEmailCol = 6;

  const assetName = sheet.getRange(row, 1).getValue();
  const version = sheet.getRange(row, 2).getValue();
  const owner = sheet.getRange(row, 3).getValue();
  const approvalLink = SpreadsheetApp.getActiveSpreadsheet().getUrl();

  // Notify when Approval Status changes
  if (col === statusCol) {
    const status = e.range.getValue();

    if (status === APPROVAL_PENDING) {
      const approverEmail = sheet.getRange(row, approverEmailCol).getValue();
      if (approverEmail) {
        sendApprovalEmail(assetName, version, approverEmail);
      }
    } else if (status === "Approved") {
      const ownerEmail = findOwnerEmail(owner);
      if (ownerEmail) {
        MailApp.sendEmail(
          ownerEmail,
          `✅ Asset Approved: ${assetName}`,
          `Your asset "${assetName}" has been approved.\n\nView it here:\n${approvalLink}`
        );
      }
    }
  }

  // 📌 NEW: Notify owner on any other edit in their row
  if (col !== statusCol) {
    const ownerEmail = findOwnerEmail(owner);
    if (ownerEmail) {
      MailApp.sendEmail(
        ownerEmail,
        `✏ Asset Updated: ${assetName}`,
        `The details of your asset "${assetName}" have been updated.\n\nView the changes here:\n${approvalLink}`
      );
    }
  }
}

// Helper: Find owner email
function findOwnerEmail(ownerName) {
  const ownerMap = {
    "Tushar Bansal": "tusharbansal3366@gmail.com",
    "John Smith": "john@example.com",
    "Sarah Jones": "sarah@example.com",
    "Rahul Mehta": "rahul@example.com"
  };
  return ownerMap[ownerName] || null;
}

// Helper: Get sheet
function getTargetSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SHEET_NAME) || null;
}

// Setup function
function setupSheet() {
  let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(SHEET_NAME);

  const headers = [
    "Asset Name",
    "Version",
    "Owner",
    "Uploaded Date",
    "Approval Status",
    "Approver Email",
    "Last Reminder Sent",
    "Notes"
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  const sampleRow = [
    "Test Asset 1",
    "v1.0",
    "Tushar Bansal",
    new Date(),
    "Pending",
    "tusharbansal3366@gmail.com",
    "",
    "This is a test row for reminders"
  ];
  sheet.getRange(2, 1, 1, sampleRow.length).setValues([sampleRow]);
}

// 📌 Make spreadsheet public (optional)
function makeSpreadsheetPublic() {
  const file = DriveApp.getFileById(SpreadsheetApp.getActiveSpreadsheet().getId());
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT);
  Logger.log("✅ Spreadsheet is now public with edit access.");
}
