import React, { useState, useCallback, useLayoutEffect, useEffect } from 'react'
import { CCard, CCardBody, CCol, CRow, CCardHeader, CCardGroup } from '@coreui/react'
import {
  LabelButtonRow,
  PLabelButtonRow,
  ConfirmationModal,
  ModalState,
  ModalProps,
  ModalContent,
} from '../../../webapp-lib/pathspot-react'
import APIAccessTokenList from './APIAccessTokenList'
import { generateAPIAccessToken } from './api-management.api'
import APIAccessTokenModal from './APIAccessTokenModal'

const newTokenButton = {
  id: 'newToken',
  buttonType: 'button',
  buttonText: 'Generate New Token',
  buttonIcon: 'cil-plus',
  buttonClass: 'button-md-right',
  buttonColor: 'primary',
  buttonShape: 'square',
  buttonSize: 'md',
  buttonStyle: { borderRadius: '0.25rem' },
  buttonDisable: false,
  inline: true,
  onClickAction: () => {},
}
const revokeButton = {
  id: 'revoke',
  buttonType: 'button',
  buttonText: 'Revoke All',
  buttonIcon: 'cil-x',
  buttonClass: 'button-md-right',
  buttonColor: 'danger',
  buttonShape: 'square',
  buttonSize: 'md',
  buttonStyle: { borderRadius: '0.25rem' },
  buttonDisable: false,
  inline: true,
  onClickAction: () => {},
}

const labelBar: LabelButtonRow = {
  label: 'Personal Access Tokens',
  labelClass: 'token-label-bar-text',
  labelColClass: 'token-label-col',
  buttonRow: {
    rowClass: 'token-label-bar',
    colClass: 'button-col',
    toolbarClass: 'button-div',
    // buttonProps: [newTokenButton, revokeButton],
    buttonProps: [newTokenButton],
  },
}

export const modalContent: any = {
  content: {
    title: 'Select Token Privileges',
    body: '',
    header: '',
    footer: '',
  } as ModalContent,
}

const defaultModalState: ModalState = {
  key: '',
  type: 'Generic',
  display: false,
  kwargs: null,
  content: { ...modalContent.content },
}

const defaultModalProps: ModalProps = {
  contextState: null,
  dispatcher: undefined,
  actions: null,
  handlers: undefined,
  data: null,
  context: undefined,
  modalState: { ...defaultModalState },
}
const modalHandlers = {
  onClose: (modalState: ModalState) => {
    return { ...modalState, display: false }
  },
  onConfirm: (data: any) => {
    return true
  },
  onCancel: (modalState: ModalState) => {
    return { ...modalState, display: false }
  },
}
const setModalDisplayState = (modalProps: any, displayState: boolean) => {
  return { ...modalProps, modalState: { ...modalProps.modalState, display: displayState } }
}
const APIManagementContainer = (props: any) => {
  const [generateToken, setGenerateToken] = useState<any>(null)
  const [modalProps, setModalProps] = useState<ModalProps>(defaultModalProps)
  const [refreshList, setRefreshList] = useState<any>(null)

  const launchModal = useCallback(() => {
    setModalProps({
      ...modalProps,
      modalState: { ...modalProps.modalState, display: true },
      handlers: {
        onClose: () => {
          setModalProps(setModalDisplayState(modalProps, false))
          setRefreshList(true)
        },
        onConfirm: () => {
          setRefreshList(false)
          //generateTokenCallback(data)
        },
        onCancel: () => {
          setModalProps(setModalDisplayState(modalProps, false))
          setRefreshList(true)
        },
      },
    })
  }, [])

  newTokenButton.onClickAction = () => launchModal()
  return (
    <>
      {modalProps?.modalState?.display && <APIAccessTokenModal {...modalProps} />}
      <CCard>
        <CCardHeader>
          <PLabelButtonRow {...labelBar} />
        </CCardHeader>
        <CCardBody>
          <div className="token-list">Existing Tokens</div>
          <APIAccessTokenList setRefreshList={setRefreshList} refreshList={refreshList} />
        </CCardBody>
      </CCard>
    </>
  )
}

export default APIManagementContainer
