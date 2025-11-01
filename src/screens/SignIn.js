import { browserLocalPersistence, setPersistence, signInWithEmailAndPassword } from 'firebase/auth';
import { get, ref } from 'firebase/database';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, database } from '../firebase.config';
import './SignIn.css';

function SignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Ensure persistence is enabled before signing in
      await setPersistence(auth, browserLocalPersistence);
      
      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      console.log('✅ Sign in successful:', { uid: user.uid, email: user.email });

      // Check user type
      const userRef = ref(database, `users/${user.uid}/personalInfo/userType`);
      const snapshot = await get(userRef);
      const userType = snapshot.val();

      console.log('👤 User type:', userType);

      // Only allow admin users
      if (userType === 'Admin') {
        localStorage.setItem('adminUser', JSON.stringify({
          uid: user.uid,
          email: user.email,
          timestamp: new Date().toISOString()
        }));
        console.log('✅ Admin session stored in localStorage');
        navigate('/home');
      } else {
        setError('Access denied. Only Admin can access this portal.');
        await auth.signOut();
        localStorage.removeItem('adminUser');
      }
    } catch (error) {
      console.error('❌ Sign in error:', error);
      let errorMessage = 'Failed to sign in. Please try again.';

      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format.';
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password.';
      }

      setError(errorMessage);
      localStorage.removeItem('adminUser');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signin-container">
      <div className="signin-card card">
        <div className="signin-header">
          <h1 className="gradient-text">Admin Portal</h1>
          <p className="signin-subtitle">Sign in to access the admin dashboard</p>
        </div>

        <form onSubmit={handleSignIn} className="signin-form">
          {error && (
            <div className="error-message">
              <span>⚠️ {error}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              className="input-field"
              placeholder="Enter Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="input-field"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="gradient-button signin-button"
            disabled={loading}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="signin-footer">
          <p>Admin access only • Secure authentication</p>
        </div>
      </div>
    </div>
  );
}

export default SignIn;

