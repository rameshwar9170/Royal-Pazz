import React, { useState, useEffect } from 'react';
import { ref, onValue, runTransaction, update, get, set } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { db, storage } from '../firebase/config';
import { FaSearch, FaTimes, FaShoppingCart, FaPlus, FaMinus, FaTrash } from 'react-icons/fa';
import '../styles/ProductCard.css';
import ONDOLogo from '../img/logo.jpg';



const AllProducts = () => {
  const [products, setProducts] = useState([]); 
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [showCartModal, setShowCartModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [walletBalance, setWalletBalance] = useState(0);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [isNewCustomer, setIsNewCustomer] = useState(true);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [showBuyNowModal, setShowBuyNowModal] = useState(false);
  const [buyNowProduct, setBuyNowProduct] = useState(null);
  const [chequeFile, setChequeFile] = useState(null);
  const [chequePreview, setChequePreview] = useState('');
  const [chequeError, setChequeError] = useState('');
  const [utrNumber, setUtrNumber] = useState('');
  const [utrFile, setUtrFile] = useState(null);
  const [utrPreview, setUtrPreview] = useState('');
  const [utrError, setUtrError] = useState('');

 

  // Indian States and Districts Data
  const statesAndDistricts = {
    "Andhra Pradesh": ["Anantapur", "Chittoor", "East Godavari", "Guntur", "Krishna", "Kurnool", "Prakasam", "Srikakulam", "Visakhapatnam", "Vizianagaram", "West Godavari", "YSR Kadapa"],
    "Arunachal Pradesh": ["Anjaw", "Changlang", "Dibang Valley", "East Kameng", "East Siang", "Kamle", "Kra Daadi", "Kurung Kumey", "Lepa Rada", "Lohit", "Longding", "Lower Dibang Valley", "Lower Siang", "Lower Subansiri", "Namsai", "Pakke Kessang", "Papum Pare", "Shi Yomi", "Siang", "Tawang", "Tirap", "Upper Siang", "Upper Subansiri", "West Kameng", "West Siang"],
    "Assam": ["Baksa", "Barpeta", "Biswanath", "Bongaigaon", "Cachar", "Charaideo", "Chirang", "Darrang", "Dhemaji", "Dhubri", "Dibrugarh", "Goalpara", "Golaghat", "Hailakandi", "Hojai", "Jorhat", "Kamrup", "Kamrup Metropolitan", "Karbi Anglong", "Karimganj", "Kokrajhar", "Lakhimpur", "Majuli", "Morigaon", "Nagaon", "Nalbari", "Dima Hasao", "Sivasagar", "Sonitpur", "South Salmara-Mankachar", "Tinsukia", "Udalguri", "West Karbi Anglong"],
    "Bihar": ["Araria", "Arwal", "Aurangabad", "Banka", "Begusarai", "Bhagalpur", "Bhojpur", "Buxar", "Darbhanga", "East Champaran", "Gaya", "Gopalganj", "Jamui", "Jehanabad", "Kaimur", "Katihar", "Khagaria", "Kishanganj", "Lakhisarai", "Madhepura", "Madhubani", "Munger", "Muzaffarpur", "Nalanda", "Nawada", "Patna", "Purnia", "Rohtas", "Saharsa", "Samastipur", "Saran", "Sheikhpura", "Sheohar", "Sitamarhi", "Siwan", "Supaul", "Vaishali", "West Champaran"],
    "Chhattisgarh": ["Balod", "Baloda Bazar", "Balrampur", "Bastar", "Bemetara", "Bijapur", "Bilaspur", "Dantewada", "Dhamtari", "Durg", "Gariaband", "Janjgir Champa", "Jashpur", "Kabirdham", "Kanker", "Kondagaon", "Korba", "Koriya", "Mahasamund", "Mungeli", "Narayanpur", "Raigarh", "Raipur", "Rajnandgaon", "Sukma", "Surajpur", "Surguja"],
    "Goa": ["North Goa", "South Goa"],
    "Gujarat": ["Ahmedabad", "Amreli", "Anand", "Aravalli", "Banaskantha", "Bharuch", "Bhavnagar", "Botad", "Chhota Udaipur", "Dahod", "Dang", "Devbhoomi Dwarka", "Gandhinagar", "Gir Somnath", "Jamnagar", "Junagadh", "Kheda", "Kutch", "Mahisagar", "Mehsana", "Morbi", "Narmada", "Navsari", "Panchmahal", "Patan", "Porbandar", "Rajkot", "Sabarkantha", "Surat", "Surendranagar", "Tapi", "Vadodara", "Valsad"],
    "Haryana": ["Ambala", "Bhiwani", "Charkhi Dadri", "Faridabad", "Fatehabad", "Gurugram", "Hisar", "Jhajjar", "Jind", "Kaithal", "Karnal", "Kurukshetra", "Mahendragarh", "Nuh", "Palwal", "Panchkula", "Panipat", "Rewari", "Rohtak", "Sirsa", "Sonipat", "Yamunanagar"],
    "Himachal Pradesh": ["Bilaspur", "Chamba", "Hamirpur", "Kangra", "Kinnaur", "Kullu", "Lahaul and Spiti", "Mandi", "Shimla", "Sirmaur", "Solan", "Una"],
    "Jharkhand": ["Bokaro", "Chatra", "Deoghar", "Dhanbad", "Dumka", "East Singhbhum", "Garhwa", "Giridih", "Godda", "Gumla", "Hazaribagh", "Jamtara", "Khunti", "Koderma", "Latehar", "Lohardaga", "Pakur", "Palamu", "Ramgarh", "Ranchi", "Sahebganj", "Seraikela Kharsawan", "Simdega", "West Singhbhum"],
    "Karnataka": ["Bagalkot", "Ballari", "Belagavi", "Bengaluru Rural", "Bengaluru Urban", "Bidar", "Chamarajanagar", "Chikballapur", "Chikkamagaluru", "Chitradurga", "Dakshina Kannada", "Davanagere", "Dharwad", "Gadag", "Hassan", "Haveri", "Kalaburagi", "Kodagu", "Kolar", "Koppal", "Mandya", "Mysuru", "Raichur", "Ramanagara", "Shivamogga", "Tumakuru", "Udupi", "Uttara Kannada", "Vijayapura", "Yadgir"],
    "Kerala": ["Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod", "Kollam", "Kottayam", "Kozhikode", "Malappuram", "Palakkad", "Pathanamthitta", "Thiruvananthapuram", "Thrissur", "Wayanad"],
    "Madhya Pradesh": ["Agar Malwa", "Alirajpur", "Anuppur", "Ashoknagar", "Balaghat", "Barwani", "Betul", "Bhind", "Bhopal", "Burhanpur", "Chhatarpur", "Chhindwara", "Damoh", "Datia", "Dewas", "Dhar", "Dindori", "Guna", "Gwalior", "Harda", "Hoshangabad", "Indore", "Jabalpur", "Jhabua", "Katni", "Khandwa", "Khargone", "Mandla", "Mandsaur", "Morena", "Narsinghpur", "Neemuch", "Niwari", "Panna", "Raisen", "Rajgarh", "Ratlam", "Rewa", "Sagar", "Satna", "Sehore", "Seoni", "Shahdol", "Shajapur", "Sheopur", "Shivpuri", "Sidhi", "Singrauli", "Tikamgarh", "Ujjain", "Umaria", "Vidisha"],
    "Maharashtra": [
  "Ahilyanagar",
  "Akola",
  "Amravati",
  "Beed",
  "Bhandara",
  "Buldhana",
  "Chandrapur",
  "Chhatrapti Sambhajinagar",
  "Dhule",
  "Dharashiv",
  "Gadchiroli",
  "Gondia",
  "Hingoli",
  "Jalgaon",
  "Jalna",
  "Kolhapur",
  "Latur",
  "Mumbai City",
  "Mumbai Suburban",
  "Nagpur",
  "Nanded",
  "Nandurbar",
  "Nashik",
  "Palghar",
  "Parbhani",
  "Pune",
  "Raigad",
  "Ratnagiri",
  "Sangli",
  "Satara",
  "Sindhudurg",
  "Solapur",
  "Thane",
  "Wardha",
  "Washim",
  "Yavatmal"
],

    "Manipur": ["Bishnupur", "Chandel", "Churachandpur", "Imphal East", "Imphal West", "Jiribam", "Kakching", "Kamjong", "Kangpokpi", "Noney", "Pherzawl", "Senapati", "Tamenglong", "Tengnoupal", "Thoubal", "Ukhrul"],
    "Meghalaya": ["East Garo Hills", "East Jaintia Hills", "East Khasi Hills", "North Garo Hills", "Ri Bhoi", "South Garo Hills", "South West Garo Hills", "South West Khasi Hills", "West Garo Hills", "West Jaintia Hills", "West Khasi Hills"],
    "Mizoram": ["Aizawl", "Champhai", "Hnahthial", "Kolasib", "Khawzawl", "Lawngtlai", "Lunglei", "Mamit", "Saiha", "Saitual", "Serchhip"],
    "Nagaland": ["Dimapur", "Kiphire", "Kohima", "Longleng", "Mokokchung", "Mon", "Peren", "Phek", "Tuensang", "Wokha", "Zunheboto"],
    "Odisha": ["Angul", "Balangir", "Balasore", "Bargarh", "Bhadrak", "Boudh", "Cuttack", "Deogarh", "Dhenkanal", "Gajapati", "Ganjam", "Jagatsinghpur", "Jajpur", "Jharsuguda", "Kalahandi", "Kandhamal", "Kendrapara", "Kendujhar", "Khordha", "Koraput", "Malkangiri", "Mayurbhanj", "Nabarangpur", "Nayagarh", "Nuapada", "Puri", "Rayagada", "Sambalpur", "Subarnapur", "Sundargarh"],
    "Punjab": ["Amritsar", "Barnala", "Bathinda", "Faridkot", "Fatehgarh Sahib", "Fazilka", "Ferozepur", "Gurdaspur", "Hoshiarpur", "Jalandhar", "Kapurthala", "Ludhiana", "Mansa", "Moga", "Muktsar", "Nawanshahr", "Pathankot", "Patiala", "Rupnagar", "Sangrur", "Tarn Taran"],
    "Rajasthan": ["Ajmer", "Alwar", "Banswara", "Baran", "Barmer", "Bharatpur", "Bhilwara", "Bikaner", "Bundi", "Chittorgarh", "Churu", "Dausa", "Dholpur", "Dungarpur", "Hanumangarh", "Jaipur", "Jaisalmer", "Jalore", "Jhalawar", "Jhunjhunu", "Jodhpur", "Karauli", "Kota", "Nagaur", "Pali", "Pratapgarh", "Rajsamand", "Sawai Madhopur", "Sikar", "Sirohi", "Sri Ganganagar", "Tonk", "Udaipur"],
    "Sikkim": ["East Sikkim", "North Sikkim", "South Sikkim", "West Sikkim"],
    "Tamil Nadu": ["Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri", "Dindigul", "Erode", "Kallakurichi", "Kanchipuram", "Kanyakumari", "Karur", "Krishnagiri", "Madurai", "Mayiladuthurai", "Nagapattinam", "Namakkal", "Nilgiris", "Perambalur", "Pudukkottai", "Ramanathapuram", "Ranipet", "Salem", "Sivaganga", "Tenkasi", "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli", "Tirunelveli", "Tirupathur", "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur", "Vellore", "Viluppuram", "Virudhunagar"],
    "Telangana": ["Adilabad", "Bhadradri Kothagudem", "Hyderabad", "Jagtial", "Jangaon", "Jayashankar", "Jogulamba", "Kamareddy", "Karimnagar", "Khammam", "Komaram Bheem", "Mahabubabad", "Mahbubnagar", "Mancherial", "Medak", "Medchal", "Mulugu", "Nagarkurnool", "Nalgonda", "Narayanpet", "Nirmal", "Nizamabad", "Peddapalli", "Rajanna Sircilla", "Ranga Reddy", "Sangareddy", "Siddipet", "Suryapet", "Vikarabad", "Wanaparthy", "Warangal Rural", "Warangal Urban", "Yadadri Bhuvanagiri"],
    "Tripura": ["Dhalai", "Gomati", "Khowai", "North Tripura", "Sepahijala", "South Tripura", "Unakoti", "West Tripura"],
    "Uttar Pradesh": ["Agra", "Aligarh", "Ambedkar Nagar", "Amethi", "Amroha", "Auraiya", "Ayodhya", "Azamgarh", "Baghpat", "Bahraich", "Ballia", "Balrampur", "Banda", "Barabanki", "Bareilly", "Basti", "Bhadohi", "Bijnor", "Budaun", "Bulandshahr", "Chandauli", "Chitrakoot", "Deoria", "Etah", "Etawah", "Farrukhabad", "Fatehpur", "Firozabad", "Gautam Buddha Nagar", "Ghaziabad", "Ghazipur", "Gonda", "Gorakhpur", "Hamirpur", "Hapur", "Hardoi", "Hathras", "Jalaun", "Jaunpur", "Jhansi", "Kannauj", "Kanpur Dehat", "Kanpur Nagar", "Kasganj", "Kaushambi", "Kheri", "Kushinagar", "Lalitpur", "Lucknow", "Maharajganj", "Mahoba", "Mainpuri", "Mathura", "Mau", "Meerut", "Mirzapur", "Moradabad", "Muzaffarnagar", "Pilibhit", "Pratapgarh", "Prayagraj", "Raebareli", "Rampur", "Saharanpur", "Sambhal", "Sant Kabir Nagar", "Shahjahanpur", "Shamli", "Shrawasti", "Siddharthnagar", "Sitapur", "Sonbhadra", "Sultanpur", "Unnao", "Varanasi"],
    "Uttarakhand": ["Almora", "Bageshwar", "Chamoli", "Champawat", "Dehradun", "Haridwar", "Nainital", "Pauri", "Pithoragarh", "Rudraprayag", "Tehri", "Udham Singh Nagar", "Uttarkashi"],
    "West Bengal": ["Alipurduar", "Bankura", "Birbhum", "Cooch Behar", "Dakshin Dinajpur", "Darjeeling", "Hooghly", "Howrah", "Jalpaiguri", "Jhargram", "Kalimpong", "Kolkata", "Malda", "Murshidabad", "Nadia", "North 24 Parganas", "Paschim Bardhaman", "Paschim Medinipur", "Purba Bardhaman", "Purba Medinipur", "Purulia", "South 24 Parganas", "Uttar Dinajpur"]
  };

  const initialFormData = {
    name: '',
    email: '',
    phone: '',
    address: '',
    landmark: '',
    city: '',
    state: '',
    postalCode: '',
    birthDate: '',
    paymentMethod: 'Online', // Default to online payment
  };
  const [formData, setFormData] = useState(initialFormData);

  const user = JSON.parse(localStorage.getItem('htamsUser'));

  // Load Razorpay SDK
  useEffect(() => {
    const loadRazorpayScript = () => {
      return new Promise((resolve) => {
        // Check if Razorpay is already loaded
        if (window.Razorpay) {
          resolve(true);
          return;
        }

        // Check if script is already being loaded
        if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
          const checkLoaded = setInterval(() => {
            if (window.Razorpay) {
              clearInterval(checkLoaded);
              resolve(true);
            }
          }, 100);
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onload = () => {
          console.log('Razorpay SDK loaded successfully');
          resolve(true);
        };
        script.onerror = (error) => {
          console.error('Failed to load Razorpay SDK:', error);
          resolve(false);
        };
        document.head.appendChild(script);
      });
    };

    loadRazorpayScript();
  }, []);

  useEffect(() => {
    return () => {
      if (chequePreview) {
        URL.revokeObjectURL(chequePreview);
      }
    };
  }, [chequePreview]);

  useEffect(() => {
    return () => {
      if (utrPreview) {
        URL.revokeObjectURL(utrPreview);
      }
    };
  }, [utrPreview]);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      // Check if Razorpay is already loaded
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      // Check if script is already being loaded
      if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
        const checkLoaded = setInterval(() => {
          if (window.Razorpay) {
            clearInterval(checkLoaded);
            resolve(true);
          }
        }, 100);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => {
        console.log('Razorpay SDK loaded successfully');
        resolve(true);
      };
      script.onerror = (error) => {
        console.error('Failed to load Razorpay SDK:', error);
        resolve(false);
      };
      document.head.appendChild(script);
    });
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone);
  };

  const validatePostalCode = (postalCode) => {
    const postalRegex = /^[1-9][0-9]{5}$/;
    return postalRegex.test(postalCode);
  };

  const validateName = (name) => {
    const nameRegex = /^[a-zA-Z\s]{2,50}$/;
    return nameRegex.test(name.trim());
  };

  const validateCityState = (value) => {
    const cityStateRegex = /^[a-zA-Z\s]{2,30}$/;
    return cityStateRegex.test(value.trim());
  };

  const validateField = (name, value) => {
    let error = '';

    switch (name) {
      case 'name':
        if (!value.trim()) {
          error = 'Name is required';
        } else if (!validateName(value)) {
          error = 'Name should contain only letters and spaces (2-50 characters)';
        }
        break;

      case 'email':
        if (!value.trim()) {
          error = 'Email is required';
        } else if (!validateEmail(value)) {
          error = 'Please enter a valid email address';
        }
        break;

      case 'phone':
        if (!value.trim()) {
          error = 'Phone number is required';
        } else if (!validatePhone(value)) {
          error = 'Please enter a valid 10-digit mobile number starting with 6-9';
        }
        break;

      case 'address':
        if (!value.trim()) {
          error = 'Address is required';
        } else if (value.trim().length < 10) {
          error = 'Address should be at least 10 characters long';
        }
        break;

      case 'city':
        if (!value.trim()) {
          error = 'City is required';
        } else if (!validateCityState(value)) {
          error = 'City should contain only letters and spaces (2-30 characters)';
        }
        break;

      case 'state':
        if (!value.trim()) {
          error = 'State is required';
        } else if (!validateCityState(value)) {
          error = 'State should contain only letters and spaces (2-30 characters)';
        }
        break;

      case 'postalCode':
        if (!value.trim()) {
          error = 'Postal code is required';
        } else if (!validatePostalCode(value)) {
          error = 'Please enter a valid 6-digit postal code';
        }
        break;

      case 'birthDate':
        if (!value.trim()) {
          error = 'Birth date is required';
        } else {
          const birthDate = new Date(value);
          const today = new Date();
          const age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          
          if (birthDate > today) {
            error = 'Birth date cannot be in the future';
          } else if (age < 13 || (age === 13 && monthDiff < 0)) {
            error = 'You must be at least 13 years old';
          } else if (age > 120) {
            error = 'Please enter a valid birth date';
          }
        }
        break;

      default:
        break;
    }

    return error;
  };

  const validateAllFields = () => {
    const errors = {};
    const requiredFields = ['name', 'email', 'phone', 'address', 'city', 'state', 'postalCode', 'birthDate'];

    requiredFields.forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) {
        errors[field] = error;
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  useEffect(() => {
    if (user?.uid) {
      const walletRef = ref(db, `HTAMS/users/${user.uid}/MySales`);
      onValue(walletRef, (snapshot) => {
        const balance = Number(snapshot.val()) || 0;
        setWalletBalance(balance);
        console.log('Wallet balance fetched:', balance);
      });
    }
  }, [user?.uid]);

  // Auto-select payment method based on wallet balance and cart total
  useEffect(() => {
    const cartTotal = getCartTotal();
    if (cartTotal <= 0) {
      return;
    }

    setFormData(prev => {
      if (prev.paymentMethod === 'Cheque') {
        return prev;
      }

      if (cartTotal <= walletBalance && walletBalance > 0) {
        return prev.paymentMethod === 'Wallet' ? prev : { ...prev, paymentMethod: 'Wallet' };
      }

      return prev.paymentMethod === 'Online' ? prev : { ...prev, paymentMethod: 'Online' };
    });
  }, [walletBalance, cart]);

  useEffect(() => {
    console.log('All env vars:', {
      razorpayKey: process.env.REACT_APP_RAZORPAY_KEY_ID,
      firebaseKey: process.env.REACT_APP_FIREBASE_API_KEY
    });
  }, []);

  const handleBuyNow = (product) => {
    // Clear current cart and set only this product for buying
    setCart([{ ...product, quantity: 1 }]);
    
    // Immediately open the cart modal
    setShowCartModal(true);
    
    // Show notification
    showNotification(
      `Ready to buy now`,
      `🛒 ${product.name}`,
      'success'
    );
  };
  
  

  useEffect(() => {
    const productsRef = ref(db, 'HTAMS/company/products');
    const unsubscribeProducts = onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      const productsArray = data ? Object.entries(data).map(([id, val], index) => ({
        id,
        serialNo: index + 1,
        ...val,
        stock: Number(val.stock) || 0,
        price: Number(val.price) || 0,
        imageUrl: val.imageUrls && val.imageUrls.length > 0 ? val.imageUrls[0] : 'https://via.placeholder.com/300'
      })) : [];
      setProducts(productsArray);
    });

    return () => unsubscribeProducts();
  }, []);

  // Fetch customers for selection
  useEffect(() => {
    const customersRef = ref(db, 'HTAMS/customers');
    const unsubscribeCustomers = onValue(customersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const customersArray = Object.entries(data).map(([phone, customerData]) => ({
          phone,
          ...customerData,
          displayName: `${customerData.name} (${phone})`
        }));
        setCustomers(customersArray);
      } else {
        setCustomers([]);
      }
    });

    return () => unsubscribeCustomers();
  }, []);

  // Collect phones of customers whose orders were placed by the current user
  useEffect(() => {
    if (!user?.uid) return;
    const ordersRef = ref(db, 'HTAMS/orders');
    const unsubscribe = onValue(ordersRef, (snapshot) => {
      const data = snapshot.val() || {};
      const mine = new Set();
      Object.values(data).forEach((o) => {
        if (o?.placedBy === user.uid && o?.customerPhone) {
          mine.add(o.customerPhone);
        }
      });
      setMyCustomerPhones(mine);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    const lowercasedQuery = searchQuery.toLowerCase();
    const filtered = products.filter(prod => {
      const hasStock = prod.stock > 0;
      const nameMatch = prod.name.toLowerCase().includes(lowercasedQuery);
      const priceMatch = prod.price.toString().includes(lowercasedQuery);
      const serialNoMatch = prod.serialNo.toString().includes(lowercasedQuery);
      const searchMatch = nameMatch || priceMatch || serialNoMatch;
      return hasStock && searchMatch;
    });
    setFilteredProducts(filtered);
  }, [searchQuery, products]);

  // Add this near the top of your AllProducts component
  useEffect(() => {
    if (!process.env.REACT_APP_RAZORPAY_KEY_ID) {
      console.error('REACT_APP_RAZORPAY_KEY_ID environment variable is not set');
    }
  }, []);

  const [notifications, setNotifications] = useState([]);
  const [availableDistricts, setAvailableDistricts] = useState([]);
  const [myCustomerPhones, setMyCustomerPhones] = useState(new Set());

  const showNotification = (message, title, type = 'success') => {
    const id = `${Date.now()}_${Math.random()}`;
    const newNotification = { id, message, title, type };
    
    setNotifications(prev => {
      // Check if exact same notification already exists
      const isDuplicate = prev.some(n => 
        n.title === title && 
        n.message === message &&
        n.type === type
      );
      
      if (isDuplicate) {
        return prev; // Don't add duplicate
      }
      
      return [...prev, newNotification];
    });
    
    // Auto hide notification after 3 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 1000);
  };

  const addToCart = (product) => {
    const productCard = document.querySelector(`[data-product-id="${product.id}"]`);
    if (productCard) {
      productCard.classList.add('added-to-cart');
      setTimeout(() => productCard.classList.remove('added-to-cart'), 300);
    }

    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        // Item already exists - don't show notification here, 
        // let updateCartQuantity handle it
        return prevCart;
      } else {
        // New item - show add notification
        showNotification(
          `Successfully added to  cart`,
          `🎉 ${product.name}`,
          'success'
        );
        return [...prevCart, { ...product, quantity: 1 }];
      }
    });
  };

  const handleBuyNowClick = (product) => {
    // Add product to cart (quantity 1)
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        // If product already in cart, just increase quantity by 1
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        // If new product, add with quantity 1
        return [...prevCart, { ...product, quantity: 1 }];
      }
    });
    
    // Immediately open the cart modal
    setShowCartModal(true);
    
    // Show notification
    showNotification(
      `Added to cart and opened checkout`,
      `🛒 ${product.name}`,
      'success'
    );
  };
  
  
  const removeFromCart = (productId) => {
    const product = cart.find(item => item.id === productId);
    if (product) {
      setCart(prevCart => prevCart.filter(item => item.id !== productId));
      showNotification(
        `Removed from your cart`,
        `🗑️ ${product.name}`,
        'error'
      );
    }
  };

  const updateCartQuantity = (productId, newQuantity) => {
    const currentItem = cart.find(item => item.id === productId);
    const currentQuantity = currentItem?.quantity || 0;
    
    if (newQuantity <= 0) {
      const product = cart.find(item => item.id === productId);
      if (product) {
        showNotification(
          `Removed from your cart`,
          `🗑️ ${product.name}`,
          'error'
        );
      }
      setCart(prevCart => prevCart.filter(item => item.id !== productId));
      return;
    }

    setCart(prevCart =>
      prevCart.map(item => {
        if (item.id === productId) {
          const maxQuantity = products.find(p => p.id === productId)?.stock || 0;
          if (newQuantity > maxQuantity) {
            showNotification(
              `Only ${maxQuantity} items available`,
              `⚠️ ${item.name}`,
              'warning'
            );
            return item;
          }
          
          // Show different notification based on increase or decrease
          if (newQuantity > currentQuantity) {
            showNotification(
              `Quantity increased to ${newQuantity}`,
              `➕ ${item.name}`,
              'success'
            );
          } else {
            showNotification(
              `Quantity decreased to ${newQuantity}`,
              `➖ ${item.name}`,
              'info'
            );
          }
          
          return { ...item, quantity: newQuantity };
        }
        return item;
      }).filter(item => item.quantity > 0)
    );
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.mrp * item.quantity), 0);
  };

  const getCartItemCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  };

  const clearCart = () => {
    const itemCount = cart.length;
    setCart([]);
    showNotification(
      `${itemCount} ${itemCount === 1 ? 'item' : 'items'} removed`,
      '🧹 Cart Cleared',
      'info'
    );
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;

    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'paymentMethod' && value !== 'Cheque') {
      clearChequeData();
      setChequeError('');
      clearUtrData();
      setUtrNumber('');
      setUtrError('');
    }

    const error = validateField(name, value);
    setValidationErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };

  const handleStateChange = (e) => {
    const selectedState = e.target.value;
    setFormData(prev => ({ 
      ...prev, 
      state: selectedState,
      city: '' // Reset city when state changes
    }));
    
    // Update available districts based on selected state
    if (selectedState && statesAndDistricts[selectedState]) {
      setAvailableDistricts(statesAndDistricts[selectedState]);
    } else {
      setAvailableDistricts([]);
    }

    const error = validateField('state', selectedState);
    setValidationErrors(prev => ({
      ...prev,
      state: error,
      city: '' // Reset city validation
    }));
  };

  // Handle customer selection
  const handleCustomerSelection = (e) => {
    const customerPhone = e.target.value;
    setSelectedCustomer(customerPhone);
    
    if (customerPhone === 'new') {
      // New customer selected
      setIsNewCustomer(true);
      setFormData(initialFormData);
      setValidationErrors({});
      setAvailableDistricts([]);
    } else if (customerPhone) {
      // Existing customer selected
      setIsNewCustomer(false);
      const customer = customers.find(c => c.phone === customerPhone);
      if (customer) {
        // Auto-fill form with customer data
        const customerAddress = customer.address || {};
        setFormData({
          name: customer.name || '',
          email: customer.email || '',
          phone: customer.phone || '',
          address: customerAddress.street || '',
          landmark: customerAddress.landmark || '',
          city: customerAddress.city || '',
          state: customerAddress.state || '',
          postalCode: customerAddress.postalCode || '',
          birthDate: customer.birthDate || '',
          paymentMethod: 'Online'
        });
        
        // Set available districts if state is selected
        if (customerAddress.state && statesAndDistricts[customerAddress.state]) {
          setAvailableDistricts(statesAndDistricts[customerAddress.state]);
        }
        
        // Clear validation errors
        setValidationErrors({});
        
        // Fetch customer's previous orders
        fetchCustomerOrders(customer.phone);
        
        showNotification(
          `Customer information loaded successfully`,
          `👤 ${customer.name}`,
          'success'
        );
      }
    } else {
      // No selection
      setIsNewCustomer(true);
      setFormData(initialFormData);
      setValidationErrors({});
      setAvailableDistricts([]);
    }
  };

  // Fetch customer's previous orders
  const fetchCustomerOrders = async (customerPhone) => {
    try {
      const ordersRef = ref(db, 'HTAMS/orders');
      const ordersSnapshot = await get(ordersRef);
      
      if (ordersSnapshot.exists()) {
        const allOrders = ordersSnapshot.val();
        const customerOrdersList = Object.entries(allOrders)
          .filter(([orderId, order]) => order.customerPhone === customerPhone)
          .map(([orderId, order]) => ({
            orderId,
            ...order,
            orderDate: new Date(order.orderDate).toLocaleDateString('en-IN'),
            totalAmount: Number(order.totalAmount) || 0
          }))
          .sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))
          .slice(0, 5); // Show only last 5 orders
        
        setCustomerOrders(customerOrdersList);
      } else {
        setCustomerOrders([]);
      }
    } catch (error) {
      console.error('Error fetching customer orders:', error);
      setCustomerOrders([]);
    }
  };

  const handlePhoneInput = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    if (value.length <= 10) {
      const error = validateField('phone', value);
      setFormData(prev => ({ ...prev, phone: value }));
      setValidationErrors(prev => ({
        ...prev,
        phone: error
      }));
    }
  };

  const handlePostalCodeInput = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    if (value.length <= 6) {
      const error = validateField('postalCode', value);
      setFormData(prev => ({ ...prev, postalCode: value }));
      setValidationErrors(prev => ({
        ...prev,
        postalCode: error
      }));
    }
  };

  const handleNameInput = (e) => {
    const value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
    const error = validateField(e.target.name, value);
    setFormData(prev => ({ ...prev, [e.target.name]: value }));
    setValidationErrors(prev => ({
      ...prev,
      [e.target.name]: error
    }));
  };

  const handleChequeFileChange = (event) => {
    const file = event.target.files?.[0];

    if (chequePreview) {
      URL.revokeObjectURL(chequePreview);
    }

    if (!file) {
      setChequeFile(null);
      setChequePreview('');
      setChequeError('');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setChequeFile(null);
      setChequePreview('');
      setChequeError('Please upload an image file (JPG or PNG).');
      return;
    }

    const maxSizeBytes = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxSizeBytes) {
      setChequeFile(null);
      setChequePreview('');
      setChequeError('File size should be less than 5 MB.');
      return;
    }

    setChequeError('');
    setChequeFile(file);
    setChequePreview(URL.createObjectURL(file));
  };

  const clearChequeData = () => {
    if (chequePreview) {
      URL.revokeObjectURL(chequePreview);
    }
    setChequeFile(null);
    setChequePreview('');
    setChequeError('');
  };

  const handleUtrFileChange = (event) => {
    const file = event.target.files?.[0];

    if (utrPreview) {
      URL.revokeObjectURL(utrPreview);
    }

    if (!file) {
      setUtrFile(null);
      setUtrPreview('');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setUtrFile(null);
      setUtrPreview('');
      setUtrError('Please upload an image file (JPG or PNG).');
      return;
    }

    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setUtrFile(null);
      setUtrPreview('');
      setUtrError('File size should be less than 5 MB.');
      return;
    }

    setUtrError('');
    setUtrFile(file);
    setUtrPreview(URL.createObjectURL(file));
  };

  const clearUtrData = () => {
    if (utrPreview) {
      URL.revokeObjectURL(utrPreview);
    }
    setUtrFile(null);
    setUtrPreview('');
    setUtrError('');
  };



  const generateOrderId = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `order_${timestamp}_${random}`;
  };

  // Save customer data for admin tracking
  const saveCustomerData = async (customerData, reason = 'form_filled') => {
    try {
      // Sanitize email by replacing invalid Firebase path characters
      const sanitizedEmail = customerData.email.replace(/[.#$[\]]/g, '_');
      const customerKey = `${customerData.phone}_${sanitizedEmail}`;
      const customerRef = ref(db, `HTAMS/customer_leads/${customerKey}`);
      
      // Check if customer data already exists to prevent duplicates
      const existingSnapshot = await get(customerRef);
      const existingData = existingSnapshot.val();
      
      const leadData = {
        ...customerData,
        capturedAt: new Date().toISOString(),
        reason: reason,
        placedBy: user?.uid || 'unknown',
        products: cart.map(item => ({
          productId: item.id,
          productName: item.name,
          quantity: item.quantity,
          unitPrice: item.mrp,
          totalPrice: item.mrp * item.quantity,
        })),
        totalAmount: getCartTotal(),
        totalItems: getCartItemCount(),
        lastUpdated: new Date().toISOString(),
        attempts: existingData ? (existingData.attempts || 0) + 1 : 1,
        status: 'lead'
      };

      // If existing data, update the attempts and last reason
      if (existingData) {
        leadData.firstCapturedAt = existingData.firstCapturedAt || existingData.capturedAt;
        leadData.reasonHistory = [...(existingData.reasonHistory || []), {
          reason: reason,
          timestamp: new Date().toISOString(),
          products: leadData.products,
          totalAmount: leadData.totalAmount
        }];
      } else {
        leadData.firstCapturedAt = leadData.capturedAt;
        leadData.reasonHistory = [{
          reason: reason,
          timestamp: new Date().toISOString(),
          products: leadData.products,
          totalAmount: leadData.totalAmount
        }];
      }

      await set(customerRef, leadData);
      console.log('Customer lead data saved:', reason);
    } catch (error) {
      console.error('Error saving customer lead data:', error);
    }
  };

  const handleRazorpayPayment = async (orderData, orderId) => {
    try {
      // Use environment variable with fallback to your live key
      const razorpayKey = process.env.REACT_APP_RAZORPAY_KEY_ID;

      console.log('=== RAZORPAY PAYMENT DEBUG ===');
      console.log('Environment variable:', process.env.REACT_APP_RAZORPAY_KEY_ID);
      console.log('Using key:', razorpayKey);
      console.log('Key source:', process.env.REACT_APP_RAZORPAY_KEY_ID ? 'Environment Variable' : 'Fallback');
      console.log('Key type:', razorpayKey.startsWith('rzp_live_') ? 'LIVE MODE - REAL PAYMENTS' : 'TEST MODE');
      console.log('Order ID:', orderId);
      console.log('Amount: ₹' + orderData.totalAmount);
      console.log('=============================');

      if (!razorpayKey) {
        alert('Razorpay configuration error. Key not found.');
        setLoading(false);
        return;
      }

      // Verify key format
      if (!razorpayKey.startsWith('rzp_live_') && !razorpayKey.startsWith('rzp_test_')) {
        alert('Invalid Razorpay key format. Please check your configuration.');
        setLoading(false);
        return;
      }

      // Load Razorpay script
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded || !window.Razorpay) {
        alert('Razorpay SDK failed to load. Please refresh the page and try again.');
        setLoading(false);
        return;
      }

      // Show payment confirmation
      const isLiveMode = razorpayKey.startsWith('rzp_live_');
      const confirmPayment = window.confirm(
        `${isLiveMode ? '🚨  PAYMENT CONFIRMATION 🚨' : ''}\n\n` +
        `Customer: ${formData.name}\n` +
        `Amount: ₹${orderData.totalAmount}\n` +
        `Phone: ${formData.phone}\n` +

        `Click OK to proceed with payment.`
      );

      if (!confirmPayment) {
        alert('Payment cancelled.');
        setLoading(false);
        return;
      }

      // Razorpay options
      const options = {
        key: razorpayKey, // Using environment variable or fallback
        amount: Math.round(orderData.totalAmount * 100), // Amount in paise
        currency: 'INR',
        name: 'Panchagiri Store',
        description: `Order #${orderId}`,

        // Success handler
        handler: async (response) => {
          try {
            console.log(`=== ${isLiveMode ? 'LIVE' : 'TEST'} PAYMENT SUCCESS ===`);
            console.log('Payment ID:', response.razorpay_payment_id);
            console.log(`${isLiveMode ? 'Real money charged:' : 'Test payment:'} ₹${orderData.totalAmount}`);
            console.log('Customer:', formData.name);
            console.log('===============================');

            if (!response.razorpay_payment_id) {
              throw new Error('Invalid payment response - missing payment ID');
            }

            // Create payment details
            const paymentDetails = {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id || null,
              razorpay_signature: response.razorpay_signature || null,
              payment_status: 'success',
              payment_timestamp: new Date().toISOString(),
              payment_method: 'Razorpay',
              amount_paid: orderData.totalAmount,
              currency: 'INR',
              mode: isLiveMode ? 'live' : 'test',
              key_used: razorpayKey.substring(0, 12) + '...' // Log which key was used
            };

            // Remove undefined values
            Object.keys(paymentDetails).forEach(key => {
              if (paymentDetails[key] === undefined) {
                delete paymentDetails[key];
              }
            });

            // Update order data
            const updatedOrderData = {
              ...orderData,
              paymentDetails: paymentDetails,
              status: 'Paid',
              paymentCompletedAt: new Date().toISOString()
            };

            // Update order status to reflect successful payment
            const paidOrderData = {
              ...updatedOrderData,
              status: 'Paid'
            };
            
            // Complete the order
            await completeOrder(paidOrderData, orderId);

            const modeText = isLiveMode ? ' (Live Payment - Real Money Charged)' : ' (Test Payment - No Real Money)';
            alert(`✅ PAYMENT SUCCESS${modeText}!\n\n₹${orderData.totalAmount} ${isLiveMode ? 'charged to' : 'test payment for'} ${formData.name}\nPayment ID: ${response.razorpay_payment_id}\n\nOrder placed and invoice downloading.`);

          } catch (error) {
            console.error('Order processing error:', error);
            alert(`Payment successful but order processing failed.\n\nPayment ID: ${response.razorpay_payment_id}\nAmount: ₹${orderData.totalAmount}\n\nPlease contact support.`);
            setLoading(false);
          }
        },

        // Pre-fill customer details
        prefill: {
          name: formData.name || 'Customer',
          email: formData.email || '',
          contact: formData.phone || '',
        },

        // Theme
        theme: {
          color: '#4682B4',
        },

        // Modal settings
        modal: {
          ondismiss: async () => {
            console.log(`${isLiveMode ? 'Live' : 'Test'} payment modal dismissed by user`);
            
            // Save customer data with payment cancelled reason
            const customerData = {
              name: orderData.customerName,
              email: orderData.customerEmail,
              phone: orderData.customerPhone,
              address: orderData.customerAddress.street,
              landmark: orderData.customerAddress.landmark,
              city: orderData.customerAddress.city,
              state: orderData.customerAddress.state,
              postalCode: orderData.customerAddress.postalCode,
              birthDate: orderData.birthDate,
              paymentMethod: orderData.paymentMethod,
            };
            
            await saveCustomerData(customerData, 'payment_cancelled');
            setLoading(false);
          },
        },

        // Notes
        notes: {
          order_id: orderId,
          customer_phone: formData.phone,
          customer_email: formData.email,
          total_amount: orderData.totalAmount,
          payment_mode: isLiveMode ? 'live' : 'test'
        },

        // Retry settings
        retry: {
          enabled: true,
          max_count: 3
        }
      };

      // Validate amount
      if (options.amount <= 0) {
        alert('Invalid order amount. Please try again.');
        setLoading(false);
        return;
      }

      if (options.amount < 100) { // Minimum ₹1
        alert('Minimum payment amount is ₹1.');
        setLoading(false);
        return;
      }

      // Create and open Razorpay
      console.log(`🔴 Opening ${isLiveMode ? 'LIVE' : 'TEST'} Razorpay payment for ₹${orderData.totalAmount}...`);
      console.log('Using key:', razorpayKey.substring(0, 12) + '...');

      const rzp = new window.Razorpay(options);

      // Handle payment failures
      rzp.on('payment.failed', async (response) => {
        console.error(`=== ${isLiveMode ? 'LIVE' : 'TEST'} PAYMENT FAILED ===`);
        console.error('Error:', response.error);
        console.error('==========================');

        let errorMessage = `${isLiveMode ? 'Live' : 'Test'} payment failed for ₹${orderData.totalAmount}.\n\n`;

        if (response.error) {
          switch (response.error.code) {
            case 'BAD_REQUEST_ERROR':
              errorMessage += 'Invalid request. Please try again.';
              break;
            case 'GATEWAY_ERROR':
              errorMessage += 'Payment gateway error. Try different payment method.';
              break;
            case 'NETWORK_ERROR':
              errorMessage += 'Network error. Check internet connection.';
              break;
            case 'BAD_REQUEST_AUTHENTICATION_ERROR':
              errorMessage += 'Authentication failed. Please check your Razorpay account.';
              break;
            default:
              errorMessage += response.error.description || 'Unknown error occurred';
          }

          errorMessage += `\n\nError Code: ${response.error.code}`;
          if (isLiveMode) {
            errorMessage += '\nIf using live mode, ensure your Razorpay account is fully activated.';
          }
        }

        // Save customer data with payment failure reason
        const customerData = {
          name: orderData.customerName,
          email: orderData.customerEmail,
          phone: orderData.customerPhone,
          address: orderData.customerAddress.street,
          landmark: orderData.customerAddress.landmark,
          city: orderData.customerAddress.city,
          state: orderData.customerAddress.state,
          postalCode: orderData.customerAddress.postalCode,
          birthDate: orderData.birthDate,
          paymentMethod: orderData.paymentMethod,
        };
        
        await saveCustomerData(customerData, 'payment_failed');

        alert(errorMessage);
        setLoading(false);
      });

      // Open checkout
      rzp.open();

    } catch (error) {
      console.error('Razorpay initialization error:', error);
      alert('Failed to initialize payment. Please try again.');
      setLoading(false);
    }
  };





  const handleWalletPayment = async (orderData, orderId) => {
    const walletRef = ref(db, `HTAMS/users/${user.uid}/MySales`);
    await runTransaction(walletRef, (currentBalance) => {
      const balance = Number(currentBalance) || 0;
      if (balance >= orderData.totalAmount) {
        return balance - orderData.totalAmount;
      }
      return currentBalance;
    });

    const updatedWalletSnap = await get(walletRef);
    if (Number(updatedWalletSnap.val()) < orderData.totalAmount) {
      alert('Insufficient wallet balance after transaction.');
      setLoading(false);
      return false;
    }

    await completeOrder(orderData, orderId);
    return true;
  };

  const handleChequePayment = async (orderData, orderId) => {
    if (!chequeFile) {
      setChequeError('Please upload a cheque image before submitting the order.');
      alert('Please upload a cheque image before submitting the order.');
      return false;
    }

    try {
      const fileExtension = chequeFile.name.split('.').pop();
      const safeExtension = fileExtension ? fileExtension.toLowerCase() : 'jpg';
      const chequePath = `HTAMS/chequePayments/${orderId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${safeExtension}`;
      const chequeStorageReference = storageRef(storage, chequePath);

      const uploadResult = await uploadBytes(chequeStorageReference, chequeFile);
      const chequeImageUrl = await getDownloadURL(uploadResult.ref);

      const chequeDetails = {
        imageUrl: chequeImageUrl,
        storagePath: chequePath,
        uploadedAt: new Date().toISOString(),
        uploadedBy: user?.uid || 'unknown',
        status: 'pending_verification',
      };

      const orderDataWithCheque = {
        ...orderData,
        status: 'Pending',
        paymentDetails: {
          payment_method: 'Cheque',
          payment_status: 'awaiting_verification',
          chequeImageUrl,
          chequeStoragePath: chequePath,
          uploadedAt: chequeDetails.uploadedAt,
        },
        chequeDetails,
        commissionStatus: 'awaiting_admin_approval',
      };

      await set(ref(db, `HTAMS/orders/${orderId}`), {
        ...orderDataWithCheque,
        orderId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await saveCustomerData({
        ...orderDataWithCheque,
        phone: orderData.customerPhone,
      }, 'cheque_payment_submitted');

      showNotification(
        'Cheque uploaded for verification',
        '🧾 Awaiting Admin Approval',
        'info'
      );

      alert('Cheque uploaded successfully. Admin will verify and approve the payment.');

      return true;
    } catch (error) {
      console.error('Failed to process cheque payment:', error);
      alert('Failed to upload cheque. Please try again.');
      return false;
    }
  };

  const completeOrder = async (orderData, orderId) => {
    try {
      // Clean the order data to remove any undefined values
      const cleanOrderData = JSON.parse(JSON.stringify(orderData, (key, value) => {
        return value === undefined ? null : value;
      }));

      // Add order ID to the order data
      const orderDataWithId = {
        ...cleanOrderData,
        orderId: orderId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await set(ref(db, `HTAMS/orders/${orderId}`), orderDataWithId);
    } catch (error) {
      console.error('Error saving order to Firebase:', error);
      throw error;
    }

    const customerRef = ref(db, `HTAMS/customers/${formData.phone}`);
    const customerSnap = await get(customerRef);

    const customerData = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      address: orderData.customerAddress,
      birthDate: formData.birthDate,
    };

    if (customerSnap.exists()) {
      const existingOrders = customerSnap.val().myOrders || {};
      await update(customerRef, {
        ...customerData,
        myOrders: { ...existingOrders, [orderId]: true },
      });
    } else {
      const counterRef = ref(db, 'HTAMS/meta/customerIdCounter');
      const counterResult = await runTransaction(counterRef, (current) => (current || 1000) + 1);
      if (counterResult.committed) {
        const prefix = formData.email.slice(0, 3).toLowerCase();
        const customerId = `cus_${prefix}_${counterResult.snapshot.val()}`;
        await set(customerRef, {
          ...customerData,
          customerId: customerId,
          createdAt: Date.now(),
          myOrders: { [orderId]: true },
        });
      }
    }

    let commissionResults = [];
    for (const item of cart) {
      try {
        const itemOrderData = {
          totalAmount: item.price * item.quantity,
          productId: item.id,
          productName: item.name,
          quantity: item.quantity,
          customerName: formData.name,
          customerPhone: formData.phone,
          customerEmail: formData.email,
        };

        const commissionResult = await processCommission(itemOrderData, `${orderId}_${item.id}`);
        commissionResults.push({ productId: item.id, result: commissionResult });

        await saveSaleDetails(itemOrderData, `${orderId}_${item.id}`, commissionResult);
      } catch (error) {
        console.error(`Commission processing failed for ${item.name}:`, error);
        commissionResults.push({ productId: item.id, result: { ok: false, error: error.message } });
      }
    }

    try {
      const allDistributed = commissionResults.length > 0 && commissionResults.every(r => r.result?.ok);
      const partialDistributed = commissionResults.some(r => r.result?.ok);

      const distributionStatus = allDistributed
        ? 'distributed'
        : partialDistributed
          ? 'partially_distributed'
          : 'pending';

      await update(ref(db, `HTAMS/orders/${orderId}`), {
        status: 'Pending',
        commissionSummary: {
          distributed: commissionResults.filter(r => r.result?.ok).length,
          totalItems: commissionResults.length,
          lastUpdated: new Date().toISOString(),
          results: commissionResults,
          distributionStatus,
        },
      });
    } catch (error) {
      console.error('Failed to update order status after commission processing:', error);
    }

    await generateMultiProductPdfBill({
      ...orderData,
      orderId: orderId,
      items: cart,
      saleDate: new Date().toLocaleString(),
    });

    const successfulCommissions = commissionResults.filter(r => r.result.ok).length;
    console.log(`Order placed successfully! Commission distributed for ${successfulCommissions} out of ${cart.length} products.`);
    resetForm();
  };

  const submitOrder = async () => {
    if (cart.length === 0) {
      alert('Please add items to cart before placing order');
      return;
    }

    if (!validateAllFields()) {
      alert('Please fix all validation errors before submitting');
      return;
    }

    if (formData.paymentMethod === 'Cheque') {
      let hasError = false;
      if (!chequeFile) {
        setChequeError('Cheque image is required for cheque payments.');
        hasError = true;
      }

      if (!utrNumber.trim()) {
        setUtrError('Please enter the cheque UTR number.');
        hasError = true;
      }

      if (hasError) {
        alert('Please provide the required cheque details before placing the order.');
        return;
      }
    }

    setLoading(true);
    console.log('=== STARTING MULTI-PRODUCT ORDER SUBMISSION ===');

    // Save customer data immediately when order is placed
    const customerData = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      landmark: formData.landmark,
      city: formData.city,
      state: formData.state,
      postalCode: formData.postalCode,
      birthDate: formData.birthDate,
      paymentMethod: formData.paymentMethod,
    };
    
    await saveCustomerData(customerData, 'order_placed');

    if (!user?.uid) {
      console.error('=== USER VALIDATION ERROR ===');
      alert('User not logged in properly. Please refresh and try again.');
      setLoading(false);
      return;
    }

    try {
      for (const item of cart) {
        const productStockRef = ref(db, `HTAMS/company/products/${item.id}/stock`);
        const stockSnapshot = await get(productStockRef);
        const currentStock = Number(stockSnapshot.val()) || 0;

        if (currentStock < item.quantity) {
          alert(`Insufficient stock for ${item.name}. Available: ${currentStock}, Required: ${item.quantity}`);
          setLoading(false);
          return;
        }
      }

      for (const item of cart) {
        const productStockRef = ref(db, `HTAMS/company/products/${item.id}/stock`);
        await runTransaction(productStockRef, (currentStock) => {
          const stockNum = Number(currentStock) || 0;
          return stockNum - item.quantity;
        });
      }

      const totalAmount = getCartTotal();
      const orderData = {
        items: cart.map(item => ({
          productId: item.id,
          productName: item.name,
          quantity: item.quantity,
          unitPrice: item.mrp,
          totalPrice: item.mrp * item.quantity,
        })),
        totalAmount: totalAmount,
        totalItems: getCartItemCount(),
        orderDate: new Date().toISOString(),
        placedBy: user?.uid || 'unknown',
        customerName: formData.name,
        customerEmail: formData.email,
        customerPhone: formData.phone,
        customerAddress: {
          street: formData.address,
          landmark: formData.landmark,
          city: formData.city,
          state: formData.state,
          postalCode: formData.postalCode,
        },
        birthDate: formData.birthDate,
        paymentMethod: formData.paymentMethod,
        status: 'Pending',
      };

      // Generate order ID on client side
      const orderId = generateOrderId();

      if (formData.paymentMethod === 'Wallet' && totalAmount <= walletBalance) {
        // Update order status for wallet payment
        const walletOrderData = {
          ...orderData,
          status: 'Paid',
          paymentDetails: {
            payment_method: 'Wallet',
            payment_status: 'success',
            payment_timestamp: new Date().toISOString()
          }
        };
        const success = await handleWalletPayment(walletOrderData, orderId);
        if (success) {
          alert('Order placed successfully using wallet balance! Invoice is downloading.');
        }
      } else if (formData.paymentMethod === 'Cheque') {
        const chequeOrderData = {
          ...orderData,
          status: 'Waiting Confirmation',
          paymentDetails: {
            payment_method: 'Cheque',
            payment_status: 'awaiting_verification',
            submittedAt: new Date().toISOString(),
            utrNumber: utrNumber.trim(),
          }
        };

        const success = await handleChequePayment(chequeOrderData, orderId);
        if (success) {
          showNotification('Order saved for cheque verification', '🧾 Cheque Pending', 'info');
          alert('Order submitted. Admin will verify the cheque before processing.');
          resetForm();
        }
      } else if (formData.paymentMethod === 'Online') {
        await handleRazorpayPayment(orderData, orderId);
      } else if (formData.paymentMethod === 'Cash') {
        // Handle cash payment - complete order directly
        const updatedOrderData = {
          ...orderData,
          status: 'Cash Payment - Pending Collection',
          paymentDetails: {
            payment_method: 'Cash',
            payment_status: 'pending_collection',
            payment_timestamp: new Date().toISOString()
          }
        };
        await completeOrder(updatedOrderData, orderId);
        alert('Order placed successfully! Cash payment will be collected on delivery. Invoice is downloading.');
      } else {
        alert('Please select a valid payment method.');

      }

    } catch (err) {
      console.error('=== MULTI-PRODUCT ORDER PROCESSING ERROR ===', err);
      alert('Failed to place order. An error occurred. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setShowCartModal(false);
    setFormData(initialFormData);
    setValidationErrors({});
    setSelectedCustomer('');
    setIsNewCustomer(true);
    setCustomerOrders([]);
    setAvailableDistricts([]);
    clearCart();
  };

  // Save customer interest for follow-up
  // const saveCustomerInterest = async (customerData, cartItems) => {
  //   try {
  //     const interestId = `interest_${Date.now()}_${customerData.phone}`;
  //     const totalInterestValue = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
      
  //     const interestData = {
  //       name: customerData.name,
  //       phone: customerData.phone,
  //       email: customerData.email,
  //       interestDate: new Date().toISOString(),
  //       interestedProducts: cartItems.map(item => ({
  //         name: item.name,
  //         price: item.price,
  //         quantity: item.quantity,
  //         productId: item.id
  //       })),
  //       totalInterestValue: totalInterestValue,
  //       followUpDays: customerData.followUpDays || 2,
  //       status: 'pending',
  //       notes: customerData.notes || '',
  //       source: 'cart_abandonment'
  //     };

  //     const interestRef = ref(db, `HTAMS/followUpCustomers/${interestId}`);
  //     await set(interestRef, interestData);
      
  //     return true;
  //   } catch (error) {
  //     console.error('Error saving customer interest:', error);
  //     return false;
  //   }
  // };

  // Handle interest form submission
  // const handleInterestSubmit = async (e) => {
  //   e.preventDefault();
    
  //   if (!interestFormData.name || !interestFormData.phone) {
  //     alert('Please fill in name and phone number');
  //     return;
  //   }

  //   setLoading(true);
  //   try {
  //     const success = await saveCustomerInterest(interestFormData, cart);
  //     if (success) {
  //       alert('Your interest has been saved! We will follow up with you soon.');
  //       setShowInterestModal(false);
  //       setInterestFormData({
  //         name: '',
  //         phone: '',
  //         email: '',
  //         followUpDays: 2,
  //         notes: ''
  //       });
  //       clearCart();
  //     } else {
  //       alert('Failed to save your interest. Please try again.');
  //     }
  //   } catch (error) {
  //     console.error('Error submitting interest:', error);
  //     alert('An error occurred. Please try again.');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // Simple cart close handler
  const handleCartClose = () => {
    setShowCartModal(false);
  };

  // Save follow-up using current form data and cart items
  const handleSaveFollowUp = async () => {
    try {
      if (cart.length === 0) {
        alert('Please add some products to the cart before saving a follow-up.');
        return;
      }

      // Require same information as order so later autofill works
      if (!validateAllFields()) {
        alert('Please complete customer details before saving follow-up.');
        return;
      }

      if (!user?.uid) {
        alert('User not logged in. Please refresh and try again.');
        return;
      }

      setLoading(true);

      const followUpDays = 2;
      const scheduledFollowUpAt = new Date(Date.now() + followUpDays * 24 * 60 * 60 * 1000).toISOString();
      const interestId = `interest_${Date.now()}_${formData.phone}`;
      const totalInterestValue = cart.reduce((t, it) => t + (it.price * it.quantity), 0);

      const interestData = {
        id: interestId,
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        address: {
          street: formData.address,
          landmark: formData.landmark,
          city: formData.city,
          state: formData.state,
          postalCode: formData.postalCode,
        },
        birthDate: formData.birthDate,
        interestedProducts: cart.map(item => ({
          productId: item.id,
          name: item.name,
          price: item.mrp,
          quantity: item.quantity,
          totalPrice: item.mrp * item.quantity,
        })),
        totalInterestValue,
        totalItems: getCartItemCount(),
        followUpDays,
        scheduledFollowUpAt,
        status: 'pending',
        notes: '',
        placedBy: user.uid,
        capturedAt: new Date().toISOString(),
        source: 'follow_up_from_cart'
      };

      // Save follow-up entry
      await set(ref(db, `HTAMS/followUpCustomers/${interestId}`), interestData);

      // Upsert prospect into customers to enable autofill later
      const customerRef = ref(db, `HTAMS/customers/${formData.phone}`);
      const existingSnap = await get(customerRef);
      const prospectData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: {
          street: formData.address,
          landmark: formData.landmark,
          city: formData.city,
          state: formData.state,
          postalCode: formData.postalCode,
        },
        birthDate: formData.birthDate,
        createdBy: user.uid,
        ownerId: user.uid,
        prospect: true,
        lastFollowUpId: interestId,
        updatedAt: new Date().toISOString(),
      };

      if (existingSnap.exists()) {
        await update(customerRef, prospectData);
      } else {
        await set(customerRef, { ...prospectData, createdAt: new Date().toISOString() });
      }

      showNotification('Follow-up saved', `📌 ${formData.name} in ${cart.length} item(s)`, 'success');
      alert('Follow-up saved. We will remind you on the scheduled day.');
    } catch (e) {
      console.error('Error saving follow-up:', e);
      alert('Failed to save follow-up. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle follow up button click
  // const handleFollowUpClick = () => {
  //   if (cart.length === 0) {
  //     alert('Please add some products to your interest list first!');
  //     return;
  //   }
  //   setShowInterestModal(true);
  // };

  const saveSaleDetails = async (orderData, orderId, commissionResult) => {
    try {
      let saleData;

      if (commissionResult?.ok && commissionResult?.paidTo) {
        const commissionsObject = {};

        commissionResult.paidTo.forEach(recipient => {
          commissionsObject[recipient.uid] = {
            amount: recipient.amount,
            diff: recipient.diff,
            rate: recipient.rate,
            role: recipient.role,
          };
        });

        const sellerInfo = commissionResult.paidTo.find(p => p.uid === (user?.uid || 'unknown'));
        const roleAtSale = sellerInfo?.role || user?.currentLevel || null;

        saleData = {
          sellerId: user?.uid || 'unknown',
          amount: orderData.totalAmount,
          product: {
            id: orderData.productId,
            name: orderData.productName,
          },
          orderId: orderId,
          roleAtSale: roleAtSale,
          timestamp: Date.now(),
          commissions: commissionsObject,
          customerName: orderData.customerName,
          customerPhone: orderData.customerPhone,
          customerEmail: orderData.customerEmail,
          quantity: orderData.quantity,
          unitPrice: orderData.totalAmount / orderData.quantity,
          paymentMethod: orderData.paymentMethod,
          saleDate: new Date().toISOString(),
          status: 'Completed',
          commissionDistributed: true,
        };
      } else {
        saleData = {
          sellerId: user?.uid || 'unknown',
          amount: orderData.totalAmount,
          product: {
            id: orderData.productId,
            name: orderData.productName,
          },
          orderId: orderId,
          roleAtSale: user?.currentLevel || null,
          timestamp: Date.now(),
          commissions: {},
          customerName: orderData.customerName,
          customerPhone: orderData.customerPhone,
          customerEmail: orderData.customerEmail,
          quantity: orderData.quantity,
          unitPrice: orderData.totalAmount / orderData.quantity,
          paymentMethod: orderData.paymentMethod,
          saleDate: new Date().toISOString(),
          status: 'Completed',
          commissionDistributed: false,
          commissionError: commissionResult?.error || 'Commission processing failed',
        };
      }

      console.log('Saving sale details:', saleData);
      const saleRef = ref(db, `HTAMS/salesDetails/${orderId}`);
      await set(saleRef, saleData);

      console.log('Sale details saved successfully');
      return saleData;
    } catch (error) {
      console.error('Error saving sale details:', error);
      throw error;
    }
  };

  const processCommission = async (orderData, orderId) => {
    console.log('=== STARTING COMMISSION PROCESSING ===');

    try {
      const apiPayload = {
        sellerId: user?.uid || 'unknown',
        amount: orderData.totalAmount,
        product: {
          id: orderData.productId,
          name: orderData.productName,
        },
        orderId: orderId,
        idempotencyKey: `order_${orderId}_${Date.now()}`,
      };

      console.log('=== API PAYLOAD ===', apiPayload);

      // Use processsale endpoint for new orders
      const response = await fetch('https://processsale-udqmpp6qhq-uc.a.run.app/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiPayload),
      });

      console.log('Response status:', response.status);
      const responseText = await response.text();
      console.log('Raw response:', responseText);

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status} - ${responseText}`);
      }

      const result = JSON.parse(responseText);
      console.log('Parsed result:', result);
      return result;

    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  };

  const generateMultiProductPdfBill = async (billData) => {
    try {
      const doc = new jsPDF();
      const address = billData.customerAddress;
      const fullAddress = `${address.street}${address.landmark ? `, ${address.landmark}` : ''}, ${address.city}, ${address.state} - ${address.postalCode}`;

      // Page dimensions
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 20;
      
      // Generate invoice details
      const timestamp = Date.now().toString();
      const invoiceNo = `${timestamp.slice(0, 5)}-${timestamp.slice(5, 7)}`;
      const invoiceDate = new Date();
      const formattedDate = invoiceDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      const formattedTime = invoiceDate.toLocaleTimeString('en-US', { weekday: 'long', hour: '2-digit', minute: '2-digit' });
      
      // Calculate GST (5%) - GST is already included in the price
      // If total is 100, then: base amount = 100/1.05 = 95.24, GST = 4.76
      const totalAmount = billData.totalAmount; // This already includes GST
      const gstRate = 0.05;
      const baseAmount = totalAmount / (1 + gstRate); // Amount without GST
      const gstAmount = totalAmount - baseAmount; // GST portion
      
      // Determine if transaction is intra-state (Maharashtra) or inter-state
      const customerState = address.state;
      const isIntraState = customerState === 'Maharashtra';
      
      // Calculate SGST, CGST, and IGST based on state
      let sgstAmount = 0;
      let cgstAmount = 0;
      let igstAmount = 0;
      
      if (isIntraState) {
        // For Maharashtra (intra-state): Split GST into SGST and CGST
        sgstAmount = gstAmount / 2; // 2.5%
        cgstAmount = gstAmount / 2; // 2.5%
      } else {
        // For other states (inter-state): Use IGST
        igstAmount = gstAmount; // 5%
      }

      // Background gradient effect (light green) - no black borders
      doc.setFillColor(240, 244, 232); // #f0f4e8
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      // Decorative circles removed as per user request

      // Add logo
      try {
        doc.addImage(ONDOLogo, 'jpg', (pageWidth - 30) / 2, 15, 30, 30);
      } catch (logoError) {
        console.warn('Could not add logo to PDF:', logoError);
      }

      // INVOICE title
      doc.setFontSize(36);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(26, 26, 26);
      doc.text('INVOICE', pageWidth / 2, 55, { align: 'center' });

      // Invoice number and date
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(74, 85, 104);
      doc.text(`No. ${invoiceNo}`, margin, 68);
      doc.text(`GSTIN: 27AAPCJ1234D1Z1`, margin, 74); 
      doc.text(formattedDate, pageWidth - margin, 68, { align: 'right' });
      doc.text(formattedTime, pageWidth - margin, 74, { align: 'right' });

      // Invoice To section with customer details
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(45, 55, 72);
      doc.text('INVOICE TO:', margin, 86);
      
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(26, 26, 26);
      doc.text(billData.customerName, pageWidth - margin, 86, { align: 'right' });

      // Customer details below name
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(74, 85, 104);
      doc.text(`Mobile: ${billData.customerPhone}`, pageWidth - margin, 93, { align: 'right' });
      doc.text(`Address: ${fullAddress}`, pageWidth - margin, 99, { align: 'right', maxWidth: 100 });

      // Items table with white background box
      const tableStartY = 110;
      const tableHeaderHeight = 10;
      
      // White background for entire table area
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin, tableStartY, pageWidth - (2 * margin), tableHeaderHeight, 2, 2, 'F');

      // Table header
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(45, 55, 72);
      doc.text('DESCRIPTION', margin + 10, tableStartY + 8);
      doc.text('PRICE', pageWidth - 110, tableStartY + 8, { align: 'center' });
      doc.text('QTY', pageWidth - 65, tableStartY + 8, { align: 'center' });
      doc.text('TOTAL', pageWidth - margin - 10, tableStartY + 8, { align: 'right' });

      // Table header bottom border
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(1);
      doc.line(margin + 5, tableStartY + tableHeaderHeight, pageWidth - margin - 5, tableStartY + tableHeaderHeight);

      // Table items
      let currentY = tableStartY + tableHeaderHeight + 6;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(74, 85, 104);

      billData.items.forEach((item, index) => {
        // Check if we need a new page (increased threshold to fit more on one page)
        if (currentY > pageHeight - 70) {
          doc.addPage();
          doc.setFillColor(240, 244, 232);
          doc.rect(0, 0, pageWidth, pageHeight, 'F');
          currentY = 30;
        }

        const itemTotal = item.mrp * item.quantity;
        
        doc.text(item.name, margin + 10, currentY, { maxWidth: 85 });
        doc.text('Rs.' + item.mrp.toFixed(2), pageWidth - 110, currentY, { align: 'center' });
        doc.setFont('helvetica', 'bold');
        doc.text(item.quantity.toString(), pageWidth - 65, currentY, { align: 'center' });
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(26, 26, 26);
        doc.text('Rs.' + itemTotal.toFixed(2), pageWidth - margin - 10, currentY, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(74, 85, 104);

        currentY += 10;
        
        // Item separator line (subtle)
        if (index < billData.items.length - 1) {
          doc.setDrawColor(230, 235, 240);
          doc.setLineWidth(0.3);
          doc.line(margin + 10, currentY - 6, pageWidth - margin - 10, currentY - 6);
        }
      });

      // Totals section
      const totalsY = currentY + 6;
      doc.setDrawColor(203, 213, 224);
      doc.setLineWidth(1.5);
      doc.line(margin + 5, totalsY, pageWidth - margin - 5, totalsY);

      // Base Amount (Amount before GST)
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(45, 55, 72);
      doc.text('Amount =', pageWidth - margin - 75, totalsY + 8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(26, 26, 26);
      doc.text('Rs.' + baseAmount.toFixed(2), pageWidth - margin - 5, totalsY + 8, { align: 'right' });
      
      // GST breakdown based on state
      let currentLineY = totalsY + 15;
      
      if (isIntraState) {
        // For Maharashtra (intra-state): Show SGST and CGST
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(45, 55, 72);
        doc.text('SGST (2.5%)', pageWidth - margin - 75, currentLineY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(26, 26, 26);
        doc.text('Rs.' + sgstAmount.toFixed(2), pageWidth - margin - 5, currentLineY, { align: 'right' });
        
        currentLineY += 7;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(45, 55, 72);
        doc.text('CGST (2.5%)', pageWidth - margin - 75, currentLineY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(26, 26, 26);
        doc.text('Rs.' + cgstAmount.toFixed(2), pageWidth - margin - 5, currentLineY, { align: 'right' });
      } else {
        // For other states (inter-state): Show IGST
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(45, 55, 72);
        doc.text('IGST (5%)', pageWidth - margin - 75, currentLineY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(26, 26, 26);
        doc.text('Rs.' + igstAmount.toFixed(2), pageWidth - margin - 5, currentLineY, { align: 'right' });
      }

      // Total Amount
      const totalLineY = currentLineY + 4;
      doc.setDrawColor(203, 213, 224);
      doc.setLineWidth(1);
      doc.line(pageWidth - margin - 80, totalLineY, pageWidth - margin, totalLineY);

      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(45, 55, 72);
      doc.text('Total Amount', pageWidth - margin - 75, totalLineY + 9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(26, 26, 26);
      doc.text('Rs.' + totalAmount.toFixed(2), pageWidth - margin - 5, totalLineY + 9, { align: 'right' });
      
      // Amount in words
      const amountInWords = convertAmountToWords(Math.floor(totalAmount));
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(74, 85, 104);
      const wordsY = totalLineY + 14;
      doc.text(amountInWords, pageWidth - margin - 5, wordsY, { align: 'right', maxWidth: 100 });

      // Footer section
      const footerY = totalLineY + 23;
      
      // Send Payments To
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(45, 55, 72);
      doc.text('SEND PAYMENTS TO:', margin + 5, footerY);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(74, 85, 104);
      doc.text(billData.customerName, margin + 5, footerY + 8);
      doc.text(billData.customerEmail, margin + 5, footerY + 15);

      // Thank You
      doc.setFontSize(30);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(74, 124, 89); // Green color
      doc.text('Thank You!', pageWidth - margin - 5, footerY + 12, { align: 'right' });

      // Additional info at bottom (subtle)
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 120, 120);
      doc.text(`Payment: ${billData.paymentMethod} | Items: ${billData.totalItems}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

      // Generate PDF as blob for upload
      const fileName = `Invoice_${invoiceNo}_${billData.customerName.replace(/\s+/g, '_')}.pdf`;
      const pdfBlob = doc.output('blob');
      
      // Download PDF locally
      doc.save(fileName);
      
      // Show notification
      showNotification(
        `Invoice downloaded successfully`,
        `📄 ${fileName}`,
        'success'
      );
      
      // Upload PDF to Firebase Storage and save metadata
      try {
        const orderId = billData.orderId || generateOrderId();
        
        // Upload PDF to Firebase Storage
        const storagePath = `orders/${orderId}/invoice/${fileName}`;
        const pdfStorageRef = storageRef(storage, storagePath);
        
        console.log('Uploading PDF to Firebase Storage...');
        await uploadBytes(pdfStorageRef, pdfBlob, {
          contentType: 'application/pdf',
          customMetadata: {
            orderId: orderId,
            customerName: billData.customerName,
            invoiceNumber: invoiceNo,
            generatedAt: new Date().toISOString()
          }
        });
        
        // Get download URL
        const downloadURL = await getDownloadURL(pdfStorageRef);
        console.log('✅ PDF uploaded to Firebase Storage');
        
        // Save invoice metadata to database with storage URL
        const invoiceData = {
          invoiceNumber: invoiceNo,
          invoiceDate: invoiceDate.toISOString(),
          formattedDate: formattedDate,
          formattedTime: formattedTime,
          customerName: billData.customerName,
          customerPhone: billData.customerPhone,
          customerEmail: billData.customerEmail,
          customerAddress: fullAddress,
          customerState: customerState,
          isIntraState: isIntraState,
          items: billData.items.map(item => ({
            name: item.name,
            price: item.invoicePrice,
            quantity: item.quantity,
            total: item.invoicePrice * item.quantity
          })),
          baseAmount: baseAmount,
          gstRate: gstRate,
          gstAmount: gstAmount,
          sgstAmount: sgstAmount,
          cgstAmount: cgstAmount,
          igstAmount: igstAmount,
          totalAmount: totalAmount,
          amountInWords: convertAmountToWords(Math.floor(totalAmount)),
          paymentMethod: billData.paymentMethod,
          totalItems: billData.totalItems,
          generatedAt: new Date().toISOString(),
          generatedBy: user?.uid || 'unknown',
          fileName: fileName,
          storagePath: storagePath,
          downloadURL: downloadURL
        };
        
        await set(ref(db, `HTAMS/orders/${orderId}/invoice`), invoiceData);
        console.log('✅ Invoice metadata saved to Firebase Database');
        
        showNotification(
          `Invoice uploaded to cloud storage`,
          `☁️ ${fileName}`,
          'success'
        );
      } catch (firebaseError) {
        console.error('❌ Error uploading invoice to Firebase:', firebaseError);
        showNotification(
          `Failed to upload invoice to cloud`,
          `⚠️ ${fileName}`,
          'error'
        );
        // Don't fail the whole process if Firebase upload fails
      }
      
      console.log('✅ PDF invoice generated successfully');
    } catch (error) {
      console.error('❌ Error generating PDF invoice:', error);
      alert('Could not generate PDF invoice. Please try again.');
    }
  };

  const convertAmountToWords = (amount) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    if (amount === 0) return 'Zero Rupees Only';

    let words = '';
    let crores = Math.floor(amount / 10000000);
    let lakhs = Math.floor((amount % 10000000) / 100000);
    let thousands_part = Math.floor((amount % 100000) / 1000);
    let hundreds = Math.floor((amount % 1000) / 100);
    let remainder = amount % 100;

    if (crores > 0) {
      words += convertNumberToWords(crores) + ' Crore ';
    }
    if (lakhs > 0) {
      words += convertNumberToWords(lakhs) + ' Lakh ';
    }
    if (thousands_part > 0) {
      words += convertNumberToWords(thousands_part) + ' Thousand ';
    }
    if (hundreds > 0) {
      words += ones[hundreds] + ' Hundred ';
    }
    if (remainder > 0) {
      if (remainder < 10) {
        words += ones[remainder];
      } else if (remainder < 20) {
        words += teens[remainder - 10];
      } else {
        words += tens[Math.floor(remainder / 10)];
        if (remainder % 10 > 0) {
          words += ' ' + ones[remainder % 10];
        }
      }
    }

    return words.trim() + ' Rupees Only';
  };

  const convertNumberToWords = (num) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    if (num < 10) return ones[num];
    if (num < 20) return teens[num - 10];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 > 0 ? ' ' + ones[num % 10] : '');
    return '';
  };

  return (
    <div className="all-products-container">
      {/* Top Right Notifications Stack */}
      <div 
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          maxWidth: '420px',
          pointerEvents: 'none'
        }}
      >
        {notifications.map((notification, index) => {
          const getNotificationStyle = (type) => {
            switch (type) {
              case 'success':
                return {
                  bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: '#10b981',
                  shadow: '0 10px 40px rgba(16, 185, 129, 0.3)',
                  iconBg: 'rgba(16, 185, 129, 0.1)',
                  progressBg: '#10b981'
                };
              case 'error':
                return {
                  bg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  border: '#ef4444',
                  shadow: '0 10px 40px rgba(239, 68, 68, 0.3)',
                  iconBg: 'rgba(239, 68, 68, 0.1)',
                  progressBg: '#ef4444'
                };
              case 'warning':
                return {
                  bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  border: '#f59e0b',
                  shadow: '0 10px 40px rgba(245, 158, 11, 0.3)',
                  iconBg: 'rgba(245, 158, 11, 0.1)',
                  progressBg: '#f59e0b'
                };
              case 'info':
                return {
                  bg: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  border: '#3b82f6',
                  shadow: '0 10px 40px rgba(59, 130, 246, 0.3)',
                  iconBg: 'rgba(59, 130, 246, 0.1)',
                  progressBg: '#3b82f6'
                };
              default:
                return {
                  bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: '#10b981',
                  shadow: '0 10px 40px rgba(16, 185, 129, 0.3)',
                  iconBg: 'rgba(16, 185, 129, 0.1)',
                  progressBg: '#10b981'
                };
            }
          };

          const style = getNotificationStyle(notification.type);

          return (
            <div 
              key={notification.id}
              style={{
                animation: 'slideInRight 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
                animationDelay: `${index * 0.1}s`,
                animationFillMode: 'both',
                pointerEvents: 'auto'
              }}
            >
              <div 
                style={{
                  background: 'rgba(255, 255, 255, 0.98)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '16px',
                  boxShadow: style.shadow,
                  border: `2px solid ${style.border}`,
                  overflow: 'hidden',
                  minWidth: '340px',
                  maxWidth: '420px',
                  position: 'relative',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
                  e.currentTarget.style.boxShadow = `0 15px 50px rgba(0, 0, 0, 0.2)`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = style.shadow;
                }}
              >
                {/* Progress Bar */}
                <div 
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    height: '4px',
                    width: '100%',
                    background: '#f1f5f9',
                    overflow: 'hidden'
                  }}
                >
                  <div 
                    style={{
                      height: '100%',
                      background: style.progressBg,
                      animation: 'progressBar 3s linear',
                      transformOrigin: 'left'
                    }}
                  />
                </div>

                <div 
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    padding: '18px 20px',
                    gap: '14px'
                  }}
                >
                  {/* Icon with animated background */}
                  <div 
                    style={{
                      width: '48px',
                      height: '48px',
                      background: style.bg,
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '20px',
                      flexShrink: 0,
                      boxShadow: `0 4px 12px ${style.iconBg}`,
                      animation: 'pulse 2s ease-in-out infinite'
                    }}
                  >
                    <FaShoppingCart />
                  </div>

                  {/* Content */}
                  <div 
                    style={{
                      flex: 1,
                      minWidth: 0,
                      paddingTop: '2px'
                    }}
                  >
                    <div 
                      style={{
                        fontSize: '15px',
                        fontWeight: '700',
                        color: '#0f172a',
                        marginBottom: '6px',
                        lineHeight: '1.3',
                        letterSpacing: '-0.01em'
                      }}
                    >
                      {notification.title}
                    </div>
                    <div 
                      style={{
                        fontSize: '13px',
                        color: '#64748b',
                        lineHeight: '1.5',
                        fontWeight: '500'
                      }}
                    >
                      {notification.message}
                    </div>
                  </div>

                  {/* Close Button */}
                  <button 
                    onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                    style={{
                      width: '28px',
                      height: '28px',
                      border: 'none',
                      background: '#f1f5f9',
                      borderRadius: '8px',
                      color: '#64748b',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '13px',
                      flexShrink: 0,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#e2e8f0';
                      e.currentTarget.style.transform = 'rotate(90deg)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f1f5f9';
                      e.currentTarget.style.transform = 'rotate(0deg)';
                    }}
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100%) scale(0.8);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        @keyframes progressBar {
          from {
            transform: scaleX(1);
          }
          to {
            transform: scaleX(0);
          }
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
      `}</style>

      {/* Keep the original CartNotification commented out for now
      {notification && (
        <CartNotification
          message={notification.message}
          title={notification.title}
          onClose={() => setNotification(null)}
          onViewCart={() => setShowCartModal(true)}
        />
      )}
      */}
      <div className="page-header">
        <div className="header-content">
          <h1 className="page-title">

            All Products
          </h1>
          <p className="page-subtitle">Browse and purchase our available products</p>
        </div>

        <div className="product-stats">
          <div className="stat-item cart-stat" onClick={() => setShowCartModal(true)}>
            <span className="stat-number">{getCartItemCount()}</span>
            <span className="stat-label" style={{ color: 'white' }}>Items in Cart</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">₹{walletBalance.toLocaleString()}</span>
            <span className="stat-label" style={{ color: 'white' }}>Wallet Balance</span>
          </div>
        </div>
      </div>

      <div className="search-section">
        <div className="search-container">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search by name, price, or serial number..."
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search" onClick={() => setSearchQuery('')}>
              <FaTimes />
            </button>
          )}
        </div>
      </div>

      {cart.length > 0 && (
        <div className="cart-summary-bar">
          <div className="cart-summary-content">
            <span className="cart-items-count">
              {getCartItemCount()} items in cart
            </span>
            <span className="cart-total">
              Total: ₹{getCartTotal().toLocaleString()}
            </span>
            <div className="cart-actions">
            
              <button
                className="view-cart-button"
                onClick={() => setShowCartModal(true)}
              >
                <FaShoppingCart />
                View Cart & Checkout
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="products-grid">
        {filteredProducts.length === 0 ? (
          <div className="no-products">
            <span className="no-products-icon">📦</span>
            <p>
              {searchQuery
                ? "No available products match your search."
                : "No products are currently in stock."
              }
            </p>
          </div>
        ) : (
          filteredProducts.map((prod) => (
            <div key={prod.id} className="product-card" data-product-id={prod.id}>
              <div className="product-image-container">
                <img src={prod.imageUrl} alt={prod.name} className="product-image" />
              </div>

              <div className="product-details">
                <h3 className="product-name">{prod.name}</h3>
                <p className="product-category">{prod.category}</p>
                <p className="product-description">{prod.sr}</p>
                <div className="product-pricing">
                  <span className="product-price">₹{prod.mrp?.toLocaleString()}</span>
                  <span className="stock-info">
                    Stock: {prod.stock}
                  </span>
                </div>
              </div>
              <div className="product-actions">
  {(() => {
    const cartItem = cart.find(item => item.id === prod.id);
    const quantity = cartItem?.quantity || 0;
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
        {quantity > 0 ? (
          // Show quantity controls when item is in cart
          <div 
            className="quantity-controls"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              background: '#f8fafc',
              border: '2px solid #e2e8f0',
              borderRadius: '8px',
              padding: '8px 12px'
            }}
          >
            <button
              className="quantity-btn decrease"
              onClick={() => updateCartQuantity(prod.id, quantity - 1)}
              disabled={loading}
              style={{
                width: '32px',
                height: '32px',
                border: 'none',
                background: 'white',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '14px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                color: '#dc2626'
              }}
            >
              <FaMinus />
            </button>
            <span 
              className="quantity-display"
              style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#1e293b',
                minWidth: '24px',
                textAlign: 'center'
              }}
            >
              {quantity}
            </span>
            <button
              className="quantity-btn increase"
              onClick={() => updateCartQuantity(prod.id, quantity + 1)}
              disabled={loading || quantity >= prod.stock}
              style={{
                width: '32px',
                height: '32px',
                border: 'none',
                background: 'white',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '14px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                color: '#10b981'
              }}
            >
              <FaPlus />
            </button>
          </div>
        ) : (
          // Show Add to Cart button when item not in cart
          <button
            className="add-to-cart-button"
            onClick={() => addToCart(prod)}
            disabled={loading || prod.stock === 0}
          >
            <FaShoppingCart />
            Add  Cart
          </button>
        )}
        
        {/* Buy Now button - ALWAYS VISIBLE */}
        <button
          className="buy-now-button"
          onClick={() => handleBuyNow(prod)}
          disabled={loading || prod.stock === 0}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: 'white',
            border: 'none',
            padding: '6px 8px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'linear-gradient(135deg, #d97706 0%, #b45309 100%)';
            e.target.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
            e.target.style.transform = 'translateY(0px)';
          }}
        >
          🛒 Buy 
        </button>
      </div>
    );
  })()}
  
  {/* <div className="product-stock">
    {prod.stock} available
  </div> */}
</div>


            </div>
          ))
        )}
      </div>

      {showCartModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2>Shopping Cart ({getCartItemCount()} items)</h2>
              <button className="close-button" onClick={handleCartClose} disabled={loading}>
                <FaTimes />
              </button>
            </div>

            <div className="modal-content">
              {loading && (
                <div className="loading-bar-container">
                  <div className="loading-bar"></div>
                  <p className="loading-text">Processing your order...</p>
                </div>
              )}

              {cart.length === 0 ? (
                <div className="empty-cart">
                  <span className="empty-cart-icon">🛒</span>
                  <p>Your cart is empty</p>
                  <button className="continue-shopping" onClick={() => setShowCartModal(false)}>
                    Continue Shopping
                  </button>
                </div>
              ) : (
                <>
                  <div className="cart-items-section">
                    <h3>Items in Your Cart</h3>
                    <div className="cart-items-list">
                      {cart.map((item) => (
                        <div key={item.id} className="cart-item">
                          <div className="cart-item-image">
                            <img src={item.imageUrl} alt={item.name} />
                          </div>
                          <div className="cart-item-details">
                            <h4>{item.name}</h4>
                            <p className="cart-item-price">₹{item.mrp.toLocaleString()} each</p>
                          </div>
                          <div 
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              flexShrink: 0,
                              flexWrap: 'nowrap'
                            }}
                          >
                            <div 
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '12px',
                                background: '#f8fafc',
                                border: '2px solid #e2e8f0',
                                borderRadius: '8px',
                                padding: '8px 12px',
                                minWidth: '120px',
                                visibility: 'visible'
                              }}
                            >
                              <button
                                onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                                disabled={loading}
                                className="quantity-btn decrease"
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  border: 'none',
                                  background: 'white',
                                  borderRadius: '6px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  fontSize: '14px',
                                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                                  color: '#dc2626'
                                }}
                              >
                                <FaMinus />
                              </button>
                              <span 
                                className="quantity-display"
                                style={{
                                  fontSize: '16px',
                                  fontWeight: '600',
                                  color: '#1e293b',
                                  minWidth: '24px',
                                  textAlign: 'center'
                                }}
                              >
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                                disabled={loading}
                                className="quantity-btn increase"
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  border: 'none',
                                  background: 'white',
                                  borderRadius: '6px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  fontSize: '14px',
                                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                                  color: '#10b981'
                                }}
                              >
                                <FaPlus />
                              </button>
                            </div>
                            <div className="cart-item-total">
                              ₹{(item.mrp * item.quantity).toLocaleString()}
                            </div>
                            <button
                              onClick={() => removeFromCart(item.id)}
                              disabled={loading}
                              className="remove-button"
                              style={{
                                width: '32px',
                                height: '32px',
                                border: 'none',
                                background: '#fee2e2',
                                color: '#dc2626',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="cart-total-section">
                      <div className="cart-total-row">
                        <span className="cart-total-label">Total Amount:</span>
                        <span className="cart-total-amount">₹{getCartTotal().toLocaleString()}</span>
                      </div>
                      <button
                        className="clear-cart-button"
                        onClick={clearCart}
                        disabled={loading}
                      >
                        Clear Cart
                      </button>
                    </div>
                  </div>

                  <form className="customer-form" onSubmit={(e) => { e.preventDefault(); submitOrder(); }}>
                    <h3>Customer Information</h3>

                    {/* Customer Selection Dropdown */}
                    <div className="form-group full-width customer-selection">
                      <label>Select Customer</label>
                      <select
                        value={selectedCustomer}
                        onChange={handleCustomerSelection}
                        disabled={loading}
                        className="customer-select"
                      >
                        <option value="">Choose existing customer or add new</option>
                        <option value="new">➕ Add New Customer</option>
                        {customers.length > 0 && (
                          <optgroup label="Existing Customers">
                            {customers
                              .filter((c) => {
                                if (!user?.uid) return false;
                                const ownedField = c.createdBy === user.uid || c.ownerId === user.uid || c.placedBy === user.uid;
                                const ownedFromOrders = myCustomerPhones.has(c.phone);
                                return ownedField || ownedFromOrders;
                              })
                              .map((customer) => (
                                <option key={customer.phone} value={customer.phone}>
                                  👤 {customer.displayName}
                                </option>
                              ))}
                          </optgroup>
                        )}
                      </select>
                      <div className="customer-selection-hint">
                        {isNewCustomer ? (
                          <span className="hint-new">🆕 Fill details for new customer</span>
                        ) : (
                          <span className="hint-existing">✅ Customer details loaded automatically</span>
                        )}
                      </div>
                    </div>

                    {/* Customer Previous Orders - HIDDEN */}
                    {/* Order history display removed as per requirement */}

                    <div className="form-grid">
                      <div className="form-group full-width">
                        <label>Full Name *</label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleNameInput}
                          required
                          placeholder="Enter  full name"
                          disabled={loading}
                          className={validationErrors.name ? 'error' : ''}
                        />
                        {validationErrors.name && (
                          <span className="error-message">{validationErrors.name}</span>
                        )}
                      </div>

                      <div className="form-group">
                        <label>Email Address *</label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleFormChange}
                          required
                          placeholder="Enter  email"
                          disabled={loading}
                          className={validationErrors.email ? 'error' : ''}
                        />
                        {validationErrors.email && (
                          <span className="error-message">{validationErrors.email}</span>
                        )}
                      </div>

                      <div className="form-group">
                        <label>Phone Number *</label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handlePhoneInput}
                          required
                          placeholder="Enter 10-digit mobile number"
                          disabled={loading}
                          maxLength="10"
                          className={validationErrors.phone ? 'error' : ''}
                        />
                        {validationErrors.phone && (
                          <span className="error-message">{validationErrors.phone}</span>
                        )}
                      </div>

                      <div className="form-group full-width">
                        <label>Street Address *</label>
                        <textarea
                          name="address"
                          value={formData.address}
                          onChange={handleFormChange}
                          required
                          placeholder="Enter complete address"
                          rows="2"
                          disabled={loading}
                          className={validationErrors.address ? 'error' : ''}
                        />
                        {validationErrors.address && (
                          <span className="error-message">{validationErrors.address}</span>
                        )}
                      </div>

                      <div className="form-group full-width">
                        <label>Landmark (Optional)</label>
                        <input
                          type="text"
                          name="landmark"
                          value={formData.landmark}
                          onChange={handleFormChange}
                          placeholder="Enter nearby landmark"
                          disabled={loading}
                        />
                      </div>

                      <div className="form-group">
                        <label>State *</label>
                        <select
                          name="state"
                          value={formData.state}
                          onChange={handleStateChange}
                          required
                          disabled={loading}
                          className={validationErrors.state ? 'error' : ''}
                        >
                          <option value="">Select your state</option>
                          {Object.keys(statesAndDistricts).map(state => (
                            <option key={state} value={state}>{state}</option>
                          ))}
                        </select>
                        {validationErrors.state && (
                          <span className="error-message">{validationErrors.state}</span>
                        )}
                      </div>

                      <div className="form-group">
                        <label>District *</label>
                        <select
                          name="city"
                          value={formData.city}
                          onChange={handleFormChange}
                          required
                          disabled={loading || !formData.state}
                          className={validationErrors.city ? 'error' : ''}
                        >
                          <option value="">
                            {formData.state ? 'Select district' : 'First select a state'}
                          </option>
                          {availableDistricts.map(district => (
                            <option key={district} value={district}>{district}</option>
                          ))}
                        </select>
                        {validationErrors.city && (
                          <span className="error-message">{validationErrors.city}</span>
                        )}
                      </div>

                      <div className="form-group">
                        <label>Postal Code *</label>
                        <input
                          type="text"
                          name="postalCode"
                          value={formData.postalCode}
                          onChange={handlePostalCodeInput}
                          required
                          placeholder="Enter 6-digit postal code"
                          disabled={loading}
                          maxLength="6"
                          className={validationErrors.postalCode ? 'error' : ''}
                        />
                        {validationErrors.postalCode && (
                          <span className="error-message">{validationErrors.postalCode}</span>
                        )}
                      </div>

                      <div className="form-group">
                        <label>Birth Date *</label>
                        <input
                          type="date"
                          name="birthDate"
                          value={formData.birthDate}
                          onChange={handleFormChange}
                          required
                          disabled={loading}
                          className={validationErrors.birthDate ? 'error' : ''}
                        />
                        {validationErrors.birthDate && (
                          <span className="error-message">{validationErrors.birthDate}</span>
                        )}
                      </div>

                      <div className="form-group full-width">
                        <label>Payment Method</label>
                        <select
                          name="paymentMethod"
                          value={formData.paymentMethod}
                          onChange={handleFormChange}
                          disabled={loading}
                        >
                          {getCartTotal() <= walletBalance && walletBalance > 0 && (
                            <option value="Wallet">💰 Wallet (₹{walletBalance.toLocaleString()} available)</option>
                          )}
                          <option value="Online">💳 Online Payment (Razorpay)</option>
                          <option value="Cash">💵 Cash Payment</option>
                          <option value="Cheque">🧾 Cheque Payment</option>
                        </select>
                        {getCartTotal() > walletBalance && walletBalance > 0 && (
                          <div className="wallet-insufficient-notice">
                            <span className="notice-icon">ℹ️</span>
                            <span className="notice-text">
                              Wallet balance (₹{walletBalance.toLocaleString()}) is insufficient for this order (₹{getCartTotal().toLocaleString()})
                            </span>
                          </div>
                        )}
                        {walletBalance === 0 && (
                          <div className="wallet-empty-notice">
                            <span className="notice-icon">💡</span>
                            <span className="notice-text">
                              Add money to your wallet for faster checkout
                            </span>
                          </div>
                        )}
                      </div>

                      {formData.paymentMethod === 'Cheque' && (
                        <div className="form-group full-width cheque-upload-group">
                          <label>Upload Cheque Image *</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleChequeFileChange}
                            disabled={loading}
                          />
                          <small className="field-hint">Please upload a clear photo of the cheque for admin verification (JPG or PNG, max 5 MB).</small>
                          {chequeError && <span className="error-message">{chequeError}</span>}

                          {chequePreview && (
                            <div className="cheque-preview">
                              <img src={chequePreview} alt="Cheque preview" />
                              <button
                                type="button"
                                className="cheque-remove-button"
                                onClick={clearChequeData}
                                disabled={loading}
                              >
                                Remove
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="form-actions">
                      <button type="button" className="cancel-button" onClick={() => setShowCartModal(false)} disabled={loading}>
                        Continue Shopping
                      </button>
                      <button type="button" className="cancel-button" onClick={handleSaveFollowUp} disabled={loading || cart.length === 0}>
                        Save for Follow-up
                      </button>
                      <button type="submit" className="submit-button" disabled={loading || cart.length === 0}>
                        Place Order & Generate Invoice
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Interest Modal */}
      {/* {showInterestModal && (
        <div className="modal-overlay">
          <div className="modal-container interest-modal">
            <div className="modal-header">
              <h2>💡 Save Your Interest</h2>
              <button 
                className="close-button" 
                onClick={() => setShowInterestModal(false)} 
                disabled={loading}
              >
                <FaTimes />
              </button>
            </div>

            <div className="modal-content">
              <div className="interest-intro">
                <p>📋 Products you're interested in:</p>
                <div className="interest-products-grid">
                  {cart.map((item, index) => (
                    <div key={index} className="interest-product-card">
                      <div className="interest-product-image">
                        {item.images && item.images.length > 0 ? (
                          <img src={item.images[0]} alt={item.name} />
                        ) : (
                          <div className="no-image">📦</div>
                        )}
                      </div>
                      <div className="interest-product-info">
                        <h4 className="interest-product-name">{item.name}</h4>
                        <p className="interest-product-price">₹{item.price.toLocaleString()}</p>
                        <p className="interest-product-quantity">Quantity: {item.quantity}</p>
                        <p className="interest-product-total">Total: ₹{(item.price * item.quantity).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="interest-summary">
                  <p className="total-interest">💰 Total Interest Value: ₹{cart.reduce((total, item) => total + (item.price * item.quantity), 0).toLocaleString()}</p>
                  <p className="interest-note">We'll contact you with the best offers and availability updates!</p>
                </div>
              </div>

              <form onSubmit={handleInterestSubmit} className="interest-form">
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    value={interestFormData.name}
                    onChange={(e) => setInterestFormData({...interestFormData, name: e.target.value})}
                    placeholder="Enter your name"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label>Phone Number *</label>
                  <input
                    type="tel"
                    value={interestFormData.phone}
                    onChange={(e) => setInterestFormData({...interestFormData, phone: e.target.value})}
                    placeholder="Enter your phone number"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label>Email (Optional)</label>
                  <input
                    type="email"
                    value={interestFormData.email}
                    onChange={(e) => setInterestFormData({...interestFormData, email: e.target.value})}
                    placeholder="Enter your email"
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label>When should we follow up?</label>
                  <select
                    value={interestFormData.followUpDays}
                    onChange={(e) => setInterestFormData({...interestFormData, followUpDays: parseInt(e.target.value)})}
                    disabled={loading}
                  >
                    <option value={1}>Tomorrow (1 day)</option>
                    <option value={2}>In 2 days</option>
                    <option value={3}>In 3 days</option>
                    <option value={7}>Next week (7 days)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Additional Notes (Optional)</label>
                  <textarea
                    value={interestFormData.notes}
                    onChange={(e) => setInterestFormData({...interestFormData, notes: e.target.value})}
                    placeholder="Any specific requirements or questions?"
                    rows="3"
                    disabled={loading}
                  />
                </div>

                <div className="form-actions">
                  <button 
                    type="button" 
                    className="cancel-button" 
                    onClick={() => setShowInterestModal(false)} 
                    disabled={loading}
                  >
                    Skip
                  </button>
                  <button 
                    type="submit" 
                    className="submit-button interest-submit" 
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : '📞 Save My Interest'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )} */}

      <style jsx>{`
     @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

/* Base Container */
.all-products-container {
  font-family: 'Inter', sans-serif;
  padding: 16px;
  background: #f8fafc;
  min-height: 100vh;
  max-width: 100%;
  overflow-x: hidden;
}

/* Loading Bar Styles */
.loading-bar-container {
  width: 100%;
  padding: 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  text-align: center;
}

.loading-bar {
  width: 100%;
  max-width: 400px;
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
  margin: 0 auto 8px;
  position: relative;
}

.loading-bar::after {
  content: '';
  position: absolute;
  width: 30%;
  height: 100%;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  animation: loadingSlide 1.5s ease-in-out infinite;
}

@keyframes loadingSlide {
  0% {
    left: -30%;
  }
  50% {
    left: 100%;
  }
  100% {
    left: -30%;
  }
}

.loading-text {
  font-size: 0.9rem;
  color: #374151;
  font-weight: 500;
  margin: 0;
}
  /* Hide scrollbars for all elements */
* {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* Internet Explorer 10+ */
}

*::-webkit-scrollbar {
  display: none; /* Safari and Chrome */
}

/* Specifically for the cart items list */
.cart-items-list {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* Internet Explorer 10+ */
}

.cart-items-list::-webkit-scrollbar {
  display: none; /* Safari and Chrome */
}

/* Hide scrollbar for modal content */
.modal-content {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* Internet Explorer 10+ */
}

.modal-content::-webkit-scrollbar {
  display: none; /* Safari and Chrome */
}

/* Hide scrollbar for main container */
.all-products-container {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* Internet Explorer 10+ */
}

.all-products-container::-webkit-scrollbar {
  display: none; /* Safari and Chrome */
}

/* Hide scrollbar for body and html */
html, body {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* Internet Explorer 10+ */
}

html::-webkit-scrollbar, body::-webkit-scrollbar {
  display: none; /* Safari and Chrome */
}


/* Page Header */
.page-header {
  background: #002B5C;
  border-radius: 16px;
  color: #ffffff;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.header-content {
  flex: 1;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #ffffffff;
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 12px;
}



.page-subtitle {
  color: #d8d8d8ff;
  font-size: 1rem;
  margin: 0;
}

.product-stats {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.stat-item {
  background: #F36F21;
  padding: 16px;
  border-radius: 12px;
  color: white;
  text-align: center;
  min-width: 100px;
  flex: 1;
}

.stat-item.cart-stat {
  cursor: pointer;
  transition: transform 0.2s ease;
}

.stat-item.cart-stat:hover {
  transform: translateY(-2px);
}

.stat-number {
  font-size: 1.1rem;
  font-weight: 700;
  display: block;
}

.stat-label {
  font-size: 0.75rem;
  opacity: 0.9;
  color: white;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Search Section */
.search-section {
  margin-bottom: 24px;
}

.search-container {
  position: relative;
  max-width: 100%;
}

.search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: #64748b;
  font-size: 16px;
  z-index: 2;
}

.search-input {
  width: 100%;
  padding: 16px 16px 16px 48px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 16px;
  outline: none;
  background: white;
  box-sizing: border-box;
  transition: all 0.2s ease;
}

.search-input:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.clear-search {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}

.clear-search:hover {
  color: #1e293b;
  background: #f1f5f9;
}

/* Cart Summary Bar */
.cart-summary-bar {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 2px solid #10b981;
}

.cart-summary-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.cart-items-count {
  font-weight: 600;
  color: #374151;
}

.cart-total {
  font-size: 1.25rem;
  font-weight: 700;
  color: #10b981;
}

.view-cart-button {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.view-cart-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

.cart-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.follow-up-button {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.follow-up-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
  background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
}

/* Products Grid */
.products-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.no-products {
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 16px;
  color: #64748b;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.no-products-icon {
  font-size: 4rem;
  opacity: 0.5;
  display: block;
  margin-bottom: 16px;
}

.no-products p {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
}

/* Product Card */
.product-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
}

.product-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.product-image-container {
  position: relative;
  width: 100%;
  height: 200px;
  background: #f1f5f9;
}

.product-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-details {
  padding: 16px;
  flex: 1;
}

.product-name {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 4px 0;
  line-height: 1.3;
}

.product-category {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0 0 12px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.product-description {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0 0 12px 0;
}

.product-pricing {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.product-price {
  font-size: 1.25rem;
  font-weight: 700;
  color: #10b981;
}

.stock-info {
  font-size: 0.775rem;
  color: #64748b;
  font-weight: 500;
}

.product-actions {
  padding: 16px;
  border-top: 1px solid #f1f5f9;
}

.add-to-cart-button {
  width: 100%;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.add-to-cart-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

.add-to-cart-button:disabled {
  background: #94a3b8;
  cursor: not-allowed;
}

/* Notification Styles */
.notification-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  animation: slideInRight 0.3s ease-out;
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.notification-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  border: 1px solid #e2e8f0;
  overflow: hidden;
  min-width: 320px;
  max-width: 400px;
}

.notification-header {
  display: flex;
  align-items: flex-start;
  padding: 16px;
  gap: 12px;
}

.notification-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 18px;
  flex-shrink: 0;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-title {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 4px;
  line-height: 1.3;
}

.notification-message {
  font-size: 13px;
  color: #64748b;
  line-height: 1.4;
}

.notification-close {
  width: 24px;
  height: 24px;
  border: none;
  background: #f1f5f9;
  border-radius: 6px;
  color: #64748b;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.notification-close:hover {
  background: #e2e8f0;
  color: #1e293b;
}

/* Enhanced Quantity Controls */
.quantity-controls-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.quantity-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px 12px;
}

.quantity-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: white;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.quantity-btn.decrease {
  color: #dc2626;
}

.quantity-btn.increase {
  color: #10b981;
}

.quantity-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.quantity-btn.decrease:hover:not(:disabled) {
  background: #fef2f2;
  border-color: #fecaca;
}

.quantity-btn.increase:hover:not(:disabled) {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.quantity-btn:disabled {
  background: #f1f5f9;
  color: #94a3b8;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.quantity-display {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  min-width: 24px;
  text-align: center;
}

.quantity-info {
  text-align: center;
  font-size: 12px;
  color: #10b981;
  font-weight: 500;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  // padding: 16px;
  box-sizing: border-box;
}

.modal-container {
  background: white;
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}

.modal-header h2 {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.close-button {
  width: 32px;
  height: 32px;
  border: none;
  background: #f1f5f9;
  border-radius: 8px;
  color: #64748b;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-button:hover:not(:disabled) {
  background: #e2e8f0;
  color: #1e293b;
}

.close-button:disabled {
  background: #94a3b8;
  cursor: not-allowed;
}

.modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 10px 96px;
}

/* Empty Cart Styles */
.empty-cart {
  text-align: center;
  padding: 60px 20px;
  color: #64748b;
}

.empty-cart-icon {
  font-size: 4rem;
  opacity: 0.5;
  display: block;
  margin-bottom: 16px;
}

.empty-cart p {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 20px 0;
}

.continue-shopping {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.continue-shopping:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

/* Cart Items Section */
.cart-items-section {
  margin-bottom: 24px;
}

.cart-items-section h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 16px;
}

.cart-items-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  /* max-height: 300px; */ /* Removed to display all products */
  overflow-y: visible;
  padding-right: 8px;
}

.cart-item {
  display: flex;
  align-items: center;
  padding: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  gap: 16px;
}

.cart-item-image {
  width: 60px;
  height: 60px;
  flex-shrink: 0;
  border-radius: 8px;
  overflow: hidden;
  background: #f1f5f9;
}

.cart-item-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cart-item-details {
  flex: 1;
  min-width: 0;
}

.cart-item-details h4 {
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 4px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cart-item-price {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0;
}

.cart-item-controls {
  display: flex !important;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  visibility: visible !important;
  opacity: 1 !important;
}

.quantity-controls {
  display: flex !important;
  align-items: center;
  gap: 8px;
  visibility: visible !important;
  opacity: 1 !important;
}

.qty-button {
  width: 32px;
  height: 32px;
  border: 2px solid #e2e8f0;
  background: white;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.75rem;
}

.qty-button:hover:not(:disabled) {
  border-color: #6366f1;
  color: #6366f1;
}

.qty-button:disabled {
  background: #f1f5f9;
  cursor: not-allowed;
  opacity: 0.5;
}

.quantity-display {
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
  min-width: 24px;
  text-align: center;
}

.cart-item-total {
  font-size: 1rem;
  font-weight: 700;
  color: #10b981;
  min-width: 80px;
  text-align: right;
}

.remove-button {
  width: 32px;
  height: 32px;
  border: none;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.remove-button:hover:not(:disabled) {
  background: #fecaca;
}

.remove-button:disabled {
  background: #f1f5f9;
  color: #94a3b8;
  cursor: not-allowed;
}

/* Cart Total Section */
.cart-total-section {
  padding: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  margin-top: 16px;
}

.cart-total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.cart-total-label {
  font-size: 1.25rem;
  font-weight: 600;
  color: #374151;
}

.cart-total-amount {
  font-size: 1.5rem;
  font-weight: 700;
  color: #10b981;
}

.clear-cart-button {
  background: #fee2e2;
  color: #dc2626;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-cart-button:hover:not(:disabled) {
  background: #fecaca;
}

.clear-cart-button:disabled {
  background: #f1f5f9;
  color: #94a3b8;
  cursor: not-allowed;
}

/* Customer Form */
.customer-form h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 16px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 24px;
}

.customer-form .form-grid .form-group.full-width {
  grid-column: 1 / -1;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-group label {
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
}

.form-group input,
.form-group textarea,
.form-group select {
  padding: 10px 12px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 16px;
  font-family: inherit;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.form-group input:disabled,
.form-group textarea:disabled,
.form-group select:disabled {
  background: #f1f5f9;
  cursor: not-allowed;
  opacity: 0.7;
}

.form-group input.error,
.form-group textarea.error,
.form-group select.error {
  border-color: #dc2626;
}

.error-message {
  color: #dc2626;
  font-size: 0.75rem;
  font-weight: 500;
}

.form-group textarea {
  resize: vertical;
  min-height: 60px;
}

/* Customer Selection Styles */
.customer-selection {
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 20px;
}

.customer-select {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  cursor: pointer;
  transition: all 0.3s ease;
}

.customer-select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.customer-select optgroup {
  font-weight: 600;
  color: #4a5568;
  background: #f7fafc;
}

.customer-select option {
  padding: 8px;
  font-size: 14px;
}

.customer-selection-hint {
  margin-top: 8px;
  font-size: 13px;
  font-weight: 500;
}

.hint-new {
  color: #667eea;
  display: flex;
  align-items: center;
  gap: 6px;
}

.hint-existing {
  color: #10b981;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Customer Orders Section */
.customer-orders-section {
  background: #f0fdf4;
  border: 2px solid #bbf7d0;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
}

.customer-orders-section h4 {
  margin: 0 0 12px 0;
  color: #166534;
  font-size: 16px;
  font-weight: 700;
}

.orders-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.order-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #dcfce7;
  font-size: 13px;
}

.order-info {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}

.order-date,
.order-amount,
.order-items {
  font-weight: 500;
  color: #374151;
}

.order-status .status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.pending {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.paid {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.completed {
  background: #dbeafe;
  color: #1e40af;
}

.orders-summary {
  text-align: center;
  padding-top: 8px;
  border-top: 1px solid #dcfce7;
}

.summary-text {
  font-size: 13px;
  color: #166534;
  font-weight: 600;
  font-style: italic;
}

/* Interest Modal Styles */
.interest-modal {
  max-width: 700px;
  max-height: 90vh;
  overflow-y: auto;
}

.interest-intro {
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
}

.interest-intro p {
  margin: 0 0 16px 0;
  color: #0369a1;
  font-weight: 600;
  font-size: 16px;
}

.interest-products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.interest-product-card {
  background: white;
  border: 2px solid #e0f2fe;
  border-radius: 12px;
  padding: 16px;
  transition: all 0.3s ease;
}

.interest-product-card:hover {
  border-color: #0ea5e9;
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.15);
}

.interest-product-image {
  width: 100%;
  height: 120px;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 12px;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
}

.interest-product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.interest-product-image .no-image {
  font-size: 32px;
  color: #94a3b8;
}

.interest-product-info {
  text-align: center;
}

.interest-product-name {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  line-height: 1.3;
}

.interest-product-price {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 700;
  color: #059669;
}

.interest-product-quantity {
  margin: 0 0 4px 0;
  font-size: 14px;
  color: #64748b;
}

.interest-product-total {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #0369a1;
  padding: 8px;
  background: #f0f9ff;
  border-radius: 6px;
}

.interest-summary {
  text-align: center;
  padding: 16px;
  background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%);
  border-radius: 8px;
  border: 1px solid #bbf7d0;
}

.total-interest {
  margin: 0 0 8px 0;
  font-weight: 700;
  color: #059669;
  font-size: 20px;
}

.interest-note {
  margin: 0;
  font-size: 14px;
  color: #166534;
  font-style: italic;
}

.interest-form .form-group {
  margin-bottom: 16px;
}

.interest-form label {
  display: block;
  margin-bottom: 6px;
  color: #374151;
  font-weight: 500;
  font-size: 14px;
}

.interest-form input,
.interest-form select,
.interest-form textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.3s ease;
}

.interest-form input:focus,
.interest-form select:focus,
.interest-form textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.interest-submit {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.interest-submit:hover {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
}

/* Wallet Notice Styles */
.wallet-insufficient-notice,
.wallet-empty-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.875rem;
}

.wallet-insufficient-notice {
  background: #fef3c7;
  border: 1px solid #f59e0b;
  color: #92400e;
}

.wallet-empty-notice {
  background: #e0f2fe;
  border: 1px solid #0ea5e9;
  color: #0c4a6e;
}

.notice-icon {
  font-size: 1rem;
  flex-shrink: 0;
}

.notice-text {
  font-weight: 500;
  line-height: 1.4;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  border-top: 1px solid #e2e8f0;
  padding-top: 20px;
  flex-wrap: wrap;
}

.cancel-button,
.submit-button {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  flex: 1;
  min-width: 140px;
}

.cancel-button {
  background: #f1f5f9;
  color: #64748b;
}

.cancel-button:hover:not(:disabled) {
  background: #e2e8f0;
  color: #1e293b;
}

.submit-button {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
}

.submit-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

.cancel-button:disabled,
.submit-button:disabled {
  background: #94a3b8;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Tablet Styles (768px and up) */
@media (min-width: 768px) {
  .all-products-container {
    padding: 24px;
    max-width: 1200px;
    margin: 0 auto;
  }

  .page-header {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }

  .product-stats {
    flex-wrap: nowrap;
  }

  .image-previews {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .order-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .order-item {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .order-status {
    align-self: flex-end;
  }

  .cart-item-image {
    width: 80px;
    height: 80px;
  }

  .form-grid {
    grid-template-columns: 1fr 1fr;
  }

  .form-actions {
    justify-content: space-between;
  }

  .cancel-button,
  .submit-button {
    flex: none;
  }
}

/* Desktop Styles (1024px and up) */
@media (min-width: 1024px) {
  .all-products-container {
    padding: 32px;
  }

  .products-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
  }

  .product-card {
    height: 100%;
  }

  .modal-container {
    max-width: 900px;
  }

  .cart-items-list {
    /* max-height: 400px; */ /* Removed to display all items without scrolling */
  }

  .cart-item-details h4 {
    white-space: normal;
    overflow: visible;
    text-overflow: unset;
  }
}

/* Large Desktop (1440px and up) */
@media (min-width: 1440px) {
  .products-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

/* Custom scrollbar for cart items list */
.cart-items-list::-webkit-scrollbar {
  width: 6px;
}

.cart-items-list::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.cart-items-list::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.cart-items-list::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Animation for cart items */
.cart-item {
  animation: slideInCart 0.3s ease-out;
}

@keyframes slideInCart {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Mobile Responsive - Small screens (300px to 767px) */
@media (min-width: 300px) and (max-width: 767px) {
  .all-products-container {
    padding: 8px;
    min-width: 300px;
    max-width: 100vw;
    overflow-x: hidden;
  }

  .page-header {
    padding: 12px;
  }

  .page-title {
    font-size: 1.3rem;
  }

  .stat-item {
    padding: 10px;
    min-width: 70px;
  }

  .stat-number {
    font-size: 1.3rem;
  }

  /* Product grid - 2 columns for mobile */
  .products-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    width: 100%;
  }

  /* Product card adjustments for mobile */
  .product-card {
    min-width: 0;
    max-width: 100%;
  }

  .product-image-container {
    height: 170px;
  }

  .product-image {
    height: 100% ;
    object-fit: cover;
  }

  .product-info {
    padding: 10px;
  }

  .product-name {
    font-size: 0.85rem;
    line-height: 1.3;
    max-height: 2.6em;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .product-price {
    font-size: 1rem;
    margin: 6px 0;
  }

  .product-stock {
    font-size: 0.75rem;
    padding: 3px 6px;
  }

  .product-actions {
    padding: 10px;
    gap: 6px;
  }

  .add-to-cart-button {
    padding: 8px;
    font-size: 0.8rem;
    min-height: 36px;
  }

  .quantity-button {
    width: 28px;
    height: 28px;
    font-size: 0.9rem;
  }

  .quantity-display {
    width: 28px;
    font-size: 0.9rem;
  }
}

/* Very small screens (300px to 380px) */
@media (min-width: 300px) and (max-width: 380px) {
  .all-products-container {
    padding: 6px;
    min-width: 300px;
  }

  .page-header {
    padding: 10px;
  }

  .page-title {
    font-size: 1.2rem;
  }

  .products-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
  }
    .product-image-container
  .product-card {
    min-width: 0;
    max-width: 100%;
    border-radius: 12px;
  }

  .product-image-container {
    height: 153px;
    width: 100%;
    overflow: hidden;
  }

  .product-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .product-info {
    padding: 8px;
  }

  .product-name {
    font-size: 0.7rem;
    font-weight: 500;
    line-height: 1.2;
    max-height: 2.4em;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    word-break: break-word;
  }

  .product-category {
    font-size: 0.6rem;
    margin: 0 0 4px 0;
    letter-spacing: 0.3px;
  }

  .product-description {
    font-size: 0.6rem;
    margin: 0 0 4px 0;
  }

  .product-price {
    font-size: 0.85rem;
    margin: 4px 0;
    font-weight: 600;
  }

  .product-stock {
    font-size: 0.65rem;
    padding: 2px 4px;
    top: 6px;
    right: 6px;
  }

  .product-actions {
    padding: 6px;
    gap: 4px;
  }

  .add-to-cart-button {
    padding: 6px 4px;
    font-size: 0.65rem;
    min-height: 30px;
    gap: 3px;
  }

  .quantity-button {
    width: 24px;
    height: 24px;
    font-size: 0.8rem;
  }

  .quantity-display {
    width: 24px;
    font-size: 0.85rem;
  }

  .stat-item {
    padding: 8px;
    min-width: 60px;
  }

  .stat-number {
    font-size: 1.1rem;
  }

  .stat-label {
    font-size: 0.7rem;
  }

  .search-container input {
    font-size: 0.85rem;
    padding: 10px 12px 10px 36px;
  }
}

/* Extra small screens (300px to 480px) */
@media (max-width: 480px) {
  .all-products-container {
    padding: 8px;
  }

  .products-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .cart-summary-content {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .cart-actions {
    flex-direction: column;
    width: 100%;
    gap: 8px;
  }

  .follow-up-button,
  .view-cart-button {
    width: 100%;
    justify-content: center;
  }

  .interest-products-grid {
    grid-template-columns: 1fr;
  }

  .interest-modal {
    max-width: 95vw;
    margin: 10px;
  }

  .cart-item {
    flex-direction: row;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .cart-item-image {
    width: 50px;
    height: 50px;
  }

  .cart-item-details {
    flex: 1;
    min-width: 120px;
  }

  .cart-item-controls {
    justify-content: center;
    flex-wrap: nowrap;
    width: 100%;
    gap: 8px;
  }

  .quantity-controls {
    flex: 1;
  }

  .cart-item-total {
    min-width: 70px;
  }

  .form-actions {
    flex-direction: column;
  }

  .cancel-button,
  .submit-button {
    width: 100%;
  }

  .modal-container {
    margin: 8px;
    max-height: 95vh;
  }

  // .modal-content {
  //   padding: 10px 0 calc(110px + env(safe-area-inset-bottom, 0px));
  // }
  .form-actions {
    position: static;
    bottom: auto;
    background: transparent;
    padding-bottom: 0;
    margin-bottom: env(safe-area-inset-bottom, 0px);
    border-top: 1px solid #e2e8f0;
    z-index: auto;
  }
}

      `}</style>

    </div>
  );
};

export default AllProducts;