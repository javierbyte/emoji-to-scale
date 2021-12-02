import dataCsvUrl from './emoji-data.csv';

function isNumber(val) {
  return String(Number(val)) === val;
}

export async function getData() {
  let meta = {}

  return fetch(dataCsvUrl)
    .then((response) => response.text())
    .then((dataRaw) => {
      let dataObj = dataRaw
        .trim()
        .split(`\n`)
        .splice(1)
        .reduce((acc, row) => {
          const [emoji, source, label, src] = row.split(`,`);
          acc[emoji] = source;
          meta[emoji] = {source, label, src}
          return acc;
        }, {});

      for (const key in dataObj) {
        const val = dataObj[key];
        if (isNumber(dataObj[key])) {
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

      return Object.entries(dataObj).sort((a, b) => {
        return a[1] - b[1];
      }).map(emoji => {
        return [emoji[0], emoji[1], meta[emoji[0]].label]
      });
    });
}
