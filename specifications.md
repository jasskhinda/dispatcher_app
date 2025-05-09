# Compassionate Rides - Dispatcher App Specifications

## Overview
Compassionate Rides is a specialized transportation management system designed for coordinating medical and mobility-focused transportation services. The dispatcher app serves as the central platform for managing clients, drivers, trips, and invoices.

## System Architecture
- **Frontend**: Next.js application with React components
- **Backend**: Supabase (PostgreSQL database with authentication)
- **Styling**: Tailwind CSS with custom color palette
- **Maps Integration**: Google Maps API for addresses and distance calculation
- **Authentication**: Supabase Auth with role-based permissions

## User Roles

### Dispatcher
- Administrative users with full system access
- Manage clients and drivers
- Create, view, update, and cancel trips
- Assign drivers to trips
- Generate and manage invoices
- Access all system features and data

### Driver
- Transportation service providers
- Associated with vehicle information
- Can be assigned to trips
- Status tracking (active, on_trip, inactive)
- Managed by dispatchers

### Client
- Service recipients
- Personal information stored in system
- Trips scheduled on their behalf
- Invoices generated for their trips
- Accessibility needs tracked

## Core Features

### Client Management
- Comprehensive client profiles with:
  - Personal information (name, contact details, address)
  - Special needs or accessibility requirements
  - Trip history and statistics
  - Invoicing history
- Add, edit, and view client records
- Quick access to create trips for specific clients

### Driver Management
- Driver profiles containing:
  - Personal and contact information
  - Vehicle details (model, license plate)
  - Current status (active, on_trip, inactive)
  - Assignment history
- Add, edit, and view driver information
- Track driver availability and performance

### Trip Management
- **Creation Process**:
  - Select client
  - Enter pickup and destination addresses
  - Set date and time
  - Specify round trip or one-way
  - Add special requirements
  - Automatic price calculation
  - Optional driver assignment

- **Trip Status Workflow**:
  - Initial status: "pending" or "upcoming"
  - Can progress through: "in_progress"
  - Final status: "completed" or "cancelled"

- **Trip Views**:
  - Calendar-based visualization
  - List view with filtering options
  - Map view showing locations

### Calendar Interface
- Monthly, weekly, and daily view options
- Color-coded trip status visualization
- Filtering by driver or status
- Quick access to trip details
- View of driver assignments

### Map Functionality
- Visualization of trip origins and destinations
- Address validation
- Distance calculation
- Potential real-time tracking

## Trip Pricing Model

The pricing system is comprehensive and accounts for multiple factors:

### Base Pricing
- **One-way trip**: $50 base fare
- **Round trip**: $100 base fare ($50 additional for return trip)

### Distance-Based Pricing
- **Rate**: $3 per mile
- **One-way trip**: Distance calculated using Google Maps Distance Matrix API
- **Round trip**: Distance is doubled to account for return journey
- Fallback to estimate (15 miles for one-way, 30 miles for round trip) if API calculation fails

### Surcharges
- **Weekend Surcharge**: $40 extra for Saturday/Sunday pickups
- **Hour Surcharge**: $40 extra for early morning (before 8 AM) or late night (after 8 PM) pickups
- **Holiday Surcharge**: $100 extra for major US holidays:
  - New Year's Day
  - Independence Day (July 4th)
  - Thanksgiving Day
  - Christmas Day (December 25th)
- **Wheelchair Accessibility**: $25 extra for wheelchair-accessible vehicle requirements

### Price Calculation Formula
```
Total Price = Base Price + Distance Price + Weekend Surcharge + Hour Surcharge + Holiday Surcharge + Wheelchair Price
```

The system recalculates prices automatically when any factor changes during trip creation.

## Invoice System

### Invoice Creation
- Generate from completed trips (automatic price import)
- Create manually with custom pricing
- Associate with specific clients
- Add multiple trips to a single invoice

### Invoice Details
- Automatic invoice numbering: INV-YYYYMMDD-XXXX
- Issue date and due date
- Client information
- Trip details and pricing breakdown
- Notes section
- Status tracking (pending, paid, cancelled)

### Invoice Management
- View, edit, and update invoices
- Track payment status
- View invoice history by client

## Accessibility and UI Features
- Responsive design for mobile, tablet, and desktop
- Dark/light mode theme switching
- Semantic HTML for screen reader compatibility
- Proper contrast for readability
- Clean, intuitive interface for dispatcher efficiency

## Security
- Supabase authentication with session management
- Row-level security policies for data protection
- Role-based access control
- Secure API integrations

## Testing
- End-to-end testing with Playwright
- Test coverage for critical user workflows:
  - Authentication
  - Trip creation and management
  - Client and driver access
  - Trip status workflows
  - Return pickup time handling

## Development Guidelines
- Next.js application structure
- Component-based architecture
- Tailwind CSS for styling
- JavaScript with JSX
- Server and client components for optimal performance

## Color Palette

### Light Mode
- **Primary**: #3B5B63 (Dark teal for text and outlines)
- **Secondary**: #84CED3 (Light teal for windows and heart)
- **Background**: #FFFFFF (White)
- **Surface**: #F5F7F8 (Very light grey)
- **OnPrimary**: #FFFFFF (White text on primary)
- **OnSecondary**: #3B5B63 (Text on light teal)
- **Disabled**: #B0BEC5 (Muted grey)

### Dark Mode
- **Primary**: #84CED3 (Light teal accent color)
- **Secondary**: #3B5B63 (Dark teal)
- **Background**: #121212 (Dark background)
- **Surface**: #1E1E1E (Slightly lighter than background)
- **OnPrimary**: #121212 (Dark text on light teal)
- **OnSecondary**: #FFFFFF (White text on dark teal)
- **Disabled**: #666C6F (Muted grey)