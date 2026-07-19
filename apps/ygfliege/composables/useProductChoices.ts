import type { Product, ProductChoice, ProductChoiceGroup, ProductChoiceSelection } from '#engine/types'
import { type Ref, computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

/**
 * Choice-group selection engine, shared by ProductModal (fixed sets: broth +
 * spice, every group min=max=1) and BowlComposer (the min-5/max-20 "Malatang
 * sur mesure" bowl).
 *
 * Lifted verbatim out of ProductModal.vue rather than rewritten, so both
 * surfaces gate, price and serialise selections identically — the cart store's
 * selection signature depends on it. Two rules worth remembering because they
 * are not obvious:
 *
 *  - min/max scale with the line quantity: ordering 2 bowls requires 10
 *    ingredients, not 5. Hence `groupTargetMin/Max` multiply by `quantity`.
 *  - the minimum counts total *quantity*, not distinct choices — 4× shrimp and
 *    1× noodles satisfies "min 5". `e2e/compose-bowl.spec.ts` asserts this.
 */
export const useProductChoices = (product: Product | null | undefined, quantity: Ref<number>) => {
    const { t } = useI18n()

    /** choiceId → selected quantity. Entries are deleted, never zeroed. */
    const selectedChoiceQuantities = ref<Record<string, number>>({})

    /**
     * Groups in display order. Products predating the Apr 2026 choice-group
     * migration carry bare `choices` with no groups; wrap those in a synthetic
     * single-select group so callers only ever handle one shape.
     */
    const choiceGroups = computed((): ProductChoiceGroup[] => {
        if (!product?.choiceGroups || product.choiceGroups.length === 0) {
            if (!product?.choices || product.choices.length === 0) return []
            return [{
                id: 'legacy-single',
                productId: product.id,
                minSelections: 1,
                maxSelections: 1,
                sortOrder: 0,
                name: 'Choice',
                choices: product.choices.toSorted((a, b) => a.sortOrder - b.sortOrder),
            }]
        }
        return product.choiceGroups.toSorted((a, b) => a.sortOrder - b.sortOrder)
    })

    const hasChoices = computed(() => Boolean(product?.choices && product.choices.length > 0))

    /** A group the user picks several items from (ingredients), vs. pick-one. */
    const isMultiSelectGroup = (group: ProductChoiceGroup) => group.maxSelections > 1

    /** True when any group is multi-select — i.e. this product is a composer. */
    const isComposer = computed(() => choiceGroups.value.some(isMultiSelectGroup))

    const groupTargetMin = (group: ProductChoiceGroup) => group.minSelections * quantity.value
    const groupTargetMax = (group: ProductChoiceGroup) => group.maxSelections * quantity.value

    const selectedQuantitiesByGroup = computed(() => {
        const byGroup: Record<string, number> = {}
        if (!product?.choices) return byGroup

        for (const [choiceId, selectedQty] of Object.entries(selectedChoiceQuantities.value)) {
            if (selectedQty <= 0) continue
            const choice = product.choices.find((c) => c.id === choiceId)
            if (!choice) continue
            byGroup[choice.choiceGroupId] = (byGroup[choice.choiceGroupId] ?? 0) + selectedQty
        }

        return byGroup
    })

    const selectedCountIn = (group: ProductChoiceGroup) => selectedQuantitiesByGroup.value[group.id] ?? 0

    const quantityOf = (choice: ProductChoice) => selectedChoiceQuantities.value[choice.id] ?? 0

    const selectionList = computed((): ProductChoiceSelection[] => {
        if (!product?.choices) return []
        return Object.entries(selectedChoiceQuantities.value)
            .filter(([, selectedQty]) => selectedQty > 0)
            .map(([choiceId, selectedQty]) => {
                const choice = product.choices.find((c) => c.id === choiceId)
                if (!choice) return null
                return { groupId: choice.choiceGroupId, choiceId, quantity: selectedQty }
            })
            .filter((item): item is ProductChoiceSelection => Boolean(item))
    })

    /** Legacy single-choice field the cart still records alongside selections. */
    const selectedChoice = computed((): ProductChoice | null => {
        const selection = selectionList.value.find((item) => item.quantity === 1)
        if (!selection || !product?.choices) return null
        return product.choices.find((choice) => choice.id === selection.choiceId) ?? null
    })

    /** Base price plus every selected choice's modifier × its quantity. */
    const displayPrice = computed(() => {
        if (!product) return '0'
        const modifier = Object.entries(selectedChoiceQuantities.value).reduce((sum, [choiceId, selectedQty]) => {
            const choice = product.choices?.find((c) => c.id === choiceId)
            if (!choice || selectedQty <= 0) return sum
            return sum + Number(choice.priceModifier) * selectedQty
        }, 0)
        return String(Number(product.price) + modifier)
    })

    const isGroupSatisfied = (group: ProductChoiceGroup) => {
        const selected = selectedCountIn(group)
        return selected >= groupTargetMin(group) && selected <= groupTargetMax(group)
    }

    const allGroupsSatisfied = computed(() => {
        if (choiceGroups.value.length === 0) return true
        return choiceGroups.value.every(isGroupSatisfied)
    })

    /** Human-readable reason a group is not yet satisfied. */
    const groupHint = (group: ProductChoiceGroup) => {
        const selected = selectedCountIn(group)
        const targetMin = groupTargetMin(group)
        const targetMax = groupTargetMax(group)
        if (selected > targetMax) {
            const excess = selected - targetMax
            return t('menu.removeExcess', { count: excess }, excess)
        }
        const remaining = Math.max(0, targetMin - selected)
        if (group.minSelections === group.maxSelections) {
            return t('menu.chooseRemaining', { count: remaining }, remaining)
        }
        return t('menu.chooseAtLeast', { count: remaining }, remaining)
    }

    /** The first unsatisfied group, for telling the user what still blocks them. */
    const blockingGroup = computed(() => choiceGroups.value.find((group) => !isGroupSatisfied(group)) ?? null)

    const canIncrement = (choice: ProductChoice) => {
        const group = choiceGroups.value.find((g) => g.id === choice.choiceGroupId)
        if (!group) return false
        return selectedCountIn(group) < groupTargetMax(group)
    }

    const incrementChoice = (choice: ProductChoice) => {
        if (!canIncrement(choice)) return
        selectedChoiceQuantities.value = {
            ...selectedChoiceQuantities.value,
            [choice.id]: quantityOf(choice) + 1,
        }
    }

    const decrementChoice = (choice: ProductChoice) => {
        const current = quantityOf(choice)
        if (current <= 0) return
        const copy = { ...selectedChoiceQuantities.value }
        if (current - 1 === 0) {
            delete copy[choice.id]
        } else {
            copy[choice.id] = current - 1
        }
        selectedChoiceQuantities.value = copy
    }

    /**
     * Pick exactly one choice within a single-select group, replacing whatever
     * was chosen before. Lets pick-one groups render as cards/chips instead of
     * steppers without the user having to decrement the previous pick first.
     *
     * The recorded quantity is the group's scaled target, not 1: ordering 2
     * bowls needs the broth counted twice for the min/max gate to pass. The
     * pick applies to every unit on the line — a customer wanting two bowls
     * with different broths adds them as two lines (which the cart's selection
     * signature keeps distinct anyway).
     */
    const selectExclusive = (choice: ProductChoice) => {
        const group = choiceGroups.value.find((g) => g.id === choice.choiceGroupId)
        if (!group) return
        const copy = { ...selectedChoiceQuantities.value }
        for (const groupChoice of group.choices) delete copy[groupChoice.id]
        copy[choice.id] = Math.max(1, groupTargetMin(group))
        selectedChoiceQuantities.value = copy
    }

    // Keep exclusive picks in step when the line quantity changes: a broth
    // chosen at quantity 1 must count ×2 once the user bumps the footer
    // stepper to 2, or every pick-one group silently turns unsatisfiable.
    // Only groups holding exactly one distinct pick are rescaled.
    watch(quantity, () => {
        const copy = { ...selectedChoiceQuantities.value }
        let changed = false
        for (const group of choiceGroups.value) {
            if (group.maxSelections !== 1) continue
            const picked = group.choices.filter((c) => (copy[c.id] ?? 0) > 0)
            if (picked.length !== 1) continue
            const target = Math.max(1, groupTargetMin(group))
            if (copy[picked[0]!.id] !== target) {
                copy[picked[0]!.id] = target
                changed = true
            }
        }
        if (changed) selectedChoiceQuantities.value = copy
    })

    const reset = () => {
        selectedChoiceQuantities.value = {}
    }

    return {
        selectedChoiceQuantities,
        choiceGroups,
        hasChoices,
        isComposer,
        isMultiSelectGroup,
        groupTargetMin,
        groupTargetMax,
        selectedQuantitiesByGroup,
        selectedCountIn,
        quantityOf,
        selectionList,
        selectedChoice,
        displayPrice,
        isGroupSatisfied,
        allGroupsSatisfied,
        groupHint,
        blockingGroup,
        canIncrement,
        incrementChoice,
        decrementChoice,
        selectExclusive,
        reset,
    }
}

/** The full selection API, passed as one prop to ChoiceGroupPicker. */
export type ProductChoicesApi = ReturnType<typeof useProductChoices>
