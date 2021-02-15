console.log("Lifeboat extension loaded");
const AVAILABLE_COLORS = [
  {
    name: "Light Pink",
    hex: "ffadad",
    rgb: [255, 173, 173],
  },
  {
    name: "Deep Champagne",
    hex: "ffd6a5",
    rgb: [255, 214, 165],
  },
  {
    name: "Lemon Yellow Crayola",
    hex: "fdffb6",
    rgb: [253, 255, 182],
  },
  {
    name: "Nyanza",
    hex: "ddffd6",
    rgb: [221, 255, 214],
  },
  {
    name: "Uranian Blue",
    hex: "c2e8ff",
    rgb: [194, 232, 255],
  },
  {
    name: "Pale Purple Pantone",
    hex: "ffebff",
    rgb: [255, 235, 255],
  },
];

function rgbArrayToString(rgbArr) {
  return `rgb(${rgbArr.join(",")})`;
}

async function init() {
  const cards = document.querySelectorAll("article");
  console.log("Cards found initially:", cards.length);
  cards.forEach(processCard);
  document.addEventListener("click", (_) => {
    document
      .querySelectorAll('.lifeboat--color-selector[aria-expanded="true"]')
      .forEach((selector) => selector.setAttribute("aria-expanded", false));
  });
}

async function processCard(card) {
  const lifeboatMarkdown = card.querySelector("pre[lang='lifeboat']");
  const cardConfig = lifeboatMarkdown ? parseMarkdown(lifeboatMarkdown) : null;

  if (cardConfig?.color) applyColorToCard(card, cardConfig.color);
  if (cardConfig?.emphasize) card.classList.add("lifeboat--emphasize");
  else card.classList.remove("lifeboat--emphasize");

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

async function saveConfigToCard(cardElement, newConfig) {
  document.body.classList.add("hide-dialog");
  const cardId = cardElement.getAttribute("data-card-id");
  const openDialogButton = cardElement.querySelector("details-menu button[data-dialog-id*='edit-note']");
  async function handleDetailsDialogAppeared(e) {
    if (e.relatedNode.tagName !== "DETAILS-DIALOG") return;
    document.removeEventListener("DOMNodeInserted", handleDetailsDialogAppeared, false);

    const editNoteForm = e.relatedNode.querySelector(`form[data-card-id='${cardId}' `);
    if (!editNoteForm) return;

    const editNoteTextbox = editNoteForm.querySelector("textarea#card_note_text");
    editNoteTextbox.value = injectMarkdown(editNoteTextbox.value, newConfig);
    editNoteForm.querySelector('button[type="submit"]').click();
    setTimeout(() => document.body.classList.remove("hide-dialog"), 700); //TODO: improve
  }
  document.addEventListener("DOMNodeInserted", handleDetailsDialogAppeared);
  openDialogButton.click();
}

function parseMarkdown(markdownNode) {
  return JSON.parse(markdownNode.textContent);
}

function applyColorToCard(cardNode, color) {
  if (cardNode.style.backgroundColor !== color) cardNode.style.backgroundColor = color;
}

function addUItoCard(cardNode, cardConfig) {
  const container = cardNode.querySelector(".d-flex .pl-5");
  generateColorsEditor(container, cardNode, cardConfig);
  generateEmphasizeButton(container, cardNode, cardConfig);
}

function generateColorButtons(cardElement, cardConfig) {
  const colorButtonsCollection = document.createDocumentFragment();

  const noColorButton = document.createElement("li", { className: "no-color" });
  noColorButton.classList.add("no-color");
  noColorButton.title = "Remove color";
  noColorButton.onclick = (_) => {
    const newConfig = { ...cardConfig };
    delete newConfig.color;
    saveConfigToCard(cardElement, newConfig);
  };
  colorButtonsCollection.appendChild(noColorButton);

  AVAILABLE_COLORS.forEach((color) => {
    const colorButton = document.createElement("li");
    colorButton.title = color.name;
    colorButton.style.backgroundColor = rgbArrayToString(color.rgb);
    colorButton.onclick = (_) =>
      saveConfigToCard(cardElement, { ...cardConfig, color: rgbArrayToString(color.rgb) });
    colorButtonsCollection.appendChild(colorButton);
  });

  return colorButtonsCollection;
}

function generateEmphasizeButton(container, cardElement, cardConfig) {
  const emphasizeButton = document.createElement("button");
  emphasizeButton.classList.add("position-absolute");
  emphasizeButton.classList.add("lifeboat--emphasize-button");
  emphasizeButton.title = "Toggle emphasizing of this card";
  emphasizeButton.onclick = (_) =>
    saveConfigToCard(cardElement, { ...cardConfig, emphasize: !cardConfig.emphasize });
  container.appendChild(emphasizeButton);
}

function generateColorsEditor(container, cardElement, cardConfig) {
  const editorContainer = document.createElement("div");
  editorContainer.classList.add("position-absolute");
  editorContainer.classList.add("lifeboat--color-selector");

  const list = document.createElement("ul");

  const button = document.createElement("button");
  button.onclick = (e) => {
    editorContainer.setAttribute("aria-expanded", true);
    e.stopPropagation();
  };

  list.appendChild(generateColorButtons(cardElement, cardConfig));
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
