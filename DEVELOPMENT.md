# Development Guide - NegaritAI

## Quick Start

### 1. Clone and Setup
```bash
# Clone repository
git clone <repository-url>
cd NegaritAI

# Setup backend
cd backend
npm install
cp .env.example .env
# Edit .env with your API keys
npm start

# In a new terminal, setup frontend
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

### 2. Access Application
- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- API Docs: http://localhost:5000/health

## Project Architecture

### Frontend Structure
```
frontend/
├── app/
│   ├── page.tsx          # Home/Landing page
│   ├── layout.tsx        # Root layout with metadata
│   ├── globals.css       # Global styles & animations
│   └── [features]/       # Feature pages (login, dashboard, etc.)
├── components/
│   ├── UI.jsx            # Reusable UI components
│   ├── Navbar.jsx        # Navigation bar
│   └── [features]/       # Feature-specific components
├── lib/
│   ├── api.js            # API client with error handling
│   ├── auth.js           # Authentication functions
│   ├── animations.ts     # Framer Motion variants
│   ├── validation.ts     # Form validation rules
│   └── constants.ts      # App-wide constants
└── public/               # Static assets
```

### Backend Structure
```
backend/
├── app.js                # Express application with routes
├── package.json          # Dependencies & scripts
├── .env.example          # Environment template
└── .env                  # Actual environment (git ignored)
```

## Development Workflow

### Feature Development

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/feature-name
   ```

2. **Backend Implementation**
   - Add new routes in `app.js`
   - Include input validation
   - Add error handling
   - Test with Postman/curl

3. **Frontend Implementation**
   - Create components in `components/`
   - Update `lib/` utilities if needed
   - Add new pages in `app/`
   - Use animation variants from `lib/animations.ts`
   - Add validation from `lib/validation.ts`

4. **Testing**
   - Test locally on http://localhost:3000
   - Test API on http://localhost:5000
   - Verify error handling
   - Test mobile responsiveness

5. **Commit & Push**
   ```bash
   git add .
   git commit -m "feat: add feature description"
   git push origin feature/feature-name
   ```

## Code Conventions

### Naming
- Components: PascalCase (e.g., `UserCard.jsx`)
- Functions: camelCase (e.g., `getUserData()`)
- Constants: UPPER_SNAKE_CASE (e.g., `API_BASE_URL`)
- Files: kebab-case for pages, camelCase for utils (e.g., `page.tsx`, `auth.js`)

### Component Structure
```jsx
"use client"; // Mark as client component

import { motion } from "framer-motion";
import { slideUp } from "@/lib/animations";

export default function ComponentName() {
  // State
  const [state, setState] = useState(null);

  // Effects
  useEffect(() => {
    // ...
  }, []);

  // Handlers
  const handleAction = () => {
    // ...
  };

  // Render
  return (
    <motion.div variants={slideUp}>
      {/* Content */}
    </motion.div>
  );
}
```

### Error Handling
```js
try {
  const result = await apiFunction();
  return result;
} catch (err) {
  console.error("Detailed error:", err);
  throw new Error("User-friendly error message");
}
```

### API Functions
```js
// lib/api.js
export async function featureName(param) {
  // Validate input
  if (!param) {
    throw new ApiError("Parameter is required");
  }

  // Make request
  return apiClient.post("/endpoint", { param });
}
```

## Animation Guidelines

### Use Established Variants
```jsx
import { slideUp, scaleIn, containerVariants } from "@/lib/animations";

// For single element
<motion.div variants={slideUp} initial="initial" animate="animate">

// For container with children
<motion.div variants={containerVariants} initial="hidden" animate="visible">
  <motion.div variants={itemVariants}>Item 1</motion.div>
  <motion.div variants={itemVariants}>Item 2</motion.div>
</motion.div>
```

### Interaction Animations
```jsx
import { hoverScale } from "@/lib/animations";

<motion.button {...hoverScale}>
  Click me
</motion.button>
```

## Form Validation

### Validate Before Submit
```jsx
import { validateForm, getFieldError } from "@/lib/validation";

const { isValid, errors } = validateForm(formData);
if (!isValid) {
  showErrors(errors);
  return;
}

const error = getFieldError("email", errors);
```

## Environment Configuration

### Required Variables

**Backend (.env)**
```
PORT=5000
NODE_ENV=development
OPENROUTER_API_KEY=sk_...
JWT_SECRET=your_secret_key
CORS_ORIGIN=http://localhost:3000
```

**Frontend (.env.local)**
```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Optional Variables
```
# Backend
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info

# Frontend
NEXT_PUBLIC_ENABLE_BETA_FEATURES=false
```

## Database Migration (Future)

When migrating from in-memory to database:

1. **Create database schema**
2. **Update user storage in `app.js`**
3. **Update auth functions**
4. **Update analysis history tracking**
5. **Implement database migrations**

## Testing

### Backend Testing (Manual)
```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","password":"SecurePass123!"}'

# Analyze message
curl -X POST http://localhost:5000/analyze \
  -H "Content-Type: application/json" \
  -d '{"message":"Click here for free money!"}'
```

### Frontend Testing
- Use browser DevTools (F12)
- Check Network tab for API calls
- Check Console for errors
- Test on mobile using DevTools device emulation

## Performance Tips

### Frontend
- Use `next/image` for images
- Lazy load heavy components
- Minimize re-renders with `useMemo`
- Optimize animations (reduce scale transforms)

### Backend
- Use connection pooling (when using DB)
- Cache API responses when appropriate
- Implement rate limiting
- Use async operations

## Security Best Practices

### Frontend
- Never store sensitive data in localStorage
- Validate all inputs
- Use HTTPS in production
- Implement CSP headers

### Backend
- Always validate inputs server-side
- Use prepared statements (when using DB)
- Implement rate limiting
- Log security events
- Use strong JWT secrets
- Never expose error details in production

## Debugging

### Frontend
```js
// Add debug logging
console.log("State:", state);
console.error("Error:", error);

// Use DevTools breakpoints
// Use React DevTools extension
```

### Backend
```js
// Add console logging
console.log("Request:", req.body);
console.error("Error:", err.message);

// Use Node debugger
// node --inspect app.js
```

## Common Tasks

### Add New API Endpoint
1. Add route in `backend/app.js`
2. Add validation
3. Add error handling
4. Create function in `frontend/lib/api.js`
5. Use in components

### Add New Page
1. Create `frontend/app/[page-name]/page.jsx`
2. Create layout if needed
3. Add route to `lib/constants.ts` ROUTES
4. Add navigation link in Navbar

### Update Styling
1. Edit `frontend/app/globals.css` for global styles
2. Use Tailwind classes in components
3. Use CSS custom properties from globals.css

### Deploy to Production
1. Update environment variables
2. Build: `npm run build`
3. Test build locally: `npm start`
4. Deploy to hosting platform

## Troubleshooting

### Port Already in Use
```bash
# Backend
lsof -i :5000
kill -9 <PID>

# Frontend
lsof -i :3000
kill -9 <PID>
```

### CORS Errors
- Check CORS_ORIGIN in backend .env
- Ensure frontend NEXT_PUBLIC_API_URL matches

### API Timeouts
- Check internet connection
- Check OpenRouter API key
- Verify API is responding

### Build Errors
- Clear `.next` folder
- Delete `node_modules` and reinstall
- Check TypeScript errors

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [React Docs](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Framer Motion](https://www.framer.com/motion)
- [Express Docs](https://expressjs.com)
- [OpenRouter API](https://openrouter.ai)

## Support & Questions

- Check existing documentation
- Review error messages
- Check browser/server console logs
- Ask on discussion forums
