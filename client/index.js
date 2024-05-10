const endPoint = new URL("http://localhost:10000/")


function showError(error) {
    console.error(error)
    console.trace();
    //TODO: Popup
}

function onMenuCreated() {
    if(browser.runtime.lastError) {
        showError("Could not create menu item", browser.runtime.lastError)
    }
}

async function getTrackedURLs() {
    return fetch(new URL("/tracked", endPoint))
        .then(res => { if(res.ok) return res.json(); throw res })
        .then(json => new Set(json))
        .catch(rea => {
            showError("Could not load tracked URLs from db", rea)
            //TODO: Instead used the last save list in storage
            return []
        })
}
async function trackURL(url) {
    return fetch(
        new URL(`/track/${encodeURIComponent(url)}`, endPoint),
        { method: "POST" }
    )
        .then(res => { if(!res.ok) throw res })
        .catch(rea => {
            showError("Could not track URL", rea)
            //TODO: Store this in browser storage and try later
        })
}
async function untrackURL(url) {
    return fetch(
        new URL(`/untrack/${encodeURIComponent(url)}`, endPoint),
        { method: "POST" }
    )
        .then(res => { if(!res.ok) throw res })
        .catch(rea => {
            showError("Could not untrack URL", rea)
            //TODO: Store this in browser storage and try later
        })
}
async function saveURLData(url, data) {
    return fetch(
        new URL(`/save/${encodeURIComponent(url)}`, endPoint),
        { method: "POST", body: data }
    )
        .then(res => { if(!res.ok) throw res })
        .catch(rea => {
            showError("Could not save URL data", rea)
            //TODO: Store this in browser storage and try later
        })
}

browser.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {
        if(message.type === "sendHTML")
            saveURLData(sender.tab.url, message.data)
        else showError("Unknown message type", message)
    })

browser.runtime.onInstalled.addListener(() => {
    getTrackedURLs().then(trackedURLs => {
        console.log(trackedURLs)

        const trackedURLsEvents = new EventTarget()
        trackedURLs.add = (function (add) {
            return function (...args) {
                const old = new Set(trackedURLs)

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
                const old = new Set(trackedURLs)

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
                const old = new Set(trackedURLs)

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

        trackedURLsEvents.addEventListener('added', e => {
            trackURL(e.detail.url)
        })
        trackedURLsEvents.addEventListener('deleted', e => {
            untrackURL(e.detail.url)
        })
        trackedURLsEvents.addEventListener('changed', e => {
            for (const port of URLsChangedPorts) {
                port.postMessage(
                    { val: trackedURLs, old: e.detail.old }
                )
            }
        })

        const URLsChangedPorts = new Set()
        browser.runtime.onConnect.addListener(port => {
            switch(port.name) {
                case "trackedURLsChange":
                    URLsChangedPorts.add(port)
                    port.onDisconnect.addListener(
                        port => URLsChangedPorts.delete(port)
                    )
                    port.postMessage({ val: trackedURLs })
                    break
                case "trackURL":
                    port.onMessage.addListener(
                        details => trackedURLs.add(details.url)
                    )
                    break
                case "untrackURL":
                    port.onMessage.addListener(
                        details => trackedURLs.delete(details.url)
                    )
                    break
                default:
                    showError("Unknown connection name", port.name)
            }

        browser.menus.onClicked.addListener(async (info, tab) => {
            switch(info.menuItemId) {
                case "trackURL":
                    browser.tabs.executeScript(
                        tab.id, { file: "/scrape.js" }
                    ).catch(showError)
                    trackedURLs.add(tab.url)
                    break
                case "untrackURL":
                    trackedURLs.delete(tab.url)
                    break
                case "scrapeURL":
                    if(!trackedURLs.has(tab.url)) {
                        browser.tabs.executeScript(
                            tab.id, { file: "/scrape.js" }
                        ).catch(showError)
                    }
                    else
                    {
                        browser.tabs.sendMessage(tab.id,
                            {
                                type: "getHTML"
                            })
                            .then(msg => saveURLData(tab.url, msg))
                            .catch(showError)
                    }
                    break
                default:
                    showError("Unknown context menu clicked", info, tab)
                    break
            }
        })

        browser.tabs.query({})
            .then(tabs => {
                for(const tab of tabs)
                    if(trackedURLs.has(tab.url))
                        browser.tabs.executeScript(
                            tab.id, { file: "/scrape.js" }
                        ).catch(showError)
            })
            .catch(showError)
            .finally(_ => {
                browser.tabs.onUpdated.addListener(
                    (tabid, changeinfo, tab) => {
                        if(
                            changeinfo.status === "complete"
                            &&
                            trackedURLs.has(tab.url)
                        )
                            browser.tabs.executeScript(
                                tabid, { file: "/scrape.js" }
                            ).catch(showError)
                    })
            })
        })
    })

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
});
