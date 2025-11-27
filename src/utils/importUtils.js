// src/utils/importUtils.js
import * as XLSX from 'xlsx';
import { formatPhoneNumber, normalizePhone } from './helpers';

/**
 * Parses a raw ArrayBuffer (from file or network) into standardized Driver objects.
 * Handles column matching, phone formatting, and default values.
 * 
 * @param {ArrayBuffer} buffer - The raw file data.
 * @param {string} sourceLabel - The 'source' string to tag these leads with (e.g., 'Company Import').
 * @returns {Array} - Array of lead objects ready for Firestore.
 */
export const parseImportData = (buffer, sourceLabel) => {
    try {
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        if (jsonData.length === 0) {
            throw new Error("File appears empty.");
        }

        // Helper to find case-insensitive column headers
        const findKey = (row, keywords) => {
            const rowKeys = Object.keys(row);
            return rowKeys.find(k => keywords.some(keyword => k.toLowerCase().includes(keyword)));
        };

        const parsedLeads = jsonData.map((row, index) => {
            // Match common column names
            const firstKey = findKey(row, ['firstname', 'first name', 'fname', 'first', 'given']);
            const lastKey = findKey(row, ['lastname', 'last name', 'lname', 'last', 'surname']);
            const emailKey = findKey(row, ['email', 'e-mail', 'mail']);
            const phoneKey = findKey(row, ['phone', 'mobile', 'cell']);
            const typeKey = findKey(row, ['type', 'role', 'position', 'driver type']);
            const expKey = findKey(row, ['experience', 'exp', 'years']);
            const cityKey = findKey(row, ['city', 'location']);
            const stateKey = findKey(row, ['state', 'province']);

            const safeVal = (val) => (val === undefined || val === null) ? '' : String(val).trim();

            // Phone Processing
            const rawPhone = phoneKey ? safeVal(row[phoneKey]) : '';
            const formattedPhone = formatPhoneNumber(rawPhone);
            const normPhone = normalizePhone(rawPhone);

            // Driver Type Processing
            let typeVal = typeKey ? safeVal(row[typeKey]) : '';
            // Default fallback if undefined/empty
            if (!typeVal || typeVal.toLowerCase() === 'undefined') typeVal = 'unidentified';

            const lead = {
                firstName: firstKey ? safeVal(row[firstKey]) : 'Unknown',
                lastName: lastKey ? safeVal(row[lastKey]) : 'Driver',
                email: emailKey ? safeVal(row[emailKey]) : '',
                phone: formattedPhone,
                normalizedPhone: normPhone, // Important for duplicate detection
                type: typeVal,
                experience: expKey ? safeVal(row[expKey]) : '',
                city: cityKey ? safeVal(row[cityKey]) : '',
                state: stateKey ? safeVal(row[stateKey]) : '',
                status: 'New Lead',
                source: sourceLabel,
                isPlatformLead: false,
                isEmailPlaceholder: false
            };

            // Generate placeholder email if missing (required for some DB indexing strategies)
            // But check first: if NO contact info exists at all, it's likely a bad row.
            const hasOriginalContact = (emailKey && row[emailKey]) || (phoneKey && row[phoneKey]);
            
            if (!hasOriginalContact) return null;

            if (!lead.email) {
                lead.email = `no_email_${Date.now()}_${index}@placeholder.com`;
                lead.isEmailPlaceholder = true;
            }

            return lead;
        }).filter(l => l !== null);

        return parsedLeads;
    } catch (error) {
        console.error("Parser Error:", error);
        throw error;
    }
};