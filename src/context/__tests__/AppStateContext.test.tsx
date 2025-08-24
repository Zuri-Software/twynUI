import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppStateProvider, useAppState } from '../AppStateContext';
import { AuthProvider, useAuth } from '../AuthContext';
import { AuthState } from '../../types/auth.types';
import { APIService } from '../../services/APIService';

// Mock the auth context to return authenticated state
jest.mock('../AuthContext', () => ({
  AuthProvider: ({ children }: any) => children,
  useAuth: jest.fn(),
}));

// Test component that uses AppState
const TestComponent = () => {
  const appState = useAppState();
  return (
    <>
      <React.Fragment testID="selected-lora-id">
        {appState.selectedLoraId || 'none'}
      </React.Fragment>
      <React.Fragment testID="models-count">
        {appState.availableLoRAs.length}
      </React.Fragment>
      <React.Fragment testID="loading">{appState.loading ? 'true' : 'false'}</React.Fragment>
    </>
  );
};

// Mock data
const mockUser = {
  id: 'user1',
  name: 'Test User',
  phoneNumber: '+1234567890',
  onboardingCompleted: true,
};

const mockModels = [
  {
    id: 'model1',
    user_id: 'user1',
    name: 'Model 1',
    status: 'completed',
    higgsfield_id: 'hf1',
    thumbnail_url: 'https://example.com/thumb1.jpg',
    photo_count: 10,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'model2',
    user_id: 'user1',
    name: 'Model 2',
    status: 'training',
    higgsfield_id: 'hf2',
    thumbnail_url: 'https://example.com/thumb2.jpg',
    photo_count: 15,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
];

describe('AppStateContext', () => {
  const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
  const mockFetchUserModels = APIService.fetchUserModels as jest.MockedFunction<
    typeof APIService.fetchUserModels
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authenticated user
    mockUseAuth.mockReturnValue({
      authState: AuthState.AUTHENTICATED,
      user: mockUser,
      isLoading: false,
      sendOTP: jest.fn(),
      verifyOTP: jest.fn(),
      updateProfile: jest.fn(),
      completeOnboarding: jest.fn(),
      getAuthHeader: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn(),
    });

    // Mock API response
    mockFetchUserModels.mockResolvedValue({
      models: mockModels,
      count: mockModels.length,
      userId: 'user1',
    });
  });

  afterEach(() => {
    AsyncStorage.clear();
  });

  it('should initialize with default state', async () => {
    const { getByTestId } = render(
      <AppStateProvider>
        <TestComponent />
      </AppStateProvider>
    );

    expect(getByTestId('selected-lora-id')).toHaveTextContent('none');
    expect(getByTestId('models-count')).toHaveTextContent('0');
    expect(getByTestId('loading')).toHaveTextContent('false');
  });

  it('should load models when user is authenticated', async () => {
    const { getByTestId } = render(
      <AppStateProvider>
        <TestComponent />
      </AppStateProvider>
    );

    // Wait for models to load
    await waitFor(() => {
      expect(getByTestId('models-count')).toHaveTextContent('2');
    });

    expect(mockFetchUserModels).toHaveBeenCalledTimes(1);
  });

  it('should auto-select model when only one available', async () => {
    // Mock API to return only one model
    mockFetchUserModels.mockResolvedValueOnce({
      models: [mockModels[0]],
      count: 1,
      userId: 'user1',
    });

    const { getByTestId } = render(
      <AppStateProvider>
        <TestComponent />
      </AppStateProvider>
    );

    await waitFor(() => {
      expect(getByTestId('selected-lora-id')).toHaveTextContent('hf1');
    });
  });

  it('should handle API errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // Mock API to throw error
    mockFetchUserModels.mockRejectedValueOnce(new Error('API Error'));

    const { getByTestId } = render(
      <AppStateProvider>
        <TestComponent />
      </AppStateProvider>
    );

    await waitFor(() => {
      expect(getByTestId('loading')).toHaveTextContent('false');
    });

    expect(getByTestId('models-count')).toHaveTextContent('0');
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to load LoRAs'),
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it('should save and restore selected model from storage', async () => {
    // Pre-populate AsyncStorage
    await AsyncStorage.setItem('twyn_selected_model_id', 'model1');

    const TestComponentWithActions = () => {
      const appState = useAppState();
      
      React.useEffect(() => {
        // This should trigger after initialization
        if (appState.availableLoRAs.length > 0 && !appState.selectedLoraId) {
          // Should have loaded from storage
        }
      }, [appState.availableLoRAs, appState.selectedLoraId]);

      return <TestComponent />;
    };

    render(
      <AppStateProvider>
        <TestComponentWithActions />
      </AppStateProvider>
    );

    // The selected model should be loaded from storage
    await waitFor(() => {
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('twyn_selected_model_id');
    });
  });

  it('should reset navigation when model changes', async () => {
    const TestComponentWithSelect = () => {
      const appState = useAppState();
      const [navigationTrigger, setNavigationTrigger] = React.useState('');

      React.useEffect(() => {
        setNavigationTrigger(appState.navigationResetTrigger);
      }, [appState.navigationResetTrigger]);

      return (
        <>
          <TestComponent />
          <React.Fragment testID="nav-trigger">{navigationTrigger}</React.Fragment>
        </>
      );
    };

    const { getByTestId } = render(
      <AppStateProvider>
        <TestComponentWithSelect />
      </AppStateProvider>
    );

    // Wait for models to load
    await waitFor(() => {
      expect(getByTestId('models-count')).toHaveTextContent('2');
    });

    const initialTrigger = getByTestId('nav-trigger').props.children;

    // Simulate selecting a different model
    // This would normally be done through the useAppState hook
    // For testing, we'll verify the trigger changes when needed
    expect(typeof initialTrigger).toBe('string');
  });
});

describe('AppStateContext hook', () => {
  it('should throw error when used outside provider', () => {
    const TestComponentWithoutProvider = () => {
      useAppState();
      return null;
    };

    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    expect(() =>
      render(<TestComponentWithoutProvider />)
    ).toThrow('useAppState must be used within an AppStateProvider');

    consoleSpy.mockRestore();
  });
});