const trackedURLs = new Set()
loadTrackedURLS()

const trackedURLsEvents = new EventTarget()
trackedURLs.add = (function (add) {
    return function (...args) {
        const old = trackedURLs

        const newURLs = []
        for(const arg of args) {
            if(!trackedURLs.has(arg))
                newURLs.push(arg)
        }

        const ret = add.apply(this, args)

        for(const url of newURLs) {
            trackedURLsEvents.dispatchEvent(
                new CustomEvent('added', { detail:
                    { old: old, url: url }
                })
            )
            trackedURLsEvents.dispatchEvent(
                new CustomEvent('changed', { detail: { old: old } })
            )
        }

        return ret
    }
}(trackedURLs.add))
trackedURLs.delete = (function (del) {
    return function (...args) {
        const old = trackedURLs

        const oldURLs = []
        for(const arg of args) {
            if(trackedURLs.has(arg))
                oldURLs.push(arg)
        }

        const ret = del.apply(this, args)

        for(const url of oldURLs) {
            trackedURLsEvents.dispatchEvent(
                new CustomEvent('deleted', { detail:
                    { old: old, url: url }
                })
            )
            trackedURLsEvents.dispatchEvent(
                new CustomEvent('changed', { detail: { old: old } })
            )
        }

        return ret
    }
}(trackedURLs.delete))
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


function showError(error) {
    console.error(error)
    console.trace();
    //TODO: Popup
}

function onMenuCreated() {
    if(browser.runtime.lastError) {
        console.log(`Error: ${browser.runtime.lastError}`);
    } else {
        console.log("Context menu itme created successfully");
    }
}

function loadTrackedURLS() {
    console.log("Loading tracked URLs")

    fetch("http://localhost:10000/tracked")
        .then(res => { if(res.ok) return res.json(); throw res })
        .then(json => {
            for(const url of json) {
                trackedURLs.add(url)
            }
        })
        .catch(showError)
}

function handleMenuClicks(info, tab) {
    switch(info.menuItemId) {
        case "trackURL":
            trackedURLs.add(tab.url)
            break
        case "untrackURL":
            trackedURLs.delete(tab.url)
            break
        case "scrapeURL":
            scrape(tab.url)
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

function scrape(url) {
    console.log("Scraping", url)
    //TODO:
}

function track(url) {
    fetch(`http://localhost:10000/track/${encodeURIComponent(url)}`,
        { method: "POST", mode: "cors" }
    )
        .then(res => { if(!res.ok) throw res })
        .catch(showError)
}
function untrack(url) {
    fetch(`http://localhost:10000/untrack/${encodeURIComponent(url)}`,
        { method: "POST", mode: "cors" }
    )
        .then(res => { if(!res.ok) throw res })
        .catch(showError)
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
    browser.menus.create({
        id: "untrackURL",
        title: "Untrack this URL",
        contexts: ["page"],
    }, onMenuCreated);
    browser.menus.create({
        id: "scrapeURL",
        title: "Scrape this URL",
        contexts: ["page"],
    }, onMenuCreated);
    browser.menus.onClicked.addListener(handleMenuClicks)

    //TODO: Check all active tabs for tracked urls and scrape them

    browser.webNavigation.onCompleted.addListener(handleNavigation)
    //TODO: Also listen to onHistory events
    //TODO: When page done and loaded, dump dom to db

    trackedURLsEvents.addEventListener('added', e => {
        track(e.detail.url)
    })
    trackedURLsEvents.addEventListener('deleted', e => {
        untrack(e.detail.url)
    })
    trackedURLsEvents.addEventListener('changed', e => {
        for (const port of URLsChangedPorts) {
            port.postMessage(
                { val: trackedURLs, old: e.detail.old }
            )
        }
    })
});
