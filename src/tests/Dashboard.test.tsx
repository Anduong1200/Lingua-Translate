import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DashboardPage from '../features/dashboard/DashboardPage';
import { BrowserRouter } from 'react-router-dom';

vi.mock('../store/useStore', () => ({
  useStore: () => ({
    documents: [],
    savedWords: [],
    reviewItems: [],
    fetchDocuments: vi.fn(),
    learningProgress: { dailyGoal: 0, newWordsLearned: 0, reviewAccuracy: 0, studyTimeMinutes: 0, todayProgress: 0 },
  }),
}));

describe('Dashboard', () => {
  it('renders the dashboard page', () => {
    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );
    expect(screen.getByText(/Chào mừng quay lại/i)).toBeInTheDocument();
  });
});
