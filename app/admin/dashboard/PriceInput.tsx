"use client";
import {useEffect, useRef, useState} from "react";
import {FormControl, FormMessage} from "@/components/ui/form";
import {Input} from "@/components/ui/input";

// @ts-ignore
export const PriceInput = ({ field, fieldState }) => {
    const initialFormattingDone = useRef(false);
    // Function to format the price
    const formatValue = (value: string): number => {
        return parseFloat(String(value).replace(/,/g, '.'));
    };

    useEffect(() => {
        if (!initialFormattingDone.current) {
            const rawValue = field.value.toString();
            const formattedValue = formatValue(rawValue);
            field.onChange(formattedValue);
            initialFormattingDone.current = true;
        }
    }, [field.value]) // eslint-disable-line

    // Format the value when the input loses focus
    const handleBlur = () => {
        const formattedValue = formatValue(field.value);
        field.onChange(formattedValue);
    };

    return (
        <FormControl>
            <Input
                type="float"
                {...field}
                value={formatValue(field.value)}
                onBlur={handleBlur}
            />
        </FormControl>
    );
};

