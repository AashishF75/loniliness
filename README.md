# Saathi - The Social Well-being Platform for Senior Citizens in India

## 1. Project Overview
Saathi is a full-stack, AI-powered hyperlocal social well-being platform designed exclusively for senior citizens in India. Its mission is to combat loneliness and social isolation by helping elders discover nearby companions, participate in community activities, and engage with a supportive AI companion (Bol Saathi). The platform provides a highly accessible, senior-friendly interface designed for clear readability, safety, and ease of use.

## 2. Features
- **Hyperlocal Discovery**: Find and connect with companions in your neighborhood based on shared interests.
- **Community Activities**: Discover and join local events like yoga, park walks, and reading clubs.
- **Saathi AI Companion**: A supportive, Gemini-powered conversational AI that suggests activities and companions while providing a listening ear.
- **Family Consent & Updates**: Keep loved ones updated safely by sharing activity and connection milestones.
- **Emergency SOS**: Quick-access emergency button.
- **Senior-Friendly UI**: High contrast, extra-large typography, clear error states, large touch targets, and distraction-free layouts.

## 3. Tech Stack
**Frontend**:
- React 19
- Vite
- Tailwind CSS v4 (with Vanilla CSS for custom animations)
- React Router DOM
- Lucide React (Icons)

**Backend**:
- Node.js & Express
- TypeScript
- Prisma ORM
- MongoDB Atlas
- JWT (JSON Web Tokens) for Authentication
- Google Generative AI (Gemini 1.5 Flash)

## 4. Local Setup

### Prerequisites
- Node.js (v18 or higher)
- MongoDB Atlas cluster (or local MongoDB)
- Google Gemini API Key

### Installation
1. Clone the repository.
2. Install frontend dependencies:
   ```bash
   cd sathi
   npm install
   ```
3. Install backend dependencies:
   ```bash
   cd backend
   npm install
   ```

## 5. Environment Variables

### Backend (`backend/.env`)
Create a `.env` file in the `backend/` directory with the following variables:
```env
PORT=5000
DATABASE_URL="mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/saathi?retryWrites=true&w=majority"
JWT_SECRET="your-super-secret-jwt-key"
GEMINI_API_KEY="your-google-gemini-api-key"
```

### Frontend (`.env`)
Create a `.env` file in the root (`sathi/`) directory:
```env
VITE_API_URL="http://localhost:5000/api"
```

## 6. Frontend Deployment (Vercel)
1. Push your repository to GitHub.
2. Log in to Vercel and import your project.
3. Keep the default settings:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Add the Environment Variable:
   - `VITE_API_URL`: Set this to your live Render backend URL (e.g., `https://saathi-backend.onrender.com/api`).
5. Deploy.

## 7. Backend Deployment (Render)
1. Log in to Render and create a new **Web Service**.
2. Connect your GitHub repository and select the `backend` directory (if deploying as a monorepo, set the Root Directory to `backend`).
3. Settings:
   - Environment: `Node`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
4. Add the Environment Variables:
   - `PORT`: `5000`
   - `DATABASE_URL`: Your MongoDB Atlas URL
   - `JWT_SECRET`: A secure random string
   - `GEMINI_API_KEY`: Your Google Gemini API Key
5. Deploy.

## 8. Demo Flow
1. **Registration**: Start at `/register` to create a new profile (minimum age 50).
2. **Onboarding**: Complete the 4-step onboarding process (Location, Interests, Preferred Times, Family Consent).
3. **Dashboard**: Arrive at the customized dashboard welcoming the user with quick actions and mood check-ins.
4. **People**: Navigate to `/people` to discover and connect with nearby seniors sharing similar interests.
5. **Activities**: Navigate to `/activities` to view and join local events.
6. **Saathi AI**: Interact with the AI companion (`/ai-companion`) to receive personalized recommendations for people and activities.
7. **Connections**: View your friends and chat on the Connections page (`/connections`).
8. **Family**: Manage privacy and see how the family views your updates (`/family`).
