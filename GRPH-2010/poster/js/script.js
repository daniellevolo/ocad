"use strict";

// References:
// https://developer.mozilla.org/docs/Web/API/Document/querySelector
// https://developer.mozilla.org/en-US/docs/Web/API/Element/classList
// https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
// https://developer.mozilla.org/docs/Web/API/Document_Object_Model/Events
// https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Locating_DOM_elements_using_selectors
// https://javascript.info/introduction-browser-events
// https://javascript.info/
// DaveOnEleven - JavaScript DOM Tutorial | Document Object Model in JavaScript
// https://youtu.be/WbG86sMd3SU
// Traversy Media - JavaScript Crash Course For Beginners
// https://youtu.be/hdI2bqOjy3c

// Get the Vanessa speaker button from the poster grid.
const vanessaTrigger = document.querySelector(".vanessa-trigger");
// Get the Kelsey speaker button from the poster grid.
const kelseyTrigger = document.querySelector(".kelsey-trigger");
// Get the Anna speaker button from the poster grid.
const annaTrigger = document.querySelector(".anna-trigger");

// Get Vanessa's popup panel by its id.
const vanessaOverlay = document.getElementById("vanessa-overlay");
// Get Kelsey's popup panel by its id.
const kelseyOverlay = document.getElementById("kelsey-overlay");
// Get Anna's popup panel by its id.
const annaOverlay = document.getElementById("anna-overlay");

// Get every close button that appears inside the popup panels.
const closeButtons = document.querySelectorAll(".overlay-close");

// Store each speaker button next to its matching popup.
const speakerButtonsAndPopups = [
  // Vanessa button to Vanessa popup mapping.
  { trigger: vanessaTrigger, overlay: vanessaOverlay, overlayId: "vanessa-overlay" },
  // Kelsey button to Kelsey popup mapping.
  { trigger: kelseyTrigger, overlay: kelseyOverlay, overlayId: "kelsey-overlay" },
  // Anna button to Anna popup mapping.
  { trigger: annaTrigger, overlay: annaOverlay, overlayId: "anna-overlay" },
];

// Update the body class based on whether any popup is currently open.
function updatePopupOverlayState() {
  // Track whether at least one popup is visible.
  let anyOpen = false;

  // Check every speaker/popup pair.
  for (const pair of speakerButtonsAndPopups) {
    // Skip entries that do not have a popup element in the DOM.
    if (!pair.overlay) {
      continue;
    }

    // If this popup is not hidden, the page is in an "overlay open" state.
    if (!pair.overlay.classList.contains("hidden")) {
      anyOpen = true;
      break;
    }
  }

  // Add or remove the body class that locks background scrolling.
  document.body.classList.toggle("overlay-open", anyOpen);
}

// Close one popup by id and remove the active state from its button.
function closePopupById(overlayId) {
  // Look through every speaker/popup mapping.
  for (const pair of speakerButtonsAndPopups) {
    // Skip pairs that do not match the requested id or do not have a popup element.
    if (pair.overlayId !== overlayId || !pair.overlay) {
      continue;
    }

    // Hide the matching popup.
    pair.overlay.classList.add("hidden");

    // If the matching trigger exists, remove its persistent active styling.
    if (pair.trigger) {
      pair.trigger.classList.remove("is-active");
    }

    // Stop once the requested popup has been handled.
    break;
  }

  // Recompute whether the page still has any popup open.
  updatePopupOverlayState();
}

// Close every popup except the one whose id should remain open.
function closeAllPopups(exceptId) {
  // Loop through all speaker/popup mappings.
  for (const pair of speakerButtonsAndPopups) {
    // Skip the popup that should stay open and skip missing popup elements.
    if (pair.overlayId === exceptId || !pair.overlay) {
      continue;
    }

    // Hide this popup.
    pair.overlay.classList.add("hidden");

    // Remove the active state from its trigger if the trigger exists.
    if (pair.trigger) {
      pair.trigger.classList.remove("is-active");
    }
  }

  // Refresh the body overlay state after closing the other popups.
  updatePopupOverlayState();
}

// Build the click handler used by each speaker button.
function createToggleOverlayHandler(pair) {
  // Return a function so each button keeps access to its own pair.
  return function () {
    // Stop early if either the popup or button is missing.
    if (!pair.overlay || !pair.trigger) {
      return;
    }

    // Check whether this popup is currently hidden and therefore about to open.
    const willOpen = pair.overlay.classList.contains("hidden");

    // If the popup is about to open, close any other open popup first.
    if (willOpen) {
      closeAllPopups(pair.overlayId);
      // Show the popup for this speaker.
      pair.overlay.classList.remove("hidden");
      // Keep the speaker button visually active while its popup is open.
      pair.trigger.classList.add("is-active");
      // Update the body state so page scrolling can be locked when needed.
      updatePopupOverlayState();
      return;
    }

    // If the popup is already open, close it instead.
    closePopupById(pair.overlayId);
  };
}

// Build the click handler for each popup close button.
function createCloseButtonHandler(button) {
  // Return a function so each close button keeps access to itself.
  return function () {
    // Find the popup that contains this close button.
    const overlay = button.closest(".speaker-overlay");
    // Stop if the button is not inside a valid popup.
    if (!overlay || !overlay.id) {
      return;
    }

    // Close the popup that owns this close button.
    closePopupById(overlay.id);
  };
}

// Attach a click handler to every speaker button/popup pair.
for (const pair of speakerButtonsAndPopups) {
  // Skip incomplete mappings where either side is missing.
  if (!pair.trigger || !pair.overlay) {
    continue;
  }

  // Clicking the speaker button toggles its popup.
  pair.trigger.addEventListener("click", createToggleOverlayHandler(pair));
}

// Attach a click handler to every popup close button.
for (const button of closeButtons) {
  // Clicking the close button closes its parent popup.
  button.addEventListener("click", createCloseButtonHandler(button));
}
