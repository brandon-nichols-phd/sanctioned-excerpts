import { PayloadAction, createSlice } from '@reduxjs/toolkit';
import { PrintLabel, PrintTemplate, isSamePrintLabel } from '../../src/data/label';
import { PrinterState } from '../types/store-types';
import { orderList } from '../../utils/utils';

const initPrinterState: PrinterState = {
  cart: [],
  templates: [],
};

export type PrinterAddPayload = { label: PrintLabel };

const printerSlice = createSlice({
  name: 'printer',
  initialState: initPrinterState,
  reducers: {
    addLabelToPrinter: (state: PrinterState, action: { payload: PrinterAddPayload }) => {
      const { label } = action.payload;

      const exists = state.cart.find((currLabel) => isSamePrintLabel(currLabel, label));

      if (exists) {
        exists.count = label.count;
        exists.expirationDate = label.expirationDate;
        exists.expirationAdditionalDate = label.expirationAdditionalDate;
        exists.expirationAdditional = label.expirationAdditional;
        exists.expirationAdditionalFormat = label.expirationAdditionalFormat;
        exists.useAllExpirations = label.useAllExpirations;
      } else {
        state.cart.push(label);
      }
    },
    removeFromCart: (state: PrinterState, action: { payload: PrinterAddPayload }) => {
      const { label } = action.payload;

      const newCart = state.cart.filter(
        (item: PrintLabel) => !isSamePrintLabel(item, label)
      );
      state.cart = newCart;
    },
    updateCart: (
      state: PrinterState,
      action: PayloadAction<{ newCart: PrintLabel[] }>
    ) => {
      const { newCart } = action.payload;
      state.cart = newCart;
      return state;
    },
    updateCartItem: (
      state: PrinterState,
      action: PayloadAction<{ item: PrintLabel }>
    ) => {
      const { item } = action.payload;

      // get cart order
      const cartOrder = state.cart.map((plabel) => plabel.id);

      const filteredCart = state.cart.filter((label) => label.id !== item.id);
      const unorderedCart = [...filteredCart, item];
      state.cart = orderList(cartOrder, unorderedCart);
    },
    updateTemplates: (
      state: PrinterState,
      action: { payload: { templates: PrintTemplate[] } }
    ) => {
      state.templates = action.payload.templates;
    },
  },
});

export const {
  addLabelToPrinter,
  removeFromCart,
  updateCart,
  updateCartItem,
  updateTemplates,
} = printerSlice.actions;

export default printerSlice.reducer;
