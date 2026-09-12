// ../mod/src/mod.emailConfirmation.ts
site.load.then(() => {
  var _a;
  (_a = document.querySelectorAll(".mod-confirm form input")) == null ? void 0 : _a.forEach((input) => {
    input.setSelectionRange(input.value.length, input.value.length);
    input.addEventListener("paste", () => setTimeout(() => {
      var _a2;
      return (_a2 = input.form) == null ? void 0 : _a2.submit();
    }, 50));
  });
});
//# sourceMappingURL=mod.emailConfirmation.4MEXL2S4.js.map
