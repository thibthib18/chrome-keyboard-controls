console.log("Content script loaded");

chrome.runtime.onMessage.addListener(
  async (message, sender: chrome.runtime.MessageSender) => {
    if (message.type === "open-group-selector") {
      openGroupSelector();
    }
  }
);

async function openGroupSelector() {
  // Create an iframe to host the dialog
  const groupSelectorContainer = document.createElement("div");
  // groupSelectorFrame.src = chrome.runtime.getURL("pages/group_selector.html");
  groupSelectorContainer.innerHTML = `
              <html>
                <head>
                  <style>
                    /* Style the dialog */
                    #dialog {
                      position: absolute;
                      top: 50%;
                      left: 50%;
                      transform: translate(-50%, -50%);
                      width: 400px;
                      height: 400px;
                      padding: 20px;
                      border: 1px solid #ccc;
                      background-color: #fff;
                    }

                    /* Style the text input */
                    #text-input {
                      width: 100%;
                      height: 50px;
                      font-size: 20px;
                      padding: 10px;
                      box-sizing: border-box;
                    }
                  </style>
                </head>
                <body>
                  <div id="dialog">
                    <input id="text-input" type="text"/>
                    <ul id="group-list"></ul>
                  </div>
                </body>
              </html>`;
  groupSelectorContainer.id = "group-selector-container";

  // Append the iframe to the page
  document.body.appendChild(groupSelectorContainer);

  const tabGroups = (await chrome.runtime.sendMessage({
    command: "getGroups",
  })) as chrome.tabGroups.TabGroup[];
  console.log("received tabGroups", tabGroups);
  const list = document.getElementById("group-list") as HTMLUListElement;
  if (!list) {
    alert("Could not find group list element");
    return;
  }

  // Add groups to the list
  function setGroupList(tabGroups: chrome.tabGroups.TabGroup[]) {
    list.innerHTML = "";
    tabGroups.forEach((group) => {
      const listItem = document.createElement("li");
      listItem.innerText = group.title || "Untitled";
      listItem.setAttribute(
        "style",
        `background-color: ${group.color}; border-radius: 5px;`
      );
      list.appendChild(listItem);
    });
  }
  setGroupList(tabGroups);

  function onKeyUp(event: KeyboardEvent) {
    console.log("Content script key: ", event.key);

    // Get the text from the text input
    const textInput = document.getElementById("text-input") as HTMLInputElement;
    const text = textInput.value;
    console.log("Text input value: ", text);

    const filteredGroups = tabGroups.filter((group) => {
      return (group.title || "Untitled")
        .toLowerCase()
        .includes(text.toLowerCase());
    });
    setGroupList(filteredGroups);

    if (event.key === "Escape") {
      console.log("Escape pressed");
      const container = document.getElementById("group-selector-container");
      document.removeEventListener("keyup", onKeyUp);
      container?.remove();
      return;
    }
    // If the Enter key was pressed
    if (event.key === "Enter") {
      // Open a new tab with the text as the URL
      console.log("Adding tab to group: " + text);
    }
  }

  document.addEventListener("keyup", onKeyUp);
}
