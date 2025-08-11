// frontend/components/PostList.tsx
import React, { useState } from "react";
import PostCard from "./PostCard";
import { Search, Download, Eye, Filter } from "lucide-react";

interface Post {
  post_number: number;
  content: string;
  timestamp?: string;
  engagement?: Record<string, string>;
  post_type?: string;
  media_urls?: string[];
  post_url?: string;
}

interface Props {
  posts: Post[];
}

const PostList: React.FC<Props> = ({ posts }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const postsPerPage = 6;

  // Filter posts based on search and type
  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || post.post_type === selectedType;
    return matchesSearch && matchesType;
  });

  // Pagination
  const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
  const currentPosts = filteredPosts.slice(
    (currentPage - 1) * postsPerPage,
    currentPage * postsPerPage
  );

  // Export functionality
  const exportPosts = () => {
    const dataStr = JSON.stringify(filteredPosts, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `linkedin_posts_filtered_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  if (!posts.length) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Search className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No posts loaded</h3>
        <p className="text-gray-500 mb-4">
          Run the Python scraper to generate posts, or upload a JSON file.
        </p>
        <div className="bg-gray-50 rounded-lg p-4 max-w-md mx-auto text-left">
          <p className="text-sm text-gray-600 mb-2"><strong>Steps:</strong></p>
          <ol className="text-sm text-gray-600 space-y-1">
            <li>1. Run your Python scraper script</li>
            <li>2. Find the generated JSON file</li>
            <li>3. Upload or integrate the data</li>
            <li>4. View and interact with posts!</li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-6 shadow-lg">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search posts..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="sm:w-48">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors appearance-none"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="text">Text Posts</option>
                <option value="image">Image Posts</option>
                <option value="video">Video Posts</option>
                <option value="article">Article Posts</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Eye className="w-4 h-4" />
              <span>{filteredPosts.length} posts</span>
            </div>
            <button
              onClick={exportPosts}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 shadow-lg hover:shadow-xl"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Posts Grid */}
      {filteredPosts.length > 0 ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {currentPosts.map((post) => (
              <PostCard key={`${post.post_number}-${post.timestamp}`} post={post} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 mt-8">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                Previous
              </button>
              
              <div className="flex space-x-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let page;
                  if (totalPages <= 5) {
                    page = i + 1;
                  } else if (currentPage <= 3) {
                    page = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    page = totalPages - 4 + i;
                  } else {
                    page = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-10 h-10 rounded-lg transition-colors ${
                        currentPage === page
                          ? 'bg-indigo-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No posts match your filters</h3>
          <p className="text-gray-500">Try adjusting your search criteria or post type filter.</p>
        </div>
      )}
    </div>
  );
};

export default PostList;