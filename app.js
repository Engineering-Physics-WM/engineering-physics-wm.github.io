const DATA_INDEX = "projects.json";
const DRAFT_KEY = "ep-capstone-2026-ranking-draft";
const INSTRUCTOR_EMAIL = "rxyan2@wm.edu";

const state = {
  projects: [],
  details: new Map(),
  filtered: [],
  ranking: [],
  draggedId: null,
};

const elements = {
  projectCount: document.querySelector("#project-count"),
  resultCount: document.querySelector("#result-count"),
  projectGrid: document.querySelector("#project-grid"),
  areaSummary: document.querySelector("#area-summary"),
  searchInput: document.querySelector("#search-input"),
  areaFilter: document.querySelector("#area-filter"),
  affiliationFilter: document.querySelector("#affiliation-filter"),
  sortSelect: document.querySelector("#sort-select"),
  cardTemplate: document.querySelector("#project-card-template"),
  dialog: document.querySelector("#project-dialog"),
  dialogClose: document.querySelector("#dialog-close"),
  dialogContent: document.querySelector("#dialog-content"),
  rankingList: document.querySelector("#ranking-list"),
  resetRanking: document.querySelector("#reset-ranking"),
  saveDraft: document.querySelector("#save-draft"),
  copyRanking: document.querySelector("#copy-ranking"),
  emailRanking: document.querySelector("#email-ranking"),
  rankingStatus: document.querySelector("#ranking-status"),
  studentName: document.querySelector("#student-name"),
  studentEmail: document.querySelector("#student-email"),
  studentNotes: document.querySelector("#student-notes"),
};

init();

async function init() {
  try {
    const index = await fetchJson(DATA_INDEX);
    state.projects = index.projects.map((project, index) => ({
      ...project,
      number: index + 1,
      areas: splitAreas(project.thrust_area),
    }));
    state.ranking = [...state.projects];

    restoreDraft();
    hydrateFilters();
    renderAll();
    bindEvents();
  } catch (error) {
    renderLoadError(error);
  }
}

function bindEvents() {
  elements.searchInput.addEventListener("input", renderProjectBrowser);
  elements.areaFilter.addEventListener("change", renderProjectBrowser);
  elements.affiliationFilter.addEventListener("change", renderProjectBrowser);
  elements.sortSelect.addEventListener("change", renderProjectBrowser);
  elements.dialogClose.addEventListener("click", closeDialog);
  elements.dialog.addEventListener("click", (event) => {
    if (event.target === elements.dialog) {
      closeDialog();
    }
  });
  elements.resetRanking.addEventListener("click", resetRanking);
  elements.saveDraft.addEventListener("click", saveDraft);
  elements.copyRanking.addEventListener("click", copyRanking);
  elements.emailRanking.addEventListener("click", updateEmailLink);
}

function renderAll() {
  elements.projectCount.textContent = state.projects.length;
  renderAreaSummary();
  renderProjectBrowser();
  renderRanking();
  updateEmailLink();
}

function hydrateFilters() {
  const areaOptions = uniqueSorted(state.projects.flatMap((project) => project.areas));
  const affiliationOptions = uniqueSorted(state.projects.map((project) => project.advisor_affiliation));

  fillSelect(elements.areaFilter, "All thrust areas", areaOptions);
  fillSelect(elements.affiliationFilter, "All affiliations", affiliationOptions);
}

function renderProjectBrowser() {
  const query = elements.searchInput.value.trim().toLowerCase();
  const area = elements.areaFilter.value;
  const affiliation = elements.affiliationFilter.value;
  const sort = elements.sortSelect.value;

  state.filtered = state.projects
    .filter((project) => {
      const haystack = [
        project.title,
        project.advisor_name,
        project.advisor_affiliation,
        project.thrust_area,
      ]
        .join(" ")
        .toLowerCase();

      const matchesQuery = query ? haystack.includes(query) : true;
      const matchesArea = area ? project.areas.includes(area) : true;
      const matchesAffiliation = affiliation ? project.advisor_affiliation === affiliation : true;

      return matchesQuery && matchesArea && matchesAffiliation;
    })
    .sort((a, b) => sortProjects(a, b, sort));

  elements.resultCount.textContent = `${state.filtered.length} of ${state.projects.length} projects`;
  elements.projectGrid.replaceChildren(...state.filtered.map(createProjectCard));

  if (!state.filtered.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No projects match the current filters.";
    elements.projectGrid.replaceChildren(empty);
  }
}

function createProjectCard(project) {
  const fragment = elements.cardTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".project-card");
  const title = fragment.querySelector("h3");
  const advisor = fragment.querySelector(".advisor-line");
  const pitch = fragment.querySelector(".pitch-preview");
  const tagList = fragment.querySelector(".tag-list");
  const detailsButton = fragment.querySelector(".details-button");
  const rankButton = fragment.querySelector(".rank-button");

  fragment.querySelector(".project-number").textContent = String(project.number).padStart(2, "0");
  fragment.querySelector(".project-area-count").textContent = `${project.areas.length} themes`;
  title.textContent = project.title;
  advisor.textContent = `${project.advisor_name} - ${project.advisor_affiliation}`;
  pitch.textContent = "Loading project pitch...";

  project.areas.slice(0, 4).forEach((area) => {
    tagList.append(createTag(area));
  });

  detailsButton.addEventListener("click", () => openProject(project));
  rankButton.addEventListener("click", () => {
    moveProjectToTop(project.id);
    document.querySelector("#ranking").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  hydrateCardPitch(project, pitch, card);
  return card;
}

async function hydrateCardPitch(project, pitchElement, card) {
  const detail = await getProjectDetail(project);
  pitchElement.textContent = detail.pitch || detail.background_objective_deliverables || "Project details available.";
  card.dataset.projectId = project.id;
}

async function openProject(project) {
  const detail = await getProjectDetail(project);
  const advisorEmail = detail.advisor.email
    ? `<a href="mailto:${escapeAttribute(detail.advisor.email)}">${escapeHtml(detail.advisor.email)}</a>`
    : "Not provided";

  elements.dialogContent.innerHTML = `
    <div class="dialog-body">
      <p class="dialog-kicker">Project ${String(project.number).padStart(2, "0")}</p>
      <h2 class="dialog-title">${escapeHtml(detail.title)}</h2>
      <div class="tag-list">${detail.thrust_area
        .split(",")
        .map((area) => `<span class="tag">${escapeHtml(area.trim())}</span>`)
        .join("")}</div>

      <dl class="detail-grid">
        <div class="detail-card">
          <dt>Advisor</dt>
          <dd>${escapeHtml(detail.advisor.name)}<br>${escapeHtml(detail.advisor.affiliation)}</dd>
        </div>
        <div class="detail-card">
          <dt>Email</dt>
          <dd>${advisorEmail}</dd>
        </div>
        <div class="detail-card">
          <dt>Co-advisors</dt>
          <dd>${escapeHtml(detail.coadvisors_raw || "None listed")}</dd>
        </div>
        <div class="detail-card">
          <dt>Workspace</dt>
          <dd>${escapeHtml(detail.lab_workspace_access || "Not specified")}</dd>
        </div>
      </dl>

      <section class="dialog-section">
        <h3>Student Pitch</h3>
        <p>${escapeHtml(detail.pitch || "No pitch provided.")}</p>
      </section>
      <section class="dialog-section">
        <h3>Background, Objectives, Deliverables</h3>
        <p>${escapeHtml(detail.background_objective_deliverables || "No description provided.")}</p>
      </section>
      ${
        detail.notes
          ? `<section class="dialog-section"><h3>Notes</h3><p>${escapeHtml(detail.notes)}</p></section>`
          : ""
      }
    </div>
  `;

  if (typeof elements.dialog.showModal === "function") {
    elements.dialog.showModal();
  } else {
    elements.dialog.setAttribute("open", "");
  }
}

function closeDialog() {
  if (typeof elements.dialog.close === "function") {
    elements.dialog.close();
  } else {
    elements.dialog.removeAttribute("open");
  }
}

function renderAreaSummary() {
  const counts = new Map();
  state.projects.forEach((project) => {
    project.areas.forEach((area) => {
      counts.set(area, (counts.get(area) || 0) + 1);
    });
  });

  const rows = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([area, count]) => {
      const row = document.createElement("div");
      row.className = "area-summary-row";
      row.innerHTML = `<span>${escapeHtml(area)}</span><strong>${count}</strong>`;
      return row;
    });

  elements.areaSummary.replaceChildren(...rows);
}

function renderRanking() {
  const rows = state.ranking.map((project, index) => {
    const item = document.createElement("li");
    item.className = "ranking-item";
    item.draggable = true;
    item.dataset.id = project.id;

    item.innerHTML = `
      <span class="rank-number">${index + 1}</span>
      <span>
        <span class="ranking-title">${escapeHtml(project.title)}</span>
        <span class="ranking-meta">${escapeHtml(project.advisor_name)} - ${escapeHtml(project.advisor_affiliation)}</span>
      </span>
      <span class="rank-controls">
        <button class="icon-button" type="button" data-action="up" ${index === 0 ? "disabled" : ""}>Up</button>
        <button class="icon-button" type="button" data-action="down" ${
          index === state.ranking.length - 1 ? "disabled" : ""
        }>Down</button>
      </span>
    `;

    item.querySelector('[data-action="up"]').addEventListener("click", () => moveRanking(index, index - 1));
    item.querySelector('[data-action="down"]').addEventListener("click", () => moveRanking(index, index + 1));
    item.addEventListener("dragstart", handleDragStart);
    item.addEventListener("dragend", handleDragEnd);
    item.addEventListener("dragover", handleDragOver);
    item.addEventListener("drop", handleDrop);

    return item;
  });

  elements.rankingList.replaceChildren(...rows);
  updateEmailLink();
}

function moveRanking(from, to) {
  if (to < 0 || to >= state.ranking.length || from === to) {
    return;
  }
  const [project] = state.ranking.splice(from, 1);
  state.ranking.splice(to, 0, project);
  renderRanking();
}

function moveProjectToTop(projectId) {
  const index = state.ranking.findIndex((project) => project.id === projectId);
  if (index <= 0) {
    return;
  }
  moveRanking(index, 0);
  setStatus("Moved project to the top of the draft ranking.");
}

function resetRanking() {
  state.ranking = [...state.projects];
  renderRanking();
  setStatus("Ranking order reset.");
}

function saveDraft() {
  const draft = buildDraft();
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  setStatus("Draft saved in this browser.");
}

async function copyRanking() {
  const text = buildResponseText();
  try {
    await navigator.clipboard.writeText(text);
    setStatus("Ranking response copied.");
  } catch (error) {
    setStatus("Clipboard is unavailable. Select the generated email draft instead.");
  }
}

function updateEmailLink() {
  const subject = encodeURIComponent("Engineering Physics Capstone Project Ranking");
  const body = encodeURIComponent(buildResponseText());
  elements.emailRanking.href = `mailto:${INSTRUCTOR_EMAIL}?subject=${subject}&body=${body}`;
}

function buildDraft() {
  return {
    name: elements.studentName.value.trim(),
    email: elements.studentEmail.value.trim(),
    notes: elements.studentNotes.value.trim(),
    ranking: state.ranking.map((project) => project.id),
    savedAt: new Date().toISOString(),
  };
}

function restoreDraft() {
  const raw = localStorage.getItem(DRAFT_KEY);
  if (!raw) {
    return;
  }

  try {
    const draft = JSON.parse(raw);
    elements.studentName.value = draft.name || "";
    elements.studentEmail.value = draft.email || "";
    elements.studentNotes.value = draft.notes || "";

    if (Array.isArray(draft.ranking)) {
      const byId = new Map(state.projects.map((project) => [project.id, project]));
      const ranked = draft.ranking.map((id) => byId.get(id)).filter(Boolean);
      const missing = state.projects.filter((project) => !draft.ranking.includes(project.id));
      state.ranking = [...ranked, ...missing];
    }
  } catch (error) {
    localStorage.removeItem(DRAFT_KEY);
  }
}

function buildResponseText() {
  const draft = buildDraft();
  const rankingLines = state.ranking
    .map((project, index) => `${index + 1}. ${project.title} (${project.advisor_name})`)
    .join("\n");

  return [
    "Engineering Physics Capstone Project Ranking",
    "Academic Year: 2026-2027",
    "",
    `Student: ${draft.name || "[name]"}`,
    `Email: ${draft.email || "[email]"}`,
    "",
    "Ranking:",
    rankingLines,
    "",
    `Notes: ${draft.notes || "None"}`,
  ].join("\n");
}

function handleDragStart(event) {
  state.draggedId = event.currentTarget.dataset.id;
  event.currentTarget.classList.add("dragging");
  event.dataTransfer.effectAllowed = "move";
}

function handleDragEnd(event) {
  event.currentTarget.classList.remove("dragging");
  state.draggedId = null;
}

function handleDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
}

function handleDrop(event) {
  event.preventDefault();
  const targetId = event.currentTarget.dataset.id;
  const from = state.ranking.findIndex((project) => project.id === state.draggedId);
  const to = state.ranking.findIndex((project) => project.id === targetId);
  moveRanking(from, to);
}

async function getProjectDetail(project) {
  if (!state.details.has(project.id)) {
    state.details.set(project.id, await fetchJson(project.path));
  }
  return state.details.get(project.id);
}

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Could not load ${path}`);
  }
  return response.json();
}

function fillSelect(select, label, options) {
  select.replaceChildren(new Option(label, ""), ...options.map((option) => new Option(option, option)));
}

function sortProjects(a, b, sort) {
  if (sort === "advisor") {
    return a.advisor_name.localeCompare(b.advisor_name) || a.title.localeCompare(b.title);
  }
  if (sort === "submitted") {
    return new Date(a.submitted_at) - new Date(b.submitted_at);
  }
  return a.title.localeCompare(b.title);
}

function splitAreas(value) {
  return value
    .split(",")
    .map((area) => area.trim())
    .filter(Boolean);
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function createTag(label) {
  const tag = document.createElement("span");
  tag.className = "tag";
  tag.textContent = label;
  return tag;
}

function setStatus(message) {
  elements.rankingStatus.textContent = message;
}

function renderLoadError(error) {
  elements.projectGrid.innerHTML = `
    <p class="empty-state">
      Project data could not be loaded. Run this folder through a local static server or deploy it to a static host.
    </p>
  `;
  console.error(error);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
