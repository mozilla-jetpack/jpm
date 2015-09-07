function getAttributes(ele) {
  if (!ele) return {};
  return {
    pref: ele.getAttribute("pref"),
    type: ele.getAttribute("type"),
    title: ele.getAttribute("title"),
    desc: ele.getAttribute("desc"),
    "data-jetpack-id": ele.getAttribute('data-jetpack-id')
  }
}

sendAsyncMessage("test-aom@jpm:results", {
  someCount: content.document.querySelectorAll("setting[title='some-title']").length,
  somePreference: getAttributes(content.document.querySelector("setting[title='some-title']")),
  myInteger: getAttributes(content.document.querySelector("setting[title='my-int']")),
  myHiddenInt: getAttributes(content.document.querySelector("setting[title='hidden-int']")),
  sayHello: getAttributes(content.document.querySelector("button[label='Click me!']"))
});
