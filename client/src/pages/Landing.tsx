import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Image as ImageIcon, 
  Wand2, 
  Blocks, 
  FileText, 
  Download,
  Sparkles,
  Camera,
  Zap,
  Palette,
  Share2
} from 'lucide-react';
import { LoginButton } from '@/features/auth/LoginButton';
import { SiteLayout } from '@/components/layout/SiteLayout';
import { useCanonical } from '@/hooks/useCanonical';

export function Landing() {
  useCanonical();
  return (
    <SiteLayout
      headerActions={<LoginButton />}
    >
      <div className="bg-gradient-to-b from-blue-50 via-white to-orange-50 w-screen -mx-[calc((100vw-100%)/2)] -mt-8 -mb-16">

        {/* Hero Section */}
        <section className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20 text-center relative overflow-hidden">
          {/* Background Image */}
          <div 
            className="absolute inset-0 mt-8 sm:mt-10 md:mt-12 bg-cover bg-center bg-no-repeat opacity-20 rounded-3xl"
            style={{ backgroundImage: 'url(/hero_img1.png)' }}
          />
          
          {/* Content */}
          <div className="max-w-4xl mx-auto relative z-10 px-4 sm:px-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-orange-100 to-blue-100 rounded-full mb-4 sm:mb-6">
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-orange-600 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-gray-700">
                Transform photos into mosaics you can build with LEGO® bricks
              </span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-orange-600 via-red-500 to-blue-600 bg-clip-text text-transparent leading-tight">
              Art you can Build
            </h1>
            
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-600 mb-6 sm:mb-8 max-w-2xl mx-auto leading-relaxed px-2">
              Upload your favorite photo and watch it transform into a buildable LEGO mosaic 
              with a complete parts list and step-by-step instructions.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-2">
              <Link to="/app" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 bg-gradient-to-r from-orange-600 to-red-500 hover:from-orange-700 hover:to-red-600">
                  <Camera className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Create Your Mosaic
                </Button>
              </Link>
              <Link to="/gallery" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 border-2">
                  <Palette className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Browse Gallery
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 sm:mb-12 md:mb-16">
              Everything You Need to Create
            </h2>
            
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
              {/* Feature 1 */}
              <div className="p-6 sm:p-8 bg-white rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4">
                  <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">Upload & Process</h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                  Simply upload your photo. Our advanced algorithm automatically converts it 
                  into pixel-perfect colors using official LEGO bricks.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="p-6 sm:p-8 bg-white rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4">
                  <Wand2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">Edit & Refine</h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                  Fine-tune colors pixel by pixel, adjust filters, and customize your mosaic 
                  until it's exactly how you want it.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="p-6 sm:p-8 bg-white rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4">
                  <Blocks className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">Complete Instructions</h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                  Get automated building instructions and a detailed parts list so you can 
                  start building immediately.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="p-6 sm:p-8 bg-white rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">Export Parts List</h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                  Download your parts list as JSON or CSV. Perfect for ordering bricks online 
                  or keeping track of your inventory.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="p-6 sm:p-8 bg-white rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4">
                  <Download className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">Download Results</h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                  Save your mosaic images, compare side-by-side with the original, and 
                  download everything you need.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="p-6 sm:p-8 bg-white rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-pink-500 to-pink-600 rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4">
                  <Share2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">Share & Save</h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                  Save your creations to your account and share them with the community. 
                  Browse amazing mosaics from other builders.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-3 sm:mb-4">
              How It Works
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 text-center mb-8 sm:mb-12 md:mb-16">
              Creating your LEGO mosaic is as easy as 1-2-3
            </p>
            
            <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
              <div className="text-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 text-xl sm:text-2xl font-bold text-white">
                  1
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2">Upload Your Photo</h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                  Choose any photo from your device. Our system handles the rest.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 text-xl sm:text-2xl font-bold text-white">
                  2
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2">Customize & Edit</h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                  Adjust colors, apply filters, and make it perfect for you.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 text-xl sm:text-2xl font-bold text-white">
                  3
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2">Get Building</h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                  Download your parts list and instructions, then start building!
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20">
          <div className="max-w-4xl mx-auto bg-gradient-to-r from-orange-600 to-red-500 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 text-center text-white">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">
              Ready to Build Something Amazing?
            </h2>
            <p className="text-base sm:text-lg md:text-xl mb-6 sm:mb-8 opacity-90">
              Join thousands of creators turning their memories into brick art
            </p>
            <Link to="/app" className="inline-block">
              <Button size="lg" variant="secondary" className="text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6">
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Start Creating Now
              </Button>
            </Link>
          </div>
        </section>

      </div>
    </SiteLayout>
  );
}

