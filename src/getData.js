import dataRandom from './data/random.csv';
import dataTravel from './data/travel.csv';
import dataNature from './data/nature.csv';
import dataObjects from './data/objects.csv';

function isNumber(val) {
  return String(Number(val)) === val;
}

async function fetchMultiple() {
  let dataCombined = [];

  await fetch(dataRandom)
    .then((response) => response.text())
    .then((dataRaw) => {
      dataCombined.push(...dataRaw.trim().split(`\n`).splice(1));
    });

  await fetch(dataTravel)
    .then((response) => response.text())
    .then((dataRaw) => {
      dataCombined.push(...dataRaw.trim().split(`\n`).splice(1));
    });

  await fetch(dataNature)
    .then((response) => response.text())
    .then((dataRaw) => {
      dataCombined.push(...dataRaw.trim().split(`\n`).splice(1));
    });

  await fetch(dataObjects)
    .then((response) => response.text())
    .then((dataRaw) => {
      dataCombined.push(...dataRaw.trim().split(`\n`).splice(1));
    });

  return dataCombined;
}

export async function getData() {
  let meta = {};

  const dataCombined = await fetchMultiple();

  let dataObj = dataCombined.reduce((acc, row) => {
    const [emoji, source, label, src] = row.split(`,`);
    if (source === '?') {
      return acc;
    }

    if (meta[emoji]) {
      console.warn('REPEATED', emoji);
    }

    acc[emoji] = source;
    meta[emoji] = { source, label, src };
    return acc;
  }, {});

  for (const key in dataObj) {
    const val = dataObj[key];
    if (dataObj[key].includes('km')) {
      dataObj[key] = Number(val.replace('km', '')) * 100 * 1000;
    } else if (dataObj[key].includes('m')) {
      dataObj[key] = Number(val.replace('m', '')) * 100;
    } else if (isNumber(dataObj[key])) {
      dataObj[key] = Number(val);
    } else if (dataObj[val]) {
      dataObj[key] = dataObj[val];
    } else if (val.includes(`*`)) {
      const terms = val.split(`*`).map((deepValue) => {
        if (isNumber(deepValue)) {
          return Number(deepValue);
        } else if (dataObj[deepValue]) {
          return dataObj[deepValue];
        }
        return deepValue;
      });
      dataObj[key] = terms[0] * terms[1];
    }
  }

  return Object.entries(dataObj)
    .sort((a, b) => {
      return a[1] - b[1];
    })
    .map((emoji) => {
      return [emoji[0], emoji[1], meta[emoji[0]].label];
    })
    .filter((emoji) => {
      return emoji[1] !== '?';
    });
}
