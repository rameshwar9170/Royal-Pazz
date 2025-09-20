import React, { useState, useEffect } from 'react';
import { database } from '../firebase/config';
import { ref, get, set, push } from 'firebase/database';
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const QuotationManagement = () => {
  // State Management
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [currentView, setCurrentView] = useState('form');
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  const [currentUser, setCurrentUser] = useState(null);

  // Popup States
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showQuotationDetails, setShowQuotationDetails] = useState(false);
  const [selectedQuotationData, setSelectedQuotationData] = useState(null);
  const [tempQuotation, setTempQuotation] = useState(null);

  // Form States
  const [customerForm, setCustomerForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
  });
  const [quotationData, setQuotationData] = useState({
    quotationId: '',
    date: new Date().toISOString().split('T')[0],
    validUntil: '',
    terms: 'Payment due within 30 days of invoice date.',
    notes: '',
    discount: 0,
    status: 'draft',
  });

  // MODIFIED: fetchCurrentUser now uses the data from your JSON file
  const fetchCurrentUser = async () => {
    // This now simulates fetching the data you provided.
    const userData = {
        "name": "Rameshwar",
        "address": "Vishram bag sangli pune",
        "city": "LATUR",
        "state": "MAHARASHTRA",
        "pin": "156526",
        "email": "rameshwarchate917@gmail.com",
        "phone": "9175514916",
        "id": "YaAVG3SakHOdf5JGSzvMHUWLeMn2"
    };
    setCurrentUser(userData);
  };


  useEffect(() => {
    const initializeData = async () => {
      setIsLoadingData(true);
      await Promise.all([fetchCustomers(), fetchProducts(), fetchQuotations(), fetchCurrentUser()]);
      generateQuotationId();
      setIsLoadingData(false);
    };
    initializeData();
  }, []);

  useEffect(() => {
    if (selectedCustomer && selectedProducts.length > 0) {
      setCurrentStep(3);
    } else if (selectedCustomer) {
      setCurrentStep(2);
    } else {
      setCurrentStep(1);
    }
  }, [selectedCustomer, selectedProducts]);

  // Data fetching functions
  const fetchCustomers = async () => {
    try {
      const snapshot = await get(ref(database, 'HTAMS/company/customers'));
      if (snapshot.exists()) {
        const data = snapshot.val();
        const customerList = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        setCustomers(customerList);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      const snapshot = await get(ref(database, 'HTAMS/company/products'));
      if (snapshot.exists()) {
        const data = snapshot.val();
        const productList = Object.keys(data).map(key => ({
          id: key,
          ...data[key],
          mrp: parseFloat(data[key].mrp) || 0,
        }));
        setProducts(productList);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchQuotations = async () => {
    try {
      const snapshot = await get(ref(database, 'HTAMS/company/quotations'));
      if (snapshot.exists()) {
        const data = snapshot.val();
        const quotationList = Object.keys(data)
          .map(key => ({ id: key, ...data[key] }))
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setQuotations(quotationList);
      }
    } catch (error) {
      console.error("Error fetching quotations:", error);
    }
  };

  const generateQuotationId = () => {
    const today = new Date();
    const year = today.getFullYear().toString().slice(-2);
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    const quotationId = `QT-${year}${month}-${random}`;
    setQuotationData(prev => ({ ...prev, quotationId }));
  };
  
    const handleCreateCustomer = async () => {
        if (!customerForm.name || !customerForm.email || !customerForm.phone) {
            alert('Please fill all required fields.');
            return;
        }
        setLoading(true);
        try {
            const customerRef = ref(database, 'HTAMS/company/customers');
            const newCustomerRef = push(customerRef);
            await set(newCustomerRef, { ...customerForm, createdAt: new Date().toISOString() });

            const newCustomer = { id: newCustomerRef.key, ...customerForm };
            setCustomers(prev => [newCustomer, ...prev]);
            setSelectedCustomer(newCustomer);
            setShowCustomerForm(false);
            setCustomerForm({ name: '', email: '', phone: '', address: '', city: '', state: '', pincode: '' });
            alert('Customer created successfully!');
        } catch (error) {
            console.error('Error creating customer:', error);
            alert('Error creating customer.');
        }
        setLoading(false);
    };

  const addProduct = (product) => {
    if (!product || !product.id) {
        alert("Invalid product selected.");
        return;
    }
    const existingProduct = selectedProducts.find(p => p.id === product.id);
    if (existingProduct) {
        setSelectedProducts(prev => prev.map(p => p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p));
    } else {
        setSelectedProducts(prev => [...prev, { ...product, quantity: 1, mrp: parseFloat(product.mrp) || 0 }]);
    }
  };

  const updateProductQuantity = (productId, quantity) => {
    const qty = parseInt(quantity);
    if (qty <= 0) {
        removeProduct(productId);
        return;
    }
    setSelectedProducts(prev => prev.map(p => p.id === productId ? { ...p, quantity: qty } : p));
  };

  const removeProduct = (productId) => {
    setSelectedProducts(prev => prev.filter(p => p.id !== productId));
  };

  const calculateTotals = () => {
    const subtotal = selectedProducts.reduce((sum, p) => {
        const mrp = parseFloat(p.mrp) || 0;
        const quantity = parseInt(p.quantity) || 0;
        return sum + (mrp * quantity);
    }, 0);
    const discountAmount = subtotal * ((quotationData.discount || 0) / 100);
    const total = subtotal - discountAmount;
    return {
        subtotal: subtotal.toFixed(2),
        discountAmount: discountAmount.toFixed(2),
        total: total.toFixed(2),
    };
  };

  const generateQuotation = () => {
    if (!selectedCustomer) {
        alert("Please select a customer.");
        return;
    }
    if (selectedProducts.length === 0) {
        alert("Please select at least one product.");
        return;
    }

    const totals = calculateTotals();
    const quotationRecord = {
        ...quotationData,
        customer: selectedCustomer,
        products: selectedProducts,
        totals,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: currentUser?.id || 'default_user',
    };

    setTempQuotation(quotationRecord);
    setShowConfirmation(true);
  };

  const confirmQuotation = async () => {
    if (!tempQuotation) return;
    setLoading(true);
    try {
        await set(ref(database, `HTAMS/company/quotations/${tempQuotation.quotationId}`), tempQuotation);
        alert('Quotation generated successfully!');
        await fetchQuotations();
        setCurrentView('table');
        resetForm();
        setShowConfirmation(false);
        setTempQuotation(null);
    } catch (error) {
        console.error("Error saving quotation:", error);
        alert(`Error saving quotation: ${error.message}`);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setSelectedCustomer(null);
    setSelectedProducts([]);
    setCurrentStep(1);
    setQuotationData(prev => ({
        ...prev,
        validUntil: '',
        notes: '',
        discount: 0,
        status: 'draft',
    }));
    generateQuotationId();
  };

  const handleWhatsAppShare = (quotation) => {
    const message = `
*Quotation ID:* ${quotation.quotationId}%0A
*Customer:* ${quotation.customer.name}%0A
*Date:* ${new Date(quotation.date).toLocaleDateString()}%0A
*Total Amount:* ₹${quotation.totals.total}%0A
%0A
*Products (GST Included):*%0A
${quotation.products.map((product, index) => 
    `${index + 1}. ${product.name} - Qty: ${product.quantity} - ₹${(product.mrp * product.quantity).toFixed(2)}`
).join('%0A')}%0A
%0A
*Thank you for your business!*%0A
---%0A
*${currentUser?.name || 'Your Company'}*%0A
*${currentUser?.phone || 'Your Phone'}*%0A
*${currentUser?.email || 'Your Email'}*
    `;
    const whatsappUrl = `https://wa.me/?text=${message.trim()}`;
    window.open(whatsappUrl, '_blank');
  };

  // MODIFIED: QuotationPDF now correctly formats the sender's address
  const QuotationPDF = ({ data, userInfo }) => (
    <Document>
        <Page size="A4" style={pdfStyles.page}>
            <View style={pdfStyles.header}>
                <Text style={pdfStyles.documentTitle}>QUOTATION</Text>
                <Text style={pdfStyles.quotationId}>{data.quotationId}</Text>
            </View>

            <View style={pdfStyles.infoSection}>
                <View style={pdfStyles.infoColumn}>
                    <Text style={pdfStyles.sectionTitle}>From:</Text>
                    <Text style={pdfStyles.text}>{userInfo?.name || 'Your Company Name'}</Text>
                    <Text style={pdfStyles.text}>{userInfo?.address || 'Your Company Address'}</Text>
                    <Text style={pdfStyles.text}>{userInfo?.city}, {userInfo.state} - {userInfo.pin}</Text>
                    <Text style={pdfStyles.text}>Email: {userInfo?.email || 'your-email@company.com'}</Text>
                    <Text style={pdfStyles.text}>Phone: {userInfo?.phone || 'Your Company Phone'}</Text>
                </View>
                <View style={pdfStyles.infoColumn}>
                    <Text style={pdfStyles.sectionTitle}>To:</Text>
                    <Text style={pdfStyles.text}>{data.customer.name}</Text>
                    <Text style={pdfStyles.text}>{data.customer.company || ''}</Text>
                    <Text style={pdfStyles.text}>{data.customer.address}, {data.customer.city}</Text>
                    <Text style={pdfStyles.text}>{data.customer.state} - {data.customer.pincode}</Text>
                    <Text style={pdfStyles.text}>Email: {data.customer.email}</Text>
                    <Text style={pdfStyles.text}>Phone: {data.customer.phone}</Text>
                </View>
            </View>
            
            <View style={pdfStyles.detailsSection}>
                <Text style={pdfStyles.text}>Date: {new Date(data.date).toLocaleDateString()}</Text>
                <Text style={pdfStyles.text}>Valid Until: {data.validUntil ? new Date(data.validUntil).toLocaleDateString() : 'N/A'}</Text>
            </View>

            <View style={pdfStyles.table}>
                <View style={pdfStyles.tableHeader}>
                    <Text style={[pdfStyles.tableCell, pdfStyles.tableCellHeader, { width: '8%' }]}>S.No</Text>
                    <Text style={[pdfStyles.tableCell, pdfStyles.tableCellHeader, { width: '42%' }]}>Product/Service</Text>
                    <Text style={[pdfStyles.tableCell, pdfStyles.tableCellHeader, { width: '12%' }]}>Qty</Text>
                    <Text style={[pdfStyles.tableCell, pdfStyles.tableCellHeader, { width: '19%' }]}>Rate (Inc. GST)</Text>
                    <Text style={[pdfStyles.tableCell, pdfStyles.tableCellHeader, { width: '19%' }]}>Amount</Text>
                </View>
                {data.products.map((product, index) => (
                    <View key={index} style={pdfStyles.tableRow}>
                        <Text style={[pdfStyles.tableCell, { width: '8%' }]}>{index + 1}</Text>
                        <View style={[pdfStyles.tableCell, { width: '42%' }]}>
                            <Text>{product.name}</Text>
                            {product.description && <Text style={pdfStyles.productDescription}>{product.description}</Text>}
                        </View>
                        <Text style={[pdfStyles.tableCell, { width: '12%' }]}>{product.quantity}</Text>
                        <Text style={[pdfStyles.tableCell, { width: '19%' }]}>₹{parseFloat(product.mrp).toFixed(2)}</Text>
                        <Text style={[pdfStyles.tableCell, { width: '19%' }]}>₹{(parseFloat(product.mrp) * product.quantity).toFixed(2)}</Text>
                    </View>
                ))}
            </View>

            <View style={pdfStyles.totalsSection}>
                <View style={pdfStyles.totalRow}>
                    <Text style={pdfStyles.totalLabel}>Subtotal (GST Included)</Text>
                    <Text style={pdfStyles.totalValue}>₹{data.totals.subtotal}</Text>
                </View>
                {parseFloat(data.totals.discountAmount) > 0 && (
                    <View style={pdfStyles.totalRow}>
                        <Text style={pdfStyles.totalLabel}>Discount ({quotationData.discount}%)</Text>
                        <Text style={pdfStyles.totalValue}>-₹{data.totals.discountAmount}</Text>
                    </View>
                )}
                <View style={[pdfStyles.totalRow, pdfStyles.grandTotal]}>
                    <Text style={pdfStyles.totalLabel}>Total Amount</Text>
                    <Text style={pdfStyles.totalValue}>₹{data.totals.total}</Text>
                </View>
            </View>

            <View style={pdfStyles.notesSection}>
                <Text style={pdfStyles.sectionTitle}>Terms & Conditions</Text>
                <Text style={pdfStyles.text}>{data.terms}</Text>
                {data.notes && (
                    <>
                        <Text style={pdfStyles.sectionTitle}>Notes</Text>
                        <Text style={pdfStyles.text}>{data.notes}</Text>
                    </>
                )}
            </View>
            
            <View style={pdfStyles.footer}>
                <Text style={pdfStyles.footerText}>Thank you for choosing {userInfo?.name || 'us'}!</Text>
                <Text style={pdfStyles.footerText}>Contact: {userInfo?.phone} | {userInfo?.email}</Text>
            </View>
        </Page>
    </Document>
  );

  if (isLoadingData || !currentUser) {
    return (
        <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <h2 style={styles.loadingText}>Loading quotation system...</h2>
        </div>
    );
  }

  const totals = calculateTotals();

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slideDown { from { transform: translateY(-30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slideInLeft { from { transform: translateX(-30px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes slideInRight { from { transform: translateX(30px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .fadeIn { animation: fadeIn 0.4s ease-out; }
        .slideUp { animation: slideUp 0.5s ease-out; }
        .slideDown { animation: slideDown 0.4s ease-out; }
        .slideInLeft { animation: slideInLeft 0.5s ease-out; }
        .slideInRight { animation: slideInRight 0.5s ease-out; }
        .pulse { animation: pulse 2s ease-in-out infinite; }
        .spinner { width: 50px; height: 50px; border: 4px solid #f3f3f3; border-top: 4px solid #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; }
        
        @media (max-width: 768px) {
            .mobile-stack { flex-direction: column !important; }
            .mobile-full { width: 100% !important; }
            .mobile-center { text-align: center !important; }
            .mobile-hide { display: none !important; }
            .mobile-show { display: block !important; }
            .mobile-small { font-size: 0.9rem !important; padding: 8px 12px !important; }
        }
        @media (max-width: 480px) {
            .mobile-xs { font-size: 0.8rem !important; padding: 6px 10px !important; }
            .mobile-xs-hide { display: none !important; }
        }
      `}</style>
      
      <div style={styles.header} className="fadeIn">
        <div style={styles.headerContent}>
            <h1 style={styles.title}>Quotation Management</h1>
            <p style={styles.subtitle}>Create professional quotations with ease</p>
        </div>
        <div style={styles.viewToggle} className="mobile-stack">
            <button style={currentView === 'form' ? styles.activeToggleBtn : styles.toggleBtn} onClick={() => setCurrentView('form')} className="mobile-small">
                Create New
            </button>
            <button style={currentView === 'table' ? styles.activeToggleBtn : styles.toggleBtn} onClick={() => setCurrentView('table')} className="mobile-small">
                View All ({quotations.length})
            </button>
        </div>
      </div>

      {currentView === 'form' ? (
        <div style={styles.formView}>
            <div style={styles.progressContainer} className="fadeIn">
                <div style={styles.progressBar}>
                    <div style={styles.progressStep}>
                        <div style={currentStep >= 1 ? styles.stepActive : styles.stepInactive}>1</div>
                        <span style={styles.stepLabel}>Select Customer</span>
                    </div>
                    <div style={styles.progressLine}></div>
                    <div style={styles.progressStep}>
                        <div style={currentStep >= 2 ? styles.stepActive : styles.stepInactive}>2</div>
                        <span style={styles.stepLabel}>Add Products</span>
                    </div>
                    <div style={styles.progressLine}></div>
                    <div style={styles.progressStep}>
                        <div style={currentStep >= 3 ? styles.stepActive : styles.stepInactive}>3</div>
                        <span style={styles.stepLabel}>Quotation Details</span>
                    </div>
                </div>
            </div>

            <div style={styles.section} className="slideUp">
                <div style={styles.stepHeader}>
                    <h3 style={styles.sectionTitle}><span style={styles.stepNumber}>1</span> Customer Selection</h3>
                </div>
                <div style={styles.customerSelection}>
                    <select style={styles.customerSelect} value={selectedCustomer?.id || ''} onChange={(e) => {
                        const customer = customers.find(c => c.id === e.target.value);
                        setSelectedCustomer(customer || null);
                    }}>
                        <option value="">Select a customer...</option>
                        {customers.map(customer => (
                            <option key={customer.id} value={customer.id}>{customer.name} - {customer.email}</option>
                        ))}
                    </select>
                    <button style={styles.addCustomerBtn} onClick={() => setShowCustomerForm(true)} className="mobile-small">
                        + Add New
                    </button>
                </div>

                {selectedCustomer && (
                    <div style={styles.customerCard} className="slideDown">
                        <div style={styles.customerCardHeader}>
                            <div style={styles.customerAvatar}>{selectedCustomer.name.charAt(0).toUpperCase()}</div>
                            <div style={styles.customerInfo}>
                                <h4 style={styles.customerName}>{selectedCustomer.name}</h4>
                                <p style={styles.customerCompany}>{selectedCustomer.company || 'Individual Customer'}</p>
                            </div>
                            <div style={styles.customerBadge}>Selected</div>
                        </div>
                        <div style={styles.customerDetails}>
                            <div style={styles.customerDetailItem}>
                                <span style={styles.detailIcon}>📧</span>
                                <span style={styles.detailText}>{selectedCustomer.email}</span>
                            </div>
                            <div style={styles.customerDetailItem}>
                                <span style={styles.detailIcon}>📞</span>
                                <span style={styles.detailText}>{selectedCustomer.phone}</span>
                            </div>
                            {selectedCustomer.address && (
                                <div style={styles.customerDetailItem}>
                                    <span style={styles.detailIcon}>📍</span>
                                    <span style={styles.detailText}>{selectedCustomer.address}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {selectedCustomer && (
                <>
                    <div style={styles.section} className="slideInLeft">
                        <div style={styles.stepHeader}>
                            <h3 style={styles.sectionTitle}><span style={styles.stepNumber}>2</span> Add Products <small>(GST Already Included)</small></h3>
                            <p style={styles.sectionSubtitle}>Select products for your quotation</p>
                        </div>
                    <div style={styles.productGrid}>
  {products.slice(0, 8).map((product) => (
    <div key={product.id} style={styles.productCard} className='mobile-full'>
      <div style={styles.productImage}>
        <span style={styles.productIcon}>🛍️</span>
      </div>
      <div style={styles.productContent}>
        <div style={styles.productHeader}>
          <h4 style={styles.productName}>{product.name}</h4>
          
          {/* --- CORRECTED PRICE DISPLAY --- */}
          <div style={{
            fontSize: '1.1rem',
            fontWeight: 'bold',
            color: '#3b82f6'
          }}>
            {/* Displaying MRP instead of Price */}
            ₹{Number(product.mrp || 0).toLocaleString('en-IN')}
          </div>
          {/* --- END OF CORRECTION --- */}

        </div>
        <p style={styles.productDesc}>{product.description || 'Premium quality product'}</p>
        <button style={styles.addBtn} onClick={() => addProduct(product)} className='mobile-small'>
          <span style={styles.addIcon}>+</span> Add to Quote
        </button>
      </div>
    </div>
  ))}
</div>


                    </div>

                    {selectedProducts.length > 0 && (
                        <div style={styles.section} className="slideInRight">
                            <h3 style={styles.sectionTitle}>
                                <span style={styles.stepNumber}>✓</span> Selected Products ({selectedProducts.length})
                            </h3>
                            <div style={styles.selectedProductsContainer}>
                                {selectedProducts.map(product => (
                                    <div key={product.id} style={styles.selectedProductCard} className="mobile-full">
                                        <div style={styles.selectedProductInfo}>
                                          <div style={styles.selectedProductDetails}>
                                              <h5 style={styles.selectedProductName}>{product.name}</h5>
                                              <p style={styles.selectedProductPrice}>₹{product.mrp.toFixed(2)} each</p>
                                          </div>
                                        </div>
                                        <div style={styles.quantityControls}>
                                            <label style={styles.qtyLabel}>Qty:</label>
                                            <input type="number" value={product.quantity} onChange={e => updateProductQuantity(product.id, e.target.value)} style={styles.qtyInput} min="1" />
                                        </div>
                                        <div style={styles.productAmount}>
                                            <span style={styles.amountLabel}>Amount:</span>
                                            <span style={styles.amountValue}>₹{(product.mrp * product.quantity).toFixed(2)}</span>
                                        </div>
                                        <button style={styles.removeProductBtn} onClick={() => removeProduct(product.id)} title="Remove product">
                                            &times;
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {selectedCustomer && selectedProducts.length > 0 && (
                <div style={styles.section} className="slideUp">
                    <div style={styles.stepHeader}>
                        <h3 style={styles.sectionTitle}><span style={styles.stepNumber}>3</span> Quotation Details <small>(No Additional GST)</small></h3>
                        <p style={styles.sectionSubtitle}>Add final details and generate quotation</p>
                    </div>
                    <div style={styles.quotationDetailsGrid}>
                        <div style={styles.detailsForm}>
                            <div style={styles.formRow} className="mobile-stack">
                                <div style={styles.inputGroup} className="mobile-full">
                                    <label style={styles.label}>Valid Until</label>
                                    <input type="date" value={quotationData.validUntil} onChange={e => setQuotationData(prev => ({ ...prev, validUntil: e.target.value }))} style={styles.input} min={new Date().toISOString().split('T')[0]} />
                                </div>
                                <div style={styles.inputGroup} className="mobile-full">
                                    <label style={styles.label}>Discount (%)</label>
                                    <input type="number" value={quotationData.discount} onChange={e => setQuotationData(prev => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))} style={styles.input} min="0" max="100" step="0.1" placeholder="0" />
                                </div>
                            </div>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Additional Notes</label>
                                <textarea value={quotationData.notes} onChange={e => setQuotationData(prev => ({ ...prev, notes: e.target.value }))} style={styles.textarea} rows={3} placeholder="Any special instructions or terms..."></textarea>
                            </div>
                        </div>
                        <div style={styles.summaryCard} className="mobile-full">
                            <div style={styles.summaryHeader}>
                                <h4 style={styles.summaryTitle}>Quotation Summary</h4>
                                <div style={styles.quotationId}>ID: {quotationData.quotationId}</div>
                            </div>
                            <div style={styles.summaryContent}>
                                <div style={styles.summaryRow}>
                                    <span>Subtotal (GST Included)</span>
                                    <span style={styles.summaryAmount}>₹{totals.subtotal}</span>
                                </div>
                                {parseFloat(totals.discountAmount) > 0 && (
                                    <div style={styles.summaryRow}>
                                        <span>Discount ({quotationData.discount}%)</span>
                                        <span style={styles.discountAmount}>-₹{totals.discountAmount}</span>
                                    </div>
                                )}
                                <div style={styles.totalRow}>
                                    <span><strong>Total Amount</strong></span>
                                    <span style={styles.totalAmount}><strong>₹{totals.total}</strong></span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div style={styles.actionButtons} className="mobile-stack">
                        <button style={styles.generateBtn} onClick={generateQuotation} disabled={!selectedCustomer || selectedProducts.length === 0} className="mobile-full pulse">
                            Generate Quotation
                        </button>
                        <button style={styles.resetBtn} onClick={resetForm} className="mobile-full">
                            Reset
                        </button>
                    </div>
                </div>
            )}
        </div>
      ) : (
        <div style={styles.tableView} className="slideUp">
          <div style={styles.section}>
            <div style={styles.tableHeader} className="mobile-stack">
                <h3 style={styles.sectionTitle}>All Quotations ({quotations.length})</h3>
                <div style={styles.tableActions}>
                    <button style={styles.refreshBtn} onClick={fetchQuotations} className="mobile-small">Refresh</button>
                </div>
            </div>
            {quotations.length === 0 ? (
                <div style={styles.emptyState} className="fadeIn">
                    <div style={styles.emptyIcon}>📄</div>
                    <h3>No quotations found</h3>
                    <p>Create your first quotation to get started!</p>
                    <button style={styles.createBtn} onClick={() => setCurrentView('form')}>Create First Quotation</button>
                </div>
            ) : (
                <div style={styles.quotationsTableContainer}>
                    <div style={styles.quotationsTable} className="mobile-hide">
                        <div style={styles.quotationTableHeader}>
                            <span>Quotation ID</span>
                            <span>Customer</span>
                            <span>Date</span>
                            <span>Items</span>
                            <span>Total Amount</span>
                            <span>Actions</span>
                        </div>
                        {quotations.map(quotation => (
                            <div key={quotation.id} style={styles.quotationRow}>
                                <span style={styles.quotationCell}>
                                    <div style={styles.quotationIdCell}>
                                        <strong>{quotation.quotationId}</strong>
                                        <small style={styles.statusBadge}>{quotation.status}</small>
                                    </div>
                                </span>
                                <span style={styles.quotationCell}>
                                    <div style={styles.customerCell}>
                                        <div style={styles.customerAvatar}>{quotation.customer.name.charAt(0)}</div>
                                        <div>
                                            <strong>{quotation.customer.name}</strong><br/>
                                            <small>{quotation.customer.email}</small>
                                        </div>
                                    </div>
                                </span>
                                <span style={styles.quotationCell}>
                                    <div style={styles.dateCell}>{new Date(quotation.date).toLocaleDateString('en-GB')}</div>
                                </span>
                                <span style={styles.quotationCell}>
                                    <div style={styles.itemsCell}>
                                        <span style={styles.itemsBadge}>{quotation.products.length} items</span>
                                    </div>
                                </span>
                                <span style={styles.quotationCell}>
                                    <div style={styles.totalCell}>
                                        <strong style={styles.totalAmountDisplay}>₹{quotation.totals.total}</strong>
                                    </div>
                                </span>
                                <span style={styles.quotationCell}>
                                    <div style={styles.actionBtns}>
                                        <PDFDownloadLink document={<QuotationPDF data={quotation} userInfo={currentUser} />} fileName={`quotation-${quotation.quotationId}.pdf`} style={styles.actionBtnPDF} title="Download PDF">
                                            {({ blob, url, loading, error }) => (loading ? '...' : 'PDF')}
                                        </PDFDownloadLink>
                                        <button style={styles.actionBtnWhatsApp} onClick={() => handleWhatsAppShare(quotation)} title="Share on WhatsApp">💬</button>
                                        <button style={styles.viewBtn} onClick={() => { setSelectedQuotationData(quotation); setShowQuotationDetails(true); }} title="View Details">👁️</button>
                                    </div>
                                </span>
                            </div>
                        ))}
                    </div>
                    <div style={styles.mobileCardsContainer} className="mobile-show">
                         {quotations.map(quotation => (
                            <div key={quotation.id} style={styles.mobileQuotationCard}>
                                <div style={styles.mobileCardHeader}>
                                    <div>
                                        <strong style={styles.mobileQuotationId}>{quotation.quotationId}</strong>
                                        <span style={styles.mobileStatusBadge}>{quotation.status}</span>
                                    </div>
                                    <div style={styles.mobileDate}>{new Date(quotation.date).toLocaleDateString('en-GB')}</div>
                                </div>
                                <div style={styles.mobileCardContent}>
                                    <div style={styles.mobileCustomerInfo}>
                                        <div style={styles.mobileCustomerAvatar}>{quotation.customer.name.charAt(0)}</div>
                                        <div>
                                            <div style={styles.mobileCustomerName}>{quotation.customer.name}</div>
                                            <div style={styles.mobileCustomerEmail}>{quotation.customer.email}</div>
                                        </div>
                                    </div>
                                    <div style={styles.mobileCardDetails}>
                                        <div style={styles.mobileDetailItem}>
                                            <span>Items</span>
                                            <span><span style={styles.mobileItemsBadge}>{quotation.products.length}</span></span>
                                        </div>
                                        <div style={styles.mobileDetailItem}>
                                            <span>Total</span>
                                            <strong style={styles.mobileTotalAmount}>₹{quotation.totals.total}</strong>
                                        </div>
                                    </div>
                                </div>
                                <div style={styles.mobileCardActions}>
                                    <PDFDownloadLink document={<QuotationPDF data={quotation} userInfo={currentUser} />} fileName={`quotation-${quotation.quotationId}.pdf`} style={styles.mobileActionBtn}>
                                        PDF
                                    </PDFDownloadLink>
                                    <button style={styles.mobileActionBtn} onClick={() => handleWhatsAppShare(quotation)}>Share</button>
                                    <button style={styles.mobileActionBtn} onClick={() => { setSelectedQuotationData(quotation); setShowQuotationDetails(true); }}>View</button>
                                </div>
                            </div>
                         ))}
                    </div>
                </div>
            )}
          </div>
        </div>
      )}

      {showCustomerForm && (
        <div style={styles.popupOverlay} className="fadeIn">
            <div style={styles.customerFormPopup} className="slideUp">
                <div style={styles.popupHeader}>
                    <h2 style={styles.popupTitle}>Add New Customer</h2>
                    <button style={styles.closeBtn} onClick={() => setShowCustomerForm(false)}>&times;</button>
                </div>
                <div style={styles.popupBody}>
                    <div style={styles.formRow} className="mobile-stack">
                        <div style={styles.inputGroup} className="mobile-full">
                            <label style={styles.label}>Name*</label>
                            <input type="text" value={customerForm.name} onChange={e => setCustomerForm(prev => ({ ...prev, name: e.target.value }))} style={styles.input} placeholder="Customer full name" />
                        </div>
                        <div style={styles.inputGroup} className="mobile-full">
                            <label style={styles.label}>Email*</label>
                            <input type="email" value={customerForm.email} onChange={e => setCustomerForm(prev => ({ ...prev, email: e.target.value }))} style={styles.input} placeholder="customer@email.com" />
                        </div>
                    </div>
                    <div style={styles.formRow} className="mobile-stack">
                        <div style={styles.inputGroup} className="mobile-full">
                            <label style={styles.label}>Phone*</label>
                            <input type="tel" value={customerForm.phone} onChange={e => setCustomerForm(prev => ({ ...prev, phone: e.target.value }))} style={styles.input} placeholder="+91-9876543210" />
                        </div>
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Address</label>
                        <textarea value={customerForm.address} onChange={e => setCustomerForm(prev => ({ ...prev, address: e.target.value }))} style={styles.textarea} rows={2} placeholder="Complete address"></textarea>
                    </div>
                    <div style={styles.formRow} className="mobile-stack">
                        <div style={styles.inputGroup} className="mobile-full">
                            <label style={styles.label}>City</label>
                            <input type="text" value={customerForm.city} onChange={e => setCustomerForm(prev => ({ ...prev, city: e.target.value }))} style={styles.input} placeholder="City" />
                        </div>
                        <div style={styles.inputGroup} className="mobile-full">
                            <label style={styles.label}>State</label>
                            <input type="text" value={customerForm.state} onChange={e => setCustomerForm(prev => ({ ...prev, state: e.target.value }))} style={styles.input} placeholder="State" />
                        </div>
                         <div style={styles.inputGroup} className="mobile-full">
                            <label style={styles.label}>Pincode</label>
                            <input type="text" value={customerForm.pincode} onChange={e => setCustomerForm(prev => ({ ...prev, pincode: e.target.value }))} style={styles.input} placeholder="Pincode" />
                        </div>
                    </div>
                </div>
                <div style={styles.popupActions} className="mobile-stack">
                    <button style={styles.cancelBtn} onClick={() => setShowCustomerForm(false)} className="mobile-full">Cancel</button>
                    <button style={styles.saveBtn} onClick={handleCreateCustomer} disabled={loading} className="mobile-full">
                        {loading ? 'Creating...' : 'Create Customer'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {showConfirmation && tempQuotation && (
        <div style={styles.popupOverlay} className="fadeIn">
            <div style={styles.confirmPopup} className="slideUp">
                <div style={styles.popupHeader}>
                    <h2 style={styles.popupTitle}>Confirm Quotation</h2>
                </div>
                <div style={styles.popupBody}>
                    <div style={styles.confirmationCard}>
                        <div style={styles.confirmDetails}>
                            <div style={styles.confirmRow}>
                                <span style={styles.confirmLabel}>Quotation ID</span>
                                <span style={styles.confirmValue}>{tempQuotation.quotationId}</span>
                            </div>
                            <div style={styles.confirmRow}>
                                <span style={styles.confirmLabel}>Customer</span>
                                <span style={styles.confirmValue}>{tempQuotation.customer.name}</span>
                            </div>
                            <div style={styles.confirmRow}>
                                <span style={styles.confirmLabel}>Products</span>
                                <span style={styles.confirmValue}>{tempQuotation.products.length} items</span>
                            </div>
                             <div style={styles.confirmRow}>
                                <span style={styles.confirmLabel}>Total Amount</span>
                                <span style={styles.confirmValueAmount}>₹{tempQuotation.totals.total}</span>
                            </div>
                        </div>
                        <p style={styles.confirmationText}>
                            Are you sure you want to generate this quotation? Once created, it will be saved to your system.
                        </p>
                    </div>
                </div>
                <div style={styles.popupActions} className="mobile-stack">
                    <button style={styles.cancelBtn} onClick={() => {setShowConfirmation(false); setTempQuotation(null);}} className="mobile-full">Cancel</button>
                    <button style={styles.confirmSaveBtn} onClick={confirmQuotation} disabled={loading} className="mobile-full">
                        {loading ? 'Saving...' : 'Confirm & Generate'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {showQuotationDetails && selectedQuotationData && (
        <div style={styles.popupOverlay} className="fadeIn">
            <div style={styles.detailsPopup} className="slideUp">
                 <div style={styles.popupHeader}>
                    <h2 style={styles.popupTitle}>Quotation Details</h2>
                    <button style={styles.closeBtn} onClick={() => {setShowQuotationDetails(false); setSelectedQuotationData(null);}}>&times;</button>
                </div>
                <div style={styles.popupBody}>
                    <div style={styles.detailsGrid} className="mobile-stack">
                        <div style={styles.detailsCard} className="mobile-full">
                            <h4 style={styles.cardTitle}>Quotation Info</h4>
                            <div style={styles.detailItem}><span style={styles.detailLabel}>ID</span> <span style={styles.detailValue}>{selectedQuotationData.quotationId}</span></div>
                            <div style={styles.detailItem}><span style={styles.detailLabel}>Date</span> <span style={styles.detailValue}>{new Date(selectedQuotationData.date).toLocaleDateString('en-GB')}</span></div>
                            <div style={styles.detailItem}><span style={styles.detailLabel}>Valid Until</span> <span style={styles.detailValue}>{selectedQuotationData.validUntil ? new Date(selectedQuotationData.validUntil).toLocaleDateString('en-GB') : 'N/A'}</span></div>
                            <div style={styles.detailItem}><span style={styles.detailLabel}>Status</span> <span style={styles.statusBadge}>{selectedQuotationData.status}</span></div>
                        </div>
                         <div style={styles.detailsCard} className="mobile-full">
                            <h4 style={styles.cardTitle}>Customer Details</h4>
                            <div style={styles.customerDetailsFull}>
                               <div style={styles.customerAvatarLarge}>{selectedQuotationData.customer.name.charAt(0)}</div>
                               <div style={styles.customerDetailsText}>
                                   <div style={styles.detailItem}><span style={styles.detailLabel}>Name</span> <span style={styles.detailValue}>{selectedQuotationData.customer.name}</span></div>
                                   <div style={styles.detailItem}><span style={styles.detailLabel}>Email</span> <span style={styles.detailValue}>{selectedQuotationData.customer.email}</span></div>
                                   <div style={styles.detailItem}><span style={styles.detailLabel}>Phone</span> <span style={styles.detailValue}>{selectedQuotationData.customer.phone}</span></div>
                                   {selectedQuotationData.customer.company && <div style={styles.detailItem}><span style={styles.detailLabel}>Company</span> <span style={styles.detailValue}>{selectedQuotationData.customer.company}</span></div>}
                               </div>
                            </div>
                        </div>
                    </div>
                    <div style={styles.detailsCard}>
                        <h4 style={styles.cardTitle}>Products ({selectedQuotationData.products.length})</h4>
                        <div style={styles.productsDetailTable}>
                             {selectedQuotationData.products.map((product, index) => (
                                <div key={index} style={styles.productDetailRow} className="mobile-stack">
                                    <div style={styles.productDetailInfo} className="mobile-full">
                                        <span style={styles.productDetailNumber}>{index + 1}.</span>
                                        <div style={styles.productDetailContent}>
                                            <span style={styles.productDetailName}>{product.name}</span>
                                            {product.description && <p style={styles.productDetailDesc}>{product.description}</p>}
                                        </div>
                                    </div>
                                    <div style={styles.productDetailStats} className="mobile-full mobile-center">
                                        <span style={styles.productDetailQty}>Qty: {product.quantity}</span>
                                        <span style={styles.productDetailPrice}>@ ₹{product.price.toFixed(2)}</span>
                                        <span style={styles.productDetailTotal}>₹{(product.price * product.quantity).toFixed(2)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={styles.detailsCard}>
                        <h4 style={styles.cardTitle}>Amount Summary</h4>
                        <div style={styles.amountSummaryDetail}>
                            <div style={styles.amountDetailRow}>
                                <span style={styles.amountDetailLabel}>Subtotal (GST Included)</span>
                                <span style={styles.amountDetailValue}>₹{selectedQuotationData.totals.subtotal}</span>
                            </div>
                            {parseFloat(selectedQuotationData.totals.discountAmount) > 0 && (
                                <div style={styles.amountDetailRow}>
                                    <span style={styles.amountDetailLabel}>Discount</span>
                                    <span style={styles.discountDetailAmount}>-₹{selectedQuotationData.totals.discountAmount}</span>
                                </div>
                            )}
                            <div style={styles.totalDetailRow}>
                                <span style={styles.totalDetailLabel}><strong>Total Amount</strong></span>
                                <span style={styles.totalDetailValue}><strong>₹{selectedQuotationData.totals.total}</strong></span>
                            </div>
                        </div>
                    </div>
                     {selectedQuotationData.notes && (
                        <div style={styles.detailsCard}>
                            <h4 style={styles.cardTitle}>Notes</h4>
                            <p style={styles.notesText}>{selectedQuotationData.notes}</p>
                        </div>
                     )}
                </div>
                <div style={styles.popupActions} className="mobile-stack">
                    <PDFDownloadLink document={<QuotationPDF data={selectedQuotationData} userInfo={currentUser} />} fileName={`quotation-${selectedQuotationData.quotationId}.pdf`} style={styles.detailActionBtnPDF} className="mobile-full mobile-center">
                         Download PDF
                    </PDFDownloadLink>
                    <button style={styles.detailActionBtnWhatsApp} onClick={() => handleWhatsAppShare(selectedQuotationData)} className="mobile-full">
                        Share on WhatsApp
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};


// Enhanced Responsive Styles
const styles = {
  container: {
    padding: '15px',
    maxWidth: '1400px',
    margin: '0 auto',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
    '@media (min-width: 768px)': {
      padding: '20px'
    }
  },
  
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    textAlign: 'center'
  },
  
  loadingText: {
    marginTop: '20px',
    color: '#64748b',
    fontSize: '1.1rem'
  },

  // Enhanced Header
  header: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '20px',
    borderRadius: '15px',
    marginBottom: '25px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 10px 40px rgba(102, 126, 234, 0.3)',
    flexWrap: 'wrap',
    gap: '15px'
  },

  headerContent: {
    flex: '1',
    minWidth: '250px'
  },

  title: {
    fontSize: '1.8rem',
    fontWeight: '700',
    margin: '0 0 5px 0',
    '@media (min-width: 768px)': {
      fontSize: '2.2rem'
    }
  },

  subtitle: {
    fontSize: '1rem',
    margin: '0',
    opacity: '0.9',
    fontWeight: '400'
  },

  viewToggle: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  },

  toggleBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    padding: '10px 18px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
    transition: 'all 0.3s ease',
    whiteSpace: 'nowrap'
  },

  activeToggleBtn: {
    backgroundColor: 'white',
    color: '#667eea',
    border: '1px solid white',
    padding: '10px 18px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '600',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
    whiteSpace: 'nowrap'
  },

  // Progress Indicator
  progressContainer: {
    background: 'white',
    padding: '20px',
    borderRadius: '15px',
    marginBottom: '25px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
  },

  progressBar: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '0',
    flexWrap: 'wrap'
  },

  progressStep: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    minWidth: '120px'
  },

  stepActive: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '600',
    fontSize: '1.2rem',
    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)'
  },

  stepInactive: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#e5e7eb',
    color: '#9ca3af',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '600',
    fontSize: '1.2rem'
  },

  stepLabel: {
    fontSize: '0.9rem',
    fontWeight: '500',
    color: '#64748b',
    textAlign: 'center'
  },

  progressLine: {
    width: '80px',
    height: '3px',
    backgroundColor: '#e5e7eb',
    margin: '0 10px',
    borderRadius: '2px',
    '@media (max-width: 768px)': {
      display: 'none'
    }
  },

  // Form Sections
  formView: {
    display: 'flex',
    flexDirection: 'column',
    gap: '25px'
  },

  section: {
    background: 'white',
    padding: '25px',
    borderRadius: '15px',
    boxShadow: '0 6px 25px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0'
  },

  stepHeader: {
    marginBottom: '20px'
  },

  sectionTitle: {
    fontSize: '1.4rem',
    color: '#1e293b',
    marginBottom: '8px',
    fontWeight: '600',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '15px'
  },

  sectionSubtitle: {
    fontSize: '1rem',
    color: '#64748b',
    margin: '0',
    fontWeight: '400'
  },

  stepNumber: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '35px',
    height: '35px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    color: 'white',
    fontSize: '1.2rem',
    fontWeight: '600',
    marginRight: '15px'
  },

  // Customer Selection
  customerSelection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },

  addCustomerBtn: {
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    padding: '10px 18px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '600',
    whiteSpace: 'nowrap',
    transition: 'all 0.3s ease'
  },

  customerSelect: {
    width: '100%',
    padding: '15px',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    fontSize: '1.1rem',
    backgroundColor: '#fafafa',
    color: '#374151',
    transition: 'all 0.3s ease'
  },

  customerCard: {
    backgroundColor: '#f0f9ff',
    border: '2px solid #0ea5e9',
    borderRadius: '15px',
    padding: '20px',
    marginTop: '15px'
  },

  customerCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    marginBottom: '15px',
    flexWrap: 'wrap'
  },

  customerAvatar: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
    fontWeight: '600',
    flexShrink: 0
  },

  customerInfo: {
    flex: '1'
  },

  customerName: {
    margin: '0',
    color: '#0c4a6e',
    fontSize: '1.3rem',
    fontWeight: '600'
  },

  customerCompany: {
    margin: '5px 0 0 0',
    color: '#0369a1',
    fontSize: '1rem',
    fontWeight: '400'
  },

  customerBadge: {
    backgroundColor: '#10b981',
    color: 'white',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '0.85rem',
    fontWeight: '600'
  },

  customerDetails: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '12px'
  },

  customerDetailItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 0'
  },

  detailIcon: {
    fontSize: '1.1rem'
  },

  detailText: {
    color: '#0369a1',
    fontSize: '0.95rem'
  },

  // Product Grid
  productGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
    marginTop: '20px'
  },

  productCard: {
    border: '2px solid #e5e7eb',
    borderRadius: '15px',
    padding: '0',
    backgroundColor: '#ffffff',
    transition: 'all 0.3s ease',
    overflow: 'hidden',
    ':hover': {
      transform: 'translateY(-3px)',
      boxShadow: '0 8px 25px rgba(0,0,0,0.12)'
    }
  },

  productImage: {
    backgroundColor: '#f8fafc',
    padding: '20px',
    textAlign: 'center',
    borderBottom: '1px solid #e5e7eb'
  },

  productIcon: {
    fontSize: '2.5rem'
  },

  productContent: {
    padding: '20px'
  },

  productHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '10px',
    gap: '10px'
  },

  productName: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0',
    flex: '1',
    lineHeight: '1.4'
  },

  productPrice: {
    fontSize: '1rem',
    fontWeight: '700',
    color: '#059669',
    backgroundColor: '#d1fae5',
    padding: '8px 12px',
    borderRadius: '8px',
    whiteSpace: 'nowrap'
  },

  productDesc: {
    color: '#64748b',
    marginBottom: '15px',
    fontSize: '0.9rem',
    lineHeight: '1.5'
  },

  addBtn: {
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    padding: '12px 20px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.95rem',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.3s ease'
  },

  addIcon: {
    fontSize: '1.2rem'
  },

  // Selected Products
  selectedProductsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },

  selectedProductCard: {
    display: 'grid',
    gridTemplateColumns: '1fr auto auto auto',
    gap: '15px',
    alignItems: 'center',
    padding: '15px',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    backgroundColor: '#fafafa',
    '@media (max-width: 768px)': {
      gridTemplateColumns: '1fr',
      gap: '10px'
    }
  },

  selectedProductInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },

  selectedProductDetails: {
    flex: '1'
  },

  selectedProductName: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 5px 0'
  },

  selectedProductPrice: {
    fontSize: '0.9rem',
    color: '#64748b',
    margin: '0'
  },

  quantityControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },

  qtyLabel: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#374151'
  },

  qtyInput: {
    width: '70px',
    padding: '8px',
    textAlign: 'center',
    border: '2px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600'
  },

  productAmount: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    textAlign: 'right'
  },

  amountLabel: {
    fontSize: '0.8rem',
    color: '#64748b',
    fontWeight: '500'
  },

  amountValue: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#059669'
  },

  removeProductBtn: {
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1rem',
    transition: 'all 0.3s ease'
  },

  // Quotation Details
  quotationDetailsGrid: {
    display: 'grid',
    gridTemplateColumns: '1.5fr 1fr',
    gap: '30px',
    '@media (max-width: 768px)': {
      gridTemplateColumns: '1fr',
      gap: '20px'
    }
  },

  detailsForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },

  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px'
  },

  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },

  label: {
    fontWeight: '600',
    color: '#374151',
    fontSize: '1rem'
  },

  input: {
    padding: '12px',
    border: '2px solid #e5e7eb',
    borderRadius: '10px',
    fontSize: '1rem',
    transition: 'all 0.3s ease'
  },

  textarea: {
    padding: '12px',
    border: '2px solid #e5e7eb',
    borderRadius: '10px',
    fontSize: '1rem',
    resize: 'vertical',
    fontFamily: 'inherit',
    minHeight: '80px'
  },

  // Summary Card
  summaryCard: {
    backgroundColor: '#f8fafc',
    padding: '25px',
    borderRadius: '15px',
    border: '2px solid #e2e8f0',
    height: 'fit-content',
    position: 'sticky',
    top: '20px'
  },

  summaryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '10px'
  },

  summaryTitle: {
    margin: '0',
    fontSize: '1.3rem',
    color: '#1e293b',
    fontWeight: '600'
  },

  quotationId: {
    fontSize: '0.9rem',
    color: '#64748b',
    fontWeight: '600',
    backgroundColor: '#e2e8f0',
    padding: '6px 10px',
    borderRadius: '6px'
  },

  summaryContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '20px'
  },

  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '1rem'
  },

  summaryAmount: {
    fontWeight: '600',
    color: '#374151'
  },

  discountAmount: {
    color: '#ef4444',
    fontWeight: '600'
  },

  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '15px 0',
    borderTop: '2px solid #1e293b',
    marginTop: '10px',
    fontSize: '1.2rem',
    color: '#1e40af'
  },

  totalAmount: {
    fontSize: '1.4rem',
    color: '#059669'
  },

  actionButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },

  generateBtn: {
    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    color: 'white',
    border: 'none',
    padding: '15px 25px',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '1.1rem',
    fontWeight: '600',
    boxShadow: '0 6px 20px rgba(59, 130, 246, 0.4)',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },

  resetBtn: {
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    padding: '12px 25px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600',
    transition: 'all 0.3s ease'
  },

  // Table View
  tableView: {
    display: 'flex',
    flexDirection: 'column',
    gap: '25px'
  },

  tableHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '15px'
  },

  tableActions: {
    display: 'flex',
    gap: '10px'
  },

  refreshBtn: {
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    padding: '10px 18px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '600',
    transition: 'all 0.3s ease'
  },

  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#64748b'
  },

  emptyIcon: {
    fontSize: '4rem',
    marginBottom: '20px'
  },

  createBtn: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    border: 'none',
    padding: '15px 30px',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '1.1rem',
    fontWeight: '600',
    marginTop: '20px',
    transition: 'all 0.3s ease'
  },

  // Enhanced Table
  quotationsTableContainer: {
    overflow: 'hidden',
    borderRadius: '15px',
    boxShadow: '0 6px 25px rgba(0,0,0,0.08)'
  },

  quotationsTable: {
    background: 'white',
    borderRadius: '15px',
    overflow: 'hidden'
  },

  quotationTableHeader: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 2fr 1fr 0.8fr 1.2fr 1.5fr',
    backgroundColor: '#f8fafc',
    borderBottom: '2px solid #e5e7eb',
    padding: '20px 15px',
    fontWeight: '600',
    fontSize: '1rem',
    color: '#374151'
  },

  quotationRow: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 2fr 1fr 0.8fr 1.2fr 1.5fr',
    borderBottom: '1px solid #e5e7eb',
    padding: '20px 15px',
    transition: 'background-color 0.2s',
    alignItems: 'center',
    ':hover': {
      backgroundColor: '#f8fafc'
    }
  },

  quotationCell: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center'
  },

  quotationIdCell: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },

  statusBadge: {
    backgroundColor: '#10b981',
    color: 'white',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '600',
    textTransform: 'capitalize',
    width: 'fit-content'
  },

  customerCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },

  dateCell: {
    fontSize: '0.95rem',
    color: '#64748b'
  },

  itemsCell: {
    display: 'flex',
    justifyContent: 'center'
  },

  itemsBadge: {
    backgroundColor: '#e2e8f0',
    color: '#64748b',
    padding: '4px 12px',
    borderRadius: '15px',
    fontSize: '0.85rem',
    fontWeight: '600'
  },

  totalCell: {
    textAlign: 'right'
  },

  totalAmountDisplay: {
    color: '#059669',
    fontSize: '1.2rem'
  },

  actionBtns: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
    flexWrap: 'wrap'
  },

  actionBtnPDF: {
    backgroundColor: '#ef4444',
    color: 'white',
    padding: '8px 12px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '1rem',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },

  actionBtnWhatsApp: {
    backgroundColor: '#25d366',
    color: 'white',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600',
    transition: 'all 0.3s ease'
  },

  viewBtn: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600',
    transition: 'all 0.3s ease'
  },

  // Mobile Cards (Hidden by default, shown on mobile)
  mobileCardsContainer: {
    display: 'none',
    flexDirection: 'column',
    gap: '15px',
    '@media (max-width: 768px)': {
      display: 'flex'
    }
  },

  mobileQuotationCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
    border: '1px solid #e5e7eb'
  },

  mobileCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '15px',
    gap: '10px'
  },

  mobileQuotationId: {
    fontSize: '1.1rem',
    color: '#1e293b',
    display: 'block',
    marginBottom: '5px'
  },

  mobileStatusBadge: {
    backgroundColor: '#10b981',
    color: 'white',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '0.75rem',
    fontWeight: '600'
  },

  mobileDate: {
    fontSize: '0.9rem',
    color: '#64748b',
    fontWeight: '500'
  },

  mobileCardContent: {
    marginBottom: '15px'
  },

  mobileCustomerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px'
  },

  mobileCustomerAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.2rem',
    fontWeight: '600'
  },

  mobileCustomerName: {
    fontSize: '1.05rem',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '2px'
  },

  mobileCustomerEmail: {
    fontSize: '0.85rem',
    color: '#64748b'
  },

  mobileCardDetails: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '15px'
  },

  mobileDetailItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '0.9rem'
  },

  mobileItemsBadge: {
    backgroundColor: '#e2e8f0',
    color: '#64748b',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '0.8rem',
    fontWeight: '600'
  },

  mobileTotalAmount: {
    color: '#059669',
    fontSize: '1.1rem'
  },

  mobileCardActions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },

  mobileActionBtn: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '8px 15px',
    borderRadius: '8px',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: '1',
    minWidth: '80px'
  },

  // Popup Styles
  popupOverlay: {
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: '1000',
    backdropFilter: 'blur(5px)',
    padding: '15px'
  },

  customerFormPopup: {
    backgroundColor: 'white',
    borderRadius: '20px',
    width: '100%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)'
  },

  confirmPopup: {
    backgroundColor: 'white',
    borderRadius: '20px',
    width: '100%',
    maxWidth: '500px',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)'
  },

  detailsPopup: {
    backgroundColor: 'white',
    borderRadius: '20px',
    width: '100%',
    maxWidth: '900px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)'
  },

  popupHeader: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '25px',
    borderRadius: '20px 20px 0 0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '15px'
  },

  popupTitle: {
    margin: '0',
    fontSize: '1.5rem',
    fontWeight: '600'
  },

  closeBtn: {
    background: 'rgba(255, 255, 255, 0.2)',
    border: 'none',
    color: 'white',
    fontSize: '1.5rem',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
    flexShrink: 0
  },

  popupBody: {
    padding: '30px'
  },

  popupActions: {
    padding: '25px 30px',
    borderTop: '2px solid #e2e8f0',
    display: 'flex',
    gap: '15px',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: '0 0 20px 20px'
  },

  cancelBtn: {
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    padding: '12px 25px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600',
    transition: 'all 0.3s ease'
  },

  saveBtn: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    border: 'none',
    padding: '12px 25px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600',
    transition: 'all 0.3s ease'
  },

  confirmSaveBtn: {
    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    color: 'white',
    border: 'none',
    padding: '12px 25px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600',
    transition: 'all 0.3s ease'
  },

  // Confirmation Popup
  confirmationCard: {
    backgroundColor: '#f8fafc',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '20px'
  },

  confirmDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },

  confirmRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid #e5e7eb',
    flexWrap: 'wrap',
    gap: '10px'
  },

  confirmLabel: {
    fontWeight: '600',
    color: '#374151',
    fontSize: '1rem'
  },

  confirmValue: {
    color: '#1e293b',
    fontSize: '1rem',
    textAlign: 'right'
  },

  confirmValueAmount: {
    fontWeight: '700',
    color: '#059669',
    fontSize: '1.3rem',
    textAlign: 'right'
  },

  confirmationText: {
    color: '#64748b',
    fontSize: '1rem',
    textAlign: 'center',
    margin: '0'
  },

  // Details Popup
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '25px',
    marginBottom: '30px'
  },

  detailsCard: {
    backgroundColor: '#f8fafc',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0'
  },

  cardTitle: {
    margin: '0 0 15px 0',
    fontSize: '1.2rem',
    color: '#1e293b',
    fontWeight: '600'
  },

  detailItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '0.95rem',
    gap: '15px'
  },

  detailLabel: {
    fontWeight: '600',
    color: '#374151'
  },

  detailValue: {
    color: '#1e293b',
    textAlign: 'right',
    wordBreak: 'break-word'
  },

  // Customer Details in Popup
  customerDetailsFull: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    marginBottom: '15px'
  },

  customerAvatarLarge: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.8rem',
    fontWeight: '600',
    flexShrink: 0
  },

  customerDetailsText: {
    flex: '1'
  },

  // Products Detail Table
  productsDetailTable: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },

  productDetailRow: {
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    gap: '15px',
    padding: '15px',
    backgroundColor: '#ffffff',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    alignItems: 'center'
  },

  productDetailInfo: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px'
  },

  productDetailNumber: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: '0.9rem',
    minWidth: '25px'
  },

  productDetailContent: {
    flex: '1'
  },

  productDetailName: {
    fontWeight: '600',
    color: '#1e293b',
    fontSize: '1rem',
    display: 'block',
    marginBottom: '4px'
  },

  productDetailDesc: {
    color: '#64748b',
    fontSize: '0.85rem',
    margin: '0'
  },

  productDetailStats: {
    display: 'flex',
    gap: '15px',
    alignItems: 'center',
    fontSize: '0.9rem'
  },

  productDetailQty: {
    color: '#64748b',
    fontWeight: '500'
  },

  productDetailPrice: {
    color: '#059669',
    fontWeight: '600'
  },

  productDetailTotal: {
    color: '#1e293b',
    fontWeight: '700',
    fontSize: '1rem'
  },

  // Amount Summary Detail
  amountSummaryDetail: {
    backgroundColor: '#ffffff',
    padding: '20px',
    borderRadius: '10px',
    border: '2px solid #e2e8f0'
  },

  amountDetailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '1rem'
  },

  amountDetailLabel: {
    color: '#374151',
    fontWeight: '500'
  },

  amountDetailValue: {
    color: '#1e293b',
    fontWeight: '600'
  },

  discountDetailAmount: {
    color: '#ef4444',
    fontWeight: '600'
  },

  totalDetailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '15px 0',
    borderTop: '2px solid #1e293b',
    marginTop: '10px',
    fontSize: '1.3rem',
    color: '#1e40af'
  },

  totalDetailLabel: {
    fontWeight: '700'
  },

  totalDetailValue: {
    fontWeight: '700',
    color: '#059669'
  },

  notesText: {
    color: '#374151',
    fontSize: '1rem',
    lineHeight: '1.6',
    margin: '0',
    backgroundColor: '#ffffff',
    padding: '15px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
  },

  // Detail Action Buttons
  detailActionBtnPDF: {
    backgroundColor: '#ef4444',
    color: 'white',
    padding: '12px 25px',
    borderRadius: '10px',
    textDecoration: 'none',
    fontSize: '1rem',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },

  detailActionBtnWhatsApp: {
    backgroundColor: '#25d366',
    color: 'white',
    border: 'none',
    padding: '12px 25px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  }
};

// PDF Styles
const pdfStyles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    fontSize: 9,
    fontFamily: 'Helvetica'
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    borderBottom: 2,
    borderBottomColor: '#667eea',
    paddingBottom: 12
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 5
  },
  documentTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#667eea',
    marginBottom: 5
  },
  quotationId: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: 'bold'
  },
  infoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15
  },
  infoColumn: {
    width: '45%'
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 6,
    textTransform: 'uppercase'
  },
  text: {
    fontSize: 8,
    color: '#374151',
    marginBottom: 2,
    lineHeight: 1.2
  },
  detailsSection: {
    marginBottom: 15,
    paddingBottom: 8,
    borderBottom: 1,
    borderBottomColor: '#e5e7eb'
  },
  table: {
    marginBottom: 15
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#667eea',
    color: 'white'
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 5
  },
  tableCell: {
    padding: 5,
    fontSize: 8,
    textAlign: 'left'
  },
  tableCellHeader: {
    fontWeight: 'bold',
    fontSize: 8
  },
  productDescription: {
    fontSize: 7,
    color: '#64748b',
    fontStyle: 'italic'
  },
  totalsSection: {
    alignItems: 'flex-end',
    marginBottom: 15
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 180,
    paddingVertical: 3
  },
  totalLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#374151'
  },
  totalValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1e293b'
  },
  grandTotal: {
    borderTop: 2,
    borderTopColor: '#667eea',
    paddingTop: 5,
    marginTop: 5,
    backgroundColor: '#f1f5f9',
    padding: 8,
    borderRadius: 3
  },
  notesSection: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 5
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    borderTop: 2,
    borderTopColor: '#667eea',
    paddingTop: 10
  },
  footerText: {
    fontSize: 8,
    color: '#64748b',
    fontStyle: 'italic',
    marginBottom: 2
  }
});

export default QuotationManagement;
