// frontend/components/PostCard.tsx
import { Calendar, Heart, MessageCircle, Share, Image, Play, FileText, ExternalLink } from "lucide-react";

interface Post {
  post_number: number;
  content: string;
  timestamp?: string;
  engagement?: Record<string, string>;
  post_type?: string;
  media_urls?: string[];
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

      {/* Media Section */}
      {post.media_urls && post.media_urls.length > 0 && (
        <div className="px-6 pb-4">
          <div className="grid grid-cols-1 gap-3">
            {post.media_urls.map((url, index) => (
              <div key={index} className="relative">
                {post.post_type === 'image' ? (
                  <div className="relative">
                    <img
                      src={url}
                      alt={`Post media ${index + 1}`}
                      className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(url, '_blank')}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        if (target.nextElementSibling) {
                          (target.nextElementSibling as HTMLElement).style.display = 'block';
                        }
                      }}
                    />
                    <div 
                      className="hidden w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 border-2 border-dashed border-gray-300"
                    >
                      <div className="text-center">
                        <Image className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm">Image unavailable</p>
                        <a 
                          href={url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-indigo-600 hover:underline"
                        >
                          View original
                        </a>
                      </div>
                    </div>
                  </div>
                ) : post.post_type === 'video' ? (
                  <div className="relative">
                    <video
                      src={url}
                      className="w-full h-48 object-cover rounded-lg"
                      controls
                      onError={(e) => {
                        const target = e.target as HTMLVideoElement;
                        target.style.display = 'none';
                        if (target.nextElementSibling) {
                          (target.nextElementSibling as HTMLElement).style.display = 'block';
                        }
                      }}
                    />
                    <div 
                      className="hidden w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 border-2 border-dashed border-gray-300"
                    >
                      <div className="text-center">
                        <Play className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm">Video unavailable</p>
                        <a 
                          href={url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-indigo-600 hover:underline"
                        >
                          View original
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4 border">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <a 
                        href={url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-indigo-600 hover:underline truncate"
                      >
                        {url}
                      </a>
                    </div>
                  </div>
                )}
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