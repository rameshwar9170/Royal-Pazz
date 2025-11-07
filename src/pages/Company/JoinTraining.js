import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { ref, get, update, push, runTransaction } from 'firebase/database';
import { db } from '../../firebase/config';
import { FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaShieldAlt, FaCheck, FaSpinner, FaCreditCard, FaRupeeSign, FaCalendarAlt, FaMoneyBillWave } from 'react-icons/fa';

// Indian States and Districts Data
const statesAndDistricts = {
  "Andaman and Nicobar Islands": ["Nicobar", "North and Middle Andaman", "South Andaman"],
  "Andhra Pradesh": ["Anantapur", "Chittoor", "East Godavari", "Guntur", "Krishna", "Kurnool", "Nellore", "Prakasam", "Srikakulam", "Visakhapatnam", "Vizianagaram", "West Godavari", "YSR Kadapa"],
  "Arunachal Pradesh": ["Anjaw", "Changlang", "Dibang Valley", "East Kameng", "East Siang", "Kamle", "Kra Daadi", "Kurung Kumey", "Lepa Rada", "Lohit", "Longding", "Lower Dibang Valley", "Lower Siang", "Lower Subansiri", "Namsai", "Pakke Kessang", "Papum Pare", "Shi Yomi", "Siang", "Tawang", "Tirap", "Upper Siang", "Upper Subansiri", "West Kameng", "West Siang"],
  "Assam": ["Baksa", "Barpeta", "Biswanath", "Bongaigaon", "Cachar", "Charaideo", "Chirang", "Darrang", "Dhemaji", "Dhubri", "Dibrugarh", "Dima Hasao", "Goalpara", "Golaghat", "Hailakandi", "Hojai", "Jorhat", "Kamrup", "Kamrup Metropolitan", "Karbi Anglong", "Karimganj", "Kokrajhar", "Lakhimpur", "Majuli", "Morigaon", "Nagaon", "Nalbari", "Sivasagar", "Sonitpur", "South Salmara-Mankachar", "Tinsukia", "Udalguri", "West Karbi Anglong"],
  "Bihar": ["Araria", "Arwal", "Aurangabad", "Banka", "Begusarai", "Bhagalpur", "Bhojpur", "Buxar", "Darbhanga", "East Champaran", "Gaya", "Gopalganj", "Jamui", "Jehanabad", "Kaimur", "Katihar", "Khagaria", "Kishanganj", "Lakhisarai", "Madhepura", "Madhubani", "Munger", "Muzaffarpur", "Nalanda", "Nawada", "Patna", "Purnia", "Rohtas", "Saharsa", "Samastipur", "Saran", "Sheikhpura", "Sheohar", "Sitamarhi", "Siwan", "Supaul", "Vaishali", "West Champaran"],
  "Chandigarh": ["Chandigarh"],
  "Chhattisgarh": ["Balod", "Baloda Bazar", "Balrampur", "Bastar", "Bemetara", "Bijapur", "Bilaspur", "Dantewada", "Dhamtari", "Durg", "Gariaband", "Gaurela Pendra Marwahi", "Janjgir Champa", "Jashpur", "Kabirdham", "Kanker", "Kondagaon", "Korba", "Koriya", "Mahasamund", "Mungeli", "Narayanpur", "Raigarh", "Raipur", "Rajnandgaon", "Sukma", "Surajpur", "Surguja"],
  "Dadra and Nagar Haveli and Daman and Diu": ["Dadra and Nagar Haveli", "Daman", "Diu"],
  "Delhi": ["Central Delhi", "East Delhi", "New Delhi", "North Delhi", "North East Delhi", "North West Delhi", "Shahdara", "South Delhi", "South East Delhi", "South West Delhi", "West Delhi"],
  "Goa": ["North Goa", "South Goa"],
  "Gujarat": ["Ahmedabad", "Amreli", "Anand", "Aravalli", "Banaskantha", "Bharuch", "Bhavnagar", "Botad", "Chhota Udaipur", "Dahod", "Dang", "Devbhoomi Dwarka", "Gandhinagar", "Gir Somnath", "Jamnagar", "Junagadh", "Kheda", "Kutch", "Mahisagar", "Mehsana", "Morbi", "Narmada", "Navsari", "Panchmahal", "Patan", "Porbandar", "Rajkot", "Sabarkantha", "Surat", "Surendranagar", "Tapi", "Vadodara", "Valsad"],
  "Haryana": ["Ambala", "Bhiwani", "Charkhi Dadri", "Faridabad", "Fatehabad", "Gurugram", "Hisar", "Jhajjar", "Jind", "Kaithal", "Karnal", "Kurukshetra", "Mahendragarh", "Nuh", "Palwal", "Panchkula", "Panipat", "Rewari", "Rohtak", "Sirsa", "Sonipat", "Yamunanagar"],
  "Himachal Pradesh": ["Bilaspur", "Chamba", "Hamirpur", "Kangra", "Kinnaur", "Kullu", "Lahaul and Spiti", "Mandi", "Shimla", "Sirmaur", "Solan", "Una"],
  "Jammu and Kashmir": ["Anantnag", "Bandipora", "Baramulla", "Budgam", "Doda", "Ganderbal", "Jammu", "Kathua", "Kishtwar", "Kulgam", "Kupwara", "Poonch", "Pulwama", "Rajouri", "Ramban", "Reasi", "Samba", "Shopian", "Srinagar", "Udhampur"],
  "Jharkhand": ["Bokaro", "Chatra", "Deoghar", "Dhanbad", "Dumka", "East Singhbhum", "Garhwa", "Giridih", "Godda", "Gumla", "Hazaribagh", "Jamtara", "Khunti", "Koderma", "Latehar", "Lohardaga", "Pakur", "Palamu", "Ramgarh", "Ranchi", "Sahebganj", "Seraikela Kharsawan", "Simdega", "West Singhbhum"],
  "Karnataka": ["Bagalkot", "Ballari", "Belagavi", "Bengaluru Rural", "Bengaluru Urban", "Bidar", "Chamarajanagar", "Chikkaballapur", "Chikkamagaluru", "Chitradurga", "Dakshina Kannada", "Davanagere", "Dharwad", "Gadag", "Hassan", "Haveri", "Kalaburagi", "Kodagu", "Kolar", "Koppal", "Mandya", "Mysuru", "Raichur", "Ramanagara", "Shivamogga", "Tumakuru", "Udupi", "Uttara Kannada", "Vijayapura", "Yadgir"],
  "Kerala": ["Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod", "Kollam", "Kottayam", "Kozhikode", "Malappuram", "Palakkad", "Pathanamthitta", "Thiruvananthapuram", "Thrissur", "Wayanad"],
  "Ladakh": ["Kargil", "Leh"],
  "Lakshadweep": ["Lakshadweep"],
  "Madhya Pradesh": ["Agar Malwa", "Alirajpur", "Anuppur", "Ashoknagar", "Balaghat", "Barwani", "Betul", "Bhind", "Bhopal", "Burhanpur", "Chhatarpur", "Chhindwara", "Damoh", "Datia", "Dewas", "Dhar", "Dindori", "Guna", "Gwalior", "Harda", "Hoshangabad", "Indore", "Jabalpur", "Jhabua", "Katni", "Khandwa", "Khargone", "Mandla", "Mandsaur", "Morena", "Narsinghpur", "Neemuch", "Niwari", "Panna", "Raisen", "Rajgarh", "Ratlam", "Rewa", "Sagar", "Satna", "Sehore", "Seoni", "Shahdol", "Shajapur", "Sheopur", "Shivpuri", "Sidhi", "Singrauli", "Tikamgarh", "Ujjain", "Umaria", "Vidisha"],
  "Maharashtra": ["Ahmednagar", "Akola", "Amravati", "Aurangabad", "Beed", "Bhandara", "Buldhana", "Chandrapur", "Dhule", "Gadchiroli", "Gondia", "Hingoli", "Jalgaon", "Jalna", "Kolhapur", "Latur", "Mumbai City", "Mumbai Suburban", "Nagpur", "Nanded", "Nandurbar", "Nashik", "Osmanabad", "Palghar", "Parbhani", "Pune", "Raigad", "Ratnagiri", "Sangli", "Satara", "Sindhudurg", "Solapur", "Thane", "Wardha", "Washim", "Yavatmal"],
  "Manipur": ["Bishnupur", "Chandel", "Churachandpur", "Imphal East", "Imphal West", "Jiribam", "Kakching", "Kamjong", "Kangpokpi", "Noney", "Pherzawl", "Senapati", "Tamenglong", "Tengnoupal", "Thoubal", "Ukhrul"],
  "Meghalaya": ["East Garo Hills", "East Jaintia Hills", "East Khasi Hills", "North Garo Hills", "Ri Bhoi", "South Garo Hills", "South West Garo Hills", "South West Khasi Hills", "West Garo Hills", "West Jaintia Hills", "West Khasi Hills"],
  "Mizoram": ["Aizawl", "Champhai", "Hnahthial", "Kolasib", "Khawzawl", "Lawngtlai", "Lunglei", "Mamit", "Saiha", "Saitual", "Serchhip"],
  "Nagaland": ["Chumukedima", "Dimapur", "Kiphire", "Kohima", "Longleng", "Mokokchung", "Mon", "Niuland", "Noklak", "Peren", "Phek", "Shamator", "Tseminyu", "Tuensang", "Wokha", "Zunheboto"],
  "Odisha": ["Angul", "Balangir", "Balasore", "Bargarh", "Bhadrak", "Boudh", "Cuttack", "Deogarh", "Dhenkanal", "Gajapati", "Ganjam", "Jagatsinghpur", "Jajpur", "Jharsuguda", "Kalahandi", "Kandhamal", "Kendrapara", "Kendujhar", "Khordha", "Koraput", "Malkangiri", "Mayurbhanj", "Nabarangpur", "Nayagarh", "Nuapada", "Puri", "Rayagada", "Sambalpur", "Subarnapur", "Sundargarh"],
  "Puducherry": ["Karaikal", "Mahe", "Puducherry", "Yanam"],
  "Punjab": ["Amritsar", "Barnala", "Bathinda", "Faridkot", "Fatehgarh Sahib", "Fazilka", "Ferozepur", "Gurdaspur", "Hoshiarpur", "Jalandhar", "Kapurthala", "Ludhiana", "Malerkotla", "Mansa", "Moga", "Mohali", "Muktsar", "Pathankot", "Patiala", "Rupnagar", "Sangrur", "Shaheed Bhagat Singh Nagar", "Tarn Taran"],
  "Rajasthan": ["Ajmer", "Alwar", "Banswara", "Baran", "Barmer", "Bharatpur", "Bhilwara", "Bikaner", "Bundi", "Chittorgarh", "Churu", "Dausa", "Dholpur", "Dungarpur", "Hanumangarh", "Jaipur", "Jaisalmer", "Jalore", "Jhalawar", "Jhunjhunu", "Jodhpur", "Karauli", "Kota", "Nagaur", "Pali", "Pratapgarh", "Rajsamand", "Sawai Madhopur", "Sikar", "Sirohi", "Sri Ganganagar", "Tonk", "Udaipur"],
  "Sikkim": ["East Sikkim", "North Sikkim", "Pakyong", "Soreng", "South Sikkim", "West Sikkim"],
  "Tamil Nadu": ["Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri", "Dindigul", "Erode", "Kallakurichi", "Kanchipuram", "Kanyakumari", "Karur", "Krishnagiri", "Madurai", "Mayiladuthurai", "Nagapattinam", "Namakkal", "Nilgiris", "Perambalur", "Pudukkottai", "Ramanathapuram", "Ranipet", "Salem", "Sivaganga", "Tenkasi", "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli", "Tirunelveli", "Tirupathur", "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur", "Vellore", "Viluppuram", "Virudhunagar"],
  "Telangana": ["Adilabad", "Bhadradri Kothagudem", "Hyderabad", "Jagtial", "Jangaon", "Jayashankar", "Jogulamba", "Kamareddy", "Karimnagar", "Khammam", "Komaram Bheem", "Mahabubabad", "Mahbubnagar", "Mancherial", "Medak", "Medchal Malkajgiri", "Mulugu", "Nagarkurnool", "Nalgonda", "Narayanpet", "Nirmal", "Nizamabad", "Peddapalli", "Rajanna Sircilla", "Rangareddy", "Sangareddy", "Siddipet", "Suryapet", "Vikarabad", "Wanaparthy", "Warangal Rural", "Warangal Urban", "Yadadri Bhuvanagiri"],
  "Tripura": ["Dhalai", "Gomati", "Khowai", "North Tripura", "Sepahijala", "South Tripura", "Unakoti", "West Tripura"],
  "Uttar Pradesh": ["Agra", "Aligarh", "Ambedkar Nagar", "Amethi", "Amroha", "Auraiya", "Ayodhya", "Azamgarh", "Baghpat", "Bahraich", "Ballia", "Balrampur", "Banda", "Barabanki", "Bareilly", "Basti", "Bhadohi", "Bijnor", "Budaun", "Bulandshahr", "Chandauli", "Chitrakoot", "Deoria", "Etah", "Etawah", "Farrukhabad", "Fatehpur", "Firozabad", "Gautam Buddha Nagar", "Ghaziabad", "Ghazipur", "Gonda", "Gorakhpur", "Hamirpur", "Hapur", "Hardoi", "Hathras", "Jalaun", "Jaunpur", "Jhansi", "Kannauj", "Kanpur Dehat", "Kanpur Nagar", "Kasganj", "Kaushambi", "Kheri", "Kushinagar", "Lalitpur", "Lucknow", "Maharajganj", "Mahoba", "Mainpuri", "Mathura", "Mau", "Meerut", "Mirzapur", "Moradabad", "Muzaffarnagar", "Pilibhit", "Pratapgarh", "Prayagraj", "Raebareli", "Rampur", "Saharanpur", "Sambhal", "Sant Kabir Nagar", "Shahjahanpur", "Shamli", "Shravasti", "Siddharthnagar", "Sitapur", "Sonbhadra", "Sultanpur", "Unnao", "Varanasi"],
  "Uttarakhand": ["Almora", "Bageshwar", "Chamoli", "Champawat", "Dehradun", "Haridwar", "Nainital", "Pauri", "Pithoragarh", "Rudraprayag", "Tehri", "Udham Singh Nagar", "Uttarkashi"],
  "West Bengal": ["Alipurduar", "Bankura", "Birbhum", "Cooch Behar", "Dakshin Dinajpur", "Darjeeling", "Hooghly", "Howrah", "Jalpaiguri", "Jhargram", "Kalimpong", "Kolkata", "Malda", "Murshidabad", "Nadia", "North 24 Parganas", "Paschim Bardhaman", "Paschim Medinipur", "Purba Bardhaman", "Purba Medinipur", "Purulia", "South 24 Parganas", "Uttar Dinajpur"]
};


// Module-level cache keyed by training id
const cachedTrainingData = {};


// Razorpay script loader
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      existingScript.onload = () => resolve(true);
      existingScript.onerror = () => resolve(false);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      console.log('Razorpay script loaded successfully');
      resolve(true);
    };
    script.onerror = (error) => {
      console.error('Failed to load Razorpay script:', error);
      resolve(false);
    };
    
    document.head.appendChild(script);
  });
};


// WhatsApp API Function
const sendWhatsAppNotification = async (participantName, mobile, trainingDate) => {
  try {
    console.log('=== SENDING WHATSAPP NOTIFICATION ===');
    console.log('Name:', participantName);
    console.log('Mobile:', mobile);
    console.log('Training Date:', trainingDate);
    
    const webhookUrl = 'https://webhook.whatapi.in/webhook/15c1b9845c02d3c29df';
    
    // Format mobile number - ensure it has country code
    let formattedMobile = mobile.toString().replace(/\D/g, '');
    if (!formattedMobile.startsWith('91') && formattedMobile.length === 10) {
      formattedMobile = '91' + formattedMobile;
    }
    
    // Construct message with participant details
    const message = `ramsir1,${participantName},${trainingDate}`;
    
    // Build full URL with query parameters
    const fullUrl = `${webhookUrl}?number=${formattedMobile}&message=${encodeURIComponent(message)}`;
    
    console.log('WhatsApp API URL:', fullUrl);
    
    // Send GET request to WhatsApp API
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.text();
      console.log('✅ WhatsApp notification sent successfully');
      console.log('Response:', data);
      return true;
    } else {
      console.error('❌ WhatsApp notification failed. Status:', response.status);
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ WhatsApp API Error:', error);
    return false;
  }
};


const JoinTraining = () => {
  const { id } = useParams();
  const location = useLocation();

  const getQueryParam = (key) => {
    return new URLSearchParams(location.search).get(key);
  };

  const [formMode, setFormMode] = useState('user');
  const [training, setTraining] = useState(null);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPayment, setShowPayment] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [formLocked, setFormLocked] = useState(false);
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  const [availableDistricts, setAvailableDistricts] = useState([]);

  const [participant, setParticipant] = useState({
    name: '',
    firmName: '',
    mobile: '',
    email: '',
    dateOfBirth: '',
    referredBy: '',
    referredByName: '',
    address: '',
    city: '',
    state: '',
    pin: '',
  });

  // Field validation functions
  const validateName = (name) => {
    const nameRegex = /^[a-zA-Z\s]+$/;
    if (!name) return 'Name is required';
    if (name.length < 2) return 'Name must be at least 2 characters long';
    if (name.length > 50) return 'Name must not exceed 50 characters';
    if (!nameRegex.test(name)) return 'Name can only contain letters and spaces';
    if (name.trim() !== name) return 'Name cannot have leading or trailing spaces';
    if (/\s{2,}/.test(name)) return 'Name cannot have multiple consecutive spaces';
    return '';
  };

  const validateFirmName = (firmName) => {
    const firmNameRegex = /^[a-zA-Z0-9\s&.-]+$/;
    if (!firmName) return 'Firm name is required';
    if (firmName.length < 2) return 'Firm name must be at least 2 characters long';
    if (firmName.length > 100) return 'Firm name must not exceed 100 characters';
    if (!firmNameRegex.test(firmName)) return 'Firm name can only contain letters, numbers, spaces, &, ., and -';
    if (firmName.trim() !== firmName) return 'Firm name cannot have leading or trailing spaces';
    if (/\s{2,}/.test(firmName)) return 'Firm name cannot have multiple consecutive spaces';
    return '';
  };

  const validateMobile = (mobile) => {
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobile) return 'Mobile number is required';
    if (!/^\d+$/.test(mobile)) return 'Mobile number can only contain digits';
    if (!mobileRegex.test(mobile)) return 'Enter a valid 10-digit Indian mobile number starting with 6-9';
    return '';
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return 'Email is required';
    if (email.length > 100) return 'Email must not exceed 100 characters';
    if (!emailRegex.test(email)) return 'Enter a valid email address';
    if (email !== email.toLowerCase()) return 'Email should be in lowercase';
    return '';
  };

  const validateDateOfBirth = (dob) => {
    if (!dob) return 'Date of birth is required';
    
    const selectedDate = new Date(dob);
    const today = new Date();
    const age = today.getFullYear() - selectedDate.getFullYear();
    const monthDiff = today.getMonth() - selectedDate.getMonth();
    
    if (selectedDate > today) return 'Date of birth cannot be in the future';
    if (age < 16 || (age === 16 && monthDiff < 0)) return 'Must be at least 16 years old';
    if (age > 100) return 'Please enter a valid date of birth';
    
    return '';
  };

  const validateAddress = (address) => {
    const addressRegex = /^[a-zA-Z0-9\s,./\-#()]+$/;
    if (!address) return 'Address is required';
    if (address.length < 10) return 'Address must be at least 10 characters long';
    if (address.length > 200) return 'Address must not exceed 200 characters';
    if (!addressRegex.test(address)) return 'Address contains invalid characters';
    if (address.trim() !== address) return 'Address cannot have leading or trailing spaces';
    if (/\s{2,}/.test(address)) return 'Address cannot have multiple consecutive spaces';
    return '';
  };

  const validateCity = (city) => {
    if (!city) return 'District is required';
    return '';
  };

  const validateState = (state) => {
    if (!state) return 'State is required';
    return '';
  };

  const validatePin = (pin) => {
    const pinRegex = /^\d{6}$/;
    if (!pin) return 'PIN code is required';
    if (!/^\d+$/.test(pin)) return 'PIN code can only contain digits';
    if (!pinRegex.test(pin)) return 'Enter a valid 6-digit PIN code';
    if (pin.startsWith('0')) return 'PIN code cannot start with 0';
    return '';
  };

  const validateField = (name, value) => {
    switch (name) {
      case 'name': return validateName(value);
      case 'firmName': return validateFirmName(value);
      case 'mobile': return validateMobile(value);
      case 'email': return validateEmail(value);
      case 'dateOfBirth': return validateDateOfBirth(value);
      case 'address': return validateAddress(value);
      case 'city': return validateCity(value);
      case 'state': return validateState(value);
      case 'pin': return validatePin(value);
      default: return '';
    }
  };

  useEffect(() => {
    const referrer = getQueryParam('ref');
    if (referrer) {
      setParticipant((p) => ({ ...p, referredBy: referrer }));
      fetchReferrerName(referrer);
    }
  }, [location.search]);

  const fetchReferrerName = async (referrerId) => {
    try {
      const userRef = ref(db, `HTAMS/users/${referrerId}`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        const userData = snapshot.val();
        const referrerName = userData.name || userData.firmName || 'Unknown';
        setParticipant((p) => ({ ...p, referredByName: referrerName }));
      } else {
        setParticipant((p) => ({ ...p, referredByName: referrerId }));
      }
    } catch (error) {
      console.error('Error fetching referrer name:', error);
      setParticipant((p) => ({ ...p, referredByName: referrerId }));
    }
  };

  useEffect(() => {
    const fetchTraining = async () => {
      if (cachedTrainingData[id]) {
        const data = cachedTrainingData[id];
        if (data.expiresAt && Date.now() > data.expiresAt) {
          setMessage('This training link has expired.');
        } else {
          setTraining(data);
        }
        return;
      }
      try {
        const snap = await get(ref(db, `HTAMS/company/trainings/${id}`));
        if (snap.exists()) {
          const data = snap.val();
          if (data.expiresAt && Date.now() > data.expiresAt) {
            setMessage('This training link has expired.');
          } else {
            cachedTrainingData[id] = data;
            setTraining(data);
          }
        } else {
          setMessage('Training not found or invalid link.');
        }
      } catch {
        setMessage('Error loading training. Please try again.');
      }
    };

    fetchTraining();
  }, [id, location.search]);

  const checkEmailExists = async (email) => {
    const emailKey = email.toLowerCase().replace(/\./g, ',');
    try {
      const snap = await get(ref(db, `HTAMS/emails/${emailKey}`));
      if (snap.exists()) {
        setMessage('This email is already registered.');
        return true;
      }
      return false;
    } catch {
      setMessage('Error checking email. Please try again.');
      return true;
    }
  };

  const handleChange = async (e) => {
    if (formLocked || paymentInProgress) return;

    const { name, value } = e.target;
    let processedValue = value;

    switch (name) {
      case 'name':
        processedValue = value.replace(/[^a-zA-Z\s]/g, '').replace(/\s+/g, ' ');
        break;
      case 'firmName':
        processedValue = value.replace(/[^a-zA-Z0-9\s&.-]/g, '').replace(/\s+/g, ' ');
        break;
      case 'mobile':
        processedValue = value.replace(/\D/g, '').slice(0, 10);
        break;
      case 'email':
        processedValue = value.toLowerCase().trim();
        break;
      case 'pin':
        processedValue = value.replace(/\D/g, '').slice(0, 6);
        break;
      case 'address':
        processedValue = value.replace(/[^a-zA-Z0-9\s,./\-#()]/g, '').replace(/\s+/g, ' ');
        break;
      case 'state':
        processedValue = value;
        // Update available districts when state changes
        if (value && statesAndDistricts[value]) {
          setAvailableDistricts(statesAndDistricts[value]);
          // Reset city/district when state changes
          setParticipant(prev => ({ ...prev, state: value, city: '' }));
        } else {
          setAvailableDistricts([]);
          setParticipant(prev => ({ ...prev, state: value, city: '' }));
        }
        break;
      case 'city':
        processedValue = value;
        break;
      case 'dateOfBirth':
        processedValue = value;
        break;
      default:
        break;
    }

    if (name !== 'state') {
      setParticipant((prev) => ({ ...prev, [name]: processedValue }));
    }

    const error = validateField(name, processedValue);
    setFieldErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleModeChange = (mode) => {
    if (formLocked || paymentInProgress) return;
    setFormMode(mode);
  };

  const handleRazorpayPayment = async () => {
    setPaymentLoading(true);
    setPaymentInProgress(true);
    
    try {
      const razorpayKey = process.env.REACT_APP_RAZORPAY_KEY_ID || 'rzp_live_ROD6hgnZj6TWv3';
      
      console.log('=== TRAINING PAYMENT DEBUG ===');
      console.log('Training fees:', training.fees);
      console.log('Participant:', formMode === 'user' ? participant.name : participant.firmName);
      console.log('===============================');

      const isLoaded = await loadRazorpayScript();
      if (!isLoaded || !window.Razorpay) {
        alert('Payment system failed to load. Please refresh the page and try again.');
        setPaymentLoading(false);
        setPaymentInProgress(false);
        return;
      }

      const options = {
        key: razorpayKey,
        amount: Math.round(training.fees * 100),
        currency: 'INR',
        name: 'Training Registration',
        description: `Training: ${training.location} on ${training.startDate}`,
        
        handler: async (response) => {
          try {
            console.log('=== PAYMENT SUCCESS ===');
            console.log('Payment ID:', response.razorpay_payment_id);
            console.log('=======================');

            if (!response.razorpay_payment_id) {
              throw new Error('Invalid payment response');
            }

            const paymentDetails = {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id || null,
              razorpay_signature: response.razorpay_signature || null,
              payment_status: 'success',
              payment_timestamp: Date.now(),
              amount_paid: training.fees,
              currency: 'INR',
              training_id: id,
              payment_method: 'online'
            };

            await completeRegistrationWithPayment(paymentDetails);
            
          } catch (error) {
            console.error('Registration completion error:', error);
            alert(`Payment successful but registration failed.\nPayment ID: ${response.razorpay_payment_id}\nPlease contact support.`);
            setPaymentLoading(false);
            setPaymentInProgress(false);
          }
        },

        prefill: {
          name: formMode === 'user' ? participant.name : participant.firmName,
          email: participant.email,
          contact: participant.mobile,
        },

        theme: { color: '#4682B4' },

        modal: {
          ondismiss: () => {
            console.log('Payment modal dismissed by user');
            setPaymentLoading(false);
            setPaymentInProgress(false);
          },
        },

        notes: {
          training_id: id,
          participant_type: formMode,
          participant_name: formMode === 'user' ? participant.name : participant.firmName,
          participant_email: participant.email,
          participant_mobile: participant.mobile
        }
      };

      if (options.amount <= 0) {
        alert('Invalid training fees amount.');
        setPaymentLoading(false);
        setPaymentInProgress(false);
        return;
      }

      console.log(`Opening Razorpay payment for ₹${training.fees}...`);
      const rzp = new window.Razorpay(options);

      rzp.on('payment.failed', (response) => {
        console.error('Payment failed:', response.error);
        alert(`Payment failed for training fees ₹${training.fees}.\n\n${response.error.description || 'Unknown error occurred'}`);
        setPaymentLoading(false);
        setPaymentInProgress(false);
      });

      rzp.open();

    } catch (error) {
      console.error('Payment initialization error:', error);
      alert('Failed to initialize payment. Please try again.');
      setPaymentLoading(false);
      setPaymentInProgress(false);
    }
  };

  const handleCashPayment = async () => {
    setPaymentLoading(true);
    setPaymentInProgress(true);
    
    try {
      console.log('=== CASH PAYMENT REGISTRATION ===');
      console.log('Training fees:', training.fees);
      console.log('Participant:', formMode === 'user' ? participant.name : participant.firmName);
      console.log('==================================');

      const paymentDetails = {
        payment_status: 'pending_cash',
        payment_timestamp: Date.now(),
        amount_due: training.fees,
        currency: 'INR',
        training_id: id,
        payment_method: 'cash',
        cash_payment_note: 'Payment to be made in cash at training venue'
      };

      await completeRegistrationWithPayment(paymentDetails);
      
    } catch (error) {
      console.error('Cash registration error:', error);
      alert('Failed to register for cash payment. Please try again.');
      setPaymentLoading(false);
      setPaymentInProgress(false);
    }
  };

  const completeRegistrationWithPayment = async (paymentDetails) => {
    const trainingRef = ref(db, `HTAMS/company/trainings/${id}`);
    let canJoin = false;

    await runTransaction(trainingRef, (data) => {
      if (data) {
        if ((data.joinedCount || 0) >= (data.candidates || 0)) return undefined;
        return { ...data, joinedCount: (data.joinedCount || 0) + 1 };
      }
      return data;
    }).then(r => { canJoin = r.committed; });

    if (!canJoin) {
      setMessage('All slots are filled for this training.');
      await update(trainingRef, { expiresAt: Date.now() });
      setPaymentLoading(false);
      setPaymentInProgress(false);
      return;
    }

    const pKey = push(ref(db, `HTAMS/company/trainings/${id}/participants`)).key;
    const emailKey = participant.email.toLowerCase().replace(/\./g, ',');

    const baseData = formMode === 'user'
      ? { name: participant.name }
      : { firmName: participant.firmName, name: participant.firmName };

    const newParticipant = {
      ...baseData,
      mobile: participant.mobile,
      email: participant.email,
      dateOfBirth: participant.dateOfBirth,
      referredBy: participant.referredBy,
      address: participant.address,
      city: participant.city,
      state: participant.state,
      pin: participant.pin,
      trainingId: id,
      joinedAt: Date.now(),
      status: 'joined',
      confirmedByTrainer: false,
      formMode,
      paymentDetails,
      feePaid: paymentDetails.payment_method === 'cash' ? 0 : training.fees,
      paymentStatus: paymentDetails.payment_method === 'cash' ? 'pending_cash' : 'completed'
    };

    const updates = {};
    updates[`HTAMS/company/trainings/${id}/participants/${pKey}`] = newParticipant;
    updates[`HTAMS/emails/${emailKey}`] = { trainingId: id, type: 'training', timestamp: Date.now() };
    updates[`HTAMS/company/trainings/${id}/updatedAt`] = Date.now();

    await update(ref(db), updates);

    // Send WhatsApp notification after successful registration
    const participantName = formMode === 'user' ? participant.name : participant.firmName;
    const whatsappSent = await sendWhatsAppNotification(
      participantName,
      participant.mobile,
      training.startDate
    );

    if (paymentDetails.payment_method === 'cash') {
      setMessage(`✅ Registration successful! ${whatsappSent ? 'WhatsApp confirmation sent. ' : ''}\nYou can pay cash at the training venue.\nAmount to pay: ₹${training.fees}\nPlease bring exact change to the training location.`);
    } else {
      setMessage(`✅ Payment successful! Training registration completed. ${whatsappSent ? 'WhatsApp confirmation sent. ' : ''}\nPayment ID: ${paymentDetails.razorpay_payment_id}\nAmount: ₹${training.fees}`);
    }
    
    setShowPayment(false);
    setPaymentLoading(false);
    setPaymentInProgress(false);
    
    setParticipant({
      name: '', firmName: '', mobile: '', email: '', dateOfBirth: '', referredBy: participant.referredBy, referredByName: participant.referredByName,
      address: '', city: '', state: '', pin: '',
    });
    setFieldErrors({});
    setFormLocked(false);
    setAvailableDistricts([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const requiredFieldsUser = ['name', 'mobile', 'email', 'dateOfBirth', 'address', 'city', 'state', 'pin'];
    const requiredFieldsFirm = ['firmName', 'mobile', 'email', 'dateOfBirth', 'address', 'city', 'state', 'pin'];
    const requiredFields = formMode === 'user' ? requiredFieldsUser : requiredFieldsFirm;

    let hasErrors = false;
    const newFieldErrors = {};
    for (const field of requiredFields) {
      const error = validateField(field, participant[field]);
      if (error) {
        newFieldErrors[field] = error;
        hasErrors = true;
      }
    }

    setFieldErrors(newFieldErrors);

    if (hasErrors) {
      setMessage('Please fix all field errors before proceeding.');
      setIsSubmitting(false);
      return;
    }

    setMessage('Checking if email is already registered...');
    if (await checkEmailExists(participant.email)) {
      setIsSubmitting(false);
      return;
    }

    setFormLocked(true);
    setShowPayment(true);
    setIsSubmitting(false);
    setMessage('');
  };

  const handleBackToForm = () => {
    if (paymentInProgress) return;
    setShowPayment(false);
    setFormLocked(false);
  };

  return (
    <div className="join-training-container">
     <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        /* Base Container - Mobile App Style */
        .join-training-container {
          font-family: 'Inter', sans-serif;
          padding: 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          max-width: 100%;
          overflow-x: hidden;
        }

        /* Page Header - Compact Mobile Style */
        .page-header {
          text-align: center;
          margin-bottom: 16px;
          padding: 20px 16px;
          background: rgba(255, 255, 255, 0.95);
          border-radius: 20px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          backdrop-filter: blur(10px);
        }

        .page-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 6px 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .title-icon {
          color: #6366f1;
          font-size: 1.3rem;
        }

        .page-subtitle {
          color: #64748b;
          font-size: 0.9rem;
          margin: 0;
        }

        /* Form Mode Section - Mobile App Cards */
        .form-mode-section {
          margin-bottom: 16px;
        }

        .mode-selector {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          background: rgba(255, 255, 255, 0.95);
          padding: 16px;
          border-radius: 20px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          backdrop-filter: blur(10px);
        }

        .mode-option {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 14px 10px;
          border: 2px solid #e2e8f0;
          border-radius: 16px;
          background: white;
          color: #64748b;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          min-height: 70px;
          text-align: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .mode-option:hover:not(.disabled) {
          border-color: #6366f1;
          color: #6366f1;
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(99, 102, 241, 0.2);
        }

        .mode-option.active {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          border-color: #6366f1;
          color: white;
          box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
        }

        .mode-option.disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background: #f8fafc;
          border-color: #e2e8f0;
          color: #94a3b8;
        }

        .mode-icon {
          font-size: 1.1rem;
        }

        .mode-option span {
          font-size: 0.8rem;
          font-weight: 600;
          line-height: 1.2;
        }

        /* Training Details Card - Mobile Optimized */
        .training-details-card {
          background: rgba(255, 255, 255, 0.95);
          border-radius: 20px;
          padding: 16px;
          margin-bottom: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          backdrop-filter: blur(10px);
        }

        .card-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 12px 0;
          padding-bottom: 8px;
          border-bottom: 2px solid #f1f5f9;
        }

        .training-details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 3px;
          padding: 10px;
          background: rgba(248, 250, 252, 0.8);
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          transition: all 0.3s ease;
          text-align: center;
        }

        .detail-item:hover {
          background: #f1f5f9;
          border-color: #6366f1;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .detail-label {
          font-weight: 500;
          color: #64748b;
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .detail-value {
          font-weight: 600;
          color: #1e293b;
          font-size: 0.8rem;
          word-break: break-word;
        }

        .detail-item.fee-item {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border-color: #f59e0b;
        }

        .detail-item.fee-item .detail-value {
          color: #92400e;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 2px;
          font-size: 0.9rem;
        }

        .detail-item.slots-item {
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          border-color: #3b82f6;
        }

        .detail-item.slots-item .detail-value {
          color: #1e40af;
          font-weight: 700;
        }

        /* Payment Section Styles */
        .payment-section {
          margin-bottom: 16px;
          animation: slideInUp 0.4s ease-out;
        }

        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .payment-card {
          background: rgba(255, 255, 255, 0.95);
          border-radius: 20px;
          padding: 20px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          backdrop-filter: blur(10px);
          border: 2px solid #f1f5f9;
        }

        .payment-card .card-title {
          color: #6366f1;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 1.1rem;
        }

        .security-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: #f0fdf4;
          color: #166534;
          padding: 10px 14px;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 600;
          margin-bottom: 16px;
          border: 1px solid #bbf7d0;
        }

        .payment-details {
          background: rgba(248, 250, 252, 0.8);
          border-radius: 16px;
          padding: 16px;
          margin-bottom: 20px;
          border-left: 4px solid #6366f1;
        }

        .payment-details p {
          margin: 6px 0;
          font-size: 0.8rem;
          color: #374151;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .payment-details strong {
          color: #1e293b;
          font-weight: 600;
        }

        /* Payment Options Container */
        .payment-options {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 20px;
        }

        /* Online Payment Button */
        .payment-button {
          width: 100%;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: none;
          border-radius: 16px;
          padding: 14px 20px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3);
        }

        .payment-button:hover:not(.disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
        }

        .payment-button.disabled {
          background: #94a3b8;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
          opacity: 0.7;
        }

        /* Cash Payment Button */
        .cash-payment-button {
          width: 100%;
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
          border: none;
          border-radius: 16px;
          padding: 14px 20px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-shadow: 0 4px 16px rgba(245, 158, 11, 0.3);
        }

        .cash-payment-button:hover:not(.disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4);
        }

        .cash-payment-button.disabled {
          background: #94a3b8;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
          opacity: 0.7;
        }

        /* Payment Divider */
        .payment-divider {
          position: relative;
          text-align: center;
          margin: 16px 0;
        }

        .payment-divider::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          height: 1px;
          background: #e2e8f0;
        }

        .payment-divider span {
          background: rgba(255, 255, 255, 0.95);
          padding: 0 16px;
          color: #64748b;
          font-size: 0.85rem;
          font-weight: 600;
        }

        /* Cash Payment Info */
        .cash-payment-info {
          background: rgba(255, 251, 235, 0.8);
          border: 1px solid #fbbf24;
          border-radius: 12px;
          padding: 12px;
          margin-bottom: 12px;
          font-size: 0.8rem;
          color: #92400e;
          line-height: 1.4;
        }

        .back-button {
          width: 100%;
          background: transparent;
          color: #64748b;
          border: 2px solid #e2e8f0;
          border-radius: 16px;
          padding: 10px 20px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .back-button:hover:not(:disabled) {
          background: rgba(248, 250, 252, 0.8);
          border-color: #cbd5e1;
          color: #374151;
        }

        .back-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .payment-methods {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-top: 16px;
          opacity: 0.7;
        }

        .payment-method-icon {
          width: 40px;
          height: 24px;
          background: #f3f4f6;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          color: #6b7280;
          font-weight: 700;
          border: 1px solid #e5e7eb;
        }

        /* Registration Form - Mobile App Style */
        .registration-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-section {
          background: rgba(255, 255, 255, 0.95);
          border-radius: 20px;
          padding: 18px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          backdrop-filter: blur(10px);
        }

        .section-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 16px 0;
          display: flex;
          align-items: center;
          gap: 10px;
          padding-bottom: 10px;
          border-bottom: 2px solid #f1f5f9;
        }

        .section-icon {
          color: #6366f1;
          font-size: 1rem;
        }

        /* Mobile App Form Grid - Single Column on Mobile */
        .form-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group.full-width {
          grid-column: 1 / -1;
        }

        .form-label {
          font-weight: 600;
          color: #374151;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 2px;
        }

        .label-icon {
          color: #6366f1;
          font-size: 0.8rem;
        }

        /* Mobile-First Input Design */
        .form-input {
          padding: 14px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 16px;
          font-family: inherit;
          font-size: 16px; /* Prevents zoom on iOS */
          transition: all 0.3s ease;
          box-sizing: border-box;
          background: rgba(255, 255, 255, 0.9);
          -webkit-appearance: none; /* Remove iOS styling */
          -moz-appearance: none;
          appearance: none;
        }

        .form-input:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
          background: white;
          transform: translateY(-1px);
        }

        .form-input.readonly {
          background: rgba(248, 250, 252, 0.8);
          cursor: not-allowed;
          opacity: 0.7;
        }

        .form-input.error {
          border-color: #ef4444;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
          background: #fef2f2;
        }

        .form-input.success {
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        }

        /* Date Input Specific Styling */
        .form-input[type="date"] {
          position: relative;
          color: #374151;
        }

        .form-input[type="date"]::-webkit-calendar-picker-indicator {
          cursor: pointer;
          border-radius: 4px;
          margin-left: 8px;
          opacity: 0.6;
        }

        .form-input[type="date"]:hover::-webkit-calendar-picker-indicator {
          opacity: 1;
        }

        .error-message {
          color: #ef4444;
          font-size: 0.75rem;
          font-weight: 600;
          margin-top: 4px;
          padding-left: 4px;
        }

        .success-message {
          color: #10b981;
          font-size: 0.75rem;
          font-weight: 600;
          margin-top: 4px;
          padding-left: 4px;
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Submit Button - Mobile App Style */
        .submit-button {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: none;
          padding: 16px 24px;
          border-radius: 20px;
          font-size: 1.1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-top: 20px;
          box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3);
        }

        .submit-button:hover:not(.disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
        }

        .submit-button.disabled {
          background: #94a3b8;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        /* Notification - Mobile App Style */
        .notification {
          padding: 14px 18px;
          margin-top: 16px;
          border-radius: 16px;
          font-weight: 600;
          text-align: center;
          animation: slideIn 0.3s ease-out;
          font-size: 0.9rem;
        }

        .notification.success {
          background: rgba(240, 253, 244, 0.95);
          color: #15803d;
          border: 2px solid #22c55e;
          backdrop-filter: blur(10px);
        }

        .notification.error {
          background: rgba(254, 242, 242, 0.95);
          color: #dc2626;
          border: 2px solid #ef4444;
          backdrop-filter: blur(10px);
        }

        .notification.info {
          background: rgba(240, 249, 255, 0.95);
          color: #0369a1;
          border: 2px solid #0ea5e9;
          backdrop-filter: blur(10px);
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Mobile Specific Optimizations */
        @media (max-width: 320px) {
          .join-training-container {
            padding: 10px;
          }
          
          .training-details-card,
          .form-section,
          .payment-card {
            padding: 14px;
          }
          
          .training-details-grid {
            gap: 6px;
          }
          
          .detail-item {
            padding: 8px;
          }
          
          .detail-label {
            font-size: 0.65rem;
          }
          
          .detail-value {
            font-size: 0.75rem;
          }
          
          .form-input {
            padding: 12px 14px;
          }
        }

        /* Small Mobile Optimizations */
        @media (max-width: 480px) {
          .page-title {
            font-size: 1.4rem;
          }
          
          .mode-option span {
            font-size: 0.75rem;
          }
          
          .form-grid {
            gap: 14px;
          }
        }

        /* Tablet Styles */
        @media (min-width: 768px) {
          .join-training-container {
            padding: 20px;
            max-width: 900px;
            margin: 0 auto;
          }

          .training-details-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
          }

          .form-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
          }

          .payment-methods {
            gap: 12px;
          }

          .payment-method-icon {
            width: 45px;
            height: 26px;
            font-size: 0.75rem;
          }
        }

        /* Desktop Styles */
        @media (min-width: 1024px) {
          .join-training-container {
            padding: 24px;
            max-width: 1000px;
          }
          
          .mode-selector {
            max-width: 600px;
            margin: 0 auto;
            gap: 16px;
          }
          
          .mode-option {
            padding: 20px 16px;
            min-height: 85px;
          }
          
          .mode-option span {
            font-size: 0.9rem;
          }

          .form-grid {
            grid-template-columns: repeat(3, 1fr);
          }

          .payment-card {
            max-width: 600px;
            margin: 0 auto;
          }
        }
      `}</style>
      <div className="page-header">
        <h1 className="page-title">
          <FaShieldAlt className="title-icon" />
          Join Training Program
        </h1>
        <p className="page-subtitle">Complete your registration and payment</p>
      </div>

      <div className="form-mode-section">
        <div className="mode-selector">
          <button
            className={`mode-option ${formMode === 'user' ? 'active' : ''} ${formLocked || paymentInProgress ? 'disabled' : ''}`}
            onClick={() => handleModeChange('user')}
            disabled={formLocked || paymentInProgress}
          >
            <FaUser className="mode-icon" />
            <span>Individual User</span>
          </button>
          <button
            className={`mode-option ${formMode === 'firm' ? 'active' : ''} ${formLocked || paymentInProgress ? 'disabled' : ''}`}
            onClick={() => handleModeChange('firm')}
            disabled={formLocked || paymentInProgress}
          >
            <FaMapMarkerAlt className="mode-icon" />
            <span>Firm / Organization</span>
          </button>
        </div>
      </div>

      {training && (
        <div className="training-details-card">
          <h3 className="card-title">Training Details</h3>
          <div className="training-details-grid">
            <div className="detail-item">
              <span className="detail-label">Location</span>
              <span className="detail-value">{training.location}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Date</span>
              <span className="detail-value">{training.startDate}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Time</span>
              <span className="detail-value">{training.time}</span>
            </div>
            <div className="detail-item fee-item">
              <span className="detail-label">Training Fee</span>
              <span className="detail-value">
                <FaRupeeSign /> {training.fees || 0}
              </span>
            </div>
            <div className="detail-item slots-item">
              <span className="detail-label">Available Slots</span>
              <span className="detail-value">
                {(training.candidates || 0) - (training.joinedCount || 0)} / {training.candidates || 0}
              </span>
            </div>
            {training.expireDate && (
              <div className="detail-item">
                <span className="detail-label">Expires</span>
                <span className="detail-value">{new Date(training.expireDate).toDateString()}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {showPayment && training && training.fees > 0 ? (
        <div className="payment-section">
          <div className="payment-card">
            <h3 className="card-title">
              <FaCreditCard className="section-icon" />
              Payment Options
            </h3>
            
            <div className="security-badge">
              <FaShieldAlt />
              Secure Payment Protected by SSL
            </div>
            
            <div className="payment-details">
              <p><strong>Participant:</strong> {formMode === 'user' ? participant.name : participant.firmName}</p>
              <p><strong>Email:</strong> {participant.email}</p>
              <p><strong>Mobile:</strong> {participant.mobile}</p>
              <p><strong>Training Fee:</strong> ₹{training.fees}</p>
            </div>
            
            <div className="payment-options">
              <button
                onClick={handleRazorpayPayment}
                className={`payment-button ${paymentLoading ? 'disabled' : ''}`}
                disabled={paymentLoading}
              >
                {paymentLoading ? (
                  <>
                    <FaSpinner className="spinner" />
                    Processing Payment...
                  </>
                ) : (
                  <>
                    <FaCreditCard />
                    Pay Online ₹{training.fees}
                  </>
                )}
              </button>

              <div className="payment-divider">
                <span>OR</span>
              </div>

              <div className="cash-payment-info">
                💰 <strong>Cash Payment Option:</strong> Register now and pay ₹{training.fees} in cash at the training venue. Please bring exact change.
              </div>

              <button
                onClick={handleCashPayment}
                className={`cash-payment-button ${paymentLoading ? 'disabled' : ''}`}
                disabled={paymentLoading}
              >
                {paymentLoading ? (
                  <>
                    <FaSpinner className="spinner" />
                    Registering...
                  </>
                ) : (
                  <>
                    <FaMoneyBillWave />
                    Register & Pay Cash (₹{training.fees})
                  </>
                )}
              </button>
            </div>
            
            {!paymentInProgress && (
              <button
                onClick={handleBackToForm}
                className="back-button"
                disabled={paymentLoading}
              >
                ← Back to Form
              </button>
            )}
            
            <div className="payment-methods">
              <div className="payment-method-icon">VISA</div>
              <div className="payment-method-icon">MC</div>
              <div className="payment-method-icon">UPI</div>
              <div className="payment-method-icon">CASH</div>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="registration-form">
          <div className="form-section">
            <h3 className="section-title">
              <FaUser className="section-icon" />
              Personal Information
            </h3>
            <div className="form-grid">
              {formMode === 'user' ? (
                <div className="form-group">
                  <label className="form-label">
                    <FaUser className="label-icon" />
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    placeholder="Your full name"
                    value={participant.name}
                    onChange={handleChange}
                    required
                    disabled={formLocked || paymentInProgress}
                    className={`form-input ${fieldErrors.name ? 'error' : ''} ${formLocked || paymentInProgress ? 'readonly' : ''}`}
                  />
                  {fieldErrors.name && <div className="error-message">{fieldErrors.name}</div>}
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">
                    <FaMapMarkerAlt className="label-icon" />
                    Firm/Organization Name *
                  </label>
                  <input
                    type="text"
                    name="firmName"
                    placeholder="Firm/organization name"
                    value={participant.firmName}
                    onChange={handleChange}
                    required
                    disabled={formLocked || paymentInProgress}
                    className={`form-input ${fieldErrors.firmName ? 'error' : ''} ${formLocked || paymentInProgress ? 'readonly' : ''}`}
                  />
                  {fieldErrors.firmName && <div className="error-message">{fieldErrors.firmName}</div>}
                </div>
              )}
              
              <div className="form-group">
                <label className="form-label">
                  <FaPhone className="label-icon" />
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  name="mobile"
                  placeholder="Enter 10-digit mobile number"
                  value={participant.mobile}
                  onChange={handleChange}
                  required
                  disabled={formLocked || paymentInProgress}
                  className={`form-input ${fieldErrors.mobile ? 'error' : ''} ${formLocked || paymentInProgress ? 'readonly' : ''}`}
                />
                {fieldErrors.mobile && <div className="error-message">{fieldErrors.mobile}</div>}
              </div>
              
              <div className="form-group">
                <label className="form-label">
                  <FaEnvelope className="label-icon" />
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="Enter your email address"
                  value={participant.email}
                  onChange={handleChange}
                  required
                  disabled={formLocked || paymentInProgress}
                  className={`form-input ${fieldErrors.email ? 'error' : ''} ${formLocked || paymentInProgress ? 'readonly' : ''}`}
                />
                {fieldErrors.email && <div className="error-message">{fieldErrors.email}</div>}
              </div>
              
              <div className="form-group">
                <label className="form-label">
                  <FaCalendarAlt className="label-icon" />
                  Date of Birth *
                </label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={participant.dateOfBirth}
                  onChange={handleChange}
                  required
                  disabled={formLocked || paymentInProgress}
                  className={`form-input ${fieldErrors.dateOfBirth ? 'error' : ''} ${formLocked || paymentInProgress ? 'readonly' : ''}`}
                  max={new Date().toISOString().split('T')[0]}
                />
                {fieldErrors.dateOfBirth && <div className="error-message">{fieldErrors.dateOfBirth}</div>}
              </div>
              
              <div className="form-group">
                <label className="form-label">
                  <FaUser className="label-icon" />
                  Referred By
                </label>
                <input
                  type="text"
                  name="referredBy"
                  placeholder="Referrer name (auto-filled)"
                  value={participant.referredByName || participant.referredBy}
                  readOnly
                  className="form-input readonly"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="section-title">
              <FaMapMarkerAlt className="section-icon" />
              Address Information
            </h3>
            <div className="form-grid">
              <div className="form-group full-width">
                <label className="form-label">
                  <FaMapMarkerAlt className="label-icon" />
                  Address *
                </label>
                <input
                  type="text"
                  name="address"
                  placeholder="Enter your full address"
                  value={participant.address}
                  onChange={handleChange}
                  required
                  disabled={formLocked || paymentInProgress}
                  className={`form-input ${fieldErrors.address ? 'error' : ''} ${formLocked || paymentInProgress ? 'readonly' : ''}`}
                />
                {fieldErrors.address && <div className="error-message">{fieldErrors.address}</div>}
              </div>
              
              <div className="form-group">
                <label className="form-label">State *</label>
                <select
                  name="state"
                  value={participant.state}
                  onChange={handleChange}
                  required
                  disabled={formLocked || paymentInProgress}
                  className={`form-input ${fieldErrors.state ? 'error' : ''} ${formLocked || paymentInProgress ? 'readonly' : ''}`}
                >
                  <option value="">Select State</option>
                  {Object.keys(statesAndDistricts).sort().map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
                {fieldErrors.state && <div className="error-message">{fieldErrors.state}</div>}
              </div>
              
              <div className="form-group">
                <label className="form-label">District *</label>
                <select
                  name="city"
                  value={participant.city}
                  onChange={handleChange}
                  required
                  disabled={formLocked || paymentInProgress || !participant.state}
                  className={`form-input ${fieldErrors.city ? 'error' : ''} ${formLocked || paymentInProgress || !participant.state ? 'readonly' : ''}`}
                >
                  <option value="">Select District</option>
                  {availableDistricts.map(district => (
                    <option key={district} value={district}>{district}</option>
                  ))}
                </select>
                {fieldErrors.city && <div className="error-message">{fieldErrors.city}</div>}
                {!participant.state && <div className="error-message">Please select state first</div>}
              </div>
              
              <div className="form-group">
                <label className="form-label">PIN Code *</label>
                <input
                  type="text"
                  name="pin"
                  placeholder="Enter 6-digit PIN code"
                  value={participant.pin}
                  onChange={handleChange}
                  maxLength="6"
                  required
                  disabled={formLocked || paymentInProgress}
                  className={`form-input ${fieldErrors.pin ? 'error' : ''} ${formLocked || paymentInProgress ? 'readonly' : ''}`}
                />
                {fieldErrors.pin && <div className="error-message">{fieldErrors.pin}</div>}
              </div>
            </div>
          </div>

          <button
            type="submit"
            className={`submit-button ${isSubmitting || !training || formLocked || paymentInProgress ? 'disabled' : ''}`}
            disabled={isSubmitting || !training || formLocked || paymentInProgress}
          >
            {isSubmitting ? (
              <>
                <FaSpinner className="spinner" />
                Validating...
              </>
            ) : (
              <>
                <FaCheck />
                {training && training.fees > 0 ? `Proceed to Payment Options (₹${training.fees})` : 'Join Training Now'}
              </>
            )}
          </button>
        </form>
      )}

      {message && (
        <div className={`notification ${
          message.includes('Successfully') || message.includes('✅') || message.includes('success')
            ? 'success'
            : message.includes('Checking') || message.includes('Processing')
              ? 'info'
              : 'error'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
};

export default JoinTraining;
