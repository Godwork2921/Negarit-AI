# Quick Start Guide - NegaritAI

## 🚀 Get Started in 5 Minutes

### Prerequisites
- Node.js 18+ installed
- OpenRouter API key (free at openrouter.ai)
- Terminal/Command prompt
- Text editor or IDE

### Step 1: Clone & Setup (2 minutes)

```bash
# Clone the project
cd your/desired/location
git clone <repository-url>
cd NegaritAI
```

### Step 2: Backend Setup (1 minute)

```bash
cd backend
npm install

# Create .env file
cp .env.example .env

# Edit .env and add your OpenRouter API key
# OPENROUTER_API_KEY=sk_...
```

### Step 3: Frontend Setup (1 minute)

```bash
# In a new terminal, from NegaritAI directory
cd frontend
npm install

# Create .env.local
cp .env.example .env.local
# (leave defaults, should work as-is)
```

### Step 4: Run Application (1 minute)

```bash
# Terminal 1: Start Backend
cd backend
npm start
# Expected output: "NegaritAI Backend running on port 5000"

# Terminal 2: Start Frontend
cd frontend
npm run dev
# Expected output: "Local: http://localhost:3000"
```

### Step 5: Access Application

Open browser and go to:
```
http://localhost:3000
```

## 🎯 What You Can Do Now

### 1. Test the Application
- Register a new account
- Test message analysis
- Test URL checking
- Test threat history

### 2. Test the API
```bash
# Analyze a message
curl -X POST http://localhost:5000/analyze \
  -H "Content-Type: application/json" \
  -d '{"message":"Click here for free money!"}'

# Check health
curl http://localhost:5000/health
```

### 3. Explore the Code
- Frontend components in `/frontend/components`
- Backend routes in `/backend/app.js`
- Styling in `/frontend/app/globals.css`
- Constants in `/frontend/lib/constants.ts`

## 🛠️ Common First Tasks

### Register & Login
1. Click "Start Free Trial" button
2. Fill registration form
3. You'll be logged in automatically
4. Explore dashboard

### Analyze a Message
1. Go to Analyze section
2. Enter a suspicious message
3. Click "Analyze"
4. See risk score and details

### Customize Settings
1. Go to Settings
2. Update profile
3. Configure preferences

## 📚 Next Steps

### For Development
- Read [DEVELOPMENT.md](./DEVELOPMENT.md)
- Check [API.md](./API.md) for API details
- Explore components in `/frontend/components`

### For Deployment
- Read [DEPLOYMENT.md](./DEPLOYMENT.md)
- Choose hosting platform
- Configure environment variables

### For Contribution
- Create feature branch
- Make changes
- Test locally
- Submit pull request

## ❓ Troubleshooting

### Port already in use?
```bash
# Kill process on port 5000 (backend)
# Windows: netstat -ano | findstr :5000
# Mac/Linux: lsof -i :5000
```

### Can't connect frontend to backend?
- Check if backend is running on http://localhost:5000
- Verify `/health` endpoint works
- Check browser console (F12) for CORS errors

### API key issues?
- Get free key at openrouter.ai
- Add to `.env` file
- Restart backend

## 🔗 Useful Links

- **Next.js**: https://nextjs.org/docs
- **React**: https://react.dev
- **Express**: https://expressjs.com
- **Framer Motion**: https://www.framer.com/motion
- **Tailwind CSS**: https://tailwindcss.com
- **OpenRouter**: https://openrouter.ai

## 💡 Tips

1. **Keep terminals open** - You need both backend and frontend running
2. **Auto-reload** - Frontend and backend watch for file changes
3. **DevTools** - Press F12 in browser for developer console
4. **Clear cache** - If styles look wrong, clear browser cache
5. **Check logs** - If something fails, check terminal output

## 🎓 Understanding the Stack

```
User Browser
    ↓ (React Components)
Frontend (Next.js on :3000)
    ↓ (HTTP/JSON)
Backend (Express on :5000)
    ↓ (API Call)
OpenRouter AI API
    ↓ (Analysis Result)
Back to User
```

## ✅ Verification Checklist

- [ ] Backend running on :5000
- [ ] Frontend running on :3000
- [ ] Can register account
- [ ] Can login
- [ ] Can analyze messages
- [ ] Browser console shows no errors
- [ ] API key works

## 🆘 Getting Help

1. **Check Console**: Press F12 → Console tab
2. **Check Terminal**: Look for error messages
3. **Read Docs**: Check README.md, DEVELOPMENT.md
4. **Test API**: Use curl to test endpoints
5. **Review Logs**: Check both backend and frontend logs

## 🎉 Success!

You're ready to develop NegaritAI! Start by:

1. Understanding the code structure
2. Making small changes
3. Testing in browser
4. Building features
5. Deploying to production

**Happy coding!** 🚀
