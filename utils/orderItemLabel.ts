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
