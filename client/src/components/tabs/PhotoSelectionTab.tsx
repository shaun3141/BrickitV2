import { ImageUploader } from '@/components/ImageUploader';
import { MosaicPreview } from '@/components/MosaicPreview';
import { FilterSelector } from '@/components/FilterSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import type { MosaicSize } from '@/types';
import type { MosaicData, FilterOptions } from '@/utils/imageProcessor';

interface PhotoSelectionTabProps {
  isProcessing: boolean;
  selectedSize: MosaicSize;
  customWidth: number;
  mosaicData: MosaicData | null;
  filterOptions: FilterOptions;
  onSizeChange: (size: MosaicSize) => void;
  onCustomWidthChange: (width: number) => void;
  onImageSelect: (file: File) => void;
  onFilterChange: (filters: FilterOptions) => void;
  onContinueToEdit: () => void;
}

export function PhotoSelectionTab({
  isProcessing,
  selectedSize,
  customWidth,
  mosaicData,
  filterOptions,
  onSizeChange,
  onCustomWidthChange,
  onImageSelect,
  onFilterChange,
  onContinueToEdit,
}: PhotoSelectionTabProps) {

  const handleUploadDifferentImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        onImageSelect(file);
      }
    };
    input.click();
  };

  // Show upload interface when no image is loaded
  if (!mosaicData) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2 mb-8">
          <h2 className="text-3xl font-bold">Turn Your Photos into LEGO Mosaics</h2>
          <p className="text-muted-foreground">
            Upload an image and we'll convert it into a buildable LEGO mosaic with a
            complete parts list
          </p>
        </div>

        {/* Upload Area */}
        <ImageUploader onImageSelect={onImageSelect} isProcessing={isProcessing} />
      </div>
    );
  }

  // Show 3-column layout with filters in the middle
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Original Image */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Original Image</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUploadDifferentImage}
                  disabled={isProcessing}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Different
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-hidden bg-muted/20">
                <img
                  src={mosaicData.filteredImage || mosaicData.originalImage}
                  alt="Original with filters applied"
                  className="w-full h-auto"
                  style={{ maxHeight: '400px', objectFit: 'contain' }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Middle Column - Settings & Filters */}
        <div className="space-y-4">
          <FilterSelector
            filterOptions={filterOptions}
            onFilterOptionsChange={onFilterChange}
            selectedSize={selectedSize}
            customWidth={customWidth}
            onSizeChange={onSizeChange}
            onCustomWidthChange={onCustomWidthChange}
          />
        </div>

        {/* Right Column - LEGO Preview */}
        <div className="space-y-4">
          <MosaicPreview mosaicData={mosaicData} initialPixelSize={6} />
          
          <div className="flex justify-end">
            <Button
              onClick={onContinueToEdit}
              size="lg"
            >
              Continue to Edit →
            </Button>
          </div>
        </div>
      </div>

    </div>
  );
}

