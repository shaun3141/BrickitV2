import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PhotoSelectionTab } from '@/components/tabs/PhotoSelectionTab';
import { EditTab } from '@/components/tabs/EditTab';
import { PartsListTab } from '@/components/tabs/PartsListTab';
import { InstructionsTab } from '@/components/tabs/InstructionsTab';
import { ShareTab } from '@/components/tabs/ShareTab';
import { LoginButton } from '@/components/LoginButton';
import { DonationBanner } from '@/components/DonationBanner';
import { SaveCreationDialog } from '@/components/SaveCreationDialog';
import { processImage } from '@/utils/imageProcessor';
import type { MosaicData, FilterOptions } from '@/utils/imageProcessor';
import { MOSAIC_SIZES } from '@/types';
import type { MosaicSize, BrickPlacement, Creation } from '@/types';
import { optimizeBrickPlacement } from '@/utils/brickOptimizer';
import { saveCreation, uploadOriginalImage } from '@/lib/creationService';
import { useAuth } from '@/contexts/AuthContext';
import { trackEvent, posthog } from '@/lib/posthog';

function App() {
  const { user } = useAuth();
  
  // Capture initial pageview
  useEffect(() => {
    posthog.capture('$pageview');
  }, []);
  const [mosaicData, setMosaicData] = useState<MosaicData | null>(null);
  const [placements, setPlacements] = useState<BrickPlacement[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedSize, setSelectedSize] = useState<MosaicSize>('medium');
  const [customWidth, setCustomWidth] = useState(64);
  const [activeTab, setActiveTab] = useState('photo-selection');
  
  // Track tab changes
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    if (newTab !== 'photo-selection') {
      trackEvent('tab_changed', { tab: newTab });
    }
  };
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    brightness: 0,
    contrast: 0,
    saturation: 0,
    selectedFilter: undefined,
  });
  
  // Save/Load state
  const [currentCreationId, setCurrentCreationId] = useState<string | null>(null);
  const [currentCreationTitle, setCurrentCreationTitle] = useState<string>('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Handle Stripe donation redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const donation = params.get('donation');
    
    if (donation === 'success') {
      alert('Thank you for your donation! Your support means the world! ❤️');
      
      // Track successful donation
      trackEvent('donation_completed', {
        user_id: user?.id,
      });
      
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (donation === 'cancelled') {
      // Track cancelled donation
      trackEvent('donation_cancelled', {
        user_id: user?.id,
      });
      
      // Clean up URL silently
      window.history.replaceState({}, '', window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      
      // Track image upload
      trackEvent('image_uploaded', {
        width: data.width,
        height: data.height,
        pixel_count: data.width * data.height,
        file_size: file.size,
      });
      
      // Stay on photo selection tab to allow filter adjustments
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Failed to process image. Please try again.');
      trackEvent('image_upload_failed', { error: String(error) });
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
      
      // Track filter changes
      trackEvent('filter_applied', {
        brightness: newFilters.brightness,
        contrast: newFilters.contrast,
        saturation: newFilters.saturation,
        selected_filter: newFilters.selectedFilter,
      });
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
      
      // Track size change
      trackEvent('mosaic_size_changed', {
        size,
        width: newWidth,
        brick_count: data.width * data.height,
      });
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
    handleTabChange('edit');
  };

  const handleMosaicUpdate = (updatedMosaic: MosaicData) => {
    setMosaicData(updatedMosaic);
    // Optimization will be triggered by the useEffect
  };

  const handleSaveCreation = async (data: {
    title: string;
    description?: string;
    isPublic: boolean;
  }) => {
    if (!user || !mosaicData) return;

    try {
      // Upload original image if available
      let imageUrl: string | undefined;
      if (uploadedImage) {
        const { url, error } = await uploadOriginalImage(uploadedImage, user.id);
        if (error) {
          console.error('Failed to upload image:', error);
        } else {
          imageUrl = url || undefined;
        }
      }

      // Save creation
      const { data: savedCreation, error } = await saveCreation(
        user.id,
        {
          title: data.title,
          description: data.description,
          width: mosaicData.width,
          height: mosaicData.height,
          pixel_data: mosaicData.pixels,
          original_image_url: imageUrl,
          is_public: data.isPublic,
          filter_options: filterOptions,
        },
        currentCreationId || undefined
      );

      if (error) throw error;

      if (savedCreation) {
        setCurrentCreationId(savedCreation.id);
        setCurrentCreationTitle(savedCreation.title);
        alert('Creation saved successfully!');
        
        // Track save event
        trackEvent('creation_saved', {
          creation_id: savedCreation.id,
          is_public: data.isPublic,
          has_description: !!data.description,
        });
      }
    } catch (error) {
      console.error('Error saving creation:', error);
      throw error;
    }
  };

  const handleLoadCreation = (creation: Creation) => {
    // Load the creation data into the editor
    setMosaicData({
      width: creation.width,
      height: creation.height,
      pixels: creation.pixel_data,
      originalImage: creation.original_image_url || '',
    });
    
    setCurrentCreationId(creation.id);
    setCurrentCreationTitle(creation.title);
    setFilterOptions(creation.filter_options || {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      selectedFilter: undefined,
    });
    
    // Track load event
    trackEvent('creation_loaded', {
      creation_id: creation.id,
      is_public: creation.is_public,
    });
    
    // Navigate to edit tab
    setActiveTab('edit');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DonationBanner />
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full flex-1 flex flex-col">
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
                <TabsTrigger value="parts-list" disabled={!mosaicData}>
                  3. Parts List
                </TabsTrigger>
                <TabsTrigger value="instructions" disabled={!mosaicData}>
                  4. Build it
                </TabsTrigger>
                <TabsTrigger value="share" disabled={!mosaicData}>
                  5. Share it
                </TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                <LoginButton onLoadCreation={handleLoadCreation} />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8 flex-1">

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
                onSave={() => setShowSaveDialog(true)}
              />
            )}
          </TabsContent>

          <TabsContent value="instructions" className="mt-0">
            {mosaicData && (
              <InstructionsTab mosaicData={mosaicData} placements={placements} />
            )}
          </TabsContent>

          <TabsContent value="parts-list" className="mt-0">
            {mosaicData && (
              <PartsListTab mosaicData={mosaicData} placements={placements} />
            )}
          </TabsContent>

          <TabsContent value="share" className="mt-0">
            {mosaicData && (
              <ShareTab 
                mosaicData={mosaicData} 
                placements={placements}
                creationId={currentCreationId}
              />
            )}
          </TabsContent>
        </main>
      </Tabs>

      {/* Footer */}
      <footer className="border-t mt-auto">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>Built with love by Shaun VanWeelden</p>
          <p className="mt-1">
            LEGO® is a trademark of the LEGO Group of companies which does not
            sponsor, authorize or endorse this site.
          </p>
        </div>
      </footer>

      {/* Save Creation Dialog */}
      <SaveCreationDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        onSave={handleSaveCreation}
        defaultTitle={currentCreationTitle}
        existingCreation={!!currentCreationId}
      />
    </div>
  );
}

export default App;
