<template>
    <div>
        <!-- STREET FIELD -->
        <div class="relative">
            <label class="block text-sm text-gray-700 mb-1">
                {{ $t('register.address') }}
            </label>
            <div class="relative">
                <input
                    id="street"
                    ref="streetInput"
                    v-model="streetQuery"
                    :placeholder="$t('register.streetPlaceholder')"
                    class="w-full h-10 px-3 pr-10 py-2 leading-5 border border-gray-300 rounded-md focus:ring focus:ring-gray-200"
                    @focus="isStreetFocused = true"
                    @blur="onStreetBlur"
                    @keydown.enter.prevent="selectFirstStreet"
                    :disabled="Boolean(selectedStreet)"
                />
                <div class="absolute top-0 bottom-0 right-2 flex items-center gap-2">
                    <svg v-if="selectedStreet" @mousedown.prevent="clearStreet" class="w-5 h-5 text-gray-500 cursor-pointer" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                    <svg v-if="selectedStreet" class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                    </svg>
                </div>
            </div>
            <ul
                v-show="isStreetFocused && !selectedStreet && streets.length > 0"
                class="absolute z-10 w-full bg-white border border-gray-200 shadow-lg max-h-60 overflow-auto"
                @mousedown.prevent
            >
                <li
                    v-for="street in streets"
                    :key="street.id"
                    class="p-2 hover:bg-gray-100 cursor-pointer"
                    @mousedown="selectStreet(street)"
                >
                    {{ street.streetName }} - {{ street.municipalityName }}, {{ street.postcode }}
                </li>
            </ul>
        </div>

        <!-- HOUSE FIELD -->
        <div class="relative mt-3" v-if="selectedStreet">
            <div class="relative">
                <input
                    id="houseNumber"
                    ref="houseInput"
                    v-model="houseQuery"
                    :placeholder="$t('register.houseNumberPlaceholder')"
                    class="w-full h-10 px-3 pr-10 py-2 leading-5 border border-gray-300 rounded-md focus:ring focus:ring-gray-200"
                    @focus="isHouseFocused = true"
                    @blur="onHouseBlur"
                    @keydown.enter.prevent="handleHouseEnter"
                    :disabled="houseConfirmed"
                />
                <div class="absolute top-0 bottom-0 right-2 flex items-center gap-2">
                    <svg v-if="houseConfirmed" @click.stop="clearHouse" class="w-5 h-5 text-gray-500 cursor-pointer" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                    <svg v-if="houseConfirmed" class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                    </svg>
                </div>
            </div>
            <ul
                v-show="isHouseFocused && !houseConfirmed && filteredHouseNumbers.length > 0"
                class="absolute z-10 w-full bg-white border border-gray-200 shadow-lg max-h-60 overflow-auto"
                @mousedown.prevent
            >
                <li
                    v-for="house in filteredHouseNumbers"
                    :key="house"
                    class="p-2 hover:bg-gray-100 cursor-pointer"
                    @mousedown="selectHouse(house)"
                >
                    {{ house }}
                </li>
            </ul>
        </div>

        <!-- BOX FIELD -->
        <div class="relative mt-3" v-if="selectedHouseNumber && boxNumbers.length > 1">
            <div class="relative">
                <input
                    id="boxNumber"
                    ref="boxInput"
                    v-model="boxQuery"
                    :placeholder="$t('register.boxNumberPlaceholder')"
                    class="w-full h-10 px-3 pr-10 py-2 leading-5 border border-gray-300 rounded-md focus:ring focus:ring-gray-200"
                    @focus="isBoxFocused = true"
                    @blur="onBoxBlur"
                    @keydown.enter.prevent="selectFirstBox"
                    :disabled="boxConfirmed"
                />
                <div class="absolute top-0 bottom-0 right-2 flex items-center gap-2">
                    <svg v-if="boxConfirmed" @mousedown.prevent="clearBox" class="w-5 h-5 text-gray-500 cursor-pointer" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                    <svg v-if="boxConfirmed" class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                    </svg>
                </div>
            </div>
            <ul
                v-show="isBoxFocused && !boxConfirmed"
                class="absolute z-10 w-full bg-white border border-gray-200 shadow-lg max-h-60 overflow-auto"
                @mousedown.prevent
            >
                <li
                    v-for="box in filteredBoxNumbers"
                    :key="box === null || box === '' ? 'none' : box"
                    class="p-2 hover:bg-gray-100 cursor-pointer"
                    @mousedown="selectBox(box)"
                >
                    {{ box === null ? '\u00A0' : box }}
                </li>
            </ul>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, watch, computed, nextTick } from 'vue'
import { useNuxtApp } from '#imports'
import type { Address, Street } from '~/types'

const emit = defineEmits<{ (e: 'update:address', address: Address | null): void }>();
const { $api } = useNuxtApp()

// Reactive State
const streetQuery = ref('')
const streets = ref<Street[]>([])
const selectedStreet = ref<Street | null>(null)

const houseNumbers = ref<string[]>([])
const houseQuery = ref('')
const selectedHouseNumber = ref('')
const houseConfirmed = ref(false)

const boxNumbers = ref<(string | null)[]>([])
const boxQuery = ref<(string | null)>(null)
const selectedBoxNumber = ref<(string | null)>(null)
const boxConfirmed = ref(false)

const address = ref<Address | null>(null)

// Focus states
const isStreetFocused = ref(false)
const isHouseFocused = ref(false)
const isBoxFocused = ref(false)

// Debounce Handlers
let debounceStreetTimer: ReturnType<typeof setTimeout> | null = null
let debounceHouseTimer: ReturnType<typeof setTimeout> | null = null
let debounceBoxTimer: ReturnType<typeof setTimeout> | null = null

// Input blur events
function onStreetBlur() {
    setTimeout(() => {
        isStreetFocused.value = false
    }, 100)
}

function onHouseBlur() {
    setTimeout(() => {
        isHouseFocused.value = false
    }, 100)
}

function onBoxBlur() {
    setTimeout(() => {
        isBoxFocused.value = false
    }, 100)
}

// Computed Properties
const filteredHouseNumbers = computed(() => {
    if (!houseQuery.value) return houseNumbers.value
    return houseNumbers.value.filter(h =>
        h.toLowerCase().includes(houseQuery.value.toLowerCase())
    )
})

const filteredBoxNumbers = computed(() => {
    const query = boxQuery.value || ''
    if (!query) return boxNumbers.value
    return boxNumbers.value.filter(b => {
        const val = b || ''
        return val.toLowerCase().includes(query.toLowerCase())
    })
})

// Watchers
watch(streetQuery, () => handleStreetSearch())
watch(selectedStreet, () => handleStreetSelection())
watch(selectedHouseNumber, () => handleHouseNumberSelection())
watch(filteredBoxNumbers, (newVal) => {
    if (newVal.length === 1) selectedBoxNumber.value = newVal[0]
})
watch(address, (newVal) => {
    emit('update:address', newVal)
})

// Address Search Handlers
const handleStreetSearch = async () => {
    if (debounceStreetTimer) clearTimeout(debounceStreetTimer)
    debounceStreetTimer = setTimeout(async () => {
        if (streetQuery.value.trim().length < 3) return

        const data: Street[] = await $api('/addresses/streets', {
            params: { q: streetQuery.value }
        });

        if (data) {
            streets.value = data;
            const exactMatches = data.filter(s =>
                s.streetName.toLowerCase() === streetQuery.value.toLowerCase()
            );
            if (exactMatches.length === 1) {
                await selectStreet(exactMatches[0]);
            }
        }
    }, 500)
}

const handleStreetSelection = () => {
    houseNumbers.value = []
    selectedHouseNumber.value = ''
    houseQuery.value = ''
    if (selectedStreet.value) loadHouseNumbers()
}

const loadHouseNumbers = async () => {
    if (debounceHouseTimer) clearTimeout(debounceHouseTimer)
    debounceHouseTimer = setTimeout(async () => {
        const data: string[] = await $api('/addresses/house-numbers', {
            params: { street_id: selectedStreet.value!.id }
        });
        if (data) {
            houseNumbers.value = data;
            houseQuery.value = ''; // Reset query
        }
    }, 500)
}

const handleHouseNumberSelection = () => {
    // Clear box-related state
    boxNumbers.value = []
    selectedBoxNumber.value = null
    boxQuery.value = ''
    // Reset boxConfirmed so that its watcher will trigger later
    boxConfirmed.value = false

    // Set houseConfirmed only if the selected house number is nonempty
    if (selectedHouseNumber.value && selectedHouseNumber.value.trim() !== '') {
        houseConfirmed.value = true
        loadBoxNumbers()
    } else {
        houseConfirmed.value = false
    }
}

const loadBoxNumbers = async () => {
    if (debounceBoxTimer) clearTimeout(debounceBoxTimer)
    debounceBoxTimer = setTimeout(async () => {
        const data: (string | null)[] = await $api('/addresses/box-numbers', {
            params: {
                street_id: selectedStreet.value!.id,
                house_number: selectedHouseNumber.value
            }
        });

        if (data) {
            boxNumbers.value = data;
            boxQuery.value = '';
            // Auto-select the first value even if it is null or empty
            if (data.length === 1) {
                selectedBoxNumber.value = data[0];
                boxConfirmed.value = true;
            }
            if (data.length > 1 && data[0] === null) {
                selectedBoxNumber.value = null;
                boxConfirmed.value = false;
            }
            if (data.length > 0) {
                await nextTick();
                const boxEl = document.getElementById('boxNumber') as HTMLInputElement;
                if (boxEl) {
                    boxEl.focus();
                }
            }
        }
    }, 500)
}

watch(boxConfirmed,
    (newVal) => {
        // If the box is confirmed, load the final address.
        // If the box is not confirmed, set address to null.
        if (newVal === true) {
            loadAddress()
        } else {
            address.value = null
        }
    },
    { immediate: true, deep: true }
)

const loadAddress = async () => {
    if (!selectedStreet.value || !selectedHouseNumber.value) return

    const data: (Address | null) = await $api('/addresses/final-address', {
        method: 'GET',
        params: {
            street_id: selectedStreet.value!.id,
            house_number: selectedHouseNumber.value,
            box_number: selectedBoxNumber.value || ''
        }
    });

    if (data) {
        address.value = data;
    }
}

// Selection Handlers
const selectStreet = async (street: Street) => {
    selectedStreet.value = street
    streetQuery.value = `${street.streetName} - ${street.municipalityName}, ${street.postcode}`
    streets.value = []
    houseNumbers.value = []
    selectedHouseNumber.value = ''
    houseQuery.value = ''
    boxNumbers.value = []
    selectedBoxNumber.value = null
    boxQuery.value = ''

    // Load house numbers and wait for next tick.
    await loadHouseNumbers()
    await nextTick()
    const houseEl = document.getElementById('houseNumber') as HTMLInputElement
    if (houseEl) {
        houseEl.focus()
    }
}

const selectFirstStreet = () => {
    if (streets.value.length > 0) {
        selectStreet(streets.value[0])
    }
}

const selectHouse = async (hn: string) => {
    selectedHouseNumber.value = hn
    houseQuery.value = hn
    houseConfirmed.value = true
    isHouseFocused.value = false
}

const selectFirstHouse = () => {
    if (filteredHouseNumbers.value.length > 0) {
        selectHouse(filteredHouseNumbers.value[0])
    }
}

function handleHouseEnter(event: KeyboardEvent) {
    // If the user hasn't typed anything, don't auto-select.
    if (houseQuery.value.trim() === '') {
        event.preventDefault();
        return;
    }
    // Otherwise, select the first suggestion.
    selectFirstHouse();
}

const selectBox = (box: string | null) => {
    selectedBoxNumber.value = box
    boxQuery.value = box
    boxConfirmed.value = true
    isBoxFocused.value = false
    // Load final address
    loadAddress()
}

const selectFirstBox = () => {
    if (filteredBoxNumbers.value.length > 0) {
        selectBox(filteredBoxNumbers.value[0])
    }
}

// Clear functions
const clearStreet = () => {
    streets.value = []
    selectedStreet.value = null
    streetQuery.value = ''
    houseNumbers.value = []
    selectedHouseNumber.value = ''
    houseQuery.value = ''
    boxNumbers.value = []
    selectedBoxNumber.value = null
    boxQuery.value = ''
    isStreetFocused.value = true

    // Use nextTick to ensure the state update is applied before refocusing.
    nextTick(() => {
        const streetEl = document.getElementById('street') as HTMLInputElement
        if (streetEl) streetEl.focus()
    })
}

const clearHouse = () => {
    houseQuery.value = ''
    selectedHouseNumber.value = ''
    houseConfirmed.value = false
    isHouseFocused.value = true

    // Use nextTick to ensure the state update is applied before refocusing.
    nextTick(() => {
        const houseEl = document.getElementById('houseNumber') as HTMLInputElement
        if (houseEl) houseEl.focus()
    })
}

const clearBox = () => {
    selectedBoxNumber.value = null
    boxQuery.value = ''
    boxConfirmed.value = false
    isBoxFocused.value = true

    // Use nextTick to ensure the state update is applied before refocusing.
    nextTick(() => {
        const boxEl = document.getElementById('boxNumber') as HTMLInputElement
        if (boxEl) boxEl.focus()
    })
}
</script>
