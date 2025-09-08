import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { auth, db } from '../firebase/config.js';
import { useNavigate } from 'react-router-dom';

function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    address: '',
    aadhar: '',
    phone: '',
    gender: '',
    dob: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isValidForm = () => {
    const { name, email, password, address, aadhar, phone, gender, dob } = form;
    return (
      name && email && password && address &&
      aadhar.length === 12 && phone.length === 10 &&
      gender && dob
    );
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!isValidForm()) {
      setError('Please fill all fields correctly.');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );
      const userId = userCredential.user.uid;

      const userData = {
        name: form.name,
        email: form.email,
        address: form.address,
        aadhar: form.aadhar,
        phone: form.phone,
        gender: form.gender,
        dob: form.dob,
        userType: 'Agency-A',
        registerDate: new Date().toISOString(),
      };

      await set(ref(db, `HTAMS/users/${userId}`), userData);

      // ✅ Save phone number and email to localStorage
      localStorage.setItem('htamsUser', JSON.stringify({
        phone: form.phone,
        email: form.email.toLowerCase()
      }));

      navigate('/dashboard/agency');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-[#0b1d3a] to-[#132c56] flex items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-2xl rounded-xl p-10 w-full max-w-lg"
      >
        <h2 className="text-3xl font-bold text-center text-[#0b1d3a] mb-6">
          Register as Agency
        </h2>

        {error && <p className="text-red-600 text-sm mb-4 text-center">{error}</p>}

        {[
          { label: 'Full Name', name: 'name', type: 'text' },
          { label: 'Email', name: 'email', type: 'email' },
          { label: 'Password', name: 'password', type: 'password' },
          { label: 'Address', name: 'address', type: 'text' },
          { label: 'Aadhar Number', name: 'aadhar', type: 'text' },
          { label: 'Phone Number', name: 'phone', type: 'text' },
          { label: 'Date of Birth', name: 'dob', type: 'date' },
        ].map(({ label, name, type }) => (
          <div className="mb-4" key={name}>
            <label className="block text-sm font-semibold text-[#0b1d3a] mb-1">
              {label}
            </label>
            <input
              type={type}
              name={name}
              value={form[name]}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0b1d3a] text-sm"
            />
          </div>
        ))}

        <div className="mb-6">
          <label className="block text-sm font-semibold text-[#0b1d3a] mb-1">
            Gender
          </label>
          <select
            name="gender"
            value={form.gender}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0b1d3a] text-sm"
          >
            <option value="">Select gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#0b1d3a] hover:bg-[#0e264d] text-white font-semibold py-2 rounded-md transition duration-200"
        >
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>
    </div>
  );
}

export default Register;
