# main.py
from fastapi import FastAPI, HTTPException, Body, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, validator
from typing import List, Optional
import logging
from datetime import datetime
import os
import json

# Import your scraper functions from viewer.py
from viewer import setup_driver, login_linkedin, scrape_posts

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="LinkedIn Post Viewer API",
    description="API for scraping and viewing LinkedIn posts from public profiles",
    version="1.0.0"
)

# CORS middleware - ensure all frontend URLs are included
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",  # Add alternative ports
        "*"  # Allow all origins for development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files directory for media
if os.path.exists("linkedin_posts"):
    app.mount("/linkedin_posts", StaticFiles(directory="linkedin_posts"), name="linkedin_posts")

# Request/Response models
class ScrapeRequest(BaseModel):
    email: str
    password: str
    profile_urls: List[str]
    scrolls: int = 10
    max_posts: int = 50
    
    @validator('profile_urls')
    def validate_linkedin_urls(cls, v):
        for url in v:
            if 'linkedin.com' not in url:
                raise ValueError('All URLs must be LinkedIn profile URLs')
        return v

class PostData(BaseModel):
    post_number: int
    content: str
    timestamp: Optional[str] = None
    engagement: Optional[dict] = {}
    post_type: Optional[str] = "text"
    media_urls: Optional[List[str]] = []
    local_media_paths: Optional[List[str]] = []
    post_url: Optional[str] = None
    profile_url: Optional[str] = None
    author_name: Optional[str] = None
    author_avatar: Optional[str] = None

class ScrapeResponse(BaseModel):
    success: bool
    posts: List[PostData]
    total_posts: int
    profiles_scraped: List[str]
    error: Optional[str] = None

# In-memory storage for demo (use Redis or DB in production)
scrape_sessions = {}

@app.get("/")
def root():
    """Health check endpoint"""
    return {
        "message": "LinkedIn Post Viewer API", 
        "version": "1.0.0",
        "status": "running"
    }

@app.post("/scrape", response_model=ScrapeResponse)
async def scrape_linkedin_posts(request: ScrapeRequest, background_tasks: BackgroundTasks):
    """
    Scrape LinkedIn posts from one or more profiles
    """
    session_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    try:
        logger.info(f"Starting scrape session {session_id} for {len(request.profile_urls)} profiles")
        
        all_posts = []
        scraped_profiles = []
        driver = None
        
        try:
            # Setup driver
            driver = setup_driver(headless=True)  # Use headless for API
            
            # Login once
            login_linkedin(driver, request.email, request.password)
            logger.info("Successfully logged into LinkedIn")
            
            # Scrape each profile
            for profile_url in request.profile_urls:
                try:
                    logger.info(f"Scraping profile: {profile_url}")
                    posts = scrape_posts(driver, profile_url, request.scrolls, request.max_posts)
                    
                    # Ensure each post has the profile URL
                    for post in posts:
                        if not post.get('profile_url'):
                            post['profile_url'] = profile_url
                    
                    all_posts.extend(posts)
                    scraped_profiles.append(profile_url)
                    logger.info(f"Scraped {len(posts)} posts from {profile_url}")
                    
                except Exception as profile_error:
                    logger.error(f"Error scraping {profile_url}: {str(profile_error)}")
                    continue
            
            # Sort posts by timestamp (most recent first)
            def get_timestamp(post):
                ts = post.get('timestamp', '')
                if not ts:
                    return datetime.min
                try:
                    return datetime.fromisoformat(ts.replace('Z', '+00:00'))
                except:
                    return datetime.min
            
            all_posts = sorted(all_posts, key=get_timestamp, reverse=True)
            
            # Save to file in background
            background_tasks.add_task(save_scrape_results, session_id, all_posts, scraped_profiles)
            
            # Convert to PostData models for response
            post_models = []
            for post in all_posts:
                try:
                    post_model = PostData(**post)
                    post_models.append(post_model)
                except Exception as e:
                    logger.warning(f"Could not convert post to model: {e}")
                    # Add with defaults
                    post_model = PostData(
                        post_number=post.get('post_number', 0),
                        content=post.get('content', ''),
                        timestamp=post.get('timestamp'),
                        engagement=post.get('engagement', {}),
                        post_type=post.get('post_type', 'text'),
                        media_urls=post.get('media_urls', []),
                        local_media_paths=post.get('local_media_paths', []),
                        post_url=post.get('post_url'),
                        profile_url=post.get('profile_url'),
                        author_name=post.get('author_name'),
                        author_avatar=post.get('author_avatar')
                    )
                    post_models.append(post_model)
            
            return ScrapeResponse(
                success=True,
                posts=post_models,
                total_posts=len(post_models),
                profiles_scraped=scraped_profiles
            )
            
        except Exception as e:
            logger.error(f"Scraping error: {str(e)}")
            return ScrapeResponse(
                success=False,
                posts=[],
                total_posts=0,
                profiles_scraped=[],
                error=str(e)
            )
            
    except Exception as e:
        logger.error(f"Request processing error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
        
    finally:
        if driver:
            try:
                driver.quit()
            except:
                pass

@app.get("/sessions")
def get_scrape_sessions():
    """Get list of previous scrape sessions"""
    sessions_dir = "linkedin_posts"
    if not os.path.exists(sessions_dir):
        return {"sessions": []}
    
    sessions = []
    for filename in os.listdir(sessions_dir):
        if filename.endswith('.json'):
            filepath = os.path.join(sessions_dir, filename)
            try:
                # Get file modification time
                mtime = os.path.getmtime(filepath)
                sessions.append({
                    "session_id": filename.replace('linkedin_posts_', '').replace('.json', ''),
                    "filename": filename,
                    "timestamp": datetime.fromtimestamp(mtime).isoformat()
                })
            except:
                continue
    
    # Sort by timestamp (most recent first)
    sessions.sort(key=lambda x: x['timestamp'], reverse=True)
    return {"sessions": sessions}

@app.get("/session/{session_id}")
def get_session_data(session_id: str):
    """Get data from a specific scrape session"""
    # Try different filename patterns
    filenames = [
        f"linkedin_posts/linkedin_posts_{session_id}.json",
        f"linkedin_posts/{session_id}.json",
        f"linkedin_posts/session_{session_id}.json"
    ]
    
    for filename in filenames:
        if os.path.exists(filename):
            try:
                with open(filename, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                # Ensure proper structure
                if isinstance(data, list):
                    # Old format - just array of posts
                    return {
                        "session_id": session_id,
                        "data": {
                            "posts": data,
                            "total_posts": len(data),
                            "profiles_scraped": []
                        }
                    }
                else:
                    # New format with metadata
                    return {"session_id": session_id, "data": data}
                    
            except Exception as e:
                logger.error(f"Error reading session data: {str(e)}")
                continue
    
    raise HTTPException(status_code=404, detail="Session not found")

@app.get("/media/{session_id}/{filename}")
async def serve_media_file(session_id: str, filename: str):
    """Serve downloaded media files"""
    file_path = f"linkedin_posts/media_{session_id}/{filename}"
    
    logger.info(f"🔍 Looking for media file: {file_path}")
    
    if not os.path.exists(file_path):
        logger.error(f"❌ Media file not found: {file_path}")
        
        # Check if media directory exists
        media_dir = f"linkedin_posts/media_{session_id}"
        if os.path.exists(media_dir):
            files = os.listdir(media_dir)
            logger.info(f"📁 Files in {media_dir}: {files}")
        else:
            logger.info(f"📁 Directory doesn't exist: {media_dir}")
            
        raise HTTPException(status_code=404, detail=f"Media file not found: {filename}")
    
    logger.info(f"✅ Serving media file: {file_path}")
    return FileResponse(file_path)

def save_scrape_results(session_id: str, posts: List[dict], profiles: List[str]):
    """Background task to save scrape results"""
    try:
        os.makedirs("linkedin_posts", exist_ok=True)
        filename = f"linkedin_posts/linkedin_posts_{session_id}.json"
        
        data = {
            "session_id": session_id,
            "timestamp": datetime.now().isoformat(),
            "profiles_scraped": profiles,
            "total_posts": len(posts),
            "posts": posts
        }
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            
        logger.info(f"Saved scrape results to {filename}")
        
    except Exception as e:
        logger.error(f"Error saving scrape results: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)