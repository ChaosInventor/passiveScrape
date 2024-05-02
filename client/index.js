function onCreated() {
    if (browser.runtime.lastError) {
        console.log(`Error: ${browser.runtime.lastError}`);
    } else {
        console.log("Item created successfully");
    }
}

browser.runtime.onInstalled.addListener(() => {
    browser.menus.create({
        id: "trackURL",
        title: "Track this URL",
        contexts: ["page"],
    }, onCreated);
});

browser.webNavigation.onCompleted.addListener(
    (details) => {
        console.log(details)
    },
);

browser.menus.onClicked.addListener((info, tab) => {
      switch (info.menuItemId) {
          case "trackURL":
              console.log("Tracking URL", tab.url)
              break
          default:
              console.log("Unknown context menu clicked", info, tab)
              break
      }
})

