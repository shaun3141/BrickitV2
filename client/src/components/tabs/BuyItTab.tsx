import { useState, useMemo, useEffect } from 'react';
import { Download, ExternalLink, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BrickSwatch } from '@/components/bricks/BrickSwatch';
import { generateOptimizedPartsList } from '@/utils/image/processor';
import { fetchAllBricks } from '@/services/bricks.service';
import type { MosaicData } from '@/types/mosaic.types';
import type { BrickPlacement } from '@/types';

interface BrickColorInfo {
  color_name: string;
  element_id: string | null;
  rgb: string;
  price: number;
  is_substitute?: boolean;
  substitutes?: Array<{
    brick_type: string;
    element_id: string;
    quantity: number;
  }>;
}

interface BuyItTabProps {
  mosaicData: MosaicData;
  placements: BrickPlacement[];
  showBricks?: boolean;
}

const OWNED_QUANTITIES_STORAGE_KEY = 'brickit-owned-quantities';

// Helper function to get owned quantities from localStorage
function getOwnedQuantitiesFromStorage(): Map<string, number> {
  try {
    const stored = localStorage.getItem(OWNED_QUANTITIES_STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      return new Map(Object.entries(data).map(([k, v]) => [k, Number(v)]));
    }
  } catch (error) {
    console.error('Failed to load owned quantities from storage:', error);
  }
  return new Map();
}

// Helper function to convert displayName to service format
function convertDisplayNameToServiceFormat(displayName: string, useBricks: boolean): string {
  const match = displayName.match(/^(\d+)×(\d+)\s+(Plate|Brick)$/i);
  if (!match) {
    return useBricks ? 'BRICK 1X1' : 'PLATE 1X1';
  }
  const [, width, height] = match;
  const prefix = useBricks ? 'BRICK' : 'PLATE';
  return `${prefix} ${width}X${height}`;
}

export function BuyItTab({ mosaicData, placements, showBricks = false }: BuyItTabProps) {
  const [ownedQuantities, setOwnedQuantities] = useState<Map<string, number>>(new Map());
  const [brickData, setBrickData] = useState<Map<string, Map<string, BrickColorInfo>>>(new Map());
  const [isLoadingBrickData, setIsLoadingBrickData] = useState(true);

  // Load owned quantities from localStorage on mount
  useEffect(() => {
    const stored = getOwnedQuantitiesFromStorage();
    setOwnedQuantities(stored);
  }, []);

  // Listen for storage changes to sync with PartsList component
  useEffect(() => {
    const handleStorageChange = () => {
      const stored = getOwnedQuantitiesFromStorage();
      setOwnedQuantities(stored);
    };

    window.addEventListener('storage', handleStorageChange);
    // Also listen for custom event for same-tab updates
    window.addEventListener('ownedQuantitiesUpdated', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('ownedQuantitiesUpdated', handleStorageChange);
    };
  }, []);

  // Load brick data on mount
  useEffect(() => {
    fetchAllBricks()
      .then(bricks => {
        const dataMap = new Map<string, Map<string, BrickColorInfo>>();
        
        bricks.forEach(brick => {
          const colorMap = new Map<string, BrickColorInfo>();
          brick.colors.forEach(color => {
            colorMap.set(color.color_name, color);
          });
          dataMap.set(brick.brick_type, colorMap);
        });
        
        setBrickData(dataMap);
        setIsLoadingBrickData(false);
      })
      .catch(error => {
        console.error('Failed to load brick data:', error);
        setIsLoadingBrickData(false);
      });
  }, []);

  // Helper function to get color info for a brick/color combination
  const getColorInfo = (brickType: string, colorName: string, useBricks: boolean = false): BrickColorInfo | null => {
    const serviceFormat = brickType.includes(' ') && (brickType.startsWith('PLATE') || brickType.startsWith('BRICK'))
      ? brickType
      : convertDisplayNameToServiceFormat(brickType, useBricks);
    return brickData.get(serviceFormat)?.get(colorName) || null;
  };

  // Generate optimized parts list
  const optimizedParts = useMemo(() => {
    return placements ? generateOptimizedPartsList(placements) : [];
  }, [placements]);

  // Calculate needed pieces (not yet owned)
  const neededParts = useMemo(() => {
    return optimizedParts
      .map(part => {
        const key = `${part.brickTypeId}-${part.colorId}`;
        const owned = ownedQuantities.get(key) || 0;
        const needed = Math.max(0, part.count - owned);
        // Use shared showBricks prop to determine brick vs plate
        const brickTypeName = showBricks ? part.brickTypeName.replace(/\s+Plate$/i, ' Brick') : part.brickTypeName;
        const colorInfo = getColorInfo(brickTypeName, part.colorName, showBricks);
        
        // Skip if no element ID available
        if (!colorInfo?.element_id) {
          return null;
        }

        return {
          elementId: colorInfo.element_id,
          quantity: needed,
          colorName: part.colorName,
          brickTypeName: brickTypeName,
          hex: part.hex,
          brickWidth: part.brickWidth,
          brickHeight: part.brickHeight,
          price: colorInfo.price || 0,
        };
      })
      .filter((part): part is NonNullable<typeof part> => part !== null && part.quantity > 0)
      .sort((a, b) => b.quantity - a.quantity); // Sort by quantity descending
  }, [optimizedParts, ownedQuantities, brickData, showBricks]);

  const totalNeeded = useMemo(() => {
    return neededParts.reduce((sum, part) => sum + part.quantity, 0);
  }, [neededParts]);

  const totalPrice = useMemo(() => {
    return neededParts.reduce((sum, part) => sum + (part.price * part.quantity), 0);
  }, [neededParts]);

  const handleDownloadCSV = () => {
    // Generate CSV in format: elementId,quantity
    const csvRows = ['elementId,quantity'];
    
    neededParts.forEach(part => {
      csvRows.push(`${part.elementId},${part.quantity}`);
    });

    const csv = csvRows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lego-pick-a-brick-list.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoadingBrickData) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Loading brick data...</p>
        </CardContent>
      </Card>
    );
  }

  if (neededParts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Buy It</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <p className="text-lg font-medium">All pieces are owned!</p>
            <p className="text-muted-foreground">
              You have all the pieces needed for this mosaic. Go to the Parts List tab to verify your inventory.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Buy It</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {totalNeeded.toLocaleString()} piece{totalNeeded !== 1 ? 's' : ''} needed across {neededParts.length} unique part{neededParts.length !== 1 ? 's' : ''}
                {totalPrice > 0 && (
                  <span className="ml-2 font-semibold text-foreground">
                    • Estimated: ${totalPrice.toFixed(2)}
                  </span>
                )}
              </p>
            </div>
            <Button onClick={handleDownloadCSV} disabled={neededParts.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Download CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <ExternalLink className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 mb-2">How to use this list:</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                    <li>Click "Download CSV" to download your parts list</li>
                    <li>
                      Go to{' '}
                      <a
                        href="https://www.lego.com/en-us/pick-and-build/pick-a-brick"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium underline hover:text-blue-900"
                      >
                        LEGO Pick a Brick
                      </a>
                    </li>
                    <li>Click "Upload list" on the Pick a Brick page</li>
                    <li>Select the downloaded CSV file</li>
                    <li>Add all items to your cart</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Parts grid - 4 columns */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Parts to purchase:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {neededParts.map((part, index) => (
                  <div
                    key={`${part.elementId}-${index}`}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <BrickSwatch
                      hex={part.hex}
                      brickWidth={part.brickWidth}
                      brickHeight={part.brickHeight}
                      className="shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{part.colorName}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {part.brickTypeName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ID: {part.elementId}
                      </div>
                      {part.price > 0 && (
                        <div className="text-xs text-emerald-600 font-medium">
                          ${part.price.toFixed(2)} ea • ${(part.price * part.quantity).toFixed(2)} total
                        </div>
                      )}
                    </div>
                    <div className="text-xl font-bold shrink-0 text-right">
                      {part.quantity}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Note about missing element IDs */}
            {(() => {
              const missingParts = optimizedParts
                .map(part => {
                  const key = `${part.brickTypeId}-${part.colorId}`;
                  const owned = ownedQuantities.get(key) || 0;
                  const needed = Math.max(0, part.count - owned);
                  if (needed > 0) {
                    const brickTypeName = showBricks ? part.brickTypeName.replace(/\s+Plate$/i, ' Brick') : part.brickTypeName;
                    const colorInfo = getColorInfo(brickTypeName, part.colorName, showBricks);
                    
                    // Debug: log what we're looking for
                    const serviceFormat = brickTypeName.includes(' ') && (brickTypeName.startsWith('PLATE') || brickTypeName.startsWith('BRICK'))
                      ? brickTypeName
                      : convertDisplayNameToServiceFormat(brickTypeName, showBricks);
                    
                    if (!colorInfo?.element_id) {
                      return {
                        brickTypeName,
                        serviceFormat,
                        colorName: part.colorName,
                        needed,
                        found: !!colorInfo,
                        hasSubstitute: colorInfo?.is_substitute || false,
                      };
                    }
                  }
                  return null;
                })
                .filter((part): part is NonNullable<typeof part> => part !== null);
              
              if (missingParts.length > 0) {
                return (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm text-amber-800 font-semibold mb-2">
                          Some parts don't have element IDs available. These parts are not included in the CSV file. 
                          You may need to search for them manually on the Pick a Brick website.
                        </p>
                        <details className="mt-3">
                          <summary className="text-sm text-amber-700 cursor-pointer hover:text-amber-900 font-medium">
                            Show missing parts ({missingParts.length})
                          </summary>
                          <ul className="mt-2 space-y-1 text-xs text-amber-700">
                            {missingParts.map((part, idx) => (
                              <li key={idx} className="pl-2">
                                <span className="font-medium">{part.brickTypeName}</span> • {part.colorName} (needed: {part.needed})
                                <span className="text-amber-600 ml-2">
                                  [Looked up: {part.serviceFormat}, Found: {part.found ? 'Yes' : 'No'}{part.hasSubstitute ? ', Has substitute' : ''}]
                                </span>
                              </li>
                            ))}
                          </ul>
                        </details>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
