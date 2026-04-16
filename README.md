# 🏥 HRD System — Vercel Hybrid Deployment Guide

ระบบ HRD รพ.สันทราย แบบ **Hybrid**: Frontend บน Vercel + Backend ยังเป็น Google Apps Script

---

## 📁 โครงสร้างไฟล์

```
hrd-vercel/
├── public/
│   └── index.html          ← Frontend (แก้ google.script.run → fetch แล้ว)
├── Code_ADDON.gs           ← โค้ดเพิ่มสำหรับ GAS (HTTP dispatcher)
├── vercel.json             ← Vercel config
└── README.md               ← ไฟล์นี้
```

---

## 🔧 ขั้นตอนทั้งหมด (ทำตามลำดับ)

### STEP 1 — อัปเดต GAS Backend

1. เปิด **Google Apps Script Editor** ของโปรเจกต์นี้
2. คลิก **"+"** (New file) → เลือก **Script** → ตั้งชื่อ `HttpDispatcher`
3. วาง code จากไฟล์ `Code_ADDON.gs` ลงไปทั้งหมด
4. กด **Save** (Ctrl+S)

> ⚠️ **หมายเหตุ**: ไฟล์ `Code_ADDON.gs` มีฟังก์ชัน `doPost` ใหม่ที่รองรับทั้ง LINE Webhook เดิม และ HTTP API call จาก Vercel  
> ฟังก์ชัน `doPost` เดิมใน `Code.gs` ต้อง **ลบออก** หรือ **rename เป็นชื่ออื่น** เพื่อไม่ให้ conflict

### STEP 2 — Deploy GAS เป็น Web App

1. ใน Apps Script Editor คลิก **Deploy** → **New deployment**
2. เลือก Type: **Web app**
3. ตั้งค่า:
   - **Execute as**: `Me (your-email@...)`
   - **Who has access**: `Anyone` (จำเป็น เพราะ Vercel ต้องเรียกโดยไม่มี Google session)
4. คลิก **Deploy** → **Allow** permissions
5. **Copy URL** ที่ได้ (รูปแบบ: `https://script.google.com/macros/s/XXXX.../exec`)

### STEP 3 — ใส่ GAS URL ใน index.html

เปิดไฟล์ `public/index.html` ค้นหาบรรทัดนี้:

```javascript
const GAS_URL = 'YOUR_GAS_URL';
```

แก้เป็น URL ที่ได้จาก STEP 2:

```javascript
const GAS_URL = 'https://script.google.com/macros/s/AKfycbXXXXXXXXXX/exec';
```

### STEP 4 — Deploy บน Vercel

#### วิธีที่ 1: ผ่าน GitHub (แนะนำ)

```bash
# 1. สร้าง GitHub repo ใหม่ แล้ว push ไฟล์ทั้งหมด
git init
git add .
git commit -m "HRD System - Vercel Hybrid"
git remote add origin https://github.com/YOUR_USERNAME/hrd-system.git
git push -u origin main

# 2. ไปที่ vercel.com → Import Project → เลือก repo นี้
# 3. Vercel จะ detect vercel.json อัตโนมัติ
# 4. คลิก Deploy
```

#### วิธีที่ 2: ผ่าน Vercel CLI

```bash
# ติดตั้ง Vercel CLI (ถ้ายังไม่มี)
npm i -g vercel

# Deploy
cd hrd-vercel
vercel

# Follow prompts:
# - Set up and deploy? Y
# - Which scope? (เลือก account ของคุณ)
# - Link to existing project? N
# - Project name: hrd-santisai (หรือชื่ออะไรก็ได้)
# - In which directory is your code located? ./
```

#### วิธีที่ 3: ลาก & วาง (ง่ายสุด ไม่ต้องมี Git)

1. ไปที่ [vercel.com/new](https://vercel.com/new)
2. เลื่อนลงหา **"Deploy without Git"**
3. ลากโฟลเดอร์ `hrd-vercel` ทั้งโฟลเดอร์ไปวาง
4. รอ Deploy เสร็จ → ได้ URL เช่น `hrd-santisai.vercel.app`

---

## 🔒 CORS — สิ่งที่ต้องรู้

GAS Web App มีข้อจำกัด CORS ดังนี้:
- **GET requests**: ไม่มีปัญหา (รองรับ CORS อยู่แล้ว)
- **POST requests**: GAS รองรับ `Content-Type: text/plain` โดยไม่ต้อง preflight
  - ✅ `runGAS()` ใน index.html ส่ง `Content-Type: text/plain` อยู่แล้ว — ถูกต้อง
- ❌ ห้ามเปลี่ยนเป็น `application/json` เพราะจะ trigger CORS preflight แล้ว GAS จะ reject

---

## 🧪 ทดสอบหลัง Deploy

### ทดสอบ GAS API (ใน browser console หรือ Postman)

```javascript
// ทดสอบ getAllUniqueStaffNames
fetch('https://script.google.com/macros/s/XXXX/exec', {
  method: 'POST',
  headers: { 'Content-Type': 'text/plain' },
  body: JSON.stringify({ fn: 'getAllUniqueStaffNames', args: [] })
})
.then(r => r.json())
.then(console.log);
```

### ทดสอบ login admin

```javascript
fetch('https://script.google.com/macros/s/XXXX/exec', {
  method: 'POST',
  headers: { 'Content-Type': 'text/plain' },
  body: JSON.stringify({ fn: 'adminLogin', args: ['YOUR_ADMIN_PASSWORD'] })
})
.then(r => r.json())
.then(console.log);
// ควรได้: { success: true, token: "uuid..." }
```

---

## ❓ FAQ / Troubleshooting

### "Function not allowed" error
→ ตรวจสอบว่าชื่อฟังก์ชันอยู่ใน `ALLOWED` object ใน `Code_ADDON.gs`

### CORS error ใน browser
→ ตรวจสอบว่า fetch ใช้ `Content-Type: text/plain` (ไม่ใช่ `application/json`)

### "Google Apps Script is not loaded" หรือ "กรุณาตั้งค่า GAS_URL"
→ ยังไม่ได้ใส่ GAS URL ใน `index.html` — ดู STEP 3

### ข้อมูลไม่อัปเดต / ยังเห็นข้อมูลเก่า
→ GAS Web App cache responses — กด **Deploy → New deployment** (version ใหม่) เพื่อ clear cache

### GAS ตอบช้า (10-30 วินาที)
→ ปกติสำหรับ GAS cold start — ไม่ใช่ bug ของ Vercel

---

## 📋 GAS Functions ที่เปิดผ่าน HTTP API

| Function | ใช้งานที่ |
|---|---|
| `adminLogin` | หน้า Login Admin |
| `getAllUniqueStaffNames` | Autocomplete ชื่อพนักงาน |
| `searchStaffByName` | ค้นหาพนักงาน |
| `getPersonalData` | ข้อมูลส่วนตัว |
| `getFilteredDashboard` | Dashboard |
| `getGroupSummary` | สรุปกลุ่ม |
| `getRecentFromRegistrations` | รายการล่าสุด |
| `saveRegistration` | บันทึกการลงทะเบียน |
| `saveTrainingRequest` | บันทึกคำขออบรม |
| `getAllTrainingData` | ดูข้อมูลอบรมทั้งหมด |
| `updateTrainingRequest` | แก้ไขข้อมูลอบรม |
| `deleteDriveFile` | ลบไฟล์จาก Drive |
| `backfillFileUrls` | เติม URL ไฟล์เก่า |
| `getRecentRecords` | รายการล่าสุด |
| `getEmployeeLineData` | ข้อมูล LINE พนักงาน |
| `saveEmployeeLineData` | บันทึก LINE ID |
| `addManualEmployee` | เพิ่มพนักงานใหม่ |
| `sendDocReminderManual` | ส่งแจ้งเตือน |
| `exportPersonalSelectedToWord` | Export Word ส่วนตัว |
| `exportDashboardToWord` | Export Word Dashboard |
| `getLogoImage` | โลโก้โรงพยาบาล |
| `trackLinkClick` | นับการคลิก |
| `getLinkViews` | ดูจำนวนคลิก |

---

## 🔄 การอัปเดตในอนาคต

- **แก้ Frontend** (`index.html`): แก้แล้ว git push → Vercel deploy อัตโนมัติ
- **แก้ Backend** (`Code.gs`): แก้แล้ว Deploy → New deployment ใน GAS
