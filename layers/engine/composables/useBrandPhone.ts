import { useAppConfig } from '#imports'

// Tap-to-call link + display form of the brand phone number, so no component
// hardcodes it. brand.phone is in international form; the label is the
// national form Belgian customers expect (leading 0).
export const useBrandPhone = (): { phoneHref: string; phoneLabel: string } => {
  const { phone } = useAppConfig().brand
  return {
    phoneHref: `tel:${phone.replace(/[^\d+]/gu, '')}`,
    phoneLabel: phone.replace(/^\+32\s?/u, '0'),
  }
}
