// frontend/App.tsx
import React, { useState } from "react";
import URLForm from "./components/URLForm";
import PostList from "./components/PostList";
import { scrapePosts } from "./services/api";

// Updated interface to include missing fields
interface Post {
  post_number: number;
  content: string;
  timestamp?: string;
  engagement?: Record<string, string>;
  post_type?: string;
  media_urls?: string[];  // Added this!
  local_media_paths?: string[];  // Added this!
  post_url?: string;      // Added this!
}

// Debug component to check data structure
const DebugDataViewer = ({ posts }: { posts: Post[] }) => {
  if (posts.length === 0) return null;
  
  return (
    <div className="bg-gray-100 p-4 rounded-lg mb-4">
      <h3 className="text-lg font-bold mb-2">🔍 Debug: Post Data Structure</h3>
      <p className="text-sm mb-2">Number of posts: {posts.length}</p>
      
      <div>
        <h4 className="font-semibold mb-2">First post structure:</h4>
        <pre className="bg-white p-2 rounded text-xs overflow-auto max-h-40">
          {JSON.stringify(posts[0], null, 2)}
        </pre>
        
        <div className="mt-4 text-sm">
          <h4 className="font-semibold">Checking required fields:</h4>
          <ul className="list-disc list-inside mt-2">
            <li>Has post_url: {posts[0].post_url ? '✅ Yes' : '❌ No'}</li>
            <li>Has media_urls: {posts[0].media_urls ? '✅ Yes' : '❌ No'}</li>
            <li>Media URLs count: {posts[0].media_urls?.length || 0}</li>
            <li>Post type: {posts[0].post_type || 'undefined'}</li>
          </ul>
          
          {posts[0].media_urls && posts[0].media_urls.length > 0 && (
            <div className="mt-2">
              <h5 className="font-medium">Media URLs:</h5>
              <ul className="text-xs">
                {posts[0].media_urls.map((url: string, index: number) => (
                  <li key={index} className="truncate">
                    {index + 1}. {url}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle file upload (NEW FEATURE)
  const handleFileUpload = (uploadedPosts: Post[]) => {
    console.log('🔍 DEBUG - handleFileUpload called');
    console.log('🔍 DEBUG - Uploaded posts:', uploadedPosts);
    console.log('🔍 DEBUG - Posts type:', typeof uploadedPosts);
    console.log('🔍 DEBUG - Is array:', Array.isArray(uploadedPosts));
    
    if (uploadedPosts && uploadedPosts.length > 0) {
      console.log('🔍 DEBUG - First post:', uploadedPosts[0]);
      console.log('🔍 DEBUG - Posts count:', uploadedPosts.length);
    } else {
      console.log('❌ DEBUG - No posts or empty array');
    }
    
    setPosts(uploadedPosts || []);
    setError(null);
  };

  // Updated to handle new parameters
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
      // Check if your API supports the new parameters
      const data = await scrapePosts(email, password, [url], scrolls, maxPosts);
      
      console.log('🔍 DEBUG - API Response:', data);
      
      const postsData = data.posts || [];
      console.log('🔍 DEBUG - Posts from API:', postsData);
      
      setPosts(postsData);
    } catch (err) {
      console.error('❌ API Error:', err);
      setError("Failed to fetch posts. Please check your credentials or try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* FIXED: Removed min-h-screen constraint to allow natural height expansion */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header - reduced bottom margin */}
        <header className="text-center mb-4">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            LinkedIn Post Viewer
          </h1>
          <p className="text-gray-600">Extract and analyze LinkedIn posts with media support</p>
        </header>

        {/* FIXED: Reduced spacing and margins throughout */}
        <div className="max-w-4xl mx-auto mb-6">
          {/* Debug viewer - HIDDEN for professional look */}
          {/* Uncomment if you need to debug data structure issues */}
          {/* {posts.length > 0 && <DebugDataViewer posts={posts} />} */}

          {/* URL Form with file upload support */}
          <URLForm 
            onSubmit={handleFetchPosts}
            onFileUpload={handleFileUpload}  // Added this prop!
            loading={loading}
          />

          {/* Loading state - reduced margin */}
          {loading && (
            <div className="text-center mt-4">
              <div className="inline-flex items-center space-x-2">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-gray-600">Scraping posts...</span>
              </div>
            </div>
          )}

          {/* Error state - reduced margin */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
              <div className="flex items-center space-x-2">
                <span className="text-red-600 text-xl">❌</span>
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Posts use full screen width */}
        {!loading && !error && <PostList posts={posts} />}
      </div>
    </div>
  );
};

export default App;