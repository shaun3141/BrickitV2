import { useState, useEffect, useRef } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { MosaicData } from '@/utils/imageProcessor';
import type { BrickPlacement } from '@/types';

interface MosaicPreviewProps {
  mosaicData: MosaicData;
  placements?: BrickPlacement[];
  showOptimized?: boolean;
}

export function MosaicPreview({ mosaicData, placements, showOptimized = false }: MosaicPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pixelSize, setPixelSize] = useState(12);
  const [showGrid, setShowGrid] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = mosaicData.width * pixelSize;
    canvas.height = mosaicData.height * pixelSize;

    // Draw each pixel
    for (let row = 0; row < mosaicData.height; row++) {
      for (let col = 0; col < mosaicData.width; col++) {
        const color = mosaicData.pixels[row][col];
        ctx.fillStyle = color.hex;
        ctx.fillRect(col * pixelSize, row * pixelSize, pixelSize, pixelSize);
      }
    }

    // Draw grid or brick boundaries
    if (showGrid) {
      if (showOptimized && placements && placements.length > 0) {
        // Draw brick boundaries (thicker lines)
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.lineWidth = 2;

        for (const placement of placements) {
          const x = placement.x * pixelSize;
          const y = placement.y * pixelSize;
          const width = placement.brickType.width * pixelSize;
          const height = placement.brickType.height * pixelSize;

          ctx.strokeRect(x, y, width, height);
        }
      } else {
        // Draw regular grid
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 1;

        for (let row = 0; row <= mosaicData.height; row++) {
          ctx.beginPath();
          ctx.moveTo(0, row * pixelSize);
          ctx.lineTo(mosaicData.width * pixelSize, row * pixelSize);
          ctx.stroke();
        }

        for (let col = 0; col <= mosaicData.width; col++) {
          ctx.beginPath();
          ctx.moveTo(col * pixelSize, 0);
          ctx.lineTo(col * pixelSize, mosaicData.height * pixelSize);
          ctx.stroke();
        }
      }
    }
  }, [mosaicData, pixelSize, showGrid, showOptimized, placements]);

  const handleZoomIn = () => {
    setPixelSize((prev) => Math.min(prev + 4, 32));
  };

  const handleZoomOut = () => {
    setPixelSize((prev) => Math.max(prev - 4, 4));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>LEGO Mosaic Preview</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGrid(!showGrid)}
            >
              {showGrid ? 'Hide' : 'Show'} Grid
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleZoomOut}
              disabled={pixelSize <= 4}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleZoomIn}
              disabled={pixelSize >= 32}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Dimensions: {mosaicData.width} × {mosaicData.height} studs
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto max-h-[600px] border rounded-md bg-muted/20 p-4">
          <canvas
            ref={canvasRef}
            className="mx-auto"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

