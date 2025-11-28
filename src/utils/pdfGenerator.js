// src/utils/pdfGenerator.js
import { jsPDF } from "jspdf";
import { getFieldValue } from './helpers.js';
import { PDF_CONFIG } from './pdf/pdfConfig';
import { addTableHeader, addTableRow, addFullWidthText } from './pdf/pdfHelpers';
import { addPageHeader, addAgreementHeader, addSignatureBlock, addHosTable } from './pdf/pdfSections';

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
    let y = PDF_CONFIG.MARGIN;

    // --- Page Header ---
    y = addPageHeader(doc, companyProfile);

    // --- Section 1: Personal Information ---
    y = addTableHeader(doc, y, "Personal Information");
    y = addTableRow(doc, y, "First Name:", applicant['firstName']);
    y = addTableRow(doc, y, "Middle Name:", applicant['middleName']);
    y = addTableRow(doc, y, "Last Name:", applicant['lastName']);
    y = addTableRow(doc, y, "Suffix:", applicant['suffix']);
    y = addTableRow(doc, y, "Known by Other Name:", applicant['known-by-other-name']);
    if (applicant['known-by-other-name'] === 'yes') {
        y = addTableRow(doc, y, "Other Name(s):", applicant.otherName);
    }
    y = addTableRow(doc, y, "Social Security Number (Masked):", applicant.ssn ? `***-**-${applicant.ssn.slice(-4)}` : null);
    y = addTableRow(doc, y, "Date of Birth:", applicant.dob);
    
    // --- Address History ---
    y = addTableHeader(doc, y, "Address History");
    y = addTableRow(doc, y, "Current Address 1:", applicant.street);
    y = addTableRow(doc, y, "Current City:", applicant.city);
    y = addTableRow(doc, y, "Current State:", applicant.state);
    y = addTableRow(doc, y, "Current Zip Code:", applicant.zip);
    y = addTableRow(doc, y, "Lived here 3+ Yrs:", applicant['residence-3-years']);
    if (applicant['residence-3-years'] === 'no') {
        y = addTableRow(doc, y, "Previous Address 1:", applicant.prevStreet);
        y = addTableRow(doc, y, "Previous City:", applicant.prevCity);
        y = addTableRow(doc, y, "Previous State:", applicant.prevState);
        y = addTableRow(doc, y, "Previous Zip Code:", applicant.prevZip);
    }
    y = addTableRow(doc, y, "Phone:", applicant.phone);
    y = addTableRow(doc, y, "Email:", applicant.email);
    y = addTableRow(doc, y, "SMS Consent:", applicant['sms-consent']);
    
    // --- Section 3: General Qualifications ---
    y = addTableHeader(doc, y, "General Qualifications");
    y = addTableRow(doc, y, "Legal to Work in U.S.:", applicant['legal-work']);
    y = addTableRow(doc, y, "English Fluency:", applicant['english-fluency']);
    y = addTableRow(doc, y, "Years of CDL Experience:", applicant['experience-years']);
    y = addTableRow(doc, y, "Drug Test History:", applicant['drug-test-positive']);
    if (applicant['drug-test-positive'] === 'yes') {
        y = addTableRow(doc, y, "Drug Test Explanation:", applicant['drug-test-explanation']);
    }
    y = addTableRow(doc, y, "DOT Return to Duty:", applicant['dot-return-to-duty']);

    // --- Section 4: License & Credentials ---
    y = addTableHeader(doc, y, "License & Credentials");
    y = addTableRow(doc, y, "License State:", applicant.cdlState);
    y = addTableRow(doc, y, "License Class:", applicant.cdlClass);
    y = addTableRow(doc, y, "License Number:", applicant.cdlNumber);
    y = addTableRow(doc, y, "License Expiration:", applicant.cdlExpiration);
    y = addTableRow(doc, y, "Endorsements:", applicant.endorsements || 'None');
    y = addTableRow(doc, y, "Has TWIC Card:", applicant['has-twic']);
    if (applicant['has-twic'] === 'yes') {
        y = addTableRow(doc, y, "TWIC Expiration:", applicant.twicExpiration);
    }

    // --- Section 5: Driving & Accident History ---
    y = addTableHeader(doc, y, "Driving & Accident History (3 Yrs)");
    y = addTableRow(doc, y, "MVR Consent Given:", applicant['consent-mvr']);
    y = addTableRow(doc, y, "Revoked Licenses:", applicant['revoked-licenses']);
    y = addTableRow(doc, y, "Driving Convictions:", applicant['driving-convictions']);
    y = addTableRow(doc, y, "Drug/Alcohol Convictions:", applicant['drug-alcohol-convictions']);
    
    (applicant.violations || []).forEach((v, i) => {
        y = addTableRow(doc, y, `Violation #${i+1}`, `Date: ${v.date || 'N/A'}, Charge: ${v.charge || 'N/A'}, Location: ${v.location || 'N/A'}`);
    });
    
    (applicant.accidents || []).forEach((a, i) => {
        y = addTableRow(doc, y, `Accident #${i+1}`, `Date: ${a.date || 'N/A'}, Location: ${a.city}, ${a.state}, Commercial: ${a.commercial}, Preventable: ${a.preventable}`);
    });

    // --- Section 6: Work History ---
    y = addTableHeader(doc, y, "Work History & Education");
    (applicant.employers || []).forEach((e, i) => {
        y = addTableRow(doc, y, `Employer #${i+1}`, `Company: ${e.name || 'N/A'}, Position: ${e.position || 'N/A'}, Dates: ${e.dates || 'N/A'}, Reason: ${e.reason || 'N/A'}`);
    });
    (applicant.unemployment || []).forEach((g, i) => {
        y = addTableRow(doc, y, `Employment Gap #${i+1}`, `Start: ${g.startDate}, End: ${g.endDate}, Details: ${g.details || 'N/A'}`);
    });
    (applicant.schools || []).forEach((s, i) => {
        y = addTableRow(doc, y, `School #${i+1}`, `School: ${s.name || 'N/A'}, Dates: ${s.dates || 'N/A'}`);
    });
    (applicant.military || []).forEach((m, i) => {
        y = addTableRow(doc, y, `Military #${i+1}`, `Branch: ${m.branch || 'N/A'}, Rank: ${m.rank || 'N/A'}, Discharge: ${m.honorable}`);
    });

    // --- Section 7: Custom Questions ---
    y = addTableHeader(doc, y, "Custom Questions & HOS");
    y = addTableRow(doc, y, "Owner-Operator EIN:", applicant.ein);
    y = addTableRow(doc, y, "Business Name:", applicant.businessName);
    y = addTableRow(doc, y, "Driver Initials:", applicant.driverInitials);
    y = addTableRow(doc, y, "Exp. Straight Truck / Miles:", `${getFieldValue(applicant.expStraightTruckExp)} / ${getFieldValue(applicant.expStraightTruckMiles)}`);
    y = addTableRow(doc, y, "Exp. Semi Trailer / Miles:", `${getFieldValue(applicant.expSemiTrailerExp)} / ${getFieldValue(applicant.expSemiTrailerMiles)}`);
    y = addTableRow(doc, y, "Exp. Two Trailers / Miles:", `${getFieldValue(applicant.expTwoTrailersExp)} / ${getFieldValue(applicant.expTwoTrailersMiles)}`);
    y = addTableRow(doc, y, "Contact #1 Name:", applicant.ec1Name);
    y = addTableRow(doc, y, "Contact #1 Phone:", applicant.ec1Phone);
    y = addTableRow(doc, y, "Contact #1 Relationship:", applicant.ec1Relationship);
    y = addTableRow(doc, y, "Contact #1 Address:", applicant.ec1Address);
    y = addTableRow(doc, y, "Contact #2 Name:", applicant.ec2Name);
    y = addTableRow(doc, y, "Contact #2 Phone:", applicant.ec2Phone);
    y = addTableRow(doc, y, "Contact #2 Relationship:", applicant.ec2Relationship);
    y = addTableRow(doc, y, "Contact #2 Address:", applicant.ec2Address);
    y = addTableRow(doc, y, "Felony Conviction:", applicant['has-felony']);
    if (applicant['has-felony'] === 'yes') {
        y = addTableRow(doc, y, "Felony Explanation:", applicant.felonyExplanation);
    }
    y = addTableRow(doc, y, "Last Relieved Date:", applicant.lastRelievedDate);
    y = addTableRow(doc, y, "Last Relieved Time:", applicant.lastRelievedTime);
    
    // HOS Table
    y += PDF_CONFIG.SECTION_GAP;
    doc.setFont(PDF_CONFIG.FONT.BOLD, "bold");
    doc.setFontSize(10);
    doc.text("Total hours worked during the immediately preceding 7 days:", PDF_CONFIG.MARGIN, y);
    y += PDF_CONFIG.LINE_HEIGHT;
    y = addHosTable(doc, y, applicant);
    
    
    // --- Section 8: Agreements & Signatures ---
    // Note: We use the provided agreements list if available, or defaults
    
    const agreementList = agreements && agreements.length > 0 ? agreements : [
        { title: "AGREEMENT TO CONDUCT TRANSACTION ELECTRONICALLY", text: "..." },
        // ... (Add default agreements if needed or rely on modal passing them)
    ];

    agreementList.forEach(agreement => {
        doc.addPage();
        y = PDF_CONFIG.MARGIN;
        y = addAgreementHeader(doc, y, agreement.title, companyName);
        y = addFullWidthText(doc, y, agreement.text);
        y = addSignatureBlock(doc, y, applicant);
    });
    
    // --- Footer (Page Numbers) ---
    const pageCount = doc.internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i); 
        doc.setFont(PDF_CONFIG.FONT.NORMAL, "normal");
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100); 
        doc.text(applicantName, PDF_CONFIG.MARGIN, PDF_CONFIG.PAGE_HEIGHT - 10);
        doc.text(`Page ${i} of ${pageCount}`, PDF_CONFIG.PAGE_WIDTH - PDF_CONFIG.MARGIN, PDF_CONFIG.PAGE_HEIGHT - 10, { align: 'right' });
    }
    
    // --- Save ---
    doc.save(`Application-${getFieldValue(applicant['lastName'])}-${getFieldValue(applicant['firstName'])}.pdf`);
}