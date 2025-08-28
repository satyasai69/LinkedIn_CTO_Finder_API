import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";

// Types and Interfaces
interface SearchRequest {
  region?: string;
  company_sector?: string;
  company_type?: string;
  company_size?: string;
  num_results?: number;
  get_all_pages?: boolean;
}

interface LinkedInProfile {
  name: string;
  title: string;
  company: string;
  linkedin_url: string;
  snippet: string;
  confidence_score: number;
  location?: string;
  sources: string[];
}

interface SearchResponse {
  query: string;
  total_results: number;
  search_time: number;
  linkedin_urls: string[];
  timestamp: string;
}

interface GoogleSearchItem {
  title: string;
  link: string;
  snippet: string;
}

interface GoogleSearchResponse {
  items?: GoogleSearchItem[];
}

interface SerpApiSearchItem {
  title: string;
  link: string;
  snippet: string;
}

interface SerpApiResponse {
  organic_results?: SerpApiSearchItem[];
}

// Configuration
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "";
const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID || "";
const GOOGLE_SEARCH_URL = "https://www.googleapis.com/customsearch/v1";
const SERPAPI_KEY = process.env.SERPAPI_KEY || "";
const SERPAPI_URL = "https://serpapi.com/search";
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

class LinkedInProfileSearchService {
  private apiKey: string;
  private cseId: string;
  private baseUrl: string;

  constructor(apiKey: string, cseId: string) {
    this.apiKey = apiKey;
    this.cseId = cseId;
    this.baseUrl = GOOGLE_SEARCH_URL;
  }

  async searchCtoProfiles(
    region?: string,
    companySector?: string,
    companyType?: string,
    additionalTitles?: string[],
    getAllPages: boolean = true
  ): Promise<GoogleSearchResponse> {
    // Construct Boolean search query for executive titles
    const executiveTitles = [
      "CTO",
      "Chief Technology Officer",
      "VP Technology",
      "Head of Technology",
      "Technology Director",
      "VP Engineering",
      "Chief Technical Officer",
      "Head of Engineering",
      "Tech Lead",
      "Engineering Director",
      "Technology VP",
      "Chief Technology",
      "VP of Technology",
      "VP of Engineering",
      "Head of Tech",
    ];

    if (additionalTitles) {
      executiveTitles.push(...additionalTitles);
    }

    // Build title search component
    const titleQuery = executiveTitles
      .map((title) => `"${title}"`)
      .join(" OR ");

    // Construct complete search query
    const queryParts = ["site:linkedin.com/in/", `(${titleQuery})`];

    // Add optional filters
    if (region) {
      queryParts.push(`"${region}"`);
    }

    if (companySector) {
      // Add sector-related keywords
      const sectorKeywords: Record<string, string[]> = {
        software: ["software", "SaaS", "tech", "technology"],
        fintech: ["fintech", "financial technology", "finance", "banking"],
        healthcare: ["healthcare", "medical", "health tech", "biotech"],
        "e-commerce": ["e-commerce", "ecommerce", "retail", "online"],
        "AI/ML": ["AI", "ML", "artificial intelligence", "machine learning"],
        cybersecurity: ["cybersecurity", "security", "infosec"],
        blockchain: ["blockchain", "crypto", "web3"],
        IoT: ["IoT", "Internet of Things", "connected devices"],
        gaming: ["gaming", "game", "entertainment"],
      };

      const sectorTerms = sectorKeywords[companySector.toLowerCase()] || [
        companySector,
      ];
      const sectorQuery = sectorTerms.map((term) => `"${term}"`).join(" OR ");
      queryParts.push(`(${sectorQuery})`);
    }

    if (companyType) {
      // Add company type indicators
      const typeKeywords: Record<string, string[]> = {
        startup: ["startup", "early stage", "seed"],
        SME: ["SME", "medium business", "scale-up"],
        enterprise: ["enterprise", "Fortune", "large company"],
        unicorn: ["unicorn", "billion", "$1B"],
        public: ["public company", "NYSE", "NASDAQ", "publicly traded"],
      };

      const typeTerms = typeKeywords[companyType.toLowerCase()] || [
        companyType,
      ];
      const typeQuery = typeTerms.map((term) => `"${term}"`).join(" OR ");
      queryParts.push(`(${typeQuery})`);
    }

    // Exclude common non-executive terms
    const excludes = [
      "Intern",
      "Student",
      "Former",
      "Ex-",
      "Previous",
      "Consultant",
    ];
    excludes.forEach((exclude) => {
      queryParts.push(`-"${exclude}"`);
    });

    const query = queryParts.join(" ");

    return await this.executeSearchAllPages(query);
  }

  async searchCtoProfilesLimited(
    region?: string,
    companySector?: string,
    companyType?: string,
    additionalTitles?: string[],
    numResults: number = 10
  ): Promise<GoogleSearchResponse> {
    // Construct Boolean search query for executive titles
    const executiveTitles = [
      "CTO",
      "Chief Technology Officer",
      "VP Technology",
      "Head of Technology",
      "Technology Director",
      "VP Engineering",
      "Chief Technical Officer",
      "Head of Engineering",
      "Tech Lead",
      "Engineering Director",
      "Technology VP",
      "Chief Technology",
      "VP of Technology",
      "VP of Engineering",
      "Head of Tech",
    ];

    if (additionalTitles) {
      executiveTitles.push(...additionalTitles);
    }

    // Build title search component
    const titleQuery = executiveTitles
      .map((title) => `"${title}"`)
      .join(" OR ");

    // Construct complete search query
    const queryParts = ["site:linkedin.com/in/", `(${titleQuery})`];

    // Add optional filters
    if (region) {
      queryParts.push(`"${region}"`);
    }

    if (companySector) {
      // Add sector-related keywords
      const sectorKeywords: Record<string, string[]> = {
        software: ["software", "SaaS", "tech", "technology"],
        fintech: ["fintech", "financial technology", "finance", "banking"],
        healthcare: ["healthcare", "medical", "health tech", "biotech"],
        "e-commerce": ["e-commerce", "ecommerce", "retail", "online"],
        "AI/ML": ["AI", "ML", "artificial intelligence", "machine learning"],
        cybersecurity: ["cybersecurity", "security", "infosec"],
        blockchain: ["blockchain", "crypto", "web3"],
        IoT: ["IoT", "Internet of Things", "connected devices"],
        gaming: ["gaming", "game", "entertainment"],
      };

      const sectorTerms = sectorKeywords[companySector.toLowerCase()] || [
        companySector,
      ];
      const sectorQuery = sectorTerms.map((term) => `"${term}"`).join(" OR ");
      queryParts.push(`(${sectorQuery})`);
    }

    if (companyType) {
      // Add company type indicators
      const typeKeywords: Record<string, string[]> = {
        startup: ["startup", "early stage", "seed"],
        SME: ["SME", "medium business", "scale-up"],
        enterprise: ["enterprise", "Fortune", "large company"],
        unicorn: ["unicorn", "billion", "$1B"],
        public: ["public company", "NYSE", "NASDAQ", "publicly traded"],
      };

      const typeTerms = typeKeywords[companyType.toLowerCase()] || [
        companyType,
      ];
      const typeQuery = typeTerms.map((term) => `"${term}"`).join(" OR ");
      queryParts.push(`(${typeQuery})`);
    }

    // Exclude common non-executive terms
    const excludes = [
      "Intern",
      "Student",
      "Former",
      "Ex-",
      "Previous",
      "Consultant",
    ];
    excludes.forEach((exclude) => {
      queryParts.push(`-"${exclude}"`);
    });

    const query = queryParts.join(" ");

    return await this.executeSearch(query, numResults);
  }

  private async executeSearch(
    query: string,
    numResults: number
  ): Promise<GoogleSearchResponse> {
    const params = new URLSearchParams({
      key: this.apiKey,
      cx: this.cseId,
      q: query,
      num: Math.min(numResults, 10).toString(),
      safe: "active",
      lr: "lang_en",
    });

    try {
      const response = await fetch(`${this.baseUrl}?${params}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Search API request failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Search API request failed: ${error}`);
    }
  }

  private async executeSearchAllPages(
    query: string
  ): Promise<GoogleSearchResponse> {
    const allItems: GoogleSearchItem[] = [];
    let startIndex = 1;
    const maxResults = 10; // Google API limit per request
    let hasMoreResults = true;

    console.log(`Starting paginated search for query: ${query}`);

    while (hasMoreResults) {
      const params = new URLSearchParams({
        key: this.apiKey,
        cx: this.cseId,
        q: query,
        num: maxResults.toString(),
        start: startIndex.toString(),
        safe: "active",
        lr: "lang_en",
      });

      try {
        console.log(`Fetching page starting at index ${startIndex}`);
        const response = await fetch(`${this.baseUrl}?${params}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          console.error(`Search API request failed: ${response.statusText}`);
          break;
        }

        const data = await response.json();

        if (data.items && data.items.length > 0) {
          allItems.push(...data.items);
          console.log(
            `Found ${data.items.length} items on page starting at ${startIndex}. Total so far: ${allItems.length}`
          );

          // Check if there are more results
          if (data.items.length < maxResults) {
            // Less than max results means this is the last page
            hasMoreResults = false;
          } else {
            // Move to next page
            startIndex += maxResults;

            // Google Custom Search API typically limits to 100 results total
            if (startIndex > 100) {
              console.log("Reached Google API limit of 100 results");
              hasMoreResults = false;
            }
          }
        } else {
          // No items found, end pagination
          hasMoreResults = false;
          console.log("No more items found, ending pagination");
        }

        // Add a small delay to avoid hitting rate limits
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error fetching page starting at ${startIndex}:`, error);
        hasMoreResults = false;
      }
    }

    console.log(`Pagination complete. Total items found: ${allItems.length}`);

    return {
      items: allItems,
    };
  }
}

class SerpApiSearchService {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseUrl = SERPAPI_URL;
  }

  async searchCtoProfiles(
    region?: string,
    companySector?: string,
    companyType?: string,
    additionalTitles?: string[],
    getAllPages: boolean = true
  ): Promise<SerpApiResponse> {
    // Construct Boolean search query for executive titles
    const executiveTitles = [
      "CTO",
      "Chief Technology Officer",
      "VP Technology",
      "Head of Technology",
      "Technology Director",
      "VP Engineering",
      "Chief Technical Officer",
      "Head of Engineering",
      "Tech Lead",
      "Engineering Director",
      "Technology VP",
      "Chief Technology",
      "VP of Technology",
      "VP of Engineering",
      "Head of Tech",
    ];

    if (additionalTitles) {
      executiveTitles.push(...additionalTitles);
    }

    // Build title search component
    const titleQuery = executiveTitles
      .map((title) => `"${title}"`)
      .join(" OR ");

    // Construct complete search query
    const queryParts = ["site:linkedin.com/in/", `(${titleQuery})`];

    // Add optional filters
    if (region) {
      queryParts.push(`"${region}"`);
    }

    if (companySector) {
      // Add sector-related keywords
      const sectorKeywords: Record<string, string[]> = {
        software: ["software", "SaaS", "tech", "technology"],
        fintech: ["fintech", "financial technology", "finance", "banking"],
        healthcare: ["healthcare", "medical", "health tech", "biotech"],
        "e-commerce": ["e-commerce", "ecommerce", "retail", "online"],
        "AI/ML": ["AI", "ML", "artificial intelligence", "machine learning"],
        cybersecurity: ["cybersecurity", "security", "infosec"],
        blockchain: ["blockchain", "crypto", "web3"],
        IoT: ["IoT", "Internet of Things", "connected devices"],
        gaming: ["gaming", "game", "entertainment"],
      };

      const sectorTerms = sectorKeywords[companySector.toLowerCase()] || [
        companySector,
      ];
      const sectorQuery = sectorTerms.map((term) => `"${term}"`).join(" OR ");
      queryParts.push(`(${sectorQuery})`);
    }

    if (companyType) {
      // Add company type indicators
      const typeKeywords: Record<string, string[]> = {
        startup: ["startup", "early stage", "seed"],
        SME: ["SME", "medium business", "scale-up"],
        enterprise: ["enterprise", "Fortune", "large company"],
        unicorn: ["unicorn", "billion", "$1B"],
        public: ["public company", "NYSE", "NASDAQ", "publicly traded"],
      };

      const typeTerms = typeKeywords[companyType.toLowerCase()] || [
        companyType,
      ];
      const typeQuery = typeTerms.map((term) => `"${term}"`).join(" OR ");
      queryParts.push(`(${typeQuery})`);
    }

    // Exclude common non-executive terms
    const excludes = [
      "Intern",
      "Student",
      "Former",
      "Ex-",
      "Previous",
      "Consultant",
    ];
    excludes.forEach((exclude) => {
      queryParts.push(`-"${exclude}"`);
    });

    const query = queryParts.join(" ");

    if (getAllPages) {
      return await this.executeSearchAllPages(query);
    } else {
      return await this.executeSearch(query, 10);
    }
  }

  private async executeSearch(
    query: string,
    numResults: number
  ): Promise<SerpApiResponse> {
    try {
      const params = new URLSearchParams({
        api_key: this.apiKey,
        engine: "google",
        q: query,
        num: numResults.toString(),
      });

      const response = await fetch(`${this.baseUrl}?${params}`);
      if (!response.ok) {
        throw new Error(`SerpAPI request failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("SerpAPI search failed:", error);
      return { organic_results: [] };
    }
  }

  private async executeSearchAllPages(query: string): Promise<SerpApiResponse> {
    const allResults: SerpApiSearchItem[] = [];

    // SerpAPI supports pagination with start parameter
    // Fetch up to 100 results (10 pages of 10 results each)
    for (let page = 0; page < 10; page++) {
      try {
        const start = page * 10;
        const params = new URLSearchParams({
          api_key: this.apiKey,
          engine: "google",
          q: query,
          num: "10",
          start: start.toString(),
        });

        const response = await fetch(`${this.baseUrl}?${params}`);
        if (!response.ok) {
          console.error(
            `SerpAPI request failed for page ${page + 1}: ${response.status}`
          );
          break;
        }

        const data: SerpApiResponse = await response.json();

        if (!data.organic_results || data.organic_results.length === 0) {
          console.log(`No more results found at page ${page + 1}`);
          break;
        }

        allResults.push(...data.organic_results);
        console.log(
          `SerpAPI: Fetched page ${page + 1}, got ${
            data.organic_results.length
          } results`
        );

        // Add delay to prevent rate limiting
        if (page < 9) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`Error fetching page ${page + 1}:`, error);
        break;
      }
    }

    return { organic_results: allResults };
  }
}

class ProfileExtractor {
  private linkedinUrlPattern: RegExp;
  private executiveTitles: string[];

  constructor() {
    this.linkedinUrlPattern = /https?:\/\/(?:www\.)?linkedin\.com\/in\/[\w\-]+/;
    this.executiveTitles = [
      "cto",
      "chief technology officer",
      "vp technology",
      "head of technology",
      "technology director",
      "vp engineering",
      "chief technical officer",
      "head of engineering",
      "tech lead",
      "engineering director",
      "technology vp",
    ];
  }

  extractProfiles(
    searchResponse: GoogleSearchResponse,
    searchContext: string = ""
  ): LinkedInProfile[] {
    if (!searchResponse.items) {
      return [];
    }

    const profiles: LinkedInProfile[] = [];
    for (const item of searchResponse.items) {
      const profile = this.parseSearchItem(item, searchContext);
      if (profile && this.validateProfile(profile)) {
        profiles.push(profile);
      }
    }

    return profiles;
  }

  extractProfilesFromSerpApi(
    searchResponse: SerpApiResponse,
    searchContext: string = ""
  ): LinkedInProfile[] {
    if (!searchResponse.organic_results) {
      return [];
    }

    const profiles: LinkedInProfile[] = [];
    for (const item of searchResponse.organic_results) {
      // Convert SerpAPI item to GoogleSearchItem format for compatibility
      const googleItem: GoogleSearchItem = {
        title: item.title,
        link: item.link,
        snippet: item.snippet,
      };
      const profile = this.parseSearchItem(googleItem, searchContext);
      if (profile && this.validateProfile(profile)) {
        profiles.push(profile);
      }
    }

    return profiles;
  }

  private parseSearchItem(
    item: GoogleSearchItem,
    searchContext: string
  ): LinkedInProfile | null {
    const url = item.link || "";
    if (!this.linkedinUrlPattern.test(url)) {
      return null;
    }

    const title = item.title || "";
    const snippet = item.snippet || "";

    // Extract name from title (usually format: "Name - Title at Company")
    const nameMatch = title.match(/^([^-|:]+)/);
    const name = nameMatch ? nameMatch[1].trim() : "";

    // Extract job title and company from snippet or title
    const [jobTitle, company] = this.extractTitleAndCompany(title, snippet);

    // Extract location
    const location = this.extractLocation(snippet);

    // Calculate confidence score
    const confidence = this.calculateConfidence(
      jobTitle,
      company,
      searchContext,
      snippet
    );

    return {
      name,
      title: jobTitle,
      company,
      linkedin_url: url,
      snippet,
      confidence_score: confidence,
      location,
      sources: ["Google Custom Search"],
    };
  }

  private extractTitleAndCompany(
    title: string,
    snippet: string
  ): [string, string] {
    const text = `${title} ${snippet}`.toLowerCase();

    // Extract job title
    let jobTitle = "";
    for (const execTitle of this.executiveTitles) {
      if (text.includes(execTitle)) {
        jobTitle = execTitle;
        break;
      }
    }

    // Extract company (simplified approach)
    const companyPatterns = [
      /at ([^|,\-\n]+)/,
      /@ ([^|,\-\n]+)/,
      /(\w+(?:\s+\w+)*) \-/,
    ];

    let company = "";
    for (const pattern of companyPatterns) {
      const match = text.match(pattern);
      if (match) {
        company = match[1].trim();
        break;
      }
    }

    return [this.toTitleCase(jobTitle), this.toTitleCase(company)];
  }

  private extractLocation(snippet: string): string | undefined {
    const locationPatterns = [
      /(?:based|located|from|in)\s+(?:in\s+)?([A-Z][a-z]+(?:,\s*[A-Z][a-z]+)*)/,
      /([A-Z][a-z]+,\s*[A-Z]{2,3})/, // City, State/Country
      /([A-Z][a-z]+\s+Area)/,
    ];

    for (const pattern of locationPatterns) {
      const match = snippet.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  private calculateConfidence(
    jobTitle: string,
    company: string,
    searchContext: string,
    snippet: string
  ): number {
    let score = 0.0;

    // Title relevance (0-40 points)
    if (
      this.executiveTitles.some((execTitle) =>
        jobTitle.toLowerCase().includes(execTitle)
      )
    ) {
      score += 40.0;
    }

    // Context match (0-30 points)
    if (
      searchContext &&
      company.toLowerCase().includes(searchContext.toLowerCase())
    ) {
      score += 30.0;
    } else if (
      searchContext &&
      snippet.toLowerCase().includes(searchContext.toLowerCase())
    ) {
      score += 20.0;
    }

    // Profile completeness (0-30 points)
    if (jobTitle && company) {
      score += 20.0;
    }
    if (snippet.length > 100) {
      score += 10.0;
    }

    return Math.min(score, 100.0);
  }

  private validateProfile(profile: LinkedInProfile): boolean {
    return (
      profile.confidence_score >= 20.0 &&
      Boolean(profile.name) &&
      Boolean(profile.linkedin_url) &&
      profile.name.length >= 2
    );
  }

  private toTitleCase(str: string): string {
    return str.replace(
      /\w\S*/g,
      (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  }
}

// Service instances
const searchService = new LinkedInProfileSearchService(
  GOOGLE_API_KEY,
  GOOGLE_CSE_ID
);
const serpApiService = new SerpApiSearchService(SERPAPI_KEY);
const profileExtractor = new ProfileExtractor();

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
