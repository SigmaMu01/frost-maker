export interface MonitoringDataJSON {
  utcTimestamp: string[];
  temperatureValue: [label: string, ...values: (number | null)[]][];
}

export interface TempDataJSON {
  utcTimestamp: string[];
  temperatureValue: Record<string, Record<number, Array<number | null>>>;
}

export type DataFrame = Record<number, number | null>;

export function cleanMonitoringData(input: MonitoringDataJSON): TempDataJSON {
  const outputValues: Record<string, Record<number, (number | null)[]>> = {};
  for (const row of input.temperatureValue) {
    if (!row) {
      console.error('Error: file has no data or wrong type.');
      break;
    }
    const label: string = row[0];
    const values = row.slice(1) as (number | null)[];

    // Split "23-1 (5)" into "23-1" and "5"
    const match = label.match(/^(.+?) \((\d+)\)$/);
    if (!match) continue;

    const tempChainId = match[1];
    const tempChainDepth = Number(match[2]);

    if (!outputValues[tempChainId]) {
      outputValues[tempChainId] = {};
    }

    outputValues[tempChainId][tempChainDepth] = values;
  }

  const output = { utcTimestamp: input.utcTimestamp, temperatureValue: outputValues };
  return output;
}
