<template>
  <!-- The header lockup of ygfliege.be (src/components/header.ts of the vitrine): the official circle seal beside the
         restaurant name set in text. GUIDELINES.md §2.2 forbids showing the circle without its name, and forbids redrawing
         the logo, so the name is composed text next to the untouched kit asset, exactly as on the vitrine. The accessible
         name is carried by the link (it starts with the visible name, as WCAG 2.5.3 wants, then says where the link goes); the
         circle is decorative. -->
  <NuxtLinkLocale
    to="/"
    :aria-label="`Yangguofu 杨国福麻辣烫 · Liège – ${$t('nav.home')}`"
    class="lockup shrink-0 inline-flex items-center gap-2 lg:gap-3 min-h-11 rounded-ygf-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
  >
    <img
      src="/images/logos/logo-color.svg"
      alt=""
      width="40"
      height="40"
      class="h-10 w-10 shrink-0"
    />
    <span class="flex flex-col leading-tight min-w-0">
      <span class="lockup-name" translate="no">Yangguofu</span>
      <!-- 12px by design: part of the logo composition, not running text (the vitrine sets it at --text-xs) -->
      <span class="lockup-sub hidden lg:inline"
        ><span lang="zh-Hans">杨国福麻辣烫</span> · Liège</span
      >
    </span>
  </NuxtLinkLocale>
</template>

<style scoped>
.lockup-name {
  font-weight: 900;
  font-size: 1rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ygf-black);
}
.lockup-sub {
  font-size: 0.75rem;
  color: var(--ygf-gray-600);
  white-space: nowrap;
}
.lockup-sub [lang] {
  font-family: var(--font-chinese);
}
</style>
