import {
  registerFormHandler
} from "./lib.XVRJNPUY.js";
import {
  plugin
} from "./lib.ZGBKUI6O.js";
import {
  colorSeries,
  fontFamily,
  gridColor,
  maybeChart,
  tooltipBgColor
} from "./lib.RYMCRMTK.js";
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  LinearScale,
  plugin_legend,
  plugin_tooltip
} from "./lib.SHTOLDQD.js";
import {
  userLink
} from "./lib.RU54GHQA.js";
import {
  numberFormat
} from "./lib.EJQKEWZT.js";
import {
  div,
  icon,
  initMiniBoard,
  optgroup,
  spinnerHtml,
  table,
  tbody,
  td,
  th,
  thead,
  tr
} from "./lib.LY6FZSW3.js";
import "./lib.KC3NJ77S.js";
import "./lib.NNS7OYZ5.js";
import "./lib.LYPETE66.js";
import "./lib.ILS4LNPZ.js";
import "./lib.GSUEVEQG.js";
import "./lib.JUCKJNFH.js";
import "./lib.PM233RJM.js";
import "./lib.23HTWUBN.js";
import "./lib.GOC3UD5K.js";
import {
  bind,
  currentTheme,
  dataIcon,
  hl,
  isTouchDevice,
  onInsert
} from "./lib.WVJXH4CQ.js";
import {
  attributesModule,
  classModule,
  h,
  init,
  thunk
} from "./lib.2L7Z4FRN.js";
import "./lib.YID4KMSR.js";
import {
  licon
} from "./lib.2DWRH35C.js";
import {
  json
} from "./lib.M3IF75DN.js";
import {
  debounce,
  throttlePromiseDelay
} from "./lib.AXX3QIAX.js";
import {
  escapeHtml
} from "./lib.GK2I5IFJ.js";
import "./lib.KO2KTNGK.js";

// ../insight/src/util.ts
function isLandscapeLayout() {
  return isAtLeastXSmall() || window.innerWidth > window.innerHeight;
}
var isAtLeastXXSmall = (w = window.innerWidth) => w >= 500;
var isAtLeastXSmall = (w = window.innerWidth) => w >= 650;
var isAtLeastSmall = (w = window.innerWidth) => w >= 800;

// ../insight/src/ctrl.ts
var ctrl_default = class {
  constructor(env, domElement, redraw) {
    this.isUserAction = false;
    this.findMetric = (key) => this.metrics.find((x) => x.key === key);
    this.findDimension = (key) => this.dimensions.find((x) => x.key === key);
    this.askQuestion = throttlePromiseDelay(
      () => 1e3,
      () => {
        if (!this.validCombinationCurrent()) this.reset();
        this.pushState();
        this.vm.loading = true;
        this.vm.broken = false;
        this.redraw();
        return new Promise((resolve) => {
          setTimeout(
            () => json(this.env.postUrl, {
              method: "post",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                metric: this.vm.metric.key,
                dimension: this.vm.dimension.key,
                filters: this.vm.filters
              })
            }).then(
              (answer) => {
                this.vm.answer = answer;
                this.vm.loading = false;
                if (this.isUserAction) this.vm.view = "insights";
                this.isUserAction = false;
                this.redraw();
              },
              () => {
                this.isUserAction = false;
                this.vm.loading = false;
                this.vm.broken = true;
                this.redraw();
              }
            ).finally(resolve),
            1
          );
        });
      }
    );
    this.env = env;
    this.ui = env.ui;
    this.user = env.user;
    this.own = env.myUserId === env.user.id;
    this.domElement = domElement;
    this.redraw = redraw;
    this.dimensions = env.ui.dimensionCategs.flatMap((c) => c.items);
    this.metrics = env.ui.metricCategs.flatMap((c) => c.items);
    this.vm = {
      metric: this.findMetric(this.env.initialQuestion.metric),
      dimension: this.findDimension(this.env.initialQuestion.dimension),
      filters: this.env.initialQuestion.filters,
      loading: true,
      broken: false,
      answer: null,
      panel: Object.keys(env.initialQuestion.filters).length ? "filter" : "preset",
      view: isLandscapeLayout() ? "combined" : "presets"
    };
  }
  setPanel(p) {
    this.vm.panel = p;
    this.redraw();
  }
  setView(view2) {
    this.vm.view = view2;
    this.redraw();
  }
  reset() {
    this.vm.metric = this.metrics[0];
    this.vm.dimension = this.dimensions[0];
    this.vm.filters = {};
  }
  makeUrl(dKey, mKey, filters) {
    const url = [this.env.pageUrl, mKey, dKey].join("/");
    const filtersStr = Object.entries(filters).filter(([_, values]) => !!values).map(([name, values]) => name + ":" + values.join(",")).join("/");
    return filtersStr.length ? url + "/" + filtersStr : url;
  }
  makeCurrentUrl() {
    return this.makeUrl(this.vm.dimension.key, this.vm.metric.key, this.vm.filters);
  }
  pushState() {
    history.replaceState({}, "", this.makeCurrentUrl());
  }
  validCombination(dimension, metric) {
    return dimension && metric && (dimension.position === "game" || metric.position === "move");
  }
  validCombinationCurrent() {
    return this.validCombination(this.vm.dimension, this.vm.metric);
  }
  setMetric(key) {
    this.vm.metric = this.findMetric(key);
    if (!this.validCombinationCurrent())
      this.vm.dimension = this.dimensions.find((d) => this.validCombination(d, this.vm.metric));
    this.vm.panel = "filter";
    this.askQuestion();
  }
  setDimension(key) {
    this.vm.dimension = this.findDimension(key);
    if (!this.validCombinationCurrent())
      this.vm.metric = this.metrics.find((m) => this.validCombination(this.vm.dimension, m));
    this.vm.panel = "filter";
    this.askQuestion();
  }
  setFilter(dimensionKey, valueKeys) {
    if (dimensionKey === "period" && valueKeys[0] === "3650") valueKeys = [];
    if (!valueKeys.length) delete this.vm.filters[dimensionKey];
    else this.vm.filters[dimensionKey] = valueKeys;
    this.askQuestion();
  }
  setQuestion(q) {
    this.vm.dimension = this.findDimension(q.dimension);
    this.vm.metric = this.findMetric(q.metric);
    this.vm.filters = {
      ...q.filters,
      variant: this.vm.view === "combined" && this.vm.filters.variant || q.filters.variant
    };
    this.isUserAction = true;
    this.askQuestion();
    $(this.domElement).find("select.ms").multipleSelect("open");
    setTimeout(() => {
      $(this.domElement).find("select.ms").multipleSelect("close");
    }, 1e3);
  }
  clearFilters() {
    if (Object.keys(this.vm.filters).length) {
      this.vm.filters = {};
      this.askQuestion();
    }
  }
};

// ../insight/src/multipleSelect.ts
var registerMultipleSelect = () => {
  $.fn.multipleSelectHover = function(fnOver, fnOut) {
    return this.on("mouseenter", fnOver).on("mouseleave", fnOut || fnOver);
  };
  function isVisible() {
    const display = window.getComputedStyle(this).display;
    return !!display && display !== "none";
  }
  class MultipleSelectState {
    constructor($el, options) {
      var _a;
      const that = this, name = $el.attr("name") || options.name || "";
      this.options = options;
      this.$el = $el.hide();
      this.$label = this.$el.closest("label") || this.$el.attr("id") && $(`label[for="${(_a = this.$el.attr("id")) == null ? void 0 : _a.replace(/:/g, "\\:")}"]`);
      this.$parent = $(`<div class="ms-parent ${$el.attr("class") || ""}"/>`);
      this.$choice = $(
        [
          '<button type="button" class="ms-choice">',
          `<span class="placeholder">${this.options.placeholder}</span>`,
          "<div></div>",
          "</button>"
        ].join("")
      );
      this.$drop = $(`<div class="ms-drop ${this.options.position}"/>`);
      this.$el.after(this.$parent);
      this.$parent.append(this.$choice);
      this.$parent.append(this.$drop);
      if (this.$el.prop("disabled")) {
        this.$choice.addClass("disabled");
      }
      this.$parent.css("width", this.options.width || this.$el.css("width") || this.$el.outerWidth() + 20);
      this.selectAllName = `data-name="selectAll${name}"`;
      this.selectGroupName = `data-name="selectGroup${name}"`;
      this.selectItemName = `data-name="selectItem${name}"`;
      if (!this.options.keepOpen) {
        $(document).on("click", function(e) {
          if ($(e.target)[0] === that.$choice[0] || $(e.target).parents(".ms-choice")[0] === that.$choice[0]) {
            return;
          }
          if (($(e.target)[0] === that.$drop[0] || $(e.target).parents(".ms-drop")[0] !== that.$drop[0] && e.target !== $el[0]) && that.options.isOpen) {
            that.close();
          }
        });
      }
    }
    init() {
      var _a, _b;
      const that = this, $ul = $("<ul></ul>");
      this.$drop.html("");
      if (this.options.filter) {
        this.$drop.append(
          [
            '<div class="ms-search">',
            '<input type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">',
            "</div>"
          ].join("")
        );
      }
      if (this.options.selectAll && !this.options.single) {
        $ul.append(
          [
            '<li class="ms-select-all">',
            "<label>",
            `<input type="checkbox" ${this.selectAllName} /> `,
            ((_a = this.options.selectAllDelimiter) == null ? void 0 : _a[0]) || "",
            this.options.selectAllText,
            ((_b = this.options.selectAllDelimiter) == null ? void 0 : _b[1]) || "",
            "</label>",
            "</li>"
          ].join("")
        );
      }
      $.each(this.$el.children(), function(i, elm) {
        $ul.append(that.optionToHtml(i, elm));
      });
      $ul.append(`<li class="ms-no-results">${this.options.noMatchesFound}</li>`);
      this.$drop.append($ul);
      this.$drop.find("ul").css("max-height", this.options.maxHeight + "px");
      this.$drop.find(".multiple").css("width", this.options.multipleWidth + "px");
      this.$searchInput = this.$drop.find(".ms-search input");
      this.$selectAll = this.$drop.find("input[" + this.selectAllName + "]");
      this.$selectGroups = this.$drop.find("input[" + this.selectGroupName + "]");
      this.$selectItems = this.$drop.find("input[" + this.selectItemName + "]:enabled");
      this.$disableItems = this.$drop.find("input[" + this.selectItemName + "]:disabled");
      this.$noResults = this.$drop.find(".ms-no-results");
      this.events();
      this.updateSelectAll(true);
      this.update(true);
      if (this.options.isOpen) {
        this.open();
      }
    }
    optionToHtml(i, elm, group, groupDisabled) {
      var _a, _b, _c, _d, _e, _f;
      const that = this, $elm = $(elm), classes = $elm.attr("class") || "", multiple = this.options.multiple ? "multiple" : "", type = this.options.single ? "radio" : "checkbox";
      let disabled;
      if ($elm.is("option")) {
        const value = $elm.val(), text = ((_b = (_a = that.options).textTemplate) == null ? void 0 : _b.call(_a, $elm)) || "", selected = $elm.prop("selected"), optionalStyle = (_d = (_c = this.options).styler) == null ? void 0 : _d.call(_c, value), style = optionalStyle ? `style="${optionalStyle}"` : "";
        disabled = groupDisabled || $elm.prop("disabled");
        return $(
          [
            `<li class="${multiple} ${classes}" ${style}>`,
            `<label class="${disabled ? "disabled" : ""}">`,
            `<input type="${type}" value="${escapeHtml(value)}" ${this.selectItemName} ${selected ? "checked" : ""} ${disabled ? "disabled" : ""} ${group ? `data-group="${group}"` : ""}>`,
            text,
            "</label>",
            "</li>"
          ].join("")
        );
      }
      if ($elm.is("optgroup")) {
        const label = (_f = (_e = that.options).labelTemplate) == null ? void 0 : _f.call(_e, $elm), $group = $("<div/>");
        group = "group_" + i;
        disabled = $elm.prop("disabled");
        $group.append(
          [
            '<li class="group">',
            `<label class="optgroup ${disabled ? "disabled" : ""}" data-group="${group}">`,
            this.options.hideOptgroupCheckboxes || this.options.single ? "" : `<input type="checkbox" ${this.selectGroupName} ${disabled ? "disabled" : ""}>`,
            label,
            "</label>",
            "</li>"
          ].join("")
        );
        $.each($elm.children(), function(i2, elm2) {
          $group.append(that.optionToHtml(i2, elm2, group, disabled));
        });
        return $group.html();
      }
      return void 0;
    }
    events() {
      const that = this, toggleOpen = function(e) {
        e.preventDefault();
        that[that.options.isOpen ? "close" : "open"]();
      };
      if (this.$label) {
        this.$label.off("click").on("click", function(e) {
          if (e.target.nodeName.toLowerCase() !== "label" || e.target !== this) {
            return;
          }
          toggleOpen(e);
          if (!that.options.filter || !that.options.isOpen) {
            that.focus();
          }
          e.stopPropagation();
        });
      }
      this.$choice.off("click").on("click", toggleOpen).off("focus").on("focus", this.options.onFocus).off("blur").on("blur", this.options.onBlur);
      if (!isTouchDevice())
        this.$choice.parent().off("mouseover").off("mouseout").multipleSelectHover(that.open.bind(that), that.close.bind(that));
      this.$parent.off("keydown").on("keydown", function(e) {
        var _a;
        if (e.key === "Escape") {
          that.close();
          (_a = that.$choice[0]) == null ? void 0 : _a.focus();
        }
      });
      this.$searchInput.off("keydown").on("keydown", function(e) {
        if (e.key === "Tab" && e.shiftKey) {
          that.close();
        }
      }).off("keyup").on("keyup", function(e) {
        var _a;
        if (that.options.filterAcceptOnEnter && (e.key === "Enter" || e.code === "Space") && that.$searchInput.val()) {
          (_a = that.$selectAll[0]) == null ? void 0 : _a.click();
          that.close();
          that.focus();
          return;
        }
        that.filter();
      });
      this.$selectAll.off("click").on("click", function() {
        var _a, _b;
        const checked = $(this).prop("checked"), $items = that.$selectItems.filter(isVisible);
        if ($items.length === that.$selectItems.length) {
          that[checked ? "checkAll" : "uncheckAll"]();
        } else {
          that.$selectGroups.prop("checked", checked);
          $items.prop("checked", checked);
          (_b = (_a = that.options)[checked ? "onCheckAll" : "onUncheckAll"]) == null ? void 0 : _b.call(_a);
          that.update();
        }
      });
      this.$selectGroups.off("click").on("click", function() {
        var _a, _b;
        const group = $(this).parent().attr("data-group"), $items = that.$selectItems.filter(isVisible), $children = $items.filter(`[data-group="${group}"]`), checked = $children.length !== $children.filter(":checked").length;
        $children.prop("checked", checked);
        that.updateSelectAll();
        that.update();
        (_b = (_a = that.options).onOptgroupClick) == null ? void 0 : _b.call(_a, {
          label: $(this).parent().text(),
          checked,
          children: $children.get(),
          instance: that
        });
      });
      this.$selectItems.off("click").on("click", function() {
        var _a, _b;
        that.updateSelectAll();
        that.update();
        that.updateOptGroupSelect();
        (_b = (_a = that.options).onClick) == null ? void 0 : _b.call(_a, {
          label: $(this).parent().text(),
          value: $(this).val(),
          checked: $(this).prop("checked"),
          instance: that
        });
        if (that.options.single && that.options.isOpen && !that.options.keepOpen) {
          that.close();
        }
        if (that.options.single) {
          const clickedVal = $(this).val();
          that.$selectItems.filter(function() {
            return $(this).val() !== clickedVal;
          }).each(function() {
            $(this).prop("checked", false);
          });
          that.update();
        }
      });
    }
    open() {
      var _a, _b, _c;
      if (this.$choice.hasClass("disabled")) {
        return;
      }
      this.options.isOpen = true;
      this.$choice.find("div").addClass("open");
      this.$drop.show();
      this.$selectAll.parent().show();
      this.$noResults.hide();
      if (!this.$el.children().length) {
        this.$selectAll.parent().hide();
        this.$noResults.show();
      }
      if (this.options.filter) {
        (_a = this.$searchInput.val("")[0]) == null ? void 0 : _a.focus();
        this.filter();
      }
      (_c = (_b = this.options).onOpen) == null ? void 0 : _c.call(_b);
    }
    close() {
      var _a, _b;
      this.options.isOpen = false;
      this.$choice.find("div").removeClass("open");
      this.$drop.hide();
      (_b = (_a = this.options).onClose) == null ? void 0 : _b.call(_a);
    }
    animateMethod(method) {
      const methods = {
        show: { fade: "fadeIn", slide: "slideDown" },
        hide: { fade: "fadeOut", slide: "slideUp" }
      };
      return methods[method][this.options.animate] || method;
    }
    update(isInit) {
      const selects = this.options.displayValues ? this.getSelects() : this.getSelects("text"), $span = this.$choice.find("span"), sl = selects.length;
      this.$choice.toggleClass("selected", sl > 0);
      if (sl === 0) {
        $span.addClass("placeholder").html(this.options.placeholder);
      } else if (this.options.allSelected && sl === this.$selectItems.length + this.$disableItems.length) {
        $span.removeClass("placeholder").html(this.options.allSelected);
      } else if (this.options.ellipsis && sl > this.options.minimumCountSelected) {
        $span.removeClass("placeholder").text(selects.slice(0, this.options.minimumCountSelected).join(this.options.delimiter) + "...");
      } else if (this.options.countSelected && sl > this.options.minimumCountSelected) {
        $span.removeClass("placeholder").html(
          this.options.countSelected.replace("#", String(selects.length)).replace("%", String(this.$selectItems.length + this.$disableItems.length))
        );
      } else {
        $span.removeClass("placeholder").text(selects.join(this.options.delimiter));
      }
      if (this.options.addTitle) {
        $span.prop("title", this.getSelects("text"));
      }
      this.$el.val(this.getSelects()).trigger("change");
      this.$drop.find("li").removeClass("selected");
      this.$drop.find(`input[${this.selectItemName}]:checked`).each(function() {
        $(this).parents("li").first().addClass("selected");
      });
      if (!isInit) {
        this.$el.trigger("change");
      }
    }
    updateSelectAll(isInit) {
      var _a, _b;
      let $items = this.$selectItems;
      if (!isInit) {
        $items = $items.filter(isVisible);
      }
      this.$selectAll.prop("checked", $items.length && $items.length === $items.filter(":checked").length);
      if (!isInit && this.$selectAll.prop("checked")) {
        (_b = (_a = this.options).onCheckAll) == null ? void 0 : _b.call(_a);
      }
    }
    updateOptGroupSelect() {
      const $items = this.$selectItems.filter(isVisible);
      $.each(this.$selectGroups, function(_i, val) {
        const group = $(val).parent().attr("data-group"), $children = $items.filter(`[data-group="${group}"]`);
        $(val).prop("checked", $children.length && $children.length === $children.filter(":checked").length);
      });
    }
    getSelects(type) {
      const that = this, values = [];
      let texts = [];
      this.$drop.find(`input[${this.selectItemName}]:checked`).each(function() {
        texts.push($(this).parents("li").first().text());
        values.push($(this).val());
      });
      if (type === "text" && this.$selectGroups.length) {
        texts = [];
        this.$selectGroups.each(function() {
          const html = [], text = $(this).parent().text().trim(), group = $(this).parent().data("group"), $children = that.$drop.find(`[${that.selectItemName}][data-group="${group}"]`), $selected = $children.filter(":checked");
          if (!$selected.length) {
            return;
          }
          html.push("[", text);
          if ($children.length > $selected.length) {
            const list = [];
            $selected.each(function() {
              list.push($(this).parent().text());
            });
            html.push(": " + list.join(", "));
          }
          html.push("]");
          texts.push(html.join(""));
        });
      }
      return type === "text" ? texts : values;
    }
    setSelects(values) {
      const that = this;
      this.$selectItems.prop("checked", false);
      $.each(values, function(_i, value) {
        that.$selectItems.filter(`[value="${value}"]`).prop("checked", true);
      });
      this.$selectAll.prop(
        "checked",
        this.$selectItems.length === this.$selectItems.filter(":checked").length
      );
      $.each(that.$selectGroups, function(_i, val) {
        const group = $(val).parent().attr("data-group"), $children = that.$selectItems.filter(`[data-group="${group}"]`);
        $(val).prop("checked", $children.length && $children.length === $children.filter(":checked").length);
      });
      this.update();
    }
    enable() {
      this.$choice.removeClass("disabled");
    }
    disable() {
      this.$choice.addClass("disabled");
    }
    checkAll() {
      var _a, _b;
      this.$selectItems.prop("checked", true);
      this.$selectGroups.prop("checked", true);
      this.$selectAll.prop("checked", true);
      this.update();
      (_b = (_a = this.options).onCheckAll) == null ? void 0 : _b.call(_a);
    }
    uncheckAll() {
      var _a, _b;
      this.$selectItems.prop("checked", false);
      this.$selectGroups.prop("checked", false);
      this.$selectAll.prop("checked", false);
      this.update();
      (_b = (_a = this.options).onUncheckAll) == null ? void 0 : _b.call(_a);
    }
    focus() {
      var _a, _b, _c;
      (_a = this.$choice[0]) == null ? void 0 : _a.focus();
      (_c = (_b = this.options).onFocus) == null ? void 0 : _c.call(_b);
    }
    blur() {
      var _a, _b;
      this.$choice.trigger("blur");
      (_b = (_a = this.options).onBlur) == null ? void 0 : _b.call(_a);
    }
    refresh() {
      this.init();
    }
    filter() {
      var _a, _b;
      const that = this, text = this.$searchInput.val().trim().toLowerCase();
      if (text.length === 0) {
        this.$selectAll.parent().show();
        this.$selectItems.parent().show();
        this.$disableItems.parent().show();
        this.$selectGroups.parent().show();
        this.$noResults.hide();
      } else {
        this.$selectItems.each(function() {
          const $parent = $(this).parent();
          $parent[$parent.text().toLowerCase().includes(text) ? "show" : "hide"]();
        });
        this.$disableItems.parent().hide();
        this.$selectGroups.each(function() {
          const $parent = $(this).parent(), group = $parent.attr("data-group"), $items = that.$selectItems.filter(isVisible);
          $parent[$items.filter(`[data-group="${group}"]`).length ? "show" : "hide"]();
        });
        if (this.$selectItems.parent().filter(isVisible).length) {
          this.$selectAll.parent().show();
          this.$noResults.hide();
        } else {
          this.$selectAll.parent().hide();
          this.$noResults.show();
        }
      }
      this.updateOptGroupSelect();
      this.updateSelectAll();
      (_b = (_a = this.options).onFilter) == null ? void 0 : _b.call(_a, text);
    }
  }
  $.fn.multipleSelect = function() {
    const option2 = arguments[0], args = arguments;
    let value;
    this.each(function() {
      let data = this["multipleSelect"];
      const $this = $(this), options = {
        ...$.fn.multipleSelectDefaults,
        ...typeof option2 === "object" ? option2 : {}
      };
      if (!data) {
        data = new MultipleSelectState($this, options);
        this["multipleSelect"] = data;
      }
      if (typeof option2 === "string") {
        value = data[option2](args[1]);
      } else {
        data.init();
        if (typeof args[1] === "string") {
          value = data[args[1]].apply(data, [].slice.call(args, 2));
        }
      }
    });
    return typeof value !== "undefined" ? value : this;
  };
  $.fn.multipleSelectDefaults = {
    name: "",
    isOpen: false,
    placeholder: "",
    selectAll: true,
    selectAllDelimiter: ["[", "]"],
    minimumCountSelected: 3,
    ellipsis: false,
    multiple: false,
    multipleWidth: 80,
    single: false,
    filter: false,
    width: void 0,
    dropWidth: void 0,
    maxHeight: void 0,
    position: "bottom",
    keepOpen: false,
    animate: "none",
    displayValues: false,
    delimiter: ", ",
    addTitle: false,
    filterAcceptOnEnter: false,
    hideOptgroupCheckboxes: false,
    selectAllText: "Select all",
    allSelected: "All selected",
    countSelected: "# of % selected",
    noMatchesFound: "No matches found",
    styler() {
      return null;
    },
    textTemplate($elm) {
      return $elm.text();
    },
    labelTemplate($elm) {
      return $elm.attr("label");
    },
    onOpen() {
      return false;
    },
    onClose() {
      return false;
    },
    onCheckAll() {
      return false;
    },
    onUncheckAll() {
      return false;
    },
    onFocus() {
      return false;
    },
    onBlur() {
      return false;
    },
    onOptgroupClick() {
      return false;
    },
    onClick() {
      return false;
    },
    onFilter() {
      return false;
    }
  };
};

// ../insight/src/axis.ts
var selectData = (onClick, getValue) => ({
  hook: {
    insert: (vnode) => $(vnode.elm).multipleSelect({ width: "var(---drop-menu-width)", single: true, onClick }),
    update: (vnode) => $(vnode.elm).multipleSelect("setSelects", [getValue()])
  }
});
var option = (ctrl, item, axis) => h(
  "option",
  {
    attrs: {
      title: item.description.replace(/<a[^>]*>[^>]+<\/a[^>]*>/, ""),
      value: item.key,
      selected: ctrl.vm[axis].key === item.key
      // was commented out:
      // if axis === 'metric'
      // disabled: !ctrl.validCombination(ctrl.vm.dimension, item),
      // if axis === 'dimension'
      // disabled: !ctrl.validCombination(item, ctrl.vm.metric),
    }
  },
  item.name
);
function axis_default(ctrl, attrs = null) {
  return h("div.axis-form", attrs, [
    h(
      "select.ms.metric",
      selectData(
        (v) => ctrl.setMetric(v.value),
        () => ctrl.vm.metric.key
      ),
      ctrl.ui.metricCategs.map(
        (categ) => optgroup(categ.name)(categ.items.map((item) => option(ctrl, item, "metric")))
      )
    ),
    h("span.by", "by"),
    h(
      "select.ms.dimension",
      selectData(
        (v) => ctrl.setDimension(v.value),
        () => ctrl.vm.dimension.key
      ),
      ctrl.ui.dimensionCategs.map(
        (categ) => optgroup(categ.name)(
          categ.items.map((item) => item.key !== "period" ? option(ctrl, item, "dimension") : void 0)
        )
      )
    )
  ]);
}

// ../insight/src/boards.ts
var miniGame = (game) => h("a", { attrs: { key: game.id, href: `/${game.id}/${game.color}` } }, [
  h("span.mini-board.is2d", {
    attrs: { "data-state": `${game.fen},${game.color},${game.lastMove}` },
    hook: {
      ...onInsert(initMiniBoard),
      update: (vnode) => initMiniBoard(vnode.elm)
    }
  }),
  h("span.vstext", [
    h("span.vstext__pl", [
      h("strong", game.user1.name),
      h("br"),
      game.user1.title ? game.user1.title + " " : "",
      h("rating", game.user1.rating)
    ]),
    h("span.vstext__op", [
      h("strong", game.user2.name),
      h("br"),
      h("rating", game.user2.rating),
      game.user2.title ? " " + game.user2.title : ""
    ])
  ])
]);
function boards_default(ctrl, attrs = null) {
  if (!ctrl.vm.answer || ctrl.vm.answer.games.length === 0) return void 0;
  return h("div.game-sample.box.hscroll", attrs, [
    h("div.top", "Some of the games used to generate this insight"),
    h("div.boards", ctrl.vm.answer.games.map(miniGame))
  ]);
}

// ../insight/src/table.ts
function formatNumber(dt, n) {
  const percent = dt === "percent";
  const opts = {
    style: percent ? "percent" : "decimal",
    maximumFractionDigits: percent ? 1 : 2
  };
  return new Intl.NumberFormat("en-US", opts).format(n / (percent ? 100 : 1));
}
var formatSerieName = (dt, n) => dt === "date" ? new Date(n * 1e3).toLocaleDateString() : n;
function vert(ctrl, attrs = null) {
  const answer = ctrl.vm.answer;
  if (!answer || answer.series.length === 0) return null;
  return div(
    ".hscroll",
    attrs,
    table(".slist", [
      thead(
        tr([th(answer.xAxis.name), answer.series.map((serie) => th(serie.name)), th(answer.sizeYaxis.name)])
      ),
      tbody(
        answer.xAxis.categories.map(
          (c, i) => tr([
            th(formatSerieName(answer.xAxis.dataType, c)),
            answer.series.map((serie) => td(".data", formatNumber(serie.dataType, serie.data[i]))),
            td(".size", formatNumber(answer.sizeSerie.dataType, answer.sizeSerie.data[i]))
          ])
        )
      )
    ])
  );
}

// ../insight/src/chart.ts
Chart.register(BarController, CategoryScale, LinearScale, BarElement, plugin_tooltip, plugin_legend, plugin);
Chart.defaults.font = fontFamily();
var light = currentTheme() === "light";
var resultColors = {
  Victory: "#759900",
  Draw: "#007599",
  Defeat: "#dc322f"
};
var sizeColor = "rgb(120 120 120 / 0.2)";
var tooltipFontColor = light ? "#4d4d4d" : "#cccccc";
function insightChart(el, data) {
  const config = {
    type: "bar",
    data: {
      labels: labelBuilder(data),
      datasets: datasetBuilder(data)
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: {
        mode: "index",
        intersect: false
      },
      plugins: {
        legend: {
          labels: { color: tooltipFontColor },
          display: true,
          position: "bottom"
        },
        tooltip: {
          filter: (tooltipItem) => tooltipItem.raw !== 0,
          itemSort: (a, b) => b.datasetIndex - a.datasetIndex,
          backgroundColor: tooltipBgColor,
          borderColor: gridColor,
          borderWidth: 1,
          titleFont: fontFamily(14, "bold"),
          titleColor: tooltipFontColor,
          bodyFont: fontFamily(13),
          bodyColor: tooltipFontColor
        }
      },
      scales: scaleBuilder(data)
    }
  };
  const chart2 = new Chart(el, config);
  chart2.updateData = (d) => {
    chart2.data.datasets = datasetBuilder(d);
    chart2.options.scales = scaleBuilder(d);
    chart2.data.labels = labelBuilder(d);
    chart2.update();
  };
  return chart2;
}
function datasetBuilder(d) {
  const color = (i, name, stack) => {
    if (d.valueYaxis.name === "Game result") return resultColors[name];
    else if (!stack && light) return "#7cb5ec";
    return colorSeries[i % colorSeries.length];
  };
  return [
    ...d.series.map(
      (serie, i) => barBuilder(serie, "y1", color(i, serie.name, !!serie.stack), { stack: serie.stack })
    ),
    barBuilder(d.sizeSerie, "y2", sizeColor)
  ];
}
function barBuilder(serie, id, color, opts) {
  const percent = serie.dataType === "percent";
  return {
    label: serie.name,
    data: serie.data.map((nb) => nb / (serie.dataType === "percent" ? 100 : 1)),
    borderWidth: 1.5,
    yAxisID: id,
    backgroundColor: color,
    borderColor: "#4a4a4a",
    stack: opts == null ? void 0 : opts.stack,
    minBarLength: !percent ? 5 : void 0,
    datalabels: id === "y2" ? { display: false } : {
      color: tooltipFontColor,
      textStrokeColor: tooltipBgColor,
      textShadowBlur: 10,
      textShadowColor: tooltipBgColor,
      textStrokeWidth: 1.2,
      font: fontFamily(12, "bold"),
      formatter: (val) => val === 0 && percent ? "" : formatNumber(serie.dataType, val * (percent ? 100 : 1))
    }
  };
}
function labelBuilder(d) {
  return d.xAxis.categories.map(
    (ts) => d.xAxis.dataType === "date" ? new Date(ts * 1e3).toLocaleDateString() : ts
  );
}
function scaleBuilder(d) {
  const stacked = !!d.series[0].stack;
  const percent = stacked || d.valueYaxis.dataType === "percent";
  return {
    x: {
      type: "category",
      ticks: { color: tooltipFontColor },
      grid: {
        color: gridColor
      }
    },
    y1: {
      max: percent ? 1 : void 0,
      grid: {
        color: gridColor
      },
      ticks: {
        color: tooltipFontColor,
        format: {
          style: percent ? "percent" : void 0,
          maximumFractionDigits: percent ? 1 : 2
        }
      },
      title: {
        color: tooltipFontColor,
        display: true,
        text: d.valueYaxis.name
      },
      stacked
    },
    y2: {
      position: "right",
      ticks: { color: tooltipFontColor },
      grid: { display: false },
      title: {
        color: tooltipFontColor,
        display: true,
        text: d.sizeSerie.name
      },
      beginAtZero: true
    }
  };
}
function empty(txt) {
  return h("div.chart.empty", [icon(licon.Target)(), txt]);
}
var chart;
function chartHook(vnode, ctrl) {
  const el = vnode.elm;
  if (ctrl.vm.loading || !ctrl.vm.answer) {
    $(el).html(spinnerHtml);
  } else {
    if (!maybeChart(el)) chart = insightChart(el, ctrl.vm.answer);
    else if (chart) chart.updateData(ctrl.vm.answer);
  }
}
function chart_default(ctrl) {
  var _a;
  if (!ctrl.validCombinationCurrent()) return empty("Invalid dimension/metric combination");
  if (!((_a = ctrl.vm.answer) == null ? void 0 : _a.series.length)) return empty("No data. Try widening or clearing the filters.");
  return h(
    "div.chart",
    h("canvas.chart", {
      hook: {
        insert: (vnode) => chartHook(vnode, ctrl),
        update: (_oldVnode, newVnode) => chartHook(newVnode, ctrl)
      }
    })
  );
}

// ../insight/src/filters.ts
var select = (ctrl) => (dimension) => {
  if (dimension.key === "date") return void 0;
  const single = dimension.key === "period";
  return h(
    "select",
    {
      attrs: { multiple: true },
      hook: {
        ...onInsert(
          (el) => $(el).multipleSelect({
            placeholder: dimension.name,
            width: "100%",
            selectAll: false,
            filter: dimension.key === "opening",
            single,
            minimumCountSelected: 10,
            onClick: (view2) => ctrl.setFilter(dimension.key, single ? [view2.value] : $(el).multipleSelect("getSelects"))
          })
        ),
        postpatch: (_oldVnode, vnode) => {
          if (Object.keys(ctrl.vm.filters).length === 0) $(vnode.elm).multipleSelect("uncheckAll");
        }
      }
    },
    dimension.values.map(
      (value) => {
        var _a;
        return h(
          "option",
          { attrs: { value: value.key, selected: (_a = ctrl.vm.filters[dimension.key]) == null ? void 0 : _a.includes(value.key) } },
          value.name
        );
      }
    )
  );
};
function filters_default(ctrl) {
  return h(
    "div.filters",
    h(
      "div.items",
      ctrl.ui.dimensionCategs.map(
        (categ) => h("div.categ.box", [h("div.top", categ.name), ...categ.items.map(select(ctrl))])
      )
    )
  );
}

// ../insight/src/help.ts
function help_default(ctrl) {
  return h("div.help.box", [
    h("div.top", "Definitions"),
    h(
      "div.content",
      ["metric", "dimension"].map((type) => {
        const data = ctrl.vm[type];
        return h("section." + type, [h("h3", data.name), h("p", data.description)]);
      })
    )
  ]);
}

// ../insight/src/info.ts
var shareStates = ["nobody", "friends only", "everybody"];
function tutor() {
  return h(
    "a.tutor-link",
    {
      attrs: { href: "/tutor" }
    },
    [
      h("img", {
        attrs: { src: site.asset.flairSrc("nature.octopus-howard") }
      }),
      h("span", [h("strong", "Try out Tutor"), h("em", "Compare to your peers!")])
    ]
  );
}
function info(ctrl) {
  const shareText = "Shared with " + shareStates[ctrl.user.shareId] + ".";
  return h("div.info.box", [
    h("div.top", userLink(ctrl.user)),
    h("div.content", [
      h("p", ["Insights over ", h("strong", numberFormat(ctrl.user.nbGames)), " rated games."]),
      h(
        "p.share",
        ctrl.own ? h(
          "a",
          {
            attrs: {
              href: "/account/preferences/privacy#shareYourInsightsData",
              target: "_blank"
            }
          },
          shareText
        ) : shareText
      )
    ]),
    h(
      "div.refresh",
      ctrl.env.user.stale ? h("div.insight-stale", [
        h("p", "There are new games to learn from!"),
        h(
          "form.insight-refresh",
          {
            attrs: {
              action: `/insights/refresh/${ctrl.env.user.id}`,
              method: "post"
            },
            hook: onInsert(registerFormHandler)
          },
          [
            h("button.button.button-thin", "Update insights"),
            h(
              "div.crunching.none",
              {
                hook: onInsert((el) => el.insertAdjacentHTML("afterbegin", spinnerHtml))
              },
              [h("br"), h("p", h("strong", "Now crunching data just for you!"))]
            )
          ]
        )
      ]) : null
    )
  ]);
}

// ../insight/src/presets.ts
function presets_default(ctrl) {
  return h(
    "div.box.presets",
    (ctrl.ui.asMod ? modPresets : basePresets).map(
      (p) => h(
        "a.preset.text",
        {
          class: { active: ctrl.makeUrl(p.dimension, p.metric, p.filters) === ctrl.makeCurrentUrl() },
          attrs: dataIcon(licon.Target),
          hook: bind("click", () => ctrl.setQuestion(p))
        },
        p.name
      )
    )
  );
}
var basePresets = [
  {
    name: "Do I gain more rating points against weaker or stronger opponents?",
    dimension: "opponentStrength",
    metric: "ratingDiff",
    filters: {}
  },
  {
    name: "How quickly do I move each piece in bullet and blitz games?",
    dimension: "piece",
    metric: "movetime",
    filters: {
      variant: ["bullet", "blitz"]
    }
  },
  {
    name: "What is the Win-Rate of my favourite openings as white?",
    dimension: "openingVariation",
    metric: "result",
    filters: {
      variant: ["bullet", "blitz", "rapid", "classical", "correspondence"],
      color: ["white"]
    }
  },
  {
    name: "How often do I punish blunders made by my opponent during each game phase?",
    dimension: "phase",
    metric: "awareness",
    filters: {}
  },
  {
    name: "Do I gain rating when I don't castle kingside?",
    dimension: "myCastling",
    metric: "ratingDiff",
    filters: {
      myCastling: ["2", "3"]
    }
  },
  {
    name: "When I trade queens, how do games end?",
    dimension: "queenTrade",
    metric: "result",
    filters: {
      queenTrade: ["true"]
    }
  },
  {
    name: "What is the average rating of my opponents across each variant?",
    dimension: "variant",
    metric: "opponentRating",
    filters: {}
  },
  {
    name: "How well do I move each piece in the opening?",
    dimension: "piece",
    metric: "accuracy",
    filters: {
      phase: ["1"]
    }
  }
];
var modPresets = [
  {
    name: "ACPL by date",
    dimension: "date",
    metric: "acpl",
    filters: {}
  },
  {
    name: "Blurs by date",
    dimension: "date",
    metric: "blurs",
    filters: {}
  },
  {
    name: "ACPL by blur",
    dimension: "blur",
    metric: "acpl",
    filters: {}
  },
  {
    name: "Blurs by result",
    dimension: "result",
    metric: "blurs",
    filters: {}
  },
  {
    name: "ACPL by time variance",
    dimension: "timeVariance",
    metric: "acpl",
    filters: {}
  },
  {
    name: "Blur by time variance",
    dimension: "timeVariance",
    metric: "blurs",
    filters: {}
  },
  {
    name: "Time variance by date",
    dimension: "date",
    metric: "timeVariance",
    filters: {}
  }
];

// ../insight/src/view.ts
var forceRender = false;
function view(ctrl) {
  window.onresize = debounce(() => {
    forceRender = true;
    ctrl.redraw();
  }, 33);
  if (isLandscapeLayout()) {
    ctrl.vm.view = "combined";
    return landscapeView(ctrl);
  } else if (ctrl.vm.view === "combined") {
    ctrl.vm.view = "insights";
  }
  return portraitView(ctrl);
}
var cacheKey = (ctrl) => {
  var _a;
  if (forceRender) {
    forceRender = false;
    return Date.now().toString();
  }
  const q = (_a = ctrl.vm.answer) == null ? void 0 : _a.question;
  return q ? ctrl.makeUrl(q.dimension, q.metric, q.filters) : ctrl.vm.broken;
};
var renderMain = (ctrl, _cacheKey) => {
  if (!ctrl.vm.answer) {
    return hl("div");
  } else if (ctrl.vm.broken) {
    return hl("div.broken", [
      icon(licon.DiscBig)(),
      "Insights are unavailable.",
      hl("br"),
      "Please try again later."
    ]);
  }
  const sizer = widthStyle(mainW());
  return hl("div", sizer, [chart_default(ctrl), vert(ctrl, sizer), boards_default(ctrl, sizer)]);
};
var panelTabData = (ctrl, panel) => ({
  class: { active: ctrl.vm.panel === panel },
  attrs: { "data-panel": panel },
  hook: bind("click", () => ctrl.setPanel(panel))
});
var viewTabData = (ctrl, view2) => ({
  class: { active: ctrl.vm.view === view2 },
  hook: bind("click", () => ctrl.setView(view2))
});
function header(ctrl) {
  return hl("header", widthStyle(mainW()), [
    isAtLeastXSmall(mainW()) ? hl("h2.text", { attrs: dataIcon(licon.Target) }, "Chess Insights") : isAtLeastXXSmall(mainW()) ? hl("h2.text", { attrs: dataIcon(licon.Target) }, "Insights") : mainW() >= 460 && hl("h2.text", "Insights"),
    axis_default(ctrl, mainW() < 460 ? { attrs: { style: "justify-content: space-evenly;" } } : null)
  ]);
}
function landscapeView(ctrl) {
  return hl("main#insight", containerStyle(), [
    hl("div", { attrs: { class: ctrl.vm.loading ? "loading" : "ready" } }, [
      hl("div", widthStyle(sideW()), [
        info(ctrl),
        tutor(),
        hl("div.panel-tabs", [
          hl("a.tab.preset", panelTabData(ctrl, "preset"), "Presets"),
          hl("a.tab.filter", panelTabData(ctrl, "filter"), "Filters"),
          !!Object.keys(ctrl.vm.filters).length && clearBtn(ctrl)
        ]),
        ctrl.vm.panel === "filter" && filters_default(ctrl),
        ctrl.vm.panel === "preset" && presets_default(ctrl),
        help_default(ctrl)
      ]),
      spacer(),
      hl("div", widthStyle(mainW()), [
        header(ctrl),
        thunk("div.insight__main.box", renderMain, [ctrl, cacheKey(ctrl)])
      ])
    ])
  ]);
}
function portraitView(ctrl) {
  return hl("main#insight", containerStyle(), [
    hl("div.view-tabs", [
      hl("div.tab", viewTabData(ctrl, "presets"), "Presets"),
      hl("div.tab", viewTabData(ctrl, "filters"), "Filters"),
      hl("div.tab", viewTabData(ctrl, "insights"), "Insights")
    ]),
    hl(
      "div",
      { attrs: { class: ctrl.vm.loading ? "loading" : "ready", style: "display: block" } },
      ctrl.vm.view === "insights" ? [header(ctrl), thunk("div.insight__main.box", renderMain, [ctrl, cacheKey(ctrl)])] : hl("div.left-side", [
        info(ctrl),
        ctrl.vm.view === "filters" && clearBtn(ctrl),
        ctrl.vm.view === "presets" ? presets_default(ctrl) : filters_default(ctrl)
      ])
    )
  ]);
}
function clearBtn(ctrl) {
  const btn = () => hl(
    "a.clear",
    {
      attrs: { title: "Clear all filters", "data-icon": licon.X },
      hook: bind("click", ctrl.clearFilters.bind(ctrl))
    },
    isLandscapeLayout() ? "CLEAR" : "CLEAR FILTERS"
  );
  return isLandscapeLayout() ? btn() : hl("div.center-clear", btn());
}
function interpolateBetween(t, p1, p2) {
  if (t < p1.x || p2.x <= p1.x) return p1.y;
  else if (t > p2.x) return p2.y;
  else return Math.floor(p1.y + (p2.y - p1.y) / (p2.x - p1.x) * (t - p1.x));
}
var totalW = () => Math.min(1300, window.innerWidth);
var vw = () => Math.floor(totalW() * 0.01);
var availW = () => totalW() - (isAtLeastSmall() ? 2 * vw() : 0);
var sideW = () => (
  // width of the side in landscape layout, no side in portrait
  isLandscapeLayout() ? interpolateBetween(totalW(), { x: 400, y: 160 }, { x: 800, y: 280 }) : 0
);
var gapW = () => (
  // width of the spacer between side & main in landscape, no gap in portrait
  isLandscapeLayout() ? interpolateBetween(totalW(), { x: 480, y: vw() }, { x: 800, y: 2 * vw() }) : 0
);
var mainW = () => availW() - (!isLandscapeLayout() ? 0 : sideW() + gapW());
var spacer = () => isLandscapeLayout() ? hl("span", widthStyle(gapW())) : null;
var widthStyle = (width) => ({ attrs: { style: `width: ${width}px;` } });
var containerStyle = () => ({
  attrs: {
    // i would encrypt this if i could.  just look away
    style: ` width: ${availW()}px; ---header-height: ${interpolateBetween(mainW(), { x: 500, y: 30 }, { x: 800, y: 60 })}px; ---drop-menu-width: ${interpolateBetween(mainW(), { x: 320, y: 154 }, { x: 800, y: 200 })}px; ---chart-height: ${Math.max(300, Math.min(600, window.innerHeight - 100))}px;`
  }
});

// ../insight/src/insight.ts
var patch = init([classModule, attributesModule]);
registerMultipleSelect();
function initModule(opts) {
  const element = document.getElementById("insight");
  const ctrl = new ctrl_default(opts, element, redraw);
  const blueprint = view(ctrl);
  let vnode = patch(element, blueprint);
  ctrl.askQuestion();
  function redraw() {
    vnode = patch(vnode, view(ctrl));
  }
  return ctrl;
}
export {
  initModule
};
//# sourceMappingURL=insight.ONSADJQK.js.map
