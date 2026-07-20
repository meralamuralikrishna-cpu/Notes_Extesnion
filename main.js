const notesList = document.getElementById("notes-list");
const emptyState = document.getElementById("empty-state");
const countEl = document.getElementById("note-count");
const form = document.getElementById("note-form");
const statusMessage = document.getElementById("status-message");
let notes = [];

function setStatus(message, isError) {
  statusMessage.textContent = message;
  statusMessage.className =
    "mt-3 min-h-[20px] text-sm font-medium " +
    (isError ? "text-[#b6473f]" : "text-[#4d8069]");
  setTimeout(() => {
    statusMessage.textContent = "";
  }, 3000);
}

function formatDate(iso) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function loadNotes() {
  // Use Chrome storage API if available
  if (chrome && chrome.storage) {
    chrome.storage.local.get(["quick_notes"], (result) => {
      try {
        notes = result.quick_notes || [];
      } catch (error) {
        console.error("Failed to load notes:", error);
        setStatus("⚠️ Could not load saved notes. Using fresh start.", true);
        notes = [];
      }
      renderNotes();
    });
  } else {
    // Fallback to localStorage for non-extension environments
    try {
      const saved = localStorage.getItem("quick_notes");
      notes = saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error("Failed to load notes:", error);
      setStatus("⚠️ Could not load saved notes. Using fresh start.", true);
      notes = [];
    }
    renderNotes();
  }
}

function saveNotesToStorage() {
  try {
    if (chrome && chrome.storage) {
      // Use Chrome storage API
      chrome.storage.local.set({ quick_notes: notes }, () => {
        if (chrome.runtime.lastError) {
          setStatus("❌ Failed to save note.", true);
          console.error("Chrome storage error:", chrome.runtime.lastError);
        } else {
          renderNotes();
        }
      });
    } else {
      // Fallback to localStorage
      localStorage.setItem("quick_notes", JSON.stringify(notes));
      renderNotes();
    }
  } catch (error) {
    if (error.name === "QuotaExceededError") {
      setStatus("❌ Storage full. Please delete some notes.", true);
      console.error("Storage quota exceeded");
    } else {
      setStatus("❌ Failed to save note.", true);
      console.error("Failed to save notes:", error);
    }
  }
}

function createCard(note) {
  const fragment = document.getElementById("note-template").content.cloneNode(true);
  const card = fragment.querySelector("article");

  card.style.setProperty("--note-color", note.color || "#e9a63b");
  card.querySelector('[data-role="title"]').textContent = note.title;
  card.querySelector('[data-role="content"]').textContent = note.content;
  card.querySelector('[data-role="date"]').textContent = formatDate(note.created_at);

  const deleteBtn = card.querySelector(".delete-note");
  const confirmation = card.querySelector(".delete-confirmation");

  function showConfirmation() {
    deleteBtn.classList.add("hidden");
    confirmation.classList.remove("hidden");
    confirmation.classList.add("flex");
  }

  function hideConfirmation() {
    deleteBtn.classList.remove("hidden");
    confirmation.classList.add("hidden");
    confirmation.classList.remove("flex");
  }

  deleteBtn.addEventListener("click", showConfirmation);

  card.querySelector(".cancel-delete").addEventListener("click", hideConfirmation);

  card.querySelector(".confirm-delete").addEventListener("click", () => {
    notes = notes.filter((n) => n.id !== note.id);
    saveNotesToStorage();
    setStatus("Note deleted.", false);
  });

  // ESC key closes confirmation dialog
  card.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !confirmation.classList.contains("hidden")) {
      hideConfirmation();
    }
  });

  return card;
}

function renderNotes() {
  notesList.innerHTML = "";
  notes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  notes.forEach((note) => {
    notesList.appendChild(createCard(note));
  });

  emptyState.classList.toggle("hidden", notes.length > 0);
  countEl.textContent = String(notes.length);
  
  // Initialize Lucide icons once after DOM update
  if (window.lucide) {
    lucide.createIcons();
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = document.getElementById("note-title").value.trim();
  const content = document.getElementById("note-content").value.trim();
  const colorSelect = document.getElementById("note-color");

  // Validation with user feedback
  if (!title) {
    setStatus("❌ Title cannot be empty.", true);
    document.getElementById("note-title").focus();
    return;
  }

  if (!content) {
    setStatus("❌ Note content cannot be empty.", true);
    document.getElementById("note-content").focus();
    return;
  }

  if (title.length > 80) {
    setStatus("❌ Title is too long (max 80 characters).", true);
    return;
  }

  if (content.length > 800) {
    setStatus("❌ Note is too long (max 800 characters).", true);
    return;
  }

  const newNote = {
    id: Date.now().toString(),
    title,
    content,
    color: colorSelect.value,
    created_at: new Date().toISOString(),
  };

  notes.push(newNote);
  saveNotesToStorage();
  form.reset();
  setStatus("✓ Note saved successfully!", false);
  document.getElementById("note-title").focus();
});

// Character counters for real-time feedback
const titleInput = document.getElementById("note-title");
const contentInput = document.getElementById("note-content");
const titleCount = document.getElementById("title-count");
const contentCount = document.getElementById("content-count");

titleInput.addEventListener("input", () => {
  titleCount.textContent = titleInput.value.length;
});

contentInput.addEventListener("input", () => {
  contentCount.textContent = contentInput.value.length;
});

document.addEventListener("DOMContentLoaded", () => {
  // Initialize Lucide icons once on page load
  if (window.lucide) {
    lucide.createIcons();
  }
  loadNotes();
});