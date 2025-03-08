<template>
    <article class="rounded-2xl bg-tsb-two p-6 shadow-sm transition-all hover:shadow-md">
        <div class="border-b border-gray-100 pb-4">
            <h2 class="text-lg font-semibold text-gray-900">{{ $t('me.bookings.title') }}</h2>
        </div>

        <div v-if="bookings?.length" class="mt-4 space-y-4">
            <div v-for="booking in bookings" :key="booking.id" class="space-y-2">
                <div class="flex items-center justify-between">
                    <span class="text-gray-700">{{ booking.date }}</span>
                    <span :class="statusBadge(booking.status)">{{ booking.status }}</span>
                </div>
                <p class="text-sm text-gray-500">{{ booking.description }}</p>
            </div>
        </div>

        <div v-else class="mt-6 text-center text-gray-500">
            {{ $t('me.bookings.empty') }}
        </div>
    </article>
</template>

<script lang="ts" setup>
type Booking = {
    id: string
    date: string
    status: string
    description: string
}
const bookings: Booking[] = [];

const statusBadge = (status: string) => {
    const classes = {
        confirmed: 'bg-green-100 text-green-800',
        pending: 'bg-yellow-100 text-yellow-800',
        canceled: 'bg-red-100 text-red-800'
    }
    return `px-2 py-1 rounded-full text-sm ${classes[status] || 'bg-gray-100 text-gray-800'}`
}
</script>
