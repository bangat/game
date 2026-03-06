import html
import json
import re
import shutil
import urllib.parse
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SOURCES_PATH = ROOT / "sources.json"
GALLERY_PATH = ROOT / "gallery.html"
MANIFEST_PATH = ROOT / "preview_manifest.json"
PREVIEW_ROOT = ROOT / "previews"

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0 Safari/537.36"
EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif"]


def slugify(value: str) -> str:
    lowered = value.lower()
    lowered = re.sub(r"[^a-z0-9]+", "-", lowered)
    lowered = re.sub(r"-+", "-", lowered).strip("-")
    return lowered or "asset"


def fetch_bytes(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read()


def fetch_text(url: str) -> str:
    return fetch_bytes(url).decode("utf-8", "ignore")


def detect_extension(url: str, response_bytes: bytes) -> str:
    parsed = urllib.parse.urlparse(url)
    suffix = Path(parsed.path).suffix.lower()
    if suffix in EXTENSIONS:
        return suffix
    if response_bytes.startswith(b"\x89PNG"):
        return ".png"
    if response_bytes.startswith(b"\xff\xd8"):
        return ".jpg"
    if response_bytes[:6] in (b"GIF87a", b"GIF89a"):
        return ".gif"
    if response_bytes[:4] == b"RIFF" and response_bytes[8:12] == b"WEBP":
        return ".webp"
    return ".img"


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
        if any(ext in lowered for ext in EXTENSIONS):
            return full_url
    return ""


def download_preview(category_name: str, title: str, preview_url: str) -> str:
    if not preview_url:
        return ""

    category_dir = PREVIEW_ROOT / category_name
    category_dir.mkdir(parents=True, exist_ok=True)
    payload = fetch_bytes(preview_url)
    extension = detect_extension(preview_url, payload)
    filename = f"{slugify(title)}{extension}"
    destination = category_dir / filename
    destination.write_bytes(payload)
    return destination.relative_to(ROOT).as_posix()


def build_badges(entry):
    pick = entry.get("pick", "support")
    pick_label = {
        "primary": "1차 채택",
        "support": "보조 후보",
        "backup": "백업 후보",
    }.get(pick, pick)
    use_for = ", ".join(entry.get("useFor", []))
    badges = [f'<span class="badge {pick}">{html.escape(pick_label)}</span>']
    if use_for:
        badges.append(f'<span class="badge uses">{html.escape(use_for)}</span>')
    return "".join(badges)


def build_gallery(data, entries):
    sections = []
    by_category = {}
    for entry in entries:
        by_category.setdefault(entry["category"], []).append(entry)

    for category in data.get("categories", []):
        category_name = category["name"]
        label = category.get("label", category_name)
        cards = []
        for entry in by_category.get(category_name, []):
            preview = entry.get("localPreviewPath", "")
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
                        <div class="meta">{html.escape(label)}</div>
                        <div class="badges">{build_badges(entry)}</div>
                        <h2>{html.escape(entry["title"])}</h2>
                        <p>{html.escape(entry["notes"])}</p>
                        <div class="links">
                            <a href="{html.escape(entry["url"])}" target="_blank" rel="noreferrer">원본 페이지</a>
                            {f'<a href="{html.escape(entry["previewUrl"])}" target="_blank" rel="noreferrer">원본 썸네일</a>' if entry.get("previewUrl") else ''}
                        </div>
                    </div>
                </article>
                """
            )
        sections.append(
            f"""
            <section class="section">
                <div class="section-head">
                    <h2>{html.escape(label)}</h2>
                    <p>{len(cards)}개 후보</p>
                </div>
                <div class="grid">
                    {''.join(cards)}
                </div>
            </section>
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
      --bg: #110d14;
      --bg2: #19111f;
      --panel: #1d1724;
      --line: #31293c;
      --text: #f5effc;
      --sub: #b9acc9;
      --accent: #f8c75c;
      --primary: #7ce0b8;
      --support: #90baff;
      --backup: #c8a6ff;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      padding: 24px;
      font-family: 'Segoe UI', sans-serif;
      background:
        radial-gradient(circle at top, rgba(109, 62, 169, 0.2), transparent 30%),
        radial-gradient(circle at bottom right, rgba(190, 78, 37, 0.16), transparent 25%),
        linear-gradient(180deg, var(--bg2), var(--bg) 80%);
      color: var(--text);
    }}
    header {{
      margin-bottom: 28px;
      padding: 20px 22px;
      border: 1px solid var(--line);
      border-radius: 20px;
      background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.02));
    }}
    h1 {{
      margin: 0 0 10px;
      font-size: 34px;
    }}
    header p {{
      margin: 0;
      color: var(--sub);
      line-height: 1.7;
    }}
    .section {{
      margin-bottom: 30px;
    }}
    .section-head {{
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
    }}
    .section-head h2 {{
      margin: 0;
      font-size: 24px;
    }}
    .section-head p {{
      margin: 0;
      color: var(--sub);
      font-size: 14px;
    }}
    .grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
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
      height: 240px;
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
    .badges {{
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 10px;
    }}
    .badge {{
      display: inline-flex;
      align-items: center;
      padding: 4px 8px;
      border-radius: 999px;
      font-size: 12px;
      line-height: 1;
      border: 1px solid rgba(255,255,255,0.12);
    }}
    .badge.primary {{ color: var(--primary); border-color: rgba(124, 224, 184, 0.32); background: rgba(124, 224, 184, 0.1); }}
    .badge.support {{ color: var(--support); border-color: rgba(144, 186, 255, 0.32); background: rgba(144, 186, 255, 0.1); }}
    .badge.backup {{ color: var(--backup); border-color: rgba(200, 166, 255, 0.32); background: rgba(200, 166, 255, 0.1); }}
    .badge.uses {{ color: #f0dca0; border-color: rgba(240, 220, 160, 0.25); background: rgba(240, 220, 160, 0.08); }}
    h2 {{
      margin: 0 0 10px;
      font-size: 20px;
      line-height: 1.35;
    }}
    p {{
      margin: 0 0 14px;
      color: var(--sub);
      line-height: 1.6;
      min-height: 76px;
    }}
    .links {{
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
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
    <p>잠룡형 다크 판타지 모바일 ARPG 방향으로 재정리한 후보입니다. 각 카드는 1차 채택, 보조, 백업 상태와 실제 사용처를 함께 표시합니다. 썸네일은 로컬에 저장되어 오프라인 검수도 가능합니다.</p>
  </header>
  <main>
    {''.join(sections)}
  </main>
</body>
</html>
"""


def main():
    data = json.loads(SOURCES_PATH.read_text(encoding="utf-8"))
    if PREVIEW_ROOT.exists():
        shutil.rmtree(PREVIEW_ROOT)
    PREVIEW_ROOT.mkdir(parents=True, exist_ok=True)

    entries = []
    for category in data.get("categories", []):
        category_name = category["name"]
        for candidate in category.get("candidates", []):
            preview_url = ""
            local_preview = ""
            error = ""
            try:
                document = fetch_text(candidate["url"])
                preview_url = extract_preview_url(candidate["url"], document)
                if preview_url:
                    local_preview = download_preview(category_name, candidate["title"], preview_url)
            except Exception as exc:
                error = str(exc)

            entries.append(
                {
                    "category": category_name,
                    "title": candidate["title"],
                    "url": candidate["url"],
                    "notes": candidate.get("notes", ""),
                    "type": candidate.get("type", ""),
                    "pick": candidate.get("pick", "support"),
                    "useFor": candidate.get("useFor", []),
                    "previewUrl": preview_url,
                    "localPreviewPath": local_preview,
                    "error": error,
                }
            )

    MANIFEST_PATH.write_text(
        json.dumps({"entries": entries}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    GALLERY_PATH.write_text(build_gallery(data, entries), encoding="utf-8")
    print(f"generated: {GALLERY_PATH}")


if __name__ == "__main__":
    main()
