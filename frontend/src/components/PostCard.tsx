// frontend/components/PostCard.tsx
import { useState, useEffect } from "react";
import { Calendar, Heart, MessageCircle, Share, Image, Play, FileText, ExternalLink, User, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

interface Post {
  post_number: number;
  content: string;
  timestamp?: string;
  engagement?: Record<string, string>;
  post_type?: string;
  media_urls?: string[];
  post_url?: string;
  profile_url?: string;
  author_name?: string;
  author_avatar?: string;
}

interface Props {
  post: Post;
  isLast?: boolean;
  onScrollNext?: () => void;
}

export default function PostCard({ post, isLast = false, onScrollNext }: Props) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageError, setImageError] = useState<{[key: number]: boolean}>({});
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const formatDate = (timestamp?: string) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter out profile pictures from media URLs for background display
  const getBackgroundMediaUrls = () => {
    if (!post.media_urls || post.media_urls.length === 0) return [];
    
    return post.media_urls.filter(url => {
      // Filter out profile pictures and small images that are likely avatars
      // LinkedIn profile pictures usually contain specific patterns
      const isProfilePicture = 
        url.includes('profile-displayphoto') ||
        url.includes('profile-photo') ||
        url.includes('/profile/') ||
        url.includes('entity-photo') ||
        url.includes('actor-photo') ||
        url.includes('presence-entity') ||
        url.includes('_128_') || // Common profile pic size
        url.includes('_100_') ||
        url.includes('_50_') ||
        url.includes('EntityPhoto') ||
        url.includes('actor') ||
        url.includes('avatar');
      
      return !isProfilePicture;
    });
  };

  // Separate videos from images
  const getVideoUrls = () => {
    if (!post.media_urls || post.media_urls.length === 0) return [];
    
    return post.media_urls.filter(url => {
      return url.includes('.mp4') || 
             url.includes('.webm') || 
             url.includes('.mov') || 
             url.includes('video') ||
             url.includes('.avi') ||
             url.includes('.m4v') ||
             url.includes('blob:');
    });
  };

  const isVideoUrl = (url: string) => {
    return url.includes('.mp4') || 
           url.includes('.webm') || 
           url.includes('.mov') || 
           url.includes('video') ||
           url.includes('.avi') ||
           url.includes('.m4v') ||
           url.includes('blob:');
  };

  const isBlobUrl = (url: string) => {
    return url.startsWith('blob:');
  };

  const backgroundMedia = getBackgroundMediaUrls();
  const videoUrls = getVideoUrls();
  const hasBackgroundMedia = backgroundMedia.length > 0;
  const hasVideos = videoUrls.length > 0;
  const currentBackgroundImage = hasBackgroundMedia ? backgroundMedia[currentImageIndex] : null;
  const currentIsVideo = currentBackgroundImage ? isVideoUrl(currentBackgroundImage) : false;
  
  // Default gradient backgrounds if no background media
  const gradients = [
    'from-blue-400 via-blue-500 to-indigo-600',
    'from-purple-400 via-purple-500 to-pink-600',
    'from-green-400 via-teal-500 to-cyan-600',
    'from-indigo-400 via-purple-500 to-pink-600',
    'from-orange-400 via-red-500 to-pink-600',
  ];
  const defaultGradient = gradients[post.post_number % gradients.length];

  // Extract author name from profile URL if not provided
  const getAuthorName = () => {
    if (post.author_name) return post.author_name;
    if (post.profile_url) {
      const match = post.profile_url.match(/linkedin\.com\/in\/([^\/]+)/);
      if (match) {
        return match[1].replace(/-/g, ' ').split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
      }
    }
    return 'LinkedIn User';
  };

  const authorName = getAuthorName();
  
  // Generate avatar URL - using author_avatar if provided, otherwise generate from name
  const getAvatarUrl = () => {
    // If we have an author_avatar URL, use it
    if (post.author_avatar && post.author_avatar.length > 0) {
      return post.author_avatar;
    }
    // Otherwise generate a placeholder avatar with initials
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=0077b5&color=fff&size=200&bold=true`;
  };

  // Touch handlers for mobile swipe
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && backgroundMedia.length > 1) {
      handleNextImage();
    }
    if (isRightSwipe && backgroundMedia.length > 1) {
      handlePrevImage();
    }
  };

  const handlePrevImage = () => {
    if (backgroundMedia.length <= 1) return;
    setCurrentImageIndex(prev => 
      prev === 0 ? backgroundMedia.length - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    if (backgroundMedia.length <= 1) return;
    setCurrentImageIndex(prev => 
      prev === backgroundMedia.length - 1 ? 0 : prev + 1
    );
  };

  // Auto-advance images (optional)
  useEffect(() => {
    if (backgroundMedia.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentImageIndex(prev => 
        prev === backgroundMedia.length - 1 ? 0 : prev + 1
      );
    }, 8000); // Change image every 8 seconds

    return () => clearInterval(interval);
  }, [backgroundMedia.length]);

  // Handle keyboard navigation for image carousel
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (!hasBackgroundMedia || backgroundMedia.length <= 1) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handlePrevImage();
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleNextImage();
    }
  };

  // Reset image index when post changes
  useEffect(() => {
    setCurrentImageIndex(0);
    setImageError({});
  }, [post.post_number]);

  return (
    <article className="min-h-screen flex flex-col bg-white">
      {/* Hero Section with Background Image Carousel - Dynamic Height */}
      <div 
        className="relative min-h-[50vh] max-h-[70vh] h-auto overflow-hidden cursor-pointer" 
        onKeyDown={handleKeyPress} 
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        tabIndex={0}
        style={{
          height: hasBackgroundMedia ? 'auto' : '50vh'
        }}
      >
        {hasBackgroundMedia && !imageError[currentImageIndex] ? (
          <div className="relative w-full group">
            {currentIsVideo ? (
              isBlobUrl(currentBackgroundImage!) ? (
                // For blob URLs, show a blank white background
                <div className="w-full max-h-[70vh] min-h-[50vh] bg-white flex items-center justify-center">
                  {/* Completely blank white space */}
                </div>
              ) : (
                <video
                  src={currentBackgroundImage!}
                  className="w-full max-h-[70vh] min-h-[50vh] object-contain bg-gray-100 transition-opacity duration-500"
                  style={{
                    objectFit: 'contain',
                    objectPosition: 'center',
                    maxHeight: '70vh',
                    minHeight: '50vh',
                    width: '100%',
                    display: 'block'
                  }}
                  controls
                  autoPlay
                  muted
                  loop
                  playsInline
                  onError={(e) => {
                    console.log('Video error:', e);
                    setImageError(prev => ({ ...prev, [currentImageIndex]: true }));
                  }}
                  onLoadStart={() => {
                    console.log('Video loading:', currentBackgroundImage);
                  }}
                />
              )
            ) : (
              <img
                src={currentBackgroundImage!}
                alt={`Background image ${currentImageIndex + 1}`}
                className="w-full max-h-[70vh] min-h-[50vh] object-contain bg-gray-100 transition-opacity duration-500"
                style={{
                  objectFit: 'contain',
                  objectPosition: 'center',
                  maxHeight: '70vh',
                  minHeight: '50vh',
                  width: '100%',
                  display: 'block'
                }}
                onLoad={(e) => {
                  const img = e.target as HTMLImageElement;
                  const container = img.parentElement;
                  if (container) {
                    // Adjust container height based on image aspect ratio
                    const aspectRatio = img.naturalWidth / img.naturalHeight;
                    const containerWidth = container.clientWidth;
                    let calculatedHeight = containerWidth / aspectRatio;
                    
                    // Constrain height between min and max
                    calculatedHeight = Math.max(calculatedHeight, window.innerHeight * 0.5); // min 50vh
                    calculatedHeight = Math.min(calculatedHeight, window.innerHeight * 0.7); // max 70vh
                    
                    container.style.height = `${calculatedHeight}px`;
                  }
                }}
                onError={() => {
                  setImageError(prev => ({ ...prev, [currentImageIndex]: true }));
                }}
              />
            )}
            
            {/* Image carousel controls - always visible, enhanced styling */}
            {backgroundMedia.length > 1 && (
              <>
                {/* Previous button */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handlePrevImage();
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/50 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-all duration-300 backdrop-blur-sm z-30 shadow-lg hover:scale-110 opacity-80 hover:opacity-100"
                  aria-label="Previous media"
                >
                  <ChevronLeft className="w-7 h-7" />
                </button>
                
                {/* Next button */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleNextImage();
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/50 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-all duration-300 backdrop-blur-sm z-30 shadow-lg hover:scale-110 opacity-80 hover:opacity-100"
                  aria-label="Next media"
                >
                  <ChevronRight className="w-7 h-7" />
                </button>
                
                {/* Image indicators/dots - simplified */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-2 z-30">
                  {backgroundMedia.map((url, index) => (
                    <button
                      key={index}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setCurrentImageIndex(index);
                      }}
                      className={`transition-all duration-300 ${
                        index === currentImageIndex 
                          ? 'bg-white w-8 h-2 rounded-full shadow-lg' 
                          : 'bg-white/60 hover:bg-white/80 w-2 h-2 rounded-full'
                      }`}
                      aria-label={`Go to media ${index + 1}`}
                    />
                  ))}
                </div>
                
                {/* Media counter with type indicator - simplified */}
                <div className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1.5 rounded-full text-sm backdrop-blur-sm z-30 shadow-lg flex items-center gap-1">
                  {currentIsVideo && !isBlobUrl(currentBackgroundImage!) && <Play className="w-3 h-3" />}
                  {!currentIsVideo && <Image className="w-3 h-3" />}
                  {currentImageIndex + 1} / {backgroundMedia.length}
                </div>

                {/* Swipe instruction for mobile - simplified */}
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-white/80 text-xs text-center z-30 md:hidden bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm">
                  Swipe to change media
                </div>
              </>
            )}

            {/* Media type indicator - simplified, only show for playable videos */}
            {(post.post_type === 'video' || (currentIsVideo && !isBlobUrl(currentBackgroundImage!))) && (
              <div className="absolute top-4 left-4 bg-black/60 text-white px-3 py-1.5 rounded-full text-sm backdrop-blur-sm z-30 flex items-center gap-1 shadow-lg">
                <Play className="w-4 h-4" />
                Video
              </div>
            )}

            {/* Overlay for better text readability only at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/60 to-transparent pointer-events-none z-10"></div>
          </div>
        ) : (
          <div className={`w-full min-h-[50vh] bg-gradient-to-br ${defaultGradient} flex items-center justify-center`}>
            <div className="text-center text-white">
              {post.post_type === 'video' ? (
                <Play className="w-20 h-20 mx-auto opacity-50" />
              ) : post.post_type === 'article' ? (
                <FileText className="w-20 h-20 mx-auto opacity-50" />
              ) : (
                <div className="flex flex-col items-center">
                  <Linkedin className="w-20 h-20 opacity-50 mb-4" />
                  <p className="text-xl font-light opacity-75">LinkedIn Post</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Post metadata overlay - only when we have timestamp */}
        {post.timestamp && (
          <div className="absolute bottom-0 left-0 right-0 p-4 text-white z-20">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center space-x-2 text-sm opacity-90 bg-black/30 rounded-full px-3 py-1 backdrop-blur-sm w-fit">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(post.timestamp)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Avatar Section - adjusted margin for dynamic header */}
      <div className="relative -mt-8 mb-6 z-30">
        <div className="flex justify-center">
          <div className="w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-white bg-white shadow-xl overflow-hidden">
            <img
              src={getAvatarUrl()}
              alt={authorName}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=0077b5&color=fff&size=200`;
              }}
            />
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="flex-1 flex flex-col">
        <div className="max-w-4xl mx-auto w-full px-6 md:px-8 pb-8">
          {/* Author Name */}
          <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-900 mb-2">
            {authorName}
          </h2>
          
          {/* Post type indicator - only for special types */}
          {post.post_type === 'repost' && (
            <p className="text-center text-gray-500 mb-4 text-sm flex items-center justify-center gap-1">
              <Share className="inline w-4 h-4" />
              Reposted
            </p>
          )}

          {/* Post Content */}
          <div className="prose prose-lg md:prose-xl max-w-none mb-8">
            <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
              {post.content}
            </p>
          </div>



          {/* Engagement Stats and Actions */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-6">
                {post.engagement?.reactions && (
                  <div className="flex items-center space-x-2">
                    <Heart className="w-5 h-5 text-red-500" />
                    <span className="text-gray-700 font-medium">{post.engagement.reactions}</span>
                  </div>
                )}
                {post.engagement?.comments && (
                  <div className="flex items-center space-x-2">
                    <MessageCircle className="w-5 h-5 text-blue-500" />
                    <span className="text-gray-700 font-medium">{post.engagement.comments}</span>
                  </div>
                )}
                {post.engagement?.shares && (
                  <div className="flex items-center space-x-2">
                    <Share className="w-5 h-5 text-green-500" />
                    <span className="text-gray-700 font-medium">{post.engagement.shares}</span>
                  </div>
                )}
              </div>
              
              {/* View on LinkedIn Button */}
              {post.post_url && (
                <a
                  href={post.post_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-[#0077b5] text-white rounded-full hover:bg-[#005885] transition-colors font-medium shadow-lg hover:shadow-xl"
                >
                  <span>View on LinkedIn</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        {!isLast && (
          <div className="py-8 flex flex-col items-center justify-center text-gray-400 animate-bounce">
            <p className="text-sm mb-2">Scroll for next post</p>
            <ChevronDown className="w-6 h-6" />
          </div>
        )}
      </div>
    </article>
  );
}

// Add Linkedin icon component if not imported
const Linkedin = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);