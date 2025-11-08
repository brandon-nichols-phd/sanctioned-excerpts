import React, { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { FlatList, StyleSheet, View, Text } from 'react-native';
import { useDispatch } from 'react-redux';
import { removeFromCart } from '../../../store/slices/printerSlice';
import { PrintLabel } from '../../data/label';
import PrintListItem from './PrintListItem';
import { windowWidth } from '../../../utils/Dimensions';

const styles = StyleSheet.create({
  container: {
    display: 'flex',
    paddingHorizontal: '4%',
    justifyContent: 'center',
    alignContent: 'center',
    width: windowWidth - windowWidth * 0.1, // TODO: what width for modal do we want || should there be a standards for it??
    height: '100%',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 42,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  smallEmptyText: {
    marginTop: 22,
    fontSize: 28,
    textAlign: 'center',
  },
});

type PrintListProps = {
  printerCart: PrintLabel[];
  setCartCount: Dispatch<SetStateAction<number>>;
  setPrinterCart: Dispatch<SetStateAction<PrintLabel[]>>;
  cartCount: number;
};

/**
 * @summary - show labels in grid list view with tabs
 * @purpose - be able to print labels
 * @param props
 *
 */

const PrintList = (props: PrintListProps) => {
  const { printerCart, setPrinterCart, setCartCount, cartCount } = props;
  const [remove, setRemove] = useState<PrintLabel | null>();
  const dispatch = useDispatch();

  useEffect(() => {
    if (remove) {
      const newCart = printerCart.filter((label: PrintLabel) => label.id !== remove.id);

      setPrinterCart(newCart);
      dispatch(removeFromCart({ label: remove } as any));
      setRemove(null);
    }
  }, [dispatch, printerCart, remove, setPrinterCart]);

  // causing too many rerenders + slowing down
  useEffect(() => {
    let count = 0;
    printerCart.forEach((label: PrintLabel) => {
      count += label.count;
    });
    setCartCount(count);

    // remove item and item count from cart badge and redux
  }, [printerCart, setCartCount]);

  // console.log('[PrintList] cart is: ', cart?.length, cart);
  return (
    <View style={styles.container}>
      {printerCart.length > 0 && (
        <FlatList
          data={printerCart}
          // style={{marginBottom: 5, flexDirection: 'row', alignContent: 'flex-start', padding: 2}}
          numColumns={2}
          scrollEnabled={true}
          renderItem={({ item, index }) =>
            item && (
              <PrintListItem
                label={item}
                setRemove={setRemove}
                setCartCount={setCartCount}
                cartCount={cartCount}
              />
            )
          }
        />
      )}
      {printerCart.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>You haven't added any labels yet.</Text>
          <Text style={styles.smallEmptyText}>
            Click on the labels to add them to your cart.
          </Text>
        </View>
      )}
    </View>
  );
};

export default PrintList;
