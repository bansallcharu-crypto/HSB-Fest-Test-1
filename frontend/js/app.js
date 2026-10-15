/**
 * Zenith '26 College Fest Management System
 * Student Portal JavaScript (app.js)
 */

// State
let currentCategory = "All";
let currentSearch = "";
let searchDebounceTimeout = null;
let currentEventData = null;

// DOM Elements
const eventsGrid = document.getElementById("events-grid");
const loadingState = document.getElementById("loading-state");
const errorState = document.getElementById("error-state");
const errorMessage = document.getElementById("error-message");
const retryBtn = document.getElementById("retry-btn");
const emptyState = document.getElementById("empty-state");
const emptyResetBtn = document.getElementById("empty-reset-btn");

const searchInput = document.getElementById("search-input");
const clearSearchBtn = document.getElementById("clear-search-btn");
const categoryFilters = document.getElementById("category-filters");
const filterStatus = document.getElementById("filter-status");
const filterStatusText = document.getElementById("filter-status-text");
const resetFiltersBtn = document.getElementById("reset-filters-btn");

// Modal Elements
const eventModal = document.getElementById("event-modal");
const closeModalBtn = document.getElementById("close-modal-btn");
const cancelRegBtn = document.getElementById("cancel-reg-btn");
const modalIcon = document.getElementById("modal-icon");
const modalTitle = document.getElementById("modal-title");
const modalCategory = document.getElementById("modal-category");
const modalDate = document.getElementById("modal-date");
const modalTime = document.getElementById("modal-time");
const modalVenue = document.getElementById("modal-venue");
const modalFeeSeats = document.getElementById("modal-fee-seats");
const modalDescription = document.getElementById("modal-description");
const modalFullIndicator = document.getElementById("modal-full-indicator");

// Form Elements
const registrationForm = document.getElementById("registration-form");
const regEventIdInput = document.getElementById("reg-event-id");
const regNameInput = document.getElementById("reg-name");
const regRollInput = document.getElementById("reg-roll");
const regEmailInput = document.getElementById("reg-email");
const regPhoneInput = document.getElementById("reg-phone");
const submitRegBtn = document.getElementById("submit-reg-btn");

const errorName = document.getElementById("error-name");
const errorRoll = document.getElementById("error-roll");
const errorEmail = document.getElementById("error-email");
const modalAlertError = document.getElementById("modal-alert-error");
const modalAlertErrorText = document.getElementById("modal-alert-error-text");
const modalAlertSuccess = document.getElementById("modal-alert-success");
const modalAlertSuccessText = document.getElementById("modal-alert-success-text");

// Mobile menu toggle
const mobileMenuBtn = document.getElementById("mobile-menu-btn");
const mobileMenu = document.getElementById("mobile-menu");
if (mobileMenuBtn && mobileMenu) {
  mobileMenuBtn.addEventListener("click", () => {
    mobileMenu.classList.toggle("hidden");
  });
}

// Category badge styles
const categoryStyles = {
  Technical: "bg-cyan-950/80 text-cyan-300 border-cyan-800/80",
  Cultural: "bg-fuchsia-950/80 text-fuchsia-300 border-fuchsia-800/80",
  Sports: "bg-emerald-950/80 text-emerald-300 border-emerald-800/80",
  Gaming: "bg-amber-950/80 text-amber-300 border-amber-800/80",
  Workshop: "bg-indigo-950/80 text-indigo-300 border-indigo-800/80",
};

/**
 * Fetch events from FastAPI backend with query params
 */
async function fetchEvents() {
  showLoading(true);
  hideError();
  hideEmpty();
  eventsGrid.innerHTML = "";

  try {
    const params = new URLSearchParams();
    if (currentCategory && currentCategory !== "All") {
      params.append("category", currentCategory);
    }
    if (currentSearch && currentSearch.trim() !== "") {
      params.append("search", currentSearch.trim());
    }

    const url = `/api/events${params.toString() ? "?" + params.toString() : ""}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}: ${response.statusText}`);
    }

    const events = await response.json();
    showLoading(false);

    if (!events || events.length === 0) {
      showEmpty();
    } else {
      renderEvents(events);
    }
    updateFilterStatusBanner();
  } catch (err) {
    showLoading(false);
    showError(err.message || "Could not connect to backend server. Make sure uvicorn is running.");
  }
}

/**
 * Render event cards in the grid
 */
function renderEvents(events) {
  eventsGrid.innerHTML = "";

  events.forEach((event, index) => {
    const card = document.createElement("div");
    card.className =
      "bg-slate-800/70 hover:bg-slate-800 border border-slate-700/70 hover:border-purple-500/50 rounded-2xl p-5 shadow-lg hover:shadow-purple-500/10 transition-all duration-300 flex flex-col justify-between group transform hover:-translate-y-1 card-animate";
    card.style.animationDelay = `${index * 40}ms`;

    const badgeClass = categoryStyles[event.category] || "bg-slate-700 text-slate-200 border-slate-600";
    const isFull = event.available_seats <= 0;
    const feeText = event.fee === 0 ? "Free" : `₹${event.fee}`;

    // Seats badge markup
    let seatsBadge = "";
    if (isFull) {
      seatsBadge = `
        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-950 text-red-300 border border-red-800/80 animate-pulse">
          FULL
        </span>
      `;
    } else {
      const seatsColor =
        event.available_seats <= 5
          ? "text-amber-400 font-bold"
          : "text-slate-300";
      seatsBadge = `
        <span class="text-xs ${seatsColor}">
          <span class="font-bold text-white">${event.available_seats}</span> / ${event.capacity} seats left
        </span>
      `;
    }

    card.innerHTML = `
      <div>
        <div class="flex items-start justify-between gap-3 mb-3">
          <div class="flex items-center space-x-2.5">
            <span class="text-2xl p-2 rounded-xl bg-slate-900/80 border border-slate-700/60 shadow-inner group-hover:scale-110 transition-transform">${event.icon || "🎯"}</span>
            <div>
              <span class="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badgeClass}">
                ${event.category}
              </span>
            </div>
          </div>
          <div>${seatsBadge}</div>
        </div>

        <h3 class="text-lg font-bold text-white group-hover:text-purple-300 transition-colors mb-2 tracking-tight">
          ${event.title}
        </h3>

        <p class="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
          ${event.description || "No description provided."}
        </p>
      </div>

      <div class="pt-4 border-t border-slate-700/60 mt-auto">
        <div class="flex items-center justify-between text-xs text-slate-300 mb-3">
          <div class="flex items-center space-x-1.5 text-slate-400">
            <span>📅</span>
            <span>${event.event_date} • ${event.event_time}</span>
          </div>
          <div class="font-semibold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-800/40">
            ${feeText}
          </div>
        </div>

        <div class="flex items-center justify-between text-xs text-slate-400 mb-4">
          <div class="flex items-center space-x-1.5 truncate">
            <span>📍</span>
            <span class="truncate">${event.venue}</span>
          </div>
        </div>

        <button 
          onclick="openEventDetail(${event.id})" 
          class="w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
            isFull
              ? "bg-slate-700/70 hover:bg-slate-700 text-slate-200"
              : "bg-purple-600/90 hover:bg-purple-600 active:bg-purple-700 text-white shadow-md shadow-purple-600/20"
          }"
        >
          <span>${isFull ? "View Details (Full)" : "View Details & Register"}</span>
          <span>→</span>
        </button>
      </div>
    `;

    eventsGrid.appendChild(card);
  });
}

/**
 * Open Event Detail Modal and populate data
 */
async function openEventDetail(eventId) {
  resetRegistrationForm();
  regEventIdInput.value = eventId;

  try {
    const response = await fetch(`/api/events/${eventId}`);
    if (!response.ok) {
      alert(`Could not load event details: ${response.statusText}`);
      return;
    }
    const event = await response.json();
    currentEventData = event;

    modalIcon.textContent = event.icon || "🎯";
    modalTitle.textContent = event.title;
    modalCategory.textContent = event.category;
    modalCategory.className = `px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
      categoryStyles[event.category] || "bg-slate-700 text-slate-200 border-slate-600"
    }`;

    modalDate.textContent = event.event_date;
    modalTime.textContent = event.event_time;
    modalVenue.textContent = event.venue;
    modalDescription.textContent = event.description || "No description provided.";

    const feeText = event.fee === 0 ? "Free" : `₹${event.fee}`;
    modalFeeSeats.textContent = `${feeText} • ${event.available_seats} / ${event.capacity} seats left`;

    if (event.available_seats <= 0) {
      modalFullIndicator.classList.remove("hidden");
      submitRegBtn.disabled = true;
      submitRegBtn.classList.add("opacity-50", "cursor-not-allowed");
      submitRegBtn.textContent = "Event is Full";
    } else {
      modalFullIndicator.classList.add("hidden");
      submitRegBtn.disabled = false;
      submitRegBtn.classList.remove("opacity-50", "cursor-not-allowed");
      submitRegBtn.textContent = "Confirm Registration";
    }

    eventModal.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
  } catch (err) {
    alert("Error fetching event details: " + err.message);
  }
}

/**
 * Close modal
 */
function closeModal() {
  eventModal.classList.add("hidden");
  document.body.classList.remove("overflow-hidden");
  resetRegistrationForm();
  currentEventData = null;
}

/**
 * Reset registration form and messages
 */
function resetRegistrationForm() {
  registrationForm.reset();
  modalAlertError.classList.add("hidden");
  modalAlertErrorText.textContent = "";
  modalAlertSuccess.classList.add("hidden");
  modalAlertSuccessText.textContent = "";

  errorName.classList.add("hidden");
  errorRoll.classList.add("hidden");
  errorEmail.classList.add("hidden");
}

/**
 * Handle Registration Form Submit
 */
registrationForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  modalAlertError.classList.add("hidden");
  modalAlertSuccess.classList.add("hidden");

  const eventId = regEventIdInput.value;
  const name = regNameInput.value.trim();
  const roll = regRollInput.value.trim();
  const email = regEmailInput.value.trim();
  const phone = regPhoneInput.value.trim();

  // Client-side validation checks
  let hasError = false;

  if (!name) {
    errorName.textContent = "Student name is required";
    errorName.classList.remove("hidden");
    hasError = true;
  } else {
    errorName.classList.add("hidden");
  }

  if (!roll) {
    errorRoll.textContent = "Roll number is required";
    errorRoll.classList.remove("hidden");
    hasError = true;
  } else {
    errorRoll.classList.add("hidden");
  }

  if (!email) {
    errorEmail.textContent = "Email is required";
    errorEmail.classList.remove("hidden");
    hasError = true;
  } else if (!email.includes("@")) {
    errorEmail.textContent = "Please enter a valid email containing '@'";
    errorEmail.classList.remove("hidden");
    hasError = true;
  } else {
    errorEmail.classList.add("hidden");
  }

  if (hasError) return;

  // Submit to Server
  submitRegBtn.disabled = true;
  submitRegBtn.textContent = "Submitting...";

  try {
    const payload = {
      student_name: name,
      roll_number: roll,
      email: email,
      phone: phone || null,
    };

    const response = await fetch(`/api/events/${eventId}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.status === 201) {
      // Success
      modalAlertSuccessText.textContent = `🎉 Registered successfully! Confirmation ID #${data.id} created for ${data.student_name}.`;
      modalAlertSuccess.classList.remove("hidden");
      submitRegBtn.textContent = "Registered!";

      // Re-fetch event list so seat count updates on grid
      await fetchEvents();

      // Also refresh modal's seat count
      const updatedEventRes = await fetch(`/api/events/${eventId}`);
      if (updatedEventRes.ok) {
        const updatedEvent = await updatedEventRes.json();
        const feeText = updatedEvent.fee === 0 ? "Free" : `₹${updatedEvent.fee}`;
        modalFeeSeats.textContent = `${feeText} • ${updatedEvent.available_seats} / ${updatedEvent.capacity} seats left`;
      }

      // Automatically close modal after 2 seconds
      setTimeout(() => {
        closeModal();
      }, 2000);
    } else {
      // Server returned 400 or 409 or other error
      // Render the exact server error message
      const errorMsg = data && data.detail ? data.detail : `Error ${response.status}: Failed to register`;
      modalAlertErrorText.textContent = errorMsg;
      modalAlertError.classList.remove("hidden");
      submitRegBtn.disabled = false;
      submitRegBtn.textContent = "Confirm Registration";
    }
  } catch (err) {
    modalAlertErrorText.textContent = "Network error: Unable to contact the registration server.";
    modalAlertError.classList.remove("hidden");
    submitRegBtn.disabled = false;
    submitRegBtn.textContent = "Confirm Registration";
  }
});

// Modal Event Listeners
closeModalBtn.addEventListener("click", closeModal);
cancelRegBtn.addEventListener("click", closeModal);
eventModal.addEventListener("click", (e) => {
  if (e.target === eventModal) closeModal();
});

// Category Filter Click Handling
categoryFilters.addEventListener("click", (e) => {
  const btn = e.target.closest("button.filter-btn");
  if (!btn) return;

  const category = btn.getAttribute("data-category");
  currentCategory = category;

  // Update button active styling
  document.querySelectorAll("button.filter-btn").forEach((b) => {
    b.className =
      "filter-btn px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700";
  });
  btn.className =
    "filter-btn active-filter px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all bg-purple-600 text-white shadow-md shadow-purple-600/30";

  fetchEvents();
});

// Search Input Debounce
searchInput.addEventListener("input", (e) => {
  const val = e.target.value;
  currentSearch = val;

  if (val.trim()) {
    clearSearchBtn.classList.remove("hidden");
  } else {
    clearSearchBtn.classList.add("hidden");
  }

  clearTimeout(searchDebounceTimeout);
  searchDebounceTimeout = setTimeout(() => {
    fetchEvents();
  }, 300);
});

// Clear Search Button
clearSearchBtn.addEventListener("click", () => {
  searchInput.value = "";
  currentSearch = "";
  clearSearchBtn.classList.add("hidden");
  fetchEvents();
});

// Reset Filters Handlers
resetFiltersBtn.addEventListener("click", resetAllFilters);
emptyResetBtn.addEventListener("click", resetAllFilters);
retryBtn.addEventListener("click", fetchEvents);

function resetAllFilters() {
  currentCategory = "All";
  currentSearch = "";
  searchInput.value = "";
  clearSearchBtn.classList.add("hidden");

  document.querySelectorAll("button.filter-btn").forEach((b) => {
    if (b.getAttribute("data-category") === "All") {
      b.className =
        "filter-btn active-filter px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all bg-purple-600 text-white shadow-md shadow-purple-600/30";
    } else {
      b.className =
        "filter-btn px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700";
    }
  });

  fetchEvents();
}

function updateFilterStatusBanner() {
  const isFiltering = (currentCategory && currentCategory !== "All") || (currentSearch && currentSearch.trim() !== "");
  if (isFiltering) {
    filterStatus.classList.remove("hidden");
    let msg = "Filtering by ";
    if (currentCategory !== "All") msg += `category "${currentCategory}" `;
    if (currentSearch.trim()) msg += `search "${currentSearch.trim()}"`;
    filterStatusText.textContent = msg;
  } else {
    filterStatus.classList.add("hidden");
  }
}

// Helpers for loading, error, empty
function showLoading(show) {
  if (show) {
    loadingState.classList.remove("hidden");
  } else {
    loadingState.classList.add("hidden");
  }
}

function showError(msg) {
  errorMessage.textContent = msg;
  errorState.classList.remove("hidden");
}

function hideError() {
  errorState.classList.add("hidden");
}

function showEmpty() {
  emptyState.classList.remove("hidden");
}

function hideEmpty() {
  emptyState.classList.add("hidden");
}

// Global expose for onclick
window.openEventDetail = openEventDetail;

// Initial load
document.addEventListener("DOMContentLoaded", () => {
  fetchEvents();
});
