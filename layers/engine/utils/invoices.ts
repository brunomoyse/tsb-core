/** The invoice flag: customers can download invoices unless the brand says `invoicesEnabled: false`. */
export const brandIssuesInvoices = (invoicesEnabled: boolean | undefined): boolean =>
  invoicesEnabled !== false
