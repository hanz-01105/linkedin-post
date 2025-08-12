// frontend/components/PostCard.tsx
import { useState } from "react";
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

  // Check if we have media
  const hasMedia = post.media_urls && post.media_urls.length > 0;
  const currentImage = hasMedia && post.media_urls ? post.media_urls[currentImageIndex] : null;
  
  // Default gradient backgrounds if no image
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
  
  // Generate avatar URL with better fallback handling
  const getAvatarUrl = () => {
    // If we have an author_avatar URL from LinkedIn, use it
    if (post.author_avatar && post.author_avatar.length > 0 && !post.author_avatar.includes('data:image')) {
      // LinkedIn avatar URLs might need some processing
      let avatarUrl = post.author_avatar;
      
      // If it's a relative URL, make it absolute
      if (avatarUrl.startsWith('/')) {
        avatarUrl = `https://www.linkedin.com${avatarUrl}`;
      }
      
      // Ensure it's using HTTPS
      avatarUrl = avatarUrl.replace('http://', 'https://');
      
      console.log('Using LinkedIn avatar:', avatarUrl);
      return avatarUrl;
    }
    
    // Fallback to generated avatar with initials
    const initials = authorName
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    
    console.log('Generating avatar for:', authorName, 'with initials:', initials);
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=0077b5&color=fff&size=200&bold=true&format=svg`;
  };

  const handlePrevImage = () => {
    const mediaLength = post.media_urls?.length || 0;
    if (mediaLength <= 1) return;
    setCurrentImageIndex(prev => 
      prev === 0 ? mediaLength - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    const mediaLength = post.media_urls?.length || 0;
    if (mediaLength <= 1) return;
    setCurrentImageIndex(prev => 
      prev === mediaLength - 1 ? 0 : prev + 1
    );
  };

  // Handle keyboard navigation for image carousel
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (!hasMedia || !post.media_urls || post.media_urls.length <= 1) return;
    if (e.key === 'ArrowLeft') handlePrevImage();
    if (e.key === 'ArrowRight') handleNextImage();
  };

  return (
    <article className="min-h-screen flex flex-col bg-white">
      {/* Hero Section with Image/Gradient - adjusted height for avatar */}
      <div className="relative h-[45vh] md:h-[55vh] overflow-hidden" onKeyDown={handleKeyPress} tabIndex={0}>
        {hasMedia && !imageError[currentImageIndex] ? (
          <div className="relative w-full h-full">
            <img
              src={currentImage!}
              alt={`Post image ${currentImageIndex + 1}`}
              className="w-full h-full object-cover"
              onError={() => {
                setImageError(prev => ({ ...prev, [currentImageIndex]: true }));
              }}
            />
            
            {/* Image carousel controls */}
            {post.media_urls && post.media_urls.length > 1 && (
              <>
                {/* Previous button */}
                <button
                  onClick={handlePrevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-all"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                
                {/* Next button */}
                <button
                  onClick={handleNextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-all"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
                
                {/* Image indicators */}
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex space-x-2">
                  {post.media_urls.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentImageIndex 
                          ? 'bg-white w-8' 
                          : 'bg-white/60 hover:bg-white/80'
                      }`}
                      aria-label={`Go to image ${index + 1}`}
                    />
                  ))}
                </div>
                
                {/* Image counter */}
                <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                  {currentImageIndex + 1} / {post.media_urls.length}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${defaultGradient} flex items-center justify-center`}>
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
        
        {/* Dark overlay gradient for better readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none"></div>
        
        {/* Post metadata overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
          <div className="max-w-4xl mx-auto">
            {post.timestamp && (
              <div className="flex items-center space-x-2 text-sm mb-4 opacity-90">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(post.timestamp)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Avatar Section - Now properly positioned below the header */}
      <div className="relative -mt-12 mb-6 z-10">
        <div className="flex justify-center">
          <div className="w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-white bg-white shadow-xl overflow-hidden">
            <img
              src={getAvatarUrl()}
              alt={authorName}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                console.error('Avatar failed to load:', target.src);
                // Try fallback to generated avatar
                const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=0077b5&color=fff&size=200&bold=true&format=svg`;
                if (target.src !== fallbackUrl) {
                  target.src = fallbackUrl;
                } else {
                  // If even fallback fails, show placeholder
                  target.style.display = 'none';
                  if (target.nextElementSibling) {
                    (target.nextElementSibling as HTMLElement).style.display = 'flex';
                  }
                }
              }}
            />
            <div className="hidden w-full h-full bg-gradient-to-br from-blue-500 to-blue-700 items-center justify-center">
              <span className="text-white text-2xl font-bold">
                {authorName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
              </span>
            </div>
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
          
          {/* Post type indicator if it's a repost */}
          {post.post_type === 'repost' && (
            <p className="text-center text-gray-500 mb-6 text-sm">
              <Share className="inline w-4 h-4 mr-1" />
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