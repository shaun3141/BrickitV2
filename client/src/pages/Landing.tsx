import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Camera,
  Wand2,
  Palette,
  ShoppingCart,
  BookOpen,
  Share2,
  ArrowRight,
  Play,
  Check,
  Sparkles,
  Image as ImageIcon,
  Download,
  ChevronRight,
  MousePointer2,
  Layers,
  Heart,
  Shield
} from 'lucide-react';
import { LoginButton } from '@/features/auth/LoginButton';
import { SiteLayout } from '@/components/layout/SiteLayout';
import { useCanonical } from '@/hooks/useCanonical';
import { getPublicCreations } from '@/services/creation.service';
import type { Creation } from '@/types';

// Decorative brick component
function BrickStud({ color, size = 'md', className = '' }: { color: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-6 h-6'
  };
  
  return (
    <div 
      className={`${sizeClasses[size]} rounded-full ${className}`}
      style={{ 
        backgroundColor: color,
        boxShadow: `inset -1px -1px 2px rgba(0,0,0,0.3), inset 2px 2px 3px rgba(255,255,255,0.3)`
      }}
    />
  );
}

// Feature step component for the workflow section
function WorkflowStep({ 
  number, 
  title, 
  description, 
  icon: Icon, 
  color,
  isLast = false 
}: { 
  number: number; 
  title: string; 
  description: string; 
  icon: React.ElementType;
  color: string;
  isLast?: boolean;
}) {
  return (
    <div className="group flex gap-4 md:flex-col md:items-center md:text-center md:gap-3">
      {/* Left side - number and line (mobile) / Top - number (desktop) */}
      <div className="flex flex-col items-center md:flex-row md:items-center md:gap-0">
        {/* Step number circle */}
        <div 
          className="w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg shrink-0 transition-transform group-hover:scale-110"
          style={{ 
            backgroundColor: color,
            boxShadow: `0 4px 14px ${color}40`
          }}
        >
          <Icon className="w-6 h-6 md:w-7 md:h-7" />
        </div>
        
        {/* Connecting line - vertical on mobile, hidden on desktop (handled by parent) */}
        {!isLast && (
          <div className="w-0.5 h-full min-h-[60px] md:hidden" style={{ backgroundColor: `${color}30` }} />
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 pb-8 md:pb-0">
        {/* Step number label */}
        <span 
          className="text-xs font-bold uppercase tracking-wider mb-1 block"
          style={{ color }}
        >
          Step {number}
        </span>
        <h3 className="font-display font-bold text-lg mb-1">{title}</h3>
        <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

// Feature card component
function FeatureCard({ 
  icon: Icon, 
  title, 
  description, 
  features,
  color,
  delay = 0
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string; 
  features: string[];
  color: string;
  delay?: number;
}) {
  return (
    <div 
      className="opacity-0 animate-slide-up bg-white rounded-2xl p-6 shadow-lg hover-lift border border-gray-100"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      <div 
        className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
        style={{ backgroundColor: `${color}15` }}
      >
        <Icon className="w-7 h-7" style={{ color }} />
      </div>
      
      <h3 className="font-display font-bold text-xl mb-2">{title}</h3>
      <p className="text-gray-600 mb-4 leading-relaxed">{description}</p>
      
      <ul className="space-y-2">
        {features.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-2 text-sm">
            <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color }} />
            <span className="text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Gallery preview card
function GalleryPreviewCard({ creation, delay = 0 }: { creation: Creation; delay?: number }) {
  return (
    <Link 
      to={`/creations/${creation.id}`}
      className="group block opacity-0 animate-slide-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      <div className="bg-white rounded-2xl overflow-hidden shadow-lg hover-lift border border-gray-100">
        <div className="aspect-square overflow-hidden bg-gray-100">
          {creation.rendered_image_url ? (
            <img
              src={creation.rendered_image_url}
              alt={creation.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : creation.preview_image_url ? (
            <img
              src={creation.preview_image_url}
              alt={creation.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <ImageIcon className="w-12 h-12" />
            </div>
          )}
        </div>
        <div className="p-4">
          <h4 className="font-semibold truncate group-hover:text-blue-600 transition-colors">
            {creation.title}
          </h4>
          <p className="text-sm text-gray-500">
            {creation.width} × {creation.height} studs
          </p>
        </div>
      </div>
    </Link>
  );
}

// FAQ Item component
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="border-b border-gray-200 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-5 flex items-center justify-between text-left hover:text-blue-600 transition-colors"
      >
        <span className="font-semibold pr-8">{question}</span>
        <ChevronRight className={`w-5 h-5 flex-shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96 pb-5' : 'max-h-0'}`}>
        <p className="text-gray-600 leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}

export function Landing() {
  useCanonical();
  const [galleryCreations, setGalleryCreations] = useState<Creation[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(true);

  // Fetch gallery preview
  useEffect(() => {
    getPublicCreations(1, 4)
      .then(({ data }) => {
        if (data?.creations) {
          setGalleryCreations(data.creations);
        }
      })
      .catch(console.error)
      .finally(() => setGalleryLoading(false));
  }, []);

  // LEGO brand colors
  const colors = {
    red: '#E3000B',
    yellow: '#F7D117',
    blue: '#0055BF',
    green: '#237841',
    orange: '#FF6D00',
    brightGreen: '#58AB41'
  };

  return (
    <SiteLayout
      headerActions={<LoginButton />}
    >
      <div className="w-screen -mx-[calc((100vw-100%)/2)] -mt-8 overflow-hidden">
        
        {/* ==================== HERO SECTION ==================== */}
        <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
          {/* Animated background */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Brick pattern overlay */}
            <div className="absolute inset-0 brick-pattern-lg opacity-20" />
            
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
          </div>
          
          {/* Content */}
          <div className="relative z-10 container mx-auto px-4 py-20 text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-8 animate-fade-in">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium text-white/90">
                100% Free • No Account Required • Private by Default
              </span>
            </div>
            
            {/* Main headline */}
            <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black mb-6 animate-slide-up">
              <span className="text-white">Turn Photos Into</span>
              <br />
              <span className="gradient-text bg-gradient-to-r from-red-500 via-yellow-400 to-blue-500 animate-gradient-flow">
                Buildable Mosaics
              </span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-white/70 max-w-2xl mx-auto mb-10 animate-slide-up delay-200">
              Upload any photo. Get a complete parts list, step-by-step instructions, 
              and buy directly from LEGO® Pick a Brick.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slide-up delay-300">
              <Link to="/app">
                <Button size="lg" className="text-lg px-8 py-7 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 shadow-xl shadow-red-500/25 group">
                  <Camera className="w-5 h-5 mr-2" />
                  Start Creating
                  <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link to="/gallery">
                <Button size="lg" variant="outline" className="text-lg px-8 py-7 bg-white/10 hover:bg-white/20 text-white border-white/30 hover:border-white/50 backdrop-blur-sm">
                  <Play className="w-5 h-5 mr-2" />
                  See Gallery
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* ==================== WORKFLOW SECTION ==================== */}
        <section className="relative py-16 md:py-24 bg-gradient-to-b from-gray-50 to-white">
          <div className="container mx-auto px-4">
            {/* Section header */}
            <div className="text-center mb-12 md:mb-16">
              <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                From Photo to Real Bricks in
                <span className="gradient-text bg-gradient-to-r from-blue-600 to-blue-400"> 6 Simple Steps</span>
              </h2>
              <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
                Our intuitive workflow guides you through every step of creating your LEGO masterpiece
              </p>
            </div>
            
            {/* Workflow steps - Vertical timeline on mobile, horizontal on desktop */}
            <div className="max-w-5xl mx-auto">
              {/* Mobile layout - vertical timeline */}
              <div className="md:hidden space-y-0 pl-2">
                <WorkflowStep
                  number={1}
                  title="Upload Photo"
                  description="Drag & drop any photo. We support all common formats."
                  icon={Camera}
                  color={colors.red}
                />
                <WorkflowStep
                  number={2}
                  title="Edit & Refine"
                  description="Adjust colors pixel by pixel. Apply filters for the perfect look."
                  icon={Wand2}
                  color={colors.orange}
                />
                <WorkflowStep
                  number={3}
                  title="Parts List"
                  description="See exactly which bricks you need with color-coded inventory."
                  icon={Layers}
                  color={colors.yellow}
                />
                <WorkflowStep
                  number={4}
                  title="Buy Bricks"
                  description="Export to LEGO Pick a Brick with one click. See exact costs."
                  icon={ShoppingCart}
                  color={colors.green}
                />
                <WorkflowStep
                  number={5}
                  title="Build It"
                  description="Follow step-by-step instructions. Export printable PDF guides."
                  icon={BookOpen}
                  color={colors.blue}
                />
                <WorkflowStep
                  number={6}
                  title="Share"
                  description="Save to your account. Share with the community gallery."
                  icon={Share2}
                  color="#8B5CF6"
                  isLast
                />
              </div>
              
              {/* Desktop layout - horizontal with connecting lines */}
              <div className="hidden md:block">
                {/* Top row - steps 1-3 */}
                <div className="grid grid-cols-3 gap-8 mb-8 relative">
                  {/* Connecting lines with gaps around circles */}
                  <div className="absolute top-7 left-[22%] w-[23%] h-0.5 bg-gradient-to-r from-red-300 to-orange-300" />
                  <div className="absolute top-7 left-[55%] w-[23%] h-0.5 bg-gradient-to-r from-orange-300 to-yellow-300" />
                  
                  <WorkflowStep
                    number={1}
                    title="Upload Photo"
                    description="Drag & drop any photo. We support all common formats."
                    icon={Camera}
                    color={colors.red}
                  />
                  <WorkflowStep
                    number={2}
                    title="Edit & Refine"
                    description="Adjust colors pixel by pixel. Apply filters for the perfect look."
                    icon={Wand2}
                    color={colors.orange}
                  />
                  <WorkflowStep
                    number={3}
                    title="Parts List"
                    description="See exactly which bricks you need with color-coded inventory."
                    icon={Layers}
                    color={colors.yellow}
                  />
                </div>
                
                {/* Bottom row - steps 4-6 */}
                <div className="grid grid-cols-3 gap-8 relative">
                  {/* Connecting lines with gaps around circles */}
                  <div className="absolute top-7 left-[22%] w-[23%] h-0.5 bg-gradient-to-r from-green-300 to-blue-300" />
                  <div className="absolute top-7 left-[55%] w-[23%] h-0.5 bg-gradient-to-r from-blue-300 to-purple-300" />
                  
                  <WorkflowStep
                    number={4}
                    title="Buy Bricks"
                    description="Export to LEGO Pick a Brick with one click. See exact costs."
                    icon={ShoppingCart}
                    color={colors.green}
                  />
                  <WorkflowStep
                    number={5}
                    title="Build It"
                    description="Follow step-by-step instructions. Export printable PDF guides."
                    icon={BookOpen}
                    color={colors.blue}
                  />
                  <WorkflowStep
                    number={6}
                    title="Share"
                    description="Save to your account. Share with the community gallery."
                    icon={Share2}
                    color="#8B5CF6"
                    isLast
                  />
                </div>
              </div>
            </div>
            
            {/* CTA */}
            <div className="text-center mt-12 md:mt-16">
              <Link to="/app">
                <Button size="lg" className="text-lg px-8 py-6 bg-slate-900 hover:bg-slate-800">
                  Try It Now — It's Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* ==================== FEATURES DEEP DIVE ==================== */}
        <section className="py-24 bg-white">
          <div className="container mx-auto px-4">
            {/* Section header */}
            <div className="text-center mb-16">
              <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
                Packed with Powerful Features
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Everything you need to create stunning LEGO mosaics, completely free
              </p>
            </div>
            
            {/* Features grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard
                icon={Palette}
                title="Smart Color Matching"
                description="Advanced algorithm matches your photo to the official LEGO color palette for authentic results."
                features={[
                  'Official LEGO color palette',
                  'Real-time color preview',
                  'Color availability checking',
                  'Substitute suggestions'
                ]}
                color={colors.red}
                delay={0}
              />
              <FeatureCard
                icon={MousePointer2}
                title="Pixel-Perfect Editor"
                description="Fine-tune every single brick with our intuitive editor. Zoom, pan, and perfect your design."
                features={[
                  'Click to change any pixel',
                  'Eyedropper tool',
                  'Undo/redo support',
                  'Grid overlay options'
                ]}
                color={colors.blue}
                delay={100}
              />
              <FeatureCard
                icon={ShoppingCart}
                title="Direct LEGO Integration"
                description="Export your parts list directly to LEGO Pick a Brick. See prices and availability instantly."
                features={[
                  'One-click CSV export',
                  'Real-time price estimates',
                  'Element ID lookups',
                  'Inventory tracking'
                ]}
                color={colors.green}
                delay={200}
              />
              <FeatureCard
                icon={BookOpen}
                title="Building Instructions"
                description="Step-by-step visual guides break your mosaic into manageable sections for easy building."
                features={[
                  'Region-by-region breakdown',
                  'Progress tracking',
                  'HTML export for printing',
                  '2x2 or 3x3 grid options'
                ]}
                color={colors.orange}
                delay={300}
              />
              <FeatureCard
                icon={Download}
                title="Multiple Export Options"
                description="Download your creation in various formats for different needs and platforms."
                features={[
                  'High-res mosaic images',
                  'CSV parts lists',
                  'JSON data export',
                  'Printable instructions'
                ]}
                color="#8B5CF6"
                delay={400}
              />
              <FeatureCard
                icon={Shield}
                title="Privacy First"
                description="Your photos never leave your device unless you choose to share. Complete privacy by default."
                features={[
                  'Client-side processing',
                  'No upload required',
                  'Optional cloud save',
                  'Control your sharing'
                ]}
                color="#EC4899"
                delay={500}
              />
            </div>
          </div>
        </section>

        {/* ==================== GALLERY PREVIEW ==================== */}
        <section className="py-24 bg-gradient-to-b from-gray-50 to-white">
          <div className="container mx-auto px-4">
            {/* Section header */}
            <div className="text-center mb-16">
              <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
                Community Gallery
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Get inspired by amazing creations from builders around the world
              </p>
            </div>
            
            {/* Gallery grid */}
            {galleryLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
              </div>
            ) : galleryCreations.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {galleryCreations.map((creation, idx) => (
                    <GalleryPreviewCard key={creation.id} creation={creation} delay={idx * 100} />
                  ))}
                </div>
                
                <div className="text-center mt-12">
                  <Link to="/gallery">
                    <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                      Browse Full Gallery
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-6">Be the first to share your creation!</p>
                <Link to="/app">
                  <Button size="lg">Create Your Mosaic</Button>
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* ==================== FAQ SECTION ==================== */}
        <section className="py-24 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              {/* Section header */}
              <div className="text-center mb-16">
                <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
                  Frequently Asked Questions
                </h2>
              </div>
              
              {/* FAQ items */}
              <div className="bg-gray-50 rounded-2xl p-8">
                <FAQItem
                  question="Is BrickIt really free?"
                  answer="Yes! BrickIt is completely free to use with no hidden costs. All image processing happens in your browser, so we don't need expensive servers. We accept optional donations if you'd like to support the project."
                />
                <FAQItem
                  question="What happens to my photos?"
                  answer="Your photos are processed entirely in your browser and never uploaded to our servers unless you explicitly choose to save and share your creation. Your privacy is our priority."
                />
                <FAQItem
                  question="How accurate is the color matching?"
                  answer="BrickIt uses the official LEGO color palette and matches each pixel to the closest available brick color. We also check real-time availability from LEGO Pick a Brick to ensure you can actually buy the pieces you need."
                />
                <FAQItem
                  question="Can I buy the bricks directly?"
                  answer="Yes! BrickIt generates a CSV file that you can upload directly to LEGO Pick a Brick. Just download your parts list, go to Pick a Brick, click 'Upload list', and add everything to your cart with one click."
                />
                <FAQItem
                  question="What image formats are supported?"
                  answer="BrickIt supports all common image formats including JPG, PNG, GIF, and WebP. For best results, use high-quality images with good contrast."
                />
                <FAQItem
                  question="How big can my mosaic be?"
                  answer="You can create mosaics from 16 studs wide up to 128 studs wide. Larger mosaics require more bricks and take longer to build, but the results are stunning!"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ==================== FINAL CTA ==================== */}
        <section className="py-24 relative overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <div className="absolute inset-0 brick-pattern-lg opacity-10" />
            
            {/* Decorative elements */}
            <div className="absolute top-10 left-[5%] opacity-60">
              <BrickStud color={colors.red} size="lg" />
            </div>
            <div className="absolute bottom-20 right-[10%] opacity-60">
              <BrickStud color={colors.yellow} size="lg" />
            </div>
            <div className="absolute top-1/2 left-[15%] opacity-40">
              <BrickStud color={colors.blue} size="md" />
            </div>
          </div>
          
          {/* Content */}
          <div className="relative z-10 container mx-auto px-4 text-center">
            <div className="max-w-3xl mx-auto">
              <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
                Ready to Build Something
                <span className="gradient-text bg-gradient-to-r from-yellow-400 to-orange-400"> Amazing?</span>
              </h2>
              <p className="text-xl text-white/70 mb-10">
                Join thousands of builders creating custom LEGO mosaics from their favorite photos
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/app">
                  <Button size="lg" className="text-lg px-10 py-7 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 shadow-xl shadow-red-500/25 group">
                    <Camera className="w-5 h-5 mr-2" />
                    Create Your Mosaic
                    <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
                <Link to="/donate">
                  <Button size="lg" variant="outline" className="text-lg px-10 py-7 bg-white/10 hover:bg-white/20 text-white border-white/30 hover:border-white/50">
                    <Heart className="w-5 h-5 mr-2" />
                    Support BrickIt
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

      </div>
    </SiteLayout>
  );
}
