# Opportunity Zone Search

A modern web application built with Next.js that helps users search and identify Opportunity Zones based on address lookups. This tool provides an easy way to determine if a specific location falls within a designated Opportunity Zone.

## Features

- 🔍 Address-based Opportunity Zone searching
- 🗺️ Visual map interface for zone identification
- ⚡ Real-time results
- 📱 Responsive design for all devices
- 🔒 Secure API handling

## Tech Stack

- [Next.js 15](https://nextjs.org/) - React framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Redis](https://redis.io/) - Caching (optional)
- [Radix UI](https://www.radix-ui.com/) - UI Components

## Prerequisites

Before you begin, ensure you have installed:
- Node.js (v18 or higher)
- npm or pnpm (we use pnpm in this project)

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/opportunity-zone-search.git
   cd opportunity-zone-search
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up your environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Then edit `.env.local` with your configuration values.

4. Start the development server:
   ```bash
   pnpm dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

The following environment variables are required:

```env
# URL for opportunity zones GeoJSON file
OPPORTUNITY_ZONES_URL=

# Geocoding service configuration
GEOCODING_API_KEY=

# Web application configuration
NEXT_PUBLIC_WEB_APP_URL=
NEXT_PUBLIC_WEB_APP_API_KEY=

# MCP Server configuration
NEXT_PUBLIC_MCP_SERVER_URL=
MCP_SERVER_API_KEY=

# Redis configuration (optional)
REDIS_URL=
REDIS_TOKEN=
```

## Development

### Directory Structure

```
opportunity-zone-search/
├── app/                # Next.js app directory
├── components/         # React components
├── lib/               # Utility functions and helpers
├── hooks/             # Custom React hooks
├── public/            # Static assets
├── styles/            # Global styles
└── types/             # TypeScript type definitions
```

### Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run linting

## API Routes

The application provides several API endpoints:

- `GET /api/search` - Search for an address
- `GET /api/zones` - Get opportunity zone data
- `POST /api/validate` - Validate if an address is in an opportunity zone

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have questions, please file an issue on the GitHub repository.

## Acknowledgments

- Thanks to all contributors who have helped shape this project
- Built with [shadcn/ui](https://ui.shadcn.com/) components
- Mapping functionality powered by various geospatial libraries 