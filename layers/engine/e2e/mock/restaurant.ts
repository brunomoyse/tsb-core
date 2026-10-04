import type { MockAddress, MockBrand, RestaurantMode } from './types.ts'

/*
 * The restaurant side of the mock: the ordering policy (same numbers as DefaultOrderingPolicy in tsb-service and
 * DEFAULT_ORDERING_POLICY in the engine), the restaurant config a scenario produces, and the delivery addresses the
 * address lookup knows.
 */

export const POLICY_CENTS = {
  deliveryMinimum: 2500,
  pickupDiscountMinimum: 2000,
  pickupDiscountRateBp: 1000,
  onlinePaymentFee: 30,
  totalRoundingStep: 10,
} as const

export const DELIVERY_MAX_KM = 9
const FEE_TIERS = [
  { upToKm: 3, fee: '0.00' },
  { upToKm: 4, fee: '1.00' },
  { upToKm: 5, fee: '2.00' },
  { upToKm: 6, fee: '3.00' },
  { upToKm: 7, fee: '4.00' },
  { upToKm: 8, fee: '5.00' },
  { upToKm: 9, fee: '6.00' },
]
export const EXCLUDED_POSTCODES = ['4610']

export const policyFor = (brand: MockBrand) => ({
  // YGF launched takeaway-only: the API says so too.
  deliveryEnabled: brand === 'tokyosushi',
  deliveryMinimum: '25.00',
  deliveryMaxDistanceKm: DELIVERY_MAX_KM,
  deliveryFeeTiers: FEE_TIERS,
  excludedPostcodes: EXCLUDED_POSTCODES,
  pickupDiscountRate: 0.1,
  pickupDiscountMinimum: '20.00',
  onlinePaymentFee: '0.30',
  totalRoundingStep: '0.10',
  slotIntervalMinutes: 15,
  minimumPreparationMinutes: 15,
})

/** Delivery fee in cents for a distance in metres: the first tier the distance is under. */
export function deliveryFeeCents(distanceMeters: number): number | null {
  const km = distanceMeters / 1000
  const tier = FEE_TIERS.find((candidate) => km < candidate.upToKm)
  return tier ? Math.round(Number(tier.fee) * 100) : null
}

const WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const ALL_DAY = Object.fromEntries(WEEK.map((day) => [day, { open: '00:00', close: '23:59' }]))
const EVENINGS = Object.fromEntries(WEEK.map((day) => [day, { open: '18:00', close: '22:00' }]))

const BRUSSELS = 'Europe/Brussels'
const brusselsHm = (at: Date): string =>
  new Intl.DateTimeFormat('fr-BE', {
    timeZone: BRUSSELS,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(at)

/** Bookable slots: every 15 minutes from 45 minutes ahead, for `count` slots (fewer near midnight is fine for a mock). */
function slotsFrom(now: Date, count: number) {
  const first = Math.ceil((now.getTime() + 45 * 60_000) / (15 * 60_000)) * 15 * 60_000
  return Array.from({ length: count }, (_, index) => {
    const at = new Date(first + index * 15 * 60_000)
    return { label: brusselsHm(at), value: at.toISOString(), isLunchOnlyAllowed: false }
  })
}

/** The `restaurantConfig` answer for a mode. */
export function restaurantConfigFor(mode: RestaurantMode, brand: MockBrand, now = new Date()) {
  const open = mode === 'open'
  const scheduled = mode === 'scheduled-only'
  const tomorrow = new Date(now.getTime() + 24 * 3_600_000)
  return {
    orderingEnabled: mode !== 'disabled',
    openingHours: open || mode === 'disabled' ? ALL_DAY : EVENINGS,
    orderingHours: open || mode === 'disabled' ? ALL_DAY : EVENINGS,
    preparationMinutes: 20,
    isCurrentlyOpen: open,
    isOrderingCurrentlyOpen: open,
    availableSlotsToday: open || scheduled ? slotsFrom(now, 8) : [],
    nextOpeningAt: open ? null : tomorrow.toISOString(),
    policy: policyFor(brand),
  }
}

/** Delivery addresses the lookup knows. `distance` decides the fee, the zone and the "too far" refusal. */
const place = (
  id: string,
  streetName: string,
  houseNumber: string,
  postcode: string,
  municipalityName: string,
  distance: number,
): MockAddress => ({
  id,
  streetName,
  houseNumber,
  boxNumber: null,
  postcode,
  municipalityName,
  distance,
  lat: 50.64,
  lng: 5.57,
  duration: Math.round(distance / 8),
})

export const PLACES: MockAddress[] = [
  place('place-home', 'Rue Saint-Gilles', '12', '4000', 'Liège', 1800),
  place('place-mid', 'Avenue Blonden', '33', '4000', 'Liège', 3500),
  place('place-far', 'Rue de Herve', '150', '4041', 'Herstal', 8200),
  place('place-out', 'Rue de la Station', '7', '4300', 'Waremme', 12_000),
  place('place-excluded', 'Rue Grétry', '9', '4610', 'Beyne-Heusay', 4200),
]

export const findPlace = (id: string | null | undefined): MockAddress | undefined =>
  PLACES.find((candidate) => candidate.id === id)

export const describePlace = (candidate: MockAddress): string =>
  `${candidate.streetName} ${candidate.houseNumber}, ${candidate.postcode} ${candidate.municipalityName}`
