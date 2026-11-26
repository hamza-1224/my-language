# My Language for iPhone (native app)

A thin native shell (Capacitor 8) around the same app as the website. A full copy of the
app is built in, so it opens instantly and works with no internet. When you're online it
downloads newer versions from the website by itself and shows "Update ready · tap to reload".
Cards sync through Supabase with the website and the Mac app.

## Get the app file

GitHub builds it on a Mac: **Releases → "My Language for iPhone" → My-Language.ipa**
(https://github.com/hamza-1224/my-language/releases/tag/iphone-app).
To rebuild by hand: Actions → "Build iPhone app" → Run workflow.

## Install with AltStore

Same steps as My Budget (AltServer on the Mac, AltStore on the iPhone): download My-Language.ipa
in Safari, then AltStore → My Apps → + → pick it. A free Apple ID can keep 3 sideloaded apps
active at once, and AltStore itself counts as one, so AltStore plus two apps is the limit.
Signatures last 7 days and AltStore refreshes them when the Mac and iPhone share Wi-Fi.

## How updates work

- `www/index.html` (from `loader.html`) opens the newest copy on the phone: the built-in one,
  or a newer one the app downloaded from the website (`zb.native.app` in localStorage).
- If a downloaded copy fails to start within 4 seconds, the loader drops it and falls back to
  the built-in copy.
- Only changes to the native shell itself (this folder) need a new .ipa.

## Developing

    cd native && npm install && npm run sync   # bundles the web app into the iOS project
    npx cap open ios                           # on a Mac with Xcode
