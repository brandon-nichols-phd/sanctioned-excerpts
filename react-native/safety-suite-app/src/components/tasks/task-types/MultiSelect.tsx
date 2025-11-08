import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
} from 'react-native';
import { Task } from '../../../data/task';
import { PATHSPOT_COLORS } from '../../../constants/constants';
import { windowWidth } from '../../../../utils/Dimensions';
import { platformIOS } from '../../../../utils/utils';

type MultiSelectProps = {
  task: Task;
  readOnly: boolean;
  saveResponse: (response: string[]) => void;
};
function normalizeToStringArray(resp: unknown): string[] {
  if (resp == null) return [];

  // Already an array
  if (Array.isArray(resp)) {
    if (resp.length === 0) return [];
    return typeof resp[0] === 'number'
      ? (resp as number[]).map(String)
      : (resp as string[]).map(String);
  }

  if (typeof resp === 'string' && resp.trim().startsWith('[')) {
    try {
      const arr = JSON.parse(resp);
      return Array.isArray(arr) ? arr.map(String) : [];
    } catch {
      // fall through
    }
  }

  if (typeof resp === 'string') {
    const s = resp.trim();
    const inner = s.replace(/^\{|\}$/g, ''); 
    if (!inner) return [];
    return inner
      .split(',')
      .map((p) => p.trim().replace(/^"|"$/g, ''))
      .filter(Boolean)
      .map(String);
  }

  return [];
}


const MultiSelect: React.FC<MultiSelectProps> = ({ task, readOnly, saveResponse }) => {
  const rawOptions = Array.isArray(task.options) ? task.options : [];
  const allOptions = useMemo(() => rawOptions.map(String), [rawOptions]);

  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    setSelected(normalizeToStringArray(task.taskResponse));
  }, [task.taskResponse]);

  const correctnessIndexes = Array.isArray(task.correctness) ? task.correctness : [];
  const hasCorrectness = correctnessIndexes.length > 0;

  const correctTextSet = useMemo(() => {
    if (!hasCorrectness) return new Set<string>();
    const set = new Set<string>();
    correctnessIndexes.forEach((i) => {
      const v = allOptions[i];
      if (v != null) set.add(v);
    });
    return set;
  }, [hasCorrectness, correctnessIndexes, allOptions]);

  const filtered = useMemo(() => {
    if (!query.trim()) return allOptions;
    const q = query.trim().toLowerCase();
    return allOptions.filter((o) => o.toLowerCase().includes(q));
  }, [allOptions, query]);

  const toggle = useCallback((option: string) => {
    if (readOnly) return;
    const isSelected = selected.includes(option);
    const next = isSelected ? selected.filter((o) => o !== option) : [...selected, option];

    if (hasCorrectness) {
      const hasAtLeastOneCorrect = next.some((opt) => correctTextSet.has(opt));
      if (!hasAtLeastOneCorrect && next.length > 0) return;
    }

    setSelected(next);
    saveResponse(next); // still saving strings like ["1","2",...]
  }, [selected, readOnly, hasCorrectness, correctTextSet, saveResponse]);

  const selectAll = useCallback(() => {
    if (readOnly) return;
    const base = filtered;
    let next = base;

    if (hasCorrectness) {
      // when correctness is enforced, “Select all” means “select all correct in filtered”
      next = base.filter((o) => correctTextSet.has(o));
      if (next.length === 0 && base.length > 0) {
        // If there are no "correct" options in the filter, do nothing
        return;
      }
    }

    setSelected(next);
    saveResponse(next);
  }, [filtered, hasCorrectness, correctTextSet, readOnly, saveResponse]);

  const clearAll = useCallback(() => {
    if (readOnly) return;
    setSelected([]);
    saveResponse([]);
  }, [readOnly, saveResponse]);

  const renderChip = (item: string) => (
    <Pressable
      key={item}
      accessibilityRole="button"
      onPress={() => toggle(item)}
      disabled={readOnly}
      style={({ pressed }) => [
        styles.chip,
        pressed && !readOnly ? styles.pressed : null,
      ]}
    >
      <Text style={styles.chipText}>{item}</Text>
      {!readOnly && <Text style={styles.chipX}>✕</Text>}
    </Pressable>
  );

  if (allOptions.length === 0) {
    return <Text style={styles.errorText}>No options available for this task.</Text>;
  }

  return (
    <View style={styles.container}>
      {/* Selected chips */}
      {selected.length > 0 && (
        <View style={styles.chipsRow}>
          <Text style={styles.header}>Selected:</Text>
          <View style={styles.chipsWrap}>{selected.map(renderChip)}</View>
        </View>
      )}

      {/* Controls */}
      <View style={styles.controlsRow}>
        <TextInput
          editable={!readOnly}
          value={query}
          onChangeText={setQuery}
          placeholder="Search options..."
          placeholderTextColor="#9aa0a6"
          style={[styles.searchInput, readOnly && styles.disabledInput]}
        />
        {!readOnly && (
          <>
            <Pressable
              onPress={selectAll}
              accessibilityRole="button"
              style={({ pressed }) => [styles.controlBtn, pressed ? styles.pressed : null]}
            >
              <Text style={styles.controlBtnText}>Select all</Text>
            </Pressable>
            <Pressable
              onPress={clearAll}
              accessibilityRole="button"
              style={({ pressed }) => [styles.controlBtn, pressed ? styles.pressed : null]}
            >
              <Text style={styles.controlBtnText}>Clear</Text>
            </Pressable>
          </>
        )}
      </View>

      {/* Options */}
      <FlatList
        data={filtered}
        keyExtractor={(item, index) => `${item}-${index}`}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item, index }) => {
          const isSelected = selected.includes(item);
          const isCorrect = !hasCorrectness || correctTextSet.has(item);

          return (
            <Pressable
              onPress={() => toggle(item)}
              disabled={readOnly}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.option,
                isSelected && styles.selectedOption,
                !isCorrect && styles.incorrectOption,
                pressed && !readOnly ? styles.pressed : null,
              ]}
            >
              <View style={styles.optionRow}>
                <View style={[styles.checkbox, isSelected && styles.checkboxOn]}>
                  {isSelected && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text
                  style={[
                    styles.optionText,
                    !isCorrect && styles.optionTextIncorrect,
                  ]}
                >
                  {item}
                </Text>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.incompleteText}>
            {query ? 'No matches.' : 'No options.'}
          </Text>
        }
      />

      {readOnly && selected.length === 0 && (
        <Text style={styles.incompleteText}>No options selected.</Text>
      )}
    </View>
  );
};

const BOX_W = platformIOS.isPad ? windowWidth * 0.32 : windowWidth * 0.9;

const styles = StyleSheet.create({
  container: {
    width: BOX_W,
    borderColor: '#dfe1e5',
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: 'white',
    padding: 12,
  },
  header: {
    fontSize: 14,
    fontWeight: '600',
    color: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
    marginBottom: 8,
  },
  chipsRow: {
    marginBottom: 8,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#eef3ff',
    borderRadius: 999,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {
    color: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
    marginRight: 6,
    fontSize: 14,
  },
  chipX: {
    color: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
    fontWeight: '700',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#dfe1e5',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
    backgroundColor: 'white',
  },
  controlBtn: {
    borderWidth: 1,
    borderColor: '#dfe1e5',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
  },
  controlBtnText: {
    fontSize: 13,
    color: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
    fontWeight: '600',
  },
  options: { width: '100%' },
  option: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginVertical: 5,
    borderWidth: 1,
    borderRadius: 8,
    borderColor: PATHSPOT_COLORS.PATHSPOT_LIGHT_GREY,
    backgroundColor: 'white',
  },
  selectedOption: {
    backgroundColor: '#f4f8ff',
    borderColor: '#b6d0ff',
  },
  incorrectOption: {
    borderColor: '#ff9aa0',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#c5c7ce',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: PATHSPOT_COLORS.PATHSPOT_LIGHT_BLUE,
    borderColor: PATHSPOT_COLORS.PATHSPOT_LIGHT_BLUE,
  },
  checkmark: {
    color: 'white',
    fontWeight: '700',
    lineHeight: 16,
  },
  optionText: {
    fontSize: 16,
    color: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
    flexShrink: 1,
  },
  optionTextIncorrect: {
    textDecorationLine: 'line-through',
    opacity: 0.7,
  },
  incompleteText: {
    marginTop: 10,
    color: '#9aa0a6',
    fontSize: 14,
    textAlign: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
  },
  disabledInput: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },
});

export default MultiSelect;
