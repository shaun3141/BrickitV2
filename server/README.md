# BrickIt Server

Professional Express.js server for the BrickIt application with modular architecture designed for scalability and AI code agent compatibility.

## Architecture

The server follows a clean, modular architecture:

```
server/
├── src/
│   ├── config/          # Configuration and environment setup
│   ├── middleware/      # Reusable middleware (auth, error handling)
│   ├── routes/          # API route handlers
│   ├── services/        # Business logic (Supabase, Stripe)
│   ├── types/           # TypeScript type definitions
│   └── index.ts         # Main entry point
├── dist/                # Compiled JavaScript
└── package.json
```

## Structure

### Config (`src/config/`)
- **env.ts**: Environment variable validation and configuration
- Ensures all required variables are present at startup
- Provides type-safe access to configuration

### Middleware (`src/middleware/`)
- **auth.ts**: JWT authentication middleware
- **errorHandler.ts**: Centralized error handling and async wrapper
- Reusable across all routes

### Routes (`src/routes/`)
- **health.ts**: Health check endpoint
- **storage.ts**: File upload operations
- **creations.ts**: CRUD operations for creations
- **donations.ts**: Stripe payment and webhook handling
- **index.ts**: Routes aggregation

### Services (`src/services/`)
- **supabase.ts**: Supabase client initialization
- **stripe.ts**: Stripe client initialization
- **creations.ts**: Creation business logic
- **storage.ts**: Storage operations
- **donations.ts**: Donation processing logic

### Types (`src/types/`)
- Shared TypeScript interfaces
- Consistent API response types

## Key Features

### 1. **Separation of Concerns**
- Business logic isolated in services
- Routes only handle HTTP concerns
- Configuration centralized and validated

### 2. **Error Handling**
- Centralized error middleware
- Consistent API error responses
- Async handler wrapper for automatic error catching

### 3. **Authentication**
- Reusable auth middleware
- JWT token verification
- User ID injection into request context

### 4. **Environment Validation**
- Startup-time validation of required variables
- Clear error messages for missing configuration
- Type-safe configuration access

### 5. **Scalability**
- Modular structure allows easy feature addition
- Services can be easily extended or replaced
- Clear separation enables independent testing

## API Endpoints

### Health
- `GET /health` - Health check

### Storage
- `POST /api/storage/upload` - Upload file to Supabase Storage

### Creations
- `GET /api/creations` - Get user's creations
- `POST /api/creations` - Create or update a creation
- `DELETE /api/creations/:id` - Delete a creation

### Donations
- `POST /api/create-checkout-session` - Create Stripe checkout session
- `POST /api/webhooks/stripe` - Stripe webhook handler

## Development

```bash
# Install dependencies
npm install

# Run in development mode (with hot reload)
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## Environment Variables

Required:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `SUPABASE_ANON_KEY` - Supabase anonymous key

Optional:
- `STRIPE_SECRET_KEY` - Stripe secret key (donations disabled if not set)
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret
- `CLIENT_URL` - Client application URL
- `PORT` - Server port (default: 8080)
- `NODE_ENV` - Environment (development/production/test)

## Benefits for AI Code Agents

1. **Clear Structure**: Predictable folder organization
2. **Consistent Patterns**: Reusable middleware and services
3. **Type Safety**: Full TypeScript coverage
4. **Documentation**: JSDoc comments on public functions
5. **Single Responsibility**: Each module has one clear purpose
6. **Easy Testing**: Services can be mocked independently
7. **Scalable**: Easy to add new features without breaking existing code

