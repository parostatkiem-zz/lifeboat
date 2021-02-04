console.log("Lifeboat extension loaded");
const AVAILABLE_COLORS = ["#ffed66", "#e07a5f", "#8d80ad", "#81b29a", "#f2cc8f"];

async function init() {
  const cards = document.querySelectorAll("article");
  console.log("Cards found initially:", cards.length);
  cards.forEach(processCard);
}

async function processCard(card) {
  const lifeboatMarkdown = card.querySelector("pre[lang='lifeboat']");
  const cardConfig = lifeboatMarkdown ? parseMarkdown(lifeboatMarkdown) : null;
  if (cardConfig?.color) applyColorToCard(card, cardConfig.color);
  addUItoCard(card, cardConfig);
}

function watchForColumnsChange() {
  var config = { childList: true, subtree: true };
  var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (mutation.addedNodes?.length) {
        let addedCards = [];
        mutation.addedNodes.forEach((n) => n.tagName === "ARTICLE" && addedCards.push(n)); // there's no Array.filter

        if (addedCards.length) {
          console.log("Card changes detected");
          addedCards.forEach(processCard);
        }
      }
    });
  });
  document.body.querySelectorAll(".js-project-column-cards").forEach((col) => {
    observer.observe(col, config);
  });
}

(function main() {
  setTimeout(init, 1000);
  setTimeout(watchForColumnsChange, 1000);
})();

function parseMarkdown(markdownNode) {
  return JSON.parse(markdownNode.textContent);
}

function applyColorToCard(cardNode, color) {
  cardNode.style.backgroundColor = color;
}

function addUItoCard(cardNode, cardConfig) {
  const container = cardNode.querySelector(".d-flex .pl-5");
  generateColorsEditor(container, cardNode, cardConfig);
}

function generateColorButtons(cardElement, cardConfig) {
  const colorButtonsCollection = document.createDocumentFragment();

  AVAILABLE_COLORS.forEach((color) => {
    const thumb = document.createElement("li");
    thumb.style.backgroundColor = color;
    thumb.onclick = (_) => {
      const cardId = cardElement.getAttribute("data-card-id");

      const a = cardElement.querySelector("details-menu button[data-dialog-id*='edit-note']");
      async function listenForChanges(e) {
        if (e.relatedNode.tagName === "DETAILS-DIALOG") {
          document.removeEventListener("DOMNodeInserted", listenForChanges, false);

          const editNoteForm = e.relatedNode.querySelector(`form[data-card-id='${cardId}' `);
          if (!editNoteForm) return;

          const editNoteTextbox = editNoteForm.querySelector("textarea#card_note_text");
          editNoteTextbox.value = injectMarkdown(editNoteTextbox.value, { ...cardConfig, color });
          editNoteForm.querySelector('button[type="submit"]').click();
          setTimeout(() => document.body.classList.remove("hide-dialog"), 700); //TODO: improve
        }
      }
      document.addEventListener("DOMNodeInserted", listenForChanges);
      a.click();
    };
    colorButtonsCollection.appendChild(thumb);
  });

  return colorButtonsCollection;
}

function generateColorsEditor(container, cardElement, cardConfig) {
  const editorContainer = document.createElement("div");
  editorContainer.classList.add("position-absolute");
  editorContainer.classList.add("lifeboat--color-selector");

  const list = document.createElement("ul");
  list.onclick = list.classList.remove("open");

  const icon = document.createElement("img");
  icon.alt = "color";
  icon.src = chrome.runtime.getURL("img/color_selector.svg");

  const button = document.createElement("button");
  button.onclick = (_) => {
    if (list.classList.contains("open")) {
      document.body.classList.remove("hide-dialog");
      list.classList.toggle("open");
    } else {
      document.body.classList.add("hide-dialog");
      list.classList.add("open");
    }
  };

  list.appendChild(generateColorButtons(cardElement, cardConfig));
  button.appendChild(icon);
  editorContainer.appendChild(button);
  editorContainer.appendChild(list);
  container.appendChild(editorContainer);
}

function injectMarkdown(currentText, newCardConfig) {
  let newText = currentText.replace(/```lifeboat(.*?)```/gis, ""); //remove old markdown

  if (Object.keys(newCardConfig).length) {
    newText += `${newText.endsWith("\n") ? "" : "\n"}\`\`\`lifeboat
${JSON.stringify(newCardConfig)}
\`\`\``;
  }
  return newText;
}
