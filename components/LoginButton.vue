<template>
    <button class="relative flex items-center justify-center rounded-full h-9 p-4
        font-semibold text-sm bg-off-white text-tsb-gray hover:bg-tsb-pink hover:text-black">

        <img src="/icons/login-icon.svg" alt="Login" class="h-6 w-6" />

        <span class="pl-1 desktop-only">{{ $t('nav.login') }}</span>
    </button>
</template>
