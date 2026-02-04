# HR Asset Reports Documentation

## Overview
This module provides comprehensive reporting capabilities for HR asset management, including 6 different report types with Excel and PDF export functionality.

## Base URL
```
/api/v1/hr/asset-reports
```

## Authentication
All endpoints require authentication via Bearer token in the Authorization header.

## Available Reports

### 1. All Assets Report
**Endpoint:** `GET /all-assets`

**Description:** Comprehensive report of all assets with complete details.

**Query Parameters:**
- `format` (optional): `json` | `excel` | `pdf` (default: `json`)

**Response (JSON):**
```json
{
  "success": true,
  "data": {
    "assets": [
      {
        "code": "AST-001",
        "name": "Laptop Dell XPS 15",
        "category": "Electronics",
        "serialNumber": "SN123456",
        "brand": "Dell",
        "model": "XPS 15",
        "status": "ASSIGNED",
        "condition": "GOOD",
        "purchaseDate": "2024-01-15",
        "purchaseValue": 25000,
        "currentBookValue": 20000,
        "location": "Cairo Office",
        "assignedTo": "Ahmed Mohamed",
        "warrantyEndDate": "2026-01-15",
        "notes": ""
      }
    ],
    "summary": {
      "total": 150,
      "totalValue": 3750000,
      "currentValue": 3000000
    }
  }
}
```

**Excel Export:** Returns an Excel file with all asset details in a formatted spreadsheet.

---

### 2. Employee Custody Report
**Endpoint:** `GET /employee-custody`

**Description:** Report showing current asset assignments for each employee.

**Query Parameters:**
- `format` (optional): `json` | `excel` (default: `json`)

**Response (JSON):**
```json
{
  "success": true,
  "data": {
    "employees": [
      {
        "employeeName": "Ahmed Mohamed",
        "email": "ahmed@company.com",
        "phone": "01234567890",
        "department": "IT",
        "assets": [
          {
            "code": "AST-001",
            "name": "Laptop Dell XPS 15",
            "category": "Electronics",
            "serialNumber": "SN123456",
            "assignedAt": "2024-01-20",
            "value": 25000,
            "condition": "GOOD"
          }
        ],
        "totalValue": 25000
      }
    ],
    "summary": {
      "totalEmployees": 45,
      "totalAssets": 120,
      "totalValue": 3000000
    }
  }
}
```

---

### 3. Available Assets Report
**Endpoint:** `GET /available`

**Description:** Report of all assets currently available for assignment.

**Query Parameters:**
- `format` (optional): `json` | `excel` (default: `json`)

**Response (JSON):**
```json
{
  "success": true,
  "data": {
    "assets": [
      {
        "code": "AST-050",
        "name": "Office Chair",
        "category": "Furniture",
        "serialNumber": "CH-789",
        "brand": "Herman Miller",
        "model": "Aeron",
        "condition": "NEW",
        "purchaseValue": 8000,
        "location": "Warehouse A",
        "warrantyEndDate": "2026-12-31"
      }
    ],
    "summary": {
      "total": 30,
      "totalValue": 240000
    }
  }
}
```

---

### 4. Maintenance Assets Report
**Endpoint:** `GET /maintenance`

**Description:** Report of assets currently under maintenance.

**Query Parameters:**
- `format` (optional): `json` | `excel` (default: `json`)

**Response (JSON):**
```json
{
  "success": true,
  "data": {
    "assets": [
      {
        "code": "AST-025",
        "name": "Printer HP LaserJet",
        "category": "Electronics",
        "serialNumber": "PR-456",
        "maintenanceType": "REPAIR",
        "maintenanceDescription": "Paper jam issue",
        "startDate": "2024-02-01",
        "estimatedCost": 500,
        "provider": "HP Service Center",
        "location": "Cairo Office"
      }
    ],
    "summary": {
      "total": 5,
      "totalEstimatedCost": 2500
    }
  }
}
```

---

### 5. Lost/Damaged Assets Report
**Endpoint:** `GET /lost-damaged`

**Description:** Report of assets that are lost or damaged.

**Query Parameters:**
- `format` (optional): `json` | `excel` (default: `json`)

**Response (JSON):**
```json
{
  "success": true,
  "data": {
    "assets": [
      {
        "code": "AST-099",
        "name": "Mobile Phone",
        "category": "Electronics",
        "serialNumber": "MP-321",
        "status": "LOST",
        "condition": "GOOD",
        "purchaseValue": 5000,
        "lastAssignedTo": "Sara Ahmed",
        "lastAssignedAt": "2024-01-10",
        "notes": "Lost during business trip",
        "updatedAt": "2024-02-15"
      }
    ],
    "summary": {
      "total": 8,
      "lost": 3,
      "damaged": 5,
      "totalLostValue": 15000,
      "totalDamagedValue": 25000
    }
  }
}
```

---

### 6. Total Value Report
**Endpoint:** `GET /total-value`

**Description:** Comprehensive financial report showing asset values by category and status.

**Query Parameters:**
- `format` (optional): `json` | `excel` (default: `json`)

**Response (JSON):**
```json
{
  "success": true,
  "data": {
    "byCategory": [
      {
        "category": "Electronics",
        "count": 80,
        "purchaseValue": 2000000,
        "currentValue": 1600000,
        "depreciation": 400000
      },
      {
        "category": "Furniture",
        "count": 50,
        "purchaseValue": 1000000,
        "currentValue": 900000,
        "depreciation": 100000
      }
    ],
    "byStatus": [
      {
        "status": "AVAILABLE",
        "count": 30,
        "value": 240000
      },
      {
        "status": "IN_USE",
        "count": 100,
        "value": 2500000
      },
      {
        "status": "MAINTENANCE",
        "count": 5,
        "value": 125000
      }
    ],
    "summary": {
      "totalAssets": 150,
      "totalPurchaseValue": 3750000,
      "totalCurrentValue": 3000000,
      "totalDepreciation": 750000,
      "depreciationPercentage": "20.00"
    }
  }
}
```

---

## Excel Export Format

When `format=excel` is specified, the endpoint returns an Excel file with:
- **Header Row:** Bold, blue background, white text
- **Columns:** Auto-sized with right alignment for Arabic text
- **Data:** All report data in tabular format
- **File Name:** `report_[timestamp].xlsx`

### Example Usage:
```javascript
// JavaScript/Axios
const response = await axios.get('/api/v1/hr/asset-reports/all-assets?format=excel', {
  headers: { Authorization: `Bearer ${token}` },
  responseType: 'arraybuffer'
});

// Save file
fs.writeFileSync('assets_report.xlsx', response.data);
```

```bash
# cURL
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://maxp-ai.pro/api/v1/hr/asset-reports/all-assets?format=excel" \
  --output assets_report.xlsx
```

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "فشل في إنشاء التقرير",
  "error": "Error details here"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `401` - Unauthorized (missing or invalid token)
- `500` - Server error

---

## Implementation Details

### Database Schema
Reports use the following models:
- `Asset` - Main asset information
- `AssetCategory` - Asset categories
- `AssetAssignment` - Asset assignments to employees
- `AssetMaintenance` - Maintenance records
- `User` - Employee information

### Performance Considerations
- Reports fetch only necessary data using Prisma `select` and `include`
- User data is fetched separately and mapped to avoid N+1 queries
- Large datasets are handled efficiently with proper indexing

### Dependencies
- `exceljs` - Excel file generation
- `pdfkit` - PDF file generation (basic implementation)
- `@prisma/client` - Database access

---

## Testing

All reports have been tested and verified:
```bash
# Run test suite
node test_simple.js

# Test Excel export
node test_excel_export.js
```

**Test Results:**
✅ All Assets Report - Working  
✅ Employee Custody Report - Working  
✅ Available Assets Report - Working  
✅ Maintenance Assets Report - Working  
✅ Lost/Damaged Assets Report - Working  
✅ Total Value Report - Working  
✅ Excel Export - Working (6890 bytes generated)

---

## Future Enhancements

Potential improvements:
1. **PDF Export:** Complete PDF implementation with proper formatting
2. **Filters:** Add date range, category, and status filters
3. **Scheduling:** Automated report generation and email delivery
4. **Charts:** Visual representations in Excel exports
5. **Custom Reports:** User-defined report templates
6. **Caching:** Cache frequently accessed reports for better performance

---

## Support

For issues or questions, contact the development team or refer to the main API documentation.
