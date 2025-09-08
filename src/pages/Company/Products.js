import React, { useState, useEffect, useRef } from 'react';
import { ref as dbRef, push, onValue, set, remove, update, get } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../firebase/config';
import {
  FaPlus, FaSearch, FaEdit, FaTrash, FaTimes, FaCheck, FaImage, FaTag,
  FaBox, FaRupeeSign, FaBarcode, FaToggleOn, FaToggleOff, FaTh, FaList, FaUpload,
  FaWindowMinimize, FaWindowMaximize, FaArrowsAlt, FaExpand
} from 'react-icons/fa';

// Professional ProductCard Component
const ProductCard = ({ product, onEdit, onDelete, onToggleStatus }) => {
  const [mainImageUrl, setMainImageUrl] = useState('');

  useEffect(() => {
    if (product?.imageUrls?.length > 0) {
      setMainImageUrl(product.imageUrls[0]);
    } else {
      setMainImageUrl('https://via.placeholder.com/300x200/f8f9fa/6c757d?text=No+Image');
    }
  }, [product]);

  if (!product) return null;

  const status = product.status || 'active';
  const stockLevel = Number(product.stock) || 0;

  // Enhanced stock status with better display
  const getStockStatus = () => {
    if (stockLevel <= 0) return { className: 'out-of-stock', text: 'Out of Stock', icon: '⚠️' };
    if (stockLevel <= 5) return { className: 'low-stock', text: 'Low Stock', icon: '⚠️' };
    if (stockLevel <= 15) return { className: 'medium-stock', text: 'Medium Stock', icon: '📦' };
    return { className: 'high-stock', text: 'In Stock', icon: '✅' };
  };

  const stockInfo = getStockStatus();

  return (
    <div className={`product-card ${status === 'inactive' ? 'inactive' : ''}`}>
      <div className={`status-badge ${status}`}>
        {status === 'active' ? <FaCheck /> : <FaTimes />}
        {status.toUpperCase()}
      </div>

      <div className="product-image">
        <img 
          src={mainImageUrl} 
          alt={product.name}
          onError={(e) => {
            e.target.src = 'https://via.placeholder.com/300x200/f8f9fa/6c757d?text=No+Image';
          }}
        />
        {product.imageUrls?.length > 1 && (
          <div className="image-count">
            <FaImage /> {product.imageUrls.length}
          </div>
        )}
      </div>

      <div className="product-content">
        <h3 className="product-name">{product.name}</h3>
        
        <div className="product-price">
          <FaRupeeSign />
          {parseFloat(product.price || 0).toLocaleString('en-IN', { 
            minimumFractionDigits: 2,
            maximumFractionDigits: 2 
          })}
        </div>

        <div className="product-details">
          <div className="detail-item">
            <FaTag className="detail-icon" />
            <span>{product.category || 'Uncategorized'}</span>
          </div>
          <div className="detail-item">
            <FaBarcode className="detail-icon" />
            <span>{product.serialNumber || 'N/A'}</span>
          </div>
        </div>

        <div className={`stock-status ${stockInfo.className}`}>
          <span className="stock-icon">{stockInfo.icon}</span>
          <div className="stock-info">
            <span className="stock-count">{stockLevel} units</span>
            <span className="stock-label">{stockInfo.text}</span>
          </div>
        </div>
      </div>

      <div className="product-actions">
        <button className="btn btn-edit" onClick={() => onEdit(product)}>
          <FaEdit /> Edit
        </button>
        <button 
          className={`btn ${status === 'active' ? 'btn-disable' : 'btn-enable'}`}
          onClick={() => onToggleStatus(product)}
        >
          {status === 'active' ? <FaToggleOff /> : <FaToggleOn />}
          {status === 'active' ? 'Disable' : 'Enable'}
        </button>
        <button className="btn btn-delete" onClick={() => onDelete(product)}>
          <FaTrash />
        </button>
      </div>
    </div>
  );
};

function Product() {
  const initialFormState = {
    name: '',
    category: '',
    price: '',
    stock: '',
    serialNumber: '',
    status: 'active',
    imageUrls: [],
  };

  // State management
  const [formVisible, setFormVisible] = useState(false);
  const [formMinimized, setFormMinimized] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [form, setForm] = useState(initialFormState);
  const [imageFiles, setImageFiles] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [viewMode, setViewMode] = useState('grid');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Enhanced draggable modal state
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isFirstRender, setIsFirstRender] = useState(true);
  const modalRef = useRef(null);

  // Load products from Firebase Realtime Database
  useEffect(() => {
    const productsRef = dbRef(db, 'HTAMS/company/products');
    const unsubscribe = onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      const loadedProducts = data 
        ? Object.keys(data).map(key => ({ key, ...data[key] })) 
        : [];
      setAllProducts(loadedProducts);
      console.log('Products loaded:', loadedProducts.length);
    }, (error) => {
      console.error('Error loading products:', error);
      alert('❌ Failed to load products. Please check your internet connection.');
    });
    
    return () => unsubscribe();
  }, []);

  // Filter and sort products
  useEffect(() => {
    let filtered = allProducts.filter(product => {
      const matchesSearch = !searchQuery || 
        product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || product.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    });

    filtered.sort((a, b) => {
      switch(sortBy) {
        case 'newest': return (b.timestamp || 0) - (a.timestamp || 0);
        case 'oldest': return (a.timestamp || 0) - (b.timestamp || 0);
        case 'name': return (a.name || '').localeCompare(b.name || '');
        case 'price-low': return (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0);
        case 'price-high': return (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0);
        default: return 0;
      }
    });

    setFilteredProducts(filtered);
  }, [searchQuery, allProducts, filterStatus, sortBy]);

  // Enhanced draggable functionality
  const handleMouseDown = (e) => {
    if (e.target.closest('.draggable-handle') && !e.target.closest('.modal-controls')) {
      setIsDragging(true);
      
      if (modalRef.current) {
        const rect = modalRef.current.getBoundingClientRect();
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }
      
      e.preventDefault();
      e.stopPropagation();
      
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && modalRef.current) {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      const modalWidth = modalRef.current.offsetWidth;
      const modalHeight = modalRef.current.offsetHeight;
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      
      const boundedX = Math.max(0, Math.min(newX, windowWidth - modalWidth));
      const boundedY = Math.max(0, Math.min(newY, windowHeight - modalHeight));
      
      setModalPosition({
        x: boundedX,
        y: boundedY
      });
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isDragging, dragOffset]);

  const centerModal = () => {
    if (modalRef.current) {
      const modalWidth = modalRef.current.offsetWidth;
      const modalHeight = modalRef.current.offsetHeight;
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      
      setModalPosition({
        x: Math.max(0, (windowWidth - modalWidth) / 2),
        y: Math.max(0, (windowHeight - modalHeight) / 2)
      });
    }
  };

  useEffect(() => {
    if (formVisible && isFirstRender) {
      setTimeout(() => {
        centerModal();
        setIsFirstRender(false);
      }, 100);
    }
  }, [formVisible, isFirstRender]);

  useEffect(() => {
    const handleResize = () => {
      if (formVisible && modalRef.current) {
        const modalWidth = modalRef.current.offsetWidth;
        const modalHeight = modalRef.current.offsetHeight;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        setModalPosition(prev => ({
          x: Math.max(0, Math.min(prev.x, windowWidth - modalWidth)),
          y: Math.max(0, Math.min(prev.y, windowHeight - modalHeight))
        }));
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [formVisible]);

  // Utility functions
  const resetFormState = () => {
    setForm(initialFormState);
    setImageFiles([]);
    setFormVisible(false);
    setFormMinimized(false);
    setEditingKey(null);
    setIsLoading(false);
    setUploadProgress(0);
    setIsFirstRender(true);
    setModalPosition({ x: 0, y: 0 });
  };

  // Event handlers
  const handleCancel = () => resetFormState();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    
    // Validate files
    const validFiles = [];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    for (const file of files) {
      // Check file type
      if (!file.type.startsWith('image/')) {
        alert(`❌ ${file.name} is not an image file. Please select only images.`);
        continue;
      }
      
      // Check file size
      if (file.size > maxSize) {
        alert(`❌ ${file.name} is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size is 5MB.`);
        continue;
      }
      
      validFiles.push(file);
    }
    
    if (validFiles.length > 0) {
      setImageFiles(prev => [...prev, ...validFiles]);
      console.log(`✅ Added ${validFiles.length} valid image(s)`);
    }
    
    // Reset file input
    e.target.value = '';
  };

  const handleRemoveExistingImage = (urlToRemove) => {
    setForm(prev => ({ 
      ...prev, 
      imageUrls: prev.imageUrls.filter(url => url !== urlToRemove) 
    }));
  };

  const handleRemoveNewImage = (index) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const toggleMinimize = (e) => {
    e.stopPropagation();
    setFormMinimized(!formMinimized);
  };

  const handleCenterModal = (e) => {
    e.stopPropagation();
    centerModal();
  };

  const handleCloseModal = (e) => {
    e.stopPropagation();
    handleCancel();
  };

  // Validation function
  const validateForm = () => {
    if (!form.name.trim()) {
      alert('❌ Product name is required');
      return false;
    }
    if (!form.category.trim()) {
      alert('❌ Category is required');
      return false;
    }
    if (!form.serialNumber.trim()) {
      alert('❌ Serial number is required');
      return false;
    }
    if (!form.price || parseFloat(form.price) <= 0) {
      alert('❌ Valid price is required');
      return false;
    }
    if (!form.stock || parseInt(form.stock) < 0) {
      alert('❌ Valid stock quantity is required');
      return false;
    }
    return true;
  };

  // Enhanced image upload to Firebase Storage
  const uploadImagesToStorage = async () => {
    const imageUrls = [];
    
    if (imageFiles.length === 0) {
      return imageUrls;
    }
    
    console.log(`📤 Starting upload of ${imageFiles.length} images to Firebase Storage...`);
    
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const timestamp = Date.now();
      const randomId = Math.floor(Math.random() * 10000);
      
      // Clean filename and create unique path
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const imagePath = `product_images/${form.serialNumber}_${timestamp}_${randomId}_${cleanFileName}`;
      
      try {
        console.log(`📤 Uploading image ${i + 1}/${imageFiles.length}: ${imagePath}`);
        
        // Create storage reference
        const imageRef = storageRef(storage, imagePath);
        
        // Upload file to Firebase Storage
        const uploadResult = await uploadBytes(imageRef, file);
        console.log(`✅ Upload successful:`, uploadResult.metadata.name);
        
        // Get download URL
        const downloadURL = await getDownloadURL(uploadResult.ref);
        console.log(`🔗 Download URL obtained:`, downloadURL);
        
        imageUrls.push(downloadURL);
        
        // Update progress
        const progressPercent = Math.round(((i + 1) / imageFiles.length) * 100);
        setUploadProgress(progressPercent);
        console.log(`📊 Upload progress: ${progressPercent}%`);
        
      } catch (uploadError) {
        console.error(`❌ Error uploading image ${i + 1}:`, uploadError);
        throw new Error(`Failed to upload image "${file.name}": ${uploadError.message}`);
      }
    }
    
    console.log(`✅ All ${imageFiles.length} images uploaded successfully`);
    return imageUrls;
  };

  // Enhanced submit handler with proper Firebase integration
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setUploadProgress(0);
    
    try {
      console.log('🚀 Starting product save process...');
      
      // Start with existing image URLs
      let finalImageUrls = [...(form.imageUrls || [])];
      
      // Handle image deletion for editing products
      if (editingKey) {
        console.log('✏️ Editing existing product, checking for deleted images...');
        
        const originalProductSnap = await get(dbRef(db, `HTAMS/company/products/${editingKey}`));
        const originalProduct = originalProductSnap.val();
        
        if (originalProduct?.imageUrls) {
          // Find URLs that were removed
          const urlsToDelete = originalProduct.imageUrls.filter(
            url => !form.imageUrls?.includes(url)
          );
          
          // Delete removed images from Firebase Storage
          for (const url of urlsToDelete) {
            try {
              console.log(`🗑️ Deleting removed image: ${url}`);
              await deleteObject(storageRef(storage, url));
              console.log('✅ Image deleted successfully');
            } catch (deleteError) {
              console.log("⚠️ Image might not exist or already deleted:", deleteError.message);
            }
          }
        }
      }
      
      // Upload new images to Firebase Storage
      if (imageFiles.length > 0) {
        console.log(`📤 Uploading ${imageFiles.length} new images...`);
        const newImageUrls = await uploadImagesToStorage();
        finalImageUrls = [...finalImageUrls, ...newImageUrls];
        console.log(`✅ Total images after upload: ${finalImageUrls.length}`);
      }
      
      // Prepare product data for Realtime Database
      const productData = { 
        name: form.name.trim(),
        category: form.category.trim(),
        serialNumber: form.serialNumber.trim(),
        price: parseFloat(form.price),
        stock: parseInt(form.stock),
        status: form.status || 'active',
        imageUrls: finalImageUrls, // Store Firebase Storage URLs
        timestamp: Date.now(),
        createdAt: editingKey ? (await get(dbRef(db, `HTAMS/company/products/${editingKey}/createdAt`))).val() || Date.now() : Date.now(),
        updatedAt: Date.now()
      };
      
      console.log('💾 Saving product data to Realtime Database:', productData);
      
      // Save to Firebase Realtime Database
      if (editingKey) {
        await set(dbRef(db, `HTAMS/company/products/${editingKey}`), productData);
        console.log('✅ Product updated successfully in database');
        alert('✅ Product updated successfully!');
      } else {
        const newProductRef = await push(dbRef(db, 'HTAMS/company/products'), productData);
        console.log('✅ New product added successfully with ID:', newProductRef.key);
        alert('✅ Product added successfully!');
      }
      
      // Reset form and close modal
      resetFormState();
      
    } catch (error) {
      console.error('❌ Error saving product:', error);
      
      let errorMessage = 'Failed to save product. ';
      if (error.code === 'storage/unauthorized') {
        errorMessage += 'Storage permission denied. Please check Firebase Storage rules.';
      } else if (error.code === 'permission-denied') {
        errorMessage += 'Database permission denied. Please check Firebase Database rules.';
      } else if (error.message.includes('network')) {
        errorMessage += 'Network error. Please check your internet connection.';
      } else {
        errorMessage += error.message || 'Please try again.';
      }
      
      alert(`❌ ${errorMessage}`);
      setIsLoading(false);
    }
  };

  const handleEdit = (product) => {
    console.log('✏️ Editing product:', product.name);
    setForm({ 
      name: product.name || '',
      category: product.category || '',
      serialNumber: product.serialNumber || '',
      price: product.price || '',
      stock: product.stock || '',
      status: product.status || 'active',
      imageUrls: product.imageUrls || []
    });
    setImageFiles([]);
    setEditingKey(product.key);
    setFormVisible(true);
    setFormMinimized(false);
    setIsFirstRender(true);
  };

  const handleToggleStatus = async (product) => {
    try {
      const newStatus = (product.status || 'active') === 'active' ? 'inactive' : 'active';
      console.log(`🔄 Toggling product status: ${product.status} → ${newStatus}`);
      
      await update(dbRef(db, `HTAMS/company/products/${product.key}`), { 
        status: newStatus,
        updatedAt: Date.now()
      });
      
      console.log('✅ Status updated successfully');
    } catch (error) {
      console.error('❌ Error updating status:', error);
      alert(`❌ Failed to update status: ${error.message}`);
    }
  };

  const handleDelete = async (product) => {
    const confirmMessage = `❗ Delete "${product.name}"?\n\n` +
      `This will permanently remove:\n` +
      `• Product details from database\n` +
      `• All associated images from storage\n\n` +
      `This action cannot be undone!`;
    
    if (window.confirm(confirmMessage)) {
      try {
        console.log('🗑️ Deleting product:', product.name);
        
        // Delete all images from Firebase Storage
        if (product.imageUrls?.length > 0) {
          console.log(`🗑️ Deleting ${product.imageUrls.length} images from storage...`);
          
          for (const url of product.imageUrls) {
            try {
              await deleteObject(storageRef(storage, url));
              console.log('✅ Image deleted from storage:', url);
            } catch (deleteError) {
              console.log('⚠️ Image might not exist:', deleteError.message);
            }
          }
        }
        
        // Remove product from Realtime Database
        await remove(dbRef(db, `HTAMS/company/products/${product.key}`));
        console.log('✅ Product deleted from database');
        
        alert('✅ Product deleted successfully!');
        
      } catch (error) {
        console.error('❌ Error deleting product:', error);
        alert(`❌ Failed to delete product: ${error.message}`);
      }
    }
  };

  const showModal = () => {
    setFormVisible(true);
    setFormMinimized(false);
    setIsFirstRender(true);
  };

  return (
    <div className="products-dashboard">
      {/* Header Section */}
      <div className="dashboard-header">
        <div className="header-left">
          <h1 className="page-title">
            <FaBox />
            Products 
            <span className="count">({filteredProducts.length})</span>
          </h1>
          <p className="subtitle">Manage your product inventory</p>
        </div>
        <button className="add-btn" onClick={showModal}>
          <FaPlus />
          Add Product
        </button>
      </div>

      {/* Controls Section */}
      <div className="controls-bar">
        <div className="search-wrapper">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-controls">
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name">Name A-Z</option>
            <option value="price-low">Price Low-High</option>
            <option value="price-high">Price High-Low</option>
          </select>

          <div className="view-toggle">
            <button 
              className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <FaTh />
            </button>
            <button 
              className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <FaList />
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Perfect Draggable Modal */}
      {formVisible && (
        <div
          ref={modalRef}
          className={`draggable-modal ${isDragging ? 'dragging' : ''} ${formMinimized ? 'minimized' : ''}`}
          style={{
            position: 'fixed',
            left: modalPosition.x === 0 ? '50%' : `${modalPosition.x}px`,
            top: modalPosition.y === 0 ? '50%' : `${modalPosition.y}px`,
            transform: modalPosition.x === 0 && modalPosition.y === 0 ? 'translate(-50%, -50%)' : 'none',
            zIndex: 1000
          }}
          onMouseDown={handleMouseDown}
        >
          <div className="draggable-modal-header draggable-handle">
            <div className="modal-title">
              <FaArrowsAlt className="drag-icon" />
              <h3>{editingKey ? 'Edit Product' : 'Add New Product'}</h3>
              <span className="move-hint">Click and drag to move</span>
            </div>
            <div className="modal-controls">
              <button 
                className="control-btn minimize-btn" 
                onClick={toggleMinimize}
                title={formMinimized ? 'Maximize' : 'Minimize'}
              >
                {formMinimized ? <FaWindowMaximize /> : <FaWindowMinimize />}
              </button>
              <button 
                className="control-btn center-btn" 
                onClick={handleCenterModal}
                title="Center Modal"
              >
                <FaExpand />
              </button>
              <button 
                className="control-btn close-btn" 
                onClick={handleCloseModal}
                title="Close"
              >
                <FaTimes />
              </button>
            </div>
          </div>

          {!formMinimized && (
            <div className="draggable-modal-body">
              <form onSubmit={handleSubmit} className="product-form">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Product Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      placeholder="Enter product name"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="form-group">
                    <label>Category *</label>
                    <input
                      type="text"
                      name="category"
                      value={form.category}
                      onChange={handleChange}
                      required
                      placeholder="Enter category"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="form-group">
                    <label>Serial Number *</label>
                    <input
                      type="text"
                      name="serialNumber"
                      value={form.serialNumber}
                      onChange={handleChange}
                      required
                      disabled={!!editingKey || isLoading}
                      placeholder="Enter serial number"
                    />
                  </div>

                  <div className="form-group">
                    <label>Price (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="price"
                      value={form.price}
                      onChange={handleChange}
                      required
                      placeholder="0.00"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="form-group">
                    <label>Stock Quantity *</label>
                    <input
                      type="number"
                      min="0"
                      name="stock"
                      value={form.stock}
                      onChange={handleChange}
                      required
                      placeholder="0"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="form-group">
                    <label>Status</label>
                    <select
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                      disabled={isLoading}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                {/* Enhanced Image Upload Section */}
                <div className="image-section">
                  <label>Product Images</label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    id="image-upload"
                    style={{ display: 'none' }}
                    disabled={isLoading}
                  />
                  <label 
                    htmlFor="image-upload" 
                    className={`upload-btn ${isLoading ? 'disabled' : ''}`}
                  >
                    <FaUpload /> Choose Images
                  </label>
                  <small className="upload-hint">
                    Max 5MB per image. Supported: JPG, PNG, GIF
                  </small>

                  {(form.imageUrls?.length > 0 || imageFiles.length > 0) && (
                    <div className="image-previews">
                      {/* Existing images */}
                      {form.imageUrls?.map((url, index) => (
                        <div key={`existing-${index}`} className="preview-item">
                          <img src={url} alt={`Preview ${index + 1}`} />
                          <button
                            type="button"
                            className="remove-btn"
                            onClick={() => handleRemoveExistingImage(url)}
                            disabled={isLoading}
                            title="Remove image"
                          >
                            <FaTimes />
                          </button>
                          <span className="image-label">Existing</span>
                        </div>
                      ))}
                      
                      {/* New images to upload */}
                      {imageFiles.map((file, index) => (
                        <div key={`new-${index}`} className="preview-item">
                          <img src={URL.createObjectURL(file)} alt={`New ${index + 1}`} />
                          <button
                            type="button"
                            className="remove-btn"
                            onClick={() => handleRemoveNewImage(index)}
                            disabled={isLoading}
                            title="Remove image"
                          >
                            <FaTimes />
                          </button>
                          <span className="image-label">New</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Enhanced Progress Section */}
                {isLoading && (
                  <div className="progress-section">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="progress-text">
                      {uploadProgress > 0 
                        ? `📤 Uploading images... ${uploadProgress}%` 
                        : '🔄 Processing...'
                      }
                    </p>
                  </div>
                )}

                {/* Form Actions */}
                <div className="form-actions">
                  <button 
                    type="button" 
                    className="cancel-btn" 
                    onClick={handleCancel}
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="submit-btn" 
                    disabled={isLoading}
                  >
                    {isLoading 
                      ? '🔄 Saving...' 
                      : editingKey 
                        ? '✏️ Update Product' 
                        : '💾 Save Product'
                    }
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Products Grid Section */}
      <div className="products-section">
        {filteredProducts.length === 0 ? (
          <div className="empty-state">
            <FaBox className="empty-icon" />
            <h3>No Products Found</h3>
            <p>
              {searchQuery || filterStatus !== 'all' 
                ? 'Try adjusting your search or filters' 
                : 'Start by adding your first product'
              }
            </p>
          </div>
        ) : (
          <div className={`products-grid ${viewMode === 'list' ? 'list-view' : ''}`}>
            {filteredProducts.map(product => (
              <ProductCard
                key={product.key}
                product={product}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleStatus={handleToggleStatus}
              />
            ))}
          </div>
        )}
      </div>

      {/* Complete Perfect CSS Styles with Fixed Minimize Functionality */}
      <style jsx>{`
        .products-dashboard {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          position: relative;
        }

        /* Header Styles */
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255, 255, 255, 0.95);
          padding: 24px;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          backdrop-filter: blur(20px);
          margin-bottom: 20px;
        }

        .header-left h1 {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 0 0 4px 0;
          font-size: 28px;
          font-weight: 800;
          color: #1a202c;
        }

        .count {
          color: #718096;
          font-size: 20px;
          font-weight: 600;
        }

        .subtitle {
          margin: 0;
          color: #718096;
          font-size: 16px;
        }

        .add-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 14px 24px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }

        .add-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.5);
        }

        /* Controls Bar Styles */
        .controls-bar {
          display: flex;
          gap: 20px;
          align-items: center;
          background: rgba(255, 255, 255, 0.95);
          padding: 20px;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          margin-bottom: 20px;
          flex-wrap: wrap;
          backdrop-filter: blur(20px);
        }

        .search-wrapper {
          position: relative;
          flex: 1;
          min-width: 300px;
        }

        .search-icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: #a0aec0;
          font-size: 16px;
        }

        .search-input {
          width: 100%;
          padding: 14px 14px 14px 48px;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 16px;
          background: white;
          transition: all 0.3s ease;
        }

        .search-input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
        }

        .filter-controls {
          display: flex;
          gap: 16px;
          align-items: center;
        }

        .filter-select, .sort-select {
          padding: 12px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          background: white;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          min-width: 140px;
        }

        .filter-select:focus, .sort-select:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .view-toggle {
          display: flex;
          background: #f7fafc;
          border-radius: 10px;
          padding: 4px;
          gap: 4px;
        }

        .toggle-btn {
          padding: 10px 14px;
          border: none;
          background: transparent;
          border-radius: 8px;
          cursor: pointer;
          color: #718096;
          transition: all 0.2s ease;
          font-size: 16px;
        }

        .toggle-btn.active {
          background: white;
          color: #667eea;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        /* Perfect Draggable Modal Styles with Fixed Minimize */
        .draggable-modal {
          width: 500px;
          max-width: calc(100vw - 40px);
          background: white;
          border-radius: 16px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          max-height: calc(100vh - 40px);
          display: flex;
          flex-direction: column;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          user-select: none;
          overflow: hidden;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          z-index: 10000;
        }

        .draggable-modal.dragging {
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.4);
          transform: scale(1.02);
          transition: box-shadow 0.2s ease, transform 0.2s ease;
        }

        /* FIXED MINIMIZE STYLES - PROPERLY VISIBLE */
        .draggable-modal.minimized {
          height: 60px !important;
          max-height: 60px !important;
          min-height: 60px !important;
          overflow: visible !important;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2) !important;
          width: 380px !important;
        }

        .draggable-modal.minimized .draggable-modal-header {
          min-height: 60px !important;
          height: 60px !important;
          padding: 12px 20px !important;
        }

        .draggable-modal.minimized .draggable-modal-body {
          display: none !important;
        }

        .draggable-modal.minimized .modal-title {
          flex-direction: row !important;
          align-items: center !important;
          gap: 10px !important;
        }

        .draggable-modal.minimized .modal-title h3 {
          font-size: 16px !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          max-width: 200px !important;
        }

        .draggable-modal.minimized .move-hint {
          display: none !important;
        }

        .draggable-modal.minimized .control-btn {
          min-width: 32px !important;
          height: 32px !important;
          padding: 6px 8px !important;
          font-size: 13px !important;
        }

        .draggable-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 16px 16px 0 0;
          flex-shrink: 0;
          cursor: grab;
          position: relative;
          min-height: 55px;
        }

        .draggable-modal-header:active,
        .draggable-modal.dragging .draggable-modal-header {
          cursor: grabbing;
        }

        .modal-title {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
          pointer-events: none;
          flex-direction: column;
          align-items: flex-start;
        }

        .modal-title h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .drag-icon {
          opacity: 0.8;
          font-size: 16px;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { 
            opacity: 0.8; 
            transform: scale(1);
          }
          50% { 
            opacity: 0.5; 
            transform: scale(1.1);
          }
        }

        .move-hint {
          font-size: 11px;
          opacity: 0.8;
          font-weight: 400;
          margin-top: 2px;
          animation: fadeInOut 3s infinite;
        }

        @keyframes fadeInOut {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 0.4; }
        }

        .modal-controls {
          display: flex;
          gap: 8px;
          pointer-events: auto;
        }

        .control-btn {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          padding: 8px 10px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 34px;
          height: 34px;
        }

        .control-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: scale(1.1);
        }

        .control-btn:active {
          transform: scale(0.95);
        }

        .minimize-btn:hover {
          background: rgba(255, 193, 7, 0.4);
        }

        .center-btn:hover {
          background: rgba(40, 167, 69, 0.4);
        }

        .close-btn:hover {
          background: rgba(220, 53, 69, 0.4);
        }

        .draggable-modal-body {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
          max-height: calc(80vh - 100px);
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 #f1f5f9;
        }

        .draggable-modal-body::-webkit-scrollbar {
          width: 8px;
        }

        .draggable-modal-body::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }

        .draggable-modal-body::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }

        .draggable-modal-body::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        /* Products Section Styles */
        .products-section {
          background: rgba(255, 255, 255, 0.95);
          padding: 24px;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          backdrop-filter: blur(20px);
        }

        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 24px;
        }

        .products-grid.list-view {
          grid-template-columns: 1fr;
        }

        /* Enhanced Product Card Styles */
        .product-card {
          background: white;
          border-radius: 16px;
          padding: 20px;
          position: relative;
          transition: all 0.3s ease;
          border: 1px solid #f1f5f9;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
        }

        .product-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.15);
          border-color: #e2e8f0;
        }

        .product-card.inactive {
          opacity: 0.6;
          filter: grayscale(0.3);
        }

        .status-badge {
          position: absolute;
          top: 16px;
          right: 16px;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .status-badge.active {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }

        .status-badge.inactive {
          background: #fff3cd;
          color: #856404;
          border: 1px solid #ffeaa7;
        }

        .product-image {
          position: relative;
          width: 100%;
          height: 220px;
          border-radius: 12px;
          overflow: hidden;
          background: #f8fafc;
          margin-bottom: 16px;
          border: 1px solid #f1f5f9;
        }

        .product-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }

        .product-card:hover .product-image img {
          transform: scale(1.05);
        }

        .image-count {
          position: absolute;
          bottom: 8px;
          right: 8px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .product-content {
          margin-bottom: 20px;
        }

        .product-name {
          font-size: 20px;
          font-weight: 700;
          color: #1a202c;
          margin: 0 0 12px 0;
          line-height: 1.3;
        }

        .product-price {
          font-size: 24px;
          font-weight: 800;
          color: #22c55e;
          display: flex;
          align-items: center;
          gap: 4px;
          margin-bottom: 16px;
        }

        .product-details {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 16px;
        }

        .detail-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          color: #718096;
          padding: 6px 0;
          border-bottom: 1px solid #f8fafc;
        }

        .detail-icon {
          color: #a0aec0;
          width: 16px;
        }

        /* Enhanced Stock Status Styles */
        .stock-status {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 16px;
          border: 2px solid;
        }

        .stock-icon {
          font-size: 18px;
        }

        .stock-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .stock-count {
          font-weight: 700;
          font-size: 15px;
        }

        .stock-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          opacity: 0.8;
        }

        .stock-status.out-of-stock {
          background: #fef2f2;
          color: #991b1b;
          border-color: #fecaca;
        }

        .stock-status.low-stock {
          background: #fffbeb;
          color: #92400e;
          border-color: #fed7aa;
        }

        .stock-status.medium-stock {
          background: #f0f9ff;
          color: #1e40af;
          border-color: #bfdbfe;
        }

        .stock-status.high-stock {
          background: #f0fdf4;
          color: #166534;
          border-color: #bbf7d0;
        }

        .product-actions {
          display: flex;
          gap: 10px;
        }

        .btn {
          flex: 1;
          padding: 10px 14px;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .btn-edit {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
        }

        .btn-edit:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .btn-enable {
          background: linear-gradient(135deg, #22c55e, #16a34a);
          color: white;
          box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3);
        }

        .btn-enable:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
        }

        .btn-disable {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
          box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
        }

        .btn-disable:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
        }

        .btn-delete {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
          flex: 0 0 auto;
          padding: 10px;
        }

        .btn-delete:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
        }

        /* Form Styles */
        .product-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-weight: 600;
          color: #374151;
          font-size: 14px;
        }

        .form-group input {
          padding: 12px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          transition: all 0.3s ease;
          background: white;
        }

        .form-group input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .form-group input:disabled {
          background: #f8fafc;
          color: #a0aec0;
          cursor: not-allowed;
        }

        /* Image Upload Styles */
        .image-section {
          margin-top: 8px;
        }

        .image-section label {
          display: block;
          font-weight: 600;
          color: #374151;
          margin-bottom: 12px;
          font-size: 14px;
        }

        .upload-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: #f8fafc;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          color: #4a5568;
          transition: all 0.3s ease;
        }

        .upload-btn:hover {
          background: #f1f5f9;
          border-color: #667eea;
          color: #667eea;
          transform: translateY(-1px);
        }

        .image-previews {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          gap: 12px;
          margin-top: 16px;
        }

        .preview-item {
          position: relative;
          aspect-ratio: 1;
          border-radius: 8px;
          overflow: hidden;
          border: 2px solid #e2e8f0;
          transition: all 0.2s ease;
        }

        .preview-item:hover {
          border-color: #667eea;
          transform: scale(1.02);
        }

        .preview-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .remove-btn {
          position: absolute;
          top: 6px;
          right: 6px;
          background: rgba(239, 68, 68, 0.9);
          color: white;
          border: none;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s ease;
        }

        .remove-btn:hover {
          background: #dc2626;
          transform: scale(1.1);
        }

        /* Progress Bar Styles */
        .progress-section {
          margin: 20px 0;
          padding: 16px;
          background: #f8fafc;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background: #e2e8f0;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 12px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #667eea, #764ba2);
          transition: width 0.3s ease;
          border-radius: 4px;
        }

        .progress-section p {
          margin: 0;
          font-size: 14px;
          color: #718096;
          text-align: center;
          font-weight: 600;
        }

        /* Form Actions */
        .form-actions {
          display: flex;
          gap: 16px;
          justify-content: flex-end;
          padding-top: 20px;
          border-top: 1px solid #f1f5f9;
        }

        .cancel-btn, .submit-btn {
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 14px;
        }

        .cancel-btn {
          background: #f8fafc;
          color: #718096;
          border: 2px solid #e2e8f0;
        }

        .cancel-btn:hover {
          background: #f1f5f9;
          color: #4a5568;
          border-color: #d1d5db;
        }

        .submit-btn {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border: none;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
          min-width: 120px;
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 60px 40px;
          color: #718096;
        }

        .empty-icon {
          font-size: 64px;
          color: #cbd5e0;
          margin-bottom: 20px;
        }

        .empty-state h3 {
          margin: 0 0 12px 0;
          font-size: 24px;
          font-weight: 700;
          color: #4a5568;
        }

        .empty-state p {
          margin: 0;
          font-size: 16px;
        }

        /* Perfect Responsive Design */
        @media (max-width: 1200px) {
          .draggable-modal {
            width: calc(100vw - 60px);
            max-width: 600px;
          }
          
          .draggable-modal.minimized {
            width: calc(100vw - 60px) !important;
            max-width: 400px !important;
          }
        }

        @media (max-width: 768px) {
          .products-dashboard {
            padding: 12px;
          }

          .dashboard-header {
            flex-direction: column;
            gap: 16px;
            align-items: stretch;
            text-align: center;
            padding: 20px;
          }

          .controls-bar {
            flex-direction: column;
            align-items: stretch;
            gap: 16px;
            padding: 16px;
          }

          .search-wrapper {
            min-width: auto;
          }

          .filter-controls {
            justify-content: center;
            flex-wrap: wrap;
          }

          .products-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .draggable-modal {
            width: calc(100vw - 20px);
            max-width: none;
            max-height: calc(100vh - 20px);
          }
          
          .draggable-modal.minimized {
            width: calc(100vw - 20px) !important;
            max-width: none !important;
          }

          .draggable-modal-body {
            padding: 16px;
            max-height: calc(100vh - 140px);
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .form-actions {
            flex-direction: column-reverse;
            gap: 12px;
          }

          .cancel-btn, .submit-btn {
            width: 100%;
          }

          .product-actions {
            flex-direction: column;
            gap: 8px;
          }

          .btn-delete {
            flex: 1;
          }

          .image-previews {
            grid-template-columns: repeat(3, 1fr);
          }

          .modal-title {
            align-items: center !important;
            flex-direction: row !important;
          }

          .move-hint {
            display: none;
          }
        }

        @media (max-width: 480px) {
          .products-dashboard {
            padding: 8px;
          }

          .dashboard-header {
            padding: 16px;
          }

          .controls-bar {
            padding: 12px;
          }

          .products-section {
            padding: 16px;
          }

          .draggable-modal {
            width: calc(100vw - 16px);
            border-radius: 12px;
          }
          
          .draggable-modal.minimized {
            width: calc(100vw - 16px) !important;
          }

          .draggable-modal-body {
            padding: 12px;
          }

          .header-left h1 {
            font-size: 22px;
          }

          .count {
            font-size: 16px;
          }

          .product-name {
            font-size: 16px;
          }

          .product-price {
            font-size: 18px;
          }

          .modal-controls {
            gap: 4px;
          }

          .control-btn {
            padding: 6px 8px;
            min-width: 30px;
            height: 30px;
            font-size: 12px;
          }
          
          .draggable-modal.minimized .control-btn {
            min-width: 28px !important;
            height: 28px !important;
            padding: 4px 6px !important;
          }

          .image-previews {
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }
        }

        @media (max-width: 360px) {
          .draggable-modal-header {
            padding: 12px 16px;
          }
          
          .draggable-modal.minimized .draggable-modal-header {
            padding: 10px 16px !important;
          }

          .modal-title h3 {
            font-size: 16px;
          }
          
          .draggable-modal.minimized .modal-title h3 {
            font-size: 14px !important;
            max-width: 150px !important;
          }

          .drag-icon {
            font-size: 14px;
          }

          .form-group input {
            padding: 10px;
          }

          .upload-btn {
            padding: 10px 16px;
          }
        }

        /* Accessibility improvements */
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
          
          .drag-icon {
            animation: none !important;
          }
          
          .move-hint {
            animation: none !important;
          }
        }

        /* High contrast mode support */
        @media (prefers-contrast: high) {
          .draggable-modal {
            border: 3px solid #000;
          }
          
          .control-btn {
            border: 2px solid rgba(255, 255, 255, 0.5);
          }
        }

        /* Focus management for accessibility */
        .control-btn:focus {
          outline: 2px solid rgba(255, 255, 255, 0.8);
          outline-offset: 2px;
        }

        .draggable-handle:focus {
          outline: 2px solid rgba(255, 255, 255, 0.8);
          outline-offset: -2px;
        }
      `}</style>
    </div>
  );
}

export default Product;
