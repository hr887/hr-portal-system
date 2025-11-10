// src/utils/pdfGenerator.js
import { jsPDF } from "jspdf";
import { getFieldValue } from './helpers.js';

// --- PDF Design Constants ---
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

function checkPageBreak(doc, requiredHeight = 0) {
    if (y + requiredHeight > PAGE_HEIGHT - MARGIN) { // Check if element fits
        doc.addPage();
        y = MARGIN; // Reset y to top margin
    }
    return y;
}

function addPageHeader(doc, companyData) {
    y = MARGIN; // Start at the top margin
    
    const name = getFieldValue(companyData?.companyName);
    const street = getFieldValue(companyData?.address?.street);
    const cityStateZip = `${getFieldValue(companyData?.address?.city)}, ${getFieldValue(companyData?.address?.state)} ${getFieldValue(companyData?.address?.zip)}`;
    const phone = getFieldValue(companyData?.contact?.phone);
    
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

    let tempY = MARGIN;
    const today = new Date();
    const dateStr = today.toLocaleDateString("en-US", { year: 'numeric', month: '2-digit', day: '2-digit' });
    const timeStr = today.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', hour12: true });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Application pending Final Applicant Signature", PAGE_WIDTH - MARGIN, tempY, { align: 'right' });
    
    tempY += LINE_HEIGHT * 0.8;
    doc.text(`${dateStr} - ${timeStr}`, PAGE_WIDTH - MARGIN, tempY, { align: 'right' });
    
    y += LINE_HEIGHT;
    doc.setDrawColor(TABLE_LINE_COLOR);
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
    y += SECTION_GAP;
}

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

function addAgreementHeader(doc, title, companyName = "") {
    y = checkPageBreak(doc, LINE_HEIGHT * 2.5);
    y += SECTION_GAP;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);

    const textWidth = PAGE_WIDTH - MARGIN * 2; 

    if (companyName) {
        const companyLines = doc.splitTextToSize(companyName, textWidth);
        doc.text(companyLines, MARGIN, y);
        y += (companyLines.length * (LINE_HEIGHT * 0.9));
    }

    const titleLines = doc.splitTextToSize(title, textWidth);
    doc.text(titleLines, MARGIN, y);
    y += (titleLines.length * (LINE_HEIGHT * 0.9)) + (LINE_HEIGHT * 0.5);
}

function addFullWidthText(doc, text) {
    y = checkPageBreak(doc, 10); // Check for at least 10mm
    const textWidth = PAGE_WIDTH - MARGIN * 2;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    
    const paragraphs = text.split('\n'); // Split by newlines
    
    for (const paragraph of paragraphs) {
        const trimmedParagraph = paragraph.trim();
        if (trimmedParagraph.length === 0) {
            y += (LINE_HEIGHT * 0.5); // Add space for empty lines
            continue;
        }
        
        const splitText = doc.splitTextToSize(trimmedParagraph, textWidth);
        const requiredHeight = (Array.isArray(splitText) ? splitText.length : 1) * (LINE_HEIGHT * 0.8) + (LINE_HEIGHT * 0.5);
        y = checkPageBreak(doc, requiredHeight); // Check if this paragraph fits

        doc.text(splitText, MARGIN, y);
        const numLines = Array.isArray(splitText) ? splitText.length : 1;
        y += (numLines * (LINE_HEIGHT * 0.8)) + (LINE_HEIGHT * 0.5);
    }
}

function addSignatureBlock(doc, applicantData) {
    y = checkPageBreak(doc, 30);
    y += LINE_HEIGHT * 2; // More space before signature
    
    const sigDate = getFieldValue(applicantData['signature-date']);
    const sigImgBase64 = applicantData.signature;
    const name = `${getFieldValue(applicantData['firstName'])} ${getFieldValue(applicantData['lastName'])}`;

    // This console.log is for debugging the missing signature/date
    console.log("PDF Generator received: Date:", sigDate, "Signature:", sigImgBase64);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    
    doc.setFont("helvetica", "bold");
    doc.text(name, MARGIN, y);
    y += LINE_HEIGHT * 0.8;
    
    doc.setFont("helvetica", "normal");
    doc.text(getFieldValue(applicantData.street), MARGIN, y);
    y += LINE_HEIGHT * 0.8;
    doc.text(`${getFieldValue(applicantData.city)}, ${getFieldValue(applicantData.state)}, ${getFieldValue(applicantData.zip)}`, MARGIN, y);
    y += LINE_HEIGHT * 0.8;
    doc.text(getFieldValue(applicantData.phone), MARGIN, y);
    y += LINE_HEIGHT * 0.8;
    if (applicantData.ssn) {
        doc.text(`SSN: ***-**-${applicantData.ssn.slice(-4)}`, MARGIN, y);
    }
    
    // Date and Signature
    const sigDateX = MARGIN + 100;
    let dateY = y - (LINE_HEIGHT * 0.8 * (applicantData.ssn ? 4 : 3)); // Align date with name
    
    doc.setFont("helvetica", "bold");
    doc.text("Signed date:", sigDateX, dateY);
    doc.setFont("helvetica", "normal");
    doc.text(sigDate, sigDateX + 25, dateY);
    dateY += LINE_HEIGHT;

    if (sigImgBase64) {
        try {
            doc.addImage(sigImgBase64, 'PNG', PAGE_WIDTH - MARGIN - 80, dateY, 80, 20);
        } catch (e) {
            console.error("Error adding signature image to PDF:", e);
            doc.text("(Signature image error)", sigDateX, dateY);
        }
    } else {
        doc.text("Not Signed", sigDateX, dateY);
    }
    
    y += LINE_HEIGHT * 2; // Advance y past the signature block
}

// --- UPDATED FUNCTION ---
function addHosTable(doc, data) {
    y = checkPageBreak(doc, 20);
    const tableX = MARGIN;
    const rowHeight = LINE_HEIGHT;
    const colWidth = (PAGE_WIDTH - (MARGIN * 2)) / 7;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    
    // Header
    let currentX = tableX;
    for (let i = 1; i <= 7; i++) {
        // --- THIS IS THE FIX ---
        // These settings must be applied *inside* the loop
        // because doc.rect() can reset the fill/text color.
        doc.setDrawColor(TABLE_LINE_COLOR);
        doc.setFillColor(TABLE_HEADER_FILL_COLOR);
        doc.setTextColor(0, 0, 0); // Black text
        // --- END FIX ---

        doc.rect(currentX, y, colWidth, rowHeight, 'FD'); // 'FD' = Fill and Draw
        doc.text(`Day ${i}`, currentX + colWidth / 2, y + rowHeight * 0.7, { align: 'center' });
        currentX += colWidth;
    }
    y += rowHeight;

    // Body
    currentX = tableX;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0); // Set text color for the body cells
    for (let i = 1; i <= 7; i++) {
        const val = getFieldValue(data['hosDay' + i]);
        doc.setDrawColor(TABLE_LINE_COLOR); // Set draw color for the cell border
        doc.rect(currentX, y, colWidth, rowHeight, 'S'); // 'S' = Stroke (border only)
        doc.text(String(val), currentX + colWidth / 2, y + rowHeight * 0.7, { align: 'center' });
        currentX += colWidth;
    }
    y += rowHeight + SECTION_GAP;
}


/**
 * Main PDF Generation Function
 * @param {object} pdfData - Contains applicant, agreements, and company data.
 */
export function generateApplicationPDF(pdfData) {
    const { applicant, agreements, company } = pdfData;
    
    const companyProfile = company || { 
        companyName: "[COMPANY NAME NOT FOUND]", 
        address: {}, 
        contact: {} 
    };
    const companyName = companyProfile.companyName || "[COMPANY NAME]";
    const applicantName = `${getFieldValue(applicant['firstName'])} ${getFieldValue(applicant['lastName'])}`;
    
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // --- Page Header ---
    addPageHeader(doc, companyProfile);

    // --- Section 1: Personal Information (Step 1) ---
    addTableHeader(doc, "Personal Information");
    addTableRow(doc, "First Name:", applicant['firstName']);
    addTableRow(doc, "Middle Name:", applicant['middleName']);
    addTableRow(doc, "Last Name:", applicant['lastName']);
    addTableRow(doc, "Suffix:", applicant['suffix']);
    addTableRow(doc, "Known by Other Name:", applicant['known-by-other-name']);
    if (applicant['known-by-other-name'] === 'yes') {
        addTableRow(doc, "Other Name(s):", applicant.otherName);
    }
    addTableRow(doc, "Social Security Number (SSN) (Masked):", applicant.ssn ? `***-**-${applicant.ssn.slice(-4)}` : null);
    addTableRow(doc, "Date of Birth:", applicant.dob);
    
    // --- Address History (Step 1 - continued) ---
    addTableHeader(doc, "Address History");
    addTableRow(doc, "Current Address 1:", applicant.street);
    addTableRow(doc, "Current City:", applicant.city);
    addTableRow(doc, "Current State:", applicant.state);
    addTableRow(doc, "Current Zip Code:", applicant.zip);
    addTableRow(doc, "Lived here 3+ Yrs:", applicant['residence-3-years']);
    if (applicant['residence-3-years'] === 'no') {
        addTableRow(doc, "Previous Address 1:", applicant.prevStreet);
        addTableRow(doc, "Previous City:", applicant.prevCity);
        addTableRow(doc, "Previous State:", applicant.prevState);
        addTableRow(doc, "Previous Zip Code:", applicant.prevZip);
    }
    addTableRow(doc, "Phone:", applicant.phone);
    addTableRow(doc, "Email:", applicant.email);
    addTableRow(doc, "SMS Consent:", applicant['sms-consent']);
    

    // --- Section 3: General Qualifications (Step 2) ---
    addTableHeader(doc, "General Qualifications");
    addTableRow(doc, "Legal to Work in U.S.:", applicant['legal-work']);
    addTableRow(doc, "English Fluency:", applicant['english-fluency']);
    addTableRow(doc, "Years of CDL Experience:", applicant['experience-years']);
    addTableRow(doc, "Drug Test History:", applicant['drug-test-positive']);
    if (applicant['drug-test-positive'] === 'yes') {
        addTableRow(doc, "Drug Test Explanation:", applicant['drug-test-explanation']);
    }
    addTableRow(doc, "DOT Return to Duty:", applicant['dot-return-to-duty']);

    // --- Section 4: License & Credentials (Step 3) ---
    addTableHeader(doc, "License & Credentials");
    addTableRow(doc, "License State:", applicant.cdlState);
    addTableRow(doc, "License Class:", applicant.cdlClass);
    addTableRow(doc, "License Number:", applicant.cdlNumber);
    addTableRow(doc, "License Expiration:", applicant.cdlExpiration);
    addTableRow(doc, "Endorsements:", applicant.endorsements || 'None');
    addTableRow(doc, "Has TWIC Card:", applicant['has-twic']);
    if (applicant['has-twic'] === 'yes') {
        addTableRow(doc, "TWIC Expiration:", applicant.twicExpiration);
    }

    // --- Section 5: Driving & Accident History (Steps 4 & 5) ---
    addTableHeader(doc, "Driving & Accident History (3 Yrs)");
    addTableRow(doc, "MVR Consent Given:", applicant['consent-mvr']);
    addTableRow(doc, "Revoked Licenses:", applicant['revoked-licenses']);
    addTableRow(doc, "Driving Convictions:", applicant['driving-convictions']);
    addTableRow(doc, "Drug/Alcohol Convictions:", applicant['drug-alcohol-convictions']);
    
    (applicant.violations || []).forEach((v, i) => {
        addTableRow(doc, `Violation #${i+1}`, `Date: ${v.date || 'N/A'}, Charge: ${v.charge || 'N/A'}, Location: ${v.location || 'N/A'}`);
    });
    
    (applicant.accidents || []).forEach((a, i) => {
        addTableRow(doc, `Accident #${i+1}`, `Date: ${a.date || 'N/A'}, Location: ${a.city}, ${a.state}, Commercial: ${a.commercial}, Preventable: ${a.preventable}`);
    });

    // --- Section 6: Work History (Step 6) ---
    addTableHeader(doc, "Work History & Education");
    (applicant.employers || []).forEach((e, i) => {
        addTableRow(doc, `Employer #${i+1}`, `Company: ${e.name || 'N/A'}, Position: ${e.position || 'N/A'}, Dates: ${e.dates || 'N/A'}, Reason: ${e.reason || 'N/A'}`);
    });
    (applicant.unemployment || []).forEach((g, i) => {
        addTableRow(doc, `Employment Gap #${i+1}`, `Start: ${g.startDate}, End: ${g.endDate}, Details: ${g.details || 'N/A'}`);
    });
    (applicant.schools || []).forEach((s, i) => {
        addTableRow(doc, `School #${i+1}`, `School: ${s.name || 'N/A'}, Dates: ${s.dates || 'N/A'}`);
    });
    (applicant.military || []).forEach((m, i) => {
        addTableRow(doc, `Military #${i+1}`, `Branch: ${m.branch || 'N/A'}, Rank: ${m.rank || 'N/A'}, Discharge: ${m.honorable}`);
    });

    // --- Section 7: Custom Questions (Step 7) ---
    addTableHeader(doc, "Custom Questions & HOS");
    addTableRow(doc, "Owner-Operator EIN:", applicant.ein);
    addTableRow(doc, "Business Name:", applicant.businessName);
    addTableRow(doc, "Driver Initials:", applicant.driverInitials);
    addTableRow(doc, "Exp. Straight Truck / Miles:", `${getFieldValue(applicant.expStraightTruckExp)} / ${getFieldValue(applicant.expStraightTruckMiles)}`);
    addTableRow(doc, "Exp. Semi Trailer / Miles:", `${getFieldValue(applicant.expSemiTrailerExp)} / ${getFieldValue(applicant.expSemiTrailerMiles)}`);
    addTableRow(doc, "Exp. Two Trailers / Miles:", `${getFieldValue(applicant.expTwoTrailersExp)} / ${getFieldValue(applicant.expTwoTrailersMiles)}`);
    addTableRow(doc, "Contact #1 Name:", applicant.ec1Name);
    addTableRow(doc, "Contact #1 Phone:", applicant.ec1Phone);
    addTableRow(doc, "Contact #1 Relationship:", applicant.ec1Relationship);
    addTableRow(doc, "Contact #1 Address:", applicant.ec1Address);
    addTableRow(doc, "Contact #2 Name:", applicant.ec2Name);
    addTableRow(doc, "Contact #2 Phone:", applicant.ec2Phone);
    addTableRow(doc, "Contact #2 Relationship:", applicant.ec2Relationship);
    addTableRow(doc, "Contact #2 Address:", applicant.ec2Address);
    addTableRow(doc, "Felony Conviction:", applicant['has-felony']);
    if (applicant['has-felony'] === 'yes') {
        addTableRow(doc, "Felony Explanation:", applicant.felonyExplanation);
    }
    addTableRow(doc, "Last Relieved Date:", applicant.lastRelievedDate);
    addTableRow(doc, "Last Relieved Time:", applicant.lastRelievedTime);
    
    // HOS Table
    y += SECTION_GAP;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Total hours worked during the immediately preceding 7 days:", MARGIN, y);
    y += LINE_HEIGHT;
    addHosTable(doc, applicant);
    
    
    // --- Section 8: Agreements & Signatures (from PDF sample) ---
    
    doc.addPage();
    y = MARGIN;
    
    // Agreement 1: Electronic Transaction
    addAgreementHeader(doc, "AGREEMENT TO CONDUCT TRANSACTION ELECTRONICALLY", companyName);
    addFullWidthText(doc, `This electronic transaction service is provided on behalf of ${companyName} (the "Employer"). The Employer is requesting that we - Driver Reach - provide legal documents, notices, and disclosures electronically and that we obtain your signature to legal agreements, authorizations, and other documents electronically.
    
    Scope of Agreement. You are agreeing:
    • To receive notices electronically, including legal notices, disclosures, copies of consumer reports, summaries of rights, correspondence regarding your application for employment and your background check, correspondence relating to any disputes, pre-adverse action and adverse action letters, and any other documents pertaining to the employment application and background check processes;
    • To authorize inquiries into your application for employment and for the conducting of background checks;
    • To abide by Terms of Service required by DriverReach for use of its Platform and Site (as those terms are defined in the Terms of Service);
    • To provide electronic signatures over the course of your interaction with and use of the DriverReach Platform and electronic transaction services;
    • To conduct transactions with the Employer, its background screening vendors, and Driver Reach electronically.
    
    By proceeding forward and signing this Agreement, you are agreeing that (i) you have reviewed the consumer disclosure information above and (ii) you consent to (a) transact business with the Employer, its background screening vendors, and DriverReach using electronic communications, (b) receive notices and disclosures electronically, and (c) utilize electronic signatures in lieu of using paper documents.
    
    You are not required to receive notices and disclosures electronically or sign documents electronically. If you do not wish to transact business electronically, you must close this browser window and notify the Employer that you do not wish to use the DriverReach electronic transaction service.
    
    Withdrawal of Consent. You may withdraw your consent at any time to conduct transactions electronically or to receive electronic documents, notices or disclosures. In order to withdraw consent, you must notify the Employer that you wish to withdraw consent and receive all future documents, notices, and disclosures in paper format.
    `);
    addSignatureBlock(doc, applicant);

    // Agreement 2: Background Check Disclosure
    doc.addPage();
    y = MARGIN;
    addAgreementHeader(doc, "DISCLOSURE AND AUTHORIZATION FOR BACKGROUND INVESTIGATION", companyName);
    addFullWidthText(doc, `In connection with your application for employment with ${companyName} (the "Company") you understand a consumer report and/or investigative consumer report may be requested by the Company about you for employment purposes.
    
    These reports (also known as "background check reports") may contain information about your character, general reputation, personal characteristics, and mode of living, whichever are applicable, and may include information obtained through personal interviews with neighbors, friends, or associates of yours. They may include the following types of information: criminal history, credit history, driving and/or motor vehicle records, public records, education or employment history, DOT drug and alcohol testing results, and medical information about your physical or mental health for purposes relevant to an employment determination, to the extent permitted by applicable law.
    
    You have a right, upon written request made within a reasonable period of time after receipt of this disclosure, to be provided a disclosure of the nature and scope of the investigation requested. Such request should be made in writing to the Company.
    `);
    addSignatureBlock(doc, applicant);
    
    // Agreement 3: Background Check Acknowledgement
    doc.addPage();
    y = MARGIN;
    addAgreementHeader(doc, "ACKNOWLEDGEMENT AND AUTHORIZATION FOR BACKGROUND CHECK", companyName);
    addFullWidthText(doc, `I acknowledge receipt of the separate document entitled DISCLOSURE REGARDING BACKGROUND INVESTIGATION and A SUMMARY OF YOUR RIGHTS UNDER THE FAIR CREDIT REPORTING ACT (which can be found here) and certify that I have read and understand both of those documents. By my signature below, I consent to the release of consumer reports and investigative consumer reports prepared by a consumer reporting agency to the Prospective Employer and DriverReach Customer, (the "Company") and its designated representatives and agents.
    
    I understand that if the Company hires me, my consent will apply, and the Company may obtain reports, throughout my employment.
    
    By my signature below, I authorize law enforcement agencies, learning institutions (including public and private schools and universities), information service bureaus, credit bureaus, record/data repositories, courts (federal, state and local), motor vehicle records agencies, my past or present employers, the military, and other individuals and sources to furnish any and all information on me that is requested by the consumer reporting agency.
    
    I agree that this Disclosure and Authorization form in original, faxed, photocopied or electronic (including electronically signed) form, will be valid for any reports that may be requested by or on behalf of the Company.
    `);
    addSignatureBlock(doc, applicant);
    
    // Agreement 4: PSP Disclosure
    doc.addPage();
    y = MARGIN;
    addAgreementHeader(doc, "IMPORTANT DISCLOSURE REGARDING BACKGROUND REPORTS FROM THE PSP Online Service", companyName);
    addFullWidthText(doc, `In connection with your application for employment with ${companyName}, ("Prospective Employer"), Prospective Employer, its employees, agents or contractors may obtain one or more reports regarding your driving, and safety inspection history from the Federal Motor Carrier Safety Administration (FMCSA).
    
    When the application for employment is submitted... (and so on, full text from sample PDF)
    `);
    addAgreementHeader(doc, "AUTHORIZATION");
    addFullWidthText(doc, `I authorize ${companyName} ("Prospective Employer") to access the FMCSA Pre-Employment Screening Program (PSP) system to seek information regarding my commercial driving safety record and information regarding my safety inspection history.
    
    I understand that I am authorizing the release of safety performance information including crash data from the previous five (5) years and inspection history from the previous three (3) years. I understand and acknowledge that this release of information may assist the Prospective Employer to make a determination regarding my suitability as an employee.
    
    I further understand that neither the Prospective Employer nor the FMCSA contractor supplying the crash and safety information has the capability to correct any safety data that appears to be incorrect. I understand I may challenge the accuracy of the data... (and so on, full text from sample PDF)
    `);
    addSignatureBlock(doc, applicant);
    
    // Agreement 5: Final Certification
    doc.addPage();
    y = MARGIN;
    addAgreementHeader(doc, "TO BE READ AND SIGNED BY APPLICANT", companyName);
    addFullWidthText(doc, `I certify that I have read and understand all of the employment application. I certify that I completed this application and that all of the information I supply in this application packet is a full and complete statement of facts and contains no material omissions.
    
    It is understood that if any falsification is discovered, it will constitute grounds for rejection of application for employment or, if hired, dismissal from employment upon discovery thereof.
    
    I authorize you to make such investigations and inquiries of my personal, employment, financial or medical history and other related matters as may be necessary in arriving at an employment decision. I hereby release ${companyName}, employers, schools, health care providers and other persons from all liability in responding to inquiries and releasing information in connectionwith my application.
    
    I understand that information I provide regarding current and/or previous employers may be used, and those employer(s) will be contacted, for the purpose of investigating my safety performance history as required by 49 CFR 391.23(d) and (e).
    `);
    addSignatureBlock(doc, applicant);
    
    // Agreement 6: Clearinghouse
    doc.addPage();
    y = MARGIN;
    addAgreementHeader(doc, "GENERAL CONSENT FOR LIMITED QUERIES OF THE FMCSA DRUG AND ALCOHOL CLEARINGHOUSE", companyName);
    addFullWidthText(doc, `I, ${applicantName}, hereby provide consent to ${companyName} to conduct a limited query of the FMCSA Commercial Driver's License Drug and Alcohol Clearinghouse (Clearinghouse) to determine whether drug or alcohol violation information about me exists in the Clearinghouse.
    
    This limited query may be conducted by ${companyName} on a periodic basis throughout my employment and no less than at least once a year.
    
    I understand that if the limited query... (and so on, full text from sample PDF)
    `);
    addSignatureBlock(doc, applicant);
    
    
    // --- ADD THIS CODE BLOCK TO CREATE THE FOOTER ---
    const pageCount = doc.internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i); // Go to page 'i'
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100); // Set a light gray color
        
        // Add text to the bottom-left
        // PAGE_HEIGHT is 297mm. This places text 10mm from the bottom.
        doc.text(applicantName, MARGIN, PAGE_HEIGHT - 10);
    }
    // --- END NEW CODE BLOCK ---
    
    // --- Save the PDF ---
    doc.save(`Application-${getFieldValue(applicant['lastName'])}-${getFieldValue(applicant['firstName'])}.pdf`);
}