// src/App.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  TrendingUp, TrendingDown, Send, Loader2, Image, PlusCircle, ShoppingCart, Edit, Trash2, X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import {
  onAuthStateChanged, signInAnonymously, signInWithCustomToken,
} from 'firebase/auth';
import {
  addDoc, collection, deleteDoc, doc, onSnapshot, query, updateDoc,
  serverTimestamp, orderBy, limit,
} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

import { auth, db, storage, appId } from './lib/firebase';
import { improveDescription, suggestPrice, generateAltText } from './lib/ai';

// ---------------------------------------------
// Support: Lightweight TokenIcon component
// ---------------------------------------------
const TokenIcon = ({ token }) => (
  <div className="h-10 w-10 rounded-full bg-neutral-600 flex items-center justify-center text-white font-semibold">
    {token?.slice(0, 3)?.toUpperCase()}
  </div>
);

// ---------------------------------------------
// Support: Toast helper
// ---------------------------------------------
const useToast = () => {
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);
  const showMessage = (m) => {
    setMessage(m);
    setVisible(true);
    setTimeout(() => setVisible(false), 2400);
  };
  const Toast = () => (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 16, opacity: 0 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-neutral-900 text-neutral-100 px-4 py-2 rounded-lg shadow-lg z-50"
          role="status"
          aria-live="polite"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
  return { showMessage, Toast };
};

// ---------------------------------------------
// Wallet Panel (Balances, Transaction Form, History)
// PRESERVED SECTIONS + light guards
// ---------------------------------------------
const WalletPanel = () => {
  const [balances, setBalances] = useState({ UAI: 10234.56, BTC: 0.82345678, ETH: 12.5, USDT: 1543.12, SOL: 45.23, BNB: 3.4 });
  const [transactionType, setTransactionType] = useState('Buy');
  const [selectedToken, setSelectedToken] = useState('UAI');
  const [amount, setAmount] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [transactionHistory, setTransactionHistory] = useState([]);

  const formatBalance = (v) =>
    Number.isFinite(Number(v)) ? Number(v).toLocaleString(undefined, { maximumFractionDigits: 8 }) : '0';

  const handleTransaction = async () => {
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return;
    setIsLoading(true);
    // Simulated processing
    setTimeout(() => {
      setBalances((prev) => {
        const next = { ...prev };
        if (transactionType === 'Buy') next[selectedToken] = (next[selectedToken] || 0) + parsedAmount;
        if (transactionType === 'Sell') next[selectedToken] = Math.max(0, (next[selectedToken] || 0) - parsedAmount);
        // Transfer: local mock; typically would interact with wallet/provider
        return next;
      });
      setTransactionHistory((h) => [
        {
          id: crypto.randomUUID(),
          type: transactionType,
          token: selectedToken,
          amount: parsedAmount,
          date: new Date().toLocaleString(),
          status: 'Success',
        },
        ...h,
      ]);
      setAmount('');
      setDestinationAddress('');
      setIsLoading(false);
    }, 900);
  };

  return (
    <div className="bg-neutral-800 p-6 sm:p-8 rounded-2xl shadow-xl flex flex-col gap-6">
      {/* Token Balances Section */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Object.keys(balances).map(token => (
          <div key={token} className="bg-neutral-700 p-4 rounded-xl shadow-md flex flex-col items-center justify-center text-center">
            <div className="mb-2">
              <TokenIcon token={token} />
            </div>
            <h3 className="text-lg font-bold text-neutral-50">{token}</h3>
            <p className="text-neutral-300 text-xl font-semibold mt-1">{formatBalance(balances[token])}</p>
          </div>
        ))}
      </div>

      {/* Transaction Options */}
      <div className="flex justify-center gap-4 mt-4">
        <button
          onClick={() => setTransactionType('Buy')}
          className={`px-6 py-3 rounded-xl font-bold transition-colors duration-200 flex items-center gap-2 ${transactionType === 'Buy' ? 'bg-green-600 text-white' : 'bg-neutral-700 text-neutral-300 hover:bg-green-600 hover:text-white'}`}
        >
          <TrendingUp size={20} /> Buy
        </button>
        <button
          onClick={() => setTransactionType('Sell')}
          className={`px-6 py-3 rounded-xl font-bold transition-colors duration-200 flex items-center gap-2 ${transactionType === 'Sell' ? 'bg-red-600 text-white' : 'bg-neutral-700 text-neutral-300 hover:bg-red-600 hover:text-white'}`}
        >
          <TrendingDown size={20} /> Sell
        </button>
        <button
          onClick={() => setTransactionType('Transfer')}
          className={`px-6 py-3 rounded-xl font-bold transition-colors duration-200 flex items-center gap-2 ${transactionType === 'Transfer' ? 'bg-blue-600 text-white' : 'bg-neutral-700 text-neutral-300 hover:bg-blue-600 hover:text-white'}`}
        >
          <Send size={20} /> Transfer
        </button>
      </div>

      {/* Transaction Form */}
      <div className="bg-neutral-700 p-6 rounded-xl shadow-inner mt-4">
        <h3 className="text-xl font-bold text-neutral-50 mb-4">{transactionType} Tokens</h3>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <label className="text-neutral-300 min-w-[100px]">Token</label>
            <select
              value={selectedToken}
              onChange={(e) => setSelectedToken(e.target.value)}
              className="flex-grow p-3 bg-neutral-800 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:outline-none transition-colors"
            >
              {Object.keys(balances).map(token => (
                <option key={token} value={token}>{token}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-neutral-300 min-w-[100px]">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="flex-grow p-3 bg-neutral-800 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:outline-none transition-colors"
            />
          </div>
          {transactionType === 'Transfer' && (
            <div className="flex flex-col gap-2">
              <label className="text-neutral-300">Recipient Address</label>
              <input
                type="text"
                value={destinationAddress}
                onChange={(e) => setDestinationAddress(e.target.value)}
                placeholder="0x..."
                className="w-full p-3 bg-neutral-800 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:outline-none transition-colors"
              />
            </div>
          )}
          <button
            onClick={handleTransaction}
            disabled={isLoading || !Number.isFinite(Number(amount)) || Number(amount) <= 0}
            className={`w-full px-8 py-3 rounded-xl font-bold shadow-lg transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-2 ${
              transactionType === 'Buy' ? 'bg-green-600 hover:bg-green-700' :
              transactionType === 'Sell' ? 'bg-red-600 hover:bg-red-700' :
              'bg-blue-600 hover:bg-blue-700'
            } text-white disabled:bg-neutral-500 disabled:cursor-not-allowed`}
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" />
                Processing...
              </>
            ) : (
              <>
                {transactionType === 'Buy' && <TrendingUp size={20} />}
                {transactionType === 'Sell' && <TrendingDown size={20} />}
                {transactionType === 'Transfer' && <Send size={20} />}
                {transactionType} {selectedToken}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-neutral-700 p-6 rounded-xl shadow-inner mt-4">
        <h3 className="text-xl font-bold text-neutral-50 mb-4">Recent Transactions</h3>
        <div className="space-y-4">
          {transactionHistory.map(tx => (
            <div key={tx.id} className="flex justify-between items-center bg-neutral-800 p-4 rounded-lg">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-full ${tx.type === 'Buy' ? 'bg-green-600' : tx.type === 'Sell' ? 'bg-red-600' : 'bg-blue-600'}`}>
                  {tx.type === 'Buy' && <TrendingUp size={16} />}
                  {tx.type === 'Sell' && <TrendingDown size={16} />}
                  {tx.type === 'Transfer' && <Send size={16} />}
                </div>
                <div className="flex flex-col">
                  <span className="text-neutral-50 font-semibold">{tx.type} {tx.amount.toFixed(2)} {tx.token}</span>
                  <span className="text-neutral-400 text-sm">{tx.date}</span>
                </div>
              </div>
              <span className={`text-sm font-semibold ${tx.status === 'Success' ? 'text-green-400' : 'text-red-400'}`}>
                {tx.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------
// Exchange Hub (Marketplace) — PRESERVED SECTIONS
// Extended: storage upload, server timestamps, AI helpers, drag & drop, validation
// ---------------------------------------------
const ExchangeHub = ({ showMessage, cryptoOptions }) => {
  const [userId, setUserId] = useState(null);
  const [listings, setListings] = useState([]);
  const [view, setView] = useState('explorer'); // 'explorer' or 'create'
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [productName, setProductName] = useState('');
  const [productType, setProductType] = useState('Physical'); // Physical or Digital
  const [condition, setCondition] = useState('New'); // New or Used
  const [description, setDescription] = useState('');
  const [priceType, setPriceType] = useState('Fixed'); // Fixed, Bid, Barter
  const [paymentMethod, setPaymentMethod] = useState('UAI'); // UAI, Fiat, Crypto
  const [currency, setCurrency] = useState('UAI'); // e.g., UAI, USD, BTC
  const [price, setPrice] = useState('');
  const [barterItem, setBarterItem] = useState('');
  const [productImage, setProductImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  // Editing State
  const [isEditing, setIsEditing] = useState(false);
  const [currentListing, setCurrentListing] = useState(null);

  const fiatOptions = ['USD', 'EUR', 'GBP', 'JPY', 'CAD'];

  // Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        try {
          if (typeof window !== 'undefined' && typeof window.__initial_auth_token !== 'undefined' && window.__initial_auth_token) {
            await signInWithCustomToken(auth, window.__initial_auth_token);
          } else {
            await signInAnonymously(auth);
          }
        } catch (error) {
          console.error("Error signing in:", error);
          showMessage("Authentication failed. Please refresh.");
        }
      }
    });
    return () => unsubscribe();
  }, [showMessage]);

  // Firestore Real-time Listener
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    const listingsCollection = collection(db, 'artifacts', appId, 'public', 'data', 'exchangeListings');
    const q = query(listingsCollection, orderBy('createdAtTS', 'desc'), limit(48));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const listingsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setListings(listingsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching listings:", error);
      showMessage("Could not fetch marketplace listings.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId, showMessage]);

  // Reset currency when payment method changes
  useEffect(() => {
    if (paymentMethod === 'UAI') setCurrency('UAI');
    if (paymentMethod === 'Fiat') setCurrency(fiatOptions[0] ?? 'USD');
    if (paymentMethod === 'Crypto') setCurrency(cryptoOptions?.[0] ?? 'BTC');
  }, [paymentMethod, cryptoOptions]);

  // Image compression function (PRESERVED)
  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = document.createElement('img');
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.7)); // Compress to 70% quality JPEG
        };
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleImageFile = async (file) => {
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      showMessage("File is too large. Please select an image under 5MB.");
      return;
    }
    try {
      const compressedImage = await compressImage(file);
      setProductImage(compressedImage);
      setImagePreview(compressedImage);
    } catch (error) {
      console.error("Error compressing image:", error);
      showMessage("Failed to process image.");
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) await handleImageFile(file);
  };

  const resetForm = () => {
    setProductName('');
    setProductType('Physical');
    setCondition('New');
    setDescription('');
    setPriceType('Fixed');
    setPaymentMethod('UAI');
    setCurrency('UAI');
    setPrice('');
    setBarterItem('');
    setProductImage(null);
    setImagePreview('');
    setIsEditing(false);
    setCurrentListing(null);
    setView('explorer');
  };

  // Upload to Storage and return downloadURL
  const uploadListingImage = async (uid, base64DataUrl) => {
    const id = crypto.randomUUID();
    const imgRef = ref(storage, `exchange/${uid}/${id}.jpg`);
    await uploadString(imgRef, base64DataUrl, 'data_url');
    return await getDownloadURL(imgRef);
  };

  const validate = () => {
    if (!productName?.trim()) return "Please fill in all required fields.";
    if (!description?.trim()) return "Please fill in all required fields.";
    if (!userId) return "Please sign in to list items.";
    if (priceType !== 'Barter') {
      const n = Number(price);
      if (!Number.isFinite(n) || n <= 0) return "Enter a valid price greater than 0.";
    } else {
      if (!barterItem?.trim()) return "Please specify your desired trade.";
    }
    return null;
  };

  // handleSubmit — PRESERVED NAME & LOGIC, extended with storage + server timestamps
  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { showMessage(err); return; }
    setIsSubmitting(true);

    // Keep original createdAt string, add createdAtTS/updatedAtTS for trust
    const baseData = {
      userId,
      name: productName.trim(),
      type: productType,
      condition: productType === 'Physical' ? condition : null,
      description: description.trim(),
      priceType,
      paymentMethod: priceType !== 'Barter' ? paymentMethod : null,
      currency: priceType !== 'Barter' ? currency : null,
      price: priceType !== 'Barter' ? Number(price) : null,
      barterItem: priceType === 'Barter' ? barterItem.trim() : null,
      imageUrl: productImage,
      createdAt: new Date().toISOString(), // preserved
      createdAtTS: serverTimestamp(),
      updatedAtTS: serverTimestamp(),
    };

    try {
      let imageUrl = currentListing?.imageUrl || null;
      if (productImage && productImage.startsWith('data:')) {
        imageUrl = await uploadListingImage(userId, productImage);
      }

      const listingData = { ...baseData, imageUrl };
      const listingsCollection = collection(db, 'artifacts', appId, 'public', 'data', 'exchangeListings');

      if (isEditing) {
        const listingDoc = doc(db, 'artifacts', appId, 'public', 'data', 'exchangeListings', currentListing.id);
        await updateDoc(listingDoc, {
          ...listingData,
          createdAtTS: currentListing?.createdAtTS || baseData.createdAtTS,
          updatedAtTS: serverTimestamp(),
        });
        showMessage("Listing updated successfully!");
      } else {
        await addDoc(listingsCollection, listingData);
        showMessage("Listing created successfully!");
      }
      resetForm();
    } catch (error) {
      console.error("Error submitting listing:", error);
      showMessage("Failed to submit listing. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (listing) => {
    setIsEditing(true);
    setCurrentListing(listing);
    setProductName(listing.name);
    setProductType(listing.type);
    setCondition(listing.condition || 'New');
    setDescription(listing.description);
    setPriceType(listing.priceType);
    setPaymentMethod(listing.paymentMethod || 'UAI');
    setCurrency(listing.currency || 'UAI');
    setPrice(listing.price || '');
    setBarterItem(listing.barterItem || '');
    setProductImage(listing.imageUrl);
    setImagePreview(listing.imageUrl);
    setView('create');
  };

  const handleDelete = async (listingId) => {
    if (confirm("Are you sure you want to delete this listing?")) {
      try {
        const listingDoc = doc(db, 'artifacts', appId, 'public', 'data', 'exchangeListings', listingId);
        await deleteDoc(listingDoc);
        showMessage("Listing deleted successfully.");
      } catch (error) {
        console.error("Error deleting listing:", error);
        showMessage("Failed to delete listing.");
      }
    }
  };

  const renderPrice = (listing) => {
    switch (listing.priceType) {
      case 'Fixed':
        return <p className="text-xl font-bold text-purple-400">{listing.price} {listing.currency}</p>;
      case 'Bid':
        return <p className="text-xl font-bold text-cyan-400">Starts at {listing.price} {listing.currency}</p>;
      case 'Barter':
        return <p className="text-md text-green-400">Wants: {listing.barterItem}</p>;
      default:
        return null;
    }
  };

  // --------- AI Actions (additive, optional) ----------
  const [aiBusy, setAiBusy] = useState(false);
  const runImproveDescription = async () => {
    try {
      setAiBusy(true);
      const text = await improveDescription({ name: productName, description, type: productType, condition });
      setDescription(text);
      showMessage("Description improved by AI.");
    } catch {
      showMessage("AI description failed.");
    } finally {
      setAiBusy(false);
    }
  };
  const runSuggestPrice = async () => {
    try {
      setAiBusy(true);
      const value = await suggestPrice({
        name: productName, type: productType, paymentMethod, currency, baselinePrice: price, condition,
      });
      if (value) setPrice(String(value));
      showMessage(value ? "AI suggested a price." : "AI couldn't suggest a price.");
    } catch {
      showMessage("AI price suggestion failed.");
    } finally {
      setAiBusy(false);
    }
  };
  const runAltText = async () => {
    try {
      setAiBusy(true);
      const alt = await generateAltText({ name: productName, type: productType });
      setImagePreview(prev => prev ? prev : ''); // no-op, kept for extensibility
      showMessage(`AI alt: ${alt}`);
    } catch {
      showMessage("AI alt generation failed.");
    } finally {
      setAiBusy(false);
    }
  };

  // --------- Drag & Drop (additive) ----------
  const dropRef = useRef(null);
  const prevent = (e) => { e.preventDefault(); e.stopPropagation(); };
  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    const onDrop = async (e) => {
      prevent(e);
      const file = e.dataTransfer?.files?.[0];
      if (file) await handleImageFile(file);
    };
    el.addEventListener('dragover', prevent);
    el.addEventListener('drop', onDrop);
    return () => {
      el.removeEventListener('dragover', prevent);
      el.removeEventListener('drop', onDrop);
    };
  }, []);

  // ------- Create/Edit Form (PRESERVED, with additive AI buttons & DnD) -------
  const CreateEditForm = (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold text-neutral-50">{isEditing ? 'Edit Listing' : 'Create a New Listing'}</h3>
        <button onClick={resetForm} className="text-neutral-400 hover:text-white" aria-label="Close">
          <X size={24} />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Product Image Upload */}
        <div className="text-center">
          <label htmlFor="productImage" className="block text-sm font-medium text-neutral-300 mb-2">Product Image</label>
          <div
            ref={dropRef}
            className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-neutral-600 border-dashed rounded-md"
          >
            <div className="space-y-1 text-center">
              {imagePreview ? (
                <img src={imagePreview} alt={productName || 'Product Preview'} className="mx-auto h-48 w-auto rounded-md" loading="lazy" decoding="async" />
              ) : (
                <Image className="mx-auto h-12 w-12 text-neutral-500" />
              )}
              <div className="flex text-sm text-neutral-400 justify-center">
                <label htmlFor="productImage" className="relative cursor-pointer bg-neutral-700 rounded-md font-medium text-purple-400 hover:text-purple-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-purple-500 p-1">
                  <span>Upload a file</span>
                  <input id="productImage" name="productImage" type="file" className="sr-only" accept="image/*" onChange={handleImageChange} />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-neutral-500">PNG, JPG, GIF up to 5MB</p>
            </div>
          </div>
        </div>

        {/* Product Name */}
        <input type="text" placeholder="Product Name" value={productName} onChange={(e) => setProductName(e.target.value)} required className="w-full p-3 bg-neutral-800 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:outline-none" />

        {/* Product Type & Condition */}
        <div className="flex gap-4">
          <select value={productType} onChange={(e) => setProductType(e.target.value)} className="w-full p-3 bg-neutral-800 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:outline-none">
            <option value="Physical">Physical Product</option>
            <option value="Digital">Digital Product</option>
          </select>
          {productType === 'Physical' && (
            <select value={condition} onChange={(e) => setCondition(e.target.value)} className="w-full p-3 bg-neutral-800 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:outline-none">
              <option value="New">New</option>
              <option value="Used">Used</option>
            </select>
          )}
        </div>

        {/* Description */}
        <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} required rows="4" className="w-full p-3 bg-neutral-800 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:outline-none" />

        {/* AI Tools (additive) */}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={runImproveDescription} disabled={aiBusy} className="px-3 py-2 text-sm rounded-md bg-neutral-700 hover:bg-neutral-600 text-white font-semibold">
            ✨ Improve Description (AI)
          </button>
          <button type="button" onClick={runSuggestPrice} disabled={aiBusy} className="px-3 py-2 text-sm rounded-md bg-neutral-700 hover:bg-neutral-600 text-white font-semibold">
            💡 Suggest Price (AI)
          </button>
          <button type="button" onClick={runAltText} disabled={aiBusy} className="px-3 py-2 text-sm rounded-md bg-neutral-700 hover:bg-neutral-600 text-white font-semibold">
            ♿ Generate Alt Text (AI)
          </button>
          {aiBusy && <Loader2 className="animate-spin text-neutral-300" size={18} />}
        </div>

        {/* Price Type and Dynamic Fields */}
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">Transaction Type</label>
          <select value={priceType} onChange={(e) => setPriceType(e.target.value)} className="w-full p-3 bg-neutral-800 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:outline-none">
            <option value="Fixed">Fixed Price</option>
            <option value="Bid">Auction (Starting Bid)</option>
            <option value="Barter">Barter / Trade</option>
          </select>
        </div>

        <AnimatePresence>
          {priceType !== 'Barter' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Payment Method</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full p-3 bg-neutral-800 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:outline-none">
                  <option value="UAI">UAI Token</option>
                  <option value="Fiat">Fiat Currency</option>
                  <option value="Crypto">Other Crypto</option>
                </select>
              </div>
              <div className="flex gap-4">
                {paymentMethod !== 'UAI' && (
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-1/2 p-3 bg-neutral-800 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:outline-none">
                    {paymentMethod === 'Fiat' && fiatOptions.map(c => <option key={c} value={c}>{c}</option>)}
                    {paymentMethod === 'Crypto' && cryptoOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
                <input type="number" placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} required className="w-full p-3 bg-neutral-800 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:outline-none" />
              </div>
            </motion.div>
          )}
          {priceType === 'Barter' && (
            <motion.input initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} type="text" placeholder="What do you want to trade for?" value={barterItem} onChange={(e) => setBarterItem(e.target.value)} required className="w-full p-3 bg-neutral-800 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:outline-none" />
          )}
        </AnimatePresence>

        <button type="submit" disabled={isSubmitting} className="w-full px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl shadow-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300 transform active:scale-95 disabled:from-neutral-500 disabled:to-neutral-500 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {isSubmitting ? <Loader2 className="animate-spin" /> : (isEditing ? 'Update Listing' : 'Create Listing')}
        </button>
      </form>
    </motion.div>
  );

  // ------- Explorer View (PRESERVED) -------
  const ExplorerView = (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h3 className="text-2xl font-bold text-neutral-50">Marketplace Explorer</h3>
        <button onClick={() => setView('create')} className="w-full sm:w-auto px-6 py-2 bg-purple-600 text-white font-bold rounded-full shadow-lg hover:bg-purple-700 transition-colors duration-300 transform active:scale-95 flex items-center gap-2 justify-center">
          <PlusCircle size={20} /> List an Item
        </button>
      </div>
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 text-purple-500 animate-spin" />
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center text-neutral-500 py-16">
          <ShoppingCart size={48} className="mx-auto mb-4" />
          <p>The marketplace is empty. Be the first to list an item!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {listings.map(listing => (
            <div key={listing.id} className="bg-neutral-700 rounded-xl shadow-lg overflow-hidden flex flex-col group">
              <div className="relative">
                <img
                  src={listing.imageUrl || 'https://placehold.co/600x400/171717/404040?text=No+Image'}
                  alt={listing.name}
                  className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  loading="lazy"
                  decoding="async"
                />
                {userId === listing.userId && (
                  <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(listing)} className="p-2 bg-blue-600/80 rounded-full text-white hover:bg-blue-500" aria-label="Edit listing"><Edit size={16} /></button>
                    <button onClick={() => handleDelete(listing.id)} className="p-2 bg-red-600/80 rounded-full text-white hover:bg-red-500" aria-label="Delete listing"><Trash2 size={16} /></button>
                  </div>
                )}
              </div>
              <div className="p-4 flex flex-col flex-grow">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-lg font-bold text-neutral-50">{listing.name}</h4>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${listing.type === 'Physical' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-green-500/20 text-green-400'}`}>{listing.type}</span>
                </div>
                <p className="text-neutral-400 text-sm mb-4 flex-grow line-clamp-3">{listing.description}</p>
                {listing.type === 'Physical' && <p className="text-xs text-neutral-500 mb-2">Condition: {listing.condition}</p>}
                <div className="mt-auto pt-4 border-t border-neutral-600">
                  {renderPrice(listing)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-3xl font-bold text-neutral-50 mb-4 flex items-center gap-3">
        <ShoppingCart className="text-purple-400" />
        Exchange Hub
      </h2>
      <div className="bg-neutral-800 p-6 sm:p-8 rounded-2xl shadow-xl flex flex-col gap-6">
        <div className="bg-neutral-900/50 p-3 rounded-lg text-center">
          <p className="text-sm text-neutral-400">Your User ID (for collaboration): <strong className="text-neutral-200 font-mono">{userId || 'Loading...'}</strong></p>
        </div>
        <AnimatePresence mode="wait">
          {view === 'explorer' ? ExplorerView : CreateEditForm}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ---------------------------------------------
// App Shell
// ---------------------------------------------
const App = () => {
  const { showMessage, Toast } = useToast();
  const cryptoOptions = useMemo(() => ['BTC', 'ETH', 'SOL', 'USDT', 'BNB'], []);
  const [tab, setTab] = useState('wallet');

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100">
      <header className="container mx-auto px-4 py-6 flex justify-between items-center">
        <h1 className="text-2xl font-extrabold tracking-tight">BrandLab Exchange</h1>
        <nav className="flex gap-2">
          <button onClick={() => setTab('wallet')} className={`px-4 py-2 rounded-lg font-semibold ${tab === 'wallet' ? 'bg-neutral-700' : 'hover:bg-neutral-800'}`}>Wallet</button>
          <button onClick={() => setTab('exchange')} className={`px-4 py-2 rounded-lg font-semibold ${tab === 'exchange' ? 'bg-neutral-700' : 'hover:bg-neutral-800'}`}>Exchange Hub</button>
        </nav>
      </header>

      <main className="container mx-auto px-4 pb-24">
        <AnimatePresence mode="wait">
          {tab === 'wallet' ? (
            <motion.div key="wallet" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <WalletPanel />
            </motion.div>
          ) : (
            <motion.div key="exchange" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <ExchangeHub showMessage={showMessage} cryptoOptions={cryptoOptions} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Toast />
    </div>
  );
};

export default App;
