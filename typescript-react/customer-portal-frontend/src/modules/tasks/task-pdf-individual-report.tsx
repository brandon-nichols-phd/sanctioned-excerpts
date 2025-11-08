import React, { FC, MutableRefObject, useCallback, useRef, useState } from 'react'
import 'react-datepicker/dist/react-datepicker.css'
import moment from 'moment'
import _ from 'lodash'

import { useTheme } from '@mui/material/styles'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import Pagination from '@mui/material/Pagination'
import ClearIcon from '@mui/icons-material/Clear'
import RemoveIcon from '@mui/icons-material/Remove'
import QuestionMarkIcon from '@mui/icons-material/QuestionMark'
import CIcon from '@coreui/icons-react'

import {
  IndividualTaskListReport,
  IndividualTaskListReportAssignmentTiming,
  IndividualTaskListReportLocationAssignments,
  IndividualTaskListReportTaskResponse,
  IndividualTaskListReportUserAssignments,
  Numeric,
} from './reporting'
import { TaskType, TaskCorrectness, TemperatureUnit } from './data/task'

type ImagesStore = { loaded: boolean; src: string; relatedDetails: { location: string; task: string; timestamp: string | null } }
type ImagesLoader = {
  size: number
  store: Map<string, ImagesStore>
}

// Number of timings based on assignments that we want to show for every checklist before pagination kicks in.
const NUM_OF_TIMING_COLUMNS = 4

export const PDFIndividualReport: FC<{
  report: IndividualTaskListReport
  tempUnit: TemperatureUnit
  dates: [Date, Date]
  onReady: () => void
}> = (props) => {
  const theme = useTheme()
  const imagesLoader = useRef<ImagesLoader>({ size: 0, store: new Map<string, ImagesStore>() })

  const { onReady } = props
  const imageDone = useCallback(
    (imageId: string) => {
      // If we have already loaded everything there is no need to fire this again.
      if (imagesLoader.current.size === 0) {
        return
      }

      const targetImage = imagesLoader.current.store.get(imageId)
      if (targetImage && !targetImage.loaded) {
        targetImage.loaded = true
        imagesLoader.current.size--
      }

      if (imagesLoader.current.size === 0) {
        setTimeout(onReady, 100)
      }
    },
    [onReady]
  )

  const locationNames = Object.values(props.report).reduce<Record<string, string>>((accum, checklist) => {
    Object.entries((checklist as any).locations as Record<string, { name: string }>).forEach(([locationId, locationData]) => {
      if (!accum[locationId]) {
        accum[locationId] = (locationData as { name: string }).name;
      }
    });
    return accum;
  }, {});

  const imgColumnWidth = 100 / (NUM_OF_TIMING_COLUMNS + 1)

  return (
    <Box
      sx={{
        mx: 1,
      }}
    >
      <Typography variant="h4" sx={{ color: 'black', textAlign: 'center', fontWeight: 'bold', marginTop: '2em' }}>
        Task List Completion Report Per Location
      </Typography>
      <Typography variant="h5" sx={{ color: theme.palette.primary.main, textAlign: 'center', fontWeight: 'bold', marginBottom: '3em' }}>
        {Object.values(locationNames).join(', ')}
      </Typography>
      {Object.entries(props.report).map(([checklistId, checklistData]) =>
        (
          [
            ...Object.entries((checklistData as { locations: Record<string, IndividualTaskListReportLocationAssignments> }).locations),
            ...(Object.keys((checklistData as { users: IndividualTaskListReportUserAssignments }).users.assignments).length > 0
                ? [['USER_ASSIGN', (checklistData as { users: IndividualTaskListReportUserAssignments }).users]]
                : []),
          ] as [string, IndividualTaskListReportLocationAssignments | IndividualTaskListReportUserAssignments][]
        ).map(([groupId, groupData]) => {
          const reportKey = `${checklistId}-${groupId}`
          let groupName: string
          let groupTimezone: string
          if ('namesMap' in groupData) {
            groupName = 'User Reports'
            groupTimezone = [...new Set(Object.values(groupData.timezonesMap))].join(', ')
          } else {
            groupName = groupData.name
            groupTimezone = groupData.timezone
          }
          return (
            <Card key={reportKey} sx={{ marginBottom: '5em' }}>
              <CardContent>
                <Table sx={{ '& .MuiTableCell-head': { borderBottom: '0px', padding: '0px', margin: '0px' } }}>
                  <DetailsHeader
                    checklistName={(checklistData as { name: string }).name}
                    groupName={groupName}
                    timezone={groupTimezone}
                    assignments={groupData.assignments}
                    dates={props.dates}
                  />
                </Table>
              </CardContent>
              <CardContent>
                <TableContainer>
                  <Table
                    sx={{
                      '& .MuiFormControl-root': { my: 1 },
                      '& .MuiCardHeader-root': { backgroundcolor: 'lightgrey' },
                      '& .MuiCard-root': { mb: 2 },
                      '& > .MuiCard-root:last-child': { mb: 8 },
                      '& .MuiTableContainer-root': { mb: 8 },
                      '& .table-card': { backgroundColor: theme.palette.primary.main, color: 'white' },
                      '& .MuiTableHead-root': { backgroundColor: 'white' },
                      '& .MuiTableBody-root': { backgroundColor: 'white' },
                      '& .MuiTableCell-head': { fontWeight: 'bold' },
                      '& .MuiTableCell-root': { color: theme.palette.primary.main, textAlign: 'center', border: '1px solid lightgray' },
                      '& .MuiTableCell-root:first-child': { textAlign: 'right' },
                    }}
                  >
                    <TableBody>
                      <ChecklistReportForAssignmentGroup
                        report={groupData}
                        groupName={groupName}
                        tempUnit={props.tempUnit}
                        imagesLoader={imagesLoader}
                        onImageDone={imageDone}
                        prefixKey={reportKey}
                      />
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          )
        })
      )}
      <Card>
        <CardContent>
          <TableContainer>
            <Table sx={{ border: '1px solid black' }}>
              <TableHead>
                <TableRow>
                  <TableCell
                    colSpan={NUM_OF_TIMING_COLUMNS + 1}
                    sx={{ fontWeight: 'bold', fontSize: '2em', backgroundColor: 'gray', color: 'white' }}
                  >
                    Images
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {_.chunk(Array.from(imagesLoader.current.store), NUM_OF_TIMING_COLUMNS + 1).flatMap((imageGroup) => (
                  <TableRow>
                    {imageGroup.map(([imageKey, imageData]) => (
                      <TableCell sx={{ width: `${imgColumnWidth}%`, border: 'none' }}>
                        <Box>
                          <img
                            src={imageData.src}
                            style={{ maxWidth: '100%', maxHeight: '100%' }}
                            onLoad={() => imageDone(imageKey)}
                            onError={() => imageDone(imageKey)}
                          />
                        </Box>
                        <Box sx={{ color: 'darkslategray' }}>
                          <Box component="div">
                            {imageData.relatedDetails.location}
                            {imageData.relatedDetails.timestamp ? ' - ' + imageData.relatedDetails.timestamp : ''}
                          </Box>
                          <Box component="div">{imageData.relatedDetails.task}</Box>
                        </Box>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  )
}

const DetailsHeader: FC<{
  checklistName: string
  groupName: string
  timezone: string
  assignments: Record<string, IndividualTaskListReportAssignmentTiming>
  dates: [Date, Date]
}> = (props) => {
  const timestampNow = moment()
  const targetAssignments = Object.values(props.assignments)
  const startDateRange = moment(props.dates[0]).format('MMMM Do')
  const endDateRange = moment(props.dates[1]).format('MMMM Do')

  const totalChecklists = targetAssignments.length
  const completedChecklists = targetAssignments.filter((assignment) => assignment.missedCount === 0).length
  const tasksOnTime = targetAssignments.reduce((accum, assignment) => accum + assignment.completedCount - assignment.lateCount, 0)
  const tasksMissed = targetAssignments.reduce((accum, assignment) => accum + assignment.missedCount, 0)
  const tasksLate = targetAssignments.reduce((accum, assignment) => accum + assignment.lateCount, 0)
  const tasksPending = targetAssignments.reduce(
    (accum, assignment) => accum + (moment(assignment.lock.epoch_ms) > timestampNow ? assignment.missedCount : 0),
    0
  )
  const flaggedTasks = targetAssignments.reduce(
    (accum, assignment) => accum + Object.values(assignment.responses).filter((response) => (response as { flagged?: boolean })!.flagged).length,
    0
  )
  const triggeredCAs = targetAssignments.reduce(
    (accum, assignment) => accum + Object.values(assignment.responses).filter((response) => (response as { triggeredCa?: boolean })!.triggeredCa).length,
    0
  )
  const completionPercentage = Math.floor((completedChecklists / totalChecklists) * 100)

  return (
    <TableHead>
      <TableRow>
        <TableCell colSpan={4} sx={{ width: '80%' }}>
          <Typography variant="h4">{props.checklistName}</Typography>
        </TableCell>
        <TableCell rowSpan={4} sx={{ width: '10%' }}></TableCell>
        <TableCell rowSpan={4} sx={{ width: '10%' }}>
          <CIcon name="logo" alt="Logo" height={40} src="dark-horizontal.png" />
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={5}>
          <Typography sx={{ fontWeight: 'bold' }}>{props.groupName}</Typography>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={5}>
          <Typography>
            {startDateRange} - {endDateRange}
          </Typography>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={5}>
          <Typography sx={{ color: 'gray', fontStyle: 'italic' }}>Timezone: {props.timezone}</Typography>
        </TableCell>
      </TableRow>
      <TableRow sx={{ backgroundColor: '#002D62' }}>
        <TableCell>
          <Typography
            sx={{ color: 'white', fontWeight: 'bold', fontSize: '2em', textAlign: 'center' }}
          >{`${completionPercentage}%`}</Typography>
          <Typography sx={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>Complete</Typography>
        </TableCell>
        <TableCell>
          <Typography
            sx={{ color: 'white', fontWeight: 'bold', textAlign: 'left', fontSize: '2em' }}
          >{`${completedChecklists}/${totalChecklists}`}</Typography>
        </TableCell>
        <TableCell colSpan={2}>
          <Box component="div" sx={{ borderLeft: '2px solid white', paddingLeft: '1em', marginY: '1em' }}>
            <Typography sx={{ color: 'white', fontWeight: 'bold' }}>{`${tasksOnTime} tasks on time`}</Typography>
            <Typography sx={{ color: 'orange', fontWeight: 'bold' }}>{`${tasksLate} tasks late`}</Typography>
            <Typography sx={{ color: 'red', fontWeight: 'bold' }}>{`${tasksMissed} tasks missed`}</Typography>
            <Typography sx={{ color: 'lightblue', fontWeight: 'bold' }}>{`${tasksPending} tasks pending`}</Typography>
          </Box>
        </TableCell>
        <TableCell colSpan={2}>
          <Box component="div" sx={{ borderLeft: '2px solid white', paddingLeft: '1em', marginY: '1em' }}>
            <Typography sx={{ color: 'white', fontWeight: 'bold' }}>{`${flaggedTasks} flagged tasks`}</Typography>
            <Typography sx={{ color: 'white', fontWeight: 'bold' }}>{`${triggeredCAs} corrective actions`}</Typography>
          </Box>
        </TableCell>
      </TableRow>
    </TableHead>
  )
}

const calculateCorrectness = (correctness: TaskCorrectness | null | undefined, response: string | null | undefined) => {
  if (!correctness) {
    return true
  }

  const booleanResponse = response === 'yes'

  // Only support equal response for now
  switch (correctness.operation) {
    case '=':
      return correctness.value === booleanResponse
    default:
      return false
  }
}

// Given a set of tasks return an ordered array so that each parent task is immediatly followed by its subtasks.
const getTasksOrder = (tasks: Record<string, IndividualTaskListReportTaskResponse>) => {
  const orderedTasks = Object.entries(tasks).reduce((accum, [taskId, taskData]) => {
    const parentId = taskData.parentTaskId
    if (parentId) {
      let orderingOnParent = accum.get(parentId)
      if (!orderingOnParent) {
        // The first element on the array always represent the parent.
        orderingOnParent = [
          {
            id: parentId,
            name: '', // This value will be updated when we encounter the parent.
            description: '', // This value will be updated when we encounter the parent.
            isSubtask: false,
          },
        ]
      }
      orderingOnParent.push({
        id: taskId,
        name: taskData.name,
        description: taskData.description ?? '',
        isSubtask: true,
      })
      accum.set(parentId, orderingOnParent)
    } else {
      const orderingOnParent = accum.get(taskId)
      if (orderingOnParent && orderingOnParent[0]) {
        // We found the parent task so update the object to hold the proper name.
        orderingOnParent[0].name = taskData.name
      } else {
        accum.set(taskId, [
          {
            id: taskId,
            name: taskData.name,
            description: taskData.description ?? '',
            isSubtask: false,
          },
        ])
      }
    }
    return accum
  }, new Map<string, { id: string; name: string; description: string; isSubtask: boolean }[]>())

  return Array.from(orderedTasks.values()).flat()
}

// Create an object that holds a cell for each response for the given assignment timing.
const getAssignmentColumns = (
  assignment: IndividualTaskListReportAssignmentTiming,
  groupName: string,
  timezone: string,
  tempUnit: TemperatureUnit,
  users: string[] | null,
  imagesLoader: MutableRefObject<ImagesLoader>,
  onImageDone: (imageId: string) => void,
  prefixKey: string
) => {
  const nowDate = moment().tz(timezone)
  const lockDate = moment(assignment.lock.epoch_ms).tz(timezone)
  const startFormatted = moment(assignment.start.epoch_ms).tz(timezone).format('MMM D h:mma')
  const lockFormatted = lockDate.format('MMM D h:mma')
  const columnWidth = 100 / (NUM_OF_TIMING_COLUMNS + 1)

  const components: Record<string, JSX.Element> = {
    // We set the id of the header cell to be the same accross all calls to this function for ease of use.
    '0': (
      <TableCell key={`${prefixKey}-0`} sx={{ width: `${columnWidth}%` }}>
        <Typography component="div" sx={{ fontWeight: 'bold' }}>
          {assignment.name}
        </Typography>
        <br />
        <Typography component="div" sx={{ fontWeight: 'bold', fontSize: '0.8em', color: 'darkslategray' }}>
          {startFormatted} -
        </Typography>
        <Typography component="div" sx={{ fontWeight: 'bold', fontSize: '0.8em', color: 'darkslategray' }}>
          {lockFormatted}
        </Typography>
        <br />
        <Typography component="div" sx={{ fontWeight: 'bold', fontSize: '0.8em', color: 'darkslategray' }}>
          {assignment.recurrence}
        </Typography>
        {users && (
          <>
            <br />
            <Typography component="div" sx={{ fontWeight: 'bold', fontSize: '0.8em', color: 'darkslategray' }}>
              {users.join(', ')}
            </Typography>
          </>
        )}
      </TableCell>
    ),
  }

  type Expected = {
    parentTaskId?: string;
    taskType?: TaskType;
    response?: string;
    name?: string;
    createdWhen?: { epoch_ms: number };
    lastUpdatedWhen?: { epoch_ms: number };
    attachmentsS3Url?: { file: string; presignedUrl: string; addedWhen?: string }[];
    subtaskCorrectness?: unknown;
  };

  type ResponsesMap = Record<string, IndividualTaskListReportTaskResponse>;
  const responses = (assignment.responses ?? {}) as ResponsesMap;

  (Object.entries(responses) as [string, IndividualTaskListReportTaskResponse][])
    .forEach(([taskId, taskData]) => {
      let shouldShowSubtask = true;

      if (taskData.parentTaskId) {
        const parentResponse = responses[taskData.parentTaskId];
        shouldShowSubtask = calculateCorrectness(
          parentResponse?.subtaskCorrectness,
          parentResponse?.response
        );
      }

      if (taskData.taskType === TaskType.SIGNATURE && taskData.response) {
        const curImage = imagesLoader.current.store.get(taskData.response);
        if (!curImage) {
          const timestampMoment = taskData.createdWhen || taskData.lastUpdatedWhen;
          imagesLoader.current.store.set(taskData.response, {
            loaded: false,
            src: taskData.response,
            relatedDetails: {
              location: groupName,
              task: taskData.name!, // drop the ! if name can be undefined
              timestamp: timestampMoment
                ? moment(timestampMoment.epoch_ms).tz(timezone).format('MMM D h:mma')
                : null,
            },
          });
          imagesLoader.current.size++;
        }
      }

      // attachmentsS3Url is array | null in your source type; ?. handles null/undefined
      taskData.attachmentsS3Url?.forEach((attachment) => {
        const curImage = imagesLoader.current.store.get(attachment.file);
        if (!curImage) {
          imagesLoader.current.store.set(attachment.file, {
            loaded: false,
            src: attachment.presignedUrl,
            relatedDetails: {
              location: groupName,
              task: taskData.name!,
              // addedWhen is a number in your source; moment(number) is fine
              timestamp: attachment.addedWhen
                ? moment(attachment.addedWhen).tz(timezone).format('MMM D h:mma')
                : null,
            },
          });
          imagesLoader.current.size++;
        }
      });

      components[taskId] = (
        <TableCell key={`${prefixKey}-${taskId}`}>
          <RowResponse
            isDaily={assignment.recurrence === 'Daily'}
            isSubtask={!!taskData.parentTaskId}
            isLocked={nowDate.isSameOrAfter(lockDate)}
            shouldShowSubtask={shouldShowSubtask}
            response={taskData} // stays IndividualTaskListReportTaskResponse
            timezone={timezone}
            tempUnit={tempUnit}
            onImageDone={onImageDone}
          />
        </TableCell>
      );
    });

  return components
}

const ChecklistReportForAssignmentGroup: FC<{
  report: IndividualTaskListReportLocationAssignments | IndividualTaskListReportUserAssignments
  groupName: string
  tempUnit: TemperatureUnit
  imagesLoader: MutableRefObject<ImagesLoader>
  onImageDone: (imageId: string) => void
  prefixKey: string
}> = (props) => {
  const [page, setPage] = useState(1)

  const sortedAssignments = Object.entries(props.report.assignments).toSorted(
    ([, lAssig], [, rAssig]) =>
      (lAssig as { lock: { epoch_ms: number } }).lock.epoch_ms -
      (rAssig as { lock: { epoch_ms: number } }).lock.epoch_ms
  );
  const allAssignments = sortedAssignments.map(([assignmentKey, assignmentData]) => {
    let currentTimezone: string
    let currentUsers = null
    if ('namesMap' in props.report) {
      const assignmentId = assignmentKey.split('!')[0] as Numeric
      currentTimezone = props.report.timezonesMap[assignmentId] ?? ''
      currentUsers = props.report.namesMap[assignmentId] ?? []
    } else {
      currentTimezone = props.report.timezone
    }

    return getAssignmentColumns(
      assignmentData,
      props.groupName,
      currentTimezone,
      props.tempUnit,
      currentUsers,
      props.imagesLoader,
      props.onImageDone,
      props.prefixKey + '-' + assignmentKey
    )
  })
  const responsesOrder = getTasksOrder(
    ((sortedAssignments[0]?.[1] as { responses: Record<string, IndividualTaskListReportTaskResponse> })?.responses) ?? {}
  );
  const totalPages = Math.ceil(sortedAssignments.length / NUM_OF_TIMING_COLUMNS)
  // Filter the assignments to only those that should be displayed for the given page.
  const shownAssignments = allAssignments.slice((page - 1) * NUM_OF_TIMING_COLUMNS, page * NUM_OF_TIMING_COLUMNS)
  const columnWidth = 100 / (NUM_OF_TIMING_COLUMNS + 1)

  return (
    <>
      <TableRow sx={{ borderBottom: '10px solid lightgray' }}>
        <TableCell component="th" sx={{ width: `${columnWidth}%`, fontWeight: 'bold', fontSize: '1.2em', verticalAlign: 'bottom' }}>
          Task Name
        </TableCell>
        {shownAssignments.map((assignment) => assignment['0'])}
      </TableRow>
      {responsesOrder.map((currentResponse) => (
        <TableRow key={currentResponse.id}>
          <TableCell component="th" scope="row" sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)', textAlign: 'right' }}>
            <Box sx={{ fontWeight: 'bold', color: 'black' }}>{currentResponse.name}</Box>
            <Box sx={{ color: 'gray' }}>{currentResponse.description}</Box>
            {currentResponse.isSubtask && (
              <Grid container justifyContent="right">
                <Box
                  component="div"
                  sx={{ border: '1px solid lightgray', width: 'min-content', marginTop: '0.5em', paddingX: '3em', paddingY: '0.5em' }}
                >
                  SUBTASK
                </Box>
              </Grid>
            )}
          </TableCell>
          {shownAssignments.map((assignment, index) => {
            let targetResponse = assignment[currentResponse.id]
            if (!targetResponse) {
              // If the given task doesn't exist for this assignment/timing it's probably because this timing is from a
              // snapshot that has a different structure than the one used to order the tasks for the table. If that is
              // the case we simply show an "empty" cell with a distinctive marker.
              targetResponse = (
                <TableCell key={`${props.prefixKey}-${page}-${index}-${currentResponse.id}`}>
                  <QuestionMarkIcon fontSize="large" />
                </TableCell>
              )
            }
            return targetResponse
          })}
        </TableRow>
      ))}
      <TableRow sx={{ '& .MuiTableCell-root': { border: '0px' } }}>
        <TableCell colSpan={NUM_OF_TIMING_COLUMNS + 1}>
          <Grid container justifyContent="center">
            <Pagination
              page={page}
              onChange={(_event, newPage) => setPage(newPage)}
              count={totalPages}
              siblingCount={1}
              boundaryCount={1}
              variant="outlined"
              shape="rounded"
              size="large"
            />
          </Grid>
        </TableCell>
      </TableRow>
    </>
  )
}

// response format for NUMBER_AND_SELECT task type
type NumberAndSelectResponseObject = { number: string; selectedOption: string }

/**
 * Response is a string representation of NumberAndSelectResponseObject defined above
 *
 * Because the repsonse is composite, we need to format the response
 * from json text to an obj to format below
 */
const getNumberAndSelectResponseObject = (response: string | null): NumberAndSelectResponseObject => {
  if (!response) {
    return { number: '', selectedOption: '' }
  }
  return JSON.parse(response) as NumberAndSelectResponseObject
}

const formatResponse = (
  taskType: TaskType,
  taskResponse: IndividualTaskListReportTaskResponse,
  tempUnit: TemperatureUnit,
  onImageDone: (imageId: string) => void
) => {
  /**
   * skipped flag was added in response to the addition of
   * being able to mark a task as n/a
   * n/a is saved as the task response and would break it most cases
   * where its not the excepted response type
   */
  if (taskResponse.skipped) {
    return taskResponse.response ?? ''
  }

  switch (taskType) {
    case TaskType.BINARY:
      return taskResponse.response ? taskResponse.response.charAt(0).toUpperCase() + taskResponse.response.slice(1) : ''

    case TaskType.TEMPERATURE:
    case TaskType.TEMPERATURE_MANUAL:
    case TaskType.BLE_TEMPERATURE_ONLY:
    case TaskType.SENSOR:
      if (!taskResponse.response && !taskResponse.temperatureReadingC) {
        return ''
      }
      return `${taskResponse.response || taskResponse.temperatureReadingC}°${tempUnit}`

    case TaskType.PICTURE:
      return ''
    case TaskType.SIGNATURE: {
      const fileUrl = taskResponse.response ?? ''
      return (
        <img
          style={{ maxWidth: '150px', maxHeight: '150px' }}
          src={fileUrl}
          onLoad={() => onImageDone(fileUrl)}
          onError={() => onImageDone(fileUrl)}
        />
      )
    }

    case TaskType.DATE:
      if (!taskResponse.response) {
        return ''
      }
      return new Date(parseInt(taskResponse.response, 10)).toLocaleDateString([], { month: 'short', day: 'numeric' })
    case TaskType.TIME:
      if (!taskResponse.response) {
        return ''
      }
      return moment(taskResponse.response, 'hh:mm:ss').toDate().toLocaleTimeString([], { hour: 'numeric', minute: 'numeric' })

    case TaskType.NUMBER_AND_SELECT: {
      const respObj = getNumberAndSelectResponseObject(taskResponse.response)
      return respObj.number ? `${respObj.number} ${respObj.selectedOption}` : ''
    }

    default:
      if (!taskResponse.response) {
        return ''
      }
      return taskResponse.response
  }
}

const RowResponse: FC<{
  isDaily: boolean
  isSubtask: boolean
  isLocked: boolean
  shouldShowSubtask: boolean
  response: IndividualTaskListReportTaskResponse
  timezone: string
  tempUnit: TemperatureUnit
  onImageDone: (imageId: string) => void
}> = (props) => {
  if (!props.shouldShowSubtask) {
    return <Box sx={{ color: '#B1B0B2', fontWeight: 'bold', fontStyle: 'italic' }}>Not Required</Box>
  }

  const timestampWhen = props.response.createdWhen || props.response.lastUpdatedWhen

  if (!timestampWhen && !props.response.attachmentsS3Url) {
    return <Box>{props.isLocked ? <ClearIcon sx={{ color: 'red' }} fontSize="large" /> : <RemoveIcon fontSize="large" />}</Box>
  }

  const userName =
    typeof props.response.userName === 'string'
      ? props.response.userName
      : props.response.userName
      ? `${props.response.userName.first} ${props.response.userName.last}`
      : ''
  const responseDate = timestampWhen ? new Date(timestampWhen.epoch_ms) : new Date()
  const hasImages = props.response.attachmentsS3Url && props.response.attachmentsS3Url.length > 0
  const formattedResponse = formatResponse(props.response.taskType, props.response, props.tempUnit, props.onImageDone)
  const formattedTime = moment(responseDate)
    .tz(props.timezone)
    .format(`${props.isDaily ? '' : 'MMM D '}h:mm a`)

  return (
    <Grid container>
      {hasImages && (
        <Grid item xs={12}>
          {(props.response.attachmentsS3Url as unknown as { file: string; presignedUrl: string; addedWhen?: string }[] | undefined)
            ?.map((attachment) => (
              <img
                key={attachment.file}
                src={attachment.presignedUrl}
                onLoad={() => props.onImageDone(attachment.file)}
                onError={() => props.onImageDone(attachment.file)}
                style={{ maxWidth: '150px', maxHeight: '150px' }}
              />
            ))}
          {props.response.flagged && (
            <CIcon name="cil-flag-alt" size="xl" className="float-right" style={{ color: 'red' }} />
          )}
        </Grid>
      )}
      {formattedResponse && (
        <Grid item xs={12} sx={{ color: props.response.triggeredCa ? 'red' : 'black', fontWeight: 'bold' }}>
          {formattedResponse}
          {props.response.flagged && !hasImages && <CIcon name="cil-flag-alt" size="xl" className="float-right" style={{ color: 'red' }} />}
        </Grid>
      )}
      <Grid item xs={12} sx={{ color: 'black', marginTop: '1em' }}>
        {userName}
      </Grid>
      <Grid item xs={12} sx={{ color: 'black' }}>
        {formattedTime}
      </Grid>
      {props.response.notesHtml && (
        <Grid item xs={12} mt={2} sx={{ '& p': { paddingY: '0px', marginY: '0.5em' } }}>
          <div
            dangerouslySetInnerHTML={{ __html: props.response.notesHtml }}
            style={{ border: '1px solid black', color: 'black', fontStyle: 'italic', padding: '0.5em' }}
          />
        </Grid>
      )}
    </Grid>
  )
}
