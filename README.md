# ZEV

**Your Team Communication Hub**

ZEV is an open-source, real-time team communication platform built for developers and modern teams. It combines instant messaging, organized channels, AI-powered tools, and third-party integrations into a single, cohesive web application.

**Production URL:** [https://zev.yuzen.dev](https://zev.yuzen.dev)

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [AI Agents](#ai-agents)
- [Third-Party Integrations](#third-party-integrations)
- [Internationalization](#internationalization)
- [Contributing](#contributing)
- [License](#license)

---

## Features

### Real-Time Messaging

- WebSocket-based instant messaging powered by Ably
- Direct messages (DM), group chats, and public channels
- @mention support with user autocomplete
- Message reply, edit, and soft-delete
- File and image attachments via Cloudinary
- Emoji picker
- Typing indicators and read receipts
- Online presence tracking across all rooms

### AI-Powered Tools

- Multi-agent AI architecture with intent routing
- Calendar Agent: extract and create Google Calendar events from conversations
- Gmail Agent: draft, read, and manage emails through natural language
- Translation Agent: real-time translation with caching (30-min TTL)
- Attachment Agent: vision-based image analysis and document summarization
- Bring Your Own Key (BYOK) support for OpenAI, Anthropic, and Google models
- Encrypted API key storage (AES-256-GCM)

### Feed and Posts

- User-generated text posts with multi-image upload
- GitHub repository sharing with metadata preview (stars, forks, language)
- Like and comment system
- Author post management

### Room and Channel Management

- Four room types: DM, Group, Channel, AI
- Role-based access control: Owner, Admin, Member, Guest
- Per-room notification preferences (All, Mentions Only, Mute)
- Pin conversations for quick access
- Custom room categories with drag-and-drop reordering
- Shared media panel (images, files, links)
- Room avatar and name customization

### Authentication

- Google OAuth
- GitHub OAuth
- Email and password (bcrypt hashed)
- NextAuth v5 with JWT session strategy and MongoDB adapter
- Welcome email on registration

### User Profiles

- Username-based public profile pages (`/[username]`)
- Editable nickname, bio, and avatar
- Initiate DM directly from profile pages
- Dynamic Open Graph and Twitter Card metadata

### Privacy Controls

- Read receipts toggle
- Typing indicator toggle
- Online status visibility toggle

### Notifications

- Real-time push notifications via Ably
- Notification types: room invite, post like, post comment
- Notification panel with mark-as-read and mark-all-as-read
- Unread count tracking

### Search

- Global search panel for users and chat rooms
- Debounced search input

### Progressive Web App

- Web App Manifest for installable experience
- SEO optimized with structured data, robots.txt, and sitemap.xml

---

## Tech Stack

| Category             | Technology                                |
| -------------------- | ----------------------------------------- |
| Framework            | Next.js 16 (App Router)                   |
| Language             | TypeScript                                |
| Runtime              | React 19                                  |
| Styling              | Tailwind CSS 4                            |
| UI Components        | Radix UI, shadcn/ui                       |
| Animation            | Motion (Framer Motion)                    |
| State Management     | Zustand                                   |
| Data Fetching        | TanStack React Query                      |
| Database             | MongoDB, Mongoose                         |
| Authentication       | NextAuth v5, MongoDB Adapter              |
| Real-Time            | Ably WebSocket                            |
| AI                   | Vercel AI SDK (OpenAI, Anthropic, Google) |
| File Storage         | Cloudinary                                |
| Email                | Resend, React Email                       |
| Internationalization | next-intl                                 |
| Validation           | Zod                                       |
| Package Manager      | pnpm (workspace)                          |

---

## Architecture

ZEV follows a modular, feature-based architecture within a Next.js App Router monolith.

```
app/              -- Next.js routes and API endpoints
ai/agents/        -- AI agent implementations
feature/          -- Feature modules (auth, chat, feed, settings, user)
shared/           -- Shared utilities, services, schemas, stores, and UI
layout/           -- Application shell and navigation
messages/         -- i18n translation files
public/           -- Static assets
```

### Key Architectural Decisions

- **Feature-based organization**: Each domain (chat, feed, auth, settings) is self-contained with its own components, hooks, and types.
- **Service layer separation**: `shared/service/server/` for server-side logic, `shared/service/api/` for client-side API wrappers, `shared/service/dto/` for data transformation.
- **Optimistic updates**: UI state is updated immediately via Zustand stores, with API calls running in the background and rollback on failure.
- **Multi-agent AI**: Intent router classifies user input and delegates to specialized agents, each with configurable model tiers (small, medium, large).

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- MongoDB instance
- Ably account
- Cloudinary account

### Installation

```bash
# Clone the repository
git clone https://github.com/ZEV-Nexus/ZEV.git
cd ZEV

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Run the development server
pnpm dev
```

The application will be available at `http://localhost:3000`.

### Build

```bash
pnpm build
pnpm start
```

### Lint

```bash
pnpm lint
```

---

## Environment Variables

The following environment variables are required for the application to function:

| Variable                            | Description                                |
| ----------------------------------- | ------------------------------------------ |
| `MONGODB_URI`                       | MongoDB connection string                  |
| `AUTH_SECRET`                       | NextAuth secret key                        |
| `AUTH_GOOGLE_ID`                    | Google OAuth client ID                     |
| `AUTH_GOOGLE_SECRET`                | Google OAuth client secret                 |
| `AUTH_GITHUB_ID`                    | GitHub OAuth client ID                     |
| `AUTH_GITHUB_SECRET`                | GitHub OAuth client secret                 |
| `ABLY_API_KEY`                      | Ably API key for real-time messaging       |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name                      |
| `CLOUDINARY_API_KEY`                | Cloudinary API key                         |
| `CLOUDINARY_API_SECRET`             | Cloudinary API secret                      |
| `RESEND_API_KEY`                    | Resend API key for transactional email     |
| `ENCRYPTION_KEY`                    | 32-byte hex key for AES-256-GCM encryption |
| `NEXT_PUBLIC_APP_URL`               | Public application URL                     |

Optional variables for AI and Google integrations:

| Variable                       | Description                                  |
| ------------------------------ | -------------------------------------------- |
| `OPENAI_API_KEY`               | Default OpenAI API key                       |
| `ANTHROPIC_API_KEY`            | Default Anthropic API key                    |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Default Google AI API key                    |
| `GOOGLE_CLIENT_ID`             | Google API client ID (Calendar, Gmail, Meet) |
| `GOOGLE_CLIENT_SECRET`         | Google API client secret                     |

---

## Project Structure

```
ZEV/
├── ai/
│   └── agents/                  # AI agent implementations
│       ├── intent-router.ts     # Intent classification and routing
│       ├── calendar-agent.ts    # Google Calendar integration
│       ├── gmail-agent.ts       # Gmail draft and read operations
│       ├── translation-agent.ts # Translation with caching
│       ├── attachment-agent.ts  # Image and document analysis
│       └── confirmation-agent.ts# User confirmation flow
├── app/
│   ├── api/                     # API route handlers
│   │   ├── ai/                  # AI endpoints
│   │   ├── auth/                # Authentication endpoints
│   │   ├── chat/                # Chat and message endpoints
│   │   ├── rooms/               # Room management endpoints
│   │   ├── posts/               # Feed and post endpoints
│   │   ├── notifications/       # Notification endpoints
│   │   └── upload/              # File upload endpoints
│   ├── auth/                    # Auth pages (login, register)
│   ├── c/                       # Chat pages
│   │   └── [roomId]/            # Individual chat room
│   └── [username]/              # User profile pages
├── feature/
│   ├── auth/                    # Authentication feature
│   ├── chat/                    # Chat feature
│   ├── feed/                    # Feed/posts feature
│   ├── settings/                # Settings feature
│   └── user/                    # User profile feature
├── shared/
│   ├── schema/                  # Mongoose models
│   ├── service/
│   │   ├── api/                 # Client-side API functions
│   │   ├── server/              # Server-side business logic
│   │   ├── dto/                 # Data transfer and transformation
│   │   └── email/               # Email templates and sending
│   ├── store/                   # Zustand state stores
│   ├── hooks/                   # Shared React hooks
│   ├── lib/                     # Utility libraries
│   ├── types/                   # TypeScript type definitions
│   └── shadcn/                  # shadcn/ui components
├── layout/                      # App shell and navigation
├── messages/                    # i18n translation files
└── public/                      # Static assets
```

---

## AI Agents

ZEV implements a multi-agent architecture where user input is first classified by an **Intent Router**, then delegated to a specialized agent.

| Agent                       | Purpose                                                        | Model Tier |
| --------------------------- | -------------------------------------------------------------- | ---------- |
| Intent Router               | Classifies user intent into action categories                  | Small      |
| Calendar Agent              | Extracts scheduling details and creates Google Calendar events | Medium     |
| Gmail Agent                 | Drafts, reads, and lists Gmail messages                        | Medium     |
| Translation Agent           | Translates text with 30-minute cache and Markdown preservation | Medium     |
| Attachment Agent (Vision)   | Analyzes images using multimodal models                        | Large      |
| Attachment Agent (Document) | Summarizes and analyzes uploaded documents                     | Medium     |
| Confirmation Agent          | Presents extracted task info for user confirmation             | Small      |

### Supported Models

- **OpenAI**: GPT-4o, GPT-4 Turbo, GPT-3.5 Turbo
- **Anthropic**: Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku
- **Google**: Gemini 2.5 Pro, Gemini 2.5 Flash

Users can configure their own API keys through the settings panel.

---

## Third-Party Integrations

| Service         | Capabilities                                          |
| --------------- | ----------------------------------------------------- |
| Google Calendar | Read and create calendar events via OAuth             |
| Google Gmail    | Read, send, and manage emails via OAuth               |
| Google Meet     | Meeting space management via OAuth                    |
| GitHub          | Repository search, metadata display, and sharing      |
| Cloudinary      | Image and file upload, transformation, and delivery   |
| Ably            | Real-time messaging, presence, and push notifications |
| Resend          | Transactional email delivery                          |

---

## Internationalization

ZEV supports the following locales:

- English (`en`)
- Traditional Chinese (`zh-TW`)

Translation files are located in the `messages/` directory. The application uses `next-intl` for runtime translation with Zustand-persisted locale preferences.

---

## Contributing

Contributions are welcome. Please follow these guidelines:

1. Fork the repository.
2. Create a feature branch from `main`.
3. Write clear, descriptive commit messages.
4. Ensure `pnpm lint` passes without errors.
5. Ensure `pnpm build` completes successfully.
6. Submit a pull request with a clear description of the changes.

For bug reports and feature requests, please open an issue on GitHub.

---

## License

This project is open source. See the repository for license details.
