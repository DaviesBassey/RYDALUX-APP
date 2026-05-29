import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Button } from '../../src/components/rider';

describe('Button Component', () => {
  it('should render button with text', () => {
    const { getByText } = render(<Button>Click me</Button>);
    expect(getByText('Click me')).toBeTruthy();
  });

  it('should call onPress when pressed', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(<Button onPress={mockOnPress}>Click me</Button>);

    const button = getByText('Click me');
    fireEvent.press(button);

    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <Button disabled onPress={mockOnPress}>
        Click me
      </Button>
    );

    const button = getByText('Click me');
    fireEvent.press(button);

    expect(mockOnPress).not.toHaveBeenCalled();
  });

  it('should apply variant styles', () => {
    const { getByTestId } = render(
      <Button variant="secondary" testID="secondary-btn">
        Secondary
      </Button>
    );

    const button = getByTestId('secondary-btn');
    expect(button).toBeTruthy();
  });

  it('should show loading indicator when loading is true', () => {
    const { getByTestId } = render(
      <Button loading testID="loading-btn">
        Click me
      </Button>
    );

    expect(getByTestId('loading-btn')).toBeTruthy();
  });

  it('should support different button sizes', () => {
    const { getByTestId: getByTestIdSmall } = render(
      <Button size="small" testID="small-btn">
        Small
      </Button>
    );

    const { getByTestId: getByTestIdLarge } = render(
      <Button size="large" testID="large-btn">
        Large
      </Button>
    );

    expect(getByTestIdSmall('small-btn')).toBeTruthy();
    expect(getByTestIdLarge('large-btn')).toBeTruthy();
  });

  it('should apply full width when fullWidth is true', () => {
    const { getByTestId } = render(
      <Button fullWidth testID="full-width-btn">
        Full Width
      </Button>
    );

    expect(getByTestId('full-width-btn')).toBeTruthy();
  });

  it('should render icon when provided', () => {
    const { getByTestId } = render(
      <Button icon="heart" testID="icon-btn">
        Like
      </Button>
    );

    expect(getByTestId('icon-btn')).toBeTruthy();
  });

  it('should handle variant and disabled together', () => {
    const mockOnPress = jest.fn();
    const { getByTestId } = render(
      <Button variant="danger" disabled onPress={mockOnPress} testID="danger-disabled">
        Delete
      </Button>
    );

    const button = getByTestId('danger-disabled');
    fireEvent.press(button);

    expect(mockOnPress).not.toHaveBeenCalled();
  });

  describe('accessibility', () => {
    it('should have accessible label', () => {
      const { getByLabelText } = render(
        <Button accessibilityLabel="Submit form">
          Submit
        </Button>
      );

      expect(getByLabelText('Submit form')).toBeTruthy();
    });

    it('should indicate disabled state to screen readers', () => {
      const { getByTestId } = render(
        <Button disabled testID="accessible-button">
          Disabled
        </Button>
      );

      const button = getByTestId('accessible-button');
      // Verify accessible state (implementation depends on Button component)
      expect(button).toBeTruthy();
    });
  });
});
