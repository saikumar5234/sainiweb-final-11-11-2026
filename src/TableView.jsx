import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { MaterialReactTable } from 'material-react-table';
import { API_ENDPOINTS, TRANSLATION_CONFIG } from './config.js';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import TranslateIcon from '@mui/icons-material/Translate';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';
import Fade from '@mui/material/Fade';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import { useTranslation } from 'react-i18next';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';

function TableView() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [editField, setEditField] = useState(null); // 'price' | 'images' | 'both' | null
  const [editedData, setEditedData] = useState([]);
  const [saving, setSaving] = useState(false);
  const priceRefs = useRef([]);
  const priceFieldTouched = useRef({}); // Track which price fields have been touched/started editing
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({
    category: '',
    name: { en: '', hi: '', te: '' },
    description: { en: '', hi: '', te: '' },
    price: '',
    imageUrls: ['']
  });
  const [adding, setAdding] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageDialogRowIndex, setImageDialogRowIndex] = useState(null);
  const [imageDialogProductId, setImageDialogProductId] = useState(null); // product id for correct image association
  const [imageDialogEditMode, setImageDialogEditMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [newProductId, setNewProductId] = useState(null);
  const [addImageUploading, setAddImageUploading] = useState(false);
  const [addImageUploadSuccess, setAddImageUploadSuccess] = useState(false);
  const [addImageUploadError, setAddImageUploadError] = useState("");
  const [addImageFile, setAddImageFile] = useState(null);
  const [addImageFiles, setAddImageFiles] = useState([]);
  const [addProductImages, setAddProductImages] = useState([]);
  const [pendingNewProductImages, setPendingNewProductImages] = useState([]);
  const [viewImageIds, setViewImageIds] = useState([]);
  const [viewImagesLoading, setViewImagesLoading] = useState(false);
  const [imageEditSaveSuccess, setImageEditSaveSuccess] = useState(false);
  const [pendingImageFiles, setPendingImageFiles] = useState([]);
  const [pendingDeleteIndexes, setPendingDeleteIndexes] = useState([]);
  const [imageDeleteSuccess, setImageDeleteSuccess] = useState(false);
  const [deletingImageIdx, setDeletingImageIdx] = useState(null);
  const [deleteImageDialogOpen, setDeleteImageDialogOpen] = useState(false);
  const [imageToDeleteIdx, setImageToDeleteIdx] = useState(null);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [priceHistories, setPriceHistories] = useState({});
  const [translating, setTranslating] = useState(false);
  const [translationSuccess, setTranslationSuccess] = useState(false);
  const [rowSelection, setRowSelection] = useState({});
  const [editProductDialogOpen, setEditProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editProductForm, setEditProductForm] = useState({
    category: '',
    name: { en: '', hi: '', te: '' },
    description: { en: '', hi: '', te: '' },
    price: ''
  });
  const [updatingProduct, setUpdatingProduct] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [reorderSuccess, setReorderSuccess] = useState(false);
  const [reorderError, setReorderError] = useState('');
  // Confirmation dialog states
  const [confirmDeleteSelectedOpen, setConfirmDeleteSelectedOpen] = useState(false);
  const [confirmDisableOpen, setConfirmDisableOpen] = useState(false);
  const [confirmEnableOpen, setConfirmEnableOpen] = useState(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [confirmAddProductOpen, setConfirmAddProductOpen] = useState(false);
  const [confirmUpdateProductOpen, setConfirmUpdateProductOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');
  // Get last selected category from localStorage or use empty string
  const [lastSelectedCategory, setLastSelectedCategory] = useState(() => {
    try {
      return localStorage.getItem('lastSelectedCategory') || '';
    } catch {
      return '';
    }
  });
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();

  // Helper to check if ID is numeric
  const isNumericId = id => !isNaN(Number(id));

  // Custom filter function for global search
  // Smart search function: checks if all characters in search query appear in order in the text
  // Example: "ond" matches "almond oil" because o, n, d appear in order
  const smartSearchMatch = (text, searchQuery) => {
    if (!text || !searchQuery) return false;
    const textLower = String(text).toLowerCase();
    const queryLower = String(searchQuery).toLowerCase();
    
    // First try exact substring match (faster)
    if (textLower.includes(queryLower)) {
      return true;
    }
    
    // Then try smart match: all characters in order (not necessarily contiguous)
    let textIndex = 0;
    for (let i = 0; i < queryLower.length; i++) {
      const char = queryLower[i];
      const foundIndex = textLower.indexOf(char, textIndex);
      if (foundIndex === -1) {
        return false; // Character not found
      }
      textIndex = foundIndex + 1; // Continue searching from next position
    }
    return true; // All characters found in order
  };

  const customGlobalFilterFn = (row, columnId, filterValue) => {
    // Handle empty or undefined filter value
    if (!filterValue || String(filterValue).trim() === '') {
      return true;
    }
    
    const searchValue = String(filterValue).toLowerCase().trim();
    const product = row.original;
    
    if (!product) {
      return false;
    }
    
    // Helper function to search in multilingual fields with smart search
    const searchInMultilingual = (field) => {
      if (!field) return false;
      if (typeof field === 'object' && field !== null && !Array.isArray(field)) {
        const values = Object.values(field)
          .filter(v => v != null && v !== '')
          .map(v => String(v).toLowerCase());
        return values.some(v => smartSearchMatch(v, searchValue));
      } else {
        return smartSearchMatch(String(field), searchValue);
      }
    };
    
    // Search in name (all languages) - this is the main field
    if (product.name && searchInMultilingual(product.name)) {
      return true;
    }
    
    // Search in description (all languages)
    if (product.description && searchInMultilingual(product.description)) {
      return true;
    }
    
    // Search in category
    if (product.category && smartSearchMatch(String(product.category), searchValue)) {
      return true;
    }
    
    // Search in price (keep exact match for numbers)
    if (product.price != null && String(product.price).includes(searchValue)) {
      return true;
    }
    
    // Search in status
    const status = product.isDisabled ? 'disabled' : 'active';
    if (smartSearchMatch(status, searchValue)) {
      return true;
    }
    
    // Search in ID (keep exact match for numbers)
    if (product.id && String(product.id).includes(searchValue)) {
      return true;
    }
    
    return false;
  };

  // Fetch products from Spring Boot backend
  const fetchProducts = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.PRODUCTS);
      if (!response.ok) throw new Error('Failed to fetch products');
      const products = await response.json();
      // Adapt the data: imageUrls = imageIds and normalize disabled flag
      // Display order returned from backend is strictly preserved
      const adapted = products
        .filter(p => isNumericId(p.id))
        .map(p => {
          // Normalize various backend flags (boolean, 0/1, string) to a single isDisabled boolean
          const raw =
            p.disabled ??
            p.isDisabled ??
            p.is_disabled;

          let isDisabled = false;
          if (
            raw === true ||
            raw === 'true' ||
            raw === 1 ||
            raw === '1'
          ) {
            isDisabled = true;
          }

          return {
            ...p,
            imageUrls: p.imageIds || [],
            isDisabled,
          };
        });
      setData(adapted);
      setEditedData(adapted);
    } catch (error) {
      setData([]);
      setEditedData([]);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Handle row drag-and-drop reordering
  const handleRowDrop = async (draggingRow, hoveredRow) => {
    if (!draggingRow || !hoveredRow) return;

    const draggingId = Number(draggingRow.original?.id ?? draggingRow.id);
    const hoveredId = Number(hoveredRow.original?.id ?? hoveredRow.id);

    if (!draggingId || !hoveredId || draggingId === hoveredId) return;

    // Use current data list
    const currentList = editMode ? editedData : data;

    const fromIndex = currentList.findIndex(p => Number(p.id) === draggingId);
    const toIndex = currentList.findIndex(p => Number(p.id) === hoveredId);

    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

    // Optimistically update local state so table updates immediately
    const reorderedList = [...currentList];
    const [movedItem] = reorderedList.splice(fromIndex, 1);
    reorderedList.splice(toIndex, 0, movedItem);

    setData(reorderedList);
    setEditedData(reorderedList);

    // Prepare productIds payload for PUT /api/products/reorder
    const productIds = reorderedList
      .filter(p => isNumericId(p.id))
      .map(p => Number(p.id));

    setReordering(true);
    setReorderError('');
    try {
      const response = await fetch(API_ENDPOINTS.PRODUCT_REORDER, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productIds }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save product order (${response.status})`);
      }

      setReorderSuccess(true);
      // Fetch latest ordered items from backend
      await fetchProducts(false);
    } catch (err) {
      console.error('Error saving reordered products:', err);
      setReorderError(err.message || 'Failed to save product order');
      // Revert optimistic change on failure
      await fetchProducts(false);
    } finally {
      setReordering(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  // Listen for category creation events
  useEffect(() => {
    const handleCategoryCreated = () => {
      fetchCategories();
    };
    
    window.addEventListener('categoryCreated', handleCategoryCreated);
    
    return () => {
      window.removeEventListener('categoryCreated', handleCategoryCreated);
    };
  }, []);

  // Fetch categories from backend
  const fetchCategories = async () => {
    setCategoriesLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.CATEGORIES);
      if (response.ok) {
        const data = await response.json();
        // Handle both array and object responses
        const categoriesList = Array.isArray(data) ? data : (data.categories || data.data || []);
        setCategories(categoriesList);
      } else {
        console.error('Failed to fetch categories');
        setCategories([]);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  // Fetch price history for all products (mini chart)
  useEffect(() => {
    const fetchAllPriceHistories = async () => {
      const ids = (editMode ? editedData : data).map(p => p.id).filter(id => !isNaN(Number(id)));
      const histories = {};
      await Promise.all(ids.map(async (id) => {
        try {
          const res = await fetch(API_ENDPOINTS.PRODUCT_PRICE_HISTORY(id));
          if (res.ok) {
            const hist = await res.json();
            histories[id] = hist.map(h => ({
              date: h.changedAt ? h.changedAt.split('T')[0] : '',
              price: h.price
            })).slice(-10); // last 10 points
          }
        } catch {}
      }));
      setPriceHistories(histories);
    };
    fetchAllPriceHistories();
    // eslint-disable-next-line
  }, [data, editedData, editMode]);

  // Focus the first price field when entering edit mode
  useEffect(() => {
    if (editMode && (editField === 'price' || editField === 'both') && priceRefs.current[0]) {
      priceRefs.current[0].focus();
    }
  }, [editMode, editField]);

  const handlePriceChange = (value, rowIndex, isFirstInput = false) => {
    flushSync(() => {
      setEditedData(prev => prev.map((row, idx) => {
        if (idx === rowIndex) {
          // If this is the first input (user started typing), clear the field first
          const newValue = isFirstInput ? value : value;
          return { ...row, price: newValue };
        }
        return row;
      }));
    });
  };

  const handleImageUrlChange = (value, rowIndex, imgIndex) => {
    flushSync(() => {
      setEditedData(prev => prev.map((row, idx) => {
        if (idx === rowIndex) {
          const urls = Array.isArray(row.imageUrls) ? [...row.imageUrls] : [];
          urls[imgIndex] = value;
          return { ...row, imageUrls: urls };
        }
        return row;
      }));
    });
  };

  const handleAddImageUrl = (rowIndex) => {
    flushSync(() => {
      setEditedData(prev => prev.map((row, idx) => {
        if (idx === rowIndex) {
          const urls = Array.isArray(row.imageUrls) ? [...row.imageUrls] : [];
          urls.push('');
          return { ...row, imageUrls: urls };
        }
        return row;
      }));
    });
  };

  const handleDeleteImageUrl = (rowIndex, imgIndex) => {
    flushSync(() => {
      setEditedData(prev => prev.map((row, idx) => {
        if (idx === rowIndex) {
          const urls = Array.isArray(row.imageUrls) ? [...row.imageUrls] : [];
          urls.splice(imgIndex, 1);
          return { ...row, imageUrls: urls };
        }
        return row;
      }));
    });
  };

  const handleSave = async () => {
    setConfirmSaveOpen(false);
    setSaving(true);
    try {
      // Only update rows where price has changed
      const updates = editedData.filter((row, idx) =>
        row.price !== data[idx].price
      );
      await Promise.all(updates.map(async (row) => {
        const response = await fetch(API_ENDPOINTS.PRODUCT_PRICE(row.id), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ price: parseFloat(row.price) }),
        });
        if (!response.ok) throw new Error('Failed to update price');
      }));
      await fetchProducts(); // Refresh data
      setEditMode(false);
    } catch (error) {
      // Optionally show error
    }
    setSaving(false);
  };

  const handleDeleteProduct = async (row) => {
    console.log('Deleting row:', row);
    if (!row || !row.id) {
      setDeleteDialogOpen(false);
      setSaving(false);
      return;
    }
    setDeleteDialogOpen(false);
    setSaving(true);
    try {
      // Hard delete product using backend API
              const response = await fetch(`${API_ENDPOINTS.PRODUCTS}/${row.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete product');
      setData(prev => prev.filter(p => p.id !== row.id));
      setEditedData(prev => prev.filter(p => p.id !== row.id));
    } catch (error) {
      // Optionally show error
    }
    setSaving(false);
  };

  // Handle delete for selected products
  const handleDeleteSelectedProducts = async () => {
    const selectedIds = Object.keys(rowSelection).filter(key => rowSelection[key]);
    if (selectedIds.length === 0) return;
    setConfirmDeleteSelectedOpen(true);
  };

  const confirmDeleteSelectedProducts = async () => {
    const selectedIds = Object.keys(rowSelection).filter(key => rowSelection[key]);
    setConfirmDeleteSelectedOpen(false);
    setSaving(true);
    try {
      await Promise.all(selectedIds.map(async (productId) => {
        const response = await fetch(`${API_ENDPOINTS.PRODUCTS}/${productId}`, {
          method: 'DELETE',
        });
        if (!response.ok) throw new Error(`Failed to delete product ${productId}`);
      }));
      await fetchProducts(); // Refresh data
      setRowSelection({}); // Clear selection
    } catch (error) {
      console.error('Error deleting products:', error);
    }
    setSaving(false);
  };

  // Handle disable for selected products
  const handleDisableSelectedProducts = async () => {
    const selectedIds = Object.keys(rowSelection).filter(key => rowSelection[key]);
    if (selectedIds.length === 0) return;
    setConfirmDisableOpen(true);
  };

  const confirmDisableSelectedProducts = async () => {
    const selectedIds = Object.keys(rowSelection).filter(key => rowSelection[key]);
    setConfirmDisableOpen(false);
    setSaving(true);
    try {
      // Call backend to disable and optimistically update UI
      await Promise.all(selectedIds.map(async (productId) => {
        const response = await fetch(`${API_ENDPOINTS.PRODUCTS}/${productId}/disable`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_disable: true }),
        });
        if (!response.ok) {
          console.warn(`Disable endpoint may not exist for product ${productId}`);
          return;
        }
      }));
      // Optimistically mark disabled in UI
      setData(prev =>
        prev.map(p =>
          selectedIds.includes(String(p.id)) ? { ...p, isDisabled: true } : p
        ),
      );
      setEditedData(prev =>
        prev.map(p =>
          selectedIds.includes(String(p.id)) ? { ...p, isDisabled: true } : p
        ),
      );
      setRowSelection({}); // Clear selection
    } catch (error) {
      console.error('Error disabling products:', error);
    }
    setSaving(false);
  };

  // Handle enable for selected products
  const handleEnableSelectedProducts = async () => {
    const selectedIds = Object.keys(rowSelection).filter(key => rowSelection[key]);
    if (selectedIds.length === 0) return;
    setConfirmEnableOpen(true);
  };

  const confirmEnableSelectedProducts = async () => {
    const selectedIds = Object.keys(rowSelection).filter(key => rowSelection[key]);
    setConfirmEnableOpen(false);
    setSaving(true);
    try {
      await Promise.all(selectedIds.map(async (productId) => {
        const response = await fetch(`${API_ENDPOINTS.PRODUCTS}/${productId}/enable`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_disable: false }),
        });
        if (!response.ok) {
          console.warn(`Enable endpoint may not exist for product ${productId}`);
          return;
        }
      }));
      // Optimistically mark enabled in UI
      setData(prev =>
        prev.map(p =>
          selectedIds.includes(String(p.id)) ? { ...p, isDisabled: false } : p
        ),
      );
      setEditedData(prev =>
        prev.map(p =>
          selectedIds.includes(String(p.id)) ? { ...p, isDisabled: false } : p
        ),
      );
      setRowSelection({}); // Clear selection
    } catch (error) {
      console.error('Error enabling products:', error);
    }
    setSaving(false);
  };

  // Function to translate text using MyMemory API (free, no API key required)
  const translateText = async (text, targetLang) => {
    try {
      // Map language codes for MyMemory API
      const langMap = {
        'hi': 'hi',
        'te': 'te'
      };
      
      const targetLangCode = langMap[targetLang];
      if (!targetLangCode) return '';
      
      const response = await fetch(`${TRANSLATION_CONFIG.MYMEMORY_API}?q=${encodeURIComponent(text)}&langpair=en|${targetLangCode}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.responseStatus === 200) {
          return data.responseData.translatedText;
        }
      }
      return '';
    } catch (error) {
      console.error('Translation error:', error);
      return '';
    }
  };

  // Optimized handlers for immediate text input updates
  const handleNameEnChange = useCallback((e) => {
    const value = e.target.value;
    flushSync(() => {
      setNewProduct(prev => ({
        ...prev,
        name: {
          ...prev.name,
          en: value
        }
      }));
    });
  }, []);

  const handleNameHiChange = useCallback((e) => {
    const value = e.target.value;
    flushSync(() => {
      setNewProduct(prev => ({
        ...prev,
        name: {
          ...prev.name,
          hi: value
        }
      }));
    });
  }, []);

  const handleNameTeChange = useCallback((e) => {
    const value = e.target.value;
    flushSync(() => {
      setNewProduct(prev => ({
        ...prev,
        name: {
          ...prev.name,
          te: value
        }
      }));
    });
  }, []);

  const handleDescriptionEnChange = useCallback((e) => {
    const value = e.target.value;
    flushSync(() => {
      setNewProduct(prev => ({
        ...prev,
        description: {
          ...prev.description,
          en: value
        }
      }));
    });
  }, []);

  const handleDescriptionHiChange = useCallback((e) => {
    const value = e.target.value;
    flushSync(() => {
      setNewProduct(prev => ({
        ...prev,
        description: {
          ...prev.description,
          hi: value
        }
      }));
    });
  }, []);

  const handleDescriptionTeChange = useCallback((e) => {
    const value = e.target.value;
    flushSync(() => {
      setNewProduct(prev => ({
        ...prev,
        description: {
          ...prev.description,
          te: value
        }
      }));
    });
  }, []);

  const handleAddProductFieldChange = (field, value, imgIdx = null, lang = null) => {
    // If category is being changed, save it to localStorage (async, non-blocking)
    if (field === 'category' && value) {
      setLastSelectedCategory(value);
      // Use setTimeout to make localStorage non-blocking
      setTimeout(() => {
        try {
          localStorage.setItem('lastSelectedCategory', value);
        } catch (error) {
          console.warn('Failed to save last selected category to localStorage:', error);
        }
      }, 0);
    }
    
    // Immediate state update for immediate UI feedback
    if (field === 'imageUrls') {
      flushSync(() => {
        setNewProduct(prev => {
          const urls = [...prev.imageUrls];
          urls[imgIdx] = value;
          return { ...prev, imageUrls: urls };
        });
      });
    } else if (field === 'name' || field === 'description') {
      // Direct update for name/description fields for immediate feedback
      flushSync(() => {
        setNewProduct(prev => ({
          ...prev,
          [field]: {
            ...prev[field],
            [lang]: value
          }
        }));
      });
    } else {
      // Use flushSync for all other fields (category, price, etc.) for immediate feedback
      flushSync(() => {
        setNewProduct(prev => ({ ...prev, [field]: value }));
      });
    }
  };

  const handleAddProductAddImage = () => {
    flushSync(() => {
      setNewProduct(prev => ({ ...prev, imageUrls: [...prev.imageUrls, ''] }));
    });
  };

  const handleAddProductDeleteImage = (imgIdx) => {
    flushSync(() => {
      setNewProduct(prev => {
        const urls = [...prev.imageUrls];
        urls.splice(imgIdx, 1);
        return { ...prev, imageUrls: urls };
      });
    });
  };

  // Handle edit product - open dialog with product data
  const handleEditProduct = (product) => {
    // Helper to get localized value
    const getLocalized = (obj) => {
      if (!obj) return '';
      if (typeof obj === 'string') return obj;
      return obj;
    };

    const productName = getLocalized(product.name);
    const productDescription = getLocalized(product.description);

    setEditingProduct(product);
    setEditProductForm({
      category: product.category || '',
      name: {
        en: productName?.en || productName || '',
        hi: productName?.hi || '',
        te: productName?.te || ''
      },
      description: {
        en: productDescription?.en || productDescription || '',
        hi: productDescription?.hi || '',
        te: productDescription?.te || ''
      },
      price: product.price || ''
    });
    setEditProductDialogOpen(true);
  };

  // Handle edit product field changes
  const handleEditProductFieldChange = (field, value, lang = null) => {
    // Immediate state update for immediate UI feedback
    if (field === 'name' || field === 'description') {
      flushSync(() => {
        setEditProductForm(prev => ({
          ...prev,
          [field]: {
            ...prev[field],
            [lang]: value
          }
        }));
      });
    } else {
      // Use flushSync for category, price and other fields for immediate feedback
      flushSync(() => {
        setEditProductForm(prev => ({ ...prev, [field]: value }));
      });
    }
  };

  // Manual translate function for add product dialog
  const handleManualTranslate = async () => {
    const enName = newProduct.name.en?.trim();
    const enDescription = newProduct.description.en?.trim();
    
    if (!enName && !enDescription) {
      return;
    }
    
    setTranslating(true);
    
    try {
      const promises = [];
      
      if (enName) {
        promises.push(
          translateText(enName, 'hi').then(hi => ({ type: 'name', lang: 'hi', text: hi })),
          translateText(enName, 'te').then(te => ({ type: 'name', lang: 'te', text: te }))
        );
      }
      
      if (enDescription) {
        promises.push(
          translateText(enDescription, 'hi').then(hi => ({ type: 'description', lang: 'hi', text: hi })),
          translateText(enDescription, 'te').then(te => ({ type: 'description', lang: 'te', text: te }))
        );
      }
      
      const results = await Promise.all(promises);
      
      setNewProduct(prev => {
        const updated = { ...prev };
        results.forEach(({ type, lang, text }) => {
          if (text) {
            updated[type] = { ...updated[type], [lang]: text };
          }
        });
        return updated;
      });
      
      setTranslationSuccess(true);
      setTimeout(() => setTranslationSuccess(false), 3000);
    } catch (error) {
      console.error('Translation error:', error);
    } finally {
      setTranslating(false);
    }
  };

  // Manual translate function for edit product dialog
  const handleEditManualTranslate = async () => {
    const enName = editProductForm.name.en?.trim();
    const enDescription = editProductForm.description.en?.trim();
    
    if (!enName && !enDescription) {
      return;
    }
    
    setTranslating(true);
    
    try {
      const promises = [];
      
      if (enName) {
        promises.push(
          translateText(enName, 'hi').then(hi => ({ type: 'name', lang: 'hi', text: hi })),
          translateText(enName, 'te').then(te => ({ type: 'name', lang: 'te', text: te }))
        );
      }
      
      if (enDescription) {
        promises.push(
          translateText(enDescription, 'hi').then(hi => ({ type: 'description', lang: 'hi', text: hi })),
          translateText(enDescription, 'te').then(te => ({ type: 'description', lang: 'te', text: te }))
        );
      }
      
      const results = await Promise.all(promises);
      
      setEditProductForm(prev => {
        const updated = { ...prev };
        results.forEach(({ type, lang, text }) => {
          if (text) {
            updated[type] = { ...updated[type], [lang]: text };
          }
        });
        return updated;
      });
      
      setTranslationSuccess(true);
      setTimeout(() => setTranslationSuccess(false), 3000);
    } catch (error) {
      console.error('Translation error:', error);
    } finally {
      setTranslating(false);
    }
  };

  // Handle update product
  const handleUpdateProduct = async () => {
    if (!editingProduct || !editingProduct.id) return;
    setConfirmUpdateProductOpen(true);
  };

  const confirmUpdateProduct = async () => {
    if (!editingProduct || !editingProduct.id) return;
    setConfirmUpdateProductOpen(false);
    setUpdatingProduct(true);
    try {
      const response = await fetch(API_ENDPOINTS.PRODUCT_UPDATE(editingProduct.id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: editProductForm.category,
          nameJson: JSON.stringify(editProductForm.name),
          descriptionJson: JSON.stringify(editProductForm.description)
        })
      });
      if (!response.ok) throw new Error('Failed to update product');
      await fetchProducts(); // Refresh data
      setEditProductDialogOpen(false);
      setEditingProduct(null);
      setEditProductForm({
        category: '',
        name: { en: '', hi: '', te: '' },
        description: { en: '', hi: '', te: '' },
        price: ''
      });
    } catch (error) {
      console.error('Error updating product:', error);
    }
    setUpdatingProduct(false);
  };

  // Handle close edit product dialog
  const handleCloseEditProductDialog = () => {
    setEditProductDialogOpen(false);
    setEditingProduct(null);
    setEditProductForm({
      category: '',
      name: { en: '', hi: '', te: '' },
      description: { en: '', hi: '', te: '' },
      price: ''
    });
  };

  const handleAddProduct = async () => {
    // Validate that category is selected
    if (!newProduct.category || newProduct.category.trim() === '') {
      alert('Please select a category before adding the product');
      return;
    }
    setConfirmAddProductOpen(true);
  };

  const confirmAddProduct = async () => {
    setConfirmAddProductOpen(false);
    setAdding(true);
    try {
      // Send product details to backend
              const response = await fetch(API_ENDPOINTS.PRODUCTS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: newProduct.category,
          name: newProduct.name, // Send complete multilingual object
          description: newProduct.description, // Send complete multilingual object
          price: parseFloat(newProduct.price)
        })
      });
      if (!response.ok) throw new Error('Failed to add product');
      const created = await response.json();
      if (isNumericId(created.id)) {
        // Add initial price to price history using the same price update endpoint
        try {
          await fetch(API_ENDPOINTS.PRODUCT_PRICE(created.id), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              price: parseFloat(newProduct.price)
            }),
          });
        } catch (priceHistoryError) {
          // If price history creation fails, log but don't block product creation
          console.warn('Failed to add initial price to history:', priceHistoryError);
        }
        
        setData(prev => [...prev, { ...created, imageUrls: [] }]);
        setEditedData(prev => [...prev, { ...created, imageUrls: [] }]);
        setNewProductId(created.id);
        setAddProductImages([]);
        
        // Upload all pending images if any
        if (pendingNewProductImages.length > 0) {
          setAddImageUploading(true);
          try {
            const uploadPromises = pendingNewProductImages.map(async (file) => {
              const formData = new FormData();
              formData.append('image', file);
              const response = await fetch(API_ENDPOINTS.PRODUCT_IMAGES(created.id), {
                method: 'POST',
                body: formData,
              });
              if (response.ok) {
                const { imageId } = await response.json();
                return imageId;
              }
              return null;
            });
            
            const uploadedImageIds = (await Promise.all(uploadPromises)).filter(id => id !== null);
            setAddProductImages(uploadedImageIds);
            
            // Update product in table
            setData(prev => prev.map(p => p.id === created.id ? { ...p, imageUrls: uploadedImageIds } : p));
            setEditedData(prev => prev.map(p => p.id === created.id ? { ...p, imageUrls: uploadedImageIds } : p));
            
            // Clear pending images
            setPendingNewProductImages([]);
            fetchProducts();
          } catch (error) {
            console.error('Error uploading pending images:', error);
          }
          setAddImageUploading(false);
        }
        
        // Save the category to localStorage after successful product creation
        if (newProduct.category) {
          setLastSelectedCategory(newProduct.category);
          try {
            localStorage.setItem('lastSelectedCategory', newProduct.category);
          } catch (error) {
            console.warn('Failed to save last selected category to localStorage:', error);
          }
        }
        
        // Close dialog and reset form after successful product creation
        setAddDialogOpen(false);
        setNewProductId(null);
        setAddProductImages([]);
        setAddImageFile(null);
        setAddImageFiles([]);
        setPendingNewProductImages([]);
        setAddImageUploadSuccess(false);
        setAddImageUploadError("");
        // Reset form but keep the last selected category
        setNewProduct({
          category: lastSelectedCategory || '', // Preserve last selected category
          name: { en: '', hi: '', te: '' },
          description: { en: '', hi: '', te: '' },
          price: '',
          imageUrls: ['']
        });
        // Refresh products to ensure UI is in sync
        await fetchProducts();
      }
    } catch (error) {
      // Optionally show error
      console.error('Error adding product:', error);
    }
    setAdding(false);
  };

  const handleEdit = () => {
    setEditMode(true);
    setEditField('both');
    setRowSelection({}); // Clear selection when entering edit mode
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setEditField(null);
    setEditedData(data);
    setRowSelection({}); // Clear selection when exiting edit mode
  };

  const handleOpenImageDialog = async (productId, edit = false) => {
    setImageDialogProductId(productId);
    setImageDialogRowIndex(null); // no longer used for lookups; keep for any legacy refs
    setImageDialogEditMode(edit);
    setImageDialogOpen(true);
    // Reset upload states when opening in edit mode
    if (edit) {
      setPendingImageFiles([]);
      setUploadError("");
      setUploadSuccess(false);
      setImageEditSaveSuccess(false);
    }
    // Only fetch images for view mode - use productId so we always show the correct product's images
    if (!edit) {
      setViewImagesLoading(true);
      setViewImageIds([]);
      if (productId != null && !isNaN(Number(productId))) {
        try {
          const res = await fetch(API_ENDPOINTS.PRODUCT_IMAGES(productId));
          if (res.ok) {
            const ids = await res.json();
            setViewImageIds(ids);
          }
        } catch (e) {
          setViewImageIds([]);
        }
      }
      setViewImagesLoading(false);
    }
  };

  const handleCloseImageDialog = () => {
    setImageDialogOpen(false);
    setImageDialogRowIndex(null);
    setImageDialogProductId(null);
    setImageDialogEditMode(false);
    setPendingImageFiles([]);
    setUploadError("");
    setUploadSuccess(false);
    fetchProducts(); // Ensure UI is in sync after all edits
  };

  // Resolve current product for image dialog by ID (avoids wrong product when table is filtered/sorted)
  const imageDialogProduct = useMemo(() => {
    if (imageDialogProductId == null) return null;
    const found = editedData.find(p => String(p.id) === String(imageDialogProductId));
    return found ?? null;
  }, [imageDialogProductId, editedData]);

  const handleImageDialogUrlChange = (value, imgIdx) => {
    if (imageDialogProductId == null) return;
    flushSync(() => {
      setEditedData(prev => prev.map((row) => {
        if (String(row.id) !== String(imageDialogProductId)) return row;
        const urls = Array.isArray(row.imageUrls) ? [...row.imageUrls] : [];
        urls[imgIdx] = value;
        return { ...row, imageUrls: urls };
      }));
    });
  };

  const handleImageDialogAddImage = () => {
    if (imageDialogProductId == null) return;
    flushSync(() => {
      setEditedData(prev => prev.map((row) => {
        if (String(row.id) !== String(imageDialogProductId)) return row;
        const urls = Array.isArray(row.imageUrls) ? [...row.imageUrls] : [];
        urls.push('');
        return { ...row, imageUrls: urls };
      }));
    });
  };

  // Mark image for deletion (no delete yet)
  const handleImageDialogDeleteImage = async (imgIdx) => {
    if (imageDialogProductId == null) return;
    const product = imageDialogProduct;
    const productId = product?.id;
    const imageId = product?.imageUrls?.[imgIdx];
    
    // Validate inputs
    if (!imageId) {
      console.error('No image ID found at index:', imgIdx);
      setUploadError('Cannot delete: No image ID found.');
      return;
    }
    
    if (!productId || isNaN(Number(productId))) {
      console.error('Invalid product ID:', productId);
      setUploadError('Cannot delete: Invalid product ID.');
      return;
    }
    
    // Check if imageId is a valid number (for backend images)
    if (isNaN(Number(imageId))) {
      console.error('Invalid image ID (not a number):', imageId);
      // If it's not a number, it might be a URL or empty string - just remove from local state
      const updatedImageUrls = (product.imageUrls || []).filter((id, idx) => idx !== imgIdx);
      setEditedData(prev => prev.map((row) => {
        if (String(row.id) !== String(imageDialogProductId)) return row;
        return { ...row, imageUrls: updatedImageUrls };
      }));
      return;
    }
    
    setDeletingImageIdx(imgIdx);
    setUploadError("");
    
    try {
      // Delete the image file from backend
      const deleteResponse = await fetch(API_ENDPOINTS.PRODUCT_IMAGE_DELETE(imageId), {
        method: 'DELETE',
      });
      
      if (deleteResponse.ok) {
        // Image deleted successfully - backend should automatically update the product's image list
        setImageDeleteSuccess(true);
        setUploadSuccess(true);
        
        // Refresh products from backend to get the updated image list
        await fetchProducts();
        
        // Update local state to reflect the deletion immediately
        const updatedImageUrls = (product.imageUrls || []).filter((id, idx) => idx !== imgIdx);
        setEditedData(prev => prev.map((row) => {
          if (String(row.id) !== String(imageDialogProductId)) return row;
          return { ...row, imageUrls: updatedImageUrls };
        }));
        
        // Clear success message after a delay
        setTimeout(() => {
          setImageDeleteSuccess(false);
          setUploadSuccess(false);
        }, 2000);
      } else {
        const errorText = await deleteResponse.text();
        console.error('Failed to delete image:', errorText);
        setUploadError('Failed to delete image from server.');
      }
    } catch (e) {
      console.error('Error deleting image:', e);
      setUploadError('Error deleting image. Please try again.');
    }
    setDeletingImageIdx(null);
  };

  const handleSaveImages = async () => {
    if (imageDialogProductId == null) return;
    const product = imageDialogProduct;
    const productId = product?.id;
    if (!productId || isNaN(Number(productId))) return;
    // Start with current image IDs, remove those marked for deletion
    let imageIds = (product.imageUrls || []).filter((id, idx) => !!id && !isNaN(Number(id)) && !pendingDeleteIndexes.includes(idx));
    // Upload all pending files
    for (const file of pendingImageFiles) {
      const formData = new FormData();
      formData.append('image', file);
      try {
        const response = await fetch(API_ENDPOINTS.PRODUCT_IMAGES(productId), {
          method: 'POST',
          body: formData,
        });
        if (response.ok) {
          const { imageId } = await response.json();
          imageIds.push(imageId);
        }
      } catch (e) {
        // Optionally show error
      }
    }
    setPendingImageFiles([]);
    setPendingDeleteIndexes([]);
    
    // Backend should automatically update the product's image list when images are uploaded/deleted
    // Just refresh the data from backend to ensure UI is in sync
    if (imageIds.length > 0 || pendingImageFiles.length > 0) {
      setImageEditSaveSuccess(true);
      await fetchProducts();
      setEditMode(false);
      setEditField(null);
      setImageDialogEditMode(false);
      setImageDialogOpen(false);
    }
  };

  // Add this helper to get image URL from backend
  const getProductImageUrl = (imageId) => imageId ? API_ENDPOINTS.PRODUCT_IMAGE(imageId) : '';

  // In the image dialog, add file upload logic
  // Add image file to pending list (no upload yet)
  const handleImageFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setPendingImageFiles(prev => [...prev, ...Array.from(e.target.files)]);
    }
  };

  const handleImageFileUpload = async (file) => {
    if (!file || imageDialogProductId == null) return;
    const productId = imageDialogProductId;
    // Only allow upload if productId is a number
    if (!productId || isNaN(Number(productId))) {
      setUploadError("Cannot upload image: Product ID is not a valid number. Please use products created via backend only.");
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);
    try {
      const response = await fetch(API_ENDPOINTS.PRODUCT_IMAGES(productId), {
        method: 'POST',
        body: formData,
      });
      if (response.ok) {
        const { imageId } = await response.json();
        setEditedData(prev => prev.map((row) => {
          if (String(row.id) !== String(imageDialogProductId)) return row;
          const imageIds = Array.isArray(row.imageUrls) ? [...row.imageUrls] : [];
          imageIds.push(imageId);
          return { ...row, imageUrls: imageIds };
        }));
        setUploadSuccess(true);
        setSelectedImageFile(null);
      }
    } catch (error) {
      // Optionally show error
    }
    setUploading(false);
  };

  const handleAddImageFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAddImageFile(file);
      setAddImageFiles([file]);
    }
    e.target.value = '';
  };

  const handleAddMultipleImageFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setAddImageFiles(files);
      setAddImageFile(files[0]); // Keep for backward compatibility
    }
    e.target.value = '';
  };

  const handlePendingImageSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setPendingNewProductImages(prev => [...prev, ...files]);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleRemovePendingImage = (index) => {
    setPendingNewProductImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleClearAllPendingImages = () => {
    setPendingNewProductImages([]);
  };

  const handleAddImageFileUpload = async () => {
    if ((!addImageFile && addImageFiles.length === 0) || !newProductId || isNaN(Number(newProductId))) {
      setAddImageUploadError('Cannot upload image: Product ID is not valid or no image selected.');
      return;
    }
    setAddImageUploading(true);
    setAddImageUploadError('');
    setAddImageUploadSuccess(false);
    
    const filesToUpload = addImageFiles.length > 0 ? addImageFiles : (addImageFile ? [addImageFile] : []);
    
    try {
      const uploadPromises = filesToUpload.map(async (file) => {
        const formData = new FormData();
        formData.append('image', file);
        const response = await fetch(API_ENDPOINTS.PRODUCT_IMAGES(newProductId), {
          method: 'POST',
          body: formData,
        });
        if (response.ok) {
          const { imageId } = await response.json();
          return imageId;
        }
        return null;
      });
      
      const uploadedImageIds = (await Promise.all(uploadPromises)).filter(id => id !== null);
      
      if (uploadedImageIds.length > 0) {
        setAddProductImages(prev => [...prev, ...uploadedImageIds]);
        setAddImageUploadSuccess(true);
        // Also update the product in table
        setData(prev => prev.map(p => p.id === newProductId ? { ...p, imageUrls: [...(p.imageUrls || []), ...uploadedImageIds] } : p));
        setEditedData(prev => prev.map(p => p.id === newProductId ? { ...p, imageUrls: [...(p.imageUrls || []), ...uploadedImageIds] } : p));
        // Refetch products to ensure UI is in sync
        fetchProducts();
      } else {
        setAddImageUploadError('Failed to upload images.');
      }
      
      setAddImageFile(null);
      setAddImageFiles([]);
    } catch (error) {
      setAddImageUploadError('Image upload failed.');
    }
    setAddImageUploading(false);
  };

  const handleCloseAddDialog = () => {
    setAddDialogOpen(false);
    setNewProductId(null);
    setAddProductImages([]);
    setAddImageFile(null);
    setAddImageFiles([]);
    setPendingNewProductImages([]);
    setAddImageUploadSuccess(false);
    setAddImageUploadError("");
    // Reset form but keep the last selected category
    setNewProduct({
      category: lastSelectedCategory || '', // Preserve last selected category
      name: { en: '', hi: '', te: '' },
      description: { en: '', hi: '', te: '' },
      price: '',
      imageUrls: ['']
    });
    // Refetch products to ensure UI is in sync
    fetchProducts();
  };

  const handleUploadPendingImage = async () => {
    if (imageDialogProductId == null || pendingImageFiles.length === 0) return;
    const product = imageDialogProduct;
    const productId = product?.id;
    if (!productId || isNaN(Number(productId))) return;
    
    setUploading(true);
    let newImageIds = [];
    
    // Upload all pending files
    for (const file of pendingImageFiles) {
      const formData = new FormData();
      formData.append('image', file);
      try {
        const response = await fetch(API_ENDPOINTS.PRODUCT_IMAGES(productId), {
          method: 'POST',
          body: formData,
        });
        if (response.ok) {
          const { imageId } = await response.json();
          newImageIds.push(imageId);
        }
      } catch (e) {
        console.error('Error uploading image:', e);
      }
    }
    
    // Update local state with new image IDs immediately for better UX
    const updatedImageIds = [...(product.imageUrls || []).filter(id => !!id && !isNaN(Number(id))), ...newImageIds];
    
    setEditedData(prev => prev.map((row) => {
      if (String(row.id) !== String(imageDialogProductId)) return row;
      return { ...row, imageUrls: updatedImageIds };
    }));
    
    // Backend should automatically update the product's image list when images are uploaded
    // Just refresh the data from backend to ensure UI is in sync
    if (newImageIds.length > 0) {
      setUploadSuccess(true);
      setPendingImageFiles([]);
      // Refresh products from backend to get the updated image list
      await fetchProducts();
    } else {
      setUploadError('No images were uploaded successfully.');
    }
    
    setUploading(false);
  };

  const handleRequestDeleteImage = (imgIdx) => {
    setImageToDeleteIdx(imgIdx);
    setDeleteImageDialogOpen(true);
  };
  const handleConfirmDeleteImage = async () => {
    if (imageToDeleteIdx !== null) {
      await handleImageDialogDeleteImage(imageToDeleteIdx);
    }
    setDeleteImageDialogOpen(false);
    setImageToDeleteIdx(null);
  };
  const handleCancelDeleteImage = () => {
    setDeleteImageDialogOpen(false);
    setImageToDeleteIdx(null);
  };

  // Helper to get all dates in range (copied from PriceAnalytics)
  const getDateRange = (days) => {
    const dates = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  };
  // Build chart data with filled missing days (copied from PriceAnalytics)
  const buildContinuousChartData = (history, days = 10) => {
    if (!history.length) return [];
    const dateRange = getDateRange(days);
    const priceMap = {};
    history.forEach(entry => { priceMap[entry.date] = entry.price; });
    let lastPrice = history[0].price;
    return dateRange.map(date => {
      if (priceMap[date] !== undefined) {
        lastPrice = priceMap[date];
      }
      return {
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        price: lastPrice
      };
    });
  };

  const columns = useMemo(
    () => [
      {
        header: 'S. No.',
        id: 'serial',
        size: 60,
        Cell: ({ row }) => row.index + 1,
      },
      {
        accessorKey: 'isDisabled',
        header: 'Status',
        size: 90,
        Cell: ({ row }) => {
          const disabled = !!row.original?.isDisabled;
          return (
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, color: disabled ? 'error.main' : 'success.main' }}
            >
              {disabled ? 'Disabled' : 'Active'}
            </Typography>
          );
        },
      },
      {
        accessorKey: 'name',
        header: 'Product Name',
        filterFn: (row, columnId, filterValue) => {
          const product = row.original;
          const searchValue = String(filterValue || '').toLowerCase().trim();
          if (!searchValue) return true;
          
          if (product.name) {
            if (typeof product.name === 'object') {
              const nameValues = Object.values(product.name)
                .filter(v => v != null && v !== '')
                .map(v => String(v).toLowerCase());
              return nameValues.some(v => smartSearchMatch(v, searchValue));
            } else {
              return smartSearchMatch(String(product.name), searchValue);
            }
          }
          return false;
        },
        Cell: ({ cell, row }) => {
          const value = cell.getValue();
          const displayValue = typeof value === 'object' && value !== null
            ? value[i18n.language] || value.en || Object.values(value)[0] || ''
            : value;
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ flex: 1 }}>
                {displayValue}
              </Typography>
              <Tooltip title="Edit Name">
                <span>
                  <Button
                    color="primary"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditProduct(row.original);
                    }}
                    disabled={saving || row.original?.isDisabled}
                    sx={{ minWidth: 32, minHeight: 32, p: 0.5 }}
                  >
                    <EditIcon fontSize="small" />
                  </Button>
                </span>
              </Tooltip>
            </Box>
          );
        },
      },
      {
        accessorKey: 'description',
        header: 'Description',
        filterFn: (row, columnId, filterValue) => {
          const product = row.original;
          const searchValue = String(filterValue || '').toLowerCase().trim();
          if (!searchValue) return true;
          
          if (product.description) {
            if (typeof product.description === 'object') {
              const descValues = Object.values(product.description)
                .filter(v => v != null && v !== '')
                .map(v => String(v).toLowerCase());
              return descValues.some(v => smartSearchMatch(v, searchValue));
            } else {
              return smartSearchMatch(String(product.description), searchValue);
            }
          }
          return false;
        },
        Cell: ({ cell }) => {
          const value = cell.getValue();
          if (typeof value === 'object' && value !== null) {
            return value[i18n.language] || value.en || Object.values(value)[0] || '';
          }
          return value;
        },
      },
      {
        accessorKey: 'imageUrls',
        header: 'Images',
        Cell: ({ cell, row }) => {
          if (!editMode) {
            // View mode: show icon and text with tooltip
            return (
              <Tooltip title="View Images">
                <Button
                  variant="outlined"
                      size="small"
                  sx={{ minWidth: 0, p: 1, borderRadius: 2, gap: 1 }}
                  onClick={() => handleOpenImageDialog(row.original.id, false)}
                  startIcon={<VisibilityIcon fontSize="small" />}
                >
                  View Images
                </Button>
              </Tooltip>
            );
          }
          // Edit mode: show icon and text with tooltip
          return (
            <Tooltip title="Edit Images">
              <Button
                variant="outlined"
                size="small"
                color="info"
                sx={{ minWidth: 0, p: 1, borderRadius: 2, gap: 1 }}
                onClick={() => handleOpenImageDialog(row.original.id, true)}
                startIcon={<EditIcon fontSize="small" />}
              >
                Edit Images
              </Button>
            </Tooltip>
          );
        },
        size: 120,
      },
      {
        accessorKey: 'price',
        header: 'Price (₹)',
        Cell: ({ cell, row }) =>
          editMode && (editField === 'price' || editField === 'both') ? (
            <TextField
              type="number"
              size="small"
              value={editedData[row.index]?.price || ''}
              onChange={e => {
                const rowIndex = row.index;
                const newValue = e.target.value;
                handlePriceChange(newValue, rowIndex, false);
              }}
              onFocus={(e) => {
                const rowIndex = row.index;
                const fieldKey = `price_${rowIndex}`;
                // Select all text when field gets focus (Excel-like behavior)
                e.target.select();
                // Reset touched state when field gets focus (unless navigating with arrows)
                // This allows the field to be cleared when user starts typing
                if (!priceFieldTouched.current[`navigating_${rowIndex}`]) {
                  priceFieldTouched.current[fieldKey] = false;
                }
                // Clear the navigating flag
                priceFieldTouched.current[`navigating_${rowIndex}`] = false;
              }}
              sx={{ width: 100 }}
              inputProps={{ min: 0 }}
              inputRef={el => priceRefs.current[row.index] = el}
              onKeyDown={e => {
                const rowIndex = row.index;
                const fieldKey = `price_${rowIndex}`;
                
                if (e.key === 'ArrowDown' && priceRefs.current[row.index + 1]) {
                  e.preventDefault();
                  e.stopPropagation();
                  // Mark that we're navigating with arrow key to next field
                  priceFieldTouched.current[`navigating_${row.index + 1}`] = true;
                  priceRefs.current[row.index + 1].focus();
                  setTimeout(() => {
                    if (priceRefs.current[row.index + 1]) {
                      priceRefs.current[row.index + 1].select();
                    }
                  }, 0);
                } else if (e.key === 'ArrowUp' && priceRefs.current[row.index - 1]) {
                  e.preventDefault();
                  e.stopPropagation();
                  // Mark that we're navigating with arrow key to previous field
                  priceFieldTouched.current[`navigating_${row.index - 1}`] = true;
                  priceRefs.current[row.index - 1].focus();
                  setTimeout(() => {
                    if (priceRefs.current[row.index - 1]) {
                      priceRefs.current[row.index - 1].select();
                    }
                  }, 0);
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                  // Prevent table navigation, allow cursor movement in input
                  e.stopPropagation();
                } else if (e.key === 'Enter') {
                  // Move to next field on Enter
                  e.preventDefault();
                  if (priceRefs.current[row.index + 1]) {
                    priceFieldTouched.current[`navigating_${row.index + 1}`] = false;
                    priceRefs.current[row.index + 1].focus();
                    setTimeout(() => {
                      if (priceRefs.current[row.index + 1]) {
                        priceRefs.current[row.index + 1].select();
                      }
                    }, 0);
                  }
                } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && /[0-9.]/.test(e.key)) {
                  // Any number or decimal point - clear field on first keypress (Excel-like behavior)
                  if (!priceFieldTouched.current[fieldKey]) {
                    // Mark as touched
                    priceFieldTouched.current[fieldKey] = true;
                    // Clear the field on first keypress if it has a value
                    const currentValue = editedData[rowIndex]?.price || '';
                    if (currentValue && e.target.selectionStart === 0 && e.target.selectionEnd === currentValue.toString().length) {
                      // Field is fully selected, clear it
                      e.preventDefault();
                      handlePriceChange('', rowIndex, false);
                      // Insert the new character
                      setTimeout(() => {
                        if (priceRefs.current[rowIndex]) {
                          const input = priceRefs.current[rowIndex];
                          input.value = e.key;
                          handlePriceChange(e.key, rowIndex, false);
                          input.setSelectionRange(1, 1);
                        }
                      }, 0);
                    }
                    // If field is not fully selected, let normal input behavior happen
                  }
                }
              }}
            />
          ) : (
            cell.getValue()
          ),
      },
      {
        id: 'graph',
        header: 'Graph',
        size: 120,
        Cell: ({ row }) => {
          const id = row.original.id;
          let history = priceHistories[id] || [];
          if (!history.length) {
            // If no price history, show a straight line for the last 10 days at the current price
            const dateRange = getDateRange(10);
            history = dateRange.map(date => ({ date, price: row.original.price }));
          }
          let data = [...history];
          const today = new Date();
          const todayStr = today.toISOString().split('T')[0];
          if (data.length === 0 || data[data.length - 1].date !== todayStr) {
            data.push({ date: todayStr, price: row.original.price });
          }
          data = data.slice(-10).map(d => ({
            ...d,
            date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          }));
          let color = '#2E7D32';
          if (data.length > 1) {
            const prev = data[data.length - 2].price;
            const curr = data[data.length - 1].price;
            if (curr < prev) color = '#D32F2F';
          }
          return (
            <Box
              sx={{ width: 100, height: 40, cursor: 'pointer' }}
              onClick={() => {
                // Navigate to analytics and trigger a refresh
                navigate(`/analytics/${id}`);
                // Add a small delay to ensure navigation completes before any potential refresh
                setTimeout(() => {
                  window.dispatchEvent(new Event('focus'));
                }, 100);
              }}
              title="View analytics for this product"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                  <Area type="monotone" dataKey="price" stroke={color} fill={color + '33'} strokeWidth={2} dot={false} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          );
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        size: 120,
        Cell: ({ row }) => (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Tooltip title="Delete Product">
              <span>
                <Button
                  color="error"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    setRowToDelete(row.original);
                    setDeleteDialogOpen(true);
                  }}
                  disabled={saving}
                  sx={{ minWidth: 40, minHeight: 40 }}
                >
                  <DeleteForeverIcon fontSize="small" />
                </Button>
              </span>
            </Tooltip>
          </Box>
        ),
      },
    ],
    [editMode, editField, editedData, i18n.language, priceHistories, saving, handleEditProduct]
  );

  if (loading) {
    return (
      <Box sx={{ p: 4 }}>
        <Skeleton variant="rectangular" width="100%" height={50} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" width="100%" height={50} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" width="100%" height={50} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" width="100%" height={50} />
      </Box>
    );
  }

  // Cancel button style reference
  const cancelButtonSx = {
    fontWeight: 600,
    color: '#111',
    border: '1.5px solid',
    borderColor: 'grey.400',
    borderRadius: 1.5,
    px: 1.5,
    py: 0.7,
    width: 70,
    minHeight: 36,
    fontSize: 15,
    transition: 'all 0.2s',
    backgroundColor: 'transparent',
    '&:hover': {
      backgroundColor: 'action.hover',
      transform: 'scale(1.05)',
      boxShadow: 2,
      color: '#111',
      borderColor: 'grey.600',
    },
  };
  // Save button style reference (from AddGreetingDialog)
  const saveButtonSx = {
    fontWeight: 700,
    borderRadius: 1,
    px: 2.5,
    py: 1.2,
    fontSize: 15,
    minWidth: 100,
    minHeight: 36,
    transition: 'all 0.2s',
    boxShadow: 2,
    '&:hover': {
      backgroundColor: 'primary.dark',
      transform: 'scale(1.05)',
      boxShadow: 3,
    },
  };

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2, gap: 2 }}>
        <Button
          variant="text"
          color="inherit"
          startIcon={<AddCircleOutlineIcon />}
          onClick={() => {
            // Set the category to the last selected category when opening dialog
            setNewProduct(prev => ({
              ...prev,
              category: lastSelectedCategory || ''
            }));
            setAddDialogOpen(true);
          }}
          disabled={editMode || saving}
          sx={{
            fontWeight: !editMode && !editField ? 700 : 600,
            color: '#111',
            borderBottom: !editMode && !editField ? '3px solid #111' : 'none',
            borderRadius: 2,
            px: 2.5,
            py: 1.2,
            transition: 'all 0.2s',
            backgroundColor: !editMode && !editField ? 'rgba(0,0,0,0.04)' : 'transparent',
            '&:hover': {
              backgroundColor: 'action.hover',
              transform: 'scale(1.05)',
              boxShadow: 2,
              color: '#111',
            },
          }}
        >
          {t('add_product')}
        </Button>
        {!editMode && (
          <Button
            variant="text"
            color="inherit"
            startIcon={<EditIcon />}
            sx={{
              fontWeight: editField === 'both' ? 700 : 600,
              color: '#111',
              borderBottom: editField === 'both' ? '3px solid #111' : 'none',
              borderRadius: 2,
              px: 2.5,
              py: 1.2,
              transition: 'all 0.2s',
              backgroundColor: editField === 'both' ? 'rgba(0,0,0,0.04)' : 'transparent',
              '&:hover': {
                backgroundColor: 'action.hover',
                transform: 'scale(1.05)',
                boxShadow: 2,
                color: '#111',
              },
            }}
            onClick={handleEdit}
            disabled={editMode}
          >
            Edit
          </Button>
        )}
        {editMode && (
          <Button
            variant="outlined"
            color="inherit"
            onClick={handleCancelEdit}
            disabled={saving}
            sx={{
              fontWeight: 600,
              color: '#111',
              border: '1.5px solid',
              borderColor: 'grey.400',
              borderRadius: 2,
              px: 2.5,
              py: 1.2,
              transition: 'all 0.2s',
              backgroundColor: 'transparent',
              '&:hover': {
                backgroundColor: 'action.hover',
                transform: 'scale(1.05)',
                boxShadow: 2,
                color: '#111',
                borderColor: 'grey.600',
              },
            }}
          >
            Cancel
          </Button>
        )}
      </Box>
      {/* Show action buttons when products are selected in edit mode */}
      {editMode && Object.keys(rowSelection).filter(key => rowSelection[key]).length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2, gap: 2, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
          <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
            {Object.keys(rowSelection).filter(key => rowSelection[key]).length} product(s) selected
          </Typography>
          <Button
            variant="contained"
            color="warning"
            onClick={handleDisableSelectedProducts}
            disabled={saving}
            sx={{ fontWeight: 600, borderRadius: 2 }}
          >
            Disable Product
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleEnableSelectedProducts}
            disabled={saving}
            sx={{ fontWeight: 600, borderRadius: 2 }}
          >
            Enable Product
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteSelectedProducts}
            disabled={saving}
            sx={{ fontWeight: 600, borderRadius: 2 }}
          >
            Delete Product
          </Button>
        </Box>
      )}
      <MaterialReactTable
        key={i18n.language}
        columns={columns}
        data={editMode ? editedData.filter(p => isNumericId(p.id)) : data.filter(p => isNumericId(p.id))}
        enablePagination={false}
        enableRowSelection={editMode}
        enableGlobalFilter={true}
        manualFiltering={false}
        enableColumnFilters={false}
        enableRowOrdering={!editMode && !saving && !reordering}
        autoResetPageIndex={false}
        icons={{
          DragHandleIcon: DragIndicatorIcon,
        }}
        displayColumnDefOptions={{
          'mrt-row-drag': {
            header: '',
            Header: () => (
              <Tooltip title="Drag & drop to reorder products">
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DragIndicatorIcon fontSize="small" sx={{ color: '#111 !important' }} />
                </Box>
              </Tooltip>
            ),
            size: 40,
            grow: false,
            muiTableHeadCellProps: {
              sx: {
                width: '40px',
                minWidth: '40px',
                maxWidth: '40px',
                p: '0 4px',
                textAlign: 'center',
              },
            },
            muiTableBodyCellProps: {
              sx: {
                width: '40px',
                minWidth: '40px',
                maxWidth: '40px',
                p: '0 4px',
                textAlign: 'center',
              },
            },
          },
        }}
        muiRowDragHandleProps={({ row, table }) => ({
          title: 'Drag to reorder product',
          sx: {
            cursor: 'grab',
            color: 'text.secondary',
            p: 0.5,
            '&:hover': {
              color: 'primary.main',
              backgroundColor: 'rgba(46,125,50,0.1)',
            },
            '&:active': {
              cursor: 'grabbing',
            },
          },
          onDragEnd: () => {
            const { draggingRow, hoveredRow } = table.getState();
            const sourceRow = draggingRow || row;
            if (sourceRow && hoveredRow && sourceRow.id !== hoveredRow.id) {
              handleRowDrop(sourceRow, hoveredRow);
            }
          },
        })}
        getRowId={(row) => row.id.toString()}
        onRowSelectionChange={setRowSelection}
        filterFns={{
          customGlobalFilter: customGlobalFilterFn,
        }}
        globalFilterFn="customGlobalFilter"
        state={{
          rowSelection,
          globalFilter,
          showProgressBars: reordering,
        }}
        onGlobalFilterChange={setGlobalFilter}
        initialState={{
          density: 'compact',
        }}
        muiTableBodyRowProps={({ row, table }) => {
          const disabled = row?.original?.isDisabled;
          const { draggingRow, hoveredRow } = table?.getState?.() || {};
          const isDragging = draggingRow?.id === row.id;
          const isHovered = hoveredRow?.id === row.id;
          return {
            sx: {
              '&:nth-of-type(odd)': {
                backgroundColor: disabled ? 'action.disabledBackground' : 'background.default',
              },
              '&:nth-of-type(even)': {
                backgroundColor: disabled ? 'action.disabledBackground' : 'background.paper',
              },
              '&:hover': {
                backgroundColor: disabled ? 'action.disabledBackground' : 'rgba(46,125,50,0.08)',
                transition: 'background 0.2s',
              },
              opacity: isDragging ? 0.35 : isHovered ? 0.75 : (disabled ? 0.6 : 1),
              borderTop: isHovered && !isDragging ? '2px solid #2e7d32' : undefined,
              borderBottom: isHovered && !isDragging ? '2px solid #2e7d32' : undefined,
              transition: 'opacity 0.15s, background-color 0.2s',
            },
          };
        }}
        muiTableHeadCellProps={{
          sx: {
            backgroundColor: 'primary.main',
            color: 'primary.contrastText',
            fontWeight: 700,
            position: 'sticky',
            top: 0,
            zIndex: 1,
            // Make header icons (sort, menu) black
            '& .MuiSvgIcon-root': {
              color: '#111 !important',
            },
            '& .MuiButtonBase-root': {
              color: '#111 !important',
            },
            // Extra specificity for sort icons
            '& .MuiTableSortLabel-root .MuiSvgIcon-root': {
              color: '#111 !important',
            },
            '& .Mui-active .MuiSvgIcon-root': {
              color: '#111 !important',
            },
          },
        }}
        renderBottomToolbar={() => (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2, gap: 2 }}>
            {editMode && editField !== 'images' && (
              <>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                  sx={{ fontWeight: 600, borderRadius: 3, px: 2.5, py: 1.2, boxShadow: 3, transition: 'transform 0.2s, box-shadow 0.2s', '&:hover': { transform: 'scale(1.08)', boxShadow: 6 } }}
                  onClick={() => setConfirmSaveOpen(true)}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  variant="outlined"
                  color="inherit"
                  onClick={handleCancelEdit}
                  disabled={saving}
                  sx={{
                    fontWeight: 600,
                    color: '#111',
                    border: '1.5px solid',
                    borderColor: 'grey.400',
                    borderRadius: 2,
                    px: 2.5,
                    py: 1.2,
                    transition: 'all 0.2s',
                    backgroundColor: 'transparent',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                      transform: 'scale(1.05)',
                      boxShadow: 2,
                      color: '#111',
                      borderColor: 'grey.600',
                    },
                  }}
                >
                  Cancel
                </Button>
              </>
            )}
          </Box>
        )}
      />
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} PaperProps={{ sx: { borderRadius: '10px', boxShadow: 2 } }}>
        <DialogTitle sx={{ fontWeight: 700, color: 'primary.main', fontSize: 22 }}>Delete Product</DialogTitle>
        <DialogContent>Are you sure you want to delete this product?</DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            color="inherit"
            variant="outlined"
            sx={{
              fontWeight: 600,
              color: '#111',
              border: '1.5px solid',
              borderColor: 'grey.400',
              borderRadius: 1.5,
              px: 1.5,
              py: 0.7,
              width: 70,
              minHeight: 36,
              fontSize: 15,
              transition: 'all 0.2s',
              backgroundColor: 'transparent',
              '&:hover': {
                backgroundColor: 'action.hover',
                transform: 'scale(1.05)',
                boxShadow: 2,
                color: '#111',
                borderColor: 'grey.600',
              },
            }}
          >
            Cancel
          </Button>
          <Button onClick={() => handleDeleteProduct(rowToDelete)} color="error" variant="contained" autoFocus disabled={!rowToDelete || !rowToDelete.id}>Delete</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={addDialogOpen} onClose={handleCloseAddDialog} PaperProps={{ sx: { borderRadius: "15px", boxShadow: 2 } }}>
        <DialogTitle sx={{ fontWeight: 700, color: 'primary.main', fontSize: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Add Product
          <Button
            startIcon={<TranslateIcon />}
            onClick={handleManualTranslate}
            disabled={translating || (!newProduct.name.en?.trim() && !newProduct.description.en?.trim())}
            variant="outlined"
            size="small"
            sx={{ minWidth: 120 }}
          >
            {translating ? 'Translating...' : 'Translate'}
          </Button>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2, p: 1.5, bgcolor: 'info.light', borderRadius: 1, border: '1px solid', borderColor: 'info.main' }}>
            <Typography variant="body2" sx={{ color: 'info.contrastText', fontSize: 13 }}>
              💡 <strong>Translation:</strong> Enter product name and description in English, then click the Translate button to automatically translate to Hindi and Telugu.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth size="small" disabled={!!newProductId}>
              <InputLabel>Category</InputLabel>
              <Select
                value={newProduct.category}
                label="Category"
                onChange={e => handleAddProductFieldChange('category', e.target.value)}
                disabled={!!newProductId || categoriesLoading}
              >
                <MenuItem value="">
                  <em>Select a category</em>
                </MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category.id || category.name} value={category.name || category}>
                    {category.name || category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                label="Name (EN)"
                value={newProduct.name.en || ''}
                onChange={handleNameEnChange}
                size="small"
                fullWidth
                disabled={!!newProductId}
              />
              <TextField
                label="Name (HI)"
                value={newProduct.name.hi || ''}
                onChange={handleNameHiChange}
                size="small"
                fullWidth
                disabled={!!newProductId}
                InputProps={{
                  endAdornment: translating && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                      <CircularProgress size={16} />
                      <Typography variant="caption" sx={{ ml: 0.5, color: 'text.secondary' }}>
                        Translating...
                      </Typography>
                    </Box>
                  )
                }}
              />
              <TextField
                label="Name (TE)"
                value={newProduct.name.te || ''}
                onChange={handleNameTeChange}
                size="small"
                fullWidth
                disabled={!!newProductId}
                InputProps={{
                  endAdornment: translating && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                      <CircularProgress size={16} />
                      <Typography variant="caption" sx={{ ml: 0.5, color: 'text.secondary' }}>
                        Translating...
                      </Typography>
                    </Box>
                  )
                }}
              />
            </Box>
            <TextField
              label="Price"
              type="number"
              value={newProduct.price}
              onChange={e => handleAddProductFieldChange('price', e.target.value)}
              fullWidth
              size="small"
              inputProps={{ min: 0 }}
              disabled={!!newProductId}
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                label="Description (EN)"
                value={newProduct.description.en || ''}
                onChange={handleDescriptionEnChange}
                size="small"
                fullWidth
                multiline
                minRows={2}
                disabled={!!newProductId}
              />
              <TextField
                label="Description (HI)"
                value={newProduct.description.hi || ''}
                onChange={handleDescriptionHiChange}
                size="small"
                fullWidth
                multiline
                minRows={2}
                disabled={!!newProductId}
                InputProps={{
                  endAdornment: translating && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                      <CircularProgress size={16} />
                      <Typography variant="caption" sx={{ ml: 0.5, color: 'text.secondary' }}>
                        Translating...
                      </Typography>
                    </Box>
                  )
                }}
              />
              <TextField
                label="Description (TE)"
                value={newProduct.description.te || ''}
                onChange={handleDescriptionTeChange}
                size="small"
                fullWidth
                multiline
                minRows={2}
                disabled={!!newProductId}
                InputProps={{
                  endAdornment: translating && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                      <CircularProgress size={16} />
                      <Typography variant="caption" sx={{ ml: 0.5, color: 'text.secondary' }}>
                        Translating...
                      </Typography>
                    </Box>
                  )
                }}
              />
            </Box>
            {/* Image upload section - available before and after product creation */}
            <Box sx={{ mt: 2 }}>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ mb: 1.5, fontWeight: 600, color: 'text.primary', fontSize: 16 }}>
                Product Images
                {pendingNewProductImages.length > 0 && (
                  <Typography component="span" sx={{ ml: 1, fontSize: 13, color: 'text.secondary', fontWeight: 400 }}>
                    ({pendingNewProductImages.length} {pendingNewProductImages.length === 1 ? 'image' : 'images'} selected)
                  </Typography>
                )}
              </Box>
              
              {!newProductId && (
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<AddCircleOutlineIcon />}
                      sx={{ fontWeight: 600, borderRadius: 2 }}
                      disabled={adding}
                    >
                      Select Single Image
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={handlePendingImageSelect}
                        disabled={adding}
                      />
                    </Button>
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<AddCircleOutlineIcon />}
                      sx={{ fontWeight: 600, borderRadius: 2 }}
                      disabled={adding}
                    >
                      Select Multiple Images
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        hidden
                        onChange={handlePendingImageSelect}
                        disabled={adding}
                      />
                    </Button>
                    {pendingNewProductImages.length > 0 && (
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={handleClearAllPendingImages}
                        sx={{ fontWeight: 600, borderRadius: 2 }}
                        disabled={adding}
                      >
                        Clear All
                      </Button>
                    )}
                  </Box>
                  
                  {/* Preview of selected images */}
                  {pendingNewProductImages.length > 0 && (
                    <Box>
                      <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary', fontSize: 13 }}>
                        Selected images will be uploaded automatically after product is created:
                      </Typography>
                      <Grid container spacing={2}>
                        {pendingNewProductImages.map((file, idx) => (
                          <Grid item xs={6} sm={4} md={3} key={idx}>
                            <Box sx={{ position: 'relative', border: '1px solid #eee', borderRadius: 2, p: 1, bgcolor: '#fafbfc' }}>
                              <img
                                src={URL.createObjectURL(file)}
                                alt={`Preview ${idx + 1}`}
                                style={{
                                  width: '100%',
                                  height: 100,
                                  objectFit: 'cover',
                                  borderRadius: 4,
                                  boxShadow: '0 2px 8px #0001'
                                }}
                              />
                              <Button
                                size="small"
                                color="error"
                                onClick={() => handleRemovePendingImage(idx)}
                                sx={{
                                  position: 'absolute',
                                  top: 4,
                                  right: 4,
                                  minWidth: 32,
                                  width: 32,
                                  height: 32,
                                  borderRadius: '50%',
                                  bgcolor: 'rgba(255, 255, 255, 0.9)',
                                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 1)' }
                                }}
                                disabled={adding}
                              >
                                <DeleteIcon fontSize="small" />
                              </Button>
                              <Typography
                                variant="caption"
                                sx={{
                                  display: 'block',
                                  mt: 0.5,
                                  textAlign: 'center',
                                  fontSize: 11,
                                  color: 'text.secondary',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {file.name}
                              </Typography>
                            </Box>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  )}
                </Box>
              )}
              
              {/* Image upload section after product is created */}
              {!!newProductId && (
                <Box>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<AddCircleOutlineIcon />}
                      sx={{ fontWeight: 600, borderRadius: 2 }}
                      disabled={addImageUploading}
                    >
                      Select Single Image
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={handleAddImageFileChange}
                        disabled={addImageUploading}
                      />
                    </Button>
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<AddCircleOutlineIcon />}
                      sx={{ fontWeight: 600, borderRadius: 2 }}
                      disabled={addImageUploading}
                    >
                      Select Multiple Images
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        hidden
                        onChange={handleAddMultipleImageFiles}
                        disabled={addImageUploading}
                      />
                    </Button>
                    {addImageFiles.length > 0 && (
                      <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 13 }}>
                        {addImageFiles.length} {addImageFiles.length === 1 ? 'image' : 'images'} selected
                      </Typography>
                    )}
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleAddImageFileUpload}
                      disabled={(addImageFiles.length === 0 && !addImageFile) || addImageUploading}
                      sx={{ fontWeight: 600, borderRadius: 2, boxShadow: 1 }}
                    >
                      {addImageUploading ? 'Uploading...' : `Upload ${addImageFiles.length > 0 ? `(${addImageFiles.length})` : ''}`}
                    </Button>
                  </Box>
                  
                  {addImageUploadError && (
                    <Typography variant="body2" color="error" sx={{ mb: 1, fontSize: 13 }}>
                      {addImageUploadError}
                    </Typography>
                  )}
                  
                  {addImageUploadSuccess && (
                    <Typography variant="body2" color="success.main" sx={{ mb: 1, fontSize: 13 }}>
                      Image uploaded successfully!
                    </Typography>
                  )}
                  
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    {addProductImages.map((imageId, idx) => (
                      <Grid item xs={6} sm={4} md={3} key={idx}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, border: '1px solid #eee', borderRadius: 2, p: 1, bgcolor: '#fafbfc' }}>
                          <img
                            src={getProductImageUrl(imageId)}
                            alt={`Product ${idx + 1}`}
                            style={{
                              maxWidth: '100%',
                              maxHeight: 100,
                              borderRadius: 4,
                              boxShadow: '0 2px 8px #0001',
                              objectFit: 'cover'
                            }}
                          />
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseAddDialog}
            color="inherit"
            variant="outlined"
            sx={cancelButtonSx}
            disabled={adding}
          >
            Cancel
          </Button>
          {!newProductId && (
            <Button
              onClick={handleAddProduct}
              color="success"
              variant="contained"
              sx={{
                fontWeight: 700,
                borderRadius: 2,
                px: 2.5,
                py: 1.2,
                transition: 'all 0.2s',
                backgroundColor: 'success.main',
                color: '#fff',
                boxShadow: 2,
                '&:hover': {
                  backgroundColor: 'success.dark',
                  transform: 'scale(1.05)',
                  boxShadow: 3,
                },
              }}
              disabled={adding || !newProduct.name.en || !newProduct.price}
            >
              {adding ? 'Adding...' : 'Save'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
      {/* Edit Product Dialog */}
      <Dialog open={editProductDialogOpen} onClose={handleCloseEditProductDialog} PaperProps={{ sx: { borderRadius: "15px", boxShadow: 2 } }}>
        <DialogTitle sx={{ fontWeight: 700, color: 'primary.main', fontSize: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Edit Product
          <Button
            startIcon={<TranslateIcon />}
            onClick={handleEditManualTranslate}
            disabled={translating || (!editProductForm.name.en?.trim() && !editProductForm.description.en?.trim())}
            variant="outlined"
            size="small"
            sx={{ minWidth: 120 }}
          >
            {translating ? 'Translating...' : 'Translate'}
          </Button>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2, p: 1.5, bgcolor: 'info.light', borderRadius: 1, border: '1px solid', borderColor: 'info.main' }}>
            <Typography variant="body2" sx={{ color: 'info.contrastText', fontSize: 13 }}>
              💡 <strong>Translation:</strong> Update product name and description in English, then click the Translate button to automatically translate to Hindi and Telugu.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth size="small" disabled={updatingProduct}>
              <InputLabel>Category</InputLabel>
              <Select
                value={editProductForm.category}
                label="Category"
                onChange={e => handleEditProductFieldChange('category', e.target.value)}
                disabled={updatingProduct || categoriesLoading}
              >
                <MenuItem value="">
                  <em>Select a category</em>
                </MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category.id || category.name} value={category.name || category}>
                    {category.name || category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                label="Name (EN)"
                value={editProductForm.name.en}
                onChange={e => handleEditProductFieldChange('name', e.target.value, 'en')}
                size="small"
                fullWidth
                disabled={updatingProduct}
              />
              <TextField
                label="Name (HI)"
                value={editProductForm.name.hi}
                onChange={e => handleEditProductFieldChange('name', e.target.value, 'hi')}
                size="small"
                fullWidth
                disabled={updatingProduct}
                InputProps={{
                  endAdornment: translating && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                      <CircularProgress size={16} />
                      <Typography variant="caption" sx={{ ml: 0.5, color: 'text.secondary' }}>
                        Translating...
                      </Typography>
                    </Box>
                  )
                }}
              />
              <TextField
                label="Name (TE)"
                value={editProductForm.name.te}
                onChange={e => handleEditProductFieldChange('name', e.target.value, 'te')}
                size="small"
                fullWidth
                disabled={updatingProduct}
                InputProps={{
                  endAdornment: translating && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                      <CircularProgress size={16} />
                      <Typography variant="caption" sx={{ ml: 0.5, color: 'text.secondary' }}>
                        Translating...
                      </Typography>
                    </Box>
                  )
                }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                label="Description (EN)"
                value={editProductForm.description.en}
                onChange={e => handleEditProductFieldChange('description', e.target.value, 'en')}
                size="small"
                fullWidth
                multiline
                minRows={2}
                disabled={updatingProduct}
              />
              <TextField
                label="Description (HI)"
                value={editProductForm.description.hi}
                onChange={e => handleEditProductFieldChange('description', e.target.value, 'hi')}
                size="small"
                fullWidth
                multiline
                minRows={2}
                disabled={updatingProduct}
                InputProps={{
                  endAdornment: translating && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                      <CircularProgress size={16} />
                      <Typography variant="caption" sx={{ ml: 0.5, color: 'text.secondary' }}>
                        Translating...
                      </Typography>
                    </Box>
                  )
                }}
              />
              <TextField
                label="Description (TE)"
                value={editProductForm.description.te}
                onChange={e => handleEditProductFieldChange('description', e.target.value, 'te')}
                size="small"
                fullWidth
                multiline
                minRows={2}
                disabled={updatingProduct}
                InputProps={{
                  endAdornment: translating && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                      <CircularProgress size={16} />
                      <Typography variant="caption" sx={{ ml: 0.5, color: 'text.secondary' }}>
                        Translating...
                      </Typography>
                    </Box>
                  )
                }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseEditProductDialog}
            color="inherit"
            variant="outlined"
            sx={cancelButtonSx}
            disabled={updatingProduct}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdateProduct}
            color="primary"
            variant="contained"
            sx={{
              fontWeight: 700,
              borderRadius: 2,
              px: 2.5,
              py: 1.2,
              transition: 'all 0.2s',
              backgroundColor: 'primary.main',
              color: '#fff',
              boxShadow: 2,
              '&:hover': {
                backgroundColor: 'primary.dark',
                transform: 'scale(1.05)',
                boxShadow: 3,
              },
            }}
            disabled={updatingProduct || !editProductForm.name.en}
          >
            {updatingProduct ? 'Updating...' : 'Update Product'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Image Dialog */}
      <Dialog open={imageDialogOpen} onClose={handleCloseImageDialog} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '10px', boxShadow: 2 } }}>
        <DialogTitle sx={{ fontWeight: 600, fontSize: 20, pb: 0.5 }}>
          {imageDialogEditMode ? 'Edit Images' : 'Product Images'}
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
            {imageDialogProductId != null && (
              <>
                <Box sx={{ mb: 2, fontWeight: 500, color: 'text.secondary', fontSize: 16 }}>
                  Current Images
                </Box>
                <Grid container spacing={2}>
                  {imageDialogEditMode ? (
                    (imageDialogProduct?.imageUrls || []).map((imageId, idx) => (
                      imageId && (
                        <Grid span={6} sm={4} md={3} key={idx}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, border: '1px solid #eee', borderRadius: 2, p: 1, bgcolor: '#fafbfc' }}>
                            <img
                              src={getProductImageUrl(imageId)}
                              alt={`Product ${idx + 1}`}
                              style={{
                                maxWidth: 80,
                                maxHeight: 60,
                                borderRadius: 4,
                                marginBottom: 4,
                                boxShadow: '0 2px 8px #0001',
                                transition: 'transform 0.3s cubic-bezier(.4,2,.6,1), box-shadow 0.3s',
                                cursor: 'pointer',
                              }}
                              onMouseOver={e => {
                                e.currentTarget.style.transform = 'scale(2.2)';
                                e.currentTarget.style.zIndex = 10;
                                e.currentTarget.style.boxShadow = '0 8px 32px #0003';
                              }}
                              onMouseOut={e => {
                                e.currentTarget.style.transform = 'scale(1)';
                                e.currentTarget.style.zIndex = 1;
                                e.currentTarget.style.boxShadow = '0 2px 8px #0001';
                              }}
                            />
                            {imageDialogEditMode && (
                              <Tooltip title="Delete Image">
                                <span>
                                  <Button onClick={() => handleImageDialogDeleteImage(idx)} color="error" size="small" sx={{ minWidth: 0 }} disabled={deletingImageIdx === idx}>
                                    {deletingImageIdx === idx ? <CircularProgress size={18} color="inherit" /> : <DeleteIcon fontSize="small" />}
                                  </Button>
                                </span>
                              </Tooltip>
                            )}
                          </Box>
                        </Grid>
                      )
                    ))
                  ) : viewImagesLoading ? (
                    <Grid span={12}><Box sx={{ color: 'text.disabled', textAlign: 'center', py: 2 }}>Loading images...</Box></Grid>
                  ) : viewImageIds.length > 0 ? (
                    viewImageIds.map((imageId, idx) => (
                      <Grid span={6} sm={4} md={3} key={idx}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, border: '1px solid #eee', borderRadius: 2, p: 1, bgcolor: '#fafbfc' }}>
                          <img
                            src={getProductImageUrl(imageId)}
                            alt={`Product ${idx + 1}`}
                            style={{
                              maxWidth: 140,
                              maxHeight: 120,
                              borderRadius: 8,
                              marginBottom: 8,
                              boxShadow: '0 4px 16px #0001',
                              background: '#fff',
                              transition: 'transform 0.3s cubic-bezier(.4,2,.6,1), box-shadow 0.3s',
                              cursor: 'pointer',
                              border: '2px solid #e0e0e0',
                            }}

                            onClick={() => setFullscreenImage(getProductImageUrl(imageId))}
                          />
                        </Box>
                      </Grid>
                    ))
                  ) : (
                    <Grid span={12}><Box sx={{ color: 'text.disabled', textAlign: 'center', py: 2 }}>No Images</Box></Grid>
                  )}
                </Grid>
                {imageDialogEditMode && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ mb: 1, fontWeight: 500, color: 'text.secondary', fontSize: 16 }}>Add New Images</Box>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      style={{ marginBottom: 8 }}
                      multiple
                    />
                    {pendingImageFiles.length > 0 && (
                      <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>
                        Pending images: {pendingImageFiles.map(f => f.name).join(', ')}
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={async () => {
                            await handleUploadPendingImage();
                            if (uploadSuccess && !uploadError) {
                              setImageEditSaveSuccess(true);
                              // Close dialog after a brief delay to show success message
                              setTimeout(() => {
                                setEditMode(false);
                                setEditField(null);
                                setImageDialogEditMode(false);
                                setImageDialogOpen(false);
                                setImageEditSaveSuccess(false);
                                setUploadSuccess(false);
                              }, 1000);
                            }
                          }}
                          disabled={uploading}
                          sx={{ ml: 2, fontWeight: 600, borderRadius: 2, boxShadow: 1 }}
                        >
                          {uploading ? 'Uploading...' : 'Upload'}
                        </Button>
                      </Box>
                    )}
                    {uploadError && (
                      <Typography variant="body2" color="error" sx={{ mt: 1, fontSize: 13 }}>
                        {uploadError}
                      </Typography>
                    )}
                    {uploadSuccess && !uploadError && (
                      <Typography variant="body2" color="success.main" sx={{ mt: 1, fontSize: 13 }}>
                        {imageDeleteSuccess ? 'Image deleted successfully!' : 'Images uploaded successfully!'}
                      </Typography>
                    )}
                    {imageDeleteSuccess && (
                      <Typography variant="body2" color="success.main" sx={{ mt: 1, fontSize: 13 }}>
                        Image deleted successfully!
                      </Typography>
                    )}
                  </>
                )}
              </>
            )}
          </DialogContent>
          <DialogActions sx={{ pb: 2, pr: 3 }}>
            <Button onClick={handleCloseImageDialog} color="secondary" variant="outlined" sx={cancelButtonSx}>Close</Button>
          </DialogActions>
        </Dialog>
      {/* Fullscreen image modal */}
      <Dialog open={!!fullscreenImage} onClose={() => setFullscreenImage(null)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 4, boxShadow: 2, backgroundColor: 'transparent' } }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
          <img src={fullscreenImage} alt="Product Fullscreen" style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 12, boxShadow: '0 8px 32px #0008' }} />
          <Button onClick={() => setFullscreenImage(null)} color="secondary" variant="contained" sx={{ mt: 3, fontWeight: 600, borderRadius: 2 }}>
            Close
          </Button>
        </Box>
      </Dialog>

      {/* Translation Success Snackbar */}
      <Snackbar
        open={translationSuccess}
        autoHideDuration={3000}
        onClose={() => setTranslationSuccess(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <MuiAlert 
          onClose={() => setTranslationSuccess(false)} 
          severity="success" 
          sx={{ width: '100%' }}
        >
          ✅ Product name translated successfully!
        </MuiAlert>
      </Snackbar>

      {/* Reorder Success Snackbar */}
      <Snackbar
        open={reorderSuccess}
        autoHideDuration={3000}
        onClose={() => setReorderSuccess(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <MuiAlert 
          onClose={() => setReorderSuccess(false)} 
          severity="success" 
          sx={{ width: '100%' }}
        >
          ✅ Product order updated successfully!
        </MuiAlert>
      </Snackbar>

      {/* Reorder Error Snackbar */}
      <Snackbar
        open={!!reorderError}
        autoHideDuration={4000}
        onClose={() => setReorderError('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <MuiAlert 
          onClose={() => setReorderError('')} 
          severity="error" 
          sx={{ width: '100%' }}
        >
          ❌ {reorderError}
        </MuiAlert>
      </Snackbar>

      {/* Confirmation Dialog - Delete Selected Products */}
      <Dialog open={confirmDeleteSelectedOpen} onClose={() => setConfirmDeleteSelectedOpen(false)} PaperProps={{ sx: { borderRadius: '10px', boxShadow: 2 } }}>
        <DialogTitle sx={{ fontWeight: 700, color: 'error.main', fontSize: 22 }}>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete {Object.keys(rowSelection).filter(key => rowSelection[key]).length} selected product(s)? This action cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteSelectedOpen(false)} color="inherit" variant="outlined" sx={{ fontWeight: 600, borderRadius: 1.5, px: 1.5, py: 0.7 }}>
            Cancel
          </Button>
          <Button onClick={confirmDeleteSelectedProducts} color="error" variant="contained" autoFocus sx={{ fontWeight: 600, borderRadius: 1.5, px: 1.5, py: 0.7 }}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog - Disable Selected Products */}
      <Dialog open={confirmDisableOpen} onClose={() => setConfirmDisableOpen(false)} PaperProps={{ sx: { borderRadius: '10px', boxShadow: 2 } }}>
        <DialogTitle sx={{ fontWeight: 700, color: 'warning.main', fontSize: 22 }}>Confirm Disable</DialogTitle>
        <DialogContent>
          Are you sure you want to disable {Object.keys(rowSelection).filter(key => rowSelection[key]).length} selected product(s)? Disabled products will not be visible to customers.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDisableOpen(false)} color="inherit" variant="outlined" sx={{ fontWeight: 600, borderRadius: 1.5, px: 1.5, py: 0.7 }}>
            Cancel
          </Button>
          <Button onClick={confirmDisableSelectedProducts} color="warning" variant="contained" autoFocus sx={{ fontWeight: 600, borderRadius: 1.5, px: 1.5, py: 0.7 }}>
            Disable
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog - Enable Selected Products */}
      <Dialog open={confirmEnableOpen} onClose={() => setConfirmEnableOpen(false)} PaperProps={{ sx: { borderRadius: '10px', boxShadow: 2 } }}>
        <DialogTitle sx={{ fontWeight: 700, color: 'success.main', fontSize: 22 }}>Confirm Enable</DialogTitle>
        <DialogContent>
          Are you sure you want to enable {Object.keys(rowSelection).filter(key => rowSelection[key]).length} selected product(s)? Enabled products will be visible to customers.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmEnableOpen(false)} color="inherit" variant="outlined" sx={{ fontWeight: 600, borderRadius: 1.5, px: 1.5, py: 0.7 }}>
            Cancel
          </Button>
          <Button onClick={confirmEnableSelectedProducts} color="success" variant="contained" autoFocus sx={{ fontWeight: 600, borderRadius: 1.5, px: 1.5, py: 0.7 }}>
            Enable
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog - Save Changes */}
      <Dialog open={confirmSaveOpen} onClose={() => setConfirmSaveOpen(false)} PaperProps={{ sx: { borderRadius: '10px', boxShadow: 2 } }}>
        <DialogTitle sx={{ fontWeight: 700, color: 'primary.main', fontSize: 22 }}>Confirm Save</DialogTitle>
        <DialogContent>
          Are you sure you want to save all changes? This will update product prices in the database.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmSaveOpen(false)} color="inherit" variant="outlined" sx={{ fontWeight: 600, borderRadius: 1.5, px: 1.5, py: 0.7 }}>
            Cancel
          </Button>
          <Button onClick={handleSave} color="primary" variant="contained" autoFocus sx={{ fontWeight: 600, borderRadius: 1.5, px: 1.5, py: 0.7 }}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog - Add Product */}
      <Dialog open={confirmAddProductOpen} onClose={() => setConfirmAddProductOpen(false)} PaperProps={{ sx: { borderRadius: '10px', boxShadow: 2 } }}>
        <DialogTitle sx={{ fontWeight: 700, color: 'primary.main', fontSize: 22 }}>Confirm Add Product</DialogTitle>
        <DialogContent>
          Are you sure you want to add this product? Make sure all required fields are filled correctly.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmAddProductOpen(false)} color="inherit" variant="outlined" sx={{ fontWeight: 600, borderRadius: 1.5, px: 1.5, py: 0.7 }}>
            Cancel
          </Button>
          <Button onClick={confirmAddProduct} color="primary" variant="contained" autoFocus sx={{ fontWeight: 600, borderRadius: 1.5, px: 1.5, py: 0.7 }}>
            Add Product
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog - Update Product */}
      <Dialog open={confirmUpdateProductOpen} onClose={() => setConfirmUpdateProductOpen(false)} PaperProps={{ sx: { borderRadius: '10px', boxShadow: 2 } }}>
        <DialogTitle sx={{ fontWeight: 700, color: 'primary.main', fontSize: 22 }}>Confirm Update</DialogTitle>
        <DialogContent>
          Are you sure you want to update this product? This will modify the product name, description, and category.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmUpdateProductOpen(false)} color="inherit" variant="outlined" sx={{ fontWeight: 600, borderRadius: 1.5, px: 1.5, py: 0.7 }}>
            Cancel
          </Button>
          <Button onClick={confirmUpdateProduct} color="primary" variant="contained" autoFocus sx={{ fontWeight: 600, borderRadius: 1.5, px: 1.5, py: 0.7 }}>
            Update
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}

export default TableView; 