import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { TelegramExecutiveBot } from "./telegram-bot.js";
import {
  LinkedInProfileSearchService,
  SerpApiSearchService,
  ProfileExtractor,
  GoogleSearchResponse,
  SerpApiResponse,
  LinkedInProfile,
} from "./search-services.js";
import dotenv from "dotenv";
dotenv.config();

// Types and Interfaces
interface SearchRequest {
  region?: string;
  company_sector?: string;
  company_type?: string;
  company_size?: string;
  num_results?: number;
  get_all_pages?: boolean;
}

interface SearchResponse {
  query: string;
  total_results: number;
  search_time: number;
  linkedin_urls: string[];
  timestamp: string;
}

// Configuration
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "";
const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID || "";
const SERPAPI_KEY = process.env.SERPAPI_KEY || "";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const CORS_ORIGINS = process.env.CORS_ORIGINS || "*";

// In-memory storage for search history (replacing MongoDB)
const searchHistory: Array<{
  query: string;
  company: string | null;
  region?: string;
  company_sector?: string;
  company_type?: string;
  company_size?: string;
  results_count: number;
  search_time: number;
  timestamp: string;
}> = [];

// Service instances
const searchService = new LinkedInProfileSearchService(
  GOOGLE_API_KEY,
  GOOGLE_CSE_ID
);
const serpApiService = new SerpApiSearchService(SERPAPI_KEY);
const profileExtractor = new ProfileExtractor();

// Initialize Telegram bot if token is provided
let telegramBot: TelegramExecutiveBot | null = null;
if (TELEGRAM_BOT_TOKEN) {
  try {
    telegramBot = new TelegramExecutiveBot(
      TELEGRAM_BOT_TOKEN,
      searchService,
      serpApiService,
      profileExtractor
    );
    telegramBot.start();
    console.log("🤖 Telegram bot initialized and started!");
  } catch (error) {
    console.error("❌ Failed to initialize Telegram bot:", error);
  }
} else {
  console.log("⚠️ Telegram bot token not provided. Telegram bot disabled.");
}

// Create Hono app
const app = new Hono();

// Middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: CORS_ORIGINS === "*" ? "*" : CORS_ORIGINS.split(","),
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// API Routes
app.post("/api/search/profiles", async (c) => {
  try {
    const request: SearchRequest = await c.req.json();
    const startTime = Date.now();

    // Execute search - get all pages by default unless num_results is specified
    const getAllPages =
      request.get_all_pages !== undefined
        ? request.get_all_pages
        : !request.num_results;
    const numResults = request.num_results || 10;

    let searchResults;
    if (getAllPages) {
      searchResults = await searchService.searchCtoProfiles(
        request.region,
        request.company_sector,
        request.company_type,
        undefined,
        true
      );
    } else {
      searchResults = await searchService.searchCtoProfilesLimited(
        request.region,
        request.company_sector,
        request.company_type,
        undefined,
        numResults
      );
    }

    // Extract and validate profiles
    const searchContext = [
      request.region,
      request.company_sector,
      request.company_type,
    ]
      .filter(Boolean)
      .join(" ");
    const profiles = profileExtractor.extractProfiles(
      searchResults,
      searchContext
    );

    // Calculate search metrics
    const endTime = Date.now();
    const searchTime = (endTime - startTime) / 1000;
    const totalResults = profiles.length;

    // Construct query string for logging
    const queryParts = [
      request.region,
      request.company_sector,
      request.company_type,
      request.company_size,
    ].filter(Boolean);
    const query = queryParts.length > 0 ? queryParts.join(" ") : "All CTOs";

    // Store search in memory for analytics (replacing MongoDB)
    const searchRecord = {
      query,
      company: null,
      region: request.region,
      company_sector: request.company_sector,
      company_type: request.company_type,
      company_size: request.company_size,
      results_count: totalResults,
      search_time: searchTime,
      timestamp: new Date().toISOString(),
    };
    searchHistory.unshift(searchRecord);

    // Keep only last 100 searches
    if (searchHistory.length > 100) {
      searchHistory.splice(100);
    }

    // Extract only LinkedIn URLs from profiles
    const linkedinUrls = profiles.map((profile) => profile.linkedin_url);

    const response: SearchResponse = {
      query,
      total_results: totalResults,
      search_time: searchTime,
      linkedin_urls: linkedinUrls,
      timestamp: new Date().toISOString(),
    };

    return c.json(response);
  } catch (error) {
    console.error("Search failed:", error);
    return c.json({ error: `Search failed: ${error}` }, 500);
  }
});

// SerpAPI endpoint
app.post("/api/search/profiles-serpapi", async (c) => {
  try {
    const request: SearchRequest = await c.req.json();
    const startTime = Date.now();

    // Check if SerpAPI key is configured
    if (!SERPAPI_KEY) {
      return c.json({ error: "SerpAPI key not configured" }, 400);
    }

    // Execute search - get all pages by default unless num_results is specified
    const getAllPages =
      request.get_all_pages !== undefined
        ? request.get_all_pages
        : !request.num_results;

    const searchResults = await serpApiService.searchCtoProfiles(
      request.region,
      request.company_sector,
      request.company_type,
      undefined,
      getAllPages
    );

    // Extract and validate profiles using SerpAPI extractor
    const searchContext = [
      request.region,
      request.company_sector,
      request.company_type,
    ]
      .filter(Boolean)
      .join(" ");
    const profiles = profileExtractor.extractProfilesFromSerpApi(
      searchResults,
      searchContext
    );

    // Calculate search metrics
    const endTime = Date.now();
    const searchTime = (endTime - startTime) / 1000;
    const totalResults = profiles.length;

    // Construct query string for logging
    const queryParts = [
      request.region,
      request.company_sector,
      request.company_type,
      request.company_size,
    ].filter(Boolean);
    const query = queryParts.length > 0 ? queryParts.join(" ") : "All CTOs";

    // Store search in memory for analytics
    const searchRecord = {
      query: `${query} (SerpAPI)`,
      company: null,
      region: request.region,
      company_sector: request.company_sector,
      company_type: request.company_type,
      company_size: request.company_size,
      results_count: totalResults,
      search_time: searchTime,
      timestamp: new Date().toISOString(),
    };
    searchHistory.unshift(searchRecord);

    // Keep only last 100 searches
    if (searchHistory.length > 100) {
      searchHistory.splice(100);
    }

    // Extract only LinkedIn URLs from profiles
    const linkedinUrls = profiles.map((profile) => profile.linkedin_url);

    const response: SearchResponse = {
      query: `${query} (SerpAPI)`,
      total_results: totalResults,
      search_time: searchTime,
      linkedin_urls: linkedinUrls,
      timestamp: new Date().toISOString(),
    };

    return c.json(response);
  } catch (error) {
    console.error("SerpAPI search failed:", error);
    return c.json({ error: `SerpAPI search failed: ${error}` }, 500);
  }
});

app.get("/api/search/history", async (c) => {
  try {
    const limit = Math.min(parseInt(c.req.query("limit") || "10"), 50);
    const searches = searchHistory.slice(0, limit);
    return c.json({ searches });
  } catch (error) {
    console.error("Failed to get search history:", error);
    return c.json({ error: "Failed to get search history" }, 500);
  }
});

app.get("/api/", async (c) => {
  return c.json({ message: "LinkedIn CTO Finder API", status: "active" });
});

app.get("/api/health", async (c) => {
  return c.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Root route
app.get("/", async (c) => {
  return c.json({ message: "LinkedIn CTO Finder API", status: "active" });
});

// Start server
const port = parseInt(process.env.PORT || "3000");

console.log(`🚀 LinkedIn CTO Finder API starting on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});

console.log(`✅ Server running at http://localhost:${port}`);
