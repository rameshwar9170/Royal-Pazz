import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase/config';
import {
  signInWithEmailAndPassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth';
import { getDatabase, ref, get, update } from 'firebase/database';

const SetNewPassword = () => {
  const navigate = useNavigate();
  const savedUser = JSON.parse(localStorage.getItem('firstLoginUser') || '{}');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasswordSet = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const db = getDatabase();
      const userRef = ref(db, `HTAMS/users/${savedUser.uid}`);
      const snapshot = await get(userRef);
      const userData = snapshot.val();

      if (!userData || !userData.phone) {
        setError('User data not found or phone number missing.');
        console.error('User data missing:', userData);
        setLoading(false);
        return;
      }

      console.log('Signing in with email:', savedUser.email, 'and phone as temporary password');

      // Sign in the user with email + phone (temporary password)
      await signInWithEmailAndPassword(auth, savedUser.email, userData.phone);

      const user = auth.currentUser;
      if (!user) throw new Error('No user is currently signed in');

      // Reauthenticate using temporary password
      const credential = EmailAuthProvider.credential(user.email, userData.phone);
      await reauthenticateWithCredential(user, credential);

      // Update password to new one
      await updatePassword(user, newPassword);
      console.log('Password updated successfully for user:', savedUser.uid);

      // Update database to mark firstTime as false
      await update(userRef, { firstTime: false });
      console.log('Database updated: firstTime set to false');

      localStorage.removeItem('firstLoginUser');
      alert('Password set successfully. Please login again.');
      navigate('/');
    } catch (err) {
      console.error('Error in SetNewPassword:', err);
      setError(
        err.code === 'auth/wrong-password'
          ? 'Invalid phone number. Please contact support.'
          : `Failed to set new password: ${err.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  if (!savedUser?.uid || !savedUser?.email) {
    console.warn('No saved user data in localStorage');
    return <p style={{ textAlign: 'center', marginTop: '2rem' }}>Session expired. Please login again.</p>;
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Set New Password</h2>
      <form onSubmit={handlePasswordSet} style={styles.form}>
        <div style={styles.formGroup}>
          <label style={styles.label}>New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={styles.input}
            required
          />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={styles.input}
            required
          />
        </div>
        {error && <p style={styles.error}>{error}</p>}
        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? 'Saving...' : 'Set Password'}
        </button>
      </form>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '400px',
    margin: '50px auto',
    padding: '20px',
    border: '1px solid #ccc',
    borderRadius: '5px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
  },
  title: {
    textAlign: 'center',
    marginBottom: '20px',
    fontSize: '24px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    marginBottom: '5px',
    fontSize: '14px',
  },
  input: {
    padding: '10px',
    fontSize: '16px',
    border: '1px solid #ccc',
    borderRadius: '4px',
  },
  button: {
    padding: '10px',
    backgroundColor: '#28a745',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    cursor: 'pointer',
  },
  error: {
    color: 'red',
    fontSize: '14px',
    textAlign: 'center',
  },
};

export default SetNewPassword;
