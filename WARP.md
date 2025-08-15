# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

The Coco FAQ API is a Node.js serverless FAQ management system built for Vercel deployment. It provides RESTful endpoints for creating, searching, and managing frequently asked questions with automatic categorization and keyword extraction. The API integrates with Supabase as the backend database and includes intelligent text processing features using the Natural.js library for content analysis.

### Key Features

- **FAQ Search**: Fuzzy text matching with keyword and category filtering
- **Automatic Categorization**: Smart category detection based on question content (beach & safety, dining, activities, etc.)
- **Keyword Extraction**: Automated keyword generation using Natural.js tokenization and stopword filtering
- **Multiple Creation Methods**: Support for both structured JSON and raw Q&A text format parsing
- **Health Monitoring**: Built-in health check endpoint with database connectivity testing
- **CORS Support**: Full cross-origin resource sharing configuration for web clients

### Architecture

```
Client Request → Vercel Edge → Serverless Functions → Supabase Database
                      ↓
                CORS Headers + Response Processing
```

The application follows a serverless architecture pattern where each API endpoint is a separate Vercel function that connects to Supabase using environment-based authentication.

## Development Environment Setup

### Prerequisites

- **Node.js 18+**: Required runtime (specified in `package.json` engines)
- **npm**: Package manager
- **Supabase Account**: For database access
- **Vercel CLI** (optional): For local development with `vercel dev`

### Installation

```bash
# Clone and install dependencies
git clone [repository-url]
cd coco-faq-api
npm install
```

### Environment Configuration

Create a `.env` file in the project root with:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Environment Variables:**
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key with full database access (not the anon key)

### Local Development

**Option 1: Express Server (Recommended for Testing)**
```bash
node test-local.js
# Server runs at http://localhost:3000
# Test endpoint: http://localhost:3000/api/createFaq
```

**Option 2: Vercel Dev Environment**
```bash
npx vercel dev
# Simulates full Vercel serverless environment
```

## Database Schema

The application uses two main Supabase tables:

### `chatbot_faqs` Table

```sql
CREATE TABLE chatbot_faqs (
    id SERIAL PRIMARY KEY,
    category TEXT NOT NULL DEFAULT 'general',
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    keywords TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Columns:**
- `id`: Auto-incrementing primary key
- `category`: FAQ category (auto-detected or manual)
- `question`: The FAQ question text
- `answer`: The FAQ answer text
- `keywords`: Array of searchable keywords (auto-generated)
- `is_active`: Visibility flag for FAQ entries
- `image_url`: Optional image attachment
- `created_at`: Timestamp for creation tracking

### `faq_categories` Table (Optional)

```sql
CREATE TABLE faq_categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

Used for dynamic category detection when available. Falls back to hardcoded category rules if empty.

### Supabase Integration Notes

- You can run SQL scripts directly in the Supabase dashboard SQL editor
- The `test-supabase.js` endpoint references an RPC function `get_schema_tables` for schema introspection
- Ensure Row Level Security (RLS) policies allow service role access

## API Endpoints Reference

### Core FAQ Operations

#### `GET /api/faq-search`
Search FAQs with fuzzy matching and filtering.

**Parameters:**
- `query` (required): Search term
- `category` (optional): Filter by category
- `limit` (optional): Result limit (default: 10)

```bash
curl "https://your-domain.vercel.app/api/faq-search?query=check-in&category=amenities"
```

#### `POST /api/faq-create`
Create FAQ with automatic processing and validation.

**Request Body:**
```json
{
  "question": "What time is check-in?",
  "answer": "Check-in is at 3:00 PM",
  "category": "amenities & facilities",  // optional
  "keywords": ["checkin", "time"],       // optional
  "is_active": true                      // optional
}
```

**Raw Q&A Format Support:**
```json
{
  "raw": "Q: What time is breakfast? A: Breakfast is served 7:30-10:00 AM"
}
```

```bash
curl -X POST https://your-domain.vercel.app/api/faq-create \
  -H "Content-Type: application/json" \
  -d '{"question":"Pool hours?","answer":"Pool open 6AM-10PM daily"}'
```

#### `POST /api/faq-insert`
Direct FAQ insertion with advanced keyword extraction using Natural.js.

Similar to `faq-create` but with enhanced Natural.js tokenization and stopword filtering.

### Utility Endpoints

#### `GET /api/list-faqs`
List recent FAQs (limit 10, newest first).

```bash
curl "https://your-domain.vercel.app/api/list-faqs"
```

#### `GET /api/faq-categories`
Get available categories (from `faq_categories` table or existing FAQ categories).

```bash
curl "https://your-domain.vercel.app/api/faq-categories"
```

#### `GET /api/health`
System health check with database connectivity test.

```bash
curl "https://your-domain.vercel.app/api/health"
```

#### `GET/POST /api/test-supabase`
Comprehensive database connection testing (includes insert test).

## Common Development Commands

### Testing Individual Endpoints

```bash
# Test health check locally
curl "http://localhost:3000/api/health"

# Test FAQ creation locally
curl -X POST http://localhost:3000/api/createFaq \
  -H "Content-Type: application/json" \
  -d '{"question":"Test?","answer":"Test response"}'
```

### Useful Package.json Scripts to Add

Consider adding these scripts to `package.json`:

```json
{
  "scripts": {
    "dev": "node test-local.js",
    "start": "vercel dev",
    "test": "node api/test-supabase.js",
    "deploy": "vercel"
  }
}
```

## Automated Processing Features

### Category Auto-Detection

The system automatically categorizes questions based on content patterns:

- **"amenities & facilities"**: room, hotel, stay, check-in, accommodation
- **"dining"**: food, drink, restaurant, menu, breakfast, lunch, dinner
- **"activities"**: bike, kayak, snorkel, tour, trip, activity
- **"policies"**: policy, rules, pets, smoke, cancel
- **"weather"**: weather, rain, sun, temperature, climate
- **"services"**: wifi, internet, connection, phone, service
- **"general"**: Default fallback category

### Keyword Extraction

Both `faq-create` and `faq-insert` automatically generate keywords by:
1. Tokenizing question + answer text
2. Converting to lowercase
3. Filtering out stopwords (using Natural.js stopwords list)
4. Removing words shorter than 3 characters
5. Deduplicating and limiting to 6-10 keywords

## Troubleshooting Common Issues

### 500 Internal Server Errors

**Cause**: Missing Supabase environment variables
**Solution**: Verify `.env` file contains both `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

```bash
# Debug environment variables
curl "https://your-domain.vercel.app/api/health"
# Check the environment section in the response
```

### 405 Method Not Allowed

**Cause**: Incorrect HTTP method for endpoint
**Solution**: Check API documentation above for correct HTTP verbs

### CORS Issues

All endpoints include CORS headers. For preflight requests:
```bash
curl -X OPTIONS https://your-domain.vercel.app/api/faq-create \
  -H "Access-Control-Request-Method: POST"
```

### Database Permission Issues

**Cause**: Supabase RLS (Row Level Security) blocking service role
**Solution**: Ensure RLS policies allow service role access or disable RLS for development

### Natural.js Processing Errors

**Cause**: Invalid text input for keyword extraction
**Solution**: The system includes fallback error handling - check console logs for specific tokenization issues

## Deployment Architecture

### Vercel Configuration

The `vercel.json` file defines serverless function configurations:
- Runtime: `@vercel/node@3.0.7`
- Each API file is automatically mapped to `/api/[filename]` routes

### Performance Optimization

- Functions include response time tracking
- Retry logic for database operations (up to 3 attempts)
- Input validation to prevent processing invalid data
- Optimized Supabase queries with specific column selection

## OpenAPI Specification

The project includes comprehensive OpenAPI documentation in:
- `coco-faq-api-complete.yaml`: Full API specification
- `openapi-improved.yaml`: Enhanced version
- `openapi-optimized.yaml`: Performance-optimized version

Use these files for API client generation or integration documentation.
