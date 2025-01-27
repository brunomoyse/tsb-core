<script setup lang="ts">

const config = useRuntimeConfig();

const { category } = defineProps<{
    category: ProductCategory;
}>();

</script>

<template>
    <div class="rounded-3xl sm:w-auto bg-white border-2 border-tsb-pink">
        <div class="flex justify-center items-center h-24 w-24 px-2">
            <span class="text-black text-sm text-center text-charcoal font-semibold">
                {{ category.name }}
            </span>
        </div>
    </div>
</template>