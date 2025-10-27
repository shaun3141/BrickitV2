# BrickitV2

Convert your photos into buildable LEGO mosaics with a complete parts list.

## Features

- **Tabbed Workflow**: Upload → Edit → Download for organized experience
- **Image Upload**: Drag-and-drop or browse to upload images
- **Client-side Processing**: All image processing happens in your browser
- **LEGO Color Matching**: Maps pixels to official LEGO colors
- **Pixel Editor**: Click to repaint individual pixels, eyedropper tool to pick colors
- **Interactive Preview**: Zoom and grid controls for detailed viewing
- **Parts List**: Get a complete inventory of bricks needed by color
- **Export Options**: Download mosaic image, comparison, and parts list as JSON or CSV

## Tech Stack

- **Frontend**: React + Vite + TypeScript
- **UI**: Shadcn UI components + Lucide icons
- **Styling**: Tailwind CSS
- **Deployment**: Fly.io with Express server

## Local Development

### Prerequisites

- Node.js 20+
- npm

### Setup

1. Clone the repository:
```bash
git clone https://github.com/Shaun3141/BrickitV2.git
cd BrickitV2
```

2. Install dependencies:
```bash
# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install
cd ..
```

3. Configure environment variables:

**Client** (`client/.env`):
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
VITE_API_URL=http://localhost:8080
```

**Server** (`server/.env`):
```env
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
CLIENT_URL=http://localhost:3000
PORT=8080
```

4. Run the development server:
```bash
# Terminal 1 - Run client
cd client
npm run dev

# Terminal 2 - Run server
cd server
npm start
```

The client will be available at `http://localhost:3000` and the server at `http://localhost:8080`

### Stripe Setup (Optional - for donations)

To enable donation functionality:

1. Create a [Stripe account](https://dashboard.stripe.com/register)
2. Get your API keys from the [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
3. Add the **publishable key** to `client/.env` as `VITE_STRIPE_PUBLISHABLE_KEY`
4. Add the **secret key** to `server/.env` as `STRIPE_SECRET_KEY`
5. For testing, use test mode keys (start with `pk_test_` and `sk_test_`)
6. For production, switch to live mode keys

### Building for Production

```bash
cd client
npm run build
```

## Deployment

The app is configured to deploy to Fly.io.

### Prerequisites

- [Fly.io CLI](https://fly.io/docs/hands-on/install-flyctl/) installed
- Fly.io account

### Deploy

1. Launch the app (first time only):
```bash
fly launch
```

2. Deploy updates:
```bash
fly deploy
```

3. View logs:
```bash
fly logs --no-tail
```

## How It Works

### Upload Tab
1. Select mosaic size (Small/Medium/Large or custom width)
2. Upload an image via drag-and-drop or file browser
3. Image is downsampled to target resolution
4. Each pixel is mapped to the closest LEGO color using Euclidean distance in RGB space

### Edit Tab
1. View your generated mosaic with interactive canvas
2. Click individual pixels to repaint them with different colors
3. Use eyedropper tool to pick colors from existing pixels
4. Choose from 31 official LEGO colors
5. Zoom in/out and toggle grid for precision

### Download Tab
1. Download the mosaic image or original comparison
2. Export parts list as JSON or CSV
3. View complete preview and brick inventory
4. Get ready to build your masterpiece!

## License

MIT

## Disclaimer

LEGO® is a trademark of the LEGO Group of companies which does not sponsor, authorize or endorse this application.
