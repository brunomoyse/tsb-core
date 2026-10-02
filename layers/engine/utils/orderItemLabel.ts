export interface OrderItemLabelInput {
    code?: string | null;
    categoryName?: string | null;
    productName: string;
    choiceName?: string | null;
}

export interface OrderItemLabelParts {
    code?: string;
    category?: string;
    name: string;
    choice?: string;
}

/**
 * Canonical order/cart item label parts — `code · category · name` plus
 * optional `choice`.
 */
export function orderItemLabelParts(input: OrderItemLabelInput): OrderItemLabelParts {
    const code = input.code?.trim() || undefined;
    const rawCategory = input.categoryName?.trim() || undefined;
    return {
        code,
        category: rawCategory,
        name: input.productName,
        choice: input.choiceName?.trim() || undefined,
    };
}

export interface OrderItemChoiceInput {
    choice?: { name: string } | null;
    selections?: { choiceId: string; quantity: number }[] | null;
    product?: { choices?: { id: string; name: string }[] | null };
}

/**
 * The choices of an order line as shown to the customer: "Tonkotsu, Corn x2" (selection quantities are
 * line-wide, like in the cart). The names come from the product's choices because the API's
 * `OrderItemSelection.choice` is not queried (see types/index.ts). Orders from before selections
 * existed fall back to their single `choice`.
 */
export function orderItemChoiceText(item: OrderItemChoiceInput): string | undefined {
    const selections = item.selections ?? [];
    if (selections.length > 0) {
        const names = new Map((item.product?.choices ?? []).map((choice) => [choice.id, choice.name]));
        const text = selections
            .map((selection) => {
                const name = names.get(selection.choiceId);
                if (!name) return '';
                return selection.quantity > 1 ? `${name} x${selection.quantity}` : name;
            })
            .filter(Boolean)
            .join(', ');
        if (text) return text;
    }
    return item.choice?.name?.trim() || undefined;
}
