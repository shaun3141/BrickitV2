import { useState } from 'react';
import { Share2, Copy, Download, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MosaicPreview } from '@/components/MosaicPreview';
import type { MosaicData, BrickPlacement } from '@/types';

interface ShareTabProps {
  mosaicData: MosaicData;
  placements: BrickPlacement[];
}

export function ShareTab({ mosaicData, placements }: ShareTabProps) {
  const [copied, setCopied] = useState(false);
  
  // Generate a shareable URL (this could be enhanced with actual URL shortening or cloud storage)
  const shareUrl = window.location.href;

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
        const colorData = mosaicData.grid[y][x];
        ctx.fillStyle = colorData.hex;
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
    const text = `Check out my LEGO mosaic created with BrickIt! ${mosaicData.width}x${mosaicData.height} studs, ${mosaicData.totalBricks} bricks`;
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
        <h2 className="text-3xl font-bold">Share Your Mosaic</h2>
        <p className="text-muted-foreground">
          Share your creation with friends and the LEGO community!
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Preview Card */}
        <Card>
          <CardHeader>
            <CardTitle>Your Mosaic</CardTitle>
            <CardDescription>
              {mosaicData.width} × {mosaicData.height} studs ({mosaicData.totalBricks} bricks)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MosaicPreview mosaicData={mosaicData} />
          </CardContent>
        </Card>

        {/* Share Options Card */}
        <div className="space-y-6">
          {/* Copy Link */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5" />
                Share Link
              </CardTitle>
              <CardDescription>
                Copy and share this link with anyone
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
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
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
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
              >
                <Download className="h-4 w-4 mr-2" />
                Download PNG
              </Button>
            </CardContent>
          </Card>

          {/* Social Media */}
          <Card>
            <CardHeader>
              <CardTitle>Share on Social Media</CardTitle>
              <CardDescription>
                Share your creation with the world
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                onClick={() => handleShareSocial('twitter')}
                className="w-full"
                variant="outline"
              >
                Share on X (Twitter)
              </Button>
              <Button
                onClick={() => handleShareSocial('facebook')}
                className="w-full"
                variant="outline"
              >
                Share on Facebook
              </Button>
              <Button
                onClick={() => handleShareSocial('reddit')}
                className="w-full"
                variant="outline"
              >
                Share on Reddit
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

