import { useState, useMemo } from 'react';
import { Download, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BrickSwatch } from './BrickSwatch';
import { generatePartsList, generateOptimizedPartsList } from '@/utils/image/processor';
import type { MosaicData } from '@/types/mosaic.types';
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
  
  const totalBricks = showOptimized ? optimizedTotal : unoptimizedTotal;
  
  // Calculate savings
  const savings = unoptimizedTotal - optimizedTotal;
  const savingsPercent = unoptimizedTotal > 0 ? Math.round((savings / unoptimizedTotal) * 100) : 0;

  // State for tracking owned quantities
  // Key format: for optimized `${brickTypeId}-${colorId}`, for unoptimized `${colorId}`
  const [ownedQuantities, setOwnedQuantities] = useState<Map<string, number>>(new Map());

  const updateOwnedQuantity = (key: string, value: string) => {
    const numValue = value === '' ? 0 : Math.max(0, Number(value) || 0);
    setOwnedQuantities(prev => {
      const next = new Map(prev);
      if (numValue === 0) {
        next.delete(key);
      } else {
        next.set(key, numValue);
      }
      return next;
    });
  };

  // Calculate total needed pieces (accounting for owned)
  const totalNeeded = useMemo(() => {
    if (showOptimized && placements) {
      return optimizedParts.reduce((sum, part) => {
        const key = `${part.brickTypeId}-${part.colorId}`;
        const owned = ownedQuantities.get(key) || 0;
        return sum + Math.max(0, part.count - owned);
      }, 0);
    } else {
      return Array.from(unoptimizedPartsList.values()).reduce((sum, part) => {
        const key = `${part.color.name}`;
        const owned = ownedQuantities.get(key) || 0;
        return sum + Math.max(0, part.count - owned);
      }, 0);
    }
  }, [showOptimized, optimizedParts, unoptimizedPartsList, ownedQuantities]);

  const exportAsJSON = () => {
    const data = showOptimized && placements
      ? {
          dimensions: {
            width: mosaicData.width,
            height: mosaicData.height,
          },
          optimized: true,
          totalBricks,
          totalNeeded,
          savings: {
            pieces: savings,
            percentage: savingsPercent,
          },
          parts: optimizedParts.map((part) => {
            const key = `${part.brickTypeId}-${part.colorId}`;
            const owned = ownedQuantities.get(key) || 0;
            const needed = Math.max(0, part.count - owned);
            return {
              colorId: part.colorId,
              colorName: part.colorName,
              hex: part.hex,
              quantity: part.count,
              owned,
              needed,
              brickType: part.brickTypeName,
            };
          }),
        }
      : {
          dimensions: {
            width: mosaicData.width,
            height: mosaicData.height,
          },
          optimized: false,
          totalBricks,
          totalNeeded,
          parts: Array.from(unoptimizedPartsList.values()).map((part) => {
            const key = `${part.color.name}`;
            const owned = ownedQuantities.get(key) || 0;
            const needed = Math.max(0, part.count - owned);
            return {
              colorId: part.color.name,
              colorName: part.color.name,
              hex: part.color.hex,
              quantity: part.count,
              owned,
              needed,
              brickType: '1×1 Plate',
            };
          }),
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
    const header = 'Color ID,Color Name,Hex,Quantity,Owned,Needed,Brick Type\n';
    const rows = showOptimized && placements
      ? optimizedParts.map((part) => {
          const key = `${part.brickTypeId}-${part.colorId}`;
          const owned = ownedQuantities.get(key) || 0;
          const needed = Math.max(0, part.count - owned);
          return `${part.colorId},${part.colorName},${part.hex},${part.count},${owned},${needed},${part.brickTypeName}`;
        }).join('\n')
      : Array.from(unoptimizedPartsList.values()).map((part) => {
          const key = `${part.color.name}`;
          const owned = ownedQuantities.get(key) || 0;
          const needed = Math.max(0, part.count - owned);
          return `${part.color.name},${part.color.name},${part.color.hex},${part.count},${owned},${needed},1×1 Plate`;
        }).join('\n');

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
            <CardTitle>Parts List</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Total pieces needed: {totalNeeded.toLocaleString()}
              {totalNeeded !== totalBricks && (
                <span className="ml-2 text-xs">({totalBricks.toLocaleString()} total)</span>
              )}
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
            optimizedParts.map((part, index) => {
              const key = `${part.brickTypeId}-${part.colorId}`;
              const owned = ownedQuantities.get(key) || 0;
              const needed = Math.max(0, part.count - owned);
              const isComplete = owned >= part.count;
              
              return (
                <div
                  key={`${part.brickTypeId}-${part.colorId}-${index}`}
                  className={`flex items-center gap-3 p-3 rounded-md border transition-colors ${
                    isComplete 
                      ? 'bg-green-50/50 border-green-200/50 hover:bg-green-50' 
                      : 'bg-card hover:bg-accent/50'
                  }`}
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
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2">
                        {isComplete && (
                          <Check className="h-4 w-4 text-green-600" />
                        )}
                        <div className={`font-bold text-lg ${isComplete ? 'line-through text-muted-foreground opacity-60' : ''}`}>
                          {needed}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {owned > 0 && (
                          <span className="text-green-600">{owned} owned</span>
                        )}
                        {owned === 0 && 'needed'}
                      </div>
                    </div>
                    <div className="w-16">
                      <Input
                        type="number"
                        min="0"
                        value={ownedQuantities.get(key) || ''}
                        onChange={(e) => updateOwnedQuantity(key, e.target.value)}
                        placeholder="0"
                        className="h-8 w-16 text-center text-sm"
                      />
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            // Render unoptimized (1x1 only) parts list
            Array.from(unoptimizedPartsList.values())
              .sort((a, b) => b.count - a.count)
              .map((part) => {
                const key = `${part.color.name}`;
                const owned = ownedQuantities.get(key) || 0;
                const needed = Math.max(0, part.count - owned);
                const isComplete = owned >= part.count;
                
                return (
                  <div
                    key={part.color.name}
                    className={`flex items-center gap-3 p-3 rounded-md border transition-colors ${
                      isComplete 
                        ? 'bg-green-50/50 border-green-200/50 hover:bg-green-50' 
                        : 'bg-card hover:bg-accent/50'
                    }`}
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
                        1×1 Plate
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-2">
                          {isComplete && (
                            <Check className="h-4 w-4 text-green-600" />
                          )}
                          <div className={`font-bold text-lg ${isComplete ? 'line-through text-muted-foreground opacity-60' : ''}`}>
                            {needed}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {owned > 0 && (
                            <span className="text-green-600">{owned} owned</span>
                          )}
                          {owned === 0 && 'needed'}
                        </div>
                      </div>
                      <div className="w-16">
                        <Input
                          type="number"
                          min="0"
                          value={ownedQuantities.get(key) || ''}
                          onChange={(e) => updateOwnedQuantity(key, e.target.value)}
                          placeholder="0"
                          className="h-8 w-16 text-center text-sm"
                        />
                      </div>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
