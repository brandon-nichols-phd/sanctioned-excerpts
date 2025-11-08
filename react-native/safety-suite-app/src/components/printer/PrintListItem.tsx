import React, { Dispatch, SetStateAction, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { IconButton, Surface, Card, Paragraph } from 'react-native-paper';
import { useDispatch } from 'react-redux';
import { updateCartItem } from '../../../store/slices/printerSlice';
import { PrintLabel } from '../../data/label';
import moment from 'moment';
import { windowHeight, windowWidth } from '../../../utils/Dimensions';

const containerWidth: number = windowWidth - windowWidth * 0.25; // PORTRAIT == windowWidth - (windowWidth * .45);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    display: 'flex',
    width: containerWidth,
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 3,
    margin: 3,
  },
  label: {
    justifyContent: 'center',
    textAlign: 'center',
  },
  btn: {
    alignContent: 'center',
    backgroundColor: 'white',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  underlineInput: {
    borderBottomColor: '#000',
    borderBottomWidth: 1,
    justifyContent: 'center',
    textAlign: 'center',
    backgroundColor: 'white',
    margin: 15,
    width: containerWidth * 0.065,
    paddingBottom: 25,
  },
  text: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bntGroup: {
    flexDirection: 'row',
    alignContent: 'center',
    justifyContent: 'center',
    marginTop: windowHeight * 0.035,
    marginBottom: '2%',
    marginHorizontal: '2%',
  },
  trash: {
    alignContent: 'center',
    justifyContent: 'center',
  },
  surfaceCnt: {
    width: containerWidth * 0.055,
    height: containerWidth * 0.055,
    alignContent: 'center',
    textAlign: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 15,
    fontWeight: 'bold',
  },
});

type PrintListItemProps = {
  label: PrintLabel;
  setRemove: Dispatch<SetStateAction<PrintLabel | null>>;
  setCartCount: Dispatch<SetStateAction<number>>;
  cartCount: number;
};

const PrintListItem = (props: PrintListItemProps) => {
  const { label, setRemove, setCartCount, cartCount } = props;
  const [count, setCount] = useState<number>(label.count);

  let subtitleLabel = '';
  let subtitle = '';
  if (label.ingredients) {
    subtitleLabel = 'Ingredients:';
    subtitle = label.ingredients;
  } else if (label.description) {
    subtitleLabel = 'Description:';
    subtitle = label.description;
  }

  const dispatch = useDispatch();
  const handleUpdateCount = (val: number) => {
    const newCnt: number = count + val <= 0 ? 1 : count + val;
    setCount(newCnt);

    setCartCount(newCnt === count ? cartCount : cartCount - count + newCnt);
    const updatedLabel: PrintLabel = {
      ...label,
      count: newCnt,
    };

    dispatch(updateCartItem({ item: updatedLabel } as any));
  };

  const ModifyItemCount = () => {
    return (
      <View style={styles.bntGroup}>
        <IconButton
          icon="minus"
          iconColor={'black'}
          size={20}
          mode="contained"
          onPress={() => {
            handleUpdateCount(-1);
          }}
          style={styles.btn}
        />

        <Surface style={styles.surfaceCnt}>
          <Text style={styles.text}>{count}</Text>
        </Surface>

        <IconButton
          icon="plus"
          iconColor={'black'}
          size={20}
          mode="contained"
          onPress={() => {
            handleUpdateCount(1);
          }}
          style={styles.btn}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={{ width: windowWidth * 0.4 }}>
        <Card>
          <Card.Title
            title={label.name}
            subtitle={`${subtitleLabel} ${subtitle}`}
            left={() => (
              <IconButton
                iconColor={'red'}
                style={styles.trash}
                icon="delete"
                onPress={() => {
                  setRemove(label);
                }}
              />
            )}
            right={() => <ModifyItemCount />}
            titleVariant={'titleLarge'}
            titleStyle={{ fontWeight: '600' }}
            subtitleVariant={'titleSmall'}
            subtitleNumberOfLines={3}
            titleNumberOfLines={3}
          />
          <Card.Content style={{ alignContent: 'center' }}>
            <Paragraph>
              <Text style={{ fontWeight: '600', fontSize: 18 }}>Category:</Text>
              {` ${label.category || 'None'}`}
            </Paragraph>
            <Paragraph>
              <Text style={{ fontWeight: '600', fontSize: 18 }}>{label.context}</Text>
              {`, ${moment(label.expirationDate).format('MM/DD/YYYY h:mm a')}`}
            </Paragraph>
          </Card.Content>
        </Card>
      </View>
    </View>
  );
};

export default PrintListItem;
