import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FlashCardsPage from '../features/review/FlashCardsPage';
import { BrowserRouter } from 'react-router-dom';

vi.mock('../store/useStore', () => ({
  useStore: () => ({
    reviewItems: [],
    flashCards: [],
    fetchDueReviews: vi.fn(),
  }),
}));

describe('Review Card', () => {
  it('renders the flashcards page with no cards state', () => {
    render(
      <BrowserRouter>
        <FlashCardsPage />
      </BrowserRouter>
    );
    expect(screen.getByText(/Hàng đợi ôn tập/i)).toBeInTheDocument();
    expect(screen.getByText(/Tuyệt vời/i)).toBeInTheDocument();
  });
});
