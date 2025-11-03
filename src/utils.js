// src/utils.js

/**
 * Returns a "Not Specified" string if the value is empty, otherwise returns the value.
 * This implements your request for "Not Specified" fields.
 * @param {string} value - The value to check.
 * @returns {string} - The value or "Not Specified".
 */
export function getFieldValue(value) {
    if (value === null || value === undefined || value === "") {
        return "Not Specified";
    }
    return value;
}

/**
 * Returns Tailwind classes for the application status.
 * @param {string} status - The application status.
 * @returns {string} - Tailwind CSS classes.
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

/**
 * Helper function to create HTML for a field in the modal.
 * It now uses getFieldValue() to show "Not Specified".
 * @param {string} label - The field label.
 * @param {string} value - The field value.
 * @returns {string} - The HTML string for the field.
 */
export function field(label, value) {
    const displayValue = getFieldValue(value);
    const val = (displayValue === "Not Specified") 
        ? `<span class="text-gray-400 italic">${displayValue}</span>` 
        : displayValue;
        
    return `<div class="py-2 sm:grid sm:grid-cols-3 sm:gap-4"><dt class="text-sm font-medium text-gray-500">${label}</dt><dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">${val}</dd></div>`;
}

/**
 * Helper function to create an HTML link for an uploaded file.
 * @param {string} url - The download URL of the file.
 * @param {string} label - The label for the link.
 * @param {string} fileName - The name of the file.
 * @returns {string} - The HTML string for the link.
 */
export function createFileLink(url, label, fileName) {
    const fName = getFieldValue(fileName);
    if (url) {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline font-medium">${label} (${fName}) &rarr;</a>`;
    }
    return `<span class="text-gray-500">${label} (${fName === "Not Specified" ? "File not available" : fName})</span>`;
}

