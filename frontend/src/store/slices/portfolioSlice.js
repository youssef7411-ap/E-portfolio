import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { API_URL } from '../../config/api';

export const fetchPortfolioData = createAsyncThunk(
  'portfolio/fetchData',
  async (_, { rejectWithValue }) => {
    try {
      const [subjectsRes, postsRes] = await Promise.all([
        fetch(`${API_URL}/api/subjects`),
        fetch(`${API_URL}/api/posts`),
      ]);

      if (!subjectsRes.ok || !postsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const subjects = await subjectsRes.json();
      const posts = await postsRes.json();

      return {
        subjects: Array.isArray(subjects) ? subjects.filter(s => s.visible !== false) : [],
        posts: Array.isArray(posts) ? posts : [],
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const portfolioSlice = createSlice({
  name: 'portfolio',
  initialState: {
    subjects: [],
    posts: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPortfolioData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPortfolioData.fulfilled, (state, action) => {
        state.loading = false;
        state.subjects = action.payload.subjects;
        state.posts = action.payload.posts;
      })
      .addCase(fetchPortfolioData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default portfolioSlice.reducer;
