# LinkedIn Post Viewer 🔗

A modern, full-stack application for scraping and viewing LinkedIn posts from public profiles. Built as an open-source alternative to expensive services like Juicer.io, with proper time ordering and a beautiful, responsive interface.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Latest-009688.svg)](https://fastapi.tiangolo.com/)

## ✨ Features

- **🎯 Multiple Profile Support**: Scrape posts from multiple LinkedIn profiles simultaneously
- **📱 Responsive Design**: Beautiful, mobile-first interface inspired by modern social media
- **⏰ Proper Time Ordering**: Posts are sorted chronologically with accurate timestamps
- **🖼️ Media Support**: Download and display images, videos, and other media content
- **📊 Export Functionality**: Export scraped data as JSON for further analysis
- **🔍 Search & Filter**: Find specific posts with content search and type filtering
- **📖 Two View Modes**: 
  - Single-post view (Instagram/TikTok style)
  - Grid view for quick browsing
- **🎨 Modern UI**: Clean, professional interface with smooth animations
- **💾 Session Management**: Save and reload previous scraping sessions

## 🏗️ Architecture

### Backend (Python + FastAPI)
- **FastAPI** for high-performance REST API
- **Selenium WebDriver** for LinkedIn automation
- **ChromeDriver** for browser automation
- **Media Download Pipeline** for images and videos
- **Session Storage** with JSON export/import

### Frontend (React + TypeScript)
- **React 18** with TypeScript for type safety
- **Tailwind CSS** for responsive styling
- **Lucide React** for beautiful icons
- **Mobile-optimized** touch interactions
- **Real-time** scraping progress updates

## 🚀 Quick Start

### Prerequisites

- Python 3.8 or higher
- Node.js 16 or higher
- Chrome browser installed
- LinkedIn account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/linkedin-post-viewer.git
   cd linkedin-post-viewer
   ```

2. **Setup Backend**
   ```bash
   cd backend
   pip install -r requirements.txt
   
   # Download ChromeDriver (or use your system's chromedriver)
   # Place chromedriver in the backend directory
   ```

3. **Setup Frontend**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Start the Application**
   
   Terminal 1 (Backend):
   ```bash
   cd backend
   python main.py
   ```
   
   Terminal 2 (Frontend):
   ```bash
   cd frontend
   npm run dev
   ```

5. **Open your browser** and navigate to `http://localhost:5173`

## 📖 Usage

### Web Interface

1. **Enter LinkedIn Credentials**: Your email and password (stored locally, not transmitted)
2. **Add Profile URLs**: One or more LinkedIn profile URLs to scrape
3. **Configure Options**: Set number of scrolls and maximum posts
4. **Start Scraping**: Click "Start Scraping" and wait for results
5. **View Posts**: Browse in single-post or grid view
6. **Export Data**: Download JSON file for backup or analysis

### Python Script (Standalone)

```bash
cd backend
python viewer.py
```

Follow the prompts to enter credentials and profile URLs.

### API Usage

```python
import requests

# Scrape posts via API
response = requests.post('http://localhost:8000/scrape', json={
    "email": "your.email@domain.com",
    "password": "your_password",
    "profile_urls": ["https://linkedin.com/in/username"],
    "scrolls": 10,
    "max_posts": 50
})

posts = response.json()
```

## 🔧 Configuration

### Backend Settings

Edit `backend/main.py` to customize:

- **CORS Origins**: Add your domain for production
- **Media Storage**: Configure download paths
- **Rate Limiting**: Adjust scraping delays
- **Headless Mode**: Toggle browser visibility

### Frontend Settings

Edit `frontend/src/services/api.ts`:

- **API Base URL**: Change for production deployment
- **Request Timeouts**: Adjust for slower connections

## 📁 Project Structure

```
linkedin-post-viewer/
├── backend/
│   ├── main.py              # FastAPI server
│   ├── viewer.py            # Core scraping logic
│   ├── chromedriver         # Chrome WebDriver
│   └── linkedin_posts/      # Downloaded media & sessions
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── services/        # API integration
│   │   └── styles/          # CSS styles
│   ├── index.html
│   └── vite.config.mjs
└── README.md
```

## 🛡️ Legal & Ethics

**⚠️ Important Disclaimer**: This tool is for educational and research purposes only.

- ✅ **Respect LinkedIn's Terms of Service**
- ✅ **Only scrape public profiles you have permission to view**
- ✅ **Implement appropriate rate limiting**
- ✅ **Respect robots.txt and API guidelines**
- ❌ **Do not use for commercial scraping without permission**
- ❌ **Do not overwhelm LinkedIn's servers**
- ❌ **Do not scrape private or restricted content**

## 🔒 Privacy & Security

- Credentials are **never stored** permanently
- All data processing happens **locally**
- **No telemetry** or tracking
- Media files stored **locally only**
- Session data can be **easily deleted**

## 🤝 Contributing

We welcome contributions! This project is designed for the community and academic research.

### How to Contribute

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Contribution Ideas

- 🔧 **Performance improvements**
- 🎨 **UI/UX enhancements**
- 📊 **Data export formats** (CSV, Excel)
- 🔍 **Advanced search features**
- 🌐 **Internationalization**
- 📱 **Mobile app version**
- 🧪 **Testing framework**
- 📚 **Documentation improvements**

## 📈 Roadmap

- [ ] **LinkedIn API Integration** (when available)
- [ ] **Bulk Profile Processing**
- [ ] **Advanced Analytics Dashboard**
- [ ] **Docker Containerization**
- [ ] **Cloud Deployment Templates**
- [ ] **Database Integration** (PostgreSQL, MongoDB)
- [ ] **Real-time Collaboration Features**
- [ ] **Scheduled Scraping**

## 🐛 Troubleshooting

### Common Issues

**ChromeDriver Not Found**
```bash
# Download from: https://chromedriver.chromium.org/
# Place in backend/ directory
chmod +x chromedriver
```

**Login Fails**
- Check credentials
- Complete CAPTCHA in browser
- Disable 2FA temporarily
- Use app-specific password

**No Posts Found**
- Verify profile is public
- Check profile URL format
- Increase scroll count
- Try different profile

**CORS Errors**
- Check backend is running on port 8000
- Verify frontend API URL configuration
- Add your domain to CORS origins

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **LinkedIn** for providing a platform for professional networking
- **Selenium** team for the powerful automation framework
- **FastAPI** for the excellent Python web framework
- **React** team for the robust frontend library
- **Tailwind CSS** for the utility-first styling approach

## 🔬 Academic Usage

This project is particularly suited for:

- **Social Media Research**
- **Content Analysis Studies**
- **Network Analysis**
- **Digital Marketing Research**
- **Academic Publications**

Perfect for researchers looking to analyze LinkedIn content patterns, engagement metrics, or professional networking behaviors.

## ⭐ Show Your Support

If this project helps you, please consider:

- ⭐ **Starring** the repository
- 🍴 **Forking** for your own modifications
- 🐛 **Reporting** bugs and issues
- 💡 **Suggesting** new features
- 📖 **Contributing** to documentation
- 💬 **Sharing** with the community

---

**Built with ❤️ for the open-source community**

*Last updated: January 2025*
