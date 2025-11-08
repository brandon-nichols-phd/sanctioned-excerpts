import React, { BaseSyntheticEvent, useState, useMemo, useEffect } from 'react'
import useSensorDetails from '../containers/useSensorDetails'
import CIcon from '@coreui/icons-react'
import {
  CRow,
  CCol,
  CCard,
  CCardHeader,
  CCardBody,
  CInputGroup,
  CInputGroupPrepend,
  CInputGroupText,
  CInput,
  CInputGroupAppend,
  CSwitch,
} from '@coreui/react'
import Select, { components } from 'react-select'
import CreatableSelect from 'react-select/creatable'

import { SelectableItem, StyledSpinner, styles, selectorStyle, cardDropStyle } from '../../../../webapp-lib/pathspot-react'

import { LocationPermission, SensorModel, SensorOptions, SensorDetails, SelectableTag } from '../containers/SensorDetailContainer'
import { ReportDataTypeList, SensorCategory } from '../../api/sensor-types'
import useAuthContext from '../../../../api/authentication/useAuthContext'

import _ from 'lodash'

const SensorDetailForm = () => {
  const {
    sensorDetails: values,
    setFieldValue,
    permissions,
    errors,
    options,
    editContext,
    canViewSensorAndActions: canViewSensor,
    canEditSensor,
    isLoading,
  } = useSensorDetails()

  // allows editing of sensor Id, type and location, otherwise it is disabled
  const { isPathspotUser } = useAuthContext()

  const viewOnly = !canEditSensor

  const { locations, sensorModels, unitTypes } = options ?? ({} as SensorOptions)

  if (isLoading || values === null) {
    return <StyledSpinner message={'Fetching Sensor Information...'} />
  }

  if (!canViewSensor) {
    return null
  }

  const currentLocation = locations?.find((location) => location.value === values.location?.value)

  return (
    <CRow className="justify-content-center">
      <CCol md="11" className="py-3">
        <CCard>
          <CCardHeader>{editContext === 'new' ? 'New Sensor' : permissions?.editSensors.length == 0 || 'Edit Sensor'}</CCardHeader>
          <CCardBody className="py-4 px-4">
            <CInputGroup className="mb-3">
              <CInputGroupPrepend>
                <CInputGroupText>
                  <CIcon name="cil-text" />
                  &nbsp;*
                </CInputGroupText>
              </CInputGroupPrepend>
              <CInput
                type="text"
                name="name"
                placeholder="Name your sensor"
                onBlur={(e: BaseSyntheticEvent) => setFieldValue('name', e.target.value)}
                defaultValue={values.name}
                disabled={viewOnly}
              />
              <CInputGroupAppend>
                <CInputGroupText>Name</CInputGroupText>
              </CInputGroupAppend>
              {errors?.details?.name ? (
                <span style={{ fontSize: 12 }} className="text-danger display-inline-block w-100">
                  {errors.details.name}
                </span>
              ) : null}
            </CInputGroup>
            <CInputGroup className="mb-3">
              <CInputGroupPrepend>
                <CInputGroupText>
                  <CIcon name="cil-barcode" />
                  &nbsp;*
                </CInputGroupText>
              </CInputGroupPrepend>
              <CInput
                type="text"
                name="sensorId"
                placeholder="Enter the unique identifier for the sensor"
                onBlur={(e: BaseSyntheticEvent) => setFieldValue('publicAddr', e.target.value)}
                defaultValue={values.publicAddr}
                disabled={viewOnly || !isPathspotUser}
              />
              <CInputGroupAppend>
                <CInputGroupText>Sensor EUI / ID</CInputGroupText>
              </CInputGroupAppend>
              {errors?.details?.publicAddr ? (
                <span style={{ fontSize: 12 }} className="text-danger display-inline-block w-100">
                  {errors.details.publicAddr}
                </span>
              ) : null}
            </CInputGroup>
            <CInputGroup className="mb-3">
              <CInputGroupPrepend>
                <CInputGroupText>
                  <CIcon name="cil-short-text" />
                  &nbsp;*
                </CInputGroupText>
              </CInputGroupPrepend>
              <Select
                className="br-0"
                name="model"
                value={values.model}
                options={sensorModels ?? []}
                onChange={(val: SelectableItem<SensorModel>) => {
                  setFieldValue('model', val)
                }}
                placeholder="Sensor Type"
                styles={styles}
                isDisabled={viewOnly || !isPathspotUser}
              />
              <CInputGroupAppend>
                <CInputGroupText>Sensor Type</CInputGroupText>
              </CInputGroupAppend>
              {errors?.details?.model ? (
                <span style={{ fontSize: 12 }} className="text-danger display-inline-block w-100">
                  {errors.details.model}
                </span>
              ) : null}
            </CInputGroup>
            <CInputGroup className="mb-3">
              <CInputGroupPrepend>
                <CInputGroupText>
                  <CIcon name="cil-location-pin" />
                  &nbsp;*
                </CInputGroupText>
              </CInputGroupPrepend>
              <Select
                className="br-0"
                name="Location"
                value={values.location}
                options={locations}
                onChange={(val: LocationPermission) => {
                  setFieldValue('location', val)
                }}
                placeholder="Location"
                styles={styles}
                isDisabled={viewOnly || !isPathspotUser}
              />
              <CInputGroupAppend>
                <CInputGroupText>Locations</CInputGroupText>
              </CInputGroupAppend>
              {errors?.details?.location ? (
                <span style={{ fontSize: 12 }} className="text-danger display-inline-block w-100">
                  {errors.details.location}
                </span>
              ) : null}
            </CInputGroup>
            {/* only show if there are dept options */}
            {currentLocation?.departments && currentLocation.departments.length > 0 && (
              <CInputGroup className="mb-3">
                <CInputGroupPrepend>
                  <CInputGroupText>
                    <CIcon name="cil-location-pin" />
                    &nbsp;*
                  </CInputGroupText>
                </CInputGroupPrepend>
                <Select
                  className="br-0"
                  name="Departments"
                  value={values.department}
                  options={currentLocation.departments}
                  onChange={(val: LocationPermission['departments'][0]) => {
                    setFieldValue('department', val)
                  }}
                  placeholder="Department"
                  styles={styles}
                  isDisabled={viewOnly}
                />
                <CInputGroupAppend>
                  <CInputGroupText>Departments</CInputGroupText>
                </CInputGroupAppend>
                {errors?.details?.department ? (
                  <span style={{ fontSize: 12 }} className="text-danger display-inline-block w-100">
                    {errors.details.department}
                  </span>
                ) : null}
              </CInputGroup>
            )}
            <CInputGroup className="mb-3" style={{ display: 'flex', flexWrap: 'wrap', width: '100%' }}>
              <CInputGroupPrepend style={{ flexShrink: 0 }}>
                <CInputGroupText>
                  <CIcon name="cil-tag" />
                  &nbsp;*
                </CInputGroupText>
              </CInputGroupPrepend>
              <Select
                className="br-0"
                name="unitType"
                value={values.unitType}
                options={unitTypes}
                onChange={(val: SelectableItem<string>) => {
                  setFieldValue('unitType', val)
                }}
                placeholder="Unit Type"
                styles={styles}
                isDisabled={viewOnly}
              />
              <CInputGroupAppend style={{ flexShrink: 0 }}>
                <CInputGroupText>Unit Type</CInputGroupText>
              </CInputGroupAppend>
              {errors?.details?.unitType ? (
                <span style={{ fontSize: 12 }} className="text-danger display-inline-block w-100">
                  {errors.details.unitType}
                </span>
              ) : null}
            </CInputGroup>
            <CInputGroup className="mb-3">
              <CInputGroupPrepend>
                <CInputGroupText>
                  <CIcon name="cil-tag" />
                  &nbsp;*
                </CInputGroupText>
              </CInputGroupPrepend>
              <CreatableSelect
                name="category"
                value={values.category}
                options={options?.categories ?? []}
                onChange={(val: SelectableTag) => {
                  setFieldValue('category', val)
                }}
                onCreateOption={(inputValue: string) => {
                  const newOption = {
                    label: _.startCase(_.toLower(inputValue)),
                    value: _.replace(_.toLower(inputValue), /\s+/g, ''),
                    source: { name: _.startCase(_.toLower(inputValue)) },
                  }
                  setFieldValue('category', newOption)
                  options?.categories?.push(newOption)
                }}
                placeholder="Select or Enter Category Tag"
                styles={styles}
                isCreatable={true}
                isClearable={false}
                isDisabled={viewOnly}
              />
              <CInputGroupAppend>
                <CInputGroupText>Category</CInputGroupText>
              </CInputGroupAppend>
              {errors?.details?.category ? (
                <span style={{ fontSize: 12 }} className="text-danger display-inline-block w-100">
                  {errors.details.category}
                </span>
              ) : null}
            </CInputGroup>
            <CInputGroup className="mb-3">
              <CInputGroupPrepend>
                <CInputGroupText>
                  <CIcon name="cil-asterisk" />
                  &nbsp;*
                </CInputGroupText>
              </CInputGroupPrepend>
              <Select
                className="br-0"
                name="category"
                value={values.reportDataType}
                options={ReportDataTypeList}
                onChange={(val: SelectableItem<string>) => {
                  setFieldValue('reportDataType', val)
                }}
                placeholder="Report Data Type"
                styles={styles}
                isDisabled={viewOnly}
              />
              <CInputGroupAppend>
                <CInputGroupText>Report Data Type</CInputGroupText>
              </CInputGroupAppend>
              {errors?.details?.reportDataType ? (
                <span style={{ fontSize: 12 }} className="text-danger display-inline-block w-100">
                  {errors.details.reportDataType}
                </span>
              ) : null}
            </CInputGroup>
            <CInputGroup className="align-items-center mb-3">
              <CInputGroupPrepend>
                <CInputGroupText>Active</CInputGroupText>
              </CInputGroupPrepend>
              <CSwitch
                name="isActive"
                className={'mx-2 my-2'}
                variant={'3d'}
                color={'success'}
                defaultChecked={values.active}
                onChange={(e: BaseSyntheticEvent) => {
                  setFieldValue('active', e.target.checked)
                }}
                disabled={viewOnly}
              />
              {errors?.details?.active ? (
                <span style={{ fontSize: 12 }} className="text-danger display-inline-block w-100">
                  {errors.details.active}
                </span>
              ) : null}
            </CInputGroup>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default SensorDetailForm
