async function getCurrentTab(): Promise<chrome.tabs.Tab> {
  const currentTab = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });
  return currentTab[0];
}

async function addTabToNewGroup(
  tabId: number,
  title: string,
  color?: chrome.tabGroups.ColorEnum
): Promise<chrome.tabGroups.TabGroup> {
  const options = { tabIds: [tabId] };
  const groupId = await chrome.tabs.group(options);
  const newGroup = await chrome.tabGroups.update(groupId, { color, title });
  return newGroup;
}

async function addTabToGroup(tabId: number, group: chrome.tabGroups.TabGroup) {
  await chrome.tabs.group({ groupId: group.id, tabIds: tabId });
}

async function toggleCollapsed(group: chrome.tabGroups.TabGroup) {
  await chrome.tabGroups.update(group.id, { collapsed: !group.collapsed });
}

async function getGroupFromId(
  groupId: number
): Promise<chrome.tabGroups.TabGroup | undefined> {
  const tabGroups = await chrome.tabGroups.query({});
  const tabGroup = tabGroups.find((group) => group.id === groupId);
  return tabGroup;
}

async function getCurrentTabGroup(): Promise<
  chrome.tabGroups.TabGroup | undefined
> {
  const currentTab = await getCurrentTab();
  const currentTabGroup = await getGroupFromId(currentTab.groupId);
  return currentTabGroup;
}

async function collapseAllGroups() {
  const tabGroups = await chrome.tabGroups.query({});
  await Promise.all(
    tabGroups.map(async (group) =>
      chrome.tabGroups.update(group.id, { collapsed: true })
    )
  );
}

async function goToGroupFirstTab(group: chrome.tabGroups.TabGroup) {
  const tabs = await chrome.tabs.query({ groupId: group.id });
  const firstTab = tabs[0];
  if (!firstTab.id) {
    return;
  }
  await chrome.tabs.update(firstTab.id, { active: true });
}

async function goToGroupLastTab(group: chrome.tabGroups.TabGroup) {
  const tabs = await chrome.tabs.query({ groupId: group.id });
  const lastTab = tabs[tabs.length - 1];
  if (!lastTab.id) {
    return;
  }
  await chrome.tabs.update(lastTab.id, { active: true });
}

async function moveTab(tab: chrome.tabs.Tab, direction: number) {
  const tabs = await chrome.tabs.query({});
  const tabPosition = tabs.findIndex((t) => t.id === tab.id);
  if (tabPosition === -1) {
    console.log("Tab not found");
    return;
  }
  const nextTab = tabs[(tabPosition + direction) % tabs.length];
  if (!nextTab.id || !tab.id) {
    console.log("Tab has no ID");
    return;
  }
  await chrome.tabs.move(tab.id, { index: nextTab.index });
}

chrome.commands.onCommand.addListener(async function (command: string) {
  if (command === "collapse-current-tab-group") {
    const currentTabGroup = await getCurrentTabGroup();
    if (!currentTabGroup) {
      return;
    }
    await toggleCollapsed(currentTabGroup);
  }
  if (command === "collapse-all-groups") {
    await collapseAllGroups();
  }
  if (command === "move-tab-left") {
    const currentTab = await getCurrentTab();
    await moveTab(currentTab, -1);
  }
  if (command === "move-tab-right") {
    const currentTab = await getCurrentTab();
    await moveTab(currentTab, +1);
  }
  if (command === "move-to-group") {
    const currentTab = await getCurrentTab();
    if (!currentTab.id) {
      return;
    }
    chrome.tabs.sendMessage(currentTab.id, { type: "open-group-selector" });
  }
});

async function handleMessage(
  message: any,
  sender: chrome.runtime.MessageSender
) {
  if (message.command === "getGroups") {
    const tabGroups = await chrome.tabGroups.query({});
    return tabGroups;
  }
  if (message.command === "addTabToNewGroup") {
    if (!sender.tab || !sender.tab.id) {
      return;
    }
    addTabToNewGroup(sender.tab.id, message.title);
  }
  if (message.command === "addTabToGroup") {
    if (!sender.tab || !sender.tab.id) {
      return;
    }
    const group = await getGroupFromId(message.groupId);
    if (!group) {
      return;
    }
    addTabToGroup(sender.tab.id, group);
  }
}

chrome.runtime.onMessage.addListener(
  (message: any, sender: chrome.runtime.MessageSender, sendResponse) => {
    handleMessage(message, sender).then(sendResponse);
    return true;
  }
);
