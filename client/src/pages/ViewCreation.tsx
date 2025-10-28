import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPublicCreation } from '@/services/creation.service';
import type { Creation, MosaicData, BrickPlacement } from '@/types';
import { SiteLayout } from '@/components/layout/SiteLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Download, Share2 } from 'lucide-react';
import { toast } from '@/lib/toast';
import { loadPixelDataFromPng } from '@/utils/image/pngToPixelData';
import { optimizeBrickPlacement } from '@/utils/bricks/optimizer';
import { PartsListTab } from '@/components/tabs/PartsListTab';
import { InstructionsTab } from '@/components/tabs/InstructionsTab';

export function ViewCreation() {
  const { creationId } = useParams<{ creationId: string }>();
  const [creation, setCreation] = useState<Creation | null>(null);
  const [mosaicData, setMosaicData] = useState<MosaicData | null>(null);
  const [placements, setPlacements] = useState<BrickPlacement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('images');

  useEffect(() => {
    if (!creationId) {
      setError('Invalid creation ID');
      setLoading(false);
      return;
    }

    async function fetchCreation() {
      try {
        const { data, error } = await getPublicCreation(creationId!);
        
        if (error) {
          setError(error.message);
        } else if (data) {
          setCreation(data);
          
          // Update meta tags for social sharing
          updateMetaTags(data);
          
          // Reconstruct pixel_data from preview PNG
          if (data.preview_image_url) {
            console.log('[ViewCreation] Reconstructing pixel data from preview PNG...');
            try {
              const pixelData = await loadPixelDataFromPng(
                data.preview_image_url,
                data.width,
                data.height
              );
              
              if (pixelData && Array.isArray(pixelData) && pixelData.length > 0) {
                // Create mosaic data
                const mosaic: MosaicData = {
                  width: data.width,
                  height: data.height,
                  pixels: pixelData,
                  originalImage: data.original_image_url || '',
                };
                
                setMosaicData(mosaic);
                
                // Generate placements
                const optimizedPlacements = optimizeBrickPlacement(mosaic);
                setPlacements(optimizedPlacements);
              } else {
                console.warn('[ViewCreation] Failed to reconstruct pixel data - invalid data');
              }
            } catch (pngError) {
              console.error('[ViewCreation] Failed to reconstruct pixel data:', pngError);
              // Don't show error to user - just skip parts list and instructions
            }
          }
        } else {
          setError('Creation not found');
        }
      } catch (err) {
        setError('Failed to load creation');
        console.error('Error loading creation:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchCreation();
  }, [creationId]);

  function updateMetaTags(data: Creation) {
    // Update Open Graph tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', `${data.title} - BrickIt`);
    
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) {
      ogDescription.setAttribute('content', data.description || `A LEGO® mosaic creation: ${data.width}x${data.height} bricks`);
    }
    
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage && data.rendered_image_url) {
      ogImage.setAttribute('content', data.rendered_image_url);
    }
    
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) {
      ogUrl.setAttribute('content', `${window.location.origin}/creations/${data.id}`);
    }

    // Update Twitter Card tags
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle) twitterTitle.setAttribute('content', `${data.title} - BrickIt`);
    
    const twitterDescription = document.querySelector('meta[name="twitter:description"]');
    if (twitterDescription) {
      twitterDescription.setAttribute('content', data.description || `A LEGO® mosaic creation: ${data.width}x${data.height} bricks`);
    }
    
    const twitterImage = document.querySelector('meta[name="twitter:image"]');
    if (twitterImage && data.rendered_image_url) {
      twitterImage.setAttribute('content', data.rendered_image_url);
    }
    
    // Update page title dynamically
    document.title = `${data.title} - BrickIt`;
  }

  function handleShare() {
    if (navigator.share && creation) {
      navigator.share({
        title: `${creation.title} - BrickIt`,
        text: creation.description || `Check out this LEGO® mosaic!`,
        url: window.location.href,
      }).catch(err => {
        console.error('Error sharing:', err);
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  }

  function handleView() {
    if (!creation?.rendered_image_url) return;
    
    window.open(creation.rendered_image_url, '_blank');
  }

  async function handleDownload() {
    if (!creation?.rendered_image_url) return;
    
    try {
      // Fetch the image as a blob to avoid CORS issues
      const response = await fetch(creation.rendered_image_url);
      const blob = await response.blob();
      
      // Create a blob URL and download it
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${creation.title.replace(/[^a-z0-9]/gi, '_')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading image:', error);
      toast.error('Failed to download image');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading creation...</p>
        </div>
      </div>
    );
  }

  if (error || !creation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Creation Not Found</h1>
          <p className="text-muted-foreground mb-6">{error || 'This creation does not exist or is not public.'}</p>
          <Link to="/app">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <SiteLayout
      headerActions={
        <>
          <Link to="/gallery">
            <Button variant="ghost" size="sm">
              Gallery
            </Button>
          </Link>
          <Button variant="outline" onClick={handleShare}>
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
          {creation.rendered_image_url && (
            <>
              <Button variant="outline" onClick={handleView}>
                View
              </Button>
              <Button variant="outline" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </>
          )}
        </>
      }
    >
        {/* Title and Description */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold mb-2">{creation.title}</h2>
          {creation.description && (
            <p className="text-muted-foreground text-lg">{creation.description}</p>
          )}
          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
            <span>
              by{' '}
              <Link 
                to={`/creators/${creation.user_id}`}
                className="text-primary hover:underline font-medium"
              >
                {creation.display_name || 'Anonymous'}
              </Link>
            </span>
            <span>•</span>
            <span>{creation.width} × {creation.height} bricks</span>
            <span>•</span>
            <span>{new Date(creation.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="images">Images</TabsTrigger>
            <TabsTrigger value="parts-list" disabled={!mosaicData}>Parts List</TabsTrigger>
            <TabsTrigger value="instructions" disabled={!mosaicData}>Instructions</TabsTrigger>
          </TabsList>

          <TabsContent value="images" className="space-y-6">
            {/* Images Grid */}
            <div className="grid grid-cols-3 gap-6">
              {/* Left Column - Original Image */}
              <div className="col-span-1">
                {creation.original_image_url ? (
                  <div className="bg-muted rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-3">Original Image</h3>
                    <img 
                      src={creation.original_image_url} 
                      alt="Original"
                      className="w-full h-auto rounded-lg border shadow-sm max-w-[250px]"
                    />
                  </div>
                ) : (
                  <div className="bg-muted rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-3">Original Image</h3>
                    <p className="text-sm text-muted-foreground">Not available</p>
                  </div>
                )}
              </div>

              {/* Right Column - Rendered Image */}
              <div className="col-span-2">
                {creation.rendered_image_url ? (
                  <div className="bg-muted rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-3">Rendered Mosaic</h3>
                    <img 
                      src={creation.rendered_image_url} 
                      alt={creation.title}
                      className="w-full h-auto rounded-lg border shadow-lg max-w-[500px]"
                    />
                  </div>
                ) : (
                  <div className="bg-muted rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-3">Rendered Mosaic</h3>
                    <p className="text-sm text-muted-foreground">Not available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Call to Action */}
            <div className="text-center border-t pt-8">
              <h3 className="text-xl font-semibold mb-4">Want to create your own?</h3>
              <Link to="/app">
                <Button size="lg">
                  Create Your Own Mosaic
                </Button>
              </Link>
            </div>
          </TabsContent>

          <TabsContent value="parts-list">
            {mosaicData ? (
              <PartsListTab mosaicData={mosaicData} placements={placements} />
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Parts list not available for this creation.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="instructions">
            {mosaicData ? (
              <InstructionsTab mosaicData={mosaicData} placements={placements} />
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Instructions not available for this creation.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
    </SiteLayout>
  );
}

