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

def construct_posts_url(profile_url):
    """Convert profile URL to posts activity URL."""
    base_url = profile_url.rstrip('/').split('/recent-activity')[0]
    return f"{base_url}/recent-activity/all/"

def download_media_file(driver, url, session_id, post_number, media_index):
    """Download media files with DOM capture for blob URLs"""
    try:
        # Create media directory
        media_dir = f"linkedin_posts/media_{session_id}"
        os.makedirs(media_dir, exist_ok=True)
        
        # Generate filename
        url_hash = hashlib.md5(url.encode()).hexdigest()[:8]
        
        if url.startswith('blob:'):
            print(f"🚀 DOM-based blob capture: {url[:100]}...")
            
            # JavaScript to capture blob content from DOM
            js_dom_capture = f"""
            const blobUrl = '{url}';
            const callback = arguments[arguments.length - 1];
            
            // Find video or image element with this blob URL
            const videoElement = document.querySelector(`video[src="${{blobUrl}}"]`);
            const imageElement = document.querySelector(`img[src="${{blobUrl}}"]`);
            
            if (videoElement) {{
                console.log('Found video element, capturing frame...');
                try {{
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    if (videoElement.readyState >= 2) {{
                        canvas.width = videoElement.videoWidth || videoElement.clientWidth || 640;
                        canvas.height = videoElement.videoHeight || videoElement.clientHeight || 480;
                        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                        
                        callback({{
                            success: true,
                            data: dataUrl,
                            type: 'image/jpeg',
                            mediaType: 'video'
                        }});
                    }} else {{
                        callback({{success: false, error: 'Video not ready'}});
                    }}
                }} catch (videoError) {{
                    callback({{success: false, error: 'Video capture error: ' + videoError.message}});
                }}
            }} else if (imageElement) {{
                console.log('Found image element, capturing...');
                try {{
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    if (imageElement.complete && imageElement.naturalWidth > 0) {{
                        canvas.width = imageElement.naturalWidth;
                        canvas.height = imageElement.naturalHeight;
                        ctx.drawImage(imageElement, 0, 0);
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                        
                        callback({{
                            success: true,
                            data: dataUrl,
                            type: 'image/jpeg',
                            mediaType: 'image'
                        }});
                    }} else {{
                        callback({{success: false, error: 'Image not loaded'}});
                    }}
                }} catch (imageError) {{
                    callback({{success: false, error: 'Image capture error: ' + imageError.message}});
                }}
            }} else {{
                callback({{success: false, error: 'No DOM element found with blob URL'}});
            }}
            """
            
            try:
                driver.set_script_timeout(10)
                result = driver.execute_async_script(js_dom_capture)
                
                if result and result.get('success'):
                    data_url = result.get('data')
                    media_type = result.get('mediaType', 'image')
                    
                    ext = 'jpg'
                    if media_type == 'video':
                        filename = f"post_{post_number}_video_frame_{media_index}_{url_hash}.{ext}"
                    else:
                        filename = f"post_{post_number}_image_{media_index}_{url_hash}.{ext}"
                    
                    filepath = os.path.join(media_dir, filename)
                    
                    if ',' in data_url:
                        base64_data = data_url.split(',', 1)[1]
                        
                        import base64
                        with open(filepath, 'wb') as f:
                            f.write(base64.b64decode(base64_data))
                        
                        print(f"✅ DOM CAPTURE SAVED: {filename}")
                        return f"media_{session_id}/{filename}"
                    
                return None
                    
            except Exception as js_error:
                print(f"❌ JavaScript DOM capture error: {js_error}")
                return None
                
        else:
            # Handle regular URLs (non-blob)
            print(f"📥 Downloading regular URL: {url[:100]}...")
            
            cookies = driver.get_cookies()
            cookie_dict = {cookie['name']: cookie['value'] for cookie in cookies}
            
            headers = {
                'User-Agent': driver.execute_script("return navigator.userAgent"),
                'Referer': 'https://www.linkedin.com/',
                'Accept': '*/*'
            }
            
            try:
                response = requests.get(url, cookies=cookie_dict, headers=headers, timeout=60, stream=True)
                
                if response.status_code == 200:
                    content_type = response.headers.get('content-type', '').lower()
                    
                    ext_map = {
                        'video/mp4': 'mp4',
                        'image/jpeg': 'jpg',
                        'image/png': 'png',
                        'image/gif': 'gif'
                    }
                    
                    ext = 'mp4'
                    for ct, extension in ext_map.items():
                        if ct in content_type:
                            ext = extension
                            break
                    
                    filename = f"post_{post_number}_media_{media_index}_{url_hash}.{ext}"
                    filepath = os.path.join(media_dir, filename)
                    
                    with open(filepath, 'wb') as f:
                        for chunk in response.iter_content(chunk_size=8192):
                            if chunk:
                                f.write(chunk)
                    
                    print(f"✅ Downloaded: {filename}")
                    return f"media_{session_id}/{filename}"
                    
            except Exception as req_error:
                print(f"❌ Request error: {req_error}")
                return None
                
    except Exception as e:
        print(f"❌ Error downloading {url[:100]}: {e}")
        return None

def extract_post_content(post_element, post_number, driver, session_id=None):
    """Extract detailed content from a single post, including media URLs, post permalink, and author avatar.
    
    Args:
        post_element: The selenium web element for the post
        post_number: The post number in the sequence
        driver: The selenium webdriver instance
        session_id: Optional session ID for media downloads
    """
    post_data = {
        'post_number': post_number,
        'content': '',
        'timestamp': '',
        'engagement': {},
        'post_type': 'text',
        'media_urls': [],
        'post_url': '',
        'author_name': '',
        'author_avatar': ''
    }

    # Extract author information (name and avatar) - ENHANCED VERSION
    try:
        # Try to find author name - expanded selectors
        author_selectors = [
            '.update-components-actor__name span[aria-hidden="true"]',
            '.update-components-actor__name',
            '.feed-shared-actor__name span[aria-hidden="true"]',
            '.feed-shared-actor__name',
            '.update-components-actor__title',
            '.feed-shared-actor__title',
            'button[aria-label*="View"][aria-label*="profile"] span',
            '.feed-shared-actor__container-link span[dir="ltr"]',
            '.update-components-actor__container span[dir="ltr"]'
        ]
        
        for selector in author_selectors:
            try:
                author_element = post_element.find_element(By.CSS_SELECTOR, selector)
                author_name = author_element.text.strip()
                if author_name and author_name not in ['', '•', '·']:
                    # Clean up the name
                    author_name = author_name.split('\n')[0].split('•')[0].strip()
                    if author_name:
                        post_data['author_name'] = author_name
                        print(f"✅ Found author name: {author_name}")
                        break
            except NoSuchElementException:
                continue
        
        # Try to find author avatar - ENHANCED WITH MORE SELECTORS
        avatar_selectors = [
            # Primary selectors
            '.update-components-actor__image img',
            '.feed-shared-actor__avatar img',
            '.update-components-actor__avatar img',
            
            # Secondary selectors
            'img.presence-entity__image',
            'img.feed-shared-actor__avatar-image',
            'img.EntityPhoto-circle-3',
            'img.EntityPhoto-circle-4',
            'img.EntityPhoto-circle-5',
            'img.ivm-view-attr__img--centered',
            
            # Generic profile image selectors
            'img[alt*="profile"]',
            'img[alt*="Profile"]',
            'img[alt*="avatar"]',
            
            # Link-based selectors
            '.update-components-actor__container img',
            '.feed-shared-actor__container-link img',
            'a[href*="/in/"] img.presence-entity__image',
            
            # Fallback selectors
            '.update-components-actor img[width="48"]',
            '.update-components-actor img[width="56"]',
            '.feed-shared-actor img[width="48"]',
            '.feed-shared-actor img[width="56"]'
        ]
        
        avatar_found = False
        for selector in avatar_selectors:
            if avatar_found:
                break
            try:
                avatar_imgs = post_element.find_elements(By.CSS_SELECTOR, selector)
                for avatar_img in avatar_imgs:
                    avatar_src = avatar_img.get_attribute('src')
                    # Check if it's a valid avatar URL
                    if avatar_src and 'data:image' not in avatar_src and avatar_src != '':
                        # LinkedIn avatar URLs usually contain these patterns
                        if any(pattern in avatar_src for pattern in ['profile-displayphoto', 'shrink_', '/v2/', 'media-exp']):
                            post_data['author_avatar'] = avatar_src
                            print(f"✅ Found avatar URL: {avatar_src[:80]}...")
                            avatar_found = True
                            break
                        # Also accept any image that's likely an avatar based on size
                        elif 'media.licdn.com' in avatar_src:
                            width = avatar_img.get_attribute('width')
                            height = avatar_img.get_attribute('height')
                            classes = avatar_img.get_attribute('class') or ''
                            
                            # Check if it's likely an avatar based on context
                            if any(term in classes.lower() for term in ['avatar', 'profile', 'entity']):
                                post_data['author_avatar'] = avatar_src
                                print(f"✅ Found avatar URL (by class): {avatar_src[:80]}...")
                                avatar_found = True
                                break
                            # Check by size - avatars are usually small square images
                            elif width and height and int(width) <= 100 and int(height) <= 100:
                                post_data['author_avatar'] = avatar_src
                                print(f"✅ Found avatar URL (by size): {avatar_src[:80]}...")
                                avatar_found = True
                                break
            except Exception as e:
                continue
        
        # If no avatar found, try JavaScript extraction as last resort
        if not avatar_found:
            try:
                js_extract_avatar = """
                const postEl = arguments[0];
                const avatarImgs = postEl.querySelectorAll('img');
                for (let img of avatarImgs) {
                    // Check various properties that indicate it's an avatar
                    const src = img.src || '';
                    const alt = img.alt || '';
                    const classes = img.className || '';
                    const width = img.width;
                    
                    if (src && !src.includes('data:image')) {
                        // Check if it's in the actor/author section
                        const parent = img.closest('.update-components-actor, .feed-shared-actor');
                        if (parent) {
                            // Check if it's not a company logo or other non-avatar image
                            if (width <= 100 && (
                                src.includes('profile-displayphoto') ||
                                src.includes('shrink_') ||
                                classes.includes('avatar') ||
                                classes.includes('entity') ||
                                alt.toLowerCase().includes('profile')
                            )) {
                                return src;
                            }
                        }
                    }
                }
                return null;
                """
                
                avatar_url = driver.execute_script(js_extract_avatar, post_element)
                if avatar_url:
                    post_data['author_avatar'] = avatar_url
                    print(f"✅ Found avatar URL (via JS): {avatar_url[:80]}...")
            except Exception as js_error:
                print(f"⚠️ JS avatar extraction failed: {js_error}")
                
    except Exception as e:
        print(f"⚠️ Could not extract author info: {e}")

    # Extract post textual content
    content_selectors = [
        'span.break-words',
        '.feed-shared-text',
        '.update-components-text',
        '.attributed-text-segment-list__content',
        '[data-attributed-text]',
        '.feed-shared-update-v2__description',
        '.feed-shared-inline-show-more-text'
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

    # Extract media URLs - ENHANCED VERSION FOR BETTER IMAGE EXTRACTION
    media_urls = []
    local_media_paths = []
    
    # Try JavaScript extraction for media first (more reliable)
    try:
        js_extract_media = """
        const postEl = arguments[0];
        const mediaUrls = [];
        
        // Find all images in the post content area (not avatars)
        const contentImgs = postEl.querySelectorAll(`
            .feed-shared-image img,
            .update-components-image img,
            .feed-shared-external-video__image img,
            .feed-shared-article__image img,
            img.feed-shared-image__image,
            img.update-components-image__image,
            .feed-shared-update-v2__content img,
            [data-test-id="main-feed-activity-card__entity"] img
        `);
        
        contentImgs.forEach(img => {
            const src = img.src || img.dataset.src || '';
            if (src && !src.includes('data:image') && !src.includes('static-exp')) {
                // Filter out avatars and UI elements
                const classes = img.className || '';
                const alt = img.alt || '';
                if (!classes.includes('avatar') && 
                    !classes.includes('entity-photo') && 
                    !classes.includes('presence') &&
                    !classes.includes('reactions-icon') &&
                    !alt.toLowerCase().includes('profile photo')) {
                    mediaUrls.push(src);
                }
            }
        });
        
        // Find all videos
        const videos = postEl.querySelectorAll('video');
        videos.forEach(video => {
            const src = video.src || video.dataset.src || '';
            if (src && !src.includes('data:')) {
                mediaUrls.push(src);
            }
        });
        
        return [...new Set(mediaUrls)]; // Remove duplicates
        """
        
        js_media_urls = driver.execute_script(js_extract_media, post_element)
        if js_media_urls:
            for url in js_media_urls:
                if url not in media_urls:
                    media_urls.append(url)
                    print(f"✅ Found media via JS: {url[:80]}...")
    except Exception as js_error:
        print(f"⚠️ JS media extraction failed: {js_error}")
    
    # Fallback to regular element selection if JS didn't find anything
    if not media_urls:
        # Get all images but filter out profile pictures and UI elements
        all_images = post_element.find_elements(By.TAG_NAME, 'img')
        for img in all_images:
            src = img.get_attribute('src') or img.get_attribute('data-src') or ''
            alt = img.get_attribute('alt') or ''
            classes = img.get_attribute('class') or ''
            
            # Skip if it's a profile picture, avatar, or UI element
            if src and 'media.licdn.com' in src:
                # List of terms that indicate it's NOT post content
                skip_terms = [
                    'avatar', 'profile', 'entity-photo', 'presence-entity', 
                    'actor', 'reactions-icon', 'static-exp', 'emoji'
                ]
                
                should_skip = any(term in classes.lower() + alt.lower() for term in skip_terms)
                
                # Also skip small images (likely UI elements)
                width = img.get_attribute('width')
                if width and width.isdigit() and int(width) < 100:
                    should_skip = True
                
                if not should_skip and src not in media_urls:
                    media_urls.append(src)
                    print(f"✅ Added post media: {src[:80]}...")
                    
                    # Download media if session_id is provided
                    if session_id:
                        local_path = download_media_file(driver, src, session_id, post_number, len(media_urls))
                        if local_path:
                            local_media_paths.append(local_path)

    # Also check for videos
    all_videos = post_element.find_elements(By.TAG_NAME, 'video')
    for video in all_videos:
        src = video.get_attribute('src') or video.get_attribute('data-src') or ''
        if src and src not in media_urls:
            media_urls.append(src)
            print(f"✅ Added video URL: {src[:80]}...")
            
            # Download video if session_id is provided
            if session_id:
                local_path = download_media_file(driver, src, session_id, post_number, len(media_urls))
                if local_path:
                    local_media_paths.append(local_path)

    post_data['media_urls'] = media_urls
    
    # Add local media paths if any were downloaded
    if local_media_paths:
        post_data['local_media_paths'] = local_media_paths

    # Determine post type
    if any('video' in url.lower() or 'mp4' in url.lower() for url in media_urls):
        post_data['post_type'] = 'video'
    elif media_urls:
        post_data['post_type'] = 'image'
    else:
        # Check for article containers
        article_elements = post_element.find_elements(By.CSS_SELECTOR, '.update-components-article, .feed-shared-article')
        if article_elements:
            post_data['post_type'] = 'article'

    # Extract post URL via menu or URN
    post_data['post_url'] = extract_post_url_via_menu(post_element, post_number, driver)

    # Debug output
    print(f"📄 Post #{post_number}: {post_data['post_type']} - {len(media_urls)} media files")
    if post_data['author_name']:
        print(f"👤 Author: {post_data['author_name']}")
    if post_data['author_avatar']:
        print(f"🖼️ Avatar: {post_data['author_avatar'][:80]}...")
    else:
        print(f"⚠️ No avatar found for post #{post_number}")
    
    return post_data
def scrape_posts(driver, profile_url, scrolls=10, max_posts=50):
    """Scrape posts with optional media download capability"""
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
        time.sleep(2)

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

    # Generate session ID for this scrape (optional for media downloads)
    session_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    extracted_posts = []
    for i, post_element in enumerate(all_posts[:max_posts]):
        try:
            print(f"\n⚙️ Processing post {i+1}/{min(len(all_posts), max_posts)}")
            # Pass session_id for media downloads, or None to skip downloads
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
        if post['author_name']:
            print(f"   👤 Author: {post['author_name']}")
        print(f"   💬 {post['content'][:200]}..." if len(post['content']) > 200 else f"   💬 {post['content']}")
        if post['media_urls']:
            print(f"   🖼️ Media URLs: {len(post['media_urls'])}")
        if post.get('local_media_paths'):
            print(f"   💾 Downloaded Media: {len(post['local_media_paths'])}")
        if post['engagement']:
            engagement_str = " | ".join([f"{k}: {v}" for k, v in post['engagement'].items() if v])
            if engagement_str:
                print(f"   📊 {engagement_str}")
        print("-" * 80)

def main():
    print("🚀 LinkedIn Posts Scraper with Media Download")
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