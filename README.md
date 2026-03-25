This is a [Next.js](https://nextjs.org) project for managing and classifying support tickets with AI-powered categorization.

# Support Ticket Classifier

A modern web application for managing and classifying support tickets with AI-powered categorization and real-time analytics.

## Features

- **Ticket Management**: View and manage incoming support tickets in a clean, organized interface
- **AI Categorization**: Automatically categorize tickets into categories (Usage, Account, Feedback, Education, Career)
- **Real-time Analytics**: Visual dashboards showing ticket volume by category and over time
- **Synthetic Data Generation**: Generate test tickets for demo and testing purposes
- **Advanced Filtering**: Filter tickets by category and source (real vs. generated)
- **Sortable Table**: Click to sort tickets by date in ascending or descending order
- **Detailed Views**: Expand tickets to see full content including sender, subject, body, and timestamp
- **Error Handling**: Non-blocking error notifications that stack as needed

## Tech Stack

- **Frontend**: Next.js 14+ with React
- **Styling**: Custom inline styles with a cohesive color palette
- **Charts**: Recharts for data visualization
- **Backend**: Next.js API routes
- **Database**: Supabase
- **AI/ML**: Qwen for ticket generation and categorization
- **Email**: Mailgun for incoming email processing
- **Fonts**: Noto Sans (body text) & DM Mono (UI labels)

## Getting Started

### Prerequisites
- npm or yarn
- Supabase project
- Mailgun account (optional, for email integration)
- Qwen API access (optional, for AI features)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables (create a `.env.local` file):
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Learn More

To learn more about this project's features and components, see the sections below.

## Features

- **Ticket Management**: View and manage incoming support tickets in a clean, organized interface
- **AI Categorization**: Automatically categorize tickets into categories (Usage, Account, Feedback, Education, Career)
- **Real-time Analytics**: Visual dashboards showing ticket volume by category and over time
- **Synthetic Data Generation**: Generate test tickets for demo and testing purposes
- **Advanced Filtering**: Filter tickets by category and source (real vs. generated)
- **Sortable Table**: Click to sort tickets by date in ascending or descending order
- **Detailed Views**: Expand tickets to see full content including sender, subject, body, and timestamp
- **Error Handling**: Non-blocking error notifications that stack as needed

## Tech Stack

- **Frontend**: Next.js 14+ with React
- **Styling**: Custom inline styles with a cohesive color palette
- **Charts**: Recharts for data visualization
- **Backend**: Next.js API routes
- **Database**: Supabase
- **AI/ML**: Qwen for ticket generation and categorization
- **Email**: Mailgun for incoming email processing
- **Fonts**: Noto Sans (body text) & DM Mono (UI labels)

## Project Structure

```
app/
├── page.tsx                 # Main dashboard page
├── layout.tsx               # Root layout
├── globals.css              # Global styles
└── api/
    └── ticket/
        ├── route.ts         # GET/POST ticket endpoints
        ├── generate/
        │   └── route.ts     # Generate synthetic tickets
        └── stats/
            └── route.ts     # Get ticket statistics

lib/
├── mailgun/                 # Mailgun client & utilities
├── qwen/                    # AI categorization & generation
├── supabase/                # Supabase client & queries
└── types/                   # TypeScript type definitions
```

## Usage

### View Tickets
- The main dashboard displays all tickets in a table
- Use the filters to narrow results
- Click the **DATE** header to toggle sort order

### Expand Ticket Details
- Click any row in the table to expand and view the full ticket content
- Shows sender, category, timestamp, subject, and body

### Generate Test Data
- Click the **+ GENERATE** button to create a batch of synthetic tickets
- Useful for testing and demos
- Button shows "GENERATING..." state while in progress

### Refresh Data
- Click **↻ REFRESH** to reload tickets and statistics from the server
- Button shows "REFRESHING..." state while loading

### View Errors
- Errors appear as non-blocking notifications in the top-right corner
- Each error can be dismissed individually
- Multiple errors will stack if they occur in quick succession

## Dashboard Components

- **Volume by Category**: Horizontal bar chart showing ticket distribution across categories
- **Volume by Day**: Vertical bar chart showing ticket volume over time
- **Ticket Log**: Detailed table of all tickets with filtering and sorting options
