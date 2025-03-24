import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { getDB, Expense } from '@/lib/db';
import { generateUniqueId } from '@/lib/utils';

interface ExpensesState {
  expenses: Expense[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: ExpensesState = {
  expenses: [],
  status: 'idle',
  error: null,
};

export const fetchExpenses = createAsyncThunk('expenses/fetchExpenses', async () => {
  const db = await getDB();
  return db.getAll('expenses');
});

export const addExpense = createAsyncThunk(
  'expenses/addExpense',
  async (expenseData: Omit<Expense, 'id' | 'createdAt'>) => {
    const db = await getDB();
    
    const newExpense: Expense = {
      ...expenseData,
      id: generateUniqueId(),
      createdAt: new Date().toISOString(),
    };
    
    await db.add('expenses', newExpense);
    
    // If this expense is related to a machine, update the machine history
    if (expenseData.machineId) {
      const machine = await db.get('machines', expenseData.machineId);
      if (machine) {
        const updatedMachine = {
          ...machine,
          history: [
            ...machine.history,
            {
              date: newExpense.createdAt,
              action: 'expense',
              details: `Expense of ${expenseData.amount} recorded: ${expenseData.description}`
            }
          ],
          updatedAt: newExpense.createdAt
        };
        await db.put('machines', updatedMachine);
      }
    }
    
    return newExpense;
  }
);

export const updateExpense = createAsyncThunk(
  'expenses/updateExpense',
  async ({ id, ...updates }: Partial<Expense> & { id: string }) => {
    const db = await getDB();
    const expense = await db.get('expenses', id);
    
    if (!expense) {
      throw new Error('Expense not found');
    }
    
    const updatedExpense: Expense = {
      ...expense,
      ...updates,
    };
    
    await db.put('expenses', updatedExpense);
    return updatedExpense;
  }
);

export const deleteExpense = createAsyncThunk(
  'expenses/deleteExpense',
  async (id: string) => {
    const db = await getDB();
    await db.delete('expenses', id);
    return id;
  }
);

const expensesSlice = createSlice({
  name: 'expenses',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchExpenses.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchExpenses.fulfilled, (state, action: PayloadAction<Expense[]>) => {
        state.status = 'succeeded';
        state.expenses = action.payload;
      })
      .addCase(fetchExpenses.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch expenses';
      })
      .addCase(addExpense.fulfilled, (state, action: PayloadAction<Expense>) => {
        state.expenses.push(action.payload);
      })
      .addCase(updateExpense.fulfilled, (state, action: PayloadAction<Expense>) => {
        const index = state.expenses.findIndex((expense) => expense.id === action.payload.id);
        if (index !== -1) {
          state.expenses[index] = action.payload;
        }
      })
      .addCase(deleteExpense.fulfilled, (state, action: PayloadAction<string>) => {
        state.expenses = state.expenses.filter((expense) => expense.id !== action.payload);
      });
  },
});

export default expensesSlice.reducer;
