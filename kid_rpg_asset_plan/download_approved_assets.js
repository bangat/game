#!/usr/bin/env node

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");

const approvedPath = path.join(__dirname, "approved_assets.json");
const outputDir = path.join(__dirname, "source_packages");
const manifestPath = path.join(outputDir, "download_status.json");

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36";

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exitCode = 1;
});

async function main() {
  const approved = JSON.parse(fs.readFileSync(approvedPath, "utf8"));
  fs.mkdirSync(outputDir, { recursive: true });

  const results = [];
  for (const item of approved.approved) {
    const result = await processItem(item);
    results.push(result);
    console.log(`${result.number}: ${result.status}${result.reason ? ` (${result.reason})` : ""}`);
  }

  const summary = results.reduce(
    (accumulator, item) => {
      accumulator.total += 1;
      accumulator[item.status] = (accumulator[item.status] || 0) + 1;
      return accumulator;
    },
    { total: 0 },
  );

  const manifest = {
    updatedAt: new Date().toISOString(),
    approvedCount: approved.approvedCount,
    outputDir: path.relative(__dirname, outputDir).replace(/\\/g, "/"),
    summary,
    items: results,
  };

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

async function processItem(item) {
  const baseResult = {
    assetId: item.assetId,
    number: item.number,
    title: item.title,
    sourceType: item.sourceType,
    linkUrl: item.linkUrl || "",
  };

  if (!item.linkUrl) {
    return {
      ...baseResult,
      status: "self_make",
      reason: "direct_creation",
    };
  }

  const url = new URL(item.linkUrl);
  const host = url.hostname.toLowerCase();

  if (host.endsWith("itch.io")) {
    return downloadItchItem(baseResult, item.linkUrl);
  }

  if (host.includes("kenney.nl")) {
    return downloadKenneyItem(baseResult, item.linkUrl);
  }

  if (host.includes("craftpix.net")) {
    return {
      ...baseResult,
      status: "blocked",
      reason: "login_required",
      detail: "CraftPix freebies require an authenticated account session.",
    };
  }

  return {
    ...baseResult,
    status: "blocked",
    reason: "unsupported_host",
    detail: `No downloader is configured for ${host}.`,
  };
}

async function downloadItchItem(baseResult, pageUrl) {
  const page = await requestText(pageUrl);
  const pageInfo = parseItchPage(page.body);

  let uploadId = pageInfo.uploadId;
  let uploadName = pageInfo.uploadName;
  let csrfToken = pageInfo.csrfToken;
  let requestCookie = cookieHeader(page.headers["set-cookie"]);
  let refererUrl = pageUrl;

  if ((!uploadId || !uploadName) && pageInfo.generateDownloadUrl && pageInfo.minPrice === 0) {
    const directDownload = await requestJson(pageInfo.generateDownloadUrl, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "x-requested-with": "XMLHttpRequest",
        referer: pageUrl,
        origin: new URL(pageUrl).origin,
        cookie: requestCookie,
      },
      body: `csrf_token=${encodeURIComponent(csrfToken)}`,
    });

    if (directDownload.body && directDownload.body.url) {
      const tokenPage = await requestText(directDownload.body.url, {
        headers: {
          cookie: requestCookie,
        },
      });
      const tokenInfo = parseItchPage(tokenPage.body);
      uploadId = tokenInfo.uploadId || uploadId;
      uploadName = tokenInfo.uploadName || uploadName;
      csrfToken = tokenInfo.csrfToken || csrfToken;
      requestCookie = mergeCookies(requestCookie, cookieHeader(tokenPage.headers["set-cookie"]));
      refererUrl = directDownload.body.url;
    }
  }

  if (!uploadId) {
    const purchaseUrl = normalizePurchaseUrl(pageUrl);
    const purchasePage = await requestText(purchaseUrl);
    const purchaseInfo = parseItchPage(purchasePage.body);
    uploadId = purchaseInfo.uploadId || uploadId;
    uploadName = purchaseInfo.uploadName || uploadName;
    csrfToken = purchaseInfo.csrfToken || csrfToken;
  }

  if (!uploadId || !csrfToken) {
    return {
      ...baseResult,
      status: "blocked",
      reason: pageInfo.minPrice > 0 ? "purchase_required" : "download_not_exposed",
      detail: pageInfo.minPrice > 0 ? `Minimum price is ${pageInfo.minPrice}.` : "No public upload was exposed on the page.",
    };
  }

  const slug = normalizeSlug(pageUrl);
  const endpoint = `${new URL(pageUrl).origin}/${slug}/file/${uploadId}?source=view_game&as_props=1&after_download_lightbox=1`;
  const body = `csrf_token=${encodeURIComponent(csrfToken)}`;
  const fileInfoResponse = await requestJson(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      "x-requested-with": "XMLHttpRequest",
      referer: refererUrl,
      origin: new URL(pageUrl).origin,
      cookie: requestCookie,
    },
    body,
  });

  if (!fileInfoResponse.body || !fileInfoResponse.body.url) {
    return {
      ...baseResult,
      status: "blocked",
      reason: pageInfo.minPrice > 0 ? "purchase_required" : "download_failed",
      detail: pageInfo.minPrice > 0 ? `Minimum price is ${pageInfo.minPrice}.` : "itch.io did not return a downloadable URL.",
    };
  }

  const fileName = sanitizeFileName(uploadName || inferFileNameFromUrl(fileInfoResponse.body.url));
  const targetDir = path.join(outputDir, baseResult.number);
  fs.mkdirSync(targetDir, { recursive: true });
  const targetPath = path.join(targetDir, fileName);
  const downloadMeta = await downloadFile(fileInfoResponse.body.url, targetPath);

  return {
    ...baseResult,
    status: "downloaded",
    reason: "itch_public_download",
    uploadId,
    downloadEndpoint: endpoint,
    fileName,
    filePath: path.relative(__dirname, targetPath).replace(/\\/g, "/"),
    sizeBytes: downloadMeta.sizeBytes,
    sha256: downloadMeta.sha256,
  };
}

async function downloadKenneyItem(baseResult, pageUrl) {
  const page = await requestText(pageUrl);
  const zipUrlMatch = page.body.match(/https:\/\/www\.kenney\.nl\/media\/pages\/assets\/rpg-audio\/[^"']+kenney_rpg-audio\.zip/);
  if (!zipUrlMatch) {
    return {
      ...baseResult,
      status: "blocked",
      reason: "download_not_found",
      detail: "Kenney zip URL was not found on the asset page.",
    };
  }

  const fileUrl = zipUrlMatch[0];
  const fileName = sanitizeFileName(inferFileNameFromUrl(fileUrl));
  const targetDir = path.join(outputDir, baseResult.number);
  fs.mkdirSync(targetDir, { recursive: true });
  const targetPath = path.join(targetDir, fileName);
  const downloadMeta = await downloadFile(fileUrl, targetPath);

  return {
    ...baseResult,
    status: "downloaded",
    reason: "kenney_direct_zip",
    fileName,
    filePath: path.relative(__dirname, targetPath).replace(/\\/g, "/"),
    sizeBytes: downloadMeta.sizeBytes,
    sha256: downloadMeta.sha256,
    sourceFileUrl: fileUrl,
  };
}

function parseItchPage(html) {
  return {
    csrfToken: firstMatch(html, /<meta name="csrf_token" value="([^"]+)"/),
    uploadId: firstMatch(html, /data-upload_id="(\d+)"/),
    uploadName: decodeHtmlEntities(firstMatch(html, /<strong class="name" title="([^"]+)"/)),
    generateDownloadUrl: unescapeJsonUrl(firstMatch(html, /"generate_download_url":"(https:\\\/\\\/[^"]+)"/)),
    minPrice: parseNumber(firstMatch(html, /"min_price":\s*(\d+)/)),
  };
}

function normalizeSlug(pageUrl) {
  return new URL(pageUrl).pathname.replace(/^\/+|\/+$/g, "");
}

function normalizePurchaseUrl(pageUrl) {
  return pageUrl.replace(/\/+$/, "") + "/purchase";
}

function firstMatch(input, pattern) {
  const match = input.match(pattern);
  return match ? match[1] : "";
}

function parseNumber(value) {
  if (!value) {
    return 0;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sanitizeFileName(value) {
  return value.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_").trim();
}

function inferFileNameFromUrl(value) {
  const url = new URL(value);
  const lastSegment = url.pathname.split("/").filter(Boolean).pop();
  return lastSegment ? decodeURIComponent(lastSegment) : "download.bin";
}

function cookieHeader(setCookie) {
  if (!setCookie || !setCookie.length) {
    return "";
  }
  return setCookie.map((entry) => entry.split(";")[0]).join("; ");
}

function mergeCookies(...headers) {
  const cookies = new Map();
  for (const header of headers) {
    if (!header) {
      continue;
    }
    for (const entry of header.split(/;\s*/)) {
      const separator = entry.indexOf("=");
      if (separator <= 0) {
        continue;
      }
      cookies.set(entry.slice(0, separator), entry);
    }
  }
  return Array.from(cookies.values()).join("; ");
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function unescapeJsonUrl(value) {
  return value ? value.replace(/\\\//g, "/") : "";
}

function requestText(url, options = {}) {
  return request(url, options).then((response) => {
    response.body = response.body.toString("utf8");
    return response;
  });
}

function requestJson(url, options = {}) {
  return requestText(url, options).then((response) => {
    response.body = JSON.parse(response.body);
    return response;
  });
}

function request(url, options = {}) {
  const target = new URL(url);
  const transport = target.protocol === "http:" ? http : https;
  const headers = {
    "user-agent": USER_AGENT,
    ...options.headers,
  };

  return new Promise((resolve, reject) => {
    const requestOptions = {
      method: options.method || "GET",
      headers,
    };

    const req = transport.request(target, requestOptions, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        const redirectUrl = new URL(response.headers.location, target).toString();
        resolve(request(redirectUrl, { ...options, headers }));
        return;
      }

      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => {
        resolve({
          statusCode: response.statusCode || 0,
          headers: response.headers,
          body: Buffer.concat(chunks),
        });
      });
    });

    req.on("error", reject);

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

function downloadFile(url, targetPath) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const transport = target.protocol === "http:" ? http : https;
    const requestOptions = {
      headers: {
        "user-agent": USER_AGENT,
      },
    };

    const req = transport.get(target, requestOptions, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        resolve(downloadFile(new URL(response.headers.location, target).toString(), targetPath));
        return;
      }

      if ((response.statusCode || 0) >= 400) {
        response.resume();
        reject(new Error(`Download failed with status ${response.statusCode} for ${url}`));
        return;
      }

      const hash = crypto.createHash("sha256");
      let sizeBytes = 0;
      const fileStream = fs.createWriteStream(targetPath);

      response.on("data", (chunk) => {
        hash.update(chunk);
        sizeBytes += chunk.length;
      });

      response.on("error", reject);
      fileStream.on("error", reject);

      fileStream.on("finish", () => {
        resolve({
          sizeBytes,
          sha256: hash.digest("hex"),
        });
      });

      response.pipe(fileStream);
    });

    req.on("error", reject);
  });
}
