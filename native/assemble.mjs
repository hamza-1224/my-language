// Bundles the web app (repo root) for the iPhone and Mac apps.
// Usage: node assemble.mjs [outDir]  (default: native/www; the Mac app passes its own www)
// www/index.html is a small loader; the app itself is www/app.html: index.html with its
// stylesheet and scripts written into it (the same page sync.js builds when it downloads an update).
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
const root = new URL("../", import.meta.url).pathname;
const www = (process.argv[2] ? resolve(process.cwd(), process.argv[2]) : new URL("./www", import.meta.url).pathname) + "/";
rmSync(www, { recursive: true, force: true });
mkdirSync(www + "vendor", { recursive: true });
const read = p => readFileSync(root + p, "utf8");
let html = read("index.html");
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, p) => "<style>\n" + read(p) + "\n</style>");
html = html.replace(/<script src="((?:data\/)?[a-z-]+\.js)"><\/script>/g, (tag, p) => p === "config.js" ? tag : "<script>\n" + read(p).replace(/<\/script/gi, "<\\/script") + "\n</script>");
const v = (/APP_VERSION = "([^"]+)"/.exec(html) || [])[1];
if (!v) throw new Error("APP_VERSION not found");
writeFileSync(www + "app.html", html);
for (const f of ["config.js", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png", "vendor/supabase.js"]) cpSync(root + f, www + f);
cpSync(root + "fonts", www + "fonts", { recursive: true });
cpSync(root + "img", www + "img", { recursive: true });
writeFileSync(www + "index.html", readFileSync(new URL("./loader.html", import.meta.url), "utf8"));
console.log("assembled www with app", v);
