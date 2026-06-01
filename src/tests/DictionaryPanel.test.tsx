import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import VocabularyPage from '../features/dictionary/VocabularyPage';
import { BrowserRouter } from 'react-router-dom';

vi.mock('../store/useStore', () => ({
  useStore: () => ({
    savedWords: [],
    userCorrections: [],
    knownWords: [],
    fetchVocabulary: vi.fn(),
  }),
}));

describe('Dictionary Panel', () => {
  it('renders the vocabulary page with empty state', () => {
    render(
      <BrowserRouter>
        <VocabularyPage />
      </BrowserRouter>
    );
    expect(screen.getByText(/Thư viện từ vựng/i)).toBeInTheDocument();
  });
});
