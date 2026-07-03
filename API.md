# API Specification - NegaritAI

## Base URL
- Development: `http://localhost:5000`
- Production: `https://api.negarit-ai.com` (to be configured)

## Authentication

All protected endpoints require the `Authorization` header:
```
Authorization: Bearer {token}
```

Tokens are valid for 7 days from issue time.

## Response Format

### Success Response
```json
{
  "data": { /* endpoint-specific data */ },
  "status": 200,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Error Response
```json
{
  "error": "Error message",
  "status": 400,
  "timestamp": "2024-01-15T10:30:00Z",
  "details": { /* optional development info */ }
}
```

## HTTP Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation error)
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `409`: Conflict (duplicate resource)
- `500`: Internal Server Error

---

## Endpoints

### Authentication

#### Register User
**POST** `/api/auth/register`

Creates a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Validation Rules:**
- `name`: 2-50 characters, alphanumeric + spaces
- `email`: Valid email format, unique
- `password`: Min 8 characters, uppercase, lowercase, number, special char

**Response (201):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

**Error Responses:**
- `400`: Invalid input format
- `409`: Email already registered

---

#### Login
**POST** `/api/auth/login`

Authenticates user and returns JWT token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

**Error Responses:**
- `400`: Missing email or password
- `401`: Invalid credentials

---

#### Get Current User
**GET** `/api/auth/me`

Retrieves current authenticated user information.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

**Error Responses:**
- `401`: No token or invalid token

---

### Analysis

#### Analyze Message
**POST** `/analyze`

Analyzes a message for potential cyber threats.

**Request Body:**
```json
{
  "message": "Click here for free prize! Limited time offer!!!"
}
```

**Validation Rules:**
- `message`: 3-5000 characters, non-empty

**Response (200):**
```json
{
  "riskScore": 78,
  "verdict": "Suspicious",
  "explanation": "Message contains urgency tactics and suspicious claim",
  "flags": [
    "Excessive punctuation",
    "Urgency tactics",
    "Suspicious offer"
  ]
}
```

**Risk Score Mapping:**
- `0-30`: Safe
- `31-70`: Suspicious
- `71-100`: Danger

**Verdict Options:**
- `Safe`: Appears legitimate
- `Suspicious`: Possible threat, verify before action
- `Danger`: High likelihood of threat

**Error Responses:**
- `400`: Message missing or invalid length
- `500`: Analysis service unavailable

---

#### Check URL
**POST** `/check-url`

Analyzes a URL for security threats.

**Request Body:**
```json
{
  "url": "https://example-bank-login.ru.com"
}
```

**Validation Rules:**
- `url`: Valid URL format

**Response (200):**
```json
{
  "riskScore": 92,
  "verdict": "Malicious",
  "explanation": "Domain spoofing detected, resembles legitimate bank",
  "flags": [
    "Domain typosquatting",
    "Suspicious TLD",
    "Certificate mismatch"
  ]
}
```

**Error Responses:**
- `400`: Invalid URL format
- `500`: Analysis service unavailable

---

#### Analyze Image
**POST** `/analyze-image`

Analyzes an image for AI generation or manipulation.

**Request Body:**
```json
{
  "image": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
}
```

**Format:**
- Base64 encoded image data
- Supported formats: JPEG, PNG, WebP
- Max file size: 10MB (after encoding)

**Response (200):**
```json
{
  "riskScore": 65,
  "verdict": "Likely AI-Generated",
  "explanation": "Inconsistent lighting and subtle artifacts detected",
  "flags": [
    "Unnatural eye reflections",
    "Blurred background areas",
    "Texture inconsistencies"
  ]
}
```

**Verdict Options:**
- `Authentic`: Image appears genuine
- `Likely AI-Generated`: Probable AI generation detected
- `Manipulated`: Clear signs of digital manipulation

**Error Responses:**
- `400`: Image data missing or invalid
- `500`: Analysis service unavailable

---

### System

#### Health Check
**GET** `/health`

Checks API health status.

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z",
  "environment": "production",
  "uptime": 3600
}
```

---

## Rate Limiting

Default rate limits:
- **Public endpoints**: 10 requests/minute
- **Authenticated endpoints**: 100 requests/minute
- **Analysis endpoints**: 50 requests/hour per user

Rate limit info in response headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705315200
```

---

## Error Codes

| Code | Message | Solution |
|------|---------|----------|
| 400 | Invalid input format | Check request body format |
| 401 | No token provided | Add Authorization header |
| 401 | Invalid token | Regenerate token |
| 403 | Insufficient permissions | Check account permissions |
| 404 | Endpoint not found | Verify endpoint URL |
| 409 | Email already registered | Use different email |
| 429 | Too many requests | Wait before retrying |
| 500 | Internal server error | Contact support |

---

## Example Requests

### Register with cURL
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'
```

### Analyze with cURL
```bash
curl -X POST http://localhost:5000/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Click here to claim your prize!"
  }'
```

### JavaScript/Fetch
```javascript
// Analyze message
const response = await fetch('http://localhost:5000/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'Your message here' })
});

const result = await response.json();
console.log(result);
```

### Python/Requests
```python
import requests
import json

url = 'http://localhost:5000/analyze'
data = {'message': 'Your message here'}
headers = {'Content-Type': 'application/json'}

response = requests.post(url, data=json.dumps(data), headers=headers)
print(response.json())
```

---

## Pagination

Currently not implemented. Planned for future versions with:
- `limit`: Items per page (default: 20, max: 100)
- `offset`: Number of items to skip (default: 0)

---

## Versioning

API is currently version 1.0.
Future versions will be available at `/api/v2/`, etc.

---

## Deprecation Policy

Deprecated endpoints will:
1. Be announced 60 days in advance
2. Include deprecation header: `Deprecation: true`
3. Suggest replacement endpoint
4. Continue functioning for 90 days after deprecation

---

## Changelog

### v1.0.0 (Current)
- Initial release
- Authentication endpoints
- Message analysis
- URL checking
- Image analysis
- Health check endpoint

### v1.1.0 (Planned)
- Threat history endpoint
- Analysis batch processing
- Custom threat rules
- WebSocket support for real-time updates

---

## SDK/Libraries

### Official Libraries
- **JavaScript**: `@negarit-ai/sdk-js` (coming soon)
- **Python**: `negarit-ai-sdk` (coming soon)
- **Go**: `negarit-ai-go` (coming soon)

### Community Libraries
Contributing libraries available at: https://github.com/negarit-ai/sdks

---

## Support

For API issues:
- Check documentation at `/docs`
- Review error messages
- Contact: api-support@negarit-ai.com
- Status: https://status.negarit-ai.com
