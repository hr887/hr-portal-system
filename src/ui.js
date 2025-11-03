// src/ui.js
import { db } from './firebase-config.js';
import { doc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getCurrentCompanyProfile } from './main.js'; 
import { 
    getApplicationDoc, 
    updateApplicationStatus, 
    loadApplications,
    loadCompanies,
    createNewCompany
} from './firestore.js';
import { getFileUrl } from './storage.js';
import { getStatusColor, getFieldValue, field, createFileLink } from './utils.js';
import { generateApplicationPDF } from './pdf-generator.js';

// === Get Element References ===
const loginContainer = document.getElementById('login-container');
const superAdminContainer = document.getElementById('super-admin-container');
const companyAdminContainer = document.getElementById('company-admin-container');
const createCompanyForm = document.getElementById('create-company-form');
const createCompanyBtn = document.getElementById('create-company-btn');
const createCompanySuccess = document.getElementById('create-company-success');
const createCompanyError = document.getElementById('create-company-error');
const companyList = document.getElementById('company-list');
const appList = document.getElementById('application-list');
const companyAdminHeader = document.getElementById('company-admin-header');
const logoutButtonSuper = document.getElementById('logout-button-super');
const logoutButtonCompany = document.getElementById('logout-button-company');


// === UI State "Router" ===
function hideAllContainers() {
    loginContainer.classList.add('hidden');
    superAdminContainer.classList.add('hidden');
    companyAdminContainer.classList.add('hidden');
}

export function showLoginScreen() {
    hideAllContainers();
    loginContainer.classList.remove('hidden');
}

export async function showSuperAdminDashboard(user) {
    hideAllContainers();
    superAdminContainer.classList.remove('hidden');
    setupSuperAdminListeners();
    await refreshCompanyList();
}

async function refreshCompanyList() {
    if (!companyList) return;
    companyList.innerHTML = '<p>Loading companies...</p>';
    
    try {
        const querySnapshot = await loadCompanies();
        if (querySnapshot.empty) {
            companyList.innerHTML = '<p class="text-gray-500">No companies found. Create one to get started.</p>';
            return;
        }
        
        companyList.innerHTML = ''; // Clear loading
        querySnapshot.forEach(doc => {
            const company = doc.data();
            const companyEl = document.createElement('div');
            companyEl.className = 'p-4 border rounded-lg bg-gray-50';
            companyEl.innerHTML = `
                <h3 class="font-semibold text-lg">${getFieldValue(company.companyName)}</h3>
                <p class="text-sm text-gray-600">
                    <strong>ID:</strong> ${doc.id}
                </p>
                <p class="text-sm text-gray-600">
                    <strong>Slug:</strong> /${getFieldValue(company.appSlug)}
                </p>
                <p class="text-sm text-gray-600">
                    <strong>Contact:</strong> ${getFieldValue(company.contact?.email)}
                </p>
            `;
            companyList.appendChild(companyEl);
        });
    } catch (error) {
        console.error("Error loading companies:", error);
        companyList.innerHTML = '<p class="text-red-600">Error loading companies.</p>';
    }
}

function setupSuperAdminListeners() {
    if (createCompanyForm) {
        createCompanyForm.onsubmit = async (e) => {
            e.preventDefault();
            createCompanyBtn.disabled = true;
            createCompanyBtn.textContent = 'Creating...';
            createCompanyError.classList.add('hidden');
            createCompanySuccess.classList.add('hidden');

            try {
                const companyData = {
                    companyName: document.getElementById('company-name').value,
                    appSlug: document.getElementById('company-slug').value.toLowerCase().trim(),
                    address: {
                        street: document.getElementById('company-street').value,
                        city: document.getElementById('company-city').value,
                        state: document.getElementById('company-state').value.toUpperCase(),
                        zip: document.getElementById('company-zip').value,
                    },
                    contact: {
                        phone: document.getElementById('company-phone').value,
                        email: document.getElementById('company-email').value,
                    },
                    legal: {
                        mcNumber: document.getElementById('company-mc').value,
                        dotNumber: document.getElementById('company-dot').value,
                    },
                    logoUrl: ""
                };
                
                await createNewCompany(companyData);

                createCompanySuccess.textContent = `Successfully created ${companyData.companyName}!`;
                createCompanySuccess.classList.remove('hidden');
                createCompanyForm.reset();
                await refreshCompanyList();

            } catch (error) {
                console.error("Error creating company:", error);
                createCompanyError.textContent = error.message;
                createCompanyError.classList.remove('hidden');
            } finally {
                createCompanyBtn.disabled = false;
                createCompanyBtn.textContent = 'Create Company';
            }
        };
    }
}

export async function showCompanyAdminDashboard(user, companyDoc) {
    hideAllContainers();
    companyAdminContainer.classList.remove('hidden');
    
    if (companyAdminHeader) {
        const companyName = companyDoc.data().companyName;
        companyAdminHeader.textContent = companyName ? `${companyName} - Applications` : "Company Dashboard";
    }

    await refreshApplicationList(companyDoc.id);
}

async function refreshApplicationList(companyId) {
    if (!appList) return;
    appList.innerHTML = '<p class="text-gray-500">Loading applications...</p>';

    try {
        const querySnapshot = await loadApplications(companyId);
        
        if (!querySnapshot || querySnapshot.empty) {
            appList.innerHTML = '<p class="text-gray-500">No applications found.</p>';
            return;
        }

        appList.innerHTML = '';
        querySnapshot.forEach(doc => {
            const data = doc.data();
            const currentStatus = data.status || 'New Application';

            const appButton = document.createElement('button');
            appButton.className = 'w-full text-left p-4 border rounded-lg bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 flex justify-between items-center';
            appButton.innerHTML = `
                <div>
                    <h3 class="font-semibold text-lg">${getFieldValue(data['first-name'])} ${getFieldValue(data['last-name'])}</h3>
                    <p class="text-sm text-gray-600">${getFieldValue(data.email)}</p>
                </div>
                <span class="px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(currentStatus)}">
                    ${currentStatus}
                </span>
            `;
            appButton.addEventListener('click', () => {
                showApplicationDetailsModal(companyId, doc.id);
            });
            appList.appendChild(appButton);
        });
    } catch (error) {
        console.error("Error loading applications: ", error);
        appList.innerHTML = '<p class="text-red-600">Could not load applications.</p>';
    }
}

async function showApplicationDetailsModal(companyId, applicationId) {
    console.log(`Loading details for company ${companyId}, app ${applicationId}`);

    const oldModal = document.getElementById('details-modal');
    if (oldModal) oldModal.remove();

    const modalBackdrop = document.createElement('div');
    modalBackdrop.id = 'details-modal';
    modalBackdrop.className = 'fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50';
    
    const modalContainer = document.createElement('div');
    modalContainer.className = 'bg-white rounded-lg shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]';

    const modalHeader = document.createElement('div');
    modalHeader.className = 'p-4 border-b flex justify-between items-center';
    
    modalHeader.innerHTML = `
        <h3 id="modal-title" class="text-2xl font-bold text-gray-800">Loading Application...</h3>
        <button id="modal-download-btn" 
           class="py-2 px-4 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 text-sm transition-colors hidden">
           Download PDF
        </button>
    `;

    const modalBody = document.createElement('div');
    modalBody.id = 'modal-body';
    modalBody.className = 'p-6 overflow-y-auto space-y-6';
    modalBody.innerHTML = '<p class="text-gray-700">Loading details...</p>';

    const modalFooter = document.createElement('div');
    modalFooter.className = 'p-4 bg-gray-50 border-t rounded-b-lg flex justify-end';
    const closeButton = document.createElement('button');
    closeButton.id = 'modal-close-btn';
    closeButton.className = 'py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors';
    closeButton.textContent = 'Close';
    
    modalFooter.appendChild(closeButton);
    modalContainer.appendChild(modalHeader);
    modalContainer.appendChild(modalBody);
    modalContainer.appendChild(modalFooter);
    modalBackdrop.appendChild(modalContainer);
    document.body.appendChild(modalBackdrop);

    closeButton.addEventListener('click', () => modalBackdrop.remove());
    modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) modalBackdrop.remove();
    });

    try {
        const docSnap = await getApplicationDoc(companyId, applicationId);

        if (docSnap.exists()) {
            const data = docSnap.data();
            
            document.getElementById('modal-title').textContent = `Application: ${getFieldValue(data['first-name'])} ${getFieldValue(data['last-name'])}`;

            const [cdlUrl, sscUrl, medicalUrl] = await Promise.all([
                getFileUrl(data.cdl_storagePath),
                getFileUrl(data.ssc_storagePath),
                getFileUrl(data.medical_storagePath)
            ]);

            const downloadBtn = document.getElementById('modal-download-btn');
            if (downloadBtn) {
                downloadBtn.classList.remove('hidden'); 
                downloadBtn.addEventListener('click', () => {
                    console.log("Gathering data for PDF...");
                    
                    const companyDoc = getCurrentCompanyProfile();
                    if (!companyDoc) {
                        alert("Error: Could not find company profile. Cannot generate PDF.");
                        return;
                    }
                    const companyData = companyDoc.data();
                    const companyName = companyData.companyName || "[COMPANY_NAME]";
                    
                    const agreements = [
                        { id: 'agreement-release', title: 'RELEASE AND WAIVER' },
                        { id: 'agreement-certify', title: 'CERTIFICATION' },
                        { id: 'agreement-auth-psp', title: 'AUTHORIZATION FOR PSP' },
                        { id: 'agreement-clearinghouse', title: 'CLEARINGHOUSE CONSENT' },
                    ].map(agg => {
                        let text = document.getElementById(agg.id)?.innerHTML || 'Agreement text not found.';
                        text = text.replace(/\[COMPANY_NAME\]/g, companyName);
                        return { title: agg.title, text: text };
                    });

                    try {
                        generateApplicationPDF({
                            applicant: data, 
                            agreements: agreements,
                            company: companyData
                        });
                    } catch (e) {
                        console.error("PDF Generation failed:", e);
                        alert("Could not generate PDF. See console for details.");
                    }
                });
            }

            // --- 4. Build Modal HTML (THIS IS THE FIXED PART) ---
            const currentStatus = data.status || 'New Application';
            modalBody.innerHTML = `
                <!-- Personal Info Section -->
                <div>
                    <h4 class="text-lg font-semibold text-gray-800 border-b pb-2 mb-3">Personal Information</h4>
                    <dl class="divide-y divide-gray-200">
                        ${field('Full Name', `${getFieldValue(data['first-name'])} ${getFieldValue(data['middle-name'])} ${getFieldValue(data['last-name'])} ${getFieldValue(data['suffix'])}`)}
                        ${field('Email', data.email)}
                        ${field('Phone', data.phone)}
                        ${field('Date of Birth', data.dob)}
                        ${field('SSN (Masked)', data.ssn ? `***-**-${data.ssn.slice(-4)}` : null)}
                    </dl>
                </div>
                <!-- Address Section -->
                <div>
                    <h4 class="text-lg font-semibold text-gray-800 border-b pb-2 mb-3">Address</h4>
                    <dl class="divide-y divide-gray-200">
                        ${field('Street', `${getFieldValue(data.street)}${data['street-2'] ? `, ${data['street-2']}` : ''}`)}
                        ${field('City', data.city)}
                        ${field('State', data.state)}
                        ${field('ZIP Code', data.zip)}
                    </dl>
                </div>

                <!-- License Section -->
                <div>
                    <h4 class="text-lg font-semibold text-gray-800 border-b pb-2 mb-3">License & Qualifications</h4>
                    <dl class="divide-y divide-gray-200">
                        ${field('CDL Number', data['cdl-number'])}
                        ${field('CDL State', data['cdl-state'])}
                        ${field('CDL Class', data['cdl-class'])}
                        ${field('CDL Expiration', data['cdl-exp'])}
                        ${field('Endorsements', data['endorsements-details'] || (data['endorsements-radio'] === 'no' ? 'None' : null))}
                    </dl>
                </div>

                <!-- Downloadable Files Section -->
                <div>
                    <h4 class="text-lg font-semibold text-gray-800 border-b pb-2 mb-3">Uploaded Files</h4>
                    <div class="space-y-3 mt-4">
                        <p>${createFileLink(cdlUrl, "Commercial Driver's License (CDL)", data.cdl_fileName)}</p>
                        <p>${createFileLink(sscUrl, 'Social Security Card (SSC)', data.ssc_fileName)}</p>
                        <p>${createFileLink(medicalUrl, 'Medical Card', data.medical_fileName)}</p>
                    </div>
                </div>

                <!-- Signature Section -->
                <div>
                    <h4 class="text-lg font-semibold text-gray-800 border-b pb-2 mb-3">Signature</h4>
                    <div class="mt-4 p-4 border rounded-lg bg-gray-50 flex justify-center items-center">
                        ${data.signature ? `<img src="${data.signature}" alt="Driver Signature" class="max-w-full h-auto border">` : '<span class="text-gray-500">Signature not provided.</span>'}
                    </div>
                    ${field('Date Signed', data['signature-date'])}
                </div>

                <!-- Application Management Section -->
                <div class="pt-6 border-t border-gray-200">
                    <h4 class="text-lg font-semibold text-gray-800 border-b pb-2 mb-3">Application Management</h4>
                    <dl class="divide-y divide-gray-200">
                        <div class="py-2 sm:grid sm:grid-cols-3 sm:gap-4 bg-gray-50 rounded-lg p-2">
                            <dt class="text-sm font-medium text-gray-700">Current Status</dt>
                            <dd id="current-status-display" class="mt-1 text-base font-bold ${getStatusColor(currentStatus)} sm:mt-0 sm:col-span-2">
                                ${currentStatus}
                            </dd>
                        </div>
                    </dl>

                    <div class="mt-4 space-y-3">
                        <label for="edit-status" class="block text-sm font-medium text-gray-700">Update Status</label>
                        <select id="edit-status" class="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                            <option value="New Application">New Application</option>
                            <option value="Pending Review">Pending Review</option>
                            <option value="Awaiting Documents">Awaiting Documents</option>
                            <option value="Background Check">Background Check</option>
                            <option value="Approved">Approved</option>
                            <option value="Rejected">Rejected</option>
                        </select>
                        <button id="save-status-btn" class="w-full py-2 px-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition duration-150">
                            Save Status
                        </button>
                        <p id="status-save-error" class="text-sm text-red-600 hidden"></p>
                    </div>
                </div>
            `;
            // --- END OF FIX ---

            // === 5. Status Update Logic (JS) ===
            const statusSelect = document.getElementById('edit-status');
            const saveStatusBtn = document.getElementById('save-status-btn');
            const statusDisplay = document.getElementById('current-status-display');
            const statusSaveError = document.getElementById('status-save-error');
            
            if (statusSelect) statusSelect.value = currentStatus;

            if (saveStatusBtn && statusSelect && statusDisplay) {
                saveStatusBtn.addEventListener('click', async () => {
                    const newStatus = statusSelect.value;
                    if (!newStatus) return;
                    
                    saveStatusBtn.disabled = true;
                    saveStatusBtn.textContent = 'Saving...';
                    saveStatusBtn.classList.add('opacity-75');
                    if (statusSaveError) statusSaveError.classList.add('hidden');
                    
                    try {
                        await updateApplicationStatus(companyId, applicationId, newStatus);
                        
                        statusDisplay.textContent = newStatus;
                        statusDisplay.className = `mt-1 text-base font-bold ${getStatusColor(newStatus)} sm:mt-0 sm:col-span-2`;
                        saveStatusBtn.textContent = 'Status Saved!';
                        
                        await refreshApplicationList(companyId);
                        
                        setTimeout(() => {
                            saveStatusBtn.textContent = 'Save Status';
                            saveStatusBtn.disabled = false;
                            saveStatusBtn.classList.remove('opacity-75');
                        }, 2000);

                    } catch (error) {
                        console.error("Error updating status:", error);
                        if(statusSaveError) {
                            statusSaveError.textContent = "Failed to save status. Please try again.";
                            statusSaveError.classList.remove('hidden');
                        }
                        saveStatusBtn.textContent = 'Save Failed!';
                        saveStatusBtn.disabled = false;
                        saveStatusBtn.classList.remove('opacity-75');
                    }
                });
            }
            // === End Status Update Logic ===

        } else {
            console.log("No such document!");
            document.getElementById('modal-title').textContent = 'Error';
            modalBody.innerHTML = '<p class="text-red-600">Error: Could not find application details.</p>';
            document.getElementById('modal-download-btn').classList.add('hidden');
        }
    } catch (error) {
        console.error("Error fetching document or files:", error);
        document.getElementById('modal-title').textContent = 'Error';
        modalBody.innerHTML = '<p class="text-red-600">Error: Could not load application. See console for details.</p>';
        document.getElementById('modal-download-btn').classList.add('hidden');
    }
}


export function setupLogoutButtons(logoutHandler) {
    if (logoutButtonSuper) {
        logoutButtonSuper.onclick = logoutHandler;
    }
    if (logoutButtonCompany) {
        logoutButtonCompany.onclick = logoutHandler;
    }
}

