import { ImageUploader } from '@/components/ImageUploader';
import { MosaicPreview } from '@/components/MosaicPreview';
import { FilterSelector } from '@/components/FilterSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Upload } from 'lucide-react';
import { MOSAIC_SIZES } from '@/types';
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

        {/* Size Selection */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Mosaic Size</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(MOSAIC_SIZES) as MosaicSize[]).map((size) => (
                    <Button
                      key={size}
                      variant={selectedSize === size ? 'default' : 'outline'}
                      onClick={() => onSizeChange(size)}
                      className="w-full"
                    >
                      {MOSAIC_SIZES[size].label}
                    </Button>
                  ))}
                </div>
              </div>

              {selectedSize === 'medium' && (
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Custom Width: {customWidth} bricks
                  </label>
                  <Slider
                    value={[customWidth]}
                    onValueChange={(value: number[]) => onCustomWidthChange(value[0])}
                    min={16}
                    max={96}
                    step={4}
                    className="w-full"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upload Area */}
        <ImageUploader onImageSelect={onImageSelect} isProcessing={isProcessing} />

        {/* Instructions */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">How it works</h3>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Upload a photo you want to convert</li>
              <li>Adjust filters to enhance the LEGO conversion</li>
              <li>Preview the LEGO-ified result in real-time</li>
              <li>Edit individual pixels to customize your design</li>
              <li>Get a complete parts list with brick counts by color</li>
              <li>Export the parts list as JSON or CSV</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show dual-panel layout with original image and LEGO preview
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center space-y-2">
    
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Original Image with Filters */}
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

          {/* Unified Filter Interface */}
          <FilterSelector
            filterOptions={filterOptions}
            onFilterOptionsChange={onFilterChange}
          />
        </div>

        {/* Right Panel - LEGO Preview */}
        <div className="space-y-4">
          <MosaicPreview mosaicData={mosaicData} />
          
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

