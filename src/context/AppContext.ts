import { createContext } from "react";

export interface AppContextType {}

const defaultValue: AppContextType = {};

const AppContext = createContext<AppContextType>(defaultValue);

export default AppContext;
