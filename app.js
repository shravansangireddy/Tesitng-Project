const STORAGE_KEY = "workboard.cards.v1";
const statuses = ["todo", "doing", "done"];
const statusNames = { todo: "To do", doing: "In progress", done: "Done" };
const priorityNames = { high: "High", medium: "Medium", low: "Low" };

const elements = {
  grid: document.querySelector("#board-grid"),
  dialog: document.querySelector("#card-dialog"),
  form: document.querySelector("#card-form"),
  title: document.querySelector("#card-title"),
  description: document.querySelector("#card-description"),
  status: document.querySelector("#card-status"),
  priority: document.querySelector("#card-priority"),
  due: document.querySelector("#card-due"),
  search: document.querySelector("#search-input"),
  priorityFilter: document.querySelector("#priority-filter"),
  filterPanel: document.querySelector("#filter-panel"),
  filterButton: document.querySelector("#filter-button"),
  toast: document.querySelector("#toast"),
};

let cards = loadCards();
let toastTimer;

function loadCards() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) throw new Error("Saved work data is not a list.");
    return parsed.filter((card) =>
      card &&
      typeof card.id === "string" &&
      typeof card.title === "string" &&
      statuses.includes(card.status) &&
      Object.hasOwn(priorityNames, card.priority)
    );
  } catch (error) {
    console.error("Could not load your saved cards.", error);
    return [];
  }
}

function saveCards() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  } catch (error) {
    console.error("Could not save your cards.", error);
    showToast("Could not save changes. Check your browser storage settings.");
  }
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function formatDueDate(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(year, month - 1, day));
}

function isOverdue(value) {
  if (!value) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day) < today;
}

function createCard(card) {
  const article = makeElement("article", "work-card");
  article.draggable = true;
  article.dataset.id = card.id;
  article.setAttribute("aria-label", `${card.title}, ${statusNames[card.status]}`);

  const top = makeElement("div", "card-top");
  top.append(makeElement("h4", "card-title", card.title));
  const remove = makeElement("button", "delete-card", "×");
  remove.type = "button";
  remove.setAttribute("aria-label", `Delete ${card.title}`);
  remove.title = "Delete card";
  remove.addEventListener("click", () => deleteCard(card.id));
  top.append(remove);
  article.append(top);

  if (card.description) article.append(makeElement("p", "card-description", card.description));

  const meta = makeElement("div", "card-meta");
  meta.append(makeElement("span", `priority priority-${card.priority}`, priorityNames[card.priority]));
  if (card.due) {
    const due = makeElement("time", `due-date${card.status !== "done" && isOverdue(card.due) ? " overdue" : ""}`, formatDueDate(card.due));
    due.dateTime = card.due;
    due.title = card.status !== "done" && isOverdue(card.due) ? "Past due" : "Due date";
    meta.append(due);
  }
  article.append(meta);

  article.addEventListener("dragstart", (event) => {
    article.classList.add("dragging");
    event.dataTransfer.setData("text/plain", card.id);
    event.dataTransfer.effectAllowed = "move";
  });
  article.addEventListener("dragend", () => article.classList.remove("dragging"));
  return article;
}

function render() {
  const query = elements.search.value.trim().toLocaleLowerCase();
  const priority = elements.priorityFilter.value;
  const visible = cards.filter((card) => {
    const text = `${card.title} ${card.description || ""}`.toLocaleLowerCase();
    return text.includes(query) && (priority === "all" || card.priority === priority);
  });

  for (const status of statuses) {
    const list = document.querySelector(`[data-list="${status}"]`);
    list.replaceChildren();
    const grouped = visible.filter((card) => card.status === status);
    document.querySelector(`[data-count="${status}"]`).textContent = String(grouped.length);
    if (grouped.length === 0) {
      const empty = makeElement("div", "empty-column", query || priority !== "all" ? "No matching cards" : "Nothing here yet — add a card when you're ready.");
      list.append(empty);
    } else {
      for (const card of grouped) list.append(createCard(card));
    }
  }

  document.querySelector("#total-stat").textContent = String(cards.length);
  document.querySelector("#progress-stat").textContent = String(cards.filter((card) => card.status === "doing").length);
  document.querySelector("#done-stat").textContent = String(cards.filter((card) => card.status === "done").length);
  document.querySelector("#board-total").textContent = String(cards.length);
  document.querySelector("#nav-count").textContent = String(cards.length);
}

function openDialog(status = "todo") {
  elements.form.reset();
  elements.status.value = statuses.includes(status) ? status : "todo";
  elements.priority.value = "medium";
  elements.dialog.showModal();
  elements.title.focus();
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elements.toast.classList.remove("visible"), 2800);
}

function deleteCard(id) {
  const card = cards.find((item) => item.id === id);
  if (!card || !window.confirm(`Delete "${card.title}"?`)) return;
  cards = cards.filter((item) => item.id !== id);
  saveCards();
  render();
  showToast("Card deleted.");
}

document.querySelector("#add-card-button").addEventListener("click", () => openDialog());
document.querySelector("#tip-add").addEventListener("click", () => openDialog());
document.querySelectorAll("[data-add-status]").forEach((button) => {
  button.addEventListener("click", () => openDialog(button.dataset.addStatus));
});
document.querySelector("#close-dialog").addEventListener("click", () => elements.dialog.close());
document.querySelector("#cancel-dialog").addEventListener("click", () => elements.dialog.close());
elements.dialog.addEventListener("click", (event) => {
  if (event.target === elements.dialog) elements.dialog.close();
});

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!elements.form.reportValidity()) return;
  cards.unshift({
    id: crypto.randomUUID(),
    title: elements.title.value.trim(),
    description: elements.description.value.trim(),
    status: elements.status.value,
    priority: elements.priority.value,
    due: elements.due.value,
    createdAt: new Date().toISOString(),
  });
  saveCards();
  render();
  elements.dialog.close();
  showToast("Card added to your board.");
});

elements.search.addEventListener("input", render);
elements.priorityFilter.addEventListener("change", render);
elements.filterButton.addEventListener("click", () => {
  const opening = elements.filterPanel.hidden;
  elements.filterPanel.hidden = !opening;
  elements.filterButton.setAttribute("aria-pressed", String(opening || elements.priorityFilter.value !== "all"));
});
document.querySelector("#clear-filter").addEventListener("click", () => {
  elements.priorityFilter.value = "all";
  elements.filterButton.setAttribute("aria-pressed", "false");
  render();
});
elements.priorityFilter.addEventListener("change", () => {
  elements.filterButton.setAttribute("aria-pressed", String(elements.priorityFilter.value !== "all"));
});
document.querySelector("#all-work-link").addEventListener("click", () => {
  elements.search.value = "";
  elements.priorityFilter.value = "all";
  elements.filterButton.setAttribute("aria-pressed", "false");
  render();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "/" && !elements.dialog.open && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) {
    event.preventDefault();
    elements.search.focus();
  }
  if (event.key === "Escape" && elements.dialog.open) elements.dialog.close();
});

document.querySelectorAll(".board-column").forEach((column) => {
  column.addEventListener("dragover", (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    column.classList.add("drag-over");
  });
  column.addEventListener("dragleave", (event) => {
    if (!column.contains(event.relatedTarget)) column.classList.remove("drag-over");
  });
  column.addEventListener("drop", (event) => {
    event.preventDefault();
    column.classList.remove("drag-over");
    const id = event.dataTransfer.getData("text/plain");
    const card = cards.find((item) => item.id === id);
    const status = column.dataset.status;
    if (!card || !statuses.includes(status) || card.status === status) return;
    card.status = status;
    saveCards();
    render();
    showToast(`Moved to ${statusNames[status]}.`);
  });
});

document.querySelector("#today-label").textContent = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
}).format(new Date());
render();
