// src/hooks/useBulkImport.js
import { useState } from 'react';
import * as XLSX from 'xlsx';
import { formatPhoneNumber, normalizePhone } from '../utils/helpers';

export function useBulkImport() {
  const [csvData, setCsvData] = useState([]);
  const [processingSheet, setProcessingSheet] = useState(false);
  const [step, setStep] = useState('upload'); // upload, preview, success
  const [importMethod, setImportMethod] = useState('file'); // 'file' or 'gsheet'
  const [sheetUrl, setSheetUrl] = useState('');

  // --- Helper: Parse ArrayBuffer to JSON ---
  const parseBuffer = (buffer) => {
    try {
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        if (jsonData.length === 0) {
            alert("File appears empty.");
            return;
        }

        // Dynamic Key Finder (UPDATED to be less strict)
        // Now checks if the column header INCLUDES the keyword (e.g., "Phone Number" includes "phone")
        const findKey = (row, keywords) => {
            const rowKeys = Object.keys(row);
            return rowKeys.find(k => keywords.some(keyword => k.toLowerCase().includes(keyword)));
        };

        const parsedRows = jsonData.map((row, index) => {
            // 1. Identify Columns
            const firstKey = findKey(row, ['firstname', 'first name', 'fname', 'first', 'given']);
            const lastKey = findKey(row, ['lastname', 'last name', 'lname', 'last', 'surname']);
            // Fallback for Full Name
            const fullNameKey = findKey(row, ['fullname', 'full name', 'name', 'driver name', 'driver']);
            
            const emailKey = findKey(row, ['email', 'e-mail', 'mail']);
            const phoneKey = findKey(row, ['phone', 'mobile', 'cell', 'contact']);
            const typeKey = findKey(row, ['type', 'role', 'position', 'driver type']);
            const expKey = findKey(row, ['experience', 'exp', 'years']);
            const cityKey = findKey(row, ['city', 'location']);
            const stateKey = findKey(row, ['state', 'province']);

            // Helper to clean string values
            const safeVal = (val) => (val === undefined || val === null) ? '' : String(val).trim();

            // 2. Extract Names (Smart Split Logic UPDATED)
            let fName = firstKey ? safeVal(row[firstKey]) : '';
            let lName = lastKey ? safeVal(row[lastKey]) : '';

            // If First/Last are empty, try to split Full Name
            if ((!fName || !lName) && fullNameKey) {
                const fullName = safeVal(row[fullNameKey]);
                if (fullName) {
                    // Check for "Last, First" format (comma detection)
                    if (fullName.includes(',')) {
                        const parts = fullName.split(',').map(p => p.trim());
                        lName = parts[0]; // First part is Last Name
                        if (parts.length > 1) {
                            fName = parts[1]; // Second part is First Name
                        }
                    } else {
                        // Standard "First Last" format
                        const parts = fullName.split(' ').filter(p => p !== '');
                        if (parts.length > 0) {
                            fName = parts[0]; 
                            if (parts.length > 1) {
                                lName = parts.slice(1).join(' '); 
                            } else {
                                lName = 'Driver'; 
                            }
                        }
                    }
                }
            }

            // Final Fallbacks
            if (!fName) fName = 'Unknown';
            if (!lName) lName = 'Driver';

            // 3. Phone Standardization
            // We use the new helpers here to ensure data is clean BEFORE it enters the app state
            const rawPhone = phoneKey ? safeVal(row[phoneKey]) : '';
            
            // Standardize format for display/storage: (XXX) XXX-XXXX
            const formattedPhone = formatPhoneNumber(rawPhone);
            
            // Standardize digits for matching: XXXXXXXXXX
            const normPhone = normalizePhone(rawPhone);

            // 4. Driver Type
            let typeVal = typeKey ? safeVal(row[typeKey]) : '';
            if (!typeVal || typeVal.toLowerCase() === 'undefined') typeVal = 'unidentified';

            const record = {
                firstName: fName,
                lastName: lName,
                email: emailKey ? safeVal(row[emailKey]) : '',
                phone: formattedPhone, // Store the pretty version
                normalizedPhone: normPhone, // Store the clean version for logic
                driverType: typeVal,
                experience: expKey ? safeVal(row[expKey]) : '',
                city: cityKey ? safeVal(row[cityKey]) : '',
                state: stateKey ? safeVal(row[stateKey]) : '',
                isEmailPlaceholder: false
            };

            // Generate placeholder email if missing (required for DB indexing/uniqueness logic later)
            if (!record.email) {
                record.email = `no_email_${Date.now()}_${index}@placeholder.com`;
                record.isEmailPlaceholder = true;
            }

            // Valid row check: Must have either an Email (real or placeholder) OR a Phone number to be worth importing
            if (record.email || record.phone) return record;
            return null;
        }).filter(r => r !== null);

        // Client-side Deduplication (Within the file itself)
        const uniqueRows = [];
        const seenEmails = new Set();
        const seenPhones = new Set();

        parsedRows.forEach(row => {
            const hasEmail = !row.isEmailPlaceholder && seenEmails.has(row.email.toLowerCase());
            // Use the normalized phone for duplicate checking
            const hasPhone = row.normalizedPhone && seenPhones.has(row.normalizedPhone);
            
            if (!hasEmail && !hasPhone) {
                if (!row.isEmailPlaceholder) seenEmails.add(row.email.toLowerCase());
                if (row.normalizedPhone) seenPhones.add(row.normalizedPhone);
                uniqueRows.push(row);
            }
        });

        setCsvData(uniqueRows);
        setStep('preview');

    } catch (error) {
        console.error("Parse Error:", error);
        alert("Error reading file: " + error.message);
    }
  };

  // --- Handler: File Input ---
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCsvData([]);
    const reader = new FileReader();
    reader.onload = (event) => parseBuffer(event.target.result);
    reader.readAsArrayBuffer(file);
    e.target.value = ''; 
  };

  // --- Handler: Google Sheet ---
  const handleSheetImport = async () => {
    if (!sheetUrl) return alert("Please enter a Google Sheet URL.");
    const matches = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!matches || !matches[1]) return alert("Invalid Google Sheet URL.");
    
    const sheetId = matches[1];
    const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

    setProcessingSheet(true);
    try {
        const response = await fetch(exportUrl);
        if (!response.ok) throw new Error("Failed to fetch sheet. Check permissions (Anyone with link).");
        const arrayBuffer = await response.arrayBuffer();
        parseBuffer(arrayBuffer);
    } catch (error) {
        console.error("Sheet Error:", error);
        alert("Error importing sheet: " + error.message);
    } finally {
        setProcessingSheet(false);
    }
  };

  const reset = () => {
      setCsvData([]);
      setStep('upload');
      setSheetUrl('');
  };

  return {
      csvData,
      step, setStep,
      importMethod, setImportMethod,
      sheetUrl, setSheetUrl,
      processingSheet,
      handleFileChange,
      handleSheetImport,
      reset
  };
}