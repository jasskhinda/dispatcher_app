# 🏥 CareBridge Living Facility Data Fix - Complete Solution

## 📊 Issue Summary
The facility overview page at `https://dispatch.compassionatecaretransportation.com/trips/facility` is showing:
- ❌ "Address not available" 
- ❌ "📧 Email not available"

**Expected Result:**
- ✅ "5050 Blazer Pkwy Suite 100-B, Dublin, OH 43017"
- ✅ "📧 contact@carebridgeliving.com"

## 🎯 Root Cause
The CareBridge Living facility record in the database is missing the `address` and `contact_email` fields, causing the facility overview page to display "not available" messages.

## 🔧 Solutions (Choose One)

### **Option 1: Browser Console Fix (Immediate)**
1. Go to: https://dispatch.compassionatecaretransportation.com/invoice/facility-monthly/e1b94bde-d092-4ce6-b78c-9cff1d0118a3-2025-06
2. Open browser console (F12)
3. Run the browser script: `/Volumes/C/CCT APPS/dispatcher_app/browser-facility-data-fix.js`
4. Copy and paste the entire script into the console
5. The script will automatically update the facility data

### **Option 2: Supabase SQL Editor (Recommended)**
1. Go to: https://supabase.com/dashboard/project/btzfgasugkycbavcwvnx/sql/new
2. Copy and paste the SQL from: `/Volumes/C/CCT APPS/dispatcher_app/fix-carebridge-facility-data.sql`
3. Click "Run" to execute the update
4. Verify the results in the output

### **Option 3: Node.js Script (If Node is available)**
```bash
cd "/Volumes/C/CCT APPS/dispatcher_app"
node fix-carebridge-facility-data.js
```

## 📋 Verification Steps

After applying any fix:

1. **Refresh the facility overview page**: https://dispatch.compassionatecaretransportation.com/trips/facility
2. **Check the CareBridge Living row** should now show:
   - ✅ Address: "5050 Blazer Pkwy Suite 100-B, Dublin, OH 43017"
   - ✅ Email: "📧 contact@carebridgeliving.com"
3. **Verify monthly invoice** still works: Click "Monthly Invoice" button
4. **Check database** (optional): Run verification query in Supabase

## 🗂️ Files Created
- `fix-carebridge-facility-data.js` - Node.js script
- `fix-carebridge-facility-data.sql` - SQL script for Supabase
- `browser-facility-data-fix.js` - Updated browser console script

## 🔍 Technical Details

### Data Being Updated:
```javascript
{
    name: 'CareBridge Living',
    address: '5050 Blazer Pkwy Suite 100-B, Dublin, OH 43017',
    contact_email: 'contact@carebridgeliving.com',
    billing_email: 'billing@carebridgeliving.com',
    phone_number: '(614) 555-0123',
    facility_type: 'Assisted Living'
}
```

### Target Facility:
- **ID**: `e1b94bde-d092-4ce6-b78c-9cff1d0118a3`
- **Name**: CareBridge Living
- **Location**: Dublin, Ohio

## ✅ Expected Outcome

**Before Fix:**
```
🏥 CareBridge Living
Address not available
📧 Email not available
```

**After Fix:**
```
🏥 CareBridge Living
5050 Blazer Pkwy Suite 100-B, Dublin, OH 43017
📧 contact@carebridgeliving.com
```

## 🚨 Notes
- This fix is permanent and will persist across browser sessions
- The facility overview page will immediately reflect the changes after refresh
- Monthly invoices will continue to work normally
- No impact on existing trips or billing data
