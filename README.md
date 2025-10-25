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

2. Install client dependencies:
```bash
cd client
npm install
```

3. Run the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

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
