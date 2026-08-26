# Zoe & Eva's Magic Music Box 🦄🌈

A bright, rainbow-and-unicorn themed music player with Google Chromecast
support. It's a static site — no server or database, just HTML/CSS/JS
plus an `mp3` folder — so it deploys straight from GitHub to Cloudflare
Pages.

## File structure

```
index.html
css/style.css
js/app.js
music/
  playlist.json          <- the "song list" the site reads
  zoe-and-evas-rainbow-dance.mp3   <- add this file (see below)
```

## Adding "Zoe & Eva's Rainbow Dance"

1. Rename or export your audio file as an **mp3**.
2. Name it exactly: `zoe-and-evas-rainbow-dance.mp3`
3. Drop it into the `music/` folder (it can replace the placeholder
   text file there).
4. Commit and push — that's it, no code changes needed.

## Adding more songs later

Open `music/playlist.json` and add another entry, e.g.:

```json
[
  {
    "title": "Zoe & Eva's Rainbow Dance",
    "artist": "Zoe & Eva",
    "file": "music/zoe-and-evas-rainbow-dance.mp3",
    "emoji": "🌈"
  },
  {
    "title": "Another Magic Song",
    "artist": "Zoe & Eva",
    "file": "music/another-magic-song.mp3",
    "emoji": "✨"
  }
]
```

Then put the matching mp3 file in `music/`. The song list on the page
updates automatically — no HTML/JS editing required.

## Deploying via GitHub → Cloudflare Pages

1. Push this folder to a GitHub repo.
2. In Cloudflare dashboard: **Workers & Pages → Create → Pages →
   Connect to Git**, pick the repo.
3. Build settings: leave **Build command** blank and set
   **Build output directory** to `/` (this is a plain static site,
   nothing to build).
4. Deploy. Cloudflare will give you a `*.pages.dev` URL (and you can
   attach a custom domain afterward).

## About the Chromecast button

The cast button uses Google's official Cast Web Sender SDK. A few
things worth knowing:

- **It only works once the site is live on a real HTTPS URL**
  (Cloudflare Pages gives you this automatically). It won't find cast
  devices when opening `index.html` straight from your computer's
  file system.
- Your Chromecast device fetches the mp3 directly from your site's
  URL, so the song needs to be in the deployed `music/` folder — casting
  works the moment the site + mp3 are both live, no extra setup.
- It uses Google's **default media receiver**, so there's nothing to
  register or configure in a Google Cast developer console — the cast
  button just works out of the box.
- Click the cast icon → pick your Chromecast/TV → the current song
  loads there instead of playing locally, and the rainbow progress bar
  keeps following along.

## Customizing

- Colors, fonts, and the rainbow arc all live in `css/style.css` /
  `js/app.js` (see the `bandColors` array in `app.js` for the rainbow's
  colors).
- The site name is set directly in `index.html` (`<h1 class="hero__title">`)
  if you'd like to change it from "Zoe & Eva's Music Box."
