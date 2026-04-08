const vanessaTrigger = $(".vanessa-trigger");
const kelseyTrigger = $(".kelsey-trigger");
const annaTrigger = $(".anna-trigger");

const vanessaOverlay = $("#vanessa-overlay");
const kelseyOverlay = $("#kelsey-overlay");
const annaOverlay = $("#anna-overlay");

const closeButtons = $(".overlay-close");

// keep each speaker button next to its matching popup
const speakerButtonsAndPopups = [
  { trigger: vanessaTrigger, overlay: vanessaOverlay, overlayId: "vanessa-overlay" },
  { trigger: kelseyTrigger, overlay: kelseyOverlay, overlayId: "kelsey-overlay" },
  { trigger: annaTrigger, overlay: annaOverlay, overlayId: "anna-overlay" },
];

// update the body class based on whether any popup is currently open
function updatePopupOverlayState() {
  let anyOpen = false;

  for (const pair of speakerButtonsAndPopups) {
    if (!pair.overlay.length) {
      continue;
    }

    if (!pair.overlay.hasClass("hidden")) {
      anyOpen = true;
      break;
    }
  }

  // add or remove the body class that locks background scrolling
  $("body").toggleClass("overlay-open", anyOpen);
}

function closePopupById(overlayId) {
  for (const pair of speakerButtonsAndPopups) {
    if (pair.overlayId !== overlayId || !pair.overlay.length) {
      continue;
    }

    pair.overlay.addClass("hidden");

    // if matching trigger exists, remove its persistent active styling
    if (pair.trigger.length) {
      pair.trigger.removeClass("is-active");
    }

    break;
  }

  updatePopupOverlayState();
}

function closeAllPopups(exceptId) {
  for (const pair of speakerButtonsAndPopups) {
    if (pair.overlayId === exceptId || !pair.overlay.length) {
      continue;
    }

    pair.overlay.addClass("hidden");

    // remove active state from its trigger if the trigger exists
    if (pair.trigger.length) {
      pair.trigger.removeClass("is-active");
    }
  }

  updatePopupOverlayState();
}

// click handler used by each speaker button
function createToggleOverlayHandler(pair) {
  return function () {
    if (!pair.overlay.length || !pair.trigger.length) {
      return;
    }

    const willOpen = pair.overlay.hasClass("hidden");

    if (willOpen) {
      closeAllPopups(pair.overlayId);
      pair.overlay.removeClass("hidden");
      pair.trigger.addClass("is-active");
      updatePopupOverlayState();
      return;
    }

    closePopupById(pair.overlayId);
  };
}

function createCloseButtonHandler(button) {
  return function () {
    const overlay = button.closest(".speaker-overlay");
    if (!overlay.length) {
      return;
    }

    closePopupById(overlay.attr("id"));
  };
}

// click handler to every speaker button/popup pair
for (const pair of speakerButtonsAndPopups) {
  if (!pair.trigger.length || !pair.overlay.length) {
    continue;
  }

  pair.trigger.on("click", createToggleOverlayHandler(pair));
}

// click handler to every popup close button
for (const button of closeButtons) {
  $(button).on("click", createCloseButtonHandler($(button)));
}
