"use strict";
(() => {
  const pages = [
    {
      title: "Who’s there?",
      text: "At bedtime, Princess Ellie carried her lantern through the castle. Beside the fern, a tall shadow wore a pointy crown. Ellie stopped. “Hello?” she whispered. The shadow was very quiet.",
      wonder: "Look closely. What does the shadow’s crown remind you of?",
      alt: "Princess Ellie holds a lantern and notices a tall crowned shadow beside a fern in the castle hallway."
    },
    {
      title: "A familiar wave",
      text: "Ellie put down her lantern and waved. The shadow waved too! She wiggled her fingers. So did the shadow. “You’re me!” Ellie laughed. Her body was blocking the lantern’s light and making a shadow on the wall.",
      wonder: "Can you wave just like Ellie and her shadow?",
      alt: "Ellie waves beside a lantern on the floor; her large shadow waves back on the castle wall."
    },
    {
      title: "Goodnight, little shadow",
      text: "Ellie held her hands in the light. Two fingers became long ears. A shadow bunny appeared on the wall! “Goodnight, bunny,” she whispered. The castle felt cozy again. Sometimes a little looking turns a mystery into a game.\n\nThe End.",
      wonder: "Try it together: with a grown-up and a flashlight, make a shadow with your hand.",
      alt: "Ellie sits on a cushion making a rabbit hand shadow in the warm light of her lantern."
    }
  ];
  let page = 0;
  const byId = id => document.getElementById(id);
  const illustration = byId("illustration");
  const previous = byId("previous");
  const next = byId("next");
  function render() {
    const current = pages[page];
    illustration.hidden = false;
    byId("image-error").hidden = true;
    illustration.src = `art/page-${page + 1}.png`;
    illustration.alt = current.alt;
    byId("page-count").textContent = `0${page + 1} / 03`;
    byId("page-title").textContent = current.title;
    byId("story-text").textContent = current.text;
    byId("wonder").textContent = current.wonder;
    previous.disabled = page === 0;
    next.textContent = page === pages.length - 1 ? "Read again ↻" : "Next page →";
    byId("question").hidden = page !== pages.length - 1;
    byId("answer-feedback").textContent = "";
    if (window.matchMedia("(max-width: 760px)").matches) {
      document.querySelector(".book").scrollIntoView({ block: "start", behavior: "instant" });
    }
  }
  illustration.addEventListener("error", () => {
    illustration.hidden = true;
    byId("image-error").hidden = false;
  });
  previous.addEventListener("click", () => { if (page > 0) { page--; render(); } });
  next.addEventListener("click", () => { page = (page + 1) % pages.length; render(); });
  document.addEventListener("keydown", event => {
    if (event.altKey || event.ctrlKey || event.metaKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
    if (event.key === "ArrowRight" && page < pages.length - 1) { event.preventDefault(); page++; render(); }
    if (event.key === "ArrowLeft" && page > 0) { event.preventDefault(); page--; render(); }
  });
  document.querySelectorAll("[data-correct]").forEach(button => {
    button.addEventListener("click", () => {
      byId("answer-feedback").textContent = button.dataset.correct === "true"
        ? "Yes! Ellie blocked the light. The dark shape on the wall was her shadow."
        : "Look again: the shadow waved when Ellie waved. Try the other answer!";
    });
  });
})();
