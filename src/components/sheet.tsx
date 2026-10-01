import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  type KeyboardTypeOptions,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { EASE_SHEET } from '@/constants/motion';
import { MaxContentWidth, Radius, Spacing, textStyle } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type MenuOption = { label: string; onPress: () => void; destructive?: boolean };

/**
 * Bottom action sheet. Built on RN Modal so it behaves the same on iOS, Android and web. It slides
 * up from the bottom edge and leaves the same way, while the scrim fades.
 */
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
  const reduceMotion = useReducedMotion();
  // What's on screen lags `options` by the slide-out, so the sheet keeps its content while it leaves.
  const [shown, setShown] = useState(options);
  const [shownTitle, setShownTitle] = useState(title);
  if (options && (options !== shown || title !== shownTitle)) {
    setShown(options);
    setShownTitle(title);
  }

  // 0 = off screen, 1 = up. Reduce Motion keeps the timing but swaps the slide for a fade. The sheet's height is measured; until then it sits well below the screen.
  const progress = useSharedValue(0);
  const height = useSharedValue(1000);
  const open = options !== null;
  useEffect(() => {
    if (open) {
      progress.set(withTiming(1, { duration: 300, easing: EASE_SHEET, reduceMotion: ReduceMotion.Never }));
    } else {
      // Leaves the way it came, a little quicker, then the modal goes.
      progress.set(
        withTiming(0, { duration: 200, easing: EASE_SHEET, reduceMotion: ReduceMotion.Never }, (finished) => {
          if (finished) scheduleOnRN(setShown, null);
        })
      );
    }
  }, [open, progress]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.get() }));
  const sheetStyle = useAnimatedStyle(() =>
    reduceMotion
      ? { opacity: progress.get() }
      : { transform: [{ translateY: (1 - progress.get()) * height.get() }] }
  );

  return (
    <Modal visible={shown !== null} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.sheetContainer} pointerEvents={open ? 'auto' : 'none'}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, backdropStyle]}>
          {/* Sibling, not parent, of the sheet so taps on the sheet's padding don't dismiss it. */}
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close menu" />
        </Animated.View>
        <Animated.View
          onLayout={(e) => height.set(e.nativeEvent.layout.height + insets.bottom)}
          style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.two }, sheetStyle]}>
          <View style={[styles.group, { backgroundColor: theme.surface }]}>
            {shownTitle && (
              <ThemedText type="footnote" themeColor="textSecondary" style={styles.title}>
                {shownTitle}
              </ThemedText>
            )}
            {shown?.map((o, i) => (
              <View key={o.label}>
                {(i > 0 || shownTitle) && <View style={[styles.divider, { backgroundColor: theme.separator }]} />}
                <Pressable
                  onPress={() => {
                    onClose();
                    // iOS can't present a screen or alert while this modal is still sliding out.
                    setTimeout(o.onPress, 300);
                  }}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.option, pressed && { backgroundColor: theme.fillStrong }]}>
                  <ThemedText style={[styles.optionText, { color: o.destructive ? theme.destructive : theme.accent }]}>
                    {o.label}
                  </ThemedText>
                </Pressable>
              </View>
            ))}
          </View>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.group,
              styles.option,
              { backgroundColor: pressed ? theme.fillStrong : theme.surface },
            ]}>
            <ThemedText type="headline" style={[styles.optionText, { color: theme.accent }]}>
              Cancel
            </ThemedText>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

/** Single text field dialog, since Alert.prompt is iOS-only. */
export function PromptDialog({
  title,
  initialValue,
  visible,
  keyboardType,
  placeholder,
  onSubmit,
  onClose,
}: {
  title: string;
  initialValue: string;
  visible: boolean;
  keyboardType?: KeyboardTypeOptions;
  placeholder?: string;
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
          <PromptBody
            title={title}
            initialValue={initialValue}
            keyboardType={keyboardType}
            placeholder={placeholder}
            onSubmit={onSubmit}
            onClose={onClose}
            theme={theme}
          />
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

function PromptBody({
  title,
  initialValue,
  keyboardType,
  placeholder,
  onSubmit,
  onClose,
  theme,
}: {
  title: string;
  initialValue: string;
  keyboardType?: KeyboardTypeOptions;
  placeholder?: string;
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
    <View style={[styles.dialog, { backgroundColor: theme.surface }]}>
      <ThemedText type="headline" style={styles.dialogTitle}>
        {title}
      </ThemedText>
      <TextInput
        value={value}
        onChangeText={setValue}
        autoFocus
        selectTextOnFocus
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        returnKeyType="done"
        onSubmitEditing={submit}
        accessibilityLabel={title}
        style={[styles.input, { color: theme.text, backgroundColor: theme.fill }]}
      />
      <View style={styles.dialogButtons}>
        <Button label="Cancel" variant="tinted" onPress={onClose} style={styles.flex} />
        <Button label="Save" onPress={submit} style={styles.flex} />
      </View>
    </View>
  );
}

/** A centred dialog with free-form content and two choices, for questions that need more than a line. */
export function ChoiceDialog({
  visible,
  title,
  message,
  children,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message?: string;
  children?: React.ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const theme = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={[styles.backdrop, styles.center]}>
        <View style={[styles.dialog, { backgroundColor: theme.surface }]} accessibilityViewIsModal>
          <View style={styles.dialogText}>
            <ThemedText type="headline" style={styles.dialogTitle}>
              {title}
            </ThemedText>
            {message && (
              <ThemedText type="subheadline" themeColor="textSecondary" style={styles.dialogTitle}>
                {message}
              </ThemedText>
            )}
          </View>
          {children}
          <View style={styles.choiceButtons}>
            <Button label={confirmLabel} onPress={onConfirm} />
            <Button label={cancelLabel} variant="plain" onPress={onCancel} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dialogText: {
    gap: Spacing.one,
  },
  choiceButtons: {
    gap: Spacing.one,
  },
  flex: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  center: {
    justifyContent: 'center',
    padding: Spacing.four,
  },
  sheet: {
    paddingHorizontal: Spacing.two,
    gap: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  group: {
    borderRadius: Radius,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  title: {
    textAlign: 'center',
    fontWeight: 600,
    paddingVertical: Spacing.three - 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  option: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    fontSize: 20,
    lineHeight: 25,
  },
  dialog: {
    borderRadius: Radius + 6,
    padding: Spacing.four,
    gap: Spacing.three,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    borderCurve: 'continuous',
  },
  dialogTitle: {
    textAlign: 'center',
  },
  input: {
    ...textStyle('body'),
    height: 44,
    borderRadius: 10,
    paddingHorizontal: Spacing.three - 4,
    minWidth: 0,
  },
  dialogButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
});
