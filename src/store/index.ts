import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import clientsReducer from './slices/clientsSlice';
import machinesReducer from './slices/machinesSlice';
import expensesReducer from './slices/expensesSlice';
import collectionsReducer from './slices/collectionsSlice';
import companyProfileReducer from './slices/companyProfileSlice';
import counterReducer from './slices/counterSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    clients: clientsReducer,
    machines: machinesReducer,
    expenses: expensesReducer,
    collections: collectionsReducer,
    companyProfile: companyProfileReducer,
    counter: counterReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
