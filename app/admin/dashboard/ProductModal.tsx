"use client";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"

import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

import * as z from "zod";
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import {zodResolver} from "@hookform/resolvers/zod";
import {PriceInput} from "@/app/admin/dashboard/PriceInput";
import {useQuery, useMutation} from "@apollo/client";
import {CREATE_PRODUCT_MUTATION, UPDATE_PRODUCT_MUTATION} from "@/graphql/mutations";
import {TAGS_QUERY} from "@/graphql/queries";
import {Textarea} from "@/components/ui/textarea";
import {useEffect, useState, CSSProperties} from "react";
import {SelectViewport} from "@radix-ui/react-select";
import * as React from "react";
import {width} from "@mui/system";

interface ProductModalComponentProps {
    isEditing: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onProductUpdate: () => void;
    selectedProduct: Product | null;
}

export const ProductModal = ({ isEditing, onOpenChange, onProductUpdate,  selectedProduct }: ProductModalComponentProps) => {
    // Set up the mutation functions
    const [updateProduct, { loading: updateLoading}] = useMutation(UPDATE_PRODUCT_MUTATION);
    const [createProduct, { loading: createLoading}] = useMutation(CREATE_PRODUCT_MUTATION);
    // State to control image display
    const [showImageInput, setShowImageInput] = useState(false);
    const [productTags, setProductTags] = useState<ProductTag[]>([]);

    useQuery(TAGS_QUERY, {
        variables: { locale: 'FR' },
        fetchPolicy: 'cache-and-network',
        onCompleted: (data) => {
            const sortedTags: ProductTag[] = [...data.tags].sort((a: ProductTag, b: ProductTag) =>
                a.productTagTranslations[0].name.localeCompare(b.productTagTranslations[0].name)
            );
            setProductTags(sortedTags);
        },

        onError: (error) => {
            console.error('Error fetching tags:', error);
        }
    });

    // Submit handler
    const onSubmit = async (data: any) => {
        try {
            // Create a FormData instance
            const formData = new FormData();

            // Convert the price to a float if it's a string
            const price = typeof data.price === 'string' ? parseFloat(data.price.replace(/,/g, '.')) : data.price;
            // Call the mutation function
            // if product exists and id is not null
            if (selectedProduct && selectedProduct.id) {
                const res = await updateProduct({
                    variables: {
                        id: selectedProduct.id,
                        input: {
                            //...data,
                            productTranslations: {
                                update: [
                                    {
                                        locale: 'FR',
                                        name: data.name_french,
                                        description: data.description_french
                                    },
                                    {
                                        locale: 'EN',
                                        name: data.name_english,
                                        description: data.description_english
                                    }
                                ]
                            },
                            productTags: {
                                connect: [data.category]
                            },
                            code: data.code,
                            price: price,
                        },
                    },
                });

                if (data.image && data.image.length > 0) {
                    const productId = res.data.updateProduct.id;
                    await uploadImage(productId, data.image[0]);
                }
            } else {

                // First, construct your variables as a normal JSON
                const variables = {
                    input: {
                        productTranslations: {
                            create: [
                                {
                                    locale: 'FR',
                                    name: data.name_french,
                                    description: data.description_french
                                },
                                {
                                    locale: 'EN',
                                    name: data.name_english,
                                    description: data.description_english
                                }
                            ]
                        },
                        productTags: {
                            connect: [data.category]
                        },
                        price: price,
                        code: data.code,
                        image: null
                    }
                };

                // Send the formData as the variables for the mutation
                const res = await createProduct({
                    variables: variables
                });

                if (data.image && data.image.length > 0) {
                    const productId = res.data.createProduct.id;
                    await uploadImage(productId, data.image[0]);
                }
            }

            // Call the callback function with the updated product to update in the main list
            onProductUpdate();

            // Close the dialog or indicate success as needed
            onOpenChange(false);
        } catch (err) {
            // Handle errors, perhaps set some local state to show an error message
            console.error('Error updating product:', err);
        }
    };

    async function uploadImage(productId: string, file: string | Blob) {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('product_id', productId);

        try {
            const fileEndpoint = process.env.API_FILE_ENDPOINT || '';

            const response = await fetch(fileEndpoint, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Image upload failed: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error uploading image:', error);
        }
    }

    const formSchema = z.object({
        code: z.string(),
        name_french: z.string().min(2).max(50),
        description_french: z.string(),
        name_english: z.string().min(2).max(50),
        description_english: z.string(),
        price: z.number().min(0.01).max(999.99),
        category: z.string().uuid(),
        image: z.any().optional(),
    });

    const form = useForm({
        resolver: zodResolver(formSchema),
    });

    const { register, handleSubmit, watch, reset } = form;

    // Effect to reset the form whenever the selectedProduct changes
    useEffect(() => {
        if (selectedProduct) {

            console.log(selectedProduct);
            const category = selectedProduct.productTags[0]?.id || '';
            reset({
                code: selectedProduct.code || '',
                name_french: selectedProduct.productTranslations.find(p => p.locale === 'FR')?.name || '',
                description_french: selectedProduct.productTranslations.find(p => p.locale === 'FR')?.description || '',
                name_english: selectedProduct.productTranslations.find(p => p.locale === 'EN')?.name || '',
                description_english: selectedProduct.productTranslations.find(p => p.locale === 'EN')?.description || '',
                price: selectedProduct.price || 0,
                category: category,
            });
        } else {
            // Default values for creating a new product
            reset({
                code: '',
                name_french: '',
                description_french: '',
                name_english: '',
                description_english: '',
                price: 0,
                category: '',
            });
        }
    }, [selectedProduct, reset]);

    // CSS for viewport of the select
    const selectViewPort: CSSProperties = {
        maxHeight: '200px',
        overflowY: 'auto',
    }

    // Clear image handler
    const handleClearImage = () => {
        setShowImageInput(true);
    };

    return (
        <Dialog open={isEditing} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[625px]">
                <DialogHeader>
                    <DialogTitle className='text-black'>
                        {selectedProduct && selectedProduct.id ? 'Modifier' : 'Ajouter'} un produit
                    </DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 py-4 text-black ">
                    <Form {...form}>
                        <FormField
                            control={form.control}
                            name="code"
                            render={({ field, fieldState }) => (
                                <FormItem>
                                    <FormLabel>Code</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage>
                                        {fieldState?.error ? fieldState.error.message : null}
                                    </FormMessage>
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-3">
                                <FormField
                                    control={form.control}
                                    name="name_french"
                                    render={({ field, fieldState }) => (
                                        <FormItem>
                                            <FormLabel>Nom (FR)</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage>
                                                {fieldState.error ? fieldState.error.message : null}
                                            </FormMessage>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="name_english"
                                    render={({ field, fieldState }) => (
                                        <FormItem>
                                            <FormLabel>Nom (EN)</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage>
                                                {fieldState.error ? fieldState.error.message : null}
                                            </FormMessage>
                                        </FormItem>
                                    )}
                                />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                                <FormField
                                    control={form.control}
                                    name="description_french"
                                    render={({ field, fieldState }) => (
                                        <FormItem>
                                            <FormLabel>Description (FR)</FormLabel>
                                            <FormControl>
                                                <Textarea className="resize-none" {...field} />
                                            </FormControl>
                                            <FormMessage>
                                                {fieldState.error ? fieldState.error.message : null}
                                            </FormMessage>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="description_english"
                                    render={({ field, fieldState }) => (
                                        <FormItem>
                                            <FormLabel>Description (EN)</FormLabel>
                                            <FormControl>
                                                <Textarea className="resize-none" {...field} />
                                            </FormControl>
                                            <FormMessage>
                                                {fieldState.error ? fieldState.error.message : null}
                                            </FormMessage>
                                        </FormItem>
                                    )}
                                />
                        </div>

                        <FormField
                            control={form.control}
                            name="category"
                            render={({ field, fieldState }) => (
                                <FormItem>
                                    <FormLabel>Catégorie</FormLabel>
                                    <FormControl>
                                        <Select value={field.value} onValueChange={value => field.onChange(value)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sélectionner une catégorie" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectViewport style={selectViewPort}>
                                                    <SelectGroup>
                                                        {productTags.map((tag: ProductTag) => (
                                                            <SelectItem key={tag.id} value={tag.id}>
                                                                {tag.productTagTranslations[0].name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectGroup>
                                                </SelectViewport>
                                            </SelectContent>
                                        </Select>
                                    </FormControl>
                                    <FormMessage>
                                        {fieldState?.error ? fieldState.error.message : null}
                                    </FormMessage>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="price"
                            render={({ field, fieldState }) => (
                                <FormItem>
                                    <FormLabel>Prix</FormLabel>
                                    <PriceInput field={field} fieldState={fieldState} />
                                    <FormMessage>
                                        {fieldState?.error ? fieldState.error.message : null}
                                    </FormMessage>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="image"
                            render={({ field, fieldState }) => (
                                <FormItem>
                                    <FormLabel>Image</FormLabel>
                                    <FormControl>
                                        {selectedProduct && selectedProduct.preview && selectedProduct.preview.path && !showImageInput ? (
                                            <div>
                                                {/* eslint-disable-next-line react/no-unescaped-entities */}
                                                <Button onClick={handleClearImage} className="my-4">Changer l'image</Button>

                                                <picture className="hover:scale-105 duration-700 p-6 pb-8">
                                                    <source
                                                        srcSet={`${process.env.AWS_S3_BUCKET_ENDPOINT!}/images/thumbnails/${selectedProduct?.preview?.path}.avif`}
                                                        type="image/avif"/>
                                                    <source
                                                        srcSet={`${process.env.AWS_S3_BUCKET_ENDPOINT!}/images/thumbnails/${selectedProduct?.preview?.path}.webp`}
                                                        type="image/webp"/>
                                                    <img
                                                        src={`${process.env.AWS_S3_BUCKET_ENDPOINT!}/images/thumbnails/${selectedProduct?.preview?.path}.png`}
                                                        alt={selectedProduct.productTranslations[0].name}
                                                        draggable={false}
                                                        className="w-28 mt-4"
                                                    />
                                                </picture>
                                            </div>
                                        ) : (
                                            <Input
                                                type="file"
                                                {...register('image', {required: !selectedProduct})}
                                                accept=".png, .jpg, .jpeg"
                                            />
                                        )}
                                    </FormControl>
                                    <FormMessage>
                                        {fieldState?.error ? fieldState.error.message : null}
                                    </FormMessage>
                                </FormItem>
                            )}
                        />

                    </Form>
                </div>
                <DialogFooter>
                    <Button type="submit" onClick={form.handleSubmit(onSubmit)} disabled={updateLoading||createLoading}>
                        Enregistrer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
