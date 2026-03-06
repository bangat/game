import html
import json
import re
import urllib.parse
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SOURCES_PATH = ROOT / "sources.json"
GALLERY_PATH = ROOT / "gallery.html"
MANIFEST_PATH = ROOT / "preview_manifest.json"


USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0 Safari/537.36"


def fetch_text(url: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=30) as response:
        raw = response.read()
    return raw.decode("utf-8", "ignore")


def extract_preview_url(page_url: str, document: str) -> str:
    meta_match = re.search(
        r"<meta[^>]+(?:property|name)=[\"'](?:og:image|twitter:image)[\"'][^>]+content=[\"']([^\"']+)",
        document,
        re.IGNORECASE,
    )
    if meta_match:
        return urllib.parse.urljoin(page_url, meta_match.group(1))

    image_matches = re.findall(r"<img[^>]+src=[\"']([^\"']+)", document, re.IGNORECASE)
    for candidate in image_matches:
        full_url = urllib.parse.urljoin(page_url, candidate)
        lowered = full_url.lower()
        if any(ext in lowered for ext in [".png", ".jpg", ".jpeg", ".webp"]):
            return full_url
    return ""


def build_gallery(entries):
    cards = []
    for entry in entries:
        preview = entry.get("previewUrl", "")
        preview_html = (
            f'<img src="{html.escape(preview)}" alt="{html.escape(entry["title"])} 미리보기" loading="lazy">'
            if preview
            else '<div class="placeholder">미리보기 없음</div>'
        )
        cards.append(
            f"""
            <article class="card">
                <div class="thumb">{preview_html}</div>
                <div class="body">
                    <div class="meta">{html.escape(entry["category"])}</div>
                    <h2>{html.escape(entry["title"])}</h2>
                    <p>{html.escape(entry["notes"])}</p>
                    <a href="{html.escape(entry["url"])}" target="_blank" rel="noreferrer">원본 페이지 열기</a>
                </div>
            </article>
            """
        )

    return f"""<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>kid_rpg 에셋 검수 갤러리</title>
  <style>
    :root {{
      --bg: #131018;
      --panel: #1d1724;
      --line: #31293c;
      --text: #f5effc;
      --sub: #b9acc9;
      --accent: #f8c75c;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      padding: 24px;
      font-family: 'Segoe UI', sans-serif;
      background:
        radial-gradient(circle at top, rgba(116, 66, 180, 0.22), transparent 30%),
        linear-gradient(180deg, #17121e, #0e0a14 80%);
      color: var(--text);
    }}
    header {{
      margin-bottom: 24px;
    }}
    h1 {{
      margin: 0 0 8px;
      font-size: 32px;
    }}
    header p {{
      margin: 0;
      color: var(--sub);
      line-height: 1.6;
    }}
    .grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 18px;
    }}
    .card {{
      overflow: hidden;
      border: 1px solid var(--line);
      border-radius: 18px;
      background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015));
      box-shadow: 0 20px 40px rgba(0,0,0,0.28);
    }}
    .thumb {{
      height: 220px;
      background: #0d0b11;
      display: flex;
      align-items: center;
      justify-content: center;
      border-bottom: 1px solid var(--line);
    }}
    .thumb img {{
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }}
    .placeholder {{
      color: var(--sub);
      font-size: 14px;
    }}
    .body {{
      padding: 16px;
    }}
    .meta {{
      display: inline-block;
      margin-bottom: 8px;
      padding: 4px 8px;
      border-radius: 999px;
      background: rgba(248, 199, 92, 0.14);
      color: var(--accent);
      font-size: 12px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }}
    h2 {{
      margin: 0 0 10px;
      font-size: 20px;
      line-height: 1.3;
    }}
    p {{
      margin: 0 0 14px;
      color: var(--sub);
      line-height: 1.6;
      min-height: 76px;
    }}
    a {{
      color: #8fd3ff;
      text-decoration: none;
      font-weight: 600;
    }}
    a:hover {{
      text-decoration: underline;
    }}
  </style>
</head>
<body>
  <header>
    <h1>kid_rpg 에셋 검수 갤러리</h1>
    <p>도트 2.5D 액션 RPG 방향으로 추린 캐릭터, 몬스터, 타일맵, VFX, UI, 오디오 후보입니다. 각 카드에서 바로 원본 페이지를 열 수 있습니다.</p>
  </header>
  <main class="grid">
    {''.join(cards)}
  </main>
</body>
</html>
"""


def main():
    data = json.loads(SOURCES_PATH.read_text(encoding="utf-8"))
    entries = []

    for category in data.get("categories", []):
        category_name = category["name"]
        for candidate in category.get("candidates", []):
            preview_url = ""
            error = ""
            try:
                document = fetch_text(candidate["url"])
                preview_url = extract_preview_url(candidate["url"], document)
            except Exception as exc:
                error = str(exc)

            entries.append(
                {
                    "category": category_name,
                    "title": candidate["title"],
                    "url": candidate["url"],
                    "notes": candidate.get("notes", ""),
                    "previewUrl": preview_url,
                    "error": error,
                }
            )

    MANIFEST_PATH.write_text(
        json.dumps({"entries": entries}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    GALLERY_PATH.write_text(build_gallery(entries), encoding="utf-8")
    print(f"generated: {GALLERY_PATH}")


if __name__ == "__main__":
    main()
