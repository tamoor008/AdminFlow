import React, { useEffect } from 'react';
import './SuccessModal.css';

function SuccessModal({ isOpen, onClose, message, autoClose = true, autoCloseDelay = 2000 }) {
  useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, autoCloseDelay, onClose]);

  if (!isOpen) return null;

  return (
    <div className="success-modal-overlay" onClick={onClose}>
      <div className="success-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="success-icon-wrapper">
          <svg className="success-icon" viewBox="0 0 52 52">
            <circle className="success-circle" cx="26" cy="26" r="25" fill="none"/>
            <path className="success-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
          </svg>
        </div>
        <p className="success-message">{message}</p>
      </div>
    </div>
  );
}

export default SuccessModal;

