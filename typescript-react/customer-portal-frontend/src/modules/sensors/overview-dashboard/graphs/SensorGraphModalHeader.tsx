// SensorOverviewModalHeader content

import React from "react";
import { Box, IconButton, Typography } from "@mui/material";
import {
  PathSpotFilter,
  PathSpotFilterOff
} from "../../../../webapp-lib/pathspot-react/assets/icons/pathspot/catalog";

const SensorOverviewModalHeader = ({
  locationName,
  sensorName,
  filterBarVisible,
  toggleFilterBar
}: {
  locationName: string;
  sensorName: string;
  filterBarVisible: boolean;
  toggleFilterBar: () => void;
}) => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        mb: 2
      }}
    >
      <Box sx={{ alignSelf: "flex-start", mb: 1 }}>
        <IconButton onClick={toggleFilterBar} size="small">
          {filterBarVisible ? <PathSpotFilter /> : <PathSpotFilterOff />}
        </IconButton>
      </Box>
      <Typography variant="h4" fontWeight="bold" color="text.secondary">
        {locationName}
      </Typography>
      <Typography
        variant="h5"
        fontWeight="bold"
        color="text.disabled"
        fontStyle="italic"
      >
        {sensorName}
      </Typography>
    </Box>
  );
};

export default SensorOverviewModalHeader;
