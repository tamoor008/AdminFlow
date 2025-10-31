import React from 'react';
import './ConfirmModal.css';

function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'OK', cancelText = 'Cancel' }) {
  if (!isOpen) return null;

  return (
    <div className="confirm-modal-overlay" onClick={onClose}>
      <div className="confirm-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-modal-content">
          <h3 className="confirm-modal-title">{title}</h3>
          <p className="confirm-modal-message">{message}</p>
        </div>
        <div className="confirm-modal-actions">
          <button className="confirm-modal-button cancel" onClick={onClose}>
            {cancelText}
          </button>
          <button className="confirm-modal-button confirm" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;

