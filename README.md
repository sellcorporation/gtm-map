# Go-To-Market Map

AI-powered competitor expansion CRM for B2B teams. Analyse your website and customer list to systematically find and score potential prospects from competitor sets.

## Features

- **ICP Extraction**: Automatically extract Ideal Customer Profile from your website
- **Competitor Discovery**: Find competitors for each customer using AI and web search
- **Prospect Scoring**: Score prospects by ICP fit and conversion likelihood
- **Clustering**: Group prospects by industry, size, and characteristics
- **Ad Generation**: Create persona-aware ad copy for each cluster
- **CRM Integration**: Track prospect status and manage pipeline
- **Export Options**: Download CSV reports and markdown briefs

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Database**: Supabase (PostgreSQL) with Drizzle ORM
- **AI**: OpenAI GPT-4o via Vercel AI SDK
- **Search**: Tavily Search API (with fallback)
- **Auth**: Simple password-based authentication
- **Deployment**: Vercel-ready

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repo>
cd gtm-map
npm install
```

### 2. Set Up Environment Variables

Copy `.env.local.template` to `.env.local` and fill in your values:

```bash
cp .env.local.template .env.local
```

Required environment variables:
- `DATABASE_URL`: Your Supabase database URL
- `OPENAI_API_KEY`: Your OpenAI API key
- `TAVILY_API_KEY`: Your Tavily API key (optional)
- `APP_PASSWORD`: Password for app access
- `SESSION_SECRET`: Random 32-character string

### 3. Set Up Database

Create a Supabase project:
1. Go to [Supabase](https://supabase.com) and create a new project
2. Go to Settings > Database to get your database URL
3. Replace `[password]` and `[project-ref]` in your DATABASE_URL

Run database migrations:
```bash
npm run db:push
```

### 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` and enter your password to access the app.

## Usage

1. **Enter Website URL**: Input your company's website URL
2. **Upload Customer CSV**: Upload a CSV file with columns: `name`, `domain`, `notes` (optional)
3. **Analyse & Expand**: Click the button to start the analysis
4. **Review Results**: Browse prospects, clusters, and ad ideas in the Market Map
5. **Track Progress**: Update prospect status and export reports

## API Endpoints

- `POST /api/analyse` - Run competitor analysis
- `PATCH /api/status` - Update prospect status
- `GET /api/export.csv` - Export prospects as CSV
- `GET /api/brief.md` - Export markdown brief
- `POST /api/auth` - Authenticate user
- `GET /api/auth/check` - Check authentication status

## Database Schema

### Companies Table
- `id`: Primary key
- `name`: Company name
- `domain`: Company domain (unique)
- `source`: 'seed' or 'expanded'
- `sourceCustomerDomain`: Source customer domain
- `icpScore`: ICP fit score (0-100)
- `confidence`: Confidence score (0-100)
- `status`: 'New', 'Researching', 'Contacted', 'Won', 'Lost'
- `rationale`: AI-generated rationale
- `evidence`: JSON array of evidence URLs and snippets

### Clusters Table
- `id`: Primary key
- `label`: Cluster name
- `criteria`: JSON criteria for clustering
- `companyIds`: JSON array of company IDs

### Ads Table
- `id`: Primary key
- `clusterId`: Foreign key to clusters
- `headline`: Ad headline
- `lines`: JSON array of body lines
- `cta`: Call-to-action text

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

### Environment Variables for Production

Make sure to set all required environment variables in your Vercel project settings.

## Development

### Database Commands

```bash
npm run db:generate  # Generate migrations
npm run db:push      # Push schema to database
npm run db:studio    # Open Drizzle Studio
```

### Project Structure

```
src/
├── app/
│   ├── api/           # API routes
│   ├── page.tsx       # Main page
│   └── layout.tsx     # Root layout
├── components/        # React components
├── lib/              # Utilities and configurations
└── types/            # TypeScript types
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions, please open a GitHub issue or contact the development team.

---

**Note**: This tool generates probabilistic data. Always verify information before using it for outreach or business decisions.