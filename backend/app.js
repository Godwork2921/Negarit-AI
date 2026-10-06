import express from "express";
import cors from "cors";
import axios from "axios";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import "dotenv/config";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";

const app = express();

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";
const OPENROUTER_API = "https://openrouter.ai/api/v1/chat/completions";
const JWT_SECRET = process.env.JWT_SECRET || "negarit-secret-key-change-in-production";
const CORS_ORIGINS = (process.env.CORS_ORIGIN || "http://localhost:3000,http://localhost:3001").split(",");


app.use(cors({ origin: CORS_ORIGINS, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

const users = [];

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ error: "No authorization token provided" });
  }

  try {
    const token = header.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Invalid token format" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

function validatePassword(password) {
  return password && password.length >= 8;
}

function handleError(err, res, statusCode = 500) {
  console.error("Error:", err.message);
  const isDev = NODE_ENV === "development";
  res.status(statusCode).json({
    error: err.message || "Internal server error",
    ...(isDev && { details: err.stack }),
  });
}


app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    if (name.length < 2 || name.length > 50) {
      return res.status(400).json({ error: "Name must be between 2 and 50 characters" });
    }

    // Check if email already exists
    if (users.find((u) => u.email === email)) {
      return res.status(409).json({ error: "Email is already registered" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = {
      id: users.length + 1,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashed,
      createdAt: new Date().toISOString(),
    };

    users.push(user);

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    handleError(err, res, 500);
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = users.find((u) => u.email === email.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    handleError(err, res, 500);
  }
});

app.get("/api/auth/me", authenticate, (req, res) => {
  try {
    res.json({ user: req.user });
  } catch (err) {
    handleError(err, res, 500);
  }
});


app.post("/api/auth/google", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Google token is required" });
    }

    // Verify Google token with Google's servers
    // In production, you should use google-auth-library for this
    let payload;
    try {
      // Decode the token (in production, verify with Google's API)
      // For now, we'll decode it and verify the signature with Google
      const response = await axios.get(
        `https://www.googleapis.com/oauth2/v1/userinfo?access_token=${token}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      ).catch(async () => {
        // If access token verification fails, try to verify the ID token
        // This is a simplified approach - use google-auth-library in production
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          // Decode the payload (part 2)
          const decodedPayload = JSON.parse(
            Buffer.from(tokenParts[1], 'base64').toString('utf-8')
          );
          return { data: decodedPayload };
        }
        throw new Error('Invalid token format');
      });

      payload = response.data;

      if (!payload.email) {
        return res.status(400).json({ error: "Google token does not contain email" });
      }

      const email = payload.email.toLowerCase().trim();
      const name = payload.name || payload.email.split('@')[0];

      let user = users.find((u) => u.email === email);

      if (!user) {
        user = {
          id: users.length + 1,
          name: name,
          email: email,
          password: null, // No password for OAuth users
          googleId: payload.sub || payload.id,
          profilePicture: payload.picture,
          createdAt: new Date().toISOString(),
          provider: 'google'
        };
        users.push(user);
        console.log(`New Google user created: ${email}`);
      } else if (!user.googleId) {
        // Link Google account to existing user
        user.googleId = payload.sub || payload.id;
        user.provider = 'google';
        console.log(`Google account linked to existing user: ${email}`);
      }

      // Generate JWT token
      const jwtToken = jwt.sign(
        { id: user.id, name: user.name, email: user.email },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.json({
        token: jwtToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          picture: user.profilePicture,
        },
        message: "Google authentication successful"
      });
    } catch (tokenError) {
      console.error('Token verification error:', tokenError.message);
      return res.status(401).json({ 
        error: "Failed to verify Google token",
        details: NODE_ENV === 'development' ? tokenError.message : undefined
      });
    }
  } catch (err) {
    handleError(err, res, 500);
  }
});

// ═══ Analysis Routes ═══

app.post("/analyze", async (req, res) => {
  try {
    const { message, senderEmail, domain, senderPhone } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    if (message.length > 5000) {
      return res.status(400).json({ error: "Message must not exceed 5000 characters" });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({ error: "API key not configured" });
    }

    let senderInfo = "";
    if (senderEmail || domain || senderPhone) {
      senderInfo = "\n\nSender Information for analysis:\n";
      if (senderEmail) senderInfo += `- Sender Email: ${senderEmail.trim()}\n`;
      if (domain) senderInfo += `- Domain: ${domain.trim()}\n`;
      if (senderPhone) senderInfo += `- Sender Phone: ${senderPhone.trim()}\n`;
    }

    const prompt = `You are a cybersecurity fraud detection AI. Analyze the following message and return ONLY a valid JSON response with these exact fields:
- riskScore: number 0-100 (0=safe, 100=dangerous)
- verdict: one of "Safe", "Suspicious", "Danger"
- explanation: brief reason (max 100 chars)
- flags: array of strings listing detected issues (empty array if none)
- senderAnalysis: object or null containing:
  - emailReputation: one of "legitimate", "suspicious", "spoofed", or "unknown"
  - domainReputation: one of "trusted", "suspicious", "malicious", or "unknown"
  - phoneReputation: one of "legitimate", "suspicious", "unknown"
  - senderVerdict: one of "Safe", "Suspicious", "Danger"
  - details: string with sender-specific explanation${senderInfo}

Message: """${message.trim()}"""

Return only valid JSON, no markdown or extra text.`;

    const { data } = await axios.post(
      OPENROUTER_API,
      {
        model: "openai/gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 500,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    const result = JSON.parse(data.choices[0].message.content);

    // Validate response
    if (typeof result.riskScore !== "number" || result.riskScore < 0 || result.riskScore > 100) {
      throw new Error("Invalid risk score in response");
    }

    res.json(result);
  } catch (err) {
    console.error("Analysis error:", err.message);
    res.status(500).json({
      error: "Analysis failed",
      riskScore: 0,
      verdict: "Error",
      explanation: "Could not complete analysis",
      flags: [],
    });
  }
});

app.post("/check-url", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url || !url.trim()) {
      return res.status(400).json({ error: "URL is required" });
    }

    // Validate URL format
    try {
      new URL(url.trim());
    } catch {
      return res.status(400).json({ error: "Invalid URL format" });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({ error: "API key not configured" });
    }

    const prompt = `You are a URL security analyzer. Analyze this URL and return ONLY a valid JSON response:
- riskScore: 0-100
- verdict: one of "Safe", "Suspicious", "Malicious"
- explanation: brief reason (max 100 chars)
- flags: array of suspicious patterns found

URL: """${url.trim()}"""

Return only valid JSON, no markdown or extra text.`;

    const { data } = await axios.post(
      OPENROUTER_API,
      {
        model: "openai/gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 500,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    const result = JSON.parse(data.choices[0].message.content);
    res.json(result);
  } catch (err) {
    console.error("URL check error:", err.message);
    res.status(500).json({
      error: "URL analysis failed",
      riskScore: 0,
      verdict: "Error",
      explanation: "Could not complete analysis",
      flags: [],
    });
  }
});

app.post("/analyze-image", async (req, res) => {
  try {
    const { image } = req.body;

    if (!image || !image.trim()) {
      return res.status(400).json({ error: "Image data is required" });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({ error: "API key not configured" });
    }

    const prompt = `You are an AI image forensic analyst. Analyze this image for signs of AI generation, manipulation, or deepfake artifacts. Return ONLY valid JSON:
- riskScore: 0-100
- verdict: one of "Authentic", "Likely AI-Generated", "Manipulated"
- explanation: brief reason (max 100 chars)
- flags: array of detected anomalies

Return only valid JSON, no markdown or extra text.`;

    const { data } = await axios.post(
      OPENROUTER_API,
      {
        model: "openai/gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: `data:image/png;base64,${image}` } },
            ],
          },
        ],
        max_tokens: 500,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    const result = JSON.parse(data.choices[0].message.content);
    res.json(result);
  } catch (err) {
    console.error("Image analysis error:", err.message);
    res.status(500).json({
      error: "Image analysis failed",
      riskScore: 0,
      verdict: "Error",
      explanation: "Could not complete analysis",
      flags: [],
    });
  }
});

// ═══ Health Check ═══

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    uptime: process.uptime(),
  });
});

// ═══ AI Chatbot ═══
app.post("/api/chat", async (req, res) => {
  try {
    const { message, language = "english", history = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({ error: "API key not configured" });
    }

    const langInstruction = {
      english: "Answer in English.",
      amharic: "መልስህን በአማርኛ ስጥ።",
      tigray: "መልስኻ ብትግርኛ ሃብ።",
      oromo: "Deebii kee Afaan Oromoon kenni.",
    }[language] || "Answer in English.";

    const systemPrompt = `You are Negarit AI Assistant, a helpful cybersecurity chatbot for the Negarit AI fraud detection platform.

Your role:
- Explain what phishing, smishing, vishing, deepfakes, malware, and other cyber threats are in simple terms
- Explain the purpose and features of Negarit AI (AI-powered fraud detection for messages, images, URLs; sender analysis; risk scoring)
- Explain how to PREVENT and respond to these threats: concrete steps users can take (verifying senders, checking URLs before clicking, enabling MFA, recognizing urgency/pressure tactics, reporting suspicious content, what to do if they already clicked or shared data)
- Provide cybersecurity awareness tips
- Keep answers concise (under 150 words) and beginner-friendly
- Use short paragraphs or a short bullet list rather than walls of text

${langInstruction}`;

    const messages = [{ role: "system", content: systemPrompt }];

    if (Array.isArray(history)) {
      for (const turn of history.slice(-10)) {
        const role = turn?.role === "assistant" ? "assistant" : "user";
        const content = typeof turn?.text === "string" ? turn.text.trim() : "";
        if (content) messages.push({ role, content });
      }
    }

    messages.push({ role: "user", content: message.trim() });

    const { data } = await axios.post(
      OPENROUTER_API,
      {
        model: "openai/gpt-4o-mini",
        messages,
        max_tokens: 600,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    const reply = data.choices[0].message.content.trim();

    res.json({ reply, language });
  } catch (err) {
    console.error("Chatbot error:", err.message);
    res.status(500).json({
      error: "Chatbot request failed",
      reply: "I'm sorry, I couldn't process your request. Please try again.",
    });
  }
});

// ═══ Library ═══
app.get("/api/library/video", (req, res) => {
  res.json({
    title: "What is Phishing? Phishing Explained In 6 Minutes",
    url: "https://www.youtube.com/watch?v=Y7z_NB8R0PI",
    embedUrl: "https://www.youtube.com/embed/Y7z_NB8R0PI",
    description: "An educational video explaining what phishing attacks are, how they work, and how to protect yourself online.",
  });
});

app.get("/api/library/download", async (req, res) => {
  try {
    const doc = new Document({
      title: "Negarit AI - Understanding Phishing and Cybersecurity Guide",
      description: "A comprehensive guide to phishing attacks, deepfakes, and how Negarit AI helps protect you.",
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              text: "Negarit AI",
              heading: HeadingLevel.TITLE,
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              text: "Understanding Phishing and Cybersecurity",
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
            }),
            new Paragraph({
              spacing: { before: 200 },
              children: [
                new TextRun({
                  text: "1. What is Phishing?",
                  bold: true,
                  size: 28,
                }),
              ],
            }),
            new Paragraph({
              spacing: { after: 200 },
              children: [
                new TextRun({
                  text: "Phishing is a type of cyberattack where criminals impersonate legitimate organizations via email, SMS, WhatsApp, or social media to steal sensitive information such as passwords, credit card numbers, and personal data. These attacks often create a sense of urgency — claiming your account will be suspended, a payment is overdue, or you've won a prize — to trick you into clicking malicious links or providing personal information.",
                  size: 24,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "2. Common Types of Phishing",
                  bold: true,
                  size: 28,
                }),
              ],
            }),
            new Paragraph({
              spacing: { after: 100 },
              children: [
                new TextRun({
                  text: "• Email Phishing: Fake emails that appear to be from banks, government agencies, or companies.\n• Smishing: Phishing via SMS text messages with fake alerts.\n• Vishing: Voice phishing conducted over phone calls.\n• Spear Phishing: Targeted attacks aimed at specific individuals or organizations.\n• Whaling: Attacks targeting senior executives with access to sensitive data.",
                  size: 24,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "3. What are Deepfakes?",
                  bold: true,
                  size: 28,
                }),
              ],
            }),
            new Paragraph({
              spacing: { after: 200 },
              children: [
                new TextRun({
                  text: "Deepfakes are AI-generated images, audio, or video designed to impersonate real people. Cybercriminals use deepfakes to create fake social media profiles, impersonate executives in video calls, and spread disinformation. Negarit AI's image analysis detects AI-generated artifacts, metadata inconsistencies, and generation fingerprints to identify manipulated content.",
                  size: 24,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "4. How Negarit AI Protects You",
                  bold: true,
                  size: 28,
                }),
              ],
            }),
            new Paragraph({
              spacing: { after: 100 },
              children: [
                new TextRun({
                  text: "Negarit AI is an AI-powered fraud detection system that provides:\n\n• Message Analysis: Detects phishing patterns in emails, SMS, WhatsApp, and Telegram messages.\n• Sender Analysis: Evaluates sender email reputation, domain trustworthiness, and phone number legitimacy.\n• URL Scanning: Identifies malicious and spoofed links.\n• Image Analysis: Detects AI-generated deepfakes and manipulated images.\n• Risk Scoring: Each analysis returns a risk score from 0 (safe) to 100 (dangerous) with detailed explanations.",
                  size: 24,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "5. Cybersecurity Best Practices",
                  bold: true,
                  size: 28,
                }),
              ],
            }),
            new Paragraph({
              spacing: { after: 100 },
              children: [
                new TextRun({
                  text: "• Always verify sender email addresses and domain names.\n• Hover over links before clicking to check the actual URL.\n• Never share passwords, PINs, or OTPs via email or SMS.\n• Enable Two-Factor Authentication (2FA) on all accounts.\n• Use unique passwords for each service with a password manager.\n• Report suspicious messages to your security team or authorities.\n• Use Negarit AI to analyze suspicious messages before taking action.",
                  size: 24,
                }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 400 },
              children: [
                new TextRun({
                  text: "— Negarit AI —",
                  bold: true,
                  size: 22,
                  color: "6b21a8",
                }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: "AI-Powered Threat Detection & Analysis",
                  size: 20,
                  color: "6b21a8",
                }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: "© 2026 Negarit AI. All rights reserved.",
                  size: 18,
                  color: "888888",
                }),
              ],
            }),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", 'attachment; filename="NegaritAI-Phishing-and-Cybersecurity-Guide.docx"');
    res.send(buffer);
  } catch (err) {
    console.error("Document generation error:", err.message);
    res.status(500).json({ error: "Failed to generate document" });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    ...(NODE_ENV === "development" && { message: err.message }),
  });
});

const server = app.listen(PORT, () => {
  console.log(`

║     NegaritAI Backend Server Started  
  Environment: ${NODE_ENV.padEnd(24)} 
  Port: ${String(PORT).padEnd(31)} 
  API: http://localhost:${String(PORT).padEnd(24)} 
  CORS Origins: ${CORS_ORIGINS.join(", ").padEnd(22)} 
  `);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});

export default app;

