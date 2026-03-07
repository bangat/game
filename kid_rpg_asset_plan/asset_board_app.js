const state = {
  catalog: null,
  selectionState: { updatedAt: "", selections: [] },
  selectionMap: new Map(),
  itemMap: new Map(),
  sourceFilter: "catalog",
  categoryFilter: "all",
  isSaving: false,
  saveMessage: ""
};

const elements = {
  summary: document.getElementById("summary"),
  sourceTabs: document.getElementById("source-tabs"),
  categoryTabs: document.getElementById("category-tabs"),
  categoryGroup: document.getElementById("category-filter-group"),
  notes: document.getElementById("catalog-notes"),
  assetList: document.getElementById("asset-list"),
  saveButton: document.getElementById("save-button"),
  saveState: document.getElementById("save-state"),
  saveTime: document.getElementById("save-time"),
  cardTemplate: document.getElementById("asset-card-template")
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  bindEvents();
  await Promise.all([loadCatalog(), loadSelections()]);
  renderAll();
}

function bindEvents() {
  elements.saveButton.addEventListener("click", saveSelections);
  elements.assetList.addEventListener("change", onCardChange);
  elements.assetList.addEventListener("input", onCardInput);
}

async function loadCatalog() {
  const response = await fetch("/api/catalog", { cache: "no-store" });
  state.catalog = await response.json();

  for (const item of getAllItems()) {
    state.itemMap.set(item.assetId, item);
  }
}

async function loadSelections() {
  const response = await fetch("/api/selections", { cache: "no-store" });
  state.selectionState = await response.json();
  state.selectionMap.clear();

  for (const selection of state.selectionState.selections || []) {
    state.selectionMap.set(selection.assetId, selection);
  }
}

function getAllItems() {
  if (!state.catalog) {
    return [];
  }

  return [
    ...(state.catalog.catalogItems || []),
    ...(state.catalog.paidWatchlist || []),
    ...(state.catalog.selfGenerated || [])
  ];
}

function getVisibleItems() {
  if (!state.catalog) {
    return [];
  }

  if (state.sourceFilter === "paid") {
    return state.catalog.paidWatchlist || [];
  }

  if (state.sourceFilter === "self") {
    return state.catalog.selfGenerated || [];
  }

  const items = state.catalog.catalogItems || [];
  if (state.categoryFilter === "all") {
    return items;
  }
  return items.filter((item) => item.categoryId === state.categoryFilter);
}

function getSelection(item) {
  return (
    state.selectionMap.get(item.assetId) || {
      assetId: item.assetId,
      sourceType: item.sourceType,
      categoryId: item.categoryId,
      categoryLabel: item.categoryLabel,
      number: item.number,
      status: "pending",
      note: ""
    }
  );
}

function upsertSelection(item, patch) {
  const current = getSelection(item);
  const next = {
    ...current,
    ...patch
  };
  state.selectionMap.set(item.assetId, next);
}

function renderAll() {
  renderSourceTabs();
  renderCategoryTabs();
  renderNotes();
  renderSummary();
  renderCards();
  renderSaveMeta();
}

function renderSourceTabs() {
  const tabs = [
    { id: "catalog", label: "기본 후보" },
    { id: "paid", label: "유료 참고" },
    { id: "self", label: "직접 제작" }
  ];

  elements.sourceTabs.replaceChildren(
    ...tabs.map((tab) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `tab-button${state.sourceFilter === tab.id ? " is-active" : ""}`;
      button.textContent = tab.label;
      button.addEventListener("click", () => {
        state.sourceFilter = tab.id;
        if (tab.id !== "catalog") {
          state.categoryFilter = "all";
        }
        renderAll();
      });
      return button;
    })
  );
}

function renderCategoryTabs() {
  if (!state.catalog) {
    return;
  }

  const visible = state.sourceFilter === "catalog";
  elements.categoryGroup.style.display = visible ? "block" : "none";

  if (!visible) {
    elements.categoryTabs.replaceChildren();
    return;
  }

  const tabs = [{ id: "all", label: "전체" }, ...(state.catalog.catalogCategories || [])];
  elements.categoryTabs.replaceChildren(
    ...tabs.map((tab) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `tab-button${state.categoryFilter === tab.id ? " is-active" : ""}`;
      button.textContent = tab.label;
      button.addEventListener("click", () => {
        state.categoryFilter = tab.id;
        renderSummary();
        renderCards();
      });
      return button;
    })
  );
}

function renderNotes() {
  elements.notes.replaceChildren(
    ...((state.catalog?.notes || []).map((note) => {
      const li = document.createElement("li");
      li.textContent = note;
      return li;
    }))
  );
}

function renderSummary() {
  const visibleItems = getVisibleItems();
  const approvedCount = Array.from(state.selectionMap.values()).filter(
    (selection) => selection.status === "approved"
  ).length;
  const currentHoldCount = visibleItems.filter(
    (item) => getSelection(item).status === "hold"
  ).length;

  const cards = [
    {
      value: visibleItems.length,
      label: "현재 화면 카드"
    },
    {
      value: approvedCount,
      label: "전체 채택 수"
    },
    {
      value: currentHoldCount,
      label: "현재 화면 보류 수"
    }
  ];

  elements.summary.replaceChildren(
    ...cards.map((card) => {
      const box = document.createElement("div");
      box.className = "summary-card";
      box.innerHTML = `<strong>${card.value}</strong><span>${card.label}</span>`;
      return box;
    })
  );
}

function renderCards() {
  const items = getVisibleItems();

  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "표시할 카드가 없습니다.";
    elements.assetList.replaceChildren(empty);
    return;
  }

  const cards = items.map((item) => renderCard(item));
  elements.assetList.replaceChildren(...cards);
}

function renderCard(item) {
  const selection = getSelection(item);
  const fragment = elements.cardTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".asset-card");
  const thumb = fragment.querySelector(".thumb");
  const numberPill = fragment.querySelector(".number-pill");
  const categoryPill = fragment.querySelector(".category-pill");
  const title = fragment.querySelector(".title");
  const sourcePill = fragment.querySelector(".source-pill");
  const itemStatus = fragment.querySelector(".item-status");
  const useFor = fragment.querySelector(".use-for");
  const note = fragment.querySelector(".note");
  const priceRow = fragment.querySelector(".price-row");
  const statusSelect = fragment.querySelector(".status-select");
  const linkButton = fragment.querySelector(".link-button");
  const noteInput = fragment.querySelector(".note-input");

  card.dataset.assetId = item.assetId;
  card.classList.toggle("is-approved", selection.status === "approved");
  card.classList.toggle("is-hold", selection.status === "hold");
  card.classList.toggle("is-rejected", selection.status === "rejected");

  if (item.imageUrl) {
    const image = document.createElement("img");
    image.src = item.imageUrl;
    image.alt = `${item.title} 미리보기`;
    image.loading = "lazy";
    thumb.appendChild(image);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "thumb-placeholder";
    placeholder.innerHTML = `<div><strong>${item.number}</strong><span>${item.title}</span></div>`;
    thumb.appendChild(placeholder);
  }

  numberPill.textContent = item.number;
  categoryPill.textContent = item.categoryLabel;
  title.textContent = item.title;
  sourcePill.textContent = sourceLabel(item.sourceType);
  itemStatus.textContent = statusLabel(item.itemStatus);
  useFor.textContent = item.useFor ? `용도: ${item.useFor}` : "용도 메모 없음";
  note.textContent = item.note || "설명 없음";
  statusSelect.value = selection.status;
  noteInput.value = selection.note || "";

  if (item.priceUsd != null) {
    priceRow.textContent = `확인 가격: $${Number(item.priceUsd).toFixed(2)} USD (${item.priceObservedAt})`;
  } else {
    priceRow.textContent = "";
  }

  if (item.linkUrl) {
    linkButton.href = item.linkUrl;
  } else {
    linkButton.classList.add("is-hidden");
    linkButton.removeAttribute("href");
  }

  return fragment;
}

function renderSaveMeta() {
  const updatedAt = state.selectionState?.updatedAt;
  if (state.isSaving) {
    elements.saveState.textContent = "저장 중...";
  } else if (state.saveMessage) {
    elements.saveState.textContent = state.saveMessage;
  } else {
    elements.saveState.textContent = "저장 가능";
  }
  elements.saveTime.textContent = updatedAt
    ? `${formatDate(updatedAt)} 마지막 저장`
    : "저장 기록 없음";
}

function onCardChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  if (!target.matches(".status-select")) {
    return;
  }

  const card = target.closest(".asset-card");
  if (!card) {
    return;
  }

  const item = state.itemMap.get(card.dataset.assetId);
  if (!item) {
    return;
  }

  upsertSelection(item, { status: target.value });
  renderSummary();
  renderCards();
}

function onCardInput(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  if (!target.matches(".note-input")) {
    return;
  }

  const card = target.closest(".asset-card");
  if (!card) {
    return;
  }

  const item = state.itemMap.get(card.dataset.assetId);
  if (!item) {
    return;
  }

  upsertSelection(item, { note: target.value });
}

async function saveSelections() {
  state.isSaving = true;
  state.saveMessage = "";
  renderSaveMeta();
  elements.saveButton.disabled = true;

  try {
    const payload = {
      selections: Array.from(state.selectionMap.values())
    };
    const response = await fetch("/api/selections", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(result.error || "저장 실패");
    }

    await loadSelections();
    state.saveMessage = `저장 완료 (${result.approvedCount}개 채택)`;
    renderAll();
  } catch (error) {
    state.saveMessage = `저장 실패: ${error.message}`;
  } finally {
    state.isSaving = false;
    elements.saveButton.disabled = false;
    renderSaveMeta();
  }
}

function sourceLabel(sourceType) {
  if (sourceType === "paid") {
    return "유료 참고";
  }
  if (sourceType === "self") {
    return "직접 제작";
  }
  return "기본 후보";
}

function statusLabel(value) {
  const labels = {
    primary: "우선 후보",
    support: "보조 후보",
    backup: "백업",
    watch: "watch",
    direct_make: "직접 제작"
  };
  return labels[value] || value || "기타";
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}
