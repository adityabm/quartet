/**
 * Smoke test landing page — memvalidasi infrastruktur testing (Vitest + Testing Library + jsdom).
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../App';

describe('App (landing)', () => {
  it('menampilkan judul "Quartet"', () => {
    render(<App />);
    expect(screen.getByText('Quartet')).toBeInTheDocument();
  });

  it('menavigasi ke form "Main Sendirian" saat tombol diklik', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Main Sendirian' }));
    expect(screen.getByLabelText('Nama kamu')).toBeInTheDocument();
    expect(screen.getByText('Main Sendirian')).toBeInTheDocument();
  });
});
