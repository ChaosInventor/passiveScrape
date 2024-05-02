const trackedURLs = new Set()
const trackedURLsEvents = new EventTarget()
trackedURLs.add = (function (add) {
    return function (...args) {
        const old = trackedURLs

        const ret = add.apply(this, args)

        trackedURLsEvents.dispatchEvent(
            new CustomEvent('added', { detail: { old: old } })
        )
        trackedURLsEvents.dispatchEvent(
            new CustomEvent('changed', { detail: { old: old } })
        )

        return ret
    }
}(trackedURLs.add))
trackedURLs.remove = (function (remove) {
    return function (...args) {
        const old = trackedURLs

        const ret = remove.apply(this, args)

        trackedURLsEvents.dispatchEvent(
            new CustomEvent('removed', { detail: { old: old } })
        )
        trackedURLsEvents.dispatchEvent(
            new CustomEvent('changed', { detail: { old: old } })
        )

        return ret
    }
}(trackedURLs.remove))
trackedURLs.clear = (function (clear) {
    return function (...args) {
        const old = trackedURLs

        const ret = clear.apply(this, args)

        trackedURLsEvents.dispatchEvent(
            new CustomEvent('cleared', { detail: { old: old } })
        )
        trackedURLsEvents.dispatchEvent(
            new CustomEvent('removed', { detail: { old: old } })
        )
        trackedURLsEvents.dispatchEvent(
            new CustomEvent('changed', { detail: { old: old } })
        )

        return ret
    }
}(trackedURLs.clear))


function loadTrackedURLS() {
    console.log("Loading tracked URLs")
    //TODO:
}

function onMenuCreated() {
    if(browser.runtime.lastError) {
        console.log(`Error: ${browser.runtime.lastError}`);
    } else {
        console.log("Context menu itme created successfully");
    }
}

function handleMenuClicks(info, tab) {
    switch(info.menuItemId) {
        case "trackURL":
            trackedURLs.add(tab.url)
            break
        default:
            console.log("Unknown context menu clicked", info, tab)
            break
    }
}

function handleNavigation(details) {
    //TODO:
    console.log(details)
}

const URLsChangedPorts = new Set()
browser.runtime.onConnect.addListener((port) => {
    switch(port.name) {
        case "trackedURLsChange":
            URLsChangedPorts.add(port)
            port.onDisconnect.addListener(
                port => URLsChangedPorts.delete(port)
            )
            port.postMessage({ val: trackedURLs })
            break;
        default:
            console.log("Unknown connection name", port.name)
    }
})

browser.runtime.onInstalled.addListener(() => {
    browser.menus.create({
        id: "trackURL",
        title: "Track this URL",
        contexts: ["page"],
    }, onMenuCreated);
    browser.menus.onClicked.addListener(handleMenuClicks)

    loadTrackedURLS()

    browser.webNavigation.onCompleted.addListener(handleNavigation)
    //TODO: Also listen to onHistory events
    //TODO: When page done and loaded, dump dom to db

    trackedURLsEvents.addEventListener('changed',
        (details) => {
            for (const port of URLsChangedPorts) {
                port.postMessage(
                    { val: trackedURLs, old: details.old }
                )
            }
        }
    )
});
