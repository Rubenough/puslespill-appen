import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error: Error | null };

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error.message, info.componentStack);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 items-center justify-center bg-surface dark:bg-surface-dark px-8">
          <Text className="text-xl font-semibold text-content dark:text-content-dark mb-2">
            Noe gikk galt
          </Text>
          <Text className="text-sm text-content-secondary dark:text-content-secondary-dark mb-8 text-center">
            Noe uventet skjedde. Prøv å starte på nytt.
          </Text>
          <TouchableOpacity
            onPress={this.reset}
            accessibilityRole="button"
            accessibilityLabel="Prøv igjen"
            className="bg-accent dark:bg-accent-dark rounded-xl px-6 py-3"
          >
            <Text className="text-white font-medium">Prøv igjen</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}
