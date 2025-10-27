import express from 'express';
import path from 'path';
import cors from 'cors';
import compression from 'compression';
import { getEnvConfig } from './config';
import { errorHandler } from './middleware';
import routes from './routes';
import { stripe, supabase } from './services';

// Get current directory for serving static files
const currentDir = __dirname;

async function createApp() {
const app = express();
  const config = getEnvConfig();

  // Middleware - compression for all responses
  app.use(compression());

  // Middleware - CORS configuration
  app.use(
    cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
        if (config.allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
      credentials: true,
    })
  );

  // Configure body parser with larger limit for file uploads
app.use(express.json({ limit: '10mb' }));

  // API routes
  app.use(routes);

  // Serve static files from the client dist directory with caching
  const clientDistPath = path.join(currentDir, '../client/dist');
  app.use(
    express.static(clientDistPath, {
      maxAge: '1y',
      etag: true,
      lastModified: true,
      setHeaders: (res, filePath) => {
        // Set long-term cache for hashed assets (CSS/JS files with content hashes)
        if (
          filePath.includes('/assets/') &&
          (filePath.endsWith('.js') || filePath.endsWith('.css'))
        ) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    })
  );

  // Handle client-side routing - return index.html for SPA routes
  app.get('*', (req, res) => {
    const url = req.url.split('?')[0]; // Remove query string

    // Known static files that should exist - if we reach here and they don't exist, 404
    const staticFileExtensions = ['.txt', '.xml', '.png', '.ico', '.svg', '.jpg', '.jpeg', '.webmanifest'];
    const isStaticFile = staticFileExtensions.some(ext => url.endsWith(ext));
    
    if (isStaticFile) {
      // Static file requested but static middleware didn't find it - return 404
      return res.status(404).send('Not Found');
    }

    // Return index.html for all SPA routes (everything else)
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });

  // Error handling middleware (must be last)
  app.use(errorHandler);

  return app;
}

async function startServer() {
  try {
    const app = await createApp();
    const config = getEnvConfig();

    app.listen(config.port, '0.0.0.0', () => {
      console.log(`Server running on port ${config.port}`);
      
  if (!stripe) {
    console.warn('⚠️  Stripe is not configured. Set STRIPE_SECRET_KEY in .env to enable donations.');
  } else {
    console.log('✓ Stripe is configured and ready for donations');
  }
      
  if (!supabase) {
    console.warn('⚠️  Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.');
  } else {
    console.log('✓ Supabase is configured and ready');
  }
});
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
