chrome.runtime.onMessage.addListener(
  async (message, sender: chrome.runtime.MessageSender) => {
    if (message.type === "moveToGroup") {
      openGroupSelector(moveToGroup);
    }
    if (message.type === "addTabToGroup") {
      openGroupSelector(moveTabToGroup);
    }
  }
);

interface OnGroupSelectedCallback {
  (filteredGroups: chrome.tabGroups.TabGroup[], selectedGroupIndex: number, inputText: string): void;
}


function moveToGroup(filteredGroups: chrome.tabGroups.TabGroup[], selectedGroupIndex: number, inputText: string) {
  if (filteredGroups.length === 0) {
    return;
  }
  const selectedGroup = filteredGroups[selectedGroupIndex];
  chrome.runtime.sendMessage({
    command: "moveToGroup",
    groupId: selectedGroup.id,
  });
}

function moveTabToGroup(filteredGroups: chrome.tabGroups.TabGroup[], selectedGroupIndex: number, inputText: string) {
  if (filteredGroups.length === 0) {
    chrome.runtime.sendMessage({
      command: "addTabToNewGroup",
      title: inputText,
    });
    return;
  }
  const selectedGroup = filteredGroups[selectedGroupIndex];
  chrome.runtime.sendMessage({
    command: "addTabToGroup",
    groupId: selectedGroup.id,
  });
}

async function openGroupSelector(onGroupSelected: OnGroupSelectedCallback) {
  // Create an iframe to host the dialog
  const groupSelectorContainer = document.createElement("div");
  // groupSelectorFrame.src = chrome.runtime.getURL("pages/group_selector.html");
  groupSelectorContainer.innerHTML = `
              <html>
                <head>
                  <style>
                    /* Style the dialog */
                    #group-list {
                      list-style-type: none;
                      padding-inline-start: 0;
                    }

                    #group-list li {
                      margin: 4px;
                      padding: 4px;
                      padding-left: 8px;
                    }

                    #dialog {
                      position: absolute;
                      top: 50%;
                      left: 50%;
                      transform: translate(-50%, -50%);
                      width: 400px;
                      padding: 20px;
                      border: 1px solid black;
                      box-shadow: 0 0 4px 0 black;
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
  const list = document.getElementById("group-list") as HTMLUListElement;
  if (!list) {
    alert("Could not find group list element");
    return;
  }

  let selectedGroupIndex = 0;
  // Add groups to the list
  function setGroupList(tabGroups: chrome.tabGroups.TabGroup[]) {
    list.innerHTML = "";
    tabGroups.forEach((group, index) => {
      const listItem = document.createElement("li");
      listItem.innerText = group.title || "Untitled";
      listItem.style.backgroundColor = group.color;
      listItem.style.borderRadius = "4px";
      listItem.style.opacity = selectedGroupIndex === index ? "0.8" : "1";
      list.appendChild(listItem);
    });
  }
  setGroupList(tabGroups);

  document.getElementById("text-input")?.focus();

  function onClose() {
    const container = document.getElementById("group-selector-container");
    document.removeEventListener("keyup", onKeyUp);
    container?.remove();
  }

  async function onKeyUp(event: KeyboardEvent) {
    // Get the text from the text input
    const textInput = document.getElementById("text-input") as HTMLInputElement;
    const text = textInput.value;

    const filteredGroups = tabGroups.filter((group) => {
      return (group.title || "Untitled")
        .toLowerCase()
        .includes(text.toLowerCase());
    });

    if (event.key === "Escape") {
      onClose();
      return;
    } else if (event.key === "Enter") {
      onGroupSelected(filteredGroups, selectedGroupIndex, text);
      onClose();
    } else if (event.key === "ArrowDown") {
      selectedGroupIndex = (selectedGroupIndex + 1) % filteredGroups.length;
    } else if (event.key === "ArrowUp") {
      selectedGroupIndex = (selectedGroupIndex - 1) % filteredGroups.length;
    } else {
      selectedGroupIndex = 0;
    }

    setGroupList(filteredGroups);
  }

  document.addEventListener("keyup", onKeyUp);
}
