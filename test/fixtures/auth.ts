import type { User } from '../../layers/engine/types'

/** A signed-in customer, as `me` answers it. */
export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'ada@example.com',
    firstName: 'Ada',
    lastName: 'Lovelace',
    phoneNumber: '+32470123456',
    notifyMarketing: false,
    notifyOrderUpdates: true,
    deletionRequestedAt: null,
    address: null,
    ...overrides,
  }
}
