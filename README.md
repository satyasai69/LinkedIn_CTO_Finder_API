# LinkedIn CTO Finder API

A TypeScript API built with Bun and Hono framework to find CTOs and technology executives using Google Custom Search.

## Features

- 🔍 **Dual Search APIs**: Choose between Google Custom Search API and SerpAPI
- 🔍 Search for CTO and technology executive profiles on LinkedIn
- 📄 **Pagination support**: Automatically fetches all available pages from Google Search
- 🎯 Filter by region, company sector, and company type
- 📊 Confidence scoring for profile relevance
- 📈 In-memory search history (no database required)
- ⚡ Fast performance with Bun runtime
- 🌐 CORS enabled for web applications
- 🔄 Rate limiting protection with automatic delays

## Tech Stack

- **Runtime**: Bun
- **Framework**: Hono
- **Language**: TypeScript
- **Storage**: In-memory (no database)

## Prerequisites

- [Bun](https://bun.sh/) installed on your system
- Google Custom Search API key
- Google Custom Search Engine ID

## Installation

1. Install dependencies:
```bash
bun install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Update `.env` with your API credentials:
```env
# Google Custom Search API (for /api/search/profiles)
GOOGLE_API_KEY=your_google_api_key
GOOGLE_CSE_ID=your_custom_search_engine_id

# SerpAPI (for /api/search/profiles-serpapi)
SERPAPI_KEY=your_serpapi_key_here

PORT=3000
CORS_ORIGINS=*
```

**Note**: You can configure either or both APIs. The application will work with whichever API keys you provide.

## Usage

### Development
```bash
bun run dev
```

### Production
```bash
bun run start
```

### Build
```bash
bun run build
```

## API Endpoints

### POST /api/search/profiles
Search for CTO profiles using Google Custom Search API with optional filters.

**Request Body:**
```json
{
  "region": "San Francisco",
  "company_sector": "software",
  "company_type": "startup",
  "company_size": "50-200",
  "num_results": 10,
  "get_all_pages": true
}
```

### POST /api/search/profiles-serpapi
Search for CTO profiles using SerpAPI with optional filters.

**Request Body:**
```json
{
  "region": "San Francisco",
  "company_sector": "software",
  "company_type": "startup",
  "company_size": "50-200",
  "num_results": 10,
  "get_all_pages": true
}
```

**Parameters (both endpoints):**
- `region` (optional): Geographic filter
- `company_sector` (optional): Industry sector filter
- `company_type` (optional): Company stage/size filter
- `company_size` (optional): Company size range
- `num_results` (optional): Number of results when `get_all_pages` is false (default: 10)
- `get_all_pages` (optional): If true, fetches all available pages from search API (default: true when `num_results` is not specified)

**Response:**
```json
{
  "query": "San Francisco software startup",
  "total_results": 15,
  "search_time": 2.3,
  "linkedin_urls": [
    "https://linkedin.com/in/johnsmith",
    "https://linkedin.com/in/janedoe",
    "https://linkedin.com/in/mikejohnson"
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### GET /api/search/history
Get recent search history.

**Query Parameters:**
- `limit` (optional): Number of results to return (default: 10, max: 50)

### GET /api/health
Health check endpoint.

### GET /api/
API status endpoint.

## Supported Filters

### Company Sectors
- software
- fintech
- healthcare
- e-commerce
- AI/ML
- cybersecurity
- blockchain
- IoT
- gaming

### Company Types
- startup
- SME
- enterprise
- unicorn
- public

## Executive Titles Searched

- CTO
- Chief Technology Officer
- VP Technology
- Head of Technology
- Technology Director
- VP Engineering
- Chief Technical Officer
- Head of Engineering
- Tech Lead
- Engineering Director
- Technology VP
- VP of Technology
- VP of Engineering
- Head of Tech

## Confidence Scoring

Profiles are scored based on:
- **Title Relevance** (0-40 points): Matches executive titles
- **Context Match** (0-30 points): Matches search filters
- **Profile Completeness** (0-30 points): Quality of profile data

Minimum confidence score: 20.0

## Migration from Python/FastAPI

This TypeScript version replaces:
- FastAPI → Hono
- Python → TypeScript
- MongoDB → In-memory storage
- uvicorn → Bun runtime
- httpx → fetch API
- pydantic → TypeScript interfaces

## Performance

- ⚡ Bun provides faster startup and runtime performance
- 🔄 In-memory storage eliminates database latency
- 📦 Smaller bundle size with Hono
- 🚀 Native TypeScript support

## License

MIT License