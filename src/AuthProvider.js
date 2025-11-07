// src/AuthProvider.js
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { getDatabase, ref, get } from 'firebase/database';
import { auth } from './firebase/config';
import { AuthContext } from './AuthContext';

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const db = getDatabase();
        
        // Clear any cached user data to ensure fresh fetch
        localStorage.removeItem('htamsUser');
        localStorage.removeItem('lastLoginType');

        // 1️⃣ First try HTAMS/users
        const userRef = ref(db, `HTAMS/users/${user.uid}`);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
          const userData = snapshot.val();

          if (userData.active === false) {
            await signOut(auth);
            localStorage.removeItem('htamsUser');
            localStorage.removeItem('lastLoginType');
            alert('Your account has been deactivated. Please contact support.');
            setCurrentUser(null);
            setLoading(false);
            return;
          }

          const fullUser = {
            uid: user.uid,
            email: user.email,
            role: userData.role || 'agency',
            name: userData.name || '',
            phone: userData.phone || '',
            currentLevel: userData.currentLevel || '',
            permissions: userData.permissions || {},
            source: "users",
          };

          console.log("✅ AuthProvider loaded normal user:", fullUser);

          setCurrentUser(fullUser);
          localStorage.setItem('htamsUser', JSON.stringify(fullUser));
          localStorage.setItem('lastLoginType', 'user'); // ⭐ track source
          setLoading(false);
          return;
        }

        // 2️⃣ Try HTAMS/company/trainers
        const trainersRef = ref(db, "HTAMS/company/trainers");
        const trainersSnap = await get(trainersRef);

        if (trainersSnap.exists()) {
          let trainerData = null;
          let trainerId = null;

          trainersSnap.forEach((child) => {
            if (child.val().email?.toLowerCase() === user.email?.toLowerCase()) {
              trainerData = child.val();
              trainerId = child.key;
            }
          });

          if (trainerData) {
            const trainerRole = trainerData.role || trainerData[" role "] || "trainer";

            const fullUser = {
              uid: user.uid,
              email: user.email,
              role: trainerRole,
              name: trainerData.name || '',
              phone: trainerData.phone || '',
              trainerId,
              source: "trainers",
            };

            console.log("✅ AuthProvider loaded trainer:", fullUser);

            setCurrentUser(fullUser);
            localStorage.setItem('htamsUser', JSON.stringify(fullUser));
            localStorage.setItem('lastLoginType', 'trainer'); // ⭐ track source
            setLoading(false);
            return;
          }
        }

        // 3️⃣ Not found anywhere → logout
        await signOut(auth);
        localStorage.removeItem('htamsUser');
        localStorage.removeItem('lastLoginType');
        setCurrentUser(null);
        setLoading(false);
      } else {
        // ❌ On logout
        setCurrentUser(null);
        localStorage.removeItem('htamsUser');
        // keep lastLoginType so PrivateRoute knows where to go
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
