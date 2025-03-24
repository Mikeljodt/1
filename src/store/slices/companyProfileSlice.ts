import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { getDB, CompanyProfile } from '@/lib/db';

interface CompanyProfileState {
  profile: CompanyProfile | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: CompanyProfileState = {
  profile: null,
  status: 'idle',
  error: null,
};

export const fetchCompanyProfile = createAsyncThunk('companyProfile/fetchCompanyProfile', async () => {
  const db = await getDB();
  // There should only be one company profile, with ID 'main'
  const profile = await db.get('company_profile', 'main');
  return profile || null;
});

export const saveCompanyProfile = createAsyncThunk(
  'companyProfile/saveCompanyProfile',
  async (profileData: Omit<CompanyProfile, 'id' | 'createdAt' | 'updatedAt'>) => {
    const db = await getDB();
    const now = new Date().toISOString();
    
    // Check if profile already exists
    const existingProfile = await db.get('company_profile', 'main');
    
    if (existingProfile) {
      // Update existing profile
      const updatedProfile: CompanyProfile = {
        ...existingProfile,
        ...profileData,
        updatedAt: now,
      };
      
      await db.put('company_profile', updatedProfile);
      return updatedProfile;
    } else {
      // Create new profile
      const newProfile: CompanyProfile = {
        ...profileData,
        id: 'main',
        createdAt: now,
        updatedAt: now,
      };
      
      await db.add('company_profile', newProfile);
      return newProfile;
    }
  }
);

const companyProfileSlice = createSlice({
  name: 'companyProfile',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCompanyProfile.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchCompanyProfile.fulfilled, (state, action: PayloadAction<CompanyProfile | null>) => {
        state.status = 'succeeded';
        state.profile = action.payload;
      })
      .addCase(fetchCompanyProfile.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch company profile';
      })
      .addCase(saveCompanyProfile.fulfilled, (state, action: PayloadAction<CompanyProfile>) => {
        state.profile = action.payload;
        state.status = 'succeeded';
      });
  },
});

export default companyProfileSlice.reducer;
