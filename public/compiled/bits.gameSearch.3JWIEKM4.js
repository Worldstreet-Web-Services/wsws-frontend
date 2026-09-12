import {
  pubsub
} from "./lib.YID4KMSR.js";
import "./lib.KO2KTNGK.js";

// ../bits/src/bits.gameSearch.ts
site.load.then(() => {
  const form = document.querySelector(".search__form"), $form = $(form), $usernames = $form.find(".usernames input"), $userRows = $form.find(".user-row"), $result = $(".search__result");
  function getUsernames() {
    const us = [];
    $usernames.each(function() {
      const u = this.value.trim();
      if (u) us.push(u);
    });
    return us;
  }
  function userChoices(row) {
    const isSelected = (row2, rowClassName, user, dataKey) => {
      const player = $form.data(dataKey);
      return row2.classList.contains(rowClassName) && !!player.length && user === player;
    };
    const usernames = getUsernames();
    const $select = $(row).find("select").html('<option value=""></option>');
    for (const user of usernames) {
      $select.append(
        $("<option>").attr({
          value: user,
          ...isSelected(row, "winner", user, "req-winner") || isSelected(row, "loser", user, "req-loser") || isSelected(row, "whiteUser", user, "req-white") || isSelected(row, "blackUser", user, "req-black") ? { selected: "" } : {}
        }).text(user)
      );
    }
    row.classList.toggle("none", !usernames.length);
  }
  function reloadUserChoices() {
    $userRows.each(function() {
      userChoices(this);
    });
  }
  reloadUserChoices();
  $usernames.on("input paste", reloadUserChoices);
  const toggleAiLevel = function() {
    $form.find(".opponent select").each(function() {
      $form.find(".aiLevel").toggleClass("none", this.value !== "1");
      $form.find(".opponentName").toggleClass("none", this.value === "1");
    });
  };
  toggleAiLevel();
  $form.find(".opponent select").on("change", toggleAiLevel);
  function serialize() {
    const params = new URLSearchParams();
    for (const [k, v] of new FormData(form != null ? form : void 0).entries()) {
      if (v !== "") params.set(k, v.toString());
    }
    return params.toString();
  }
  const serialized = serialize();
  $result.find("a.permalink").each(function() {
    this.href = this.href.split("?")[0] + "?" + serialized;
  });
  const updatePagerLink = () => $result.find(".infinite-scroll .pager a").each(function() {
    this.href += "&" + serialized;
  });
  updatePagerLink();
  pubsub.on("content-loaded", updatePagerLink);
  $form.on("submit", () => {
    $form.find("input,select").filter(function() {
      return !this.value;
    }).attr("disabled", "disabled");
    $form.addClass("searching");
  });
});
//# sourceMappingURL=bits.gameSearch.3JWIEKM4.js.map
