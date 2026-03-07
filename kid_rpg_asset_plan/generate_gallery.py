import html
import hashlib
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

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36"
)
IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp", ".gif"}


def slugify(value: str) -> str:
    lowered = value.lower()
    lowered = re.sub(r"[^a-z0-9]+", "-", lowered)
    lowered = re.sub(r"-{2,}", "-", lowered).strip("-")
    return lowered or "asset"


def fetch_bytes(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=45) as response:
        return response.read()


def fetch_text(url: str) -> str:
    return fetch_bytes(url).decode("utf-8", "ignore")


def detect_extension(url: str, payload: bytes) -> str:
    suffix = Path(urllib.parse.urlparse(url).path).suffix.lower()
    if suffix in IMAGE_SUFFIXES:
        return suffix
    if payload.startswith(b"\x89PNG"):
        return ".png"
    if payload.startswith(b"\xff\xd8"):
        return ".jpg"
    if payload[:6] in (b"GIF87a", b"GIF89a"):
        return ".gif"
    if payload[:4] == b"RIFF" and payload[8:12] == b"WEBP":
        return ".webp"
    return ".img"


def extract_preview_url(page_url: str, document: str) -> str:
    meta_patterns = [
        r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)',
        r'<meta[^>]+name=["\']twitter:image["\'][^>]+content=["\']([^"\']+)',
        r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']',
        r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+name=["\']twitter:image["\']',
    ]
    for pattern in meta_patterns:
        match = re.search(pattern, document, re.IGNORECASE)
        if match:
            return urllib.parse.urljoin(page_url, match.group(1))

    matches = re.findall(r'<img[^>]+src=["\']([^"\']+)', document, re.IGNORECASE)
    for candidate in matches:
        full = urllib.parse.urljoin(page_url, candidate)
        suffix = Path(urllib.parse.urlparse(full).path).suffix.lower()
        if suffix in IMAGE_SUFFIXES:
            return full
    return ""


def download_preview(category_name: str, title: str, preview_url: str) -> str:
    if not preview_url:
        return ""

    category_dir = PREVIEW_ROOT / category_name
    category_dir.mkdir(parents=True, exist_ok=True)
    payload = fetch_bytes(preview_url)
    extension = detect_extension(preview_url, payload)
    digest = hashlib.sha1(preview_url.encode("utf-8")).hexdigest()[:8]
    filename = f"{slugify(title)}-{digest}{extension}"
    destination = category_dir / filename
    destination.write_bytes(payload)
    return destination.relative_to(ROOT).as_posix()


def pick_label(pick: str) -> str:
    return {
        "primary": "1차 후보",
        "support": "보조 후보",
        "backup": "백업 후보",
    }.get(pick, pick)


def priority_label(priority: str) -> str:
    return {
        "high": "우선 검토",
        "medium": "후순위 검토",
        "low": "참고",
    }.get(priority, priority)


def card_badges(entry: dict) -> str:
    badges = [
        f'<span class="badge {entry["pick"]}">{html.escape(pick_label(entry["pick"]))}</span>'
    ]
    if entry.get("type"):
        badges.append(f'<span class="badge type">{html.escape(entry["type"])}</span>')
    if entry.get("useFor"):
        badges.append(
            f'<span class="badge uses">{html.escape(", ".join(entry["useFor"]))}</span>'
        )
    return "".join(badges)


def build_gallery(data: dict, entries: list[dict]) -> str:
    grouped: dict[str, list[dict]] = {}
    for entry in entries:
        grouped.setdefault(entry["category"], []).append(entry)

    nav_html = []
    sections_html = []
    for category in data["categories"]:
        category_entries = grouped.get(category["name"], [])
        nav_html.append(
            f'<a class="chip" href="#{html.escape(category["name"])}">{html.escape(category["label"])}</a>'
        )

        cards = []
        for entry in category_entries:
            preview_html = ""
            preview_source = entry.get("displayPreview", "")
            if preview_source:
                preview_html = (
                    f'<img src="{html.escape(preview_source)}" '
                    f'alt="{html.escape(entry["title"])} 미리보기" loading="lazy">'
                )
            else:
                preview_html = '<div class="placeholder">미리보기 없음</div>'

            error_html = (
                f'<div class="error">미리보기 자동 수집 실패: {html.escape(entry["error"])}</div>'
                if entry.get("error")
                else ""
            )

            cards.append(
                f"""
                <article class="card">
                  <div class="thumb">{preview_html}</div>
                  <div class="card-body">
                    <div class="card-meta">
                      <span class="section-pill">{html.escape(category["label"])}</span>
                      <span class="priority-pill">{html.escape(priority_label(category["priority"]))}</span>
                    </div>
                    <h3>{html.escape(entry["title"])}</h3>
                    <div class="badges">{card_badges(entry)}</div>
                    <p class="notes">{html.escape(entry["notes"])}</p>
                    {error_html}
                    <div class="links">
                      <a href="{html.escape(entry["url"])}" target="_blank" rel="noreferrer">원본 페이지</a>
                      {f'<a href="{html.escape(entry["previewUrl"])}" target="_blank" rel="noreferrer">원본 미리보기</a>' if entry.get("previewUrl") else ""}
                    </div>
                  </div>
                </article>
                """
            )

        sections_html.append(
            f"""
            <section class="section" id="{html.escape(category["name"])}">
              <div class="section-head">
                <div>
                  <h2>{html.escape(category["label"])}</h2>
                  <p>{html.escape(category["description"])}</p>
                </div>
                <div class="count">{len(category_entries)}개</div>
              </div>
              <div class="grid">
                {''.join(cards)}
              </div>
            </section>
            """
        )

    total_count = len(entries)
    return f"""<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>kid_rpg asset gallery</title>
  <style>
    :root {{
      --bg: #09070b;
      --bg-2: #120f16;
      --panel: rgba(22, 18, 28, 0.92);
      --line: rgba(255, 255, 255, 0.09);
      --text: #f4f0f8;
      --sub: #b5a8c4;
      --gold: #f2c35c;
      --red: #ff7f76;
      --green: #6de0b3;
      --blue: #88b7ff;
      --purple: #baa1ff;
      --shadow: 0 18px 50px rgba(0, 0, 0, 0.45);
    }}
    * {{
      box-sizing: border-box;
    }}
    html {{
      scroll-behavior: smooth;
    }}
    body {{
      margin: 0;
      color: var(--text);
      font-family: "Segoe UI", sans-serif;
      background:
        radial-gradient(circle at top, rgba(98, 70, 131, 0.22), transparent 28%),
        radial-gradient(circle at right bottom, rgba(184, 56, 42, 0.16), transparent 22%),
        linear-gradient(180deg, var(--bg-2), var(--bg));
    }}
    a {{
      color: #96d7ff;
      text-decoration: none;
      font-weight: 700;
    }}
    a:hover {{
      text-decoration: underline;
    }}
    .shell {{
      width: min(1440px, calc(100% - 32px));
      margin: 20px auto 48px;
    }}
    .hero {{
      padding: 28px;
      border: 1px solid var(--line);
      border-radius: 24px;
      background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02));
      box-shadow: var(--shadow);
    }}
    .eyebrow {{
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      border-radius: 999px;
      background: rgba(242, 195, 92, 0.13);
      color: var(--gold);
      font-size: 12px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }}
    h1 {{
      margin: 14px 0 10px;
      font-size: clamp(30px, 4vw, 52px);
      line-height: 1.08;
    }}
    .lead {{
      margin: 0;
      max-width: 860px;
      color: var(--sub);
      font-size: 16px;
      line-height: 1.7;
    }}
    .summary {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 14px;
      margin-top: 20px;
    }}
    .summary-card {{
      padding: 16px 18px;
      border-radius: 18px;
      border: 1px solid var(--line);
      background: rgba(255,255,255,0.03);
    }}
    .summary-card strong {{
      display: block;
      font-size: 30px;
      margin-bottom: 6px;
    }}
    .summary-card span {{
      color: var(--sub);
      font-size: 14px;
    }}
    .toolbar {{
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin: 18px 0 26px;
      padding: 14px;
      border: 1px solid var(--line);
      border-radius: 18px;
      background: rgba(9, 7, 11, 0.86);
      backdrop-filter: blur(14px);
    }}
    .chip {{
      display: inline-flex;
      align-items: center;
      padding: 8px 14px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.04);
      color: var(--text);
      font-size: 14px;
      font-weight: 700;
    }}
    .chip:hover {{
      text-decoration: none;
      border-color: rgba(242,195,92,0.4);
      color: var(--gold);
    }}
    .section {{
      margin-bottom: 34px;
    }}
    .section-head {{
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 14px;
      margin-bottom: 14px;
    }}
    .section-head h2 {{
      margin: 0 0 8px;
      font-size: 26px;
    }}
    .section-head p {{
      margin: 0;
      color: var(--sub);
      line-height: 1.6;
    }}
    .count {{
      min-width: 72px;
      padding: 10px 14px;
      border-radius: 14px;
      border: 1px solid var(--line);
      background: rgba(255,255,255,0.03);
      text-align: center;
      font-weight: 700;
      color: var(--gold);
    }}
    .grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 18px;
    }}
    .card {{
      overflow: hidden;
      border: 1px solid var(--line);
      border-radius: 22px;
      background: var(--panel);
      box-shadow: var(--shadow);
    }}
    .thumb {{
      aspect-ratio: 16 / 9;
      background: #060508;
      border-bottom: 1px solid var(--line);
    }}
    .thumb img {{
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      image-rendering: auto;
    }}
    .placeholder {{
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      color: var(--sub);
      font-size: 14px;
    }}
    .card-body {{
      padding: 18px;
    }}
    .card-meta {{
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 12px;
    }}
    .section-pill,
    .priority-pill {{
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 12px;
      letter-spacing: 0.04em;
    }}
    .section-pill {{
      background: rgba(242, 195, 92, 0.14);
      color: var(--gold);
    }}
    .priority-pill {{
      background: rgba(136, 183, 255, 0.13);
      color: var(--blue);
    }}
    h3 {{
      margin: 0 0 10px;
      font-size: 22px;
      line-height: 1.3;
    }}
    .badges {{
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 12px;
    }}
    .badge {{
      display: inline-flex;
      align-items: center;
      padding: 5px 10px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,0.1);
      font-size: 12px;
      line-height: 1;
    }}
    .badge.primary {{
      color: var(--green);
      background: rgba(109, 224, 179, 0.12);
      border-color: rgba(109, 224, 179, 0.28);
    }}
    .badge.support {{
      color: var(--blue);
      background: rgba(136, 183, 255, 0.12);
      border-color: rgba(136, 183, 255, 0.28);
    }}
    .badge.backup {{
      color: var(--purple);
      background: rgba(186, 161, 255, 0.12);
      border-color: rgba(186, 161, 255, 0.28);
    }}
    .badge.type,
    .badge.uses {{
      color: var(--sub);
      background: rgba(255,255,255,0.04);
    }}
    .notes {{
      min-height: 72px;
      margin: 0 0 14px;
      color: var(--sub);
      line-height: 1.65;
    }}
    .error {{
      margin: 0 0 12px;
      padding: 10px 12px;
      border-radius: 12px;
      background: rgba(255, 127, 118, 0.12);
      color: #ffc5c0;
      font-size: 13px;
      line-height: 1.5;
    }}
    .links {{
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }}
    @media (max-width: 768px) {{
      .shell {{
        width: min(100% - 16px, 1440px);
        margin-top: 10px;
      }}
      .hero {{
        padding: 22px 18px;
      }}
      .toolbar {{
        top: 8px;
      }}
      .grid {{
        grid-template-columns: 1fr;
      }}
      .section-head {{
        align-items: flex-start;
        flex-direction: column;
      }}
    }}
  </style>
</head>
<body>
  <div class="shell">
    <header class="hero">
      <div class="eyebrow">Asset Review Board</div>
      <h1>Another Dungeon 톤으로 다시 추린 kid_rpg 에셋 후보</h1>
      <p class="lead">
        이전 3D/허접 HTML 방향을 버리고, 어나더던전처럼 도트 기반 ARPG 톤으로 전면 교체하기 위한
        실제 후보군입니다. 여기서 승인받은 톤만 다음 프로토타입에 적용합니다.
      </p>
      <div class="summary">
        <div class="summary-card">
          <strong>{total_count}</strong>
          <span>총 검토 카드</span>
        </div>
        <div class="summary-card">
          <strong>{len(data["categories"])}</strong>
          <span>카테고리</span>
        </div>
        <div class="summary-card">
          <strong>{html.escape(data["reviewTarget"])}</strong>
          <span>검토 목표</span>
        </div>
      </div>
    </header>
    <nav class="toolbar">
      {''.join(nav_html)}
    </nav>
    {''.join(sections_html)}
  </div>
</body>
</html>
"""


def main() -> None:
    data = json.loads(SOURCES_PATH.read_text(encoding="utf-8"))

    if PREVIEW_ROOT.exists():
        shutil.rmtree(PREVIEW_ROOT)
    PREVIEW_ROOT.mkdir(parents=True, exist_ok=True)

    entries: list[dict] = []
    for category in data["categories"]:
      for candidate in category["candidates"]:
        preview_url = candidate.get("previewUrl", "")
        local_preview = ""
        error = ""

        if not preview_url:
            try:
                document = fetch_text(candidate["url"])
                preview_url = extract_preview_url(candidate["url"], document)
            except Exception as exc:  # pragma: no cover - network dependent
                error = str(exc)

        if preview_url:
            try:
                local_preview = download_preview(category["name"], candidate["title"], preview_url)
            except Exception as exc:  # pragma: no cover - network dependent
                if error:
                    error = f"{error}; {exc}"
                else:
                    error = str(exc)

        entries.append(
            {
                "category": category["name"],
                "title": candidate["title"],
                "url": candidate["url"],
                "previewUrl": preview_url,
                "localPreviewPath": local_preview,
                "displayPreview": local_preview or preview_url,
                "type": candidate.get("type", ""),
                "pick": candidate.get("pick", "support"),
                "useFor": candidate.get("useFor", []),
                "notes": candidate.get("notes", ""),
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
