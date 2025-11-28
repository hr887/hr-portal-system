// hr portal/src/components/modals/CallOutcomeModal.jsx

import React from 'react';
import { Phone } from 'lucide-react'; // Minimal icon import for component clarity

// Import the new modular components
import { CallOutcomeModalUI } from './CallOutcomeModalUI.jsx';
import { useCallOutcome } from '../../hooks/useCallOutcome';

/**
 * CallOutcomeModal - Wrapper component that connects the custom hook logic
 * to the presentation component (UI).
 * * @param {object} lead - The driver/lead object.
 * @param {string} companyId - The ID of the current company.
 * @param {function} onClose - Function to close the modal.
 * @param {function} onUpdate - Function to refresh the parent dashboard list.
 */
export function CallOutcomeModal({ lead, companyId, onClose, onUpdate }) {
    
    // 1. Get all state and handlers from the custom hook
    const hookProps = useCallOutcome(lead, companyId, onUpdate, onClose);

    // 2. Pass the lead data and hook props directly to the UI component
    return (
        <CallOutcomeModalUI 
            lead={lead} 
            onClose={onClose}
            {...hookProps}
        />
    );
}