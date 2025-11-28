// hr portal/functions/index.js

// 1. Driver Profile Synchronization (Triggers)
const driverSync = require("./driverSync");
exports.onApplicationSubmitted = driverSync.onApplicationSubmitted;
exports.onLeadSubmitted = driverSync.onLeadSubmitted;

// 2. HR User and Membership Management
const hrAdmin = require("./hrAdmin");
exports.createPortalUser = hrAdmin.createPortalUser;
exports.onMembershipWrite = hrAdmin.onMembershipWrite;
exports.deletePortalUser = hrAdmin.deletePortalUser;
exports.joinCompanyTeam = hrAdmin.joinCompanyTeam;

// 3. Company & General Administration
const companyAdmin = require("./companyAdmin");
exports.deleteCompany = companyAdmin.deleteCompany;
exports.getCompanyProfile = companyAdmin.getCompanyProfile;
exports.moveApplication = companyAdmin.moveApplication;
exports.sendAutomatedEmail = companyAdmin.sendAutomatedEmail;
exports.distributeDailyLeads = companyAdmin.distributeDailyLeads;