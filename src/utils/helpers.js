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
 * Formats a phone number string into (XXX) XXX-XXXX format.
 * Handles inputs like +11234567890, 1234567890, 123-456-7890, etc.
 */
export function formatPhoneNumber(phone) {
    if (!phone) return "Not Specified";

    // 1. Convert to string and strip all non-numeric characters
    const cleaned = ('' + phone).replace(/\D/g, '');

    // 2. Check for standard 10 digit match
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
        return `(${match[1]}) ${match[2]}-${match[3]}`;
    }

    // 3. Check for 11 digit match (if it starts with 1)
    const match11 = cleaned.match(/^1(\d{3})(\d{3})(\d{4})$/);
    if (match11) {
        return `(${match11[1]}) ${match11[2]}-${match11[3]}`;
    }

    // 4. Return original if it doesn't look like a standard US number
    return phone;
}

/**
 * Strips a phone number to raw digits for database searching/comparison.
 * e.g. "(123) 456-7890" -> "1234567890"
 * e.g. "+1 123 456 7890" -> "1234567890"
 */
export function normalizePhone(phone) {
    if (!phone) return "";
    let cleaned = ('' + phone).replace(/\D/g, '');
    
    // Remove leading '1' if 11 digits (US Country code)
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
        cleaned = cleaned.substring(1);
    }
    return cleaned;
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