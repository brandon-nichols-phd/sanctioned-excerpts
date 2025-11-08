import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Button, IconButton } from 'react-native-paper';
import { Formik } from 'formik';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';

import { ToastTypes } from '../../types/app';
import { State } from '../../../store/types/store-types';
import { PSelect } from '../../../utils/components/selects';
import { platformIOS, showToast } from '../../../utils/utils';
import {
  BACK_COLOR,
  CANCEL_COLOR,
  SAVE_COLOR,
  globalStyles,
} from '../../../utils/styles';
import { PATHSPOT_COLORS } from '../../constants/constants';
import { Assignment } from '../headers/note-headers/CreateTaskModal';
import { ChecklistScheduling } from '../headers/note-headers/ChecklistScheduling';
import { AssignFormValues, useAssignTask } from '../../hooks/use-assign-task';
import { windowHeight, windowWidth } from '../../../utils/Dimensions';
import { isIphoneSe } from '../../../utils/Platform';
import { ChecklistBackend } from '../../data/task';
import { translate } from '../../data/translations';

const AssignTask = () => {
  const navigation = useNavigation();
  const [assignState, setAssignState] = useState<0 | 1>(0);
  const [checklistSelected, setChecklistSelected] = useState<ChecklistBackend | null>(
    null
  );
  const checklistId = checklistSelected?.id ?? null;

  const users = useSelector((state: State) => state.user.users);
  const currentUserLocations = useSelector(
    (state: State) => state.user.currUser?.locations
  );
  const contextState = useSelector((state: State) => state.context);
  const roles = useSelector((state: State) => state.context.roles);

  const { initialValues, assignableChecklists, submitSave } = useAssignTask({
    checklistId,
  });

  const checklistOptions = useMemo(
    () =>
      assignableChecklists.map((checklist) => ({
        label: checklist.name,
        value: checklist.id,
        defaultDuration: checklist.assignment_default_duration,
        defaultReminders: checklist.assignment_default_reminders,
      })),
    [assignableChecklists]
  );

  const locationOptions = useMemo(() => {
    return (
      currentUserLocations
        ?.filter((location) => {
          const canAssignTask: boolean =
            location.permissions.permissions.assignTasks || false;
          const epCanAssignTask: boolean =
            location.permissions.additionalPermissions?.assignTasks || false;
          return canAssignTask || epCanAssignTask;
        })
        .map((location) => ({
          label: location.locationName,
          value: location.locationId,
        })) || []
    );
  }, [currentUserLocations]);

  const canAssignLocations = useMemo(() => {
    const currLocationId = contextState.locationId;

    const currLocation = currentUserLocations?.find(
      (loc) => loc.locationId === currLocationId
    );
    if (currLocation) {
      const currPerms = currLocation.permissions;
      return (
        currPerms.permissions.assignTasks || currPerms.additionalPermissions?.assignTasks
      );
    } else {
      return false;
    }
  }, [currentUserLocations, contextState.locationId]);

  const isReportingChecklist =
    checklistSelected?.internal_tags?.some((internalTag) =>
      ['A1_HOLDING', 'A1_COOKING', 'A2_COOLING'].includes(internalTag)
    ) ?? false;

  const canAssignUsers = checklistId ? !isReportingChecklist : true;

  const userOptions = useMemo(() => {
    const currLocationId = contextState.locationId;

    return users
      .filter((user) => {
        if (!user.locations.length) {
          return false;
        }

        // if user doesnt have curr location or selectd location
        return user.locations.find((location) => location.locationId === currLocationId);
      })
      .map((user) => ({
        label: user.name ?? '',
        value: user.id ?? 0,
      }));
  }, [contextState.locationId, users]);

  const roleOptions = useMemo(() => {
    return roles.map((role) => ({
      label: role.name,
      value: role.id,
    }));
  }, [roles]);

  const cancel = () => {
    navigation.goBack();
  };

  const next = () => {
    if (!checklistSelected) {
      showToast({
        type: ToastTypes.ERROR,
        txt1: translate('taskAssignToastNoChecklistError'),
      });
      return;
    }
    setAssignState(1);
  };

  const back = () => {
    setAssignState(0);
  };

  return (
    <Formik<AssignFormValues>
      enableReinitialize={true}
      initialValues={initialValues}
      onSubmit={async (values) => {
        if (!contextState.online) {
          showToast({
            type: ToastTypes.ERROR,
            txt1: translate('taskAssignToastOfflineErrorTxt1'),
            txt2: translate('taskAssignToastOfflineErrorTxt1'),
          });
          cancel();
          return;
        }

        let fvalues = { ...values };
        // make sure no users are assigned if
        // it is blocked by the checklist id
        if (!canAssignUsers) {
          fvalues = {
            ...fvalues,
            usersSelected: [],
          };
        }

        const assignRes = await submitSave(fvalues);
        if (assignRes.status === 200) {
          showToast({
            type: ToastTypes.SUCCESS,
            txt1: translate('taskAssignToastSuccess'),
          });
          cancel();
        } else {
          showToast({
            type: ToastTypes.ERROR,
            txt1: translate('taskAssignToastErrorTxt1'),
            txt2: translate('taskAssignToastErrorTxt2'),
          });
        }
      }}
    >
      {(formik) => {
        const targetLocationId =
          formik.values.selectedAssign === 'Locations'
            ? formik.values.locationSelected
            : contextState.locationId;
        const targetLocation = targetLocationId
          ? currentUserLocations?.find(
              (location) => location.locationId === targetLocationId
            )
          : null;
        const canScheduleRecurring =
          !!targetLocation &&
          ((targetLocation.permissions.permissions.createRecurringTasks ||
            targetLocation.permissions.additionalPermissions?.createRecurringTasks) ??
            false);
        return (
          <View>
            {/* header */}
            <View style={styles.headerContainer}>
              <View style={styles.header}>
                <View style={styles.start}>
                  <IconButton
                    icon={'file-tree'}
                    iconColor={PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE}
                    size={platformIOS.isPad ? 45 : 35}
                  />
                </View>

                <View style={globalStyles.column}>
                  <Text style={styles.assignTitle}>{translate('assignTaskList')}</Text>
                  <Text style={styles.assignPermsTitle}>
                    {translate('taskAssignOthersTitle')}
                  </Text>
                </View>
              </View>
            </View>

            {/* task options */}
            <View style={styles.selectChecklistContainer}>
              <PSelect
                isMulti={false}
                placeholder={translate('taskAssignSelectPlaceholder')}
                labelName="label"
                valueField={'value'}
                selected={checklistId}
                setSelected={async (selectedId: number) => {
                  const found = assignableChecklists.find(
                    (checklist) => checklist.id === selectedId
                  ) ?? null;

                  setChecklistSelected(found as unknown as ChecklistBackend | null);
                  await formik.setFieldValue('department', null);
                }}
                options={checklistOptions}
                styles={selectStyles}
                maxHeight={windowHeight * 0.25}
              />
            </View>

            {/* scheduling */}
            <View style={styles.center}>
              {assignState === 0 ? (
                <Assignment
                  userOptions={userOptions}
                  locationOptions={locationOptions}
                  canAssignUsers={canAssignUsers || false}
                  canAssignLocations={canAssignLocations || false}
                  roleOptions={roleOptions}
                  userLocations={currentUserLocations}
                  isReportingChecklist={isReportingChecklist}
                  next={next}
                />
              ) : (
                <View style={styles.schedulingContainer}>
                  <ChecklistScheduling canScheduleRecurring={canScheduleRecurring} />
                </View>
              )}
            </View>

            {/* buttons group */}
            <View style={styles.btnGroup}>
              {assignState === 1 ? (
                <Button
                  style={styles.btn}
                  mode={'contained'}
                  compact={true}
                  buttonColor={BACK_COLOR}
                  textColor={'white'}
                  labelStyle={styles.btnLabel}
                  onPress={back}
                >
                  {translate('backButtonText')}
                </Button>
              ) : (
                <Button
                  style={styles.btn}
                  mode={'contained'}
                  compact={true}
                  buttonColor={CANCEL_COLOR}
                  textColor={'white'}
                  labelStyle={styles.btnLabel}
                  onPress={cancel}
                  disabled={formik.isSubmitting}
                >
                  {translate('cancelButtonText')}
                </Button>
              )}
              <Button
                style={styles.btn}
                mode={'contained'}
                compact={true}
                buttonColor={SAVE_COLOR}
                textColor={'white'}
                labelStyle={styles.btnLabel}
                onPress={formik.submitForm}
                disabled={formik.isSubmitting}
              >
                {translate('createButtonText')}
              </Button>
            </View>
          </View>
        );
      }}
    </Formik>
  );
};

export default AssignTask;

const selectStyles = StyleSheet.create({
  container: {
    alignContent: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    width: windowWidth * 0.4,
  },
  dropdown: {
    width: platformIOS.isPad ? windowWidth * 0.45 : windowWidth * 0.65,
    height: platformIOS.isPad ? 50 : 45,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
    marginTop: -15,
  },
  placeholderStyle: {
    fontSize: 18,
    color: 'grey',
  },
  selectedTextStyle: {
    fontSize: 16,
  },
  iconStyle: {
    width: 20,
    height: 20,
  },
  inputSearchStyle: {
    height: 45,
    fontSize: 16,
  },
  icon: {
    marginRight: 5,
  },
  selectedStyle: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    alignContent: 'center',
    borderRadius: 15,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  title: {
    fontSize: platformIOS.isPad ? 34 : 22,
    fontWeight: 'bold',
    marginTop: platformIOS.isPad ? '15%' : '5%',
    marginBottom: platformIOS.isPad ? 0 : '12%',
    textAlign: 'center',
    color: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
    textAlign: 'center',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: platformIOS.isPad ? '2%' : '1%',
    width: '100%',
    height: platformIOS.isPad ? '85%' : '100%',
    flexDirection: 'column',
    flexWrap: 'wrap',
  },
  btnGroup: {
    marginTop: 0,
    marginBottom: '5%',
    justifyContent: 'space-between',
    position: 'relative',
  },
  btn: {
    padding: 1,
    textAlign: 'center',
    width: windowWidth * 0.025,
    height: '100%',
  },
  center: {
    marginTop: platformIOS.isPad ? -windowHeight * 0.15 : -20,
    justifyContent: 'center',
  },
  iphoneBGWrapper: {
    justifyContent: 'center',
    alignSelf: 'center',
    width: '100%',
    position: 'relative',
  },
  marginTop: {
    marginTop: platformIOS.isPad ? '2%' : '10%',
  },
});

const styles = StyleSheet.create({
  btn: {
    borderBottomColor: 'white',
    width: platformIOS.isPad ? windowWidth * 0.15 : windowWidth * 0.3,
    marginHorizontal: platformIOS.isPad ? '1%' : '1.5%',
  },
  btnGroup: {
    ...globalStyles.row,
    position: 'absolute',
    justifyContent: 'space-between',
    alignContent: 'center',
    alignSelf: 'center',
    marginTop:
      platformIOS.isPad || isIphoneSe ? windowHeight * 0.675 : windowHeight * 0.65,
  },
  btnLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  center: {
    justifyContent: 'center',
    alignSelf: 'center',
  },
  start: {
    justifyContent: 'flex-start',
    alignSelf: 'flex-start',
  },
  headerContainer: {
    ...globalStyles.row,
    justifyContent: 'flex-start',
    alignSelf: 'flex-start',
    marginTop: platformIOS.isPad ? '2%' : '3%',
  },
  header: {
    ...globalStyles.row,
    justifyContent: 'flex-start',
    alignSelf: 'flex-start',
    marginTop: '2%',
  },
  assignTitle: {
    fontSize: platformIOS.isPad ? 35 : 20,
    fontWeight: '600',
    color: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
    textAlign: 'left',
  },
  assignPermsTitle: {
    fontSize: platformIOS.isPad ? 20 : 16,
    fontWeight: '400',
    color: 'grey',
    textAlign: 'left',
    left: '.25%',
  },
  selectChecklistContainer: {
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: platformIOS.isPad ? '1%' : '5%',
  },
  schedulingContainer: {
    width: '80%',
  },
});
