# User Authentication System

A complete user authentication system with signup, login, and dashboard functionality.

## Features

- ✅ User Signup with Name, Email, Password, and Role (Buyer/Seller)
- ✅ User Login with Email and Password
- ✅ JWT Token Authentication
- ✅ Secure Password Hashing (bcrypt)
- ✅ MongoDB Database Storage
- ✅ Dashboard with User Information
- ✅ Automatic Redirect After Login

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment Variables

Create a `.env` file in the root directory:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/hackathon-auth
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

### 3. Start MongoDB

Make sure MongoDB is running on your system. If you don't have MongoDB installed:

- **Windows**: Download from [MongoDB Download Center](https://www.mongodb.com/try/download/community)
- **Mac**: `brew install mongodb-community`
- **Linux**: Follow [MongoDB Installation Guide](https://docs.mongodb.com/manual/installation/)

Or use MongoDB Atlas (cloud) and update the `MONGODB_URI` in `.env`

### 4. Start the Server

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

### 5. Access the Application

- **Signup Page**: http://localhost:3000/signup.html
- **Login Page**: http://localhost:3000/login.html
- **Dashboard**: http://localhost:3000/dashboard.html (requires login)

## API Endpoints

### POST /api/signup
Create a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "Buyer"
}
```

**Response:**
```json
{
  "message": "User created successfully",
  "token": "jwt-token-here",
  "user": {
    "id": "user-id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "Buyer"
  }
}
```

### POST /api/login
Login with email and password.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "jwt-token-here",
  "user": {
    "id": "user-id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "Buyer"
  }
}
```

### GET /api/verify
Verify JWT token and get user information.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "user": {
    "_id": "user-id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "Buyer"
  }
}
```

## Project Structure

```
.
├── server.js              # Express server and API routes
├── package.json           # Dependencies
├── .env                   # Environment variables (create this)
├── .env.example          # Example environment variables
├── public/
│   ├── signup.html       # Signup page
│   ├── login.html        # Login page
│   ├── dashboard.html    # Dashboard page
│   ├── auth.js          # Frontend authentication logic
│   ├── dashboard.js     # Dashboard logic
│   └── styles.css       # Styling
└── README.md            # This file
```

## Technologies Used

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **Frontend**: HTML, CSS, JavaScript

## Security Features

- Passwords are hashed using bcrypt before storing
- JWT tokens for secure authentication
- Token expiration (7 days)
- Input validation on both client and server side
- CORS enabled for cross-origin requests

## Notes

- Make sure to change the `JWT_SECRET` in production
- Use a strong, unique JWT secret key
- Consider adding rate limiting for production
- Add HTTPS in production environment

