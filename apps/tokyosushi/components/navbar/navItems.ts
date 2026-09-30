// Single source for the desktop sidebar and the mobile menu, so the two can't
// drift apart. `auth` limits an entry to signed-out or signed-in visitors.
export interface NavEntry {
    key: string
    to: string
    labelKey: string
    icon: string
    group: 'main' | 'account'
    auth?: 'guest' | 'user'
}

export const NAV_ITEMS: NavEntry[] = [
    { key: 'menu', to: '/menu', labelKey: 'nav.menu', icon: '/icons/menu-icon.svg', group: 'main' },
    { key: 'contact', to: '/contact', labelKey: 'nav.contact', icon: '/icons/contact-icon.svg', group: 'main' },
    { key: 'login', to: '/auth/login', labelKey: 'nav.login', icon: '/icons/login-icon.svg', group: 'account', auth: 'guest' },
    { key: 'account', to: '/me', labelKey: 'nav.myAccount', icon: '/icons/account-circle-icon.svg', group: 'account', auth: 'user' },
    { key: 'logout', to: '/auth/logout', labelKey: 'nav.logout', icon: '/icons/logout-icon.svg', group: 'account', auth: 'user' },
]

export const visibleNavItems = (group: NavEntry['group'], isSignedIn: boolean): NavEntry[] =>
    NAV_ITEMS.filter((item) =>
        item.group === group && (!item.auth || (item.auth === 'user') === isSignedIn),
    )
