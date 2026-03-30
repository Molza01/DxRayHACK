# RepoXray

**Intelligent CI/CD Pipeline Scanner & Documentation Health Analyzer**

RepoXray is a full-stack platform that diagnoses, analyzes, and optimizes your CI/CD pipelines and repository documentation using AI-powered insights. It connects to GitHub Actions, Vercel, and Render to provide deep analytics, bottleneck detection, flaky step investigation, and AI-generated documentation fixes.

**Live Demo:** [https://dx-ray-hack.vercel.app](https://dx-ray-hack.vercel.app)

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [GitHub OAuth Setup](#github-oauth-setup)
- [Running the App](#running-the-app)
- [Deployment](#deployment)
- [API Endpoints](#api-endpoints)

---

## Features

### Dashboard — Pipeline Analytics
- **5 key metrics** at a glance: Total Builds, Avg Duration, Success Rate, Failure Rate, Health Score (0-100)
- Build Duration Trend chart (90-day lookback)
- Success/Failure/Cancelled pie chart
- Build Time Heatmap (Day x Hour matrix)
- Bottleneck Detector — bar chart ranking slowest pipeline steps
- Multi-repo filtering with one-click repo selector
- Demo presets (Healthy, Bottleneck, Flaky) for quick testing

### Command Center — Deep Diagnostics
- **Bottleneck Impact Scoring** — ranks steps by weighted formula: `(contribution% x 0.4) + (variance x 0.3) + (failureRate x 0.3)`
- **Smart Recommendations** — prioritized fixes with effort level, impact level, and estimated time savings
- **Flaky Investigator** — detects unreliable steps with instability %, probable root causes based on step type
- **Build Heatmap** — identifies peak failure times by day and hour
- **Log Debugger** — search build logs with quick-filter buttons (Error, Timeout, OOM, Permission)
- Export reports to Markdown or JSON

### Pipeline Visualization
- Interactive node-based graph using ReactFlow
- Draggable nodes with zoom, pan, and minimap
- **3 overlay modes:**
  - Status — pass/fail coloring
  - Latency — duration-based heatmap
  - Flaky — instability highlighting
- Click any node to view logs and step details

### Insights & Alerts
- AI-driven alerts: bottleneck warnings, flaky step alerts, regression detection, health alerts
- Retry Analysis table with failure rates per step
- Failure Pattern Analysis by time-of-day and by branch

### Docs Scanner — Documentation Health
- Scan any GitHub repository for documentation issues
- **4 issue types detected:**
  - **Stale/Outdated** — docs not updated in 30+ / 90+ days
  - **Missing** — no README.md, CONTRIBUTING.md, or API docs
  - **Code-to-Docs Drift** — extracts API routes from Express/Flask/FastAPI code, flags undocumented endpoints
- **AI-Powered Fix Generation** — Gemini 2.0 Flash generates specific fixes with before/after diffs
- Bulk fix generation for all issues at once
- Documentation Freshness progress bar and Health Score

### Authentication & User Isolation
- Email/password signup and login with JWT
- GitHub OAuth 2.0 integration — connect GitHub during signup
- **Per-user data isolation** — each user only sees their own scans and analytics
- GitHub repo dropdown for quick CI/CD sync (no manual owner/repo input needed)

### Multi-Platform Support
- **GitHub Actions** — full workflow run, job, and step analysis
- **Vercel** — deployment analytics with synthetic build steps
- **Render** — deploy tracking with status mapping
- **Auto-detection** — if a GitHub repo has no Actions but is deployed on Vercel/Render, suggests switching

### Real-Time Updates
- Server-Sent Events (SSE) for live dashboard updates every 30 seconds
- Live connection indicator in Command Center

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 19.2.4 | UI framework |
| Vite | 8.0.1 | Build tool |
| React Router DOM | 7.13.2 | Client-side routing |
| Tailwind CSS | 4.2.2 | Utility-first styling |
| Framer Motion | 12.38.0 | Animations & transitions |
| Recharts | 3.8.1 | Charts & data visualization |
| @xyflow/react | 12.10.2 | Interactive pipeline graph |
| Axios | 1.13.6 | HTTP client |
| Lucide React | 1.7.0 | Icon library |
| date-fns | 4.1.0 | Date formatting |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Node.js | — | Runtime |
| Express | 5.2.1 | Web framework |
| Mongoose | 9.3.3 | MongoDB ODM |
| bcryptjs | 3.0.3 | Password hashing |
| jsonwebtoken | 9.0.3 | JWT authentication |
| Axios | 1.13.6 | External API calls |
| dotenv | 17.3.1 | Environment variables |
| node-cron | 4.2.1 | Task scheduling |

### AI & Database
| Technology | Purpose |
|---|---|
| Google Gemini 2.0 Flash | AI-powered documentation fix generation |
| MongoDB Atlas | Cloud database |

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   React SPA     │────>│   Express API    │────>│  MongoDB Atlas  │
│   (Vercel)      │<────│   (Render)       │<────│                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                              │      │
                    ┌─────────┘      └──────────┐
                    v                            v
            ┌──────────────┐            ┌──────────────┐
            │  GitHub API  │            │  Gemini AI   │
            │  Vercel API  │            │  (Fixes)     │
            │  Render API  │            └──────────────┘
            └──────────────┘
```

**Data Flow:**
1. User signs up and connects GitHub via OAuth
2. User syncs a platform (GitHub/Vercel/Render)
3. Backend fetches build data from platform APIs
4. Data stored in MongoDB, scoped to the user
5. Analytics computed on-demand with 20+ metrics
6. Real-time updates pushed via SSE

---

## Project Structure

```
dxRayHack/
├── client/                          # React frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Landing.jsx          # Home/hero page
│   │   │   ├── Login.jsx            # Login form
│   │   │   ├── Signup.jsx           # Signup + GitHub connect
│   │   │   ├── GitHubCallback.jsx   # OAuth callback handler
│   │   │   ├── Dashboard.jsx        # Main analytics dashboard
│   │   │   ├── CommandCenter.jsx    # Deep diagnostics (5 tabs)
│   │   │   ├── Pipeline.jsx         # Interactive pipeline graph
│   │   │   ├── Insights.jsx         # Alerts & pattern analysis
│   │   │   ├── Builds.jsx           # Build list view
│   │   │   ├── BuildDetail.jsx      # Single build with steps
│   │   │   └── DocsScan.jsx         # Documentation scanner
│   │   ├── components/
│   │   │   ├── Navbar.jsx           # Left sidebar navigation
│   │   │   ├── ProtectedRoute.jsx   # Auth guard
│   │   │   ├── HealthGauge.jsx      # Score dial widget
│   │   │   ├── MetricCard.jsx       # KPI cards
│   │   │   ├── InsightCard.jsx      # Alert display
│   │   │   ├── StatusBadge.jsx      # Status indicators
│   │   │   └── TerminalLog.jsx      # Log viewer
│   │   ├── charts/                  # Recharts components
│   │   ├── animations/              # Framer Motion effects
│   │   ├── context/
│   │   │   ├── AuthContext.jsx      # Auth state management
│   │   │   └── SidebarContext.jsx   # Sidebar expand/collapse
│   │   ├── hooks/
│   │   │   └── useTheme.js          # Dark/light mode
│   │   └── services/
│   │       └── api.js               # Axios client + interceptors
│   └── .env                         # VITE_GITHUB_CLIENT_ID
│
├── server/                          # Express backend
│   ├── index.js                     # App entry point
│   ├── routes/
│   │   └── api.js                   # All API routes
│   ├── controllers/
│   │   ├── authController.js        # Signup, login, GitHub OAuth
│   │   ├── buildController.js       # Build CRUD
│   │   ├── analyticsController.js   # Analytics endpoint
│   │   ├── githubController.js      # Platform sync (GH/Vercel/Render)
│   │   └── docsController.js        # Docs scan endpoints
│   ├── services/
│   │   ├── githubService.js         # GitHub Actions API integration
│   │   ├── vercelService.js         # Vercel API integration
│   │   ├── renderService.js         # Render API integration
│   │   ├── analyticsService.js      # 20+ metric computations
│   │   ├── docsService.js           # Doc scanning & drift detection
│   │   ├── aiService.js             # Gemini AI integration
│   │   └── seedService.js           # Demo data generation
│   ├── models/
│   │   ├── User.js                  # User + GitHub OAuth fields
│   │   ├── Build.js                 # CI/CD build records
│   │   ├── Step.js                  # Build step details
│   │   ├── Doc.js                   # Documentation file metadata
│   │   └── DocIssue.js              # Documentation issues
│   ├── middleware/
│   │   └── auth.js                  # JWT verification
│   └── .env                         # Server environment variables
│
├── package.json                     # Root monorepo scripts
└── README.md
```

---

## Getting Started

### Prerequisites

- **Node.js** v18 or higher
- **npm** v9 or higher
- **MongoDB Atlas** account (free tier works)
- **GitHub account** (for OAuth setup)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/dxRayHack.git
cd dxRayHack
```

### 2. Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install

# Return to root
cd ..
```

### 3. Configure Environment Variables

Create `server/.env`:

```env
# Server
PORT=5000

# MongoDB
MONGODB_URI=your_mongodb_atlas_connection_string

# GitHub Personal Access Token (for fetching repo data)
GITHUB_TOKEN=your_github_personal_access_token

# Vercel (optional)
VERCEL_TOKEN=your_vercel_api_token
VERCEL_PROJECT_ID=your_project_name_or_id

# Render (optional)
RENDER_API_KEY=your_render_api_key
RENDER_SERVICE_ID=your_render_service_id

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# JWT
JWT_SECRET=your_jwt_secret_key

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
```

Create `client/.env`:

```env
VITE_GITHUB_CLIENT_ID=your_github_oauth_client_id
```

---

## Environment Variables

### Server (`server/.env`)

| Variable | Required | Description |
|---|---|---|
| `PORT` | Yes | Server port (default: 5000) |
| `MONGODB_URI` | Yes | MongoDB Atlas connection string |
| `GITHUB_TOKEN` | Yes | GitHub PAT for API access (needs `repo` and `actions` scopes) |
| `GEMINI_API_KEY` | Yes | Google Gemini API key for AI fix generation |
| `JWT_SECRET` | Yes | Secret key for JWT token signing |
| `GITHUB_CLIENT_ID` | Yes | GitHub OAuth App Client ID |
| `GITHUB_CLIENT_SECRET` | Yes | GitHub OAuth App Client Secret |
| `VERCEL_TOKEN` | No | Vercel API token (for Vercel sync) |
| `RENDER_API_KEY` | No | Render API key (for Render sync) |

### Client (`client/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_GITHUB_CLIENT_ID` | Yes | Same GitHub OAuth Client ID (needed at build time) |

---

## GitHub OAuth Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in:
   - **Application name:** `RepoXray`
   - **Homepage URL:** `http://localhost:5173` (or your production URL)
   - **Authorization callback URL:** `http://localhost:5173/auth/github/callback`
4. Click **Register application**
5. Copy the **Client ID** and generate a **Client Secret**
6. Add both to `server/.env` and the Client ID to `client/.env`

For production, update the callback URL to your deployed frontend URL (e.g., `https://your-app.vercel.app/auth/github/callback`).

---

## Running the App

### Development (both servers concurrently)

```bash
# From root directory
npm run dev
```

Or run them separately:

```bash
# Terminal 1 — Backend
cd server
npm run dev

# Terminal 2 — Frontend
cd client
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:5000

### Production Build

```bash
# Build frontend
npm run build

# Start server
npm start
```

---

## Deployment

### Frontend (Vercel)

1. Connect your GitHub repo to Vercel
2. Set **Root Directory** to `client`
3. Add environment variable: `VITE_GITHUB_CLIENT_ID`
4. Deploy

### Backend (Render)

1. Create a new Web Service on Render
2. Set **Root Directory** to `server`
3. Set **Build Command** to `npm install`
4. Set **Start Command** to `node index.js`
5. Add all server environment variables
6. Deploy

Update the API base URL in `client/src/services/api.js` to point to your Render URL.

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user profile |
| POST | `/api/auth/github/connect` | Link GitHub via OAuth code |
| GET | `/api/auth/github/repos` | List user's GitHub repositories |

### Builds
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/builds` | List builds (with filters, pagination) |
| GET | `/api/builds/:id` | Get build details with steps |

### Analytics
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/analytics` | Full analytics payload (20+ metrics) |
| GET | `/api/report` | Export analytics report (JSON) |
| GET | `/api/stream` | SSE stream for live updates |

### Platform Sync
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/github/sync` | Sync GitHub Actions builds |
| POST | `/api/vercel/sync` | Sync Vercel deployments |
| POST | `/api/render/sync` | Sync Render deployments |

### Docs Scanner
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/docs/sync` | Scan a GitHub repo for doc issues |
| GET | `/api/docs/health` | Get documentation health metrics |
| GET | `/api/docs/issues` | List documentation issues |
| GET | `/api/docs/changelog` | Get repo changelog from commits |
| POST | `/api/docs/fix` | Generate AI fix for an issue |
| POST | `/api/docs/fix-all` | Generate fixes for all issues |

### Demo Data
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/seed` | Load standard demo data |
| POST | `/api/seed/:scenario` | Load preset (healthy/bottleneck/flaky) |
| POST | `/api/clear` | Clear current user's data |

All endpoints except `/api/auth/signup` and `/api/auth/login` require a `Bearer` token in the `Authorization` header.

---

## Health Score Formula

```
Base: 100
- Deduct (100 - successRate) x 0.5
- Deduct up to 20 for avg duration > 300s
- Deduct 5 per flaky step
- Deduct 15 if avg build time > 900s
Result: clamped 0-100
```

## Bottleneck Impact Score

```
(contribution% x 0.4) + (durationVariance/10 x 0.3) + (failureRate x 0.3)
```

---

## License

This project was built for the **DX-Ray Hackathon 2026**.
