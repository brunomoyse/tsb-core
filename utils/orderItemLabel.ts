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
 * optional `choice`. Category is dropped when it contains "plateau"
 * (products like "Plateau Maki" already carry the word in their name).
 */
export function orderItemLabelParts(input: OrderItemLabelInput): OrderItemLabelParts {
    const code = input.code?.trim() || undefined;
    const rawCategory = input.categoryName?.trim() || undefined;
    const hideCategory = rawCategory?.toLowerCase().includes('plateau');
    return {
        code,
        category: hideCategory ? undefined : rawCategory,
        name: input.productName,
        choice: input.choiceName?.trim() || undefined,
    };
}
