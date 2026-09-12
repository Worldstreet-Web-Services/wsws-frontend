import {
  __commonJS
} from "./lib.KO2KTNGK.js";

// ../../../../../node_modules/.pnpm/eventemitter3@5.0.4/node_modules/eventemitter3/index.js
var require_eventemitter3 = __commonJS({
  "../../../../../node_modules/.pnpm/eventemitter3@5.0.4/node_modules/eventemitter3/index.js"(exports, module) {
    "use strict";
    var has = Object.prototype.hasOwnProperty;
    var prefix = "~";
    function Events() {
    }
    if (Object.create) {
      Events.prototype = /* @__PURE__ */ Object.create(null);
      if (!new Events().__proto__) prefix = false;
    }
    function EE(fn, context, once) {
      this.fn = fn;
      this.context = context;
      this.once = once || false;
    }
    function addListener(emitter, event, fn, context, once) {
      if (typeof fn !== "function") {
        throw new TypeError("The listener must be a function");
      }
      var listener = new EE(fn, context || emitter, once), evt = prefix ? prefix + event : event;
      if (!emitter._events[evt]) emitter._events[evt] = listener, emitter._eventsCount++;
      else if (!emitter._events[evt].fn) emitter._events[evt].push(listener);
      else emitter._events[evt] = [emitter._events[evt], listener];
      return emitter;
    }
    function clearEvent(emitter, evt) {
      if (--emitter._eventsCount === 0) emitter._events = new Events();
      else delete emitter._events[evt];
    }
    function EventEmitter() {
      this._events = new Events();
      this._eventsCount = 0;
    }
    EventEmitter.prototype.eventNames = function eventNames() {
      var names = [], events, name;
      if (this._eventsCount === 0) return names;
      for (name in events = this._events) {
        if (has.call(events, name)) names.push(prefix ? name.slice(1) : name);
      }
      if (Object.getOwnPropertySymbols) {
        return names.concat(Object.getOwnPropertySymbols(events));
      }
      return names;
    };
    EventEmitter.prototype.listeners = function listeners(event) {
      var evt = prefix ? prefix + event : event, handlers = this._events[evt];
      if (!handlers) return [];
      if (handlers.fn) return [handlers.fn];
      for (var i = 0, l = handlers.length, ee = new Array(l); i < l; i++) {
        ee[i] = handlers[i].fn;
      }
      return ee;
    };
    EventEmitter.prototype.listenerCount = function listenerCount(event) {
      var evt = prefix ? prefix + event : event, listeners = this._events[evt];
      if (!listeners) return 0;
      if (listeners.fn) return 1;
      return listeners.length;
    };
    EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
      var evt = prefix ? prefix + event : event;
      if (!this._events[evt]) return false;
      var listeners = this._events[evt], len = arguments.length, args, i;
      if (listeners.fn) {
        if (listeners.once) this.removeListener(event, listeners.fn, void 0, true);
        switch (len) {
          case 1:
            return listeners.fn.call(listeners.context), true;
          case 2:
            return listeners.fn.call(listeners.context, a1), true;
          case 3:
            return listeners.fn.call(listeners.context, a1, a2), true;
          case 4:
            return listeners.fn.call(listeners.context, a1, a2, a3), true;
          case 5:
            return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
          case 6:
            return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
        }
        for (i = 1, args = new Array(len - 1); i < len; i++) {
          args[i - 1] = arguments[i];
        }
        listeners.fn.apply(listeners.context, args);
      } else {
        var length = listeners.length, j;
        for (i = 0; i < length; i++) {
          if (listeners[i].once) this.removeListener(event, listeners[i].fn, void 0, true);
          switch (len) {
            case 1:
              listeners[i].fn.call(listeners[i].context);
              break;
            case 2:
              listeners[i].fn.call(listeners[i].context, a1);
              break;
            case 3:
              listeners[i].fn.call(listeners[i].context, a1, a2);
              break;
            case 4:
              listeners[i].fn.call(listeners[i].context, a1, a2, a3);
              break;
            default:
              if (!args) for (j = 1, args = new Array(len - 1); j < len; j++) {
                args[j - 1] = arguments[j];
              }
              listeners[i].fn.apply(listeners[i].context, args);
          }
        }
      }
      return true;
    };
    EventEmitter.prototype.on = function on(event, fn, context) {
      return addListener(this, event, fn, context, false);
    };
    EventEmitter.prototype.once = function once(event, fn, context) {
      return addListener(this, event, fn, context, true);
    };
    EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
      var evt = prefix ? prefix + event : event;
      if (!this._events[evt]) return this;
      if (!fn) {
        clearEvent(this, evt);
        return this;
      }
      var listeners = this._events[evt];
      if (listeners.fn) {
        if (listeners.fn === fn && (!once || listeners.once) && (!context || listeners.context === context)) {
          clearEvent(this, evt);
        }
      } else {
        for (var i = 0, events = [], length = listeners.length; i < length; i++) {
          if (listeners[i].fn !== fn || once && !listeners[i].once || context && listeners[i].context !== context) {
            events.push(listeners[i]);
          }
        }
        if (events.length) this._events[evt] = events.length === 1 ? events[0] : events;
        else clearEvent(this, evt);
      }
      return this;
    };
    EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
      var evt;
      if (event) {
        evt = prefix ? prefix + event : event;
        if (this._events[evt]) clearEvent(this, evt);
      } else {
        this._events = new Events();
        this._eventsCount = 0;
      }
      return this;
    };
    EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
    EventEmitter.prototype.addListener = EventEmitter.prototype.on;
    EventEmitter.prefixed = prefix;
    EventEmitter.EventEmitter = EventEmitter;
    if ("undefined" !== typeof module) {
      module.exports = EventEmitter;
    }
  }
});

// ../../../../../node_modules/.pnpm/@textcomplete+core@0.1.13/node_modules/@textcomplete/core/dist/SearchResult.js
var require_SearchResult = __commonJS({
  "../../../../../node_modules/.pnpm/@textcomplete+core@0.1.13/node_modules/@textcomplete/core/dist/SearchResult.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SearchResult = void 0;
    var MAIN = /\$&/g;
    var PLACE = /\$(\d)/g;
    var SearchResult = class {
      constructor(data, term, strategy) {
        this.data = data;
        this.term = term;
        this.strategy = strategy;
      }
      getReplacementData(beforeCursor) {
        let result = this.strategy.replace(this.data);
        if (result == null)
          return null;
        let afterCursor = "";
        if (Array.isArray(result)) {
          afterCursor = result[1];
          result = result[0];
        }
        const match = this.strategy.match(beforeCursor);
        if (match == null || match.index == null)
          return null;
        const replacement = result.replace(MAIN, match[0]).replace(PLACE, (_, p) => match[parseInt(p)]);
        return {
          start: match.index,
          end: match.index + match[0].length,
          beforeCursor: replacement,
          afterCursor
        };
      }
      replace(beforeCursor, afterCursor) {
        const replacement = this.getReplacementData(beforeCursor);
        if (replacement === null)
          return;
        afterCursor = replacement.afterCursor + afterCursor;
        return [
          [
            beforeCursor.slice(0, replacement.start),
            replacement.beforeCursor,
            beforeCursor.slice(replacement.end)
          ].join(""),
          afterCursor
        ];
      }
      render() {
        return this.strategy.renderTemplate(this.data, this.term);
      }
      getStrategyId() {
        return this.strategy.getId();
      }
    };
    exports.SearchResult = SearchResult;
  }
});

// ../../../../../node_modules/.pnpm/@textcomplete+core@0.1.13/node_modules/@textcomplete/core/dist/Strategy.js
var require_Strategy = __commonJS({
  "../../../../../node_modules/.pnpm/@textcomplete+core@0.1.13/node_modules/@textcomplete/core/dist/Strategy.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Strategy = exports.DEFAULT_INDEX = void 0;
    var SearchResult_1 = require_SearchResult();
    exports.DEFAULT_INDEX = 1;
    var Strategy = class {
      constructor(props) {
        this.props = props;
        this.cache = {};
      }
      destroy() {
        this.cache = {};
        return this;
      }
      replace(data) {
        return this.props.replace(data);
      }
      execute(beforeCursor, callback) {
        var _a;
        const match = this.matchWithContext(beforeCursor);
        if (!match)
          return false;
        const term = match[(_a = this.props.index) !== null && _a !== void 0 ? _a : exports.DEFAULT_INDEX];
        this.search(term, (results) => {
          callback(results.map((result) => new SearchResult_1.SearchResult(result, term, this)));
        }, match);
        return true;
      }
      renderTemplate(data, term) {
        if (this.props.template) {
          return this.props.template(data, term);
        }
        if (typeof data === "string")
          return data;
        throw new Error(`Unexpected render data type: ${typeof data}. Please implement template parameter by yourself`);
      }
      getId() {
        return this.props.id || null;
      }
      match(text) {
        return typeof this.props.match === "function" ? this.props.match(text) : text.match(this.props.match);
      }
      search(term, callback, match) {
        if (this.props.cache) {
          this.searchWithCach(term, callback, match);
        } else {
          this.props.search(term, callback, match);
        }
      }
      matchWithContext(beforeCursor) {
        const context = this.context(beforeCursor);
        if (context === false)
          return null;
        return this.match(context === true ? beforeCursor : context);
      }
      context(beforeCursor) {
        return this.props.context ? this.props.context(beforeCursor) : true;
      }
      searchWithCach(term, callback, match) {
        if (this.cache[term] != null) {
          callback(this.cache[term]);
        } else {
          this.props.search(term, (results) => {
            this.cache[term] = results;
            callback(results);
          }, match);
        }
      }
    };
    exports.Strategy = Strategy;
  }
});

// ../../../../../node_modules/.pnpm/@textcomplete+core@0.1.13/node_modules/@textcomplete/core/dist/Completer.js
var require_Completer = __commonJS({
  "../../../../../node_modules/.pnpm/@textcomplete+core@0.1.13/node_modules/@textcomplete/core/dist/Completer.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Completer = void 0;
    var eventemitter3_1 = require_eventemitter3();
    var Strategy_1 = require_Strategy();
    var Completer = class extends eventemitter3_1.EventEmitter {
      constructor(strategyPropsList) {
        super();
        this.handleQueryResult = (searchResults) => {
          this.emit("hit", { searchResults });
        };
        this.strategies = strategyPropsList.map((p) => new Strategy_1.Strategy(p));
      }
      destroy() {
        this.strategies.forEach((s) => s.destroy());
        return this;
      }
      run(beforeCursor) {
        for (const strategy of this.strategies) {
          const executed = strategy.execute(beforeCursor, this.handleQueryResult);
          if (executed)
            return;
        }
        this.handleQueryResult([]);
      }
    };
    exports.Completer = Completer;
  }
});

// ../../../../../node_modules/.pnpm/@textcomplete+core@0.1.13/node_modules/@textcomplete/core/dist/utils.js
var require_utils = __commonJS({
  "../../../../../node_modules/.pnpm/@textcomplete+core@0.1.13/node_modules/@textcomplete/core/dist/utils.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createCustomEvent = void 0;
    var isCustomEventSupported = typeof window !== "undefined" && !!window.CustomEvent;
    var createCustomEvent = (type, options) => {
      if (isCustomEventSupported)
        return new CustomEvent(type, options);
      const event = document.createEvent("CustomEvent");
      event.initCustomEvent(
        type,
        /* bubbles */
        false,
        (options === null || options === void 0 ? void 0 : options.cancelable) || false,
        (options === null || options === void 0 ? void 0 : options.detail) || void 0
      );
      return event;
    };
    exports.createCustomEvent = createCustomEvent;
  }
});

// ../../../../../node_modules/.pnpm/@textcomplete+core@0.1.13/node_modules/@textcomplete/core/dist/Dropdown.js
var require_Dropdown = __commonJS({
  "../../../../../node_modules/.pnpm/@textcomplete+core@0.1.13/node_modules/@textcomplete/core/dist/Dropdown.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Dropdown = exports.DEFAULT_DROPDOWN_ITEM_ACTIVE_CLASS_NAME = exports.DEFAULT_DROPDOWN_ITEM_CLASS_NAME = exports.DEFAULT_DROPDOWN_CLASS_NAME = exports.DEFAULT_DROPDOWN_PLACEMENT = exports.DEFAULT_DROPDOWN_MAX_COUNT = void 0;
    var eventemitter3_1 = require_eventemitter3();
    var utils_1 = require_utils();
    exports.DEFAULT_DROPDOWN_MAX_COUNT = 10;
    exports.DEFAULT_DROPDOWN_PLACEMENT = "auto";
    exports.DEFAULT_DROPDOWN_CLASS_NAME = "dropdown-menu textcomplete-dropdown";
    exports.DEFAULT_DROPDOWN_ITEM_CLASS_NAME = "textcomplete-item";
    exports.DEFAULT_DROPDOWN_ITEM_ACTIVE_CLASS_NAME = `${exports.DEFAULT_DROPDOWN_ITEM_CLASS_NAME} active`;
    var Dropdown = class _Dropdown extends eventemitter3_1.EventEmitter {
      static create(option) {
        const ul = document.createElement("ul");
        ul.className = option.className || exports.DEFAULT_DROPDOWN_CLASS_NAME;
        Object.assign(ul.style, {
          display: "none",
          position: "absolute",
          zIndex: "1000"
        }, option.style);
        const parent = option.parent || document.body;
        parent === null || parent === void 0 ? void 0 : parent.appendChild(ul);
        return new _Dropdown(ul, option);
      }
      constructor(el, option) {
        super();
        this.el = el;
        this.option = option;
        this.shown = false;
        this.items = [];
        this.activeIndex = null;
      }
      /**
       * Render the given search results. Previous results are cleared.
       *
       * @emits render
       * @emits rendered
       */
      render(searchResults, cursorOffset) {
        const event = (0, utils_1.createCustomEvent)("render", { cancelable: true });
        this.emit("render", event);
        if (event.defaultPrevented)
          return this;
        this.clear();
        if (searchResults.length === 0)
          return this.hide();
        this.items = searchResults.slice(0, this.option.maxCount || exports.DEFAULT_DROPDOWN_MAX_COUNT).map((r, index) => {
          var _a;
          return new DropdownItem(this, index, r, ((_a = this.option) === null || _a === void 0 ? void 0 : _a.item) || {});
        });
        this.setStrategyId(searchResults[0]).renderEdge(searchResults, "header").renderItems().renderEdge(searchResults, "footer").show().setOffset(cursorOffset).activate(0);
        this.emit("rendered", (0, utils_1.createCustomEvent)("rendered"));
        return this;
      }
      destroy() {
        var _a;
        this.clear();
        (_a = this.el.parentNode) === null || _a === void 0 ? void 0 : _a.removeChild(this.el);
        return this;
      }
      /**
       * Select the given item
       *
       * @emits select
       * @emits selected
       */
      select(item) {
        const detail = { searchResult: item.searchResult };
        const event = (0, utils_1.createCustomEvent)("select", { cancelable: true, detail });
        this.emit("select", event);
        if (event.defaultPrevented)
          return this;
        this.hide();
        this.emit("selected", (0, utils_1.createCustomEvent)("selected", { detail }));
        return this;
      }
      /**
       * Show the dropdown element
       *
       * @emits show
       * @emits shown
       */
      show() {
        if (!this.shown) {
          const event = (0, utils_1.createCustomEvent)("show", { cancelable: true });
          this.emit("show", event);
          if (event.defaultPrevented)
            return this;
          this.el.style.display = "block";
          this.shown = true;
          this.emit("shown", (0, utils_1.createCustomEvent)("shown"));
        }
        return this;
      }
      /**
       * Hide the dropdown element
       *
       * @emits hide
       * @emits hidden
       */
      hide() {
        if (this.shown) {
          const event = (0, utils_1.createCustomEvent)("hide", { cancelable: true });
          this.emit("hide", event);
          if (event.defaultPrevented)
            return this;
          this.el.style.display = "none";
          this.shown = false;
          this.clear();
          this.emit("hidden", (0, utils_1.createCustomEvent)("hidden"));
        }
        return this;
      }
      /** Clear search results */
      clear() {
        this.items.forEach((i) => i.destroy());
        this.items = [];
        this.el.innerHTML = "";
        this.activeIndex = null;
        return this;
      }
      up(e) {
        return this.shown ? this.moveActiveItem("prev", e) : this;
      }
      down(e) {
        return this.shown ? this.moveActiveItem("next", e) : this;
      }
      moveActiveItem(direction, e) {
        if (this.activeIndex != null) {
          const activeIndex = direction === "next" ? this.getNextActiveIndex() : this.getPrevActiveIndex();
          if (activeIndex != null) {
            this.activate(activeIndex);
            e.preventDefault();
          }
        }
        return this;
      }
      activate(index) {
        if (this.activeIndex !== index) {
          if (this.activeIndex != null) {
            this.items[this.activeIndex].deactivate();
          }
          this.activeIndex = index;
          this.items[index].activate();
        }
        return this;
      }
      isShown() {
        return this.shown;
      }
      getActiveItem() {
        return this.activeIndex != null ? this.items[this.activeIndex] : null;
      }
      setOffset(cursorOffset) {
        const doc = document.documentElement;
        if (doc) {
          const elementWidth = this.el.offsetWidth;
          if (cursorOffset.left) {
            const browserWidth = this.option.dynamicWidth ? doc.scrollWidth : doc.clientWidth;
            if (cursorOffset.left + elementWidth > browserWidth) {
              cursorOffset.left = browserWidth - elementWidth;
            }
            this.el.style.left = `${cursorOffset.left}px`;
          } else if (cursorOffset.right) {
            if (cursorOffset.right - elementWidth < 0) {
              cursorOffset.right = 0;
            }
            this.el.style.right = `${cursorOffset.right}px`;
          }
          let forceTop = false;
          const placement = this.option.placement || exports.DEFAULT_DROPDOWN_PLACEMENT;
          if (placement === "auto") {
            const dropdownHeight = this.items.length * cursorOffset.lineHeight;
            forceTop = cursorOffset.clientTop != null && cursorOffset.clientTop + dropdownHeight > doc.clientHeight;
          }
          if (placement === "top" || forceTop) {
            this.el.style.bottom = `${doc.clientHeight - cursorOffset.top + cursorOffset.lineHeight}px`;
            this.el.style.top = "auto";
          } else {
            this.el.style.top = `${cursorOffset.top}px`;
            this.el.style.bottom = "auto";
          }
        }
        return this;
      }
      getNextActiveIndex() {
        if (this.activeIndex == null)
          throw new Error();
        return this.activeIndex < this.items.length - 1 ? this.activeIndex + 1 : this.option.rotate ? 0 : null;
      }
      getPrevActiveIndex() {
        if (this.activeIndex == null)
          throw new Error();
        return this.activeIndex !== 0 ? this.activeIndex - 1 : this.option.rotate ? this.items.length - 1 : null;
      }
      renderItems() {
        const fragment = document.createDocumentFragment();
        for (const item of this.items) {
          fragment.appendChild(item.el);
        }
        this.el.appendChild(fragment);
        return this;
      }
      setStrategyId(searchResult) {
        const id = searchResult.getStrategyId();
        if (id)
          this.el.dataset.strategy = id;
        return this;
      }
      renderEdge(searchResults, type) {
        const option = this.option[type];
        const li = document.createElement("li");
        li.className = `textcomplete-${type}`;
        li.innerHTML = typeof option === "function" ? option(searchResults.map((s) => s.data)) : option || "";
        this.el.appendChild(li);
        return this;
      }
    };
    exports.Dropdown = Dropdown;
    var DropdownItem = class {
      constructor(dropdown, index, searchResult, props) {
        this.dropdown = dropdown;
        this.index = index;
        this.searchResult = searchResult;
        this.props = props;
        this.active = false;
        this.onClick = (e) => {
          e.preventDefault();
          this.dropdown.select(this);
        };
        this.className = this.props.className || exports.DEFAULT_DROPDOWN_ITEM_CLASS_NAME;
        this.activeClassName = this.props.activeClassName || exports.DEFAULT_DROPDOWN_ITEM_ACTIVE_CLASS_NAME;
        const li = document.createElement("li");
        li.className = this.active ? this.activeClassName : this.className;
        const span = document.createElement("span");
        span.tabIndex = -1;
        span.innerHTML = this.searchResult.render();
        li.appendChild(span);
        li.addEventListener("click", this.onClick);
        this.el = li;
      }
      destroy() {
        var _a;
        const li = this.el;
        (_a = li.parentNode) === null || _a === void 0 ? void 0 : _a.removeChild(li);
        li.removeEventListener("click", this.onClick, false);
        return this;
      }
      activate() {
        if (!this.active) {
          this.active = true;
          this.el.className = this.activeClassName;
          this.dropdown.el.scrollTop = this.el.offsetTop;
        }
        return this;
      }
      deactivate() {
        if (this.active) {
          this.active = false;
          this.el.className = this.className;
        }
        return this;
      }
    };
  }
});

// ../../../../../node_modules/.pnpm/@textcomplete+core@0.1.13/node_modules/@textcomplete/core/dist/Editor.js
var require_Editor = __commonJS({
  "../../../../../node_modules/.pnpm/@textcomplete+core@0.1.13/node_modules/@textcomplete/core/dist/Editor.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Editor = void 0;
    var eventemitter3_1 = require_eventemitter3();
    var utils_1 = require_utils();
    var Editor = class extends eventemitter3_1.EventEmitter {
      /**
       * Finalize the editor object.
       *
       * It is called when associated textcomplete object is destroyed.
       */
      destroy() {
        return this;
      }
      /**
       * It is called when a search result is selected by a user.
       */
      applySearchResult(_searchResult) {
        throw new Error("Not implemented.");
      }
      /**
       * The input cursor's absolute coordinates from the window's left
       * top corner.
       */
      getCursorOffset() {
        throw new Error("Not implemented.");
      }
      /**
       * Editor string value from head to the cursor.
       * Returns null if selection type is range not cursor.
       */
      getBeforeCursor() {
        throw new Error("Not implemented.");
      }
      /**
       * Emit a move event, which moves active dropdown element.
       * Child class must call this method at proper timing with proper parameter.
       *
       * @see {@link Textarea} for live example.
       */
      emitMoveEvent(code) {
        const moveEvent = (0, utils_1.createCustomEvent)("move", {
          cancelable: true,
          detail: {
            code
          }
        });
        this.emit("move", moveEvent);
        return moveEvent;
      }
      /**
       * Emit a enter event, which selects current search result.
       * Child class must call this method at proper timing.
       *
       * @see {@link Textarea} for live example.
       */
      emitEnterEvent() {
        const enterEvent = (0, utils_1.createCustomEvent)("enter", { cancelable: true });
        this.emit("enter", enterEvent);
        return enterEvent;
      }
      /**
       * Emit a change event, which triggers auto completion.
       * Child class must call this method at proper timing.
       *
       * @see {@link Textarea} for live example.
       */
      emitChangeEvent() {
        const changeEvent = (0, utils_1.createCustomEvent)("change", {
          detail: {
            beforeCursor: this.getBeforeCursor()
          }
        });
        this.emit("change", changeEvent);
        return changeEvent;
      }
      /**
       * Emit a esc event, which hides dropdown element.
       * Child class must call this method at proper timing.
       *
       * @see {@link Textarea} for live example.
       */
      emitEscEvent() {
        const escEvent = (0, utils_1.createCustomEvent)("esc", { cancelable: true });
        this.emit("esc", escEvent);
        return escEvent;
      }
      /**
       * Helper method for parsing KeyboardEvent.
       *
       * @see {@link Textarea} for live example.
       */
      getCode(e) {
        switch (e.keyCode) {
          case 9:
          // tab
          case 13:
            return "ENTER";
          case 27:
            return "ESC";
          case 38:
            return "UP";
          case 40:
            return "DOWN";
          case 78:
            if (e.ctrlKey)
              return "DOWN";
            break;
          case 80:
            if (e.ctrlKey)
              return "UP";
            break;
        }
        return "OTHER";
      }
    };
    exports.Editor = Editor;
  }
});

// ../../../../../node_modules/.pnpm/@textcomplete+core@0.1.13/node_modules/@textcomplete/core/dist/Textcomplete.js
var require_Textcomplete = __commonJS({
  "../../../../../node_modules/.pnpm/@textcomplete+core@0.1.13/node_modules/@textcomplete/core/dist/Textcomplete.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Textcomplete = void 0;
    var eventemitter3_1 = require_eventemitter3();
    var Dropdown_1 = require_Dropdown();
    var Completer_1 = require_Completer();
    var PASSTHOUGH_EVENT_NAMES = [
      "show",
      "shown",
      "render",
      "rendered",
      "selected",
      "hidden",
      "hide"
    ];
    var Textcomplete = class extends eventemitter3_1.EventEmitter {
      constructor(editor, strategies, option) {
        super();
        this.editor = editor;
        this.isQueryInFlight = false;
        this.nextPendingQuery = null;
        this.handleHit = ({ searchResults }) => {
          if (searchResults.length) {
            this.dropdown.render(searchResults, this.editor.getCursorOffset());
          } else {
            this.dropdown.hide();
          }
          this.isQueryInFlight = false;
          if (this.nextPendingQuery !== null)
            this.trigger(this.nextPendingQuery);
        };
        this.handleMove = (e) => {
          e.detail.code === "UP" ? this.dropdown.up(e) : this.dropdown.down(e);
        };
        this.handleEnter = (e) => {
          const activeItem = this.dropdown.getActiveItem();
          if (activeItem) {
            this.dropdown.select(activeItem);
            e.preventDefault();
          } else {
            this.dropdown.hide();
          }
        };
        this.handleEsc = (e) => {
          if (this.dropdown.isShown()) {
            this.dropdown.hide();
            e.preventDefault();
          }
        };
        this.handleChange = (e) => {
          if (e.detail.beforeCursor != null) {
            this.trigger(e.detail.beforeCursor);
          } else {
            this.dropdown.hide();
          }
        };
        this.handleSelect = (selectEvent) => {
          this.emit("select", selectEvent);
          if (!selectEvent.defaultPrevented) {
            this.editor.applySearchResult(selectEvent.detail.searchResult);
          }
        };
        this.handleResize = () => {
          if (this.dropdown.isShown()) {
            this.dropdown.setOffset(this.editor.getCursorOffset());
          }
        };
        this.completer = new Completer_1.Completer(strategies);
        this.dropdown = Dropdown_1.Dropdown.create((option === null || option === void 0 ? void 0 : option.dropdown) || {});
        this.startListening();
      }
      destroy(destroyEditor = true) {
        this.completer.destroy();
        this.dropdown.destroy();
        if (destroyEditor)
          this.editor.destroy();
        this.stopListening();
        return this;
      }
      isShown() {
        return this.dropdown.isShown();
      }
      hide() {
        this.dropdown.hide();
        return this;
      }
      trigger(beforeCursor) {
        if (this.isQueryInFlight) {
          this.nextPendingQuery = beforeCursor;
        } else {
          this.isQueryInFlight = true;
          this.nextPendingQuery = null;
          this.completer.run(beforeCursor);
        }
        return this;
      }
      startListening() {
        var _a;
        this.editor.on("move", this.handleMove).on("enter", this.handleEnter).on("esc", this.handleEsc).on("change", this.handleChange);
        this.dropdown.on("select", this.handleSelect);
        for (const eventName of PASSTHOUGH_EVENT_NAMES) {
          this.dropdown.on(eventName, (e) => this.emit(eventName, e));
        }
        this.completer.on("hit", this.handleHit);
        (_a = this.dropdown.el.ownerDocument.defaultView) === null || _a === void 0 ? void 0 : _a.addEventListener("resize", this.handleResize);
      }
      stopListening() {
        var _a;
        (_a = this.dropdown.el.ownerDocument.defaultView) === null || _a === void 0 ? void 0 : _a.removeEventListener("resize", this.handleResize);
        this.completer.removeAllListeners();
        this.dropdown.removeAllListeners();
        this.editor.removeListener("move", this.handleMove).removeListener("enter", this.handleEnter).removeListener("esc", this.handleEsc).removeListener("change", this.handleChange);
      }
    };
    exports.Textcomplete = Textcomplete;
  }
});

// ../../../../../node_modules/.pnpm/@textcomplete+core@0.1.13/node_modules/@textcomplete/core/dist/index.js
var require_dist = __commonJS({
  "../../../../../node_modules/.pnpm/@textcomplete+core@0.1.13/node_modules/@textcomplete/core/dist/index.js"(exports) {
    "use strict";
    var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = exports && exports.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    __exportStar(require_Completer(), exports);
    __exportStar(require_Dropdown(), exports);
    __exportStar(require_Editor(), exports);
    __exportStar(require_SearchResult(), exports);
    __exportStar(require_Strategy(), exports);
    __exportStar(require_Textcomplete(), exports);
    __exportStar(require_utils(), exports);
  }
});

// ../../../../../node_modules/.pnpm/undate@0.3.0/node_modules/undate/dist/index.js
var require_dist2 = __commonJS({
  "../../../../../node_modules/.pnpm/undate@0.3.0/node_modules/undate/dist/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function update(el, headToCursor, cursorToTail) {
      var curr = el.value;
      var next = headToCursor + (cursorToTail || "");
      var activeElement = document.activeElement;
      var aLength = 0;
      var cLength = 0;
      while (aLength < curr.length && aLength < next.length && curr[aLength] === next[aLength]) {
        aLength++;
      }
      while (curr.length - cLength - 1 >= 0 && next.length - cLength - 1 >= 0 && curr[curr.length - cLength - 1] === next[next.length - cLength - 1]) {
        cLength++;
      }
      aLength = Math.min(aLength, Math.min(curr.length, next.length) - cLength);
      el.setSelectionRange(aLength, curr.length - cLength);
      var strB2 = next.substring(aLength, next.length - cLength);
      el.focus();
      if (!document.execCommand("insertText", false, strB2)) {
        el.value = next;
        var event_1 = document.createEvent("Event");
        event_1.initEvent("input", true, true);
        el.dispatchEvent(event_1);
      }
      el.setSelectionRange(headToCursor.length, headToCursor.length);
      activeElement.focus();
      return el;
    }
    function wrapCursor(el, before, after) {
      var initEnd = el.selectionEnd;
      var headToCursor = el.value.substr(0, el.selectionStart) + before;
      var cursorToTail = el.value.substring(el.selectionStart, initEnd) + (after || "") + el.value.substr(initEnd);
      update(el, headToCursor, cursorToTail);
      el.selectionEnd = initEnd + before.length;
      return el;
    }
    exports.update = update;
    exports.wrapCursor = wrapCursor;
  }
});

// ../../../../../node_modules/.pnpm/textarea-caret@3.1.0/node_modules/textarea-caret/index.js
var require_textarea_caret = __commonJS({
  "../../../../../node_modules/.pnpm/textarea-caret@3.1.0/node_modules/textarea-caret/index.js"(exports, module) {
    (function() {
      var properties = [
        "direction",
        // RTL support
        "boxSizing",
        "width",
        // on Chrome and IE, exclude the scrollbar, so the mirror div wraps exactly as the textarea does
        "height",
        "overflowX",
        "overflowY",
        // copy the scrollbar for IE
        "borderTopWidth",
        "borderRightWidth",
        "borderBottomWidth",
        "borderLeftWidth",
        "borderStyle",
        "paddingTop",
        "paddingRight",
        "paddingBottom",
        "paddingLeft",
        // https://developer.mozilla.org/en-US/docs/Web/CSS/font
        "fontStyle",
        "fontVariant",
        "fontWeight",
        "fontStretch",
        "fontSize",
        "fontSizeAdjust",
        "lineHeight",
        "fontFamily",
        "textAlign",
        "textTransform",
        "textIndent",
        "textDecoration",
        // might not make a difference, but better be safe
        "letterSpacing",
        "wordSpacing",
        "tabSize",
        "MozTabSize"
      ];
      var isBrowser = typeof window !== "undefined";
      var isFirefox = isBrowser && window.mozInnerScreenX != null;
      function getCaretCoordinates(element, position, options) {
        if (!isBrowser) {
          throw new Error("textarea-caret-position#getCaretCoordinates should only be called in a browser");
        }
        var debug = options && options.debug || false;
        if (debug) {
          var el = document.querySelector("#input-textarea-caret-position-mirror-div");
          if (el) el.parentNode.removeChild(el);
        }
        var div = document.createElement("div");
        div.id = "input-textarea-caret-position-mirror-div";
        document.body.appendChild(div);
        var style = div.style;
        var computed = window.getComputedStyle ? window.getComputedStyle(element) : element.currentStyle;
        var isInput = element.nodeName === "INPUT";
        style.whiteSpace = "pre-wrap";
        if (!isInput)
          style.wordWrap = "break-word";
        style.position = "absolute";
        if (!debug)
          style.visibility = "hidden";
        properties.forEach(function(prop) {
          if (isInput && prop === "lineHeight") {
            style.lineHeight = computed.height;
          } else {
            style[prop] = computed[prop];
          }
        });
        if (isFirefox) {
          if (element.scrollHeight > parseInt(computed.height))
            style.overflowY = "scroll";
        } else {
          style.overflow = "hidden";
        }
        div.textContent = element.value.substring(0, position);
        if (isInput)
          div.textContent = div.textContent.replace(/\s/g, "\xA0");
        var span = document.createElement("span");
        span.textContent = element.value.substring(position) || ".";
        div.appendChild(span);
        var coordinates = {
          top: span.offsetTop + parseInt(computed["borderTopWidth"]),
          left: span.offsetLeft + parseInt(computed["borderLeftWidth"]),
          height: parseInt(computed["lineHeight"])
        };
        if (debug) {
          span.style.backgroundColor = "#aaa";
        } else {
          document.body.removeChild(div);
        }
        return coordinates;
      }
      if (typeof module != "undefined" && typeof module.exports != "undefined") {
        module.exports = getCaretCoordinates;
      } else if (isBrowser) {
        window.getCaretCoordinates = getCaretCoordinates;
      }
    })();
  }
});

// ../../../../../node_modules/.pnpm/@textcomplete+utils@0.1.13/node_modules/@textcomplete/utils/dist/calculateElementOffset.js
var require_calculateElementOffset = __commonJS({
  "../../../../../node_modules/.pnpm/@textcomplete+utils@0.1.13/node_modules/@textcomplete/utils/dist/calculateElementOffset.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.calculateElementOffset = void 0;
    var calculateElementOffset = (el) => {
      const rect = el.getBoundingClientRect();
      const owner = el.ownerDocument;
      if (owner == null) {
        throw new Error("Given element does not belong to document");
      }
      const { defaultView, documentElement } = owner;
      if (defaultView == null) {
        throw new Error("Given element does not belong to window");
      }
      const offset = {
        top: rect.top + defaultView.pageYOffset,
        left: rect.left + defaultView.pageXOffset
      };
      if (documentElement) {
        offset.top -= documentElement.clientTop;
        offset.left -= documentElement.clientLeft;
      }
      return offset;
    };
    exports.calculateElementOffset = calculateElementOffset;
  }
});

// ../../../../../node_modules/.pnpm/@textcomplete+utils@0.1.13/node_modules/@textcomplete/utils/dist/getLineHeightPx.js
var require_getLineHeightPx = __commonJS({
  "../../../../../node_modules/.pnpm/@textcomplete+utils@0.1.13/node_modules/@textcomplete/utils/dist/getLineHeightPx.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getLineHeightPx = void 0;
    var CHAR_CODE_ZERO = "0".charCodeAt(0);
    var CHAR_CODE_NINE = "9".charCodeAt(0);
    var isDigit = (charCode) => CHAR_CODE_ZERO <= charCode && charCode <= CHAR_CODE_NINE;
    var getLineHeightPx = (el) => {
      const computedStyle = getComputedStyle(el);
      const lineHeight = computedStyle.lineHeight;
      if (isDigit(lineHeight.charCodeAt(0))) {
        const floatLineHeight = parseFloat(lineHeight);
        return isDigit(lineHeight.charCodeAt(lineHeight.length - 1)) ? floatLineHeight * parseFloat(computedStyle.fontSize) : floatLineHeight;
      }
      return calculateLineHeightPx(el.nodeName, computedStyle);
    };
    exports.getLineHeightPx = getLineHeightPx;
    var calculateLineHeightPx = (nodeName, computedStyle) => {
      const body = document.body;
      if (!body)
        return 0;
      const tempNode = document.createElement(nodeName);
      tempNode.innerHTML = "&nbsp;";
      Object.assign(tempNode.style, {
        fontSize: computedStyle.fontSize,
        fontFamily: computedStyle.fontFamily,
        padding: "0"
      });
      body.appendChild(tempNode);
      if (tempNode instanceof HTMLTextAreaElement) {
        tempNode.rows = 1;
      }
      const height = tempNode.offsetHeight;
      body.removeChild(tempNode);
      return height;
    };
  }
});

// ../../../../../node_modules/.pnpm/@textcomplete+utils@0.1.13/node_modules/@textcomplete/utils/dist/isSafari.js
var require_isSafari = __commonJS({
  "../../../../../node_modules/.pnpm/@textcomplete+utils@0.1.13/node_modules/@textcomplete/utils/dist/isSafari.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isSafari = void 0;
    var isSafari = () => /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    exports.isSafari = isSafari;
  }
});

// ../../../../../node_modules/.pnpm/@textcomplete+utils@0.1.13/node_modules/@textcomplete/utils/dist/index.js
var require_dist3 = __commonJS({
  "../../../../../node_modules/.pnpm/@textcomplete+utils@0.1.13/node_modules/@textcomplete/utils/dist/index.js"(exports) {
    "use strict";
    var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = exports && exports.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    __exportStar(require_calculateElementOffset(), exports);
    __exportStar(require_getLineHeightPx(), exports);
    __exportStar(require_isSafari(), exports);
  }
});

// ../../../../../node_modules/.pnpm/@textcomplete+textarea@0.1.13_@textcomplete+core@0.1.13/node_modules/@textcomplete/textarea/dist/TextareaEditor.js
var require_TextareaEditor = __commonJS({
  "../../../../../node_modules/.pnpm/@textcomplete+textarea@0.1.13_@textcomplete+core@0.1.13/node_modules/@textcomplete/textarea/dist/TextareaEditor.js"(exports) {
    "use strict";
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TextareaEditor = void 0;
    var undate_1 = require_dist2();
    var textarea_caret_1 = __importDefault(require_textarea_caret());
    var core_1 = require_dist();
    var utils_1 = require_dist3();
    var TextareaEditor = class extends core_1.Editor {
      constructor(el) {
        super();
        this.el = el;
        this.onInput = () => {
          this.emitChangeEvent();
        };
        this.onKeydown = (e) => {
          const code = this.getCode(e);
          let event;
          if (code === "UP" || code === "DOWN") {
            event = this.emitMoveEvent(code);
          } else if (code === "ENTER") {
            event = this.emitEnterEvent();
          } else if (code === "ESC") {
            event = this.emitEscEvent();
          }
          if (event && event.defaultPrevented) {
            e.preventDefault();
          }
        };
        this.startListening();
      }
      destroy() {
        super.destroy();
        this.stopListening();
        return this;
      }
      /**
       * @implements {@link Editor#applySearchResult}
       */
      applySearchResult(searchResult) {
        const beforeCursor = this.getBeforeCursor();
        if (beforeCursor != null) {
          const replace = searchResult.replace(beforeCursor, this.getAfterCursor());
          this.el.focus();
          if (Array.isArray(replace)) {
            (0, undate_1.update)(this.el, replace[0], replace[1]);
            if (this.el) {
              this.el.dispatchEvent((0, core_1.createCustomEvent)("input"));
            }
          }
        }
      }
      /**
       * @implements {@link Editor#getCursorOffset}
       */
      getCursorOffset() {
        const elOffset = (0, utils_1.calculateElementOffset)(this.el);
        const elScroll = this.getElScroll();
        const cursorPosition = this.getCursorPosition();
        const lineHeight = (0, utils_1.getLineHeightPx)(this.el);
        const top = elOffset.top - elScroll.top + cursorPosition.top + lineHeight;
        const left = elOffset.left - elScroll.left + cursorPosition.left;
        const clientTop = this.el.getBoundingClientRect().top;
        if (this.el.dir !== "rtl") {
          return { top, left, lineHeight, clientTop };
        } else {
          const right = document.documentElement ? document.documentElement.clientWidth - left : 0;
          return { top, right, lineHeight, clientTop };
        }
      }
      /**
       * @implements {@link Editor#getBeforeCursor}
       */
      getBeforeCursor() {
        return this.el.selectionStart !== this.el.selectionEnd ? null : this.el.value.substring(0, this.el.selectionEnd);
      }
      getAfterCursor() {
        return this.el.value.substring(this.el.selectionEnd);
      }
      getElScroll() {
        return { top: this.el.scrollTop, left: this.el.scrollLeft };
      }
      /**
       * The input cursor's relative coordinates from the textarea's left
       * top corner.
       */
      getCursorPosition() {
        return (0, textarea_caret_1.default)(this.el, this.el.selectionEnd);
      }
      startListening() {
        this.el.addEventListener("input", this.onInput);
        this.el.addEventListener("keydown", this.onKeydown);
      }
      stopListening() {
        this.el.removeEventListener("input", this.onInput);
        this.el.removeEventListener("keydown", this.onKeydown);
      }
    };
    exports.TextareaEditor = TextareaEditor;
  }
});

// ../../../../../node_modules/.pnpm/@textcomplete+textarea@0.1.13_@textcomplete+core@0.1.13/node_modules/@textcomplete/textarea/dist/index.js
var require_dist4 = __commonJS({
  "../../../../../node_modules/.pnpm/@textcomplete+textarea@0.1.13_@textcomplete+core@0.1.13/node_modules/@textcomplete/textarea/dist/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TextareaEditor = void 0;
    var TextareaEditor_1 = require_TextareaEditor();
    Object.defineProperty(exports, "TextareaEditor", { enumerable: true, get: function() {
      return TextareaEditor_1.TextareaEditor;
    } });
  }
});

export {
  require_dist,
  require_dist4 as require_dist2
};
//# sourceMappingURL=lib.S6HS7AXR.js.map
