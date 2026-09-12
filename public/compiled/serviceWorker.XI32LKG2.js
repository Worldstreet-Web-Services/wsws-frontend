// ../serviceWorker/src/serviceWorker.ts
var sw = self;
var searchParams = new URL(sw.location.href).searchParams;
var assetBase = new URL(searchParams.get("asset-url"), sw.location.href).href;
function assetUrl(path) {
  return `${assetBase}assets/${path}`;
}
sw.addEventListener("install", () => sw.skipWaiting());
sw.addEventListener("activate", (e) => {
  e.waitUntil(sw.clients.claim());
});
sw.addEventListener("push", (event) => {
  const data = event.data.json();
  return event.waitUntil(
    sw.registration.showNotification(data.title, {
      badge: assetUrl("logo/lichess-mono-128.png"),
      icon: assetUrl("logo/lichess-favicon-192.png"),
      body: data.body,
      tag: data.tag,
      data: data.payload,
      requireInteraction: true
    })
  );
});
async function handleNotificationClick(e) {
  const notifications = await sw.registration.getNotifications();
  notifications.forEach((notification) => notification.close());
  const windowClients = await sw.clients.matchAll({
    type: "window",
    includeUncontrolled: true
  });
  const data = e.notification.data.userData;
  let url = data.path || "/";
  if (data.fullId) url = "/" + data.fullId;
  else if (data.threadId) url = "/inbox/" + data.threadId;
  else if (data.challengeId) url = "/" + data.challengeId;
  else if (data.streamerId) url = `/streamer/${data.streamerId}?redirect=1`;
  else if (data.mentionedBy) url = `/forum/redirect/post/${data.postId}`;
  else if (data.invitedBy) url = `/study/${data.studyId}`;
  for (const client of windowClients) {
    const clientUrl = new URL(client.url, sw.location.href);
    if (clientUrl.pathname === url && "focus" in client) return await client.focus();
  }
  for (const client of windowClients) {
    const clientUrl = new URL(client.url, sw.location.href);
    if (clientUrl.pathname === "/") return await client.navigate(url);
  }
  return await sw.clients.openWindow(url);
}
sw.addEventListener("notificationclick", (e) => e.waitUntil(handleNotificationClick(e)));
//# sourceMappingURL=serviceWorker.XI32LKG2.js.map
