
document.addEventListener("DOMContentLoaded", () => {
  const lastChild = localStorage.getItem("lastChild");
  if (lastChild) {
    openChild(lastChild);
    showScreen("child");
  } else {
    showScreen("home");
  }

  // ✅ charge les pastilles au démarrage
  loadBadges();
});

function showScreen(name) {
  const home = document.getElementById("homeScreen");
  const child = document.getElementById("childScreen");

  if (home) home.style.display = (name === "home" ? "block" : "none");
  if (child) child.style.display = (name === "child" ? "block" : "none");
}

function openChild(childNameOrId) {
  const title = document.getElementById("childTitle");
  if (title) title.textContent = childNameOrId;
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/semaine-famille/sw.js");
}

