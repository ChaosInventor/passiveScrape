function updatePage(trackedURLs) {
    //TODO: CSS and button for removing a url
    const list = document.getElementById("trackedURLs")
    list.innerHTML = ''

    for(const url of trackedURLs) {
        const li = document.createElement("li")
        li.innerText = url
        list.appendChild(li)
    }
}

const trackedURLsChangePort = browser.runtime.connect(
    { name: "trackedURLsChange" }
)
trackedURLsChangePort.onMessage.addListener(
    details => updatePage(details.val)
)
