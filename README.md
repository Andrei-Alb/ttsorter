<div align="center">

<img src="docs/logo.png" width="96" height="96" alt="ttsorter">

# ttsorter

**Sort TikTok videos by views, likes, comments, shares or date, and download them in high quality without watermark.**

Free, open source, runs entirely in your browser.

[![MIT License](https://img.shields.io/badge/license-MIT-e9f056?style=flat-square&labelColor=1e1916)](LICENSE)
[![Chrome MV3](https://img.shields.io/badge/Chrome-Manifest%20V3-ff5c34?style=flat-square&logo=googlechrome&logoColor=white&labelColor=1e1916)](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)
[![Release](https://img.shields.io/github/v/release/Andrei-Alb/ttsorter?style=flat-square&color=ff5c34&labelColor=1e1916)](https://github.com/Andrei-Alb/ttsorter/releases/latest)

[**⬇ Download the extension**](https://github.com/Andrei-Alb/ttsorter/releases/latest/download/ttsorter.zip)

</div>

<br>

![ttsorter open on NASA's profile, sorted by views](docs/hero.png)

## What it does

- **Captures videos automatically** as you scroll TikTok: profiles, For You, search, hashtags, sounds.
- **Shows the stats** of each video in a floating panel: views, likes, comments, shares and post date.
- **Sorts in one click** by any of them. Click again to reverse the order.
- **Downloads the video** without watermark, at the highest resolution TikTok serves (up to 1080p). Photo posts download their images.
- **Filters** by caption or @profile. On a profile page it shows only that profile's videos (TikTok mixes in recommendations from other accounts).

Looking for Instagram? Check out [isorter](https://github.com/Andrei-Alb/isorter).

<table>
<tr>
<td width="50%" align="center"><img src="docs/demo.gif" alt="Changing the sort order and downloading a video"><br><sub>Sorting and downloading</sub></td>
<td width="50%" align="center"><img src="docs/panel.png" alt="The ttsorter panel"><br><sub>The panel</sub></td>
</tr>
</table>

## Installation

The extension isn't on the Chrome Web Store yet. Installing it by hand takes a minute:

1. Download [**ttsorter.zip**](https://github.com/Andrei-Alb/ttsorter/releases/latest/download/ttsorter.zip) and unzip it into a folder you won't delete.
2. Open `chrome://extensions` in your browser.
3. Turn on **Developer mode** in the top-right corner.
4. Click **Load unpacked** and pick the unzipped folder (the one containing `manifest.json`).
5. Open [TikTok](https://www.tiktok.com) and scroll. The panel shows up on the right.

Works on Chrome, Edge, Brave, Opera, Arc and other Chromium-based browsers.

<details>
<summary>Install from source</summary>

```bash
git clone https://github.com/Andrei-Alb/ttsorter.git
```

Then follow steps 2 to 5, picking the `ttsorter/ttsorter` folder. There's no build step: what's in the repository is what runs.

</details>

## Usage

| Action | How |
| --- | --- |
| Open or close the panel | Click the extension icon, or the floating button in the corner of the page |
| Sort | Click Views, Likes, Comments, Shares or Date |
| Reverse the order | Click the same tab again, or the Highest/Lowest button |
| Download | The download button on the card; the ring shows progress |
| Open the video | Click the thumbnail or the external link icon (opens in a new tab) |
| Start over | The trash icon at the top of the panel |

Captured videos live only in the open tab. Reload the page and the list starts over.

### About quality

The extension picks the highest resolution available. When TikTok serves 1080p, the file is **HEVC (H.265)**: it plays fine on Mac, iPhone, Android and current editors, but Windows may ask for the [HEVC Video Extensions](https://apps.microsoft.com/detail/9n4wgh0z6vhq). Without 1080p, the file is 720p H.264.

## Privacy

Nothing leaves your browser. There's no server, account, telemetry or analytics. The extension reads the responses TikTok already sends to the page and downloads videos with your own session.

Permissions requested:

- `storage`: remember the chosen sort order and whether the panel was open.
- `downloads`: fallback download path when the browser blocks the main one.
- `webRequest`: see the status of the TikTok pages the extension opens; when TikTok answers 403, the tab reloads itself (up to 2 times).
- Access to `www.tiktok.com`: the only site it runs on.

## How it works

```
ttsorter/
├── manifest.json
├── icons/
└── src/
    ├── hook.js         # MAIN world: reads TikTok's API and handles downloads
    ├── content.js      # panel (shadow DOM), sorting, filtering, progress
    ├── panel.css
    └── background.js   # extension icon, opening tabs, fallback download
```

- `hook.js` runs in the page context at `document_start` and intercepts `fetch`/`XMLHttpRequest` calls to TikTok's `/api/` routes, plus the JSON rendered into the HTML. Every item with an `id`, `stats` and `video` becomes a card. Ads are dropped.
- Downloads use the playback links (`playAddr` and `bitrateInfo`), which have no watermark. `downloadAddr`, which does, is never used. The file is fetched with the page's own cookies and saved as a blob; if that fails, `background.js` hands the link to the browser's download manager.
- The panel lives in a shadow DOM, so TikTok's CSS doesn't leak in and ours doesn't leak out.

Contributions are welcome. Please open an issue before large changes.

## Disclaimer

ttsorter is not affiliated with TikTok or ByteDance. Use it to download your own content or content you have permission to use, and respect the copyright of the people who made the videos. If TikTok changes its site, the extension may stop working until it's updated.

## License

[MIT](LICENSE)
