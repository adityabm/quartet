/**
 * Smoke test landing page — memvalidasi infrastruktur testing (Vitest + Testing Library + jsdom).
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../App';

describe('App (landing)', () => {
  it('menampilkan judul "Quartet"', () => {
    render(<App />);
    expect(screen.getByText('Quartet')).toBeInTheDocument();
  });
});