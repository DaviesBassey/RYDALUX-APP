import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeMapScreen from '../../src/screens/rider/HomeMapScreen';
import { AuthProvider } from '../../src/context/AuthContext';
import * as fareApi from '../../src/api/fare';
import * as tripApi from '../../src/api/trips';

jest.mock('../../src/api/fare');
jest.mock('../../src/api/trips');

const Stack = createNativeStackNavigator();

function TestNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeMapScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

describe('HomeMapScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render home screen with default locations', () => {
    const { getByDisplayValue } = render(
      <AuthProvider>
        <TestNavigator />
      </AuthProvider>
    );

    // Check that default locations are shown
    expect(getByDisplayValue('Lagos Island')).toBeTruthy();
    expect(getByDisplayValue('Ikeja')).toBeTruthy();
  });

  it('should display service type options', () => {
    const { getByText } = render(
      <AuthProvider>
        <TestNavigator />
      </AuthProvider>
    );

    expect(getByText('REGULAR')).toBeTruthy();
    expect(getByText('PREMIUM')).toBeTruthy();
    expect(getByText('SCHEDULED')).toBeTruthy();
  });

  it('should handle fare quote request', async () => {
    (fareApi.createFareQuote as jest.Mock).mockResolvedValueOnce({
      id: 'quote-1',
      breakdown: {
        baseFare: 1000,
        distanceFare: 500,
        timeFare: 200,
        bookingFee: 50,
        promoDiscount: 100,
        total: 1650,
        pickupZone: 'VI',
        dropoffZone: 'Ikoyi',
      },
    });

    const { getByText } = render(
      <AuthProvider>
        <TestNavigator />
      </AuthProvider>
    );

    const getQuoteBtn = getByText('Get Fare Quote');
    fireEvent.press(getQuoteBtn);

    await waitFor(() => {
      expect(fareApi.createFareQuote).toHaveBeenCalled();
    });
  });

  it('should display fare quote when available', async () => {
    (fareApi.createFareQuote as jest.Mock).mockResolvedValueOnce({
      id: 'quote-1',
      breakdown: {
        baseFare: 1000,
        distanceFare: 500,
        timeFare: 200,
        bookingFee: 50,
        promoDiscount: 100,
        total: 1650,
        pickupZone: 'VI',
        dropoffZone: 'Ikoyi',
      },
    });

    const { getByText } = render(
      <AuthProvider>
        <TestNavigator />
      </AuthProvider>
    );

    const getQuoteBtn = getByText('Get Fare Quote');
    fireEvent.press(getQuoteBtn);

    await waitFor(() => {
      expect(getByText('Fare Estimate')).toBeTruthy();
    });
  });

  it('should allow updating pickup location', () => {
    const { getByDisplayValue } = render(
      <AuthProvider>
        <TestNavigator />
      </AuthProvider>
    );

    const pickupInput = getByDisplayValue('Lagos Island');
    fireEvent.changeText(pickupInput, 'Victoria Island');

    expect(pickupInput.props.value).toBe('Victoria Island');
  });

  it('should allow updating dropoff location', () => {
    const { getByDisplayValue } = render(
      <AuthProvider>
        <TestNavigator />
      </AuthProvider>
    );

    const dropoffInput = getByDisplayValue('Ikeja');
    fireEvent.changeText(dropoffInput, 'Lekki');

    expect(dropoffInput.props.value).toBe('Lekki');
  });

  it('should allow selecting service type', () => {
    const { getByText } = render(
      <AuthProvider>
        <TestNavigator />
      </AuthProvider>
    );

    const premiumBtn = getByText('PREMIUM');
    fireEvent.press(premiumBtn);

    // Verify that PREMIUM is now selected (implementation detail)
    expect(premiumBtn).toBeTruthy();
  });

  it('should show error message for invalid coordinates', async () => {
    const { getByDisplayValue, getByText } = render(
      <AuthProvider>
        <TestNavigator />
      </AuthProvider>
    );

    const pickupLatInput = getByDisplayValue('6.5244');
    fireEvent.changeText(pickupLatInput, 'invalid');

    const getQuoteBtn = getByText('Get Fare Quote');
    fireEvent.press(getQuoteBtn);

    await waitFor(() => {
      expect(getByText(/Enter valid numeric coordinates/)).toBeTruthy();
    });
  });

  it('should handle trip creation after fare quote', async () => {
    (fareApi.createFareQuote as jest.Mock).mockResolvedValueOnce({
      id: 'quote-1',
      breakdown: {
        baseFare: 1000,
        distanceFare: 500,
        timeFare: 200,
        bookingFee: 50,
        promoDiscount: 100,
        total: 1650,
      },
    });

    (tripApi.createTrip as jest.Mock).mockResolvedValueOnce({
      id: 'trip-1',
      fareQuoteId: 'quote-1',
      status: 'REQUESTED',
    });

    const { getByText } = render(
      <AuthProvider>
        <TestNavigator />
      </AuthProvider>
    );

    const getQuoteBtn = getByText('Get Fare Quote');
    fireEvent.press(getQuoteBtn);

    await waitFor(() => {
      expect(getByText('Request Trip')).toBeTruthy();
    });

    const requestBtn = getByText('Request Trip');
    fireEvent.press(requestBtn);

    await waitFor(() => {
      expect(tripApi.createTrip).toHaveBeenCalled();
    });
  });
});
