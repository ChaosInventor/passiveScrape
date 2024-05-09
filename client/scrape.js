browser.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {
        if(message.type === "getHTML")
            sendResponse(getDOMHTML())
        //TODO: Messages for fetching other resources used by the dom
    })

function getDOMHTML() {
    const node = document.doctype
    let doctype = ''
    if(node !== null)
    {
        doctype = "<!DOCTYPE "
            + node.name
            + (node.publicId ? ' PUBLIC "' + node.publicId + '"' : '')
            + (!node.publicId && node.systemId ? ' SYSTEM' : '')
            + (node.systemId ? ' "' + node.systemId + '"' : '')
            + '>\n'
    }

    return  doctype + document.documentElement.outerHTML
}

//TODO: Possibly tune delay
setTimeout(_ => {
    browser.runtime.sendMessage({
        type: "sendHTML",
        data: getDOMHTML()
    })
}, 5000)

//TODO: Send html if significant DOM changes

//TODO: Send all linked URLS for further processing
