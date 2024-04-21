document.body.insertAdjacentHTML(
  "beforeend",
  /*html*/ `
  <dialog
      id="icon-dialog"
      onmousedown="event.target == this && this.close(-1)"
      onclose="this.returnValue==-1;"
    >
      <button arial-label="Close" onClick="this.parentElement.close()">
        <svg
          width="15"
          height="15"
          viewBox="0 0 15 15"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12.8536 2.85355C13.0488 2.65829 13.0488 2.34171 12.8536 2.14645C12.6583 1.95118 12.3417 1.95118 12.1464 2.14645L7.5 6.79289L2.85355 2.14645C2.65829 1.95118 2.34171 1.95118 2.14645 2.14645C1.95118 2.34171 1.95118 2.65829 2.14645 2.85355L6.79289 7.5L2.14645 12.1464C1.95118 12.3417 1.95118 12.6583 2.14645 12.8536C2.34171 13.0488 2.65829 13.0488 2.85355 12.8536L7.5 8.20711L12.1464 12.8536C12.3417 13.0488 12.6583 13.0488 12.8536 12.8536C13.0488 12.6583 13.0488 12.3417 12.8536 12.1464L8.20711 7.5L12.8536 2.85355Z"
            fill="currentColor"
            fill-rule="evenodd"
            clip-rule="evenodd"
          ></path>
        </svg>
      </button>

      <div id="icon-dialog-content"></div>
    </dialog>
`
);

const $dialog = document.querySelector("#icon-dialog");
const $dialogContent = $dialog.querySelector("#icon-dialog-content");
const $dialogHeader = $dialog.querySelector("header h1");

document.addEventListener("click", async (event) => {
  const $el = event.target.closest(".js-icon-dialog");
  if ($el) {
    if (event.metaKey || event.ctrlKey) return;
    event.preventDefault();
    const href = $el.getAttribute("href");

    fetch(href)
      .then((response) => response.text())
      .then((htmlStr) => {
        const $html = new DOMParser().parseFromString(htmlStr, "text/html");
        const $post = $html.querySelector(".post");
        $dialogContent.innerHTML = $post.outerHTML;

        // updateUrl({ href, title: $html.querySelector("title").textContent });

        //TODO: Show before fetch (with loader)
        $dialog.showModal();
      });
  }
});

/* =============================================================================
 * Update URL and title on navigation
 * ========================================================================== */

// const originalHref = window.location.pathname;
// const originalTitle = document.title;
// $dialog.addEventListener("close", () => {
//   updateUrl({ href: originalHref, title: originalTitle });
// });

// function updateUrl({ title, href }) {
//   history.replaceState({}, "", href);
//   document.title = title;
// }

/* =============================================================================
 * Swipe to close dialog
 * ========================================================================== */

let startPos = 0;
let startTime = 0;

// Start of the touch
$dialog.addEventListener(
  "touchstart",
  function (event) {
    startPos = event.touches[0].pageY; // Y-coordinate of the start
    startTime = new Date().getTime(); // Timestamp of the start
  },
  false
);

// End of the touch
$dialog.addEventListener(
  "touchend",
  function (event) {
    // Since touchend doesn't have pageY, we use changedTouches
    const endPos = event.changedTouches[0].pageY;
    const endTime = new Date().getTime(); // Timestamp of the end
    const distance = endPos - startPos; // Calculate the vertical distance
    const duration = endTime - startTime; // Calculate the duration of the drag

    // Define what you consider a "long" drag (e.g., 500 milliseconds and 150 pixels)
    if (distance > 300) {
      $dialog.close(-1);
      // alert(`fired: duration ${duration} distance ${distance}`);
    }
  },
  false
);
