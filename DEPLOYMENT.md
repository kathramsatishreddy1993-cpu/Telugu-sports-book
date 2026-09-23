# 🚀 Deployment Guide - Telugu Sports Book (Node.js Proxy Architecture)

## 📌 System Requirements
* **Node.js:** v18.x or v20.x LTS
* **npm:** v9.x or higher

## 🛠️ Build & Installation Commands
* **Install Dependencies:** `npm install`
* **Build Frontend Assets:** `npm run build`
* **Start Production Server:** `npm start`

## 🔑 Environment Variables Setup
Configure the following variables in your hosting provider's dashboard (e.g., Render Environment Settings, Railway Variables):

| Variable Name | Required? | Default Value | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | Auto-assigned | `5000` | Port provided by host environment |
| `NODE_ENV` | Yes | `production` | Production environment flag |
| `SPORTS_API_PROVIDER` | Yes | `odds_api` | Adapter identifier |
| `SPORTS_API_KEY` | Optional | *(Blank)* | Secret key provided by sports vendor |
| `SPORTS_API_BASE_URL` | Yes | `https://api.the-odds-api.com/v4` | Upstream API endpoint |

> **⚠️ SECURITY NOTE:** Never add your real `SPORTS_API_KEY` to code files, `package.json`, or version control. Store it exclusively as an environment variable in your hosting platform dashboard.

## 🌐 Health Check & Verification
After deployment, query the server health route to verify operational status without exposing secrets:

* **Endpoint:** `GET https://your-app-domain.com/api/health`
* **Expected JSON Response:**
  ```json
  {
    "status": "ONLINE",
    "provider": "odds_api",
    "API_CONNECTED": false,
    "timestamp": "2026-09-24T00:00:00.000Z"
  }
  ```

## 🔄 Automated Fallback Mode
If no API key is provided, or if the upstream provider experiences downtime or rate limits (HTTP 429), the proxy server automatically serves fallback data with the `DEMO / MOCK DATA` tag.