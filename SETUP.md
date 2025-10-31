# AdminFlow Setup Guide

## 🚀 Quick Start

### 1. Navigate to AdminFlow directory

```bash
cd AdminFlow
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development Server

```bash
npm start
```

The application will automatically open in your default browser at `http://localhost:3000`

## 📁 Project Structure

```
AdminFlow/
├── public/
│   └── index.html          # HTML template
├── src/
│   ├── screens/
│   │   ├── SignIn.js       # Sign In screen
│   │   ├── SignIn.css      # Sign In styles
│   │   ├── Home.js         # Home/Dashboard screen
│   │   └── Home.css        # Home styles
│   ├── App.js              # Main app with routing
│   ├── App.css             # Global app styles
│   ├── index.js            # Entry point
│   ├── index.css           # Global styles
│   └── firebase.config.js  # Firebase configuration
├── package.json
└── README.md
```

## 🔐 Authentication

The admin portal uses Firebase Authentication and checks for Admin user type.

### To create an admin user:

1. Sign up using the mobile app or Firebase Console
2. In Firebase Realtime Database, set the user's type to `Admin`:
   ```
   users/{userId}/personalInfo/userType: "Admin"
   ```

### Admin Login Flow:

1. User enters email and password
2. System authenticates with Firebase Auth
3. System checks userType from Realtime Database
4. Only users with userType === "Admin" can access the dashboard
5. Non-admin users get "Access denied" error

## 🎨 Features

### Sign In Screen
- Email and password authentication
- Firebase integration
- Admin role verification
- Error handling
- Responsive design

### Home Screen
- Welcome dashboard
- Admin information display
- Statistics cards (Users, Classes, Instructors, Bookings)
- Quick action buttons
- Sign out functionality

## 🔧 Configuration

The Firebase configuration is already set up in `src/firebase.config.js` with your project credentials:

- Project: motherland-b0f07
- Realtime Database: Connected
- Authentication: Enabled

## 🌐 Routes

- `/` - Sign In page
- `/home` - Admin Dashboard (protected)
- `/*` - Redirects to sign in

## 📦 Dependencies

- React 18.2.0
- React Router DOM 6.20.0
- Firebase 10.7.1

## 🎨 Styling

The project uses:
- Custom CSS with gradient themes
- Brand colors: #F708F7, #C708F7, #F76B0B
- Responsive design
- Smooth animations

## 🚢 Production Build

To create a production build:

```bash
npm run build
```

The optimized build will be in the `build/` folder.

## 🔒 Security Notes

- Admin authentication is required
- User type verification from database
- Session management with localStorage
- Automatic redirect on unauthorized access

## 📝 Notes

- Make sure Firebase project is properly configured
- Ensure admin users have userType set to "Admin" in database
- Port 3000 must be available for development server

