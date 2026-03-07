const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const ROOT = __dirname;
const DEFAULT_PORT = 43189;
const CATALOG_PATH = path.join(ROOT, "jamryong_asset_seed.json");
const PREVIEW_PATH = path.join(ROOT, "preview_manifest.json");
const STATE_PATH = path.join(ROOT, "selection_state.json");
const APPROVED_PATH = path.join(ROOT, "approved_assets.json");

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

const STATUS_SET = new Set(["pending", "approved", "hold", "rejected"]);

function parsePort() {
  const portFlagIndex = process.argv.indexOf("--port");
  if (portFlagIndex >= 0 && process.argv[portFlagIndex + 1]) {
    return Number(process.argv[portFlagIndex + 1]) || DEFAULT_PORT;
  }
  return DEFAULT_PORT;
}

function ensureJsonFile(filePath, initialValue) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(initialValue, null, 2), "utf8");
  }
}

function readJson(filePath, fallbackValue) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (_error) {
    return fallbackValue;
  }
}

function normalizePreviewPath(localPath) {
  if (!localPath) {
    return "";
  }
  return `/${localPath.replace(/\\/g, "/")}`;
}

function sortByNumber(left, right) {
  const normalize = (value) => {
    const match = String(value).match(/^([A-Z]+)-(\d+)/);
    if (!match) {
      return { prefix: String(value), number: 0 };
    }
    return { prefix: match[1], number: Number(match[2]) };
  };

  const a = normalize(left.number);
  const b = normalize(right.number);
  if (a.prefix !== b.prefix) {
    return a.prefix.localeCompare(b.prefix);
  }
  return a.number - b.number;
}

function buildPreviewMaps() {
  const manifest = readJson(PREVIEW_PATH, { entries: [] });
  const byUrl = new Map();
  const byTitle = new Map();

  for (const entry of manifest.entries || []) {
    if (entry.url) {
      byUrl.set(entry.url, entry);
    }
    if (entry.title) {
      byTitle.set(entry.title, entry);
    }
  }

  return { byUrl, byTitle };
}

function buildCatalog() {
  const seed = readJson(CATALOG_PATH, {
    generatedAt: "",
    notes: [],
    paidWatchlist: [],
    selfGenerated: [],
    categories: []
  });
  const previewMaps = buildPreviewMaps();

  const catalogItems = [];
  const catalogCategories = [];

  for (const category of seed.categories || []) {
    catalogCategories.push({
      id: category.id,
      label: category.label
    });

    for (const item of category.items || []) {
      const preview =
        previewMaps.byUrl.get(item.url) ||
        previewMaps.byTitle.get(item.title) ||
        null;

      catalogItems.push({
        assetId: `${category.id}:${item.number}`,
        sourceType: "catalog",
        categoryId: category.id,
        categoryLabel: category.label,
        number: item.number,
        title: item.title,
        note: item.note || "",
        useFor: item.useFor || "",
        itemStatus: item.status || "support",
        linkUrl: item.url || "",
        imageUrl: preview ? normalizePreviewPath(preview.localPreviewPath) : "",
        previewSourceUrl: preview ? preview.previewUrl || "" : ""
      });
    }
  }

  const paidWatchlist = (seed.paidWatchlist || [])
    .map((item) => {
      const preview =
        previewMaps.byUrl.get(item.url) ||
        previewMaps.byTitle.get(item.title) ||
        null;

      return {
        assetId: `paid_watchlist:${item.number}`,
        sourceType: "paid",
        categoryId: "paid_watchlist",
        categoryLabel: "유료 참고",
        number: item.number,
        title: item.title,
        note: item.note || "",
        useFor: item.useFor || "",
        itemStatus: item.status || "watch",
        linkUrl: item.url || "",
        imageUrl: preview ? normalizePreviewPath(preview.localPreviewPath) : "",
        previewSourceUrl: preview ? preview.previewUrl || "" : "",
        priceUsd: item.priceUsd ?? null,
        priceObservedAt: item.priceObservedAt || ""
      };
    })
    .sort(sortByNumber);

  const selfGenerated = (seed.selfGenerated || [])
    .map((item) => ({
      assetId: `self_generated:${item.number}`,
      sourceType: "self",
      categoryId: "self_generated",
      categoryLabel: "직접 제작",
      number: item.number,
      title: item.title,
      note: item.note || "",
      useFor: item.useFor || "",
      itemStatus: item.status || "direct_make",
      linkUrl: "",
      imageUrl: "",
      previewSourceUrl: ""
    }))
    .sort(sortByNumber);

  catalogItems.sort(sortByNumber);

  return {
    generatedAt: seed.generatedAt || "",
    notes: seed.notes || [],
    catalogCategories,
    catalogItems,
    paidWatchlist,
    selfGenerated
  };
}

function sanitizeSelections(selections) {
  if (!Array.isArray(selections)) {
    return [];
  }

  return selections
    .map((entry) => ({
      assetId: typeof entry.assetId === "string" ? entry.assetId : "",
      sourceType: typeof entry.sourceType === "string" ? entry.sourceType : "",
      categoryId: typeof entry.categoryId === "string" ? entry.categoryId : "",
      categoryLabel: typeof entry.categoryLabel === "string" ? entry.categoryLabel : "",
      number: typeof entry.number === "string" ? entry.number : "",
      status: STATUS_SET.has(entry.status) ? entry.status : "pending",
      note: typeof entry.note === "string" ? entry.note.slice(0, 500) : ""
    }))
    .filter((entry) => entry.assetId && (entry.status !== "pending" || entry.note));
}

function buildApprovedExport(selections, catalog) {
  const byAssetId = new Map();
  for (const item of [
    ...catalog.catalogItems,
    ...catalog.paidWatchlist,
    ...catalog.selfGenerated
  ]) {
    byAssetId.set(item.assetId, item);
  }

  const approved = selections
    .filter((entry) => entry.status === "approved")
    .map((entry) => {
      const base = byAssetId.get(entry.assetId) || {};
      return {
        ...base,
        selection: {
          status: entry.status,
          note: entry.note,
          number: entry.number
        }
      };
    });

  return {
    updatedAt: new Date().toISOString(),
    approvedCount: approved.length,
    approved
  };
}

function writeSelectionFiles(rawSelections) {
  const catalog = buildCatalog();
  const selections = sanitizeSelections(rawSelections);
  const state = {
    updatedAt: new Date().toISOString(),
    selections
  };
  const approved = buildApprovedExport(selections, catalog);

  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), "utf8");
  fs.writeFileSync(APPROVED_PATH, JSON.stringify(approved, null, 2), "utf8");

  return { state, approved };
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(payload, null, 2));
}

function sendFile(response, filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[extension] || "application/octet-stream";
  response.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": extension === ".json" ? "no-store" : "public, max-age=300"
  });
  fs.createReadStream(filePath).pipe(response);
}

function serveStatic(response, pathname) {
  const normalizedPath =
    pathname === "/" ? "/asset_board.html" : pathname.replace(/^\/+/, "/");
  const resolvedPath = path.join(ROOT, normalizedPath);

  if (!resolvedPath.startsWith(ROOT)) {
    sendJson(response, 403, { error: "forbidden" });
    return;
  }

  if (!fs.existsSync(resolvedPath) || fs.statSync(resolvedPath).isDirectory()) {
    sendJson(response, 404, { error: "not_found" });
    return;
  }

  sendFile(response, resolvedPath);
}

ensureJsonFile(STATE_PATH, { updatedAt: "", selections: [] });
ensureJsonFile(APPROVED_PATH, { updatedAt: "", approvedCount: 0, approved: [] });

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url, "http://localhost");

  if (request.method === "GET" && requestUrl.pathname === "/api/catalog") {
    sendJson(response, 200, buildCatalog());
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/selections") {
    sendJson(response, 200, readJson(STATE_PATH, { updatedAt: "", selections: [] }));
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/export/approved") {
    sendJson(
      response,
      200,
      readJson(APPROVED_PATH, { updatedAt: "", approvedCount: 0, approved: [] })
    );
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/selections") {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      try {
        const body = Buffer.concat(chunks).toString("utf8");
        const payload = body ? JSON.parse(body) : {};
        const result = writeSelectionFiles(payload.selections);
        sendJson(response, 200, {
          ok: true,
          updatedAt: result.state.updatedAt,
          approvedCount: result.approved.approvedCount
        });
      } catch (error) {
        sendJson(response, 400, {
          ok: false,
          error: error instanceof Error ? error.message : "invalid_request"
        });
      }
    });
    return;
  }

  if (request.method === "GET") {
    serveStatic(response, requestUrl.pathname);
    return;
  }

  sendJson(response, 405, { error: "method_not_allowed" });
});

const port = parsePort();
server.listen(port, "0.0.0.0", () => {
  console.log(`ASSET_BOARD_PORT=${port}`);
});
