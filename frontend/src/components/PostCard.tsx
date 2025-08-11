// frontend/components/PostCard.tsx
import { Calendar, Heart, MessageCircle, Share, Image, Play, FileText, ExternalLink, AlertTriangle } from "lucide-react";

interface Post {
  post_number: number;
  content: string;
  timestamp?: string;
  engagement?: Record<string, string>;
  post_type?: string;
  media_urls?: string[];
  local_media_paths?: string[];  // NEW: Local downloaded media
  post_url?: string;
}

export default function PostCard({ post }: { post: Post }) {
  const getPostIcon = (type?: string) => {
    switch (type) {
      case 'image': return <Image className="w-4 h-4 text-blue-500" />;
      case 'video': return <Play className="w-4 h-4 text-red-500" />;
      case 'article': return <FileText className="w-4 h-4 text-green-500" />;
      default: return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatDate = (timestamp?: string) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // NEW: Function to get the best available media URL
  const getMediaUrl = (originalUrl: string, localPath?: string) => {
    // Prefer local downloaded file if available
    if (localPath) {
      return `http://127.0.0.1:8000/${localPath}`;
    }
    
    // Check if original URL is a blob (won't work)
    if (originalUrl.startsWith('blob:')) {
      return null;  // Blob URLs are unusable outside scraping session
    }
    
    // Return original LinkedIn CDN URL (may require proxy)
    return originalUrl;
  };

  // NEW: Check if media URL is problematic
  const getMediaStatus = (originalUrl: string, localPath?: string) => {
    if (localPath) {
      return { status: 'local', message: 'Downloaded locally' };
    }
    if (originalUrl.startsWith('blob:')) {
      return { status: 'blob', message: 'Blob URL - unavailable outside scraping session' };
    }
    if (originalUrl.includes('media.licdn.com')) {
      return { status: 'cdn', message: 'LinkedIn CDN - may require authentication' };
    }
    return { status: 'unknown', message: 'Unknown URL type' };
  };

  // Combine original URLs with local paths
  const mediaItems = post.media_urls?.map((url, index) => ({
    originalUrl: url,
    localPath: post.local_media_paths?.[index],
    displayUrl: getMediaUrl(url, post.local_media_paths?.[index]),
    status: getMediaStatus(url, post.local_media_paths?.[index])
  })) || [];

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      {/* Post Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-2">
            {getPostIcon(post.post_type)}
            <span className="text-sm font-medium text-gray-600 capitalize">
              {post.post_type || 'text'} Post
            </span>
            <span className="text-sm text-gray-400">#{post.post_number}</span>
          </div>
          {post.timestamp && (
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(post.timestamp)}</span>
            </div>
          )}
        </div>
        
        {/* Post Content */}
        <div 
          className={`text-gray-800 mb-4 leading-relaxed ${post.post_url ? 'cursor-pointer hover:text-indigo-600 transition-colors' : ''}`}
          onClick={() => post.post_url && window.open(post.post_url, '_blank')}
        >
          {post.content}
        </div>
        
        {/* Post URL Link */}
        {post.post_url && (
          <div className="mb-4">
            <a
              href={post.post_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>View on LinkedIn</span>
            </a>
          </div>
        )}
      </div>

      {/* Enhanced Media Section - MUCH MORE PROMINENT */}
      {mediaItems.length > 0 && (
        <div className="px-0 pb-4">
          <div className="grid grid-cols-1 gap-6">
            {mediaItems.map((item, index) => (
              <div key={index} className="relative">
                {/* Media Status Indicator - HIDDEN for professional look */}
                {/* Uncomment if you need to show media loading status */}
                {/*
                <div className="px-6 mb-3 flex items-center space-x-2 text-sm font-medium">
                  <div className={`w-3 h-3 rounded-full ${
                    item.status.status === 'local' ? 'bg-green-500' :
                    item.status.status === 'blob' ? 'bg-red-500' :
                    item.status.status === 'cdn' ? 'bg-yellow-500' : 'bg-gray-500'
                  }`} />
                  <span className={`${
                    item.status.status === 'local' ? 'text-green-700' :
                    item.status.status === 'blob' ? 'text-red-700' :
                    item.status.status === 'cdn' ? 'text-yellow-700' : 'text-gray-700'
                  }`}>
                    {item.status.message}
                  </span>
                </div>
                */}

                {/* PROMINENT Media Display */}
                {item.displayUrl ? (
                  post.post_type === 'video' || item.originalUrl.includes('mp4') || item.originalUrl.includes('webm') ? (
                    <div className="relative group">
                      <video
                        src={item.displayUrl}
                        className="w-full max-h-[600px] object-contain bg-black cursor-pointer rounded-lg"
                        controls
                        preload="metadata"
                        poster=""
                        onError={(e) => {
                          console.error('Video failed to load:', item.displayUrl);
                          const target = e.target as HTMLVideoElement;
                          target.style.display = 'none';
                          const errorDiv = target.nextElementSibling as HTMLElement;
                          if (errorDiv) errorDiv.style.display = 'block';
                        }}
                      />
                      <div 
                        className="hidden w-full min-h-80 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 border-2 border-dashed border-gray-300"
                      >
                        <div className="text-center p-8">
                          <Play className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                          <p className="text-xl font-medium mb-2">Video unavailable</p>
                          <p className="text-sm text-gray-500 mb-4">The video could not be loaded</p>
                          <a 
                            href={item.originalUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                            <span>View original</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="relative group">
                      <img
                        src={item.displayUrl}
                        alt={`Post media ${index + 1}`}
                        className="w-full max-h-[600px] object-contain cursor-pointer hover:shadow-2xl transition-all duration-300 bg-gray-50 rounded-lg"
                        onClick={() => item.displayUrl && window.open(item.displayUrl, '_blank')}
                        onLoad={() => console.log('✅ Image loaded successfully:', item.displayUrl)}
                        onError={(e) => {
                          console.error('❌ Image failed to load:', item.displayUrl);
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const errorDiv = target.nextElementSibling as HTMLElement;
                          if (errorDiv) errorDiv.style.display = 'block';
                        }}
                      />
                      {/* Prominent zoom indicator on hover */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="bg-white bg-opacity-95 rounded-full p-3 shadow-lg">
                          <ExternalLink className="w-6 h-6 text-gray-700" />
                        </div>
                      </div>
                      
                      <div 
                        className="hidden w-full min-h-80 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 border-2 border-dashed border-gray-300"
                      >
                        <div className="text-center p-8">
                          <Image className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                          <p className="text-xl font-medium mb-2">Image unavailable</p>
                          <p className="text-sm text-gray-500 mb-4">The image could not be loaded</p>
                          {item.originalUrl && (
                            <a 
                              href={item.originalUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                              <ExternalLink className="w-4 h-4" />
                              <span>Try original URL</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  // PROMINENT No displayable URL available
                  <div className="w-full min-h-80 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 border-2 border-dashed border-gray-300">
                    <div className="text-center p-8">
                      <AlertTriangle className="w-20 h-20 mx-auto mb-6 text-red-400" />
                      <p className="text-2xl font-medium text-red-600 mb-3">Media unavailable</p>
                      <p className="text-sm text-gray-500 mb-6 max-w-sm">
                        {item.status.status === 'blob' 
                          ? 'This was a temporary blob URL that expired when the scraping session ended.' 
                          : 'This media requires LinkedIn authentication to view.'}
                      </p>
                      {item.originalUrl && !item.originalUrl.startsWith('blob:') && (
                        <a 
                          href={item.originalUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-lg"
                        >
                          <ExternalLink className="w-5 h-5" />
                          <span>Try original URL</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Debug Info - HIDDEN for professional look */}
                {/* Uncomment the section below if you need to debug issues */}
                {/*
                <details className="px-6 mt-4 text-xs text-gray-500">
                  <summary className="cursor-pointer hover:text-gray-700 transition-colors font-medium">🔍 Debug Info</summary>
                  <div className="mt-3 bg-gray-50 p-4 rounded-lg text-xs font-mono border">
                    <div className="space-y-2">
                      <p><strong>Original:</strong> <span className="break-all text-blue-600">{item.originalUrl}</span></p>
                      <p><strong>Local:</strong> <span className="text-green-600">{item.localPath || 'None'}</span></p>
                      <p><strong>Display:</strong> <span className="break-all text-purple-600">{item.displayUrl || 'None'}</span></p>
                      <p><strong>Status:</strong> <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        item.status.status === 'local' ? 'bg-green-100 text-green-800' :
                        item.status.status === 'blob' ? 'bg-red-100 text-red-800' :
                        item.status.status === 'cdn' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                      }`}>{item.status.status}</span></p>
                    </div>
                  </div>
                </details>
                */}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Engagement Footer */}
      {post.engagement && Object.keys(post.engagement).length > 0 && (
        <div className="px-6 pb-6">
          <div className="flex items-center space-x-4 pt-4 border-t border-gray-100">
            {post.engagement.reactions && (
              <div className="flex items-center space-x-1 text-sm text-gray-600">
                <Heart className="w-4 h-4 text-red-500" />
                <span>{post.engagement.reactions}</span>
              </div>
            )}
            {post.engagement.comments && (
              <div className="flex items-center space-x-1 text-sm text-gray-600">
                <MessageCircle className="w-4 h-4 text-blue-500" />
                <span>{post.engagement.comments}</span>
              </div>
            )}
            <div className="flex-1"></div>
            <button 
              onClick={() => post.post_url && window.open(post.post_url, '_blank')}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={!post.post_url}
            >
              <Share className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}