# Song Queue System

A web-based song queue system with admin controls and real-time updates.

## Features

- Song request submission
- Admin approval system
- Queue management
- System status control
- Dark/Light theme
- Responsive design

## Deployment Instructions

### Option 1: Deploy to Render.com (Recommended for beginners)

1. Create a free account on [Render.com](https://render.com)
2. Create a new Web Service
3. Connect your GitHub repository
4. Use these settings:
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment Variable: Add `PORT=10000` (or any port number)

### Option 2: Deploy to Railway.app

1. Create a free account on [Railway.app](https://railway.app)
2. Create a new project
3. Connect your GitHub repository
4. Railway will automatically detect the Node.js app and deploy it

### Option 3: Deploy to Heroku

1. Create a free account on [Heroku](https://heroku.com)
2. Install the Heroku CLI
3. Run these commands:
   ```bash
   heroku login
   heroku create your-app-name
   git push heroku main
   ```

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open http://localhost:3000 in your browser

## Security Notes

1. Change the `ADMIN_PASSWORD` in `script.js` before deploying
2. Consider implementing proper authentication in production
3. Add rate limiting for API endpoints
4. Use environment variables for sensitive data

## File Structure

```
├── public/           # Frontend files
│   ├── index.html
│   ├── script.js
│   └── new-style.css
├── server.js         # Backend server
├── package.json      # Dependencies
└── README.md         # This file
```

## Contributing

Feel free to submit issues and enhancement requests! 