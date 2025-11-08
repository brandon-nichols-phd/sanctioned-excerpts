import React, { FC, useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { StyleSheet, Text, View, Pressable, Image } from 'react-native';
import {
  DraxProvider,
  DraxView,
  DraxList,
  DraxDragWithReceiverEventData,
} from 'react-native-drax';
import { useDispatch } from 'react-redux';
import { Searchbar } from 'react-native-paper';

import { useDigitalPrepItems } from '../hooks/use-digital-prep-items';
import {
  AnyItem,
  AnySection,
  DigitalPrepItem,
  StackDigitalPrepItem,
  findStackItem,
} from '../data/digital-prep';
import { setContext } from '../../store/slices/contextSlice';
import { useStylesWithDimensions } from '../hooks/use-styles-with-dimensions';
import { PATHSPOT_COLORS } from '../constants/constants';
import { AddItemModal } from '../components/digital-prep/add-modal';
import { SectionPictureModal } from '../components/digital-prep/section-picture-modal';
import { DigitalItem } from '../components/digital-prep/digital-item';
import { useTimer } from '../hooks/use-timer';
import { StageFilter } from '../components/digital-prep/stage-filter';
import { StackItemModal } from '../components/digital-prep/stack-item-modal';
import { ConfirmRemoveItemModal } from '../components/digital-prep/confirm-remove-modal';
import { useHandwashingTimer } from '../hooks/use-handwashing-timer';
import { HandWashingModal } from '../components/digital-prep/handwashing-modal';
import { useDigitalPrepSubscription } from '../hooks/use-digital-prep-subscription';
import { SubscriptionMessage } from '../components/digital-prep/subscription-message';
import { translate } from '../data/translations';
import OfflineWatermark from '../components/OfflineWatermark';
import { platformIOS } from '../../utils/utils';
import { useDigitalPrepAlertSound } from '../hooks/use-digital-prep-alert-sound';

const DigitalPrepHeader: FC<{
  countdown: string;
  search: string | null;
  onSearch: (value: string) => void;
  onAddPress: () => void;
  enableTimer: boolean;
}> = (props) => {
  return (
    <>
      <View style={headerStyles.container}>
        <View style={headerStyles.leftSide}>
          <Searchbar
            placeholder={translate('searchNavPlaceholder')}
            onChangeText={props.onSearch}
            value={props.search ?? ''}
            elevation={0}
            placeholderTextColor={PATHSPOT_COLORS.PATHSPOT_LIGHT_GREY}
            style={headerStyles.searchBar}
            iconColor="white"
            clearIcon="close"
            inputStyle={headerStyles.searchBarInput}
          />
        </View>
        {props.enableTimer ? (
          <View style={headerStyles.center}>
            <Image
              style={headerStyles.soapIcon}
              source={require('../../assets/Soap.png')}
            />
            <Text style={headerStyles.countdownText}>{props.countdown}</Text>
          </View>
        ) : null}
        <View style={headerStyles.rightSide}>
          <Pressable style={headerStyles.addButton} onPress={props.onAddPress}>
            <Text style={headerStyles.addText}>
              {translate('digiPrepAddItemButtonText')}
            </Text>
          </Pressable>
        </View>
      </View>
      {platformIOS.isPad && <OfflineWatermark />}
    </>
  );
};

const headerStyles = StyleSheet.create({
  container: {
    backgroundColor: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
    width: '100%',
    height: 50,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftSide: {
    flexDirection: 'row',
    position: 'absolute',
    left: 10,
    width: 300,
    height: 35,
    alignContent: 'center',
    alignItems: 'center',
  },
  rightSide: {
    position: 'absolute',
    right: 10,
  },
  center: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  soapIcon: {
    width: 25,
    height: 25,
  },
  countdownText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  addButton: {
    marginRight: 15,
    paddingHorizontal: 10,
    height: 35,
    borderRadius: 5,
    backgroundColor: PATHSPOT_COLORS.PATHSPOT_TEAL,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  addText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  searchBar: {
    backgroundColor: 'transparent',
    width: 300,
  },
  searchBarInput: {
    color: 'white',
  },
});

type ModalState =
  | { _tag: 'Add' }
  | { _tag: 'Remove'; item: DigitalPrepItem }
  | { _tag: 'ShowSectionPicture'; section: AnySection }
  | {
      _tag: 'ShowStackItem';
      sectionIndex: number;
      item: StackDigitalPrepItem;
    }
  | { _tag: 'Alert' }
  | { _tag: 'Close' };

type DragPayload = AnyItem;

export const DigitalPrep: FC = () => {
  const {
    subscriptions,
    subscriptionStatus,
    renewalDate,
    locationName,
    requestSubscription,
    restorePurchases,
    _debug,
  } = useDigitalPrepSubscription();

  const [modalState, setModalState] = useState<ModalState>({ _tag: 'Close' });
  const [
    { sections, activeFilter, stagesCounts, availableItems, config },
    {
      setFilter,
      addItems,
      removeItem,
      moveToSection,
      fetchSections,
      fetchItems,
      recalculateExpirationStates,
    },
  ] = useDigitalPrepItems();

  const handwashAlertSound = useDigitalPrepAlertSound();

  // Used to recalculate expiration states every minute, this is separate from the hand washing timer
  const { startTimer, stopTimer } = useTimer(recalculateExpirationStates, 60 * 1000);

  const dispatch = useDispatch();

  const { countdown, alertStatus, dismissAlert } = useHandwashingTimer(
    config.handWashingTimerEnabled
  );

  useEffect(() => {
    try {
      if (alertStatus === 'show') {
        setModalState({ _tag: 'Close' });
        // Introduce a small, deterministic delay before setting the modal state to 'Alert' thanks to nested nature of some other modals on the page
        requestAnimationFrame(() => {
          setModalState({ _tag: 'Alert' });
        });
        // Wrapper function to play the alert sound to maintain proper binding within useEffect
        const playAlert = () => {
          handwashAlertSound?.play();
        };
        // Play the alert sound immediately
        playAlert();
        // Schedule sound replay every 7 seconds (sound duration is 5 seconds, resulting in a 2 second delay between each playback)
        const intervalId = setInterval(playAlert, 7000);
        return () => {
          clearInterval(intervalId);
          handwashAlertSound?.stop();
        };
      } else {
        handwashAlertSound?.stop();
      }
    } catch (e) {
      console.error('[DigitalPrep] useEffect error: ', e);
    }
  }, [alertStatus]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        // Reset the timer if alert is shown and stop the alert sound if it's playing when the user navigates away from the DigitalPrep tab
        if (alertStatus === 'show') {
          setModalState({ _tag: 'Close' });
          dismissAlert();
        }
        handwashAlertSound?.stop();
      };
    }, [])
  );

  // Fetch sections and items when the user navigates to the DigitalPrep tab
  useFocusEffect(
    useCallback(() => {
      const contextPayload = { context: 'DigitalPrep' };
      dispatch(setContext(contextPayload));
      fetchSections().catch((e) => console.error(e));
      fetchItems().catch((e) => console.error(e));
    }, [dispatch, fetchItems, fetchSections])
  );

  // Start the expiration timer when the user navigates to the DigitalPrep tab and stop it when they navigate away
  useFocusEffect(
    useCallback(() => {
      startTimer();

      return () => {
        stopTimer();
      };
    }, [stopTimer, startTimer])
  );

  const onReceiveDragDrop = useCallback(
    (toSectionIndex: number, event: DraxDragWithReceiverEventData) => {
      const payload = event.dragged.payload as DragPayload;
      const fromSection = sections.find((section) => section.id === payload.sectionId);
      const toSection = sections[toSectionIndex];

      if (toSection && fromSection && toSection.id !== payload.sectionId) {
        moveToSection(payload, fromSection, toSection).catch((e) =>
          console.error('Error moving item between sections: ', e)
        );
      }
    },
    [moveToSection, sections]
  );

  if (subscriptionStatus !== 'ACTIVE') {
    // If we navigate to DigitalPrep for the first time at the top of the hour, the timer should not start until the next hour, rather than immediately.
    if (alertStatus === 'show') {
      dismissAlert();
    }
    return (
      <SubscriptionMessage
        subscriptions={subscriptions}
        requestSubscription={requestSubscription}
        restorePurchases={restorePurchases}
        expirationDate={renewalDate}
        locationName={locationName}
        subscriptionStatus={subscriptionStatus}
        _debug={_debug}
      />
    );
  }

  return (
    <View style={styles.topContainer}>
      <DigitalPrepHeader
        countdown={countdown}
        search={activeFilter.searchText}
        enableTimer={config.handWashingTimerEnabled}
        onSearch={(searchText) =>
          setFilter({ searchText: searchText.length === 0 ? null : searchText })
        }
        onAddPress={() => setModalState({ _tag: 'Add' })}
      />
      <StageFilter
        stages={stagesCounts}
        activeStage={activeFilter.stageName}
        onFilterChange={(stageName) => setFilter({ stageName })}
      />
      <DraxProvider>
        <View style={styles.container}>
          {sections.map((section, index) => {
            return (
              <Section
                key={section.id}
                columnIndex={index}
                section={section}
                totalSections={sections.length}
                onPictureIconPress={() =>
                  setModalState({ _tag: 'ShowSectionPicture', section })
                }
                onItemPress={(item) => {
                  if (item._tag === 'StackDigitalPrepItem') {
                    setModalState({
                      _tag: 'ShowStackItem',
                      sectionIndex: index,
                      item,
                    });
                  }
                }}
                onItemRemovePress={(item) => setModalState({ _tag: 'Remove', item })}
                onReceiveDragDrop={onReceiveDragDrop}
              />
            );
          })}
        </View>
      </DraxProvider>
      {modalState._tag === 'Add' && (
        <AddItemModal
          availableItems={availableItems}
          sections={sections}
          open={true}
          onAddItem={(items, section) => {
            addItems(items, section).catch((e) => console.error(e));
            setModalState({ _tag: 'Close' });
          }}
          onClose={() => setModalState({ _tag: 'Close' })}
        />
      )}
      {modalState._tag === 'Remove' && (
        <ConfirmRemoveItemModal
          open={true}
          item={modalState.item}
          onClose={(shouldRemove) => {
            if (shouldRemove) {
              removeItem(modalState.item).catch((e) => console.error(e));
            }
            setModalState({ _tag: 'Close' });
          }}
        />
      )}
      {modalState._tag === 'ShowSectionPicture' && (
        <SectionPictureModal
          section={modalState.section}
          open={true}
          onClose={() => setModalState({ _tag: 'Close' })}
        />
      )}
      {modalState._tag === 'ShowStackItem' && (
        <StackItemModal
          open={true}
          sectionName={sections[modalState.sectionIndex]?.name ?? ''}
          stackItem={findStackItem(sections, modalState.sectionIndex, modalState.item)}
          onItemRemovePress={(item) => {
            removeItem(item).catch((e) => console.error(e));
          }}
          onClose={() => setModalState({ _tag: 'Close' })}
        />
      )}
      {modalState._tag === 'Alert' && (
        <HandWashingModal
          open={true}
          onClose={() => {
            setModalState({ _tag: 'Close' });
            dismissAlert();
          }}
        />
      )}
    </View>
  );
};

const Section: FC<{
  columnIndex: number;
  section: AnySection;
  totalSections: number;
  onPictureIconPress: (section: AnySection) => void;
  onItemPress: (item: AnyItem) => void;
  onItemRemovePress: (item: DigitalPrepItem) => void;
  onReceiveDragDrop: (index: number, event: DraxDragWithReceiverEventData) => void;
}> = (props) => {
  const columnStyles = useStylesWithDimensions(createColumnStyles(props.totalSections));
  return (
    <View style={columnStyles.column}>
      <DraxView
        style={styles.header}
        onReceiveDragDrop={(event) => {
          props.onReceiveDragDrop(props.columnIndex, event);
        }}
      >
        <View style={styles.headerContainer}>
          <View>
            <Text adjustsFontSizeToFit numberOfLines={1} style={styles.headerText}>
              {props.section.name}
            </Text>
          </View>
          <Pressable
            style={styles.iconContainer}
            onPress={() => props.onPictureIconPress(props.section)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.iconText}>i</Text>
          </Pressable>
        </View>
      </DraxView>
      <DraxView
        receptive
        onMonitorDragDrop={(event) => {
          // Need this because DraxList adds its own DraxView and eats up onReceiveDragDrop
          props.onReceiveDragDrop(props.columnIndex, event);
        }}
        receivingStyle={styles.receiving}
      >
        <View style={columnStyles.flatListContainer}>
          <DraxList
            data={props.section.items}
            columnWrapperStyle={styles.sectionRow}
            renderItemContent={({ item }) => (
              <DigitalItem
                key={`${props.columnIndex}-${item.id}`}
                draggable
                totalSections={props.totalSections}
                item={item}
                onPress={props.onItemPress}
                onRemovePress={props.onItemRemovePress}
              />
            )}
            keyExtractor={(item) => item.id}
            numColumns={3}
            scrollEnabled={true}
          />
        </View>
      </DraxView>
    </View>
  );
};

const createColumnStyles = (columnCount: number) => (width: number, height: number) => {
  const filterHeight = 60;
  const containerHeight = height * 0.7222 - filterHeight; // The container is around 72% of the height
  return StyleSheet.create({
    flatListContainer: {
      height: containerHeight,
      width: '100%',
      marginHorizontal: 'auto',
    },
    column: {
      width: width / columnCount,
      padding: 10,
      borderRightWidth: 1,
      borderColor: '#ECECEC',
    },
  });
};

const styles = StyleSheet.create({
  topContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  container: {
    flexDirection: 'row',
  },
  header: {
    padding: 10,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    color: '#0B3441',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 18,
  },
  receiving: {
    height: '100%',
    width: '100%',
  },
  iconContainer: {
    marginLeft: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: PATHSPOT_COLORS.PATHSPOT_TEAL,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  iconText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    fontStyle: 'italic',
  },
  sectionRow: {
    marginHorizontal: 'auto',
    justifyContent: 'space-evenly',
    width: '100%',
    marginVertical: 10,
  },
});
