<template>
    <button class="relative flex items-center justify-center rounded-full h-9 p-4
        font-semibold text-sm bg-off-white text-tsb-gray hover:bg-tsb-pink hover:text-black">
        
        <img src="/icons/account-circle-icon.svg" alt="My account" class="h-6 w-6" />

        <span class="pl-1 desktop-only">{{ $t('nav.myAccount') }}</span>
    </button>
</template>