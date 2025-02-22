<template>
    <label class="flex items-center space-x-2 cursor-pointer">
      <input type="checkbox" class="hidden peer" v-model="checked">
      <div class="w-5 h-5 border-2 border-tsb-red-lighter rounded-md flex items-center justify-center peer-checked:bg-tsb-red-lighter peer-checked:border-tsb-red-lighter transition">
        <svg v-if="checked" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <span class="text-gray-700"><slot></slot></span>
    </label>
  </template>
  
  <script setup>
  import { ref } from 'vue';
  const checked = ref(false);
  </script>