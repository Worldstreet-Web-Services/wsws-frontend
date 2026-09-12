import {
  isTouchDevice
} from "./lib.S3TIZ2HQ.js";
import "./lib.LWF5S4ZV.js";
import {
  licon
} from "./lib.5I4BSVKX.js";
import {
  json
} from "./lib.TT4QSUKQ.js";
import "./lib.NFSQQWN5.js";
import {
  frag
} from "./lib.GMEH5BEF.js";
import "./lib.KO2KTNGK.js";

// ../bits/src/bits.dropdownOverflow.ts
site.load.then(() => {
  const containers = Array.from(document.querySelectorAll(".dropdown-overflow"));
  if (containers.length === 0) {
    return;
  }
  function render() {
    containers.forEach((container) => renderMenu(container));
  }
  containers.forEach((container) => listenToReload(container));
  render();
  window.addEventListener("resize", render);
});
function listenToReload(container) {
  container.addEventListener("reload", (e) => {
    json(e.detail, { method: "post", headers: { "Content-Type": "application/json" } }).then(
      (menuItems) => replaceMenuItems(container, menuItems)
    );
  });
}
function replaceMenuItems(container, items) {
  const menu = getMenuFromDataAttr(container);
  const newMenuItemsByCategory = items.reduce((acc, item) => {
    var _a, _b, _c;
    if (!acc[(_a = item.category) != null ? _a : ""]) {
      acc[(_b = item.category) != null ? _b : ""] = [];
    }
    acc[(_c = item.category) != null ? _c : ""].push(item);
    return acc;
  }, {});
  for (const [category, items2] of Object.entries(newMenuItemsByCategory)) {
    const categoryIndex = menu.items.findIndex((item) => item.category === category);
    if (categoryIndex === -1) {
      menu.items.push(...items2);
    } else {
      menu.items = menu.items.filter((item) => item.category !== category);
      menu.items.splice(categoryIndex, 0, ...items2);
    }
  }
  setMenuToDataAttr(container, menu);
  renderMenu(container);
}
function renderMenu(container) {
  container.innerHTML = "";
  const { items, moreLabel } = getMenuFromDataAttr(container);
  const initialWidth = container.offsetWidth;
  const menuContainer = document.createElement("div");
  menuContainer.classList = "menu-container btn-rack";
  container.appendChild(menuContainer);
  const dropdownDiv = document.createElement("div");
  dropdownDiv.classList = "dropdown btn-rack__btn";
  menuContainer.appendChild(dropdownDiv);
  const moreButton = document.createElement("a");
  moreButton.textContent = `${moreLabel} \u25BE`;
  dropdownDiv.appendChild(moreButton);
  const createMenuButton = (className, item) => {
    if (item.httpMethod === "POST") {
      return frag(`<form method="POST" action="${item.href}"><button type="submit" class="button-text" data-icon="${item.icon}"> ${item.label} </button></form>`);
    }
    const button = document.createElement("a");
    button.className = className;
    if (item.cssClass) {
      button.classList.add(item.cssClass);
    }
    button.textContent = item.label;
    button.href = item.href;
    button.setAttribute("data-icon", item.icon);
    return button;
  };
  let displayedItemCount = 0;
  for (const item of items) {
    const button = createMenuButton("btn-rack__btn", item);
    menuContainer.insertBefore(button, dropdownDiv);
    if (container.offsetWidth > initialWidth && !site.blindMode) {
      menuContainer.removeChild(button);
      break;
    }
    displayedItemCount++;
  }
  if (displayedItemCount < items.length) {
    if (displayedItemCount === 0) {
      menuContainer.classList.remove("btn-rack");
      dropdownDiv.classList.remove("btn-rack__btn");
      moreButton.textContent = "";
      moreButton.setAttribute("data-icon", licon.Hamburger);
    }
    const dropdownWindow = document.createElement("div");
    dropdownWindow.className = "dropdown-window";
    dropdownDiv.appendChild(dropdownWindow);
    dropdownDiv.tabIndex = 0;
    dropdownDiv.role = "button";
    const closeListener = (e) => dropdownDiv.contains(e.target) || showDropdownWindow(false);
    const showDropdownWindow = (show) => {
      if (show != null ? show : !dropdownDiv.classList.contains("visible"))
        document.addEventListener("click", closeListener);
      else document.removeEventListener("click", closeListener);
      dropdownDiv.classList.toggle("visible", show);
    };
    if (isTouchDevice() && !site.blindMode) dropdownDiv.onclick = () => showDropdownWindow();
    for (let i = displayedItemCount; i < items.length; i++) {
      const button = createMenuButton("text", items[i]);
      dropdownWindow.appendChild(button);
    }
  } else {
    menuContainer.removeChild(dropdownDiv);
  }
}
function getMenuFromDataAttr(root) {
  return $(root).data("menu");
}
function setMenuToDataAttr(root, menu) {
  $(root).data("menu", menu);
}
//# sourceMappingURL=bits.dropdownOverflow.YKXXHTOE.js.map
