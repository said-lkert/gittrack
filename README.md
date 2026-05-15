# GitTrack

GitTrack is a project tracking web application that connects delivery planning with live GitHub activity. It combines task management, contributor monitoring, repository data, and AI-assisted analysis in a single dashboard built for teams that want clearer visibility into project execution.

The application supports authenticated project spaces, GitHub repository imports, live commit tracking, contribution analysis, AI-generated summaries, and scheduled monitoring to help identify delivery risks before they become blockers.

## Overview

GitTrack was designed to centralize the operational view of a software project:

- project progress tracking
- task planning and assignment
- GitHub commit and contributor monitoring
- AI-assisted recommendations
- delivery risk detection
- scheduled project health analysis

The experience is organized around several product areas:

- `Dashboard` for project status and daily visibility
- `Tasks` for workload organization and progress updates
- `Activity` for commit and team activity review
- `Insights` for risk analysis and AI guidance
- `Settings` for project and integration configuration

## Product Highlights

### Dashboard

- global project progress
- remaining time until deadline
- contributor progress overview
- live GitHub repository panel
- focus tasks and daily activity summary
- commit feed with AI task suggestions
- recommendations and next actions

### Tasks

- task creation, editing, and deletion
- filtering by member and status
- grouped workload by assignee
- progress tracking per task
- support for unassigned work

### Activity

- commit history review
- team contribution visibility
- project activity follow-up

### Insights

- project health status
- overdue and blocked task detection
- contributor workload analysis
- AI-generated summaries and recommendations
- AI interview flow to refine the task plan
- configurable daily AI monitoring schedule

### Project Management

- project creation wizard
- repository import from GitHub
- project switching
- local persistence of tasks, commits, and monitoring state

### Integrations

- GitHub OAuth authentication
- Google OAuth authentication
- GitHub repository, commit, and contributor retrieval
- GitHub webhook support for push updates
- Gemini-powered AI workflows
- optional Vercel KV-backed monitoring storage

## Tech Stack

- `React 19`
- `TypeScript`
- `Vite`
- `Tailwind CSS`
- `Motion`
- `Recharts`
- `Lucide React`
- `Express`
- `Gemini API`
- `Vercel KV`

## Project Structure

```text
api/
  cron/         scheduled monitoring endpoint
server/
  authStore.ts  authentication helpers
  gemini.ts     Gemini integration
  index.ts      Express API and OAuth routes
src/
  components/   application screens and reusable UI
  data/         demo and seed data
  lib/          state, GitHub, HTTP, and AI helpers
```

## Local Setup

### Prerequisites

- `Node.js`
- `npm`
- GitHub OAuth credentials if you want GitHub sign-in and repository import
- Google OAuth credentials if you want Google sign-in
- Gemini API key for AI features

### Installation

```bash
npm install
```

### Environment

Create a local environment file from `.env.example` and configure the required values:

```env
GEMINI_API_KEY=your_gemini_api_key
APP_URL=http://localhost:3000
GITHUB_TOKEN=your_github_token
API_PORT=4000
GITHUB_WEBHOOK_SECRET=replace_with_a_long_random_secret
FRONTEND_URL=http://localhost:3000
API_PUBLIC_URL=http://localhost:4000
SESSION_SECRET=replace_with_a_long_random_session_secret
GITHUB_OAUTH_CLIENT_ID=your_github_oauth_client_id
GITHUB_OAUTH_CLIENT_SECRET=your_github_oauth_client_secret
GITHUB_OAUTH_REDIRECT_URI=http://localhost:4000/auth/github/callback
GOOGLE_OAUTH_CLIENT_ID=your_google_oauth_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_google_oauth_client_secret
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:4000/auth/google/callback
```

### Run

Start the frontend:

```bash
npm run dev
```

Start the API server in a second terminal:

```bash
npm run dev:server
```

The frontend runs on `http://localhost:3000` and the API server defaults to `http://localhost:4000`.

### Build

```bash
npm run build
```

## Available Scripts

```bash
npm run dev
npm run dev:server
npm run build
npm run preview
npm run lint
npm run start:server
```

## Backend Capabilities

- signed cookie sessions
- GitHub and Google OAuth flows
- authenticated GitHub repository import
- live commit and contributor endpoints
- GitHub webhook signature validation
- repository data caching with rate-limit fallback
- monitoring registration and latest snapshot endpoints

## Positioning

GitTrack was created as a project intelligence workspace for software teams. It brings together execution data, repository activity, and AI-assisted interpretation so project owners can move from raw commits and task lists to a clearer view of delivery health.

## License

No license has been specified yet.
