# Location Services Setup

This document explains how to set up location services for the Buckit app.

## Required API Keys

### Google Places API Key

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Places API
   - Maps JavaScript API
   - Geocoding API
4. Create credentials (API Key)
5. Restrict the API key to your app's bundle identifier
6. Add the API key to your environment variables

### Environment Variables

Create a `.env` file in the root of your mobile app directory with:

```env
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=your_google_places_api_key_here
```

## Features Implemented

### LocationPicker Component
- Google Places autocomplete search
- Current location detection
- Interactive map with marker placement
- Location validation and error handling

### Database Integration
- Location name storage (`location_name` field)
- Geographic coordinates storage (`location_point` field using PostGIS)
- Updated RPC functions to handle location data

### Challenge Creation & Editing
- Location picker in challenge creation form
- Location picker in challenge editing interface
- Location display with map preview in challenge details

## Database Schema

The `items` table includes:
- `location_name` (TEXT): Human-readable location name
- `location_point` (GEOGRAPHY(POINT, 4326)): Geographic coordinates

## RPC Functions

### create_item_secure
```sql
create_item_secure(
    p_bucket_id UUID,
    p_title TEXT,
    p_description TEXT,
    p_category TEXT DEFAULT NULL,
    p_location_name TEXT DEFAULT NULL,
    p_location_point TEXT DEFAULT NULL
)
```

### update_item_secure
```sql
update_item_secure(
    p_item_id UUID,
    p_title TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_category TEXT DEFAULT NULL,
    p_location_name TEXT DEFAULT NULL,
    p_location_point TEXT DEFAULT NULL
)
```

### get_items_with_location_secure
Returns items with location data including latitude/longitude coordinates.

## Usage

### Creating a Challenge with Location
1. Open the challenge creation form
2. Tap the location field
3. Search for a location or use current location
4. Confirm the selection
5. The location will be saved with both name and coordinates

### Editing Challenge Location
1. Open a challenge in bucket detail
2. Tap the edit button
3. Tap the location field to open the location picker
4. Select a new location or clear the existing one
5. Save the changes

### Viewing Challenge Location
1. Open challenge details
2. Tap on the location to view it on a map
3. See location name, address, and coordinates

## ML Model Integration

The location data is stored in a format suitable for ML model integration:

- **Location Name**: Text for natural language processing
- **Coordinates**: Numeric latitude/longitude for geographic analysis
- **Address**: Structured address information for location-based recommendations

This data can be used for:
- Geographic clustering of challenges
- Location-based challenge recommendations
- Distance-based sorting and filtering
- Regional trend analysis
