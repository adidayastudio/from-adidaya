self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('push', event => {
    let data = { title: 'Adidaya Studio', body: 'You have a new notification.' };
    try { if (event.data) data = event.data.json(); } catch { data.body = event.data.text(); }
    event.waitUntil(self.registration.showNotification(data.title || 'Adidaya Studio', {
        body: data.body || data.description || '', tag: data.tag,
        data: { link: data.link || '/notifications' },
    }));
});
self.addEventListener('notificationclick', event => {
    event.notification.close();
    const aliases = { '/dashboard/notifications': '/notifications', '/dashboard': '/home', '/flow/finance': '/home/finance', '/flow/reports': '/home/reports', '/flow/resources': '/home/resources', '/feel/crew': '/home/crew-module', '/feel/clock': '/home/clock-module', '/feel/people': '/home/people', '/task': '/tasks', '/action': '/actions', '/project': '/projects' };
    let target = new URL('/notifications', self.location.origin);
    try {
        const candidate = new URL(event.notification.data?.link || '/notifications', self.location.origin);
        if (candidate.origin === self.location.origin) {
            candidate.pathname = aliases[candidate.pathname] || candidate.pathname;
            if (/^\/(home|tasks|actions|projects|project-details|chat|notifications)(\/|$)/.test(candidate.pathname)) target = candidate;
        }
    } catch {}
    event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async list => {
        const client = list.find(item => new URL(item.url).origin === self.location.origin);
        if (client) { await client.navigate(target.href); return client.focus(); }
        return self.clients.openWindow(target.href);
    }));
});
