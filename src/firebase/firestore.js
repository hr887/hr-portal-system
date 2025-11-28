// src/firebase/firestore.js
import { db } from './config.js';

// Re-export db for direct usage if needed
export { db };

// Re-export all functions from our new modular services
export * from '../services/userService';
export * from '../services/companyService';
export * from '../services/applicationService';