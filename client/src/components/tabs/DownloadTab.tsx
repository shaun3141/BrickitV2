import { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MosaicPreview } from '@/components/MosaicPreview';
import { PartsList } from '@/components/PartsList';
import { generateMosaicPreview } from '@/utils/imageProcessor';
import type { MosaicData } from '@/utils/imageProcessor';
import type { BrickPlacement } from '@/types';

interface DownloadTabProps {
  mosaicData: MosaicData;
  placements: BrickPlacement[];
}

export function DownloadTab({ mosaicData, placements }: DownloadTabProps) {
  const [showOptimized, setShowOptimized] = useState(true);
  const downloadMosaicImage = () => {
    try {
      // Generate high-res mosaic preview
      const dataUrl = generateMosaicPreview(mosaicData, 20);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `lego-mosaic-${mosaicData.width}x${mosaicData.height}.png`;
      a.click();
    } catch (error) {
      console.error('Error downloading mosaic image:', error);
      alert('Failed to download mosaic image. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toggle for optimized view */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-md shadow-sm" role="group">
          <Button
            variant={!showOptimized ? 'default' : 'outline'}
            onClick={() => setShowOptimized(false)}
            className="rounded-r-none"
          >
            1×1 Plates Only
          </Button>
          <Button
            variant={showOptimized ? 'default' : 'outline'}
            onClick={() => setShowOptimized(true)}
            className="rounded-l-none"
          >
            Optimized Pieces
          </Button>
        </div>
      </div>

      {/* Preview and Parts List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Button onClick={downloadMosaicImage} className="w-full">
            <ImageIcon className="h-4 w-4 mr-2" />
            Download Mosaic Image
          </Button>
          <MosaicPreview 
            mosaicData={mosaicData} 
            placements={placements}
            showOptimized={showOptimized}
          />
        </div>
        <div>
          <PartsList 
            mosaicData={mosaicData} 
            placements={placements}
            showOptimized={showOptimized}
          />
        </div>
      </div>
    </div>
  );
}

