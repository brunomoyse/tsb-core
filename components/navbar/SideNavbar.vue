<template>
  <nav
    class="hidden sm:flex flex-col justify-between items-center bg-tsb-two rounded-2xl w-[110px] h-[calc(100vh-4rem)] fixed left-8 top-8"
    aria-label="Sidebar Navigation"
  >
    <!-- Top Navigation Items -->
    <ul class="flex flex-col items-center space-y-6 mt-6">
      <Logo to="/" icon="/icons/tsb-logo.svg" alt="Tokyo Sushi Bar logo" :tooltipText="$t('nav.home')" />
      <NavItem to="menu" icon="/icons/menu-icon.svg" alt="Menu Icon" :tooltipText="$t('nav.menu')" />
      <!--
      <NavItem to="reservation" icon="/icons/reservation-icon.svg" alt="Reservation Icon" :tooltipText="$t('nav.book')" />
      -->
      <NavItem to="contact" icon="/icons/contact-icon.svg" alt="Contact Icon" :tooltipText="$t('nav.contact')" />
    </ul>

    <!-- Bottom Navigation Items -->
    <ul class="flex flex-col items-center space-y-6 mb-6">
      <NavItem v-if="!isUserConnected" to="login" icon="/icons/login-icon.svg" alt="Login Icon" :tooltipText="$t('nav.login')" />
      <NavItem v-if="isUserConnected" to="my-account" icon="/icons/account-circle-icon.svg" alt="My account Icon" :tooltipText="$t('nav.myAccount')" />
      <!-- Language picker -->
      <LanguagePicker icon="/icons/translate-icon.svg" alt="Choose language Icon" :tooltipText="$t('nav.language')" />
    </ul>
  </nav>
</template>

<script setup lang="ts">
import { computed } from '#imports'
import NavItem from './NavItem.vue';
import Logo from './Logo.vue'
import LanguagePicker from '~/components/navbar/LanguagePicker.vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore();
const isUserConnected = computed(() => authStore.user !== null)
</script>
