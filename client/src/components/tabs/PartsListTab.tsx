import { MosaicPreview } from '@/components/editor/MosaicPreview';
import { PartsList } from '@/components/bricks/PartsList';
import type { MosaicData } from '@/types/mosaic.types';
import type { BrickPlacement } from '@/types';

interface PartsListTabProps {
  mosaicData: MosaicData;
  placements: BrickPlacement[];
  showBricks?: boolean;
  /** Colors that had limited brick size availability */
  colorsWithLimitedSizes?: Set<string>;
}

export function PartsListTab({ mosaicData, placements, showBricks = false, colorsWithLimitedSizes }: PartsListTabProps) {
  return (
    <div className="space-y-6">
      {/* Preview and Parts List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <MosaicPreview 
            mosaicData={mosaicData} 
            placements={placements}
            showOptimized={true}
          />
        </div>
        <div>
          <PartsList 
            mosaicData={mosaicData} 
            placements={placements}
            showOptimized={true}
            showBricks={showBricks}
            colorsWithLimitedSizes={colorsWithLimitedSizes}
          />
        </div>
      </div>
    </div>
  );
}

