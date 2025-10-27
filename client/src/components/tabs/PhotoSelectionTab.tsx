import { ImageUploader } from '@/components/editor/ImageUploader';
import { MosaicPreview } from '@/components/editor/MosaicPreview';
import { FilterSelector } from '@/components/editor/FilterSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import type { MosaicSize } from '@/types';
import type { MosaicData, FilterOptions } from '@/types/mosaic.types';

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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
        {/* Left Column - Upload Card */}
        <div className="space-y-6">
          <div className="text-center space-y-2 mb-8">
            <h2 className="text-3xl font-bold">Turn Your Photos into LEGO Mosaics</h2>
            <p className="text-muted-foreground">
              Upload an image and we'll convert it into a buildable LEGO mosaic with a
              complete parts list
            </p>
          </div>
          <ImageUploader onImageSelect={onImageSelect} isProcessing={isProcessing} />
        </div>

        {/* Right Column - Information */}
        <div className="space-y-6">
          <div>
            <h3 className="text-2xl font-semibold mb-4">How It Works</h3>
            <ol className="space-y-3 text-muted-foreground">
              <li className="flex gap-3">
                <span className="font-semibold text-foreground">1.</span>
                <span>Upload your photo using drag-and-drop or click to browse</span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold text-foreground">2.</span>
                <span>Adjust filters and mosaic size to get the perfect look</span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold text-foreground">3.</span>
                <span>Get your complete parts list and build instructions</span>
              </li>
            </ol>
          </div>

          <div>
            <h3 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h3>
            <div className="space-y-4 text-muted-foreground">
              <div>
                <h4 className="font-semibold text-foreground mb-1">Is it free?</h4>
                <p>Yes! BrickIt is completely free to use. All processing happens in your browser, so your photos never leave your device.</p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">What image formats are supported?</h4>
                <p>You can upload any common image format including JPG, PNG, and GIF.</p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">How accurate is the color matching?</h4>
                <p>BrickIt uses official LEGO color palettes and matches each pixel to the closest available brick color for authentic results.</p>
              </div>
            </div>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Privacy First:</strong> All image processing happens locally in your browser. 
              Your photos are never uploaded to our servers, keeping your images completely private.
            </p>
          </div>
        </div>
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
                  aria-label="Upload a different image"
                >
                  <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
                  Upload Different
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-hidden bg-muted/20">
                <img
                  src={mosaicData.filteredImage || mosaicData.originalImage}
                  alt="Original image with filters applied for LEGO mosaic conversion"
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
              aria-label="Continue to edit tab"
            >
              Continue to Edit →
            </Button>
          </div>
        </div>
      </div>

    </div>
  );
}

