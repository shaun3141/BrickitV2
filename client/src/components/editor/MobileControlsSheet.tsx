import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

interface MobileControlsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: React.ReactNode;
}

export default function MobileControlsSheet({ open, onOpenChange, title = 'Edit Controls', children }: MobileControlsSheetProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="fixed inset-x-0 bottom-0 top-auto z-50 w-full max-w-none translate-y-0 rounded-t-xl border bg-background p-4 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom lg:hidden"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <div className="mx-auto h-1.5 w-10 rounded-full bg-muted-foreground/40" aria-hidden="true" />
        <div className="mt-2">
          <div className="mb-2 text-center text-sm font-medium">{title}</div>
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}



