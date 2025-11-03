// src/pdf-generator.js

// Import the 'getFieldValue' function to handle "Not Specified" logic
import { getFieldValue } from './utils.js';

// Get the jsPDF object from the global window object (loaded by the <script> tag)
const { jsPDF } = window.jspdf;

// --- PDF Design Constants ---
// ... (all constants are identical) ...
const MARGIN = 15;
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const LINE_HEIGHT = 6;
const SECTION_GAP = 8;
const TABLE_FIRST_COL_WIDTH = 70;
const TABLE_SECOND_COL_WIDTH = PAGE_WIDTH - MARGIN - MARGIN - TABLE_FIRST_COL_WIDTH;
const TABLE_LINE_COLOR = 220;
const TABLE_HEADER_FILL_COLOR = 240;
const CELL_PADDING = 2;

// --- Global 'y' tracker ---
let y; // Vertical position on the PDF page

// ... (checkPageBreak function is identical) ...
function checkPageBreak(doc, requiredHeight = 0) {
    if (y + requiredHeight > PAGE_HEIGHT - MARGIN) { // Check if element fits
        doc.addPage();
        y = MARGIN; // Reset y to top margin
    }
    return y;
}

/**
 * UPDATED: Adds the main header dynamically from the company object.
 * @param {jsPDF} doc - The jsPDF document instance.
 * @param {object} companyData - The company's profile object.
 */
function addPageHeader(doc, companyData) {
    y = MARGIN; // Start at the top margin
    
    // Use getFieldValue for safety
    const name = getFieldValue(companyData?.companyName);
    const street = getFieldValue(companyData?.address?.street);
    const cityStateZip = `${getFieldValue(companyData?.address?.city)}, ${getFieldValue(companyData?.address?.state)} ${getFieldValue(companyData?.address?.zip)}`;
    const phone = getFieldValue(companyData?.contact?.phone);

    // 1. Company Info (Top Left)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(name, MARGIN, y);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    y += LINE_HEIGHT * 0.8;
    doc.text(street, MARGIN, y);
    y += LINE_HEIGHT * 0.8;
    doc.text(cityStateZip, MARGIN, y);
    y += LINE_HEIGHT * 0.8;
    doc.text(phone, MARGIN, y);

    // 2. Application Status (Top Right)
    // ... (this part is identical) ...
    let tempY = MARGIN;
    const today = new Date();
    const dateStr = today.toLocaleDateString("en-US", { year: 'numeric', month: '2-digit', day: '2-digit' });
    const timeStr = today.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', hour12: true });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Application pending Final Applicant Signature", PAGE_WIDTH - MARGIN, tempY, { align: 'right' });
    
    tempY += LINE_HEIGHT * 0.8;
    doc.text(`${dateStr} - ${timeStr}`, PAGE_WIDTH - MARGIN, tempY, { align: 'right' });

    // 3. Horizontal Line
    // ... (this part is identical) ...
    y += LINE_HEIGHT;
    doc.setDrawColor(TABLE_LINE_COLOR);
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
    y += SECTION_GAP;
}

// ... (addTableHeader function is identical) ...
function addTableHeader(doc, title) {
    y = checkPageBreak(doc, LINE_HEIGHT * 1.5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.setFillColor(TABLE_HEADER_FILL_COLOR);
    doc.setDrawColor(TABLE_LINE_COLOR);
    doc.rect(MARGIN, y, TABLE_FIRST_COL_WIDTH + TABLE_SECOND_COL_WIDTH, LINE_HEIGHT * 1.5, 'FD');
    doc.text(title, MARGIN + CELL_PADDING, y + (LINE_HEIGHT * 1.5) / 2 + 1.5);
    y += LINE_HEIGHT * 1.5;
}

// ... (addTableRow function is identical) ...
function addTableRow(doc, key, value) {
    const displayValue = getFieldValue(value);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const keyLines = doc.splitTextToSize(key, TABLE_FIRST_COL_WIDTH - (CELL_PADDING * 2));
    const valueLines = doc.splitTextToSize(displayValue, TABLE_SECOND_COL_WIDTH - (CELL_PADDING * 2));
    const lineCount = Math.max(keyLines.length, valueLines.length);
    const rowHeight = lineCount * (LINE_HEIGHT * 0.9) + (CELL_PADDING * 2);
    y = checkPageBreak(doc, rowHeight);
    doc.setDrawColor(TABLE_LINE_COLOR);
    doc.rect(MARGIN, y, TABLE_FIRST_COL_WIDTH, rowHeight);
    doc.rect(MARGIN + TABLE_FIRST_COL_WIDTH, y, TABLE_SECOND_COL_WIDTH, rowHeight);
    const textY = y + rowHeight / 2 - (lineCount * (LINE_HEIGHT * 0.9)) / 2 + (LINE_HEIGHT * 0.9) - (CELL_PADDING / 2);
    doc.setTextColor(0, 0, 0);
    doc.text(keyLines, MARGIN + CELL_PADDING, textY);
    doc.text(valueLines, MARGIN + TABLE_FIRST_COL_WIDTH + CELL_PADDING, textY);
    y += rowHeight;
}

// ... (addAgreementHeader function is identical) ...
function addAgreementHeader(doc, title) {
    y = checkPageBreak(doc, LINE_HEIGHT * 1.5);
    y += SECTION_GAP;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(title, MARGIN, y);
    y += LINE_HEIGHT * 1.5;
}

// ... (addFullWidthText function is identical) ...
function addFullWidthText(doc, text) {
    y = checkPageBreak(doc);
    const textWidth = PAGE_WIDTH - MARGIN * 2;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    const splitText = doc.splitTextToSize(text.trim(), textWidth);
    doc.text(splitText, MARGIN, y);
    const numLines = Array.isArray(splitText) ? splitText.length : 1;
    y += (numLines * (LINE_HEIGHT * 0.8)) + (LINE_HEIGHT * 0.5);
}

// ... (addSignatureBlock function is identical) ...
function addSignatureBlock(doc, applicantData) {
    y = checkPageBreak(doc, 30);
    y += LINE_HEIGHT;
    const sigDate = getFieldValue(applicantData['signature-date']);
    const sigImgBase64 = applicantData.signature;
    const sigDateX = MARGIN + 100;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Signed date:", sigDateX, y);
    doc.setFont("helvetica", "normal");
    doc.text(sigDate, sigDateX + 25, y);
    if (sigImgBase64) {
        try {
            doc.addImage(sigImgBase64, 'PNG', PAGE_WIDTH - MARGIN - 80, y + LINE_HEIGHT, 80, 20);
            y += 25;
        } catch (e) {
            console.error("Error adding signature image to PDF:", e);
            doc.text("(Signature image error)", sigDateX, y + LINE_HEIGHT);
            y += LINE_HEIGHT * 2;
        }
    } else {
        doc.text("Not Specified", sigDateX, y + LINE_HEIGHT);
        y += LINE_HEIGHT * 2;
    }
}


/**
 * UPDATED: Main PDF Generation Function
 * Now receives and uses the 'company' object.
 * @param {object} pdfData - Contains applicant, agreements, and company data.
 */
export function generateApplicationPDF(pdfData) {
    const { applicant, agreements, company } = pdfData;
    
    // Fallback if company data is missing (shouldn't happen)
    const companyProfile = company || { 
        companyName: "[COMPANY NAME NOT FOUND]", 
        address: {}, 
        contact: {} 
    };
    
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // --- Page Header ---
    addPageHeader(doc, companyProfile); // Pass the company data

    // --- Section 1: Personal Information ---
    addTableHeader(doc, "Personal information");
    // ... (rest of table rows are identical) ...
    addTableRow(doc, "First name:", applicant['first-name']);
    addTableRow(doc, "Middle name:", applicant['middle-name']);
    addTableRow(doc, "Last name:", applicant['last-name']);
    addTableRow(doc, "Suffix:", applicant['suffix']);
    addTableRow(doc, "Email:", applicant.email);
    addTableRow(doc, "Phone:", applicant.phone);
    addTableRow(doc, "Date of Birth:", applicant.dob);
    const maskedSSN = applicant.ssn ? `***-**-${applicant.ssn.slice(-4)}` : null;
    addTableRow(doc, "SSN (Masked):", maskedSSN);

    // --- Section 2: Address ---
    addTableHeader(doc, "Address");
    // ... (rest of table rows are identical) ...
    const street = `${getFieldValue(applicant.street)}${applicant['street-2'] ? `, ${applicant['street-2']}` : ''}`;
    addTableRow(doc, "Street:", street);
    addTableRow(doc, "City:", applicant.city);
    addTableRow(doc, "State:", applicant.state);
    addTableRow(doc, "ZIP Code:", applicant.zip);

    // --- Section 3: Qualification information ---
    addTableHeader(doc, "Qualification information");
    // ... (rest of table rows are identical) ...
    addTableRow(doc, "CDL Number:", applicant['cdl-number']);
    addTableRow(doc, "CDL State:", applicant['cdl-state']);
    addTableRow(doc, "CDL Class:", applicant['cdl-class']);
    addTableRow(doc, "CDL Expiration:", applicant['cdl-exp']);
    const endorsements = applicant['endorsements-details'] || (applicant['endorsements-radio'] === 'no' ? 'None' : null);
    addTableRow(doc, "Endorsements:", endorsements);

    // --- Section 4: Custom Application Questions (Placeholders) ---
    addTableHeader(doc, "Custom Application Questions");
    // ... (rest of table rows are identical) ...
    addTableRow(doc, "Emergency Contact Name:", applicant['emergency_contact_name']);
    addTableRow(doc, "Emergency Contact Phone:", applicant['emergency_contact_phone']);
    addTableRow(doc, "Total hours worked (7 days):", applicant['hours_last_7_days']);
    addTableRow(doc, "Last relieved from work:", applicant['last_relieved_date']);

    // --- Section 5: Agreements & Signatures ---
    agreements.forEach(agreement => {
        // ... (this loop is identical, but 'agreement.text' is now dynamic) ...
        y = checkPageBreak(doc, 40);
        addAgreementHeader(doc, agreement.title);
        addFullWidthText(doc, agreement.text);
        addSignatureBlock(doc, applicant);
    });

    // --- Save the PDF ---
    doc.save(`Application-${getFieldValue(applicant['last-name'])}-${getFieldValue(applicant['first-name'])}.pdf`);
}

