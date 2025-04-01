<template>
    <nav
        aria-label="Sidebar Navigation"
        class="hidden sm:flex flex-col justify-between items-center bg-tsb-two rounded-2xl w-[110px] h-[calc(100vh-4rem)] fixed left-8 top-8"
    >
        <!-- Top Navigation Items -->
        <ul class="flex flex-col items-center space-y-6 mt-6">
            <Logo :tooltipText="$t('nav.home')" alt="Tokyo Sushi Bar logo" icon="/icons/tsb-logo.svg" to="/"/>
            <NavItem :tooltipText="$t('nav.menu')" alt="Menu Icon" icon="/icons/menu-icon.svg" to="menu"/>
            <NavItem :tooltipText="$t('nav.contact')" alt="Contact Icon" icon="/icons/contact-icon.svg" to="contact"/>
        </ul>

        <!-- Bottom Navigation Items -->
        <ul class="flex flex-col items-center space-y-6 mb-6">
            <NavItem v-if="!authStore.accessValid" :tooltipText="$t('nav.login')" alt="Login Icon" icon="/icons/login-icon.svg"
                     to="login"/>
            <NavItem v-if="authStore.accessValid" :tooltipText="$t('nav.myAccount')" alt="My account Icon" icon="/icons/account-circle-icon.svg"
                     to="me"/>
            <NavItem v-if="authStore.accessValid" :tooltipText="$t('nav.logout')" alt="Logout Icon" icon="/icons/logout-icon.svg"
                     to="logout"/>
            <!-- Language picker -->
            <LanguagePicker :tooltipText="$t('nav.language')" alt="Choose language Icon"
                            icon="/icons/translate-icon.svg"/>
        </ul>
    </nav>
</template>

<script lang="ts" setup>
import NavItem from './NavItem.vue';
import Logo from './Logo.vue'
import LanguagePicker from '~/components/navbar/LanguagePicker.vue'
import {useAuthStore} from '@/stores/auth'

const authStore = useAuthStore();
</script>
