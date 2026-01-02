import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Home from '../pages/Home';

describe('Home Page', () => {
  it('renders welcome message', () => {
    render(<Home />);
    expect(screen.getByText(/Welcome to Heltum/i)).toBeInTheDocument();
  });

  it('renders page content', () => {
    render(<Home />);
    expect(screen.getByText(/This is the home page/i)).toBeInTheDocument();
  });
});
