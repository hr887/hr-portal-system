// src/utils/pdf/pdfSections.js
import { PDF_CONFIG, TABLE_SECOND_COL_WIDTH } from './pdfConfig';
import { checkPageBreak } from './pdfHelpers';
import { getFieldValue } from '../helpers';

export function addPageHeader(doc, companyData) {
    let y = PDF_CONFIG.MARGIN;
    
    const name = getFieldValue(companyData?.companyName);
    const street = getFieldValue(companyData?.address?.street);
    const cityStateZip = `${getFieldValue(companyData?.address?.city)}, ${getFieldValue(companyData?.address?.state)} ${getFieldValue(companyData?.address?.zip)}`;
    const phone = getFieldValue(companyData?.contact?.phone);
    
    doc.setFont(PDF_CONFIG.FONT.BOLD, "bold");
    doc.setFontSize(12);
    doc.text(name, PDF_CONFIG.MARGIN, y);
    
    doc.setFont(PDF_CONFIG.FONT.NORMAL, "normal");
    doc.setFontSize(10);
    y += PDF_CONFIG.LINE_HEIGHT * 0.8;
    doc.text(street, PDF_CONFIG.MARGIN, y);
    y += PDF_CONFIG.LINE_HEIGHT * 0.8;
    doc.text(cityStateZip, PDF_CONFIG.MARGIN, y);
    y += PDF_CONFIG.LINE_HEIGHT * 0.8;
    doc.text(phone, PDF_CONFIG.MARGIN, y);

    let tempY = PDF_CONFIG.MARGIN;
    const today = new Date();
    const dateStr = today.toLocaleDateString("en-US", { year: 'numeric', month: '2-digit', day: '2-digit' });
    const timeStr = today.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', hour12: true });

    doc.setFont(PDF_CONFIG.FONT.NORMAL, "normal");
    doc.setFontSize(10);
    doc.text("Application pending Final Applicant Signature", PDF_CONFIG.PAGE_WIDTH - PDF_CONFIG.MARGIN, tempY, { align: 'right' });
    
    tempY += PDF_CONFIG.LINE_HEIGHT * 0.8;
    doc.text(`${dateStr} - ${timeStr}`, PDF_CONFIG.PAGE_WIDTH - PDF_CONFIG.MARGIN, tempY, { align: 'right' });
    
    y += PDF_CONFIG.LINE_HEIGHT;
    doc.setDrawColor(PDF_CONFIG.TABLE_LINE_COLOR);
    doc.line(PDF_CONFIG.MARGIN, y, PDF_CONFIG.PAGE_WIDTH - PDF_CONFIG.MARGIN, y);
    
    return y + PDF_CONFIG.SECTION_GAP;
}

export function addAgreementHeader(doc, y, title, companyName = "") {
    y = checkPageBreak(doc, y, PDF_CONFIG.LINE_HEIGHT * 2.5);
    y += PDF_CONFIG.SECTION_GAP;
    doc.setFont(PDF_CONFIG.FONT.BOLD, "bold");
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);

    const textWidth = PDF_CONFIG.PAGE_WIDTH - PDF_CONFIG.MARGIN * 2; 

    if (companyName) {
        const companyLines = doc.splitTextToSize(companyName, textWidth);
        doc.text(companyLines, PDF_CONFIG.MARGIN, y);
        y += (companyLines.length * (PDF_CONFIG.LINE_HEIGHT * 0.9));
    }

    const titleLines = doc.splitTextToSize(title, textWidth);
    doc.text(titleLines, PDF_CONFIG.MARGIN, y);
    return y + (titleLines.length * (PDF_CONFIG.LINE_HEIGHT * 0.9)) + (PDF_CONFIG.LINE_HEIGHT * 0.5);
}

export function addSignatureBlock(doc, y, applicantData) {
    y = checkPageBreak(doc, y, 30);
    y += PDF_CONFIG.LINE_HEIGHT * 2;
    
    const sigDate = getFieldValue(applicantData['signature-date']);
    const sigImgBase64 = applicantData.signature;
    const name = `${getFieldValue(applicantData['firstName'])} ${getFieldValue(applicantData['lastName'])}`;
    
    doc.setFont(PDF_CONFIG.FONT.NORMAL, "normal");
    doc.setFontSize(10);
    
    doc.setFont(PDF_CONFIG.FONT.BOLD, "bold");
    doc.text(name, PDF_CONFIG.MARGIN, y);
    y += PDF_CONFIG.LINE_HEIGHT * 0.8;
    
    doc.setFont(PDF_CONFIG.FONT.NORMAL, "normal");
    doc.text(getFieldValue(applicantData.street), PDF_CONFIG.MARGIN, y);
    y += PDF_CONFIG.LINE_HEIGHT * 0.8;
    doc.text(`${getFieldValue(applicantData.city)}, ${getFieldValue(applicantData.state)}, ${getFieldValue(applicantData.zip)}`, PDF_CONFIG.MARGIN, y);
    y += PDF_CONFIG.LINE_HEIGHT * 0.8;
    doc.text(getFieldValue(applicantData.phone), PDF_CONFIG.MARGIN, y);
    y += PDF_CONFIG.LINE_HEIGHT * 0.8;
    if (applicantData.ssn) {
        doc.text(`SSN: ***-**-${applicantData.ssn.slice(-4)}`, PDF_CONFIG.MARGIN, y);
    }
    
    const sigDateX = PDF_CONFIG.MARGIN + 100;
    let dateY = y - (PDF_CONFIG.LINE_HEIGHT * 0.8 * (applicantData.ssn ? 4 : 3)); 
    
    doc.setFont(PDF_CONFIG.FONT.BOLD, "bold");
    doc.text("Signed date:", sigDateX, dateY);
    doc.setFont(PDF_CONFIG.FONT.NORMAL, "normal");
    doc.text(sigDate, sigDateX + 25, dateY);
    dateY += PDF_CONFIG.LINE_HEIGHT;

    if (sigImgBase64) {
        try {
            doc.addImage(sigImgBase64, 'PNG', PDF_CONFIG.PAGE_WIDTH - PDF_CONFIG.MARGIN - 80, dateY, 80, 20);
        } catch (e) {
            console.error("Error adding signature image:", e);
            doc.text("(Signature error)", sigDateX, dateY);
        }
    } else {
        doc.text("Not Signed", sigDateX, dateY);
    }
    
    return y + PDF_CONFIG.LINE_HEIGHT * 2;
}

export function addHosTable(doc, y, data) {
    y = checkPageBreak(doc, y, 20);
    const tableX = PDF_CONFIG.MARGIN;
    const rowHeight = PDF_CONFIG.LINE_HEIGHT;
    const colWidth = (PDF_CONFIG.PAGE_WIDTH - (PDF_CONFIG.MARGIN * 2)) / 7;

    doc.setFont(PDF_CONFIG.FONT.BOLD, "bold");
    doc.setFontSize(9);
    
    // Header
    let currentX = tableX;
    for (let i = 1; i <= 7; i++) {
        doc.setDrawColor(PDF_CONFIG.TABLE_LINE_COLOR);
        doc.setFillColor(PDF_CONFIG.TABLE_HEADER_FILL_COLOR);
        doc.setTextColor(0, 0, 0); 

        doc.rect(currentX, y, colWidth, rowHeight, 'FD'); 
        doc.text(`Day ${i}`, currentX + colWidth / 2, y + rowHeight * 0.7, { align: 'center' });
        currentX += colWidth;
    }
    y += rowHeight;

    // Body
    currentX = tableX;
    doc.setFont(PDF_CONFIG.FONT.NORMAL, "normal");
    doc.setTextColor(0, 0, 0); 
    for (let i = 1; i <= 7; i++) {
        const val = getFieldValue(data['hosDay' + i]);
        doc.setDrawColor(PDF_CONFIG.TABLE_LINE_COLOR); 
        doc.rect(currentX, y, colWidth, rowHeight, 'S'); 
        doc.text(String(val), currentX + colWidth / 2, y + rowHeight * 0.7, { align: 'center' });
        currentX += colWidth;
    }
    return y + rowHeight + PDF_CONFIG.SECTION_GAP;
}