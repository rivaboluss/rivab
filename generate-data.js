const fs = require("fs");
const path = require("path");

const root = process.cwd();
const imageExt = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);
const audioExt = new Set([".mp3", ".flac", ".wav", ".m4a", ".ogg"]);

const toRelative = (filePath) =>
  path.relative(root, filePath).split(path.sep).join("/");

const listFiles = (dir) => {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(dir, entry.name))
    .sort((a, b) => path.basename(a).localeCompare(path.basename(b), "zh-Hans-CN"));
};

const listDirs = (dir) => {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(dir, entry.name))
    .sort((a, b) => path.basename(a).localeCompare(path.basename(b), "zh-Hans-CN"));
};

const walkFiles = (dir) => {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? walkFiles(fullPath) : [fullPath];
  });
};

const cleanTrackTitle = (filePath) =>
  path
    .basename(filePath, path.extname(filePath))
    .replace(/^miragerevivalism\s*-\s*/, "")
    .trim();

const backgrounds = listFiles(path.join(root, "display"))
  .filter((filePath) => imageExt.has(path.extname(filePath).toLowerCase()))
  .map((filePath) => ({
    name: path.basename(filePath, path.extname(filePath)),
    src: toRelative(filePath),
  }));

const music = listDirs(path.join(root, "music")).map((albumDir, albumIndex) => {
  const files = listFiles(albumDir);
  const cover = files.find((filePath) => imageExt.has(path.extname(filePath).toLowerCase()));
  const tracks = files
    .filter((filePath) => audioExt.has(path.extname(filePath).toLowerCase()))
    .map((filePath, trackIndex) => ({
      id: `track-${albumIndex + 1}-${trackIndex + 1}`,
      title: cleanTrackTitle(filePath),
      src: toRelative(filePath),
      format: path.extname(filePath).slice(1).toUpperCase(),
    }));

  return {
    id: `album-${albumIndex + 1}`,
    title: path.basename(albumDir),
    cover: cover ? toRelative(cover) : "",
    tracks,
  };
});

const labelMap = new Map([
  ["artworks/anime/01", "初音未来"],
  ["artworks/anime/EVA", "EVA"],
  ["artworks/anime/genshin", "原神"],
  ["artworks/anime/mix", "动漫混合"],
  ["artworks/anime/喰种", "东京喰种"],
  ["artworks/anime/巨人", "进击的巨人"],
  ["artworks/days in TYUT", "Days in TYUT"],
  ["artworks/mix", "综合绘画"],
]);

const coverMap = new Map([
  ["artworks/anime/01", "artworks/anime/icons/初音未来01.png"],
  ["artworks/anime/EVA", "artworks/anime/icons/EVA.png"],
  ["artworks/anime/genshin", "artworks/anime/icons/原神.png"],
  ["artworks/anime/mix", "artworks/anime/icons/mix.png"],
  ["artworks/anime/喰种", "artworks/anime/icons/喰种.png"],
  ["artworks/anime/巨人", "artworks/anime/icons/巨人.png"],
]);

const artGroups = new Map();
walkFiles(path.join(root, "artworks"))
  .filter((filePath) => imageExt.has(path.extname(filePath).toLowerCase()))
  .filter((filePath) => !toRelative(filePath).startsWith("artworks/anime/icons/"))
  .forEach((filePath) => {
    const group = toRelative(path.dirname(filePath));
    const items = artGroups.get(group) || [];
    items.push(filePath);
    artGroups.set(group, items);
  });

const artworkCategories = Array.from(artGroups.entries())
  .sort(([a], [b]) => a.localeCompare(b, "zh-Hans-CN"))
  .map(([group, files], categoryIndex) => {
    const items = files
      .sort((a, b) => path.basename(a).localeCompare(path.basename(b), "zh-Hans-CN"))
      .map((filePath, artIndex) => ({
        id: `art-${categoryIndex + 1}-${artIndex + 1}`,
        title: path.basename(filePath, path.extname(filePath)),
        src: toRelative(filePath),
      }));

    return {
      id: `artcat-${categoryIndex + 1}`,
      title: labelMap.get(group) || path.basename(group),
      path: group,
      cover: coverMap.get(group) || items[0]?.src || "",
      items,
    };
  });

const data = {
  profile: {
    name: "幻想復古Rivaboluss",
    alias: "miragerevivalism",
    netease: "miragerevivalism",
    email: "Rivaboluss@163.com",
    neteaseUrl: "https://music.163.com/#/artist?id=51532754",
    bilibiliUrl: "https://space.bilibili.com/73474297?spm_id_from=333.1007.0.0",
    avatar: "display/headprofile.png",
  },
  backgrounds,
  music,
  artworkCategories,
};

fs.writeFileSync(
  path.join(root, "site-data.js"),
  `window.RIVABOLUSS_DATA = ${JSON.stringify(data, null, 2)};\n`,
  "utf8",
);

const trackCount = music.reduce((total, album) => total + album.tracks.length, 0);
const artworkCount = artworkCategories.reduce(
  (total, category) => total + category.items.length,
  0,
);

console.log("site-data.js generated.");
console.log(`Backgrounds: ${backgrounds.length}`);
console.log(`Albums: ${music.length}`);
console.log(`Tracks: ${trackCount}`);
console.log(`Art categories: ${artworkCategories.length}`);
console.log(`Artworks: ${artworkCount}`);
