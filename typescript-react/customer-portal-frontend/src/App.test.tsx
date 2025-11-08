import React from 'react';
import { render } from '@testing-library/react';
import App from './App';
import { AuthStateAndStatus } from './api/authentication/AuthenticationContext';

const mockInitialAuthState: AuthStateAndStatus = {
  success: false
};

test('renders loading spinner', () => {
  const { container } = render(<App initialAuthState={mockInitialAuthState} />);
  expect(container.querySelector('.sk-spinner')).toBeTruthy()
});
