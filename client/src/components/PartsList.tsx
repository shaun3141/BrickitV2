import { Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BrickSwatch } from '@/components/BrickSwatch';
import { generatePartsList, generateOptimizedPartsList } from '@/utils/imageProcessor';
import type { MosaicData } from '@/utils/imageProcessor';
import type { BrickPlacement } from '@/types';

interface PartsListProps {
  mosaicData: MosaicData;
  placements?: BrickPlacement[];
  showOptimized?: boolean;
}

export function PartsList({ mosaicData, placements, showOptimized = false }: PartsListProps) {
  const totalCells = mosaicData.width * mosaicData.height;
  
  // Generate both lists for comparison
  const unoptimizedPartsList = generatePartsList(mosaicData);
  const unoptimizedTotal = totalCells; // Always equal to total cells for 1x1 only
  
  const optimizedParts = placements ? generateOptimizedPartsList(placements) : [];
  const optimizedTotal = placements ? placements.length : unoptimizedTotal;
  
  // Determine which list to display
  const displayParts = showOptimized && placements ? optimizedParts : Array.from(unoptimizedPartsList.values()).sort((a, b) => b.count - a.count);
  const totalBricks = showOptimized ? optimizedTotal : unoptimizedTotal;
  
  // Calculate savings
  const savings = unoptimizedTotal - optimizedTotal;
  const savingsPercent = unoptimizedTotal > 0 ? Math.round((savings / unoptimizedTotal) * 100) : 0;

  const exportAsJSON = () => {
    const data = showOptimized && placements
      ? {
          dimensions: {
            width: mosaicData.width,
            height: mosaicData.height,
          },
          optimized: true,
          totalBricks,
          savings: {
            pieces: savings,
            percentage: savingsPercent,
          },
          parts: optimizedParts.map((part) => ({
            colorId: part.colorId,
            colorName: part.colorName,
            hex: part.hex,
            quantity: part.count,
            brickType: part.brickTypeName,
          })),
        }
      : {
          dimensions: {
            width: mosaicData.width,
            height: mosaicData.height,
          },
          optimized: false,
          totalBricks,
          parts: Array.from(unoptimizedPartsList.values()).map((part) => ({
            colorId: part.color.id,
            colorName: part.color.name,
            hex: part.color.hex,
            quantity: part.count,
            brickType: '1×1 Plate',
          })),
        };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lego-mosaic-parts-list${showOptimized ? '-optimized' : ''}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsCSV = () => {
    const header = 'Color ID,Color Name,Hex,Quantity,Brick Type\n';
    const rows = showOptimized && placements
      ? optimizedParts.map(
          (part) =>
            `${part.colorId},${part.colorName},${part.hex},${part.count},${part.brickTypeName}`
        ).join('\n')
      : Array.from(unoptimizedPartsList.values()).map(
          (part) =>
            `${part.color.id},${part.color.name},${part.color.hex},${part.count},1×1 Plate`
        ).join('\n');

    const csv = header + rows;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lego-mosaic-parts-list${showOptimized ? '-optimized' : ''}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Parts List {showOptimized && '(Optimized)'}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Total pieces needed: {totalBricks}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportAsJSON}>
              <Download className="h-4 w-4 mr-2" />
              JSON
            </Button>
            <Button variant="outline" size="sm" onClick={exportAsCSV}>
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[600px] overflow-auto">
          {showOptimized && placements ? (
            // Render optimized parts list
            optimizedParts.map((part, index) => (
              <div
                key={`${part.brickTypeId}-${part.colorId}-${index}`}
                className="flex items-center gap-3 p-3 rounded-md border bg-card hover:bg-accent/50 transition-colors"
              >
                <BrickSwatch 
                  hex={part.hex}
                  brickWidth={part.brickWidth}
                  brickHeight={part.brickHeight}
                  className="shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{part.colorName}</div>
                  <div className="text-xs text-muted-foreground">
                    {part.brickTypeName} • ID: {part.colorId}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-lg">{part.count}</div>
                  <div className="text-xs text-muted-foreground">pieces</div>
                </div>
              </div>
            ))
          ) : (
            // Render unoptimized (1x1 only) parts list
            Array.from(unoptimizedPartsList.values())
              .sort((a, b) => b.count - a.count)
              .map((part) => (
                <div
                  key={part.color.id}
                  className="flex items-center gap-3 p-3 rounded-md border bg-card hover:bg-accent/50 transition-colors"
                >
                  <BrickSwatch 
                    hex={part.color.hex}
                    brickWidth={1}
                    brickHeight={1}
                    className="shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{part.color.name}</div>
                    <div className="text-xs text-muted-foreground">
                      1×1 Plate • ID: {part.color.id}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-lg">{part.count}</div>
                    <div className="text-xs text-muted-foreground">pieces</div>
                  </div>
                </div>
              ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

