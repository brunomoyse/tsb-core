// ReduxProvider.tsx
"use client";

import React, { ReactNode } from 'react';
import { Provider } from "react-redux";
import reduxStore from "@/store";

interface ReduxProviderProps {
    children: ReactNode;
}

const ReduxProvider: React.FC<ReduxProviderProps> = ({ children }) => {
    return <Provider store={reduxStore}>{children}</Provider>;
};

export default ReduxProvider;
