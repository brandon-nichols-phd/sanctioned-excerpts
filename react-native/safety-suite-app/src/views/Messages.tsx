import { useFocusEffect } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useCallback } from 'react';
import { StyleSheet, Dimensions, View, Image } from 'react-native';
import { useDispatch } from 'react-redux';
import { setContext } from '../../store/slices/contextSlice';
import HeaderLeft from '../components/headers/HeaderLeft';
import HeaderLogo from '../components/headers/global-headers/HeaderLogo';
import { PATHSPOT_COLORS } from '../constants/constants';

const screenWidth: number = Dimensions.get('window').width;
const screenheight: number = Dimensions.get('window').height;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    width: screenWidth,
    height: screenheight,
    backgroundColor: 'grey',
  },
  image: {
    flex: 1,
    width: screenWidth,
    height: screenheight,
    resizeMode: 'contain',
    marginBottom: 125,
    // margin: 2,
    top: -2,
  },
});

export const Messages = (props: any) => {
  const { context } = props;
  const dispatch = useDispatch();
  // const currContext = useSelector( (state: State) => state.context);

  useFocusEffect(
    useCallback(() => {
      dispatch(setContext({ context: context } as any));
    }, [])
  );

  return (
    <View style={styles.container}>
      <Image source={require('../../assets/messages.png')} style={styles.image} />
    </View>
  );
};

// export default Messages;

const messagesNavigator = createNativeStackNavigator();

const MessagesNav = () => {
  return (
    <messagesNavigator.Navigator
      screenOptions={({ route, navigation }) => ({
        headerStyle: {
          backgroundColor: PATHSPOT_COLORS.PATHSPOT_STEAL_BLUE,
        },
        headerTitle: () => <HeaderLogo />,
        headerLeft: () => <HeaderLeft />,
      })}
    >
      <messagesNavigator.Screen
        navigationKey="Messages View"
        name="Messages View"
        component={Messages}
        options={({ route, navigation }) => ({
          title: 'Messages',
        })}
      />
    </messagesNavigator.Navigator>
  );
};
export default MessagesNav;
