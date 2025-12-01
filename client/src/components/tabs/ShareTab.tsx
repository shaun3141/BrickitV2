import { useState } from 'react';
import { Share2, Copy, Download, Check, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MosaicPreview } from '@/components/editor/MosaicPreview';
import { useAuth } from '@/features/auth/AuthContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { MosaicData, BrickPlacement } from '@/types';

interface ShareTabProps {
  mosaicData: MosaicData;
  placements: BrickPlacement[];
  creationId?: string | null;
  onSave?: () => void;
}

export function ShareTab({ mosaicData, creationId, onSave }: ShareTabProps) {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  
  // Generate shareable URL - only if creation is saved and has ID
  const shareUrl = creationId 
    ? `${window.location.origin}/creations/${creationId}` 
    : '';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const handleDownloadImage = () => {
    // Create a canvas from the mosaic data
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pixelSize = 20;
    canvas.width = mosaicData.width * pixelSize;
    canvas.height = mosaicData.height * pixelSize;

    // Draw the mosaic
    for (let y = 0; y < mosaicData.height; y++) {
      for (let x = 0; x < mosaicData.width; x++) {
        const colorData = mosaicData.pixels[y][x];
        ctx.fillStyle = colorData.getHex();
        ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
      }
    }

    // Download the canvas as PNG
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'brickit-mosaic.png';
      link.click();
      URL.revokeObjectURL(url);
    });
  };

  const handleShareSocial = (platform: 'twitter' | 'facebook' | 'reddit') => {
    if (!creationId || !shareUrl) {
      // If not saved, prompt user to save first
      if (onSave) {
        onSave();
      }
      return;
    }
    
    const totalBricks = mosaicData.width * mosaicData.height;
    const text = `Check out my LEGO mosaic created with BrickIt! ${mosaicData.width}x${mosaicData.height} studs, ${totalBricks} bricks`;
    const url = shareUrl;

    let shareLink = '';
    switch (platform) {
      case 'twitter':
        shareLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
        break;
      case 'facebook':
        shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case 'reddit':
        shareLink = `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`;
        break;
    }

    window.open(shareLink, '_blank', 'width=600,height=400');
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-3">
          <h2 className="text-3xl font-bold">Share Your Mosaic</h2>
          {onSave && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={onSave}
                      disabled={!user}
                      className={!user ? 'opacity-50 cursor-not-allowed' : ''}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  </span>
                </TooltipTrigger>
                {!user && (
                  <TooltipContent>
                    <p>Make a free account to save your creation</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <p className="text-muted-foreground">
          Share your creation with friends and the LEGO community!
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Preview - takes up 2/3 */}
        <div className="lg:col-span-2">
          <MosaicPreview mosaicData={mosaicData} />
        </div>

        {/* Share Options - takes up 1/3 */}
        <div className="space-y-6">
          {/* Copy Link */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5" />
                Share Link
              </CardTitle>
              <CardDescription>
                {creationId 
                  ? 'Copy and share this link with anyone'
                  : 'Save your creation first to get a shareable link'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {creationId ? (
                <div className="flex gap-2">
                  <Input 
                    value={shareUrl} 
                    readOnly 
                    className="flex-1"
                  />
                  <Button
                    onClick={handleCopyLink}
                    variant="outline"
                    className="gap-2"
                    aria-label={copied ? 'Link copied to clipboard' : 'Copy share link'}
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" aria-hidden="true" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" aria-hidden="true" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <p className="mb-3">Save your image first to generate a shareable link.</p>
                  {onSave && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={onSave}
                      disabled={!user}
                      className={!user ? 'opacity-50 cursor-not-allowed' : ''}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save to Share
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Download Image */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Download Image
              </CardTitle>
              <CardDescription>
                Save your mosaic as an image file
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleDownloadImage}
                className="w-full"
                variant="outline"
                aria-label="Download mosaic as PNG image"
              >
                <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                Download PNG
              </Button>
            </CardContent>
          </Card>

          {/* Social Media */}
          <Card>
            <CardHeader>
              <CardTitle>Share on Social Media</CardTitle>
              <CardDescription>
                {creationId 
                  ? 'Share your creation with the world'
                  : 'Save your creation first to share on social media'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {creationId ? (
                <>
                  <Button
                    onClick={() => handleShareSocial('twitter')}
                    className="w-full"
                    variant="outline"
                    aria-label="Share on X (Twitter)"
                  >
                    Share on X (Twitter)
                  </Button>
                  <Button
                    onClick={() => handleShareSocial('facebook')}
                    className="w-full"
                    variant="outline"
                    aria-label="Share on Facebook"
                  >
                    Share on Facebook
                  </Button>
                  <Button
                    onClick={() => handleShareSocial('reddit')}
                    className="w-full"
                    variant="outline"
                    aria-label="Share on Reddit"
                  >
                    Share on Reddit
                  </Button>
                </>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <p className="mb-3">Save your creation first to share on social media.</p>
                  {onSave && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={onSave}
                      disabled={!user}
                      className={!user ? 'opacity-50 cursor-not-allowed' : ''}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save to Share
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

