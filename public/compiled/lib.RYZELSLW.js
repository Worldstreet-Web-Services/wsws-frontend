import {
  frag
} from "./lib.GK2I5IFJ.js";

// ../bits/src/selectSearch.ts
function createSelectSearch(select) {
  var _a, _b, _c, _d;
  const container = frag(
    '<div class="select-search"><button type="button" class="select-search__toggle" aria-haspopup="listbox" aria-expanded="false"></button><div class="select-search__menu"><input type="text" class="select-search__input"><div class="select-search__list" role="listbox"></div></div></div>'
  );
  select.insertAdjacentElement("afterend", container);
  const toggle = container.querySelector(".select-search__toggle");
  if (select.classList.contains("form-control")) toggle.classList.add("form-control");
  toggle.textContent = (_d = (_c = (_a = select.selectedOptions[0]) == null ? void 0 : _a.textContent) != null ? _c : (_b = select.options[0]) == null ? void 0 : _b.textContent) != null ? _d : "";
  const search = container.querySelector(".select-search__input");
  search.placeholder = i18n.site.search;
  search.setAttribute("aria-label", i18n.site.search);
  const list = container.querySelector(".select-search__list");
  for (const option of select.options) {
    const item = document.createElement("div");
    item.classList.add("select-search__item");
    item.setAttribute("role", "option");
    item.dataset.value = option.value;
    item.textContent = option.textContent;
    item.setAttribute("aria-selected", String(option.value === select.value));
    option.value === select.value && item.classList.add("selected");
    list.appendChild(item);
  }
  function selectItem(item) {
    var _a2;
    toggle.textContent = item.textContent;
    select.value = item.dataset.value;
    select.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
    (_a2 = list.querySelector(".selected")) == null ? void 0 : _a2.classList.remove("selected");
    Array.from(list.children).forEach((el) => el.removeAttribute("aria-selected"));
    item.classList.add("selected");
    item.setAttribute("aria-selected", "true");
    closeMenu();
    toggle.focus();
  }
  function visibleItems() {
    return [...list.querySelectorAll(".select-search__item:not(.none)")];
  }
  toggle.addEventListener("click", () => {
    var _a2;
    const wasOpen = container.classList.contains(".select-search--open");
    if (wasOpen) {
      closeMenu();
      return;
    }
    container.classList.add("select-search--open");
    toggle.setAttribute("aria-expanded", "true");
    search.focus();
    (_a2 = list.querySelector(".selected")) == null ? void 0 : _a2.scrollIntoView({ block: "nearest" });
  });
  toggle.addEventListener("keydown", (e) => {
    if (["ArrowDown", "ArrowUp", " "].includes(e.key) && !container.classList.contains("select-search--open")) {
      e.preventDefault();
      toggle.click();
    }
  });
  search.addEventListener("input", () => {
    const query = search.value.toLowerCase();
    Array.from(list.children).forEach((item) => {
      var _a2;
      item.classList.remove("focus");
      item.classList.toggle("none", !((_a2 = item.textContent) != null ? _a2 : "").toLowerCase().includes(query));
    });
  });
  search.addEventListener("keydown", (e) => {
    const items = visibleItems();
    const focused = list.querySelector(".focus");
    if (e.key === "Escape") {
      closeMenu();
      toggle.focus();
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = focused != null ? focused : items[0];
      if (target) selectItem(target);
    } else if (["ArrowDown", "ArrowUp"].includes(e.key)) {
      e.preventDefault();
      if (!items.length) return;
      const current = focused ? items.indexOf(focused) : -1;
      const next = e.key === "ArrowDown" ? current < items.length - 1 ? current + 1 : 0 : current > 0 ? current - 1 : items.length - 1;
      focused == null ? void 0 : focused.classList.remove("focus");
      items[next].classList.add("focus");
      items[next].scrollIntoView({ block: "nearest" });
    }
  });
  document.addEventListener("click", (e) => {
    const target = e.target;
    if (list.contains(target)) selectItem(target);
    else if (!container.contains(target)) closeMenu();
  });
  function closeMenu() {
    container.classList.remove("select-search--open");
    toggle.setAttribute("aria-expanded", "false");
    search.value = "";
    Array.from(list.children).forEach((i) => i.classList.remove("none", "focus"));
  }
  select.classList.add("none");
}

export {
  createSelectSearch
};
//# sourceMappingURL=lib.RYZELSLW.js.map
