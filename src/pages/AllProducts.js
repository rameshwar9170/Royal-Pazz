import React, { useState, useEffect } from 'react';
import { ref, onValue, push, runTransaction, update, get, set } from 'firebase/database';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { db } from '../firebase/config';
import { FaBars, FaSearch, FaTimes, FaShoppingCart, FaPlus, FaMinus } from 'react-icons/fa';
import SelerSidebar from '../components/SelerSidebar';

const AllProducts = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

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
    paymentMethod: 'Cash',
    quantity: 1,
  };
  const [formData, setFormData] = useState(initialFormData);

  const user = JSON.parse(localStorage.getItem('htamsUser'));

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // Validation functions
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
        if (value) {
          const birthDate = new Date(value);
          const today = new Date();
          const age = today.getFullYear() - birthDate.getFullYear();
          if (age < 13 || age > 120) {
            error = 'Please enter a valid birth date (age between 13-120)';
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
    const requiredFields = ['name', 'email', 'phone', 'address', 'city', 'state', 'postalCode'];
    
    requiredFields.forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) {
        errors[field] = error;
      }
    });

    // Validate birth date if provided
    if (formData.birthDate) {
      const birthError = validateField('birthDate', formData.birthDate);
      if (birthError) {
        errors.birthDate = birthError;
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Fetch products from Firebase
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

  // Filter products based on search AND hide out-of-stock products
  useEffect(() => {
    const lowercasedQuery = searchQuery.toLowerCase();
    const filtered = products.filter(prod => {
      // First filter out products with no stock
      const hasStock = prod.stock > 0;
      
      // Then apply search filter
      const nameMatch = prod.name.toLowerCase().includes(lowercasedQuery);
      const priceMatch = prod.price.toString().includes(lowercasedQuery);
      const serialNoMatch = prod.serialNo.toString().includes(lowercasedQuery);
      const searchMatch = nameMatch || priceMatch || serialNoMatch;
      
      // Return only products that have stock AND match search criteria
      return hasStock && searchMatch;
    });
    setFilteredProducts(filtered);
  }, [searchQuery, products]);

  const handleOrderClick = (product) => {
    setSelectedProduct(product);
    setShowOrderForm(true);
    setFormData(prev => ({ ...prev, quantity: 1 }));
    setValidationErrors({}); // Clear previous validation errors
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    
    // Update form data
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Validate field and update errors
    const error = validateField(name, value);
    setValidationErrors(prev => ({
      ...prev,
      [name]: error
    }));
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

  const incrementQuantity = () => {
    if (formData.quantity < selectedProduct.stock) {
      setFormData(prev => ({ ...prev, quantity: prev.quantity + 1 }));
    } else {
      alert(`Cannot order more than available stock (${selectedProduct.stock})`);
    }
  };

  const decrementQuantity = () => {
    if (formData.quantity > 1) {
      setFormData(prev => ({ ...prev, quantity: prev.quantity - 1 }));
    }
  };

  const submitOrder = async () => {
    // Validate all fields first
    if (!validateAllFields()) {
      alert('Please fix all validation errors before submitting');
      return;
    }

    setLoading(true);
    console.log('=== STARTING ORDER SUBMISSION ===');

    if (!selectedProduct) {
      setLoading(false);
      return;
    }

    if (!user?.uid) {
      console.error('=== USER VALIDATION ERROR ===');
      alert('User not logged in properly. Please refresh and try again.');
      setLoading(false);
      return;
    }

    console.log('=== USER VALIDATION SUCCESS ===');
    const productStockRef = ref(db, `HTAMS/company/products/${selectedProduct.id}/stock`);

    try {
      console.log('=== UPDATING PRODUCT STOCK ===');
      const transactionResult = await runTransaction(productStockRef, (currentStock) => {
        const stockNum = Number(currentStock) || 0;
        console.log('Current stock:', stockNum, 'Required quantity:', formData.quantity);
        if (stockNum < formData.quantity) {
          return;
        }
        return stockNum - formData.quantity;
      });

      if (!transactionResult.committed) {
        console.error('=== STOCK UPDATE FAILED ===');
        alert('Failed to place order: Insufficient stock.');
        setLoading(false);
        return;
      }

      console.log('=== STOCK UPDATE SUCCESS ===');

      const orderData = {
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        quantity: formData.quantity,
        totalAmount: selectedProduct.price * formData.quantity,
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

      console.log('=== ORDER DATA CREATED ===');
      const newOrderRef = await push(ref(db, 'HTAMS/orders'), orderData);
      const orderId = newOrderRef.key;

      console.log('=== ORDER SAVED TO FIREBASE ===');

      // Handle customer data
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
            myOrders: {...existingOrders, [orderId]: true }
        });
        console.log('=== EXISTING CUSTOMER UPDATED ===');
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
            console.log('=== NEW CUSTOMER CREATED ===');
        }
      }

      // Process commission
      let commissionResult = { ok: false, error: 'Not processed' };

      console.log('=== STARTING COMMISSION PROCESSING ===');

      try {
        commissionResult = await processCommission(orderData, orderId);
        console.log('=== COMMISSION PROCESSING SUCCESS ===');

        if (commissionResult.ok) {
          alert(`Order placed successfully! Commission distributed to ${commissionResult.paidTo?.length || 0} users. Invoice is downloading.`);
        } else {
          alert('Order placed successfully, but commission processing returned an error. Invoice is downloading.');
        }
      } catch (commissionError) {
        console.error('=== COMMISSION PROCESSING EXCEPTION ===', commissionError);
        alert('Order placed successfully, but commission processing failed. Invoice is downloading.');
      }

      console.log('=== SAVING SALE DETAILS ===');
      try {
        await saveSaleDetails(orderData, orderId, commissionResult);
        console.log('=== SALE DETAILS SAVED SUCCESSFULLY ===');
      } catch (saveError) {
        console.error('=== FAILED TO SAVE SALE DETAILS ===', saveError);
      }

      console.log('=== GENERATING PDF ===');
      generatePdfBill({
        ...orderData,
        price: selectedProduct.price,
        saleDate: new Date().toLocaleString()
      });

      console.log('=== ORDER PROCESS COMPLETED ===');
      resetForm();

    } catch (err) {
      console.error('=== ORDER PROCESSING ERROR ===', err);
      alert('Failed to place order. An error occurred. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setShowOrderForm(false);
    setSelectedProduct(null);
    setFormData(initialFormData);
    setValidationErrors({});
  };

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
            role: recipient.role
          };
        });

        const sellerInfo = commissionResult.paidTo.find(p => p.uid === (user?.uid || 'unknown'));
        const roleAtSale = sellerInfo?.role || user?.currentLevel || null;

        saleData = {
          sellerId: user?.uid || 'unknown',
          amount: orderData.totalAmount,
          product: {
            id: orderData.productId,
            name: orderData.productName
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
          commissionDistributed: true
        };
      } else {
        saleData = {
          sellerId: user?.uid || 'unknown',
          amount: orderData.totalAmount,
          product: {
            id: orderData.productId,
            name: orderData.productName
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
          commissionError: commissionResult?.error || 'Commission processing failed'
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
          name: orderData.productName
        },
        orderId: orderId,
        idempotencyKey: `order_${orderId}_${Date.now()}`
      };

      console.log('=== API PAYLOAD ===', apiPayload);

      const response = await fetch('https://processsale-udqmpp6qhq-uc.a.run.app/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(apiPayload)
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

 const generatePdfBill = (billData) => {
  try {
    const doc = new jsPDF();
    const totalAmount = billData.price * billData.quantity;
    const address = billData.customerAddress;
    const fullAddress = `${address.street}${address.landmark ? `, ${address.landmark}` : ''}, ${address.city}, ${address.state} - ${address.postalCode}`;

    // Set page margins
    const leftMargin = 15;
    const rightMargin = 195;
    const pageWidth = 210;

    // Header with gradient-like effect using rectangles
    doc.setFillColor(70, 130, 180); // Steel blue
    doc.rect(0, 0, 70, 15, 'F');
    doc.setFillColor(135, 206, 235); // Sky blue  
    doc.rect(70, 0, 70, 15, 'F');
    doc.setFillColor(100, 149, 237); // Cornflower blue
    doc.rect(140, 0, 70, 15, 'F');

    // Company Name
    doc.setTextColor(70, 130, 180);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text("Panchagiri Store", leftMargin, 35);

    // Company Message
    doc.setFontSize(14);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(80, 80, 80);
    doc.text("Your Trusted Shopping Partner", leftMargin, 45);

    // INVOICE title (right aligned)
    doc.setTextColor(70, 130, 180);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text("INVOICE", rightMargin, 35, { align: 'right' });

    // Invoice details (right aligned)
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    
    // Generate invoice number
    const invoiceNo = `INV-${Date.now().toString().slice(-8)}`;
    const invoiceDate = new Date().toLocaleDateString('en-IN');
    
    doc.text("Invoice No.", rightMargin - 50, 50);
    doc.text(invoiceNo, rightMargin, 50, { align: 'right' });
    doc.text("Invoice Date:", rightMargin - 50, 58);
    doc.text(invoiceDate, rightMargin, 58, { align: 'right' });

    // Customer Name with underline
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text("Name", leftMargin, 75);
    
    // Draw line for name
    doc.setDrawColor(150, 150, 150);
    doc.line(leftMargin + 25, 75, rightMargin, 75);
    doc.setFont('helvetica', 'normal');
    doc.text(billData.customerName, leftMargin + 30, 73);

    // Customer Address with underline
    doc.setFont('helvetica', 'bold');
    doc.text("Address", leftMargin, 90);
    
    // Draw line for address
    doc.line(leftMargin + 30, 90, rightMargin, 90);
    doc.setFont('helvetica', 'normal');
    doc.text(fullAddress, leftMargin + 35, 88, { maxWidth: 140 });

    // Items table
    const tableStartY = 110;
    
    // Table headers
    doc.setFillColor(240, 240, 240);
    doc.rect(leftMargin, tableStartY, pageWidth - 30, 12, 'F');
    
    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    
    // Column headers
    doc.text("S.No.", leftMargin + 5, tableStartY + 8);
    doc.text("Description", leftMargin + 30, tableStartY + 8);
    doc.text("Qty.", rightMargin - 80, tableStartY + 8);
    doc.text("Rate", rightMargin - 55, tableStartY + 8);
    doc.text("Amount", rightMargin - 20, tableStartY + 8, { align: 'right' });

    // Draw table borders
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.5);
    
    // Horizontal lines
    doc.line(leftMargin, tableStartY, rightMargin, tableStartY);
    doc.line(leftMargin, tableStartY + 12, rightMargin, tableStartY + 12);
    
    // Vertical lines
    doc.line(leftMargin, tableStartY, leftMargin, tableStartY + 60);
    doc.line(leftMargin + 25, tableStartY, leftMargin + 25, tableStartY + 60);
    doc.line(rightMargin - 85, tableStartY, rightMargin - 85, tableStartY + 60);
    doc.line(rightMargin - 60, tableStartY, rightMargin - 60, tableStartY + 60);
    doc.line(rightMargin - 35, tableStartY, rightMargin - 35, tableStartY + 60);
    doc.line(rightMargin, tableStartY, rightMargin, tableStartY + 60);

    // Table content
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(10);
    
    const itemY = tableStartY + 25;
    doc.text("1", leftMargin + 10, itemY);
    doc.text(billData.productName, leftMargin + 30, itemY, { maxWidth: 90 });
    doc.text(billData.quantity.toString(), rightMargin - 75, itemY);
    doc.text(`₹${billData.price.toLocaleString()}`, rightMargin - 55, itemY);
    doc.text(`₹${totalAmount.toLocaleString()}`, rightMargin - 5, itemY, { align: 'right' });

    // Bottom line of table content area
    doc.line(leftMargin, tableStartY + 48, rightMargin, tableStartY + 48);

    // Total section
    doc.setFillColor(240, 240, 240);
    doc.rect(rightMargin - 85, tableStartY + 48, 85, 12, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text("Total", rightMargin - 40, tableStartY + 56);
    doc.text(`₹${totalAmount.toLocaleString()}`, rightMargin - 5, tableStartY + 56, { align: 'right' });

    // Close table
    doc.line(leftMargin, tableStartY + 60, rightMargin, tableStartY + 60);

    // Rupees in words
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text("Rupees in words:", leftMargin, tableStartY + 75);
    doc.setFont('helvetica', 'normal');
    const amountInWords = convertAmountToWords(totalAmount);
    doc.text(amountInWords, leftMargin, tableStartY + 85, { maxWidth: 160 });

    // Terms & Conditions
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text("Terms & Conditions", leftMargin, tableStartY + 100);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text("1. All sales are final unless defective.", leftMargin, tableStartY + 108);
    doc.text("2. Please retain this invoice for warranty claims.", leftMargin, tableStartY + 115);
    doc.text("3. Payment terms: Cash on delivery.", leftMargin, tableStartY + 122);

    // Signature section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text("Signature", rightMargin - 20, tableStartY + 120, { align: 'right' });

    // Footer with gradient-like effect
    const footerY = 280;
    doc.setFillColor(70, 130, 180);
    doc.rect(0, footerY, 70, 10, 'F');
    doc.setFillColor(135, 206, 235);
    doc.rect(70, footerY, 70, 10, 'F');
    doc.setFillColor(100, 149, 237);
    doc.rect(140, footerY, 70, 10, 'F');

    // Additional customer info in a subtle way
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.text(`Customer Phone: ${billData.customerPhone}`, leftMargin, footerY - 5);
    doc.text(`Customer Email: ${billData.customerEmail}`, leftMargin, footerY - 10);
    doc.text(`Payment Method: ${billData.paymentMethod}`, rightMargin, footerY - 5, { align: 'right' });

    // Save the PDF
    doc.save(`Invoice_${invoiceNo}_${billData.customerName.replace(/\s+/g, '_')}.pdf`);
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('Could not generate PDF invoice.');
  }
};

// Helper function to convert amount to words
const convertAmountToWords = (amount) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const thousands = ['', 'Thousand', 'Lakh', 'Crore'];

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
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <h1 className="page-title">
            <span className="title-icon">🛍️</span>
            All Products
          </h1>
          <p className="page-subtitle">Browse and purchase our available products</p>
        </div>

        <div className="product-stats">
          <div className="stat-item">
            <span className="stat-number">{filteredProducts.length}</span>
            <span className="stat-label" style={{ color: 'white' }}>Available Products</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{products.filter(p => p.stock > 0).length}</span>
            <span className="stat-label" style={{ color: 'white' }}>Total In Stock</span>
          </div>
        </div>
      </div>

      {/* Search Section */}
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

      {/* Products Grid */}
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
            <div key={prod.id} className="product-card">
              <div className="product-image-container">
                <img src={prod.imageUrl} alt={prod.name} className="product-image" />
              </div>

              <div className="product-details">
                <h3 className="product-name">{prod.name}</h3>
                <p className="product-category">{prod.category}</p>
                <p className="product-description">{prod.sr}</p>
                <div className="product-pricing">
                  <span className="product-price">₹{prod.price?.toLocaleString()}</span>
                  <span className="stock-info">
                    Stock: {prod.stock}
                  </span>
                </div>
              </div>

              <div className="product-actions">
                <button
                  className="buy-button"
                  onClick={() => handleOrderClick(prod)}
                  disabled={loading}
                >
                  <FaShoppingCart />
                  Buy Now
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Order Form Modal */}
      {showOrderForm && selectedProduct && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2>Complete Your Order</h2>
              <button className="close-button" onClick={resetForm} disabled={loading}>
                <FaTimes />
              </button>
            </div>

            <div className="modal-content">
              {/* Loading Bar */}
              {loading && (
                <div className="loading-bar-container">
                  <div className="loading-bar"></div>
                  <p className="loading-text">Processing your order...</p>
                </div>
              )}

              {/* Product Summary */}
              <div className="product-summary">
                <h3>Product Details</h3>
                <div className="summary-card">
                  <div className="summary-info">
                    <h4>{selectedProduct.name}</h4>
                    <p className="unit-price">₹{selectedProduct.price?.toLocaleString()} per item</p>
                  </div>

                  <div className="quantity-section">
                    <label>Quantity</label>
                    <div className="quantity-controls">
                      <button
                        type="button"
                        onClick={decrementQuantity}
                        disabled={formData.quantity <= 1 || loading}
                        className="qty-button"
                      >
                        <FaMinus />
                      </button>
                      <span className="quantity-display">{formData.quantity}</span>
                      <button
                        type="button"
                        onClick={incrementQuantity}
                        disabled={formData.quantity >= selectedProduct.stock || loading}
                        className="qty-button"
                      >
                        <FaPlus />
                      </button>
                    </div>
                    <div className="total-price">
                      Total: ₹{(selectedProduct.price * formData.quantity).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Form */}
              <form className="customer-form" onSubmit={(e) => {e.preventDefault(); submitOrder();}}>
                <h3>Customer Information</h3>

                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>Full Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleNameInput}
                      required
                      placeholder="Enter your full name"
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
                      placeholder="Enter your email"
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
                      placeholder="Enter your 10-digit mobile number"
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
                      placeholder="Enter your complete address"
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
                    <label>City *</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleNameInput}
                      required
                      placeholder="Enter your city"
                      disabled={loading}
                      className={validationErrors.city ? 'error' : ''}
                    />
                    {validationErrors.city && (
                      <span className="error-message">{validationErrors.city}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label>State *</label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleNameInput}
                      required
                      placeholder="Enter your state"
                      disabled={loading}
                      className={validationErrors.state ? 'error' : ''}
                    />
                    {validationErrors.state && (
                      <span className="error-message">{validationErrors.state}</span>
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
                    <label>Birth Date</label>
                    <input
                      type="date"
                      name="birthDate"
                      value={formData.birthDate}
                      onChange={handleFormChange}
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
                      <option value="Cash">Cash on Delivery</option>
                      <option value="Online">Online Payment</option>
                      <option value="Card">Credit/Debit Card</option>
                    </select>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" className="cancel-button" onClick={resetForm} disabled={loading}>
                    Cancel
                  </button>
                  <button type="submit" className="submit-button" disabled={loading}>
                    Confirm Order & Generate Invoice
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
 


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

        /* Page Header */
        .page-header {
          background: white;
          border-radius: 16px;
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
          color: #1e293b;
          margin: 0 0 8px 0;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .title-icon {
          font-size: 1.5rem;
        }

        .page-subtitle {
          color: #64748b;
          font-size: 1rem;
          margin: 0;
        }

        .product-stats {
          display: flex;
          gap: 12px;
        }

        .stat-item {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          padding: 16px;
          border-radius: 12px;
          color: white;
          text-align: center;
          min-width: 100px;
        }

        .stat-number {
          font-size: 1.75rem;
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

        /* Products Grid */
        .products-grid {
          display: grid;
          grid-template-columns: 1fr 1fr ;
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

        .serial-badge {
          position: absolute;
          top: 8px;
          left: 8px;
          background: rgba(99, 102, 241, 0.9);
          color: white;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .out-of-stock-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(239, 68, 68, 0.9);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 1.1rem;
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
          font-size: 0.875rem;
          color: #64748b;
          font-weight: 500;
        }

        .stock-info.out-of-stock {
          color: #ef4444;
          font-weight: 700;
        }

        .product-actions {
          padding: 16px;
          border-top: 1px solid #f1f5f9;
        }

        .buy-button {
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

        .buy-button:hover:not(.disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
        }

        .buy-button.disabled {
          background: #94a3b8;
          cursor: not-allowed;
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
          padding: 16px;
          box-sizing: border-box;
        }

        .modal-container {
          background: white;
          width: 100%;
          max-width: 600px;
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
          padding: 20px;
        }

        /* Product Summary */
        .product-summary {
          margin-bottom: 24px;
        }

        .product-summary h3 {
          font-size: 1.1rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 12px;
        }

        .summary-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
        }

        .summary-info h4 {
          font-size: 1.1rem;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 4px 0;
        }

        .unit-price {
          color: #64748b;
          font-size: 0.875rem;
          margin: 0 0 16px 0;
        }

        .quantity-section label {
          display: block;
          font-weight: 600;
          color: #374151;
          margin-bottom: 8px;
        }

        .quantity-controls {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 12px;
        }

        .qty-button {
          width: 40px;
          height: 40px;
          border: 2px solid #e2e8f0;
          background: white;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
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
          font-size: 1.25rem;
          font-weight: 700;
          color: #1e293b;
          min-width: 40px;
          text-align: center;
        }

        .total-price {
          font-size: 1.25rem;
          font-weight: 700;
          color: #10b981;
          text-align: right;
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
          grid-template-columns: 1fr;
          gap: 16px;
          margin-bottom: 24px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
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
          padding: 12px 16px;
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

        .form-group textarea {
          resize: vertical;
          min-height: 60px;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          border-top: 1px solid #e2e8f0;
          padding-top: 20px;
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
        }

        .cancel-button {
          background: #f1f5f9;
          color: #64748b;
        }

        .cancel-button:hover:not(:disabled) {
          background: #e2e8f0;
          color: #1e293b;
        }
 .trainer-main
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

          .products-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
          }

          .form-grid {
            grid-template-columns: 1fr 1fr;
          }

          .form-actions {
            justify-content: space-between;
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
            max-width: 800px;
          }
        }

        /* Large Desktop (1440px and up) */
        @media (min-width: 1440px) {
          .products-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
      `}</style>
    </div>
  );
};

export default AllProducts;