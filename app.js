const STORAGE_KEY = "tabletten_medicines";

const nameInput = document.getElementById("name");
const stockInput = document.getElementById("stock");
const dailyDoseInput = document.getElementById("dailyDose");
const reminderLimitInput = document.getElementById("reminderLimit");
const saveBtn = document.getElementById("saveBtn");
const notifyBtn = document.getElementById("notifyBtn");
const medicineList = document.getElementById("medicineList");

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
  const daysRemaining = Math.floor(medicine.stock / medicine.dailyDose);
  const usableStock = medicine.stock - medicine.reminderLimit;
  const daysUntilReminder = usableStock <= 0 ? 0 : Math.floor(usableStock / medicine.dailyDose);

  const emptyDate = new Date();
  emptyDate.setDate(emptyDate.getDate() + daysRemaining);

  const reminderDate = new Date();
  reminderDate.setDate(reminderDate.getDate() + daysUntilReminder);

  return { daysRemaining, daysUntilReminder, emptyDate, reminderDate };
}

function renderMedicines() {
  medicineList.innerHTML = "";

  if (medicines.length === 0) {
    medicineList.innerHTML = '<div class="empty">Noch kein Medikament angelegt.</div>';
    return;
  }

  medicines.forEach((medicine) => {
    const data = calculate(medicine);
    const div = document.createElement("div");

    let statusClass = "";
    if (medicine.stock <= medicine.reminderLimit) {
      statusClass = "critical";
    } else if (data.daysUntilReminder <= 7) {
      statusClass = "warning";
    }

    div.className = `medicine ${statusClass}`;
    div.innerHTML = `
      <h3>${escapeHtml(medicine.name)}</h3>
      <div class="info">
        Bestand: <strong>${medicine.stock} Stück</strong><br>
        Einnahme: <strong>${medicine.dailyDose} pro Tag</strong><br>
        Reicht bis: <strong>${formatDate(data.emptyDate)}</strong><br>
        Nachbestellen ab: <strong>${formatDate(data.reminderDate)}</strong>
      </div>
      <button class="delete" onclick="deleteMedicine(${medicine.id})">Löschen</button>
    `;

    medicineList.appendChild(div);
  });
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, function(match) {
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
  const name = nameInput.value.trim();
  const stock = Number(stockInput.value);
  const dailyDose = Number(String(dailyDoseInput.value).replace(",", "."));
  const reminderLimit = Number(reminderLimitInput.value);

  if (!name || Number.isNaN(stock) || Number.isNaN(dailyDose) || Number.isNaN(reminderLimit)) {
    alert("Bitte alle Felder korrekt ausfüllen.");
    return;
  }

  if (stock < 0 || dailyDose <= 0 || reminderLimit < 0) {
    alert("Bitte gültige Werte eingeben.");
    return;
  }

  const medicine = { id: Date.now(), name, stock, dailyDose, reminderLimit };

  medicines.push(medicine);
  saveMedicines();
  showImmediateReminderIfNeeded(medicine);
  renderMedicines();

  nameInput.value = "";
  stockInput.value = "";
  dailyDoseInput.value = "1";
  reminderLimitInput.value = "10";
}

function deleteMedicine(id) {
  medicines = medicines.filter(m => m.id !== id);
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
  } else {
    alert("Benachrichtigungen wurden nicht erlaubt.");
  }
}

function showImmediateReminderIfNeeded(medicine) {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  if (medicine.stock <= medicine.reminderLimit) {
    new Notification("Tabletten nachbestellen", {
      body: `${medicine.name} sollte nachbestellt werden.`
    });
  }
}

saveBtn.addEventListener("click", addMedicine);
notifyBtn.addEventListener("click", enableNotifications);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}

renderMedicines();
