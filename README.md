# NegaritAI - Enterprise Threat Detection Platform

Advanced AI-powered cybersecurity threat detection and analysis platform protecting against phishing, deepfakes, malware, and social engineering attacks.

## 🚀 Features

- **Real-time Threat Analysis**: Analyze suspicious messages, URLs, images, and files instantly
- **AI-Powered Detection**: Leverages enterprise-grade AI models for accurate threat identification
- **Multi-Modal Analysis**: Support for text messages, URLs, images, and more
- **Secure Authentication**: JWT-based authentication with password hashing
- **Professional Dashboard**: Modern UI with real-time threat monitoring
- **Threat History**: Track and review past analyses
- **Risk Scoring**: 0-100 risk scoring system with clear categorization
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 16 with React 19
- **Language**: TypeScript + JavaScript
- **Styling**: Tailwind CSS 4
- **Animations**: Framer Motion
- **Package Manager**: npm

### Backend
- **Runtime**: Node.js with ES Modules
- **Framework**: Express.js 5
- **Authentication**: JWT + bcrypt
- **API Integration**: OpenRouter AI API
- **Validation**: Input validation and error handling

## 📦 Installation

### Prerequisites
- Node.js 18+
- npm or yarn
- OpenRouter API key (for AI threat analysis)

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file from template:
```bash
cp .env.example .env
```

4. Fill in required environment variables:
```env
PORT=5000
NODE_ENV=development
OPENROUTER_API_KEY=your_api_key_here
JWT_SECRET=your_secure_secret_key
CORS_ORIGIN=http://localhost:3000
```

5. Start the server:
```bash
npm run dev
# or
node app.js
```

The backend will be available at `http://localhost:5000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` file from template:
```bash
cp .env.example .env.local
```

4. Configure API endpoint:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

5. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

## 📚 API Documentation

### Authentication Endpoints

#### Register
- **POST** `/api/auth/register`
- Body: `{ name, email, password }`
- Returns: `{ token, user }`

#### Login
- **POST** `/api/auth/login`
- Body: `{ email, password }`
- Returns: `{ token, user }`

#### Get Current User
- **GET** `/api/auth/me`
- Headers: `Authorization: Bearer {token}`
- Returns: `{ user }`

### Analysis Endpoints

#### Analyze Message
- **POST** `/analyze`
- Body: `{ message }`
- Returns: `{ riskScore, verdict, explanation, flags }`

#### Check URL
- **POST** `/check-url`
- Body: `{ url }`
- Returns: `{ riskScore, verdict, explanation, flags }`

#### Analyze Image
- **POST** `/analyze-image`
- Body: `{ image }` (base64 encoded)
- Returns: `{ riskScore, verdict, explanation, flags }`

### Health Check
- **GET** `/health`
- Returns: `{ status, timestamp, environment, uptime }`

## 🏗️ Project Structure

```
NegaritAI/
├── backend/
│   ├── app.js              # Main Express application
│   ├── package.json        # Backend dependencies
│   └── .env.example        # Environment template
│
├── frontend/
│   ├── app/                # Next.js pages and layouts
│   │   ├── page.tsx        # Home page
│   │   ├── layout.tsx      # Root layout
│   │   ├── globals.css     # Global styles
│   │   └── [routes]/       # Page routes
│   ├── components/         # Reusable React components
│   │   ├── UI.jsx          # Common UI components
│   │   ├── Navbar.jsx      # Navigation component
│   │   └── [components]/   # Feature components
│   ├── lib/                # Utility functions
│   │   ├── api.js          # API client
│   │   ├── auth.js         # Authentication utilities
│   │   ├── animations.ts   # Animation variants
│   │   ├── validation.ts   # Form validation
│   │   └── constants.ts    # App constants
│   ├── public/             # Static assets
│   └── package.json        # Frontend dependencies
```

## 🎨 Design System

### Color Palette
- **Primary**: Indigo (#667eea) - UI elements, interactions
- **Secondary**: Purple (#764ba2) - Gradients, accents
- **Success**: Green (#10b981) - Safe/Authentic content
- **Warning**: Amber (#f59e0b) - Suspicious content
- **Danger**: Red (#ef4444) - Dangerous/Malicious content
- **Background**: #0a0a1a - Dark theme
- **Surface**: White/5% opacity - Frosted glass effect

### Typography
- **Headings**: Geist Sans (system font)
- **Body**: Geist Sans (system font)
- **Code**: Geist Mono (monospace)

### Components
- **Buttons**: Gradient backgrounds with hover animations
- **Cards**: Frosted glass with backdrop blur
- **Inputs**: Glass morphism with focus states
- **Badges**: Color-coded severity indicators

## 🔐 Security Considerations

- **Password Hashing**: Uses bcrypt with 10 salt rounds
- **Token Management**: JWT tokens with 7-day expiration
- **CORS**: Configured for specific origins only
- **Input Validation**: Server-side validation for all inputs
- **Error Handling**: Detailed errors in development, generic in production
- **API Timeouts**: 30-second timeout on all AI analysis requests

## 📝 Environment Variables

### Backend (.env)
```
PORT=5000
NODE_ENV=development
OPENROUTER_API_KEY=<your_api_key>
JWT_SECRET=<secure_secret>
CORS_ORIGIN=http://localhost:3000
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_ENABLE_BETA_FEATURES=false
```

## 🚀 Deployment

### Backend Deployment
1. Set production environment variables
2. Update `JWT_SECRET` with a strong random string
3. Configure database connection (migrate from in-memory store)
4. Deploy to your hosting platform (Heroku, Railway, Render, etc.)

### Frontend Deployment
1. Build the project: `npm run build`
2. Update `NEXT_PUBLIC_API_URL` to production backend URL
3. Deploy to Vercel, Netlify, or your hosting platform

## 📚 Development Guide

### Code Style
- Use consistent naming conventions
- Follow the established folder structure
- Write semantic HTML
- Use TypeScript where possible
- Add proper error handling

### Component Guidelines
- Keep components focused and reusable
- Use Framer Motion for animations
- Follow the established UI component patterns
- Add proper TypeScript types
- Include JSDoc comments for functions

### API Integration
- Use the provided API client from `lib/api.js`
- Always handle errors gracefully
- Validate input before sending
- Use constants from `lib/constants.ts`

## 🐛 Common Issues

### Backend won't start
- Ensure Node.js 18+ is installed
- Check if port 5000 is available
- Verify `.env` file is correctly configured
- Check OpenRouter API key is valid

### Frontend won't connect to backend
- Ensure backend is running on http://localhost:5000
- Check CORS configuration in `.env`
- Verify `NEXT_PUBLIC_API_URL` is correct
- Check browser console for CORS errors

### AI Analysis fails
- Verify OpenRouter API key is set
- Check API key has sufficient credits
- Ensure message/URL is properly formatted
- Check internet connection

## 📞 Support

For issues, questions, or contributions:
1. Check existing documentation
2. Review error messages in console
3. Check browser console (F12)
4. Review server logs

## 📄 License

This project is licensed under the ISC License - see LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 🎯 Roadmap

- [ ] Database integration (PostgreSQL)
- [ ] User profiles and preferences
- [ ] Advanced threat analytics
- [ ] Export reports functionality
- [ ] API rate limiting
- [ ] Mobile app
- [ ] Threat intelligence feeds
- [ ] Team collaboration features

---

**NegaritAI** - Protecting you from digital threats, powered by AI.
