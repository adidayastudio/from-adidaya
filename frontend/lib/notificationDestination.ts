// Only navigate within the application; database link values never open arbitrary origins.
export function notificationDestination(link?: string): string | null {
    if (!link || !link.startsWith('/') || link.startsWith('//') || link.includes('\\')) return null;
    const url = new URL(link, 'https://adidaya.invalid');
    const aliases: Record<string, string> = {
        '/dashboard': '/home',
        '/flow/finance': '/home/finance',
        '/flow/finance/purchasing': '/actions',
        '/flow/finance/reimburse': '/actions',
        '/flow/reports': '/home/reports',
        '/flow/resources': '/home/resources',
        '/feel/clock': '/home/clock-module',
        '/feel/crew': '/home/crew-module',
        '/feel/crew/requests': '/home/crew-module',
        '/feel/people': '/home/people',
        '/dashboard/tasks': '/tasks',
        '/task': '/tasks',
        '/flow/tasks': '/tasks',
        '/action': '/actions',
        '/project': '/projects',
        '/flow/projects': '/projects',
        '/dashboard/notifications': '/notifications'
    };
    const pathname = aliases[url.pathname] || url.pathname;
    const allowed = /^\/(home(?:\/|$)|tasks(?:\/|$)|actions(?:\/|$)|projects(?:\/|$)|project-details\/|project\/|chat(?:\/|$)|notifications$|announcement-detail$)/;
    return allowed.test(pathname) ? pathname + url.search + url.hash : null;
}
