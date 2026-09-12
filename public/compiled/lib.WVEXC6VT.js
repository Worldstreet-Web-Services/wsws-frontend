import {
  colors
} from "./lib.LXQPVRII.js";
import {
  clockToSpeed
} from "./lib.67VUYMDO.js";
import {
  hl
} from "./lib.S3TIZ2HQ.js";
import {
  h
} from "./lib.LWF5S4ZV.js";
import {
  propWithEffect
} from "./lib.GMEH5BEF.js";

// ../lib/src/setup/timeControl.ts
var TimeControl = class {
  constructor(mode, modes, timeV, incrementV, daysV, presets) {
    this.mode = mode;
    this.modes = modes;
    this.timeV = timeV;
    this.incrementV = incrementV;
    this.daysV = daysV;
    this.presets = presets;
    this.time = () => timeVToTime(this.timeV());
    this.increment = () => incrementVToIncrement(this.incrementV());
    this.days = () => daysVToDays(this.daysV());
    this.isRealTime = () => this.mode() === "realTime";
    this.realTimeValid = (minimumTime = 0) => this.time() >= minimumTime && (this.time() > 0 || this.increment() > 0);
    this.valid = (minimumTimeIfReal = 0) => !this.isRealTime() || this.realTimeValid(minimumTimeIfReal);
    this.initialSeconds = () => this.time() * 60;
    this.notForRatedVariant = () => !this.isRealTime() || this.time() < 0.5 && this.increment() === 0 || this.time() === 0 && this.increment() < 2;
    this.clockStr = () => `${this.time()}+${this.increment()}`;
    this.speed = () => this.isRealTime() ? clockToSpeed(this.initialSeconds(), this.increment()) : "correspondence";
    this.canSelectMode = () => this.modes.length > 1;
  }
};
var timeControlFromStoredValues = (mode, modes, time, inc, days, onChange, presets) => new TimeControl(
  mode,
  modes,
  propWithEffect(sliderInitVal(time, timeVToTime, 100, 14), onChange),
  propWithEffect(sliderInitVal(inc, incrementVToIncrement, 100, 5), onChange),
  propWithEffect(sliderInitVal(days, daysVToDays, 20, 7), onChange),
  presets
);
var timeModes = [
  { id: 1, key: "realTime", name: i18n.site.realTime },
  { id: 2, key: "correspondence", name: i18n.site.correspondence },
  { id: 0, key: "unlimited", name: i18n.site.unlimited }
];
var allTimeModeKeys = ["realTime", "correspondence", "unlimited"];
var sliderInitVal = (v, f, max, defaultVal) => {
  for (let i = 0; i < max; i++) {
    if (f(i) === v) return i;
  }
  return defaultVal;
};
var sliderTimes = [
  0,
  1 / 4,
  1 / 2,
  3 / 4,
  1,
  3 / 2,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  16,
  17,
  18,
  19,
  20,
  25,
  30,
  35,
  40,
  45,
  60,
  75,
  90,
  105,
  120,
  135,
  150,
  165,
  180
];
var timeVToTime = (v) => v < sliderTimes.length ? sliderTimes[v] : 180;
var incrementVToIncrement = (v) => {
  if (v <= 20) return v;
  switch (v) {
    case 21:
      return 25;
    case 22:
      return 30;
    case 23:
      return 35;
    case 24:
      return 40;
    case 25:
      return 45;
    case 26:
      return 60;
    case 27:
      return 90;
    case 28:
      return 120;
    case 29:
      return 150;
    default:
      return 180;
  }
};
var daysVToDays = (v) => {
  if (v <= 3) return v;
  switch (v) {
    case 4:
      return 5;
    case 5:
      return 7;
    case 6:
      return 10;
    default:
      return 14;
  }
};

// ../lib/src/setup/option.ts
var option = ({ key, name }, selectedKey) => h("option", { attrs: { value: key, selected: key === selectedKey } }, name);

// ../lib/src/setup/view/color.ts
var blindModeColorPicker = (colorProp) => [
  hl("label", { attrs: { for: "sf_color" } }, i18n.site.side),
  hl(
    "select#sf_color",
    {
      on: {
        change: (e) => colorProp(e.target.value)
      }
    },
    colors.map((color) => option(color, colorProp()))
  )
];
var colorButtons = (colorProp) => hl("div.config-group", [
  hl("div.label", i18n.site.side),
  hl(
    "group.radio.color-picker.color-cards",
    colors.map(
      ({ key, name }) => hl("div", [
        hl(`input#color-picker-${key}`, {
          attrs: { name: "color", type: "radio", value: key, checked: colorProp() === key },
          on: { change: () => colorProp(key) }
        }),
        hl(`label.card-radio`, { attrs: { for: `color-picker-${key}` } }, [
          hl("div.color-picker__button", { class: { [key]: true } }, hl("icon")),
          hl("span.text", name)
        ])
      ])
    )
  )
]);

// ../lib/src/setup/view/timeControl.ts
var showTime = (v) => {
  if (v === 1 / 4) return "\xBC";
  if (v === 1 / 2) return "\xBD";
  if (v === 3 / 4) return "\xBE";
  return v.toString();
};
var blindModeTimePickers = (tc) => {
  return [
    renderTimeModePicker(tc),
    tc.mode() === "realTime" && hl("div.time-choice", [
      hl("label", { attrs: { for: "sf_time" } }, i18n.site.minutesPerSide),
      hl(
        "select#sf_time",
        {
          on: { change: (e) => tc.timeV(parseFloat(e.target.value)) }
        },
        sliderTimes.map(
          (sliderTime, timeV) => option({ key: timeV.toString(), name: showTime(sliderTime) }, tc.timeV().toString())
        )
      )
    ]),
    tc.mode() === "realTime" && hl("div.increment-choice", [
      hl("label", { attrs: { for: "sf_increment" } }, i18n.site.incrementInSeconds),
      hl(
        "select#sf_increment",
        {
          on: {
            change: (e) => tc.incrementV(parseInt(e.target.value))
          }
        },
        // 31 because the range below goes from 0 to 30
        Array.from(Array(31).keys()).map(
          (incrementV) => option(
            { key: incrementV.toString(), name: incrementVToIncrement(incrementV).toString() },
            tc.incrementV().toString()
          )
        )
      )
    ]),
    tc.mode() === "correspondence" && hl("div.days-choice", [
      hl("label", { attrs: { for: "sf_days" } }, i18n.site.daysPerTurn),
      hl(
        "select#sf_days",
        {
          on: { change: (e) => tc.daysV(parseInt(e.target.value)) }
        },
        // 7 because the range below goes from 1 to 7
        Array.from(Array(7).keys()).map(
          (daysV) => option(
            { key: (daysV + 1).toString(), name: daysVToDays(daysV + 1).toString() },
            tc.daysV().toString()
          )
        )
      )
    ])
  ];
};
var renderTimeModePicker = (tc) => tc.canSelectMode() && hl("div.label-select", [
  hl("label", { attrs: { for: "sf_timeMode" } }, i18n.site.timeControl),
  hl(
    "select#sf_timeMode",
    {
      on: {
        change: (e) => {
          console.log("Time mode changed to", e.target.value);
          tc.mode(e.target.value);
        }
      }
    },
    timeModes.filter((m) => tc.modes.includes(m.key)).map((timeMode) => option(timeMode, tc.mode()))
  )
]);
var inputRange = (min, max, prop, classes) => hl("input.range", {
  class: classes,
  attrs: { type: "range", min, max, value: prop() },
  hook: {
    update: (_, vnode) => {
      const el = vnode.elm;
      el.value = prop().toString();
    }
  },
  on: { input: (e) => prop(parseFloat(e.target.value)) }
});
var timePickerAndSliders = (tc, minimumTimeRequiredIfReal = 0) => {
  if (site.blindMode) return hl("div.config-group", blindModeTimePickers(tc));
  const activeMode = tc.mode();
  const showTabs = tc.canSelectMode();
  const tabs = showTabs ? hl(
    "div.tabs-horiz",
    {
      attrs: { role: "tablist" }
    },
    tc.modes.map(
      (mode) => {
        var _a;
        return hl(
          "button",
          {
            attrs: { role: "tab", tabindex: 0 },
            class: { active: activeMode === mode },
            on: {
              click: () => tc.mode(mode)
            }
          },
          ((_a = timeModes.find((m) => m.key === mode)) == null ? void 0 : _a.name) || mode
        );
      }
    )
  ) : null;
  let panelContent = null;
  if (activeMode === "realTime") {
    const [tcTime, tcIncrement] = [tc.time(), tc.increment()];
    panelContent = hl("div.time-panel", [
      hl("div.sliders-grid", [
        hl("div.slider-container", [
          hl("div.label-row", [hl("label", i18n.site.minutesPerSide), hl("span.val-box", showTime(tcTime))]),
          inputRange(0, 38, tc.timeV, {
            failure: !tc.realTimeValid(minimumTimeRequiredIfReal)
          })
        ]),
        hl("div.slider-separator", "+"),
        hl("div.slider-container", [
          hl("div.label-row", [
            hl("span.val-box", tcIncrement.toString()),
            hl("label", i18n.site.incrementInSeconds)
          ]),
          inputRange(0, 30, tc.incrementV, { failure: !tc.realTimeValid(minimumTimeRequiredIfReal) })
        ])
      ]),
      hl(
        "div.presets",
        tc.presets.map(
          (p) => hl(
            "button.preset-btn",
            {
              class: {
                active: tcTime === p.lim && tcIncrement === p.inc
              },
              on: {
                click: () => {
                  tc.timeV(sliderInitVal(p.lim, timeVToTime, 100, 9));
                  tc.incrementV(sliderInitVal(p.inc, incrementVToIncrement, 100, 0));
                }
              }
            },
            `${showTime(p.lim)}+${p.inc}`
          )
        )
      )
    ]);
  } else if (activeMode === "correspondence") {
    panelContent = hl("div.time-panel", [
      hl("div.slider-container.full-width", [
        hl("div.label-row", [hl("label", i18n.site.daysPerTurn), hl("span.val-box", tc.days().toString())]),
        inputRange(1, 7, tc.daysV)
      ])
    ]);
  } else if (activeMode === "unlimited") {
    panelContent = hl("div.time-panel", i18n.site.unlimitedDescription);
  }
  return hl("div.config-group.time-control-tabs", [tabs, panelContent]);
};

export {
  timeControlFromStoredValues,
  timeModes,
  allTimeModeKeys,
  option,
  blindModeColorPicker,
  colorButtons,
  timePickerAndSliders
};
//# sourceMappingURL=lib.WVEXC6VT.js.map
