// frontend/components/PostList.tsx
import React, { useState, useEffect, useRef } from "react";
import PostCard from "./PostCard";
import { Search, Download, Filter, ArrowUp, Clock, Grid3x3, Layers } from "lucide-react";

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
  posts: Post[];
}

const PostList: React.FC<Props> = ({ posts }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [currentPostIndex, setCurrentPostIndex] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [viewMode, setViewMode] = useState<'single' | 'grid'>('single');
  const postRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lastScrollTime = useRef(Date.now());

  // Sort posts by timestamp (most recent first)
  const sortedPosts = [...posts].sort((a, b) => {
    if (!a.timestamp || !b.timestamp) return 0;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  // Filter posts based on search and type
  const filteredPosts = sortedPosts.filter(post => {
    const matchesSearch = post.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || post.post_type === selectedType;
    return matchesSearch && matchesType;
  });

  // Export functionality
  const exportPosts = () => {
    const dataStr = JSON.stringify(filteredPosts, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `linkedin_posts_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  // Scroll to specific post
  const scrollToPost = (index: number) => {
    if (postRefs.current[index]) {
      postRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setCurrentPostIndex(index);
    }
  };

  // Handle scroll events to update current post index
  useEffect(() => {
    const handleScroll = () => {
      // Debounce scroll events
      if (Date.now() - lastScrollTime.current < 100) return;
      lastScrollTime.current = Date.now();

      const scrollPosition = window.scrollY + window.innerHeight / 2;
      
      for (let i = 0; i < postRefs.current.length; i++) {
        const element = postRefs.current[i];
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition <= offsetTop + offsetHeight) {
            setCurrentPostIndex(i);
            break;
          }
        }
      }

      // Auto-hide controls when scrolling
      setShowControls(false);
      clearTimeout((window as any).controlsTimeout);
      (window as any).controlsTimeout = setTimeout(() => {
        setShowControls(true);
      }, 2000);
    };

    if (viewMode === 'single') {
      window.addEventListener('scroll', handleScroll);
      return () => {
        window.removeEventListener('scroll', handleScroll);
        clearTimeout((window as any).controlsTimeout);
      };
    }
  }, [viewMode, postRefs.current.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (viewMode !== 'single') return;
      
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        if (currentPostIndex < filteredPosts.length - 1) {
          scrollToPost(currentPostIndex + 1);
        }
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        if (currentPostIndex > 0) {
          scrollToPost(currentPostIndex - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentPostIndex, filteredPosts.length, viewMode]);

  if (!posts.length) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No posts available</h3>
          <p className="text-gray-600 max-w-md mx-auto">
            Start by entering LinkedIn credentials and a profile URL to scrape posts, or upload a previously saved JSON file.
          </p>
        </div>
      </div>
    );
  }

  // Grid view (compact)
  if (viewMode === 'grid') {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Controls Bar */}
        <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200 -mx-4 px-4 pb-4 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 pt-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search posts..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="px-4 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="text">Text</option>
              <option value="image">Image</option>
              <option value="video">Video</option>
              <option value="article">Article</option>
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('single')}
                className="px-4 py-2.5 bg-[#0077b5] text-white rounded-md hover:bg-[#005885] transition-colors flex items-center gap-2"
              >
                <Layers className="w-5 h-5" />
                <span>Single View</span>
              </button>
              <button
                onClick={exportPosts}
                className="px-4 py-2.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Download className="w-5 h-5" />
                <span>Export</span>
              </button>
            </div>
          </div>
          <div className="text-sm text-gray-600 mt-2">
            {filteredPosts.length} posts (sorted by most recent)
          </div>
        </div>

        {/* Grid of posts */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post, index) => (
            <div 
              key={`${post.post_number}-${post.timestamp}`}
              className="cursor-pointer"
              onClick={() => {
                setViewMode('single');
                setTimeout(() => scrollToPost(index), 100);
              }}
            >
              <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden h-64">
                <div className="relative h-32 bg-gradient-to-br from-blue-400 to-indigo-600">
                  {post.media_urls && post.media_urls[0] && (
                    <img
                      src={post.media_urls[0]}
                      alt="Thumbnail"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                </div>
                <div className="p-4">
                  <p className="text-sm text-gray-600 mb-2">{post.author_name || 'LinkedIn User'}</p>
                  <p className="text-gray-800 line-clamp-3">{post.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Single post view (full screen)
  return (
    <>
      {/* Floating Controls */}
      <div className={`fixed top-4 right-4 z-50 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-4 space-y-3">
          {/* View Mode Toggle */}
          <button
            onClick={() => setViewMode('grid')}
            className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors flex items-center justify-center gap-2"
          >
            <Grid3x3 className="w-4 h-4" />
            <span className="text-sm">Grid View</span>
          </button>

          {/* Post Navigator */}
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-2">
              Post {currentPostIndex + 1} of {filteredPosts.length}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => scrollToPost(Math.max(0, currentPostIndex - 1))}
                disabled={currentPostIndex === 0}
                className="flex-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-sm"
              >
                Previous
              </button>
              <button
                onClick={() => scrollToPost(Math.min(filteredPosts.length - 1, currentPostIndex + 1))}
                disabled={currentPostIndex === filteredPosts.length - 1}
                className="flex-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-sm"
              >
                Next
              </button>
            </div>
          </div>

          {/* Quick Filters */}
          <input
            type="text"
            placeholder="Search..."
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          {/* Export */}
          <button
            onClick={exportPosts}
            className="w-full px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-3 h-3" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Timeline Indicator */}
      <div className="fixed left-4 top-1/2 -translate-y-1/2 z-40 hidden lg:block">
        <div className="relative">
          <div className="absolute left-1/2 -translate-x-1/2 h-64 w-0.5 bg-gray-300"></div>
          {filteredPosts.slice(0, 10).map((_, index) => (
            <button
              key={index}
              onClick={() => scrollToPost(index)}
              className={`absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentPostIndex
                  ? 'bg-[#0077b5] scale-150'
                  : 'bg-gray-400 hover:bg-gray-600'
              }`}
              style={{ top: `${(index / Math.min(10, filteredPosts.length - 1)) * 256}px` }}
              title={`Post ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Posts Container */}
      <div className="relative">
        {filteredPosts.length > 0 ? (
          filteredPosts.map((post, index) => (
            <div
              key={`${post.post_number}-${post.timestamp}`}
              ref={el => {
                postRefs.current[index] = el;
              }}
              className="min-h-screen"
            >
              <PostCard
                post={post}
                isLast={index === filteredPosts.length - 1}
                onScrollNext={() => scrollToPost(index + 1)}
              />
            </div>
          ))
        ) : (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No posts match your filters</h3>
              <p className="text-gray-600">Try adjusting your search criteria.</p>
            </div>
          </div>
        )}
      </div>

      {/* Scroll to Top Button */}
      {currentPostIndex > 0 && (
        <button
          onClick={() => scrollToPost(0)}
          className="fixed bottom-8 right-8 z-40 w-12 h-12 bg-[#0077b5] text-white rounded-full shadow-lg hover:bg-[#005885] transition-all duration-300 flex items-center justify-center"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </>
  );
};

export default PostList;