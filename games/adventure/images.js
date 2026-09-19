// Generated illustrations only, including during loading and network failures.
(function () {
  "use strict";
  function show(container, src, className) {
    const frame = document.createElement("span");
    frame.className = "illustration";
    const status = document.createElement("span");
    status.className = "image-status";
    status.setAttribute("role", "status");
    status.textContent = "Loading picture…";
    frame.appendChild(status);
    container.replaceChildren(frame);
    const picture = new Image();
    picture.className = className;
    picture.alt = "";
    picture.onload = () => frame.replaceChildren(picture);
    picture.onerror = () => {
      // Keep the story usable offline. Never substitute unrelated artwork.
      if (className === "cover-img") {
        status.textContent = "Open story";
        return;
      }
      status.textContent = "Picture couldn’t load. Tap here to try again.";
      status.setAttribute("role", "button");
      status.tabIndex = 0;
      const retry = event => {
        event.stopPropagation();
        if (container.firstChild === frame) show(container, src, className);
      };
      status.onclick = retry;
      status.onkeydown = event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          retry(event);
        }
      };
    };
    // A late response only changes its detached frame, never the current page.
    if (src) picture.src = src;
    else picture.onerror();
  }
  window.AdventureImages = { show };
})();
