import os
import time
import json
import getpass
import requests
import hashlib
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException

def setup_driver(headless=False):
    """Setup Chrome driver with anti-detection tweaks."""
    options = Options()
    options.add_argument("--start-maximized")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option('useAutomationExtension', False)

    if headless:
        options.add_argument("--headless=new")

    chromedriver_path = os.path.join(os.path.dirname(__file__), "chromedriver")
    service = Service(executable_path=chromedriver_path)

    driver = webdriver.Chrome(service=service, options=options)
    driver.execute_script(
        "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
    )

    return driver

def login_linkedin(driver, email, password):
    """Login to LinkedIn with updated selectors and explicit URL."""
    driver.get("https://www.linkedin.com/login")

    try:
        username_input = WebDriverWait(driver, 15).until(
            EC.visibility_of_element_located((By.ID, "username"))
        )
        password_input = driver.find_element(By.ID, "password")

        username_input.clear()
        username_input.send_keys(email)
        password_input.clear()
        password_input.send_keys(password)

        try:
            sign_in_button = driver.find_element(By.XPATH, '//button[@type="submit"]')
        except NoSuchElementException:
            sign_in_button = driver.find_element(
                By.XPATH, '//button[contains(text(), "Sign in")]'
            )

        WebDriverWait(driver, 10).until(EC.element_to_be_clickable(sign_in_button))
        sign_in_button.click()

        try:
            WebDriverWait(driver, 15).until(
                EC.any_of(
                    EC.presence_of_element_located((By.CSS_SELECTOR, 'div.feed-container-theme')),
                    EC.presence_of_element_located((By.CSS_SELECTOR, 'main#main-content'))
                )
            )
            print("✅ Successfully logged in!")
        except TimeoutException:
            print("⚠️ Login submitted, but may require CAPTCHA/2FA.")
            print("   Please complete verification in the browser...")
            input("   Press Enter here after completing verification: ")

    except TimeoutException:
        print("❌ Failed to find login elements after 15 seconds.")
        raise

def download_media_file(driver, url, session_id, post_number, media_index):
    """
    FIXED: Capture media directly from DOM elements instead of trying to fetch blob URLs
    """
    try:
        # Create media directory
        media_dir = f"linkedin_posts/media_{session_id}"
        os.makedirs(media_dir, exist_ok=True)
        
        # Generate filename
        url_hash = hashlib.md5(url.encode()).hexdigest()[:8]
        
        if url.startswith('blob:'):
            print(f"🚀 DOM-based blob capture: {url[:100]}...")
            
            # CORRECT APPROACH: Find the DOM element and extract data directly
            js_dom_capture = f"""
            const blobUrl = '{url}';
            const callback = arguments[arguments.length - 1];
            
            // Find the video or image element with this blob URL
            const videoElement = document.querySelector(`video[src="${{blobUrl}}"]`);
            const imageElement = document.querySelector(`img[src="${{blobUrl}}"]`);
            
            if (videoElement) {{
                console.log('Found video element, capturing frame...');
                
                // For video: capture current frame using canvas
                try {{
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Wait for video to be ready
                    if (videoElement.readyState >= 2) {{ // HAVE_CURRENT_DATA
                        canvas.width = videoElement.videoWidth || videoElement.clientWidth || 640;
                        canvas.height = videoElement.videoHeight || videoElement.clientHeight || 480;
                        
                        // Draw current video frame to canvas
                        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
                        
                        // Convert to base64
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                        
                        callback({{
                            success: true,
                            data: dataUrl,
                            type: 'image/jpeg',
                            mediaType: 'video',
                            width: canvas.width,
                            height: canvas.height,
                            originalUrl: blobUrl
                        }});
                    }} else {{
                        // Video not ready, try to load it first
                        videoElement.addEventListener('loadeddata', function() {{
                            canvas.width = videoElement.videoWidth || 640;
                            canvas.height = videoElement.videoHeight || 480;
                            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
                            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                            
                            callback({{
                                success: true,
                                data: dataUrl,
                                type: 'image/jpeg',
                                mediaType: 'video',
                                width: canvas.width,
                                height: canvas.height,
                                originalUrl: blobUrl
                            }});
                        }}, {{ once: true }});
                        
                        // Trigger load if needed
                        if (videoElement.paused) {{
                            videoElement.load();
                        }}
                        
                        // Timeout fallback
                        setTimeout(() => {{
                            if (videoElement.readyState >= 2) {{
                                canvas.width = videoElement.videoWidth || 640;
                                canvas.height = videoElement.videoHeight || 480;
                                ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
                                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                                
                                callback({{
                                    success: true,
                                    data: dataUrl,
                                    type: 'image/jpeg',
                                    mediaType: 'video',
                                    width: canvas.width,
                                    height: canvas.height,
                                    originalUrl: blobUrl
                                }});
                            }} else {{
                                callback({{success: false, error: 'Video not ready after timeout'}});
                            }}
                        }}, 3000);
                    }}
                }} catch (videoError) {{
                    callback({{success: false, error: 'Video capture error: ' + videoError.message}});
                }}
                
            }} else if (imageElement) {{
                console.log('Found image element, capturing...');
                
                // For image: draw to canvas and extract
                try {{
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Wait for image to load if needed
                    if (imageElement.complete && imageElement.naturalWidth > 0) {{
                        canvas.width = imageElement.naturalWidth;
                        canvas.height = imageElement.naturalHeight;
                        ctx.drawImage(imageElement, 0, 0);
                        
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                        
                        callback({{
                            success: true,
                            data: dataUrl,
                            type: 'image/jpeg',
                            mediaType: 'image',
                            width: canvas.width,
                            height: canvas.height,
                            originalUrl: blobUrl
                        }});
                    }} else {{
                        // Image not loaded, wait for it
                        imageElement.addEventListener('load', function() {{
                            canvas.width = imageElement.naturalWidth;
                            canvas.height = imageElement.naturalHeight;
                            ctx.drawImage(imageElement, 0, 0);
                            
                            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                            
                            callback({{
                                success: true,
                                data: dataUrl,
                                type: 'image/jpeg',
                                mediaType: 'image',
                                width: canvas.width,
                                height: canvas.height,
                                originalUrl: blobUrl
                            }});
                        }}, {{ once: true }});
                        
                        // Timeout fallback
                        setTimeout(() => {{
                            if (imageElement.complete) {{
                                canvas.width = imageElement.naturalWidth || imageElement.width || 300;
                                canvas.height = imageElement.naturalHeight || imageElement.height || 200;
                                ctx.drawImage(imageElement, 0, 0);
                                const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                                
                                callback({{
                                    success: true,
                                    data: dataUrl,
                                    type: 'image/jpeg',
                                    mediaType: 'image',
                                    width: canvas.width,
                                    height: canvas.height,
                                    originalUrl: blobUrl
                                }});
                            }} else {{
                                callback({{success: false, error: 'Image not loaded after timeout'}});
                            }}
                        }}, 3000);
                    }}
                }} catch (imageError) {{
                    callback({{success: false, error: 'Image capture error: ' + imageError.message}});
                }}
                
            }} else {{
                // Element not found, try alternative selectors
                const allVideos = document.querySelectorAll('video');
                const allImages = document.querySelectorAll('img');
                
                let foundElement = null;
                
                // Check all videos for matching blob URL
                for (let video of allVideos) {{
                    if (video.src === blobUrl || video.currentSrc === blobUrl) {{
                        foundElement = video;
                        break;
                    }}
                }}
                
                // Check all images for matching blob URL
                if (!foundElement) {{
                    for (let img of allImages) {{
                        if (img.src === blobUrl || img.currentSrc === blobUrl) {{
                            foundElement = img;
                            break;
                        }}
                    }}
                }}
                
                if (foundElement) {{
                    console.log('Found element with alternative search, retrying...');
                    // Recursive call with found element
                    if (foundElement.tagName === 'VIDEO') {{
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        canvas.width = foundElement.videoWidth || 640;
                        canvas.height = foundElement.videoHeight || 480;
                        ctx.drawImage(foundElement, 0, 0, canvas.width, canvas.height);
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                        
                        callback({{
                            success: true,
                            data: dataUrl,
                            type: 'image/jpeg',
                            mediaType: 'video',
                            width: canvas.width,
                            height: canvas.height,
                            originalUrl: blobUrl
                        }});
                    }} else {{
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        canvas.width = foundElement.naturalWidth || foundElement.width;
                        canvas.height = foundElement.naturalHeight || foundElement.height;
                        ctx.drawImage(foundElement, 0, 0);
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                        
                        callback({{
                            success: true,
                            data: dataUrl,
                            type: 'image/jpeg',
                            mediaType: 'image',
                            width: canvas.width,
                            height: canvas.height,
                            originalUrl: blobUrl
                        }});
                    }}
                }} else {{
                    callback({{success: false, error: 'No DOM element found with blob URL'}});
                }}
            }}
            """
            
            try:
                # Execute async script with proper timeout
                driver.set_script_timeout(10)  # 10 second timeout should be enough
                result = driver.execute_async_script(js_dom_capture)
                
                if result and result.get('success'):
                    data_url = result.get('data')
                    media_type = result.get('mediaType', 'image')
                    width = result.get('width', 0)
                    height = result.get('height', 0)
                    
                    print(f"🎉 DOM CAPTURE SUCCESS! Type: {media_type}, Size: {width}x{height}")
                    
                    # Determine file extension based on media type
                    if media_type == 'video':
                        ext = 'jpg'  # Video frame capture as JPEG
                        filename = f"post_{post_number}_video_frame_{media_index}_{url_hash}.{ext}"
                    else:
                        ext = 'jpg'  # Image capture as JPEG
                        filename = f"post_{post_number}_image_{media_index}_{url_hash}.{ext}"
                    
                    filepath = os.path.join(media_dir, filename)
                    
                    # Extract and save base64 data
                    if ',' in data_url:
                        base64_data = data_url.split(',', 1)[1]
                        
                        import base64
                        with open(filepath, 'wb') as f:
                            f.write(base64.b64decode(base64_data))
                        
                        actual_size = os.path.getsize(filepath)
                        print(f"✅ DOM CAPTURE SAVED: {filename} ({actual_size} bytes)")
                        
                        # Verify it's a valid file
                        if actual_size > 1000:  # Should be larger than 1KB
                            return f"media_{session_id}/{filename}"
                        else:
                            print(f"⚠️ File too small ({actual_size} bytes)")
                            os.remove(filepath)
                            return None
                    else:
                        print(f"❌ Invalid data URL format")
                        return None
                
                else:
                    error_msg = result.get('error', 'Unknown error') if result else 'No result'
                    print(f"❌ DOM capture failed: {error_msg}")
                    return None
                    
            except Exception as js_error:
                print(f"❌ JavaScript DOM capture error: {js_error}")
                return None
                
        else:
            # Handle regular URLs (non-blob)
            print(f"📥 Downloading regular URL: {url[:100]}...")
            
            # Get cookies from current session
            cookies = driver.get_cookies()
            cookie_dict = {cookie['name']: cookie['value'] for cookie in cookies}
            
            # Headers to mimic browser request
            headers = {
                'User-Agent': driver.execute_script("return navigator.userAgent"),
                'Referer': 'https://www.linkedin.com/',
                'Accept': '*/*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Sec-Fetch-Dest': 'video',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'cross-site'
            }
            
            try:
                response = requests.get(
                    url, 
                    cookies=cookie_dict, 
                    headers=headers, 
                    timeout=60,  # Longer timeout for videos
                    stream=True,
                    verify=True
                )
                
                if response.status_code == 200:
                    # Determine file extension from content-type or URL
                    content_type = response.headers.get('content-type', '').lower()
                    
                    ext_map = {
                        'video/mp4': 'mp4',
                        'video/webm': 'webm',
                        'video/quicktime': 'mov',
                        'video/x-msvideo': 'avi',
                        'image/jpeg': 'jpg',
                        'image/png': 'png', 
                        'image/gif': 'gif',
                        'image/webp': 'webp'
                    }
                    
                    ext = 'mp4'  # default for videos
                    for ct, extension in ext_map.items():
                        if ct in content_type:
                            ext = extension
                            break
                    
                    # If content-type doesn't help, try URL extension
                    if ext == 'mp4' and '.' in url:
                        url_ext = url.split('.')[-1].split('?')[0].lower()
                        if url_ext in ['mp4', 'webm', 'mov', 'avi', 'jpg', 'jpeg', 'png', 'gif', 'webp']:
                            ext = 'jpg' if url_ext == 'jpeg' else url_ext
                    
                    filename = f"post_{post_number}_media_{media_index}_{url_hash}.{ext}"
                    filepath = os.path.join(media_dir, filename)
                    
                    # Download in chunks for large files
                    total_size = 0
                    with open(filepath, 'wb') as f:
                        for chunk in response.iter_content(chunk_size=8192):
                            if chunk:
                                f.write(chunk)
                                total_size += len(chunk)
                    
                    print(f"✅ Downloaded: {filename} ({total_size} bytes)")
                    return f"media_{session_id}/{filename}"
                    
                else:
                    print(f"❌ HTTP {response.status_code}: {response.reason}")
                    return None
                    
            except requests.exceptions.Timeout:
                print(f"❌ Download timeout after 60 seconds")
                return None
            except requests.exceptions.RequestException as req_error:
                print(f"❌ Request error: {req_error}")
                return None
                
    except Exception as e:
        print(f"❌ Error downloading {url[:100]}: {e}")
        return None

def extract_post_content(post_element, post_number, driver, session_id):
    """Extract detailed content from a single post, including downloaded media."""
    post_data = {
        'post_number': post_number,
        'content': '',
        'timestamp': '',
        'engagement': {},
        'post_type': 'text',
        'media_urls': [],
        'local_media_paths': [],
        'post_url': ''
    }

    # Extract post textual content
    content_selectors = [
        'span.break-words',
        '.feed-shared-text',
        '.update-components-text',
        '.attributed-text-segment-list__content',
        '[data-attributed-text]'
    ]
    for selector in content_selectors:
        try:
            content_element = post_element.find_element(By.CSS_SELECTOR, selector)
            post_data['content'] = content_element.text.strip()
            if post_data['content']:
                break
        except NoSuchElementException:
            continue

    # Extract timestamp
    try:
        time_element = post_element.find_element(By.CSS_SELECTOR, 'time, .update-components-actor__sub-description time')
        post_data['timestamp'] = time_element.get_attribute('datetime') or time_element.text
    except NoSuchElementException:
        pass

    # Extract engagement
    try:
        reaction_element = post_element.find_element(By.CSS_SELECTOR, '.social-counts-reactions__count')
        post_data['engagement']['reactions'] = reaction_element.text.strip()
    except NoSuchElementException:
        pass

    try:
        comment_element = post_element.find_element(By.CSS_SELECTOR, '.social-counts-comments')
        post_data['engagement']['comments'] = comment_element.text.strip()
    except NoSuchElementException:
        pass

    # IMPROVED: Extract media URLs with focus on real content
    media_urls = []
    local_media_paths = []
    media_index = 0
    
    print(f"🔍 Scanning post #{post_number} for media...")
    
    # PRIORITY 1: Look for video elements first (most likely to be blob URLs)
    video_selectors = [
        'video[src^="blob:"]',               # Blob video URLs (highest priority)
        'video source[src^="blob:"]',        # Video source elements with blob
        'video[src*="licdn.com"]',           # LinkedIn hosted videos
        'video source[src*="licdn.com"]',    # LinkedIn video sources
        '.feed-shared-video video',          # Videos in feed containers
        '.update-components-video video',    # Videos in update components
    ]
    
    found_videos = set()
    
    for selector in video_selectors:
        try:
            videos = post_element.find_elements(By.CSS_SELECTOR, selector)
            for video in videos:
                src = video.get_attribute('src')
                if src and src not in found_videos:
                    found_videos.add(src)
                    media_index += 1
                    media_urls.append(src)
                    print(f"🎥 Found video #{media_index}: {src[:100]}...")
                    
                    # Download immediately to capture blob URLs before they expire
                    try:
                        local_path = download_media_file(driver, src, session_id, post_number, media_index)
                        if local_path:
                            local_media_paths.append(local_path)
                            print(f"✅ Video downloaded: {local_path}")
                        else:
                            print(f"❌ Failed to download video #{media_index}")
                    except Exception as e:
                        print(f"❌ Error downloading video #{media_index}: {e}")
                        
        except Exception as e:
            print(f"⚠️ Error with video selector '{selector}': {e}")
            continue

    # PRIORITY 2: Look for images
    image_selectors = [
        'img[src^="blob:"]',                 # Blob image URLs
        'img[src*="media.licdn.com"]',       # LinkedIn CDN images
        'img[src*="feedshare"]',             # Feed share images
        '.feed-shared-image img',            # Images in feed containers
        '.update-components-image img',      # Images in update components
    ]
    
    found_images = set()
    
    for selector in image_selectors:
        try:
            images = post_element.find_elements(By.CSS_SELECTOR, selector)
            for img in images:
                src = img.get_attribute('src')
                if src and src not in found_images:
                    # Filter out profile photos and UI elements
                    classes = img.get_attribute('class') or ''
                    alt_text = img.get_attribute('alt') or ''
                    
                    skip_patterns = [
                        'profile-photo', 'profile-displayphoto', 'reactions-icon', 
                        'entity-photo', 'emoji', 'reaction', 'actor-photo',
                        'navigation', 'logo', 'icon'
                    ]
                    
                    should_skip = False
                    for pattern in skip_patterns:
                        if pattern in classes.lower() or pattern in alt_text.lower():
                            should_skip = True
                            break
                    
                    if not should_skip:
                        found_images.add(src)
                        media_index += 1
                        media_urls.append(src)
                        print(f"🖼️ Found image #{media_index}: {src[:100]}...")
                        
                        try:
                            local_path = download_media_file(driver, src, session_id, post_number, media_index)
                            if local_path:
                                local_media_paths.append(local_path)
                                print(f"✅ Image downloaded: {local_path}")
                            else:
                                print(f"❌ Failed to download image #{media_index}")
                        except Exception as e:
                            print(f"❌ Error downloading image #{media_index}: {e}")
                            
        except Exception as e:
            print(f"⚠️ Error with image selector '{selector}': {e}")
            continue

    post_data['media_urls'] = media_urls
    post_data['local_media_paths'] = local_media_paths

    # Determine post type based on media found
    if any('video' in url.lower() or url.startswith('blob:') for url in media_urls):
        post_data['post_type'] = 'video'
    elif media_urls:
        post_data['post_type'] = 'image'
    else:
        # Check for article shares
        article_elements = post_element.find_elements(By.CSS_SELECTOR, '.update-components-article, .article-share')
        if article_elements:
            post_data['post_type'] = 'article'

    # Extract post URL via URN or menu
    try:
        post_data['post_url'] = extract_post_url_via_menu(post_element, post_number, driver)
    except Exception as e:
        print(f"⚠️ Could not extract post URL: {e}")
        post_data['post_url'] = ''

    print(f"📄 Post #{post_number}: {post_data['post_type']} - {len(media_urls)} media files found, {len(local_media_paths)} successfully downloaded")
    
    return post_data

def extract_post_url_via_menu(post_element, post_number, driver):
    """Extract post URL by URN or menu method"""
    try:
        # Try URN method first (fastest and most reliable)
        urn = post_element.get_attribute("data-urn")
        if urn and "activity:" in urn:
            activity_id = urn.split("activity:")[1]
            post_url = f"https://www.linkedin.com/feed/update/urn:li:activity:{activity_id}"
            print(f"✅ Generated URL from URN: {post_url}")
            return post_url

        # Fallback to menu method
        print(f"ℹ️ URN not found, trying menu method for post #{post_number}")
        
        try:
            menu_button = post_element.find_element(By.CSS_SELECTOR, 'button[aria-label*="menu"]')
            driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", menu_button)
            driver.execute_script("arguments[0].click();", menu_button)
            time.sleep(1)

            copy_button = driver.find_element(By.XPATH, "//span[contains(text(), 'Copy link')]/ancestor::button")
            driver.execute_script("arguments[0].click();", copy_button)
            time.sleep(0.5)

            # Try reading from clipboard
            post_url = driver.execute_script("return navigator.clipboard.readText();")
            if post_url and "linkedin.com" in post_url:
                print(f"✅ Clipboard URL: {post_url}")
                return post_url
        except Exception as menu_error:
            print(f"⚠️ Menu method failed: {menu_error}")
        
        return None

    except Exception as e:
        print(f"❌ Error extracting post URL for post #{post_number}: {e}")
        return None

def construct_posts_url(profile_url):
    """Convert profile URL to posts activity URL."""
    base_url = profile_url.rstrip('/').split('/recent-activity')[0]
    return f"{base_url}/recent-activity/all/"

def scrape_posts(driver, profile_url, scrolls=10, max_posts=50):
    """Scrape posts with real media download capability"""
    posts_url = construct_posts_url(profile_url)
    print(f"🎯 Navigating to: {posts_url}")
    driver.get(posts_url)

    try:
        WebDriverWait(driver, 15).until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, 'div.feed-shared-update-v2, .artdeco-empty-state')
            )
        )
    except TimeoutException:
        print("⚠️ Posts didn't load.")
        return []

    if driver.find_elements(By.CSS_SELECTOR, '.artdeco-empty-state'):
        print("ℹ️ Profile appears to have no visible posts or is private.")
        return []

    print(f"📜 Scrolling to load posts...")
    for i in range(scrolls):
        driver.find_element(By.TAG_NAME, 'body').send_keys(Keys.END)
        time.sleep(2)  # Allow time for content to load

    # Find all post elements
    post_selectors = [
        'div.feed-shared-update-v2',
        'div[data-urn*="activity"]',
        '.update-components-actor'
    ]

    all_posts = []
    for selector in post_selectors:
        posts = driver.find_elements(By.CSS_SELECTOR, selector)
        if posts:
            all_posts = posts
            break

    # Generate session ID for this scrape
    session_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    extracted_posts = []
    for i, post_element in enumerate(all_posts[:max_posts]):
        try:
            print(f"\n⚙️ Processing post {i+1}/{min(len(all_posts), max_posts)}")
            post_data = extract_post_content(post_element, i + 1, driver, session_id)
            if post_data['content'].strip() or post_data['media_urls']:
                extracted_posts.append(post_data)
        except Exception as e:
            print(f"⚠️ Skipping post #{i+1} due to error: {e}")
            continue

    return extracted_posts

def save_posts_to_file(posts, filename=None):
    """Save posts with local media paths"""
    if not filename:
        filename = f"linkedin_posts/linkedin_posts_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    
    # Ensure directory exists
    os.makedirs("linkedin_posts", exist_ok=True)
    
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(posts, f, indent=2, ensure_ascii=False)
    print(f"💾 Saved {len(posts)} posts to {filename}")

def display_posts(posts):
    print(f"\n📋 === EXTRACTED POSTS ({len(posts)} total) ===\n")

    for post in posts:
        print(f"🔸 Post #{post['post_number']} ({post['post_type']})")
        if post['timestamp']:
            print(f"   📅 {post['timestamp']}")
        if post['post_url']:
            print(f"   🔗 LinkedIn Post URL: {post['post_url']}")
        print(f"   💬 {post['content']}")
        if post['media_urls']:
            print(f"   🖼️ Original Media URLs: {len(post['media_urls'])}")
            for url in post['media_urls']:
                print(f"     - {url}")
        if post.get('local_media_paths'):
            print(f"   💾 Downloaded Media: {len(post['local_media_paths'])}")
            for path in post['local_media_paths']:
                print(f"     - {path}")
        if post['engagement']:
            engagement_str = " | ".join([f"{k}: {v}" for k, v in post['engagement'].items() if v])
            if engagement_str:
                print(f"   📊 {engagement_str}")
        print("-" * 80)

def main():
    print("🚀 LinkedIn Posts Scraper with REAL Video Download")
    email = input("LinkedIn Email: ")
    password = getpass.getpass("LinkedIn Password: ")
    profile_url = input("LinkedIn Profile URL: ")
    scrolls = int(input("Number of scrolls (default 10): ") or "10")
    max_posts = int(input("Max posts to extract (default 50): ") or "50")

    driver = setup_driver(headless=False)
    try:
        login_linkedin(driver, email, password)
        posts = scrape_posts(driver, profile_url, scrolls, max_posts)
        if posts:
            display_posts(posts)
            save_posts_to_file(posts)
            
            # Count successful downloads
            total_media = sum(len(post.get('local_media_paths', [])) for post in posts)
            total_videos = sum(1 for post in posts if post['post_type'] == 'video')
            
            print(f"\n🎉 SUCCESS SUMMARY:")
            print(f"   📄 {len(posts)} posts extracted")
            print(f"   🎥 {total_videos} video posts found")
            print(f"   💾 {total_media} media files downloaded")
            print(f"   📁 Files saved in: linkedin_posts/")
        else:
            print("❌ No posts extracted.")
    finally:
        driver.quit()
        print("\n👋 Done!")

if __name__ == "__main__":
    main()