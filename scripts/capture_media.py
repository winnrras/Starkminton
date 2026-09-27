"""
Captures README screenshots and a walkthrough GIF from the deployed dashboard.
Drives mock mode in headless Chromium and writes to docs/media/.

Run: uv run --with playwright python scripts/capture_media.py [base_url]
     (needs ffmpeg on PATH; default base_url is the Vercel deployment)

Read-only against the deployment: session saves and deletes are blocked
(the mock session is never saved),
and the ElevenLabs voice route is stubbed so a run spends no TTS credits.
The AI Coach step makes one real Gemini call on the deployment's key.
Fails on any page error or missing screen, so a UI change cannot leave
stale media behind silently.
"""

import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
BASE_URL = sys.argv[1] if len(sys.argv) > 1 else "https://starkminton-mauve.vercel.app"
OUT_DIR = ROOT / "docs" / "media"
TIMEOUT_MS = 90_000
GIF_WIDTH = 960
MOCK_HITS = 12
# Saved sessions shown in the comparison and AI Coach shots, by their
# labels in TIMEZONE. Pick sessions with force and sweet-spot data.
TIMEZONE = "America/Indiana/Indianapolis"
COMPARE_SESSIONS = ("Apr 19 01:14 PM", "Apr 19 03:08 PM")
COACH_SESSION = "Apr 19 03:08 PM"

# Headless screenshots have no mouse pointer, so the GIF draws its own.
CURSOR_JS = """() => {
  const c = document.createElement('div');
  c.id = 'rec-cursor';
  c.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M4 2l16 10-7 1.6L9.4 21z" '
    + 'fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  c.style.cssText = 'position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none';
  document.body.appendChild(c);
}"""


class Recorder:
    """Screenshots the page as GIF frames, each with its own display time,
    so slow waits can be time-lapsed and key screens held."""

    def __init__(self, page, frame_dir):
        self.page, self.dir = page, frame_dir
        self.frames = []  # (png path, seconds shown)
        self.x, self.y = 640, 560
        page.evaluate(CURSOR_JS)
        self._place(self.x, self.y)

    def _place(self, x, y):
        # The arrow's tip sits at (4, 2) inside its 24px box.
        self.page.evaluate(f"document.getElementById('rec-cursor').style.transform = 'translate({x - 4}px, {y - 2}px)'")

    def shot(self, ms):
        path = self.dir / f"{len(self.frames):04d}.png"
        self.page.screenshot(path=path)
        self.frames.append((path, ms / 1000))

    def still(self, name):
        cursor = "document.getElementById('rec-cursor').style.visibility"
        self.page.evaluate(f"{cursor} = 'hidden'")
        self.page.screenshot(path=OUT_DIR / name)
        self.page.evaluate(f"{cursor} = ''")

    def move_to(self, locator, steps=6):
        locator.scroll_into_view_if_needed()
        box = locator.bounding_box()
        tx, ty = box["x"] + box["width"] / 2, box["y"] + box["height"] / 2
        for i in range(1, steps + 1):
            t = i / steps
            t = t * t * (3 - 2 * t)  # ease in and out
            self._place(self.x + (tx - self.x) * t, self.y + (ty - self.y) * t)
            self.shot(35)
        self.x, self.y = tx, ty
        self.shot(150)

    def click(self, locator, hold_ms=350):
        self.move_to(locator)
        locator.click()
        self.page.wait_for_timeout(300)
        self.shot(hold_ms)

    def time_lapse(self, done_js, every_ms=600, show_ms=220):
        for _ in range(TIMEOUT_MS // every_ms):
            self.shot(show_ms)
            if self.page.evaluate(done_js):
                return
            self.page.wait_for_timeout(every_ms)
        raise TimeoutError(f"never reached: {done_js}")

    def write_gif(self, out):
        listing = self.dir / "frames.txt"
        lines = [f"file '{p.name}'\nduration {s:.3f}" for p, s in self.frames]
        # The concat demuxer ignores the last duration unless the file repeats.
        lines.append(f"file '{self.frames[-1][0].name}'")
        listing.write_text("\n".join(lines), encoding="utf-8")
        palette = (f"scale={GIF_WIDTH}:-1:flags=lanczos,split[a][b];"
                   "[a]palettegen=max_colors=128:stats_mode=diff[p];"
                   "[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0",
                        "-i", str(listing), "-vf", palette, "-fps_mode", "vfr", str(out)], check=True)


def guard_routes(page):
    """Keep the run read-only and free: stub TTS, refuse session writes."""
    page.route("**/api/voice/generate", lambda r: r.fulfill(
        status=200, content_type="application/json", body=json.dumps({"clips": []})))

    def sessions(route):
        if route.request.method == "GET":
            route.continue_()
        else:
            route.abort()
    page.route("**/api/sessions**", sessions)


def hit_count_js(n):
    # The session card's "Hits" stat: a label span followed by the value span.
    return f"""() => {{
      const label = [...document.querySelectorAll('span')].find(e => e.textContent === 'Hits');
      return Number(label?.nextElementSibling?.textContent.replace(/,/g, '')) >= {n};
    }}"""


def capture(frame_dir):
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1280, "height": 800}, device_scale_factor=2,
                                locale="en-US", timezone_id=TIMEZONE)
        page.set_default_timeout(TIMEOUT_MS)
        page.on("pageerror", lambda e: errors.append(str(e)))
        guard_routes(page)

        page.goto(BASE_URL)
        start = page.get_by_role("button", name="Start session", exact=True)
        start.wait_for()
        page.wait_for_timeout(2500)  # splash screen
        rec = Recorder(page, frame_dir)
        rec.shot(1000)

        # Live session with mock hits.
        rec.click(start)
        rec.click(page.locator("label:has([role=switch])"))
        rec.time_lapse(hit_count_js(MOCK_HITS), every_ms=700, show_ms=150)
        rec.click(page.locator("label:has([role=switch])"), hold_ms=300)
        rec.still("dashboard.png")
        rec.shot(2500)

        # Compare two saved sessions on the fullscreen strike map.
        rec.click(page.get_by_role("button", name="Pick 2 sessions", exact=False))
        panel = page.locator("div.max-w-\\[340px\\]")
        for label in COMPARE_SESSIONS:
            rec.click(panel.get_by_role("button", name=label), hold_ms=400)
        panel.get_by_text("Duration", exact=True).wait_for()
        page.wait_for_timeout(800)
        rec.still("compare.png")
        rec.shot(3000)
        rec.click(page.get_by_role("button", name="Close fullscreen"))

        # AI Coach on a saved session.
        coach = page.locator("div.rounded-3xl", has_text="Get coaching insights")
        rec.click(coach.get_by_role("button", name="Select a session"))
        rec.click(coach.locator("div.absolute").get_by_role("button", name=COACH_SESSION))
        rec.click(coach.get_by_role("button", name="Analyze →"))
        rec.time_lapse("() => !document.body.innerText.includes('Analyzing your session')", every_ms=800, show_ms=120)
        assert page.get_by_text("Analysis failed").count() == 0, "AI Coach returned an error"
        page.wait_for_timeout(800)
        rec.still("coach.png")
        rec.shot(3500)
        browser.close()

    assert not errors, f"page errors during capture: {errors}"
    rec.write_gif(OUT_DIR / "walkthrough.gif")


if __name__ == "__main__":
    if not shutil.which("ffmpeg"):
        raise SystemExit("ffmpeg is not on PATH; it builds walkthrough.gif.")
    with tempfile.TemporaryDirectory() as tmp:
        capture(Path(tmp))
    for f in sorted(OUT_DIR.iterdir()):
        print(f"{f.relative_to(ROOT)}  {f.stat().st_size // 1024} KB")
