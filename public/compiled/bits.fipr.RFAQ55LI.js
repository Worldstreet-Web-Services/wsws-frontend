// ../bits/src/bits.fipr.ts
site.load.then(
  () => setTimeout(async () => {
    const storageKey = "fipr";
    const t = performance.now();
    const send = (hash) => {
      localStorage.setItem(storageKey, hash);
      const $i = $("#signup-fp-input");
      if ($i.length) $i.val(hash);
      else
        fetch("/auth/set-fp/" + hash + "/" + Math.round(performance.now() - t), {
          method: "post",
          credentials: "same-origin"
        });
    };
    const existingFp = localStorage.getItem(storageKey);
    if (existingFp) send(existingFp);
    else
      site.asset.loadIife("javascripts/fipr.js").then(() => fipr.get((c) => send(fipr.x64hash128(c.map((x) => x.value).join(""), 31))));
  }, 1e3)
);
//# sourceMappingURL=bits.fipr.RFAQ55LI.js.map
