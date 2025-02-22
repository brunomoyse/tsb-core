<template>
    <button class="relative flex items-center justify-center rounded-full h-9 p-4
        font-semibold text-sm bg-off-white text-tsb-gray hover:bg-tsb-pink hover:text-black">

        <!-- Logout SVG Icon -->
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-current" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M16 17l5-5-5-5" />
            <path d="M21 12H9" />
            <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7" />
        </svg>

        <span class="desktop-only">{{ $t('nav.logout') }}</span>
    </button>
</template>