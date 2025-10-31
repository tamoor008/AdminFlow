import { get, ref, set } from 'firebase/database';
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import booking2Icon from '../assets/images/booking2.png';
import ConfirmModal from '../components/ConfirmModal';
import SuccessModal from '../components/SuccessModal';
import { database } from '../firebase.config';
import './UsersListing.css';

function UsersListing() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialInstructor = location.state?.instructor;
  // Normalize profile picture field to prefer URL, then legacy/local fields
  const normalizedInstructor = initialInstructor
    ? {
        ...initialInstructor,
        profilePicture:
          initialInstructor.profileImageUrl ||
          initialInstructor.profilePicture ||
          initialInstructor.profileImageUri ||
          ''
      }
    : null;
  const [instructor, setInstructor] = useState(normalizedInstructor);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [expandedListing, setExpandedListing] = useState(null);
  const [expandedPolicies, setExpandedPolicies] = useState({}); // Track expanded policies by listing ID

  const handleApproveListing = async (listing) => {
    try {
      console.log('Approving listing:', listing.id);
      
      const approvalTimestamp = Date.now();
      
      // Update status in global Listings
      const globalListingId = listing.listingId || listing.id;
      const globalListingRef = ref(database, `Listings/${globalListingId}`);
      const globalSnapshot = await get(globalListingRef);
      
      if (globalSnapshot.exists()) {
        const listingData = globalSnapshot.val();
        await set(globalListingRef, {
          ...listingData,
          status: 'approved',
          approvedAt: approvalTimestamp
        });
        
        // Update status in user's Listings
        const userListingId = listingData.userListingId || listing.id;
        if (userListingId) {
          const userListingRef = ref(database, `users/${listing.instructorId}/Listings/${userListingId}`);
          const userSnapshot = await get(userListingRef);
          
          if (userSnapshot.exists()) {
            const userListingData = userSnapshot.val();
            await set(userListingRef, {
              ...userListingData,
              status: 'approved',
              approvedAt: approvalTimestamp
            });
          }
        }
        
        // Update local state immediately
        const updatedListings = instructor.listings.map(l => 
          l.id === listing.id 
            ? { ...l, status: 'approved', approvedAt: approvalTimestamp }
            : l
        );
        
        setInstructor({
          ...instructor,
          listings: updatedListings
        });
        
        // Show success modal
        setSuccessMessage('Listing approved successfully!');
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('Error approving listing:', error);
      alert('Failed to approve listing. Please try again.');
    }
  };

  const handleRejectClick = (listing) => {
    setSelectedListing(listing);
    setShowRejectModal(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedListing) return;
    
    try {
      console.log('Rejecting listing:', selectedListing.id);
      
      const rejectionTimestamp = Date.now();
      
      // Update status in global Listings
      const globalListingId = selectedListing.listingId || selectedListing.id;
      const globalListingRef = ref(database, `Listings/${globalListingId}`);
      const globalSnapshot = await get(globalListingRef);
      
      if (globalSnapshot.exists()) {
        const listingData = globalSnapshot.val();
        await set(globalListingRef, {
          ...listingData,
          status: 'rejected',
          rejectedAt: rejectionTimestamp
        });
        
        // Update status in user's Listings
        const userListingId = listingData.userListingId || selectedListing.id;
        if (userListingId) {
          const userListingRef = ref(database, `users/${selectedListing.instructorId}/Listings/${userListingId}`);
          const userSnapshot = await get(userListingRef);
          
          if (userSnapshot.exists()) {
            const userListingData = userSnapshot.val();
            await set(userListingRef, {
              ...userListingData,
              status: 'rejected',
              rejectedAt: rejectionTimestamp
            });
          }
        }
        
        // Update local state immediately
        const updatedListings = instructor.listings.map(l => 
          l.id === selectedListing.id 
            ? { ...l, status: 'rejected', rejectedAt: rejectionTimestamp }
            : l
        );
        
        setInstructor({
          ...instructor,
          listings: updatedListings
        });
        
        // Close reject modal and show success modal
        setShowRejectModal(false);
        setSelectedListing(null);
        setSuccessMessage('Listing rejected successfully!');
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('Error rejecting listing:', error);
      alert('Failed to reject listing. Please try again.');
    }
  };

  const handleRejectCancel = () => {
    setShowRejectModal(false);
    setSelectedListing(null);
  };

  const toggleListingExpansion = (listingId) => {
    setExpandedListing(expandedListing === listingId ? null : listingId);
  };

  const togglePoliciesExpansion = (listingId) => {
    setExpandedPolicies(prev => ({
      ...prev,
      [listingId]: !prev[listingId]
    }));
  };

  if (!instructor) {
    return (
      <div className="users-listing-container">
        <div className="error-state">
          <h2>No Instructor Data</h2>
          <button className="back-button" onClick={() => navigate('/home')}>
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="users-listing-container">
      {/* Header */}
      <header className="listing-header gradient-bg">
        <div className="header-content">
          <button className="back-button-header" onClick={() => navigate('/home')}>
            ← Back
          </button>
          <div className="header-info">
            <h1>{instructor.name}'s Listings</h1>
            <p>{instructor.email}</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="listing-main-content">
        <div className="listing-content-wrapper">
          {/* Instructor Summary */}
          <section className="instructor-summary card">
            <div className="summary-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {instructor.profilePicture ? (
                  <img 
                    src={instructor.profilePicture} 
                    alt={instructor.name}
                    className="summary-avatar"
                  />
                ) : (
                  <div className="summary-avatar-placeholder">
                    {instructor.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h2 style={{ marginBottom: '4px', marginTop: '0' }}>{instructor.name}</h2>
                  <p className="summary-email" style={{ marginTop: '0', marginBottom: '0' }}>{instructor.email}</p>
                </div>
              </div>
              <div className="stat">
                <span className="stat-number">{instructor.listings.length}</span>
                <span className="stat-label">Total Listings</span>
              </div>
            </div>
          </section>

          {/* Listings Section */}
          <section className="listings-section">
            <h3 className="section-title">All Listings</h3>
            
            {instructor.listings.length === 0 ? (
              <div className="empty-listings card">
                <div className="empty-icon">📭</div>
                <h4>No Listings Yet</h4>
                <p>This instructor hasn't created any listings.</p>
              </div>
            ) : (
              <div className="listings-grid">
                {instructor.listings
                  .sort((a, b) => {
                    // Priority order: pending first, then approved, then rejected
                    const statusOrder = { pending: 0, approved: 1, published: 1, rejected: 2 };
                    const statusA = statusOrder[a.status] !== undefined ? statusOrder[a.status] : 1;
                    const statusB = statusOrder[b.status] !== undefined ? statusOrder[b.status] : 1;
                    
                    // If same status priority, sort by timestamp (most recent first)
                    if (statusA === statusB) {
                      const timestampA = a.approvedAt || a.rejectedAt || a.createdAt || 0;
                      const timestampB = b.approvedAt || b.rejectedAt || b.createdAt || 0;
                      return timestampB - timestampA; // Most recent first
                    }
                    
                    return statusA - statusB;
                  })
                  .map((listing) => {
                  const isPending = listing.status === 'pending';
                  const isRejected = listing.status === 'rejected';
                  const isApproved = listing.status === 'approved' || listing.status === 'published';
                  
                  const isExpanded = expandedListing === listing.id;
                  
                  return (
                    <div 
                      key={listing.id} 
                      className={`listing-card card ${isPending ? 'listing-card-pending' : ''} ${isRejected ? 'listing-card-rejected' : ''}`}
                    >
                      <div className="listing-card-header">
                        <div className="listing-title-with-toggle">
                          <h4 className="listing-title-header">{listing.title || listing.className || 'Untitled Class'}</h4>
                          <button 
                            className="mobile-toggle-button"
                            onClick={() => toggleListingExpansion(listing.id)}
                            aria-label={isExpanded ? "Collapse details" : "Expand details"}
                          >
                            {isExpanded ? '−' : '+'}
                          </button>
                        </div>
                        <div className="listing-badges-container">
                          {isPending && <span className="listing-status-badge pending">Pending</span>}
                          {isRejected && <span className="listing-status-badge rejected">Rejected</span>}
                          {isApproved && <span className="listing-status-badge approved">Active</span>}
                          <span className="listing-price-badge">
                            {listing.nonSubscriberPrice || listing.subscriberPrice || listing.price || '0'}
                          </span>
                        </div>
                      </div>

                    {/* Listing Image */}
                    {listing.imageUrl && listing.imageUrl !== 'placeholder' && (
                      <div className="listing-image-container">
                        <img 
                          src={listing.imageUrl} 
                          alt={listing.title || listing.className || 'Class'}
                          className="listing-image"
                        />
                      </div>
                    )}

                    <div className={`listing-collapsible-content ${isExpanded ? 'expanded' : ''}`}>
                    <div className="listing-info-grid">
                      <div className="info-row">
                        <span className="info-icon">🎭</span>
                        <div className="info-content">
                          <span className="info-label">Class Type</span>
                          <span className="info-value">{listing.classType || 'N/A'}</span>
                        </div>
                      </div>

                      <div className="info-row">
                        <span className="info-icon">🏷️</span>
                        <div className="info-content">
                          <span className="info-label">Category</span>
                          <span className="info-value">{listing.category || listing.classCategory || 'N/A'}</span>
                        </div>
                      </div>

                      <div className="info-row">
                        <span className="info-icon">⏱️</span>
                        <div className="info-content">
                          <span className="info-label">Time</span>
                          <span className="info-value">{listing.time || listing.duration || 'N/A'}</span>
                        </div>
                      </div>

                      <div className="info-row">
                        <span className="info-icon">📅</span>
                        <div className="info-content">
                          <span className="info-label">Date</span>
                          <span className="info-value">{listing.date || 'No date'}</span>
                        </div>
                      </div>

                      <div className="info-row">
                        <span className="info-icon">📍</span>
                        <div className="info-content">
                          <span className="info-label">Location</span>
                          <span className="info-value">{listing.location || listing.address || 'No location'}</span>
                        </div>
                      </div>

                      {listing.difficulty && (
                        <div className="info-row">
                          <span className="info-icon">💪</span>
                          <div className="info-content">
                            <span className="info-label">Difficulty</span>
                            <span className="info-value">{listing.difficulty}</span>
                          </div>
                        </div>
                      )}

                      {listing.availableSeats !== undefined && (
                        <div className="info-row">
                          <span className="info-icon">🪑</span>
                          <div className="info-content">
                            <span className="info-label">Available Seats</span>
                            <span className="info-value">{listing.availableSeats} seats</span>
                          </div>
                        </div>
                      )}
                    </div>

                      {listing.description && (
                        <div className="listing-description-box">
                          <h5>Description</h5>
                          <p>{listing.description}</p>
                        </div>
                      )}

                      {/* Booking Policies Section */}
                      {(listing.customTerms || listing.customRequirements || listing.customCancellation) && (
                        <div className="booking-policies-container">
                          <button 
                            className="policies-toggle-button"
                            onClick={() => togglePoliciesExpansion(listing.id)}
                          >
                            <span className="policies-toggle-title">
                              <img 
                                src={booking2Icon} 
                                alt="Booking Policies"
                                className="policies-icon"
                              />
                              Booking Policies
                            </span>
                            <span className="policies-toggle-icon">
                              {expandedPolicies[listing.id] ? '−' : '+'}
                            </span>
                          </button>
                          
                          {expandedPolicies[listing.id] && (
                            <div className="booking-policies-section">
                              {listing.customTerms && (
                                <div className="policy-item">
                                  <h6 className="policy-heading">Terms and Conditions</h6>
                                  <p className="policy-content" style={{ whiteSpace: 'pre-line' }}>{listing.customTerms}</p>
                                </div>
                              )}
                              
                              {listing.customRequirements && (
                                <div className="policy-item">
                                  <h6 className="policy-heading">Guest Requirements</h6>
                                  <p className="policy-content" style={{ whiteSpace: 'pre-line' }}>{listing.customRequirements}</p>
                                </div>
                              )}
                              
                              {listing.customCancellation && (
                                <div className="policy-item">
                                  <h6 className="policy-heading">
                                    {listing.cancellationPolicyHeading ? listing.cancellationPolicyHeading : 'Cancellation Policy'}
                                  </h6>
                                  <p className="policy-content" style={{ whiteSpace: 'pre-line' }}>{listing.customCancellation}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action buttons for pending listings */}
                      {isPending && (
                        <div className="listing-actions">
                          <button 
                            className="approve-button"
                            onClick={() => handleApproveListing(listing)}
                          >
                            ✓ Approve
                          </button>
                          <button 
                            className="reject-button"
                            onClick={() => handleRejectClick(listing)}
                          >
                            ✗ Reject
                          </button>
                        </div>
                      )}
                    </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={showRejectModal}
        onClose={handleRejectCancel}
        onConfirm={handleRejectConfirm}
        title="Reject Listing"
        message="Are you sure you want to reject this listing?"
        confirmText="OK"
        cancelText="Cancel"
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        message={successMessage}
      />
    </div>
  );
}

export default UsersListing;

