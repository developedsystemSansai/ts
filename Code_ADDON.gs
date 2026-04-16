// ============================================================
// === 🌐 HTTP DISPATCHER — เพิ่มไฟล์นี้เข้า GAS Project ===
// === หรือ copy ฟังก์ชัน doPost_HTTP และ _cors ไปแทนที่ doPost เดิม ===
// ============================================================
//
// วิธีใช้:
//   1. เปิด Apps Script Editor
//   2. สร้างไฟล์ใหม่ชื่อ "HttpDispatcher.gs" แล้ว paste โค้ดนี้
//      -หรือ- copy เฉพาะฟังก์ชัน doPost ด้านล่าง ไปแทน doPost เดิมในไฟล์ Code.gs
//   3. Deploy → New version
//   4. ใช้ Web App URL ใส่ใน index.html ช่อง GAS_URL
//
// ⚠️  doPost เดิมรองรับแค่ LINE Webhook — ฟังก์ชันใหม่นี้รองรับทั้งสองอย่าง

// ============================================================
// === CORS helper ===
// ============================================================
function _corsOutput(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// === doPost — HTTP API dispatcher (แทนที่ doPost เดิม) ===
// ============================================================
function doPost(e) {
  // ── ถ้าเป็น LINE Webhook (มี events array) → ส่งต่อ handler เดิม ──
  try {
    var body = JSON.parse(e.postData.contents);

    // LINE Webhook มี body.events เสมอ
    if (body.events !== undefined) {
      return _handleLineWebhook(body);
    }

    // ── HRD API call จาก Vercel frontend ──
    return _handleApiCall(body);

  } catch (err) {
    return _corsOutput({ success: false, message: 'Parse error: ' + err.toString() });
  }
}

// ============================================================
// === LINE Webhook handler (โค้ดเดิมที่ doPost เดิมทำ) ===
// ============================================================
function _handleLineWebhook(body) {
  var out = ContentService
    .createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
  try {
    var events = body.events || [];
    events.forEach(function(ev) {
      if (!ev.source || !ev.source.userId) return;
      Logger.log('📥 Webhook: type=' + ev.type + ' userId=' + ev.source.userId);
      if (ev.type !== 'follow') return;
      if (ev.replyToken) {
        _lineReply(ev.replyToken, {
          type: 'text',
          text: '🏥 ระบบแจ้งเตือน HRD โรงพยาบาลสันทราย\n' +
                '━━━━━━━━━━━━━━━━━━━━\n' +
                '🆔 LINE User ID ของคุณ:\n' +
                ev.source.userId + '\n' +
                '━━━━━━━━━━━━━━━━━━━━\n' +
                '📝 กรุณาแจ้ง User ID นี้ให้เจ้าหน้าที่ HRD\n' +
                'เพื่อลงทะเบียนรับการแจ้งเตือนในระบบ\n' +
                '━━━━━━━━━━━━━━━━━━━━\n' +
                'ขอบคุณที่ใช้บริการ 🙏'
        });
      }
    });
  } catch(err) {
    Logger.log('❌ LINE Webhook error: ' + err);
  }
  return out;
}

// ============================================================
// === API Call dispatcher ===
// ============================================================
function _handleApiCall(body) {
  var fn   = body.fn;    // ชื่อฟังก์ชัน
  var args = body.args || []; // arguments array

  Logger.log('🌐 API call: fn=' + fn + ' args=' + JSON.stringify(args).substring(0, 200));

  // whitelist ฟังก์ชันที่อนุญาตให้เรียกจากภายนอก
  var ALLOWED = {
    // Auth
    'adminLogin'                : adminLogin,
    'login'                     : login,

    // Registration
    'saveRegistration'          : saveRegistration,
    'getRecentFromRegistrations': getRecentFromRegistrations,

    // Staff / Employee
    'getAllUniqueStaffNames'     : getAllUniqueStaffNames,
    'searchStaffByName'         : searchStaffByName,
    'getPersonalData'           : getPersonalData,
    'getEmployeeLineData'       : getEmployeeLineData,
    'saveEmployeeLineData'      : saveEmployeeLineData,
    'addManualEmployee'         : addManualEmployee,

    // Dashboard / Summary
    'getFilteredDashboard'      : getFilteredDashboard,
    'getGroupSummary'           : getGroupSummary,

    // Training Requests (HRD tab)
    'saveTrainingRequest'       : saveTrainingRequest,
    'getAllTrainingData'         : getAllTrainingData,
    'updateTrainingRequest'     : updateTrainingRequest,
    'deleteDriveFile'           : deleteDriveFile,
    'backfillFileUrls'          : backfillFileUrls,
    'getRecentRecords'          : getRecentRecords,

    // Export
    'exportPersonalSelectedToWord': exportPersonalSelectedToWord,
    'exportDashboardToWord'     : exportDashboardToWord,

    // Notifications
    'sendDocReminderManual'     : sendDocReminderManual,

    // Misc
    'getLogoImage'              : getLogoImage,
    'trackLinkClick'            : trackLinkClick,
    'getLinkViews'              : getLinkViews,
  };

  if (!fn || !ALLOWED[fn]) {
    Logger.log('❌ Unauthorized function: ' + fn);
    return _corsOutput({ success: false, message: 'Function not allowed: ' + fn });
  }

  try {
    var result = ALLOWED[fn].apply(null, args);
    return _corsOutput(result !== undefined ? result : { success: true });
  } catch (err) {
    Logger.log('❌ API error [' + fn + ']: ' + err.toString());
    return _corsOutput({ success: false, message: err.toString() });
  }
}
