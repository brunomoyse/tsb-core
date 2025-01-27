<script setup lang="ts">
import { formatPrice } from '~/lib/utils';

const cartItems: CartItem[] = [];

const totalPrice = 0;

const handleDecrementQuantity = (product: ProductInfo) => {
    //
};

const handleIncrementQuantity = (product: ProductInfo) => {
    //
}

const handlePayment = () => {
    //
}

/*
const props = defineProps<{
    cartItems: CartItem[];
    totalPrice: number;
    handleIncrementQuantity: (product: ProductInfo) => void;
    handleDecrementQuantity: (product: ProductInfo) => void;
    handlePayment: () => void;
}>();
*/
</script>

<template>
    <div class="text-tsb-gray p-8 w-full">
        <div class="fixed w-1/5">
            <h2 class="text-lg font-bold mb-4">Panier</h2>
            <div class="overflow-y-auto pb-16">
                <div v-for="item in cartItems">
                    <div key={product.id} class="mb-4 bg-tsb-gray shadow-sm rounded-lg p-4 border border-gray-200">
                        <p class="text-lg font-medium mb-2">
                            {{ item.product.name }}
                        </p>

                        <div class="flex items-center justify-between">
                            <div class="flex items-center">
                                <button
                                    class="px-3 py-1 text-lg rounded-lg mr-2 bg-tsb-gray text-off-white border-2 border-tsb-red hover:bg-tsb-red hover:text-white focus:outline-none"
                                    @click="handleDecrementQuantity(item.product)">
                                    -
                                </button>
                                <span class="text-md font-semibold mx-2">{quantity}</span>
                                <button
                                    class="px-3 py-1 ml-2 rounded-lg text-lg bg-tsb-gray text-off-white border-2 border-tsb-red hover:bg-tsb-red hover:text-white focus:outline-none"
                                    @click="handleIncrementQuantity(item.product)">
                                    +
                                </button>
                            </div>

                            <p class="text-sm text-tsb-gray-lighter">Prix: {{ formatPrice(item.product.price *
                                item.quantity) }}</p>
                        </div>
                    </div>
                </div>
            </div>
            <div class="my-6 text-xl font-bold">
                Total: {{ formatPrice(totalPrice) }}
            </div>
            <button @click="handlePayment"
                class="flex items-center justify-center p-4 w-full text-black hover:text-off-white hover:bg-tsb-red rounded-full transition ease-in-out duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2">
                PAYER
            </button>
        </div>
    </div>
</template>