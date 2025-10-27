import { useCallback, useState, useEffect } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ImageUploaderProps {
  onImageSelect: (file: File) => void;
  isProcessing: boolean;
}

export function ImageUploader({ onImageSelect, isProcessing }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      const imageFile = files.find((file) =>
        file.type.startsWith('image/')
      );

      if (imageFile) {
        onImageSelect(imageFile);
      }
    },
    [onImageSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files[0]) {
        onImageSelect(files[0]);
      }
    },
    [onImageSelect]
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const blob = item.getAsFile();
          if (blob) {
            // Create a File object from the blob with a proper filename
            const file = new File([blob], `pasted-image-${Date.now()}.png`, {
              type: blob.type,
            });
            onImageSelect(file);
          }
          break;
        }
      }
    },
    [onImageSelect]
  );

  // Add paste event listener
  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);

  return (
    <Card
      className={`relative border-2 border-dashed transition-colors ${
        isDragging
          ? 'border-primary bg-primary/5'
          : 'border-muted-foreground/25'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      role="region"
      aria-label="Image upload area"
    >
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <Upload
          className={`mb-4 h-12 w-12 ${
            isDragging ? 'text-primary' : 'text-muted-foreground'
          }`}
          aria-hidden="true"
        />
        <h3 className="mb-2 text-lg font-semibold">
          {isDragging ? 'Drop your image here' : 'Upload an image'}
        </h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Drag and drop, paste (Ctrl/Cmd+V), or click to browse
        </p>
        <Button
          disabled={isProcessing}
          onClick={() => document.getElementById('file-input')?.click()}
          aria-label="Browse for image file"
        >
          {isProcessing ? 'Processing...' : 'Browse Files'}
        </Button>
        <input
          id="file-input"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileInput}
          disabled={isProcessing}
          aria-label="Select image file"
        />
      </div>
    </Card>
  );
}

