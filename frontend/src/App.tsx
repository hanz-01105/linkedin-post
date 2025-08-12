// frontend/App.tsx
import React, { useState } from "react";
import URLForm from "./components/URLForm";
import PostList from "./components/PostList";
import { scrapePosts } from "./services/api";
import { Linkedin } from "lucide-react";

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

const App: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(true);

  // Handle file upload
  const handleFileUpload = (uploadedPosts: Post[]) => {
    console.log('Processing uploaded posts:', uploadedPosts.length);
    
    // Extract author info from profile URL if available
    const enrichedPosts = uploadedPosts.map(post => {
      // Try to extract username from profile URL
      if (post.profile_url && !post.author_name) {
        const match = post.profile_url.match(/linkedin\.com\/in\/([^\/]+)/);
        if (match) {
          post.author_name = match[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
      }
      return post;
    });
    
    setPosts(enrichedPosts);
    setError(null);
    setShowForm(false); // Hide form after successful upload
  };

  // Handle API fetch
  const handleFetchPosts = async (
    email: string,
    password: string,
    url: string,
    scrolls: number = 10,
    maxPosts: number = 50
  ) => {
    setLoading(true);
    setError(null);
    setPosts([]);

    try {
      const data = await scrapePosts(email, password, [url], scrolls, maxPosts);
      console.log('API Response:', data);
      
      const postsData = data.posts || [];
      
      // Extract author info from URL
      const enrichedPosts = postsData.map((post: Post) => {
        if (url && !post.author_name) {
          const match = url.match(/linkedin\.com\/in\/([^\/]+)/);
          if (match) {
            post.author_name = match[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          }
        }
        post.profile_url = url;
        return post;
      });
      
      setPosts(enrichedPosts);
      setShowForm(false); // Hide form after successful fetch
    } catch (err) {
      console.error('API Error:', err);
      setError("Failed to fetch posts. Please check your credentials or try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Linkedin className="w-8 h-8 text-[#0077b5]" />
              <h1 className="text-xl font-semibold text-gray-900">LinkedIn Post Viewer</h1>
            </div>
            {posts.length > 0 && (
              <button
                onClick={() => setShowForm(!showForm)}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                {showForm ? 'Hide Settings' : 'Show Settings'}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Form Section - Collapsible */}
        {showForm && (
          <div className="mb-8">
            <URLForm 
              onSubmit={handleFetchPosts}
              onFileUpload={handleFileUpload}
              loading={loading}
            />
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 border-4 border-gray-200 border-t-[#0077b5] rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600">Scraping LinkedIn posts...</p>
            <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-red-800">Error loading posts</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Posts Grid - Similar to MPSYCH News Section */}
        {!loading && !error && posts.length > 0 && (
          <PostList posts={posts} />
        )}

        {/* Empty State when no posts and not loading */}
        {!loading && !error && posts.length === 0 && !showForm && (
          <div className="text-center py-20">
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-[#0077b5] hover:bg-[#005885] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0077b5] transition-colors"
            >
              Get Started
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500">
            LinkedIn Post Viewer - Extract and analyze public LinkedIn posts
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;