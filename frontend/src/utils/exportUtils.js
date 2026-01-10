import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Extend jsPDF prototype with autoTable if not already extended
if (typeof jsPDF !== 'undefined' && typeof jsPDF.API !== 'undefined') {
  if (!jsPDF.API.autoTable && typeof autoTable === 'function') {
    // If autoTable is a function, attach it to jsPDF prototype
    jsPDF.API.autoTable = autoTable;
  }
}

/**
 * Export data to PDF
 * @param {Array} data - Array of objects to export
 * @param {Array} columns - Array of column definitions [{key, header, format?}]
 * @param {String} title - Title for the PDF
 * @param {String} filename - Filename for the PDF
 */
export const exportToPDF = (data, columns, title, filename = 'export') => {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(16);
  doc.text(title, 14, 15);
  
  // Add date
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);
  
  // Prepare table data
  const tableData = data.map(row => {
    return columns.map(col => {
      let value = row[col.key];
      
      // Format the value if formatter is provided
      if (col.format && typeof col.format === 'function') {
        value = col.format(value, row);
      } else if (value === null || value === undefined) {
        value = '-';
      } else if (typeof value === 'object') {
        value = JSON.stringify(value);
      } else if (typeof value === 'boolean') {
        value = value ? 'Yes' : 'No';
      }
      
      return value;
    });
  });
  
  // Get column headers
  const headers = columns.map(col => col.header);
  
  // Add table - use autoTable function directly if available
  if (typeof autoTable === 'function') {
    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: 28,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 28 }
    });
  } else if (typeof doc.autoTable === 'function') {
    // Fallback to prototype method if available
    doc.autoTable({
      head: [headers],
      body: tableData,
      startY: 28,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 28 }
    });
  } else {
    console.error('autoTable is not available. Please check jspdf-autotable import.');
    throw new Error('PDF export failed: autoTable function not available');
  }
  
  // Save the PDF
  doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
};

/**
 * Export data to Excel
 * @param {Array} data - Array of objects to export
 * @param {Array} columns - Array of column definitions [{key, header, format?}]
 * @param {String} sheetName - Name for the Excel sheet
 * @param {String} filename - Filename for the Excel file
 */
export const exportToExcel = (data, columns, sheetName = 'Sheet1', filename = 'export') => {
  // Prepare data for Excel
  const excelData = data.map(row => {
    const excelRow = {};
    columns.forEach(col => {
      let value = row[col.key];
      
      // Format the value if formatter is provided
      if (col.format && typeof col.format === 'function') {
        value = col.format(value, row);
      } else if (value === null || value === undefined) {
        value = '';
      } else if (typeof value === 'object') {
        value = JSON.stringify(value);
      } else if (typeof value === 'boolean') {
        value = value ? 'Yes' : 'No';
      }
      
      excelRow[col.header] = value;
    });
    return excelRow;
  });
  
  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(excelData);
  
  // Set column widths
  const colWidths = columns.map(() => ({ wch: 20 }));
  ws['!cols'] = colWidths;
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  
  // Save the file
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

/**
 * Format currency
 */
export const formatCurrency = (amount, currency = 'USD') => {
  if (!amount && amount !== 0) return '-';
  const symbol = currency === 'LRD' ? 'LRD' : '$';
  return `${symbol}${parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Format date
 */
export const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString();
};

/**
 * Format datetime
 */
export const formatDateTime = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleString();
};

