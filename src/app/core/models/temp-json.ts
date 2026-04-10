export interface MonitoringDataJSON {
  // Raw json temperature data from the site
  utcTimestamp: string[];
  temperatureValue: [label: string, ...values: (number | null)[]][];
}

export interface MonitoringDataJSONWithCloud extends MonitoringDataJSON {
  // Interpolated coordinates for bin file
  resolution?: number[];
}

export interface TempDataJSON {
  // Cleaned temperature data
  utcTimestamp: string[];
  temperatureValue: Record<string, Record<string, Array<number | null>>>;
}

export type DataFrame = Record<string, number | null>;

export function cleanMonitoringData(input: MonitoringDataJSON): TempDataJSON {
  // Clean temperature data for easier work
  const outputValues: Record<string, Record<number, (number | null)[]>> = {};
  for (const row of input.temperatureValue) {
    if (!row) {
      console.error('Error: file has no data or wrong type.');
      break;
    }
    const label: string = row[0];
    const values = row.slice(1) as (number | null)[];

    // Split "23-1 (5)" into "23-1" and "5"
    const match = label.match(/^(.+?) \(([+-]?[0-9]*[.,]?[0-9]+)\)$/);
    if (!match) {
      continue;
    }

    const tempChainId = match[1];
    const tempChainDepth = Number(`${match[2]}`.replace(',', '.')); // Replace Russian comma decimal separator

    if (!outputValues[tempChainId]) {
      outputValues[tempChainId] = {};
    }

    outputValues[tempChainId][tempChainDepth] = values;
  }

  const output = { utcTimestamp: input.utcTimestamp, temperatureValue: outputValues };
  return output;
}
