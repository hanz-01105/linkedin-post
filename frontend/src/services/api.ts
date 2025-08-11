import axios from "axios";
const API_BASE_URL = "http://127.0.0.1:8000";

export const scrapePosts = async (
  email: string,
  password: string,
  profileUrls: string[],
  scrolls = 10,
  maxPosts = 50
) => {
  const response = await axios.post(`${API_BASE_URL}/scrape`, {
    email,
    password,
    profile_urls: profileUrls,
    scrolls,
    max_posts: maxPosts
  });
  return response.data;
};
