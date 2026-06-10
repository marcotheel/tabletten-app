const STORAGE_KEY = "tabletten_medicines_v3";
const THEME_KEY = "tabletten_theme";

const el = {
  name: document.getElementById("name"),
  substance: document.getElementById("substance"),
  strength: document.getElementById("strength"),
  packSize: document.getElementById("packSize"),
  stock: document.getElementById("stock"),
  dailyDose: document.getElementById("dailyDose"),
  reminderLimit: document.getElementById("reminderLimit"),
  note: document.getElementById("note"),
  color: document.getElementById("color"),
  saveBtn: document.getElementById("saveBtn"),
  notifyBtn: document.getElementById("notifyBtn"),
  checkBtn: document.getElementById("checkBtn"),
  exportBtn: document.getElementById("exportBtn"),
  importBtn: document.getElementById("importBtn"),
  importFile: document.getElementById("importFile"),
  copyShoppingBtn: document.getElementById("copyShoppingBtn"),
  darkModeBtn: document.getElementById("darkModeBtn"),
  list: document.getElementById("medicineList"),
  shoppingList: document.getElementById("shoppingList"),
  countTotal: document.getElementById("countTotal"),
  countWarning: document.getElementById("countWarning"),
  countCritical: document.getElementById("countCritical")
};

let medicines = loadMedicines();
let editId = null;

initTheme();

function loadMedicines() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveMedicines() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(medicines));
}

function initTheme() {
  const theme = localStorage.getItem(THEME_KEY);
  if (theme === "dark") document.body.classList.add("dark");
}

function toggleDarkMode() {
  document.body.classList.toggle("dark");
  localStorage.setItem(THEME_KEY, document.body.classList.contains("dark") ? "dark" : "light");
}

function formatDate(date) {
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function calculate(m) {
  const dose = Math.max(Number(m.dailyDose), 0.1);
  const daysRemaining = Math.floor(Number(m.stock) / dose);
  const usable = Number(m.stock) - Number(m.reminderLimit);
  const daysUntilReminder = usable <= 0 ? 0 : Math.floor(usable / dose);

  const emptyDate = new Date();
  emptyDate.setDate(emptyDate.getDate() + daysRemaining);

  const reminderDate = new Date();
  reminderDate.setDate(reminderDate.getDate() + daysUntilReminder);

  return { daysRemaining, daysUntilReminder, emptyDate, reminderDate };
}

function getStatus(m) {
  const data = calculate(m);
  if (Number(m.stock) <= Number(m.reminderLimit)) return { className: "critical", label: "Sofort bestellen" };
  if (data.daysUntilReminder <= 7) return { className: "warning", label: "Bald bestellen" };
  return { className: "ok", label: "Ausreichend" };
}

function renderAll() {
  renderMedicines();
  renderShoppingList();
}

function renderMedicines() {
  el.list.innerHTML = "";

  let warning = 0;
  let critical = 0;

  medicines.forEach(m => {
    const s = getStatus(m);
    if (s.className === "warning") warning++;
    if (s.className === "critical") critical++;
  });

  el.countTotal.textContent = medicines.length;
  el.countWarning.textContent = warning;
  el.countCritical.textContent = critical;

  if (medicines.length === 0) {
    el.list.innerHTML = '<div class="empty">Noch kein Medikament angelegt.</div>';
    return;
  }

  medicines.slice()
    .sort((a, b) => calculate(a).daysUntilReminder - calculate(b).daysUntilReminder)
    .forEach(m => {
      const data = calculate(m);
      const status = getStatus(m);
      const div = document.createElement("div");
      div.className = `medicine ${m.color || "blue"} ${status.className}`;

      div.innerHTML = `
        <div class="medicine-header">
          <h3>💊 ${escapeHtml(m.name)}</h3>
          <span class="badge ${status.className}">${status.label}</span>
        </div>
        <div class="info">
          ${m.substance ? `Wirkstoff: <strong>${escapeHtml(m.substance)}</strong><br>` : ""}
          ${m.strength ? `Stärke: <strong>${escapeHtml(m.strength)}</strong><br>` : ""}
          Bestand: <strong>${m.stock} Stück</strong><br>
          Packungsgröße: <strong>${m.packSize} Stück</strong><br>
          Einnahme: <strong>${m.dailyDose} pro Tag</strong><br>
          Reicht noch: <strong>${data.daysRemaining} Tage</strong><br>
          Nachbestellen ab: <strong>${formatDate(data.reminderDate)}</strong><br>
          Voraussichtlich leer: <strong>${formatDate(data.emptyDate)}</strong>
          ${m.note ? `<div class="note">Notiz: ${escapeHtml(m.note)}</div>` : ""}
        </div>
        <div class="action-grid">
          <button class="take" onclick="takeToday(${m.id})">Heute eingenommen</button>
          <button class="pack" onclick="addPack(${m.id})">Neue Packung erhalten</button>
          <button class="edit" onclick="editMedicine(${m.id})">Bearbeiten</button>
          <button class="delete" onclick="deleteMedicine(${m.id})">Löschen</button>
        </div>
      `;
      el.list.appendChild(div);
    });
}

function renderShoppingList() {
  const orderItems = medicines.filter(m => getStatus(m).className !== "ok");

  if (orderItems.length === 0) {
    el.shoppingList.innerHTML = "Aktuell muss nichts nachbestellt werden.";
    return;
  }

  el.shoppingList.innerHTML = orderItems.map(m => {
    const details = [m.name, m.substance, m.strength].filter(Boolean).map(escapeHtml).join(" – ");
    return `• ${details} | Bestand: ${m.stock} Stück`;
  }).join("<br>");
}

function shoppingText() {
  const orderItems = medicines.filter(m => getStatus(m).className !== "ok");
  if (orderItems.length === 0) return "Aktuell muss nichts nachbestellt werden.";
  return "Nachbestellliste:\n" + orderItems.map(m => {
    return `- ${m.name}${m.substance ? " / " + m.substance : ""}${m.strength ? " / " + m.strength : ""} | Bestand: ${m.stock} Stück`;
  }).join("\n");
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, match => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[match]));
}

function readForm() {
  return {
    id: editId || Date.now(),
    name: el.name.value.trim(),
    substance: el.substance.value.trim(),
    strength: el.strength.value.trim(),
    packSize: Number(el.packSize.value),
    stock: Number(el.stock.value),
    dailyDose: Number(String(el.dailyDose.value).replace(",", ".")),
    reminderLimit: Number(el.reminderLimit.value),
    note: el.note.value.trim(),
    color: el.color.value
  };
}

function validNumber(value, min) {
  return !Number.isNaN(value) && value >= min;
}

function saveFromForm() {
  const m = readForm();

  if (!m.name || !validNumber(m.packSize, 1) || !validNumber(m.stock, 0) ||
      !validNumber(m.dailyDose, 0.1) || !validNumber(m.reminderLimit, 0)) {
    alert("Bitte alle Pflichtfelder korrekt ausfüllen.");
    return;
  }

  if (editId) {
    medicines = medicines.map(x => x.id === editId ? m : x);
    editId = null;
    el.saveBtn.textContent = "Speichern";
  } else {
    medicines.push(m);
  }

  saveMedicines();
  clearForm();
  renderAll();
  checkReminders(false);
}

function clearForm() {
  el.name.value = "";
  el.substance.value = "";
  el.strength.value = "";
  el.packSize.value = "";
  el.stock.value = "";
  el.dailyDose.value = "1";
  el.reminderLimit.value = "10";
  el.note.value = "";
  el.color.value = "blue";
}

function editMedicine(id) {
  const m = medicines.find(x => x.id === id);
  if (!m) return;

  editId = id;
  el.name.value = m.name || "";
  el.substance.value = m.substance || "";
  el.strength.value = m.strength || "";
  el.packSize.value = m.packSize || "";
  el.stock.value = m.stock || "";
  el.dailyDose.value = m.dailyDose || "1";
  el.reminderLimit.value = m.reminderLimit || "10";
  el.note.value = m.note || "";
  el.color.value = m.color || "blue";
  el.saveBtn.textContent = "Änderung speichern";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function deleteMedicine(id) {
  if (!confirm("Medikament wirklich löschen?")) return;
  medicines = medicines.filter(m => m.id !== id);
  saveMedicines();
  renderAll();
}

function takeToday(id) {
  const m = medicines.find(x => x.id === id);
  if (!m) return;
  m.stock = Math.max(0, Number(m.stock) - Number(m.dailyDose));
  saveMedicines();
  renderAll();
  checkReminders(false);
}

function addPack(id) {
  const m = medicines.find(x => x.id === id);
  if (!m) return;
  m.stock = Number(m.stock) + Number(m.packSize);
  saveMedicines();
  renderAll();
}

async function enableNotifications() {
  if (!("Notification" in window)) {
    alert("Dieser Browser unterstützt keine Benachrichtigungen.");
    return;
  }
  const permission = await Notification.requestPermission();
  alert(permission === "granted" ? "Benachrichtigungen sind aktiviert." : "Benachrichtigungen wurden nicht erlaubt.");
  if (permission === "granted") checkReminders(false);
}

function checkReminders(showAlert = true) {
  const critical = medicines.filter(m => getStatus(m).className === "critical");
  if (critical.length === 0) {
    if (showAlert) alert("Alles in Ordnung. Kein Medikament ist kritisch.");
    return;
  }

  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("Tabletten nachbestellen", {
      body: critical.map(m => m.name).join(", ")
    });
  }

  if (showAlert) alert("Bitte nachbestellen:\n\n" + critical.map(m => "- " + m.name).join("\n"));
}

function exportBackup() {
  const backup = {
    app: "Tabletten Erinnerung",
    version: 3,
    exportedAt: new Date().toISOString(),
    medicines
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "tabletten-backup.json";
  a.click();
  URL.revokeObjectURL(url);
}

function importBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data.medicines)) throw new Error("Ungültiges Backup");
      medicines = data.medicines;
      saveMedicines();
      renderAll();
      alert("Backup wurde importiert.");
    } catch {
      alert("Backup konnte nicht gelesen werden.");
    }
  };
  reader.readAsText(file);
}

async function copyShoppingList() {
  const text = shoppingText();
  try {
    await navigator.clipboard.writeText(text);
    alert("Nachbestellliste wurde kopiert.");
  } catch {
    alert(text);
  }
}

el.saveBtn.addEventListener("click", saveFromForm);
el.notifyBtn.addEventListener("click", enableNotifications);
el.checkBtn.addEventListener("click", () => checkReminders(true));
el.exportBtn.addEventListener("click", exportBackup);
el.importBtn.addEventListener("click", () => el.importFile.click());
el.importFile.addEventListener("change", e => {
  if (e.target.files[0]) importBackup(e.target.files[0]);
});
el.copyShoppingBtn.addEventListener("click", copyShoppingList);
el.darkModeBtn.addEventListener("click", toggleDarkMode);

if ("serviceWorker" in navigator) navigator.serviceWorker.register("service-worker.js");

renderAll();
setTimeout(() => checkReminders(false), 800);
