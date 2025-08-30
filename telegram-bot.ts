import TelegramBot, { Message, CallbackQuery } from 'node-telegram-bot-api';
import { createObjectCsvWriter } from 'csv-writer';
import fs from 'fs';
import path from 'path';

// Import the search services from the main file
import { LinkedInProfileSearchService, SerpApiSearchService, ProfileExtractor } from './search-services.js';

interface UserSession {
  chatId: number;
  step: 'start' | 'region' | 'sector' | 'company_type' | 'company_size' | 'search_method' | 'searching' | 'results';
  searchParams: {
    region?: string;
    company_sector?: string;
    company_type?: string;
    company_size?: string;
    search_method?: 'google' | 'serpapi';
  };
  results?: any[];
}

interface BotResponse {
  question: string;
  options?: string[];
  isMultipleChoice?: boolean;
}

class TelegramCTOBot {
  private bot: TelegramBot;
  private userSessions: Map<number, UserSession> = new Map();
  private searchService: LinkedInProfileSearchService;
  private serpApiService: SerpApiSearchService;
  private profileExtractor: ProfileExtractor;

  constructor(
    token: string, 
    searchService: LinkedInProfileSearchService, 
    serpApiService: SerpApiSearchService, 
    profileExtractor: ProfileExtractor
  ) {
    this.bot = new TelegramBot(token, { polling: true });
    this.searchService = searchService;
    this.serpApiService = serpApiService;
    this.profileExtractor = profileExtractor;
    
    this.setupHandlers();
  }

  private setupHandlers() {
    // Start command
    this.bot.onText(/\/start/, (msg: Message) => {
      this.handleStart(msg.chat.id);
    });

    // Help command
    this.bot.onText(/\/help/, (msg: Message) => {
      this.handleHelp(msg.chat.id);
    });

    // Reset command
    this.bot.onText(/\/reset/, (msg: Message) => {
      this.handleReset(msg.chat.id);
    });

    // Handle callback queries (inline keyboard buttons)
    this.bot.on('callback_query', (callbackQuery: CallbackQuery) => {
      this.handleCallbackQuery(callbackQuery);
    });

    // Handle text messages
    this.bot.on('message', (msg: Message) => {
      if (msg.text && !msg.text.startsWith('/')) {
        this.handleTextMessage(msg);
      }
    });
  }

  private async handleStart(chatId: number) {
    const session: UserSession = {
      chatId,
      step: 'start',
      searchParams: {}
    };
    
    this.userSessions.set(chatId, session);
    
    const welcomeMessage = `🔍 Welcome to LinkedIn CTO Finder Bot!

I'll help you find CTOs and technology executives based on your criteria.

Let's start by selecting your target region:`;
    
    const keyboard = {
      inline_keyboard: [
        [{ text: '🌍 Global', callback_data: 'region_global' }],
        [{ text: '🇺🇸 United States', callback_data: 'region_united_states' }],
        [{ text: '🇪🇺 Europe', callback_data: 'region_europe' }],
        [{ text: '🇦🇸 Asia', callback_data: 'region_asia' }],
        [{ text: '🇨🇦 Canada', callback_data: 'region_canada' }],
        [{ text: '🇦🇺 Australia', callback_data: 'region_australia' }],
        [{ text: '⏭️ Skip Region', callback_data: 'region_skip' }]
      ]
    };
    
    await this.bot.sendMessage(chatId, welcomeMessage, { reply_markup: keyboard });
  }

  private async handleHelp(chatId: number) {
    const helpMessage = `🤖 LinkedIn CTO Finder Bot Help

📋 Available Commands:
/start - Start a new search
/help - Show this help message
/reset - Reset current search session

🔍 How it works:
1. Choose your target region
2. Select company sector
3. Pick company type
4. Choose company size
5. Select search method
6. Get results and download CSV

💡 Tips:
- You can skip any step if not relevant
- Results are automatically saved to CSV
- Use /reset to start over anytime`;
    
    await this.bot.sendMessage(chatId, helpMessage);
  }

  private async handleReset(chatId: number) {
    this.userSessions.delete(chatId);
    await this.bot.sendMessage(chatId, '🔄 Session reset! Use /start to begin a new search.');
  }

  private async handleCallbackQuery(callbackQuery: CallbackQuery) {
    const chatId = callbackQuery.message!.chat.id;
    const data = callbackQuery.data!;
    const session = this.userSessions.get(chatId);
    
    if (!session) {
      await this.bot.answerCallbackQuery(callbackQuery.id, { text: 'Session expired. Please use /start' });
      return;
    }

    await this.bot.answerCallbackQuery(callbackQuery.id);
    
    if (data.startsWith('region_')) {
      await this.handleRegionSelection(chatId, data, session);
    } else if (data.startsWith('sector_')) {
      await this.handleSectorSelection(chatId, data, session);
    } else if (data.startsWith('type_')) {
      await this.handleCompanyTypeSelection(chatId, data, session);
    } else if (data.startsWith('size_')) {
      await this.handleCompanySizeSelection(chatId, data, session);
    } else if (data.startsWith('method_')) {
      await this.handleSearchMethodSelection(chatId, data, session);
    }
  }

  private async handleRegionSelection(chatId: number, data: string, session: UserSession) {
    const region = data.replace('region_', '');
    
    if (region !== 'skip') {
      session.searchParams.region = region.replace('_', ' ');
    }
    
    session.step = 'sector';
    
    const message = `✅ Region selected: ${session.searchParams.region || 'Not specified'}

🏢 Now, select the company sector:`;
    
    const keyboard = {
      inline_keyboard: [
        [{ text: '💻 Software/SaaS', callback_data: 'sector_software' }],
        [{ text: '💰 Fintech', callback_data: 'sector_fintech' }],
        [{ text: '🏥 Healthcare', callback_data: 'sector_healthcare' }],
        [{ text: '🛒 E-commerce', callback_data: 'sector_e-commerce' }],
        [{ text: '🤖 AI/ML', callback_data: 'sector_AI/ML' }],
        [{ text: '🔒 Cybersecurity', callback_data: 'sector_cybersecurity' }],
        [{ text: '⛓️ Blockchain', callback_data: 'sector_blockchain' }],
        [{ text: '🌐 IoT', callback_data: 'sector_IoT' }],
        [{ text: '🎮 Gaming', callback_data: 'sector_gaming' }],
        [{ text: '⏭️ Skip Sector', callback_data: 'sector_skip' }]
      ]
    };
    
    await this.bot.sendMessage(chatId, message, { reply_markup: keyboard });
  }

  private async handleSectorSelection(chatId: number, data: string, session: UserSession) {
    const sector = data.replace('sector_', '');
    
    if (sector !== 'skip') {
      session.searchParams.company_sector = sector;
    }
    
    session.step = 'company_type';
    
    const message = `✅ Sector selected: ${session.searchParams.company_sector || 'Not specified'}

🏭 Now, select the company type:`;
    
    const keyboard = {
      inline_keyboard: [
        [{ text: '🚀 Startup', callback_data: 'type_startup' }],
        [{ text: '🏢 SME (Small-Medium Enterprise)', callback_data: 'type_SME' }],
        [{ text: '🏛️ Enterprise', callback_data: 'type_enterprise' }],
        [{ text: '🦄 Unicorn', callback_data: 'type_unicorn' }],
        [{ text: '📈 Public Company', callback_data: 'type_public' }],
        [{ text: '⏭️ Skip Company Type', callback_data: 'type_skip' }]
      ]
    };
    
    await this.bot.sendMessage(chatId, message, { reply_markup: keyboard });
  }

  private async handleCompanyTypeSelection(chatId: number, data: string, session: UserSession) {
    const type = data.replace('type_', '');
    
    if (type !== 'skip') {
      session.searchParams.company_type = type;
    }
    
    session.step = 'company_size';
    
    const message = `✅ Company type selected: ${session.searchParams.company_type || 'Not specified'}

👥 Now, select the company size:`;
    
    const keyboard = {
      inline_keyboard: [
        [{ text: '🤏 1-10 employees', callback_data: 'size_1-10' }],
        [{ text: '👥 11-50 employees', callback_data: 'size_11-50' }],
        [{ text: '👨‍👩‍👧‍👦 51-200 employees', callback_data: 'size_51-200' }],
        [{ text: '🏢 201-1000 employees', callback_data: 'size_201-1000' }],
        [{ text: '🏭 1000+ employees', callback_data: 'size_1000+' }],
        [{ text: '⏭️ Skip Company Size', callback_data: 'size_skip' }]
      ]
    };
    
    await this.bot.sendMessage(chatId, message, { reply_markup: keyboard });
  }

  private async handleCompanySizeSelection(chatId: number, data: string, session: UserSession) {
    const size = data.replace('size_', '');
    
    if (size !== 'skip') {
      session.searchParams.company_size = size;
    }
    
    session.step = 'search_method';
    
    const message = `✅ Company size selected: ${session.searchParams.company_size || 'Not specified'}

🔍 Finally, choose your search method:`;
    
    const keyboard = {
      inline_keyboard: [
        [{ text: '🔍 Google Search (Free)', callback_data: 'method_google' }],
        [{ text: '⚡ SerpAPI (Premium)', callback_data: 'method_serpapi' }]
      ]
    };
    
    await this.bot.sendMessage(chatId, message, { reply_markup: keyboard });
  }

  private async handleSearchMethodSelection(chatId: number, data: string, session: UserSession) {
    const method = data.replace('method_', '') as 'google' | 'serpapi';
    session.searchParams.search_method = method;
    session.step = 'searching';
    
    // Show search summary
    const summary = this.generateSearchSummary(session.searchParams);
    await this.bot.sendMessage(chatId, `🔍 Starting search with the following criteria:\n\n${summary}\n\n⏳ Please wait while I search for CTOs...`);
    
    // Perform the search
    await this.performSearch(chatId, session);
  }

  private generateSearchSummary(params: any): string {
    let summary = '📋 Search Criteria:\n';
    summary += `🌍 Region: ${params.region || 'Not specified'}\n`;
    summary += `🏢 Sector: ${params.company_sector || 'Not specified'}\n`;
    summary += `🏭 Company Type: ${params.company_type || 'Not specified'}\n`;
    summary += `👥 Company Size: ${params.company_size || 'Not specified'}\n`;
    summary += `🔍 Search Method: ${params.search_method === 'google' ? 'Google Search' : 'SerpAPI'}`;
    return summary;
  }

  private async performSearch(chatId: number, session: UserSession) {
    try {
      const { region, company_sector, company_type, search_method } = session.searchParams;
      
      let searchResponse;
      let profiles;
      
      if (search_method === 'google') {
        searchResponse = await this.searchService.searchCtoProfiles(
          region,
          company_sector,
          company_type,
          undefined,
          true
        );
        profiles = this.profileExtractor.extractProfiles(searchResponse, `${region} ${company_sector} ${company_type}`);
      } else {
        searchResponse = await this.serpApiService.searchCtoProfiles(
          region,
          company_sector,
          company_type,
          undefined,
          true
        );
        profiles = this.profileExtractor.extractProfilesFromSerpApi(searchResponse, `${region} ${company_sector} ${company_type}`);
      }
      
      session.results = profiles;
      session.step = 'results';
      
      if (profiles.length === 0) {
        await this.bot.sendMessage(chatId, '❌ No CTOs found with your criteria. Try adjusting your search parameters and use /start to search again.');
        return;
      }
      
      // Send results summary
      const resultsMessage = `✅ Search completed!\n\n📊 Found ${profiles.length} CTO profiles\n\n🔝 Top 3 Results:\n${this.formatTopResults(profiles.slice(0, 3))}`;
      
      const keyboard = {
        inline_keyboard: [
          [{ text: '📥 Download Full Results (CSV)', callback_data: 'download_csv' }],
          [{ text: '🔄 New Search', callback_data: 'new_search' }]
        ]
      };
      
      await this.bot.sendMessage(chatId, resultsMessage, { reply_markup: keyboard });
      
      // Generate and send CSV file
      await this.generateAndSendCSV(chatId, profiles, session.searchParams);
      
    } catch (error) {
      console.error('Search error:', error);
      await this.bot.sendMessage(chatId, '❌ An error occurred during the search. Please try again later or contact support.');
    }
  }

  private formatTopResults(profiles: any[]): string {
    return profiles.map((profile, index) => {
      return `${index + 1}. **${profile.name}**\n   ${profile.title} at ${profile.company}\n   🔗 ${profile.linkedin_url}\n`;
    }).join('\n');
  }

  private async generateAndSendCSV(chatId: number, profiles: any[], searchParams: any) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `cto-search-results-${timestamp}.csv`;
      const filepath = path.join(process.cwd(), 'temp', filename);
      
      // Ensure temp directory exists
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const csvWriter = createObjectCsvWriter({
        path: filepath,
        header: [
          { id: 'name', title: 'Name' },
          { id: 'title', title: 'Job Title' },
          { id: 'company', title: 'Company' },
          { id: 'linkedin_url', title: 'LinkedIn URL' },
          { id: 'location', title: 'Location' },
          { id: 'confidence_score', title: 'Confidence Score' },
          { id: 'snippet', title: 'Description' },
          { id: 'search_region', title: 'Search Region' },
          { id: 'search_sector', title: 'Search Sector' },
          { id: 'search_company_type', title: 'Search Company Type' },
          { id: 'search_company_size', title: 'Search Company Size' }
        ]
      });
      
      // Add search parameters to each record
      const recordsWithSearchParams = profiles.map(profile => ({
        ...profile,
        search_region: searchParams.region || 'Not specified',
        search_sector: searchParams.company_sector || 'Not specified',
        search_company_type: searchParams.company_type || 'Not specified',
        search_company_size: searchParams.company_size || 'Not specified'
      }));
      
      await csvWriter.writeRecords(recordsWithSearchParams);
      
      // Send the CSV file
      await this.bot.sendDocument(chatId, filepath, {
        caption: `📊 Your CTO search results (${profiles.length} profiles)\n\n🔍 Search criteria:\n${this.generateSearchSummary(searchParams)}`
      });
      
      // Clean up the temporary file
      setTimeout(() => {
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
      }, 60000); // Delete after 1 minute
      
    } catch (error) {
      console.error('CSV generation error:', error);
      await this.bot.sendMessage(chatId, '❌ Failed to generate CSV file. The search results are still available above.');
    }
  }

  private async handleTextMessage(msg: Message) {
    const chatId = msg.chat.id;
    const session = this.userSessions.get(chatId);
    
    if (!session) {
      await this.bot.sendMessage(chatId, '👋 Hi! Use /start to begin searching for CTOs, or /help for more information.');
      return;
    }
    
    // Handle any text input during the process
    await this.bot.sendMessage(chatId, '🤖 Please use the buttons provided to navigate through the search process. If you\'re stuck, use /reset to start over or /help for assistance.');
  }

  public start() {
    console.log('🤖 Telegram CTO Finder Bot started!');
  }

  public stop() {
    this.bot.stopPolling();
    console.log('🤖 Telegram CTO Finder Bot stopped!');
  }
}

export { TelegramCTOBot };