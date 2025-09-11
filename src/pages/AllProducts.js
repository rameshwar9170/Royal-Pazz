import React, { useState, useEffect } from 'react';
import { ref, onValue, push, runTransaction, update, get, set } from 'firebase/database';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { db } from '../firebase/config';
import { FaBars, FaSearch, FaTimes, FaShoppingCart, FaPlus, FaMinus, FaTrash } from 'react-icons/fa';
import SelerSidebar from '../components/SelerSidebar';

const AllProducts = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]); // New cart state
  const [showCartModal, setShowCartModal] = useState(false); // New cart modal state
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
  };
  const [formData, setFormData] = useState(initialFormData);

  const user = JSON.parse(localStorage.getItem('htamsUser'));

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // Validation functions (same as original)
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

  // Fetch products from Firebase (same as original)
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

  // Filter products based on search AND hide out-of-stock products (same as original)
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

  // New cart functions
  const addToCart = (product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        if (existingItem.quantity < product.stock) {
          return prevCart.map(item =>
            item.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        } else {
          alert(`Cannot add more than available stock (${product.stock})`);
          return prevCart;
        }
      } else {
        return [...prevCart, { ...product, quantity: 1 }];
      }
    });
  };

  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  const updateCartQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(prevCart =>
      prevCart.map(item => {
        if (item.id === productId) {
          const maxQuantity = products.find(p => p.id === productId)?.stock || 0;
          if (newQuantity > maxQuantity) {
            alert(`Cannot order more than available stock (${maxQuantity})`);
            return item;
          }
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    );
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getCartItemCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  };

  const clearCart = () => {
    setCart([]);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({ ...prev, [name]: value }));
    
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

  // Modified submit order function for multiple products
  const submitOrder = async () => {
    if (cart.length === 0) {
      alert('Please add items to cart before placing order');
      return;
    }

    if (!validateAllFields()) {
      alert('Please fix all validation errors before submitting');
      return;
    }

    setLoading(true);
    console.log('=== STARTING MULTI-PRODUCT ORDER SUBMISSION ===');

    if (!user?.uid) {
      console.error('=== USER VALIDATION ERROR ===');
      alert('User not logged in properly. Please refresh and try again.');
      setLoading(false);
      return;
    }

    try {
      // Check stock availability for all items
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

      // Update stock for all items
      console.log('=== UPDATING STOCK FOR ALL PRODUCTS ===');
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
          unitPrice: item.price,
          totalPrice: item.price * item.quantity
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

      console.log('=== MULTI-PRODUCT ORDER DATA CREATED ===');
      const newOrderRef = await push(ref(db, 'HTAMS/orders'), orderData);
      const orderId = newOrderRef.key;

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
          myOrders: { ...existingOrders, [orderId]: true }
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

      // Process commission for multiple products
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
          
          // Save individual sale details for each product
          await saveSaleDetails(itemOrderData, `${orderId}_${item.id}`, commissionResult);
        } catch (error) {
          console.error(`Commission processing failed for ${item.name}:`, error);
          commissionResults.push({ productId: item.id, result: { ok: false, error: error.message } });
        }
      }

      console.log('=== GENERATING MULTI-PRODUCT PDF ===');
      generateMultiProductPdfBill({
        ...orderData,
        items: cart,
        saleDate: new Date().toLocaleString()
      });

      const successfulCommissions = commissionResults.filter(r => r.result.ok).length;
      alert(`Order placed successfully! Commission distributed for ${successfulCommissions} out of ${cart.length} products. Invoice is downloading.`);

      console.log('=== MULTI-PRODUCT ORDER PROCESS COMPLETED ===');
      resetForm();

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
    clearCart();
  };

  // Updated saveSaleDetails function (same logic as original)
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

  // Updated processCommission function (same as original)
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

  // New multi-product PDF generation function
  const generateMultiProductPdfBill = (billData) => {
    try {
      const doc = new jsPDF();
      const totalAmount = billData.totalAmount;
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
      doc.text(" ONDO", leftMargin, 35);

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
      doc.line(leftMargin, tableStartY, leftMargin, tableStartY + 12 + (billData.items.length * 15) + 12);
      doc.line(leftMargin + 25, tableStartY, leftMargin + 25, tableStartY + 12 + (billData.items.length * 15) + 12);
      doc.line(rightMargin - 85, tableStartY, rightMargin - 85, tableStartY + 12 + (billData.items.length * 15) + 12);
      doc.line(rightMargin - 60, tableStartY, rightMargin - 60, tableStartY + 12 + (billData.items.length * 15) + 12);
      doc.line(rightMargin - 35, tableStartY, rightMargin - 35, tableStartY + 12 + (billData.items.length * 15) + 12);
      doc.line(rightMargin, tableStartY, rightMargin, tableStartY + 12 + (billData.items.length * 15) + 12);

      // Table content - Multiple items
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 40, 40);
      doc.setFontSize(10);
      
      billData.items.forEach((item, index) => {
        const itemY = tableStartY + 25 + (index * 15);
        doc.text((index + 1).toString(), leftMargin + 10, itemY);
        doc.text(item.name, leftMargin + 30, itemY, { maxWidth: 90 });
        doc.text(item.quantity.toString(), rightMargin - 75, itemY);
        doc.text(`₹${item.price.toLocaleString()}`, rightMargin - 55, itemY);
        doc.text(`₹${(item.price * item.quantity).toLocaleString()}`, rightMargin - 5, itemY, { align: 'right' });
        
        // Draw horizontal line after each item
        if (index < billData.items.length - 1) {
          doc.line(leftMargin, itemY + 7, rightMargin, itemY + 7);
        }
      });

      // Bottom line of table content area
      const tableEndY = tableStartY + 12 + (billData.items.length * 15);
      doc.line(leftMargin, tableEndY, rightMargin, tableEndY);

      // Total section
      doc.setFillColor(240, 240, 240);
      doc.rect(rightMargin - 85, tableEndY, 85, 12, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(40, 40, 40);
      doc.text("Total", rightMargin - 40, tableEndY + 8);
      doc.text(`₹${totalAmount.toLocaleString()}`, rightMargin - 5, tableEndY + 8, { align: 'right' });

      // Close table
      doc.line(leftMargin, tableEndY + 12, rightMargin, tableEndY + 12);

      // Rupees in words
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text("Rupees in words:", leftMargin, tableEndY + 27);
      doc.setFont('helvetica', 'normal');
      const amountInWords = convertAmountToWords(totalAmount);
      doc.text(amountInWords, leftMargin, tableEndY + 37, { maxWidth: 160 });

      // Terms & Conditions
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text("Terms & Conditions", leftMargin, tableEndY + 52);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text("1. All sales are final unless defective.", leftMargin, tableEndY + 60);
      doc.text("2. Please retain this invoice for warranty claims.", leftMargin, tableEndY + 67);
      doc.text("3. Payment terms: Cash on delivery.", leftMargin, tableEndY + 74);

      // Signature section
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text("Signature", rightMargin - 20, tableEndY + 72, { align: 'right' });

      // Footer with gradient-like effect
      const footerY = 280;
      doc.setFillColor(70, 130, 180);
      doc.rect(0, footerY, 70, 10, 'F');
      doc.setFillColor(135, 206, 235);
      doc.rect(70, footerY, 70, 10, 'F');
      doc.setFillColor(100, 149, 237);
      doc.rect(140, footerY, 70, 10, 'F');

      // Additional customer info
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.text(`Customer Phone: ${billData.customerPhone}`, leftMargin, footerY - 5);
      doc.text(`Customer Email: ${billData.customerEmail}`, leftMargin, footerY - 10);
      doc.text(`Payment Method: ${billData.paymentMethod}`, rightMargin, footerY - 5, { align: 'right' });
      doc.text(`Total Items: ${billData.totalItems}`, rightMargin, footerY - 10, { align: 'right' });

      // Save the PDF
      doc.save(`Multi_Product_Invoice_${invoiceNo}_${billData.customerName.replace(/\s+/g, '_')}.pdf`);
      
    } catch (error) {
      console.error('Error generating multi-product PDF:', error);
      alert('Could not generate PDF invoice.');
    }
  };

  // Helper function to convert amount to words (same as original)
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
          {/* <div className="stat-item">
            <span className="stat-number">{filteredProducts.length}</span>
            <span className="stat-label" style={{ color: 'white' }}>Available Products</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{products.filter(p => p.stock > 0).length}</span>
            <span className="stat-label" style={{ color: 'white' }}>Total In Stock</span>
          </div> */}
          {/* New cart stat */}
          <div className="stat-item cart-stat" onClick={() => setShowCartModal(true)}>
            <span className="stat-number">{getCartItemCount()}</span>
            <span className="stat-label" style={{ color: 'white' }}>Items in Cart</span>
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

      {/* Cart Summary Bar - Show only when cart has items */}
      {cart.length > 0 && (
        <div className="cart-summary-bar">
          <div className="cart-summary-content">
            <span className="cart-items-count">
              {getCartItemCount()} items in cart
            </span>
            <span className="cart-total">
              Total: ₹{getCartTotal().toLocaleString()}
            </span>
            <button 
              className="view-cart-button"
              onClick={() => setShowCartModal(true)}
            >
              <FaShoppingCart />
              View Cart & Checkout
            </button>
          </div>
        </div>
      )}

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
                  className="add-to-cart-button"
                  onClick={() => addToCart(prod)}
                  disabled={loading}
                >
                  <FaPlus />
                  Add to Cart
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Cart Modal */}
      {showCartModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2>Shopping Cart ({getCartItemCount()} items)</h2>
              <button className="close-button" onClick={() => setShowCartModal(false)} disabled={loading}>
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
                  {/* Cart Items */}
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
                            <p className="cart-item-price">₹{item.price.toLocaleString()} each</p>
                          </div>
                          <div className="cart-item-controls">
                            <div className="quantity-controls">
                              <button
                                onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                                disabled={loading}
                                className="qty-button"
                              >
                                <FaMinus />
                              </button>
                              <span className="quantity-display">{item.quantity}</span>
                              <button
                                onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                                disabled={loading}
                                className="qty-button"
                              >
                                <FaPlus />
                              </button>
                            </div>
                            <div className="cart-item-total">
                              ₹{(item.price * item.quantity).toLocaleString()}
                            </div>
                            <button
                              onClick={() => removeFromCart(item.id)}
                              disabled={loading}
                              className="remove-button"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Cart Total */}
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
                      <button type="button" className="cancel-button" onClick={() => setShowCartModal(false)} disabled={loading}>
                        Continue Shopping
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
  flex-wrap: wrap;
}

.stat-item {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
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
  font-size: 0.875rem;
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
  padding: 20px;
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
  max-height: 300px;
  overflow-y: auto;
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
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.quantity-controls {
  display: flex;
  align-items: center;
  gap: 8px;
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

  .products-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }

  .cart-summary-content {
    flex-wrap: nowrap;
  }

  .cart-item {
    gap: 20px;
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
    max-height: 400px;
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

/* Responsive adjustments for small screens */
@media (max-width: 480px) {
  .all-products-container {
    padding: 12px;
  }

  .page-header {
    padding: 16px;
  }

  .page-title {
    font-size: 1.5rem;
  }

  .stat-item {
    padding: 12px;
    min-width: 80px;
  }

  .stat-number {
    font-size: 1.5rem;
  }

  .products-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .cart-summary-content {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .view-cart-button {
    width: 100%;
    justify-content: center;
  }

  .cart-item {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .cart-item-details {
    text-align: center;
  }

  .cart-item-controls {
    justify-content: center;
    flex-wrap: wrap;
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

  .modal-content {
    padding: 16px;
  }
}

      `}</style>
    </div>
  );
};

export default AllProducts;