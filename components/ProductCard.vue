<script setup lang="ts">
import { formatPrice } from '~/lib/utils';
const config = useRuntimeConfig();

const { product } = defineProps<{
    product: ProductInfo;
}>();

const addToCart = (product: ProductInfo) => {
    console.log('add to cart', product.id);
}

</script>

<template>
    <div class="relative max-width-[200px] w-full h-[240px]">
        <!-- Background card -->
        <div class="border-2 rounded-xl h-[240px]"></div>
        <!-- Front card -->
        <div class="shadow-md border-2 border-t-0 rounded-b-xl h-[120px] absolute bottom-0 w-full">
        </div>
        <!-- Image-->
        <div class="absolute top-[60px] -translate-y-1/2 w-full flex justify-center items-center">
            <picture class="h-auto flex justify-center items-center px-12 cursor-pointer pointer-events-none">
                <source :srcset="`${config.public.s3bucketUrl}/images/thumbnails/${product?.slug}.avif`"
                    type="image/avif" />
                <source :srcset="`${config.public.s3bucketUrl}/images/thumbnails/${product?.slug}.webp`"
                    type="image/webp" />
                <img :src="`${config.public.s3bucketUrl}/images/thumbnails/${product?.slug}.png`" :alt="product.name"
                    class="h-auto max-h-32 pointer-events-none" :draggable="false" />
            </picture>
        </div>
        <!-- Product name -->
        <div class="absolute top-[130px] w-full flex justify-center items-center">
            <span class="flex text-black font-semibold text-sm">
                {{ product.name }}
            </span>
        </div>
        <div class="absolute bottom-[10px] left-[10px] w-full flex justify-between items-center px-2">
            <!-- Price -->
            <div class="flex justify-center items-center flex-1">
                <span class="text-black font-semibold text-sm">
                    {{ formatPrice(product.price) }}
                </span>
            </div>
            <!-- Column 2 -->
            <div class="flex justify-center items-center flex-1">
            </div>
            <!-- Column 3 -->
            <div class="flex justify-center items-center flex-1">
            </div>
            <!-- Column 4 -->
            <div class="flex justify-center items-center flex-1">
                <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" class="h-5 w-5 fill-current">
                    <path fillRule="evenodd" clipRule="evenodd"
                        d="M3.666 11.333h10.333l1.334-8h-11l-.267-2h-3.4v2h1.667l1.333 8zm1.333 3.334A1.333 1.333 0 105 12a1.333 1.333 0 000 2.667zm9.334-1.334a1.333 1.333 0 11-2.667 0 1.333 1.333 0 012.667 0z">
                    </path>
                </svg>
            </div>
        </div>
    </div>
</template>