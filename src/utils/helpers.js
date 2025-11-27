// src/utils/helpers.js

/**
 * Returns a "Not Specified" string if the value is empty, otherwise returns the value.
 */
 export function getFieldValue(value) {
    if (value === null || value === undefined || value === "") {
        return "Not Specified";
    }
    return value;
}

/**
 * Strips a phone number to raw digits for database searching/comparison.
 * e.g. "(123) 456-7890" -> "1234567890"
 * e.g. "+1 123 456 7890" -> "1234567890"
 * e.g. "1-555-0199" -> "5550199"
 */
export function normalizePhone(phone) {
    if (!phone) return "";
    
    // 1. Convert to string
    let cleaned = String(phone).trim();

    // 2. Remove all non-digit characters
    cleaned = cleaned.replace(/\D/g, '');
    
    // 3. Handle US Country Code
    // If it is 11 digits and starts with '1', remove the '1'
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
        cleaned = cleaned.substring(1);
    }

    return cleaned;
}

/**
 * Formats a phone number string into (XXX) XXX-XXXX format.
 * Uses normalizePhone internally to ensure consistency.
 */
export function formatPhoneNumber(phone) {
    if (!phone) return "Not Specified";

    // 1. Normalize first (get raw digits, no country code)
    const cleaned = normalizePhone(phone);

    // 2. Check for standard 10 digit length
    if (cleaned.length === 10) {
        const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
        if (match) {
            return `(${match[1]}) ${match[2]}-${match[3]}`;
        }
    }

    // 3. Return original/cleaned if it doesn't fit standard format
    // (e.g. international numbers or incomplete numbers)
    return phone;
}

/**
 * Returns Tailwind classes for the application status.
 */
export function getStatusColor(status) {
    switch(status) {
        case 'Approved':
            return 'bg-green-100 text-green-800';
        case 'Rejected':
            return 'bg-red-100 text-red-800';
        case 'Background Check':
            return 'bg-purple-100 text-purple-800';
        case 'Awaiting Documents':
            return 'bg-yellow-100 text-yellow-800';
        case 'Pending Review':
            return 'bg-blue-100 text-blue-800';
        case 'New Application':
        default:
            return 'bg-gray-100 text-gray-800';
    }
}

export function field(label, value) {
    const displayValue = getFieldValue(value);
    const val = (displayValue === "Not Specified") 
        ? `<span class="text-gray-400 italic">${displayValue}</span>`
        : displayValue;
    return `<div class="py-2 sm:grid sm:grid-cols-3 sm:gap-4"><dt class="text-sm font-medium text-gray-500">${label}</dt><dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">${val}</dd></div>`;
}

export function createFileLink(url, label, fileName) {
    const fName = getFieldValue(fileName);
    if (url) {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline font-medium">${label} (${fName}) &rarr;</a>`;
    }
    return `<span class="text-gray-500">${label} (${fName === "Not Specified" ? "File not available" : fName})</span>`;
}