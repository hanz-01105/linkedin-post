// frontend/components/URLForm.tsx
import React, { useState } from "react";
import { User, Settings, Search, Loader2, Upload, AlertCircle } from "lucide-react";

interface Props {
  onSubmit: (email: string, password: string, url: string, scrolls: number, maxPosts: number) => void;
  onFileUpload?: (posts: any[]) => void;
  loading?: boolean;
}

const URLForm: React.FC<Props> = ({ onSubmit, onFileUpload, loading = false }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [url, setUrl] = useState("");
  const [scrolls, setScrolls] = useState(10);
  const [maxPosts, setMaxPosts] = useState(50);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !email.trim() || !password.trim()) return;
    onSubmit(email, password, url, scrolls, maxPosts);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    console.log('🔍 DEBUG - File selected:', file);
    
    if (file) {
      console.log('🔍 DEBUG - File name:', file.name);
      console.log('🔍 DEBUG - File type:', file.type);
      console.log('🔍 DEBUG - File size:', file.size);
      
      if (file.type === 'application/json' && onFileUpload) {
        try {
          console.log('🔍 DEBUG - Reading file...');
          const text = await file.text();
          console.log('🔍 DEBUG - File content length:', text.length);
          console.log('🔍 DEBUG - File content preview:', text.substring(0, 200));
          
          const jsonData = JSON.parse(text);
          console.log('🔍 DEBUG - Parsed JSON:', jsonData);
          console.log('🔍 DEBUG - JSON type:', typeof jsonData);
          console.log('🔍 DEBUG - Is array:', Array.isArray(jsonData));
          
          // Handle different JSON structures
          let posts: any[] = [];  // Explicitly type as any[]
          if (Array.isArray(jsonData)) {
            // Direct array of posts
            posts = jsonData;
          } else if (jsonData.posts && Array.isArray(jsonData.posts)) {
            // Wrapped in object with metadata (your case)
            posts = jsonData.posts;
            console.log('🔍 DEBUG - Found posts in wrapped object:', posts.length);
          } else {
            console.log('❌ DEBUG - Unknown JSON structure');
          }
          
          console.log('🔍 DEBUG - Final posts array:', posts);
          console.log('🔍 DEBUG - Calling onFileUpload...');
          
          onFileUpload(posts);
        } catch (error) {
          console.error('❌ Error loading posts:', error);
          alert('Error loading JSON file. Please check the file format.');
        }
      } else {
        console.log('❌ Invalid file type or no onFileUpload function');
        alert('Please select a valid JSON file.');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* File Upload Section */}
      {onFileUpload && (
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-6 shadow-lg">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Upload className="w-5 h-5 mr-2 text-indigo-600" />
            Load Scraped Posts
          </h2>
          
          <div className="flex items-center space-x-4">
            <label className="flex-1">
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-colors"
              />
            </label>
            <div className="text-sm text-gray-600">
              Upload JSON file from Python scraper
            </div>
          </div>
        </div>
      )}

      {/* Scraping Configuration */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200/50 p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Settings className="w-5 h-5 mr-2 text-indigo-600" />
          Scraping Configuration
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                LinkedIn Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@domain.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                required
                disabled={loading}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                LinkedIn Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              LinkedIn Profile URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://linkedin.com/in/username"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              required
              disabled={loading}
            />
          </div>

          {/* Advanced Options Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            {showAdvanced ? 'Hide' : 'Show'} Advanced Options
          </button>

          {/* Advanced Options */}
          {showAdvanced && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Scrolls
                </label>
                <input
                  type="number"
                  value={scrolls}
                  onChange={(e) => setScrolls(parseInt(e.target.value) || 10)}
                  min="1"
                  max="50"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">More scrolls = more posts loaded</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Posts to Extract
                </label>
                <input
                  type="number"
                  value={maxPosts}
                  onChange={(e) => setMaxPosts(parseInt(e.target.value) || 50)}
                  min="1"
                  max="200"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">Limit the number of posts processed</p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !email.trim() || !password.trim() || !url.trim()}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Scraping in progress...</span>
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                <span>Start Scraping</span>
              </>
            )}
          </button>

          {/* Warning Note */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">Important Notes:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Make sure your Python scraper script is running and accessible</li>
                  <li>LinkedIn may require CAPTCHA or 2FA verification during login</li>
                  <li>Respect LinkedIn's terms of service and rate limits</li>
                  <li>Only scrape public profiles you have permission to view</li>
                </ul>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default URLForm;