import os
import time
import json
import getpass
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
        options.add_argument("--headless=new")  # Use new headless mode for Chrome

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

        # Find sign in button robustly
        try:
            sign_in_button = driver.find_element(By.XPATH, '//button[@type="submit"]')
        except NoSuchElementException:
            sign_in_button = driver.find_element(
                By.XPATH, '//button[contains(text(), "Sign in")]'
            )

        WebDriverWait(driver, 10).until(EC.element_to_be_clickable(sign_in_button))
        sign_in_button.click()

        # Wait for either feed or main content or detect possible verification
        try:
            WebDriverWait(driver, 15).until(
                EC.any_of(
                    EC.presence_of_element_located((By.CSS_SELECTOR, 'div.feed-container-theme')),
                    EC.presence_of_element_located((By.CSS_SELECTOR, 'main#main-content'))
                )
            )
            print(":white_check_mark: Successfully logged in!")
        except TimeoutException:
            print(":warning: Login submitted, but may require CAPTCHA/2FA.")
            print("   Please complete verification in the browser...")
            input("   Press Enter here after completing verification: ")

    except TimeoutException:
        print(":x: Failed to find login elements after 15 seconds.")
        raise


def construct_posts_url(profile_url):
    """Convert profile URL to posts activity URL."""
    base_url = profile_url.rstrip('/').split('/recent-activity')[0]
    return f"{base_url}/recent-activity/all/"


def scrape_posts(driver, profile_url, scrolls=10, max_posts=50):
    """Scrape posts from LinkedIn profile."""
    posts_url = construct_posts_url(profile_url)
    print(f":round_pushpin: Navigating to: {posts_url}")
    driver.get(posts_url)

    try:
        WebDriverWait(driver, 15).until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, 'div.feed-shared-update-v2, .artdeco-empty-state')
            )
        )
    except TimeoutException:
        print(":warning: Posts didn't load.")
        return []

    if driver.find_elements(By.CSS_SELECTOR, '.artdeco-empty-state'):
        print(":information_source: Profile appears to have no visible posts or is private.")
        return []

    for i in range(scrolls):
        driver.find_element(By.TAG_NAME, 'body').send_keys(Keys.END)
        time.sleep(2)

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

    extracted_posts = []
    for i, post_element in enumerate(all_posts[:max_posts]):
        try:
            post_data = extract_post_content_debug(post_element, i + 1)
            if post_data['content'].strip():
                extracted_posts.append(post_data)
        except Exception as e:
            print(f":warning: Skipping post #{i+1} due to error: {e}")
            continue

    return extracted_posts


# Add this DEBUG function to your viewer.py file (keep your original extract_post_content too!)

def debug_post_structure(post_element, post_number):
    """Debug function to see what elements are available in the post"""
    print(f"\n:mag: DEBUGGING POST #{post_number}")
    print("=" * 50)
    
    # Find all links in the post
    print(":clipboard: ALL LINKS IN POST:")
    links = post_element.find_elements(By.TAG_NAME, 'a')
    for i, link in enumerate(links):
        href = link.get_attribute('href')
        text = link.text.strip()
        classes = link.get_attribute('class')
        print(f"  Link {i+1}: {href}")
        print(f"    Text: '{text}'")
        print(f"    Classes: '{classes}'")
        print()
    
    # Find all images
    print(":frame_with_picture: ALL IMAGES IN POST:")
    images = post_element.find_elements(By.TAG_NAME, 'img')
    for i, img in enumerate(images):
        src = img.get_attribute('src')
        alt = img.get_attribute('alt')
        classes = img.get_attribute('class')
        print(f"  Image {i+1}: {src}")
        print(f"    Alt: '{alt}'")
        print(f"    Classes: '{classes}'")
        print()
    
    # Find all videos
    print(":movie_camera: ALL VIDEOS IN POST:")
    videos = post_element.find_elements(By.TAG_NAME, 'video')
    for i, video in enumerate(videos):
        src = video.get_attribute('src')
        classes = video.get_attribute('class')
        print(f"  Video {i+1}: {src}")
        print(f"    Classes: '{classes}'")
        print()
    
    print("=" * 50)

# 1. MODIFY your extract_post_content function signature to accept driver
def extract_post_content(post_element, post_number, driver):
    """Extract detailed content from a single post, including media URLs and post permalink."""
    post_data = {
        'post_number': post_number,
        'content': '',
        'timestamp': '',
        'engagement': {},
        'post_type': 'text',
        'media_urls': [],
        'post_url': ''
    }

    # Extract post textual content (existing code)
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

    # Extract timestamp (existing code)
    try:
        time_element = post_element.find_element(By.CSS_SELECTOR, 'time, .update-components-actor__sub-description time')
        post_data['timestamp'] = time_element.get_attribute('datetime') or time_element.text
    except NoSuchElementException:
        pass

    # Extract engagement (existing code)
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

    # Extract media URLs (existing code)
    media_urls = []
    
    all_images = post_element.find_elements(By.TAG_NAME, 'img')
    for img in all_images:
        src = img.get_attribute('src')
        if src and 'media.licdn.com/dms' in src and 'profile-displayphoto' not in src:
            classes = img.get_attribute('class') or ''
            if 'reactions-icon' not in classes and src not in media_urls:
                media_urls.append(src)
                print(f":white_check_mark: Added image URL: {src}")

    all_videos = post_element.find_elements(By.TAG_NAME, 'video')
    for video in all_videos:
        src = video.get_attribute('src')
        if src and src not in media_urls:
            media_urls.append(src)
            print(f":white_check_mark: Added video URL: {src}")

    post_data['media_urls'] = media_urls

    # Determine post type
    if any('video' in url.lower() or 'mp4' in url.lower() for url in media_urls):
        post_data['post_type'] = 'video'
    elif media_urls:
        post_data['post_type'] = 'image'
    else:
        # Check for article containers
        article_elements = post_element.find_elements(By.CSS_SELECTOR, '.update-components-article')
        if article_elements:
            post_data['post_type'] = 'article'

    # NEW: Extract post URL via menu clicking
    post_data['post_url'] = extract_post_url_via_menu(post_element, post_number, driver)

    print(f":page_facing_up: Post #{post_number}: {post_data['post_type']} - {len(media_urls)} media files")
    
    return post_data


# 2. NEW FUNCTION: Extract post URL by clicking the 3-dots menu
def extract_post_url_via_menu(post_element, post_number, driver):
    """Extract post URL by clicking the 3-dots menu and finding the copy link option"""
    try:
        print(f":mag: Attempting to extract post URL for post #{post_number}")
        
        # Step 1: Find the 3-dots menu button
        menu_selectors = [
            'button[aria-label*="Open control menu"]',
            'button[aria-label*="More actions"]',
            'button[data-control-name="overflow_menu"]',
            '.feed-shared-control-menu__trigger',
            'button.feed-shared-control-menu__trigger',
            '.artdeco-dropdown__trigger',
            'button[aria-haspopup="true"]',
            'button.artdeco-button--tertiary',
            'button[aria-expanded="false"]'
        ]
        
        menu_button = None
        for selector in menu_selectors:
            try:
                buttons = post_element.find_elements(By.CSS_SELECTOR, selector)
                for button in buttons:
                    # Check if this button looks like a menu trigger
                    aria_label = button.get_attribute('aria-label') or ''
                    button_text = button.text.strip()
                    classes = button.get_attribute('class') or ''
                    
                    if any(keyword in aria_label.lower() for keyword in ['menu', 'more', 'options']) or \
                       any(keyword in classes for keyword in ['menu', 'dropdown', 'overflow']):
                        menu_button = button
                        print(f":white_check_mark: Found menu button: {aria_label} | Classes: {classes}")
                        break
                
                if menu_button:
                    break
            except:
                continue
        
        if not menu_button:
            print(f":x: No menu button found for post #{post_number}")
            return None
        
        # Step 2: Click the menu button
        try:
            # Scroll button into view first
            driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", menu_button)
            time.sleep(0.5)
            
            # Try clicking with JavaScript (more reliable)
            driver.execute_script("arguments[0].click();", menu_button)
            print(f":white_check_mark: Clicked menu button for post #{post_number}")
            
            # Wait for menu to appear
            time.sleep(1.5)
            
        except Exception as e:
            print(f":x: Failed to click menu button: {e}")
            return None
        
        # Step 3: Look for copy link option in the dropdown menu
        copy_link_selectors = [
            'a[href*="/posts/"]',
            'a[href*="activity-"]',
            'button[data-control-name="copy_link"]',
            'div[data-control-name="copy_link"]',
            '*[aria-label*="Copy link"]',
            '*[aria-label*="copy link"]',
            'button:contains("Copy link")',
            'div:contains("Copy link")'
        ]
        
        post_url = None
        
        # Wait a bit more for the menu to fully load
        time.sleep(1)
        
        # Try to find copy link elements
        for selector in copy_link_selectors:
            try:
                # Look in the entire page since dropdown might be outside post element
                elements = driver.find_elements(By.CSS_SELECTOR, selector)
                
                for element in elements:
                    # Check if element is visible and contains relevant text
                    if element.is_displayed():
                        element_text = element.text.lower()
                        aria_label = (element.get_attribute('aria-label') or '').lower()
                        
                        if 'copy' in element_text or 'copy' in aria_label or 'link' in element_text:
                            # If it's a link, get the href
                            href = element.get_attribute('href')
                            if href and ('/posts/' in href or 'activity-' in href):
                                post_url = href
                                print(f":white_check_mark: Found post URL in href: {post_url}")
                                break
                            
                            # If it's a button, try clicking it to copy the link
                            elif element.tag_name in ['button', 'div']:
                                try:
                                    # Some copy buttons put the URL in clipboard or data attributes
                                    data_url = element.get_attribute('data-url') or element.get_attribute('data-href')
                                    if data_url and ('/posts/' in data_url or 'activity-' in data_url):
                                        post_url = data_url
                                        print(f":white_check_mark: Found post URL in data attribute: {post_url}")
                                        break
                                    
                                    # Try clicking the copy button and checking for URL in nearby elements
                                    driver.execute_script("arguments[0].click();", element)
                                    time.sleep(0.5)
                                    
                                    # Look for URL that might have appeared
                                    url_elements = driver.find_elements(By.XPATH, "//*[contains(text(), '/posts/') or contains(text(), 'activity-')]")
                                    for url_elem in url_elements:
                                        text = url_elem.text
                                        if 'linkedin.com' in text and ('/posts/' in text or 'activity-' in text):
                                            post_url = text
                                            print(f":white_check_mark: Found post URL after clicking copy: {post_url}")
                                            break
                                except:
                                    continue
                
                if post_url:
                    break
                    
            except Exception as e:
                print(f":warning: Error with selector {selector}: {e}")
                continue
        
        # Step 4: Close the menu
        try:
            # Click elsewhere to close menu
            driver.execute_script("document.body.click();")
            time.sleep(0.5)
        except:
            pass
        
        if post_url:
            print(f":white_check_mark: Successfully extracted post URL: {post_url}")
            return post_url
        else:
            print(f":x: Could not find post URL in menu for post #{post_number}")
            return None
            
    except Exception as e:
        print(f":x: Error extracting post URL for post #{post_number}: {e}")
        # Make sure to close any open menus
        try:
            driver.execute_script("document.body.click();")
        except:
            pass
        return None


# 3. MODIFY your scrape_posts function call
def scrape_posts(driver, profile_url, scrolls=10, max_posts=50):
    """Modified scrape_posts function with driver parameter for menu clicking"""
    posts_url = construct_posts_url(profile_url)
    print(f":round_pushpin: Navigating to: {posts_url}")
    driver.get(posts_url)

    try:
        WebDriverWait(driver, 15).until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, 'div.feed-shared-update-v2, .artdeco-empty-state')
            )
        )
    except TimeoutException:
        print(":warning: Posts didn't load.")
        return []

    if driver.find_elements(By.CSS_SELECTOR, '.artdeco-empty-state'):
        print(":information_source: Profile appears to have no visible posts or is private.")
        return []

    print(f":scroll: Scrolling to load posts...")
    for i in range(scrolls):
        driver.find_element(By.TAG_NAME, 'body').send_keys(Keys.END)
        time.sleep(2)

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

    extracted_posts = []
    for i, post_element in enumerate(all_posts[:max_posts]):
        try:
            print(f"\n:arrows_counterclockwise: Processing post {i+1}/{min(len(all_posts), max_posts)}")
            # IMPORTANT: Pass driver to extract_post_content
            post_data = extract_post_content(post_element, i + 1, driver)
            if post_data['content'].strip():
                extracted_posts.append(post_data)
        except Exception as e:
            print(f":warning: Skipping post #{i+1} due to error: {e}")
            continue

    return extracted_posts


# 4. ADD import for time if not already imported
import time

# REPLACE your extract_post_url_via_menu function with this fixed version:

def extract_post_url_via_menu(post_element, post_number, driver):
    """
    Extract LinkedIn post URL:
    1. Try building it from data-urn (fast, no click)
    2. If missing, click the 3-dot menu and read from clipboard
    """
    try:
        print(f":mag: Extracting post URL for post #{post_number}")

        # :one: Try URN method
        urn = post_element.get_attribute("data-urn")
        if urn and "activity:" in urn:
            activity_id = urn.split("activity:")[1]
            post_url = f"https://www.linkedin.com/feed/update/urn:li:activity:{activity_id}"
            print(f":white_check_mark: Generated URL from URN: {post_url}")
            return post_url

        # :two: If URN missing, try menu + clipboard
        print(":information_source: data-urn not found — falling back to menu + clipboard...")

        # Find and click the menu button
        menu_button = post_element.find_element(By.CSS_SELECTOR, 'button[aria-label*="menu"]')
        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", menu_button)
        driver.execute_script("arguments[0].click();", menu_button)
        time.sleep(1)

        # Click the "Copy link" button
        copy_button = driver.find_element(By.XPATH, "//span[contains(text(), 'Copy link')]/ancestor::button")
        driver.execute_script("arguments[0].click();", copy_button)
        time.sleep(0.5)

        # Try reading from clipboard via JS
        try:
            post_url = driver.execute_script("return navigator.clipboard.readText();")
        except Exception as e:
            print(f":warning: Clipboard read failed: {e}")
            post_url = None

        if post_url and "linkedin.com" in post_url:
            print(f":white_check_mark: Clipboard URL: {post_url}")
            return post_url
        else:
            print(":x: Could not get post URL from clipboard.")
            return None

    except Exception as e:
        print(f":x: Error extracting post URL for post #{post_number}: {e}")
        return None



# 3. MODIFY your scrape_posts function call
def scrape_posts(driver, profile_url, scrolls=10, max_posts=50):
    """Modified scrape_posts function with driver parameter for menu clicking"""
    posts_url = construct_posts_url(profile_url)
    print(f":round_pushpin: Navigating to: {posts_url}")
    driver.get(posts_url)

    try:
        WebDriverWait(driver, 15).until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, 'div.feed-shared-update-v2, .artdeco-empty-state')
            )
        )
    except TimeoutException:
        print(":warning: Posts didn't load.")
        return []

    if driver.find_elements(By.CSS_SELECTOR, '.artdeco-empty-state'):
        print(":information_source: Profile appears to have no visible posts or is private.")
        return []

    print(f":scroll: Scrolling to load posts...")
    for i in range(scrolls):
        driver.find_element(By.TAG_NAME, 'body').send_keys(Keys.END)
        time.sleep(2)

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

    extracted_posts = []
    for i, post_element in enumerate(all_posts[:max_posts]):
        try:
            print(f"\n:arrows_counterclockwise: Processing post {i+1}/{min(len(all_posts), max_posts)}")
            # IMPORTANT: Pass driver to extract_post_content
            post_data = extract_post_content(post_element, i + 1, driver)
            if post_data['content'].strip():
                extracted_posts.append(post_data)
        except Exception as e:
            print(f":warning: Skipping post #{i+1} due to error: {e}")
            continue

    return extracted_posts


# 4. ADD import for time if not already imported
import time


def save_posts_to_file(posts, filename=None):
    if not filename:
        filename = f"linkedin_posts_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(posts, f, indent=2, ensure_ascii=False)
    print(f":floppy_disk: Saved {len(posts)} posts to {filename}")


def display_posts(posts):
    print(f"\n:clipboard: === EXTRACTED POSTS ({len(posts)} total) ===\n")

    for post in posts:
        print(f":small_orange_diamond: Post #{post['post_number']} ({post['post_type']})")
        if post['timestamp']:
            print(f"   :date: {post['timestamp']}")
        if post['post_url']:
            print(f"   :link: LinkedIn Post URL: {post['post_url']}")
        print(f"   :speech_balloon: {post['content']}")
        if post['media_urls']:
            print(f"   🖼 Media URLs:")
            for url in post['media_urls']:
                print(f"     - {url}")
        if post['engagement']:
            engagement_str = " | ".join([f"{k}: {v}" for k, v in post['engagement'].items() if v])
            if engagement_str:
                print(f"   :bar_chart: {engagement_str}")
        print("-" * 80)


def main():
    print(":rocket: LinkedIn Posts Scraper")
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
        else:
            print(":x: No posts extracted.")
    finally:
        driver.quit()
        print("\n:wave: Done!")


if __name__ == "__main__":
    main()
