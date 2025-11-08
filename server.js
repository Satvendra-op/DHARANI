
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));
app.use(express.static('dharani'));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hackathon-auth')
  .then(() => {
    console.log('MongoDB Connected');
  })
  .catch(err => console.error('MongoDB Connection Error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: false, // Optional for Firebase users
    minlength: 6
  },
  role: {
    type: String,
    required: true,
    enum: ['Buyer', 'Seller']
  },
  firebaseUid: {
    type: String,
    unique: true,
    sparse: true // Allows multiple null values
  }
}, {
  timestamps: true
});

const User = mongoose.model('User', userSchema);

const listingSchema = new mongoose.Schema({
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sellerName: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['Refurbished Products', 'Scrap / Garbage'],
    required: true
  },
  itemName: {
    type: String,
    required: true
  },
  productQuality: {
    type: String,
    enum: ['Good', 'Better', 'Bad', 'Critical'],
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    required: true
  },
  usageOrDisposalInfo: {
    type: String,
    required: true
  },
  swachhBharatTagline: {
    type: String,
    default: ''
  },
  imageData: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

const Listing = mongoose.model('Listing', listingSchema);

const appointmentSchema = new mongoose.Schema({
  listing: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing',
    required: true
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Completed', 'Cancelled'],
    default: 'Pending'
  },
  // Payment details removed (Razorpay integration disabled)
  paymentDetails: {
    orderId: String,
    paymentId: String,
    signature: String,
    verified: Boolean
  }
}, {
  timestamps: true
});

const Appointment = mongoose.model('Appointment', appointmentSchema);

// Nagar Nigam Schema
const nagarNigamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    default: 'Nagar Nigam'
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  locations: [{
    name: String,
    latitude: Number,
    longitude: Number,
    address: String
  }]
}, {
  timestamps: true
});

const NagarNigam = mongoose.model('NagarNigam', nagarNigamSchema);

// Dump Request Schema
const dumpRequestSchema = new mongoose.Schema({
  listing: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing',
    required: true
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  nagarNigam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NagarNigam',
    required: true
  },
  sellerLocation: {
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    },
    address: String
  },
  dumpLocation: {
    latitude: Number,
    longitude: Number,
    address: String
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected', 'Completed'],
    default: 'Pending'
  },
  message: {
    type: String,
    default: ''
  },
  approvedAt: Date,
  completedAt: Date
}, {
  timestamps: true
});

const DumpRequest = mongoose.model('DumpRequest', dumpRequestSchema);

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Signup Route
app.post('/api/signup', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (role !== 'Buyer' && role !== 'Seller') {
      return res.status(400).json({ error: 'Role must be either Buyer or Seller' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Signup Error:', error);
    res.status(500).json({ error: 'Server error during signup' });
  }
});

// Google OAuth Route
app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential, role } = req.body;

    if (!credential) {
      return res.status(400).json({ error: 'Google credential is required' });
    }

    // Decode Google JWT token to get user info
    // Note: In production, verify the token signature with Google's public keys
    // For now, we decode it (acceptable for development/testing)
    let decoded;
    try {
      const payload = credential.split('.')[1];
      // Add padding if needed for base64 decoding
      const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
      const decodedPayload = Buffer.from(paddedPayload, 'base64').toString('utf-8');
      decoded = JSON.parse(decodedPayload);
    } catch (error) {
      console.error('Token decode error:', error);
      return res.status(400).json({ error: 'Invalid Google credential format' });
    }

    const { email, name, picture } = decoded;

    if (!email) {
      return res.status(400).json({ error: 'Email not found in Google account' });
    }

    // Validate email domain (optional - can remove if not needed)
    if (!email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    // Check if user exists
    let user = await User.findOne({ email });

    // If user doesn't exist, create a new one
    if (!user) {
      // Validate role if provided (for signup)
      const userRole = (role && ['Buyer', 'Seller'].includes(role)) ? role : 'Buyer';
      
      // Generate a random password (user won't use it for Google accounts)
      const randomPassword = await bcrypt.hash(Math.random().toString(36).slice(-8) + Date.now(), 10);
      
      user = new User({
        name: name || email.split('@')[0],
        email,
        password: randomPassword,
        role: userRole
      });

      await user.save();
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Google authentication successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(500).json({ error: 'Server error during Google authentication' });
  }
});

// Login Route
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Protected route to verify token (optional)
app.get('/api/verify', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Server error while verifying user' });
  }
});

app.post('/api/listings', authenticate, async (req, res) => {
  try {
    const {
      category,
      itemName,
      productQuality,
      description,
      usageOrDisposalInfo,
      swachhBharatTagline = '',
      imageData = ''
    } = req.body;

    const rawPrice = req.body.price ?? req.body.estimatedPriceINR;

    if (!category || !itemName || !productQuality || rawPrice === undefined || rawPrice === null || !description || !usageOrDisposalInfo) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    const validCategories = ['Refurbished Products', 'Scrap / Garbage'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const validQualities = ['Good', 'Better', 'Bad', 'Critical'];
    if (!validQualities.includes(productQuality)) {
      return res.status(400).json({ error: 'Invalid product quality' });
    }

    const numericPrice = Number(rawPrice);
    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      return res.status(400).json({ error: 'Price must be a non-negative number' });
    }

    if (req.user.role !== 'Seller') {
      return res.status(403).json({ error: 'Only sellers can create listings' });
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const listing = new Listing({
      seller: user._id,
      sellerName: user.name,
      category,
      itemName,
      productQuality,
      price: numericPrice,
      description,
      usageOrDisposalInfo,
      swachhBharatTagline,
      imageData
    });

    await listing.save();

    res.status(201).json({
      message: 'Listing created successfully',
      listing
    });
  } catch (error) {
    console.error('Create Listing Error:', error);
    res.status(500).json({ error: 'Server error while creating listing' });
  }
});

app.get('/api/listings', async (req, res) => {
  try {
    const { category } = req.query;
    const query = category ? { category } : {};

    const listings = await Listing.find(query)
      .sort({ createdAt: -1 })
      .lean();

    res.json({ listings });
  } catch (error) {
    console.error('Fetch Listings Error:', error);
    res.status(500).json({ error: 'Server error while fetching listings' });
  }
});

app.get('/api/listings/mine', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'Seller') {
      return res.status(403).json({ error: 'Only sellers can view their listings' });
    }

    const listings = await Listing.find({ seller: req.user.userId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ listings });
  } catch (error) {
    console.error('Fetch Seller Listings Error:', error);
    res.status(500).json({ error: 'Server error while fetching seller listings' });
  }
});

app.post('/api/appointments', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'Buyer') {
      return res.status(403).json({ error: 'Only buyers can contact sellers' });
    }

    const { listingId, message = '' } = req.body;

    if (!listingId) {
      return res.status(400).json({ error: 'Listing ID is required' });
    }

    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (!listing.seller) {
      return res.status(400).json({ error: 'Listing is missing seller information. Please ask the seller to republish this item.' });
    }

    if (String(listing.seller) === req.user.userId) {
      return res.status(400).json({ error: 'You cannot contact your own listing' });
    }

    const appointment = new Appointment({
      listing: listing._id,
      seller: listing.seller,
      buyer: req.user.userId,
      message
    });

    await appointment.save();

    // Populate the appointment with related data - use findById to get fresh populated data
    try {
      const populated = await Appointment.findById(appointment._id)
        .populate('listing')
        .populate('seller', 'name email')
        .populate('buyer', 'name email')
        .lean();

      res.status(201).json({
        message: 'Seller contacted successfully',
        appointment: populated
      });
    } catch (populateError) {
      // If populate fails, still return success but with minimal data
      console.error('Populate error (appointment still created):', populateError);
      res.status(201).json({
        message: 'Seller contacted successfully',
        appointment: {
          _id: appointment._id,
          listing: listing._id,
          seller: listing.seller,
          buyer: req.user.userId,
          message: appointment.message,
          status: appointment.status,
          createdAt: appointment.createdAt
        }
      });
    }
  } catch (error) {
    console.error('Create Appointment Error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Server error while creating appointment',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.get('/api/appointments', authenticate, async (req, res) => {
  try {
    const filter = req.user.role === 'Seller'
      ? { seller: req.user.userId }
      : { buyer: req.user.userId };

    const appointments = await Appointment.find(filter)
      .sort({ createdAt: -1 })
      .populate('listing')
      .populate('seller', 'name email')
      .populate('buyer', 'name email')
      .lean();

    res.json({ appointments });
  } catch (error) {
    console.error('Fetch Appointments Error:', error);
    res.status(500).json({ error: 'Server error while fetching appointments' });
  }
});

// Firebase Authentication Route
app.post('/api/auth/firebase', async (req, res) => {
  try {
    const { idToken, name, email, uid, role } = req.body;

    if (!idToken || !uid) {
      return res.status(400).json({ error: 'Firebase ID token and UID are required' });
    }

    // Verify Firebase ID token using Firebase REST API
    // Note: In production, use Firebase Admin SDK for better security
    try {
      const verifyUrl = `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getAccountInfo?key=${process.env.FIREBASE_API_KEY || ''}`;
      const verifyResponse = await axios.post(verifyUrl, {
        idToken: idToken
      });

      if (!verifyResponse.data || !verifyResponse.data.users || verifyResponse.data.users.length === 0) {
        return res.status(401).json({ error: 'Invalid Firebase token' });
      }

      const firebaseUser = verifyResponse.data.users[0];
      
      // Use email from Firebase if not provided
      const userEmail = email || firebaseUser.email || firebaseUser.providerUserInfo?.[0]?.email;
      const userName = name || firebaseUser.displayName || userEmail?.split('@')[0] || 'User';

      if (!userEmail) {
        return res.status(400).json({ error: 'Email not found in Firebase account' });
      }

      // Check if user exists by Firebase UID or email
      let user = await User.findOne({ $or: [{ firebaseUid: uid }, { email: userEmail }] });

      if (!user) {
        // Create new user
        const userRole = (role && ['Buyer', 'Seller'].includes(role)) ? role : 'Buyer';
        
        // Generate a random password for Firebase users (they won't use it)
        const randomPassword = await bcrypt.hash(Math.random().toString(36).slice(-8) + Date.now(), 10);
        
        user = new User({
          name: userName,
          email: userEmail,
          password: randomPassword,
          role: userRole,
          firebaseUid: uid
        });

        await user.save();
      } else {
        // Update Firebase UID if not set
        if (!user.firebaseUid) {
          user.firebaseUid = uid;
          await user.save();
        }
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user._id, email: user.email, role: user.role, name: user.name },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        message: 'Firebase authentication successful',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } catch (verifyError) {
      console.error('Firebase token verification error:', verifyError);
      // Fallback: If API key is not set, just trust the token (for development)
      if (!process.env.FIREBASE_API_KEY) {
        console.warn('FIREBASE_API_KEY not set. Skipping token verification (development mode)');
        
        const userEmail = email || 'unknown@example.com';
        const userName = name || userEmail.split('@')[0];

        let user = await User.findOne({ $or: [{ firebaseUid: uid }, { email: userEmail }] });

        if (!user) {
          const userRole = (role && ['Buyer', 'Seller'].includes(role)) ? role : 'Buyer';
          const randomPassword = await bcrypt.hash(Math.random().toString(36).slice(-8) + Date.now(), 10);
          
          user = new User({
            name: userName,
            email: userEmail,
            password: randomPassword,
            role: userRole,
            firebaseUid: uid
          });
          await user.save();
        } else if (!user.firebaseUid) {
          user.firebaseUid = uid;
          await user.save();
        }

        const token = jwt.sign(
          { userId: user._id, email: user.email, role: user.role, name: user.name },
          JWT_SECRET,
          { expiresIn: '7d' }
        );

        return res.json({
          message: 'Firebase authentication successful',
          token,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
          }
        });
      }
      
      return res.status(401).json({ error: 'Failed to verify Firebase token' });
    }
  } catch (error) {
    console.error('Firebase Auth Error:', error);
    res.status(500).json({ error: 'Server error during Firebase authentication' });
  }
});

// Razorpay removed - Payment functionality disabled

// Initialize Nagar Nigam (if not exists)
async function initializeNagarNigam() {
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      console.log('Waiting for MongoDB connection before initializing Nagar Nigam...');
      return;
    }

    const existingNagarNigam = await NagarNigam.findOne({ email: 'nagarnigam@dharani.com' });
    if (!existingNagarNigam) {
      const hashedPassword = await bcrypt.hash('nagarnigam123', 10);
      const nagarNigam = new NagarNigam({
        name: 'Nagar Nigam',
        email: 'nagarnigam@dharani.com',
        password: hashedPassword,
        locations: [
          { name: 'Main Dump Yard', latitude: 28.6139, longitude: 77.2090, address: 'Delhi Main Dump Yard' },
          { name: 'North Zone', latitude: 28.7041, longitude: 77.1025, address: 'North Zone Dump Yard' },
          { name: 'South Zone', latitude: 28.5245, longitude: 77.1855, address: 'South Zone Dump Yard' }
        ]
      });
      await nagarNigam.save();
      console.log('Nagar Nigam initialized with default account: nagarnigam@dharani.com / nagarnigam123');
    } else {
      console.log('Nagar Nigam account already exists: nagarnigam@dharani.com');
    }
  } catch (error) {
    console.error('Error initializing Nagar Nigam:', error);
    // If it's a duplicate key error, that's okay - account already exists
    if (error.code !== 11000) {
      console.error('Unexpected error:', error.message);
    }
  }
}

// Nagar Nigam Login
app.post('/api/nagarnigam/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Ensure Nagar Nigam is initialized before login
    await initializeNagarNigam();

    const nagarNigam = await NagarNigam.findOne({ email });

    if (!nagarNigam) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, nagarNigam.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { nagarNigamId: nagarNigam._id, email: nagarNigam.email, type: 'nagarnigam' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      nagarNigam: {
        id: nagarNigam._id,
        name: nagarNigam.name,
        email: nagarNigam.email
      }
    });
  } catch (error) {
    console.error('Nagar Nigam Login Error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Create Dump Request (for Critical products)
app.post('/api/dump-requests', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'Seller') {
      return res.status(403).json({ error: 'Only sellers can create dump requests' });
    }

    const { listingId, latitude, longitude, address } = req.body;

    if (!listingId) {
      return res.status(400).json({ error: 'Listing ID is required' });
    }

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Location coordinates are required' });
    }

    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (listing.productQuality !== 'Critical') {
      return res.status(400).json({ error: 'Dump requests can only be created for Critical quality items' });
    }

    // Get the first Nagar Nigam (or you can select based on location)
    const nagarNigam = await NagarNigam.findOne();
    if (!nagarNigam) {
      return res.status(503).json({ error: 'Nagar Nigam service not available' });
    }

    const dumpRequest = new DumpRequest({
      listing: listing._id,
      seller: req.user.userId,
      nagarNigam: nagarNigam._id,
      sellerLocation: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        address: address || 'Location provided'
      },
      status: 'Pending'
    });

    await dumpRequest.save();

    // Populate the dump request
    const populated = await DumpRequest.findById(dumpRequest._id)
      .populate('listing')
      .populate('seller', 'name email')
      .populate('nagarNigam', 'name email locations')
      .lean();

    res.status(201).json({
      message: 'Dump request created successfully',
      dumpRequest: populated
    });
  } catch (error) {
    console.error('Create Dump Request Error:', error);
    res.status(500).json({ error: 'Server error while creating dump request' });
  }
});

// Get Dump Requests (for sellers)
app.get('/api/dump-requests', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'Seller') {
      return res.status(403).json({ error: 'Only sellers can view dump requests' });
    }

    const dumpRequests = await DumpRequest.find({ seller: req.user.userId })
      .populate('listing')
      .populate('nagarNigam', 'name email locations')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ dumpRequests });
  } catch (error) {
    console.error('Fetch Dump Requests Error:', error);
    res.status(500).json({ error: 'Server error while fetching dump requests' });
  }
});

// Get Dump Requests for Nagar Nigam
app.get('/api/nagarnigam/dump-requests', authenticate, async (req, res) => {
  try {
    // Verify it's a Nagar Nigam user
    const token = req.headers.authorization?.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    if (decoded.type !== 'nagarnigam') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const dumpRequests = await DumpRequest.find({ nagarNigam: decoded.nagarNigamId })
      .populate('listing')
      .populate('seller', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ dumpRequests });
  } catch (error) {
    console.error('Fetch Nagar Nigam Dump Requests Error:', error);
    res.status(500).json({ error: 'Server error while fetching dump requests' });
  }
});

// Approve/Reject Dump Request
app.post('/api/nagarnigam/dump-requests/:requestId/approve', authenticate, async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    if (decoded.type !== 'nagarnigam') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { requestId } = req.params;
    const { status, dumpLocation } = req.body; // status: 'Approved' or 'Rejected'

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const dumpRequest = await DumpRequest.findById(requestId);
    if (!dumpRequest) {
      return res.status(404).json({ error: 'Dump request not found' });
    }

    dumpRequest.status = status;
    dumpRequest.approvedAt = new Date();
    
    if (status === 'Approved' && dumpLocation) {
      dumpRequest.dumpLocation = {
        latitude: parseFloat(dumpLocation.latitude),
        longitude: parseFloat(dumpLocation.longitude),
        address: dumpLocation.address || 'Approved dump location'
      };
    }

    await dumpRequest.save();

    const populated = await DumpRequest.findById(dumpRequest._id)
      .populate('listing')
      .populate('seller', 'name email')
      .populate('nagarNigam', 'name email')
      .lean();

    res.json({
      message: `Dump request ${status.toLowerCase()} successfully`,
      dumpRequest: populated
    });
  } catch (error) {
    console.error('Approve Dump Request Error:', error);
    res.status(500).json({ error: 'Server error while approving dump request' });
  }
});

app.get('/', (req, res) => {
  res.redirect('/dharani/index.html');
});

// Initialize Nagar Nigam after all schemas are defined and MongoDB is connected
mongoose.connection.once('open', async () => {
  console.log('MongoDB connection open, initializing Nagar Nigam...');
  await initializeNagarNigam();
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Nagar Nigam default login: nagarnigam@dharani.com / nagarnigam123`);
});

