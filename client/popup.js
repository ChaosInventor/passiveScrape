const trackPort = browser.runtime.connect({
    name: "trackURL"
})
const untrackPort = browser.runtime.connect({
    name: "untrackURL"
})

function updatePage(trackedURLs) {
    const urlList = document.getElementById("trackedURLs")
    urlList.innerHTML = ''

    for(const url of trackedURLs) {
        const urlItem = document.createElement("div")
        urlItem.className = "urlItem"

        const urlName = document.createElement("label")
        urlName.className = "urlName"
        urlName.innerText = url
        urlName.htmlFor = url

        const urlButton = document.createElement("button")
        urlButton.innerText = "X"
        urlButton.addEventListener("click", _ =>
            untrackPort.postMessage({ url: url })
        )
        urlButton.name = url

        urlItem.appendChild(urlName)
        urlItem.appendChild(urlButton)

        urlList.appendChild(urlItem)
    }
}

//TODO: Button for reloading tracked urls

browser.runtime.connect({
    name: "trackedURLsChange"
}).onMessage.addListener(details => updatePage(details.val))
