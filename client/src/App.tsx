import { useState, useEffect } from 'react';
import { Github } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PhotoSelectionTab } from '@/components/tabs/PhotoSelectionTab';
import { EditTab } from '@/components/tabs/EditTab';
import { DownloadTab } from '@/components/tabs/DownloadTab';
import { InstructionsTab } from '@/components/tabs/InstructionsTab';
import { ShareTab } from '@/components/tabs/ShareTab';
import { LoginButton } from '@/components/LoginButton';
import { processImage } from '@/utils/imageProcessor';
import type { MosaicData, FilterOptions } from '@/utils/imageProcessor';
import { MOSAIC_SIZES } from '@/types';
import type { MosaicSize, BrickPlacement } from '@/types';
import { optimizeBrickPlacement } from '@/utils/brickOptimizer';

function App() {
  const [mosaicData, setMosaicData] = useState<MosaicData | null>(null);
  const [placements, setPlacements] = useState<BrickPlacement[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedSize, setSelectedSize] = useState<MosaicSize>('medium');
  const [customWidth, setCustomWidth] = useState(64);
  const [activeTab, setActiveTab] = useState('photo-selection');
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    brightness: 0,
    contrast: 0,
    saturation: 0,
    selectedFilter: undefined,
  });

  // Run optimization whenever mosaicData changes
  useEffect(() => {
    if (mosaicData) {
      const optimizedPlacements = optimizeBrickPlacement(mosaicData);
      setPlacements(optimizedPlacements);
    } else {
      setPlacements([]);
    }
  }, [mosaicData]);

  const handleImageSelect = async (file: File) => {
    setUploadedImage(file);
    setIsProcessing(true);
    try {
      const data = await processImage(file, {
        targetWidth: customWidth,
        maintainAspectRatio: true,
        filters: filterOptions,
      });

      setMosaicData(data);
      // Stay on photo selection tab to allow filter adjustments
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Failed to process image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFilterChange = async (newFilters: FilterOptions) => {
    if (!uploadedImage) return;
    
    setFilterOptions(newFilters);
    setIsProcessing(true);
    
    try {
      const data = await processImage(uploadedImage, {
        targetWidth: customWidth,
        maintainAspectRatio: true,
        filters: newFilters,
      });

      setMosaicData(data);
    } catch (error) {
      console.error('Error processing image with filters:', error);
      alert('Failed to apply filters. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSizeChange = async (size: MosaicSize) => {
    setSelectedSize(size);
    const newWidth = MOSAIC_SIZES[size].width;
    setCustomWidth(newWidth);
    
    if (!uploadedImage) return;
    
    setIsProcessing(true);
    try {
      const data = await processImage(uploadedImage, {
        targetWidth: newWidth,
        maintainAspectRatio: true,
        filters: filterOptions,
      });

      setMosaicData(data);
    } catch (error) {
      console.error('Error processing image with new size:', error);
      alert('Failed to process image with new size. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCustomWidthChange = async (width: number) => {
    setCustomWidth(width);
    
    if (!uploadedImage) return;
    
    setIsProcessing(true);
    try {
      const data = await processImage(uploadedImage, {
        targetWidth: width,
        maintainAspectRatio: true,
        filters: filterOptions,
      });

      setMosaicData(data);
    } catch (error) {
      console.error('Error processing image with new width:', error);
      alert('Failed to process image with new width. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleContinueToEdit = () => {
    setActiveTab('edit');
  };

  const handleMosaicUpdate = (updatedMosaic: MosaicData) => {
    setMosaicData(updatedMosaic);
    // Optimization will be triggered by the useEffect
  };

  return (
    <div className="min-h-screen bg-background">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Header */}
        <header className="border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between gap-8">
              <div className="flex items-center gap-3">
                <img src="/brickit_logo.png" alt="BrickIt Logo" className="h-10 w-10 object-contain" />
                <h1 className="text-2xl font-bold">BrickIt</h1>
              </div>
              <TabsList className="grid grid-cols-5 flex-1 max-w-3xl">
                <TabsTrigger value="photo-selection">1. Photo Selection</TabsTrigger>
                <TabsTrigger value="edit" disabled={!mosaicData}>
                  2. Edit
                </TabsTrigger>
                <TabsTrigger value="instructions" disabled={!mosaicData}>
                  3. Instructions
                </TabsTrigger>
                <TabsTrigger value="download" disabled={!mosaicData}>
                  4. Get the pieces
                </TabsTrigger>
                <TabsTrigger value="share" disabled={!mosaicData}>
                  5. Share
                </TabsTrigger>
              </TabsList>
              <LoginButton />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">

          <TabsContent value="photo-selection" className="mt-0">
            <PhotoSelectionTab
              isProcessing={isProcessing}
              selectedSize={selectedSize}
              customWidth={customWidth}
              mosaicData={mosaicData}
              filterOptions={filterOptions}
              onSizeChange={handleSizeChange}
              onCustomWidthChange={handleCustomWidthChange}
              onImageSelect={handleImageSelect}
              onFilterChange={handleFilterChange}
              onContinueToEdit={handleContinueToEdit}
            />
          </TabsContent>

          <TabsContent value="edit" className="mt-0">
            {mosaicData && (
              <EditTab
                mosaicData={mosaicData}
                onMosaicUpdate={handleMosaicUpdate}
              />
            )}
          </TabsContent>

          <TabsContent value="instructions" className="mt-0">
            {mosaicData && (
              <InstructionsTab mosaicData={mosaicData} placements={placements} />
            )}
          </TabsContent>

          <TabsContent value="download" className="mt-0">
            {mosaicData && (
              <DownloadTab mosaicData={mosaicData} placements={placements} />
            )}
          </TabsContent>

          <TabsContent value="share" className="mt-0">
            {mosaicData && (
              <ShareTab mosaicData={mosaicData} placements={placements} />
            )}
          </TabsContent>
        </main>
      </Tabs>

      {/* Footer */}
      <footer className="border-t mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>Built with love by Shaun VanWeelden</p>
          <p className="mt-1">
            LEGO® is a trademark of the LEGO Group of companies which does not
            sponsor, authorize or endorse this site.
          </p>
          <div className="mt-4">
            <a
              href="https://github.com/Shaun3141/BrickitV2"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="h-5 w-5" />
              <span>View on GitHub</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
