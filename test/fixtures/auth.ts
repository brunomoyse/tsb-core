import type { User } from '../../layers/engine/types'

/** A signed-in customer, as `me` answers it. */
export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'ada@example.test',
    firstName: 'Ada',
    lastName: 'Lovelace',
    phoneNumber: null,
    notifyMarketing: false,
    notifyOrderUpdates: true,
    deletionRequestedAt: null,
    address: null,
    ...overrides,
  }
}
