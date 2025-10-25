import { useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { BrickSwatch } from '@/components/BrickSwatch';
import type { InstructionStep } from '@/utils/instructionGenerator';
import type { MosaicData } from '@/utils/imageProcessor';

interface InstructionStepProps {
  step: InstructionStep;
  mosaicData: MosaicData;
  pixelSize?: number;
}

export function InstructionStepComponent({ 
  step, 
  mosaicData, 
  pixelSize = 12 
}: InstructionStepProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = mosaicData.width * pixelSize;
    canvas.height = mosaicData.height * pixelSize;

    // Draw base mosaic (faded)
    ctx.globalAlpha = 0.3;
    for (let row = 0; row < mosaicData.height; row++) {
      for (let col = 0; col < mosaicData.width; col++) {
        const color = mosaicData.pixels[row][col];
        ctx.fillStyle = color.hex;
        ctx.fillRect(col * pixelSize, row * pixelSize, pixelSize, pixelSize);
      }
    }
    ctx.globalAlpha = 1.0;

    // Draw previous placements (already placed bricks)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 1;
    for (const placement of step.previousPlacements) {
      ctx.fillStyle = placement.color.hex;
      ctx.fillRect(
        placement.x * pixelSize,
        placement.y * pixelSize,
        placement.brickType.width * pixelSize,
        placement.brickType.height * pixelSize
      );
      ctx.strokeRect(
        placement.x * pixelSize,
        placement.y * pixelSize,
        placement.brickType.width * pixelSize,
        placement.brickType.height * pixelSize
      );
    }

    // Draw current placements (the bricks to place now)
    for (const currentPlacement of step.placements) {
      ctx.fillStyle = currentPlacement.color.hex;
      ctx.fillRect(
        currentPlacement.x * pixelSize,
        currentPlacement.y * pixelSize,
        currentPlacement.brickType.width * pixelSize,
        currentPlacement.brickType.height * pixelSize
      );

      // Highlight border (golden/yellow)
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 3;
      ctx.strokeRect(
        currentPlacement.x * pixelSize,
        currentPlacement.y * pixelSize,
        currentPlacement.brickType.width * pixelSize,
        currentPlacement.brickType.height * pixelSize
      );

      // Add semi-transparent overlay to make it stand out
      ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
      ctx.fillRect(
        currentPlacement.x * pixelSize,
        currentPlacement.y * pixelSize,
        currentPlacement.brickType.width * pixelSize,
        currentPlacement.brickType.height * pixelSize
      );
    }
  }, [step, mosaicData, pixelSize]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Canvas Preview */}
      <Card>
        <CardContent className="p-4">
          <div className="overflow-auto max-h-[500px] border rounded-md bg-muted/20 p-4">
            <canvas
              ref={canvasRef}
              className="mx-auto"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Yellow highlights show the {step.placements.length} brick{step.placements.length !== 1 ? 's' : ''} to place in this step
          </p>
        </CardContent>
      </Card>

      {/* Brick Information */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">Place These Bricks:</h3>
            <span className="text-sm text-muted-foreground">
              {step.placements.length} piece{step.placements.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          <div className="space-y-3 max-h-[440px] overflow-y-auto">
            {(() => {
              // Group placements by brick type and color
              const grouped = new Map<string, { 
                color: typeof step.placements[0]['color'];
                brickType: typeof step.placements[0]['brickType'];
                count: number;
              }>();
              
              step.placements.forEach(placement => {
                const key = `${placement.color.id}-${placement.brickType.id}`;
                const existing = grouped.get(key);
                if (existing) {
                  existing.count++;
                } else {
                  grouped.set(key, {
                    color: placement.color,
                    brickType: placement.brickType,
                    count: 1,
                  });
                }
              });
              
              // Sort by count (descending)
              const sortedGroups = Array.from(grouped.values()).sort((a, b) => b.count - a.count);
              
              return sortedGroups.map((group, idx) => (
                <div 
                  key={`${group.color.id}-${group.brickType.id}-${idx}`}
                  className="flex items-center gap-3 p-3 rounded-md border bg-card hover:bg-accent/50 transition-colors"
                >
                  {/* Brick Swatch */}
                  <BrickSwatch 
                    hex={group.color.hex}
                    brickWidth={group.brickType.width}
                    brickHeight={group.brickType.height}
                    className="shrink-0"
                  />
                  
                  {/* Brick Details */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{group.color.name} {group.brickType.displayName}</p>
                    <p className="text-sm text-muted-foreground">
                      {group.brickType.width}×{group.brickType.height} studs
                    </p>
                  </div>
                  
                  {/* Quantity Badge */}
                  <div className="text-right shrink-0">
                    <div className="font-bold text-lg">×{group.count}</div>
                    <div className="text-xs text-muted-foreground">
                      piece{group.count !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              ));
            })()}
            
            {/* Region Info */}
            <div className="pt-3 mt-3 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Region:</span>
                <span className="font-medium">{step.regionLabel}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

