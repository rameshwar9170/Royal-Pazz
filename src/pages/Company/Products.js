import React, { useState, useEffect, useRef } from 'react';
import { ref as dbRef, push, onValue, set, remove, update, get } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { db, storage } from '../../firebase/config';
import {
  FaPlus, FaSearch, FaEdit, FaTrash, FaTimes, FaCheck, FaImage, FaTag,
  FaBox, FaRupeeSign, FaBarcode, FaToggleOn, FaToggleOff, FaTh, FaList, FaUpload,
  FaWindowMinimize, FaWindowMaximize, FaArrowsAlt, FaExpand
} from 'react-icons/fa';


// ✅ Create a placeholder image generator
const createPlaceholderImage = (width = 300, height = 200, text = 'No Image') => {
  return `data:image/svg+xml;base64,${btoa(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f8f9fa"/>
      <text x="50%" y="50%" font-family="Arial" font-size="16" fill="#6c757d" text-anchor="middle" dy=".3em">${text}</text>
    </svg>
  `)}`;
};


// Utility function to extract storage path from URL
const getStoragePathFromUrl = (url) => {
  try {
    const decodedUrl = decodeURIComponent(url);
    const pathMatch = decodedUrl.match(/o\/(.*?)\?/);
    return pathMatch ? pathMatch[1] : null;
  } catch (error) {
    console.error('Error extracting path from URL:', error);
    return null;
  }
};


// ProductCard Component
const ProductCard = ({ product, onEdit, onDelete, onToggleStatus }) => {
  const [mainImageUrl, setMainImageUrl] = useState('');

  useEffect(() => {
    if (product?.imageUrls?.length > 0) {
      setMainImageUrl(product.imageUrls[0]);
    } else {
      setMainImageUrl(createPlaceholderImage());
    }
  }, [product]);

  if (!product) return null;

  const status = product.status || 'active';
  const stockLevel = Number(product.stock) || 0;

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
          alt={product.name || 'Product'}
          onError={(e) => {
            e.target.src = createPlaceholderImage();
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
        
        <div className="product-price-container">
            <div className="product-price">
                <span className="price-label">Dist. Price:</span>
                <FaRupeeSign />
                {parseFloat(product.price || 0).toLocaleString('en-IN', { 
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2 
                })}
            </div>
            <div className="product-price mrp">
                <span className="price-label">MRP:</span>
                <FaRupeeSign />
                {parseFloat(product.mrp || 0).toLocaleString('en-IN', { 
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2 
                })}
            </div>
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
    price: '', // This is now Distribution Price
    stock: '',
    serialNumber: '',
    status: 'active',
    basePrice: '',
    tax: '',
    invoicePrice: '',
    mrp: '',
    imageUrls: [],
    imagePaths: [],
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

  // Draggable modal state
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isFirstRender, setIsFirstRender] = useState(true);
  const modalRef = useRef(null);

  // Load products from Firebase
  useEffect(() => {
    const productsRef = dbRef(db, 'HTAMS/company/products');
    const unsubscribe = onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      const loadedProducts = data 
        ? Object.keys(data).map(key => ({ key, ...data[key] })) 
        : [];
      setAllProducts(loadedProducts);
      console.log('Products loaded:', loadedProducts.length);
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

  // ✅ Draggable functionality
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

  // ✅ Automatically calculate Invoice Price
  useEffect(() => {
    const base = parseFloat(form.basePrice) || 0;
    const tax = parseFloat(form.tax) || 0;
    const invoice = base + tax;
    setForm(prev => ({ ...prev, invoicePrice: invoice > 0 ? invoice.toFixed(2) : '' }));
  }, [form.basePrice, form.tax]);

  // ✅ Utility functions
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

  const handleCancel = () => resetFormState();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
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

  // ✅ Image handling functions
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = [];
    
    for (const file of files) {
      if (file.type.startsWith('image/') && file.size < 10 * 1024 * 1024) {
        validFiles.push(file);
      } else {
        alert(`❌ ${file.name} is either not an image or too large (max 10MB)`);
      }
    }
    
    if (validFiles.length > 0) {
      setImageFiles(prev => [...prev, ...validFiles]);
    }
    
    e.target.value = '';
  };

  const handleRemoveExistingImage = (urlToRemove) => {
    setForm(prev => ({ 
      ...prev, 
      imageUrls: prev.imageUrls.filter(url => url !== urlToRemove),
      imagePaths: prev.imagePaths ? prev.imagePaths.filter((_, index) => prev.imageUrls[index] !== urlToRemove) : []
    }));
  };

  const handleRemoveNewImage = (index) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  // ✅ Upload function
  const uploadImagesToStorage = async () => {
    const imageUrls = [];
    const imagePaths = [];
    
    if (imageFiles.length === 0) {
      return { imageUrls, imagePaths };
    }
    
    console.log(`📤 Starting upload of ${imageFiles.length} images...`);
    
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      
      const fileName = `product_${Date.now()}_${i}.jpg`;
      const imagePath = `product_images/${fileName}`;
      
      try {
        console.log(`📤 Uploading ${i + 1}/${imageFiles.length}...`);
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        const processedBlob = await new Promise((resolve, reject) => {
          img.onload = () => {
            const maxSize = 800;
            let { width, height } = img;
            
            if (width > height) {
              if (width > maxSize) {
                height = height * (maxSize / width);
                width = maxSize;
              }
            } else {
              if (height > maxSize) {
                width = width * (maxSize / height);
                height = maxSize;
              }
            }
            
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob(resolve, 'image/jpeg', 0.7);
          };
          img.onerror = reject;
          img.src = URL.createObjectURL(file);
        });
        
        const imageRef = storageRef(storage, imagePath);
        const uploadResult = await uploadBytes(imageRef, processedBlob);
        const downloadURL = await getDownloadURL(uploadResult.ref);
        
        imageUrls.push(downloadURL);
        imagePaths.push(imagePath);
        
        const progressPercent = Math.round(((i + 1) / imageFiles.length) * 100);
        setUploadProgress(progressPercent);
        
        console.log(`✅ Upload ${i + 1} successful`);
        
      } catch (error) {
        console.error(`❌ Upload failed:`, error);
        throw new Error(`Upload failed: ${error.message}`);
      }
    }
    
    return { imageUrls, imagePaths };
  };

  // ✅ Test Firebase function
  const testFirebaseUpload = async () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      
      ctx.fillStyle = '#4CAF50';
      ctx.fillRect(0, 0, 100, 100);
      ctx.fillStyle = '#fff';
      ctx.font = '16px Arial';
      ctx.fillText('TEST', 30, 55);
      
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
      
      const testPath = `test_${Date.now()}.jpg`;
      const testRef = storageRef(storage, testPath);
      
      console.log('🧪 Testing upload...');
      const result = await uploadBytes(testRef, blob);
      const url = await getDownloadURL(result.ref);
      
      console.log('✅ Test successful:', url);
      alert('✅ Firebase Storage is working! You can now upload product images.');
      
      await deleteObject(testRef);
      
    } catch (error) {
      console.error('❌ Test failed:', error);
      alert(`❌ Firebase test failed: ${error.message}`);
    }
  };

  // ✅ Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.name.trim() || !form.category.trim() || !form.serialNumber.trim() || !form.price || !form.stock || !form.basePrice || !form.mrp) {
      alert('❌ Please fill all required fields');
      return;
    }

    const auth = getAuth();
    if (!auth.currentUser) {
      alert('❌ You must be logged in to upload images');
      return;
    }

    setIsLoading(true);
    setUploadProgress(0);
    
    try {
      let finalImageUrls = [...(form.imageUrls || [])];
      let finalImagePaths = [...(form.imagePaths || [])];
      
      if (imageFiles.length > 0) {
        const { imageUrls: newImageUrls, imagePaths: newImagePaths } = await uploadImagesToStorage();
        finalImageUrls = [...finalImageUrls, ...newImageUrls];
        finalImagePaths = [...finalImagePaths, ...newImagePaths];
      }
      
      const productData = { 
        name: form.name.trim(),
        category: form.category.trim(),
        serialNumber: form.serialNumber.trim(),
        price: parseFloat(form.price), // Distribution Price
        stock: parseInt(form.stock),
        status: form.status || 'active',
        basePrice: parseFloat(form.basePrice),
        tax: parseFloat(form.tax || 0),
        invoicePrice: parseFloat(form.invoicePrice),
        mrp: parseFloat(form.mrp),
        imageUrls: finalImageUrls,
        imagePaths: finalImagePaths,
        timestamp: Date.now(),
        createdAt: editingKey ? (await get(dbRef(db, `HTAMS/company/products/${editingKey}/createdAt`))).val() || Date.now() : Date.now(),
        updatedAt: Date.now()
      };
      
      if (editingKey) {
        await set(dbRef(db, `HTAMS/company/products/${editingKey}`), productData);
        alert('✅ Product updated successfully!');
      } else {
        await push(dbRef(db, 'HTAMS/company/products'), productData);
        alert('✅ Product added successfully!');
      }
      
      resetFormState();
      
    } catch (error) {
      console.error('❌ Error saving product:', error);
      alert(`❌ ${error.message}`);
      setIsLoading(false);
    }
  };

  // ✅ Product handlers
  const handleEdit = (product) => {
    setForm({ 
      name: product.name || '',
      category: product.category || '',
      serialNumber: product.serialNumber || '',
      price: product.price || '', // Distribution Price
      stock: product.stock || '',
      status: product.status || 'active',
      basePrice: product.basePrice || '',
      tax: product.tax || '',
      invoicePrice: product.invoicePrice || '',
      mrp: product.mrp || '',
      imageUrls: product.imageUrls || [],
      imagePaths: product.imagePaths || []
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
      await update(dbRef(db, `HTAMS/company/products/${product.key}`), { 
        status: newStatus,
        updatedAt: Date.now()
      });
    } catch (error) {
      console.error('❌ Error updating status:', error);
      alert(`❌ Failed to update status: ${error.message}`);
    }
  };

  const handleDelete = async (product) => {
    if (window.confirm(`❗ Delete "${product.name}"? This cannot be undone!`)) {
      try {
        if (product.imageUrls?.length > 0) {
          for (const url of product.imageUrls) {
            try {
              const storagePath = getStoragePathFromUrl(url);
              if (storagePath) {
                await deleteObject(storageRef(storage, storagePath));
              }
            } catch (deleteError) {
              console.log('⚠️ Error deleting image:', deleteError.message);
            }
          }
        }
        
        await remove(dbRef(db, `HTAMS/company/products/${product.key}`));
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
        <div>
          {/* <button 
            onClick={testFirebaseUpload}
            style={{
              marginRight: '10px',
              background: '#2196F3',
              color: 'white',
              border: 'none',
              padding: '10px 15px',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            🧪 Test Firebase
          </button> */}
          <button className="add-btn" onClick={showModal}>
            <FaPlus />
            Add Product
          </button>
        </div>
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

      {/* Modal */}
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
                    <label>Base Price (₹) *</label>
                    <input
                      type="number" step="0.01" min="0" name="basePrice"
                      value={form.basePrice} onChange={handleChange} required
                      placeholder="0.00" disabled={isLoading}
                    />
                  </div>

                  <div className="form-group">
                    <label>Tax (₹)</label>
                    <input
                      type="number" step="0.01" min="0" name="tax"
                      value={form.tax} onChange={handleChange}
                      placeholder="0.00" disabled={isLoading}
                    />
                  </div>

                  <div className="form-group">
                    <label>Invoice Price (₹)</label>
                    <input
                      type="number" name="invoicePrice"
                      value={form.invoicePrice} readOnly
                      placeholder="Calculated..." disabled
                      className="calculated-field"
                    />
                  </div>

                  <div className="form-group">
                    <label>Distribution Price (₹) *</label>
                    <input
                      type="number" step="0.01" min="0" name="price"
                      value={form.price} onChange={handleChange} required
                      placeholder="0.00" disabled={isLoading}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>MRP (₹) *</label>
                    <input
                      type="number" step="0.01" min="0" name="mrp"
                      value={form.mrp} onChange={handleChange} required
                      placeholder="0.00" disabled={isLoading}
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

                {/* Image Upload Section */}
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
                    Max 10MB per image. Images will be saved to product_images/ folder.
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

                {/* Progress Section */}
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

      {/* Recommended CSS Styles */}
      <style jsx>{`
        /* Add your existing CSS here */
        .products-dashboard {
            padding: 2rem;
            background-color: #f4f7f9;
        }
        .dashboard-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
        }
        .page-title {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 2rem;
            color: #2c3e50;
        }
        .page-title .count {
            font-size: 1rem;
            color: #7f8c8d;
        }
        .subtitle {
            color: #7f8c8d;
            margin-top: 5px;
        }
        .add-btn {
            background-color: #3498db;
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 1rem;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: background-color 0.3s;
        }
        .add-btn:hover {
            background-color: #2980b9;
        }

        .controls-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: white;
            padding: 1rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            margin-bottom: 2rem;
        }
        .search-wrapper {
            position: relative;
        }
        .search-icon {
            position: absolute;
            left: 15px;
            top: 50%;
            transform: translateY(-50%);
            color: #95a5a6;
        }
        .search-input {
            padding: 10px 15px 10px 40px;
            border: 1px solid #dfe6e9;
            border-radius: 5px;
            width: 300px;
            font-size: 1rem;
            transition: border-color 0.3s, box-shadow 0.3s;
        }
        .search-input:focus {
            outline: none;
            border-color: #3498db;
            box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
        }
        .filter-controls {
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        .filter-select, .sort-select {
            padding: 10px;
            border-radius: 5px;
            border: 1px solid #dfe6e9;
            background-color: #fff;
            font-size: 1rem;
        }
        .view-toggle {
            display: flex;
        }
        .view-toggle .toggle-btn {
            padding: 10px;
            border: 1px solid #dfe6e9;
            background: #fff;
            cursor: pointer;
        }
        .view-toggle .toggle-btn:first-child {
            border-top-left-radius: 5px;
            border-bottom-left-radius: 5px;
        }
        .view-toggle .toggle-btn:last-child {
            border-top-right-radius: 5px;
            border-bottom-right-radius: 5px;
            border-left: none;
        }
        .view-toggle .toggle-btn.active {
            background-color: #3498db;
            color: white;
            border-color: #3498db;
        }

        .products-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 2rem;
        }
        
        .product-card {
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            position: relative;
            transition: transform 0.3s, box-shadow 0.3s;
        }
        .product-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
        }
        .product-card.inactive {
            opacity: 0.6;
        }
        .status-badge {
            position: absolute;
            top: 10px;
            right: 10px;
            padding: 5px 10px;
            border-radius: 5px;
            font-size: 0.8rem;
            font-weight: bold;
            color: white;
            display: flex;
            align-items: center;
            gap: 5px;
            z-index: 2;
        }
        .status-badge.active { background-color: #27ae60; }
        .status-badge.inactive { background-color: #c0392b; }

        .product-image {
            position: relative;
            width: 100%;
            height: 200px;
            background-color: #f8f9fa;
        }
        .product-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .image-count {
            position: absolute;
            bottom: 10px;
            left: 10px;
            background: rgba(0,0,0,0.6);
            color: white;
            padding: 5px 8px;
            border-radius: 5px;
            font-size: 0.8rem;
            display: flex;
            align-items: center;
            gap: 5px;
        }

        .product-content {
            padding: 1rem;
            flex-grow: 1;
        }
        .product-name {
            font-size: 1.2rem;
            color: #34495e;
            margin: 0 0 0.5rem;
        }
        .product-price-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
            gap: 1rem;
        }
        .product-price {
            font-size: 1rem;
            font-weight: bold;
            color: #2c3e50;
            display: flex;
            align-items: center;
            gap: 5px;
        }
        .product-price .price-label {
            font-weight: normal;
            font-size: 0.8rem;
            color: #7f8c8d;
        }
        .product-price.mrp {
            color: #e74c3c;
        }

        .product-details {
            display: flex;
            gap: 1.5rem;
            color: #7f8c8d;
            font-size: 0.9rem;
            margin-bottom: 1rem;
        }
        .detail-item { display: flex; align-items: center; gap: 8px; }
        .detail-icon { color: #95a5a6; }

        .stock-status {
            display: flex;
            align-items: center;
            padding: 8px;
            border-radius: 5px;
            margin-bottom: 1rem;
        }
        .stock-status .stock-icon { font-size: 1.5rem; margin-right: 10px; }
        .stock-info { display: flex; flex-direction: column; }
        .stock-count { font-weight: bold; font-size: 1rem; }
        .stock-label { font-size: 0.8rem; }
        .out-of-stock { background-color: #fde4e1; border-left: 4px solid #e74c3c; }
        .low-stock { background-color: #fff4e0; border-left: 4px solid #f39c12; }
        .medium-stock { background-color: #eaf5ff; border-left: 4px solid #3498db; }
        .high-stock { background-color: #e4f8f0; border-left: 4px solid #2ecc71; }

        .product-actions {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            border-top: 1px solid #ecf0f1;
        }
        .product-actions .btn {
            background: none;
            border: none;
            border-right: 1px solid #ecf0f1;
            padding: 12px;
            cursor: pointer;
            transition: background-color 0.2s, color 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        .product-actions .btn:last-child { border-right: none; }
        .product-actions .btn-edit:hover { background-color: #eaf5ff; color: #3498db; }
        .product-actions .btn-disable:hover { background-color: #fde4e1; color: #c0392b; }
        .product-actions .btn-enable:hover { background-color: #e4f8f0; color: #27ae60; }
        .product-actions .btn-delete:hover { background-color: #fde4e1; color: #c0392b; }


        .draggable-modal {
            width: 800px;
            max-width: 95vw;
            background: white;
            border-radius: 8px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            transition: opacity 0.3s, transform 0.3s, height 0.3s;
            overflow: hidden;
        }
        .draggable-modal.dragging {
            cursor: grabbing;
            user-select: none;
            box-shadow: 0 20px 50px rgba(0,0,0,0.3);
        }
        .draggable-modal.minimized {
            height: 50px;
            width: 300px;
        }

        .draggable-modal-header {
            padding: 1rem;
            background: #2c3e50;
            color: white;
            cursor: grab;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .modal-title { display: flex; align-items: center; gap: 10px; }
        .drag-icon { color: #95a5a6; }
        .move-hint { font-size: 0.8rem; color: #bdc3c7; }
        
        .modal-controls { display: flex; align-items: center; gap: 5px; }
        .control-btn {
            background: none;
            border: none;
            color: #bdc3c7;
            font-size: 1rem;
            padding: 5px;
            border-radius: 3px;
            cursor: pointer;
            transition: background-color 0.2s, color 0.2s;
        }
        .control-btn:hover { background-color: rgba(255,255,255,0.1); color: white; }
        
        .draggable-modal-body {
            padding: 1.5rem;
            max-height: 80vh;
            overflow-y: auto;
        }

        .product-form .form-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-bottom: 1.5rem;
        }
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: bold;
            color: #555;
        }
        .form-group input, .form-group select {
            width: 100%;
            padding: 10px;
            border: 1px solid #ccc;
            border-radius: 4px;
        }
        .form-group input:disabled, .form-group select:disabled {
            background-color: #f2f2f2;
            cursor: not-allowed;
        }
        .calculated-field {
            font-style: italic;
            color: #555;
        }
        .image-section { margin-top: 1.5rem; }
        .upload-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 10px 15px;
            background-color: #3498db;
            color: white;
            border-radius: 5px;
            cursor: pointer;
        }
        .upload-hint { display: block; font-size: 0.8rem; color: #777; margin-top: 5px; }

        .image-previews {
            display: flex;
            flex-wrap: wrap;
            gap: 1rem;
            margin-top: 1rem;
        }
        .preview-item {
            position: relative;
            width: 100px;
            height: 100px;
        }
        .preview-item img {
            width: 100%; height: 100%; object-fit: cover; border-radius: 5px;
        }
        .preview-item .remove-btn {
            position: absolute; top: -5px; right: -5px;
            background: #e74c3c; color: white; border-radius: 50%;
            width: 20px; height: 20px; border: none; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
        }
        .preview-item .image-label {
            position: absolute; bottom: 5px; left: 5px; background: rgba(0,0,0,0.6);
            color: white; padding: 2px 5px; border-radius: 3px; font-size: 0.7rem;
        }

        .progress-section { margin-top: 1.5rem; }
        .progress-bar { width: 100%; background: #eee; border-radius: 5px; height: 10px; }
        .progress-fill { height: 100%; background: #2ecc71; border-radius: 5px; transition: width 0.3s; }
        .progress-text { text-align: center; margin-top: 5px; color: #555; }

        .form-actions {
            margin-top: 2rem;
            display: flex;
            justify-content: flex-end;
            gap: 1rem;
        }
        .cancel-btn, .submit-btn {
            padding: 12px 25px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 1rem;
            font-weight: bold;
        }
        .cancel-btn { background-color: #ecf0f1; color: #34495e; }
        .submit-btn { background-color: #27ae60; color: white; }

        .empty-state { text-align: center; padding: 4rem 2rem; color: #7f8c8d; }
        .empty-icon { font-size: 4rem; margin-bottom: 1rem; }
      `}</style>
    </div>
  );
}

export default Product;
