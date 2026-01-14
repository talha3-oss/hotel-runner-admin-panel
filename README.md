# Luxotel Admin Dashboard

A comprehensive hotel management admin dashboard built with Next.js, TypeScript, and Tailwind CSS. This dashboard provides complete management capabilities for hotel operations including bookings, customers, rooms, payments, and analytics.

## Features

### 🔐 Authentication
- **Super Admin Login & Signup**: Secure authentication system
- **Role-based Access**: Different access levels for admins and managers
- **Session Management**: Automatic logout and session timeout

### 🏨 Hotel Management
- **Countries & Locations**: Manage hotel locations by country
- **Hotel Properties**: Add, edit, and manage multiple hotel properties
- **Room Management**: Complete room inventory management

### 🛏️ Room Management
- **Room Types**: 
  - Room Only
  - Breakfast Included
  - Dinner Included
  - Bed & Breakfast
- **Room Operations**: Add, edit, delete rooms
- **Availability Tracking**: Real-time room status updates
- **Pricing Management**: Dynamic room pricing

### 📅 Booking Management
- **Booking Overview**: Complete booking lifecycle management
- **Customer Details**: Comprehensive customer information
- **Booking Status**: Confirmed, Pending, Cancelled tracking
- **Extras Management**: Additional services and amenities
- **Invoice Generation**: Automated invoice creation

### 👥 Customer Management
- **Customer Profiles**: Detailed customer information
- **Booking History**: Complete booking records per customer
- **Loyalty Points**: Customer loyalty program tracking
- **VIP Status**: Special customer tier management
- **Preferences**: Customer preference tracking

### 💳 Payment Integration
- **Multiple Payment Methods**:
  - Credit Card (Stripe)
  - MontyPay.com integration
  - Pay at Hotel option
- **Payment Tracking**: Complete payment history
- **Transaction Management**: Failed payment handling
- **Receipt Generation**: Automated receipt creation

### 📊 Analytics & Reporting
- **Revenue Analytics**: Monthly revenue tracking
- **Occupancy Rates**: Room occupancy statistics
- **Customer Segmentation**: Business vs leisure analytics
- **Room Performance**: Room type performance metrics
- **Booking Trends**: Historical booking analysis

### 🧾 Invoice Management
- **Automated Invoicing**: Generate invoices for bookings
- **PDF Export**: Download invoices as PDF
- **Print Functionality**: Direct invoice printing
- **Tax Calculations**: Automatic tax computation
- **Payment Status**: Invoice payment tracking

### 🔧 Settings & Configuration
- **General Settings**: Hotel name, timezone, currency
- **Notification Settings**: Email, SMS, push notifications
- **Payment Configuration**: Payment provider settings
- **Security Settings**: Two-factor auth, session management
- **User Management**: Admin user management

## Technology Stack

- **Frontend**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Heroicons
- **State Management**: React Hooks
- **Authentication**: Local storage (demo) - ready for backend integration

## Color Scheme

The dashboard uses a warm brown/maroon color palette as requested:
- **Primary Color**: #B47A3A (Brown)
- **Secondary Colors**: Maroon variations
- **UI Colors**: Professional grays and whites

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd luxotel-admin
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Default Login
- **Email**: Any valid email
- **Password**: Any password (demo mode)

## Project Structure

```
luxotel-admin/
├── app/                          # Next.js App Router
│   ├── auth/                     # Authentication pages
│   │   ├── login/               # Login page
│   │   └── signup/              # Signup page
│   ├── dashboard/               # Main dashboard
│   │   ├── analytics/           # Analytics page
│   │   ├── bookings/            # Booking management
│   │   ├── customers/           # Customer management
│   │   ├── hotels/              # Hotel management
│   │   ├── invoices/            # Invoice management
│   │   ├── locations/           # Location management
│   │   ├── payments/            # Payment management
│   │   ├── rooms/               # Room management
│   │   └── settings/            # Settings page
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Home page (redirects to login)
├── components/                   # Reusable components
│   ├── Header.tsx               # Dashboard header
│   └── Sidebar.tsx              # Navigation sidebar
├── public/                      # Static assets
├── package.json                 # Dependencies
├── tailwind.config.js           # Tailwind configuration
├── tsconfig.json               # TypeScript configuration
└── README.md                   # This file
```

## Key Features Implementation

### Booking Flow
1. **Room Selection**: Choose from available room types
2. **Customer Information**: Capture guest details
3. **Extras Selection**: Add additional services
4. **Payment Processing**: Multiple payment options
5. **Confirmation**: Booking confirmation and invoice generation

### Price Comparison Integration
Ready for integration with:
- Booking.com API
- Expedia.com API  
- Trip.com API
- Agoda.com API

### Payment Integration
- **Stripe**: Credit card processing
- **MontyPay**: Integrated payment gateway
- **Pay at Hotel**: Deferred payment option

## Customization

### Colors
Update the color scheme in `tailwind.config.js`:
```javascript
colors: {
  primary: {
    500: '#B47A3A', // Your brand color
    // ... other shades
  }
}
```

### Features
The dashboard is modular and easily extensible. Add new features by:
1. Creating new pages in `app/dashboard/`
2. Adding navigation items in `components/Sidebar.tsx`
3. Implementing the UI components

## Deployment

### Build for Production
```bash
npm run build
npm start
```

### Deploy to Vercel
```bash
npx vercel
```

## Backend Integration

This is a frontend-only implementation. To connect to a backend:

1. **Replace mock data** with API calls
2. **Implement authentication** with your auth provider
3. **Add form validation** and error handling
4. **Connect payment gateways** with real API keys
5. **Implement file uploads** for room images

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the development team.

---

**Built with ❤️ for Luxotel Hotels**