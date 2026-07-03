const t = {
  libraryTitle: "Negarit Library",
  librarySub: "Educational resources about cybersecurity, phishing, and how Negarit AI protects you.",
  actionableTips: "Actionable Tips",
  videoTitle: "Watch & Learn",
  videoSub: "Curated cybersecurity videos to deepen your understanding.",

  libraryArticles: [
    {
      category: "Phishing",
      title: "What Is Phishing and How to Spot It",
      desc: "Phishing is a cyberattack where criminals impersonate trusted entities via email, SMS, WhatsApp, or social media to steal sensitive data. Learn the warning signs and how Negarit AI helps you detect them.",
      tips: [
        "Check sender email for subtle misspellings (rnicrosoft vs microsoft)",
        "Hover over links before clicking — inspect the real URL",
        "Look for urgency language: 'suspended', 'verify immediately', 'payment overdue'",
        "Never share OTPs, passwords, or PINs via email or SMS",
        "Use Negarit AI to scan suspicious messages before responding",
      ],
    },
    {
      category: "Deepfake",
      title: "Detecting AI-Generated Images and Deepfakes",
      desc: "AI-generated images and deepfakes are increasingly used in scams and disinformation. Understand how these fakes are created and how Negarit AI's image analysis detects them.",
      tips: [
        "Look for unnatural eye reflections, blurry edges, or inconsistent lighting",
        "Check for missing or mismatched shadows on faces and objects",
        "Examine skin texture — AI often produces overly smooth surfaces",
        "Verify the source of any suspicious image before sharing",
        "Upload suspected deepfakes to Negarit AI for instant analysis",
      ],
    },
    {
      category: "URL Safety",
      title: "How to Recognize Malicious Links",
      desc: "Malicious URLs are one of the most common attack vectors. Scammers use link shorteners, typosquatting, and lookalike domains to trick you into visiting fake websites.",
      tips: [
        "Hover over every link to preview the destination URL before clicking",
        "Watch for typosquatting: go0gle.com, faceb00k.com, paypaI.com",
        "Avoid clicking links in unsolicited messages — type the URL manually",
        "Use Negarit AI's URL scanner to check any suspicious link",
        "Enable browser extensions that block known phishing sites",
      ],
    },
    {
      category: "Social Engineering",
      title: "Understanding Social Engineering Attacks",
      desc: "Social engineering manipulates human psychology rather than technical vulnerabilities. Attackers pose as IT support, bank representatives, or colleagues to extract sensitive information.",
      tips: [
        "Verify identities through a separate communication channel",
        "Be skeptical of unexpected calls claiming to be from your bank or IT",
        "Never give remote access to your computer to unsolicited callers",
        "Train your team to recognize common social engineering tactics",
        "Always confirm urgent requests from executives via official channels",
      ],
    },
    {
      category: "Best Practices",
      title: "Cybersecurity Best Practices for Everyone",
      desc: "Simple daily habits can dramatically reduce your risk of falling victim to cyberattacks. Strengthen your digital defenses with these essential practices.",
      tips: [
        "Use a password manager to generate and store strong unique passwords",
        "Enable Two-Factor Authentication (2FA) on all accounts",
        "Keep your devices and software updated with the latest security patches",
        "Regularly back up important data to an external drive or cloud storage",
        "Use Negarit AI as your first line of defense against suspicious content",
      ],
    },
    {
      category: "Negarit AI",
      title: "How Negarit AI Protects You",
      desc: "Negarit AI is an AI-powered fraud detection system that analyzes messages, sender info, URLs, and images to protect you from phishing, scams, and deepfakes across all your communication platforms.",
      tips: [
        "Paste suspicious messages into Analyze Message for instant risk scoring",
        "Check sender reputation by entering email, domain, or phone number",
        "Upload images for deepfake and manipulation detection",
        "Use URL scanning to verify links before clicking",
        "Review your full analysis history in Threat History and export Reports",
      ],
    },
  ],

  videos: [
    {
      id: "XBkzBrXlle0",
      title: "Phishing Explained In 6 Minutes | What Is A Phishing Attack?",
      url: "https://www.youtube.com/watch?v=XBkzBrXlle0",
      channel: "Simplilearn",
    },
    {
      id: "zflsg6TRuos",
      title: "11 Tips for Identifying Fake Websites and Phishing Emails",
      url: "https://www.youtube.com/watch?v=zflsg6TRuos",
      channel: "CompTIA Explore",
    },
    {
      id: "Um-cS_TgGvo",
      title: "Deepfakes Explained: The Rise of Digital Deception",
      url: "https://www.youtube.com/watch?v=Um-cS_TgGvo",
      channel: "WhiteboardDoodles",
    },
  ],
};

export default t;
