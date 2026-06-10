const STORAGE_KEY = "tabletten_medicines_v2";

const elements = {
  name: document.getElementById("name"),
  packSize: document.getElementById("packSize"),
  stock: document.getElementById("stock"),
  dailyDose: document.getElementById("dailyDose"),
  reminderLimit: document.getElementById("reminderLimit"),
  color: document.getElementById("color"),
  saveBtn: document.getElementById("saveBtn"),
  notifyBtn: document.getElementById("notifyBtn"),
  checkBtn: document.getElementById("checkBtn"),
  list: document.getElementById("medicineList"),
  countTotal: document.getElementById("countTotal"),
  countWarning: document.getElementById("countWarning"),
  countCritical: document.getElementById("countCritical")
};

let medicines = loadMedicines();

function loadMedicines() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveMedicines() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(medicines));
}

function formatDate(date) {
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function calculate(medicine) {
  const dailyDose = Math.max(Number(medicine.dailyDose), 0.1);
  const daysRemaining = Math.floor(Number(medicine.stock) / dailyDose);
  const usableStock = Number(medicine.stock) - Number(medicine.reminderLimit);
  const daysUntilReminder = usableStock <= 0 ? 0 : Math.floor(usableStock / dailyDose);

  const emptyDate = new Date();
  emptyDate.setDate(emptyDate.getDate() + daysRemaining);

  const reminderDate = new Date();
  reminderDate.setDate(reminderDate.getDate() + daysUntilReminder);

  return { daysRemaining, daysUntilReminder, emptyDate, reminderDate };
}

function getStatus(medicine) {
  const data = calculate(medicine);
  if (Number(medicine.stock) <= Number(medicine.reminderLimit)) {
    return { className: "critical", label: "Sofort bestellen" };
  }
  if (data.daysUntilReminder <= 7) {
    return { className: "warning", label: "Bald bestellen" };
  }
  return { className: "ok", label: "Ausreichend" };
}

function renderMedicines() {
  elements.list.innerHTML = "";

  let warning = 0;
  let critical = 0;

  medicines.forEach(medicine => {
    const status = getStatus(medicine);
    if (status.className === "warning") warning++;
    if (status.className === "critical") critical++;
  });

  elements.countTotal.textContent = medicines.length;
  elements.countWarning.textContent = warning;
  elements.countCritical.textContent = critical;

  if (medicines.length === 0) {
    elements.list.innerHTML = '<div class="empty">Noch kein Medikament angelegt.</div>';
    return;
  }

  medicines
    .slice()
    .sort((a, b) => calculate(a).daysUntilReminder - calculate(b).daysUntilReminder)
    .forEach((medicine) => {
      const data = calculate(medicine);
      const status = getStatus(medicine);
      const div = document.createElement("div");

      div.className = `medicine ${medicine.color} ${status.className}`;
      div.innerHTML = `
        <div class="medicine-header">
          <h3>💊 ${escapeHtml(medicine.name)}</h3>
          <span class="badge ${status.className}">${status.label}</span>
        </div>

        <div class="info">
          Bestand: <strong>${medicine.stock} Stück</strong><br>
          Packungsgröße: <strong>${medicine.packSize} Stück</strong><br>
          Einnahme: <strong>${medicine.dailyDose} pro Tag</strong><br>
          Reicht noch: <strong>${data.daysRemaining} Tage</strong><br>
          Nachbestellen ab: <strong>${formatDate(data.reminderDate)}</strong><br>
          Voraussichtlich leer: <strong>${formatDate(data.emptyDate)}</strong>
        </div>

        <div class="action-grid">
          <button class="take" onclick="takeToday(${medicine.id})">Heute eingenommen</button>
          <button class="pack" onclick="addPack(${medicine.id})">Neue Packung erhalten</button>
        </div>
        <button class="delete" onclick="deleteMedicine(${medicine.id})">Löschen</button>
      `;

      elements.list.appendChild(div);
    });
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, function(match) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[match];
  });
}

function addMedicine() {
  const medicine = {
    id: Date.now(),
    name: elements.name.value.trim(),
    packSize: Number(elements.packSize.value),
    stock: Number(elements.stock.value),
    dailyDose: Number(String(elements.dailyDose.value).replace(",", ".")),
    reminderLimit: Number(elements.reminderLimit.value),
    color: elements.color.value
  };

  if (!medicine.name || !validNumber(medicine.packSize, 1) || !validNumber(medicine.stock, 0) ||
      !validNumber(medicine.dailyDose, 0.1) || !validNumber(medicine.reminderLimit, 0)) {
    alert("Bitte alle Felder korrekt ausfüllen.");
    return;
  }

  medicines.push(medicine);
  saveMedicines();
  renderMedicines();
  checkReminders(false);

  elements.name.value = "";
  elements.packSize.value = "";
  elements.stock.value = "";
  elements.dailyDose.value = "1";
  elements.reminderLimit.value = "10";
  elements.color.value = "blue";
}

function validNumber(value, min) {
  return !Number.isNaN(value) && value >= min;
}

function deleteMedicine(id) {
  if (!confirm("Medikament wirklich löschen?")) return;
  medicines = medicines.filter(m => m.id !== id);
  saveMedicines();
  renderMedicines();
}

function takeToday(id) {
  const medicine = medicines.find(m => m.id === id);
  if (!medicine) return;

  medicine.stock = Math.max(0, Number(medicine.stock) - Number(medicine.dailyDose));
  saveMedicines();
  renderMedicines();
  checkReminders(false);
}

function addPack(id) {
  const medicine = medicines.find(m => m.id === id);
  if (!medicine) return;

  medicine.stock = Number(medicine.stock) + Number(medicine.packSize);
  saveMedicines();
  renderMedicines();
}

async function enableNotifications() {
  if (!("Notification" in window)) {
    alert("Dieser Browser unterstützt keine Benachrichtigungen.");
    return;
  }

  const permission = await Notification.requestPermission();

  if (permission === "granted") {
    alert("Benachrichtigungen sind aktiviert.");
    checkReminders(false);
  } else {
    alert("Benachrichtigungen wurden nicht erlaubt.");
  }
}

function checkReminders(showAlert = true) {
  const criticalMedicines = medicines.filter(m => getStatus(m).className === "critical");

  if (criticalMedicines.length === 0) {
    if (showAlert) alert("Alles in Ordnung. Kein Medikament ist kritisch.");
    return;
  }

  const text = criticalMedicines.map(m => `- ${m.name}`).join("\n");

  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("Tabletten nachbestellen", {
      body: criticalMedicines.map(m => m.name).join(", ")
    });
  }

  if (showAlert) {
    alert("Bitte nachbestellen:\n\n" + text);
  }
}

elements.saveBtn.addEventListener("click", addMedicine);
elements.notifyBtn.addEventListener("click", enableNotifications);
elements.checkBtn.addEventListener("click", () => checkReminders(true));

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}

renderMedicines();
setTimeout(() => checkReminders(false), 800);
