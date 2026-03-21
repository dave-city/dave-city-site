const fs = require('fs');
const path = require('path');
const https = require('https');

const CHANNEL_ID = 'UCGBiNqgNTsNUgRkUvAr4jWA';
const FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
const POSTS_PATH = path.join(__dirname, '../../posts/posts.json');
const POSTS_DIR = path.join(__dirname, '../../posts');

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function extractEntries(xml) {
  const entries = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;
  while ((match = entryRegex.exec(xml)) !== null) {
    const block = match[1];
    const videoId = (block.match(/<yt:videoId>([^<]+)</) || [])[1];
    const title = (block.match(/<title>([^<]+)</) || [])[1];
    const published = (block.match(/<published>([^<]+)</) || [])[1];
    const description = (block.match(/<media:description>([^<]*)</) || [])[1] || '';
    if (videoId && title && published) {
      entries.push({ videoId, title, published, description });
    }
  }
  return entries;
}

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function getFirstParagraph(description) {
  const lines = description.split('\n');
  const paragraphLines = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || /^-{3,}/.test(trimmed)) break;
    paragraphLines.push(trimmed);
  }
  return paragraphLines.join(' ').trim();
}

async function main() {
  console.log('Fetching YouTube RSS feed...');
  const xml = await fetch(FEED_URL);
  const entries = extractEntries(xml);
  console.log(`Found ${entries.length} videos in feed`);

  const posts = JSON.parse(fs.readFileSync(POSTS_PATH, 'utf8'));

  const existingTitles = new Set(posts.map(p => p.title.toLowerCase()));
  const existingVideoIds = new Set();

  const mdFiles = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
  for (const file of mdFiles) {
    const content = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
    const idMatches = content.matchAll(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/g);
    for (const m of idMatches) {
      existingVideoIds.add(m[1]);
    }
  }

  const newEntries = entries.filter(e =>
    !existingVideoIds.has(e.videoId) && !existingTitles.has(e.title.toLowerCase())
  );

  if (newEntries.length === 0) {
    console.log('No new videos found');
    return;
  }

  console.log(`Adding ${newEntries.length} new video(s)`);

  for (const entry of newEntries) {
    const date = entry.published.slice(0, 10);
    const slug = slugify(entry.title);
    const summary = getFirstParagraph(entry.description) ||
      `New video from Dave Madson Entertainment Inc.`;
    const videoUrl = `https://www.youtube.com/watch?v=${entry.videoId}`;

    posts.unshift({
      slug,
      title: entry.title,
      date,
      summary,
      type: 'Video'
    });

    const md = `# ${entry.title}\n\n${summary}\n\n[Watch the video on YouTube](${videoUrl})\n`;
    const mdPath = path.join(POSTS_DIR, `${slug}.md`);
    if (!fs.existsSync(mdPath)) {
      fs.writeFileSync(mdPath, md);
      console.log(`Created ${slug}.md`);
    }
  }

  posts.sort((a, b) => new Date(b.date) - new Date(a.date));
  fs.writeFileSync(POSTS_PATH, JSON.stringify(posts, null, 2) + '\n');
  console.log(`Updated posts.json (${posts.length} total posts)`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
