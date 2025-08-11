# main.py
from fastapi import FastAPI, HTTPException, Body, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, validator
from typing import List, Optional
import logging
from datetime import datetime
import os
import json

# Import your scraper functions
from .viewer import setup_driver, login_linkedin, scrape_posts

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="LinkedIn Post Viewer API",
    description="API for scraping and viewing LinkedIn posts from public profiles",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],  # Add your frontend dev URLs
    allow_credentials=True,
    allow_methods=["*"],  # Or restrict if you want
    allow_headers=["*"],
)
# Request/Response models
class ScrapeRequest(BaseModel):
    email: str
    password: str
    profile_urls: List[str]  # Support multiple profiles
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
    timestamp: str
    engagement: dict
    post_type: str
    profile_url: str

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
                    
                    # Add profile URL to each post
                    for post in posts:
                        post['profile_url'] = profile_url
                    
                    all_posts.extend(posts)
                    scraped_profiles.append(profile_url)
                    logger.info(f"Scraped {len(posts)} posts from {profile_url}")
                    
                except Exception as profile_error:
                    logger.error(f"Error scraping {profile_url}: {str(profile_error)}")
                    continue
            
            # Sort posts by timestamp (most recent first)
            all_posts = sorted(all_posts, key=lambda x: x.get('timestamp', ''), reverse=True)
            
            # Save to file in background
            background_tasks.add_task(save_scrape_results, session_id, all_posts, scraped_profiles)
            
            return ScrapeResponse(
                success=True,
                posts=all_posts,
                total_posts=len(all_posts),
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
            driver.quit()

@app.get("/sessions")
def get_scrape_sessions():
    """Get list of previous scrape sessions"""
    sessions_dir = "linkedin_posts"
    if not os.path.exists(sessions_dir):
        return {"sessions": []}
    
    sessions = []
    for filename in os.listdir(sessions_dir):
        if filename.endswith('.json'):
            sessions.append({
                "session_id": filename.replace('.json', ''),
                "filename": filename
            })
    
    return {"sessions": sessions}

@app.get("/session/{session_id}")
def get_session_data(session_id: str):
    """Get data from a specific scrape session"""
    filename = f"linkedin_posts/linkedin_posts_{session_id}.json"
    
    if not os.path.exists(filename):
        raise HTTPException(status_code=404, detail="Session not found")
    
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return {"session_id": session_id, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading session data: {str(e)}")

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
    uvicorn.run(app, host="0.0.0.0", port=8000)