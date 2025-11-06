import { get, onValue, ref, set } from 'firebase/database';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import booking2Icon from '../assets/images/booking2.png';
import ConfirmModal from '../components/ConfirmModal';
import { auth, database } from '../firebase.config';
import './Home.css';

function Home() {
  const navigate = useNavigate();
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [instructors, setInstructors] = useState([]);
  const [loadingInstructors, setLoadingInstructors] = useState(false);
  const [pendingListings, setPendingListings] = useState([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [bannerMessage, setBannerMessage] = useState('');
  const [bannerType, setBannerType] = useState('success'); // 'success' or 'error'
  const [expandedPolicies, setExpandedPolicies] = useState({}); // Track expanded policies by listing ID

  const showBannerNotification = (message, type = 'success') => {
    setBannerMessage(message);
    setBannerType(type);
    setShowBanner(true);
    
    // Auto-hide banner after 3 seconds
    setTimeout(() => {
      setShowBanner(false);
    }, 3000);
  };

  const handleSignOut = useCallback(async () => {
    try {
      await auth.signOut();
      localStorage.removeItem('adminUser');
      navigate('/');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }, [navigate]);

  const checkAuth = useCallback(() => {
    // Listen to auth state changes
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      try {
        if (!user) {
          // Check if there's a stored user, if not redirect to login
          const storedUser = localStorage.getItem('adminUser');
          if (!storedUser) {
            navigate('/');
            setLoading(false);
            return;
          }
          // If there's stored user but no auth user, wait for Firebase to restore session
          return;
        }

        // Fetch admin data from database
        const userRef = ref(database, `users/${user.uid}/personalInfo`);
        const snapshot = await get(userRef);
        const userData = snapshot.val();

        if (userData && userData.userType === 'Admin') {
          setAdminData({
            uid: user.uid,
            email: user.email,
            fullName: userData.fullName || 'Admin User',
            userType: userData.userType
          });
          
          // Update localStorage with latest data
          localStorage.setItem('adminUser', JSON.stringify({
            uid: user.uid,
            email: user.email
          }));
        } else {
          handleSignOut();
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        handleSignOut();
      } finally {
        setLoading(false);
      }
    });

    // Cleanup listener
    return unsubscribe;
  }, [navigate, handleSignOut]);

  useEffect(() => {
    const unsubscribeAuth = checkAuth();
    
    // Cleanup auth listener on unmount
    return () => {
      if (unsubscribeAuth) {
        unsubscribeAuth();
      }
    };
  }, [checkAuth]);

  useEffect(() => {
    if (adminData) {
      // Set up real-time listeners
      const unsubscribeInstructors = setupInstructorsListener();
      const unsubscribePending = setupPendingListingsListener();

      // Cleanup listeners on unmount
      return () => {
        unsubscribeInstructors();
        unsubscribePending();
      };
    }
  }, [adminData]);

  const setupInstructorsListener = () => {
    setLoadingInstructors(true);
    const usersRef = ref(database, 'users');
    
    const unsubscribe = onValue(usersRef, async (snapshot) => {
      try {
        console.log('🔄 Real-time update: Fetching instructors...');
        const usersData = snapshot.val();

        if (!usersData) {
          console.log('❌ No users data found');
          setInstructors([]);
          setLoadingInstructors(false);
          return;
        }

        // Filter instructors and fetch their listings
        const instructorsList = [];
        const userIds = Object.keys(usersData);

        for (const userId of userIds) {
          const user = usersData[userId];
          
          if (user.personalInfo?.userType === 'instructor') {
            console.log(`✅ Found instructor: ${user.personalInfo?.fullName}`);
            
            // Fetch instructor's listings
            const listingsPath = `users/${userId}/Listings`;
            const listingsRef = ref(database, listingsPath);
            const listingsSnapshot = await get(listingsRef);
            const listingsData = listingsSnapshot.val();

            const listings = [];
            if (listingsData && typeof listingsData === 'object') {
              const listingIds = Object.keys(listingsData);
              
              for (const listingId of listingIds) {
                const listingDetail = listingsData[listingId];
                
                if (listingDetail && typeof listingDetail === 'object') {
                  listings.push({
                    id: listingId,
                    ...listingDetail
                  });
                }
              }
            }

            const instructorData = {
              uid: userId,
              name: user.personalInfo?.fullName || 'Unknown Instructor',
              email: user.personalInfo?.email || 'N/A',
              // Prefer canonical URL field; fall back to legacy name and local URI
              profilePicture: user.personalInfo?.profileImageUrl || user.personalInfo?.profilePicture || user.personalInfo?.profileImageUri || '',
              listings: listings
            };
            
            instructorsList.push(instructorData);
          }
        }

        console.log(`🎉 Total instructors: ${instructorsList.length}`);
        setInstructors(instructorsList);
        setLoadingInstructors(false);
      } catch (error) {
        console.error('❌ Error in instructors listener:', error);
        setLoadingInstructors(false);
      }
    });

    return unsubscribe;
  };

  const setupPendingListingsListener = () => {
    setLoadingPending(true);
    const listingsRef = ref(database, 'Listings');
    
    const unsubscribe = onValue(listingsRef, async (snapshot) => {
      try {
        console.log('🔄 Real-time update: Fetching pending listings...');
        const listingsData = snapshot.val();

        if (!listingsData) {
          console.log('❌ No listings data found');
          setPendingListings([]);
          setLoadingPending(false);
          return;
        }

        // Filter pending listings and fetch instructor info
        const pendingList = [];
        const listingIds = Object.keys(listingsData);

        for (const listingId of listingIds) {
          const listing = listingsData[listingId];
          
          if (listing.status === 'pending') {
            console.log(`✅ Found pending listing: ${listing.title}`);
            
            // Fetch instructor info
            const instructorRef = ref(database, `users/${listing.instructorId}/personalInfo`);
            const instructorSnapshot = await get(instructorRef);
            const instructorData = instructorSnapshot.val();
            
            pendingList.push({
              id: listingId,
              ...listing,
              instructorEmail: instructorData?.email || 'N/A',
              // Prefer canonical URL field; fall back to legacy name and local URI
              instructorProfilePicture: instructorData?.profileImageUrl || instructorData?.profilePicture || instructorData?.profileImageUri || '',
            });
          }
        }

        console.log(`🎉 Total pending listings: ${pendingList.length}`);
        setPendingListings(pendingList);
        setLoadingPending(false);
      } catch (error) {
        console.error('❌ Error in pending listings listener:', error);
        setLoadingPending(false);
      }
    });

    return unsubscribe;
  };

  const handleApproveListing = async (listingId, instructorId) => {
    try {
      console.log('Approving listing:', listingId);
      
      // Update status in global Listings
      const globalListingRef = ref(database, `Listings/${listingId}`);
      const globalSnapshot = await get(globalListingRef);
      
      if (globalSnapshot.exists()) {
        const listingData = globalSnapshot.val();
        await set(globalListingRef, {
          ...listingData,
          status: 'approved'
        });
        
        // Update status in user's Listings
        const userListingId = listingData.userListingId;
        if (userListingId) {
          const userListingRef = ref(database, `users/${instructorId}/Listings/${userListingId}`);
          const userSnapshot = await get(userListingRef);
          
          if (userSnapshot.exists()) {
            const userListingData = userSnapshot.val();
            await set(userListingRef, {
              ...userListingData,
              status: 'approved'
            });
          }
        }
        
        // Show banner notification (data updates automatically via listeners)
        showBannerNotification('Listing approved successfully!', 'success');
      }
    } catch (error) {
      console.error('Error approving listing:', error);
      alert('Failed to approve listing. Please try again.');
    }
  };

  const handleRejectClick = (listingId, instructorId) => {
    setSelectedListing({ listingId, instructorId });
    setShowRejectModal(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedListing) return;
    
    try {
      console.log('Rejecting listing:', selectedListing.listingId);
      
      // Update status in global Listings
      const globalListingRef = ref(database, `Listings/${selectedListing.listingId}`);
      const globalSnapshot = await get(globalListingRef);
      
      if (globalSnapshot.exists()) {
        const listingData = globalSnapshot.val();
        await set(globalListingRef, {
          ...listingData,
          status: 'rejected'
        });
        
        // Update status in user's Listings
        const userListingId = listingData.userListingId;
        if (userListingId) {
          const userListingRef = ref(database, `users/${selectedListing.instructorId}/Listings/${userListingId}`);
          const userSnapshot = await get(userListingRef);
          
          if (userSnapshot.exists()) {
            const userListingData = userSnapshot.val();
            await set(userListingRef, {
              ...userListingData,
              status: 'rejected'
            });
          }
        }
        
        // Close reject modal, show banner notification (data updates automatically via listeners)
        setShowRejectModal(false);
        setSelectedListing(null);
        showBannerNotification('Listing rejected successfully!', 'success');
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

  const togglePoliciesExpansion = (listingId) => {
    setExpandedPolicies(prev => ({
      ...prev,
      [listingId]: !prev[listingId]
    }));
  };

  if (loading) {
    return (
      <div className="home-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="home-container">
      {/* Header */}
      <header className="admin-header gradient-bg">
        <div className="header-content">
          <div>
            <h1>Admin Dashboard</h1>
            <p>Welcome back, {adminData?.fullName || 'Admin'}</p>
          </div>
          <button className="signout-button" onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        <div className="content-wrapper">
          {/* Welcome Section */}
          <section className="welcome-section card">
            <div className="welcome-icon">👋</div>
            <h2>Hello Admin!</h2>
            <p className="welcome-text">
              Welcome to the MOTHERLAND Admin Dashboard. Manage instructors and their listings.
            </p>
          </section>

          {/* Admin Info */}
          <section className="admin-info-section card">
            <h3>Admin Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Full Name:</span>
                <span className="info-value">{adminData?.fullName}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Email:</span>
                <span className="info-value">{adminData?.email}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Role:</span>
                <span className="info-value badge">{adminData?.userType}</span>
              </div>
            </div>
          </section>

          {/* Pending Listings Section */}
          <section className="pending-listings-section card">
            <div className="section-header">
              <h3>Pending Listings</h3>
              <span className="count-badge pending-badge">{pendingListings.length} Pending</span>
            </div>

            {loadingPending ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading pending listings...</p>
              </div>
            ) : pendingListings.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">✅</div>
                <h4>No Pending Listings</h4>
                <p>All listings have been reviewed.</p>
              </div>
            ) : (
              <div className="pending-listings-grid">
                {pendingListings.map((listing) => (
                  <div key={listing.id} className="pending-listing-card">
                    <div className="pending-listing-header">
                      <div className="instructor-info-small">
                        {listing.instructorProfilePicture ? (
                          <img 
                            src={listing.instructorProfilePicture} 
                            alt={listing.instructorName}
                            className="instructor-avatar-small"
                          />
                        ) : (
                          <div className="instructor-avatar-placeholder-small">
                            {listing.instructorName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <h5>{listing.instructorName}</h5>
                          <p className="instructor-email-small">{listing.instructorEmail}</p>
                        </div>
                      </div>
                      <span className="pending-status-badge">Pending</span>
                    </div>

                    {/* Listing Image */}
                    {listing.imageUrl && listing.imageUrl !== 'placeholder' && (
                      <div className="listing-image-container">
                        <img 
                          src={listing.imageUrl} 
                          alt={listing.title}
                          className="listing-image"
                        />
                      </div>
                    )}

                    <div className="pending-listing-body">
                      <h4 className="listing-title">{listing.title || 'Untitled Class'}</h4>
                      <p className="listing-description">{listing.description || 'No description'}</p>
                      
                      <div className="listing-details-grid">
                        <div className="detail-item">
                          <span className="detail-icon">🎭</span>
                          <span className="detail-label">Category:</span>
                          <span className="detail-value">{listing.category || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-icon">🏷️</span>
                          <span className="detail-label">Type:</span>
                          <span className="detail-value">{listing.classType || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-icon">📅</span>
                          <span className="detail-label">Date:</span>
                          <span className="detail-value">{listing.date || 'No date'}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-icon">⏱️</span>
                          <span className="detail-label">Time:</span>
                          <span className="detail-value">{listing.time || 'No time'}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-icon">📍</span>
                          <span className="detail-label">Location:</span>
                          <span className="detail-value">{listing.location || 'No location'}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-icon">💰</span>
                          <span className="detail-label">Price:</span>
                          <span className="detail-value">{listing.nonSubscriberPrice || listing.subscriberPrice || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-icon">🕐</span>
                          <span className="detail-label">Created At:</span>
                          <span className="detail-value">
                            {(() => {
                              // Always show the field, even if createdAt is missing or fails
                              if (!listing.createdAt) {
                                return 'Not available';
                              }
                              
                              try {
                                let date;
                                
                                // Check if it's a number (timestamp)
                                if (typeof listing.createdAt === 'number') {
                                  date = new Date(listing.createdAt);
                                }
                                // Check if it's a Firebase timestamp object
                                else if (listing.createdAt && typeof listing.createdAt === 'object' && listing.createdAt.seconds) {
                                  date = new Date(listing.createdAt.seconds * 1000);
                                }
                                // Treat as string (ISO format)
                                else if (typeof listing.createdAt === 'string') {
                                  date = new Date(listing.createdAt);
                                }
                                else {
                                  return 'Not available';
                                }
                                
                                if (isNaN(date.getTime())) {
                                  console.warn('Invalid date format:', listing.createdAt);
                                  return 'Invalid date';
                                }
                                
                                return date.toLocaleDateString('en-US', { 
                                  year: 'numeric', 
                                  month: 'short', 
                                  day: 'numeric'
                                });
                              } catch (e) {
                                console.error('Error formatting date:', e, listing.createdAt);
                                return 'Format error';
                              }
                            })()}
                          </span>
                        </div>
                      </div>

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
                    </div>

                    <div className="pending-listing-actions">
                      <button 
                        className="approve-button"
                        onClick={() => handleApproveListing(listing.id, listing.instructorId)}
                      >
                        ✓ Approve
                      </button>
                      <button 
                        className="reject-button"
                        onClick={() => handleRejectClick(listing.id, listing.instructorId)}
                      >
                        ✗ Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Instructors and Listings Section */}
          <section className="instructors-section card">
            <div className="section-header">
              <h3>Instructors & Their Listings</h3>
              <span className="count-badge">{instructors.length} Instructors</span>
            </div>

            {loadingInstructors ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading instructors...</p>
              </div>
            ) : instructors.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <h4>No Instructors Found</h4>
                <p>There are currently no instructors registered in the system.</p>
              </div>
            ) : (
              <div className="instructors-list">
                {instructors.map((instructor) => {
                  // Check if instructor has pending listings
                  const hasPendingListings = instructor.listings.some(listing => listing.status === 'pending');
                  
                  return (
                    <div 
                      key={instructor.uid} 
                      className={`instructor-card ${hasPendingListings ? 'has-pending-glow' : ''}`}
                    >
                      {hasPendingListings && (
                        <div className="pending-indicator">
                          <span className="pending-dot"></span>
                          <span className="pending-text">Has Pending Listings</span>
                        </div>
                      )}
                      <div className="instructor-header">
                        <div className="instructor-info">
                          {instructor.profilePicture ? (
                            <img 
                              src={instructor.profilePicture} 
                              alt={instructor.name}
                              className="instructor-avatar"
                            />
                          ) : (
                            <div className="instructor-avatar-placeholder">
                              {instructor.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="instructor-details">
                            <h4>{instructor.name}</h4>
                            <p className="instructor-email">{instructor.email}</p>
                          </div>
                        </div>
                        <div className="listings-count">
                          <span className="count">{instructor.listings.length}</span>
                          <span className="label">Listings</span>
                        </div>
                      </div>

                      <div className="instructor-actions">
                        <button 
                          className="view-listings-button"
                          onClick={() => navigate('/users-listing', { state: { instructor } })}
                        >
                          View Listings →
                        </button>
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

      {/* Success Banner */}
      {showBanner && (
        <div className={`notification-banner ${bannerType}`}>
          <div className="banner-content">
            <span className="banner-icon">
              {bannerType === 'success' ? '✓' : '✗'}
            </span>
            <span className="banner-message">{bannerMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;

