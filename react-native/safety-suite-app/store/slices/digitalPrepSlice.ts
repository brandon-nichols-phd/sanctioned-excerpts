import { PayloadAction, createSlice } from '@reduxjs/toolkit';
import { match } from 'ts-pattern';

import { DigitalPrepState } from '../types/store-types';
import {
  AnyItem,
  AnySection,
  AvailableItem,
  DigitalPrepItem,
  DigitalPrepSection,
  calculateCurrentStage,
  stackSectionItems,
} from '../../src/data/digital-prep';
import { VerificationResponse } from '../../src/hooks/use-digital-prep-subscription';

const initDigitalPrepState: DigitalPrepState = {
  sections: [],
  availableItems: [],
  config: {
    disabledSections: [],
    handWashingTimerEnabled: true,
  },
  userPreferences: {
    boxCount: 10,
  },
  subscription: {
    storedData: null,
  },
};

const digitalPrepSlice = createSlice({
  name: 'digitalPrep',
  initialState: initDigitalPrepState,
  reducers: {
    addItems: (
      state: DigitalPrepState,
      action: PayloadAction<{
        items: DigitalPrepItem[];
        section: AnySection;
      }>
    ) => {
      const { items, section } = action.payload;
      const sectionIndex = state.sections.findIndex((s) => s.id === section.id);
      const foundSection = state.sections[sectionIndex];

      if (foundSection) {
        foundSection.items = foundSection.items.concat(items);
      }

      state.sections = stackSectionItems(state.sections);
    },
    removeItem: (
      state: DigitalPrepState,
      action: PayloadAction<{ item: DigitalPrepItem }>
    ) => {
      const { item } = action.payload;
      const sectionIndex = state.sections.findIndex((s) => s.id === item.sectionId);
      const foundSection = state.sections[sectionIndex];

      if (foundSection) {
        foundSection.items = foundSection.items.flatMap<AnyItem>((sectionItem) => {
          if (sectionItem._tag === 'StackDigitalPrepItem') {
            sectionItem.items = sectionItem.items.filter((i) => i.id !== item.id);
            return [sectionItem];
          }

          return sectionItem.id !== item.id ? [sectionItem] : [];
        });

        // This will re-stack items
        state.sections = stackSectionItems(state.sections);
      }
    },
    moveItem: (
      state: DigitalPrepState,
      action: PayloadAction<{
        item: DigitalPrepItem;
        fromSectionId: DigitalPrepSection['id'];
        toSectionId: DigitalPrepSection['id'];
      }>
    ) => {
      const { item, fromSectionId, toSectionId } = action.payload;
      const fromSectionIndex = state.sections.findIndex((s) => s.id === fromSectionId);
      const toSectionIndex = state.sections.findIndex((s) => s.id === toSectionId);
      const fromSection = state.sections[fromSectionIndex];
      const toSection = state.sections[toSectionIndex];

      if (fromSection && toSection) {
        if (fromSection.stackingEnabled) {
          // Check if item is from a stacked item
          // If it is, remove from it from the stack
          fromSection.items = fromSection.items.flatMap<AnyItem>((sectionItem) => {
            if (sectionItem._tag === 'StackDigitalPrepItem') {
              sectionItem.items = sectionItem.items.filter((i) => i.id !== item.id);
              return [sectionItem];
            }
            return sectionItem.id !== item.id ? [sectionItem] : [];
          });
        } else {
          fromSection.items = fromSection.items.filter((i) => i.id !== item.id);
        }

        toSection.items.push(item);

        // This will re-stack items
        state.sections = stackSectionItems(state.sections);
      }
    },
    recalculateCurrentStages: (state: DigitalPrepState) => {
      state.sections = state.sections.map<AnySection>((section) => {
        return match(section)
          .returnType<AnySection>()
          .with({ stackingEnabled: true }, (stackableSection) => ({
            ...stackableSection,
            items: stackableSection.items.map((item) => {
              return match(item)
                .returnType<AnyItem>()
                .with({ _tag: 'StackDigitalPrepItem' }, (stackItem) => ({
                  ...stackItem,
                  currentStage: calculateCurrentStage(
                    stackItem.expirationWhen,
                    stackItem.configuredItemDoc,
                    stackableSection.sectionOrder
                  ),
                  items: stackItem.items.map((subItem) => ({
                    ...subItem,
                    currentStage: calculateCurrentStage(
                      subItem.expirationWhen,
                      subItem.configuredItemDoc,
                      stackableSection.sectionOrder
                    ),
                  })),
                }))
                .with({ _tag: 'DigitalPrepItem' }, (singleItem) => ({
                  ...singleItem,
                  currentStage: calculateCurrentStage(
                    singleItem.expirationWhen,
                    singleItem.configuredItemDoc,
                    stackableSection.sectionOrder
                  ),
                }))
                .exhaustive();
            }),
          }))
          .with({ stackingEnabled: false }, (nonStackableSection) => ({
            ...nonStackableSection,
            items: nonStackableSection.items.map((item) => ({
              ...item,
              currentStage: calculateCurrentStage(
                item.expirationWhen,
                item.configuredItemDoc,
                nonStackableSection.sectionOrder
              ),
            })),
          }))
          .exhaustive();
      });
    },
    setSections: (
      state: DigitalPrepState,
      action: PayloadAction<{
        sections: AnySection[];
      }>
    ) => {
      state.sections = stackSectionItems(action.payload.sections);
    },
    setAvailableItems: (
      state: DigitalPrepState,
      action: PayloadAction<{
        items: AvailableItem[];
      }>
    ) => {
      state.availableItems = action.payload.items;
    },
    setDisabledSections: (
      state: DigitalPrepState,
      action: PayloadAction<{
        disabledSections: AnySection['id'][];
      }>
    ) => {
      state.config.disabledSections = action.payload.disabledSections;
    },
    setEnableHandWashing: (
      state: DigitalPrepState,
      action: PayloadAction<{
        enabled: boolean;
      }>
    ) => {
      state.config.handWashingTimerEnabled = action.payload.enabled;
    },
    setBoxCount: (state: DigitalPrepState, action: PayloadAction<{ count: number }>) => {
      state.userPreferences.boxCount = action.payload.count;
    },
    updateStoredSubscriptionData: (
      state,
      action: PayloadAction<{
        locationId: number;
        response: VerificationResponse;
      }>
    ) => {
      const { locationId, response } = action.payload;
      if (!state.subscription.storedData) {
        state.subscription.storedData = {};
      }
      state.subscription.storedData[locationId] = {
        response,
        timestamp: Date.now(),
      };
    },
  },
});

export const {
  setSections,
  setAvailableItems,
  addItems,
  removeItem,
  moveItem,
  recalculateCurrentStages,
  setDisabledSections,
  setEnableHandWashing,
  setBoxCount,
  updateStoredSubscriptionData,
} = digitalPrepSlice.actions;

export default digitalPrepSlice.reducer;
