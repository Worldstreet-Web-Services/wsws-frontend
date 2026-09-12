// ../insight/src/insight.refresh.ts
function registerFormHandler() {
  $("form.insight-refresh").on("submit", function() {
    fetch(this.action, {
      method: "post",
      credentials: "same-origin"
    }).then(site.reload);
    $(this).replaceWith($(this).find(".crunching").removeClass("none"));
    return false;
  });
}
site.load.then(registerFormHandler);

export {
  registerFormHandler
};
//# sourceMappingURL=lib.XVRJNPUY.js.map
