/**
 * Zenith '26 Fest Administration Dashboard (admin.js)
 */

// Tab state
let currentTab = "overview"; // 'overview' | 'registrations'
let allEventsCache = [];
let pendingDeleteRegId = null;

// Category styling lookup
const categoryBadges = {
  Technical: "bg-cyan-950 text-cyan-300 border-cyan-800",
  Cultural: "bg-fuchsia-950 text-fuchsia-300 border-fuchsia-800",
  Sports: "bg-emerald-950 text-emerald-300 border-emerald-800",
  Gaming: "bg-amber-950 text-amber-300 border-amber-800",
  Workshop: "bg-indigo-950 text-indigo-300 border-indigo-800",
};

// DOM References
const adminLoading = document.getElementById("admin-loading");
const adminError = document.getElementById("admin-error");
const adminErrorText = document.getElementById("admin-error-text");
const adminRetryBtn = document.getElementById("admin-retry-btn");

const viewOverview = document.getElementById("view-overview");
const viewRegistrations = document.getElementById("view-registrations");
const tabOverviewBtn = document.getElementById("tab-overview-btn");
const tabRegsBtn = document.getElementById("tab-regs-btn");

// Stat elements
const statTotalEvents = document.getElementById("stat-total-events");
const statTotalRegs = document.getElementById("stat-total-regs");
const statUtilization = document.getElementById("stat-utilization");
const statUtilizationBar = document.getElementById("stat-utilization-bar");
const statUpcomingEvents = document.getElementById("stat-upcoming-events");
const categoryBreakdownContainer = document.getElementById("category-breakdown-container");
const eventsTableBody = document.getElementById("events-table-body");

// Registrations tab elements
const regEventFilter = document.getElementById("reg-event-filter");
const registrationsTableBody = document.getElementById("registrations-table-body");
const regsEmptyState = document.getElementById("regs-empty-state");

// Add event modal elements
const openAddEventBtn = document.getElementById("open-add-event-btn");
const addEventModal = document.getElementById("add-event-modal");
const closeAddEventBtn = document.getElementById("close-add-event-btn");
const cancelAddEventBtn = document.getElementById("cancel-add-event-btn");
const addEventForm = document.getElementById("add-event-form");
const addEventAlertError = document.getElementById("add-event-alert-error");

// Delete confirmation modal elements
const cancelConfirmModal = document.getElementById("cancel-confirm-modal");
const cancelConfirmText = document.getElementById("cancel-confirm-text");
const cancelConfirmNo = document.getElementById("cancel-confirm-no");
const cancelConfirmYes = document.getElementById("cancel-confirm-yes");

/**
 * Initialize Dashboard
 */
async function loadAdminData() {
  showLoading(true);
  hideError();

  try {
    // 1. Fetch live admin stats
    const statsRes = await fetch("/api/stats");
    if (!statsRes.ok) throw new Error(`Stats endpoint error: ${statsRes.statusText}`);
    const stats = await statsRes.json();

    // 2. Fetch all events
    const eventsRes = await fetch("/api/events");
    if (!eventsRes.ok) throw new Error(`Events endpoint error: ${eventsRes.statusText}`);
    const events = await eventsRes.json();
    allEventsCache = events;

    // Render Stats
    renderStats(stats);

    // Render Events Table (sorted by utilization descending)
    renderEventsTable(events);

    // Populate registration dropdown filter
    populateEventFilterDropdown(events);

    // If currently on registrations tab, load registrations too
    if (currentTab === "registrations") {
      await loadRegistrations();
    }

    showLoading(false);
    switchTab(currentTab);
  } catch (err) {
    showLoading(false);
    showError(err.message || "Failed to connect to backend server.");
  }
}

/**
 * Render Top Stats & Category Distribution
 */
function renderStats(stats) {
  statTotalEvents.textContent = stats.total_events || 0;
  statTotalRegs.textContent = stats.total_registrations || 0;
  statUtilization.textContent = `${(stats.overall_utilization_pct || 0).toFixed(1)}%`;
  statUtilizationBar.style.width = `${Math.min(100, stats.overall_utilization_pct || 0)}%`;
  statUpcomingEvents.textContent = stats.upcoming_events_count || 0;

  // Render category breakdown
  categoryBreakdownContainer.innerHTML = "";
  const catEntries = Object.entries(stats.events_by_category || {});

  if (catEntries.length === 0) {
    categoryBreakdownContainer.innerHTML = `<span class="text-xs text-slate-500">No categories found</span>`;
    return;
  }

  catEntries.forEach(([category, count]) => {
    const card = document.createElement("div");
    card.className =
      "bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 flex items-center justify-between shadow-sm";
    card.innerHTML = `
      <div>
        <span class="block text-[11px] uppercase font-bold text-slate-400">${category}</span>
        <span class="text-xs text-slate-500">${count} event${count === 1 ? "" : "s"}</span>
      </div>
      <span class="text-lg font-black text-purple-300 bg-purple-950/60 px-2.5 py-1 rounded-lg border border-purple-800/50">${count}</span>
    `;
    categoryBreakdownContainer.appendChild(card);
  });
}

/**
 * Render Events Overview Table
 * Sorted by utilization percentage descending by default
 */
function renderEventsTable(events) {
  // Compute utilization percentage for each event
  const eventsWithUtilization = events.map((event) => {
    const registered = Math.max(0, event.capacity - event.available_seats);
    const utilizationPct = event.capacity > 0 ? (registered / event.capacity) * 100 : 0;
    return {
      ...event,
      registered,
      utilizationPct,
    };
  });

  // Sort descending by utilization %
  eventsWithUtilization.sort((a, b) => b.utilizationPct - a.utilizationPct);

  eventsTableBody.innerHTML = "";

  eventsWithUtilization.forEach((event) => {
    const tr = document.createElement("tr");
    const isCritical = event.utilizationPct >= 90;
    const badgeClass = categoryBadges[event.category] || "bg-slate-800 text-slate-300 border-slate-700";

    tr.className = isCritical
      ? "bg-red-950/30 hover:bg-red-950/50 transition-colors"
      : "hover:bg-slate-800/50 transition-colors";

    tr.innerHTML = `
      <td class="py-3.5 px-4 font-semibold text-white flex items-center space-x-2.5">
        <span class="text-xl">${event.icon || "🎯"}</span>
        <div>
          <span class="block text-sm">${event.title}</span>
          <span class="text-[11px] text-slate-400 sm:hidden">Cap: ${event.capacity}</span>
        </div>
      </td>
      <td class="py-3.5 px-4">
        <span class="inline-block px-2 py-0.5 rounded text-xs font-semibold border ${badgeClass}">
          ${event.category}
        </span>
      </td>
      <td class="py-3.5 px-4 text-xs text-slate-300">
        <div>${event.event_date}</div>
        <div class="text-[11px] text-slate-400">${event.event_time}</div>
      </td>
      <td class="py-3.5 px-4 text-xs text-slate-300">
        ${event.venue}
      </td>
      <td class="py-3.5 px-4 text-center">
        <div class="inline-flex items-center space-x-1 font-mono text-xs">
          <span class="font-bold ${isCritical ? "text-red-400" : "text-white"}">${event.registered}</span>
          <span class="text-slate-500">/</span>
          <span class="text-slate-400">${event.capacity}</span>
        </div>
      </td>
      <td class="py-3.5 px-4 text-right">
        <div class="inline-flex items-center space-x-2">
          ${
            isCritical
              ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-900 text-red-200 border border-red-700 animate-pulse">CRITICAL</span>`
              : ""
          }
          <span class="font-mono font-bold text-xs ${
            isCritical ? "text-red-400 font-extrabold" : "text-slate-200"
          }">
            ${event.utilizationPct.toFixed(1)}%
          </span>
        </div>
      </td>
    `;

    eventsTableBody.appendChild(tr);
  });
}

/**
 * Populate Event Filter Dropdown
 */
function populateEventFilterDropdown(events) {
  const selected = regEventFilter.value;
  regEventFilter.innerHTML = '<option value="">All Events</option>';
  events.forEach((ev) => {
    const opt = document.createElement("option");
    opt.value = ev.id;
    opt.textContent = `#${ev.id} - ${ev.title}`;
    if (String(ev.id) === String(selected)) opt.selected = true;
    regEventFilter.appendChild(opt);
  });
}

/**
 * Fetch and Render Raw Registrations Log
 */
async function loadRegistrations() {
  registrationsTableBody.innerHTML = "";
  regsEmptyState.classList.add("hidden");

  try {
    const selectedEventId = regEventFilter.value;
    const url = selectedEventId
      ? `/api/registrations?event_id=${selectedEventId}`
      : "/api/registrations";

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Registrations error: ${res.statusText}`);
    const registrations = await res.json();

    if (!registrations || registrations.length === 0) {
      regsEmptyState.classList.remove("hidden");
      return;
    }

    registrations.forEach((reg) => {
      const tr = document.createElement("tr");
      tr.className = "hover:bg-slate-800/40 transition-colors";
      tr.innerHTML = `
        <td class="py-3 px-4 font-mono text-xs text-slate-400">#${reg.id}</td>
        <td class="py-3 px-4 font-bold text-white text-xs">${reg.student_name}</td>
        <td class="py-3 px-4 font-mono text-xs text-purple-300">${reg.roll_number}</td>
        <td class="py-3 px-4 text-xs text-slate-300">${reg.email}</td>
        <td class="py-3 px-4 text-xs text-slate-400">${reg.phone || "—"}</td>
        <td class="py-3 px-4 text-xs">
          <span class="font-medium text-slate-200 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
            ${reg.event_title || `Event #${reg.event_id}`}
          </span>
        </td>
        <td class="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">${reg.registered_at}</td>
        <td class="py-3 px-4 text-center">
          <button 
            onclick="confirmCancelRegistration(${reg.id}, '${reg.student_name.replace(/'/g, "\\'")}', '${(reg.event_title || "").replace(/'/g, "\\'")}')" 
            class="px-2 py-1 rounded bg-red-950/80 hover:bg-red-900 text-red-300 text-[10px] font-semibold border border-red-800/80 transition-all active:scale-95"
            title="Cancel this registration"
          >
            Cancel
          </button>
        </td>
      `;
      registrationsTableBody.appendChild(tr);
    });
  } catch (err) {
    alert("Could not load registrations: " + err.message);
  }
}

/**
 * Filter change handler
 */
regEventFilter.addEventListener("change", () => {
  loadRegistrations();
});

/**
 * Tab Switching Logic
 */
function switchTab(tab) {
  currentTab = tab;
  if (tab === "overview") {
    viewOverview.classList.remove("hidden");
    viewRegistrations.classList.add("hidden");

    tabOverviewBtn.className = "px-3 py-1.5 rounded-lg font-semibold bg-purple-600 text-white shadow-sm transition-all";
    tabRegsBtn.className = "px-3 py-1.5 rounded-lg font-semibold text-slate-300 hover:text-white hover:bg-slate-700/60 transition-all";
  } else {
    viewOverview.classList.add("hidden");
    viewRegistrations.classList.remove("hidden");

    tabOverviewBtn.className = "px-3 py-1.5 rounded-lg font-semibold text-slate-300 hover:text-white hover:bg-slate-700/60 transition-all";
    tabRegsBtn.className = "px-3 py-1.5 rounded-lg font-semibold bg-purple-600 text-white shadow-sm transition-all";

    loadRegistrations();
  }
}

tabOverviewBtn.addEventListener("click", () => switchTab("overview"));
tabRegsBtn.addEventListener("click", () => switchTab("registrations"));

/**
 * Stretch Goal 1: Add Event Modal & Submission
 */
openAddEventBtn.addEventListener("click", () => {
  addEventAlertError.classList.add("hidden");
  addEventForm.reset();
  addEventModal.classList.remove("hidden");
});

function closeAddEventModal() {
  addEventModal.classList.add("hidden");
  addEventAlertError.classList.add("hidden");
}

closeAddEventBtn.addEventListener("click", closeAddEventModal);
cancelAddEventBtn.addEventListener("click", closeAddEventModal);

addEventForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  addEventAlertError.classList.add("hidden");

  const title = document.getElementById("new-title").value.trim();
  const category = document.getElementById("new-category").value;
  const icon = document.getElementById("new-icon").value.trim() || "🎯";
  const description = document.getElementById("new-description").value.trim();
  const event_date = document.getElementById("new-date").value.trim();
  const event_time = document.getElementById("new-time").value.trim();
  const venue = document.getElementById("new-venue").value.trim();
  const capacity = parseInt(document.getElementById("new-capacity").value, 10);
  const fee = parseInt(document.getElementById("new-fee").value || "0", 10);

  if (!title || !event_date || !event_time || !venue || isNaN(capacity) || capacity <= 0) {
    addEventAlertError.textContent = "Please provide all required fields with a capacity greater than 0.";
    addEventAlertError.classList.remove("hidden");
    return;
  }

  try {
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        category,
        icon,
        description,
        event_date,
        event_time,
        venue,
        capacity,
        fee,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      addEventAlertError.textContent = data.detail || "Failed to add event";
      addEventAlertError.classList.remove("hidden");
      return;
    }

    closeAddEventModal();
    // Refresh admin data
    await loadAdminData();
  } catch (err) {
    addEventAlertError.textContent = err.message || "Network error while saving event.";
    addEventAlertError.classList.remove("hidden");
  }
});

/**
 * Stretch Goal 2: Cancel Registration with confirmation
 */
function confirmCancelRegistration(regId, studentName, eventTitle) {
  pendingDeleteRegId = regId;
  cancelConfirmText.textContent = `Are you sure you want to cancel the registration for "${studentName}" in "${eventTitle}"? This will free up a seat immediately.`;
  cancelConfirmModal.classList.remove("hidden");
}

cancelConfirmNo.addEventListener("click", () => {
  cancelConfirmModal.classList.add("hidden");
  pendingDeleteRegId = null;
});

cancelConfirmYes.addEventListener("click", async () => {
  if (!pendingDeleteRegId) return;

  try {
    const res = await fetch(`/api/registrations/${pendingDeleteRegId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const err = await res.json();
      alert("Error: " + (err.detail || "Could not delete registration"));
      return;
    }

    cancelConfirmModal.classList.add("hidden");
    pendingDeleteRegId = null;

    // Refresh data to reflect released seat
    await loadAdminData();
    if (currentTab === "registrations") {
      await loadRegistrations();
    }
  } catch (err) {
    alert("Network error: " + err.message);
  }
});

window.confirmCancelRegistration = confirmCancelRegistration;

// UI State helpers
function showLoading(show) {
  if (show) {
    adminLoading.classList.remove("hidden");
    viewOverview.classList.add("hidden");
    viewRegistrations.classList.add("hidden");
  } else {
    adminLoading.classList.add("hidden");
  }
}

function showError(msg) {
  adminErrorText.textContent = msg;
  adminError.classList.remove("hidden");
}

function hideError() {
  adminError.classList.add("hidden");
}

adminRetryBtn.addEventListener("click", loadAdminData);

// Initial bootstrap
document.addEventListener("DOMContentLoaded", () => {
  loadAdminData();
});
