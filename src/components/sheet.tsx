import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type MenuOption = { label: string; onPress: () => void; destructive?: boolean };

/** Bottom action sheet. Built on RN Modal so it behaves the same on iOS, Android and web. */
export function ActionMenu({
  title,
  options,
  onClose,
}: {
  title?: string;
  options: MenuOption[] | null;
  onClose: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={options !== null} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {/* Sibling, not parent, of the sheet so taps on the sheet's padding don't dismiss it. */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close menu" />
        <View style={[styles.sheet, { backgroundColor: theme.background, paddingBottom: insets.bottom + Spacing.three }]}>
          {title && (
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.title}>
              {title}
            </ThemedText>
          )}
          {options?.map((o) => (
            <Pressable
              key={o.label}
              onPress={() => {
                onClose();
                // iOS can't present a screen or alert while this modal is still fading out.
                setTimeout(o.onPress, 300);
              }}
              style={({ pressed }) => [
                styles.option,
                { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement },
              ]}>
              <ThemedText style={[styles.optionText, o.destructive && styles.destructive]}>{o.label}</ThemedText>
            </Pressable>
          ))}
          <Button label="Cancel" variant="plain" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

/** Single text field dialog, since Alert.prompt is iOS-only. */
export function PromptDialog({
  title,
  initialValue,
  visible,
  onSubmit,
  onClose,
}: {
  title: string;
  initialValue: string;
  visible: boolean;
  onSubmit: (value: string) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.backdrop, styles.center]}>
        {/* Remount per open so the field starts from the current name. */}
        {visible && (
          <PromptBody title={title} initialValue={initialValue} onSubmit={onSubmit} onClose={onClose} theme={theme} />
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

function PromptBody({
  title,
  initialValue,
  onSubmit,
  onClose,
  theme,
}: {
  title: string;
  initialValue: string;
  onSubmit: (value: string) => void;
  onClose: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const [value, setValue] = useState(initialValue);
  const submit = () => {
    if (value.trim()) onSubmit(value.trim());
    onClose();
  };
  return (
    <View style={[styles.dialog, { backgroundColor: theme.background }]}>
      <ThemedText style={styles.dialogTitle}>{title}</ThemedText>
      <TextInput
        value={value}
        onChangeText={setValue}
        autoFocus
        selectTextOnFocus
        returnKeyType="done"
        onSubmitEditing={submit}
        style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
      />
      <View style={styles.dialogButtons}>
        <Button label="Cancel" variant="secondary" onPress={onClose} style={styles.flex} />
        <Button label="Save" onPress={submit} style={styles.flex} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  center: {
    justifyContent: 'center',
    padding: Spacing.four,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.three,
    gap: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  title: {
    textAlign: 'center',
    paddingVertical: Spacing.one,
  },
  option: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderCurve: 'continuous',
  },
  optionText: {
    fontSize: 17,
    fontWeight: 600,
  },
  destructive: {
    color: '#E5484D',
  },
  dialog: {
    borderRadius: 24,
    padding: Spacing.four,
    gap: Spacing.three,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    borderCurve: 'continuous',
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: 700,
  },
  input: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    fontSize: 17,
  },
  dialogButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
});
