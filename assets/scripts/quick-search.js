// @TODO
// Display search results at top, i.e. "3 apps, 2 designers, 1 developer"
// Max result set?

import { createEl, debounce } from "./shared/utils.js";
const MAX_RESULTS = 20;

let state = {
  value: "",
  data: [],
  dataLoadState: "preload", // one of: preload, loading, loaded, loadError
};
const setState = (newState) => {
  state = {
    ...state,
    ...newState,
  };

  // Update outside of our render root if necessary
  if (newState.hasOwnProperty("value")) {
    $input.value = newState.value;
  }
  $renderRoot.innerHTML = render(state);
};

// Cache selectors
const $el = document.querySelector(".quick-search");
const $searchModal = $el.querySelector(".quick-search__modal");
const $searchBtns = document.querySelectorAll("a[href*='google.com']");
const $input = $el.querySelector("input");
const $renderRoot = $el.querySelector(".quick-search__modal__outputs");
const $cancelButton = $el.querySelector("#js-cancel");
const $clearButton = $el.querySelector("#js-clear");

// We used to do this inline, but for now we do it here
$renderRoot.innerHTML = render(state);

// Shared actions
const showModal = () => {
  document.documentElement.classList.add("open-modal");
  $searchModal.removeAttribute("hidden");
};
const hideModal = () => {
  document.documentElement.classList.remove("open-modal");
  $searchModal.setAttribute("hidden", true);
  // setState({ value: "" });
};

// Add listeners

// Stop anything in the list from propagating up. This keeps the modal
// from closing before the page changes due to an <a> click
$renderRoot.addEventListener("click", (e) => {
  e.stopPropagation();
});

// Hides keyboard on mobile when you scroll results
$searchModal.addEventListener(
  "touchmove",
  () => {
    $input.blur();
  },
  // Supposed to help performance
  // https://developers.google.com/web/tools/lighthouse/audits/passive-event-listeners
  { passive: true }
);
[...$searchBtns].forEach(($el) => {
  $el.addEventListener("click", (e) => {
    e.preventDefault();
    showModal();
    $input.focus();
  });
});
$clearButton.addEventListener("click", (e) => {
  e.stopPropagation();
  setState({ value: "" });
  $input.focus();
});
$cancelButton.addEventListener("click", (e) => {
  e.preventDefault();
  setState({ value: "" });
  hideModal();
});
$searchModal.addEventListener("click", (e) => {
  e.stopPropagation();
  setState({ value: "" });
  hideModal();
});
$input.addEventListener("click", (e) => {
  e.stopPropagation();
});
$input.addEventListener("focus", (e) => {
  if (state.data.length === 0) {
    fetch("/quick-search-data.json")
      .then((res) => {
        if (res.ok) {
          return res.json();
        } else {
          throw new Error("Failed to fetch quick search JSON");
        }
      })
      .then((json) => {
        setState({ data: json, dataLoadState: "loaded" });
      })
      .catch((e) => {
        console.log("Failed to load search data.", e);
        setState({ dataLoadState: "loaderror" });
      });
  }
});
$input.addEventListener(
  "input",
  debounce((e) => {
    setState({ value: e.target.value });
  }, 500)
);

// Append to DOM
// document.querySelector(".header").appendChild($el);

/**
 * Primary render function which will re-render the output anytime an input
 * is changed.
 */
function render(state) {
  const { data, dataLoadState, value } = state;
  const query = value.toLowerCase();

  // Side effect: Update the clear button
  if (value === "") {
    $clearButton.setAttribute("hidden", true);
  } else {
    $clearButton.removeAttribute("hidden");
  }

  // If there's an error in loading the data, don't even bother with anything
  if (dataLoadState === "loaderror") {
    return `
      <div class="qs-outputs__message qs-outputs__message--has-error">
        <svg class="svgcon svgcon-error">
          <use xlink:href="#error" />
        </svg>
        <p>Something went wrong trying to load the search data. You can try <a href=".">reloading the page</a>.</p>
      </div>
    `;
  }

  // If there's no value in the input yet, always render our blank state
  if (value.length < 2) {
    return `
      <div class="qs-outputs__message">
        <svg class="svgcon svgcon-search">
          <use xlink:href="#search" />
        </svg>
        <p>
          Search for apps, app developers, or icon designers. Or try 
          <a href="/icons/">browsing all icons</a>.
        </p>
      </div>
    `;
  }

  // If the data is still loading, show a loader
  if (dataLoadState === "loading") {
    return `
      <div class="qs-outputs__message">
        <img src="/assets/images/loading.gif" alt="Loading..." width="32" height="32" />
      </div>
    `;
  }

  // Results for searchign for apps (just an array of icons)
  const appResults = data.filter((item) =>
    item.name.toLowerCase().includes(query)
  );

  // Generic reduce function for generating result. Array of icons for each
  // result by key, i.e. for "designers":
  // {
  //   apps: [{...}, {...}]
  //   designers: {
  //     "michael-flarup": [{...}, {...}] ,
  //     "iconfactory": [{...}]
  //   }
  //   developers: {
  //     "metalab": [{...}]
  //   }
  // }
  const results = data.reduce(
    (acc, icon) => {
      // Apps
      if (icon.name.toLowerCase().includes(query)) {
        acc.apps.push(icon);
      }
      // Designers
      if (icon.designer && icon.designer.toLowerCase().includes(query)) {
        if (acc.designerIconsById[icon.designerId]) {
          acc.designerIconsById[icon.designerId].push(icon);
        } else {
          acc.designerIconsById[icon.designerId] = [icon];
        }
      }
      // Developers
      if (icon.developer && icon.developer.toLowerCase().includes(query)) {
        if (acc.developerIconsById[icon.developerId]) {
          acc.developerIconsById[icon.developerId].push(icon);
        } else {
          acc.developerIconsById[icon.developerId] = [icon];
        }
      }

      return acc;
    },
    { apps: [], designerIconsById: {}, developerIconsById: {} }
  );

  const appResultsMarkup = renderResultSet({
    resultSetTitle: "Apps",
    resultSetCount: results.apps.length,
    resultSetFn: () =>
      results.apps.map((icon) =>
        renderResultSetList({
          linkAttrHref: `/icons/${icon.id}/`,
          linkAttrTitle: icon.name,
          linkTextPrimary: icon.name,
          linkTextSecondary: icon.dateDisplay,
          icons: [icon],
        })
      ),
  });
  const designerResultsMarkup = renderResultSet({
    resultSetTitle: "Designers",
    resultSetCount: Object.keys(results.designerIconsById).length,
    resultSetFn: () =>
      Object.keys(results.designerIconsById).map((id) => {
        const designer = results.designerIconsById[id][0].designer;
        const iconsCount = results.designerIconsById[id].length;
        return renderResultSetList({
          linkAttrHref: `/designers/${id}/`,
          linkAttrTitle: designer,
          linkTextPrimary: designer,
          linkTextSecondary: `${iconsCount} icon${iconsCount !== 1 ? "s" : ""}`,
          icons: results.designerIconsById[id],
          iconsDisplayMultiple: true,
        });
      }),
  });
  const developerResultsMarkup = renderResultSet({
    resultSetTitle: "Developers",
    resultSetCount: Object.keys(results.developerIconsById).length,
    resultSetFn: () =>
      Object.keys(results.developerIconsById).map((id) => {
        const developer = results.developerIconsById[id][0].developer;
        const iconsCount = results.developerIconsById[id].length;
        return renderResultSetList({
          linkAttrHref: `/developers/${id}/`,
          linkAttrTitle: developer,
          linkTextPrimary: developer,
          linkTextSecondary: `${iconsCount} icon${iconsCount !== 1 ? "s" : ""}`,
          icons: results.developerIconsById[id],
          iconsDisplayMultiple: true,
        });
      }),
  });

  const resultsMarkup =
    appResultsMarkup + designerResultsMarkup + developerResultsMarkup;

  // If there's no markup, no results were found so show that
  if (!resultsMarkup) {
    return `
      <p class="qs-outputs__message">
        No results. <br />
        Try <a href="/search/">browsing all icons</a>.
      </p>
    `;
  }

  // Render the results
  return `
    <div class="qs-outputs__results">
      ${resultsMarkup}
    </div>
  `;
}

/**
 * A shared function for rendering a result set,
 * i.e. a set of apps, developers, or designers
 */
function renderResultSet({ resultSetTitle, resultSetCount, resultSetFn }) {
  if (resultSetCount === 0) {
    return "";
  }

  // prettier-ignore
  return `
    <h4>
      <span>${resultSetTitle}</span>
      <span>
        ${resultSetCount} results
        ${resultSetCount > MAX_RESULTS ? `(showing ${MAX_RESULTS})` : ""}
      </span>
    </h4>  
    <ul>
      ${resultSetFn()
        .slice(0, MAX_RESULTS)
        .join("")}
    </ul>      
  `;
}

/**
 * A shared function for rendering the list of a result set,
 */
function renderResultSetList({
  linkAttrHref,
  linkAttrTitle,
  linkTextPrimary,
  linkTextSecondary,
  icons,
  iconsDisplayMultiple,
}) {
  const iconContainerClasses = [
    "qs-outputs__results__icon",
    iconsDisplayMultiple ? "qs-outputs__results__icon--has-multiple" : "",
  ].join(" ");

  return `
    <li>
      <a href="${linkAttrHref}" title="${linkAttrTitle}">
        <div class="${iconContainerClasses}">
          ${icons
            .map((icon, i) =>
              i < 4
                ? `<span
                    class="icon-wrapper"
                    data-date="${icon.date}">
                      <img
                        alt="${icon.name}"
                        class="icon"
                        src="${icon.src}"
                      />
                    </span>
                  `
                : ""
            )
            .join("")}
        </div>
        <div class="qs-outputs__results__text">
          <h5>
            ${linkTextPrimary}
          </h5>
          <h6>
            ${linkTextSecondary}
          </h6>
        </div>
      </a>
    </li>
  `;
}
