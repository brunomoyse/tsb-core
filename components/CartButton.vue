<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core';

const isCartEmpty = true;
const totalProductQuantity = 0;
const isMobile = useMediaQuery('(max-width: 640px)');

const handleToggle = () => {
    console.log('toggle cart');
}

</script>

<template>
    <button @click="handleToggle" :class="`relative flex items-center justify-center rounded-full h-9 p-4
        font-semibold text-sm ${isCartEmpty
            ? 'bg-off-white text-tsb-gray border-2 hover:bg-tsb-pink hover:text-black'
            : 'bg-tsb-red-darker hover:bg-tsb-red'}`">

        <span v-if="!isCartEmpty"
            class="absolute bottom-0 right-0 transform translate-x-[50%] translate-y-[50%] bg-tsb-red text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
            {{ totalProductQuantity }}
        </span>

        <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" class="h-5 w-5 fill-current">
            <path fillRule="evenodd" clipRule="evenodd"
                d="M3.666 11.333h10.333l1.334-8h-11l-.267-2h-3.4v2h1.667l1.333 8zm1.333 3.334A1.333 1.333 0 105 12a1.333 1.333 0 000 2.667zm9.334-1.334a1.333 1.333 0 11-2.667 0 1.333 1.333 0 012.667 0z">
            </path>
        </svg>
        <span v-if="!isMobile">Panier</span>
    </button>
</template>