// src/ui.js
import { db, functions } from './firebase-config.js';
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";
// UPDATED: Import getDoc and doc
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getCurrentCompanyProfile } from './main.js'; 
import { 
    getApplicationDoc, 
    updateApplicationStatus, 
    loadApplications,
    loadCompanies,
    createNewCompany,
    updateCompany,
    loadAllUsers,
    loadAllMemberships,
    getMembershipsForUser,
    updateUser,
    addMembership,
    updateMembershipRole,
    deleteMembership,
    getCompanyProfile // NEW: Import this
} from './firestore.js';
import { getFileUrl } from './storage.js';
import { getStatusColor, getFieldValue, field, createFileLink } from './utils.js';
import { generateApplicationPDF } from './pdf-generator.js';

// === Get Element References ===
const loginContainer = document.getElementById('login-container');
const superAdminContainer = document.getElementById('super-admin-container');
const companyAdminContainer = document.getElementById('company-admin-container');

// --- Login Elements (NEW) ---
const passwordToggleBtn = document.getElementById('password-toggle-btn');
const passwordInput = document.getElementById('login-password');
const eyeIcon = document.getElementById('eye-icon');
const eyeOffIcon = document.getElementById('eye-off-icon');

// --- Super Admin Elements ---
const createCompanyForm = document.getElementById('create-company-form');
const createCompanyBtn = document.getElementById('create-company-btn');
const createCompanySuccess = document.getElementById('create-company-success');
const createCompanyError = document.getElementById('create-company-error');
const companyList = document.getElementById('company-list');

const createAdminForm = document.getElementById('create-admin-form');
const createAdminBtn = document.getElementById('create-admin-btn');
const createAdminSuccess = document.getElementById('create-admin-success');
const createAdminError = document.getElementById('create-admin-error');
const adminCompanySelect = document.getElementById('admin-company-select');
const userList = document.getElementById('user-list');

// --- Company Admin Elements ---
const appList = document.getElementById('application-list');
const companyAdminHeader = document.getElementById('company-admin-header');

// --- Company Chooser Modal ---
const chooseCompanyModal = document.getElementById('choose-company-modal');
const companyChoiceList = document.getElementById('company-choice-list');
const switchCompanyButton = document.getElementById('switch-company-button');
const logoutButtonModal = document.getElementById('logout-button-modal');

// --- "Edit Company" Modal Elements ---
const editCompanyModal = document.getElementById('edit-company-modal');
const editCompanyForm = document.getElementById('edit-company-form');
const editCompanyId = document.getElementById('edit-company-id');
const editCompanyMessage = document.getElementById('edit-company-message');
const editCompanySaveBtn = document.getElementById('edit-company-save-btn');
const editCompanyCancelBtn = document.getElementById('edit-company-cancel-btn');

// --- "Delete Company" Modal Elements ---
const deleteCompanyModal = document.getElementById('delete-company-modal');
const deleteCompanyName = document.getElementById('delete-company-name');
const deleteCompanyError = document.getElementById('delete-company-error');
const deleteCompanyConfirmBtn = document.getElementById('delete-company-confirm-btn');
const deleteCompanyCancelBtn = document.getElementById('delete-company-cancel-btn');

// --- "Edit User" Modal Elements ---
const editUserModal = document.getElementById('edit-user-modal');
const editUserId = document.getElementById('edit-user-id');
const editUserName = document.getElementById('edit-user-name');
const editUserEmail = document.getElementById('edit-user-email');
const editUserSaveBtn = document.getElementById('edit-user-save-btn');
const editUserMessage = document.getElementById('edit-user-message');
const editUserMembershipsList = document.getElementById('edit-user-memberships-list');
const addMembershipForm = document.getElementById('add-membership-form');
const addMembershipCompany = document.getElementById('add-membership-company');
const addMembershipRole = document.getElementById('add-membership-role');
const addMembershipError = document.getElementById('add-membership-error');
const editUserCloseBtn = document.getElementById('edit-user-close-btn');

// --- "Delete User" Modal Elements ---
const deleteUserModal = document.getElementById('delete-user-modal');
const deleteUserName = document.getElementById('delete-user-name');
const deleteUserError = document.getElementById('delete-user-error');
const deleteUserConfirmBtn = document.getElementById('delete-user-confirm-btn');
const deleteUserCancelBtn = document.getElementById('delete-user-cancel-btn');

// --- Global Elements ---
// --- RESTORED THESE LINES ---
const logoutButtonSuper = document.getElementById('logout-button-super');
const logoutButtonCompany = document.getElementById('logout-button-company');
// --- END RESTORED LINES ---

// --- Global variable to hold all companies map ---
let allCompaniesMap = new Map();


// === UI State "Router" ===
function hideAllContainers() {
    loginContainer.classList.add('hidden');
    superAdminContainer.classList.add('hidden');
    companyAdminContainer.classList.add('hidden');
    hideCompanyChooser();
    if (editCompanyModal) editCompanyModal.classList.add('hidden');
    if (deleteCompanyModal) deleteCompanyModal.classList.add('hidden');
    if (editUserModal) editUserModal.classList.add('hidden');
    if (deleteUserModal) deleteUserModal.classList.add('hidden');
}

export function showLoginScreen() {
    hideAllContainers();
    loginContainer.classList.remove('hidden');
    
    // NEW (Bug 3 Fix): Reset login form state
    const loginButton = document.getElementById('login-btn');
    const loginError = document.getElementById('login-error');
    if (loginButton) {
        loginButton.disabled = false;
        loginButton.textContent = 'Login';
    }
    if (loginError) {
        loginError.classList.add('hidden');
        loginError.textContent = '';
    }
    
    // (Bug 1 Fix): Set up login page listeners
    setupLoginListeners();
}

export async function showSuperAdminDashboard(user) {
    hideAllContainers();
    superAdminContainer.classList.remove('hidden');
    
    // Setup ALL listeners for the Super Admin page
    setupSuperAdminListeners();
    
    // Load ALL data for the dashboard
    await refreshCompanyList();
    await populateCompanyDropdown();
    await refreshUserList();
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
        
        companyList.innerHTML = '';
        querySnapshot.forEach(doc => {
            const company = doc.data();
            const companyEl = document.createElement('div');
            companyEl.className = 'p-4 border rounded-lg bg-gray-50 flex flex-col justify-between';
            companyEl.innerHTML = `
                <div>
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
                </div>
                <div class="mt-4 flex gap-2 justify-end pt-3 border-t">
                    <button data-id="${doc.id}" class="edit-company-btn px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600">
                        Edit
                    </button>
                    <button data-id="${doc.id}" data-name="${getFieldValue(company.companyName)}" class="delete-company-btn px-3 py-1 text-sm bg-red-500 text-white rounded-md hover:bg-red-600">
                        Delete
                    </button>
                </div>
            `;
            companyList.appendChild(companyEl);
        });

        // Add event listeners for the new buttons
        companyList.querySelectorAll('.edit-company-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const companyDoc = await getDoc(doc(db, "companies", btn.dataset.id));
                if (companyDoc.exists()) {
                    openEditCompanyModal(companyDoc);
                } else {
                    console.error("Error: Company not found.");
                }
            });
        });

        companyList.querySelectorAll('.delete-company-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                openDeleteCompanyModal(btn.dataset.id, btn.dataset.name);
            });
        });

    } catch (error) {
        console.error("Error loading companies:", error);
        companyList.innerHTML = '<p class="text-red-600">Error loading companies.</p>';
    }
}

/**
 * Opens and populates the "Edit Company" modal.
 * @param {DocumentSnapshot} companyDoc - The Firestore document for the company.
 */
function openEditCompanyModal(companyDoc) {
    if (!editCompanyModal || !editCompanyForm) return;

    const company = companyDoc.data();
    
    // Store ID and original slug
    editCompanyId.value = companyDoc.id;
    // We store the original slug in a data attribute on the form itself
    editCompanyForm.dataset.originalSlug = company.appSlug || "";

    // Reset messages
    editCompanyMessage.textContent = '';
    editCompanyMessage.className = 'text-sm';

    // Populate form fields
    document.getElementById('edit-company-name').value = company.companyName || '';
    document.getElementById('edit-company-slug').value = company.appSlug || '';
    document.getElementById('edit-company-phone').value = company.contact?.phone || '';
    document.getElementById('edit-company-email').value = company.contact?.email || '';
    document.getElementById('edit-company-street').value = company.address?.street || '';
    document.getElementById('edit-company-city').value = company.address?.city || '';
    document.getElementById('edit-company-state').value = company.address?.state || '';
    document.getElementById('edit-company-zip').value = company.address?.zip || '';
    document.getElementById('edit-company-mc').value = company.legal?.mcNumber || '';
    document.getElementById('edit-company-dot').value = company.legal?.dotNumber || '';
    
    // Show the modal
    editCompanyModal.classList.remove('hidden');
}

/**
 * Opens and populates the "Delete Company" confirmation modal.
 * @param {string} companyId - The ID of the company to delete.
 * @param {string} companyName - The name of the company.
 */
function openDeleteCompanyModal(companyId, companyName) {
    if (!deleteCompanyModal) return;

    // Store the ID on the confirm button
    deleteCompanyConfirmBtn.dataset.id = companyId;
    deleteCompanyName.textContent = companyName;

    // Reset error message
    deleteCompanyError.textContent = '';
    deleteCompanyError.classList.add('hidden');
    deleteCompanyConfirmBtn.disabled = false;
    deleteCompanyConfirmBtn.textContent = 'Delete Company';

    // Show the modal
    deleteCompanyModal.classList.remove('hidden');
}


/**
 * Fetches all users and memberships to build the "Manage All Users" list.
 */
async function refreshUserList() {
    if (!userList) return;
    userList.innerHTML = '<p>Loading users...</p>';

    try {
        // 1. Fetch all data in parallel
        const [usersSnap, membershipsSnap, companiesSnap] = await Promise.all([
            loadAllUsers(),
            loadAllMemberships(),
            loadCompanies()
        ]);

        // 2. Create "lookup maps" for companies and memberships
        allCompaniesMap.clear(); // Use the global map
        companiesSnap.forEach(doc => {
            allCompaniesMap.set(doc.id, doc.data().companyName);
        });

        const membershipsMap = new Map();
        membershipsSnap.forEach(doc => {
            const membership = doc.data();
            if (!membershipsMap.has(membership.userId)) {
                membershipsMap.set(membership.userId, []);
            }
            membershipsMap.get(membership.userId).push(membership);
        });

        // 3. Render the user list
        userList.innerHTML = ''; // Clear loading
        if (usersSnap.empty) {
            userList.innerHTML = '<p class="text-gray-500">No users found.</p>';
            return;
        }

        usersSnap.forEach(userDoc => {
            const user = userDoc.data();
            const userId = userDoc.id;
            const userMemberships = membershipsMap.get(userId) || [];

            const userEl = document.createElement('div');
            userEl.className = 'p-4 border rounded-lg bg-gray-50';
            
            // Build the HTML for the user's permissions
            let permissionsHtml = '';
            if (user.globalRole === 'super_admin') {
                permissionsHtml = `<span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-800">Super Admin</span>`;
            } else if (userMemberships.length > 0) {
                permissionsHtml = userMemberships.map(mem => {
                    const companyName = allCompaniesMap.get(mem.companyId) || "Unknown Company";
                    return `
                        <div class="mt-1">
                            <span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">${mem.role.replace('_', ' ')}</span>
                            <span class="text-sm text-gray-600 ml-1">at ${companyName}</span>
                        </div>
                    `;
                }).join('');
            } else {
                permissionsHtml = `<span class="text-xs text-gray-500 italic">No company access</span>`;
            }

            // Build the final user card
            userEl.innerHTML = `
                <div>
                    <h3 class="font-semibold text-lg">${getFieldValue(user.name)}</h3>
                    <p class="text-sm text-gray-600">${getFieldValue(user.email)}</p>
                    <p class="text-xs text-gray-500 mt-1">User ID: ${userId}</p>
                </div>
                <div class="mt-3 pt-3 border-t">
                    <h4 class="text-sm font-medium text-gray-700 mb-1">Permissions:</h4>
                    ${permissionsHtml}
                </div>
                <div class="mt-3 flex gap-2">
                    <button data-userid="${userId}" class="edit-user-btn px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600">Edit</button>
                    <button data-userid="${userId}" data-name="${getFieldValue(user.name)}" class="delete-user-btn px-3 py-1 text-sm bg-red-500 text-white rounded-md hover:bg-red-600">Delete</button>
                </div>
            `;
            userList.appendChild(userEl);
        });

        // Add event listeners for the new user buttons
        userList.querySelectorAll('.edit-user-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                openEditUserModal(btn.dataset.userid);
            });
        });

        userList.querySelectorAll('.delete-user-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                openDeleteUserModal(btn.dataset.userid, btn.dataset.name);
            });
        });

    } catch (error) {
        console.error("Error building user list:", error);
        userList.innerHTML = '<p class="text-red-600">Error loading user list.</p>';
    }
}

/**
 * Opens and populates the "Edit User" modal.
 * @param {string} userId - The ID of the user to edit.
 */
async function openEditUserModal(userId) {
    if (!editUserModal) return;

    // Reset modal state
    editUserMessage.textContent = '';
    editUserMessage.className = 'text-sm';
    addMembershipError.classList.add('hidden');
    editUserMembershipsList.innerHTML = '<p>Loading memberships...</p>';
    
    editUserModal.classList.remove('hidden');

    try {
        // 1. Get User Doc
        const userDoc = await getDoc(doc(db, "users", userId));
        if (!userDoc.exists()) {
            throw new Error("User not found.");
        }
        const user = userDoc.data();
        
        // 2. Populate basic info
        editUserId.value = userId;
        editUserName.value = user.name || '';
        editUserEmail.value = user.email || '';

        // 3. Render current memberships
        await renderUserMemberships(userId);

    } catch (error) {
        console.error("Error opening edit user modal:", error);
        editUserMembershipsList.innerHTML = `<p class="text-red-600">Error: ${error.message}</p>`;
    }
}

/**
 * Renders the list of memberships inside the "Edit User" modal.
 * Also populates the "Add Company" dropdown.
 * @param {string} userId - The ID of the user.
 */
async function renderUserMemberships(userId) {
    if (!editUserMembershipsList || !addMembershipCompany) return;

    editUserMembershipsList.innerHTML = '<p>Loading memberships...</p>';

    try {
        const membershipsSnap = await getMembershipsForUser(userId);
        const userCompanyIds = new Set();
        editUserMembershipsList.innerHTML = ''; // Clear loading

        if (membershipsSnap.empty) {
            editUserMembershipsList.innerHTML = '<p class="text-gray-500 italic">This user has no company memberships.</p>';
        }

        membershipsSnap.forEach(doc => {
            const membership = doc.data();
            const membershipId = doc.id;
            userCompanyIds.add(membership.companyId); // Add to set

            const companyName = allCompaniesMap.get(membership.companyId) || 'Unknown Company';
            
            const el = document.createElement('div');
            el.className = 'flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg border';
            el.innerHTML = `
                <div>
                    <strong class="font-medium">${companyName}</strong>
                </div>
                <div class="flex items-center gap-2">
                    <select data-membership-id="${membershipId}" class="membership-role-select w-full p-2 border border-gray-300 rounded-lg">
                        <option value="hr_user" ${membership.role === 'hr_user' ? 'selected' : ''}>HR User</option>
                        <option value="company_admin" ${membership.role === 'company_admin' ? 'selected' : ''}>Company Admin</option>
                    </select>
                    <button data-membership-id="${membershipId}" class="remove-membership-btn px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm">
                        Remove
                    </button>
                </div>
            `;
            editUserMembershipsList.appendChild(el);
        });

        // Add listeners for dynamic buttons
        editUserMembershipsList.querySelectorAll('.membership-role-select').forEach(select => {
            select.addEventListener('change', async (e) => {
                const membershipId = e.target.dataset.membershipId;
                const newRole = e.target.value;
                e.target.disabled = true;
                try {
                    await updateMembershipRole(membershipId, newRole);
                    await refreshUserList(); // Refresh main list
                } catch (error) {
                    console.error("Error updating role:", error);
                    // Handle error (e.g., show a message)
                } finally {
                    e.target.disabled = false;
                }
            });
        });

        editUserMembershipsList.querySelectorAll('.remove-membership-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const membershipId = e.target.dataset.membershipId;
                
                // --- THIS IS THE FIX ---
                // Removed the `confirm()` dialog which was breaking the app.
                // The action is now immediate.
                // if (!confirm("Are you sure you want to remove...")) {
                //     return;
                // }
                // --- END FIX ---

                e.target.disabled = true;
                e.target.textContent = 'Removing...';
                try {
                    await deleteMembership(membershipId);
                    await renderUserMemberships(userId); // Re-render modal list
                    await refreshUserList(); // Refresh main list
                } catch (error) {
                    console.error("Error removing membership:", error);
                    e.target.disabled = false;
                    e.target.textContent = 'Remove';
                }
            });
        });

        // 4. Populate "Add Company" dropdown
        addMembershipCompany.innerHTML = '<option value="">-- Select a company --</option>';
        for (const [id, name] of allCompaniesMap.entries()) {
            if (!userCompanyIds.has(id)) { // Only show companies user is NOT in
                const option = document.createElement('option');
                option.value = id;
                option.textContent = name;
                addMembershipCompany.appendChild(option);
            }
        }

    } catch (error) {
        console.error("Error rendering user memberships:", error);
        editUserMembershipsList.innerHTML = `<p class="text-red-600">Error: ${error.message}</p>`;
    }
}

/**
 * Opens the "Delete User" confirmation modal.
 * @param {string} userId - The ID of the user to delete.
 * @param {string} userName - The name of the user.
 */
function openDeleteUserModal(userId, userName) {
    if (!deleteUserModal) return;

    // Store the ID on the confirm button
    deleteUserConfirmBtn.dataset.id = userId;
    deleteUserName.textContent = userName;

    // Reset error message
    deleteUserError.textContent = '';
    deleteUserError.classList.add('hidden');
    deleteUserConfirmBtn.disabled = false;
    deleteUserConfirmBtn.textContent = 'Delete User';

    // Show the modal
    deleteUserModal.classList.remove('hidden');
}


async function populateCompanyDropdown() {
    if (!adminCompanySelect) return;
    
    try {
        const querySnapshot = await loadCompanies();
        adminCompanySelect.innerHTML = '<option value="">-- Select a company --</option>';
        
        if (querySnapshot.empty) {
            adminCompanySelect.innerHTML = '<option value="">-- No companies found --</option>';
            return;
        }
        
        querySnapshot.forEach(doc => {
            const company = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = company.companyName;
            adminCompanySelect.appendChild(option);
        });
    } catch (error) {
        console.error("Error populating company dropdown:", error);
        adminCompanySelect.innerHTML = '<option value="">-- Error loading companies --</option>';
    }
}

/**
 * NEW: Sets up listeners for the login page (e.g., password toggle)
 */
export function setupLoginListeners() {
    if (passwordToggleBtn) {
        passwordToggleBtn.addEventListener('click', () => {
            if (!passwordInput || !eyeIcon || !eyeOffIcon) return;
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            eyeIcon.classList.toggle('hidden', isPassword);
            eyeOffIcon.classList.toggle('hidden', !isPassword);
        });
    }
}

function setupSuperAdminListeners() {
    // 1. "Create Company" form listener
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
                    logoUrl: "" // Initialize logoUrl as empty
                };
                
                await createNewCompany(companyData);
                
                createCompanySuccess.textContent = `Successfully created ${companyData.companyName}!`;
                createCompanySuccess.classList.remove('hidden');
                createCompanyForm.reset();
                await refreshCompanyList();
                await populateCompanyDropdown();
                await refreshUserList(); // Refresh user list in case roles changed

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

    // 2. "Create Admin" form listener
    if (createAdminForm) {
        createAdminForm.onsubmit = async (e) => {
            e.preventDefault();
            createAdminBtn.disabled = true;
            createAdminBtn.textContent = 'Creating User...';
            createAdminError.classList.add('hidden');
            createAdminSuccess.classList.add('hidden');

            const fullName = document.getElementById('admin-full-name').value;
            const email = document.getElementById('admin-email').value;
            const password = document.getElementById('admin-password').value;
            const companyId = document.getElementById('admin-company-select').value;
            const role = document.getElementById('admin-role-select').value;

            try {
                // Call the Cloud Function
                const createPortalUser = httpsCallable(functions, 'createPortalUser');
                
                const result = await createPortalUser({
                    fullName: fullName,
                    email: email,
                    password: password,
                    companyId: companyId,
                    role: role
                });

                createAdminSuccess.textContent = result.data.message;
                createAdminSuccess.classList.remove('hidden');
                createAdminForm.reset();
                await refreshUserList(); // Refresh the user list

            } catch (error) {
                console.error("Error calling createPortalUser function:", error);
                createAdminError.textContent = error.message;
                createAdminError.classList.remove('hidden');
            } finally {
                createAdminBtn.disabled = false;
                createAdminBtn.textContent = 'Create User';
            }
        };
    }

    // --- "Edit Company" Modal Listeners ---
    if (editCompanySaveBtn) {
        editCompanySaveBtn.onclick = async () => {
            editCompanySaveBtn.disabled = true;
            editCompanySaveBtn.textContent = 'Saving...';
            editCompanyMessage.textContent = '';
            editCompanyMessage.className = 'text-sm';

            try {
                const companyId = editCompanyId.value;
                const originalSlug = editCompanyForm.dataset.originalSlug;

                // Gather data from the form
                const companyData = {
                    companyName: document.getElementById('edit-company-name').value,
                    appSlug: document.getElementById('edit-company-slug').value.toLowerCase().trim(),
                    address: {
                        street: document.getElementById('edit-company-street').value,
                        city: document.getElementById('edit-company-city').value,
                        state: document.getElementById('edit-company-state').value.toUpperCase(),
                        zip: document.getElementById('edit-company-zip').value,
                    },
                    contact: {
                        phone: document.getElementById('edit-company-phone').value,
                        email: document.getElementById('edit-company-email').value,
                    },
                    legal: {
                        mcNumber: document.getElementById('edit-company-mc').value,
                        dotNumber: document.getElementById('edit-company-dot').value,
                    },
                    // Note: We don't update logoUrl here, that will be a separate function
                };

                // Call the new firestore function
                await updateCompany(companyId, companyData, originalSlug);

                editCompanyMessage.textContent = 'Successfully saved!';
                editCompanyMessage.classList.add('text-green-600');

                await refreshCompanyList();
                await populateCompanyDropdown(); // Refresh dropdown in case name changed
                await refreshUserList(); // Refresh user list in case company name changed

                setTimeout(() => {
                    editCompanyModal.classList.add('hidden');
                }, 1500);

            } catch (error) {
                console.error("Error updating company:", error);
                editCompanyMessage.textContent = error.message;
                editCompanyMessage.classList.add('text-red-600');
            } finally {
                editCompanySaveBtn.disabled = false;
                editCompanySaveBtn.textContent = 'Save Changes';
            }
        };
    }

    if (editCompanyCancelBtn) {
        editCompanyCancelBtn.onclick = () => {
            editCompanyModal.classList.add('hidden');
        };
    }

    // --- "Delete Company" Modal Listeners ---
    if (deleteCompanyConfirmBtn) {
        deleteCompanyConfirmBtn.onclick = async () => {
            const companyId = deleteCompanyConfirmBtn.dataset.id;
            if (!companyId) return;

            deleteCompanyConfirmBtn.disabled = true;
            deleteCompanyConfirmBtn.textContent = 'Deleting...';
            deleteCompanyError.classList.add('hidden');

            try {
                // Call the Cloud Function (as planned in your roadmap)
                const deleteCompany = httpsCallable(functions, 'deleteCompany');
                const result = await deleteCompany({ companyId: companyId });

                console.log(result.data.message);
                
                // Close modal and refresh list
                deleteCompanyModal.classList.add('hidden');
                await refreshCompanyList();
                await populateCompanyDropdown();
                await refreshUserList(); // Users will be affected

            } catch (error) {
                console.error("Error deleting company:", error);
                deleteCompanyError.textContent = `Error: ${error.message}`;
                deleteCompanyError.classList.remove('hidden');
                deleteCompanyConfirmBtn.disabled = false;
                deleteCompanyConfirmBtn.textContent = 'Delete Company';
            }
        };
    }

    if (deleteCompanyCancelBtn) {
        deleteCompanyCancelBtn.onclick = () => {
            deleteCompanyModal.classList.add('hidden');
        };
    }

    // --- "Edit User" Modal Listeners ---
    if (editUserSaveBtn) {
        editUserSaveBtn.onclick = async () => {
            const userId = editUserId.value;
            const newName = editUserName.value;
            if (!userId || !newName) return;

            editUserSaveBtn.disabled = true;
            editUserMessage.textContent = 'Saving...';
            editUserMessage.className = 'text-sm text-gray-700';

            try {
                await updateUser(userId, { name: newName });
                editUserMessage.textContent = 'Name saved!';
                editUserMessage.classList.add('text-green-600');
                await refreshUserList(); // Refresh main list
            } catch (error) {
                console.error("Error updating user name:", error);
                editUserMessage.textContent = 'Error saving name.';
                editUserMessage.classList.add('text-red-600');
            } finally {
                editUserSaveBtn.disabled = false;
                setTimeout(() => {
                    editUserMessage.textContent = '';
                    editUserMessage.className = 'text-sm';
                }, 2000);
            }
        };
    }

    if (addMembershipForm) {
        addMembershipForm.onsubmit = async (e) => {
            e.preventDefault();
            addMembershipError.classList.add('hidden');
            
            const userId = editUserId.value;
            const companyId = addMembershipCompany.value;
            const role = addMembershipRole.value;

            if (!userId || !companyId || !role) {
                addMembershipError.textContent = 'Please select a company and role.';
                addMembershipError.classList.remove('hidden');
                return;
            }

            try {
                await addMembership({
                    userId: userId,
                    companyId: companyId,
                    role: role
                });
                
                // Reset form and re-render memberships
                addMembershipForm.reset();
                await renderUserMemberships(userId);
                await refreshUserList(); // Refresh main list

            } catch (error) {
                console.error("Error adding membership:", error);
                addMembershipError.textContent = error.message;
                addMembershipError.classList.remove('hidden');
            }
        };
    }

    if (editUserCloseBtn) {
        editUserCloseBtn.onclick = () => {
            editUserModal.classList.add('hidden');
        };
    }

    // --- "Delete User" Modal Listeners ---
    if (deleteUserConfirmBtn) {
        deleteUserConfirmBtn.onclick = async () => {
            const userId = deleteUserConfirmBtn.dataset.id;
            if (!userId) return;

            deleteUserConfirmBtn.disabled = true;
            deleteUserConfirmBtn.textContent = 'Deleting...';
            deleteUserError.classList.add('hidden');

            try {
                // Call the Cloud Function
                const deletePortalUser = httpsCallable(functions, 'deletePortalUser');
                const result = await deletePortalUser({ userId: userId });

                console.log(result.data.message);
                
                // Close modal and refresh list
                deleteUserModal.classList.add('hidden');
                await refreshUserList(); // Users will be affected

            } catch (error) {
                console.error("Error deleting user:", error);
                deleteUserError.textContent = `Error: ${error.message}`;
                deleteUserError.classList.remove('hidden');
                deleteUserConfirmBtn.disabled = false;
                deleteUserConfirmBtn.textContent = 'Delete User';
            }
        };
    }

    if (deleteUserCancelBtn) {
        deleteUserCancelBtn.onclick = () => {
            deleteUserModal.classList.add('hidden');
        };
    }
}

// --- Company Admin Dashboard Functions ---

/**
 * UPDATED: (Bug 2 Follow-on)
 * Now accepts companyId and companyData (plain object)
 */
export async function showCompanyAdminDashboard(user, companyId, companyData) {
    hideAllContainers();
    companyAdminContainer.classList.remove('hidden');
    
    if (companyAdminHeader) {
        const companyName = companyData.companyName; // Use object directly
        companyAdminHeader.textContent = companyName ? `${companyName} - Applications` : "Company Dashboard";
    }

    await refreshApplicationList(companyId); // Pass companyId
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
                    
                    // UPDATED: Use companyProfile (plain object)
                    const companyProfile = getCurrentCompanyProfile();
                    if (!companyProfile) {
                        // This should not happen, but good to check
                        console.error("Error: Could not find company profile for PDF.");
                        return;
                    }
                    const companyName = companyProfile.companyName || "[COMPANY_NAME]";
                    
                    const agreements = [
                        { id: 'agreement-release', title: 'RELEASE AND WAIVER' },
                        { id: 'agreement-certify', title: 'CERTIFICATION' },
                        { id: 'agreement-auth-psp', title: 'AUTHORIZATION FOR PSP' },
                        { id: 'agreement-clearinghouse', title: 'CLEARINGHOUSE CONSENT' },
                    ].map(agg => {
                        const template = document.getElementById(agg.id);
                        let text = template ? template.innerHTML : 'Agreement text not found.';
                        text = text.replace(/\[COMPANY_NAME\]/g, companyName);
                        return { title: agg.title, text: text };
                    });

                    try {
                        generateApplicationPDF({
                            applicant: data, 
                            agreements: agreements,
                            company: companyProfile // Pass the raw data object
                        });
                    } catch (e) {
                        console.error("PDF Generation failed:", e);
                    }
                });
            }

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
                        statusDisplay.textContent = 'Status Saved!';
                        
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


// --- Company Chooser Modal Functions ---

export function hideCompanyChooser() {
    if (chooseCompanyModal) {
        chooseCompanyModal.classList.add('hidden');
    }
}

/**
 * UPDATED: This function is now fixed.
 * It fetches company documents one-by-one to avoid the permissions error.
 */
export async function showCompanyChooser(companyIds, companyRoles, onCompanyChosen) {
    hideAllContainers();
    if (chooseCompanyModal) {
        chooseCompanyModal.classList.remove('hidden');
    }
    if (!companyChoiceList) return;

    companyChoiceList.innerHTML = '<p>Loading your companies...</p>';

    try {
        const companyDataList = [];
        // --- THIS IS THE NEW FIX ---
        // We will loop and call our new Cloud Function for each ID
        for (const companyId of companyIds) {
            console.log(`Fetching profile for companyId: ${companyId}`);
            // Call the centralized function (which calls the Cloud Function)
            const companyData = await getCompanyProfile(companyId);
            
            if (companyData) {
                companyDataList.push({
                    id: companyId,
                    data: companyData // The data is already the plain object
                });
            } else {
                 console.warn(`Could not find company doc for ID: ${companyId}`);
            }
        }
        // --- END NEW FIX ---

        companyChoiceList.innerHTML = ''; // Clear loading

        if (companyDataList.length === 0) {
             companyChoiceList.innerHTML = '<p class="text-red-600">Could not find any valid companies.</p>';
             return;
        }

        // Loop through the array of results
        companyDataList.forEach(company => {
            const companyId = company.id;
            const companyData = company.data;
            const userRole = companyRoles[companyId]; // Get the user's role for THIS company

            const button = document.createElement('button');
            button.className = 'w-full text-left p-4 border rounded-lg bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 flex justify-between items-center';
            button.innerHTML = `
                <div>
                    <h3 class="font-semibold text-lg">${companyData.companyName}</h3>
                    <p class="text-sm text-gray-600 capitalize">Your role: ${userRole.replace('_', ' ')}</p>
                </div>
                <span class="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg text-sm">
                    Login
                </span>
            `;
            
            button.onclick = () => {
                onCompanyChosen(companyId, userRole);
            };
            
            companyChoiceList.appendChild(button);
        });

    } catch (error) {
        // This log will now show any *other* error if one occurs
        console.error("Error populating company chooser:", error);
        companyChoiceList.innerHTML = '<p class="text-red-600">Could not load your companies.</p>';
    }
}

/**
 * UPDATED (Bug 2 Fix)
 * Now accepts the switchCompanyHandler and wires it up.
 */
export function setupLogoutButtons(logoutHandler, switchCompanyHandler) {
    if (logoutButtonSuper) {
        logoutButtonSuper.onclick = logoutHandler;
    }
    if (logoutButtonCompany) {
        logoutButtonCompany.onclick = logoutHandler;
    }
    if (logoutButtonModal) {
        logoutButtonModal.onclick = logoutHandler;
    }
    
    // UPDATED (Bug 2 Fix):
    if (switchCompanyButton) {
        // This now calls the new handler from main.js
        switchCompanyButton.onclick = switchCompanyHandler;
    }
}

