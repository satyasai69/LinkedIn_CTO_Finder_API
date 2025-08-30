// Types and Interfaces
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

// Configuration
const GOOGLE_SEARCH_URL = "https://www.googleapis.com/customsearch/v1";
const SERPAPI_URL = "https://serpapi.com/search";

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
        company = this.toTitleCase(match[1].trim());
        break;
      }
    }

    return [this.toTitleCase(jobTitle), company];
  }

  private extractLocation(snippet: string): string | undefined {
    // Common location patterns
    const locationPatterns = [
      /([A-Z][a-z]+,\s*[A-Z]{2,})/g, // City, State/Country
      /([A-Z][a-z]+\s+[A-Z][a-z]+,\s*[A-Z]{2,})/g, // City Name, State/Country
      /(San Francisco|New York|Los Angeles|Seattle|Boston|Austin|Chicago|London|Berlin|Paris|Tokyo|Singapore|Toronto|Vancouver)/gi,
    ];

    for (const pattern of locationPatterns) {
      const matches = snippet.match(pattern);
      if (matches && matches.length > 0) {
        return matches[0];
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
    let score = 0;

    // Base score for having a job title
    if (jobTitle) score += 30;

    // Higher score for exact CTO matches
    if (jobTitle.toLowerCase().includes("cto") || 
        jobTitle.toLowerCase().includes("chief technology officer")) {
      score += 40;
    }

    // Score for having company information
    if (company) score += 20;

    // Score for context relevance
    if (searchContext) {
      const contextWords = searchContext.toLowerCase().split(" ");
      const snippetLower = snippet.toLowerCase();
      
      for (const word of contextWords) {
        if (word.length > 3 && snippetLower.includes(word)) {
          score += 2;
        }
      }
    }

    // Penalty for common false positives
    const falsePositives = ["student", "intern", "former", "ex-", "previous"];
    for (const fp of falsePositives) {
      if (snippet.toLowerCase().includes(fp)) {
        score -= 20;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  private validateProfile(profile: LinkedInProfile): boolean {
    return profile.name.length > 0 && 
           profile.linkedin_url.length > 0 && 
           profile.confidence_score > 10;
  }

  private toTitleCase(str: string): string {
    return str.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  }
}

export {
  LinkedInProfileSearchService,
  SerpApiSearchService,
  ProfileExtractor,
  GoogleSearchResponse,
  SerpApiResponse,
  LinkedInProfile,
  GoogleSearchItem,
  SerpApiSearchItem
};