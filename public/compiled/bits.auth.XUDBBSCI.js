import {
  addPasswordVisibilityToggleListener,
  alert,
  spinnerHtml
} from "./lib.MYPIOGN5.js";
import "./lib.LRP46MC3.js";
import "./lib.HMFK7OOB.js";
import "./lib.AEOHBIQD.js";
import "./lib.RPQH5UYI.js";
import "./lib.XAEDCBGD.js";
import "./lib.X7H2PLEK.js";
import "./lib.53PYQRAK.js";
import "./lib.CAO7TYYH.js";
import "./lib.PNHYIP7B.js";
import "./lib.S3TIZ2HQ.js";
import "./lib.LWF5S4ZV.js";
import "./lib.QPQZCXK2.js";
import "./lib.5I4BSVKX.js";
import {
  defaultInit,
  jsonAnyResponse,
  url,
  xhrHeader
} from "./lib.TT4QSUKQ.js";
import {
  debounce
} from "./lib.NFSQQWN5.js";
import {
  requestIdleCallbackSafe
} from "./lib.GMEH5BEF.js";
import "./lib.KO2KTNGK.js";

// ../lib/src/view/turnstile.ts
var selector = ".cf-turnstile";
function turnstile($form) {
  $form.find(selector).each(function() {
    const turnstileDiv = this;
    $form.find(".submit").prop("disabled", true);
    turnstileDiv.innerHTML = "";
    const options = Object.assign({}, turnstileDiv.dataset);
    const showError = (message) => {
      const $err = $form.find(".cf-turnstile-error");
      if (message) $err.html(`<p>${message}</p>`).removeClass("none");
      else $err.addClass("none");
    };
    requestIdleCallbackSafe(() => {
      window.turnstile.render(selector, {
        ...options,
        appearance: "interaction-only",
        callback: () => {
          $form.find(".submit").prop("disabled", false);
          showError(false);
        },
        "error-callback": (errorCode) => {
          showError(`Captcha error: ${errorCode} - ${troubleshooting(errorCode)}`);
        },
        "expired-callback": () => {
          showError("Captcha expired, please try again");
        },
        "timeout-callback": () => {
          showError("Captcha timed out");
        },
        "unsupported-callback": () => {
          alert(
            "Unfortunately, your browser does not support the captcha required to log in. Please use a different browser or device to access your account."
          );
          showError("Captcha is not supported in this browser. Please use a different browser or device.");
        }
      });
    });
  });
}
function troubleshooting(code) {
  switch (code) {
    case "110600":
    // Challenge timed out
    case "200100":
      return "Please check your system clock and clear your browser cache.";
    case "200500":
      return 'Failed to load the captcha. Check if "challenges.cloudflare.com" is blocked.';
    case "110100":
    // Invalid sitekey
    case "110110":
    // Sitekey not found
    case "110200":
    // Domain not authorized
    case "400020":
    // Invalid sitekey
    case "400070":
      return "Please report this issue to the site administrator.";
    default:
      return "An unknown error occurred. Please access https://browser-compat.turnstile.workers.dev/ for more information.";
  }
}

// ../bits/src/bits.auth.ts
function initModule(mode) {
  mode === "login" ? loginStart() : mode === "signup" ? signupStart() : resetStart();
  addPasswordVisibilityToggleListener();
}
var toggleSubmit = ($submit, v) => $submit.prop("disabled", !v);
function loginStart() {
  const selector2 = ".auth-login form";
  (function load() {
    const form = document.querySelector(selector2), $f = $(form);
    turnstile($f);
    initTextClear(form);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      toggleSubmit($f.find(".submit"), false);
      fetch(form.action, {
        ...defaultInit,
        headers: xhrHeader,
        method: "post",
        body: new FormData(form)
      }).then((res) => res.text().then((text) => [res, text])).then(([res, text]) => {
        if (text === "MissingTotpToken" || text === "InvalidTotpToken") {
          $f.find(".one-factor").hide();
          $f.find(".two-factor").removeClass("none");
          requestAnimationFrame(() => $f.find(".two-factor input").val("")[0].focus());
          toggleSubmit($f.find(".submit"), true);
          if (text === "InvalidTotpToken") $f.find(".two-factor .error").removeClass("none");
        } else if (res.ok) location.href = text.startsWith("ok:") ? text.slice(3) : "/";
        else {
          try {
            const el = $(text).find(selector2);
            if (el.length) {
              $f.replaceWith(el);
              addPasswordVisibilityToggleListener();
              load();
            } else {
              alert(
                (text || res.statusText).slice(0, 300) + ". Please wait some time before trying again."
              ).then(() => toggleSubmit($f.find(".submit"), true));
            }
          } catch (e2) {
            console.warn(e2);
            $f.html(text);
          }
        }
      });
    });
  })();
}
function signupStart() {
  const $form = $("#signup-form"), $exists = $form.find(".username-exists"), $username = $form.find('input[name="username"]').on("change keyup paste", () => {
    $exists.addClass("none");
    usernameCheck();
  }), $password = $form.find('input[name="password"]');
  const usernameCheck = debounce(async () => {
    const name = $username.val();
    if (name.length < 3) return;
    const $group = $username.parents(".form-group");
    const res = await jsonAnyResponse(url("/api/player/autocomplete", { term: name, exists: 1 }));
    const body = await res.json();
    $group.find(".error-validation").remove();
    $username.parents(".form-group").toggleClass("is-invalid", res.status === 400 || res.ok && !!body);
    $exists.siblings(".error").remove();
    if (res.ok) $exists.toggleClass("none", !body);
    else if (res.status === 400) {
      $exists.addClass("none");
      $group.append(`<div class="error error-validation">${body.error || "Invalid"}</div>`);
    } else console.warn("Username check failed", res);
  }, 300);
  initTextClear($form[0]);
  turnstile($form);
  $form.on("submit", () => {
    const responseEl = $form.find('[name="cf-turnstile-response"]');
    if (!responseEl.length || responseEl.val()) {
      $form.find("button.submit").prop("disabled", true).addClass("button-empty").html(spinnerHtml);
      return true;
    }
    return false;
  });
  $form.find(".password-generator button").on("click", () => {
    void site.asset.loadEsm("bits.passwordGenerator", { init: "form3-password" });
    return false;
  });
  const showPasswordTools = () => {
    $form.find(".password-generator").toggleClass("none", $password.val() !== "");
    $form.find(".password-complexity").toggleClass("none", $password.val() === "");
  };
  $password.on("input", showPasswordTools);
  showPasswordTools();
  void site.asset.loadEsm("bits.passwordComplexity", { init: "form3-password" });
}
function initTextClear(form) {
  for (const wrapper of form.querySelectorAll(".text-wrapper")) {
    const input = wrapper.querySelector("input");
    const clearBtn = wrapper.querySelector(".text-clear");
    if (!input || !clearBtn) continue;
    const toggle = () => clearBtn.classList.toggle("show", input.value.length > 0);
    input.addEventListener("input", toggle);
    clearBtn.addEventListener("click", () => {
      input.value = "";
      clearBtn.classList.remove("show");
      input.focus();
    });
    toggle();
  }
}
function resetStart() {
  void site.asset.loadEsm("bits.passwordComplexity", { init: "form3-newPasswd1" });
}
export {
  initModule
};
//# sourceMappingURL=bits.auth.XUDBBSCI.js.map
